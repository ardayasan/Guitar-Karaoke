import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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

    const targetNote = GUITAR_STRINGS.find(
      (s) => s.name === name && s.octave === octave
    );

    if (targetNote && frequency) {
      const centsOff = 1200 * Math.log2(frequency / targetNote.frequency);
      setCents(Math.round(centsOff));

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
        {/* Detection Card */}
        <View style={styles.detectionCard}>
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
              <View style={styles.indicatorCenter} />
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

        {/* String Reference Cards */}
        <View style={styles.stringsGrid}>
          {GUITAR_STRINGS.map((string) => (
            <View key={string.string} style={styles.stringCard}>
              <Text style={styles.stringNumber}>{string.string}</Text>
              <Text style={styles.stringNote}>{string.name}{string.octave}</Text>
              <Text style={styles.stringFreq}>{string.frequency.toFixed(0)}Hz</Text>
            </View>
          ))}
        </View>

        {/* Controls */}
        <TouchableOpacity
          style={[
            styles.mainButton,
            isListening && styles.mainButtonStop
          ]}
          activeOpacity={0.9}
          onPress={isListening ? handleStopListening : handleStartListening}
        >
          <LinearGradient
            colors={isListening
              ? ['#ff5c5c', '#ff3333']
              : ['#7A3CFF', '#C77DFF']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mainButtonGradient}
          >
            <Text style={styles.mainButtonText}>
              {isListening ? 'Stop' : 'Start Tuning'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
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
    padding: 20,
  },

  /* Detection Card */
  detectionCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: 'rgba(36,0,56,0.8)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(199,125,255,0.3)',
    marginBottom: 20,
    minHeight: 180,
    shadowColor: '#C77DFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  detectedNote: {
    fontSize: 64,
    fontWeight: '800',
    marginBottom: 4,
  },
  frequency: {
    fontSize: 16,
    color: colors.text.subtle,
    marginBottom: 12,
  },
  tuningStatus: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  cents: {
    fontSize: 14,
    color: colors.text.subtle,
  },
  waitingText: {
    fontSize: 18,
    color: colors.text.subtle,
    textAlign: 'center',
  },

  /* Indicator */
  indicatorContainer: {
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  indicatorBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    marginBottom: 8,
    position: 'relative',
  },
  indicatorCenter: {
    position: 'absolute',
    left: '50%',
    width: 2,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
    top: -4,
    marginLeft: -1,
  },
  indicatorMarker: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    top: -6,
    marginLeft: -10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  indicatorLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  indicatorLabel: {
    fontSize: 11,
    color: colors.text.subtle,
  },

  /* String Grid */
  stringsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  stringCard: {
    width: (SCREEN_WIDTH - 60) / 3,
    backgroundColor: 'rgba(36,0,56,0.6)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(199,125,255,0.2)',
  },
  stringNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C77DFF',
    marginBottom: 4,
  },
  stringNote: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  stringFreq: {
    fontSize: 11,
    color: colors.text.subtle,
    marginTop: 2,
  },

  /* Main Button */
  mainButton: {
    marginTop: 'auto',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#C77DFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  mainButtonStop: {
    shadowColor: '#ff5c5c',
  },
  mainButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  mainButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
});
