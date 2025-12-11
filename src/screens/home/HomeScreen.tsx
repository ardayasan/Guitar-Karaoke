import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import HomeHero from "./components/HomeHero";
import HomeDescriptions from "./components/HomeDescriptions";
import HomeSignature from "./components/HomeSignature";

import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/navigation/types";

import { Button, Text } from "react-native-paper";
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


      {/* -------------------------------------------------- */}
      {/* TEST SCREEN BUTTON */}
      {/* -------------------------------------------------- */}
      <View style={styles.testButtonWrapper}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate("TestScreen")}
          style={styles.testButton}
          textColor="#fff"
        >
          Open Test Screen
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

  testButtonWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: "center",
  },

  testButton: {
    width: "100%",
    borderRadius: 24,
    backgroundColor: "#5A189A",
  },

});
