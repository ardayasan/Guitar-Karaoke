//
//  ChordTemplates.swift
//  SmartTabGuitarKaraoke
//
//  Music-theory-only chord template definitions.
//  Mirrors services/chord/ChordTemplates.ts
//

import Foundation

// MARK: - Base Templates (Interval Definitions)

/// Interval definitions for supported chord qualities.
///
/// Intervals are expressed in semitones relative to root.
public let BASE_CHORD_TEMPLATES: [ChordTemplate] = [
    ChordTemplate(
        quality: .major,
        intervals: [0, 4, 7]   // root, major third, perfect fifth
    ),
    ChordTemplate(
        quality: .minor,
        intervals: [0, 3, 7]   // root, minor third, perfect fifth
    )
]

// MARK: - Template Resolution Utilities

/// Resolve a chord template for a given root pitch class.
///
/// Example:
///   root = 9 (A)
///   major template [0,4,7]
///   → [9, 1, 4]  (A, C#, E)
public func resolveTemplateForRoot(
    template: ChordTemplate,
    root: PitchClass
) -> ResolvedChordTemplate {

    let pitchClasses = template.intervals.map {
        (root + $0) % 12
    }

    return ResolvedChordTemplate(
        root: root,
        quality: template.quality,
        pitchClasses: pitchClasses
    )
}

/// Generate all resolved chord templates
/// for all pitch classes (0–11).
///
/// Typically called once and cached.
public func generateAllResolvedTemplates() -> [ResolvedChordTemplate] {
    var resolved: [ResolvedChordTemplate] = []

    for root in 0..<12 {
        for template in BASE_CHORD_TEMPLATES {
            resolved.append(
                resolveTemplateForRoot(
                    template: template,
                    root: root
                )
            )
        }
    }

    return resolved
}
