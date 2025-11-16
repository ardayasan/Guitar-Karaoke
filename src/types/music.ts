/**
 * Music and Audio Related Type Definitions
 */

// MIDI note number (0-127, where 69 = A4 = 440Hz)
export type MidiNote = number;

// Frequency in Hertz
export type Frequency = number;

// Guitar string numbers (1-6, where 1 is high E)
export type GuitarString = 1 | 2 | 3 | 4 | 5 | 6;

// Fret number (0-24, where 0 is open string)
export type Fret = number;

// Note names
export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

// Octave number (standard range 0-8)
export type Octave = number;

/**
 * Represents a musical note with all relevant information
 */
export interface Note {
  name: NoteName;
  octave: Octave;
  frequency: Frequency;
  midiNote: MidiNote;
  confidence?: number; // 0-1 confidence score for detected notes
}

/**
 * Represents a position on the guitar fretboard
 */
export interface FretboardPosition {
  string: GuitarString;
  fret: Fret;
  note: Note;
}

/**
 * Common guitar chords
 */
export type ChordType =
  | 'major'
  | 'minor'
  | 'major7'
  | 'minor7'
  | 'dominant7'
  | 'diminished'
  | 'augmented'
  | 'sus2'
  | 'sus4';

/**
 * Represents a guitar chord
 */
export interface Chord {
  root: NoteName;
  type: ChordType;
  notes: Note[];
  positions?: FretboardPosition[];
  confidence?: number;
}

/**
 * Detected audio information
 */
export interface AudioDetection {
  timestamp: number; // milliseconds
  frequency: Frequency;
  note?: Note;
  chord?: Chord;
  amplitude: number; // 0-1
  confidence: number; // 0-1
}

/**
 * Practice feedback types
 */
export type FeedbackType = 'correct' | 'incorrect' | 'missed' | 'early' | 'late';

/**
 * Real-time practice feedback
 */
export interface PracticeFeedback {
  type: FeedbackType;
  expected: Note | Chord;
  detected?: Note | Chord;
  timestamp: number;
  timingError?: number; // milliseconds off from expected time
}
