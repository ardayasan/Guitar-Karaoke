import React from "react";
import { View, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { Text, Icon } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { LinearGradient } from "expo-linear-gradient";

import { RootStackParamList } from "@/navigation/types";
import colors from "@/theme/colors";

type Nav = StackNavigationProp<RootStackParamList, "Home">;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 48;

export default function HomeDescriptions() {
    const navigation = useNavigation<Nav>();

    return (
        <View style={styles.container}>
            {/* Main CTA - Play Song */}
            <TouchableOpacity
                style={styles.mainCard}
                activeOpacity={0.9}
                onPress={() => navigation.navigate("Library")}
            >
                <LinearGradient
                    colors={["#7A3CFF", "#C77DFF", "#E4B5FF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.mainCardGradient}
                >
                    <View style={styles.mainCardContent}>
                        <Icon
                            source="play-circle"
                            size={48}
                            color="#fff"
                        />
                        <View style={styles.mainCardText}>
                            <Text style={styles.mainCardTitle}>Play Song</Text>
                            <Text style={styles.mainCardSubtitle}>
                                Practice with tabs from your library
                            </Text>
                        </View>
                        <Icon
                            source="chevron-right"
                            size={28}
                            color="rgba(255,255,255,0.8)"
                        />
                    </View>
                </LinearGradient>
            </TouchableOpacity>

            {/* Feature Cards Row */}
            <View style={styles.featureRow}>
                <TouchableOpacity
                    style={styles.featureCard}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate("Songwriting")}
                >
                    <View style={styles.featureIconWrap}>
                        <Icon
                            source="pencil-plus"
                            size={26}
                            color="#C77DFF"
                        />
                    </View>
                    <Text style={styles.featureTitle}>Create</Text>
                    <Text style={styles.featureSubtitle}>New Song</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.featureCard}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate("Tuner")}
                >
                    <View style={styles.featureIconWrap}>
                        <Icon
                            source="music-clef-treble"
                            size={26}
                            color="#C77DFF"
                        />
                    </View>
                    <Text style={styles.featureTitle}>Tuner</Text>
                    <Text style={styles.featureSubtitle}>Guitar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.featureCard}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate("Information")}
                >
                    <View style={styles.featureIconWrap}>
                        <Icon
                            source="information-outline"
                            size={26}
                            color="#C77DFF"
                        />
                    </View>
                    <Text style={styles.featureTitle}>About</Text>
                    <Text style={styles.featureSubtitle}>GuitarKaraoke</Text>
                </TouchableOpacity>
            </View>

            {/* Dev/Debug Row */}
            <TouchableOpacity
                style={styles.debugCard}
                activeOpacity={0.9}
                onPress={() => navigation.navigate("DetectionTest")}
            >
                <Icon
                    source="bug-outline"
                    size={20}
                    color="#FF6B6B"
                />
                <Text style={styles.debugText}>Detection Test</Text>
                <Icon
                    source="chevron-right"
                    size={20}
                    color="rgba(255,255,255,0.4)"
                />
            </TouchableOpacity>

            {/* Quick Stats / Tip Card */}
            <View style={styles.tipCard}>
                <Icon
                    source="lightbulb-outline"
                    size={20}
                    color="#FFD700"
                />
                <Text style={styles.tipText}>
                    Tip: Play slowly at first, then increase speed as you improve
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 24,
        paddingBottom: 16,
    },

    /* Main CTA Card */
    mainCard: {
        marginBottom: 20,
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#C77DFF",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
    },

    mainCardGradient: {
        paddingVertical: 24,
        paddingHorizontal: 20,
    },

    mainCardContent: {
        flexDirection: "row",
        alignItems: "center",
    },

    mainCardText: {
        flex: 1,
        marginLeft: 16,
    },

    mainCardTitle: {
        fontSize: 24,
        fontWeight: "800",
        color: "#fff",
        letterSpacing: 0.5,
    },

    mainCardSubtitle: {
        fontSize: 13,
        color: "rgba(255,255,255,0.85)",
        marginTop: 4,
    },

    /* Feature Cards Row */
    featureRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
    },

    featureCard: {
        width: (CARD_WIDTH - 24) / 3,
        backgroundColor: "rgba(36,0,56,0.8)",
        borderRadius: 16,
        paddingVertical: 20,
        paddingHorizontal: 8,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(199,125,255,0.25)",
    },

    featureIconWrap: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "rgba(199,125,255,0.15)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 10,
    },

    featureTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#fff",
    },

    featureSubtitle: {
        fontSize: 11,
        color: "rgba(255,255,255,0.6)",
        marginTop: 2,
    },

    /* Tip Card */
    tipCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,215,0,0.08)",
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: "rgba(255,215,0,0.2)",
    },

    tipText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 13,
        color: "rgba(255,255,255,0.8)",
        lineHeight: 18,
    },

    /* Debug Card */
    debugCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,107,107,0.08)",
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(255,107,107,0.2)",
    },

    debugText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 14,
        fontWeight: "600",
        color: "rgba(255,255,255,0.8)",
    },
});
