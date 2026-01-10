import React from "react";
import { ScrollView, StyleSheet } from "react-native";

import HomeHero from "./components/HomeHero";
import HomeDescriptions from "./components/HomeDescriptions";
import HomeSignature from "./components/HomeSignature";

import colors from "@/theme/colors";

export default function HomeScreen() {
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.main,
  },
});

