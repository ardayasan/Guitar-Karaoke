// src/store/practice/practiceStore.types.ts

import { PracticeTab } from '@/types/practice/PracticeTab';
import { PracticeStep } from '@/types/practice/PracticeStep';
import { HydratedStep } from '@/utils/practice/hydrateStepTiming';

export interface PracticeStats {
    totalSteps: number;
    correct: number;
    incorrect: number;
    missed: number;
    currentStreak: number;
    longestStreak: number;
    accuracy: number;
}

export interface PracticeState {
    /* ---------- State ---------- */
    isActive: boolean;
    isPaused: boolean;
    startTime: number | null;
    currentTime: number;

    tab: PracticeTab | null;

    /** BPM-hydrated steps with timing info */
    hydratedSteps: HydratedStep[];

    currentStepIndex: number;
    currentStep: HydratedStep | null;

    lastDetectedNote: { name: string; octave: number } | null;
    lastDetectedChord: { root: string; type: string } | null;

    stats: PracticeStats;

    /* ---------- Actions ---------- */
    startPractice: (tab: PracticeTab) => void;
    pausePractice: () => void;
    resumePractice: () => void;
    stopPractice: () => void;

    updateTime: (time: number) => void;
    setDetectedNote: (note: { name: string; octave: number } | null) => void;
    setDetectedChord: (chord: { root: string; type: string } | null) => void;

    /** Set the current step index based on elapsed time */
    setCurrentStepByTime: (elapsedMs: number) => void;

    /** Mark a specific step with a result */
    setStepResult: (index: number, result: 'correct' | 'incorrect' | 'missed') => void;

    advanceStep: () => void;

    markCorrect: () => void;
    markIncorrect: () => void;
    markMissed: () => void;

    resetPractice: () => void;
}

