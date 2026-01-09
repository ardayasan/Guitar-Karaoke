// src/data/practiceTabs/index.ts
import { caddelerdeRuzgar } from './caddelerdeRuzgar.practice';
import { sampleNoteToChordPractice } from './noteToChord.practice';
import { testSimpleSong } from './testSimple.practice';

export const PRACTICE_TABS = [
    testSimpleSong,  // Test song first for easy debugging
    caddelerdeRuzgar,
    sampleNoteToChordPractice,
];
