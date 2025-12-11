/**
 * TestScreen
 * --------------------------------------------------
 * Minimal testing screen for verifying AudioPipeline and
 * PitchDetectionService output in real time.
 *
 * Behavior:
 *  - Automatically starts listening when the screen mounts
 *  - Displays current pitch detection (note, frequency, confidence)
 *  - User can Pause / Resume the audio pipeline
 */

import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Surface, Text, Title } from "react-native-paper";

import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { RootStackParamList } from "@/navigation/types";
import { AudioPipeline } from "@/services/audio/AudioPipeline";
import { getNoteString } from "@/utils/music";
import colors from "@/theme/colors";
import type { AudioDetection } from "@/types";

/* -------------------------------------------------- */
/* Navigation types                                    */
/* -------------------------------------------------- */

type TestScreenNavProp = StackNavigationProp<
    RootStackParamList,
    "TestScreen"
>;

/* -------------------------------------------------- */
/* Screen Component                                    */
/* -------------------------------------------------- */

export default function TestScreen() {
    const navigation = useNavigation<TestScreenNavProp>();

    // Create a single pipeline instance (never recreate on rerender)
    const pipeline = useMemo(() => new AudioPipeline(), []);

    const [currentDetection, setCurrentDetection] = useState<AudioDetection | null>(null);
    const [isListening, setIsListening] = useState(false);

    /**
     * On mount:
     *  - Start listening immediately
     * On unmount:
     *  - Stop the pipeline
     */
    useEffect(() => {
        console.log("[TestScreen] Mount → auto-start audio pipeline");

        pipeline.start((detection) => {
        setCurrentDetection(detection ?? null);
        });

        setIsListening(true);

        return () => {
        console.log("[TestScreen] Unmount → stop pipeline");
        pipeline.stop();
        setIsListening(false);
        };
    }, []);

    /**
     * Pause or resume the audio pipeline
     */
    const handleToggleListening = () => {
        if (isListening) {
        pipeline.stop();
        setIsListening(false);
        return;
        }

        pipeline.start((detection) => {
        setCurrentDetection(detection ?? null);
        });

        setIsListening(true);
    };

    /**
     * Navigate back and ensure everything stops
     */
    const handleGoBack = () => {
        pipeline.stop();
        setIsListening(false);
        navigation.goBack();
    };

    /**
     * Format detection output for display
     */
    const displayNote = () => {
        if (!currentDetection?.note) return "--";
        return getNoteString(currentDetection.note);
    };

    const displayMeta = () => {
        if (!currentDetection) return "No detection yet";
        return `${currentDetection.frequency.toFixed(2)} Hz • ${(
        currentDetection.confidence * 100
        ).toFixed(0)}%`;
    };

    return (
        <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.bg.main }}
        edges={["top"]}
        >
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
            <Title style={styles.title}>Test Screen</Title>
            <Text style={styles.subtitle}>
                Real-time pitch detection output viewer
            </Text>
            </View>

            {/* Detection display */}
            <Surface style={styles.surface}>
            <Text style={styles.label}>CURRENT NOTE</Text>

            <Text style={styles.noteText}>{displayNote()}</Text>

            <Text style={styles.metaText}>{displayMeta()}</Text>
            </Surface>

            {/* Controls */}
            <View style={styles.controls}>
            <Button
                mode="contained"
                onPress={handleToggleListening}
                style={styles.primaryButton}
                icon={isListening ? "pause" : "play"}
                textColor="#fff"
            >
                {isListening ? "Pause Listening" : "Resume Listening"}
            </Button>

            <Button
                mode="outlined"
                onPress={handleGoBack}
                style={styles.secondaryButton}
                icon="arrow-left"
                textColor="#C77DFF"
            >
                Back
            </Button>
            </View>
        </View>
        </SafeAreaView>
    );
    }

/* -------------------------------------------------- */
/* Styles                                              */
/* -------------------------------------------------- */

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
        backgroundColor: colors.bg.main,
    },

    header: {
        marginBottom: 20,
        alignItems: "center",
    },

    title: {
        color: colors.text.primary,
        fontSize: 20,
        fontWeight: "700",
        letterSpacing: 0.6,
    },

    subtitle: {
        marginTop: 4,
        color: colors.text.subtle,
        fontSize: 12,
        textAlign: "center",
    },

    surface: {
        marginTop: 10,
        marginBottom: 24,
        paddingVertical: 32,
        borderRadius: 18,
        alignItems: "center",
        backgroundColor: "rgba(36,0,56,0.75)",
        borderWidth: 1.5,
        borderColor: "rgba(199,125,255,0.6)",
        shadowColor: "#C77DFF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.65,
        shadowRadius: 16,
    },

    label: {
        color: colors.text.subtle,
        letterSpacing: 1,
        fontSize: 12,
        marginBottom: 8,
    },

    noteText: {
        fontSize: 56,
        fontWeight: "800",
        color: colors.text.primary,
    },

    metaText: {
        marginTop: 8,
        color: colors.text.subtle,
        fontSize: 14,
    },

    controls: {
        marginTop: 8,
    },

    primaryButton: {
        backgroundColor: "#250036",
        borderRadius: 26,
        borderWidth: 2,
        borderColor: "rgba(199,125,255,0.65)",
        marginBottom: 12,
    },

    secondaryButton: {
        borderRadius: 26,
        borderWidth: 1.5,
        borderColor: "rgba(199,125,255,0.65)",
        backgroundColor: "rgba(36,0,56,0.4)",
    },
});
