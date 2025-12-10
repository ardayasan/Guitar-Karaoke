import React from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import {
    Text,
    Title,
    Paragraph,
    Icon,
    Divider,
} from "react-native-paper";
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
            <Title style={styles.heroTitle}>SmartTab</Title>
            <Paragraph style={styles.heroSubtitle}>
            Real-time guitar practice assistant
            </Paragraph>
            <Text style={styles.heroTagline}>
            We listen while you play and guide you instantly.
            </Text>
        </LinearGradient>

        {/* WHAT IS */}
        <Section title="What is SmartTab?">
            <Paragraph style={styles.paragraph}>
            SmartTab is a practice assistant designed for guitar players who want
            real-time feedback while playing. Instead of passively following tabs,
            the app listens to your live performance and checks whether you hit
            the correct notes.
            </Paragraph>

            <Paragraph style={styles.paragraph}>
            It visually tracks your progress on the tablature and highlights
            mistakes instantly—helping you correct technique before bad habits
            settle in.
            </Paragraph>
        </Section>

        {/* HOW IT WORKS */}
        <Section title="How it works">
            <Step icon="folder-music-outline" text="Choose a tablature from the library." />
            <Step icon="microphone-outline" text="Allow microphone access for live listening." />
            <Step icon="guitar-acoustic" text="Play along with the tab in real time." />
            <Step icon="check-circle-outline" text="Get instant visual feedback and scoring." />
        </Section>

        {/* CORE FEATURES — CENTER TITLE / LEFT LIST */}
        <Section
            title="Core features"
            contentAlign="left"
        >
            <Feature text="Real-time pitch detection optimized for guitar frequencies." />
            <Feature text="Automatic sync between audio input and tablature playback." />
            <Feature text="Immediate correct / incorrect note feedback." />
            <Feature text="Accuracy scoring to track improvement over time." />
            <Feature text="Local processing – no cloud dependency while practicing." />
        </Section>

        {/* VISION */}
        <Section title="Our goal">
            <Paragraph style={styles.paragraph}>
            Learning an instrument alone can be frustrating without instant
            correction. SmartTab aims to provide the feeling of a personal digital
            tutor: always listening, always guiding, always patient.
            </Paragraph>
        </Section>

        {/* CREDITS */}
        <Section title="Built by">
            <View style={styles.creditBox}>
            <Text style={styles.creditText}>Arda Yasan</Text>
            <Text style={styles.creditText}>Burak Kuruçay</Text>
            </View>

            <Text style={styles.creditNote}>
            Developed as an academic and experimental music-tech project focused
            on real-time audio analysis.
            </Text>
        </Section>

        </ScrollView>
    );
}


/* SUB COMPONENTS */
const Section = ({
    title,
    contentAlign = "center",
    children,
    }: {
    title: string;
    contentAlign?: "center" | "left";
    children: React.ReactNode;
    }) => (
    <View style={[
        styles.section,
        contentAlign === "left" && styles.sectionLeft,
    ]}>

        {/* HEADERS ALWAYS CENTER */}
        <Title style={styles.sectionTitle}>{title}</Title>
        <Divider style={styles.divider} />

        {children}

    </View>
    );

    const Step = ({ icon, text }: { icon: string; text: string }) => (
    <View style={styles.stepRow}>
        <Icon source={icon} size={22} color={colors.brand.primary} />
        <Text style={styles.stepText}>{text}</Text>
    </View>
    );

    const Feature = ({ text }: { text: string }) => (
    <View style={styles.featureRow}>
        <Text style={styles.bullet}>•</Text>
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
        paddingTop: 52,
        paddingBottom: 36,
        paddingHorizontal: 16,
        alignItems: "center",
    },

    heroTitle: {
        color: colors.text.primary,
        fontSize: 30,
        fontWeight: "700",
        letterSpacing: 1.2,
    },

    heroSubtitle: {
        marginTop: 6,
        color: colors.text.secondary,
        fontSize: 14,
    },

    heroTagline: {
        marginTop: 6,
        color: colors.text.subtle,
        fontSize: 12,
        textAlign: "center",
        maxWidth: 280,
    },

    /* SECTIONS */
    section: {
        paddingHorizontal: 16,
        paddingTop: 18,
        alignItems: "center",
    },

    sectionLeft: {
        alignItems: "flex-start",
    },

    sectionTitle: {
        color: colors.text.primary,
        fontSize: 18,
        marginBottom: 6,
        letterSpacing: 0.4,
        textAlign: "center",
        alignSelf: "center",
    },

    divider: {
        backgroundColor: colors.flow.line,
        marginBottom: 14,
        height: 1,
        width: 120,
        alignSelf: "center",
    },

    paragraph: {
        color: colors.text.secondary,
        lineHeight: 20,
        marginBottom: 12,
        textAlign: "justify",
        maxWidth: 340,
    },

    /* STEPS */
    stepRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        maxWidth: 340,
    },

    stepText: {
        marginLeft: 10,
        color: colors.text.primary,
        fontSize: 14,
    },

    /* FEATURES */
    featureRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
        maxWidth: 340,
    },

    bullet: {
        color: colors.brand.primary,
        fontSize: 18,
        marginRight: 8,
    },

    featureText: {
        color: colors.text.primary,
        fontSize: 14,
        opacity: 0.9,
        flexShrink: 1,
    },

    /* CREDITS */
    creditBox: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 24,
        marginVertical: 12,
    },

    creditText: {
        color: colors.text.primary,
        fontSize: 15,
        fontWeight: "600",
    },

    creditNote: {
        textAlign: "center",
        color: colors.text.subtle,
        fontSize: 12,
        opacity: 0.8,
        marginBottom: 28,
        paddingHorizontal: 12,
    },
});
