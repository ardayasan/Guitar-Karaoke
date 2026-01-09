// src/utils/practice/hydrateStepTiming.ts
//
// Simple step preparation (no BPM timing - input-driven progression)

import { PracticeStep } from '@/types/practice/PracticeStep';

export type PreparedStep = PracticeStep & {
    index: number;
    result: 'correct' | 'incorrect' | 'missed' | 'pending';
};

// Re-export for backwards compatibility
export type HydratedStep = PreparedStep;

/**
 * Prepares practice steps with indexing and initial result state.
 * No BPM-based timing - progression is purely input-driven.
 * 
 * @param steps - Array of practice steps
 * @returns Steps with index and 'pending' result
 */
export function prepareSteps(steps: PracticeStep[]): PreparedStep[] {
    return steps.map((step, index) => ({
        ...step,
        index,
        result: 'pending' as const,
    }));
}

// Legacy alias for compatibility
export function hydrateStepTiming(
    steps: PracticeStep[],
    _bpm: number  // BPM ignored - kept for API compatibility
): PreparedStep[] {
    return prepareSteps(steps);
}

// Removed: findStepForTime (no longer needed)
// Removed: calculatePracticeDuration (no longer needed)
