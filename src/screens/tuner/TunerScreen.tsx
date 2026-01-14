import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Animated, Easing } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '@/theme/colors';
import { AudioPipeline } from '@/services/audio/AudioPipeline';

const { width } = Dimensions.get('window');

/**
 * Guitar strings (6 → 1)
 */
const STRINGS = [
  { string: 6, name: 'E', octave: 2, freq: 82.41 },
  { string: 5, name: 'A', octave: 2, freq: 110.0 },
  { string: 4, name: 'D', octave: 3, freq: 146.83 },
  { string: 3, name: 'G', octave: 3, freq: 196.0 },
  { string: 2, name: 'B', octave: 3, freq: 246.94 },
  { string: 1, name: 'E', octave: 4, freq: 329.63 },
];

// Meter dimensions
const METER_SIZE = width - 80;
const METER_RADIUS = METER_SIZE / 2;
const NEEDLE_LENGTH = METER_RADIUS - 20;

export default function TunerScreen() {
  const pipelineRef = useRef<AudioPipeline | null>(null);

  // Animated needle rotation
  const needleRotation = useRef(new Animated.Value(0)).current;

  const [isListening, setIsListening] = useState(false);
  const [note, setNote] = useState<{ name: string; octave: number } | null>(null);
  const [cents, setCents] = useState(0);
  const [status, setStatus] = useState<string>('SILENT');
  const [selectedString, setSelectedString] = useState<number | null>(null);
  const [isSilent, setIsSilent] = useState(true);

  useEffect(() => {
    pipelineRef.current = new AudioPipeline();
    return () => {
      pipelineRef.current?.stop();
      pipelineRef.current = null;
    };
  }, []);

  // Send string selection to native when it changes
  useEffect(() => {
    if (pipelineRef.current && isListening) {
      pipelineRef.current.setTunerString(selectedString);
    }
  }, [selectedString, isListening]);

  const animateNeedle = useCallback((targetCents: number) => {
    // Map cents (-50 to +50) to rotation (-1 to +1)
    const rotation = Math.max(-1, Math.min(1, targetCents / 50));

    Animated.timing(needleRotation, {
      toValue: rotation,
      duration: 200,  // Slower for smoother movement
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [needleRotation]);

  const handleDetection = useCallback((d: any) => {
    // Handle silence / null
    if (!d || d.isSilent) {
      setIsSilent(true);
      // DON'T clear the note - keep showing the last detected note to prevent flicker
      setCents(0);
      setStatus('SILENT');
      animateNeedle(0);
      return;
    }

    // Only process tuner data
    if (!d.isTuner) return;

    setIsSilent(false);

    const c = d.cents ?? 0;
    setCents(Math.round(c));
    setStatus(d.status ?? 'PERFECT');

    if (d.targetName && d.targetOctave !== undefined) {
      setNote({ name: d.targetName, octave: d.targetOctave });
    }

    animateNeedle(c);
  }, [animateNeedle]);

  const start = () => {
    if (!pipelineRef.current || pipelineRef.current.isRunning()) return;

    // Set string selection before starting
    pipelineRef.current.setTunerString(selectedString);
    pipelineRef.current.start(handleDetection, 'tuner');
    setIsListening(true);
  };

  const stop = () => {
    pipelineRef.current?.stop();
    setIsListening(false);
    setIsSilent(true);
    setNote(null);
    setCents(0);
    setStatus('SILENT');
    animateNeedle(0);
  };

  const toggleString = (stringNo: number) => {
    setSelectedString(prev => prev === stringNo ? null : stringNo);
  };

  // Calculate status color
  const getStatusColor = () => {
    if (isSilent || !note) return colors.text.subtle;
    if (status === 'PERFECT') return colors.feedback.correct;
    const absCents = Math.abs(cents);
    if (absCents <= 10) return '#4ADE80'; // Bright green
    if (absCents <= 25) return '#FACC15'; // Yellow
    return '#F87171'; // Red
  };

  // Needle rotation interpolation
  const needleStyle = {
    transform: [
      {
        rotate: needleRotation.interpolate({
          inputRange: [-1, 1],
          outputRange: ['-60deg', '60deg'],
        }),
      },
    ],
  };

  // Status text
  const getStatusText = () => {
    if (!isListening) return 'TAP TO START';
    if (isSilent || !note) return 'PLAY A STRING';
    if (status === 'PERFECT') return 'IN TUNE';
    return status;
  };

  return (
    <LinearGradient
      colors={[colors.bg.heroTop, colors.bg.heroMid, colors.bg.heroBottom]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.content}>

          {/* NOTE DISPLAY */}
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>{note ? note.name : '--'}</Text>
            <Text style={styles.octaveText}>{note ? note.octave : ''}</Text>
          </View>

          {/* SEMICIRCULAR METER */}
          <View style={styles.meterContainer}>
            {/* Background arc */}
            <View style={styles.meterArc}>
              {/* Tick marks */}
              {[-40, -30, -20, -10, 0, 10, 20, 30, 40].map((tick) => {
                const angle = (tick / 50) * 60; // Map to ±60 degrees
                const isCenter = tick === 0;
                return (
                  <View
                    key={tick}
                    style={[
                      styles.tickMark,
                      isCenter && styles.tickMarkCenter,
                      {
                        transform: [
                          { rotate: `${angle}deg` },
                          { translateY: -METER_RADIUS + 15 },
                        ],
                      },
                    ]}
                  />
                );
              })}

              {/* Needle */}
              <Animated.View style={[styles.needle, needleStyle]}>
                <View style={[styles.needleLine, { backgroundColor: getStatusColor() }]} />
              </Animated.View>

              {/* Center dot */}
              <View style={styles.centerDot} />
            </View>

            {/* Cents display */}
            <Text style={styles.centsText}>
              {!isSilent && note ? `${cents > 0 ? '+' : ''}${cents}` : ''}
            </Text>
          </View>

          {/* STATUS */}
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>

          {/* CONTROL */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={[
                styles.circleButton,
                {
                  backgroundColor: isListening ? colors.feedback.incorrect : colors.brand.primary,
                  shadowColor: isListening ? colors.feedback.incorrect : colors.brand.primary,
                },
              ]}
              onPress={isListening ? stop : start}
              activeOpacity={0.85}
            >
              <Icon source={isListening ? 'stop' : 'microphone'} size={40} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* STRING SELECTOR */}
          <View style={styles.stringSelector}>
            <TouchableOpacity
              style={[styles.autoButton, selectedString === null && styles.autoActive]}
              onPress={() => setSelectedString(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.autoText}>AUTO</Text>
            </TouchableOpacity>

            {STRINGS.map((s) => {
              const active = selectedString === s.string;
              return (
                <TouchableOpacity
                  key={s.string}
                  style={styles.stringItem}
                  onPress={() => toggleString(s.string)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.stringLine, active && styles.stringLineActive]} />
                  <Text style={[styles.stringNumber, active && styles.stringNumberActive]}>
                    {s.string}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ───────── styles ───────── */

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1, padding: 20, alignItems: 'center' },

  noteBox: { alignItems: 'center', marginTop: 20 },
  noteText: {
    fontSize: 100,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: colors.brand.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  octaveText: {
    fontSize: 28,
    color: colors.text.secondary,
    marginTop: -12,
    fontWeight: '600',
    opacity: 0.85,
  },

  // Meter
  meterContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  meterArc: {
    width: METER_SIZE,
    height: METER_SIZE / 2 + 20,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  tickMark: {
    position: 'absolute',
    width: 2,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.4)',
    bottom: 0,
  },
  tickMarkCenter: {
    width: 3,
    height: 20,
    backgroundColor: colors.feedback.correct,
  },
  needle: {
    position: 'absolute',
    bottom: 0,
    width: 4,
    height: NEEDLE_LENGTH,
    alignItems: 'center',
  },
  needleLine: {
    width: 4,
    height: NEEDLE_LENGTH,
    borderRadius: 2,
  },
  centerDot: {
    position: 'absolute',
    bottom: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.brand.primary,
  },
  centsText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    height: 24,
  },

  statusText: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 0,
    letterSpacing: 1.5,
  },

  // String selector
  stringSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
    marginBottom: 20,
    height: 90
  },
  autoButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    height: 70,

    alignItems: 'center',
    justifyContent: 'center'
  },
  autoActive: {
    backgroundColor: colors.brand.primary,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  autoText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1,
  },
  stringItem: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  stringLine: {
    width: 10,
    height: 70,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 3,
  },
  stringLineActive: {
    height: 80,
    backgroundColor: colors.brand.primary,
    shadowColor: colors.brand.primary,
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  stringNumber: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '700',
  },
  stringNumberActive: {
    color: '#fff',
    fontWeight: '900',
  },

  controls: { alignItems: 'center', marginTop: 10 },
  circleButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    marginBottom: 10
  },
});
