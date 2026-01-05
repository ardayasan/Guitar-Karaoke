//
//  FFT.swift
//  SmartTabGuitarKaraoke
//
//  Real FFT helper for chord detection.
//  Uses Accelerate (vDSP) correctly for REAL input.
//
//  IMPORTANT:
//  - Input is real PCM samples.
//  - Output magnitude spectrum length = N/2 (Nyquist excluded).
//

import Foundation
import Accelerate

final class FFT {

    private let n: Int
    private let log2n: vDSP_Length
    private let setup: FFTSetupD

    // Working buffers (N/2)
    private var realp: [Double]
    private var imagp: [Double]

    init(size: Int) {
        precondition(size > 0 && (size & (size - 1)) == 0, "FFT size must be power of two")

        self.n = size
        self.log2n = vDSP_Length(log2(Double(size)))

        guard let s = vDSP_create_fftsetupD(log2n, FFTRadix(kFFTRadix2)) else {
            fatalError("vDSP_create_fftsetupD failed")
        }
        self.setup = s

        // For vDSP_fft_zripD: split complex holds N/2 values
        self.realp = Array(repeating: 0.0, count: size / 2)
        self.imagp = Array(repeating: 0.0, count: size / 2)
    }

    deinit {
        vDSP_destroy_fftsetupD(setup)
    }

    /// Returns magnitude spectrum for real input.
    /// - Parameter signal: time-domain real samples (Double) length N
    /// - Returns: magnitude spectrum length N/2 (bins 0..N/2-1), Nyquist excluded
    func magnitudeSpectrum(fromRealSignal signal: [Double]) -> [Double] {
        precondition(signal.count == n, "Signal length must match FFT size")

        let halfN = n / 2

        // -----------------------------
        // ✅ Correct real-signal packing
        // vDSP_fft_zripD expects:
        // realp[i] = x[2i], imagp[i] = x[2i+1]
        // -----------------------------
        for i in 0..<halfN {
            realp[i] = signal[2 * i]
            imagp[i] = signal[2 * i + 1]
        }

        // Perform in-place real FFT
        realp.withUnsafeMutableBufferPointer { rPtr in
            imagp.withUnsafeMutableBufferPointer { iPtr in
                var split = DSPDoubleSplitComplex(
                    realp: rPtr.baseAddress!,
                    imagp: iPtr.baseAddress!
                )
                vDSP_fft_zripD(setup, &split, 1, log2n, FFTDirection(FFT_FORWARD))
            }
        }

        // -----------------------------
        // Magnitude spectrum (N/2 bins)
        // NOTE:
        // For real FFT output:
        //   realp[0] = DC (real)
        //   imagp[0] = Nyquist (real)  <-- we EXCLUDE Nyquist by contract
        // So bin 0 must be handled specially.
        // -----------------------------
        var mag = [Double](repeating: 0.0, count: halfN)

        // Bin 0 (DC only)
        let dc = realp[0]
        mag[0] = abs(dc)

        // Bins 1..N/2-1 (Nyquist excluded)
        if halfN > 1 {
            for k in 1..<halfN {
                let re = realp[k]
                let im = imagp[k]
                let m = sqrt(re * re + im * im)
                mag[k] = m
            }
        }

        // Normalize (vDSP FFT is unnormalized)
        let scale = 1.0 / Double(n)
        vDSP_vsmulD(mag, 1, [scale], &mag, 1, vDSP_Length(halfN))

        // Sanitize
        for k in 0..<mag.count {
            if !mag[k].isFinite || mag[k] < 0 { mag[k] = 0 }
        }

        return mag
    }
}
