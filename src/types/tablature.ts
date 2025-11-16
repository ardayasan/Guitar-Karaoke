/**
 * Tablature and Song Related Type Definitions
 */

import { Note, Chord, FretboardPosition } from './music';

/**
 * Difficulty levels
 */
export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * A single note or chord event in the tablature
 */
export interface TabEvent {
  id: string;
  timestamp: number; // milliseconds from start
  duration: number; // milliseconds
  positions: FretboardPosition[]; // Can be multiple for chords
  type: 'note' | 'chord';
  note?: Note;
  chord?: Chord;
}

/**
 * A measure (bar) in the tablature
 */
export interface Measure {
  number: number;
  events: TabEvent[];
  timeSignature: {
    numerator: number;
    denominator: number;
  };
}

/**
 * Song metadata
 */
export interface SongMetadata {
  title: string;
  artist: string;
  album?: string;
  difficulty: Difficulty;
  tempo: number; // BPM
  duration: number; // seconds
  genre?: string;
  year?: number;
  tuning?: string; // e.g., "Standard (EADGBE)"
}

/**
 * Complete tablature structure
 */
export interface Tablature {
  id: string;
  metadata: SongMetadata;
  measures: Measure[];
  totalDuration: number; // milliseconds
  filePath?: string; // local file path
}

/**
 * Practice session statistics
 */
export interface PracticeStats {
  songId: string;
  startTime: number;
  endTime?: number;
  accuracy: number; // 0-100
  correctNotes: number;
  totalNotes: number;
  longestStreak: number;
  averageLatency: number; // milliseconds
  tempo: number; // BPM used
}

/**
 * Tab library item for display
 */
export interface TabLibraryItem {
  id: string;
  title: string;
  artist: string;
  difficulty: Difficulty;
  duration: number;
  tempo: number;
  thumbnailUrl?: string;
  filePath: string;
  lastPracticed?: number; // timestamp
  bestAccuracy?: number; // 0-100
}
