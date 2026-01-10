/**
 * CurrentDetection
 * --------------------------------------------------
 * Pure UI component that displays the current
 * detected note or chord.
 *
 * Responsibilities:
 * - Render detection value (note / chord)
 * - Apply visual feedback color (optional)
 *
 * This component contains NO business logic.
 */

import React from "react";
import { StyleSheet } from "react-native";
import { Surface, Text } from "react-native-paper";
import colors from "@/theme/colors";

export type DetectionDisplayValue = string | null;

export type DetectionKind = "chord" | "note" | "none";

type Props = {
    /** Detected note or chord as a display-ready string (e.g. "E4", "G", "Am") */
    value: DetectionDisplayValue;

    /** Semantic kind of detection */
    kind: DetectionKind;

    /**
     * Visual feedback state.
     * For now, this is optional and defaults to "neutral".
     * (Future: correct / incorrect / missed)
     */
    feedbackColor?: "neutral" | "correct" | "incorrect";
};

export default function CurrentDetectionDisplayer({
    value,
    kind,
    feedbackColor = "neutral",
}: Props) {
    const color = getColorForFeedback(feedbackColor);
    const kindLabel = getLabelForKind(kind);

    return (
        <Surface style={styles.container}>
            <Text style={styles.label}>CURRENT DETECTION</Text>

            <Text style={[styles.value, { color }]}>
                {value ?? "--"}
            </Text>

            <Text style={styles.kind}>
                {kindLabel}
            </Text>
        </Surface>
    );
}


/* -------------------------------------------------- */
/* Helpers                                            */
/* -------------------------------------------------- */
function getColorForFeedback(
    feedback: "neutral" | "correct" | "incorrect"
) {
    switch (feedback) {
        case "correct":
            return "#53ff9a";
        case "incorrect":
            return "#ff5c5c";
        case "neutral":
        default:
            return colors.text.subtle;
    }
}

function getLabelForKind(kind: DetectionKind) {
    switch (kind) {
        case "chord":
            return "Chord";
        case "note":
            return "Note";
        case "none":
        default:
            return "No input";
    }
}


/* -------------------------------------------------- */
/* Styles                                             */
/* -------------------------------------------------- */
const styles = StyleSheet.create({
    container: {
        marginBottom: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: "center",
        backgroundColor: "rgba(36,0,56,0.65)",
        borderWidth: 1.5,
        borderColor: "rgba(199,125,255,0.5)",
        shadowColor: "#C77DFF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
    },

    label: {
        color: colors.text.subtle,
        letterSpacing: 0.8,
        fontSize: 10,
        marginBottom: 2,
    },

    value: {
        fontSize: 32,
        fontWeight: "800",
    },

    kind: {
        marginTop: 2,
        fontSize: 9,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        color: colors.text.subtle,
        opacity: 0.75,
    },
});
