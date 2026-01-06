import Foundation
import AVFoundation
import React

@objc(AudioInputModule)
final class AudioInputModule: RCTEventEmitter {

  private let engine = AVAudioEngine()
  private let session = AVAudioSession.sharedInstance()
  private var isRunning = false

  private let pipeline = NativeAudioPipeline()

  private let tapBufferSize: AVAudioFrameCount = 1024

  private let NOTE_WINDOW = 2048
  private let CHORD_WINDOW = 8192

  private let RING_SIZE = 16384
  private lazy var ringBuffer = AudioRingBuffer(size: RING_SIZE)

  private var noteCounter = 0
  private var chordCounter = 0

  private lazy var noteOut: [Float] = Array(repeating: 0, count: NOTE_WINDOW)
  private lazy var chordOut: [Float] = Array(repeating: 0, count: CHORD_WINDOW)

  private var hasActiveSignal = false
  private let onsetThreshold: Float = 0.0015
  private let releaseThreshold: Float = 0.0008

  override static func requiresMainQueueSetup() -> Bool { false }

  override func supportedEvents() -> [String]! {
    ["AudioDetection"]
  }

  override init() {
    super.init()
    pipeline.emitDetection = { [weak self] payload in
      self?.sendEvent(withName: "AudioDetection", body: payload ?? NSNull())
    }
  }

  @objc(start)
  func start() {
    if isRunning { return }

    try? session.setCategory(
      .playAndRecord,
      mode: .measurement,
      options: [.defaultToSpeaker, .allowBluetooth, .mixWithOthers]
    )
    try? session.setActive(true)

    let input = engine.inputNode
    let format = input.inputFormat(forBus: 0)

    hasActiveSignal = false
    noteCounter = 0
    chordCounter = 0
    ringBuffer.reset()

    pipeline.start()

    input.installTap(onBus: 0, bufferSize: tapBufferSize, format: format) {
      [weak self] buffer, _ in
      self?.handleBuffer(buffer: buffer)
    }

    try? engine.start()
    isRunning = true
  }

  @objc(stop)
  func stop() {
    guard isRunning else { return }
    engine.inputNode.removeTap(onBus: 0)
    engine.stop()
    try? session.setActive(false)

    pipeline.stop()
    isRunning = false
    hasActiveSignal = false
    ringBuffer.reset()
  }

  private func handleBuffer(buffer: AVAudioPCMBuffer) {
    guard let data = buffer.floatChannelData?[0] else { return }

    let frameLength = Int(buffer.frameLength)
    let sampleRate = buffer.format.sampleRate
    let ts = Date().timeIntervalSince1970

    let tapRms = rms(pointer: data, count: frameLength)

    if !hasActiveSignal {
      if tapRms >= onsetThreshold {
        hasActiveSignal = true
        noteCounter = 0
        chordCounter = 0
        pipeline.onOnset(timestampSec: ts)
      }
    } else if tapRms <= releaseThreshold {
      hasActiveSignal = false
      noteCounter = 0
      chordCounter = 0
    }

    ringBuffer.push(data, count: frameLength)

    guard hasActiveSignal else {
      pipeline.tickSilenceCheck(nowSec: ts)
      return
    }

    noteCounter += frameLength
    while noteCounter >= NOTE_WINDOW {
      noteCounter -= NOTE_WINDOW
      if ringBuffer.readLast(into: &noteOut, count: NOTE_WINDOW) {
        let noteRms = rms(samples: noteOut)
        pipeline.onNoteSamples(
          samples: noteOut,
          timestampSec: ts,
          sampleRate: sampleRate,
          rms: noteRms
        )
      }
    }

    chordCounter += frameLength
    while chordCounter >= CHORD_WINDOW {
      chordCounter -= CHORD_WINDOW
      if ringBuffer.readLast(into: &chordOut, count: CHORD_WINDOW) {
        let chordRms = rms(samples: chordOut)
        pipeline.onChordSamples(
          samples: chordOut,
          timestampSec: ts,
          sampleRate: sampleRate,
          rms: chordRms
        )
      }
    }

    pipeline.tickSilenceCheck(nowSec: ts)
  }

  private func rms(samples: [Float]) -> Float {
    guard !samples.isEmpty else { return 0 }
    var s: Float = 0
    for x in samples { s += x * x }
    return sqrt(s / Float(samples.count))
  }

  private func rms(pointer: UnsafePointer<Float>, count: Int) -> Float {
    guard count > 0 else { return 0 }
    var s: Float = 0
    for i in 0..<count { s += pointer[i] * pointer[i] }
    return sqrt(s / Float(count))
  }
}
