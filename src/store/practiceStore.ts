/**
 * Practice Session State Management
 * Manages real-time practice session state, detections, and feedback
 */

import { create } from 'zustand';
import { AudioDetection, PracticeFeedback, Note, Chord } from '@/types';

export interface PracticeState {
  // Session state
  isActive: boolean;
  isPaused: boolean;
  startTime: number | null;
  currentTime: number; // milliseconds from start of song

  // Current detection
  currentDetection: AudioDetection | null;
  lastDetectedNote: Note | null;

  // Feedback
  recentFeedback: PracticeFeedback[];
  currentFeedback: PracticeFeedback | null;

  // Statistics
  stats: {
    totalNotes: number;
    correctNotes: number;
    incorrectNotes: number;
    missedNotes: number;
    currentStreak: number;
    longestStreak: number;
    averageAccuracy: number; // 0-100
  };

  // Actions
  startSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => void;
  updateCurrentTime: (time: number) => void;
  setCurrentDetection: (detection: AudioDetection | null) => void;
  addFeedback: (feedback: PracticeFeedback) => void;
  clearFeedback: () => void;
  resetStats: () => void;
  reset: () => void;
}

const initialStats = {
  totalNotes: 0,
  correctNotes: 0,
  incorrectNotes: 0,
  missedNotes: 0,
  currentStreak: 0,
  longestStreak: 0,
  averageAccuracy: 0,
};

export const usePracticeStore = create<PracticeState>((set, get) => ({
  // Initial state
  isActive: false,
  isPaused: false,
  startTime: null,
  currentTime: 0,
  currentDetection: null,
  lastDetectedNote: null,
  recentFeedback: [],
  currentFeedback: null,
  stats: { ...initialStats },

  // Actions
  startSession: () =>
    set({
      isActive: true,
      isPaused: false,
      startTime: Date.now(),
      currentTime: 0,
      stats: { ...initialStats },
      recentFeedback: [],
      currentFeedback: null,
    }),

  pauseSession: () =>
    set({
      isPaused: true,
    }),

  resumeSession: () =>
    set({
      isPaused: false,
    }),

  endSession: () =>
    set({
      isActive: false,
      isPaused: false,
    }),

  updateCurrentTime: (time: number) =>
    set({
      currentTime: time,
    }),

  setCurrentDetection: (detection: AudioDetection | null) =>
    set({
      currentDetection: detection,
      lastDetectedNote: detection?.note || get().lastDetectedNote,
    }),

  addFeedback: (feedback: PracticeFeedback) =>
    set((state) => {
      const newStats = { ...state.stats };
      newStats.totalNotes++;

      if (feedback.type === 'correct') {
        newStats.correctNotes++;
        newStats.currentStreak++;
        if (newStats.currentStreak > newStats.longestStreak) {
          newStats.longestStreak = newStats.currentStreak;
        }
      } else if (feedback.type === 'incorrect') {
        newStats.incorrectNotes++;
        newStats.currentStreak = 0;
      } else if (feedback.type === 'missed') {
        newStats.missedNotes++;
        newStats.currentStreak = 0;
      }

      // Calculate average accuracy
      if (newStats.totalNotes > 0) {
        newStats.averageAccuracy = (newStats.correctNotes / newStats.totalNotes) * 100;
      }

      return {
        currentFeedback: feedback,
        recentFeedback: [...state.recentFeedback, feedback].slice(-50), // Keep last 50
        stats: newStats,
      };
    }),

  clearFeedback: () =>
    set({
      currentFeedback: null,
    }),

  resetStats: () =>
    set({
      stats: { ...initialStats },
      recentFeedback: [],
      currentFeedback: null,
    }),

  reset: () =>
    set({
      isActive: false,
      isPaused: false,
      startTime: null,
      currentTime: 0,
      currentDetection: null,
      lastDetectedNote: null,
      recentFeedback: [],
      currentFeedback: null,
      stats: { ...initialStats },
    }),
}));
