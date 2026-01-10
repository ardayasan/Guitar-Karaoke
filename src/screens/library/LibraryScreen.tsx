import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
} from "react-native";
import {
  Searchbar,
  Card,
  Title,
  Paragraph,
  Chip,
  Text,
  Button,
  IconButton,
} from "react-native-paper";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as DocumentPicker from "expo-document-picker";

import { RootStackParamList } from "@/navigation/types";
import { useLibraryStore, LibrarySection } from "@/store/libraryStore";
import { PracticeTab } from "@/types/practice/PracticeTab";
import colors from "@/theme/colors";
import typography from "@/theme/typography";

type Nav = StackNavigationProp<RootStackParamList, "Library">;

export default function LibraryScreen() {
  const navigation = useNavigation<Nav>();

  const {
    searchQuery,
    setSearchQuery,
    getFilteredTabs,
    loadTabById,
    activeSection,
    setActiveSection,
    loadCustomTabs,
    deleteCustomTab,
    customTabs,
    isLoading,
  } = useLibraryStore();

  const filteredTabs = getFilteredTabs();

  // Load custom tabs on screen focus
  useFocusEffect(
    useCallback(() => {
      loadCustomTabs();
    }, [loadCustomTabs])
  );

  /* ============================== */

  const handleImportTab = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/x-guitar-pro", "*.gp5", "*.gpx", "*.gp", "text/plain"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      Alert.alert(
        "Import Tab",
        `Selected: ${result.assets[0].name}\nImport parser todo`
      );
    } catch (error) {
      Alert.alert("Error", "Failed to import tab file");
    }
  };

  /* ============================== */

  const handleSelectTab = (tab: PracticeTab) => {
    loadTabById(tab.id);

    setTimeout(() => {
      const currentTab = useLibraryStore.getState().currentTab;

      if (currentTab) {
        navigation.navigate("Practice", { tab: currentTab });
      } else {
        Alert.alert("Error", "Failed to load tab");
      }
    }, 50);
  };

  const handleDeleteCustomTab = (tab: PracticeTab) => {
    Alert.alert(
      "Delete Song",
      `Are you sure you want to delete "${tab.metadata.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteCustomTab(tab.id),
        },
      ]
    );
  };

  /* ============================== */

  const renderItem = ({ item }: { item: PracticeTab }) => {
    const { title, artist, difficulty, bpm } = item.metadata;
    const isCustom = activeSection === "custom";

    return (
      <Card
        style={styles.card}
        onPress={() => handleSelectTab(item)}
        elevation={0}
      >
        <Card.Content style={styles.cardContent}>

          <View style={styles.cardHeader}>
            <View style={styles.cardTitleArea}>
              <Title style={styles.title}>
                {title}
              </Title>

              <Paragraph style={styles.artist}>
                {artist}
              </Paragraph>
            </View>

            {isCustom && (
              <IconButton
                icon="delete"
                iconColor={colors.feedback.incorrect}
                size={20}
                onPress={() => handleDeleteCustomTab(item)}
                style={styles.deleteButton}
              />
            )}
          </View>

          <View style={styles.chipRow}>

            <Chip style={styles.chip} textStyle={styles.chipText}>
              {difficulty}
            </Chip>

            <Chip style={styles.chip} textStyle={styles.chipText}>
              {bpm} BPM
            </Chip>

          </View>

        </Card.Content>
      </Card>
    );
  };

  /* ============================== */

  const renderTabSelector = () => (
    <View style={styles.tabSelector}>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeSection === "system" && styles.tabButtonActive,
        ]}
        onPress={() => setActiveSection("system")}
      >
        <Text
          style={[
            styles.tabText,
            activeSection === "system" && styles.tabTextActive,
          ]}
        >
          System Tabs
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tabButton,
          activeSection === "custom" && styles.tabButtonActive,
        ]}
        onPress={() => setActiveSection("custom")}
      >
        <Text
          style={[
            styles.tabText,
            activeSection === "custom" && styles.tabTextActive,
          ]}
        >
          My Songs ({customTabs.length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => {
    if (activeSection === "system") {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No system tabs found
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          No custom songs yet
        </Text>

        <Text style={styles.emptySub}>
          Create songs in the Songwriting tab
        </Text>

        <Button
          mode="contained"
          onPress={() => navigation.navigate("Songwriting" as any)}
          style={styles.importBtn}
          icon="plus"
          textColor="#fff"
        >
          Create Song
        </Button>
      </View>
    );
  };

  /* ============================== */

  return (
    <View style={styles.container}>

      {renderTabSelector()}

      <Searchbar
        placeholder="Search tabs..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        inputStyle={{ color: colors.text.primary }}
        placeholderTextColor={colors.text.subtle}
      />

      {filteredTabs.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredTabs}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        />
      )}

    </View>
  );
}

/* ================================================= */
/* STYLES */
/* ================================================= */

const styles = StyleSheet.create({

  container: {
    flex: 1,
    paddingTop: 6,
    backgroundColor: colors.bg.main,
  },

  /* TAB SELECTOR */

  tabSelector: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 4,
  },

  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },

  tabButtonActive: {
    backgroundColor: colors.brand.primary,
  },

  tabText: {
    color: colors.text.subtle,
    fontSize: 14,
    fontWeight: "600",
  },

  tabTextActive: {
    color: "#fff",
  },

  /* SEARCH */

  searchbar: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  /* CARD */

  card: {
    marginBottom: 14,
    borderRadius: 16,

    backgroundColor: "rgba(255,255,255,0.05)",

    borderWidth: 1,
    borderColor: "rgba(199,125,255,0.18)",

    shadowColor: "#C77DFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },

  cardContent: {
    paddingVertical: 16,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  cardTitleArea: {
    flex: 1,
  },

  deleteButton: {
    margin: -8,
  },

  /* TEXT */

  title: {
    color: "#ffffff",

    fontFamily: typography.bodyMedium,
    fontSize: 21,
    fontWeight: "700",

    letterSpacing: 0.6,

    textShadowColor: "rgba(199,125,255,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  artist: {
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
    marginBottom: 6,

    fontSize: 14,
    letterSpacing: 0.3,
  },

  /* CHIPS */

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },

  chip: {
    backgroundColor: "rgba(199,125,255,0.10)",

    borderWidth: 1,
    borderColor: "rgba(199,125,255,0.20)",

    paddingHorizontal: 10,
    paddingVertical: 3,

    borderRadius: 999,

    shadowColor: "#C77DFF",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  chipText: {
    fontSize: 11,
    lineHeight: 14,
    color: "#e5c2ff",
    letterSpacing: 0.45,
  },

  /* EMPTY */

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  emptyText: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: "600",
  },

  emptySub: {
    color: colors.text.subtle,
    textAlign: "center",
    marginVertical: 12,
    maxWidth: 280,
  },

  importBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 18,
    marginTop: 6,
  },

});
