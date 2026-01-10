import Foundation

// MARK: - PitchDetectionService
// --------------------------------------------------
// JS parity implementation.
// Mirrors services/audio/PitchDetectionService.ts
//
// Responsibilities:
// - YIN pitch detection (RAW buffer)
// - Zero-crossing fallback (HANN windowed)
// - Confidence gating
// - Frequency range gating
// - Frequency → Note conversion
//
// IMPORTANT:
// - No RMS / amplitude gate here
// - No onset / silence logic here
// - No smoothing filter here
// --------------------------------------------------

final class PitchDetectionService {

    // MARK: - Config & State

    private var config: PitchDetectionConfig
    private var isActive: Bool = false

    // Core DSP
    private let yin: YinPitchDetector

    // MARK: - Init

    init(config: PitchDetectionConfig = PitchDefaults.DEFAULT_CONFIG) {
        self.config = config
        self.yin = YinPitchDetector(
            sampleRate: config.sampleRate,
            threshold: config.yinThreshold,
            bufferSize: config.bufferSize
        )
    }

    // MARK: - Lifecycle

    func start() {
        isActive = true
        print("[PitchDetection] started")
    }

    func stop() {
        isActive = false
        print("[PitchDetection] stopped")
    }

    func isRunning() -> Bool {
        return isActive
    }

    func setSampleRate(_ sampleRate: Double) {
        guard sampleRate > 0 else { return }
        guard sampleRate != config.sampleRate else { return }

        config.sampleRate = sampleRate
        yin.setSampleRate(sampleRate)

        print("[PitchDetection] sample rate updated → \(sampleRate)")
    }

    // MARK: - Main Processing (JS parity)

    /// NOTE-sized buffer expected (native guarantees size)
    func processSamples(
        samples: [Float],
        timestampMs: Int,
        amplitude: Double
    ) -> [String: Any]? {

        guard isActive else { return nil }
        guard samples.count == config.bufferSize else { return nil }

        // --------------------------------------------------
        // STEP 1 — Primary: YIN (RAW buffer, no window)
        // --------------------------------------------------
        var yinResult = yin.detect(samples: samples)

        // --------------------------------------------------
        // STEP 2 — Fallback: Zero-crossing
        // JS parity: uses HANN-windowed signal
        // --------------------------------------------------
        if yinResult == nil {
            let windowed = applyHannWindow(samples)

            guard let fallbackFreq = estimateFrequencyZeroCrossing(
                samples: windowed,
                sampleRate: config.sampleRate
            ) else {
                return nil
            }

            yinResult = YinResult(
                frequency: fallbackFreq,
                confidence: 0.85,
                periodicity: 0.5
            )
        }

        guard let result = yinResult else { return nil }

        // --------------------------------------------------
        // STEP 3 — Confidence gating
        // Low notes (E2–G3, below 200Hz) allowed weaker confidence
        // --------------------------------------------------
        let isLowFreq = result.frequency < 200.0  // Covers E2, A2, D3, G3
        let minConf = isLowFreq ? 0.40 : config.minConfidence

        guard result.confidence >= minConf else {
            return nil
        }

        // --------------------------------------------------
        // STEP 4 — Frequency range gating
        // --------------------------------------------------
        guard
            result.frequency >= config.minFrequency,
            result.frequency <= config.maxFrequency
        else {
            return nil
        }

        // --------------------------------------------------
        // STEP 5 — Frequency → Note
        // --------------------------------------------------
        let note = MusicTheory.frequencyToNote(
            result.frequency,
            confidence: result.confidence
        )

        // --------------------------------------------------
        // FINAL — Payload
        // --------------------------------------------------
        return AudioDetectionPayload.note(
            timestampMs: timestampMs,
            frequency: result.frequency,
            amplitude: amplitude,
            confidence: result.confidence,
            note: note
        )
    }

    // MARK: - Zero Crossing (JS parity)

    private func estimateFrequencyZeroCrossing(
        samples: [Float],
        sampleRate: Double
    ) -> Double? {

        guard samples.count > 1 else { return nil }
        guard sampleRate > 0 else { return nil }

        var crossings = 0
        var prev = samples[0]

        for i in 1..<samples.count {
            let curr = samples[i]
            if (prev <= 0 && curr > 0) || (prev >= 0 && curr < 0) {
                crossings += 1
            }
            prev = curr
        }

        let duration = Double(samples.count) / sampleRate
        guard duration > 0 else { return nil }
        guard crossings >= 2 else { return nil }

        return Double(crossings) / (2.0 * duration)
    }
}
