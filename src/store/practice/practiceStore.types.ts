// src/store/practice/practiceStore.types.ts

import { PracticeTab } from '@/types/practice/PracticeTab';
import { PreparedStep } from '@/utils/practice/hydrateStepTiming';

// Re-export for backwards compatibility
export type HydratedStep = PreparedStep;

export interface PracticeStats {
    totalSteps: number;
    correct: number;
    incorrect: number;
    missed: number;
    currentStreak: number;
    longestStreak: number;
    accuracy: number;
}

export interface TimingStats {
    startTime: number | null;
    elapsedMs: number;
    expectedDurationMs: number;
    isOvertime: boolean;
    previousAttemptMs: number | null;
    speedFeedback: 'faster' | 'slower' | 'on-time' | null;
}

export interface PracticeState {
    /* ---------- State ---------- */
    isActive: boolean;
    isPaused: boolean;

    tab: PracticeTab | null;

    /** Prepared steps with index and result */
    hydratedSteps: PreparedStep[];

    currentStepIndex: number;
    currentStep: PreparedStep | null;

    lastDetectedNote: { name: string; octave: number } | null;
    lastDetectedChord: { root: string; type: string } | null;

    stats: PracticeStats;
    timingStats: TimingStats;

    /* ---------- Actions ---------- */
    startPractice: (tab: PracticeTab) => void;
    pausePractice: () => void;
    resumePractice: () => void;
    stopPractice: () => void;

    setDetectedNote: (note: { name: string; octave: number } | null) => void;
    setDetectedChord: (chord: { root: string; type: string } | null) => void;

    /** Mark current step correct and advance to next (input-driven) */
    markCorrectAndAdvance: () => void;

    /** Mark current step incorrect and pause practice */
    markIncorrectAndPause: () => void;

    /** Mark a specific step with a result */
    setStepResult: (index: number, result: 'correct' | 'incorrect' | 'missed') => void;

    advanceStep: () => void;

    /** Update elapsed time */
    updateElapsedTime: (elapsedMs: number) => void;

    /** Complete practice session with timing feedback */
    completePractice: () => void;

    resetPractice: () => void;
}
