import Foundation

final class NativeAudioPipeline {

    enum PipelineMode {
        case standard
        case tuner // Note detection only, no chords
    }

    private var mode: PipelineMode = .standard

    // MARK: - Output
    var emitDetection: (([String: Any]?) -> Void)?

    // MARK: - Services
    private let pitchService = PitchDetectionService()
    private let chordService = ChordDetectionService()

    // MARK: - State
    private var isActive = false
    private var isSilent = true
    private var lastSignalTimeMs = 0

    // MARK: - Pitch State Machine

    private enum PitchState {
        case idle
        case onset
        case steady
    }

    private var pitchState: PitchState = .idle

    // Timing
    private let ONSET_MIN_DURATION_MS = 40      // transient'i atla (pratikte daha güvenli)
    private let STEADY_CONFIRM_FRAMES = 2       // üst üste kaç iyi frame ile steady'e geçilir

    private var onsetStartMs: Int = 0
    private var steadyCandidateCount = 0

    // Pitch memory
    private var lastStableFrequency: Double? = nil
    private var lastPitchTimestampMs: Int = 0

    // NEW: short-term ZC memory (internal-only signal)
    private var lastZeroCrossFrequency: Double? = nil
    private var lastZeroCrossTimestampMs: Int = 0

    // Stability gates
    private let ONSET_STABILITY_PCT = 0.04      // %4: onset'te adayların tutarlılığı
    private let STEADY_MAX_JUMP_PCT = 0.08      // %8: steady'de fiziksel olmayan zıplamaları bastır
    private let STEADY_MAX_JUMP_HZ_FLOOR = 6.0  // çok düşük frekansta yüzde yetmez, min mutlak tolerans

    // Octave resolution helpers
    private let OCTAVE_RESOLVE_MAX_CENTS = 45.0 // ZC ile octave seçimi için tolerans (cents)
    private let OCTAVE_LOCK_MAX_CENTS = 30.0    // Steady'de octave-lock/flip bastırma

    // NEW: Step-2 "fast confirm" gates (keeps single final output)
    private let ZC_VALIDITY_WINDOW_MS = 90      // ZC'nin "yakın geçmiş" sayılacağı aralık
    private let ZC_SUPPORT_MAX_CENTS = 35.0     // ZC, resolved freq'i destekliyor sayılacak tolerans
    private let FAST_CONFIRM_REQUIRES_HISTORY = true // prevStable yoksa asla hızlandırma yapma

    // ============================================================
    // MARK: - TUNABLE PARAMETERS (grouped for easy adjustment)
    // ============================================================

    // --- Timing ---
    private let SILENCE_TIMEOUT_MS = 400
    private let CHORD_RATE_FACTOR = 1.1
    private let CHORD_RATE_MIN_MS = 80
    private let CHORD_RATE_MAX_MS = 200

    // --- RMS Gates ---
    private let RMS_NOTE_THRESHOLD: Float = 0.0008
    private let RMS_CHORD_THRESHOLD: Float = 0.008

    // --- Note Detection ---
    private let NOTE_CONFIDENCE_THRESHOLD = 0.8

    // --- Chord Detection (relaxed for sensitivity) ---
    private let CHORD_CONFIDENCE_THRESHOLD = 0.60
    private let CHORD_CONFIDENCE_STRONG = 0.75

    // --- Pitch Class Thresholds ---
    private let PITCH_CLASS_ENERGY_THRESHOLD = 0.08
    private let MINIMUM_ACTIVE_PITCH_CLASS_THRESHOLD = 2
    private let TEMPLATE_MATCH_THRESHOLD = 0.07
    private let MIN_TEMPLATE_MATCH = 2

    // --- Anti-Mono Gates (safety) ---
    private let MONO_DOMINANT_MIN = 0.58
    private let MONO_SECOND_MAX = 0.20
    private let HARMONIC_SUPPRESS_RATIO = 0.30

    // --- Temporal / Hysteresis ---
    private let CHROMA_HISTORY_WINDOW_MS = 300
    private let COACTIVATION_MIN_FRAMES = 1
    private let COACTIVATION_ACTIVE_THRESHOLD = 0.08

    // --- Chord State Hysteresis ---
    private let CHORD_ENTRY_FRAMES = 1
    private let CHORD_EXIT_FRAMES = 2
    private let CHORD_HOLD_MS = 150

    // ============================================================
    // MARK: - Internal State
    // ============================================================

    private var lastChordProcessTimeMs = 0
    private var cachedChordIntervalMs: Int? = nil
    private var cachedChordIntervalKey: String? = nil

    // Chord hysteresis state
    private var chordActive = false
    private var chordEntryCounter = 0
    private var chordExitCounter = 0
    private var lastChordEmitTimeMs = 0
    private var pendingChordCandidate: (root: Int, quality: DetectedChordQuality, confidence: Double)? = nil

    // Chroma history
    private struct ChromaFrame {
        let timestampMs: Int
        let chroma: [Double]
    }
    private var chromaHistory: [ChromaFrame] = []

    // ============================================================
    // MARK: - Lifecycle
    // ============================================================

    func start() {
        isActive = true
        isSilent = true
        lastSignalTimeMs = 0

        // Reset pitch state
        resetPitchState()

        // Reset chord state
        resetChordState()
        lastChordProcessTimeMs = 0
        cachedChordIntervalMs = nil
        cachedChordIntervalKey = nil
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

        resetPitchState()

        resetChordState()
        cachedChordIntervalMs = nil
        cachedChordIntervalKey = nil
        chromaHistory = []
    }

    func setMode(_ modeString: String) {
        if modeString == "tuner" {
            mode = .tuner
        } else {
            mode = .standard
        }
    }

    private func resetPitchState() {
        pitchState = .idle
        onsetStartMs = 0
        steadyCandidateCount = 0
        lastStableFrequency = nil
        lastPitchTimestampMs = 0

        lastZeroCrossFrequency = nil
        lastZeroCrossTimestampMs = 0
    }

    private func resetChordState() {
        chordActive = false
        chordEntryCounter = 0
        chordExitCounter = 0
        lastChordEmitTimeMs = 0
        pendingChordCandidate = nil
    }

    func onOnset(timestampSec: Double) {
        let ts = Int(timestampSec * 1000)

        // Pitch: enter onset
        pitchState = .onset
        onsetStartMs = ts
        steadyCandidateCount = 0
        lastStableFrequency = nil
        lastPitchTimestampMs = ts

        lastZeroCrossFrequency = nil
        lastZeroCrossTimestampMs = 0

        // Global signal bookkeeping
        lastSignalTimeMs = ts
        isSilent = false

        // Chord: reset state (history kept for quick re-detection)
        resetChordState()
        lastChordProcessTimeMs = 0
        cachedChordIntervalMs = nil
        cachedChordIntervalKey = nil
    }

    // ============================================================
    // MARK: - NOTE Detection (with Pitch State Machine + ZC signal)
    // ============================================================

    func onNoteSamples(
        samples: [Float],
        timestampSec: Double,
        sampleRate: Double,
        rms: Float
    ) {
        guard isActive else { return }

        // RMS gate
        if rms < RMS_NOTE_THRESHOLD { return }

        let ts = Int(timestampSec * 1000)
        lastSignalTimeMs = ts
        isSilent = false

        // In standard mode, block notes only if chord is CONFIRMED active.
        if mode != .tuner && chordActive { return }

        // Safety: if for any reason we got here while idle (missed onset),
        // initialize onset now but do NOT emit immediately.
        if pitchState == .idle {
            pitchState = .onset
            onsetStartMs = ts
            steadyCandidateCount = 0
            lastStableFrequency = nil
            lastPitchTimestampMs = ts

            lastZeroCrossFrequency = nil
            lastZeroCrossTimestampMs = 0
            return
        }

        pitchService.setSampleRate(sampleRate)

        guard var det = pitchService.processSamples(
            samples: samples,
            timestampMs: ts,
            amplitude: Double(rms)
        ) else { return }

        guard
            let conf = det["confidence"] as? Double,
            conf >= NOTE_CONFIDENCE_THRESHOLD,
            let yinFreqRaw = det["frequency"] as? Double,
            yinFreqRaw > 0
        else { return }

        // ---------------------------------------------------------
        // Step-1: Zero-cross as INTERNAL signal only (no emit)
        // ---------------------------------------------------------
        let zcFreqNow = ZeroCrossing.estimateFrequency(samples: samples, sampleRate: sampleRate)
        if let z = zcFreqNow, z > 0 {
            lastZeroCrossFrequency = z
            lastZeroCrossTimestampMs = ts
        }

        // Octave resolution uses ZC + history (still internal)
        let resolvedFreq = resolveOctaveAndClamp(yinFreqRaw, zcFreq: zcFreqNow, prevStable: lastStableFrequency)

        // IMPORTANT: UI must see resolved frequency too (single final truth)
        det = rewritePitchPayload(det: det, frequency: resolvedFreq)

        // -----------------------------
        // Pitch State Machine Decision
        // -----------------------------
        switch pitchState {

        case .idle:
            return

        case .onset:
            // Wait out transient window
            if ts - onsetStartMs < ONSET_MIN_DURATION_MS {
                return
            }

            // Base: require consecutive stable candidates
            var newCount: Int = 1
            if let prev = lastStableFrequency {
                if isFrequencyClose(prev, resolvedFreq, pct: ONSET_STABILITY_PCT) {
                    newCount = steadyCandidateCount + 1
                } else {
                    newCount = 1
                }
            } else {
                newCount = 1
            }

            // ---------------------------------------------------------
            // Step-2: Fast confirm WITHOUT changing STEADY_CONFIRM_FRAMES
            // If candidate is stable-ish AND ZC supports it, count as "2"
            // ---------------------------------------------------------
            if newCount == 1 && STEADY_CONFIRM_FRAMES == 2 {
                if shouldFastConfirmOnset(
                    nowMs: ts,
                    resolvedFreq: resolvedFreq,
                    prevStable: lastStableFrequency
                ) {
                    newCount = 2
                }
            }

            steadyCandidateCount = newCount

            // Update candidate memory
            lastStableFrequency = resolvedFreq
            lastPitchTimestampMs = ts

            if steadyCandidateCount >= STEADY_CONFIRM_FRAMES {
                pitchState = .steady
                steadyCandidateCount = 0
                emitDetection?(det)
            }
            return

        case .steady:
            if let prev = lastStableFrequency {
                if isOctaveFlip(prev: prev, next: resolvedFreq) {
                    if centsDiff(prev, resolvedFreq) > OCTAVE_LOCK_MAX_CENTS {
                        return
                    }
                }
                if !passesSteadyJumpGate(prev, resolvedFreq) {
                    // Treat as possible note transition: re-enter onset fast
                    pitchState = .onset
                    onsetStartMs = ts
                    steadyCandidateCount = 0

                    // Start candidate with new freq
                    lastStableFrequency = resolvedFreq
                    lastPitchTimestampMs = ts
                    return
                }
            }

            lastStableFrequency = resolvedFreq
            lastPitchTimestampMs = ts
            emitDetection?(det)
            return
        }
    }

    // ============================================================
    // MARK: - Onset fast-confirm helper
    // ============================================================

    private func shouldFastConfirmOnset(nowMs: Int, resolvedFreq: Double, prevStable: Double?) -> Bool {
        // Optional safety: require history
        if FAST_CONFIRM_REQUIRES_HISTORY, (prevStable == nil || prevStable! <= 0) {
            return false
        }

        // Require very recent ZC
        guard let z = lastZeroCrossFrequency, z > 0 else { return false }
        if nowMs - lastZeroCrossTimestampMs > ZC_VALIDITY_WINDOW_MS { return false }

        // ZC should support the resolved freq (in cents)
        if centsDiff(resolvedFreq, z) > ZC_SUPPORT_MAX_CENTS { return false }

        // If we have history, also require continuity-ish (avoid random accept)
        if let prev = prevStable, prev > 0 {
            if !isFrequencyClose(prev, resolvedFreq, pct: ONSET_STABILITY_PCT) {
                // Not close to previous candidate; don't fast confirm
                return false
            }
        }

        return true
    }

    // ============================================================
    // MARK: - CHORD Detection (parallel track with hysteresis)
    // ============================================================

    func onChordSamples(
        samples: [Float],
        timestampSec: Double,
        sampleRate: Double,
        rms: Float
    ) {
        guard isActive, mode != .tuner else { return }
        if rms < RMS_CHORD_THRESHOLD { return }

        let ts = Int(timestampSec * 1000)
        lastSignalTimeMs = ts
        isSilent = false

        let intervalMs = getChordIntervalMs(windowSize: samples.count, sampleRate: sampleRate)
        if ts - lastChordProcessTimeMs < intervalMs { return }
        lastChordProcessTimeMs = ts

        chordService.setSampleRate(sampleRate)
        chordService.processSamples(samples: samples, timestampMs: ts)
    }

    // ============================================================
    // MARK: - CHORD Semantic Decision (with hysteresis)
    // ============================================================

    private func handleChordResult(_ result: ChordDetectionResult) {
        guard isActive else { return }

        let chroma = result.chroma
        guard chroma.count == 12 else { return }

        pushChromaFrame(timestampMs: result.timestamp, chroma: chroma)

        guard let cand = result.candidate else {
            handleNoChordCandidate(timestamp: result.timestamp)
            return
        }

        let conf = cand.confidence
        if conf < CHORD_CONFIDENCE_THRESHOLD {
            handleNoChordCandidate(timestamp: result.timestamp)
            return
        }

        let instantChroma = chroma
        let avgChroma = averagedChromaInWindow(nowMs: result.timestamp)

        let mono = isMonophonicDominant(chroma: avgChroma)
        if mono {
            let suppressed = suppressHarmonicIllusions(chroma: avgChroma)
            let suppressedActive = countActivePitchClasses(chroma: suppressed, threshold: PITCH_CLASS_ENERGY_THRESHOLD)
            if suppressedActive < MINIMUM_ACTIVE_PITCH_CLASS_THRESHOLD {
                handleNoChordCandidate(timestamp: result.timestamp)
                return
            }
        }

        let activeCount = countActivePitchClasses(chroma: instantChroma, threshold: PITCH_CLASS_ENERGY_THRESHOLD)
        if activeCount < MINIMUM_ACTIVE_PITCH_CLASS_THRESHOLD {
            handleNoChordCandidate(timestamp: result.timestamp)
            return
        }

        if !passesIntervalSkeletonGate(chroma: instantChroma, root: cand.root, quality: cand.quality) {
            handleNoChordCandidate(timestamp: result.timestamp)
            return
        }

        let requiredPCs = chordPitchClasses(root: cand.root, quality: cand.quality)
        var matchCount = 0
        for pc in requiredPCs {
            if instantChroma[pc] >= TEMPLATE_MATCH_THRESHOLD {
                matchCount += 1
            }
        }
        if matchCount < MIN_TEMPLATE_MATCH {
            handleNoChordCandidate(timestamp: result.timestamp)
            return
        }

        handleValidChordCandidate(
            root: cand.root,
            quality: cand.quality,
            confidence: conf,
            timestamp: result.timestamp
        )
    }

    private func handleValidChordCandidate(
        root: Int,
        quality: DetectedChordQuality,
        confidence: Double,
        timestamp: Int
    ) {
        chordExitCounter = 0

        if confidence >= CHORD_CONFIDENCE_STRONG {
            activateChord(root: root, quality: quality, confidence: confidence, timestamp: timestamp)
            return
        }

        if chordActive {
            emitChord(root: root, quality: quality, confidence: confidence, timestamp: timestamp)
        } else {
            chordEntryCounter += 1
            pendingChordCandidate = (root, quality, confidence)

            if chordEntryCounter >= CHORD_ENTRY_FRAMES {
                activateChord(root: root, quality: quality, confidence: confidence, timestamp: timestamp)
            }
        }
    }

    private func handleNoChordCandidate(timestamp: Int) {
        chordEntryCounter = 0
        pendingChordCandidate = nil

        if chordActive {
            let timeSinceLastEmit = timestamp - lastChordEmitTimeMs
            if timeSinceLastEmit > CHORD_HOLD_MS {
                chordExitCounter += 1
                if chordExitCounter >= CHORD_EXIT_FRAMES {
                    chordActive = false
                    chordExitCounter = 0
                }
            }
        }
    }

    private func activateChord(
        root: Int,
        quality: DetectedChordQuality,
        confidence: Double,
        timestamp: Int
    ) {
        chordActive = true
        chordEntryCounter = 0
        chordExitCounter = 0
        emitChord(root: root, quality: quality, confidence: confidence, timestamp: timestamp)
    }

    private func emitChord(
        root: Int,
        quality: DetectedChordQuality,
        confidence: Double,
        timestamp: Int
    ) {
        lastChordEmitTimeMs = timestamp

        emitDetection?([
            "timestamp": timestamp,
            "confidence": confidence,
            "frequency": 0,
            "amplitude": 0,
            "chord": [
                "root": pitchClassName(root),
                "type": quality.rawValue
            ]
        ])
    }

    // ============================================================
    // MARK: - Silence
    // ============================================================

    func tickSilenceCheck(nowSec: Double) {
        guard isActive, !isSilent else { return }
        let now = Int(nowSec * 1000)
        if now - lastSignalTimeMs > SILENCE_TIMEOUT_MS {
            isSilent = true
            resetPitchState()
            resetChordState()
            chromaHistory = []
            emitDetection?(nil)
        }
    }

    // ============================================================
    // MARK: - Dynamic Chord Interval
    // ============================================================

    private func getChordIntervalMs(windowSize: Int, sampleRate: Double) -> Int {
        let key = "\(windowSize)@\(Int(sampleRate))"

        if let cached = cachedChordIntervalMs, cachedChordIntervalKey == key {
            return cached
        }

        let windowDurationMs = Double(windowSize) / sampleRate * 1000.0
        let raw = windowDurationMs * CHORD_RATE_FACTOR
        let clamped = max(CHORD_RATE_MIN_MS, min(Int(raw), CHORD_RATE_MAX_MS))

        cachedChordIntervalKey = key
        cachedChordIntervalMs = clamped
        return clamped
    }

    // ============================================================
    // MARK: - Chroma History Helpers
    // ============================================================

    private func pushChromaFrame(timestampMs: Int, chroma: [Double]) {
        chromaHistory.append(ChromaFrame(timestampMs: timestampMs, chroma: chroma))
        let minTs = timestampMs - CHROMA_HISTORY_WINDOW_MS
        chromaHistory.removeAll { $0.timestampMs < minTs }
        if chromaHistory.count > 8 {
            chromaHistory.removeFirst(chromaHistory.count - 8)
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

        let sum = acc.reduce(0.0, +)
        if sum > 0 {
            for i in 0..<12 { acc[i] /= sum }
        }
        return acc
    }

    // ============================================================
    // MARK: - Monophonic Detection & Harmonic Suppression
    // ============================================================

    private func isMonophonicDominant(chroma: [Double]) -> Bool {
        guard chroma.count == 12 else { return true }
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

    private func suppressHarmonicIllusions(chroma: [Double]) -> [Double] {
        guard chroma.count == 12 else { return chroma }

        var domPc = 0
        var domVal = chroma[0]
        for i in 1..<12 {
            if chroma[i] > domVal {
                domVal = chroma[i]
                domPc = i
            }
        }
        if domVal <= 0 { return chroma }

        let harmonicTargets = [
            (domPc + 7) % 12,
            (domPc + 4) % 12
        ]

        var out = chroma
        for pc in harmonicTargets {
            if out[pc] > 0, out[pc] < domVal * HARMONIC_SUPPRESS_RATIO {
                out[pc] = 0
            }
        }

        let sum = out.reduce(0.0, +)
        if sum > 0 {
            for i in 0..<12 { out[i] /= sum }
        }
        return out
    }

    // ============================================================
    // MARK: - Interval Skeleton Gate
    // ============================================================

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

        let thirdOK = thirdE >= TEMPLATE_MATCH_THRESHOLD
        let fifthOK = fifthE >= TEMPLATE_MATCH_THRESHOLD

        if !(thirdOK && fifthOK) { return false }

        if rootE >= 0.80 && (thirdE < 0.10 || fifthE < 0.10) {
            return false
        }

        return true
    }

    // ============================================================
    // MARK: - Pitch Helpers
    // ============================================================

    private func isFrequencyClose(_ a: Double, _ b: Double, pct: Double) -> Bool {
        guard a > 0, b > 0 else { return false }
        let tol = max(a * pct, STEADY_MAX_JUMP_HZ_FLOOR)
        return abs(a - b) <= tol
    }

    private func passesSteadyJumpGate(_ prev: Double, _ next: Double) -> Bool {
        guard prev > 0, next > 0 else { return false }
        let tol = max(prev * STEADY_MAX_JUMP_PCT, STEADY_MAX_JUMP_HZ_FLOOR)
        return abs(next - prev) <= tol
    }

    private func centsDiff(_ a: Double, _ b: Double) -> Double {
        guard a > 0, b > 0 else { return Double.greatestFiniteMagnitude }
        return abs(1200.0 * log2(a / b))
    }

    private func isOctaveFlip(prev: Double, next: Double) -> Bool {
        let up = centsDiff(next, prev * 2.0)
        let down = centsDiff(next, prev * 0.5)
        return min(up, down) < 80.0
    }

    /// Resolve YIN octave ambiguity using Zero-Crossing as a guide (internal),
    /// then clamp into guitar range.
    private func resolveOctaveAndClamp(_ yinFreq: Double, zcFreq: Double?, prevStable: Double?) -> Double {
        var f = yinFreq

        // 1) If we have a decent zero-cross estimate, pick octave variant closest to it
        if let z = zcFreq, z > 0 {
            let candidates = [yinFreq, yinFreq * 0.5, yinFreq * 2.0]
            var best = yinFreq
            var bestCents = Double.greatestFiniteMagnitude
            for c in candidates where c > 0 {
                let d = centsDiff(c, z)
                if d < bestCents {
                    bestCents = d
                    best = c
                }
            }
            if bestCents <= OCTAVE_RESOLVE_MAX_CENTS {
                f = best
            }
        }

        // 2) Continuity preference (octave lock to history)
        if let prev = prevStable, prev > 0 {
            let candidates = [f, f * 0.5, f * 2.0]
            var best = f
            var bestCents = Double.greatestFiniteMagnitude
            for c in candidates where c > 0 {
                let d = centsDiff(c, prev)
                if d < bestCents {
                    bestCents = d
                    best = c
                }
            }
            if bestCents <= 120.0 {
                f = best
            }
        }

        // 3) Clamp to guitar-ish range
        let minF = MusicTheory.GUITAR_MIN_FREQ - 15.0
        let maxF = MusicTheory.GUITAR_MAX_FREQ + 150.0
        if f < minF { f = minF }
        if f > maxF { f = maxF }

        return f
    }

    /// Rewrite detection payload so UI + downstream always see the resolved frequency & note.
    private func rewritePitchPayload(det: [String: Any], frequency: Double) -> [String: Any] {
        var out = det
        out["frequency"] = frequency

        let note = MusicTheory.frequencyToNote(
            frequency,
            confidence: (det["confidence"] as? Double) ?? 1.0
        )
        out["note"] = [
            "name": note.name,
            "octave": note.octave
        ]
        return out
    }

    // ============================================================
    // MARK: - Helpers
    // ============================================================

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
