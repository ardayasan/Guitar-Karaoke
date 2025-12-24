/**
 * ChordDetectionTypes
 * --------------------------------------------------
 * Internal type definitions for the Chord Detection subsystem.
 *
 * IMPORTANT:
 * - These types are NOT part of the application domain.
 * - They are used exclusively inside the audio analysis pipeline.
 * - All representations are canonical and octave-independent.
 */

/* -------------------------------------------------- */
/* Pitch & Harmonic Foundations                       */
/* -------------------------------------------------- */

/**
 * Canonical pitch class representation.
 *
 * Range: 0–11
 * 0 = C, 1 = C#, 2 = D, ..., 11 = B
 *
 * Enharmonic spellings (Db, Eb, Bb, etc.)
 * are intentionally NOT represented here.
 */
export type PitchClass = number;

/**
 * 12-dimensional chroma vector.
 *
 * Each index represents a PITCH CLASS (note class),
 * independent of octave.
 *
 * Index → Pitch Class (Enharmonic equivalents)
 *
 *   0  → C
 *   1  → C# / Db
 *   2  → D
 *   3  → D# / Eb
 *   4  → E
 *   5  → F
 *   6  → F# / Gb
 *   7  → G
 *   8  → G# / Ab
 *   9  → A
 *   10 → A# / Bb
 *   11 → B
 *
 * Value:
 *   Normalized spectral energy in range [0, 1],
 *   representing how strongly that pitch class
 *   is present in the current audio frame.
 *
 * Important notes:
 * - C# and Db share the SAME index (1)
 * - A# and Bb share the SAME index (10)
 * - Octave information is intentionally discarded
 *
 * This representation allows reliable chord detection
 * regardless of voicing, octave, or guitar position.
 */
export type ChromaVector = number[];


/* -------------------------------------------------- */
/* Chord Theory & Templates                           */
/* -------------------------------------------------- */

/**
 * Supported chord qualities for detection.
 *
 * NOTE:
 * This is intentionally a subset of ChordType
 * defined in `types/music.ts`.
 */
export type DetectedChordQuality = 'major' | 'minor';

/**
 * Interval-based chord template.
 *
 * Intervals are relative to the root pitch class.
 *
 * Examples:
 *  - Major: [0, 4, 7]
 *  - Minor: [0, 3, 7]
 */
export interface ChordTemplate {
    quality: DetectedChordQuality;
    intervals: PitchClass[];
}

/**
 * Fully-resolved chord template bound to a root.
 *
 * Used during template matching.
 */
export interface ResolvedChordTemplate {
    root: PitchClass;
    quality: DetectedChordQuality;
    pitchClasses: PitchClass[];
}

/* -------------------------------------------------- */
/* Detection Results (DSP Internal)                   */
/* -------------------------------------------------- */

/**
 * Internal chord candidate produced by the detection algorithm.
 *
 * This is NOT a domain-level Chord object.
 * Conversion to `Chord` happens in the pipeline layer.
 */
export interface ChordCandidate {
    root: PitchClass;
    quality: DetectedChordQuality;
    confidence: number; // 0–1
}

/**
 * Result produced by the ChordDetectionService.
 *
 * NOTE:
 * This is a low-level DSP result.
 * It does NOT represent a validated or accepted chord.
 * Semantic decisions are handled by the AudioPipeline.
 */
export interface ChordDetectionResult {
    /** Detection timestamp in milliseconds */
    timestamp: number;

    /** Best matching chord candidate (may be null) */
    candidate: ChordCandidate | null;

    /**
     * Chroma vector (length = 12).
     * Represents pitch-class energy distribution.
     */
    chroma: number[];

    /**
     * Sum of chroma energy values.
     * Used for energy gating and sparsity checks in pipeline.
     */
    chromaEnergy: number;
}

/* -------------------------------------------------- */
/* Service Interface                                  */
/* -------------------------------------------------- */

/**
 * Public interface of the Chord Detection Service.
 *
 * Designed to mirror PitchDetectionService behavior
 * for clean pipeline integration.
 */
export interface ChordDetectionService {
    /**
     * Starts the detection service.
     */
    start(
        callback: (result: ChordDetectionResult | null) => void
    ): void;

    /**
     * Stops the detection service and clears internal state.
     */
    stop(): void;

    /**
     * Updates the audio sample rate.
     */
    setSampleRate(sampleRate: number): void;

    /**
     * Processes a large-window audio buffer intended
     * for harmonic (chord) analysis.
     */
    processSamples(
        samples: Float32Array,
        timestamp: number
    ): void;
}



