import React from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Provider as PaperProvider, MD3DarkTheme } from "react-native-paper";

import { useFonts } from "expo-font";
import AppNavigator from "@/navigation/AppNavigator";

import colors from "@/theme/colors";

export default function App() {
  const [fontsLoaded] = useFonts({
    "SG-Bold": require("./assets/fonts/SpaceGrotesk/SpaceGrotesk-Bold.ttf"),
    "SG-SemiBold": require("./assets/fonts/SpaceGrotesk/SpaceGrotesk-SemiBold.ttf"),
    "SG-Medium": require("./assets/fonts/SpaceGrotesk/SpaceGrotesk-Medium.ttf"),
    "SG-Regular": require("./assets/fonts/SpaceGrotesk/SpaceGrotesk-Regular.ttf"),
    "SG-Light": require("./assets/fonts/SpaceGrotesk/SpaceGrotesk-Light.ttf"),
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={paperTheme}>
        <AppNavigator />
        <StatusBar style="light" />
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

const paperTheme = {
  ...MD3DarkTheme,

  colors: {
    ...MD3DarkTheme.colors,

    primary: colors.brand.primary,
    background: colors.bg.main,
    surface: colors.bg.main,

    onPrimary: colors.text.primary,
    onBackground: colors.text.primary,
    onSurface: colors.text.primary,
  },
};
