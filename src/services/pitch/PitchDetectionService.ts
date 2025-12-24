/**
 * Pitch Detection Service
 * --------------------------------------------------------
 * Central real-time DSP engine that performs:
 *   - YIN fundamental frequency estimation
 *   - Zero-crossing fallback (helps on low strings)
 *   - Confidence gating
 *   - Frequency range validation
 *   - Frequency → musical note conversion
 *
 * IMPORTANT:
 * This service contains NO audio I/O and NO onset / silence detection.
 * It assumes:
 *   - Input buffers are already gated and aligned by the native layer
 *   - Buffers are fixed-size NOTE windows (e.g. 2048 samples)
 */

import { YinPitchDetector } from '@/utils/audio/yin';
import { FFT, applyHannWindow } from '@/utils/audio/fft';
import { frequencyToNote, GUITAR_FREQUENCY_RANGE } from '@/utils/music';
import { AudioDetection } from '@/types';

export interface PitchDetectionConfig {
  sampleRate: number;
  bufferSize: number;      // NOTE window size (native guarantees this)
  yinThreshold: number;
  minConfidence: number;
  minFrequency: number;
  maxFrequency: number;
}

/**
 * Default configuration for guitar-range pitch detection
 */
export const DEFAULT_PITCH_CONFIG: PitchDetectionConfig = {
  sampleRate: 44100,
  bufferSize: 2048,                 // NOTE window (native side)
  yinThreshold: 0.15,
  minConfidence: 0.6,
  minFrequency: GUITAR_FREQUENCY_RANGE.MIN - 10,  // margin below E2
  maxFrequency: GUITAR_FREQUENCY_RANGE.MAX + 100, // margin above high frets
};

export type PitchDetectionCallback = (d: AudioDetection | null) => void;

// Debug flag
const DEBUG_PITCH = false;

function debugLog(...args: any[]) {
  if (DEBUG_PITCH) {
    console.log(...args);
  }
}

export class PitchDetectionService {
  private config: PitchDetectionConfig;

  // Core DSP tools
  private yinDetector: YinPitchDetector;
  private fft: FFT; // reserved for future chord detection

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
  }

  /**
   * Activates pitch detection.
   * The service expects already-gated NOTE windows from the pipeline.
   */
  start(callback: PitchDetectionCallback): void {
    this.detectionCallback = callback;
    this.isActive = true;
    console.log('[PitchDetection] started');
  }

  /**
   * Deactivates detection.
   */
  stop(): void {
    this.isActive = false;
    this.detectionCallback = null;
    console.log('[PitchDetection] stopped');
  }

  /**
   * Main processing entry point.
   * Consumes a NOTE-sized PCM frame and attempts to detect pitch.
   */
  processSamples(samples: Float32Array, timestampMs: number): AudioDetection | null {
    if (!this.isActive) return null;

    // Native guarantees correct NOTE window size
    const buffer = samples;

    /**
     * STEP 1 — (Optional) Windowing
     * Hann window is applied for spectral consistency and future FFT usage.
     */
    const windowed = applyHannWindow(buffer);

    /**
     * STEP 2 — Primary algorithm: YIN
     */
    let yinResult = this.yinDetector.detect(buffer);

    if (yinResult) {
      debugLog(
        '[YIN]',
        'freq:', yinResult.frequency.toFixed(2),
        'conf:', yinResult.confidence.toFixed(3),
        'per:', yinResult.periodicity?.toFixed(3)
      );
    } else {
      debugLog('[YIN] null');
    }

    /**
     * STEP 3 — Fallback for low strings (E2, A2)
     * Zero-crossing gives a rough but usable frequency estimate.
     */
    if (!yinResult) {
      const fallback = this.estimateFrequencyZeroCrossing(
        windowed,
        this.config.sampleRate
      );

      if (!fallback) {
        this.detectionCallback?.(null);
        return null;
      }

      yinResult = {
        frequency: fallback,
        confidence: 0.85,
        periodicity: 0.5,
      };
    }

    /**
     * STEP 4 — Confidence gating
     * Low notes are allowed slightly weaker confidence.
     */
    const isLow = yinResult.frequency < 110; // E2–D3 region
    const minConf = isLow ? 0.5 : this.config.minConfidence;

    if (yinResult.confidence < minConf) {
      debugLog('[CONF] gated', yinResult.confidence.toFixed(3));
      this.detectionCallback?.(null);
      return null;
    }

    /**
     * STEP 5 — Expected frequency range check
     */
    if (
      yinResult.frequency < this.config.minFrequency ||
      yinResult.frequency > this.config.maxFrequency
    ) {
      debugLog('[RANGE] gated', yinResult.frequency.toFixed(2));
      this.detectionCallback?.(null);
      return null;
    }

    /**
     * STEP 6 — Convert frequency → musical note
     */
    const note = frequencyToNote(
      yinResult.frequency,
      yinResult.confidence
    );

    /**
     * FINAL — Build detection result
     */
    const detection: AudioDetection = {
      timestamp: timestampMs,
      frequency: yinResult.frequency,
      amplitude: 0, // amplitude is now owned by native layer
      confidence: yinResult.confidence,
      note,
    };

    this.detectionCallback?.(detection);
    return detection;
  }

  /**
   * Zero-Crossing estimation
   * Lightweight and effective for fundamental-heavy low notes.
   */
  private estimateFrequencyZeroCrossing(
    samples: Float32Array,
    sampleRate: number
  ): number | null {
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

    return crossings / (2 * duration);
  }

  /**
   * Update sample rate if native engine changes it.
   */
  setSampleRate(sampleRate: number): void {
    if (!sampleRate || sampleRate <= 0) return;
    if (sampleRate === this.config.sampleRate) return;

    this.config.sampleRate = sampleRate;
    this.yinDetector.setSampleRate(sampleRate);

    console.log('[PitchDetection] sample rate updated →', sampleRate);
  }

  isRunning(): boolean {
    return this.isActive;
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
