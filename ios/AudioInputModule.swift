import Foundation
import AVFoundation
import React

@objc(AudioInputModule)
final class AudioInputModule: RCTEventEmitter {

  // MARK: - Audio Engine & Session
  private let engine = AVAudioEngine()
  private let session = AVAudioSession.sharedInstance()
  private var isRunning = false

  // MARK: - Windowing (Native → JS)
  // Tap callback size: keep small for low latency
  private let tapBufferSize: AVAudioFrameCount = 1024

  // Analysis windows (pulled from ring buffer)
  private let NOTE_WINDOW = 2048
  private let CHORD_WINDOW = 8192

  // Ring buffer must be >= largest window (prefer headroom)
  private let RING_SIZE = 16384
  private lazy var ringBuffer = AudioRingBuffer(size: RING_SIZE)

  // Counters to decide when to emit events (use -= to avoid drift)
  private var noteCounter = 0
  private var chordCounter = 0

  // MARK: - Preallocated output buffers (allocation-free reads)
  private lazy var noteOut: [Float] = Array(repeating: 0, count: NOTE_WINDOW)
  private lazy var chordOut: [Float] = Array(repeating: 0, count: CHORD_WINDOW)

  // MARK: - Onset (Signal Start / Stop)
  private var hasActiveSignal = false

  // RMS thresholds:
  // - onsetThreshold: signal must exceed this to be considered "started"
  // - releaseThreshold: signal must fall below this to be considered "ended" (hysteresis)
    private let onsetThreshold: Float = 0.0015
    private let releaseThreshold: Float = 0.0008

  // MARK: - React Native
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  override func supportedEvents() -> [String]! {
    // Separate events for separate pipelines + onset state change
    return ["Onset", "NoteSamples", "ChordSamples"]
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
      print("[NativeAudio] Audio session configured.")
    } catch {
      print("[NativeAudio] Failed to configure session: \(error)")
      return
    }

    let input = engine.inputNode
    let format = input.inputFormat(forBus: 0)

    print("[NativeAudio] Input format: \(format)")

    // Reset state for clean start
    hasActiveSignal = false
    noteCounter = 0
    chordCounter = 0
    ringBuffer.reset()

    // Install Tap (low-latency PCM stream)
    input.installTap(onBus: 0, bufferSize: tapBufferSize, format: format) { [weak self] buffer, _ in
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

    // Reset state for next run
    isRunning = false
    hasActiveSignal = false
    noteCounter = 0
    chordCounter = 0
    ringBuffer.reset()

    print("[NativeAudio] Audio engine stopped.")
  }

  // MARK: - Buffer Handling
  private func handleBuffer(buffer: AVAudioPCMBuffer) {
    guard let channelData = buffer.floatChannelData?[0] else {
      print("[NativeAudio] No channel data")
      return
    }

    let frameLength = Int(buffer.frameLength)
    if frameLength <= 0 { return }

    let sampleRate = buffer.format.sampleRate
    let timestamp = Date().timeIntervalSince1970

    // 0) Onset detection (RMS with hysteresis)
    //    We compute RMS on the small tap buffer (1024) to cheaply detect signal start/stop.
    let rms = calculateRMS(channelData: channelData, count: frameLength)

    if !hasActiveSignal {
      // Detect start of a new signal
      if rms >= onsetThreshold {
        hasActiveSignal = true
        noteCounter = 0
        chordCounter = 0

        // Emit onset event (no samples needed; it's a state marker)
        sendEvent(withName: "Onset", body: [
          "timestamp": timestamp,
          "sampleRate": sampleRate,
          "rms": rms
        ])
      }
    } else {
      // Detect end of signal (hysteresis via lower threshold)
      if rms <= releaseThreshold {
        hasActiveSignal = false
        noteCounter = 0
        chordCounter = 0
        // We intentionally don't emit windows while silent.
        // If you ever want, you can add an "Offset" event here.
      }
    }

    // 1) Push newest samples into the ring buffer (always)
    ringBuffer.push(channelData, count: frameLength)

    // If we are in silence, don't emit analysis windows.
    // (Ring buffer still fills, which is fine.)
    guard hasActiveSignal else { return }

    // 2) NOTE WINDOW (frequent, low latency)
    noteCounter += frameLength
    while noteCounter >= NOTE_WINDOW {
      noteCounter -= NOTE_WINDOW

      if ringBuffer.readLast(into: &noteOut, count: NOTE_WINDOW) {
        sendEvent(withName: "NoteSamples", body: [
          "samples": noteOut,
          "length": NOTE_WINDOW,
          "timestamp": timestamp,
          "sampleRate": sampleRate,
          "rms": rms
        ])
      }
    }

    // 3) CHORD WINDOW (less frequent, higher stability)
    chordCounter += frameLength
    while chordCounter >= CHORD_WINDOW {
      chordCounter -= CHORD_WINDOW

      if ringBuffer.readLast(into: &chordOut, count: CHORD_WINDOW) {
        sendEvent(withName: "ChordSamples", body: [
          "samples": chordOut,
          "length": CHORD_WINDOW,
          "timestamp": timestamp,
          "sampleRate": sampleRate,
          "rms": rms
        ])
      }
    }
  }

  // MARK: - RMS helper
  private func calculateRMS(channelData: UnsafePointer<Float>, count: Int) -> Float {
    if count <= 0 { return 0 }

    var sum: Float = 0
    for i in 0..<count {
      let x = channelData[i]
      sum += x * x
    }
    return sqrt(sum / Float(count))
  }
}
