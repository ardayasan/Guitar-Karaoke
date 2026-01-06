// src/store/practice/practice.store.ts
//
// Input-driven practice store - NO BPM timing

import { create } from 'zustand';
import { PracticeState, PracticeStats } from './practiceStore.types';
import { PracticeTab } from '@/types/practice/PracticeTab';
import { prepareSteps, PreparedStep } from '@/utils/practice/hydrateStepTiming';

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

  tab: null,
  hydratedSteps: [],
  currentStepIndex: 0,
  currentStep: null,

  lastDetectedNote: null,
  lastDetectedChord: null,
  stats: { ...initialStats },

  /* ---------- Actions ---------- */

  startPractice: (tab: PracticeTab) => {
    // Prepare steps with indexing (no timing)
    const hydratedSteps = prepareSteps(tab.steps);
    const firstStep = hydratedSteps[0] ?? null;

    set({
      isActive: true,
      isPaused: false,
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

  resumePractice: () => {
    const { hydratedSteps, currentStepIndex } = get();

    // Reset current step to pending on resume
    if (currentStepIndex < hydratedSteps.length) {
      const updatedSteps = [...hydratedSteps];
      updatedSteps[currentStepIndex] = {
        ...updatedSteps[currentStepIndex],
        result: 'pending'
      };

      set({
        isPaused: false,
        hydratedSteps: updatedSteps,
        currentStep: updatedSteps[currentStepIndex],
      });
    } else {
      set({ isPaused: false });
    }
  },

  stopPractice: () =>
    set({
      isActive: false,
      isPaused: false,
      tab: null,
      hydratedSteps: [],
      currentStepIndex: 0,
      currentStep: null,
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
   * Mark current step correct and advance to next.
   * GUARD: Only executes if current step is pending (prevents double-evaluation)
   */
  markCorrectAndAdvance: () => {
    const { hydratedSteps, currentStepIndex, stats } = get();

    // Guard: bounds check
    if (currentStepIndex >= hydratedSteps.length) return;

    // Guard: only if not already marked correct (allow recovery from incorrect)
    const currentStep = hydratedSteps[currentStepIndex];
    if (currentStep.result === 'correct') return;

    // Mark current step as correct
    const updatedSteps = [...hydratedSteps];
    updatedSteps[currentStepIndex] = {
      ...updatedSteps[currentStepIndex],
      result: 'correct'
    };

    // Update stats
    const newStats = { ...stats };
    newStats.correct++;
    newStats.currentStreak++;
    newStats.longestStreak = Math.max(newStats.longestStreak, newStats.currentStreak);
    const evaluated = newStats.correct + newStats.incorrect + newStats.missed;
    newStats.accuracy = evaluated > 0 ? (newStats.correct / evaluated) * 100 : 0;

    // Advance to next step
    const nextIndex = currentStepIndex + 1;
    const nextStep = updatedSteps[nextIndex] ?? null;


    set({
      hydratedSteps: updatedSteps,
      currentStepIndex: nextIndex,
      currentStep: nextStep,
      stats: newStats,
    });
  },

  /**
   * Mark current step incorrect and pause practice.
   * User must manually resume.
   */
  markIncorrectAndPause: () => {
    const { hydratedSteps, currentStepIndex, stats } = get();

    if (currentStepIndex >= hydratedSteps.length) return;

    // Mark current step as incorrect
    const updatedSteps = [...hydratedSteps];
    updatedSteps[currentStepIndex] = {
      ...updatedSteps[currentStepIndex],
      result: 'incorrect'
    };

    // Update stats
    const newStats = { ...stats };
    newStats.incorrect++;
    newStats.currentStreak = 0;
    const evaluated = newStats.correct + newStats.incorrect + newStats.missed;
    newStats.accuracy = evaluated > 0 ? (newStats.correct / evaluated) * 100 : 0;

    set({
      hydratedSteps: updatedSteps,
      currentStep: updatedSteps[currentStepIndex],
      isPaused: true,
      stats: newStats,
    });
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
    const { hydratedSteps, currentStepIndex } = get();

    const nextIndex = currentStepIndex + 1;
    const nextStep = hydratedSteps[nextIndex] ?? null;

    set({
      currentStepIndex: nextIndex,
      currentStep: nextStep,
    });
  },

  resetPractice: () =>
    set({
      isActive: false,
      isPaused: false,
      tab: null,
      hydratedSteps: [],
      currentStepIndex: 0,
      currentStep: null,
      lastDetectedNote: null,
      lastDetectedChord: null,
      stats: { ...initialStats },
    }),
}));
