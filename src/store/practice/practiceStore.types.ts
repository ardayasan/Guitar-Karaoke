// src/store/practice/practiceStore.types.ts

import { PracticeTab } from '@/types/practice/PracticeTab';
import { PracticeStep } from '@/types/practice/PracticeStep';

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
    currentStepIndex: number;
    currentStep: PracticeStep | null;

    lastDetectedNote: { name: string; octave: number } | null;
    stats: PracticeStats;

    /* ---------- Actions ---------- */
    startPractice: (tab: PracticeTab) => void;
    pausePractice: () => void;
    resumePractice: () => void;
    stopPractice: () => void;

    updateTime: (time: number) => void;
    setDetectedNote: (note: { name: string; octave: number } | null) => void;

    advanceStep: () => void;

    markCorrect: () => void;
    markIncorrect: () => void;
    markMissed: () => void;

    resetPractice: () => void;
}
