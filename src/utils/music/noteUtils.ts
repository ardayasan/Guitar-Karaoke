/**
 * Music theory utility functions for note conversion and manipulation
 */

import { Note, NoteName, MidiNote, Frequency, Octave } from '@/types';

// Standard tuning frequency (A4 = 440 Hz)
export const A4_FREQUENCY = 440;
export const A4_MIDI_NOTE = 69;

// Note names in chromatic order
const NOTE_NAMES: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Convert frequency (Hz) to MIDI note number
 * Formula: MIDI = 69 + 12 * log2(f / 440)
 */
export function frequencyToMidi(frequency: Frequency): MidiNote {
  return Math.round(69 + 12 * Math.log2(frequency / A4_FREQUENCY));
}

/**
 * Convert MIDI note number to frequency (Hz)
 * Formula: f = 440 * 2^((MIDI - 69) / 12)
 */
export function midiToFrequency(midiNote: MidiNote): Frequency {
  return A4_FREQUENCY * Math.pow(2, (midiNote - A4_MIDI_NOTE) / 12);
}

/**
 * Convert MIDI note number to note name and octave
 */
export function midiToNoteName(midiNote: MidiNote): { name: NoteName; octave: Octave } {
  const octave = Math.floor(midiNote / 12) - 1;
  const noteIndex = midiNote % 12;
  const name = NOTE_NAMES[noteIndex];
  return { name, octave };
}

/**
 * Convert note name and octave to MIDI note number
 */
export function noteNameToMidi(name: NoteName, octave: Octave): MidiNote {
  const noteIndex = NOTE_NAMES.indexOf(name);
  if (noteIndex === -1) {
    throw new Error(`Invalid note name: ${name}`);
  }
  return (octave + 1) * 12 + noteIndex;
}

/**
 * Convert frequency to complete Note object
 */
export function frequencyToNote(frequency: Frequency, confidence: number = 1.0): Note {
  const midiNote = frequencyToMidi(frequency);
  const { name, octave } = midiToNoteName(midiNote);

  return {
    name,
    octave,
    frequency,
    midiNote,
    confidence,
  };
}

/**
 * Get the frequency range for a given MIDI note (considering +/- 50 cents)
 */
export function getMidiNoteFrequencyRange(midiNote: MidiNote): { min: Frequency; max: Frequency } {
  const centerFreq = midiToFrequency(midiNote);
  const semitoneRatio = Math.pow(2, 1 / 12);
  const halfSemitoneRatio = Math.sqrt(semitoneRatio);

  return {
    min: centerFreq / halfSemitoneRatio,
    max: centerFreq * halfSemitoneRatio,
  };
}

/**
 * Calculate the cent difference between two frequencies
 * Cents = 1200 * log2(f2 / f1)
 */
export function getCentsDifference(freq1: Frequency, freq2: Frequency): number {
  return 1200 * Math.log2(freq2 / freq1);
}

/**
 * Check if a detected frequency is close enough to an expected note
 * Returns true if within +/- threshold cents
 */
export function isNoteMatch(
  detectedFreq: Frequency,
  expectedMidi: MidiNote,
  thresholdCents: number = 50
): boolean {
  const expectedFreq = midiToFrequency(expectedMidi);
  const centsDiff = Math.abs(getCentsDifference(detectedFreq, expectedFreq));
  return centsDiff <= thresholdCents;
}

/**
 * Get note name as string (e.g., "C4", "F#5")
 */
export function getNoteString(note: Note): string {
  return `${note.name}${note.octave}`;
}

/**
 * Standard guitar tuning (from low E to high E)
 * E2, A2, D3, G3, B3, E4
 */
export const STANDARD_TUNING_MIDI: MidiNote[] = [40, 45, 50, 55, 59, 64];

/**
 * Get the expected frequency for a guitar string and fret
 * @param string Guitar string number (1-6, where 1 is high E)
 * @param fret Fret number (0 = open)
 */
export function getGuitarNoteFrequency(string: number, fret: number): Frequency {
  if (string < 1 || string > 6) {
    throw new Error(`Invalid string number: ${string}`);
  }

  // Convert string number to index (string 1 = index 5, string 6 = index 0)
  const stringIndex = 6 - string;
  const openStringMidi = STANDARD_TUNING_MIDI[stringIndex];
  const midiNote = openStringMidi + fret;

  return midiToFrequency(midiNote);
}

/**
 * Guitar frequency range constants
 */
export const GUITAR_FREQUENCY_RANGE = {
  MIN: midiToFrequency(40), // E2 (low E string)
  MAX: midiToFrequency(88), // E6 (24th fret on high E)
};
