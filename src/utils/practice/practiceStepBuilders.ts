// src/utils/practice/practiceStepBuilders.ts
import {
    PracticeNoteStep,
    PracticeChordStep,
    PracticeRestStep,
} from '@/types/practice/PracticeStep';
import { positionToNote } from './positionToNote';

/* -------- NOTE -------- */
export function buildNoteStep(
    position: { string: 1 | 2 | 3 | 4 | 5 | 6; fret: number }
): PracticeNoteStep {
    const note = positionToNote(position.string, position.fret);

    return {
        type: 'note',
        position,
        note,
    };
}


/* -------- CHORD -------- */
export function buildChordStep(
    chordName: string,
    strum: 'down' | 'up',
    beats: number = 1
): PracticeChordStep {
    return {
        type: 'chord',
        chordName,
        strum,
    };
}

/* -------- REST -------- */
export function buildRestStep(
): PracticeRestStep {
    return {
        type: 'rest',
    };
}
