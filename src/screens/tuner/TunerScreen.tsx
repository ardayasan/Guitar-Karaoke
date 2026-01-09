import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/theme/colors';
import { AudioPipeline } from '@/services/audio/AudioPipeline';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Standard guitar tuning (E2, A2, D3, G3, B3, E4)
const GUITAR_STRINGS = [
  { name: 'E', octave: 2, frequency: 82.41, string: 6 },
  { name: 'A', octave: 2, frequency: 110.00, string: 5 },
  { name: 'D', octave: 3, frequency: 146.83, string: 4 },
  { name: 'G', octave: 3, frequency: 196.00, string: 3 },
  { name: 'B', octave: 3, frequency: 246.94, string: 2 },
  { name: 'E', octave: 4, frequency: 329.63, string: 1 },
];

export default function TunerScreen() {
  const [isListening, setIsListening] = useState(false);
  const [detectedNote, setDetectedNote] = useState<{ name: string; octave: number; frequency?: number } | null>(null);
  const [tuningStatus, setTuningStatus] = useState<'low' | 'perfect' | 'high' | null>(null);
  const [cents, setCents] = useState(0);

  const pipelineRef = useRef<AudioPipeline | null>(null);

  useEffect(() => {
    pipelineRef.current = new AudioPipeline();

    return () => {
      pipelineRef.current?.stop();
      pipelineRef.current = null;
    };
  }, []);

  const handleDetection = useCallback((detection: any) => {
    if (!detection || !detection.note) {
      setDetectedNote(null);
      setTuningStatus(null);
      setCents(0);
      return;
    }

    const { name, octave, frequency } = detection.note;
    setDetectedNote({ name, octave, frequency });

    // Find the closest target note
    const targetNote = GUITAR_STRINGS.find(
      (s) => s.name === name && s.octave === octave
    );

    if (targetNote && frequency) {
      // Calculate cents difference
      const centsOff = 1200 * Math.log2(frequency / targetNote.frequency);
      setCents(Math.round(centsOff));

      // Determine tuning status (within 5 cents is perfect)
      if (Math.abs(centsOff) <= 5) {
        setTuningStatus('perfect');
      } else if (centsOff < 0) {
        setTuningStatus('low');
      } else {
        setTuningStatus('high');
      }
    } else {
      setTuningStatus(null);
      setCents(0);
    }
  }, []);

  const handleStartListening = () => {
    if (!pipelineRef.current) return;
    pipelineRef.current.start(handleDetection);
    setIsListening(true);
  };

  const handleStopListening = () => {
    pipelineRef.current?.stop();
    setIsListening(false);
    setDetectedNote(null);
    setTuningStatus(null);
    setCents(0);
  };

  const getTuningColor = () => {
    if (!tuningStatus) return colors.text.subtle;
    if (tuningStatus === 'perfect') return colors.feedback.correct;
    return colors.feedback.incorrect;
  };

  const getTuningText = () => {
    if (!tuningStatus) return 'Play a string';
    if (tuningStatus === 'perfect') return '✓ In Tune';
    if (tuningStatus === 'low') return '↓ Too Low';
    return '↑ Too High';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Guitar Tuner</Text>

        {/* Reference strings */}
        <View style={styles.stringsContainer}>
          {GUITAR_STRINGS.map((string) => (
            <View key={string.string} style={styles.stringRow}>
              <Text style={styles.stringNumber}>{string.string}</Text>
              <Text style={styles.stringNote}>
                {string.name}{string.octave}
              </Text>
              <Text style={styles.stringFreq}>
                {string.frequency.toFixed(2)} Hz
              </Text>
            </View>
          ))}
        </View>

        {/* Detection display */}
        <View style={styles.detectionContainer}>
          {detectedNote ? (
            <>
              <Text style={[styles.detectedNote, { color: getTuningColor() }]}>
                {detectedNote.name}{detectedNote.octave}
              </Text>
              {detectedNote.frequency && (
                <Text style={styles.frequency}>
                  {detectedNote.frequency.toFixed(2)} Hz
                </Text>
              )}
              <Text style={[styles.tuningStatus, { color: getTuningColor() }]}>
                {getTuningText()}
              </Text>
              {cents !== 0 && (
                <Text style={styles.cents}>
                  {cents > 0 ? '+' : ''}{cents} cents
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.waitingText}>
              {isListening ? 'Listening...' : 'Press Start to tune'}
            </Text>
          )}
        </View>

        {/* Tuning indicator */}
        {tuningStatus && (
          <View style={styles.indicatorContainer}>
            <View style={styles.indicatorBar}>
              <View
                style={[
                  styles.indicatorMarker,
                  {
                    left: `${Math.max(0, Math.min(100, 50 + cents))}%`,
                    backgroundColor: getTuningColor(),
                  },
                ]}
              />
            </View>
            <View style={styles.indicatorLabels}>
              <Text style={styles.indicatorLabel}>Low</Text>
              <Text style={styles.indicatorLabel}>Perfect</Text>
              <Text style={styles.indicatorLabel}>High</Text>
            </View>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          {!isListening ? (
            <Button
              mode="contained"
              onPress={handleStartListening}
              style={styles.startButton}
              buttonColor={colors.brand.primary}
            >
              Start Tuning
            </Button>
          ) : (
            <Button
              mode="outlined"
              onPress={handleStopListening}
              style={styles.stopButton}
              textColor={colors.feedback.incorrect}
            >
              Stop
            </Button>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.main,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  stringsContainer: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  stringRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  stringNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.utility.accent,
    width: 30,
  },
  stringNote: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  stringFreq: {
    fontSize: 14,
    color: colors.text.subtle,
  },
  detectionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: 'rgba(122,60,255,0.15)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(199,125,255,0.3)',
    marginBottom: 24,
    minHeight: 200,
  },
  detectedNote: {
    fontSize: 72,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  frequency: {
    fontSize: 18,
    color: colors.text.subtle,
    marginBottom: 16,
  },
  tuningStatus: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  cents: {
    fontSize: 16,
    color: colors.text.subtle,
  },
  waitingText: {
    fontSize: 18,
    color: colors.text.subtle,
    textAlign: 'center',
  },
  indicatorContainer: {
    marginBottom: 32,
  },
  indicatorBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    marginBottom: 8,
    position: 'relative',
  },
  indicatorMarker: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    top: -4,
    marginLeft: -8,
  },
  indicatorLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  indicatorLabel: {
    fontSize: 12,
    color: colors.text.subtle,
  },
  controls: {
    marginTop: 'auto',
  },
  startButton: {
    borderRadius: 12,
  },
  stopButton: {
    borderRadius: 12,
    borderColor: colors.feedback.incorrect,
  },
});
