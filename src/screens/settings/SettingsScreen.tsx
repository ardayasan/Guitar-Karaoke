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

import colors from "@/theme/colors";
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
    sensitivity: 0.15,
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>

        {/* GENERAL */}
        <ThemedCard title="General">
          <SwitchRow
            icon="play-circle"
            title="Auto-start listening"
            description="Start listening when entering practice mode"
            value={settings.autoStart}
            onToggle={() => toggleSetting("autoStart")}
          />

          <SwitchRow
            icon="timer"
            title="Strict mode"
            description="Require exact timing for correct notes"
            value={settings.strictMode}
            onToggle={() => toggleSetting("strictMode")}
          />
        </ThemedCard>

        {/* DISPLAY */}
        <ThemedCard title="Display">
          <SwitchRow
            icon="sine-wave"
            title="Show frequency"
            description="Display detected frequency in Hz"
            value={settings.showFrequency}
            onToggle={() => toggleSetting("showFrequency")}
          />

          <SwitchRow
            icon="percent"
            title="Show confidence"
            description="Display detection confidence percentage"
            value={settings.showConfidence}
            onToggle={() => toggleSetting("showConfidence")}
          />
        </ThemedCard>

        {/* FEEDBACK */}
        <ThemedCard title="Feedback">
          <SwitchRow
            icon="vibrate"
            title="Haptic feedback"
            description="Vibrate on correct/incorrect notes"
            value={settings.hapticFeedback}
            onToggle={() => toggleSetting("hapticFeedback")}
          />

          <SwitchRow
            icon="volume-high"
            title="Sound feedback"
            description="Play sounds for correct/incorrect notes"
            value={settings.soundFeedback}
            onToggle={() => toggleSetting("soundFeedback")}
          />
        </ThemedCard>

        {/* AUDIO */}
        <ThemedCard title="Audio Detection">
          <Paragraph style={styles.description}>
            These advanced settings affect pitch detection accuracy and responsiveness.
          </Paragraph>

          <InfoRow label={`Sensitivity: ${pitchConfig.sensitivity.toFixed(2)}`}>
            (Lower = more sensitive, higher = more accurate)
          </InfoRow>

          <InfoRow label={`Smoothing: ${pitchConfig.smoothing} frames`}>
            (Higher = smoother, lower = more responsive)
          </InfoRow>

          <InfoRow label={`Min confidence: ${(pitchConfig.minConfidence * 100).toFixed(0)}%`}>
            (Minimum confidence to accept detection)
          </InfoRow>

          <Button
            mode="outlined"
            onPress={() => setPitchConfig({
              sensitivity: DEFAULT_PITCH_CONFIG.yinThreshold,
              smoothing: DEFAULT_PITCH_CONFIG.smoothingWindow,
              minConfidence: DEFAULT_PITCH_CONFIG.minConfidence,
            })}
            style={styles.resetButton}
            textColor={colors.brand.primary}
          >
            Reset to Defaults
          </Button>
        </ThemedCard>

        {/* ABOUT */}
        <ThemedCard title="About">
          <Paragraph style={styles.aboutTitle}>
            SmartTab – Guitar Karaoke
          </Paragraph>

          <Paragraph style={styles.aboutText}>
            A real-time guitar practice assistant providing instant visual feedback.
          </Paragraph>

          <Paragraph style={styles.aboutText}>
            Developed by Arda Yasan & Burak Kuruçay
          </Paragraph>

          <Paragraph style={styles.aboutText}>
            Graduation Project 2025
          </Paragraph>
        </ThemedCard>

      </View>
    </ScrollView>
  );
}


/* SUB COMPONENTS */
const ThemedCard = ({ title, children }: any) => (
  <Card style={styles.card}>
    <Card.Content>
      <Title style={styles.sectionTitle}>{title}</Title>
      <Divider style={styles.divider} />
      {children}
    </Card.Content>
  </Card>
);

const SwitchRow = ({ icon, title, description, value, onToggle }: any) => (
  <>
    <List.Item
      title={title}
      description={description}
      titleStyle={styles.itemTitle}
      descriptionStyle={styles.itemDesc}
      left={(props) => (
        <List.Icon
          {...props}
          icon={icon}
          color={colors.brand.primary}
        />
      )}
      right={() => (
        <Switch
          value={value}
          onValueChange={onToggle}
          color={colors.brand.primary}
        />
      )}
    />
    <Divider style={styles.rowDivider} />
  </>
);

const InfoRow = ({ label, children }: any) => (
  <View style={styles.settingRow}>
    <Text style={styles.settingLabel}>
      {label}
    </Text>
    <Text style={styles.settingHint}>
      {children}
    </Text>
  </View>
);


/* STYLES */
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.bg.main,
  },

  content: {
    padding: 16,
  },

  /* CARDS */
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    marginBottom: 14,
    elevation: 0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.flow.circleBorder,
  },

  sectionTitle: {
    color: colors.text.primary,
    textAlign: "center",
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  divider: {
    width: 48,
    height: 1,
    marginBottom: 10,
    alignSelf: "center",
    backgroundColor: colors.flow.line,
  },

  rowDivider: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  /* LIST */
  itemTitle: {
    color: colors.text.primary,
  },

  itemDesc: {
    color: colors.text.subtle,
  },

  /* AUDIO INFO */
  description: {
    color: colors.text.secondary,
    fontSize: 12,
    textAlign: "center",
    marginBottom: 14,
  },

  settingRow: {
    marginTop: 10,
  },

  settingLabel: {
    color: colors.text.primary,
  },

  settingHint: {
    color: colors.text.subtle,
    fontSize: 11,
    marginTop: 2,
  },

  resetButton: {
    marginTop: 16,
    borderColor: "rgba(199,125,255,0.5)",
    borderRadius: 10,
  },

  /* ABOUT */
  aboutTitle: {
    textAlign: "center",
    color: colors.text.primary,
    fontWeight: "600",
    marginBottom: 6,
  },

  aboutText: {
    textAlign: "center",
    color: colors.text.subtle,
    fontSize: 12,
    marginTop: 4,
  },
});
