/**
 * PracticeTabTimeline
 *
 * TRUE guitar practice timeline renderer (PracticeTab based):
 * - 6 horizontal strings
 * - Frets rendered ON strings
 * - Global vertical HUD bar marks current ACTIVE STEP
 *
 * NOTE:
 * This component is PURE.
 * It does NOT manage state.
 * Active step is driven from PracticeStore.
 */

import React, { useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Text } from "react-native-paper";

import colors from "@/theme/colors";
import { PracticeTab } from "@/types/practice/PracticeTab";

type Props = {
    tab: PracticeTab;
    currentIndex: number;
    windowSize?: number;
};

const STRINGS = [1, 2, 3, 4, 5, 6];
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PracticeTabTimeline: React.FC<Props> = ({
  tab,
  currentIndex,
  windowSize = 6,
}) => {
  const steps = useMemo(() => tab.steps, [tab.steps]);

  if (!steps || steps.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          No practice steps available.
        </Text>
      </View>
    );
  }

  /* Visible window based on CURRENT INDEX */
  const visibleSteps = steps.slice(
    currentIndex,
    currentIndex + windowSize
  );

  const COL_WIDTH = Math.floor(
    (SCREEN_WIDTH - 16) / windowSize
  );

  return (
    <View style={styles.container}>

      {/* ===== GLOBAL ACTIVE HUD BAR ===== */}
      <View
        style={[
          styles.activeHud,
          {
            width: COL_WIDTH - 6,
            left: 3,
          },
        ]}
      />

      {STRINGS.map((string) => (
        <View key={string} style={styles.stringRow}>

          {/* STRING LINE */}
          <View style={styles.stringLine} />

          <View style={styles.noteRow}>
            {visibleSteps.map((step, colIdx) => {
              const isActive = colIdx === 0;

              if (step.type !== "note") {
                return (
                  <View
                    key={`${string}-${colIdx}`}
                    style={[styles.colSlot, { width: COL_WIDTH }]}
                  />
                );
              }

              if (step.position.string !== string) {
                return (
                  <View
                    key={`${string}-${colIdx}`}
                    style={[styles.colSlot, { width: COL_WIDTH }]}
                  />
                );
              }

              return (
                <View
                  key={`${string}-${colIdx}`}
                  style={[
                    styles.colSlot,
                    { width: COL_WIDTH },
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      isActive && styles.bubbleActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        isActive && styles.bubbleTextActive,
                      ]}
                    >
                      {step.position.fret}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

        </View>
      ))}

      <Text style={styles.progress}>
        Step {currentIndex + 1} / {steps.length}
      </Text>

    </View>
  );
};

export default PracticeTabTimeline;

/* ================================================= */
/* STYLES */
/* ================================================= */

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingVertical: 10,
  },

  activeHud: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: "rgba(199,125,255,0.13)",
    borderWidth: 1,
    borderColor: "rgba(199,125,255,0.35)",
    shadowColor: "#C77DFF",
    shadowOpacity: 0.65,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    zIndex: -1,
  },

  stringRow: {
    height: 44,
    justifyContent: "center",
  },

  stringLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2.2,
    borderRadius: 2,
    backgroundColor: "rgba(199,125,255,0.45)",
  },

  noteRow: {
    flexDirection: "row",
  },

  colSlot: {
    alignItems: "center",
    justifyContent: "center",
  },

  bubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brand.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#C77DFF",
    shadowOpacity: 0.85,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },

  bubbleActive: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },

  bubbleText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },

  bubbleTextActive: {
    fontSize: 18,
  },

  progress: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 12,
    color: colors.text.subtle,
    opacity: 0.9,
  },

  empty: {
    alignItems: "center",
    paddingVertical: 20,
  },

  emptyText: {
    color: colors.text.subtle,
    fontSize: 12,
    opacity: 0.8,
  },
});
