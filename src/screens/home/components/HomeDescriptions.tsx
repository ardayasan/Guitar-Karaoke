import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text, Icon } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { RootStackParamList } from "@/navigation/types";
import colors from "@/theme/colors";


type Nav = StackNavigationProp<RootStackParamList, "Home">;

const CTA_SIZE = 156;
const MINI_SIZE = 70;
const GAP = 40;
const MINI_OFFSET_Y = 70;

export default function HomeDescriptions() {
    const navigation = useNavigation<Nav>();

    return (
        <View style={styles.container}>

        {/* CTA */}
        <View style={styles.ctaWrapper}>

            <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("Library")}
            >
            <Icon
                source="folder-music-outline"
                size={34}
                color="rgba(255,255,255,0.95)"
            />

            <Text style={styles.ctaText}>
                Pick a Tab
            </Text>
            </TouchableOpacity>

            {/* INFO — solda */}
            <TouchableOpacity
            style={[styles.utilityBtn, styles.infoBtn]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Information")}
            >
            <Icon
                source="information-outline"
                size={22}
                color="rgba(255,255,255,0.95)"
            />
            </TouchableOpacity>

            {/* SETTINGS — at the right */}
            <TouchableOpacity
            style={styles.utilityBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Settings")}
            >
            <Icon
                source="cog-outline"
                size={22}
                color="#FFFFFF"
            />
            </TouchableOpacity>

        </View>

        <FlowLine />
        <FlowNode icon="guitar-acoustic" label="Play Guitar" />
        <FlowLine />

        {/* Additional Features Row */}
        <View style={styles.featuresRow}>
            <TouchableOpacity
                style={styles.featureButton}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("Tuner")}
            >
                <Icon
                    source="music-clef-treble"
                    size={28}
                    color="rgba(255,255,255,0.95)"
                />
                <Text style={styles.featureText}>Guitar Tuner</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.featureButton}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("Songwriting")}
            >
                <Icon
                    source="pencil-plus"
                    size={28}
                    color="rgba(255,255,255,0.95)"
                />
                <Text style={styles.featureText}>Create Song</Text>
            </TouchableOpacity>
        </View>

        </View>
    );
}

const FlowNode = ({ icon, label }: { icon: string; label: string }) => (
    <View style={styles.node}>
        <View style={styles.circle}>
            <Icon source={icon} size={30} color={colors.text.primary} />
        </View>
        <Text style={styles.nodeText}>
        {label}
        </Text>
    </View>
);

const FlowLine = () => (
    <View style={styles.line} />
);


/* STYLES */
const styles = StyleSheet.create({

    container: {
        alignItems: "center",
        paddingBottom: 28,
    },

    /* CTA */

    ctaWrapper: {
        width: CTA_SIZE,
        height: CTA_SIZE,
        marginBottom: 18,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },

    ctaButton: {
        width: CTA_SIZE,
        height: CTA_SIZE,
        borderRadius: CTA_SIZE / 2,

        backgroundColor: "#250036",

        borderWidth: 2,
        borderColor: "rgba(199,125,255,0.55)",

        shadowColor: "#C77DFF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 18,

        elevation: 12,

        justifyContent: "center",
        alignItems: "center",
    },

    ctaText: {
        marginTop: 6,
        color: "rgba(255,255,255,0.92)",

        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 0.6,
        lineHeight: 18,
    },

    /* Utility Buttons */

    utilityBtn: {
        position: "absolute",

        width: MINI_SIZE,
        height: MINI_SIZE,
        borderRadius: MINI_SIZE / 2,

        backgroundColor: "rgba(36,0,56,0.65)",

        borderWidth: 1.5,
        borderColor: "rgba(199,125,255,0.45)",

        shadowColor: "#C77DFF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 10,

        elevation: 7,

        justifyContent: "center",
        alignItems: "center",

        right: -(MINI_SIZE / 2 + GAP),
        top: "50%",
        transform: [{ translateY: -(MINI_SIZE / 2) + MINI_OFFSET_Y }],
    },

    infoBtn: {
        left: -(MINI_SIZE / 2 + GAP),
        right: undefined,
    },

    /* FLOW */

    node: {
        alignItems: "center",
    },

    circle: {
        width: 72,
        height: 72,
        borderRadius: 36,

        backgroundColor: colors.flow.circleBg,
        borderWidth: 1,
        borderColor: colors.flow.circleBorder,

        justifyContent: "center",
        alignItems: "center",
    },

    nodeText: {
        marginTop: 10,
        marginBottom: 14,

        fontSize: 15,
        color: colors.text.primary,

        opacity: 0.9,
        letterSpacing: 0.2,
    },

    line: {
        width: 1.6,
        height: 26,
        backgroundColor: colors.flow.line,
    },

    /* FEATURES ROW */
    featuresRow: {
        flexDirection: 'row',
        gap: 24,
        marginTop: 8,
    },

    featureButton: {
        width: 120,
        height: 120,
        borderRadius: 60,

        backgroundColor: '#250036',

        borderWidth: 2,
        borderColor: 'rgba(199,125,255,0.45)',

        shadowColor: '#C77DFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 14,

        elevation: 8,

        justifyContent: 'center',
        alignItems: 'center',
    },

    featureText: {
        marginTop: 6,
        color: 'rgba(255,255,255,0.90)',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.4,
        textAlign: 'center',
    },
});
