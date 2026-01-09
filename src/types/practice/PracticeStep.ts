// src/types/practice/PracticeStep.ts
export type PracticeStep =
    | PracticeNoteStep
    | PracticeChordStep
    | PracticeRestStep;

type BaseStep = {
    /** Runtime-calculated: step index in sequence */
    index?: number;
    /** Runtime-calculated: start time in ms from practice start */
    startTimeMs?: number;
    /** Runtime-calculated: end time in ms (exclusive) */
    endTimeMs?: number;
    /** Runtime-set: evaluation result */
    result?: 'correct' | 'incorrect' | 'missed' | 'pending';
    /** Runtime-set: whether stats have been updated for this step */
    statsUpdated?: boolean;
};

export type PracticeNoteStep = BaseStep & {
    type: 'note';
    position: {
        string: 1 | 2 | 3 | 4 | 5 | 6,
        fret: number,
    };
    note: {
        name: string;    // E, F#, Bb ... (automatic)
        octave: number;  // 3, 4, 5 ... (automatic)
    };
};

export type PracticeChordStep = BaseStep & {
    type: 'chord';
    chordName: string;        // Em, G, Dm ...
    strum: 'down' | 'up';
};

export type PracticeRestStep = BaseStep & {
    type: 'rest';
};
