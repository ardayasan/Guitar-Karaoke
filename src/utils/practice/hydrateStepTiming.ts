// src/utils/practice/hydrateStepTiming.ts
//
// Pure function that calculates BPM-based timing for each practice step.
// Called when starting a practice session.

import { PracticeStep } from '@/types/practice/PracticeStep';

export type HydratedStep = PracticeStep & {
    index: number;
    startTimeMs: number;
    endTimeMs: number;
    result: 'correct' | 'incorrect' | 'missed' | 'pending';
};

/**
 * Hydrates practice steps with BPM-based timing information.
 * 
 * @param steps - Array of practice steps
 * @param bpm - Beats per minute (determines step duration)
 * @returns Steps with calculated timing and initial 'pending' result
 * 
 * @example
 * // At 100 BPM, each step = 600ms (60000 / 100)
 * const steps = hydrateStepTiming(rawSteps, 100);
 * // steps[0]: { ...step, startTimeMs: 0, endTimeMs: 600 }
 * // steps[1]: { ...step, startTimeMs: 600, endTimeMs: 1200 }
 */
export function hydrateStepTiming(
    steps: PracticeStep[],
    bpm: number
): HydratedStep[] {
    // Quarter note duration in milliseconds
    // 60000ms = 1 minute, divided by BPM gives ms per beat
    const stepDurationMs = 60000 / bpm;

    return steps.map((step, index) => ({
        ...step,
        index,
        startTimeMs: index * stepDurationMs,
        endTimeMs: (index + 1) * stepDurationMs,
        result: 'pending' as const,
    }));
}

/**
 * Finds the step that should be active at a given elapsed time.
 * 
 * @param steps - Hydrated steps with timing
 * @param elapsedMs - Time elapsed since practice start
 * @returns The current step, or null if past all steps
 */
export function findStepForTime(
    steps: HydratedStep[],
    elapsedMs: number
): HydratedStep | null {
    for (const step of steps) {
        if (elapsedMs >= step.startTimeMs && elapsedMs < step.endTimeMs) {
            return step;
        }
    }
    return null;
}

/**
 * Calculates total practice duration based on steps and BPM.
 * 
 * @param stepCount - Number of steps
 * @param bpm - Beats per minute
 * @returns Total duration in milliseconds
 */
export function calculatePracticeDuration(
    stepCount: number,
    bpm: number
): number {
    const stepDurationMs = 60000 / bpm;
    return stepCount * stepDurationMs;
}
