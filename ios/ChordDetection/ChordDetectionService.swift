//
//  ChordDetectionService.swift
//  SmartTabGuitarKaraoke
//
//  JS parity implementation of ChordDetectionService
//

import Foundation

// MARK: - Constants

private let DEFAULT_SAMPLE_RATE: Double = 44100.0

// MARK: - Service

final class ChordDetectionService {

    // MARK: - Internal State

    private var sampleRate: Double = DEFAULT_SAMPLE_RATE
    private var running: Bool = false

    private var callback: ((ChordDetectionResult) -> Void)?

    /// Pre-generated chord templates (C major, C minor, ... B minor)
    /// Generated once and reused for performance.
    private let templates: [ResolvedChordTemplate] =
        generateAllResolvedTemplates()

    // MARK: - Lifecycle

    func start(
        callback: @escaping (ChordDetectionResult) -> Void
    ) {
        if running { return }

        running = true
        self.callback = callback
    }

    func stop() {
        if !running { return }

        running = false
        callback = nil
    }

    func setSampleRate(_ sampleRate: Double) {
        self.sampleRate = sampleRate
    }

    // MARK: - Main Processing (JS parity)

    func processSamples(
        samples: [Float],
        timestampMs: Int
    ) {
        // JS parity guards
        if !running { return }
        guard let cb = callback else { return }
        if samples.isEmpty { return }

        // FFT → Chroma
        let chroma = computeChromaVector(
            samples: samples,
            sampleRate: sampleRate
        )

        // Total chroma energy
        let chromaEnergy = chroma.reduce(0.0, +)

        // Template matching → Best chord
        let candidate = findBestChordCandidate(
            chroma: chroma,
            templates: templates
        )

        // Emit raw analysis result (NO semantics)
        let result = ChordDetectionResult(
            timestamp: timestampMs,
            candidate: candidate,
            chroma: chroma,
            chromaEnergy: chromaEnergy
        )

        cb(result)
    }
}
