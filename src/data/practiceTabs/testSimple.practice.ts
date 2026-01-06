// src/data/practiceTabs/testSimple.practice.ts
//
// Simple test song for validation and debugging
// Uses open strings (easy to play and verify)

import { PracticeTab } from '@/types/practice/PracticeTab';
import {
    buildNoteStep,
    buildChordStep,
    buildRestStep,
} from '@/utils/practice/practiceStepBuilders';

export const testSimpleSong: PracticeTab = {
    id: 'test-simple',
    metadata: {
        title: 'Test Simple',
        artist: 'Debug',
        difficulty: 'beginner',
        bpm: 60,
        timeSignature: { numerator: 4, denominator: 4 },
    },
    steps: [
        // Open strings sequence (easy to test)
        // String 1 (high E) - E4
        buildNoteStep({ string: 1, fret: 0 }),  // E4

        // String 2 (B) - B3
        buildNoteStep({ string: 2, fret: 0 }),  // B3

        // String 3 (G) - G3
        buildNoteStep({ string: 3, fret: 0 }),  // G3

        // String 4 (D) - D3
        buildNoteStep({ string: 4, fret: 0 }),  // D3

        // String 5 (A) - A2
        buildNoteStep({ string: 5, fret: 0 }),  // A2

        // String 6 (low E) - E2
        buildNoteStep({ string: 6, fret: 0 }),  // E2

        buildRestStep(),

        // Simple chord test
        buildChordStep('Em', 'down'),  // E minor
        buildChordStep('Am', 'down'),  // A minor
        buildChordStep('D', 'down'),   // D major
        buildChordStep('G', 'down'),   // G major

        buildRestStep(),

        // Back to notes - first position
        buildNoteStep({ string: 1, fret: 0 }),  // E4
        buildNoteStep({ string: 1, fret: 1 }),  // F4
        buildNoteStep({ string: 1, fret: 2 }),  // F#4
        buildNoteStep({ string: 1, fret: 3 }),  // G4
    ],
};
