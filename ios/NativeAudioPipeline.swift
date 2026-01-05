//
//  NativeAudioPipeline.swift
//  SmartTabGuitarKaraoke
//
//  Owns semantic audio decisions.
//  NOTE + CHORD arbitration lives here.
//
//  JS CONTRACT:
//  - NOTE:
//      { timestamp, note:{name, octave}, frequency, amplitude, confidence }
//  - CHORD:
//      { timestamp, chord:{root, type}, frequency, amplitude, confidence }
//  - SILENCE: nil
//

import Foundation

final class NativeAudioPipeline {

    // MARK: - Output (JS contract)
    var emitDetection: (([String: Any]?) -> Void)?

    // MARK: - Services
    private let pitchService = PitchDetectionService()
    private let chordService = ChordDetectionService()

    // MARK: - State
    private var isActive = false
    private var isSilent = true
    private var chordActive = false

    private var lastSignalTimeMs: Int = 0
    private var lastNoteEmitTimeMs: Int = 0
    private var lastChordProcessTimeMs: Int = 0
    private var lastChordEmitTimeMs: Int = 0

    // MARK: - Timing config
    private let NOTE_PUBLISH_INTERVAL_MS = 50
    private let CHORD_PUBLISH_INTERVAL_MS = 180
    private let CHORD_HOLD_MS = 250
    private let SILENCE_TIMEOUT_MS = 400

    // MARK: - Chord gates
    private let MIN_CHORD_CONFIDENCE: Double = 0.7
    private let PITCH_CLASS_ENERGY_THRESHOLD: Double = 0.1
    private let MIN_ACTIVE_PITCH_CLASSES = 2

    // MARK: - Lifecycle
    func start() {
        isActive = true
        isSilent = true
        chordActive = false

        lastSignalTimeMs = 0
        lastNoteEmitTimeMs = 0
        lastChordProcessTimeMs = 0
        lastChordEmitTimeMs = 0

        pitchService.start()

        chordService.start { [weak self] result in
            self?.handleChordResult(result)
        }
    }

    func stop() {
        isActive = false
        pitchService.stop()
        chordService.stop()
    }

    // MARK: - Onset
    func onOnset(timestampSec: Double) {
        guard isActive else { return }

        let tsMs = Int(timestampSec * 1000)

        lastSignalTimeMs = tsMs
        isSilent = false
        chordActive = false

        lastNoteEmitTimeMs = 0
        lastChordProcessTimeMs = 0
        lastChordEmitTimeMs = 0
    }

    // MARK: - NOTE samples
    func onNoteSamples(
        samples: [Float],
        timestampSec: Double,
        sampleRate: Double,
        rms: Float
    ) {
        guard isActive else { return }

        let tsMs = Int(timestampSec * 1000)
        lastSignalTimeMs = tsMs
        isSilent = false

        if tsMs - lastNoteEmitTimeMs < NOTE_PUBLISH_INTERVAL_MS {
            return
        }

        // Chord dominance (temporary, time-based)
        if chordActive {
            if tsMs - lastChordEmitTimeMs < CHORD_HOLD_MS {
                return
            } else {
                chordActive = false
            }
        }

        pitchService.setSampleRate(sampleRate)

        if let detection = pitchService.processSamples(
            samples: samples,
            timestampMs: tsMs,
            amplitude: Double(rms)
        ) {
            lastNoteEmitTimeMs = tsMs
            emitDetection?(detection)
        }
    }

    // MARK: - CHORD samples
    func onChordSamples(
        samples: [Float],
        timestampSec: Double,
        sampleRate: Double,
        rms: Float
    ) {
        guard isActive else { return }

        let tsMs = Int(timestampSec * 1000)
        lastSignalTimeMs = tsMs
        isSilent = false

        if tsMs - lastChordProcessTimeMs < CHORD_PUBLISH_INTERVAL_MS {
            return
        }
        lastChordProcessTimeMs = tsMs

        chordService.setSampleRate(sampleRate)
        chordService.processSamples(samples: samples, timestampMs: tsMs)
    }

    // MARK: - Chord result handling
    private func handleChordResult(_ result: ChordDetectionResult?) {
        guard isActive, let res = result else { return }
        guard let candidate = res.candidate else { return }

        if candidate.confidence < MIN_CHORD_CONFIDENCE {
            return
        }

        let activeCount = countActivePitchClasses(
            chroma: res.chroma,
            threshold: PITCH_CLASS_ENERGY_THRESHOLD
        )

        if activeCount < MIN_ACTIVE_PITCH_CLASSES {
            return
        }

        chordActive = true
        lastChordEmitTimeMs = res.timestamp

        let payload: [String: Any] = [
            "timestamp": res.timestamp,
            "confidence": candidate.confidence,
            "frequency": 0,
            "amplitude": 0,
            "chord": [
                "root": pitchClassName(candidate.root),
                "type": candidate.quality.rawValue
            ]
        ]

        emitDetection?(payload)
    }

    // MARK: - Silence watchdog
    func tickSilenceCheck(nowSec: Double) {
        guard isActive, !isSilent else { return }

        let nowMs = Int(nowSec * 1000)
        let elapsed = nowMs - lastSignalTimeMs

        if elapsed > SILENCE_TIMEOUT_MS {
            isSilent = true
            chordActive = false
            emitDetection?(nil)
        }
    }

    // MARK: - Helpers

    private func countActivePitchClasses(
        chroma: [Double],
        threshold: Double
    ) -> Int {
        guard chroma.count == 12 else { return 0 }

        let totalEnergy = chroma.reduce(0, +)
        if totalEnergy <= 0 { return 0 }

        var activeCount = 0
        for v in chroma {
            if (v / totalEnergy) >= threshold {
                activeCount += 1
            }
        }
        return activeCount
    }

    private func pitchClassName(_ pc: Int) -> String {
        let idx = ((pc % 12) + 12) % 12
        switch idx {
        case 0: return "C"
        case 1: return "C#"
        case 2: return "D"
        case 3: return "D#"
        case 4: return "E"
        case 5: return "F"
        case 6: return "F#"
        case 7: return "G"
        case 8: return "G#"
        case 9: return "A"
        case 10: return "A#"
        default: return "B"
        }
    }
}
