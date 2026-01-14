// src/store/practice/practice.store.ts
//
// SIMPLIFIED COUNTER LOGIC:
// - Counting happens ONLY in advanceAndCount()
// - setStepResult is for UI only (no counter updates)
// - Each step is counted exactly once when advancing to next step
// - correct + incorrect always equals totalSteps at the end

import { create } from "zustand";
import { PracticeState, PracticeStats, TimingStats } from "./practiceStore.types";
import { PracticeTab } from "@/types/practice/PracticeTab";
import { prepareSteps } from "@/utils/practice/hydrateStepTiming";

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

function recalcAccuracy(stats: PracticeStats) {
  const evaluated = stats.correct + stats.incorrect + stats.missed;
  return evaluated > 0 ? (stats.correct / evaluated) * 100 : 0;
}

export const usePracticeStore = create<PracticeState>((set, get) => ({
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

  startPractice: (tab: PracticeTab) => {
    const hydratedSteps = prepareSteps(tab.steps);
    const firstStep = hydratedSteps[0] ?? null;

    const beatsPerSecond = tab.metadata.bpm / 60;
    const expectedDurationMs = (hydratedSteps.length / beatsPerSecond) * 1000;

    set({
      isActive: true,
      isPaused: false,
      tab,
      hydratedSteps,
      currentStepIndex: 0,
      currentStep: firstStep,
      stats: { ...initialStats, totalSteps: hydratedSteps.length },
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

  pausePractice: () => set({ isPaused: true }),

  resumePractice: () => {
    const { hydratedSteps, currentStepIndex } = get();

    if (currentStepIndex < hydratedSteps.length) {
      const updatedSteps = [...hydratedSteps];
      // Reset result to pending for retry, but keep counted flag as-is
      updatedSteps[currentStepIndex] = {
        ...updatedSteps[currentStepIndex],
        result: "pending",
      };

      set({
        isPaused: false,
        hydratedSteps: updatedSteps,
        currentStep: updatedSteps[currentStepIndex],
        lastDetectedNote: null,
        lastDetectedChord: null,
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
      lastDetectedNote: null,
      lastDetectedChord: null,
    }),

  setDetectedNote: (note) =>
    set({
      lastDetectedNote: note,
      lastDetectedChord: null,
    }),

  setDetectedChord: (chord) =>
    set({
      lastDetectedChord: chord,
      lastDetectedNote: null,
    }),

  /**
   * CORE COUNTING LOGIC - This is the ONLY place where stats are updated!
   * 
   * When advancing to next step:
   * - If step was NOT counted yet:
   *   - hadError === false → correct++ (step was never incorrect)
   *   - hadError === true → incorrect++ (step had at least one error)
   * - Mark step as counted
   * - Move to next step
   * 
   * This ensures: correct + incorrect = totalSteps (at completion)
   */
  markCorrectAndAdvance: () => {
    const { hydratedSteps, currentStepIndex, stats } = get();
    if (currentStepIndex >= hydratedSteps.length) return;

    const updatedSteps = [...hydratedSteps];
    const current = updatedSteps[currentStepIndex];
    const newStats = { ...stats };

    // Count this step if not already counted
    if (!current.counted) {
      // Use hadError flag to determine counting:
      // - If step never had an error (hadError=false) → count as correct
      // - If step had any error (hadError=true) → count as incorrect
      if (!current.hadError) {
        newStats.correct++;
        newStats.currentStreak++;
        newStats.longestStreak = Math.max(newStats.longestStreak, newStats.currentStreak);
      } else {
        newStats.incorrect++;
        newStats.currentStreak = 0;
      }
      newStats.accuracy = recalcAccuracy(newStats);

      // Mark as counted and finalize result visually as correct (user did complete it)
      updatedSteps[currentStepIndex] = {
        ...current,
        result: "correct",
        counted: true,
      };
    } else {
      // Already counted, just update UI result
      updatedSteps[currentStepIndex] = {
        ...current,
        result: "correct",
      };
    }

    const nextIndex = currentStepIndex + 1;
    const next = updatedSteps[nextIndex] ?? null;

    // Ensure next step starts fresh (not counted, pending, no errors)
    if (next) {
      updatedSteps[nextIndex] = {
        ...next,
        result: "pending",
        counted: false,
        hadError: false,
      };
    }

    set({
      hydratedSteps: updatedSteps,
      currentStepIndex: nextIndex,
      currentStep: updatedSteps[nextIndex] ?? null,
      stats: newStats,
      lastDetectedNote: null,
      lastDetectedChord: null,
    });
  },

  /**
   * Mark step as incorrect and pause - but NO counting here!
   * Counting only happens when advancing to next step.
   * This just sets the visual state and pauses.
   */
  markIncorrectAndPause: () => {
    const { hydratedSteps, currentStepIndex } = get();
    if (currentStepIndex >= hydratedSteps.length) return;

    const updatedSteps = [...hydratedSteps];
    const step = updatedSteps[currentStepIndex];

    // Just update visual state + set hadError flag, no counting
    updatedSteps[currentStepIndex] = {
      ...step,
      result: "incorrect",
      hadError: true,
    };

    set({
      hydratedSteps: updatedSteps,
      currentStep: updatedSteps[currentStepIndex],
      isPaused: true,
      lastDetectedNote: null,
      lastDetectedChord: null,
    });
  },

  /**
   * Set step result - UI ONLY, no counting!
   * This updates the visual feedback (correct/incorrect highlight).
   * Actual counting happens only in markCorrectAndAdvance.
   * When setting to "incorrect", also sets hadError=true (sticky).
   */
  setStepResult: (index, result) => {
    const { hydratedSteps } = get();
    if (index < 0 || index >= hydratedSteps.length) return;

    const updatedSteps = [...hydratedSteps];
    const step = updatedSteps[index];

    // Skip if already same result
    if (step.result === result) return;

    // Update visual result. If incorrect, also set hadError flag (sticky)
    updatedSteps[index] = {
      ...step,
      result,
      hadError: result === "incorrect" ? true : step.hadError,
    };

    set({
      hydratedSteps: updatedSteps,
      currentStep: index === get().currentStepIndex ? updatedSteps[index] : get().currentStep,
    });
  },

  /**
   * Advance step manually (SKIP).
   * This does NOT update stats - skipped steps are not counted.
   */
  advanceStep: () => {
    const { hydratedSteps, currentStepIndex } = get();
    const nextIndex = currentStepIndex + 1;

    const updatedSteps = [...hydratedSteps];
    const next = updatedSteps[nextIndex] ?? null;

    if (next) {
      updatedSteps[nextIndex] = {
        ...next,
        result: "pending",
        counted: false,
        hadError: false,
      };
    }

    set({
      hydratedSteps: updatedSteps,
      currentStepIndex: nextIndex,
      currentStep: updatedSteps[nextIndex] ?? null,
      lastDetectedNote: null,
      lastDetectedChord: null,
    });
  },

  updateElapsedTime: (elapsedMs) => {
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

    let speedFeedback: "faster" | "slower" | "on-time" | null = null;

    const tolerance = expectedMs * 0.1;
    if (elapsedMs > expectedMs + tolerance) speedFeedback = "slower";
    else if (elapsedMs < expectedMs - tolerance) speedFeedback = "faster";
    else speedFeedback = "on-time";

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
