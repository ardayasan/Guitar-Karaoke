/**
 * Home Screen
 * Main landing screen with app overview and quick actions
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Card, Title, Paragraph, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const theme = useTheme();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* App Header */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <Title style={styles.title}>SmartTab - Guitar Karaoke</Title>
            <Paragraph style={styles.subtitle}>
              Real-time Guitar Practice Assistant
            </Paragraph>
            <Paragraph style={styles.description}>
              Practice guitar with instant feedback! SmartTab listens to your playing,
              compares it with tablature, and shows you exactly where you are in real-time.
            </Paragraph>
          </Card.Content>
        </Card>

        {/* Features */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Features</Title>
            <View style={styles.featureList}>
              <Paragraph>🎸 Real-time pitch detection</Paragraph>
              <Paragraph>🎵 Tablature synchronization</Paragraph>
              <Paragraph>✅ Instant visual feedback</Paragraph>
              <Paragraph>📊 Practice statistics</Paragraph>
              <Paragraph>🎯 Accuracy scoring</Paragraph>
            </View>
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Get Started</Title>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Library')}
              style={styles.button}
              icon="library-music"
            >
              Browse Tab Library
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Settings')}
              style={styles.button}
              icon="cog"
            >
              Settings
            </Button>
          </Card.Content>
        </Card>

        {/* How It Works */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>How It Works</Title>
            <Paragraph style={styles.step}>
              1. Select a tab from the library or import your own
            </Paragraph>
            <Paragraph style={styles.step}>
              2. Grant microphone permissions when prompted
            </Paragraph>
            <Paragraph style={styles.step}>
              3. Start practicing - SmartTab will listen and provide feedback
            </Paragraph>
            <Paragraph style={styles.step}>
              4. Green highlights mean correct notes, red means incorrect
            </Paragraph>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  headerCard: {
    marginBottom: 16,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  featureList: {
    marginTop: 8,
  },
  button: {
    marginTop: 12,
  },
  step: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
});
