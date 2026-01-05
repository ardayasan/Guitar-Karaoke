// src/store/practice/practice.store.ts

import { create } from 'zustand';
import { PracticeState, PracticeStats } from './practiceStore.types';
import { PracticeTab } from '@/types/practice/PracticeTab';
import {
  hydrateStepTiming,
  HydratedStep,
  findStepForTime
} from '@/utils/practice/hydrateStepTiming';

const initialStats: PracticeStats = {
  totalSteps: 0,
  correct: 0,
  incorrect: 0,
  missed: 0,
  currentStreak: 0,
  longestStreak: 0,
  accuracy: 0,
};

export const usePracticeStore = create<PracticeState>((set, get) => ({
  /* ---------- Initial state ---------- */
  isActive: false,
  isPaused: false,
  startTime: null,
  currentTime: 0,

  tab: null,
  hydratedSteps: [],
  currentStepIndex: 0,
  currentStep: null,

  lastDetectedNote: null,
  lastDetectedChord: null,
  stats: { ...initialStats },

  /* ---------- Actions ---------- */

  startPractice: (tab: PracticeTab) => {
    // Hydrate steps with BPM-based timing
    const hydratedSteps = hydrateStepTiming(tab.steps, tab.metadata.bpm);
    const firstStep = hydratedSteps[0] ?? null;

    set({
      isActive: true,
      isPaused: false,
      startTime: Date.now(),
      currentTime: 0,
      tab,
      hydratedSteps,
      currentStepIndex: 0,
      currentStep: firstStep,
      stats: {
        ...initialStats,
        totalSteps: hydratedSteps.length,
      },
      lastDetectedNote: null,
      lastDetectedChord: null,
    });
  },

  pausePractice: () =>
    set({
      isPaused: true,
    }),

  resumePractice: () =>
    set({
      isPaused: false,
    }),

  stopPractice: () =>
    set({
      isActive: false,
      isPaused: false,
      tab: null,
      hydratedSteps: [],
      currentStepIndex: 0,
      currentStep: null,
    }),

  updateTime: (time: number) =>
    set({
      currentTime: time,
    }),

  setDetectedNote: (note: { name: string; octave: number } | null) =>
    set({
      lastDetectedNote: note,
    }),

  setDetectedChord: (chord: { root: string; type: string } | null) =>
    set({
      lastDetectedChord: chord,
    }),

  /**
   * Find and set the current step based on elapsed time.
   * BPM-driven progression - no detection required to advance.
   */
  setCurrentStepByTime: (elapsedMs: number) => {
    const { hydratedSteps, currentStepIndex } = get();

    const step = findStepForTime(hydratedSteps, elapsedMs);

    if (step && step.index !== currentStepIndex) {
      set({
        currentStepIndex: step.index,
        currentStep: step,
      });
    }
  },

  /**
   * Mark a specific step with a result and update stats.
   */
  setStepResult: (index: number, result: 'correct' | 'incorrect' | 'missed') => {
    const { hydratedSteps, stats } = get();

    if (index < 0 || index >= hydratedSteps.length) return;

    // Update the step result
    const updatedSteps = [...hydratedSteps];
    updatedSteps[index] = { ...updatedSteps[index], result };

    // Update stats
    const newStats = { ...stats };

    if (result === 'correct') {
      newStats.correct++;
      newStats.currentStreak++;
      newStats.longestStreak = Math.max(newStats.longestStreak, newStats.currentStreak);
    } else if (result === 'incorrect') {
      newStats.incorrect++;
      newStats.currentStreak = 0;
    } else if (result === 'missed') {
      newStats.missed++;
      newStats.currentStreak = 0;
    }

    // Recalculate accuracy
    const evaluated = newStats.correct + newStats.incorrect + newStats.missed;
    newStats.accuracy = evaluated > 0
      ? (newStats.correct / evaluated) * 100
      : 0;

    set({
      hydratedSteps: updatedSteps,
      stats: newStats,
    });
  },

  advanceStep: () => {
    const { hydratedSteps, currentStepIndex, stats } = get();

    const nextIndex = currentStepIndex + 1;
    const nextStep = hydratedSteps[nextIndex] ?? null;

    set({
      currentStepIndex: nextIndex,
      currentStep: nextStep,
    });
  },

  markCorrect: () =>
    set((state) => {
      const stats = { ...state.stats };

      stats.correct++;
      stats.currentStreak++;
      stats.longestStreak = Math.max(
        stats.longestStreak,
        stats.currentStreak
      );

      const evaluated = stats.correct + stats.incorrect + stats.missed;
      stats.accuracy = evaluated > 0
        ? (stats.correct / evaluated) * 100
        : 0;

      return { stats };
    }),

  markIncorrect: () =>
    set((state) => {
      const stats = { ...state.stats };

      stats.incorrect++;
      stats.currentStreak = 0;

      const evaluated = stats.correct + stats.incorrect + stats.missed;
      stats.accuracy = evaluated > 0
        ? (stats.correct / evaluated) * 100
        : 0;

      return { stats };
    }),

  markMissed: () =>
    set((state) => {
      const stats = { ...state.stats };

      stats.missed++;
      stats.currentStreak = 0;

      const evaluated = stats.correct + stats.incorrect + stats.missed;
      stats.accuracy = evaluated > 0
        ? (stats.correct / evaluated) * 100
        : 0;

      return { stats };
    }),

  resetPractice: () =>
    set({
      isActive: false,
      isPaused: false,
      startTime: null,
      currentTime: 0,
      tab: null,
      hydratedSteps: [],
      currentStepIndex: 0,
      currentStep: null,
      lastDetectedNote: null,
      lastDetectedChord: null,
      stats: { ...initialStats },
    }),
}));
