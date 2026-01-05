//
//  Chroma.swift
//  SmartTabGuitarKaraoke
//
//  Converts FFT magnitude spectra into octave-independent
//  12-bin chroma vectors.
//  Mirrors services/chord/Chroma.ts
//

import Foundation

// MARK: - Constants

/// Below guitar range
private let MIN_FREQUENCY: Double = 60.0

/// Upper harmonic limit
private let MAX_FREQUENCY: Double = 2000.0

/// Numeric safety epsilon
private let EPS: Double = 1e-12

// MARK: - Helpers

/// Convert frequency (Hz) to MIDI (floating).
/// Returns nil if frequency is out of usable range.
@inline(__always)
private func frequencyToMidi(_ frequency: Double) -> Double? {
    guard frequency.isFinite else { return nil }
    guard frequency >= MIN_FREQUENCY, frequency <= MAX_FREQUENCY else {
        return nil
    }

    let midi = 69.0 + 12.0 * log2(frequency / 440.0)
    guard midi.isFinite else { return nil }
    return midi
}

// MARK: - Main API

/// Compute a normalized chroma vector from time-domain audio samples.
///
/// - Parameters:
///   - samples: time-domain PCM samples
///   - sampleRate: audio sample rate (Hz)
/// - Returns: 12-dimensional chroma vector
public func computeChromaVector(
    samples: [Float],
    sampleRate: Double
) -> ChromaVector {

    let fftSize = samples.count
    guard fftSize > 0 else {
        return Array(repeating: 0.0, count: 12)
    }

    // Apply Hann window to reduce spectral leakage
    let windowed = applyHannWindow(samples)

    // Prepare FFT buffers
    var real = windowed.map { Double($0) }
    var imag = Array(repeating: 0.0, count: fftSize)

    // FFT (same helper used in pitch side)
    let fft = FFT(size: fftSize)
    let magnitude = fft.magnitudeSpectrum(fromRealSignal: real)


    // Initialize chroma vector
    var chroma = Array(repeating: 0.0, count: 12)

    // Accumulate spectral energy into pitch classes (skip DC bin)
    for bin in 1..<magnitude.count {
        let freq = (Double(bin) * sampleRate) / Double(fftSize)

        // MIDI (float)
        guard let midi = frequencyToMidi(freq) else { continue }

        var m = magnitude[bin]

        // ---- Safety: magnitude should be finite & non-negative ----
        if !m.isFinite { continue }
        if m < 0 { continue }

        // Clamp extremely small magnitudes to avoid weird totalEnergy edge cases
        if m < EPS { m = EPS }

        // ---- Harmonic suppression (gentler) ----
        // m/bin was too aggressive for chords; sqrt keeps harmonics alive.
        let weighted = m / sqrt(Double(bin))

        // ---- Soft pitch-class assignment ----
        // Instead of rounding MIDI to a single pitch class (hard quantization),
        // distribute energy to adjacent pitch classes based on fractional MIDI.
        let base = Int(floor(midi))
        let frac = midi - floor(midi) // 0..1

        let pc1 = (base % 12 + 12) % 12
        let pc2 = ((base + 1) % 12 + 12) % 12

        chroma[pc1] += weighted * (1.0 - frac)
        chroma[pc2] += weighted * frac
    }

    // ---- Safety: sanitize chroma (kill NaN/inf if any slipped in) ----
    for i in 0..<12 {
        if !chroma[i].isFinite || chroma[i] < 0 {
            chroma[i] = 0
        }
    }

    // Normalize chroma vector
    let totalEnergy = chroma.reduce(0.0, +)

    // Guard against NaN/inf/zero
    guard totalEnergy.isFinite, totalEnergy > EPS else {
        return Array(repeating: 0.0, count: 12)
    }

    for i in 0..<12 {
        chroma[i] /= totalEnergy
    }

    return chroma
}
