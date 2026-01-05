//
//  YinResult.swift
//  SmartTabGuitarKaraoke
//
//  Created by Burak Kuruçay on 5.01.2026.
//


//
//  YinResult.swift
//  SmartTabGuitarKaraoke
//
//  Created by Burak Kuruçay on 5.01.2026.
//


import Foundation

// MARK: - YIN Result
public struct YinResult {
    public let frequency: Double       // Hz
    public let confidence: Double      // 0..1
    public let periodicity: Double     // 0..1 (global clarity)

    public init(frequency: Double, confidence: Double, periodicity: Double) {
        self.frequency = frequency
        self.confidence = confidence
        self.periodicity = periodicity
    }
}

/// YIN Pitch Detector (Swift)
/// --------------------------------------------------
/// Port of your TS implementation:
/// - Difference function
/// - CMND normalization
/// - Absolute threshold search
/// - Global min fallback (for shallow dips, low strings)
/// - Parabolic interpolation
///
/// Assumptions:
/// - Mono PCM normalized [-1, 1]
/// - bufferSize equals samples.count (NOTE window, e.g. 2048)
public final class YinPitchDetector {

    private var sampleRate: Double
    private var threshold: Double
    private var bufferSize: Int

    public init(sampleRate: Double, threshold: Double = 0.15, bufferSize: Int = 2048) {
        self.sampleRate = sampleRate
        self.threshold = threshold
        self.bufferSize = bufferSize
    }

    // MARK: - Public API

    /// Main pitch detection entry.
    /// Returns nil if no stable pitch found.
    public func detect(samples: [Float]) -> YinResult? {
        // Keep behavior aligned with TS: expects fixed-size window.
        // If a mismatch happens, fail fast (native layer should guarantee correct size).
        guard samples.count >= bufferSize else { return nil }

        let halfSize = bufferSize / 2
        if halfSize < 2 { return nil }

        // yinBuffer length = bufferSize/2
        var yinBuffer = Array(repeating: 0.0, count: halfSize)

        // Step 1: Difference function
        differenceFunction(samples: samples, yinBuffer: &yinBuffer)

        // Step 2: CMND normalization
        cumulativeMeanNormalizedDifference(yinBuffer: &yinBuffer)

        // Step 3: threshold crossing
        var tau = absoluteThreshold(yinBuffer: yinBuffer)

        // Fallback: if no threshold crossing exists, pick global minimum (low strings)
        if tau == -1 {
            tau = findGlobalMinimum(yinBuffer: yinBuffer)
            if tau == -1 { return nil }
        }

        // Step 4: parabolic interpolation
        let betterTau = parabolicInterpolation(yinBuffer: yinBuffer, tau: tau)
        if betterTau <= 0 { return nil }

        let frequency = sampleRate / betterTau

        // TS: confidence = max(0, 1 - yinBuffer[tau])
        let confidence = max(0.0, 1.0 - yinBuffer[tau])

        // TS periodicity: 1 - global min(CMND)
        let periodicity = calculatePeriodicity(yinBuffer: yinBuffer)

        return YinResult(frequency: frequency, confidence: confidence, periodicity: periodicity)
    }

    // MARK: - Algorithm Steps (Ported)

    /// Step 1: Difference Function
    private func differenceFunction(samples: [Float], yinBuffer: inout [Double]) {
        let halfSize = yinBuffer.count
        // TS loops tau in 0..<halfSize, and i in 0..<halfSize using samples[i + tau]
        // This assumes samples length >= halfSize + tau (hence bufferSize >= 2*halfSize).
        for tau in 0..<halfSize {
            var sum = 0.0
            for i in 0..<halfSize {
                let delta = Double(samples[i]) - Double(samples[i + tau])
                sum += delta * delta
            }
            yinBuffer[tau] = sum
        }
    }

    /// Step 2: CMND
    private func cumulativeMeanNormalizedDifference(yinBuffer: inout [Double]) {
        yinBuffer[0] = 1.0
        var runningSum = 0.0

        // TS: yinBuffer[tau] *= tau / runningSum
        // Beware runningSum==0; but tau starts at 1, runningSum adds yinBuffer[tau] first.
        for tau in 1..<yinBuffer.count {
            runningSum += yinBuffer[tau]
            if runningSum == 0 {
                yinBuffer[tau] = 1.0
            } else {
                yinBuffer[tau] = yinBuffer[tau] * (Double(tau) / runningSum)
            }
        }
    }

    /// Step 3: Absolute threshold search (first tau below threshold)
    private func absoluteThreshold(yinBuffer: [Double]) -> Int {
        // TS:
        // minTau = floor(sampleRate/1500)
        // maxTau = floor(sampleRate/40)
        let minTau = Int(floor(sampleRate / 1500.0))
        let maxTau = Int(floor(sampleRate / 40.0))

        let startTau = max(2, minTau)
        let endTau = min(yinBuffer.count - 1, maxTau)

        guard startTau < endTau else { return -1 }

        var tau = startTau
        while tau < endTau {
            if yinBuffer[tau] < threshold {
                // local min refinement: move forward while still descending
                while (tau + 1) < endTau, yinBuffer[tau + 1] < yinBuffer[tau] {
                    tau += 1
                }
                return tau
            }
            tau += 1
        }

        return -1
    }

    /// Fallback: global minimum of CMND
    private func findGlobalMinimum(yinBuffer: [Double]) -> Int {
        var minValue = Double.infinity
        var idx = -1

        // TS starts at 2
        if yinBuffer.count <= 2 { return -1 }

        for i in 2..<yinBuffer.count {
            if yinBuffer[i] < minValue {
                minValue = yinBuffer[i]
                idx = i
            }
        }
        return idx
    }

    /// Step 4: Parabolic interpolation
    private func parabolicInterpolation(yinBuffer: [Double], tau: Int) -> Double {
        if tau <= 0 || tau >= yinBuffer.count - 1 {
            return Double(tau)
        }

        let s0 = yinBuffer[tau - 1]
        let s1 = yinBuffer[tau]
        let s2 = yinBuffer[tau + 1]

        let denom = 2.0 * (2.0 * s1 - s2 - s0)
        if denom == 0 {
            return Double(tau)
        }

        let adjustment = (s2 - s0) / denom
        return Double(tau) + adjustment
    }

    /// Global periodicity = 1 - min(CMND)
    private func calculatePeriodicity(yinBuffer: [Double]) -> Double {
        var minValue = 1.0
        for i in 1..<yinBuffer.count {
            if yinBuffer[i] < minValue {
                minValue = yinBuffer[i]
            }
        }
        return max(0.0, 1.0 - minValue)
    }

    // MARK: - Runtime updates (match TS)

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
