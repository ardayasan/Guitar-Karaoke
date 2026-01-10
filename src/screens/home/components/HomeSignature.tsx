import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";

import colors from "@/theme/colors";

const HomeSignature = () => {
    return (
        <View style={styles.container}>
            <View style={styles.divider} />
            <Text style={styles.signature}>
                Made with 💜 by Arda & Burak
            </Text>
        </View>
    );
};

export default HomeSignature;

const styles = StyleSheet.create({
    container: {
        marginTop: 8,
        marginBottom: 32,
        alignItems: "center",
        paddingHorizontal: 24,
    },

    divider: {
        width: 60,
        height: 2,
        backgroundColor: "rgba(199,125,255,0.3)",
        borderRadius: 1,
        marginBottom: 16,
    },

    signature: {
        color: colors.text.primary,
        fontSize: 12,
        letterSpacing: 0.3,
        opacity: 0.65,
    },
});
