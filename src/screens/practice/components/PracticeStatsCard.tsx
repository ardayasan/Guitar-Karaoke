/**
 * PracticeStatsCard
 * --------------------------------------------------
 * Displays real-time practice statistics.
 *
 * Responsibilities:
 * - Render current statistics
 * - React to stat value changes (pure render)
 *
 * NO business logic.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, Title, ProgressBar, Text } from "react-native-paper";
import colors from "@/theme/colors";

type StatValue = number;

export type PracticeStats = {
    averageAccuracy: StatValue; // 0–100
    correctNotes: StatValue;
    incorrectNotes: StatValue;
    currentStreak: StatValue;
    longestStreak: StatValue;
};

type Props = {
    stats: PracticeStats;
};

export default function PracticeStatsCard({ stats }: Props) {
    const accuracyProgress = stats.averageAccuracy / 100;

    return (
        <Card style={styles.card}>
        <Card.Content>
            <Title style={styles.title}>Statistics</Title>

            <Text style={styles.centerText}>
            Accuracy: {stats.averageAccuracy.toFixed(1)}%
            </Text>

            <ProgressBar
            progress={accuracyProgress}
            color={colors.brand.primary}
            style={styles.progressBar}
            />

            <View style={styles.row}>
            <Stat label="Correct" value={stats.correctNotes} />
            <Stat label="Incorrect" value={stats.incorrectNotes} />
            </View>

            <View style={styles.row}>
            <Stat label="Current" value={stats.currentStreak} />
            <Stat label="Best" value={stats.longestStreak} />
            </View>
        </Card.Content>
        </Card>
    );
    }

    /* ---------------------- SUB COMPONENT ---------------------- */
    function Stat({ label, value }: { label: string; value: number }) {
    return (
        <View style={styles.statBlock}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
        </View>
    );
}

/* -------------------------------------------------- */
/* Styles                                             */
/* -------------------------------------------------- */
const styles = StyleSheet.create({
    card: {
        backgroundColor: "rgba(255,255,255,0.04)",
        marginBottom: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.flow.circleBorder,
        elevation: 0,
    },

    title: {
        textAlign: "center",
        color: colors.text.primary,
        marginBottom: 10,
        letterSpacing: 0.4,
    },

    centerText: {
        textAlign: "center",
        color: colors.text.primary,
    },

    progressBar: {
        marginVertical: 8,
        height: 6,
        borderRadius: 4,
    },

    row: {
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
});
