// sample_single_note.practice.ts
import { PracticeTab } from '@/types/practice/PracticeTab';
import {
    buildNoteStep,
    buildRestStep,
} from '@/utils/practice/practiceStepBuilders';

export const caddelerdeRuzgar: PracticeTab = {
    id: 'caddelerde-ruzgar',
    metadata: {
        title: 'Caddelerde Rüzgar',
        artist: 'Practice',
        difficulty: 'beginner',
        bpm: 100,
        timeSignature: { numerator: 4, denominator: 4 },
    },
    steps: [
        // E4 E4 E4 E4 F4 E4 X
        buildNoteStep({ string: 1, fret: 0 }),
        buildNoteStep({ string: 1, fret: 0 }),
        buildNoteStep({ string: 1, fret: 0 }),
        buildNoteStep({ string: 1, fret: 0 }),
        buildNoteStep({ string: 1, fret: 1 }),
        buildNoteStep({ string: 1, fret: 0 }),
        buildRestStep(),

        // E4 E4 E4 G4 E4 X
        buildNoteStep({ string: 1, fret: 0 }),
        buildNoteStep({ string: 1, fret: 0 }),
        buildNoteStep({ string: 1, fret: 0 }),
        buildNoteStep({ string: 1, fret: 3 }),
        buildNoteStep({ string: 1, fret: 0 }),
        buildRestStep(),

        // D4 D4 D4 D4 E4 D4 X
        buildNoteStep({ string: 2, fret: 3 }),
        buildNoteStep({ string: 2, fret: 3 }),
        buildNoteStep({ string: 2, fret: 3 }),
        buildNoteStep({ string: 2, fret: 3 }),
        buildNoteStep({ string: 1, fret: 0 }),
        buildNoteStep({ string: 2, fret: 3 }),
        buildRestStep(),

        // D4 D4 D4 E4 D4 X
        buildNoteStep({ string: 2, fret: 3 }),
        buildNoteStep({ string: 2, fret: 3 }),
        buildNoteStep({ string: 2, fret: 3 }),
        buildNoteStep({ string: 1, fret: 0 }),
        buildNoteStep({ string: 2, fret: 3 }),
        buildRestStep(),

        // C4 C4 C4 C4 D4 C4 X
        buildNoteStep({ string: 2, fret: 1 }),
        buildNoteStep({ string: 2, fret: 1 }),
        buildNoteStep({ string: 2, fret: 1 }),
        buildNoteStep({ string: 2, fret: 1 }),
        buildNoteStep({ string: 2, fret: 3 }),
        buildNoteStep({ string: 2, fret: 1 }),
        buildRestStep(),

        // C4 C4 C4 D4 C4 X
        buildNoteStep({ string: 2, fret: 1 }),
        buildNoteStep({ string: 2, fret: 1 }),
        buildNoteStep({ string: 2, fret: 1 }),
        buildNoteStep({ string: 2, fret: 3 }),
        buildNoteStep({ string: 2, fret: 1 }),
        buildRestStep(),

        // B3 B3 B3 B3 C4 B3 X
        buildNoteStep({ string: 2, fret: 0 }),
        buildNoteStep({ string: 2, fret: 0 }),
        buildNoteStep({ string: 2, fret: 0 }),
        buildNoteStep({ string: 2, fret: 0 }),
        buildNoteStep({ string: 2, fret: 1 }),
        buildNoteStep({ string: 2, fret: 0 }),
        buildRestStep(),

        // B3 B3 B3 D4 B3 A3
        buildNoteStep({ string: 2, fret: 0 }),
        buildNoteStep({ string: 2, fret: 0 }),
        buildNoteStep({ string: 2, fret: 0 }),
        buildNoteStep({ string: 2, fret: 3 }),
        buildNoteStep({ string: 2, fret: 0 }),
        buildNoteStep({ string: 3, fret: 2 }),
        
        buildRestStep(),
        buildRestStep(),
        buildRestStep(),
    ],
};
