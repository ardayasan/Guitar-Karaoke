//
//  HannWindow.swift
//  SmartTabGuitarKaraoke
//
//  DSP utility for chord detection.
//  Applies Hann window to time-domain samples.
//
//  NOTE:
//  This is a generic DSP helper, currently scoped
//  under chordDetection/utils for simplicity.
//

import Foundation
import Accelerate

/// Applies a Hann window to the given samples.
///
/// - Parameter samples: Time-domain PCM samples
/// - Returns: Windowed samples
@inline(__always)
public func applyHannWindow(_ samples: [Float]) -> [Float] {
    let count = samples.count
    guard count > 0 else { return samples }

    var window = [Float](repeating: 0, count: count)
    vDSP_hann_window(
        &window,
        vDSP_Length(count),
        Int32(vDSP_HANN_NORM)
    )

    var windowed = samples
    vDSP_vmul(
        samples,
        1,
        window,
        1,
        &windowed,
        1,
        vDSP_Length(count)
    )

    return windowed
}
