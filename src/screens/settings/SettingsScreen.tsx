/**
 * Settings Screen
 * App configuration and preferences
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Card,
  Title,
  List,
  Switch,
  Divider,
  Button,
  Text,
  Paragraph,
} from 'react-native-paper';
import { DEFAULT_PITCH_CONFIG } from '@/services/pitch/PitchDetectionService';

export default function SettingsScreen() {
  const [settings, setSettings] = useState({
    autoStart: false,
    showFrequency: true,
    showConfidence: true,
    strictMode: false,
    hapticFeedback: true,
    soundFeedback: false,
  });

  const [pitchConfig, setPitchConfig] = useState({
    sensitivity: 0.15, // YIN threshold
    smoothing: 5,
    minConfidence: 0.6,
  });

  const toggleSetting = (key: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* General Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>General</Title>
            <List.Item
              title="Auto-start listening"
              description="Start listening when entering practice mode"
              left={(props) => <List.Icon {...props} icon="play-circle" />}
              right={() => (
                <Switch
                  value={settings.autoStart}
                  onValueChange={() => toggleSetting('autoStart')}
                />
              )}
            />
            <Divider />
            <List.Item
              title="Strict mode"
              description="Require exact timing for correct notes"
              left={(props) => <List.Icon {...props} icon="timer" />}
              right={() => (
                <Switch
                  value={settings.strictMode}
                  onValueChange={() => toggleSetting('strictMode')}
                />
              )}
            />
          </Card.Content>
        </Card>

        {/* Display Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Display</Title>
            <List.Item
              title="Show frequency"
              description="Display detected frequency in Hz"
              left={(props) => <List.Icon {...props} icon="sine-wave" />}
              right={() => (
                <Switch
                  value={settings.showFrequency}
                  onValueChange={() => toggleSetting('showFrequency')}
                />
              )}
            />
            <Divider />
            <List.Item
              title="Show confidence"
              description="Display detection confidence percentage"
              left={(props) => <List.Icon {...props} icon="percent" />}
              right={() => (
                <Switch
                  value={settings.showConfidence}
                  onValueChange={() => toggleSetting('showConfidence')}
                />
              )}
            />
          </Card.Content>
        </Card>

        {/* Feedback Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Feedback</Title>
            <List.Item
              title="Haptic feedback"
              description="Vibrate on correct/incorrect notes"
              left={(props) => <List.Icon {...props} icon="vibrate" />}
              right={() => (
                <Switch
                  value={settings.hapticFeedback}
                  onValueChange={() => toggleSetting('hapticFeedback')}
                />
              )}
            />
            <Divider />
            <List.Item
              title="Sound feedback"
              description="Play sounds for correct/incorrect notes"
              left={(props) => <List.Icon {...props} icon="volume-high" />}
              right={() => (
                <Switch
                  value={settings.soundFeedback}
                  onValueChange={() => toggleSetting('soundFeedback')}
                />
              )}
            />
          </Card.Content>
        </Card>

        {/* Audio Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Audio Detection</Title>
            <Paragraph style={styles.description}>
              These advanced settings affect pitch detection accuracy and responsiveness.
            </Paragraph>
            <View style={styles.settingRow}>
              <Text>Sensitivity: {pitchConfig.sensitivity.toFixed(2)}</Text>
              <Text style={styles.hint}>
                (Lower = more sensitive, higher = more accurate)
              </Text>
            </View>
            <View style={styles.settingRow}>
              <Text>Smoothing: {pitchConfig.smoothing} frames</Text>
              <Text style={styles.hint}>(Higher = smoother, lower = more responsive)</Text>
            </View>
            <View style={styles.settingRow}>
              <Text>Min Confidence: {(pitchConfig.minConfidence * 100).toFixed(0)}%</Text>
              <Text style={styles.hint}>(Minimum confidence to accept detection)</Text>
            </View>
            <Button
              mode="outlined"
              onPress={() => setPitchConfig({
                sensitivity: DEFAULT_PITCH_CONFIG.yinThreshold,
                smoothing: DEFAULT_PITCH_CONFIG.smoothingWindow,
                minConfidence: DEFAULT_PITCH_CONFIG.minConfidence,
              })}
              style={styles.resetButton}
            >
              Reset to Defaults
            </Button>
          </Card.Content>
        </Card>

        {/* About */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>About</Title>
            <Paragraph>SmartTab - Guitar Karaoke v1.0.0</Paragraph>
            <Paragraph style={styles.about}>
              A real-time guitar practice assistant that provides instant feedback
              on your playing.
            </Paragraph>
            <Paragraph style={styles.about}>
              Developed by Arda Yasan and Burak Kuruçay
            </Paragraph>
            <Paragraph style={styles.about}>Graduation Project 2025</Paragraph>
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
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  settingRow: {
    marginTop: 12,
  },
  hint: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 2,
  },
  resetButton: {
    marginTop: 16,
  },
  about: {
    fontSize: 12,
    marginTop: 8,
    color: '#666',
  },
});
