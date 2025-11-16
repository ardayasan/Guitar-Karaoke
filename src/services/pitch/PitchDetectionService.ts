/**
 * Pitch Detection Service
 * Integrates YIN algorithm and FFT for real-time pitch detection from guitar
 */

import { YinPitchDetector, PitchSmoothingFilter } from '@/utils/audio/yin';
import { FFT, applyHannWindow } from '@/utils/audio/fft';
import { frequencyToNote, GUITAR_FREQUENCY_RANGE } from '@/utils/music';
import { AudioDetection, Note, Frequency } from '@/types';

export interface PitchDetectionConfig {
  sampleRate: number;
  bufferSize: number;
  yinThreshold: number; // 0.1-0.2 typical
  minConfidence: number; // Minimum confidence to accept detection
  smoothingWindow: number; // Number of frames to smooth over
  minFrequency: number; // Minimum expected frequency
  maxFrequency: number; // Maximum expected frequency
}

export const DEFAULT_PITCH_CONFIG: PitchDetectionConfig = {
  sampleRate: 44100,
  bufferSize: 2048,
  yinThreshold: 0.15,
  minConfidence: 0.6,
  smoothingWindow: 5,
  minFrequency: GUITAR_FREQUENCY_RANGE.MIN - 10, // E2 with margin
  maxFrequency: GUITAR_FREQUENCY_RANGE.MAX + 100, // High frets with margin
};

export type PitchDetectionCallback = (detection: AudioDetection | null) => void;

export class PitchDetectionService {
  private config: PitchDetectionConfig;
  private yinDetector: YinPitchDetector;
  private fft: FFT;
  private smoothingFilter: PitchSmoothingFilter;
  private detectionCallback: PitchDetectionCallback | null = null;
  private isActive: boolean = false;

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
   * Start pitch detection
   * @param callback Function called with detection results
   */
  start(callback: PitchDetectionCallback): void {
    this.detectionCallback = callback;
    this.isActive = true;
    this.smoothingFilter.reset();
    console.log('Pitch detection started');
  }

  /**
   * Stop pitch detection
   */
  stop(): void {
    this.isActive = false;
    this.detectionCallback = null;
    this.smoothingFilter.reset();
    console.log('Pitch detection stopped');
  }

  /**
   * Process audio samples and detect pitch
   * @param samples Audio samples (mono, normalized -1 to 1)
   * @param timestamp Timestamp in milliseconds
   */
  processSamples(samples: Float32Array, timestamp: number): AudioDetection | null {
    if (!this.isActive || samples.length < this.config.bufferSize) {
      return null;
    }

    // Ensure we have the right buffer size
    const buffer =
      samples.length === this.config.bufferSize
        ? samples
        : samples.slice(0, this.config.bufferSize);

    // Calculate RMS amplitude for noise gating
    const amplitude = this.calculateRMS(buffer);

    // Noise gate - ignore very quiet signals
    const MIN_AMPLITUDE = 0.01; // Adjust based on testing
    if (amplitude < MIN_AMPLITUDE) {
      if (this.detectionCallback) {
        this.detectionCallback(null);
      }
      return null;
    }

    // Apply window function to reduce spectral leakage
    const windowed = applyHannWindow(buffer);

    // Detect pitch using YIN algorithm
    const yinResult = this.yinDetector.detect(windowed);

    if (!yinResult) {
      if (this.detectionCallback) {
        this.detectionCallback(null);
      }
      return null;
    }

    // Apply smoothing filter
    const smoothed = this.smoothingFilter.addResult(yinResult);

    if (!smoothed) {
      if (this.detectionCallback) {
        this.detectionCallback(null);
      }
      return null;
    }

    // Check if confidence is high enough
    if (smoothed.confidence < this.config.minConfidence) {
      if (this.detectionCallback) {
        this.detectionCallback(null);
      }
      return null;
    }

    // Check if frequency is in valid guitar range
    if (
      smoothed.frequency < this.config.minFrequency ||
      smoothed.frequency > this.config.maxFrequency
    ) {
      if (this.detectionCallback) {
        this.detectionCallback(null);
      }
      return null;
    }

    // Convert frequency to note
    const note = frequencyToNote(smoothed.frequency, smoothed.confidence);

    // Create detection result
    const detection: AudioDetection = {
      timestamp,
      frequency: smoothed.frequency,
      note,
      amplitude,
      confidence: smoothed.confidence,
    };

    if (this.detectionCallback) {
      this.detectionCallback(detection);
    }

    return detection;
  }

  /**
   * Calculate RMS (Root Mean Square) amplitude
   * Useful for noise gating and amplitude normalization
   */
  private calculateRMS(samples: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  /**
   * Calculate amplitude in dB
   */
  private amplitudeToDb(amplitude: number): number {
    if (amplitude <= 0) {
      return -Infinity;
    }
    return 20 * Math.log10(amplitude);
  }

  /**
   * Update configuration
   * @param config Partial configuration to update
   */
  updateConfig(config: Partial<PitchDetectionConfig>): void {
    this.config = { ...this.config, ...config };

    // Update YIN detector
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
   * Get current configuration
   */
  getConfig(): PitchDetectionConfig {
    return { ...this.config };
  }

  /**
   * Check if pitch detection is currently active
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Reset the smoothing filter
   * Useful when starting a new phrase or after a pause
   */
  reset(): void {
    this.smoothingFilter.reset();
  }

  /**
   * Get pitch detection statistics
   * Useful for debugging and optimization
   */
  getStats(): {
    isActive: boolean;
    config: PitchDetectionConfig;
  } {
    return {
      isActive: this.isActive,
      config: this.config,
    };
  }
}

/**
 * Singleton instance for easy access throughout the app
 */
let pitchDetectionServiceInstance: PitchDetectionService | null = null;

export function getPitchDetectionService(
  config?: PitchDetectionConfig
): PitchDetectionService {
  if (!pitchDetectionServiceInstance) {
    pitchDetectionServiceInstance = new PitchDetectionService(config);
  }
  return pitchDetectionServiceInstance;
}

export function resetPitchDetectionService(): void {
  if (pitchDetectionServiceInstance) {
    pitchDetectionServiceInstance.stop();
  }
  pitchDetectionServiceInstance = null;
}
