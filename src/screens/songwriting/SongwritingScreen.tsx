import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Card, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/theme/colors';

const NOTES = ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#'];
const FRETS = Array.from({ length: 25 }, (_, i) => i); // 0-24 frets

export default function SongwritingScreen() {
  const [songTitle, setSongTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [bpm, setBpm] = useState('120');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [selectedString, setSelectedString] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [steps, setSteps] = useState<Array<{ type: 'note' | 'chord' | 'rest'; data: any }>>([]);

  const addNote = (fret: number) => {
    const newStep = {
      type: 'note' as const,
      data: {
        string: selectedString,
        fret,
      },
    };
    setSteps([...steps, newStep]);
  };

  const addRest = () => {
    setSteps([...steps, { type: 'rest', data: {} }]);
  };

  const removeLastStep = () => {
    setSteps(steps.slice(0, -1));
  };

  const clearAll = () => {
    Alert.alert(
      'Clear All',
      'Are you sure you want to clear all steps?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => setSteps([]),
        },
      ]
    );
  };

  const saveSong = () => {
    if (!songTitle.trim()) {
      Alert.alert('Error', 'Please enter a song title');
      return;
    }

    if (steps.length === 0) {
      Alert.alert('Error', 'Please add at least one step');
      return;
    }

    // TODO: Implement save functionality
    Alert.alert('Success', 'Song saved! (Save functionality to be implemented)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Song Creator</Text>

        {/* Song Metadata */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Song Information</Text>

            <TextInput
              label="Song Title"
              value={songTitle}
              onChangeText={setSongTitle}
              mode="outlined"
              style={styles.input}
              outlineColor={colors.flow.circleBorder}
              activeOutlineColor={colors.brand.primary}
              textColor={colors.text.primary}
            />

            <TextInput
              label="Artist"
              value={artist}
              onChangeText={setArtist}
              mode="outlined"
              style={styles.input}
              outlineColor={colors.flow.circleBorder}
              activeOutlineColor={colors.brand.primary}
              textColor={colors.text.primary}
            />

            <TextInput
              label="BPM"
              value={bpm}
              onChangeText={setBpm}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
              outlineColor={colors.flow.circleBorder}
              activeOutlineColor={colors.brand.primary}
              textColor={colors.text.primary}
            />

            <Text style={styles.label}>Difficulty</Text>
            <View style={styles.difficultyRow}>
              <Chip
                selected={difficulty === 'beginner'}
                onPress={() => setDifficulty('beginner')}
                style={styles.chip}
                selectedColor={colors.brand.primary}
              >
                Beginner
              </Chip>
              <Chip
                selected={difficulty === 'intermediate'}
                onPress={() => setDifficulty('intermediate')}
                style={styles.chip}
                selectedColor={colors.brand.primary}
              >
                Intermediate
              </Chip>
              <Chip
                selected={difficulty === 'advanced'}
                onPress={() => setDifficulty('advanced')}
                style={styles.chip}
                selectedColor={colors.brand.primary}
              >
                Advanced
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* String Selection */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Select String</Text>
            <View style={styles.stringRow}>
              {[1, 2, 3, 4, 5, 6].map((string) => (
                <Chip
                  key={string}
                  selected={selectedString === string}
                  onPress={() => setSelectedString(string as any)}
                  style={styles.stringChip}
                  selectedColor={colors.utility.accent}
                >
                  {string}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Fret Selection */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Add Note (Fret)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.fretRow}>
                {FRETS.slice(0, 13).map((fret) => (
                  <Button
                    key={fret}
                    mode="contained"
                    onPress={() => addNote(fret)}
                    style={styles.fretButton}
                    buttonColor={fret === 0 ? colors.feedback.correct : colors.brand.primary}
                    compact
                  >
                    {fret}
                  </Button>
                ))}
              </View>
            </ScrollView>
          </Card.Content>
        </Card>

        {/* Add Rest */}
        <Card style={styles.card}>
          <Card.Content>
            <Button
              mode="outlined"
              onPress={addRest}
              icon="pause"
              textColor={colors.text.primary}
            >
              Add Rest
            </Button>
          </Card.Content>
        </Card>

        {/* Steps Preview */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Steps ({steps.length})</Text>
            {steps.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.stepsRow}>
                  {steps.map((step, idx) => (
                    <View key={idx} style={styles.stepChip}>
                      {step.type === 'note' ? (
                        <Text style={styles.stepText}>
                          S{step.data.string}:F{step.data.fret}
                        </Text>
                      ) : (
                        <Text style={styles.stepText}>Rest</Text>
                      )}
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <Text style={styles.emptyText}>No steps added yet</Text>
            )}
          </Card.Content>
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={removeLastStep}
            disabled={steps.length === 0}
            textColor={colors.feedback.incorrect}
            style={styles.actionButton}
          >
            Remove Last
          </Button>

          <Button
            mode="outlined"
            onPress={clearAll}
            disabled={steps.length === 0}
            textColor={colors.text.subtle}
            style={styles.actionButton}
          >
            Clear All
          </Button>
        </View>

        <Button
          mode="contained"
          onPress={saveSong}
          buttonColor={colors.brand.primary}
          style={styles.saveButton}
          icon="content-save"
        >
          Save Song
        </Button>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.flow.circleBorder,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 8,
    marginTop: 8,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
  },
  stringRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  stringChip: {
    minWidth: 50,
  },
  fretRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fretButton: {
    minWidth: 50,
  },
  stepsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepChip: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  stepText: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.text.subtle,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
  },
  saveButton: {
    borderRadius: 12,
  },
});
