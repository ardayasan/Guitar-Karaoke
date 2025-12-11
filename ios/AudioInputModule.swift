import Foundation
import AVFoundation
import React

@objc(AudioInputModule)
class AudioInputModule: RCTEventEmitter {

  private let engine = AVAudioEngine()
  private var isRunning = false
  private let session = AVAudioSession.sharedInstance()

  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  override func supportedEvents() -> [String]! {
    return ["AudioSamples"]
  }

  // MARK: - Start
  @objc(start)
  func start() {
    if isRunning {
      return
    }

    print("[NativeAudio] Starting audio engine...")

    do {
      try session.setCategory(.playAndRecord,
                              mode: .measurement,
                              options: [.defaultToSpeaker, .allowBluetooth, .mixWithOthers])
      try session.setActive(true)

      print("[NativeAudio] Audio session configured.")
    } catch {
      print("[NativeAudio] Failed to configure session: \(error)")
      return
    }

    let input = engine.inputNode
    let format = input.inputFormat(forBus: 0)

    print("[NativeAudio] Input format: \(format)")

    // Install Tap (real PCM stream)
    input.installTap(onBus: 0,
                      bufferSize: 2048,
                      format: format) { buffer, when in
      self.handleBuffer(buffer: buffer)
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

    isRunning = false
    print("[NativeAudio] Audio engine stopped.")
  }

private func handleBuffer(buffer: AVAudioPCMBuffer) {
    guard let channelData = buffer.floatChannelData?[0] else {
        print("[NativeAudio] No channel data")
        return
    }

    let frameLength = Int(buffer.frameLength)

    let samples = Array(
      UnsafeBufferPointer(start: channelData, count: frameLength)
    )

    let sampleRate = buffer.format.sampleRate

    self.sendEvent(withName: "AudioSamples", body: [
        "samples": samples,
        "length": frameLength,
        "timestamp": Date().timeIntervalSince1970,
        "sampleRate": sampleRate
    ])
}
}
