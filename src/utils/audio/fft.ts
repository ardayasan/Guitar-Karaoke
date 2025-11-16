/**
 * Fast Fourier Transform (FFT) utilities
 * For real-time audio frequency analysis
 */

/**
 * Simple FFT implementation for audio analysis
 * Based on the Cooley-Tukey algorithm
 */
export class FFT {
  private size: number;
  private cosTable: Float32Array;
  private sinTable: Float32Array;

  constructor(size: number) {
    // Size must be a power of 2
    if ((size & (size - 1)) !== 0) {
      throw new Error('FFT size must be a power of 2');
    }

    this.size = size;
    this.cosTable = new Float32Array(size / 2);
    this.sinTable = new Float32Array(size / 2);

    // Precompute trigonometric tables
    for (let i = 0; i < size / 2; i++) {
      const angle = (-2 * Math.PI * i) / size;
      this.cosTable[i] = Math.cos(angle);
      this.sinTable[i] = Math.sin(angle);
    }
  }

  /**
   * Perform FFT on input samples
   * @param real Real part of input (time domain samples)
   * @param imag Imaginary part (usually zeros for real input)
   * @returns Object with real and imaginary parts of frequency domain
   */
  forward(real: Float32Array, imag: Float32Array): { real: Float32Array; imag: Float32Array } {
    const n = this.size;

    // Bit-reversal permutation
    let j = 0;
    for (let i = 0; i < n - 1; i++) {
      if (i < j) {
        let temp = real[i];
        real[i] = real[j];
        real[j] = temp;

        temp = imag[i];
        imag[i] = imag[j];
        imag[j] = temp;
      }

      let k = n / 2;
      while (k <= j) {
        j -= k;
        k /= 2;
      }
      j += k;
    }

    // Cooley-Tukey decimation-in-time radix-2 FFT
    for (let size = 2; size <= n; size *= 2) {
      const halfsize = size / 2;
      const tablestep = n / size;

      for (let i = 0; i < n; i += size) {
        for (let j = i, k = 0; j < i + halfsize; j++, k += tablestep) {
          const l = j + halfsize;
          const tpre = real[l] * this.cosTable[k] - imag[l] * this.sinTable[k];
          const tpim = real[l] * this.sinTable[k] + imag[l] * this.cosTable[k];

          real[l] = real[j] - tpre;
          imag[l] = imag[j] - tpim;
          real[j] += tpre;
          imag[j] += tpim;
        }
      }
    }

    return { real, imag };
  }

  /**
   * Calculate magnitude spectrum from FFT output
   */
  getMagnitudeSpectrum(real: Float32Array, imag: Float32Array): Float32Array {
    const magnitude = new Float32Array(this.size / 2);

    for (let i = 0; i < this.size / 2; i++) {
      magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    }

    return magnitude;
  }

  /**
   * Get the size of this FFT
   */
  getSize(): number {
    return this.size;
  }
}

/**
 * Apply Hamming window to reduce spectral leakage
 */
export function applyHammingWindow(samples: Float32Array): Float32Array {
  const windowed = new Float32Array(samples.length);
  const N = samples.length;

  for (let i = 0; i < N; i++) {
    const window = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (N - 1));
    windowed[i] = samples[i] * window;
  }

  return windowed;
}

/**
 * Apply Hann window to reduce spectral leakage
 */
export function applyHannWindow(samples: Float32Array): Float32Array {
  const windowed = new Float32Array(samples.length);
  const N = samples.length;

  for (let i = 0; i < N; i++) {
    const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
    windowed[i] = samples[i] * window;
  }

  return windowed;
}

/**
 * Find the peak frequency in the magnitude spectrum
 * @param magnitude Magnitude spectrum
 * @param sampleRate Sample rate in Hz
 * @returns Peak frequency in Hz and its magnitude
 */
export function findPeakFrequency(
  magnitude: Float32Array,
  sampleRate: number
): { frequency: number; magnitude: number; bin: number } {
  let maxMagnitude = 0;
  let maxBin = 0;

  for (let i = 1; i < magnitude.length; i++) {
    if (magnitude[i] > maxMagnitude) {
      maxMagnitude = magnitude[i];
      maxBin = i;
    }
  }

  // Use parabolic interpolation for better frequency resolution
  const frequency = parabolicInterpolation(magnitude, maxBin, sampleRate, magnitude.length * 2);

  return {
    frequency,
    magnitude: maxMagnitude,
    bin: maxBin,
  };
}

/**
 * Parabolic interpolation for more accurate peak frequency estimation
 */
function parabolicInterpolation(
  spectrum: Float32Array,
  bin: number,
  sampleRate: number,
  fftSize: number
): number {
  if (bin <= 0 || bin >= spectrum.length - 1) {
    return (bin * sampleRate) / fftSize;
  }

  const left = spectrum[bin - 1];
  const center = spectrum[bin];
  const right = spectrum[bin + 1];

  const offset = 0.5 * ((left - right) / (left - 2 * center + right));
  const interpolatedBin = bin + offset;

  return (interpolatedBin * sampleRate) / fftSize;
}

/**
 * Calculate the autocorrelation of a signal
 * Used in YIN algorithm for pitch detection
 */
export function autocorrelation(samples: Float32Array, maxLag: number): Float32Array {
  const result = new Float32Array(maxLag);
  const n = samples.length;

  for (let lag = 0; lag < maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) {
      sum += samples[i] * samples[i + lag];
    }
    result[lag] = sum / (n - lag);
  }

  return result;
}
