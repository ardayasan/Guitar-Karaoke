import Foundation

// ============================================================
// TunerEngine - GuitarTuna-Style Tuner
// ============================================================
//
// CRITICAL BEHAVIOR (must match GuitarTuna):
//
// MANUAL MODE (string selected):
// - Note display is LOCKED to the selected string's target
// - Only the cents indicator moves
// - Never shows adjacent notes (e.g., if E4 selected, never show D#4 or F4)
//
// AUTO MODE (no string selected):
// - Normal nearest-string detection
// - Note can change based on detected frequency
// ============================================================

final class TunerEngine {
    
    // ========================
    // MARK: - Guitar Strings (Standard Tuning)
    // ========================
    
    private struct GuitarString {
        let stringNo: Int
        let name: String
        let octave: Int
        let freq: Double
    }
    
    // Standard tuning: E2 A2 D3 G3 B3 E4
    private let STRINGS: [GuitarString] = [
        GuitarString(stringNo: 6, name: "E", octave: 2, freq: 82.41),   // Low E
        GuitarString(stringNo: 5, name: "A", octave: 2, freq: 110.0),   // A
        GuitarString(stringNo: 4, name: "D", octave: 3, freq: 146.83),  // D
        GuitarString(stringNo: 3, name: "G", octave: 3, freq: 196.0),   // G
        GuitarString(stringNo: 2, name: "B", octave: 3, freq: 246.94),  // B
        GuitarString(stringNo: 1, name: "E", octave: 4, freq: 329.63)   // High E
    ]
    
    // ========================
    // MARK: - Stability Parameters
    // ========================
    
    // Rolling average buffer
    private let BUFFER_SIZE_HIGH = 4         // For high strings
    private let BUFFER_SIZE_LOW = 8          // Larger buffer for bass (more stable)
    
    // Confidence thresholds - LOWER for bass strings
    private let CONFIDENCE_THRESHOLD_HIGH = 0.75
    private let CONFIDENCE_THRESHOLD_LOW = 0.45    // Even lower for problematic bass
    private let LOW_FREQ_CUTOFF = 150.0            // E2=82, A2=110, D3=147
    
    // Lock mechanism - stricter for bass
    private let LOCK_THRESHOLD_CENTS = 2.0
    private let LOCK_THRESHOLD_CENTS_BASS = 4.0   // Wider dead zone for bass
    private let LOCK_FRAMES_REQUIRED = 2
    private let UNLOCK_FRAMES_REQUIRED = 2
    private let UNLOCK_FRAMES_REQUIRED_BASS = 4   // Harder to unlock for bass
    
    // Display
    private let PERFECT_ZONE_CENTS = 5.0
    private let CENTS_RANGE = 50.0
    
    // Silence
    private let SILENCE_TIMEOUT_MS = 350
    
    // ========================
    // MARK: - State
    // ========================
    
    private var isActive = false
    
    // CRITICAL: Selected string for manual mode
    // When set, note display is LOCKED to this string
    private var selectedStringNo: Int? = nil
    private var selectedString: GuitarString? = nil
    
    // Frequency buffer for rolling average
    private var freqBuffer: [Double] = []
    
    // Cents lock mechanism (only applies to cents, not note)
    private var lockedCents: Double? = nil
    private var lockFrameCount = 0
    private var unlockFrameCount = 0
    
    // Auto mode: track last target for stability
    private var lastAutoTarget: GuitarString? = nil
    
    // Silence tracking
    private var lastDetectionMs: Int = 0
    
    // Callback
    var onTunerData: (([String: Any]) -> Void)? = nil
    
    // ========================
    // MARK: - Public API
    // ========================
    
    func start() {
        isActive = true
        reset()
    }
    
    func stop() {
        isActive = false
        reset()
    }
    
    /// Set the selected string for manual mode
    /// Pass nil for auto mode
    func setSelectedString(_ stringNo: Int?) {
        selectedStringNo = stringNo
        
        // Find the corresponding string struct
        if let no = stringNo {
            selectedString = STRINGS.first(where: { $0.stringNo == no })
        } else {
            selectedString = nil
        }
        
        // Reset smoothing state when changing mode
        freqBuffer = []
        lockedCents = nil
        lockFrameCount = 0
        unlockFrameCount = 0
    }
    
    func reset() {
        freqBuffer = []
        lockedCents = nil
        lockFrameCount = 0
        unlockFrameCount = 0
        lastAutoTarget = nil
        lastDetectionMs = 0
    }
    
    // ========================
    // MARK: - Main Processing
    // ========================
    
    func process(frequency: Double, confidence: Double, timestampMs: Int) {
        guard isActive else { return }
        guard frequency > 0 else { return }
        
        // Determine if this is a bass note
        let isBassNote = frequency < LOW_FREQ_CUTOFF
        
        // ADAPTIVE CONFIDENCE: Lower threshold for bass strings
        let requiredConfidence = isBassNote 
            ? CONFIDENCE_THRESHOLD_LOW 
            : CONFIDENCE_THRESHOLD_HIGH
        guard confidence >= requiredConfidence else { return }
        
        lastDetectionMs = timestampMs
        
        // ----------------------------------------
        // 1. Add to rolling average buffer
        // Use larger buffer for bass (more stable)
        // ----------------------------------------
        let bufferSize = isBassNote ? BUFFER_SIZE_LOW : BUFFER_SIZE_HIGH
        
        freqBuffer.append(frequency)
        while freqBuffer.count > bufferSize {
            freqBuffer.removeFirst()
        }
        
        // Need minimum samples
        let minSamples = isBassNote ? 3 : 2
        guard freqBuffer.count >= minSamples else { return }
        
        // ----------------------------------------
        // 2. Calculate rolling average frequency
        // ----------------------------------------
        let avgFreq = freqBuffer.reduce(0, +) / Double(freqBuffer.count)
        
        // ----------------------------------------
        // 3. Determine target string
        // ----------------------------------------
        let target: GuitarString
        let isManualMode: Bool
        
        if let manual = selectedString {
            // MANUAL MODE: Target is ALWAYS the selected string
            // This is critical for GuitarTuna behavior
            target = manual
            isManualMode = true
        } else {
            // AUTO MODE: Find nearest string
            target = findNearestString(freq: avgFreq)
            isManualMode = false
        }
        
        // ----------------------------------------
        // 4. Calculate cents relative to target
        // ----------------------------------------
        // cents = 1200 * log2(detected / target)
        let rawCents = 1200.0 * log2(avgFreq / target.freq)
        let clampedCents = max(-CENTS_RANGE, min(CENTS_RANGE, rawCents))
        
        // Check if average frequency is bass (for lock mechanism)
        let isBassAvg = avgFreq < LOW_FREQ_CUTOFF
        
        // ----------------------------------------
        // 5. Apply lock mechanism to cents
        // Use stricter lock for bass notes
        // ----------------------------------------
        let stableCents = applyLockMechanism(newCents: clampedCents, isBass: isBassAvg)
        let displayCents = Int(round(stableCents))
        
        // ----------------------------------------
        // 6. Determine status
        // ----------------------------------------
        let absCents = abs(displayCents)
        let status: String
        let statusCode: Int
        
        if absCents <= Int(PERFECT_ZONE_CENTS) {
            status = "PERFECT"
            statusCode = 0
        } else if absCents <= 15 {
            status = displayCents < 0 ? "LOW" : "HIGH"
            statusCode = 1
        } else {
            status = displayCents < 0 ? "LOW" : "HIGH"
            statusCode = 2
        }
        
        // ----------------------------------------
        // 7. Emit data
        // ----------------------------------------
        // CRITICAL: In manual mode, note is ALWAYS the selected target
        // Never show adjacent notes - only cents moves
        let data: [String: Any] = [
            "isTuner": true,
            "frequency": avgFreq,
            "cents": displayCents,
            "targetString": target.stringNo,
            "targetName": target.name,
            "targetOctave": target.octave,
            "targetFreq": target.freq,
            "confidence": confidence,
            "status": status,
            "statusCode": statusCode,
            "isSilent": false,
            "isManualMode": isManualMode
        ]
        
        onTunerData?(data)
    }
    
    // ========================
    // MARK: - Auto Mode String Selection
    // ========================
    
    private func findNearestString(freq: Double) -> GuitarString {
        // Find closest string by frequency
        let closest = STRINGS.min(by: { abs($0.freq - freq) < abs($1.freq - freq) }) ?? STRINGS[0]
        
        // Stability: stick with last target if reasonably close
        if let last = lastAutoTarget {
            let centsFromLast = 1200.0 * log2(freq / last.freq)
            if abs(centsFromLast) < 35 {
                return last
            }
        }
        
        lastAutoTarget = closest
        return closest
    }
    
    // ========================
    // MARK: - Lock Mechanism
    // ========================
    
    private func applyLockMechanism(newCents: Double, isBass: Bool) -> Double {
        // Use stricter thresholds for bass to prevent oscillation
        let lockThreshold = isBass ? LOCK_THRESHOLD_CENTS_BASS : LOCK_THRESHOLD_CENTS
        let unlockFramesNeeded = isBass ? UNLOCK_FRAMES_REQUIRED_BASS : UNLOCK_FRAMES_REQUIRED
        
        guard let locked = lockedCents else {
            // No lock yet, try to establish
            lockFrameCount += 1
            if lockFrameCount >= LOCK_FRAMES_REQUIRED {
                lockedCents = newCents
            }
            return newCents
        }
        
        let diff = abs(newCents - locked)
        
        // If difference is small, stay locked
        if diff <= lockThreshold {
            unlockFrameCount = 0
            return locked
        }
        
        // Difference is large - count frames to unlock
        unlockFrameCount += 1
        
        if unlockFrameCount >= unlockFramesNeeded {
            lockedCents = newCents
            unlockFrameCount = 0
            return newCents
        }
        
        return locked
    }
    
    // ========================
    // MARK: - Silence Check
    // ========================
    
    func checkSilence(nowMs: Int) {
        guard isActive else { return }
        
        if lastDetectionMs > 0 && (nowMs - lastDetectionMs) > SILENCE_TIMEOUT_MS {
            // Emit silent state
            // CRITICAL: In manual mode, keep the reference note even when silent
            var data: [String: Any] = [
                "isTuner": true,
                "isSilent": true,
                "cents": 0,
                "status": "SILENT",
                "statusCode": -1
            ]
            
            // If manual mode, include the locked target note
            if let manual = selectedString {
                data["targetString"] = manual.stringNo
                data["targetName"] = manual.name
                data["targetOctave"] = manual.octave
            }
            
            onTunerData?(data)
            
            // Partial reset - keep selectedString
            freqBuffer = []
            lockedCents = nil
            lockFrameCount = 0
            unlockFrameCount = 0
            lastDetectionMs = 0
        }
    }
}
