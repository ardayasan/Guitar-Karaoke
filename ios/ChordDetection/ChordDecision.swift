//
//  ChordDecision.swift
//  SmartTabGuitarKaraoke
//
//  JS parity – best cosine similarity wins
//

import Foundation

private let MIN_CONFIDENCE: Double = 0.65

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
