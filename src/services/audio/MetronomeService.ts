/**
 * MetronomeService
 *
 * Provides metronome click playback synchronized to BPM.
 * Uses expo-av Audio for sound playback.
 */

import { Audio } from 'expo-av';

export class MetronomeService {
  private sound: Audio.Sound | null = null;
  private interval: NodeJS.Timeout | null = null;
  private bpm: number = 120;
  private isPlaying: boolean = false;

  constructor() {
    this.initializeAudio();
  }

  private async initializeAudio() {
    try {
      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Failed to initialize metronome audio:', error);
    }
  }

  /**
   * Start metronome at specified BPM
   */
  async start(bpm: number) {
    if (this.isPlaying) {
      await this.stop();
    }

    this.bpm = bpm;
    this.isPlaying = true;

    // Calculate interval in milliseconds
    const intervalMs = (60 / bpm) * 1000;

    // Load and play click sound on interval
    this.interval = setInterval(async () => {
      await this.playClick();
    }, intervalMs);

    // Play first click immediately
    await this.playClick();
  }

  /**
   * Stop metronome
   */
  async stop() {
    this.isPlaying = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }

  /**
   * Play a single click sound
   */
  private async playClick() {
    try {
      // Create a simple beep using oscillator
      // For a more professional metronome, you'd load a click sound file
      const { sound } = await Audio.Sound.createAsync(
        // Using a simple beep frequency
        // In production, replace with: require('@/assets/sounds/metronome-click.mp3')
        { uri: this.generateClickUri() },
        { shouldPlay: true, volume: 0.6 }
      );

      // Unload after playing
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Failed to play metronome click:', error);
    }
  }

  /**
   * Generate a simple click sound data URI
   * This creates a short beep sound programmatically
   */
  private generateClickUri(): string {
    // For now, we'll use a simple tone
    // In production, use a proper click sound file
    // e.g., return require('@/assets/sounds/click.mp3')

    // Fallback: return empty URI (silent)
    // You should add a metronome click sound file to your assets
    return 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
  }

  /**
   * Update BPM while playing
   */
  async setBPM(bpm: number) {
    if (this.isPlaying) {
      await this.start(bpm);
    } else {
      this.bpm = bpm;
    }
  }

  /**
   * Get current playing status
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Cleanup
   */
  async destroy() {
    await this.stop();
  }
}
