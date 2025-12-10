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
            <Text style={styles.title}>SmartTab</Text>

            <Text style={styles.subtitle}>
            Real-time guitar practice assistant
            </Text>
        </View>
        </LinearGradient>
    );
};

export default HomeHero;

const styles = StyleSheet.create({
    hero: {
        paddingTop: 115,
        paddingBottom: 80,
        alignItems: "center",
    },

    inner: {
        alignItems: "center",
    },

    title: {
        fontSize: 65,

        fontFamily: typography.heroTitle,
        color: colors.text.primary,
    },

    subtitle: {
        fontSize: 15,
        textAlign: "center",

        fontFamily: typography.heroSubtitle,
        color: colors.text.secondary,
    },
});
