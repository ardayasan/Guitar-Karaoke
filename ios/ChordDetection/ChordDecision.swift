//
//  ChordDecision.swift
//  SmartTabGuitarKaraoke
//
//  Chooses the best chord candidate based on
//  cosine similarity scores.
//  Mirrors services/chord/utils/decision.ts
//

import Foundation

/// Minimum similarity score required
/// to accept a chord candidate.
private let MIN_CONFIDENCE: Double = 0.65

/// Finds the best matching chord candidate
/// for a given chroma vector.
///
/// - Parameters:
///   - chroma: 12-dimensional chroma vector
///   - templates: all resolved chord templates
/// - Returns: best ChordCandidate or nil
public func findBestChordCandidate(
    chroma: ChromaVector,
    templates: [ResolvedChordTemplate]
) -> ChordCandidate? {

    var bestScore: Double = 0
    var bestTemplate: ResolvedChordTemplate? = nil

    for template in templates {
        let score = matchTemplateToChroma(
            chroma: chroma,
            templatePitchClasses: template.pitchClasses
        )

        if score > bestScore {
            bestScore = score
            bestTemplate = template
        }
    }

    guard
        let selected = bestTemplate,
        bestScore >= MIN_CONFIDENCE
    else {
        return nil
    }

    return ChordCandidate(
        root: selected.root,
        quality: selected.quality,
        confidence: bestScore
    )
}
