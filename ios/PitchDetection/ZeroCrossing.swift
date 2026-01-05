//
//  ZeroCrossing.swift
//  SmartTabGuitarKaraoke
//
//  Created by Burak Kuruçay on 5.01.2026.
//


//
//  ZeroCrossing.swift
//  SmartTabGuitarKaraoke
//
//  Created by Burak Kuruçay on 5.01.2026.
//


import Foundation

public enum ZeroCrossing {

    /// Lightweight frequency estimation using zero-crossings.
    /// Useful fallback for low strings (E2, A2).
    /// Returns nil if too few crossings.
    public static func estimateFrequency(samples: [Float], sampleRate: Double) -> Double? {
        guard samples.count > 1 else { return nil }
        guard sampleRate > 0 else { return nil }

        var crossings = 0
        var prev = samples[0]

        for i in 1..<samples.count {
            let curr = samples[i]
            if (prev <= 0 && curr > 0) || (prev >= 0 && curr < 0) {
                crossings += 1
            }
            prev = curr
        }

        let duration = Double(samples.count) / sampleRate
        if duration <= 0 { return nil }
        if crossings < 2 { return nil }

        // crossings / (2 * duration) matches JS logic
        return Double(crossings) / (2.0 * duration)
    }
}
