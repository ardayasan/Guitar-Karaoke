import { create } from 'zustand';
import { PracticeTab, Difficulty } from '@/types/practice/PracticeTab';
import { PRACTICE_TABS } from '@/data/practiceTabs';

export interface LibraryState {
  tabs: PracticeTab[];
  currentTab: PracticeTab | null;

  isLoading: boolean;
  error: string | null;

  searchQuery: string;
  difficultyFilter: Difficulty | null;

  // Actions
  setCurrentTab: (tab: PracticeTab | null) => void;
  loadTabById: (id: string) => void;

  setSearchQuery: (query: string) => void;
  setDifficultyFilter: (difficulty: Difficulty | null) => void;

  getFilteredTabs: () => PracticeTab[];
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tabs: PRACTICE_TABS,
  currentTab: null,

  isLoading: false,
  error: null,

  searchQuery: '',
  difficultyFilter: null,

  /* -------- Selection -------- */

  setCurrentTab: (tab) =>
    set({
      currentTab: tab,
      error: null,
    }),

  loadTabById: (id) => {
    const { tabs } = get();
    const tab = tabs.find((t) => t.id === id);

    if (tab) {
      set({ currentTab: tab, error: null });
    } else {
      set({ error: 'Practice tab not found' });
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
    const { tabs, searchQuery, difficultyFilter } = get();

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
