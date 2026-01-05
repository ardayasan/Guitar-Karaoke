import Foundation
import AVFoundation
import React

@objc(AudioInputModule)
final class AudioInputModule: RCTEventEmitter {

  // MARK: - Audio Engine & Session
  private let engine = AVAudioEngine()
  private let session = AVAudioSession.sharedInstance()
  private var isRunning = false

  // MARK: - Native Pipeline (NEW)
  private let pipeline = NativeAudioPipeline()

  // MARK: - Windowing
  private let tapBufferSize: AVAudioFrameCount = 1024

  private let NOTE_WINDOW = 2048
  private let CHORD_WINDOW = 8192

  private let RING_SIZE = 16384
  private lazy var ringBuffer = AudioRingBuffer(size: RING_SIZE)

  private var noteCounter = 0
  private var chordCounter = 0

  private lazy var noteOut: [Float] = Array(repeating: 0, count: NOTE_WINDOW)
  private lazy var chordOut: [Float] = Array(repeating: 0, count: CHORD_WINDOW)

  // MARK: - Onset (Hysteresis)
  private var hasActiveSignal = false
  private let onsetThreshold: Float = 0.0015
  private let releaseThreshold: Float = 0.0008

  // MARK: - React Native
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  override func supportedEvents() -> [String]! {
    // 🔒 SINGLE CONTRACT EVENT
    return ["AudioDetection"]
  }

  override init() {
    super.init()

    // Pipeline → JS bridge
    pipeline.emitDetection = { [weak self] payload in
      guard let self else { return }
      let body: Any = payload ?? NSNull()
      self.sendEvent(withName: "AudioDetection", body: body)
    }
  }

  // MARK: - Start
  @objc(start)
  func start() {
    if isRunning { return }

    print("[NativeAudio] Starting audio engine...")

    do {
      try session.setCategory(
        .playAndRecord,
        mode: .measurement,
        options: [.defaultToSpeaker, .allowBluetooth, .mixWithOthers]
      )
      try session.setActive(true)
    } catch {
      print("[NativeAudio] Failed to configure session: \(error)")
      return
    }

    let input = engine.inputNode
    let format = input.inputFormat(forBus: 0)

    // Reset state
    hasActiveSignal = false
    noteCounter = 0
    chordCounter = 0
    ringBuffer.reset()

    pipeline.start()

    input.installTap(
      onBus: 0,
      bufferSize: tapBufferSize,
      format: format
    ) { [weak self] buffer, _ in
      self?.handleBuffer(buffer: buffer)
    }

    do {
      try engine.start()
      isRunning = true
      print("[NativeAudio] Audio engine started.")
    } catch {
      print("[NativeAudio] ERROR starting AVAudioEngine: \(error)")
    }
  }

  // MARK: - Stop
  @objc(stop)
  func stop() {
    if !isRunning { return }

    print("[NativeAudio] Stopping audio engine...")

    engine.inputNode.removeTap(onBus: 0)
    engine.stop()

    do {
      try session.setActive(false)
    } catch {
      print("[NativeAudio] WARNING: Could not deactivate session: \(error)")
    }

    pipeline.stop()

    isRunning = false
    hasActiveSignal = false
    noteCounter = 0
    chordCounter = 0
    ringBuffer.reset()
  }

  // MARK: - Buffer Handling
  private func handleBuffer(buffer: AVAudioPCMBuffer) {
    guard let channelData = buffer.floatChannelData?[0] else { return }

    let frameLength = Int(buffer.frameLength)
    if frameLength <= 0 { return }

    let sampleRate = buffer.format.sampleRate
    let timestamp = Date().timeIntervalSince1970

    // ---- RMS (on tap buffer) ----
    let rms = calculateRMS(channelData: channelData, count: frameLength)

    // ---- Onset / Release ----
    if !hasActiveSignal {
      if rms >= onsetThreshold {
        hasActiveSignal = true
        noteCounter = 0
        chordCounter = 0
        pipeline.onOnset(timestampSec: timestamp)
      }
    } else {
      if rms <= releaseThreshold {
        hasActiveSignal = false
        noteCounter = 0
        chordCounter = 0
      }
    }

    // ---- Ring buffer always fills ----
    ringBuffer.push(channelData, count: frameLength)

    guard hasActiveSignal else {
      pipeline.tickSilenceCheck(nowSec: timestamp)
      return
    }

    // ---- NOTE window ----
    noteCounter += frameLength
    while noteCounter >= NOTE_WINDOW {
      noteCounter -= NOTE_WINDOW
      if ringBuffer.readLast(into: &noteOut, count: NOTE_WINDOW) {
        pipeline.onNoteSamples(
          samples: noteOut,
          timestampSec: timestamp,
          sampleRate: sampleRate,
          rms: rms
        )
      }
    }

    // ---- CHORD window (v2 için hazır, şimdilik pasif) ----
    chordCounter += frameLength
    while chordCounter >= CHORD_WINDOW {
        chordCounter -= CHORD_WINDOW
        if ringBuffer.readLast(into: &chordOut, count: CHORD_WINDOW) {
          pipeline.onChordSamples(
            samples: chordOut,
            timestampSec: timestamp,
            sampleRate: sampleRate,
            rms: rms
          )
        }
    }

    pipeline.tickSilenceCheck(nowSec: timestamp)
  }

  // MARK: - RMS helper
  private func calculateRMS(
    channelData: UnsafePointer<Float>,
    count: Int
  ) -> Float {
    guard count > 0 else { return 0 }
    var sum: Float = 0
    for i in 0..<count {
      let x = channelData[i]
      sum += x * x
    }
    return sqrt(sum / Float(count))
  }
}
