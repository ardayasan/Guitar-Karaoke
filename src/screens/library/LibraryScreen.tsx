/**
 * Library Screen
 * Browse and manage tablature library
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import {
  Searchbar,
  FAB,
  Card,
  Title,
  Paragraph,
  Chip,
  Text,
  Button,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import { useLibraryStore } from '@/store';
import { TabLibraryItem } from '@/types';
import * as DocumentPicker from 'expo-document-picker';

type LibraryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Library'>;

export default function LibraryScreen() {
  const navigation = useNavigation<LibraryScreenNavigationProp>();
  const {
    searchQuery,
    setSearchQuery,
    getFilteredItems,
    addItem,
  } = useLibraryStore();

  const filteredItems = getFilteredItems();

  const handleImportTab = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/x-guitar-pro', '*.gp5', '*.gpx', '*.gp', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      // For now, just show that import was attempted
      Alert.alert(
        'Import Tab',
        'Tab import functionality will be implemented. Selected: ' + result.assets[0].name
      );

      // TODO: Parse the tab file and add to library
      // const newItem: TabLibraryItem = {
      //   id: Date.now().toString(),
      //   title: result.assets[0].name,
      //   artist: 'Unknown',
      //   difficulty: 'intermediate',
      //   duration: 0,
      //   tempo: 120,
      //   filePath: result.assets[0].uri,
      // };
      // addItem(newItem);
    } catch (error) {
      console.error('Error importing tab:', error);
      Alert.alert('Error', 'Failed to import tab file');
    }
  };

  const handleSelectTab = (item: TabLibraryItem) => {
    // TODO: Load the actual tablature data
    Alert.alert(
      'Select Tab',
      `Would you like to practice ${item.title} by ${item.artist}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Practice',
          onPress: () => {
            // For now, create a mock tablature
            // In production, this would load from the file
            Alert.alert('Coming Soon', 'Practice mode will be implemented next!');
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: TabLibraryItem }) => (
    <Card style={styles.card} onPress={() => handleSelectTab(item)}>
      <Card.Content>
        <Title>{item.title}</Title>
        <Paragraph>{item.artist}</Paragraph>
        <View style={styles.chipContainer}>
          <Chip mode="outlined" style={styles.chip}>
            {item.difficulty}
          </Chip>
          <Chip mode="outlined" style={styles.chip}>
            {item.tempo} BPM
          </Chip>
          {item.bestAccuracy !== undefined && (
            <Chip mode="outlined" style={styles.chip}>
              Best: {item.bestAccuracy.toFixed(0)}%
            </Chip>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search tabs..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No tabs in your library</Text>
          <Text style={styles.emptySubtext}>
            Tap the + button to import tablature files
          </Text>
          <Button
            mode="contained"
            onPress={handleImportTab}
            style={styles.emptyButton}
            icon="plus"
          >
            Import Tab
          </Button>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleImportTab}
        label="Import"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchbar: {
    margin: 16,
    marginBottom: 8,
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  chipContainer: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  chip: {
    marginRight: 8,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
