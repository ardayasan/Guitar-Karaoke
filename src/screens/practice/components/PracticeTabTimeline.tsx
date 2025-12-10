/**
 * PracticeTabTimeline
 *
 * TRUE guitar tablature renderer with ACTIVE STEP HUD:
 * - 6 horizontal strings
 * - Frets rendered ON strings
 * - Global vertical HUD bar marks current stage step
 */

import React, { useMemo, useEffect, useState } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Text } from "react-native-paper";

import { Tablature, TabEvent } from "@/types";
import colors from "@/theme/colors";

type Props = {
    tab: Tablature;
    windowSize?: number;
};

const STRINGS = [1, 2, 3, 4, 5, 6];
const { width: SCREEN_WIDTH } = Dimensions.get("window");

function flattenTabEvents(tab: Tablature): TabEvent[] {
    if (!tab.measures) return [];
    return tab.measures.flatMap((m: any) => m.events || []);
}

const PracticeTabTimeline: React.FC<Props> = ({
    tab,
    windowSize = 6,
}) => {
    const events = useMemo(() => flattenTabEvents(tab), [tab]);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        setActiveIndex(0);
    }, [tab.id]);

    if (events.length === 0) {
        return (
        <View style={styles.empty}>
            <Text style={styles.emptyText}>
            No tablature data available.
            </Text>
        </View>
        );
    }

    const visible = events.slice(
        activeIndex,
        activeIndex + windowSize
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
                {visible.map((event, colIdx) => {

                const pos = event.positions?.find(
                    (p) => p.string === string
                );
                const fret = pos?.fret;
                const isActive = colIdx === 0;

                return (
                    <View
                    key={`${string}-${colIdx}`}
                    style={[
                        styles.colSlot,
                        { width: COL_WIDTH },
                    ]}
                    >

                    {fret !== undefined && (
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
                            {fret}
                        </Text>
                        </View>
                    )}

                    </View>
                );
                })}
            </View>

            </View>
        ))}

        <Text style={styles.progress}>
            Step {activeIndex + 1} / {events.length}
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

    /* ===== HUD OVERLAY ===== */

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

    /* ===== STRING SYSTEM ===== */

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

    /* ===== FRETS ===== */

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

    /* ===== FOOTER ===== */

    progress: {
        marginTop: 10,
        textAlign: "center",
        fontSize: 12,
        color: colors.text.subtle,
        opacity: 0.9,
    },

    /* EMPTY */

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
