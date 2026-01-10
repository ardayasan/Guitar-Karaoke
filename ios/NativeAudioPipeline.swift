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

    // ============================================================
    // MARK: - TUNABLE PARAMETERS (grouped for easy adjustment)
    // ============================================================
    
    // --- Timing ---
    private let SILENCE_TIMEOUT_MS = 400
    private let CHORD_RATE_FACTOR = 1.1
    private let CHORD_RATE_MIN_MS = 80   // Faster chord processing for lower latency
    private let CHORD_RATE_MAX_MS = 200
    
    // --- RMS Gates ---
    private let RMS_NOTE_THRESHOLD: Float = 0.0008
    private let RMS_CHORD_THRESHOLD: Float = 0.008  // Slightly lower for soft strums
    
    // --- Note Detection ---
    private let NOTE_CONFIDENCE_THRESHOLD = 0.8
    
    // --- Chord Detection (relaxed for sensitivity) ---
    private let CHORD_CONFIDENCE_THRESHOLD = 0.60      // Lowered: rely on structural gates for safety
    private let CHORD_CONFIDENCE_STRONG = 0.75         // High confidence = immediate activation
    
    // --- Pitch Class Thresholds ---
    private let PITCH_CLASS_ENERGY_THRESHOLD = 0.08    // Slightly lower for soft strums
    private let MINIMUM_ACTIVE_PITCH_CLASS_THRESHOLD = 2
    private let TEMPLATE_MATCH_THRESHOLD = 0.07        // Lower for imperfect technique
    private let MIN_TEMPLATE_MATCH = 2
    
    // --- Anti-Mono Gates (safety) ---
    private let MONO_DOMINANT_MIN = 0.58               // Slightly stricter on mono detection
    private let MONO_SECOND_MAX = 0.20                 // If 2nd PC is > 20%, it's likely a chord
    private let HARMONIC_SUPPRESS_RATIO = 0.30
    
    // --- Temporal / Hysteresis ---
    private let CHROMA_HISTORY_WINDOW_MS = 300         // Shorter for faster response
    private let COACTIVATION_MIN_FRAMES = 1            // Only 1 frame needed (faster)
    private let COACTIVATION_ACTIVE_THRESHOLD = 0.08
    
    // --- Chord State Hysteresis ---
    private let CHORD_ENTRY_FRAMES = 1                 // Frames needed to enter chord mode
    private let CHORD_EXIT_FRAMES = 2                  // Frames without valid chord to exit
    private let CHORD_HOLD_MS = 150                    // Minimum hold time before exiting chord mode
    
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
        resetChordState()
        lastSignalTimeMs = 0
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
    
    private func resetChordState() {
        chordActive = false
        chordEntryCounter = 0
        chordExitCounter = 0
        lastChordEmitTimeMs = 0
        pendingChordCandidate = nil
    }

    func onOnset(timestampSec: Double) {
        let ts = Int(timestampSec * 1000)
        lastSignalTimeMs = ts
        isSilent = false
        
        // On onset: reset chord state but keep history for quick re-detection
        resetChordState()
        lastChordProcessTimeMs = 0
        cachedChordIntervalMs = nil
        cachedChordIntervalKey = nil
    }

    // ============================================================
    // MARK: - NOTE Detection (always active unless chord confirmed)
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

        // KEY CHANGE: Only block notes if chord is CONFIRMED active
        // This is the hysteresis: chord must be stable before suppressing notes
        // KEY CHANGE: Only block notes if chord is CONFIRMED active
        // This is the hysteresis: chord must be stable before suppressing notes
        // In Tuner mode, we never block notes
        if mode != .tuner && chordActive { return }

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

        emitDetection?(det)
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

        // Tuner mode disables chord detection entirely
        guard isActive, mode != .tuner else { return }

        // RMS gate (lower threshold for soft strums)
        if rms < RMS_CHORD_THRESHOLD { return }

        let ts = Int(timestampSec * 1000)
        lastSignalTimeMs = ts
        isSilent = false

        // Dynamic interval (faster for lower latency)
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
        
        // Evaluate chord candidate
        guard let cand = result.candidate else {
            handleNoChordCandidate(timestamp: result.timestamp)
            return
        }
        
        let conf = cand.confidence
        
        // Basic confidence gate (lowered, rely on structural gates)
        if conf < CHORD_CONFIDENCE_THRESHOLD {
            handleNoChordCandidate(timestamp: result.timestamp)
            return
        }
        
        // Use current frame chroma for faster response (not averaged)
        // Only use averaged for stability checks
        let instantChroma = chroma
        let avgChroma = averagedChromaInWindow(nowMs: result.timestamp)
        
        // --- STRUCTURAL SAFETY GATES ---
        // These are the hard gates that prevent single notes from being classified as chords
        
        // 1) Monophonic dominance check (on averaged chroma for stability)
        let mono = isMonophonicDominant(chroma: avgChroma)
        if mono {
            // If monophonic, apply harmonic suppression and re-check
            let suppressed = suppressHarmonicIllusions(chroma: avgChroma)
            let suppressedActive = countActivePitchClasses(chroma: suppressed, threshold: PITCH_CLASS_ENERGY_THRESHOLD)
            if suppressedActive < MINIMUM_ACTIVE_PITCH_CLASS_THRESHOLD {
                handleNoChordCandidate(timestamp: result.timestamp)
                return
            }
        }
        
        // 2) Active pitch class count (on instant chroma for responsiveness)
        let activeCount = countActivePitchClasses(chroma: instantChroma, threshold: PITCH_CLASS_ENERGY_THRESHOLD)
        if activeCount < MINIMUM_ACTIVE_PITCH_CLASS_THRESHOLD {
            handleNoChordCandidate(timestamp: result.timestamp)
            return
        }
        
        // 3) Interval skeleton gate: must have 3rd AND 5th
        if !passesIntervalSkeletonGate(chroma: instantChroma, root: cand.root, quality: cand.quality) {
            handleNoChordCandidate(timestamp: result.timestamp)
            return
        }
        
        // 4) Template match (at least 2 of 3 chord tones present)
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
        
        // --- PASSED ALL GATES: This is a valid chord candidate ---
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
        // Reset exit counter since we have a valid candidate
        chordExitCounter = 0
        
        // Strong confidence = immediate activation
        if confidence >= CHORD_CONFIDENCE_STRONG {
            activateChord(root: root, quality: quality, confidence: confidence, timestamp: timestamp)
            return
        }
        
        // Normal confidence = use hysteresis
        if chordActive {
            // Already active, just emit (chord continuation)
            emitChord(root: root, quality: quality, confidence: confidence, timestamp: timestamp)
        } else {
            // Not active yet, increment entry counter
            chordEntryCounter += 1
            pendingChordCandidate = (root, quality, confidence)
            
            if chordEntryCounter >= CHORD_ENTRY_FRAMES {
                activateChord(root: root, quality: quality, confidence: confidence, timestamp: timestamp)
            }
        }
    }
    
    private func handleNoChordCandidate(timestamp: Int) {
        // No valid chord in this frame
        chordEntryCounter = 0
        pendingChordCandidate = nil
        
        if chordActive {
            // Check if we should exit chord mode
            let timeSinceLastEmit = timestamp - lastChordEmitTimeMs
            
            if timeSinceLastEmit > CHORD_HOLD_MS {
                chordExitCounter += 1
                
                if chordExitCounter >= CHORD_EXIT_FRAMES {
                    // Exit chord mode
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
        // If top bin is very dominant AND second bin is weak = monophonic
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
            (domPc + 7) % 12,  // Perfect 5th
            (domPc + 4) % 12   // Major 3rd
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

        // Both 3rd and 5th must be present
        let thirdOK = thirdE >= TEMPLATE_MATCH_THRESHOLD
        let fifthOK = fifthE >= TEMPLATE_MATCH_THRESHOLD

        if !(thirdOK && fifthOK) { return false }

        // Extra safety: if root overwhelmingly dominates, suspicious
        if rootE >= 0.80 && (thirdE < 0.10 || fifthE < 0.10) {
            return false
        }

        return true
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
