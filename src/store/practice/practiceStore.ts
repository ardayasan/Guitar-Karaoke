// src/store/practice/practice.store.ts
//
// Input-driven practice store with timing

import { create } from 'zustand';
import { PracticeState, PracticeStats, TimingStats } from './practiceStore.types';
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

const initialTimingStats: TimingStats = {
  startTime: null,
  elapsedMs: 0,
  expectedDurationMs: 0,
  isOvertime: false,
  previousAttemptMs: null,
  speedFeedback: null,
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
  timingStats: { ...initialTimingStats },

  /* ---------- Actions ---------- */

  startPractice: (tab: PracticeTab) => {
    // Prepare steps with indexing
    const hydratedSteps = prepareSteps(tab.steps);
    const firstStep = hydratedSteps[0] ?? null;

    // Calculate expected duration based on BPM and step count
    // Assumption: each step takes one beat
    const beatsPerSecond = tab.metadata.bpm / 60;
    const expectedDurationMs = (hydratedSteps.length / beatsPerSecond) * 1000;

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
      timingStats: {
        startTime: Date.now(),
        elapsedMs: 0,
        expectedDurationMs,
        isOvertime: false,
        previousAttemptMs: get().timingStats.elapsedMs || null,
        speedFeedback: null,
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
   * GUARD: Only executes if current step is pending or incorrect (prevents double-evaluation)
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
    const wasIncorrect = currentStep.result === 'incorrect';
    updatedSteps[currentStepIndex] = {
      ...updatedSteps[currentStepIndex],
      result: 'correct'
    };

    // Update stats
    const newStats = { ...stats };
    newStats.correct++;

    // If this step was previously marked incorrect, count it in stats
    if (wasIncorrect) {
      newStats.incorrect++;
      newStats.currentStreak = 0; // Reset streak due to earlier mistake
    } else {
      newStats.currentStreak++;
      newStats.longestStreak = Math.max(newStats.longestStreak, newStats.currentStreak);
    }

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
   * Mark a specific step with a result (does NOT update stats).
   * This is used for visual feedback only - stats are updated when advancing.
   */
  setStepResult: (index: number, result: 'correct' | 'incorrect' | 'missed') => {
    const { hydratedSteps } = get();

    if (index < 0 || index >= hydratedSteps.length) return;

    // Only update the step result visually
    const updatedSteps = [...hydratedSteps];
    const previousResult = updatedSteps[index].result;
    updatedSteps[index] = { ...updatedSteps[index], result };

    set({
      hydratedSteps: updatedSteps,
      currentStep: index === get().currentStepIndex ? updatedSteps[index] : get().currentStep,
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

  updateElapsedTime: (elapsedMs: number) => {
    const { timingStats } = get();
    const isOvertime = elapsedMs > timingStats.expectedDurationMs;

    set({
      timingStats: {
        ...timingStats,
        elapsedMs,
        isOvertime,
      },
    });
  },

  completePractice: () => {
    const { timingStats } = get();
    const elapsedMs = timingStats.elapsedMs;
    const expectedMs = timingStats.expectedDurationMs;
    const previousMs = timingStats.previousAttemptMs;

    let speedFeedback: 'faster' | 'slower' | 'on-time' | null = null;

    // Determine speed feedback
    const tolerance = expectedMs * 0.1; // 10% tolerance
    if (elapsedMs > expectedMs + tolerance) {
      speedFeedback = 'slower';
    } else if (elapsedMs < expectedMs - tolerance) {
      speedFeedback = 'faster';
    } else {
      speedFeedback = 'on-time';
    }

    set({
      timingStats: {
        ...timingStats,
        speedFeedback,
      },
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
      timingStats: { ...initialTimingStats },
    }),
}));
