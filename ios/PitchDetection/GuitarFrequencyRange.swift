//
//  GuitarFrequencyRange.swift
//  SmartTabGuitarKaraoke
//
//  Created by Burak Kuruçay on 5.01.2026.
//


//
//  GuitarFrequencyRange.swift
//  SmartTabGuitarKaraoke
//
//  Created by Burak Kuruçay on 5.01.2026.
//


import Foundation

public struct GuitarFrequencyRange {
    public let min: Double
    public let max: Double

    public init(min: Double, max: Double) {
        self.min = min
        self.max = max
    }
}

public struct PitchDetectionConfig {
    public var sampleRate: Double
    public var bufferSize: Int          // NOTE window size (native guarantees this)
    public var yinThreshold: Double
    public var minConfidence: Double
    public var minFrequency: Double
    public var maxFrequency: Double

    public init(
        sampleRate: Double,
        bufferSize: Int,
        yinThreshold: Double,
        minConfidence: Double,
        minFrequency: Double,
        maxFrequency: Double
    ) {
        self.sampleRate = sampleRate
        self.bufferSize = bufferSize
        self.yinThreshold = yinThreshold
        self.minConfidence = minConfidence
        self.minFrequency = minFrequency
        self.maxFrequency = maxFrequency
    }
}

// MARK: - Defaults (mirrors JS DEFAULT_PITCH_CONFIG)
public enum PitchDefaults {
    // A4 reference
    public static let A4_FREQUENCY: Double = 440.0
    public static let A4_MIDI_NOTE: Int = 69

    // Guitar range in JS:
    // MIN: midiToFrequency(40)  (E2)
    // MAX: midiToFrequency(88)  (E6)
    public static func midiToFrequency(_ midi: Int) -> Double {
        return A4_FREQUENCY * pow(2.0, Double(midi - A4_MIDI_NOTE) / 12.0)
    }

    public static let GUITAR_RANGE = GuitarFrequencyRange(
        min: midiToFrequency(40),
        max: midiToFrequency(88)
    )

    public static let DEFAULT_CONFIG = PitchDetectionConfig(
        sampleRate: 44100,
        bufferSize: 2048,
        yinThreshold: 0.15,
        minConfidence: 0.6,
        minFrequency: GUITAR_RANGE.min - 10.0,
        maxFrequency: GUITAR_RANGE.max + 100.0
    )
}
