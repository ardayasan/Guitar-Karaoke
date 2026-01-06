//
//  HannWindow.swift
//  SmartTabGuitarKaraoke
//
//  JS parity: applyHannWindow(samples)
//  window[i] = 0.5 * (1 - cos(2πi/(N-1)))
//

import Foundation

@inline(__always)
public func applyHannWindow(_ samples: [Float]) -> [Float] {
    let n = samples.count
    guard n > 1 else { return samples }

    var out = [Float](repeating: 0, count: n)
    let denom = Float(n - 1)
    let twoPi = Float.pi * 2

    for i in 0..<n {
        let w = 0.5 * (1 - cos(twoPi * Float(i) / denom))
        out[i] = samples[i] * w
    }

    return out
}
