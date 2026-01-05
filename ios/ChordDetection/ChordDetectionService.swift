//
//  ChordDetectionService.swift
//  SmartTabGuitarKaraoke
//
//  Created by Burak Kuruçay on 5.01.2026.
//


//
//  ChordDetectionService.swift
//  SmartTabGuitarKaraoke
//
//  Real-time chord detection service (v1).
//  Pipeline:
//    Audio samples
//      → Chroma vector
//      → Template matching
//      → Best chord decision
//      → ChordDetectionResult
//
//  NOTE:
//  This service does NOT decide whether a chord is musically meaningful.
//  Semantic decisions are handled by NativeAudioPipeline.
//

import Foundation

// MARK: - Constants

private let DEFAULT_SAMPLE_RATE: Double = 44100.0

// MARK: - Service

final class ChordDetectionService {

    // MARK: - Internal State

    private var sampleRate: Double = DEFAULT_SAMPLE_RATE
    private var running: Bool = false

    private var callback: ((ChordDetectionResult?) -> Void)?

    /// Pre-generated chord templates (cached for performance)
    private let templates: [ResolvedChordTemplate] = generateAllResolvedTemplates()

    // MARK: - Lifecycle

    func start(callback: @escaping (ChordDetectionResult?) -> Void) {
        guard !running else { return }
        running = true
        self.callback = callback
    }

    func stop() {
        guard running else { return }
        running = false
        callback = nil
    }

    func setSampleRate(_ sampleRate: Double) {
        self.sampleRate = sampleRate
    }

    // MARK: - Main Processing

    /// Processes a large-window audio buffer intended for harmonic (chord) analysis.
    ///
    /// - Parameters:
    ///   - samples: time-domain PCM samples (Float)
    ///   - timestampMs: detection timestamp (milliseconds)
    func processSamples(
        samples: [Float],
        timestampMs: Int
    ) {
        print("[CHORD] processSamples called, len:", samples.count)

        guard running, let cb = callback else { return }
        guard !samples.isEmpty else { return }

        // FFT → Chroma
        let chroma = computeChromaVector(
            samples: samples,
            sampleRate: sampleRate
        )
        
        print(
          "[CHROMA]",
          chroma.map { String(format: "%.3f", $0) }.joined(separator: ", ")
        )


        // Total chroma energy (used by pipeline for gating)
        let chromaEnergy = chroma.reduce(0.0, +)

        // Template matching → Best chord (cosine similarity)
        let candidate = findBestChordCandidate(
            chroma: chroma,
            templates: templates
        )

        // Emit raw analysis result
        let result = ChordDetectionResult(
            timestamp: timestampMs,
            candidate: candidate,
            chroma: chroma,
            chromaEnergy: chromaEnergy
        )
        
        if let c = result.candidate {
            print(
              "[CANDIDATE]",
              "root:", c.root,
              "quality:", c.quality,
              "conf:", String(format: "%.3f", c.confidence)
            )
        } else {
            print("[CANDIDATE] nil")
        }

        cb(result)
    }
}
