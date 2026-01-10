import React from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { Text, Icon } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";

import colors from "@/theme/colors";

/**
 * SmartTab – Information Page
 */
export default function InformationScreen() {
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

            {/* HERO HEADER */}
            <LinearGradient
                colors={[
                    colors.bg.heroTop,
                    colors.bg.heroMid,
                    colors.bg.heroBottom,
                ]}
                style={styles.hero}
            >
                <Text style={styles.heroTitle}>SmartTab</Text>
                <Text style={styles.heroSubtitle}>
                    Your AI Guitar Practice Assistant
                </Text>
            </LinearGradient>

            <View style={styles.content}>
                {/* WHAT IS */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.iconWrap}>
                            <Icon source="information-outline" size={24} color="#C77DFF" />
                        </View>
                        <Text style={styles.cardTitle}>What is SmartTab?</Text>
                    </View>
                    <Text style={styles.cardText}>
                        SmartTab is a practice assistant designed for guitar players who want
                        real-time feedback while playing. It listens to your live performance
                        and checks whether you hit the correct notes.
                    </Text>
                </View>

                {/* HOW IT WORKS */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.iconWrap}>
                            <Icon source="help-circle-outline" size={24} color="#C77DFF" />
                        </View>
                        <Text style={styles.cardTitle}>How it works</Text>
                    </View>
                    <Step number="1" text="Choose a song from the library" />
                    <Step number="2" text="Allow microphone access" />
                    <Step number="3" text="Play along with the tab" />
                    <Step number="4" text="Get instant visual feedback" />
                </View>

                {/* CORE FEATURES */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.iconWrap}>
                            <Icon source="star-outline" size={24} color="#C77DFF" />
                        </View>
                        <Text style={styles.cardTitle}>Core Features</Text>
                    </View>
                    <Feature text="Real-time pitch detection" />
                    <Feature text="Automatic audio-tab sync" />
                    <Feature text="Instant note feedback" />
                    <Feature text="Accuracy scoring" />
                    <Feature text="Local processing" />
                </View>

                {/* CREDITS */}
                <View style={styles.creditCard}>
                    <Text style={styles.creditTitle}>Built with 💜 by</Text>
                    <View style={styles.creditNames}>
                        <Text style={styles.creditName}>Arda Yasan</Text>
                        <Text style={styles.creditDivider}>•</Text>
                        <Text style={styles.creditName}>Burak Kuruçay</Text>
                    </View>
                    <Text style={styles.creditNote}>
                        An experimental music-tech project focused on real-time audio analysis.
                    </Text>
                </View>
            </View>

        </ScrollView>
    );
}

/* SUB COMPONENTS */
const Step = ({ number, text }: { number: string; text: string }) => (
    <View style={styles.stepRow}>
        <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{number}</Text>
        </View>
        <Text style={styles.stepText}>{text}</Text>
    </View>
);

const Feature = ({ text }: { text: string }) => (
    <View style={styles.featureRow}>
        <Icon source="check" size={16} color="#53ff9a" />
        <Text style={styles.featureText}>{text}</Text>
    </View>
);


/* STYLES */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg.main,
    },

    /* HERO */
    hero: {
        paddingTop: 40,
        paddingBottom: 30,
        paddingHorizontal: 24,
        alignItems: "center",
    },
    heroTitle: {
        color: colors.text.primary,
        fontSize: 36,
        fontWeight: "800",
        letterSpacing: 1,
        textShadowColor: "rgba(199,125,255,0.5)",
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
    },
    heroSubtitle: {
        marginTop: 6,
        color: colors.text.secondary,
        fontSize: 14,
        letterSpacing: 0.3,
    },

    /* CONTENT */
    content: {
        padding: 20,
    },

    /* CARDS */
    card: {
        backgroundColor: "rgba(36,0,56,0.8)",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "rgba(199,125,255,0.2)",
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(199,125,255,0.15)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#fff",
    },
    cardText: {
        color: "rgba(255,255,255,0.8)",
        fontSize: 14,
        lineHeight: 22,
    },

    /* STEPS */
    stepRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "rgba(199,125,255,0.3)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    stepNumberText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#fff",
    },
    stepText: {
        color: "rgba(255,255,255,0.85)",
        fontSize: 14,
    },

    /* FEATURES */
    featureRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    featureText: {
        marginLeft: 10,
        color: "rgba(255,255,255,0.85)",
        fontSize: 14,
    },

    /* CREDITS */
    creditCard: {
        backgroundColor: "rgba(199,125,255,0.1)",
        borderRadius: 16,
        padding: 24,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(199,125,255,0.2)",
        marginBottom: 32,
    },
    creditTitle: {
        fontSize: 14,
        color: "rgba(255,255,255,0.7)",
        marginBottom: 8,
    },
    creditNames: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
    },
    creditName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#fff",
    },
    creditDivider: {
        color: "#C77DFF",
        fontSize: 16,
    },
    creditNote: {
        textAlign: "center",
        color: "rgba(255,255,255,0.6)",
        fontSize: 12,
        lineHeight: 18,
    },
});
