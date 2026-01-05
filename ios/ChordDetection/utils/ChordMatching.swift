//
//  ChordMatching.swift
//  SmartTabGuitarKaraoke
//
//  Cosine similarity matching between chroma vectors
//  and resolved chord templates.
//  Mirrors services/chord/matching.ts
//

import Foundation

/// Matches a chroma vector against a resolved chord template
/// using cosine similarity.
///
/// - Parameters:
///   - chroma: 12-dimensional normalized chroma vector
///   - templatePitchClasses: pitch classes belonging to the chord template
/// - Returns: similarity score in range [0, 1]
public func matchTemplateToChroma(
    chroma: ChromaVector,
    templatePitchClasses: [PitchClass]
) -> Double {

    // Build binary template vector
    var templateVector = Array(repeating: 0.0, count: 12)
    for pc in templatePitchClasses {
        guard pc >= 0 && pc < 12 else { continue }
        templateVector[pc] = 1.0
    }

    var dot: Double = 0
    var normA: Double = 0
    var normB: Double = 0

    for i in 0..<12 {
        dot += chroma[i] * templateVector[i]
        normA += chroma[i] * chroma[i]
        normB += templateVector[i] * templateVector[i]
    }

    if normA == 0 || normB == 0 {
        return 0
    }

    return dot / (sqrt(normA) * sqrt(normB))
}
