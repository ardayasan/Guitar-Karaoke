/**
 * Practice Screen
 * Main practice interface with real-time pitch detection and feedback
 * — SmartTab FINAL STABLE HUD (SCROLL FIXED)
 */

import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Card,
  Title,
  ProgressBar,
  Surface,
  Text,
} from "react-native-paper";

import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { RootStackParamList } from "@/navigation/types";
import { usePracticeStore } from "@/store";
import { getPitchDetectionService } from "@/services/pitch";
import { startNativeAudio } from "@/services/native/nativeAudio";
import { getNoteString } from "@/utils/music";

import colors from "@/theme/colors";
import PracticeTabTimeline from "./components/PracticeTabTimeline";

/* ================================================= */

type PracticeScreenRouteProp = RouteProp<RootStackParamList, "Practice">;
type PracticeScreenNavigationProp =
  StackNavigationProp<RootStackParamList, "Practice">;

/* ================================================= */

export default function PracticeScreen() {
  const route = useRoute<PracticeScreenRouteProp>();
  const navigation =
    useNavigation<PracticeScreenNavigationProp>();
  const tab = route.params.tab;

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

  const [pitchService] = useState(() =>
    getPitchDetectionService()
  );
  const [isListening, setIsListening] = useState(false);
  const [stopNativeAudio, setStopNativeAudio] =
    useState<null | (() => void)>(null);

  /* ===== INIT ===== */
  useEffect(() => {
    startSession();

    return () => {
      if (stopNativeAudio) stopNativeAudio();
      reset();
    };
  }, []);

  /* ===== AUDIO ===== */
  const handleStartListening = () => {
    pitchService.start((detection) =>
      setCurrentDetection(detection ?? null)
    );

    const stop = startNativeAudio((samples, ts) => {
      pitchService.processSamples(samples, ts);
    });

    setStopNativeAudio(() => stop);
    setIsListening(true);
  };

  const handleStopListening = () => {
    pitchService.stop();
    if (stopNativeAudio) stopNativeAudio();
    setStopNativeAudio(null);
    setIsListening(false);
  };

  const handlePause = () => {
    pauseSession();
    handleStopListening();
  };

  const handleQuit = () => {
    if (isListening) handleStopListening();
    endSession();
    navigation.goBack();
  };

  /* ===== FEEDBACK COLOR ===== */
  const getFeedbackColor = () => {
    if (!currentFeedback) return colors.text.subtle;

    switch (currentFeedback.type) {
      case "correct":
        return "#53ff9a";
      case "incorrect":
        return "#ff5c5c";
      case "missed":
        return "#ffb74d";
      default:
        return colors.text.subtle;
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg.main }}
      edges={["top"]}
    >

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >

        {/* ===== HUD HEADER BAR ===== */}
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>
            {tab.metadata.title}
          </Text>

          <Text style={styles.headerSub}>
            {tab.metadata.artist} • {tab.metadata.tempo} BPM
          </Text>
        </View>

        {/* ===== NOTE DISPLAY ===== */}
        <Surface style={styles.detectionSurface}>
          <Text style={styles.detectionLabel}>
            CURRENT NOTE
          </Text>

          <Text
            style={[
              styles.detectionText,
              { color: getFeedbackColor() },
            ]}
          >
            {currentDetection?.note
              ? getNoteString(currentDetection.note)
              : "--"}
          </Text>

          {currentDetection && (
            <Text style={styles.frequencyText}>
              {currentDetection.frequency.toFixed(2)} Hz •{" "}
              {(currentDetection.confidence * 100).toFixed(0)}%
            </Text>
          )}
        </Surface>

        {/* ===== TABLATURE CANVAS ===== */}
        <View style={styles.tabSection}>
          <PracticeTabTimeline tab={tab} windowSize={6} />
        </View>

        {/* ===== STATS ===== */}
        <Card style={styles.glassCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>
              Statistics
            </Title>

            <Text style={styles.statText}>
              Accuracy: {stats.averageAccuracy.toFixed(1)}%
            </Text>

            <ProgressBar
              progress={stats.averageAccuracy / 100}
              color={colors.brand.primary}
              style={styles.progressBar}
            />

            <View style={styles.statRow}>
              <Stat
                label="Correct"
                value={stats.correctNotes}
              />
              <Stat
                label="Incorrect"
                value={stats.incorrectNotes}
              />
            </View>

            <View style={styles.statRow}>
              <Stat
                label="Current"
                value={stats.currentStreak}
              />
              <Stat
                label="Best"
                value={stats.longestStreak}
              />
            </View>
          </Card.Content>
        </Card>

        {/* ===== CONTROLS ===== */}
        <View style={styles.controls}>
          {!isListening ? (
            <Button
              mode="contained"
              onPress={handleStartListening}
              style={styles.primaryBtn}
              icon="microphone"
              textColor="#fff"
            >
              Start Listening
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={handlePause}
              style={styles.primaryBtn}
              icon="pause"
              textColor="#fff"
            >
              Pause
            </Button>
          )}

          <Button
            mode="outlined"
            onPress={handleQuit}
            style={styles.secondaryBtn}
            icon="logout"
            textColor="#C77DFF"
          >
            Quit
          </Button>
        </View>

      </ScrollView>

    </SafeAreaView>
  );
}

const Stat = ({
  label,
  value,
}: {
  label: string;
  value: number;
}) => (
  <View style={styles.statBlock}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

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

  /* HEADER */
  headerBar: {
    paddingVertical: 12,
    marginBottom: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(199,125,255,0.25)",
  },

  headerTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.6,
  },

  headerSub: {
    marginTop: 2,
    color: colors.text.subtle,
    fontSize: 12,
    letterSpacing: 0.4,
  },

  /* DETECTION */
  detectionSurface: {
    marginBottom: 12,
    paddingVertical: 22,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "rgba(36,0,56,0.65)",
    borderWidth: 1.5,
    borderColor: "rgba(199,125,255,0.5)",
    shadowColor: "#C77DFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
  },

  detectionLabel: {
    color: colors.text.subtle,
    letterSpacing: 1,
    fontSize: 12,
    marginBottom: 6,
  },

  detectionText: {
    fontSize: 54,
    fontWeight: "800",
  },

  frequencyText: {
    marginTop: 6,
    color: colors.text.subtle,
  },

  /* TAB */
  tabSection: {
    width: "100%",
    marginVertical: 12,
    paddingVertical: 6,
    backgroundColor: "transparent",
  },

  /* STATS */
  glassCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.flow.circleBorder,
    elevation: 0,
  },

  sectionTitle: {
    textAlign: "center",
    color: colors.text.primary,
    marginBottom: 10,
    letterSpacing: 0.4,
  },

  statText: {
    textAlign: "center",
    color: colors.text.primary,
  },

  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

  statBlock: {
    width: "48%",
    alignItems: "center",
  },

  statLabel: {
    fontSize: 12,
    color: colors.text.subtle,
  },

  statValue: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: "700",
  },

  progressBar: {
    marginVertical: 8,
    height: 6,
    borderRadius: 4,
  },

  /* CONTROLS */
  controls: {
    marginTop: 10,
  },

  primaryBtn: {
    backgroundColor: "#250036",
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "rgba(199,125,255,0.55)",
    shadowColor: "#C77DFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 10,
    marginBottom: 12,
  },

  secondaryBtn: {
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: "rgba(199,125,255,0.55)",
    backgroundColor: "rgba(36,0,56,0.4)",
  },

});
