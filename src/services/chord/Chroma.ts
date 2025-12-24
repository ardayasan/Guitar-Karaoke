/**
 * chroma.ts
 * --------------------------------------------------
 * Utilities for converting FFT magnitude spectra
 * into octave-independent chroma vectors.
 *
 * This module contains NO chord logic.
 * It only answers:
 *   "Which pitch classes are present, and how strong?"
 */

import { FFT } from '@/utils/audio/fft';
import { applyHannWindow } from '@/utils/audio/fft';
import { ChromaVector, PitchClass } from './ChordDetectionTypes';

/* -------------------------------------------------- */
/* Constants                                          */
/* -------------------------------------------------- */

const MIN_FREQUENCY = 60;    // Hz (below guitar range)
const MAX_FREQUENCY = 2000;  // Hz (upper harmonic limit)

/* -------------------------------------------------- */
/* Helpers                                           */
/* -------------------------------------------------- */

/**
 * Convert frequency (Hz) to pitch class (0–11).
 * Returns null if frequency is out of usable range.
 */
export function frequencyToPitchClass(
        frequency: number
    ): PitchClass | null {
    if (frequency < MIN_FREQUENCY || frequency > MAX_FREQUENCY) {
        return null;
    }

    // MIDI note number
    const midi = 69 + 12 * Math.log2(frequency / 440);

    if (!isFinite(midi)) return null;

    // Canonical pitch class
    const pc = Math.round(midi) % 12;
    return (pc + 12) % 12;
}

/* -------------------------------------------------- */
/* Main API                                          */
/* -------------------------------------------------- */

/**
 * Compute a normalized chroma vector from audio samples.
 *
 * @param samples    Time-domain audio samples
 * @param sampleRate Audio sample rate (Hz)
 * @returns          12-dimensional chroma vector
 */
export function computeChromaVector(
        samples: Float32Array,
        sampleRate: number
    ): ChromaVector {
    const fftSize = samples.length;

    // Safety guard
    if (fftSize === 0) {
        return new Array(12).fill(0);
    }

    // Apply window to reduce spectral leakage
    const windowed = applyHannWindow(samples);

    // Prepare FFT buffers
    const real = new Float32Array(windowed);
    const imag = new Float32Array(fftSize);

    const fft = new FFT(fftSize);
    fft.forward(real, imag);

    const magnitude = fft.getMagnitudeSpectrum(real, imag);

    // Initialize chroma vector
    const chroma: ChromaVector = new Array(12).fill(0);

    // Accumulate spectral energy into pitch classes
    for (let bin = 1; bin < magnitude.length; bin++) {
        const freq = (bin * sampleRate) / fftSize;
        const pc = frequencyToPitchClass(freq);

        if (pc === null) continue;

        chroma[pc] += magnitude[bin];
    }

    // Normalize chroma vector
    const totalEnergy = chroma.reduce((sum, v) => sum + v, 0);

    if (totalEnergy > 0) {
        for (let i = 0; i < 12; i++) {
        chroma[i] /= totalEnergy;
        }
    }

    return chroma;
}
