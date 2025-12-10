import React from "react";
import { ScrollView, StyleSheet } from "react-native";

import HomeHero from "./components/HomeHero";
import HomeDescriptions from "./components/HomeDescriptions";
import HomeSignature from "./components/HomeSignature";

import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/navigation/types";

import colors from "@/theme/colors";

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

    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.bg.main,
  },

});
