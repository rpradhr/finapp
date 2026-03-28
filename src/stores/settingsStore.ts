import { create } from 'zustand';
import * as api from '../services/api';
import type { Category, ImportBatch } from '../types';

interface SettingsStore {
  settings: Record<string, string>;
  categories: Category[];
  importHistory: ImportBatch[];
  loading: boolean;

  fetchSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchImportHistory: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: {},
  categories: [],
  importHistory: [],
  loading: false,

  fetchSettings: async () => {
    try {
      const settings = await api.getSettings();
      set({ settings });
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  },

  updateSetting: async (key, value) => {
    await api.updateSetting(key, value);
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    }));
  },

  fetchCategories: async () => {
    try {
      const categories = await api.getCategories();
      set({ categories });
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  },

  fetchImportHistory: async () => {
    try {
      const history = await api.getImportHistory();
      set({ importHistory: history });
    } catch (err) {
      console.error('Failed to fetch import history:', err);
    }
  },
}));
