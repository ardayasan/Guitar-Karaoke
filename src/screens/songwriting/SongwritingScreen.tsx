import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Dimensions } from 'react-native';
import { Text, TextInput, Icon } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import { PracticeTab } from '@/types/practice/PracticeTab';
import { PracticeStep } from '@/types/practice/PracticeStep';
import { STANDARD_TUNING_MIDI, midiToNoteName } from '@/utils/music';
import colors from '@/theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function getGuitarNote(guitarString: number, fret: number): { name: string; octave: number } {
  const stringIndex = 6 - guitarString;
  const openStringMidi = STANDARD_TUNING_MIDI[stringIndex];
  const midiNote = openStringMidi + fret;
  return midiToNoteName(midiNote);
}

type Nav = StackNavigationProp<RootStackParamList, 'Songwriting'>;

const COMMON_CHORDS = [
  { name: 'C', type: 'major' }, { name: 'D', type: 'major' }, { name: 'E', type: 'major' },
  { name: 'F', type: 'major' }, { name: 'G', type: 'major' }, { name: 'A', type: 'major' },
  { name: 'Am', type: 'minor' }, { name: 'Em', type: 'minor' }, { name: 'Dm', type: 'minor' },
];

const CUSTOM_SONGS_KEY = '@custom_songs';

export default function SongwritingScreen() {
  const navigation = useNavigation<Nav>();
  const [songTitle, setSongTitle] = useState('');
  const [bpm, setBpm] = useState('120');
  const [selectedString, setSelectedString] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [inputMode, setInputMode] = useState<'note' | 'chord'>('chord');
  const [steps, setSteps] = useState<Array<{ type: 'note' | 'chord' | 'rest'; data: any }>>([]);

  const addNote = (fret: number) => {
    setSteps([...steps, { type: 'note', data: { string: selectedString, fret } }]);
  };

  const addChord = (chordName: string) => {
    setSteps([...steps, { type: 'chord', data: { chordName, strum: 'down' } }]);
  };

  const addRest = () => {
    setSteps([...steps, { type: 'rest', data: {} }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    if (steps.length === 0) return;
    Alert.alert('Clear All', 'Remove all steps?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setSteps([]) },
    ]);
  };

  const saveSong = async () => {
    if (!songTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a song title');
      return;
    }
    if (steps.length === 0) {
      Alert.alert('No Steps', 'Add at least one chord or note');
      return;
    }

    try {
      const practiceSteps: PracticeStep[] = steps.map((step) => {
        if (step.type === 'note') {
          const noteInfo = getGuitarNote(step.data.string, step.data.fret);
          return {
            type: 'note',
            position: { string: step.data.string, fret: step.data.fret },
            note: { name: noteInfo.name, octave: noteInfo.octave },
          } as PracticeStep;
        } else if (step.type === 'chord') {
          return { type: 'chord', chordName: step.data.chordName, strum: 'down' } as PracticeStep;
        }
        return { type: 'rest' } as PracticeStep;
      });

      const newSong: PracticeTab = {
        id: `custom-${Date.now()}`,
        metadata: {
          title: songTitle,
          artist: 'My Song',
          difficulty: 'beginner',
          bpm: parseInt(bpm) || 120,
          timeSignature: { numerator: 4, denominator: 4 },
        },
        steps: practiceSteps,
      };

      const existing = await AsyncStorage.getItem(CUSTOM_SONGS_KEY);
      const songs: PracticeTab[] = existing ? JSON.parse(existing) : [];
      songs.push(newSong);
      await AsyncStorage.setItem(CUSTOM_SONGS_KEY, JSON.stringify(songs));

      Alert.alert('Saved!', `"${songTitle}" has been saved`, [
        { text: 'New Song', onPress: () => { setSongTitle(''); setSteps([]); } },
        { text: 'Go to Library', onPress: () => navigation.navigate('Library') },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save song');
    }
  };

  const getStepDisplay = (step: { type: string; data: any }) => {
    if (step.type === 'chord') return step.data.chordName;
    if (step.type === 'note') {
      const note = getGuitarNote(step.data.string, step.data.fret);
      return `${note.name}${note.octave}`;
    }
    return '—';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Header with Title Input */}
        <View style={styles.headerCard}>
          <TextInput
            placeholder="Song Title"
            value={songTitle}
            onChangeText={setSongTitle}
            style={styles.titleInput}
            placeholderTextColor="rgba(255,255,255,0.4)"
            underlineColor="transparent"
            activeUnderlineColor="#C77DFF"
            textColor="#fff"
          />
          <View style={styles.bpmRow}>
            <Icon source="metronome" size={18} color="#C77DFF" />
            <TextInput
              value={bpm}
              onChangeText={setBpm}
              keyboardType="numeric"
              style={styles.bpmInput}
              placeholderTextColor="rgba(255,255,255,0.4)"
              underlineColor="transparent"
              activeUnderlineColor="#C77DFF"
              textColor="#fff"
            />
            <Text style={styles.bpmLabel}>BPM</Text>
          </View>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, inputMode === 'chord' && styles.modeBtnActive]}
            onPress={() => setInputMode('chord')}
          >
            <Icon source="music" size={20} color={inputMode === 'chord' ? '#fff' : '#C77DFF'} />
            <Text style={[styles.modeBtnText, inputMode === 'chord' && styles.modeBtnTextActive]}>Chords</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, inputMode === 'note' && styles.modeBtnActive]}
            onPress={() => setInputMode('note')}
          >
            <Icon source="music-note" size={20} color={inputMode === 'note' ? '#fff' : '#C77DFF'} />
            <Text style={[styles.modeBtnText, inputMode === 'note' && styles.modeBtnTextActive]}>Notes</Text>
          </TouchableOpacity>
        </View>

        {/* Chord Grid */}
        {inputMode === 'chord' && (
          <View style={styles.chordGrid}>
            {COMMON_CHORDS.map((chord) => (
              <TouchableOpacity
                key={chord.name}
                style={styles.chordBtn}
                onPress={() => addChord(chord.name)}
                activeOpacity={0.8}
              >
                <Text style={styles.chordBtnText}>{chord.name}</Text>
                <Text style={styles.chordBtnType}>{chord.type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Note Input */}
        {inputMode === 'note' && (
          <View style={styles.noteSection}>
            {/* String Selector */}
            <Text style={styles.sectionLabel}>Select String</Text>
            <View style={styles.stringRow}>
              {[6, 5, 4, 3, 2, 1].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.stringBtn, selectedString === s && styles.stringBtnActive]}
                  onPress={() => setSelectedString(s as any)}
                >
                  <Text style={[styles.stringBtnText, selectedString === s && styles.stringBtnTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Fret Grid */}
            <Text style={styles.sectionLabel}>Select Fret</Text>
            <View style={styles.fretGrid}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((fret) => (
                <TouchableOpacity
                  key={fret}
                  style={styles.fretBtn}
                  onPress={() => addNote(fret)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.fretBtnText}>{fret}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Add Rest Button */}
        <TouchableOpacity style={styles.restBtn} onPress={addRest}>
          <Icon source="pause" size={18} color="#C77DFF" />
          <Text style={styles.restBtnText}>Add Rest</Text>
        </TouchableOpacity>

        {/* Steps Preview */}
        <View style={styles.stepsCard}>
          <View style={styles.stepsHeader}>
            <Text style={styles.stepsTitle}>Your Song ({steps.length} steps)</Text>
            {steps.length > 0 && (
              <TouchableOpacity onPress={clearAll}>
                <Text style={styles.clearBtn}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {steps.length === 0 ? (
            <Text style={styles.emptyText}>Tap chords or notes above to build your song</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stepsScroll}>
              {steps.map((step, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.stepChip,
                    step.type === 'chord' && styles.stepChipChord,
                    step.type === 'note' && styles.stepChipNote,
                    step.type === 'rest' && styles.stepChipRest,
                  ]}
                  onPress={() => removeStep(idx)}
                >
                  <Text style={styles.stepChipText}>{getStepDisplay(step)}</Text>
                  <Text style={styles.stepChipRemove}>×</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={saveSong} activeOpacity={0.9}>
          <LinearGradient
            colors={['#7A3CFF', '#C77DFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveBtnGradient}
          >
            <Icon source="content-save" size={22} color="#fff" />
            <Text style={styles.saveBtnText}>Save Song</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.main,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  /* Header Card */
  headerCard: {
    backgroundColor: 'rgba(36,0,56,0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(199,125,255,0.25)',
  },
  titleInput: {
    fontSize: 22,
    fontWeight: '700',
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  bpmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bpmInput: {
    width: 60,
    fontSize: 16,
    backgroundColor: 'transparent',
    textAlign: 'center',
  },
  bpmLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },

  /* Mode Toggle */
  modeToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(36,0,56,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(199,125,255,0.3)',
  },
  modeBtnActive: {
    backgroundColor: '#7A3CFF',
    borderColor: '#7A3CFF',
  },
  modeBtnText: {
    color: '#C77DFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: '#fff',
  },

  /* Chord Grid */
  chordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  chordBtn: {
    width: (SCREEN_WIDTH - 70) / 3,
    paddingVertical: 16,
    backgroundColor: 'rgba(36,0,56,0.8)',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(199,125,255,0.3)',
  },
  chordBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  chordBtnType: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },

  /* Note Section */
  noteSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  stringRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  stringBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: 'rgba(36,0,56,0.6)',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(199,125,255,0.2)',
  },
  stringBtnActive: {
    backgroundColor: '#7A3CFF',
    borderColor: '#7A3CFF',
  },
  stringBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
  stringBtnTextActive: {
    color: '#fff',
  },
  fretGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fretBtn: {
    width: (SCREEN_WIDTH - 88) / 7,
    aspectRatio: 1,
    backgroundColor: 'rgba(36,0,56,0.8)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(199,125,255,0.2)',
  },
  fretBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  /* Rest Button */
  restBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(199,125,255,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(199,125,255,0.2)',
    marginBottom: 20,
  },
  restBtnText: {
    color: '#C77DFF',
    fontSize: 14,
    fontWeight: '600',
  },

  /* Steps Card */
  stepsCard: {
    backgroundColor: 'rgba(36,0,56,0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(199,125,255,0.25)',
    minHeight: 100,
  },
  stepsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  clearBtn: {
    color: '#ff5c5c',
    fontSize: 13,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 16,
  },
  stepsScroll: {
    flexDirection: 'row',
  },
  stepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  stepChipChord: {
    backgroundColor: 'rgba(122,60,255,0.4)',
  },
  stepChipNote: {
    backgroundColor: 'rgba(83,255,154,0.3)',
  },
  stepChipRest: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  stepChipText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  stepChipRemove: {
    marginLeft: 6,
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },

  /* Save Button */
  saveBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#C77DFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  saveBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
});
