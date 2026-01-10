import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PracticeTab, Difficulty } from '@/types/practice/PracticeTab';
import { PRACTICE_TABS } from '@/data/practiceTabs';

const CUSTOM_SONGS_KEY = '@custom_songs';

export type LibrarySection = 'system' | 'custom';

export interface LibraryState {
  // System tabs (hardcoded)
  systemTabs: PracticeTab[];
  // User-created tabs (from AsyncStorage)
  customTabs: PracticeTab[];

  currentTab: PracticeTab | null;
  activeSection: LibrarySection;

  isLoading: boolean;
  error: string | null;

  searchQuery: string;
  difficultyFilter: Difficulty | null;

  // Actions
  setCurrentTab: (tab: PracticeTab | null) => void;
  loadTabById: (id: string) => void;

  setSearchQuery: (query: string) => void;
  setDifficultyFilter: (difficulty: Difficulty | null) => void;

  setActiveSection: (section: LibrarySection) => void;

  // Custom tabs management
  loadCustomTabs: () => Promise<void>;
  addCustomTab: (tab: PracticeTab) => Promise<void>;
  deleteCustomTab: (id: string) => Promise<void>;

  getFilteredTabs: () => PracticeTab[];
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  systemTabs: PRACTICE_TABS,
  customTabs: [],
  currentTab: null,
  activeSection: 'system',

  isLoading: false,
  error: null,

  searchQuery: '',
  difficultyFilter: null,

  /* -------- Section -------- */

  setActiveSection: (section) =>
    set({
      activeSection: section,
      searchQuery: '', // Clear search when switching
    }),

  /* -------- Selection -------- */

  setCurrentTab: (tab) =>
    set({
      currentTab: tab,
      error: null,
    }),

  loadTabById: (id) => {
    const { systemTabs, customTabs } = get();
    const allTabs = [...systemTabs, ...customTabs];
    const tab = allTabs.find((t) => t.id === id);

    if (tab) {
      set({ currentTab: tab, error: null });
    } else {
      set({ error: 'Practice tab not found' });
    }
  },

  /* -------- Custom Tabs -------- */

  loadCustomTabs: async () => {
    try {
      set({ isLoading: true });
      const json = await AsyncStorage.getItem(CUSTOM_SONGS_KEY);
      const tabs: PracticeTab[] = json ? JSON.parse(json) : [];
      set({ customTabs: tabs, isLoading: false, error: null });
    } catch (error) {
      console.error('Failed to load custom tabs:', error);
      set({ isLoading: false, error: 'Failed to load custom songs' });
    }
  },

  addCustomTab: async (tab) => {
    try {
      const { customTabs } = get();
      const updated = [...customTabs, tab];
      await AsyncStorage.setItem(CUSTOM_SONGS_KEY, JSON.stringify(updated));
      set({ customTabs: updated });
    } catch (error) {
      console.error('Failed to save custom tab:', error);
      set({ error: 'Failed to save song' });
    }
  },

  deleteCustomTab: async (id) => {
    try {
      const { customTabs } = get();
      const updated = customTabs.filter((t) => t.id !== id);
      await AsyncStorage.setItem(CUSTOM_SONGS_KEY, JSON.stringify(updated));
      set({ customTabs: updated });
    } catch (error) {
      console.error('Failed to delete custom tab:', error);
      set({ error: 'Failed to delete song' });
    }
  },

  /* -------- Filters -------- */

  setSearchQuery: (query) =>
    set({
      searchQuery: query,
    }),

  setDifficultyFilter: (difficulty) =>
    set({
      difficultyFilter: difficulty,
    }),

  getFilteredTabs: () => {
    const { systemTabs, customTabs, activeSection, searchQuery, difficultyFilter } = get();

    const tabs = activeSection === 'system' ? systemTabs : customTabs;

    return tabs.filter((tab) => {
      const { title, artist, difficulty } = tab.metadata;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !title.toLowerCase().includes(q) &&
          !artist.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      if (difficultyFilter && difficulty !== difficultyFilter) {
        return false;
      }

      return true;
    });
  },
}));
