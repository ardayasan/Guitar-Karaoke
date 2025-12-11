/**
 * Pitch Detection Service
 * --------------------------------------------------------
 * Central real-time DSP engine that performs:
 *   - YIN fundamental frequency estimation
 *   - RMS amplitude gating (noise filtering)
 *   - Hann windowing
 *   - Zero-crossing fallback (helps on low strings)
 *   - Multi-frame smoothing for stability
 *
 * This service contains NO audio I/O.
 * It only processes Float32Array buffers and detects pitch.
 */

import { YinPitchDetector, PitchSmoothingFilter } from '@/utils/audio/yin';
import { FFT, applyHannWindow } from '@/utils/audio/fft';
import { frequencyToNote, GUITAR_FREQUENCY_RANGE } from '@/utils/music';
import { AudioDetection } from '@/types';

export interface PitchDetectionConfig {
  sampleRate: number;
  bufferSize: number;
  yinThreshold: number;
  minConfidence: number;
  smoothingWindow: number;
  minFrequency: number;
  maxFrequency: number;
}

/**
 * Default configuration for guitar-range pitch detection
 */
export const DEFAULT_PITCH_CONFIG: PitchDetectionConfig = {
  sampleRate: 44100,
  bufferSize: 2048,
  yinThreshold: 0.15,
  minConfidence: 0.6,
  smoothingWindow: 3,
  minFrequency: GUITAR_FREQUENCY_RANGE.MIN - 10,  // a small margin below E2
  maxFrequency: GUITAR_FREQUENCY_RANGE.MAX + 100, // margin for high frets
};

export type PitchDetectionCallback = (d: AudioDetection | null) => void;

export class PitchDetectionService {
  private config: PitchDetectionConfig;

  // Core DSP tools
  private yinDetector: YinPitchDetector;
  private fft: FFT;                  // currently unused in main pipeline but kept for future chord/FFT features
  private smoothingFilter: PitchSmoothingFilter;

  // Runtime state
  private detectionCallback: PitchDetectionCallback | null = null;
  private isActive = false;

  constructor(config: PitchDetectionConfig = DEFAULT_PITCH_CONFIG) {
    this.config = config;

    this.yinDetector = new YinPitchDetector(
      config.sampleRate,
      config.yinThreshold,
      config.bufferSize
    );

    this.fft = new FFT(config.bufferSize);
    this.smoothingFilter = new PitchSmoothingFilter(config.smoothingWindow);
  }

  /**
   * Activates pitch detection.
   * A callback receives real-time detection results.
   */
  start(callback: PitchDetectionCallback): void {
    this.detectionCallback = callback;
    this.isActive = true;

    this.smoothingFilter.reset();

    console.log('[PitchDetection] started');
  }

  /**
   * Deactivates detection and clears callbacks/state.
   */
  stop(): void {
    this.isActive = false;
    this.detectionCallback = null;

    this.smoothingFilter.reset();

    console.log('[PitchDetection] stopped');
  }

  /**
   * Main processing entry point.
   * Consumes a PCM frame and attempts to detect pitch.
   */
  processSamples(samples: Float32Array, timestampMs: number): AudioDetection | null {
    if (!this.isActive || samples.length < this.config.bufferSize) {
      return null;
    }

    // Always operate on a fixed-size buffer
    const buffer =
      samples.length === this.config.bufferSize
        ? samples
        : samples.slice(0, this.config.bufferSize);

    /**
     * STEP 0 — Amplitude gate
     * Removes noise and near-silence before running heavier algorithms.
     */
    const amplitude = this.calculateRMS(buffer);
    const MIN_AMPLITUDE = 0.003;

    if (amplitude < MIN_AMPLITUDE) {
      this.detectionCallback?.(null);
      return null;
    }

    /**
     * STEP 1 — Apply Hann window (reduces spectral leakage)
     */
    const windowed = applyHannWindow(buffer);

    /**
     * STEP 2 — Primary algorithm: YIN
     */
    let yinResult = this.yinDetector.detect(windowed);

    /**
     * STEP 3 — Fallback for low strings (E2, A2)
     * Zero-crossing gives a rough but usable frequency estimate
     * when YIN returns null on weak harmonics.
     */
    if (!yinResult) {
      const fallback = this.estimateFrequencyZeroCrossing(windowed, this.config.sampleRate);

      if (!fallback) {
        this.detectionCallback?.(null);
        return null;
      }

      yinResult = {
        frequency: fallback,
        confidence: 0.85, // high on purpose so smoothing can work with it
        periodicity: 0.5,
      };
    }

    /**
     * STEP 4 — Multi-frame smoothing
     * Stabilizes rapid fluctuations and eliminates jitter.
     */
    const smoothed = this.smoothingFilter.addResult(yinResult);

    if (!smoothed) {
      this.detectionCallback?.(null);
      return null;
    }

    /**
     * STEP 5 — Confidence gating
     * Dynamic threshold: low notes are allowed slightly weaker confidence.
     */
    const isLow = smoothed.frequency < 110; // E2–D3 region
    const minConf = isLow ? 0.5 : this.config.minConfidence;

    if (smoothed.confidence < minConf) {
      this.detectionCallback?.(null);
      return null;
    }

    /**
     * STEP 6 — Expected frequency range check
     */
    if (
      smoothed.frequency < this.config.minFrequency ||
      smoothed.frequency > this.config.maxFrequency
    ) {
      this.detectionCallback?.(null);
      return null;
    }

    /**
     * STEP 7 — Convert frequency → musical note
     */
    const note = frequencyToNote(smoothed.frequency, smoothed.confidence);

    /**
     * FINAL — Build detection result
     */
    const detection: AudioDetection = {
      timestamp: timestampMs,
      frequency: smoothed.frequency,
      amplitude,
      confidence: smoothed.confidence,
      note,
    };

    this.detectionCallback?.(detection);

    return detection;
  }

  /**
   * Zero-Crossing estimation
   * Very lightweight and works well on fundamental-heavy low notes.
   */
  private estimateFrequencyZeroCrossing(samples: Float32Array, sampleRate: number): number | null {
    let crossings = 0;
    let prev = samples[0];

    for (let i = 1; i < samples.length; i++) {
      const curr = samples[i];
      if ((prev <= 0 && curr > 0) || (prev >= 0 && curr < 0)) {
        crossings++;
      }
      prev = curr;
    }

    const duration = samples.length / sampleRate;
    if (duration <= 0 || crossings < 2) return null;

    // A full waveform cycle includes approximately 2 zero-crossings
    return crossings / (2 * duration);
  }

  /**
   * RMS amplitude for amplitude gating and UI visualization.
   */
  private calculateRMS(samples: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  /**
   * Update internal configuration on the fly.
   */
  updateConfig(config: Partial<PitchDetectionConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.sampleRate !== undefined) {
      this.yinDetector.setSampleRate(config.sampleRate);
    }
    if (config.yinThreshold !== undefined) {
      this.yinDetector.setThreshold(config.yinThreshold);
    }
    if (config.bufferSize !== undefined) {
      this.yinDetector.setBufferSize(config.bufferSize);
      this.fft = new FFT(config.bufferSize);
    }
    if (config.smoothingWindow !== undefined) {
      this.smoothingFilter = new PitchSmoothingFilter(config.smoothingWindow);
    }
  }

  /**
   * Update sample rate as provided by native iOS audio engine.
   */
  setSampleRate(sampleRate: number): void {
    if (!sampleRate || sampleRate <= 0) return;
    if (sampleRate === this.config.sampleRate) return;

    this.config.sampleRate = sampleRate;
    this.yinDetector.setSampleRate(sampleRate);

    console.log('[PitchDetection] sample rate updated →', sampleRate);
  }

  getConfig(): PitchDetectionConfig {
    return { ...this.config };
  }

  isRunning(): boolean {
    return this.isActive;
  }

  reset(): void {
    this.smoothingFilter.reset();
  }

  getStats() {
    return {
      isActive: this.isActive,
      config: this.config,
    };
  }
}

/**
 * Global singleton instance
 */
let pitchDetectionServiceInstance: PitchDetectionService | null = null;

export function getPitchDetectionService(config?: PitchDetectionConfig) {
  if (!pitchDetectionServiceInstance) {
    pitchDetectionServiceInstance = new PitchDetectionService(config);
  }
  return pitchDetectionServiceInstance;
}

export function resetPitchDetectionService() {
  if (pitchDetectionServiceInstance) {
    pitchDetectionServiceInstance.stop();
  }
  pitchDetectionServiceInstance = null;
}
