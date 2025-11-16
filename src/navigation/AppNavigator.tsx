/**
 * Main App Navigator
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';

// Import screens
import HomeScreen from '@/screens/home/HomeScreen';
import LibraryScreen from '@/screens/library/LibraryScreen';
import PracticeScreen from '@/screens/practice/PracticeScreen';
import SettingsScreen from '@/screens/settings/SettingsScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#6200ee',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'SmartTab',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="Library"
          component={LibraryScreen}
          options={{
            title: 'Tab Library',
          }}
        />
        <Stack.Screen
          name="Practice"
          component={PracticeScreen}
          options={{
            title: 'Practice',
            headerLeft: () => null, // Prevent going back during practice
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
