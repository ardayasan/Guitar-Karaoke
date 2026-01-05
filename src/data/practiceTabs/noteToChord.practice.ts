// sample_note_to_chord.practice.ts
import { PracticeTab } from '@/types/practice/PracticeTab';
import {
    buildNoteStep,
    buildChordStep,
    buildRestStep,
} from '@/utils/practice/practiceStepBuilders';

export const sampleNoteToChordPractice: PracticeTab = {
    id: 'sample-note-chord',
    metadata: {
        title: 'Note to Chord Practice',
        artist: 'Practice',
        difficulty: 'beginner',
        bpm: 90,
        timeSignature: { numerator: 4, denominator: 4 },
    },
    steps: [
        // Notes
        buildNoteStep({ string: 1, fret: 0 }), // E4
        buildRestStep(),
        buildNoteStep({ string: 1, fret: 3 }), // G4
        buildRestStep(),
        buildNoteStep({ string: 1, fret: 5 }), // A4
        buildRestStep(),
        buildRestStep(),

        // Chords (aynen bırakıldı)
        buildChordStep('Em', 'down', 2),
        buildRestStep(),
        buildChordStep('G', 'up', 2),
    ],
};
