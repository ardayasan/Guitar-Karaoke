// src/store/practice/practice.store.ts

import { create } from 'zustand';
import { PracticeState, PracticeStats } from './practiceStore.types';
import { PracticeTab } from '@/types/practice/PracticeTab';
import { PracticeStep } from '@/types/practice/PracticeStep';

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
  currentStepIndex: 0,
  currentStep: null,

  lastDetectedNote: null,
  stats: { ...initialStats },

  /* ---------- Actions ---------- */

  startPractice: (tab: PracticeTab) => {
    const firstStep = tab.steps[0] ?? null;

    set({
      isActive: true,
      isPaused: false,
      startTime: Date.now(),
      currentTime: 0,
      tab,
      currentStepIndex: 0,
      currentStep: firstStep,
      stats: { ...initialStats },
      lastDetectedNote: null,
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

  advanceStep: () => {
    const { tab, currentStepIndex, stats } = get();
    if (!tab) return;

    const nextIndex = currentStepIndex + 1;
    const nextStep = tab.steps[nextIndex] ?? null;

    set({
      currentStepIndex: nextIndex,
      currentStep: nextStep,
      stats: {
        ...stats,
        totalSteps: stats.totalSteps + 1,
      },
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
      stats.accuracy =
        (stats.correct / Math.max(stats.totalSteps, 1)) * 100;

      return { stats };
    }),

  markIncorrect: () =>
    set((state) => {
      const stats = { ...state.stats };

      stats.incorrect++;
      stats.currentStreak = 0;
      stats.accuracy =
        (stats.correct / Math.max(stats.totalSteps, 1)) * 100;

      return { stats };
    }),

  markMissed: () =>
    set((state) => {
      const stats = { ...state.stats };

      stats.missed++;
      stats.currentStreak = 0;
      stats.accuracy =
        (stats.correct / Math.max(stats.totalSteps, 1)) * 100;

      return { stats };
    }),

  resetPractice: () =>
    set({
      isActive: false,
      isPaused: false,
      startTime: null,
      currentTime: 0,
      tab: null,
      currentStepIndex: 0,
      currentStep: null,
      lastDetectedNote: null,
      stats: { ...initialStats },
    }),
}));
