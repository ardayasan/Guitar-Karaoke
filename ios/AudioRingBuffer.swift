import Foundation

/// Lock-free ring buffer for real-time audio.
/// Designed to be used ONLY from the audio tap thread.
final class AudioRingBuffer {

  // MARK: - Storage
  private var buffer: [Float]
  private var writeIndex: Int = 0
  private var filled: Int = 0   // how many valid samples exist

  let size: Int

  // MARK: - Init
  init(size: Int) {
    precondition(size > 0, "RingBuffer size must be > 0")
    self.size = size
    self.buffer = Array(repeating: 0, count: size)
  }

  // MARK: - Push (audio thread only)
  /// Push new PCM samples into the ring buffer
  func push(_ samples: UnsafePointer<Float>, count: Int) {
    guard count > 0 else { return }

    for i in 0..<count {
      buffer[writeIndex] = samples[i]
      writeIndex += 1
      if writeIndex == size {
        writeIndex = 0
      }
    }

    filled = min(size, filled + count)
  }

  // MARK: - Read
  /// Reads the last `count` samples.
  /// Returns nil if not enough samples exist yet.
func readLast(into out: inout [Float], count: Int) -> Bool {
  guard count <= filled else { return false }
  guard out.count >= count else { return false }

  var start = writeIndex - count
  if start < 0 { start += size }

  for i in 0..<count {
    out[i] = buffer[(start + i) % size]
  }
  return true
}


  // MARK: - State helpers
  func reset() {
    writeIndex = 0
    filled = 0
  }

  func availableSamples() -> Int {
    return filled
  }

  func isReady(for windowSize: Int) -> Bool {
    return filled >= windowSize
  }
}
