/**
 * Library State Management
 * Manages tablature library and song selection
 */

import { create } from 'zustand';
import { Tablature, TabLibraryItem } from '@/types';

export interface LibraryState {
  // Library items
  items: TabLibraryItem[];
  currentTab: Tablature | null;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Filters
  searchQuery: string;
  difficultyFilter: string | null;

  // Actions
  addItem: (item: TabLibraryItem) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<TabLibraryItem>) => void;
  setCurrentTab: (tab: Tablature | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setDifficultyFilter: (difficulty: string | null) => void;
  getFilteredItems: () => TabLibraryItem[];
  reset: () => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  // Initial state
  items: [],
  currentTab: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  difficultyFilter: null,

  // Actions
  addItem: (item: TabLibraryItem) =>
    set((state) => ({
      items: [...state.items, item],
    })),

  removeItem: (id: string) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),

  updateItem: (id: string, updates: Partial<TabLibraryItem>) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })),

  setCurrentTab: (tab: Tablature | null) =>
    set({
      currentTab: tab,
    }),

  setLoading: (loading: boolean) =>
    set({
      isLoading: loading,
    }),

  setError: (error: string | null) =>
    set({
      error,
    }),

  setSearchQuery: (query: string) =>
    set({
      searchQuery: query,
    }),

  setDifficultyFilter: (difficulty: string | null) =>
    set({
      difficultyFilter: difficulty,
    }),

  getFilteredItems: () => {
    const { items, searchQuery, difficultyFilter } = get();

    return items.filter((item) => {
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          item.title.toLowerCase().includes(query) ||
          item.artist.toLowerCase().includes(query);

        if (!matchesSearch) {
          return false;
        }
      }

      // Filter by difficulty
      if (difficultyFilter && item.difficulty !== difficultyFilter) {
        return false;
      }

      return true;
    });
  },

  reset: () =>
    set({
      items: [],
      currentTab: null,
      isLoading: false,
      error: null,
      searchQuery: '',
      difficultyFilter: null,
    }),
}));
