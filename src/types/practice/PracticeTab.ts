// src/types/practice/PracticeTab.ts
import { PracticeStep } from './PracticeStep';

export type PracticeTab = {
    id: string;

    metadata: {
            title: string;
            artist: string;
            difficulty: Difficulty;
            bpm: number;
            timeSignature: {
                numerator: number;
                denominator: number;
            };
    };

    steps: PracticeStep[];
};

// Difficulty type
export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

