type GuitarString = 1 | 2 | 3 | 4 | 5 | 6;

const STRING_BASE_NOTES: Record<GuitarString, { name: string; octave: number }> = {
    6: { name: 'E', octave: 2 },
    5: { name: 'A', octave: 2 },
    4: { name: 'D', octave: 3 },
    3: { name: 'G', octave: 3 },
    2: { name: 'B', octave: 3 },
    1: { name: 'E', octave: 4 },
};

const NOTE_SEQUENCE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function noteIndex(name: string): number {
    return NOTE_SEQUENCE.indexOf(name);
}

export function positionToNote(
    string: GuitarString,
    fret: number
): { name: string; octave: number } {
    const base = STRING_BASE_NOTES[string];
    const baseIndex = noteIndex(base.name);

    const totalSemitones = baseIndex + fret;
    const name = NOTE_SEQUENCE[totalSemitones % 12];
    const octave = base.octave + Math.floor(totalSemitones / 12);

    return { name, octave };
}
