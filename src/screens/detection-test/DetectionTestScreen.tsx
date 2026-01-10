/**
 * DetectionTestScreen
 * --------------------------------------------------
 * NativeAudioPipeline RAW output viewer.
 *
 * PURPOSE:
 * - Show EXACTLY what native emits
 * - No tuning logic
 * - No interpretation
 * - No string / cent math
 * - Just truth
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "react-native-paper";

import colors from "@/theme/colors";
import { AudioPipeline } from "@/services/audio/AudioPipeline";

export default function DetectionTestScreen() {
    const pipeline = useMemo(() => new AudioPipeline(), []);

    const [isRunning, setIsRunning] = useState(false);
    const [current, setCurrent] = useState<any | null>(null);
    const [log, setLog] = useState<string[]>([]);

    const scrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        return () => pipeline.stop();
    }, [pipeline]);

    // ============================================================
    // Native detection handler (RAW)
    // ============================================================

    const handleDetection = (d: any | null) => {
        // Silence event
        if (d === null) {
            setCurrent(null);
            // appendLog("[SILENCE]");
            return;
        }

        setCurrent(d);
        // appendLog(formatDetection(d));
    };

    // const appendLog = (line: string) => {
    //     const ts = new Date().toLocaleTimeString("en-US", {
    //         hour12: false,
    //         minute: "2-digit",
    //         second: "2-digit",
    //         fractionalSecondDigits: 2,
    //     });

    //     setLog(prev => [...prev.slice(-200), `[${ts}] ${line}`]);
    // };

    // ============================================================
    // Formatting helpers (NO interpretation)
    // ============================================================

    const formatDetection = (d: any): string => {
        if (d.chord) {
            return `CHORD  root=${d.chord.root}  type=${d.chord.type}  conf=${pct(d.confidence)}`;
        }

        if (typeof d.frequency === "number") {
            const note =
                d.note?.name !== undefined
                    ? `${d.note.name}${d.note.octave}`
                    : "--";

            return `NOTE   ${note.padEnd(4)}  freq=${d.frequency.toFixed(2)}Hz  conf=${pct(d.confidence)}`;
        }

        return `DATA   ${JSON.stringify(d)}`;
    };

    const pct = (v?: number) =>
        `${Math.round((v ?? 0) * 100)}%`;

    // ============================================================
    // Controls
    // ============================================================

    const start = () => {
        setLog([]);
        setCurrent(null);
        pipeline.start(handleDetection, "karaoke");
        setIsRunning(true);
    };

    const stop = () => {
        pipeline.stop();
        setIsRunning(false);
    };

    // ============================================================
    // UI
    // ============================================================

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>

                {/* CURRENT */}
                <View style={styles.currentBox}>
                    <Text style={styles.label}>CURRENT DETECTION</Text>

                    {!current ? (
                        <Text style={styles.placeholder}>
                            {isRunning ? "Listening…" : "Tap START"}
                        </Text>
                    ) : current.chord ? (
                        <>
                            <Text style={styles.big}>
                                {current.chord.root} {current.chord.type}
                            </Text>
                            <Text style={styles.sub}>
                                confidence {pct(current.confidence)}
                            </Text>
                        </>
                    ) : typeof current.frequency === "number" ? (
                        <>
                            <Text style={styles.big}>
                                {current.note?.name ?? "--"}
                                {current.note?.octave ?? ""}
                            </Text>
                            <Text style={styles.freq}>
                                {current.frequency.toFixed(2)} Hz
                            </Text>
                            <Text style={styles.sub}>
                                confidence {pct(current.confidence)}
                            </Text>
                        </>
                    ) : (
                        <Text style={styles.mono}>
                            {JSON.stringify(current, null, 2)}
                        </Text>
                    )}
                </View>

                {/* LOG */}
                {/* <View style={styles.logBox}>
                    <Text style={styles.label}>PIPELINE LOG</Text>

                    <ScrollView
                        ref={scrollRef}
                        onContentSizeChange={() =>
                            scrollRef.current?.scrollToEnd({ animated: false })
                        }
                    >
                        {log.length === 0 ? (
                            <Text style={styles.empty}>No data yet</Text>
                        ) : (
                            log.map((l, i) => (
                                <Text key={i} style={styles.logLine}>
                                    {l}
                                </Text>
                            ))
                        )}
                    </ScrollView>
                </View> */}

                {/* CONTROLS */}
                <View style={styles.controls}>
                    <Button
                        mode="contained"
                        onPress={isRunning ? stop : start}
                        style={[
                            styles.btn,
                            {
                                backgroundColor: isRunning
                                    ? colors.feedback.incorrect
                                    : colors.brand.primary,
                            },
                        ]}
                    >
                        {isRunning ? "STOP" : "START"}
                    </Button>

                    <Button
                        mode="outlined"
                        onPress={() => setLog([])}
                        style={styles.btn}
                    >
                        CLEAR
                    </Button>
                </View>
            </View>
        </SafeAreaView>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: colors.bg.main,
    },
    container: {
        flex: 1,
        padding: 16,
    },

    label: {
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        color: "rgba(255,255,255,0.4)",
        marginBottom: 8,
    },

    currentBox: {
        backgroundColor: "rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        alignItems: "center",
    },

    big: {
        fontSize: 42,
        fontWeight: "700",
        color: "#fff",
    },

    freq: {
        fontSize: 18,
        color: colors.brand.primary,
        marginTop: 2,
    },

    sub: {
        fontSize: 14,
        color: "rgba(255,255,255,0.6)",
        marginTop: 6,
    },

    placeholder: {
        fontSize: 16,
        color: "rgba(255,255,255,0.3)",
    },

    mono: {
        fontSize: 12,
        fontFamily: "monospace",
        color: "#0f0",
    },

    logBox: {
        flex: 1,
        backgroundColor: "#000",
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
    },

    empty: {
        color: "rgba(255,255,255,0.3)",
        textAlign: "center",
        marginTop: 20,
    },

    logLine: {
        fontSize: 11,
        fontFamily: "monospace",
        color: "#0f0",
        marginBottom: 2,
    },

    controls: {
        flexDirection: "row",
        gap: 12,
    },

    btn: {
        flex: 1,
        borderRadius: 10,
    },
});
