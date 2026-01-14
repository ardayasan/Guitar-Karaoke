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

export const demo1Song: PracticeTab = {
    id: 'DEMO 1',
    metadata: {
        title: 'DEMO 1',
        artist: 'Debug',
        difficulty: 'beginner',
        bpm: 60,
        timeSignature: { numerator: 4, denominator: 4 },
    },
    steps: [
        buildNoteStep({ string: 6, fret: 1 }),  

        buildNoteStep({ string: 6, fret: 2 }),  

        buildNoteStep({ string: 6, fret: 4 }),  

        buildNoteStep({ string: 6, fret: 5 }),  

        buildNoteStep({ string: 6, fret: 10 }),  

        // Simple chord test
        buildChordStep('F', 'down'),  // A minor
        buildChordStep('Am', 'down'),  // A minor
        buildChordStep('D', 'down'),   // D major
        buildChordStep('G', 'down'),   // G major

        // Back to notes - first position
        buildNoteStep({ string: 1, fret: 0 }),  // E4
        buildNoteStep({ string: 1, fret: 1 }),  // F4
        buildNoteStep({ string: 1, fret: 2 }),  // F#4
        buildNoteStep({ string: 1, fret: 3 }),  // G4
    ],
};
