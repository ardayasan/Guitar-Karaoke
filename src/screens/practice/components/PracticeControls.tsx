/**
 * PracticeControls
 * --------------------------------------------------
 * Control panel for practice session actions.
 *
 * Responsibilities:
 * - Render Start / Pause / Quit buttons
 * - Reflect listening state
 *
 * NO business logic.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Button } from "react-native-paper";
import colors from "@/theme/colors";

type Props = {
    isListening: boolean;
    onStart: () => void;
    onPause: () => void;
    onQuit: () => void;
};

export default function PracticeControls({
    isListening,
    onStart,
    onPause,
    onQuit,
}: Props) {
    return (
        <View style={styles.container}>
        {!isListening ? (
            <Button
            mode="contained"
            onPress={onStart}
            style={styles.primaryBtn}
            icon="microphone"
            textColor="#fff"
            >
            Start Listening
            </Button>
        ) : (
            <Button
            mode="contained"
            onPress={onPause}
            style={styles.primaryBtn}
            icon="pause"
            textColor="#fff"
            >
            Pause
            </Button>
        )}

        <Button
            mode="outlined"
            onPress={onQuit}
            style={styles.secondaryBtn}
            icon="logout"
            textColor="#C77DFF"
        >
            Quit
        </Button>
        </View>
    );
}

/* -------------------------------------------------- */
/* Styles                                             */
/* -------------------------------------------------- */

const styles = StyleSheet.create({
    container: {
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
