/**
 * Practice Screen
 * Main UI for real-time pitch detection and feedback.
 * Uses AudioPipeline for audio streaming + pitch processing.
 */
import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { RootStackParamList } from "@/navigation/types";
import { usePracticeStore } from "@/store";
import colors from "@/theme/colors";
import { AudioPipeline } from "@/services/audio/AudioPipeline";

// My Components
import PracticeHeader from "./components/PracticeHeader";
import CurrentDetectionDisplayer from "./components/CurrentDetectionDisplayer";
import PracticeTabTimeline from "./components/PracticeTabTimeline";
import PracticeStatsCard from "./components/PracticeStatsCard";
import PracticeControls from "./components/PracticeControls";

// My Utils
import { detectionToDisplay } from "@/utils/detection/detectionToDisplay";

/* ================================================= */

type PracticeScreenRouteProp = RouteProp<RootStackParamList, "Practice">;
type PracticeScreenNavigationProp =
  StackNavigationProp<RootStackParamList, "Practice">;

/* ================================================= */

export default function PracticeScreen() {
  const route = useRoute<PracticeScreenRouteProp>();
  const navigation = useNavigation<PracticeScreenNavigationProp>();
  const tab = route.params.tab;

  // Audio pipeline instance (created once)
  const pipeline = useMemo(() => new AudioPipeline(), []);


  const {
    stats,
    currentDetection,
    currentFeedback,
    startSession,
    pauseSession,
    endSession,
    setCurrentDetection,
    reset,
  } = usePracticeStore();

  const [isListening, setIsListening] = useState(false);

  const detectionDisplay = detectionToDisplay(
    currentDetection,
    "flat" // default option (or sharp [#])
  );

  /* ---------------------- INIT + CLEANUP ---------------------- */
  useEffect(() => {
    startSession();

    return () => {
      pipeline.stop();
      reset();
    };
  }, []);

  /* ---------------------- AUDIO CONTROLS ---------------------- */
  const handleStartListening = () => {
    pipeline.start((detection) => {
      setCurrentDetection(detection ?? null);
    });

    setIsListening(true);
  };

  const handleStopListening = () => {
    pipeline.stop();
    setIsListening(false);
  };

  const handlePause = () => {
    pauseSession();
    handleStopListening();
  };

  const handleQuit = () => {
    if (isListening) pipeline.stop();
    endSession();
    navigation.goBack();
  };

  /* ---------------------- RENDER ---------------------- */
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg.main }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <PracticeHeader
          title={tab.metadata.title}
          subtitle={`${tab.metadata.artist} • ${tab.metadata.tempo} BPM`}
        />

        {/* CURRENT DETECTION DISPLAYER */}
        <CurrentDetectionDisplayer
          value={detectionDisplay.primary}
          kind={detectionDisplay.kind}
          feedbackColor="neutral" // TODO: it should be correct color (waiting for validation)
        />

        {/* TAB TIMELINE */}
        <View style={styles.tabSection}>
          <PracticeTabTimeline tab={tab} windowSize={6} />
        </View>

        {/* STATS */}
        <PracticeStatsCard stats={stats} />

        {/* CONTROLS */}
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
/* STYLES */
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
    backgroundColor: "transparent",
  },
});
