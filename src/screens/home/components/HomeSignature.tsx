import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";

import colors from "@/theme/colors";

const HomeSignature = () => {
    return (
        <View style={styles.container}>
        <Text style={styles.signature}>
            Developed by Arda Yasan & Burak Kuruçay
        </Text>
        </View>
    );
};

export default HomeSignature;

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
        marginBottom: 22,
        alignItems: "center",
    },

    signature: {
        color: colors.text.primary,
        fontSize: 11,
        letterSpacing: 0.4,
        opacity: 0.75,
    },
});
