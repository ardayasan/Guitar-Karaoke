/**
 * PracticeHeader
 * --------------------------------------------------
 * Pure UI component for displaying practice metadata.
 *
 * Responsibilities:
 * - Display song / exercise title
 * - Display artist and tempo
 *
 * NO business logic.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import colors from "@/theme/colors";

type Props = {
    title: string;
    subtitle?: string;
};

export default function PracticeHeader({
    title,
    subtitle,
}: Props) {
    return (
        <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>

        {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
        )}
        </View>
    );
}

/* -------------------------------------------------- */
/* Styles                                             */
/* -------------------------------------------------- */

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
        marginBottom: 12,
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(199,125,255,0.25)",
    },

    title: {
        color: colors.text.primary,
        fontSize: 18,
        fontWeight: "600",
        letterSpacing: 0.6,
    },

    subtitle: {
        marginTop: 2,
        color: colors.text.subtle,
        fontSize: 12,
        letterSpacing: 0.4,
    },
});
