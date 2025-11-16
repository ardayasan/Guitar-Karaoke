/**
 * Sample Guitar Tablatures
 * Pre-loaded tabs for testing without importing files
 */

import { Tablature, TabLibraryItem, Measure, TabEvent } from '@/types';

/**
 * Helper function to create a simple note event
 */
function createNoteEvent(
  id: string,
  timestamp: number,
  duration: number,
  string: 1 | 2 | 3 | 4 | 5 | 6,
  fret: number,
  noteName: string,
  octave: number,
  frequency: number,
  midiNote: number
): TabEvent {
  return {
    id,
    timestamp,
    duration,
    type: 'note',
    positions: [{
      string,
      fret,
      note: {
        name: noteName as any,
        octave,
        frequency,
        midiNote,
      },
    }],
    note: {
      name: noteName as any,
      octave,
      frequency,
      midiNote,
    },
  };
}

/**
 * Sample 1: "Smoke on the Water" Main Riff (Beginner)
 * Classic rock riff, very beginner-friendly
 */
export const smokeOnTheWater: Tablature = {
  id: 'sample-smoke-on-water',
  metadata: {
    title: 'Smoke on the Water',
    artist: 'Deep Purple',
    album: 'Machine Head',
    difficulty: 'beginner',
    tempo: 112,
    duration: 16,
    genre: 'Rock',
    year: 1972,
    tuning: 'Standard (EADGBE)',
  },
  measures: [
    {
      number: 1,
      timeSignature: { numerator: 4, denominator: 4 },
      events: [
        // 0-3-5 on A string
        createNoteEvent('e1', 0, 500, 5, 0, 'E', 2, 82.41, 40),
        createNoteEvent('e2', 500, 500, 5, 3, 'G', 2, 98.00, 43),
        createNoteEvent('e3', 1000, 1000, 5, 5, 'A', 2, 110.00, 45),
      ],
    },
    {
      number: 2,
      timeSignature: { numerator: 4, denominator: 4 },
      events: [
        // 0-3-6-5 on A string
        createNoteEvent('e4', 2000, 500, 5, 0, 'E', 2, 82.41, 40),
        createNoteEvent('e5', 2500, 500, 5, 3, 'G', 2, 98.00, 43),
        createNoteEvent('e6', 3000, 500, 5, 6, 'A#', 2, 116.54, 46),
        createNoteEvent('e7', 3500, 500, 5, 5, 'A', 2, 110.00, 45),
      ],
    },
    {
      number: 3,
      timeSignature: { numerator: 4, denominator: 4 },
      events: [
        // 0-3-5 on A string (repeat)
        createNoteEvent('e8', 4000, 500, 5, 0, 'E', 2, 82.41, 40),
        createNoteEvent('e9', 4500, 500, 5, 3, 'G', 2, 98.00, 43),
        createNoteEvent('e10', 5000, 500, 5, 5, 'A', 2, 110.00, 45),
        createNoteEvent('e11', 5500, 500, 5, 3, 'G', 2, 98.00, 43),
      ],
    },
    {
      number: 4,
      timeSignature: { numerator: 4, denominator: 4 },
      events: [
        createNoteEvent('e12', 6000, 2000, 5, 0, 'E', 2, 82.41, 40),
      ],
    },
  ],
  totalDuration: 8000,
};

/**
 * Sample 2: "Seven Nation Army" Bass Line (Beginner)
 * Iconic bass riff, great for beginners
 */
export const sevenNationArmy: Tablature = {
  id: 'sample-seven-nation-army',
  metadata: {
    title: 'Seven Nation Army',
    artist: 'The White Stripes',
    album: 'Elephant',
    difficulty: 'beginner',
    tempo: 120,
    duration: 12,
    genre: 'Rock',
    year: 2003,
    tuning: 'Standard (EADGBE)',
  },
  measures: [
    {
      number: 1,
      timeSignature: { numerator: 4, denominator: 4 },
      events: [
        // Main riff on low E string
        createNoteEvent('e1', 0, 500, 6, 7, 'B', 1, 61.74, 35),
        createNoteEvent('e2', 500, 500, 6, 7, 'B', 1, 61.74, 35),
        createNoteEvent('e3', 1000, 250, 6, 10, 'D', 2, 73.42, 38),
        createNoteEvent('e4', 1250, 750, 6, 7, 'B', 1, 61.74, 35),
      ],
    },
    {
      number: 2,
      timeSignature: { numerator: 4, denominator: 4 },
      events: [
        createNoteEvent('e5', 2000, 500, 6, 5, 'A', 1, 55.00, 33),
        createNoteEvent('e6', 2500, 1000, 6, 3, 'G', 1, 49.00, 31),
        createNoteEvent('e7', 3500, 500, 6, 2, 'F#', 1, 46.25, 30),
      ],
    },
  ],
  totalDuration: 4000,
};

/**
 * Sample 3: "House of the Rising Sun" Arpeggio (Intermediate)
 * Classic fingerpicking pattern
 */
export const houseOfRisingSun: Tablature = {
  id: 'sample-house-rising-sun',
  metadata: {
    title: 'House of the Rising Sun',
    artist: 'The Animals',
    album: 'The Animals',
    difficulty: 'intermediate',
    tempo: 88,
    duration: 20,
    genre: 'Folk Rock',
    year: 1964,
    tuning: 'Standard (EADGBE)',
  },
  measures: [
    {
      number: 1,
      timeSignature: { numerator: 6, denominator: 8 },
      events: [
        // Am arpeggio
        createNoteEvent('e1', 0, 400, 5, 0, 'E', 2, 82.41, 40),
        createNoteEvent('e2', 400, 400, 3, 2, 'A', 3, 220.00, 57),
        createNoteEvent('e3', 800, 400, 2, 1, 'C', 4, 261.63, 60),
        createNoteEvent('e4', 1200, 400, 3, 2, 'A', 3, 220.00, 57),
        createNoteEvent('e5', 1600, 400, 4, 2, 'E', 3, 164.81, 52),
        createNoteEvent('e6', 2000, 400, 3, 2, 'A', 3, 220.00, 57),
      ],
    },
  ],
  totalDuration: 2400,
};

/**
 * Sample 4: "Wonderwall" Intro (Intermediate)
 * Popular strumming pattern
 */
export const wonderwall: Tablature = {
  id: 'sample-wonderwall',
  metadata: {
    title: 'Wonderwall',
    artist: 'Oasis',
    album: '(What\'s the Story) Morning Glory?',
    difficulty: 'intermediate',
    tempo: 87,
    duration: 24,
    genre: 'Rock',
    year: 1995,
    tuning: 'Standard (EADGBE)',
  },
  measures: [
    {
      number: 1,
      timeSignature: { numerator: 4, denominator: 4 },
      events: [
        // Em7 chord notes
        createNoteEvent('e1', 0, 500, 6, 0, 'E', 2, 82.41, 40),
        createNoteEvent('e2', 500, 500, 4, 2, 'E', 3, 164.81, 52),
        createNoteEvent('e3', 1000, 500, 3, 0, 'G', 3, 196.00, 55),
        createNoteEvent('e4', 1500, 500, 2, 3, 'D', 4, 293.66, 62),
      ],
    },
  ],
  totalDuration: 2000,
};

/**
 * Sample 5: "Sunshine of Your Love" Riff (Intermediate)
 * Classic blues-rock riff
 */
export const sunshineOfYourLove: Tablature = {
  id: 'sample-sunshine-love',
  metadata: {
    title: 'Sunshine of Your Love',
    artist: 'Cream',
    album: 'Disraeli Gears',
    difficulty: 'intermediate',
    tempo: 112,
    duration: 18,
    genre: 'Blues Rock',
    year: 1967,
    tuning: 'Standard (EADGBE)',
  },
  measures: [
    {
      number: 1,
      timeSignature: { numerator: 4, denominator: 4 },
      events: [
        // Main riff on D and A strings
        createNoteEvent('e1', 0, 500, 4, 12, 'E', 4, 329.63, 64),
        createNoteEvent('e2', 500, 500, 4, 12, 'E', 4, 329.63, 64),
        createNoteEvent('e3', 1000, 500, 5, 10, 'D', 3, 146.83, 50),
        createNoteEvent('e4', 1500, 500, 4, 12, 'E', 4, 329.63, 64),
      ],
    },
  ],
  totalDuration: 2000,
};

/**
 * All sample tablatures
 */
export const SAMPLE_TABLATURES: Tablature[] = [
  smokeOnTheWater,
  sevenNationArmy,
  houseOfRisingSun,
  wonderwall,
  sunshineOfYourLove,
];

/**
 * Sample library items (for display in library)
 */
export const SAMPLE_LIBRARY_ITEMS: TabLibraryItem[] = [
  {
    id: smokeOnTheWater.id,
    title: smokeOnTheWater.metadata.title,
    artist: smokeOnTheWater.metadata.artist,
    difficulty: smokeOnTheWater.metadata.difficulty,
    duration: smokeOnTheWater.metadata.duration,
    tempo: smokeOnTheWater.metadata.tempo,
    filePath: 'sample://smoke-on-water',
  },
  {
    id: sevenNationArmy.id,
    title: sevenNationArmy.metadata.title,
    artist: sevenNationArmy.metadata.artist,
    difficulty: sevenNationArmy.metadata.difficulty,
    duration: sevenNationArmy.metadata.duration,
    tempo: sevenNationArmy.metadata.tempo,
    filePath: 'sample://seven-nation-army',
  },
  {
    id: houseOfRisingSun.id,
    title: houseOfRisingSun.metadata.title,
    artist: houseOfRisingSun.metadata.artist,
    difficulty: houseOfRisingSun.metadata.difficulty,
    duration: houseOfRisingSun.metadata.duration,
    tempo: houseOfRisingSun.metadata.tempo,
    filePath: 'sample://house-rising-sun',
  },
  {
    id: wonderwall.id,
    title: wonderwall.metadata.title,
    artist: wonderwall.metadata.artist,
    difficulty: wonderwall.metadata.difficulty,
    duration: wonderwall.metadata.duration,
    tempo: wonderwall.metadata.tempo,
    filePath: 'sample://wonderwall',
  },
  {
    id: sunshineOfYourLove.id,
    title: sunshineOfYourLove.metadata.title,
    artist: sunshineOfYourLove.metadata.artist,
    difficulty: sunshineOfYourLove.metadata.difficulty,
    duration: sunshineOfYourLove.metadata.duration,
    tempo: sunshineOfYourLove.metadata.tempo,
    filePath: 'sample://sunshine-love',
  },
];

/**
 * Get a tablature by ID
 */
export function getSampleTabById(id: string): Tablature | null {
  return SAMPLE_TABLATURES.find(tab => tab.id === id) || null;
}
