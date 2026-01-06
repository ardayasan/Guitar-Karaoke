import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import HomeHero from "./components/HomeHero";
import HomeDescriptions from "./components/HomeDescriptions";
import HomeSignature from "./components/HomeSignature";

import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/navigation/types";

import colors from "@/theme/colors";

import { Button } from "react-native-paper";

type Nav = StackNavigationProp<RootStackParamList, "Home">;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >

      {/* HERO */}
      <HomeHero />

      {/* MAIN FLOW */}
      <HomeDescriptions />

      {/* SIGNATURE */}
      <HomeSignature />

      {/* FEATURE BUTTONS */}
      <View style={styles.featuresWrapper}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate("Tuner")}
          icon="music-clef-treble"
          buttonColor={colors.brand.primary}
          style={styles.featureButton}
        >
          Guitar Tuner
        </Button>

        <Button
          mode="contained"
          onPress={() => navigation.navigate("Songwriting")}
          icon="pencil-plus"
          buttonColor={colors.brand.primary}
          style={styles.featureButton}
        >
          Create Song
        </Button>
      </View>

      {/* DETECTION TEST BUTTON */}
      <View style={styles.testButtonWrapper}>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate("DetectionTest")}
        >
          Detection Test Screen
        </Button>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.main,
  },

  // Feature buttons for Tuner and Songwriting
  featuresWrapper: {
    marginTop: 32,
    paddingHorizontal: 16,
    gap: 12,
  },

  featureButton: {
    borderRadius: 12,
    paddingVertical: 4,
  },

  // for navigating to detection test screen button
  testButtonWrapper: {
    marginTop: 24,
    marginBottom: 48,
    paddingHorizontal: 16,
    opacity: 0.85,
  },
});
