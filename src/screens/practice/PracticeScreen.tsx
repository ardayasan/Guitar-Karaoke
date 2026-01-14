/**
 * Practice Screen – REAL FINAL
 *
 * Guarantees:
 * - New step ALWAYS starts from clean state
 * - Previous step result cannot leak
 * - Incorrect grace absorbs sustain carry-over
 * - Silence clears UI + incorrect -> pending
 * - Step change resets local guards & timeouts
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

import PracticeHeader from "./components/PracticeHeader";
import CurrentDetectionDisplayer from "./components/CurrentDetectionDisplayer";
import PracticeTabTimeline from "./components/PracticeTabTimeline";

/* ================================================= */

type PracticeScreenRouteProp = RouteProp<RootStackParamList, "Practice">;
type PracticeScreenNavigationProp =
  StackNavigationProp<RootStackParamList, "Practice">;

/* ================================================= */

const INPUT_DEBOUNCE_MS = 300;
const CORRECT_DEBOUNCE_MS = 500;
const ADVANCE_DELAY_MS = 600;

// silence safety net
const SILENCE_TIMEOUT_MS = 350;

// 🔥 main tuning knob
const INCORRECT_GRACE_LIMIT = 3;

export default function PracticeScreen() {
  const route = useRoute<PracticeScreenRouteProp>();
  const navigation = useNavigation<PracticeScreenNavigationProp>();
  const tab = route.params.tab;

  /* ---------- Audio pipeline ---------- */
  const pipelineRef = useRef<AudioPipeline | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const advanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ---------- Detection refs ---------- */
  const lastCorrectStepRef = useRef<number>(-1);
  const lastCorrectTimeRef = useRef<number>(0);

  const lastInputTimeRef = useRef<number>(0);
  const lastDetectedValueRef = useRef<string>("");

  // ⭐ per-step incorrect grace
  const incorrectGraceCountRef = useRef<number>(0);

  // ⭐ step start time to ignore stale detections
  const stepStartTimeRef = useRef<number>(0);

  /* ---------- Store ---------- */
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
  const [debugMsg, setDebugMsg] = useState("");
  const [hasCompleted, setHasCompleted] = useState(false);

  /* ================================================= */
  /* INIT + CLEANUP                                   */
  /* ================================================= */
  useEffect(() => {
    startPractice(tab);
    pipelineRef.current = new AudioPipeline();

    return () => {
      pipelineRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      resetPractice();
    };
  }, [tab, startPractice, resetPractice]);

  /* ================================================= */
  /* TIMER                                            */
  /* ================================================= */
  useEffect(() => {
    if (!isListening || !timingStats.startTime) return;

    timerRef.current = setInterval(() => {
      updateElapsedTime(Date.now() - timingStats.startTime!);
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening, timingStats.startTime, updateElapsedTime]);

  /* ================================================= */
  /* STEP CHANGE = HARD LOCAL RESET                    */
  /* (skip dahil tüm advance türlerinde temiz başla)   */
  /* ================================================= */
  useEffect(() => {
    // local guards reset
    incorrectGraceCountRef.current = 0;
    lastCorrectStepRef.current = -1;
    lastCorrectTimeRef.current = 0;
    lastInputTimeRef.current = 0;
    lastDetectedValueRef.current = "";

    // Mark step start time - used to ignore stale detections
    stepStartTimeRef.current = Date.now();

    // timeouts reset
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

    // UI reset (özellikle manual skipte anında temizlensin)
    const s = usePracticeStore.getState();
    s.setDetectedNote(null);
    s.setDetectedChord(null);
  }, [currentStepIndex]);

  /* ================================================= */
  /* STEP ADVANCE (🔥 CLEAN RESET POINT)               */
  /* ================================================= */
  const advanceToNextStep = useCallback(() => {
    usePracticeStore.getState().markCorrectAndAdvance();

    // local reset (extra safety)
    incorrectGraceCountRef.current = 0;
    lastCorrectStepRef.current = -1;
    lastCorrectTimeRef.current = 0;
    lastInputTimeRef.current = 0;
    lastDetectedValueRef.current = "";
  }, []);

  /* ================================================= */
  /* DETECTION HANDLER                                 */
  /* ================================================= */
  const handleDetection = useCallback(
    (detection: any) => {
      const state = usePracticeStore.getState();

      const {
        isActive,
        currentStep: step,
        currentStepIndex: stepIdx,
        setDetectedNote,
        setDetectedChord,
        setStepResult,
      } = state;

      const applySilence = () => {
        // UI clear
        state.setDetectedNote(null);
        state.setDetectedChord(null);

        // local guard reset
        lastInputTimeRef.current = 0;
        lastDetectedValueRef.current = "";
        incorrectGraceCountRef.current = 0;

        // incorrect -> pending (silence'ta yanlışta kalma)
        if (isActive && step && step.result === "incorrect") {
          setStepResult(stepIdx, "pending");
        }
      };

      // silence watchdog
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = setTimeout(applySilence, SILENCE_TIMEOUT_MS);

      // silence event
      if (!detection || (!detection.note && !detection.chord)) {
        applySilence();
        return;
      }

      if (!isActive || !step) return;
      if (step.result === "correct") return;

      const now = Date.now();

      // 🔥 CRITICAL: Ignore detections within 100ms of step start
      // This prevents stale detections from previous step leaking into new step
      const STEP_GRACE_MS = 100;
      if (now - stepStartTimeRef.current < STEP_GRACE_MS) {
        return;
      }

      /* ---------- REST ---------- */
      if (step.type === "rest") {
        setStepResult(stepIdx, "correct");
        setTimeout(advanceToNextStep, 100);
        return;
      }

      /* ================= NOTE ================= */
      if (detection.note && step.type === "note") {
        const detectedName = String(detection.note.name).toUpperCase().trim();
        const detectedValue = `${detectedName}${detection.note.octave}`;

        if (
          detectedValue === lastDetectedValueRef.current &&
          now - lastInputTimeRef.current < INPUT_DEBOUNCE_MS
        )
          return;

        setDetectedNote({ name: detectedName, octave: detection.note.octave });

        const expectedName = String(step.note.name).toUpperCase().trim();
        const isCorrect = detectedName === expectedName;

        setDebugMsg(
          `Exp:${expectedName} Det:${detectedName} Correct:${isCorrect} Grace:${incorrectGraceCountRef.current}`
        );

        lastInputTimeRef.current = now;
        lastDetectedValueRef.current = detectedValue;

        if (isCorrect) {
          incorrectGraceCountRef.current = 0;

          if (
            stepIdx === lastCorrectStepRef.current &&
            now - lastCorrectTimeRef.current < CORRECT_DEBOUNCE_MS
          )
            return;

          lastCorrectStepRef.current = stepIdx;
          lastCorrectTimeRef.current = now;

          setStepResult(stepIdx, "correct");

          if (advanceTimeoutRef.current)
            clearTimeout(advanceTimeoutRef.current);
          advanceTimeoutRef.current = setTimeout(
            advanceToNextStep,
            ADVANCE_DELAY_MS
          );
          return;
        }

        // WRONG (with grace)
        incorrectGraceCountRef.current++;
        if (incorrectGraceCountRef.current <= INCORRECT_GRACE_LIMIT) return;

        if (step.result !== "incorrect") {
          setStepResult(stepIdx, "incorrect");
        }
        return;
      }

      /* ================= CHORD ================= */
      if (detection.chord && step.type === "chord") {
        const detectedRoot = String(detection.chord.root).toUpperCase().trim();
        const detectedType = String(detection.chord.type || "").toLowerCase();
        const detectedValue = `${detectedRoot}${detectedType}`;

        if (
          detectedValue === lastDetectedValueRef.current &&
          now - lastInputTimeRef.current < INPUT_DEBOUNCE_MS
        )
          return;

        setDetectedChord({ root: detectedRoot, type: detectedType });

        const expectedChord = String(step.chordName).toUpperCase().trim();
        const isCorrect =
          expectedChord === detectedRoot ||
          expectedChord.startsWith(detectedRoot);

        lastInputTimeRef.current = now;
        lastDetectedValueRef.current = detectedValue;

        if (isCorrect) {
          incorrectGraceCountRef.current = 0;

          setStepResult(stepIdx, "correct");

          if (advanceTimeoutRef.current)
            clearTimeout(advanceTimeoutRef.current);
          advanceTimeoutRef.current = setTimeout(
            advanceToNextStep,
            ADVANCE_DELAY_MS
          );
          return;
        }

        incorrectGraceCountRef.current++;
        if (incorrectGraceCountRef.current <= INCORRECT_GRACE_LIMIT) return;

        if (step.result !== "incorrect") {
          setStepResult(stepIdx, "incorrect");
        }
      }
    },
    [advanceToNextStep]
  );

  /* ================================================= */
  /* AUDIO CONTROLS                                   */
  /* ================================================= */
  const handleStartListening = () => {
    if (!pipelineRef.current) return;

    if (hasCompleted) {
      resetPractice();
      startPractice(tab);
      setHasCompleted(false);
    }

    incorrectGraceCountRef.current = 0;
    lastCorrectStepRef.current = -1;
    lastCorrectTimeRef.current = 0;
    lastInputTimeRef.current = 0;
    lastDetectedValueRef.current = "";

    pipelineRef.current.start(handleDetection);
    setIsListening(true);
  };

  const handleStopListening = () => {
    pipelineRef.current?.stop();
    setIsListening(false);
  };

  const handleQuit = () => {
    handleStopListening();
    stopPractice();
    navigation.goBack();
  };

  /* ================================================= */
  /* COMPLETION                                       */
  /* ================================================= */
  const isComplete = currentStepIndex >= hydratedSteps.length;
  useEffect(() => {
    if (isComplete && isListening) {
      completePractice();
      handleStopListening();
      setHasCompleted(true);
    }
  }, [isComplete, isListening, completePractice]);

  /* ================================================= */
  /* RENDER                                           */
  /* ================================================= */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.main }}>
      <ScrollView contentContainerStyle={styles.container}>
        <PracticeHeader title={tab.metadata.title} subtitle={tab.metadata.artist} />

        {debugMsg && (
          <View style={styles.debugBanner}>
            <Text style={styles.debugText}>{debugMsg}</Text>
          </View>
        )}

        <CurrentDetectionDisplayer
          value={
            lastDetectedChord
              ? `${lastDetectedChord.root}${lastDetectedChord.type === "minor" ? "m" : ""
              }`
              : lastDetectedNote
                ? `${lastDetectedNote.name}${lastDetectedNote.octave}`
                : "--"
          }
          kind={lastDetectedChord ? "chord" : lastDetectedNote ? "note" : "none"}
          feedbackColor={
            currentStep?.result === "correct"
              ? "correct"
              : currentStep?.result === "incorrect"
                ? "incorrect"
                : "neutral"
          }
        />

        <PracticeTabTimeline
          tab={{ ...tab, steps: hydratedSteps }}
          windowSize={6}
          currentIndex={currentStepIndex}
        />

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
        </View>

        <View style={styles.controlsRow}>
          {!isListening ? (
            <View style={styles.startBtn} onTouchEnd={handleStartListening}>
              <Text style={styles.startBtnText}>
                {hasCompleted ? "🔄 Restart" : "▶ Start"}
              </Text>
            </View>
          ) : (
            <View style={styles.listeningBtn}>
              <Text style={styles.listeningBtnText}>🎤 Listening…</Text>
            </View>
          )}
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
  debugBanner: {
    backgroundColor: "rgba(255,255,0,0.2)",
    borderRadius: 6,
    padding: 6,
    marginVertical: 6,
  },
  debugText: {
    textAlign: "center",
    fontSize: 11,
    fontFamily: "monospace",
    color: "#ffff00",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(36,0,56,0.5)",
    borderRadius: 10,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 10,
    color: colors.text.subtle,
    textTransform: "uppercase",
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "center",
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
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  listeningBtn: {
    backgroundColor: "rgba(83,255,154,0.2)",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.feedback.correct,
  },
  listeningBtnText: {
    color: colors.feedback.correct,
    fontSize: 16,
    fontWeight: "700",
  },
  quitBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  quitBtnText: {
    color: colors.text.subtle,
    fontSize: 14,
    fontWeight: "600",
  },
});
