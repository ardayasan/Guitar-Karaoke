import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";

import colors from "@/theme/colors";
import typography from "@/theme/typography";

const HomeHero = () => {
    return (
        <LinearGradient
            colors={[
                colors.bg.heroTop,
                colors.bg.heroMid,
                colors.bg.heroBottom,
            ]}
            style={styles.hero}
        >
            <View style={styles.inner}>
                <Text style={styles.title}>GuitarKaraoke</Text>

                <Text style={styles.subtitle}>
                    Your AI Guitar Practice Assistant
                </Text>
            </View>
        </LinearGradient>
    );
};

export default HomeHero;

const styles = StyleSheet.create({
    hero: {
        paddingTop: 80,
        paddingBottom: 40,
        alignItems: "center",
    },

    inner: {
        alignItems: "center",
    },

    title: {
        fontSize: 48,
        fontFamily: typography.heroTitle,
        color: colors.text.primary,
        letterSpacing: 1,
        textShadowColor: "rgba(199,125,255,0.5)",
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 12,
    },

    subtitle: {
        fontSize: 14,
        textAlign: "center",
        fontFamily: typography.heroSubtitle,
        color: colors.text.secondary,
        marginTop: 6,
        letterSpacing: 0.5,
    },
});
