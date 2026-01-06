//
//  ChordMatching.swift
//  SmartTabGuitarKaraoke
//
//  JS parity – cosine similarity only
//

import Foundation

public func matchTemplateToChroma(
    chroma: ChromaVector,
    templatePitchClasses: [PitchClass]
) -> Double {

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
