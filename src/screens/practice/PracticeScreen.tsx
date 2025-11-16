/**
 * Practice Screen
 * Main practice interface with real-time pitch detection and feedback
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import {
  Button,
  Card,
  Title,
  Paragraph,
  ProgressBar,
  Surface,
  Text,
  IconButton,
} from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import { usePracticeStore } from '@/store';
import { getPitchDetectionService } from '@/services/pitch';
import { AudioRecordingService } from '@/services/audio';
import { AudioDetection } from '@/types';
import { getNoteString } from '@/utils/music';

type PracticeScreenRouteProp = RouteProp<RootStackParamList, 'Practice'>;
type PracticeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Practice'>;

export default function PracticeScreen() {
  const route = useRoute<PracticeScreenRouteProp>();
  const navigation = useNavigation<PracticeScreenNavigationProp>();
  const tab = route.params.tab;

  const {
    isActive,
    isPaused,
    stats,
    currentDetection,
    currentFeedback,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    setCurrentDetection,
    reset,
  } = usePracticeStore();

  const [audioService] = useState(() => new AudioRecordingService());
  const [pitchService] = useState(() => getPitchDetectionService());
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    // Initialize session
    startSession();

    return () => {
      // Cleanup on unmount
      handleStopListening();
      reset();
    };
  }, []);

  const handleStartListening = async () => {
    try {
      // Start pitch detection
      pitchService.start((detection: AudioDetection | null) => {
        setCurrentDetection(detection);
      });

      // Start audio recording
      const started = await audioService.startRecording(
        (samples: Float32Array, timestamp: number) => {
          // Process audio samples for pitch detection
          pitchService.processSamples(samples, timestamp);
        }
      );

      if (started) {
        setIsListening(true);
      } else {
        Alert.alert(
          'Permission Required',
          'Microphone access is required for pitch detection. Please enable it in Settings.'
        );
      }
    } catch (error) {
      console.error('Error starting audio:', error);
      Alert.alert('Error', 'Failed to start audio recording');
    }
  };

  const handleStopListening = async () => {
    pitchService.stop();
    await audioService.stopRecording();
    setIsListening(false);
  };

  const handlePause = () => {
    pauseSession();
    handleStopListening();
  };

  const handleResume = () => {
    resumeSession();
    handleStartListening();
  };

  const handleEnd = () => {
    Alert.alert(
      'End Practice',
      'Are you sure you want to end this practice session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          style: 'destructive',
          onPress: () => {
            handleStopListening();
            endSession();
            navigation.goBack();
          },
        },
      ]
    );
  };

  const getFeedbackColor = () => {
    if (!currentFeedback) return '#999';
    switch (currentFeedback.type) {
      case 'correct':
        return '#4caf50';
      case 'incorrect':
        return '#f44336';
      case 'missed':
        return '#ff9800';
      default:
        return '#999';
    }
  };

  return (
    <View style={styles.container}>
      {/* Song Info */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>{tab.metadata.title}</Title>
          <Paragraph>{tab.metadata.artist}</Paragraph>
          <Paragraph>Tempo: {tab.metadata.tempo} BPM</Paragraph>
        </Card.Content>
      </Card>

      {/* Current Detection Display */}
      <Surface style={styles.detectionSurface}>
        <Text style={styles.detectionLabel}>Current Note:</Text>
        <Text style={[styles.detectionText, { color: getFeedbackColor() }]}>
          {currentDetection?.note
            ? getNoteString(currentDetection.note)
            : '--'}
        </Text>
        {currentDetection && (
          <Text style={styles.frequencyText}>
            {currentDetection.frequency.toFixed(2)} Hz
            {' • '}
            {(currentDetection.confidence * 100).toFixed(0)}% confidence
          </Text>
        )}
      </Surface>

      {/* Stats Display */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Statistics</Title>
          <View style={styles.statRow}>
            <Text>Accuracy:</Text>
            <Text style={styles.statValue}>
              {stats.averageAccuracy.toFixed(1)}%
            </Text>
          </View>
          <ProgressBar
            progress={stats.averageAccuracy / 100}
            color="#6200ee"
            style={styles.progressBar}
          />
          <View style={styles.statRow}>
            <Text>Correct:</Text>
            <Text style={styles.statValue}>{stats.correctNotes}</Text>
          </View>
          <View style={styles.statRow}>
            <Text>Incorrect:</Text>
            <Text style={styles.statValue}>{stats.incorrectNotes}</Text>
          </View>
          <View style={styles.statRow}>
            <Text>Current Streak:</Text>
            <Text style={styles.statValue}>{stats.currentStreak}</Text>
          </View>
          <View style={styles.statRow}>
            <Text>Best Streak:</Text>
            <Text style={styles.statValue}>{stats.longestStreak}</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Tab Display Placeholder */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Tablature</Title>
          <Paragraph style={styles.placeholder}>
            Tablature display will appear here
          </Paragraph>
          <Paragraph style={styles.note}>
            (AlphaTab integration coming soon)
          </Paragraph>
        </Card.Content>
      </Card>

      {/* Control Buttons */}
      <View style={styles.controls}>
        {!isListening ? (
          <Button
            mode="contained"
            onPress={handleStartListening}
            style={styles.button}
            icon="microphone"
          >
            Start Listening
          </Button>
        ) : (
          <>
            {!isPaused ? (
              <Button
                mode="contained"
                onPress={handlePause}
                style={styles.button}
                icon="pause"
              >
                Pause
              </Button>
            ) : (
              <Button
                mode="contained"
                onPress={handleResume}
                style={styles.button}
                icon="play"
              >
                Resume
              </Button>
            )}
          </>
        )}
        <Button
          mode="outlined"
          onPress={handleEnd}
          style={styles.button}
          icon="stop"
        >
          End Practice
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  detectionSurface: {
    padding: 24,
    marginBottom: 16,
    elevation: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  detectionLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  detectionText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  frequencyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statValue: {
    fontWeight: 'bold',
  },
  progressBar: {
    marginTop: 8,
    marginBottom: 8,
    height: 8,
    borderRadius: 4,
  },
  placeholder: {
    textAlign: 'center',
    color: '#999',
    marginTop: 16,
  },
  note: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  controls: {
    marginTop: 'auto',
  },
  button: {
    marginBottom: 12,
  },
});
