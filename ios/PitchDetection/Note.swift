//
//  Note.swift
//  SmartTabGuitarKaraoke
//
//  Created by Burak Kuruçay on 5.01.2026.
//


//
//  Note.swift
//  SmartTabGuitarKaraoke
//
//  Created by Burak Kuruçay on 5.01.2026.
//


import Foundation

// MARK: - Note model (Contract-aligned)
public struct Note: Codable {
    public let name: String   // "C", "C#", "D", ...
    public let octave: Int    // 0..8 etc.
    public let frequency: Double
    public let midiNote: Int
    public let confidence: Double

    public init(name: String, octave: Int, frequency: Double, midiNote: Int, confidence: Double) {
        self.name = name
        self.octave = octave
        self.frequency = frequency
        self.midiNote = midiNote
        self.confidence = confidence
    }
}

// MARK: - Pitch detection result (internal)
public struct PitchResult {
    public let frequency: Double
    public let confidence: Double
    public let periodicity: Double?

    public init(frequency: Double, confidence: Double, periodicity: Double? = nil) {
        self.frequency = frequency
        self.confidence = confidence
        self.periodicity = periodicity
    }
}

// MARK: - AudioDetection payload builder (JS Contract shape)
// Contract: AudioDetection | null
// - timestamp (ms) always
// - confidence always
// - note OR chord (here only note in pitch stage)
// - frequency optional but sent for note
public enum AudioDetectionPayload {
    public static func note(timestampMs: Int, frequency: Double, amplitude: Double, confidence: Double, note: Note) -> [String: Any] {
        return [
            "timestamp": timestampMs,
            "confidence": confidence,
            "frequency": frequency,
            "amplitude": amplitude,
            "note": [
                "name": note.name,
                "octave": note.octave
            ]
        ]
    }

    public static func silence() -> [String: Any]? {
        return nil
    }
}
