//
//  ChordTypes.swift
//  SmartTabGuitarKaraoke
//
//  Native chord-detection internal types.
//  Mirrors services/chord/ChordDetectionTypes.ts
//

import Foundation

// MARK: - Pitch & Harmonic Foundations

/// Canonical pitch class representation.
///
/// Range: 0–11
/// 0 = C, 1 = C#, 2 = D, ..., 11 = B
///
/// Enharmonic spellings are intentionally NOT represented.
public typealias PitchClass = Int

/// 12-dimensional chroma vector.
///
/// Each index represents a pitch class (0–11).
/// Values are normalized spectral energy in range [0, 1].
public typealias ChromaVector = [Double]

// MARK: - Chord Theory & Templates

/// Supported chord qualities for detection.
///
/// NOTE:
/// This intentionally mirrors the JS subset:
/// 'major' | 'minor'
public enum DetectedChordQuality: String, Codable {
    case major
    case minor
}

/// Interval-based chord template.
///
/// Intervals are expressed in semitones relative to root.
/// Examples:
/// - Major: [0, 4, 7]
/// - Minor: [0, 3, 7]
public struct ChordTemplate {
    public let quality: DetectedChordQuality
    public let intervals: [PitchClass]

    public init(
        quality: DetectedChordQuality,
        intervals: [PitchClass]
    ) {
        self.quality = quality
        self.intervals = intervals
    }
}

/// Fully-resolved chord template bound to a root pitch class.
///
/// Used during template matching.
public struct ResolvedChordTemplate {
    public let root: PitchClass
    public let quality: DetectedChordQuality
    public let pitchClasses: [PitchClass]

    public init(
        root: PitchClass,
        quality: DetectedChordQuality,
        pitchClasses: [PitchClass]
    ) {
        self.root = root
        self.quality = quality
        self.pitchClasses = pitchClasses
    }
}

// MARK: - Detection Results (DSP Internal)

/// Internal chord candidate produced by the detection algorithm.
///
/// This is NOT a domain-level Chord object.
/// Conversion to `Chord` happens in the pipeline layer.
public struct ChordCandidate {
    public let root: PitchClass
    public let quality: DetectedChordQuality
    public let confidence: Double   // 0–1

    public init(
        root: PitchClass,
        quality: DetectedChordQuality,
        confidence: Double
    ) {
        self.root = root
        self.quality = quality
        self.confidence = confidence
    }
}

/// Result produced by the ChordDetectionService.
///
/// NOTE:
/// This is a low-level DSP result.
/// Semantic decisions are handled by NativeAudioPipeline.
public struct ChordDetectionResult {
    /// Detection timestamp in milliseconds
    public let timestamp: Int

    /// Best matching chord candidate (may be nil)
    public let candidate: ChordCandidate?

    /// Chroma vector (length = 12)
    public let chroma: ChromaVector

    /// Sum of chroma energy values.
    /// Used for gating and sparsity checks.
    public let chromaEnergy: Double

    public init(
        timestamp: Int,
        candidate: ChordCandidate?,
        chroma: ChromaVector,
        chromaEnergy: Double
    ) {
        self.timestamp = timestamp
        self.candidate = candidate
        self.chroma = chroma
        self.chromaEnergy = chromaEnergy
    }
}
