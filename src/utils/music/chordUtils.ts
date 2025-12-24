import type { Chord, NoteName } from '@/types/music';
import type { ChordCandidate } from '@/services/chord/ChordDetectionTypes';

const PITCH_CLASS_TO_NOTE: NoteName[] = [
  'C',  // 0
  'C#', // 1
  'D',  // 2
  'D#', // 3
  'E',  // 4
  'F',  // 5
  'F#', // 6
  'G',  // 7
  'G#', // 8
  'A',  // 9
  'A#', // 10
  'B',  // 11
];

export function chordCandidateToChord(candidate: ChordCandidate): Chord {
    const root = PITCH_CLASS_TO_NOTE[candidate.root];

    return {
        root,
        type: candidate.quality,     // 'major' | 'minor' matches ChordType subset
        notes: [],                   // şimdilik boş
        confidence: candidate.confidence,
    };
}
