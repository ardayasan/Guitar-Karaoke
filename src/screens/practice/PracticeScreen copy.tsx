/**
 * Practice Screen
 * Main UI for real-time practice session
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

export default function PracticeScreen() {
  const route = useRoute<PracticeScreenRouteProp>();
  const navigation = useNavigation<PracticeScreenNavigationProp>();
  const tab = route.params.tab;

  /* ---------- Audio pipeline (screen-local) ---------- */
  const pipelineRef = useRef<AudioPipeline | null>(null);

  /* ---------- Store ---------- */
  const {
    currentStep,
    currentStepIndex,
    lastDetectedNote,
    isPaused,
    startPractice,
    pausePractice,
    resumePractice,
    stopPractice,
    setDetectedNote,
    markCorrect,
    markIncorrect,
    advanceStep,
    resetPractice,
  } = usePracticeStore();

  const [isListening, setIsListening] = useState(false);

  /* ================================================= */
  /* INIT + CLEANUP                                   */
  /* ================================================= */
  useEffect(() => {
    startPractice(tab);

    pipelineRef.current = new AudioPipeline();

    return () => {
      pipelineRef.current?.stop();
      pipelineRef.current = null;
      resetPractice();
    };
  }, [tab, startPractice, resetPractice]);

  /* ================================================= */
  /* AUDIO START / STOP                               */
  /* ================================================= */
  const handleStartListening = () => {
    if (!pipelineRef.current) return;

    pipelineRef.current.start((detection) => {
      if (!detection?.note) return;

      const note = {
        name: detection.note.name,
        octave: detection.note.octave,
      };

      // Aynı notayı tekrar tekrar store’a yazma
      if (
        lastDetectedNote &&
        lastDetectedNote.name === note.name &&
        lastDetectedNote.octave === note.octave
      ) {
        return;
      }

      setDetectedNote(note);
    });

    setIsListening(true);
  };

  const handleStopListening = () => {
    pipelineRef.current?.stop();
    setIsListening(false);
  };

  const handlePause = () => {
    pausePractice();
    handleStopListening();
  };

  const handleQuit = () => {
    handleStopListening();
    stopPractice();
    navigation.goBack();
  };

  /* ================================================= */
  /* NOTE VALIDATION                                  */
  /* ================================================= */
  useEffect(() => {
    if (!currentStep || !lastDetectedNote || isPaused) return;
    if (currentStep.type !== "note") return;

    const expected = currentStep.note;

    const isCorrect =
      expected.name === lastDetectedNote.name &&
      expected.octave === lastDetectedNote.octave;

    if (isCorrect) {
      markCorrect();
      advanceStep();
    } else {
      markIncorrect();
    }
  }, [
    currentStep,
    lastDetectedNote,
    isPaused,
    markCorrect,
    markIncorrect,
    advanceStep,
  ]);

  /* ================================================= */
  /* REST STEP AUTO-ADVANCE                            */
  /* ================================================= */
  useEffect(() => {
    if (!currentStep) return;

    if (currentStep.type === "rest") {
      advanceStep();
    }
  }, [currentStep, advanceStep]);


  /* ================================================= */
  /* DISPLAY                                          */
  /* ================================================= */
  const detectedText = lastDetectedNote
    ? `${lastDetectedNote.name}${lastDetectedNote.octave}`
    : "--";

  /* ================================================= */
  /* RENDER                                           */
  /* ================================================= */
  if (true) {
    return <SafeAreaView></SafeAreaView>
  } else {
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

          <CurrentDetectionDisplayer
            value={detectedText}
            kind={lastDetectedNote ? "note" : "none"}
            feedbackColor="neutral"
          />

          <View style={styles.tabSection}>
            <PracticeTabTimeline
              tab={tab}
              windowSize={6}
              currentIndex={currentStepIndex}
            />
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
});
