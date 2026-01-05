/**
 * Practice Screen
 * Main UI for real-time BPM-driven practice session
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

// UI Components
import PracticeHeader from "./components/PracticeHeader";
import CurrentDetectionDisplayer from "./components/CurrentDetectionDisplayer";
import PracticeTabTimeline from "./components/PracticeTabTimeline";
import PracticeControls from "./components/PracticeControls";

/* ================================================= */

type PracticeScreenRouteProp = RouteProp<RootStackParamList, "Practice">;
type PracticeScreenNavigationProp =
  StackNavigationProp<RootStackParamList, "Practice">;

/* ================================================= */

// Tolerance for note matching (±100ms)
const TIMING_TOLERANCE_MS = 100;

export default function PracticeScreen() {
  const route = useRoute<PracticeScreenRouteProp>();
  const navigation = useNavigation<PracticeScreenNavigationProp>();
  const tab = route.params.tab;

  /* ---------- Audio pipeline (screen-local) ---------- */
  const pipelineRef = useRef<AudioPipeline | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---------- Store ---------- */
  const {
    currentStep,
    currentStepIndex,
    hydratedSteps,
    lastDetectedNote,
    lastDetectedChord,
    isPaused,
    isActive,
    stats,
    startPractice,
    pausePractice,
    resumePractice,
    stopPractice,
    setDetectedNote,
    setDetectedChord,
    setCurrentStepByTime,
    setStepResult,
    resetPractice,
  } = usePracticeStore();

  const [isListening, setIsListening] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Track which steps we've already evaluated
  const evaluatedStepsRef = useRef<Set<number>>(new Set());

  /* ================================================= */
  /* INIT + CLEANUP                                   */
  /* ================================================= */
  useEffect(() => {
    startPractice(tab);
    pipelineRef.current = new AudioPipeline();
    evaluatedStepsRef.current = new Set();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      pipelineRef.current?.stop();
      pipelineRef.current = null;
      resetPractice();
    };
  }, [tab, startPractice, resetPractice]);

  /* ================================================= */
  /* BPM-DRIVEN TIMER LOOP                            */
  /* ================================================= */
  useEffect(() => {
    if (!isListening || isPaused || !isActive) {
      return;
    }

    // Start the timer
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now() - pausedTimeRef.current;
    }

    timerRef.current = setInterval(() => {
      if (!startTimeRef.current) return;

      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      setElapsedMs(elapsed);

      // Update current step based on time
      setCurrentStepByTime(elapsed);
    }, 50); // 50ms resolution

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isListening, isPaused, isActive, setCurrentStepByTime]);

  /* ================================================= */
  /* STEP EVALUATION ON TIME WINDOW CHANGE            */
  /* ================================================= */
  useEffect(() => {
    // When currentStepIndex changes, evaluate the PREVIOUS step if not yet evaluated
    const prevIndex = currentStepIndex - 1;

    if (prevIndex >= 0 && !evaluatedStepsRef.current.has(prevIndex)) {
      const prevStep = hydratedSteps[prevIndex];

      if (prevStep && prevStep.result === 'pending') {
        // Check if the step was matched correctly during its window
        // For now, mark as missed if no detection matched
        setStepResult(prevIndex, 'missed');
      }

      evaluatedStepsRef.current.add(prevIndex);
    }
  }, [currentStepIndex, hydratedSteps, setStepResult]);

  /* ================================================= */
  /* NOTE/CHORD DETECTION HANDLER                     */
  /* ================================================= */
  const handleDetection = useCallback((detection: any) => {
    if (!detection || isPaused || !isActive) return;

    // Handle note detection
    if (detection.note) {
      const note = {
        name: detection.note.name,
        octave: detection.note.octave,
      };

      // Avoid duplicate updates
      if (
        lastDetectedNote &&
        lastDetectedNote.name === note.name &&
        lastDetectedNote.octave === note.octave
      ) {
        return;
      }

      setDetectedNote(note);

      // Evaluate against current step
      if (currentStep && currentStep.type === 'note' && currentStep.result === 'pending') {
        const expected = currentStep.note;
        const isCorrect =
          expected.name === note.name &&
          expected.octave === note.octave;

        if (isCorrect) {
          setStepResult(currentStepIndex, 'correct');
          evaluatedStepsRef.current.add(currentStepIndex);
        } else {
          setStepResult(currentStepIndex, 'incorrect');
          evaluatedStepsRef.current.add(currentStepIndex);
        }
      }
    }

    // Handle chord detection
    if (detection.chord) {
      const chord = {
        root: detection.chord.root,
        type: detection.chord.type,
      };

      setDetectedChord(chord);

      // Evaluate against current step
      if (currentStep && currentStep.type === 'chord' && currentStep.result === 'pending') {
        // For chords, just check root note for now
        const expected = currentStep.chordName;
        const detected = `${chord.root}${chord.type === 'minor' ? 'm' : ''}`;

        const isCorrect = expected.toLowerCase() === detected.toLowerCase();

        if (isCorrect) {
          setStepResult(currentStepIndex, 'correct');
          evaluatedStepsRef.current.add(currentStepIndex);
        } else {
          setStepResult(currentStepIndex, 'incorrect');
          evaluatedStepsRef.current.add(currentStepIndex);
        }
      }
    }
  }, [
    isPaused,
    isActive,
    lastDetectedNote,
    currentStep,
    currentStepIndex,
    setDetectedNote,
    setDetectedChord,
    setStepResult
  ]);

  /* ================================================= */
  /* AUDIO START / STOP                               */
  /* ================================================= */
  const handleStartListening = () => {
    if (!pipelineRef.current) return;

    pipelineRef.current.start(handleDetection);
    startTimeRef.current = Date.now() - pausedTimeRef.current;
    setIsListening(true);
  };

  const handleStopListening = () => {
    pipelineRef.current?.stop();

    // Save paused time
    if (startTimeRef.current) {
      pausedTimeRef.current = Date.now() - startTimeRef.current;
    }

    setIsListening(false);
  };

  const handlePause = () => {
    pausePractice();
    handleStopListening();
  };

  const handleResume = () => {
    resumePractice();
    handleStartListening();
  };

  const handleQuit = () => {
    handleStopListening();
    stopPractice();
    navigation.goBack();
  };

  /* ================================================= */
  /* DISPLAY                                          */
  /* ================================================= */
  const getDetectedText = () => {
    if (lastDetectedChord) {
      return `${lastDetectedChord.root}${lastDetectedChord.type === 'minor' ? 'm' : lastDetectedChord.type === 'major' ? '' : lastDetectedChord.type}`;
    }
    if (lastDetectedNote) {
      return `${lastDetectedNote.name}${lastDetectedNote.octave}`;
    }
    return "--";
  };

  const getDetectionKind = (): "chord" | "note" | "none" => {
    if (lastDetectedChord) return "chord";
    if (lastDetectedNote) return "note";
    return "none";
  };

  const getFeedbackColor = (): "neutral" | "correct" | "incorrect" => {
    if (!currentStep) return "neutral";

    const currentResult = currentStep.result;
    if (currentResult === 'correct') return "correct";
    if (currentResult === 'incorrect') return "incorrect";
    return "neutral";
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

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
          subtitle={`${tab.metadata.artist} • ${tab.metadata.bpm} BPM`}
        />

        {/* Timer Display */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(elapsedMs)}</Text>
        </View>

        <CurrentDetectionDisplayer
          value={getDetectedText()}
          kind={getDetectionKind()}
          feedbackColor={getFeedbackColor()}
        />

        <View style={styles.tabSection}>
          <PracticeTabTimeline
            tab={{ ...tab, steps: hydratedSteps }}
            windowSize={6}
            currentIndex={currentStepIndex}
          />
        </View>

        {/* Stats Display */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.correct}</Text>
            <Text style={styles.statLabel}>Correct</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.incorrect}</Text>
            <Text style={styles.statLabel}>Incorrect</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.missed}</Text>
            <Text style={styles.statLabel}>Missed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.accuracy.toFixed(0)}%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
        </View>

        <PracticeControls
          isListening={isListening}
          onStart={handleStartListening}
          onPause={handlePause}
          onQuit={handleQuit}
        />
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
    paddingVertical: 6,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  timerText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(36,0,56,0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(199,125,255,0.3)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.subtle,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
