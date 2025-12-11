import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';

import HomeScreen from '@/screens/home/HomeScreen';
import LibraryScreen from '@/screens/library/LibraryScreen';
import PracticeScreen from '@/screens/practice/PracticeScreen';
import SettingsScreen from '@/screens/settings/SettingsScreen';
import InformationScreen from '@/screens/information/InformationScreen';
import TestScreen from '@/screens/test/TestScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#12001c',
            shadowColor: 'transparent', 
            elevation: 0,
          },
          headerTintColor: '#C77DFF',
          headerTitleStyle: {
            fontWeight: '700',
            letterSpacing: 1,
            color: '#EDE3FF',
          },
          headerTitleAlign: 'center',
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'SmartTab',
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="Library"
          component={LibraryScreen}
          options={{
            title: 'Tab Library',
            headerBackTitle: "Home"
          }}
        />

        <Stack.Screen
          name="Practice"
          component={PracticeScreen}
          options={{
            title: 'Practice Mode',
            headerLeft: () => null,
            gestureEnabled: false,
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
            headerBackTitle: "Home",
          }}
        />

        <Stack.Screen
          name="Information"
          component={InformationScreen}
          options={{
            title: 'About SmartTab',
            headerBackTitle: "Home"
          }}
        />

        <Stack.Screen
          name="TestScreen"
          component={TestScreen}
          options={{
            title: 'TEST SCREEN',
            headerBackTitle: "Home"
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
