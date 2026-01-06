//
//  FFT.swift
//  SmartTabGuitarKaraoke
//
//  JS FFT parity implementation using Accelerate
//  Matches behavior of services/audio/fft.ts
//

import Foundation
import Accelerate

final class FFT {

    private let size: Int
    private let log2n: vDSP_Length
    private let setup: FFTSetupD

    init(size: Int) {
        precondition(size > 0 && (size & (size - 1)) == 0,
                     "FFT size must be power of two")

        self.size = size
        self.log2n = vDSP_Length(log2(Double(size)))

        guard let setup = vDSP_create_fftsetupD(log2n, FFTRadix(kFFTRadix2)) else {
            fatalError("Failed to create FFT setup")
        }
        self.setup = setup
    }

    deinit {
        vDSP_destroy_fftsetupD(setup)
    }

    // MARK: - Forward FFT (JS parity)

    /// Performs FFT on real-valued input.
    /// Imaginary part is assumed to be zero.
    func forward(realInput: [Double]) -> (real: [Double], imag: [Double]) {
        precondition(realInput.count == size)

        var real = realInput
        var imag = [Double](repeating: 0.0, count: size)

        real.withUnsafeMutableBufferPointer { realPtr in
            imag.withUnsafeMutableBufferPointer { imagPtr in
                var split = DSPDoubleSplitComplex(
                    realp: realPtr.baseAddress!,
                    imagp: imagPtr.baseAddress!
                )

                vDSP_fft_zipD(
                    setup,
                    &split,
                    1,
                    log2n,
                    FFTDirection(FFT_FORWARD)
                )
            }
        }

        return (real, imag)
    }

    // MARK: - Magnitude spectrum (JS parity)

    /// Returns magnitude spectrum (size / 2)
    /// NO normalization (matches JS)
    func magnitudeSpectrum(
        real: [Double],
        imag: [Double]
    ) -> [Double] {

        let half = size / 2
        var mag = [Double](repeating: 0.0, count: half)

        for i in 0..<half {
            let re = real[i]
            let im = imag[i]
            mag[i] = sqrt(re * re + im * im)
        }

        return mag
    }

    func getSize() -> Int {
        return size
    }
}
