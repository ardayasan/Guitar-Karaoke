import Foundation

/// Lock-free, allocation-free ring buffer for real-time audio.
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

    var remaining = count
    var srcIndex = 0

    while remaining > 0 {
      let spaceToEnd = size - writeIndex
      let copyCount = min(spaceToEnd, remaining)

      // Copy chunk
      buffer.withUnsafeMutableBufferPointer { dst in
        memcpy(
          dst.baseAddress!.advanced(by: writeIndex),
          samples.advanced(by: srcIndex),
          copyCount * MemoryLayout<Float>.size
        )
      }

      writeIndex += copyCount
      if writeIndex == size {
        writeIndex = 0
      }

      srcIndex += copyCount
      remaining -= copyCount
    }

    // Track how much of the buffer is valid
    filled = min(size, filled + count)
  }

  // MARK: - Read
  /// Reads the last `count` samples into a preallocated output buffer.
  /// Returns false if not enough samples are available yet.
  func readLast(into out: inout [Float], count: Int) -> Bool {
    guard count <= size else { return false }
    guard count <= filled else { return false }
    guard out.count >= count else { return false }

    var startIndex = writeIndex - count
    if startIndex < 0 {
      startIndex += size
    }

    let firstPart = min(size - startIndex, count)
    let secondPart = count - firstPart

    // First contiguous copy
    out.withUnsafeMutableBufferPointer { dst in
      buffer.withUnsafeBufferPointer { src in
        memcpy(
          dst.baseAddress!,
          src.baseAddress!.advanced(by: startIndex),
          firstPart * MemoryLayout<Float>.size
        )
      }
    }

    // Wrapped copy (if needed)
    if secondPart > 0 {
      out.withUnsafeMutableBufferPointer { dst in
        buffer.withUnsafeBufferPointer { src in
          memcpy(
            dst.baseAddress!.advanced(by: firstPart),
            src.baseAddress!,
            secondPart * MemoryLayout<Float>.size
          )
        )
      }
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
