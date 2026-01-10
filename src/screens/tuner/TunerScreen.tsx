import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '@/theme/colors';
import { AudioPipeline } from '@/services/audio/AudioPipeline';

const { width } = Dimensions.get('window');
const BAR_WIDTH = width - 40;
const BAR_CENTER = BAR_WIDTH / 2;

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

export default function TunerScreen() {
  const pipelineRef = useRef<AudioPipeline | null>(null);

  const lastFreqRef = useRef<number | null>(null);

  // Silence reset refs
  const lastDetectionTimeRef = useRef<number>(0);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [note, setNote] = useState<{ name: string; octave: number } | null>(null);
  const [cents, setCents] = useState(0);
  const [target, setTarget] = useState<(typeof STRINGS)[0] | null>(null);
  const [selectedString, setSelectedString] = useState<(typeof STRINGS)[0] | null>(null);

  useEffect(() => {
    pipelineRef.current = new AudioPipeline();
    return () => {
      // cleanup timers + pipeline
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      pipelineRef.current?.stop();
      pipelineRef.current = null;
    };
  }, []);

  const resetToIdle = useCallback(() => {
    setCents(0);
    setTarget(null);
    setNote(null);
    lastFreqRef.current = null;
  }, []);

  const handleDetection = useCallback(
    (d: any) => {
      // If pipeline emits null/partial data, don't thrash UI; silence timer will handle reset.
      if (!d?.frequency) return;

      // mark last detection time
      lastDetectionTimeRef.current = Date.now();

      // clear any pending silence reset
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      const raw = d.frequency;

      // smoothing
      const ALPHA = 0.15;
      const smooth =
        lastFreqRef.current == null ? raw : lastFreqRef.current * (1 - ALPHA) + raw * ALPHA;
      lastFreqRef.current = smooth;

      // target selection
      const targetString = selectedString
        ? selectedString
        : STRINGS.reduce((p, c) =>
            Math.abs(c.freq - smooth) < Math.abs(p.freq - smooth) ? c : p
          );

      setTarget(targetString);
      setNote({ name: targetString.name, octave: targetString.octave });

      // cents relative to target ONLY
      let c = 1200 * Math.log2(smooth / targetString.freq);
      if (Math.abs(c) <= 3) c = 0;

      setCents(Math.max(-50, Math.min(50, Math.round(c))));

      // schedule silence reset (GuitarTuna-like)
      silenceTimerRef.current = setTimeout(() => {
        const elapsed = Date.now() - lastDetectionTimeRef.current;
        if (elapsed >= 400) {
          resetToIdle();
        }
      }, 400);
    },
    [selectedString, resetToIdle]
  );

  const start = () => {
    if (!pipelineRef.current || pipelineRef.current.isRunning()) return;
    pipelineRef.current.start(handleDetection, 'tuner');
    setIsListening(true);

    // start in idle center state
    lastDetectionTimeRef.current = Date.now();
  };

  const stop = () => {
    pipelineRef.current?.stop();
    setIsListening(false);

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    lastDetectionTimeRef.current = 0;

    resetToIdle();
  };

  // Marker position: always centered when idle/perfect
  const markerX =
    cents === 0 ? BAR_CENTER : Math.max(0, Math.min(BAR_WIDTH, ((cents + 50) / 100) * BAR_WIDTH));

  const abs = Math.abs(cents);
  const isPerfect = abs <= 3;

  let statusText = 'IN TUNE';
  let statusColor = colors.feedback.correct;

  if (!note) {
    statusText = isListening ? 'PLAY A STRING' : 'TAP TO START';
    statusColor = colors.text.subtle;
  } else if (!isPerfect) {
    statusText = cents < 0 ? 'LOW' : 'HIGH';
    statusColor = abs < 15 ? '#FFCC00' : colors.feedback.incorrect;
  }

  // Discrete steps for marker label (NOT cents)
  const step = abs <= 3 ? 0 : abs <= 10 ? 1 : abs <= 25 ? 2 : 3;
  const stepText = step === 0 ? '' : cents < 0 ? `-${step}` : `+${step}`;

  return (
    <LinearGradient
      colors={[colors.bg.heroTop, colors.bg.heroMid, colors.bg.heroBottom]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.content}>
          {/* NOTE */}
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>{note ? note.name : '--'}</Text>
            <Text style={styles.octaveText}>{note ? note.octave : ''}</Text>
          </View>

          {/* BAR */}
          <View style={styles.tunerBar}>
            <View style={styles.centerLine} />

            <View
              style={[
                styles.marker,
                {
                  left: markerX,
                  backgroundColor: isPerfect ? colors.feedback.correct : '#fff',
                  borderColor: isPerfect ? '#fff' : 'rgba(255,255,255,0.8)',
                },
              ]}
            >
              {stepText !== '' && <Text style={styles.markerValue}>{stepText}</Text>}
            </View>
          </View>

          {/* STATUS */}
          <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>

          {/* STRING SELECTOR (bigger + not stuck at bottom) */}
          <View style={styles.stringSelector}>
            <TouchableOpacity
              style={[styles.autoButton, selectedString === null && styles.autoActive]}
              onPress={() => setSelectedString(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.autoText}>AUTO</Text>
            </TouchableOpacity>

            {STRINGS.map((s) => {
              const active = selectedString === s;
              return (
                <TouchableOpacity
                  key={s.string}
                  style={styles.stringItem}
                  onPress={() => setSelectedString(active ? null : s)}
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
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ───────── styles ───────── */

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1, padding: 20 },

  noteBox: { alignItems: 'center', marginTop: 40 },
  noteText: {
    fontSize: 120,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: colors.brand.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    elevation: 10,
  },
  octaveText: {
    fontSize: 32,
    color: colors.text.secondary,
    marginTop: -16,
    fontWeight: '600',
    opacity: 0.85,
  },

  tunerBar: {
    width: BAR_WIDTH,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 4,
    alignSelf: 'center',
    marginVertical: 28,
    position: 'relative',
  },
  centerLine: {
    position: 'absolute',
    left: BAR_CENTER - 1,
    width: 2,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.85)',
    top: -4,
    borderRadius: 1,
  },
  marker: {
    position: 'absolute',
    top: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: -16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 12,
  },
  markerValue: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.bg.main,
    letterSpacing: 0.3,
  },

  statusText: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 1,
  },

  // Selector placed above button and made bigger
  stringSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 18,
    marginTop: 6,
    marginBottom: 18,
  },
  autoButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  autoActive: {
    backgroundColor: colors.brand.primary,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  autoText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  stringItem: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  stringLine: {
    width: 7,
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 4,
  },
  stringLineActive: {
    height: 66,
    backgroundColor: colors.brand.primary,
    shadowColor: colors.brand.primary,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 10,
  },
  stringNumber: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '700',
  },
  stringNumberActive: {
    color: '#fff',
    fontWeight: '900',
  },

  controls: { alignItems: 'center', marginTop: 6 },
  circleButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
});
