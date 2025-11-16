/**
 * Audio Recording Service
 * Handles microphone input and real-time audio capture using expo-av
 */

import { Audio } from 'expo-av';
import { AudioDetection } from '@/types';

export interface AudioRecordingConfig {
  sampleRate: number; // Hz (e.g., 44100)
  channels: number; // 1 for mono, 2 for stereo
  bitDepth: number; // 16 or 24
  bufferSize: number; // Samples per buffer (affects latency)
}

export const DEFAULT_RECORDING_CONFIG: AudioRecordingConfig = {
  sampleRate: 44100,
  channels: 1, // Mono for guitar
  bitDepth: 16,
  bufferSize: 2048, // ~46ms latency at 44.1kHz
};

export type AudioDataCallback = (samples: Float32Array, timestamp: number) => void;

export class AudioRecordingService {
  private recording: Audio.Recording | null = null;
  private isRecording: boolean = false;
  private config: AudioRecordingConfig;
  private audioDataCallback: AudioDataCallback | null = null;

  constructor(config: AudioRecordingConfig = DEFAULT_RECORDING_CONFIG) {
    this.config = config;
  }

  /**
   * Request microphone permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      return false;
    }
  }

  /**
   * Check if we have microphone permissions
   */
  async hasPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking audio permissions:', error);
      return false;
    }
  }

  /**
   * Start recording audio from microphone
   * @param callback Function called with audio samples as they arrive
   */
  async startRecording(callback: AudioDataCallback): Promise<boolean> {
    try {
      // Check permissions
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          console.error('Microphone permission denied');
          return false;
        }
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      // Create recording with optimized settings for pitch detection
      const { recording } = await Audio.Recording.createAsync(
        {
          isMeteringEnabled: true,
          android: {
            extension: '.wav',
            outputFormat: Audio.AndroidOutputFormat.DEFAULT,
            audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
            sampleRate: this.config.sampleRate,
            numberOfChannels: this.config.channels,
            bitRate: 128000,
          },
          ios: {
            extension: '.wav',
            outputFormat: Audio.IOSOutputFormat.LINEARPCM,
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: this.config.sampleRate,
            numberOfChannels: this.config.channels,
            bitRate: 128000,
            linearPCMBitDepth: this.config.bitDepth,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/wav',
            bitsPerSecond: 128000,
          },
        },
        this.onRecordingStatusUpdate.bind(this)
      );

      this.recording = recording;
      this.isRecording = true;
      this.audioDataCallback = callback;

      console.log('Audio recording started');
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  }

  /**
   * Stop recording audio
   */
  async stopRecording(): Promise<void> {
    try {
      if (!this.recording) {
        return;
      }

      await this.recording.stopAndUnloadAsync();
      this.recording = null;
      this.isRecording = false;
      this.audioDataCallback = null;

      console.log('Audio recording stopped');
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }

  /**
   * Pause recording
   */
  async pauseRecording(): Promise<void> {
    try {
      if (!this.recording) {
        return;
      }

      await this.recording.pauseAsync();
      this.isRecording = false;
      console.log('Audio recording paused');
    } catch (error) {
      console.error('Failed to pause recording:', error);
    }
  }

  /**
   * Resume recording
   */
  async resumeRecording(): Promise<void> {
    try {
      if (!this.recording) {
        return;
      }

      await this.recording.startAsync();
      this.isRecording = true;
      console.log('Audio recording resumed');
    } catch (error) {
      console.error('Failed to resume recording:', error);
    }
  }

  /**
   * Get current audio level (for visualization)
   * @returns dB level (typically -160 to 0)
   */
  async getAudioLevel(): Promise<number> {
    try {
      if (!this.recording) {
        return -160;
      }

      const status = await this.recording.getStatusAsync();
      if (status.isRecording && status.metering !== undefined) {
        return status.metering;
      }

      return -160;
    } catch (error) {
      console.error('Failed to get audio level:', error);
      return -160;
    }
  }

  /**
   * Get current recording status
   */
  getStatus(): { isRecording: boolean; config: AudioRecordingConfig } {
    return {
      isRecording: this.isRecording,
      config: this.config,
    };
  }

  /**
   * Update recording configuration
   * Note: Requires stopping and restarting recording to take effect
   */
  setConfig(config: Partial<AudioRecordingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Called when recording status updates
   * Note: expo-av doesn't provide raw audio samples directly in the callback
   * For real-time processing, we would need to use a native module or
   * process the audio file in chunks. For now, this is a placeholder.
   */
  private onRecordingStatusUpdate(status: Audio.RecordingStatus): void {
    if (status.isRecording) {
      // In a production app, you would process audio here
      // This would require either:
      // 1. A native module to access raw audio buffers
      // 2. Processing the recording file in chunks
      // 3. Using Web Audio API on web platform

      // For now, we'll note that this is where real-time processing would hook in
      if (this.audioDataCallback && status.durationMillis) {
        // Placeholder - in reality, you'd pass actual audio samples
        // const samples = new Float32Array(this.config.bufferSize);
        // this.audioDataCallback(samples, status.durationMillis);
      }
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.isRecording) {
      await this.stopRecording();
    }

    // Reset audio mode
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });
    } catch (error) {
      console.error('Error resetting audio mode:', error);
    }
  }
}
