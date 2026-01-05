//
//  MusicTheory.swift
//  SmartTabGuitarKaraoke
//
//  Created by Burak Kuruçay on 5.01.2026.
//


//
//  MusicTheory.swift
//  SmartTabGuitarKaraoke
//
//  Created by Burak Kuruçay on 5.01.2026.
//


import Foundation

public enum MusicTheory {

    // A4 reference (matches JS)
    public static let A4_FREQUENCY: Double = 440.0
    public static let A4_MIDI_NOTE: Int = 69

    // Note names in chromatic order (matches JS)
    public static let NOTE_NAMES: [String] = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]

    /// MIDI = 69 + 12 * log2(f / 440)
    public static func frequencyToMidi(_ frequency: Double) -> Int {
        let midi = 69.0 + 12.0 * log2(frequency / A4_FREQUENCY)
        return Int(round(midi))
    }

    /// f = 440 * 2^((MIDI - 69) / 12)
    public static func midiToFrequency(_ midi: Int) -> Double {
        return A4_FREQUENCY * pow(2.0, Double(midi - A4_MIDI_NOTE) / 12.0)
    }

    /// Convert MIDI to note name + octave (matches JS: octave = floor(midi/12) - 1)
    public static func midiToNoteName(_ midi: Int) -> (name: String, octave: Int) {
        let octave = Int(floor(Double(midi) / 12.0)) - 1
        let noteIndex = ((midi % 12) + 12) % 12
        let name = NOTE_NAMES[noteIndex]
        return (name, octave)
    }

    /// Full Note object (matches your JS frequencyToNote)
    public static func frequencyToNote(_ frequency: Double, confidence: Double = 1.0) -> Note {
        let midiNote = frequencyToMidi(frequency)
        let pair = midiToNoteName(midiNote)
        return Note(
            name: pair.name,
            octave: pair.octave,
            frequency: frequency,
            midiNote: midiNote,
            confidence: confidence
        )
    }

    // Guitar range (matches JS constants)
    // MIN: midiToFrequency(40) // E2
    // MAX: midiToFrequency(88) // E6
    public static let GUITAR_MIN_FREQ: Double = midiToFrequency(40)
    public static let GUITAR_MAX_FREQ: Double = midiToFrequency(88)
}
