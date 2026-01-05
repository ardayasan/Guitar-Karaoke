import Foundation

final class PitchDetectionService {

    private var config: PitchDetectionConfig
    private var isActive: Bool = false

    // Core algorithm
    private var yin: YinPitchDetector

    init(config: PitchDetectionConfig = PitchDefaults.DEFAULT_CONFIG) {
        self.config = config
        self.yin = YinPitchDetector(
            sampleRate: config.sampleRate,
            threshold: config.yinThreshold,
            bufferSize: config.bufferSize
        )
    }

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
        if sampleRate == config.sampleRate { return }

        config.sampleRate = sampleRate
        yin.setSampleRate(sampleRate)

        print("[PitchDetection] sample rate updated → \(sampleRate)")
    }

    /// Consumes a NOTE-sized PCM frame and returns AudioDetection payload dict or nil.
    func processSamples(samples: [Float], timestampMs: Int, amplitude: Double) -> [String: Any]? {
        guard isActive else { return nil }
        guard samples.count == config.bufferSize else { return nil }

        // STEP 1 — Primary: YIN
        var result: PitchResult? = nil
        
        if let yinResult = yin.detect(samples: samples) {
            result = PitchResult(
                frequency: yinResult.frequency,
                confidence: yinResult.confidence,
                periodicity: yinResult.periodicity
            )
        }

        // STEP 2 — Fallback: Zero-crossing (ONLY for weak signals / low strings)
        if result == nil {

            // RMS gate: fallback sadece zayıf sinyalde
            if amplitude < 0.01 {
                if let fallbackFreq = ZeroCrossing.estimateFrequency(
                    samples: samples,
                    sampleRate: config.sampleRate
                ) {
                    result = PitchResult(
                        frequency: fallbackFreq,
                        confidence: 0.85,
                        periodicity: 0.5
                    )
                } else {
                    return nil
                }
            } else {
                // Güçlü sinyal var ama YIN başarısız → sessizlik gibi davran
                return nil
            }
        }

        guard let pitch = result else { return nil }

        // STEP 3 — Confidence gating (low notes slightly weaker allowed)
        let isLow = pitch.frequency < 110.0
        let minConf = isLow ? 0.5 : config.minConfidence

        if pitch.confidence < minConf {
            return nil
        }

        // STEP 4 — Range gating
        if pitch.frequency < config.minFrequency || pitch.frequency > config.maxFrequency {
            return nil
        }

        // STEP 5 — Frequency → Note
        let note = MusicTheory.frequencyToNote(pitch.frequency, confidence: pitch.confidence)

        // FINAL — Contract payload
        return AudioDetectionPayload.note(
            timestampMs: timestampMs,
            frequency: pitch.frequency,
            amplitude: amplitude,
            confidence: pitch.confidence,
            note: note
        )
    }
}
