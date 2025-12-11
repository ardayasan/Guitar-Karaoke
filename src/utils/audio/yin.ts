/**
 * YIN Algorithm for Pitch Detection
 * Based on: “YIN, a fundamental frequency estimator for speech and music”
 * by Alain de Cheveigné & Hideki Kawahara (2002)
 *
 * This implementation follows the original method:
 * 1) Difference function
 * 2) Cumulative mean normalized difference
 * 3) Absolute threshold search
 * 4) Parabolic interpolation
 *
 * YIN provides highly accurate monophonic pitch detection and is more robust
 * than FFT-only approaches, especially for musical instruments.
 */

import { Frequency } from '@/types';

export interface YinResult {
  frequency: Frequency;   // Estimated pitch in Hz
  confidence: number;     // 0–1, higher means stronger periodicity match
  periodicity: number;    // Global periodicity measure (clarity of the minimum)
}

export class YinPitchDetector {
  private sampleRate: number;
  private threshold: number;
  private bufferSize: number;

  /**
   * @param sampleRate Input sample rate (e.g., 44100 Hz)
   * @param threshold Detection threshold for the normalized difference function.
   *                  Typical values range from 0.1 to 0.2.
   * @param bufferSize Size of the analysis window, must be a power of two.
   */
  constructor(sampleRate: number, threshold: number = 0.15, bufferSize: number = 2048) {
    this.sampleRate = sampleRate;
    this.threshold = threshold;
    this.bufferSize = bufferSize;
  }

  /**
   * Main pitch detection entry.
   * The algorithm expects a mono Float32Array normalized between -1 and 1.
   * Returns a YinResult or null when no pitch is found.
   */
  detect(samples: Float32Array): YinResult | null {
    console.log('[YIN] samples.length:', samples.length,
            'bufferSize:', this.bufferSize,
            'sampleRate:', this.sampleRate);

    const halfSize = Math.floor(this.bufferSize / 2);
    const yinBuffer = new Float32Array(halfSize);

    // Step 1: Compute raw difference function
    this.differenceFunction(samples, yinBuffer);

    // Step 2: Normalize the difference function
    this.cumulativeMeanNormalizedDifference(yinBuffer);

    // Step 3: Locate threshold crossing
    let tau = this.absoluteThreshold(yinBuffer);

    // Fallback: If no threshold crossing exists, use the global minimum.
    // This is important for low-frequency guitar strings, where dips may be shallow.
    if (tau === -1) {
      tau = this.findGlobalMinimum(yinBuffer);
      if (tau === -1) return null;
    }

    // Step 4: Improve accuracy via parabolic interpolation
    const betterTau = this.parabolicInterpolation(yinBuffer, tau);

    const frequency = this.sampleRate / betterTau;
    const confidence = Math.max(0, 1 - yinBuffer[tau]);
    const periodicity = this.calculatePeriodicity(yinBuffer);

    return {
      frequency,
      confidence,
      periodicity,
    };
  }

  /**
   * Step 1: Difference Function
   * Computes the squared distance between samples and their delayed version.
   * This reveals repetitive structure in the signal.
   */
  private differenceFunction(samples: Float32Array, yinBuffer: Float32Array): void {
    console.log(
      '[DIFF] tau=400', yinBuffer[400],
      '| tau=500', yinBuffer[500],
      '| tau=600', yinBuffer[600]
    );

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
   * If no threshold crossing is found, we select the global minimum of the
   * normalized difference function. This ensures detection still works for
   * very periodic but shallow-dip signals.
   */
  private findGlobalMinimum(yinBuffer: Float32Array) {
    let min = Infinity;
    let idx = -1;

    for (let i = 2; i < yinBuffer.length; i++) {
      if (yinBuffer[i] < min) {
        min = yinBuffer[i];
        idx = i;
      }
    }

    return idx;
  }

  /**
   * Step 2: Cumulative Mean Normalized Difference Function (CMND)
   * Converts raw difference into a normalized form independent of amplitude.
   * Small values in CMND indicate strong periodicity.
   */
  private cumulativeMeanNormalizedDifference(yinBuffer: Float32Array): void {
    yinBuffer[0] = 1;
    let runningSum = 0;

    for (let tau = 1; tau < yinBuffer.length; tau++) {
      runningSum += yinBuffer[tau];
      yinBuffer[tau] *= tau / runningSum;
    }

    // Debug: log global minimum of normalized difference
    let normMin = 1;
    let minTau = -1;

    for (let t = 1; t < yinBuffer.length; t++) {
      if (yinBuffer[t] < normMin) {
        normMin = yinBuffer[t];
        minTau = t;
      }
    }

    console.log('[NORM MIN] value:', normMin, 'at tau:', minTau);
  }

  /**
   * Step 3: Absolute Threshold Search
   * Finds the first τ where CMND falls below the threshold.
   * A deeper dip indicates a more stable fundamental frequency.
   */
  private absoluteThreshold(yinBuffer: Float32Array): number {
    const minTau = Math.floor(this.sampleRate / 1500); // Upper frequency limit (~1500 Hz)
    const maxTau = Math.floor(this.sampleRate / 40);   // Lower frequency limit (~40 Hz)

    const startTau = Math.max(2, minTau);
    const endTau = Math.min(yinBuffer.length - 1, maxTau);

    for (let tau = startTau; tau < endTau; tau++) {
      if (yinBuffer[tau] < this.threshold) {
        // Local minimum refinement: move forward while still descending
        while (tau + 1 < endTau && yinBuffer[tau + 1] < yinBuffer[tau]) {
          tau++;
        }
        return tau;
      }

      if (tau % 100 === 0) {
        console.log('[THRESH SWEEP]', tau, '→', yinBuffer[tau]);
      }
    }

    console.log('[THRESH RESULT]', 'NO TAU FOUND');
    return -1;
  }

  /**
   * Step 4: Parabolic Interpolation
   * Refines the integer τ estimate to a fractional value, improving pitch accuracy.
   */
  private parabolicInterpolation(yinBuffer: Float32Array, tau: number): number {
    if (tau === 0 || tau === yinBuffer.length - 1) {
      return tau;
    }

    const s0 = yinBuffer[tau - 1];
    const s1 = yinBuffer[tau];
    const s2 = yinBuffer[tau + 1];

    const adjustment = (s2 - s0) / (2 * (2 * s1 - s2 - s0));
    return tau + adjustment;
  }

  /**
   * Computes a global periodicity metric by taking the strongest dip in CMND.
   * Lower CMND → higher periodicity → clearer pitch.
   */
  private calculatePeriodicity(yinBuffer: Float32Array): number {
    let minValue = 1;
    for (let i = 1; i < yinBuffer.length; i++) {
      if (yinBuffer[i] < minValue) {
        minValue = yinBuffer[i];
      }
    }
    return 1 - minValue;
  }

  /** Runtime parameter updates **/
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
 * Convenience function for one-shot pitch detection.
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
 * Pitch smoothing filter: stabilizes YIN output across multiple frames.
 * Useful for real-time guitar tuning/practice, reducing jitter and false positives.
 */
export class PitchSmoothingFilter {
  private history: YinResult[] = [];
  private maxHistory: number;

  constructor(maxHistory: number = 5) {
    this.maxHistory = maxHistory;
  }

  /**
   * Adds a new YIN result and outputs a smoothed estimate.
   * Uses weighted averaging, favoring more recent frames.
   */
  addResult(result: YinResult | null): YinResult | null {
    // If no pitch detected: clear history
    if (result === null) {
      this.history = [];
      return null;
    }

    // Confidence gate: ignore weak detections
    if (result.confidence < 0.75) {
      return null;
    }

    // Ignore first detection to avoid transient instability
    if (this.history.length === 0) {
      this.history.push(result);
      return null;
    }

    // Add to smoothing history
    this.history.push(result);

    // Only output once the buffer is full
    if (this.history.length < this.maxHistory) {
      return null;
    }

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Weighted smoothing (newer frames get higher weight)
    let sumFreq = 0;
    let sumConfidence = 0;
    let sumPeriodicity = 0;
    let totalWeight = 0;

    this.history.forEach((res, index) => {
      const weight = index + 1;
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

  /** Clears smoothing buffer */
  reset(): void {
    this.history = [];
  }
}
