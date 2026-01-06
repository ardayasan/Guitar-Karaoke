import Foundation

final class NativeAudioPipeline {

    // MARK: - Output
    var emitDetection: (([String: Any]?) -> Void)?

    // MARK: - Services
    private let pitchService = PitchDetectionService()
    private let chordService = ChordDetectionService()

    // MARK: - State
    private var isActive = false
    private var isSilent = true
    private var lastSignalTimeMs = 0

    // JS parity: chord is “active” if last emitted detection was chord
    private var chordActive = false

    // MARK: - Timing (JS parity-ish)
    private let SILENCE_TIMEOUT_MS = 400
    private let CHORD_PROCESS_INTERVAL_MS = 180 // roughly old JS clamp area
    private var lastChordProcessTimeMs = 0

    // MARK: - Gates (match old JS)
    private let NOTE_CONFIDENCE_THRESHOLD = 0.8
    private let CHORD_CONFIDENCE_THRESHOLD = 0.66

    // JS side “active pitch class” logic:
    private let PITCH_CLASS_ENERGY_THRESHOLD = 0.085
    private let MINIMUM_ACTIVE_PITCH_CLASS_THRESHOLD = 2

    // Template gate (old)
    private let TEMPLATE_MATCH_THRESHOLD = 0.10
    private let MIN_TEMPLATE_MATCH = 2

    // ------------------------------------------------------------
    // NEW: Anti “single note -> chord” gates
    // ------------------------------------------------------------

    /// Keep a small rolling window of recent chroma frames (even if candidate=nil).
    private struct ChromaFrame {
        let timestampMs: Int
        let chroma: [Double] // length 12, normalized sum=1
    }

    private var chromaHistory: [ChromaFrame] = []

    /// Temporal window for co-activation checks
    private let CHROMA_HISTORY_WINDOW_MS = 520  // ~ 3 frames at 180ms + slack

    /// Require chord-like co-activation in recent frames
    private let COACTIVATION_MIN_FRAMES = 2     // at least 2 frames look chordy
    private let COACTIVATION_ACTIVE_THRESHOLD = 0.10

    /// Strong monophonic dominance detection (single note / harmonic stack)
    private let MONO_DOMINANT_MIN = 0.62
    private let MONO_SECOND_MAX = 0.24

    /// Harmonic suppression ratios (when monophonic dominance is detected)
    private let HARMONIC_SUPPRESS_RATIO = 0.35

    // MARK: - Lifecycle
    func start() {
        isActive = true
        isSilent = true
        chordActive = false
        lastSignalTimeMs = 0
        lastChordProcessTimeMs = 0
        chromaHistory = []

        pitchService.start()

        chordService.start { [weak self] res in
            self?.handleChordResult(res)
        }
    }

    func stop() {
        isActive = false
        pitchService.stop()
        chordService.stop()
        chordActive = false
        chromaHistory = []
    }

    func onOnset(timestampSec: Double) {
        let ts = Int(timestampSec * 1000)
        lastSignalTimeMs = ts
        isSilent = false
        chordActive = false
        // do not wipe chromaHistory; onset may happen frequently
    }

    // MARK: - NOTE
    func onNoteSamples(
        samples: [Float],
        timestampSec: Double,
        sampleRate: Double,
        rms: Float
    ) {
        guard isActive else { return }

        let ts = Int(timestampSec * 1000)
        lastSignalTimeMs = ts
        isSilent = false

        // JS parity: if chord active, ignore notes
        if chordActive { return }

        pitchService.setSampleRate(sampleRate)

        guard let det = pitchService.processSamples(
            samples: samples,
            timestampMs: ts,
            amplitude: Double(rms)
        ) else { return }

        guard
            let conf = det["confidence"] as? Double,
            conf >= NOTE_CONFIDENCE_THRESHOLD,
            let freq = det["frequency"] as? Double,
            freq > 0
        else { return }

        chordActive = false
        emitDetection?(det)
    }

    // MARK: - CHORD
    func onChordSamples(
        samples: [Float],
        timestampSec: Double,
        sampleRate: Double,
        rms: Float
    ) {
        guard isActive else { return }

        let ts = Int(timestampSec * 1000)
        lastSignalTimeMs = ts
        isSilent = false

        // Basic throttling like old JS “intervalMs”
        if ts - lastChordProcessTimeMs < CHORD_PROCESS_INTERVAL_MS { return }
        lastChordProcessTimeMs = ts

        chordService.setSampleRate(sampleRate)
        chordService.processSamples(samples: samples, timestampMs: ts)
    }

    // MARK: - CHORD SEMANTIC (Upgraded anti-mono gates)
    private func handleChordResult(_ result: ChordDetectionResult) {
        guard isActive else { return }

        // Always record chroma frames (even if candidate=nil)
        let chroma = result.chroma
        if chroma.count == 12 {
            pushChromaFrame(timestampMs: result.timestamp, chroma: chroma)
        } else {
            return
        }

        // Must have candidate
        guard let cand = result.candidate else { return }

        // Confidence gate
        let conf = cand.confidence
        if conf < CHORD_CONFIDENCE_THRESHOLD { return }

        // 1) Harmonic-collapse / monophonic dominance detection
        // Use an averaged chroma over the recent window for stability.
        let avg = averagedChromaInWindow(nowMs: result.timestamp)
        if avg.count != 12 { return }

        // If it looks monophonic, suppress harmonic-ish bins and re-check "chordiness"
        let mono = isMonophonicDominant(chroma: avg)
        let gatedChroma = mono ? suppressHarmonicIllusions(chroma: avg) : avg

        // 2) Active pitch class count gate (on gated chroma)
        let activeCount = countActivePitchClasses(chroma: gatedChroma, threshold: PITCH_CLASS_ENERGY_THRESHOLD)
        if activeCount < MINIMUM_ACTIVE_PITCH_CLASS_THRESHOLD { return }

        // 3) Temporal co-activation gate:
        // In the last window, do we see ">=2 active PCs" in enough frames?
        if !passesCoActivationGate(nowMs: result.timestamp) { return }

        // 4) Interval skeleton gate:
        // For major/minor: MUST have both 3rd and 5th present (not just root+5th).
        if !passesIntervalSkeletonGate(chroma: gatedChroma, root: cand.root, quality: cand.quality) {
            return
        }

        // 5) Old “2-of-3 template bins” rule (keep it as additional safety)
        let requiredPCs = chordPitchClasses(root: cand.root, quality: cand.quality)
        var matchCount = 0
        for pc in requiredPCs {
            if gatedChroma[pc] >= TEMPLATE_MATCH_THRESHOLD {
                matchCount += 1
            }
        }
        if matchCount < MIN_TEMPLATE_MATCH { return }

        // If we got here, it's a real chord.
        chordActive = true

        emitDetection?([
            "timestamp": result.timestamp,
            "confidence": conf,
            "frequency": 0,
            "amplitude": 0,
            "chord": [
                "root": pitchClassName(cand.root),
                "type": cand.quality.rawValue
            ]
        ])
    }

    // MARK: - Silence
    func tickSilenceCheck(nowSec: Double) {
        guard isActive, !isSilent else { return }
        let now = Int(nowSec * 1000)
        if now - lastSignalTimeMs > SILENCE_TIMEOUT_MS {
            isSilent = true
            chordActive = false
            chromaHistory = []
            emitDetection?(nil)
        }
    }

    // MARK: - NEW: Chroma history helpers

    private func pushChromaFrame(timestampMs: Int, chroma: [Double]) {
        chromaHistory.append(ChromaFrame(timestampMs: timestampMs, chroma: chroma))
        // prune
        let minTs = timestampMs - CHROMA_HISTORY_WINDOW_MS
        chromaHistory.removeAll { $0.timestampMs < minTs }
        // cap just in case
        if chromaHistory.count > 12 {
            chromaHistory.removeFirst(chromaHistory.count - 12)
        }
    }

    private func averagedChromaInWindow(nowMs: Int) -> [Double] {
        let minTs = nowMs - CHROMA_HISTORY_WINDOW_MS
        let frames = chromaHistory.filter { $0.timestampMs >= minTs }
        guard !frames.isEmpty else { return Array(repeating: 0.0, count: 12) }

        var acc = Array(repeating: 0.0, count: 12)
        for f in frames {
            for i in 0..<12 { acc[i] += f.chroma[i] }
        }
        let n = Double(frames.count)
        for i in 0..<12 { acc[i] /= n }

        // normalize again (defensive)
        let sum = acc.reduce(0.0, +)
        if sum > 0 {
            for i in 0..<12 { acc[i] /= sum }
        }
        return acc
    }

    private func passesCoActivationGate(nowMs: Int) -> Bool {
        let minTs = nowMs - CHROMA_HISTORY_WINDOW_MS
        let frames = chromaHistory.filter { $0.timestampMs >= minTs }
        guard !frames.isEmpty else { return false }

        var good = 0
        for f in frames {
            // Count active PCs in this frame
            let c = countActivePitchClasses(chroma: f.chroma, threshold: COACTIVATION_ACTIVE_THRESHOLD)
            if c >= 2 { good += 1 }
        }
        return good >= COACTIVATION_MIN_FRAMES
    }

    // MARK: - NEW: Monophonic + harmonic suppression

    private func isMonophonicDominant(chroma: [Double]) -> Bool {
        guard chroma.count == 12 else { return true }
        // find top-2 energies
        var max1: Double = -1
        var max2: Double = -1
        for v in chroma {
            if v > max1 {
                max2 = max1
                max1 = v
            } else if v > max2 {
                max2 = v
            }
        }
        return (max1 >= MONO_DOMINANT_MIN) && (max2 <= MONO_SECOND_MAX)
    }

    /// When monophonic dominance is detected, suppress bins that are likely just harmonics of the dominant PC.
    /// We keep this conservative to avoid harming real chords.
    private func suppressHarmonicIllusions(chroma: [Double]) -> [Double] {
        guard chroma.count == 12 else { return chroma }

        // dominant PC
        var domPc = 0
        var domVal = chroma[0]
        for i in 1..<12 {
            if chroma[i] > domVal {
                domVal = chroma[i]
                domPc = i
            }
        }
        if domVal <= 0 { return chroma }

        // candidate harmonic intervals relative to dominant:
        // perfect fifth (7) is the main offender; major third (4) sometimes shows up via overtones.
        let harmonicTargets = [
            (domPc + 7) % 12,
            (domPc + 4) % 12
        ]

        var out = chroma
        for pc in harmonicTargets {
            // only suppress if it's significantly weaker than dominant
            if out[pc] > 0, out[pc] < domVal * HARMONIC_SUPPRESS_RATIO {
                out[pc] = 0
            }
        }

        // renormalize
        let sum = out.reduce(0.0, +)
        if sum > 0 {
            for i in 0..<12 { out[i] /= sum }
        }
        return out
    }

    // MARK: - NEW: Interval skeleton gate (3rd + 5th required)

    private func passesIntervalSkeletonGate(
        chroma: [Double],
        root: Int,
        quality: DetectedChordQuality
    ) -> Bool {
        guard chroma.count == 12 else { return false }

        let r = ((root % 12) + 12) % 12
        let third = (r + (quality == .major ? 4 : 3)) % 12
        let fifth = (r + 7) % 12

        let rootE = chroma[r]
        let thirdE = chroma[third]
        let fifthE = chroma[fifth]

        // Must actually see the defining intervals.
        // (Root can be dominant; that's fine.)
        let thirdOK = thirdE >= TEMPLATE_MATCH_THRESHOLD
        let fifthOK = fifthE >= TEMPLATE_MATCH_THRESHOLD

        // Hard requirement: both must be present
        if !(thirdOK && fifthOK) { return false }

        // Extra anti-mono sanity: if root dwarfs everything, still suspicious.
        // (This catches "single note with tiny overtone bins".)
        if rootE >= 0.85 && (thirdE < 0.12 || fifthE < 0.12) {
            return false
        }

        return true
    }

    // MARK: - Helpers (existing)

    private func countActivePitchClasses(chroma: [Double], threshold: Double) -> Int {
        var c = 0
        for v in chroma {
            if v >= threshold { c += 1 }
        }
        return c
    }

    private func chordPitchClasses(root: Int, quality: DetectedChordQuality) -> [Int] {
        switch quality {
        case .major: return [root, (root + 4) % 12, (root + 7) % 12]
        case .minor: return [root, (root + 3) % 12, (root + 7) % 12]
        }
    }

    private func pitchClassName(_ pc: Int) -> String {
        ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"][((pc % 12) + 12) % 12]
    }
}
