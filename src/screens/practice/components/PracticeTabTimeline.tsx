/**
 * PracticeTabTimeline
 *
 * Guitar practice timeline with:
 * - 6 horizontal strings
 * - Notes as numbered circles on strings
 * - Chords as VERTICAL BARS spanning all 6 strings
 * - Color-coded feedback for correct/incorrect/pending
 *
 * This component is PURE - state driven from PracticeStore.
 */

import React, { useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Text } from "react-native-paper";

import colors from "@/theme/colors";
import { PracticeTab } from "@/types/practice/PracticeTab";
import { PracticeStep } from "@/types/practice/PracticeStep";

type Props = {
  tab: PracticeTab;
  currentIndex: number;
  windowSize?: number;
};

const STRINGS = [1, 2, 3, 4, 5, 6];
const STRING_HEIGHT = 40;
const TOTAL_STRING_HEIGHT = STRING_HEIGHT * 6;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Get colors based on step result
 */
function getStepColors(
  step: PracticeStep,
  isActive: boolean
): { bg: string; border: string; text: string } {
  const result = step.result;

  if (isActive && result === 'pending') {
    return {
      bg: colors.brand.primary,
      border: colors.utility.accent,
      text: '#fff',
    };
  }

  switch (result) {
    case 'correct':
      return {
        bg: colors.feedback.correct,
        border: colors.feedback.correct,
        text: '#000',
      };
    case 'incorrect':
      return {
        bg: colors.feedback.incorrect,
        border: colors.feedback.incorrect,
        text: '#fff',
      };
    case 'missed':
      return {
        bg: colors.feedback.missed,
        border: colors.feedback.missed,
        text: '#fff',
      };
    case 'pending':
    default:
      return {
        bg: 'rgba(122,60,255,0.3)',
        border: 'rgba(199,125,255,0.4)',
        text: '#fff',
      };
  }
}

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
    (SCREEN_WIDTH - 32) / windowSize
  );

  return (
    <View style={styles.container}>
      {/* ===== STRINGS BACKGROUND ===== */}
      <View style={styles.stringsContainer}>
        {STRINGS.map((string) => (
          <View key={string} style={styles.stringRow}>
            <View style={styles.stringLine} />
          </View>
        ))}
      </View>

      {/* ===== STEPS OVERLAY ===== */}
      <View style={styles.stepsOverlay}>
        {visibleSteps.map((step, colIdx) => {
          const isActive = colIdx === 0;
          const colorStyle = getStepColors(step, isActive);

          /* ----- CHORD: Vertical bar spanning all strings ----- */
          if (step.type === 'chord') {
            return (
              <View
                key={`step-${colIdx}`}
                style={[styles.colSlot, { width: COL_WIDTH }]}
              >
                <View
                  style={[
                    styles.chordBar,
                    {
                      backgroundColor: colorStyle.bg,
                      borderColor: colorStyle.border,
                      borderWidth: isActive ? 3 : 2,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chordLabel,
                      { color: colorStyle.text },
                      isActive && styles.chordLabelActive,
                    ]}
                  >
                    {step.chordName}
                  </Text>
                </View>
                {/* Strum direction arrow */}
                <Text style={styles.strumArrow}>↓</Text>
              </View>
            );
          }

          /* ----- NOTE: Circle on specific string ----- */
          if (step.type === 'note') {
            const stringIndex = step.position.string - 1; // 0-indexed
            const topOffset = stringIndex * STRING_HEIGHT + (STRING_HEIGHT - 32) / 2;

            return (
              <View
                key={`step-${colIdx}`}
                style={[styles.colSlot, { width: COL_WIDTH }]}
              >
                <View
                  style={[
                    styles.noteBubble,
                    {
                      top: topOffset,
                      backgroundColor: colorStyle.bg,
                      borderColor: colorStyle.border,
                      borderWidth: isActive ? 3 : 2,
                    },
                    isActive && styles.noteBubbleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.noteText,
                      { color: colorStyle.text },
                      isActive && styles.noteTextActive,
                    ]}
                  >
                    {step.position.fret}
                  </Text>
                </View>
              </View>
            );
          }

          /* ----- REST: Empty slot ----- */
          return (
            <View
              key={`step-${colIdx}`}
              style={[styles.colSlot, { width: COL_WIDTH }]}
            />
          );
        })}
      </View>

      {/* ===== ACTIVE STEP HIGHLIGHT ===== */}
      {visibleSteps.length > 0 && (
        <View
          style={[
            styles.activeHighlight,
            { width: COL_WIDTH - 4, left: 2 },
          ]}
        />
      )}

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

  stringsContainer: {
    height: TOTAL_STRING_HEIGHT,
  },

  stringRow: {
    height: STRING_HEIGHT,
    justifyContent: "center",
  },

  stringLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(199,125,255,0.4)",
  },

  stepsOverlay: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    height: TOTAL_STRING_HEIGHT,
    flexDirection: 'row',
  },

  colSlot: {
    alignItems: "center",
    position: 'relative',
    height: TOTAL_STRING_HEIGHT,
  },

  /* ----- Chord Bar (spans all strings) ----- */
  chordBar: {
    position: 'absolute',
    top: 4,
    bottom: 24, // Leave room for label
    width: '70%',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#C77DFF",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },

  chordLabel: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: 'center',
  },

  chordLabelActive: {
    fontSize: 16,
    fontWeight: "800",
  },

  strumArrow: {
    position: 'absolute',
    bottom: 0,
    fontSize: 18,
    color: colors.text.subtle,
  },

  /* ----- Note Bubble ----- */
  noteBubble: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#C77DFF",
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },

  noteBubbleActive: {
    width: 36,
    height: 36,
    borderRadius: 18,
    shadowOpacity: 1,
    shadowRadius: 12,
  },

  noteText: {
    fontSize: 14,
    fontWeight: "800",
  },

  noteTextActive: {
    fontSize: 16,
  },

  /* ----- Active Highlight ----- */
  activeHighlight: {
    position: "absolute",
    top: 10,
    height: TOTAL_STRING_HEIGHT,
    borderRadius: 10,
    backgroundColor: "rgba(199,125,255,0.08)",
    borderWidth: 2,
    borderColor: "rgba(199,125,255,0.3)",
    zIndex: -1,
  },

  progress: {
    marginTop: 12,
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
