/**
 * DetectionTestScreen
 * --------------------------------------------------
 * Minimal screen for raw detection debugging.
 * Mirrors PracticeScreen detection flow 1:1.
 */

import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "react-native-paper";

import colors from "@/theme/colors";
import { AudioPipeline } from "@/services/audio/AudioPipeline";
import CurrentDetectionDisplayer from "@/screens/practice/components/CurrentDetectionDisplayer";
import { detectionToDisplay } from "@/utils/detection/detectionToDisplay";

export default function DetectionTestScreen() {
    const pipeline = useMemo(() => new AudioPipeline(), []);

    const [currentDetection, setCurrentDetection] = useState<any | null>(null);
    const [isListening, setIsListening] = useState(false);

    const detectionDisplay = detectionToDisplay(
        currentDetection,
        "flat"
    );

    /* ---------------- CLEANUP ---------------- */
    useEffect(() => {
        return () => {
            pipeline.stop();
        };
    }, []);

    /* ---------------- CONTROLS ---------------- */
    const startListening = () => {
        pipeline.start((detection) => {
            setCurrentDetection(detection ?? null);
        });
        setIsListening(true);
    };

    const stopListening = () => {
        pipeline.stop();
        setIsListening(false);
    };

    /* ---------------- RENDER ---------------- */
    return (
        <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
            <CurrentDetectionDisplayer
                value={detectionDisplay.primary}
                kind={detectionDisplay.kind}
                feedbackColor="neutral"
            />

            <Button
                mode="contained"
                onPress={isListening ? stopListening : startListening}
                style={styles.button}
            >
            {isListening ? "STOP LISTENING" : "START LISTENING"}
            </Button>
        </View>
        </SafeAreaView>
    );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: colors.bg.main,
    },

    container: {
        flex: 1,
        paddingHorizontal: 16,
        justifyContent: "center",
    },

    button: {
        marginTop: 24,
        borderRadius: 12,
    },
});
