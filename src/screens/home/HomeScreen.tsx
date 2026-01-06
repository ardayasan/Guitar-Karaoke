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

  // for navigating to detection test screen button
  testButtonWrapper: {
    marginTop: 32,
    marginBottom: 48,
    paddingHorizontal: 16,
    opacity: 0.85,
  },
});
