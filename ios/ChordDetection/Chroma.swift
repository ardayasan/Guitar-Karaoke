//
//  Chroma.swift
//  SmartTabGuitarKaraoke
//
//  Octave-independent chroma extraction (12-bin).
//  Mirrors services/chord/Chroma.ts exactly:
//
//    - Hann window
//    - Real FFT magnitude (N/2 bins, Nyquist excluded like JS FFT.getMagnitudeSpectrum)
//    - Hard pitch-class mapping via round(midi) % 12
//    - Accumulate energy into chroma bins
//    - Normalize to sum=1
//

import Foundation
import Accelerate

// MARK: - Constants (JS parity)

private let MIN_FREQUENCY: Double = 60.0
private let MAX_FREQUENCY: Double = 2000.0

// MARK: - Helpers (JS parity)

/// JS parity:
/// midi = 69 + 12*log2(f/440)
/// pc = round(midi) % 12  (wrapped into 0..11)
private func frequencyToPitchClass(_ frequency: Double) -> PitchClass? {
    if frequency < MIN_FREQUENCY || frequency > MAX_FREQUENCY { return nil }
    if !frequency.isFinite || frequency <= 0 { return nil }

    let midi = 69.0 + 12.0 * log2(frequency / 440.0)
    if !midi.isFinite { return nil }

    let rounded = Int(midi.rounded())
    let pc = ((rounded % 12) + 12) % 12
    return pc
}

@inline(__always)
private func isPowerOfTwo(_ n: Int) -> Bool {
    n > 0 && (n & (n - 1)) == 0
}

@inline(__always)
private func nextPowerOfTwo(_ n: Int) -> Int {
    var v = max(1, n)
    v -= 1
    v |= v >> 1
    v |= v >> 2
    v |= v >> 4
    v |= v >> 8
    v |= v >> 16
    return v + 1
}

// MARK: - FFT Magnitude (Real input) – self-contained (no dependency on your FFT.swift)

/// Computes magnitude spectrum for REAL input signal.
/// Output length = N/2 (bins 0..N/2-1), Nyquist excluded (matches your earlier contract).
private func magnitudeSpectrumReal(_ signal: [Double]) -> [Double] {
    let n = signal.count
    precondition(isPowerOfTwo(n), "FFT size must be power of two")

    let halfN = n / 2
    let log2n = vDSP_Length(log2(Double(n)))

    guard let setup = vDSP_create_fftsetupD(log2n, FFTRadix(kFFTRadix2)) else {
        return Array(repeating: 0.0, count: halfN)
    }
    defer { vDSP_destroy_fftsetupD(setup) }

    // Pack real signal for vDSP_fft_zripD:
    // realp[i] = x[2i], imagp[i] = x[2i+1]
    var realp = [Double](repeating: 0.0, count: halfN)
    var imagp = [Double](repeating: 0.0, count: halfN)

    for i in 0..<halfN {
        realp[i] = signal[2 * i]
        imagp[i] = signal[2 * i + 1]
    }

    realp.withUnsafeMutableBufferPointer { rPtr in
        imagp.withUnsafeMutableBufferPointer { iPtr in
            var split = DSPDoubleSplitComplex(
                realp: rPtr.baseAddress!,
                imagp: iPtr.baseAddress!
            )
            vDSP_fft_zripD(setup, &split, 1, log2n, FFTDirection(FFT_FORWARD))
        }
    }

    // Magnitude spectrum length N/2 (Nyquist excluded):
    // bin0: DC only = abs(realp[0])
    // bins 1..halfN-1: sqrt(re^2 + im^2)
    var mag = [Double](repeating: 0.0, count: halfN)
    mag[0] = abs(realp[0])

    if halfN > 1 {
        for k in 1..<halfN {
            let re = realp[k]
            let im = imagp[k]
            mag[k] = sqrt(re * re + im * im)
        }
    }

    // Normalize (vDSP FFT is unnormalized) – parity with earlier FFT.swift
    let scale = 1.0 / Double(n)
    vDSP_vsmulD(mag, 1, [scale], &mag, 1, vDSP_Length(halfN))

    // Sanitize
    for i in 0..<mag.count {
        if !mag[i].isFinite || mag[i] < 0 { mag[i] = 0 }
    }

    return mag
}

// MARK: - Main API

/// JS parity computeChromaVector(samples, sampleRate)
public func computeChromaVector(
    samples: [Float],
    sampleRate: Double
) -> ChromaVector {
    guard !samples.isEmpty else {
        return Array(repeating: 0.0, count: 12)
    }
    guard sampleRate.isFinite, sampleRate > 0 else {
        return Array(repeating: 0.0, count: 12)
    }

    // JS assumes fftSize = samples.length (power of two in your pipeline windows).
    // For safety: if not power-of-two, zero-pad to next power-of-two.
    let fftSize: Int = isPowerOfTwo(samples.count) ? samples.count : nextPowerOfTwo(samples.count)

    var padded = samples
    if padded.count < fftSize {
        padded.append(contentsOf: repeatElement(0, count: fftSize - padded.count))
    } else if padded.count > fftSize {
        padded = Array(padded.prefix(fftSize))
    }

    // Apply Hann window (use your existing helper; it matches JS intent)
    let windowed: [Float] = applyHannWindow(padded)

    // Convert to Double for vDSP
    let realSignal: [Double] = windowed.map { Double($0) }

    // FFT magnitude (N/2 bins)
    let magnitude = magnitudeSpectrumReal(realSignal)

    // Accumulate into chroma bins (skip DC bin: bin=1..)
    var chroma = [Double](repeating: 0.0, count: 12)

    if magnitude.count > 1 {
        for bin in 1..<magnitude.count {
            let freq = (Double(bin) * sampleRate) / Double(fftSize)
            guard let pc = frequencyToPitchClass(freq) else { continue }
            chroma[pc] += magnitude[bin]
        }
    }

    // Normalize
    let totalEnergy = chroma.reduce(0.0, +)
    if totalEnergy > 0, totalEnergy.isFinite {
        for i in 0..<12 { chroma[i] /= totalEnergy }
    } else {
        return Array(repeating: 0.0, count: 12)
    }

    return chroma
}
