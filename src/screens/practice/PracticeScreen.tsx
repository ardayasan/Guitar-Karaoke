/**
 * Practice Screen
 * Strict step-by-step input-driven practice
 * 
 * FIXES:
 * - Only debounce after CORRECT (allow immediate re-tries on incorrect)
 * - Case-insensitive note comparison
 * - Clear debounce state when advancing
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "react-native-paper";

import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { RootStackParamList } from "@/navigation/types";
import { usePracticeStore } from "@/store";
import colors from "@/theme/colors";
import { AudioPipeline } from "@/services/audio/AudioPipeline";
import { MetronomeService } from "@/services/audio/MetronomeService";

// UI Components
import PracticeHeader from "./components/PracticeHeader";
import CurrentDetectionDisplayer from "./components/CurrentDetectionDisplayer";
import PracticeTabTimeline from "./components/PracticeTabTimeline";

/* ================================================= */

type PracticeScreenRouteProp = RouteProp<RootStackParamList, "Practice">;
type PracticeScreenNavigationProp =
  StackNavigationProp<RootStackParamList, "Practice">;

/* ================================================= */

// Debounce settings
const CORRECT_DEBOUNCE_MS = 500;  // After correct match
const INPUT_DEBOUNCE_MS = 300;    // Between any input processing
const ADVANCE_DELAY_MS = 600;     // Delay before advancing to next step after correct

export default function PracticeScreen() {
  const route = useRoute<PracticeScreenRouteProp>();
  const navigation = useNavigation<PracticeScreenNavigationProp>();
  const tab = route.params.tab;

  /* ---------- Audio pipeline ---------- */
  const pipelineRef = useRef<AudioPipeline | null>(null);
  const metronomeRef = useRef<MetronomeService | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const advanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ---------- Debounce refs ---------- */
  // Track the step index where we last had a correct match
  const lastCorrectStepRef = useRef<number>(-1);
  const lastCorrectTimeRef = useRef<number>(0);

  // Track last input time to prevent rapid re-processing
  const lastInputTimeRef = useRef<number>(0);
  const lastDetectedValueRef = useRef<string>('');

  /* ---------- Store (for rendering) ---------- */
  const {
    currentStep,
    currentStepIndex,
    hydratedSteps,
    lastDetectedNote,
    lastDetectedChord,
    stats,
    timingStats,
    startPractice,
    stopPractice,
    resetPractice,
    updateElapsedTime,
    completePractice,
  } = usePracticeStore();

  const [isListening, setIsListening] = useState(false);
  const [debugMsg, setDebugMsg] = useState<string>("");
  const [isMetronomeOn, setIsMetronomeOn] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  /* ================================================= */
  /* INIT + CLEANUP                                   */
  /* ================================================= */
  useEffect(() => {
    startPractice(tab);
    pipelineRef.current = new AudioPipeline();
    metronomeRef.current = new MetronomeService();

    return () => {
      pipelineRef.current?.stop();
      pipelineRef.current = null;
      metronomeRef.current?.destroy();
      metronomeRef.current = null;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
        advanceTimeoutRef.current = null;
      }
      resetPractice();
    };
  }, [tab, startPractice, resetPractice]);

  /* ================================================= */
  /* TIMER                                             */
  /* ================================================= */
  useEffect(() => {
    if (!isListening || !timingStats.startTime) {
      return;
    }

    // Update elapsed time every 100ms
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - (timingStats.startTime || now);
      updateElapsedTime(elapsed);
    }, 100);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isListening, timingStats.startTime, updateElapsedTime]);

  /* ================================================= */
  /* DETECTION HANDLER                                 */
  /* ================================================= */
  const handleDetection = useCallback((detection: any) => {
    if (!detection) return;

    // Get fresh state
    const state = usePracticeStore.getState();
    const {
      isActive,
      currentStep: step,
      currentStepIndex: stepIdx,
      setDetectedNote,
      setDetectedChord,
      markCorrectAndAdvance,
      setStepResult,
      advanceStep,
    } = state;

    // Guards
    if (!isActive || !step) return;
    if (step.result === 'correct') return;

    const now = Date.now();

    // Skip rest steps
    if (step.type === 'rest') {
      advanceStep();
      return;
    }

    /* ===== NOTE DETECTION ===== */
    if (detection.note && step.type === 'note') {
      const detectedName = String(detection.note.name).toUpperCase().trim();
      const detectedOctave = detection.note.octave;
      const detectedValue = `${detectedName}${detectedOctave}`;

      // General input debounce: prevent processing same note too rapidly
      if (
        detectedValue === lastDetectedValueRef.current &&
        now - lastInputTimeRef.current < INPUT_DEBOUNCE_MS
      ) {
        return; // Skip - same note detected too soon
      }

      setDetectedNote({ name: detectedName, octave: detectedOctave });

      const expectedName = String(step.note.name).toUpperCase().trim();

      // Case-insensitive name comparison (octave tolerant)
      const isCorrect = detectedName === expectedName;

      // Debug
      setDebugMsg(`Exp: "${expectedName}" | Det: "${detectedName}" | Match: ${isCorrect}`);

      if (isCorrect) {
        // Check debounce only for correct matches
        if (
          stepIdx === lastCorrectStepRef.current &&
          now - lastCorrectTimeRef.current < CORRECT_DEBOUNCE_MS
        ) {
          return; // Skip - already processed this step as correct
        }

        // Mark correct and advance after delay
        lastCorrectStepRef.current = stepIdx;
        lastCorrectTimeRef.current = now;
        lastInputTimeRef.current = now;
        lastDetectedValueRef.current = detectedValue;

        // Clear any existing advance timeout
        if (advanceTimeoutRef.current) {
          clearTimeout(advanceTimeoutRef.current);
        }

        // Mark correct immediately for visual feedback
        setStepResult(stepIdx, 'correct');

        // Advance after delay to give user time to see green
        advanceTimeoutRef.current = setTimeout(() => {
          markCorrectAndAdvance();
        }, ADVANCE_DELAY_MS);
      } else {
        // Incorrect - mark red with debounce to prevent spam
        lastInputTimeRef.current = now;
        lastDetectedValueRef.current = detectedValue;
        if (step.result !== 'incorrect') {
          setStepResult(stepIdx, 'incorrect');
        }
      }
      return;
    }

    /* ===== CHORD DETECTION ===== */
    if (detection.chord && step.type === 'chord') {
      const detectedRoot = String(detection.chord.root).toUpperCase().trim();
      const detectedType = String(detection.chord.type || '').toLowerCase();
      const detectedValue = `${detectedRoot}${detectedType}`;

      // General input debounce: prevent processing same chord too rapidly
      if (
        detectedValue === lastDetectedValueRef.current &&
        now - lastInputTimeRef.current < INPUT_DEBOUNCE_MS
      ) {
        return; // Skip - same chord detected too soon
      }

      setDetectedChord({ root: detectedRoot, type: detectedType });

      const expectedChord = String(step.chordName).toUpperCase().trim();

      const isCorrect =
        expectedChord === detectedRoot ||
        expectedChord.startsWith(detectedRoot);

      if (isCorrect) {
        if (
          stepIdx === lastCorrectStepRef.current &&
          now - lastCorrectTimeRef.current < CORRECT_DEBOUNCE_MS
        ) {
          return;
        }

        lastCorrectStepRef.current = stepIdx;
        lastCorrectTimeRef.current = now;
        lastInputTimeRef.current = now;
        lastDetectedValueRef.current = detectedValue;

        // Clear any existing advance timeout
        if (advanceTimeoutRef.current) {
          clearTimeout(advanceTimeoutRef.current);
        }

        // Mark correct immediately for visual feedback
        setStepResult(stepIdx, 'correct');

        // Advance after delay to give user time to see green
        advanceTimeoutRef.current = setTimeout(() => {
          markCorrectAndAdvance();
        }, ADVANCE_DELAY_MS);
      } else {
        lastInputTimeRef.current = now;
        lastDetectedValueRef.current = detectedValue;
        if (step.result !== 'incorrect') {
          setStepResult(stepIdx, 'incorrect');
        }
      }
      return;
    }
  }, []);

  /* ================================================= */
  /* AUDIO CONTROLS                                   */
  /* ================================================= */
  const handleStartListening = () => {
    if (!pipelineRef.current) return;

    // If restarting after completion, reset the practice
    if (hasCompleted) {
      resetPractice();
      startPractice(tab);
      setHasCompleted(false);
    }

    lastCorrectStepRef.current = -1;
    lastCorrectTimeRef.current = 0;
    lastInputTimeRef.current = 0;
    lastDetectedValueRef.current = '';
    pipelineRef.current.start(handleDetection);
    setIsListening(true);
  };

  const handleStopListening = () => {
    pipelineRef.current?.stop();
    setIsListening(false);
    if (isMetronomeOn && metronomeRef.current) {
      metronomeRef.current.stop();
    }
  };

  const handleToggleMetronome = async () => {
    if (!metronomeRef.current) return;

    if (isMetronomeOn) {
      await metronomeRef.current.stop();
      setIsMetronomeOn(false);
    } else {
      await metronomeRef.current.start(tab.metadata.bpm);
      setIsMetronomeOn(true);
    }
  };

  const handleQuit = () => {
    handleStopListening();
    stopPractice();
    navigation.goBack();
  };

  /* ================================================= */
  /* DISPLAY HELPERS                                  */
  /* ================================================= */
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getDetectedText = () => {
    if (lastDetectedChord) {
      return `${lastDetectedChord.root}${lastDetectedChord.type === 'minor' ? 'm' : ''}`;
    }
    if (lastDetectedNote) {
      return `${lastDetectedNote.name}${lastDetectedNote.octave}`;
    }
    return "--";
  };

  const getExpectedText = () => {
    if (!currentStep) return "--";
    if (currentStep.type === 'note') {
      return `${currentStep.note.name}${currentStep.note.octave}`;
    }
    if (currentStep.type === 'chord') {
      return currentStep.chordName;
    }
    return "Rest";
  };

  const getFeedbackColor = (): "neutral" | "correct" | "incorrect" => {
    if (!currentStep) return "neutral";
    if (currentStep.result === 'correct') return "correct";
    if (currentStep.result === 'incorrect') return "incorrect";
    return "neutral";
  };

  const isComplete = currentStepIndex >= hydratedSteps.length;

  // Check for completion and provide feedback
  useEffect(() => {
    if (isComplete && isListening) {
      completePractice();
      handleStopListening();
      setHasCompleted(true);
    }
  }, [isComplete, isListening]);

  /* ================================================= */
  /* RENDER                                           */
  /* ================================================= */
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg.main }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <PracticeHeader
          title={tab.metadata.title}
          subtitle={tab.metadata.artist}
        />

        {/* Debug message */}
        {debugMsg ? (
          <View style={styles.debugBanner}>
            <Text style={styles.debugText}>{debugMsg}</Text>
          </View>
        ) : null}

        {/* Timer and BPM */}
        <View style={styles.timerContainer}>
          <View style={styles.timerBox}>
            <Text style={styles.timerLabel}>Time</Text>
            <Text style={styles.timerValue}>{formatTime(timingStats.elapsedMs)}</Text>
          </View>
          <View style={styles.timerBox}>
            <Text style={styles.timerLabel}>Expected</Text>
            <Text style={styles.timerValue}>{formatTime(timingStats.expectedDurationMs)}</Text>
          </View>
          <View style={styles.timerBox}>
            <Text style={styles.timerLabel}>BPM</Text>
            <Text style={styles.timerValue}>{tab.metadata.bpm}</Text>
          </View>
        </View>

        {/* Status */}
        {isComplete && (
          <View style={styles.completeBanner}>
            <Text style={styles.bannerText}>
              ✅ Complete! {timingStats.speedFeedback === 'slower' && '⏱️ Try to play faster next time!'}
              {timingStats.speedFeedback === 'faster' && '🎯 You played faster than expected!'}
              {timingStats.speedFeedback === 'on-time' && '🎵 Perfect timing!'}
            </Text>
          </View>
        )}

        {/* Detection Display */}
        <CurrentDetectionDisplayer
          value={getDetectedText()}
          kind={lastDetectedChord ? "chord" : lastDetectedNote ? "note" : "none"}
          feedbackColor={getFeedbackColor()}
        />

        {/* Expected indicator */}
        <View style={styles.expectedContainer}>
          <Text style={styles.expectedLabel}>Expected:</Text>
          <Text style={styles.expectedValue}>{getExpectedText()}</Text>
        </View>

        {/* Timeline */}
        <View style={styles.tabSection}>
          <PracticeTabTimeline
            tab={{ ...tab, steps: hydratedSteps }}
            windowSize={6}
            currentIndex={currentStepIndex}
          />
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.feedback.correct }]}>
              {stats.correct}
            </Text>
            <Text style={styles.statLabel}>Correct</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.feedback.incorrect }]}>
              {stats.incorrect}
            </Text>
            <Text style={styles.statLabel}>Wrong</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.accuracy.toFixed(0)}%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{currentStepIndex + 1}/{hydratedSteps.length}</Text>
            <Text style={styles.statLabel}>Step</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          {!isListening ? (
            <View style={styles.startBtn} onTouchEnd={handleStartListening}>
              <Text style={styles.startBtnText}>
                {hasCompleted ? '🔄 Restart' : '▶ Start'}
              </Text>
            </View>
          ) : (
            <View style={styles.listeningBtn}>
              <Text style={styles.listeningBtnText}>🎤 Listening...</Text>
            </View>
          )}
          <View
            style={[styles.metronomeBtn, isMetronomeOn && styles.metronomeBtnActive]}
            onTouchEnd={handleToggleMetronome}
          >
            <Text style={[styles.metronomeBtnText, isMetronomeOn && styles.metronomeBtnTextActive]}>
              {isMetronomeOn ? '🔊' : '🔇'} Metronome
            </Text>
          </View>
          <View style={styles.quitBtn} onTouchEnd={handleQuit}>
            <Text style={styles.quitBtnText}>Quit</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================================================= */
/* STYLES                                            */
/* ================================================= */

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
    backgroundColor: colors.bg.main,
  },
  tabSection: {
    width: "100%",
    marginVertical: 12,
  },
  debugBanner: {
    backgroundColor: 'rgba(255,255,0,0.2)',
    borderRadius: 6,
    padding: 6,
    marginVertical: 4,
  },
  debugText: {
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#ffff00',
  },
  completeBanner: {
    backgroundColor: 'rgba(83,255,154,0.2)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.feedback.correct,
    marginVertical: 8,
  },
  bannerText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  expectedContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    gap: 8,
  },
  expectedLabel: {
    fontSize: 14,
    color: colors.text.subtle,
  },
  expectedValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.utility.accent,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(36,0,56,0.5)',
    borderRadius: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 10,
    color: colors.text.subtle,
    textTransform: 'uppercase',
  },
  timerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(122,60,255,0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(199,125,255,0.3)',
  },
  timerBox: {
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 10,
    color: colors.text.subtle,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.utility.accent,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  startBtn: {
    backgroundColor: colors.brand.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 20,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  listeningBtn: {
    backgroundColor: 'rgba(83,255,154,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.feedback.correct,
  },
  listeningBtnText: {
    color: colors.feedback.correct,
    fontSize: 16,
    fontWeight: '700',
  },
  metronomeBtn: {
    backgroundColor: 'rgba(199,125,255,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(199,125,255,0.4)',
  },
  metronomeBtnActive: {
    backgroundColor: 'rgba(199,125,255,0.4)',
    borderColor: colors.utility.accent,
  },
  metronomeBtnText: {
    color: colors.text.subtle,
    fontSize: 14,
    fontWeight: '600',
  },
  metronomeBtnTextActive: {
    color: colors.utility.accent,
    fontWeight: '700',
  },
  quitBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  quitBtnText: {
    color: colors.text.subtle,
    fontSize: 14,
    fontWeight: '600',
  },
});
