/**
 * YIN Algorithm for Pitch Detection
 * Based on: "YIN, a fundamental frequency estimator for speech and music"
 * by Alain de Cheveigné and Hideki Kawahara (2002)
 *
 * YIN is specifically designed for musical pitch detection and provides
 * better accuracy than FFT-based methods for monophonic signals.
 */

import { Frequency } from '@/types';

export interface YinResult {
  frequency: Frequency;
  confidence: number; // 0-1, higher is better
  periodicity: number; // How periodic the signal is
}

export class YinPitchDetector {
  private sampleRate: number;
  private threshold: number;
  private bufferSize: number;

  /**
   * @param sampleRate Audio sample rate in Hz (e.g., 44100)
   * @param threshold Threshold for detecting pitch (0.1-0.2 is typical)
   * @param bufferSize Size of analysis buffer (power of 2, e.g., 2048, 4096)
   */
  constructor(sampleRate: number, threshold: number = 0.15, bufferSize: number = 2048) {
    this.sampleRate = sampleRate;
    this.threshold = threshold;
    this.bufferSize = bufferSize;
  }

  /**
   * Detect pitch from audio samples
   * @param samples Audio samples (mono, normalized to -1 to 1)
   * @returns YinResult with frequency, confidence, and periodicity
   */
  detect(samples: Float32Array): YinResult | null {
    const halfSize = Math.floor(this.bufferSize / 2);
    const yinBuffer = new Float32Array(halfSize);

    // Step 1: Calculate the difference function
    this.differenceFunction(samples, yinBuffer);

    // Step 2: Calculate cumulative mean normalized difference function
    this.cumulativeMeanNormalizedDifference(yinBuffer);

    // Step 3: Find the absolute threshold
    const tau = this.absoluteThreshold(yinBuffer);

    if (tau === -1) {
      // No pitch detected
      return null;
    }

    // Step 4: Parabolic interpolation for better accuracy
    const betterTau = this.parabolicInterpolation(yinBuffer, tau);

    // Calculate frequency
    const frequency = this.sampleRate / betterTau;

    // Calculate confidence (inverse of the YIN value at tau)
    const confidence = 1 - yinBuffer[tau];

    // Calculate periodicity (how regular/periodic the signal is)
    const periodicity = this.calculatePeriodicity(yinBuffer);

    return {
      frequency,
      confidence,
      periodicity,
    };
  }

  /**
   * Step 1: Difference function
   * Calculates the squared difference between signal and its delayed version
   */
  private differenceFunction(samples: Float32Array, yinBuffer: Float32Array): void {
    const halfSize = yinBuffer.length;

    for (let tau = 0; tau < halfSize; tau++) {
      let sum = 0;
      for (let i = 0; i < halfSize; i++) {
        const delta = samples[i] - samples[i + tau];
        sum += delta * delta;
      }
      yinBuffer[tau] = sum;
    }
  }

  /**
   * Step 2: Cumulative mean normalized difference function
   * Normalizes the difference function to make threshold independent of amplitude
   */
  private cumulativeMeanNormalizedDifference(yinBuffer: Float32Array): void {
    yinBuffer[0] = 1;
    let runningSum = 0;

    for (let tau = 1; tau < yinBuffer.length; tau++) {
      runningSum += yinBuffer[tau];
      yinBuffer[tau] *= tau / runningSum;
    }
  }

  /**
   * Step 3: Absolute threshold
   * Finds the smallest tau where the function drops below threshold
   */
  private absoluteThreshold(yinBuffer: Float32Array): number {
    // Start from tau=2 to avoid detecting very high frequencies
    // (tau=1 would be half the sample rate)
    const minTau = Math.floor(this.sampleRate / 1500); // Max ~1500 Hz
    const maxTau = Math.floor(this.sampleRate / 60);   // Min ~60 Hz

    // Clamp search range
    const startTau = Math.max(2, minTau);
    const endTau = Math.min(yinBuffer.length - 1, maxTau);

    for (let tau = startTau; tau < endTau; tau++) {
      if (yinBuffer[tau] < this.threshold) {
        // Found a point below threshold
        // Now find the local minimum in this dip
        while (tau + 1 < endTau && yinBuffer[tau + 1] < yinBuffer[tau]) {
          tau++;
        }
        return tau;
      }
    }

    // No pitch detected - return -1
    return -1;
  }

  /**
   * Step 4: Parabolic interpolation
   * Improves frequency accuracy by interpolating around the minimum
   */
  private parabolicInterpolation(yinBuffer: Float32Array, tau: number): number {
    if (tau === 0 || tau === yinBuffer.length - 1) {
      return tau;
    }

    const s0 = yinBuffer[tau - 1];
    const s1 = yinBuffer[tau];
    const s2 = yinBuffer[tau + 1];

    // Parabolic interpolation formula
    const adjustment = (s2 - s0) / (2 * (2 * s1 - s2 - s0));

    return tau + adjustment;
  }

  /**
   * Calculate how periodic/regular the signal is
   * Based on the clarity of the YIN minimum
   */
  private calculatePeriodicity(yinBuffer: Float32Array): number {
    let minValue = 1;
    for (let i = 1; i < yinBuffer.length; i++) {
      if (yinBuffer[i] < minValue) {
        minValue = yinBuffer[i];
      }
    }

    // Return inverse - lower YIN value means more periodic
    return 1 - minValue;
  }

  /**
   * Update detector parameters
   */
  setThreshold(threshold: number): void {
    this.threshold = threshold;
  }

  setBufferSize(bufferSize: number): void {
    this.bufferSize = bufferSize;
  }

  setSampleRate(sampleRate: number): void {
    this.sampleRate = sampleRate;
  }
}

/**
 * Simple pitch detection using YIN
 * Convenience function for one-off detections
 */
export function detectPitch(
  samples: Float32Array,
  sampleRate: number,
  threshold: number = 0.15
): YinResult | null {
  const detector = new YinPitchDetector(sampleRate, threshold, samples.length);
  return detector.detect(samples);
}

/**
 * Filter for smoothing pitch detections over time
 * Helps reduce jitter in real-time pitch tracking
 */
export class PitchSmoothingFilter {
  private history: YinResult[] = [];
  private maxHistory: number;

  constructor(maxHistory: number = 5) {
    this.maxHistory = maxHistory;
  }

  /**
   * Add a new pitch detection result and get smoothed output
   */
  addResult(result: YinResult | null): YinResult | null {
    if (result === null) {
      // Clear history if no pitch detected
      this.history = [];
      return null;
    }

    this.history.push(result);

    // Keep only recent history
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Need at least 2 samples to smooth
    if (this.history.length < 2) {
      return result;
    }

    // Weighted average - more recent results weighted higher
    let sumFreq = 0;
    let sumConfidence = 0;
    let sumPeriodicity = 0;
    let totalWeight = 0;

    this.history.forEach((res, index) => {
      const weight = index + 1; // Linear weighting
      sumFreq += res.frequency * weight;
      sumConfidence += res.confidence * weight;
      sumPeriodicity += res.periodicity * weight;
      totalWeight += weight;
    });

    return {
      frequency: sumFreq / totalWeight,
      confidence: sumConfidence / totalWeight,
      periodicity: sumPeriodicity / totalWeight,
    };
  }

  /**
   * Clear the smoothing history
   */
  reset(): void {
    this.history = [];
  }
}
