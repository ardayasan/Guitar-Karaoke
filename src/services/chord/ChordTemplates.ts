/**
 * ChordTemplates
 * --------------------------------------------------
 * Defines interval-based chord templates and utilities
 * for generating concrete chord candidates.
 *
 * This module contains ONLY music-theory definitions.
 * No DSP, no FFT, no chroma logic.
 */

import {
    PitchClass,
    DetectedChordQuality,
    ChordTemplate,
    ResolvedChordTemplate,
} from './ChordDetectionTypes';

/* -------------------------------------------------- */
/* Base Templates (Interval Definitions)               */
/* -------------------------------------------------- */

/**
 * Interval definitions for supported chord qualities.
 *
 * Intervals are expressed in semitones relative to root.
 */
export const BASE_CHORD_TEMPLATES: ChordTemplate[] = [
    {
        // root, major third, perfect fifth (major akor root tan 4 ve 7 ses yukarıdaki akorlardan oluşur)
        quality: 'major',
        intervals: [0, 4, 7],
    },
    {
        // root, minor third, perfect fifth
        quality: 'minor',
        intervals: [0, 3, 7],
    },
];

/* -------------------------------------------------- */
/* Template Resolution Utilities                       */
/* -------------------------------------------------- */

/**
 * Resolve a chord template for a given root pitch class.
 *
 * Example:
 *   root = 9 (A)
 *   major template [0,4,7]
 *   → [9, 1, 4]  (A, C#, E)
 */
export function resolveTemplateForRoot(
    template: ChordTemplate,
    root: PitchClass
    ): ResolvedChordTemplate {
    const pitchClasses = template.intervals.map(
        (interval) => (root + interval) % 12
    );

    return {
        root,
        quality: template.quality,
        pitchClasses,
    };
}

/**
 * Generate all resolved chord templates
 * for all pitch classes (0–11).
 *
 * This is typically called once and cached.
 */
export function generateAllResolvedTemplates(): ResolvedChordTemplate[] {
    const resolved: ResolvedChordTemplate[] = [];

    for (let root: PitchClass = 0; root < 12; root++) {
        for (const template of BASE_CHORD_TEMPLATES) {
        resolved.push(resolveTemplateForRoot(template, root));
        }
    }

    return resolved;
}
