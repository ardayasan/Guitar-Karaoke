//
//  YinPitchDetector.swift
//  SmartTabGuitarKaraoke
//
//  JS-parity implementation of YIN pitch detection
//

import Foundation

// MARK: - Result

public struct YinResult {
    public let frequency: Double
    public let confidence: Double
    public let periodicity: Double
}

// MARK: - Detector

public final class YinPitchDetector {

    private var sampleRate: Double
    private var threshold: Double
    private var bufferSize: Int

    public init(
        sampleRate: Double,
        threshold: Double = 0.15,
        bufferSize: Int = 2048
    ) {
        self.sampleRate = sampleRate
        self.threshold = threshold
        self.bufferSize = bufferSize
    }

    // MARK: - Main API (JS parity)

    public func detect(samples: [Float]) -> YinResult? {
        // JS assumes samples.length === bufferSize
        if samples.count != bufferSize { return nil }

        let halfSize = bufferSize / 2
        if halfSize < 2 { return nil }

        var yinBuffer = Array(repeating: 0.0, count: halfSize)

        // Step 1: Difference
        differenceFunction(samples: samples, yinBuffer: &yinBuffer)

        // Step 2: CMND
        cumulativeMeanNormalizedDifference(yinBuffer: &yinBuffer)

        // Step 3: Threshold
        var tau = absoluteThreshold(yinBuffer: yinBuffer)

        // Step 3b: Fallback (global minimum)
        if tau == -1 {
            tau = findGlobalMinimum(yinBuffer: yinBuffer)
            if tau == -1 { return nil }
        }

        // Step 4: Parabolic interpolation
        let betterTau = parabolicInterpolation(yinBuffer: yinBuffer, tau: tau)
        if betterTau <= 0 { return nil }

        let frequency = sampleRate / betterTau
        let confidence = max(0.0, 1.0 - yinBuffer[tau])
        let periodicity = calculatePeriodicity(yinBuffer: yinBuffer)

        return YinResult(
            frequency: frequency,
            confidence: confidence,
            periodicity: periodicity
        )
    }

    // MARK: - Algorithm steps

    private func differenceFunction(
        samples: [Float],
        yinBuffer: inout [Double]
    ) {
        let halfSize = yinBuffer.count
        for tau in 0..<halfSize {
            var sum = 0.0
            for i in 0..<halfSize {
                let delta = Double(samples[i]) - Double(samples[i + tau])
                sum += delta * delta
            }
            yinBuffer[tau] = sum
        }
    }

    private func cumulativeMeanNormalizedDifference(
        yinBuffer: inout [Double]
    ) {
        yinBuffer[0] = 1.0
        var runningSum = 0.0

        for tau in 1..<yinBuffer.count {
            runningSum += yinBuffer[tau]
            yinBuffer[tau] *= Double(tau) / runningSum
        }
    }

    private func absoluteThreshold(
        yinBuffer: [Double]
    ) -> Int {
        let minTau = Int(floor(sampleRate / 1500.0))
        let maxTau = Int(floor(sampleRate / 40.0))

        let startTau = max(2, minTau)
        let endTau = min(yinBuffer.count - 1, maxTau)

        var tau = startTau
        while tau < endTau {
            if yinBuffer[tau] < threshold {
                while tau + 1 < endTau &&
                      yinBuffer[tau + 1] < yinBuffer[tau] {
                    tau += 1
                }
                return tau
            }
            tau += 1
        }

        return -1
    }

    private func findGlobalMinimum(
        yinBuffer: [Double]
    ) -> Int {
        var minVal = Double.infinity
        var idx = -1

        for i in 2..<yinBuffer.count {
            if yinBuffer[i] < minVal {
                minVal = yinBuffer[i]
                idx = i
            }
        }
        return idx
    }

    private func parabolicInterpolation(
        yinBuffer: [Double],
        tau: Int
    ) -> Double {
        if tau <= 0 || tau >= yinBuffer.count - 1 {
            return Double(tau)
        }

        let s0 = yinBuffer[tau - 1]
        let s1 = yinBuffer[tau]
        let s2 = yinBuffer[tau + 1]

        let denom = 2 * (2 * s1 - s2 - s0)
        if denom == 0 { return Double(tau) }

        return Double(tau) + (s2 - s0) / denom
    }

    private func calculatePeriodicity(
        yinBuffer: [Double]
    ) -> Double {
        var minVal = 1.0
        for i in 1..<yinBuffer.count {
            if yinBuffer[i] < minVal {
                minVal = yinBuffer[i]
            }
        }
        return 1.0 - minVal
    }

    // MARK: - Runtime updates

    public func setThreshold(_ threshold: Double) {
        self.threshold = threshold
    }

    public func setBufferSize(_ bufferSize: Int) {
        self.bufferSize = bufferSize
    }

    public func setSampleRate(_ sampleRate: Double) {
        self.sampleRate = sampleRate
    }
}
