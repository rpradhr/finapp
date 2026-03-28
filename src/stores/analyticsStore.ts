import { create } from 'zustand';
import * as api from '../services/api';
import type {
  MonthlySpending, YearlySpending, CategoryBreakdown,
  SubcategoryBreakdown, MerchantSpending, MemberSpending, KeyMetrics,
} from '../types';

interface AnalyticsStore {
  monthlyData: MonthlySpending[];
  yearlyData: YearlySpending[];
  categoryData: CategoryBreakdown[];
  subcategoryData: SubcategoryBreakdown[];
  topMerchants: MerchantSpending[];
  memberSpending: MemberSpending[];
  keyMetrics: KeyMetrics | null;
  dateFrom: string | undefined;
  dateTo: string | undefined;
  selectedCategory: string | undefined;
  loading: boolean;
  error: string | null;

  setDateRange: (from?: string, to?: string) => void;
  setSelectedCategory: (category?: string) => void;
  fetchAll: () => Promise<void>;
  fetchKeyMetrics: () => Promise<void>;
  fetchMonthlySpending: () => Promise<void>;
  fetchYearlySpending: () => Promise<void>;
  fetchCategoryBreakdown: () => Promise<void>;
  fetchSubcategoryBreakdown: (category: string) => Promise<void>;
  fetchTopMerchants: () => Promise<void>;
  fetchMemberSpending: () => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsStore>((set, get) => ({
  monthlyData: [],
  yearlyData: [],
  categoryData: [],
  subcategoryData: [],
  topMerchants: [],
  memberSpending: [],
  keyMetrics: null,
  dateFrom: undefined,
  dateTo: undefined,
  selectedCategory: undefined,
  loading: false,
  error: null,

  setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const state = get();
      const [metrics, monthly, yearly, categories, merchants] = await Promise.all([
        api.getKeyMetrics(),
        api.getMonthlySpending(state.dateFrom, state.dateTo, state.selectedCategory),
        api.getYearlySpending(state.dateFrom, state.dateTo, state.selectedCategory),
        api.getCategoryBreakdown(state.dateFrom, state.dateTo),
        api.getTopMerchants(state.dateFrom, state.dateTo, 20),
      ]);
      set({
        keyMetrics: metrics,
        monthlyData: monthly,
        yearlyData: yearly,
        categoryData: categories,
        topMerchants: merchants,
        loading: false,
      });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  fetchKeyMetrics: async () => {
    try {
      const metrics = await api.getKeyMetrics();
      set({ keyMetrics: metrics });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  fetchMonthlySpending: async () => {
    const { dateFrom, dateTo, selectedCategory } = get();
    try {
      const data = await api.getMonthlySpending(dateFrom, dateTo, selectedCategory);
      set({ monthlyData: data });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  fetchYearlySpending: async () => {
    const { dateFrom, dateTo, selectedCategory } = get();
    try {
      const data = await api.getYearlySpending(dateFrom, dateTo, selectedCategory);
      set({ yearlyData: data });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  fetchCategoryBreakdown: async () => {
    const { dateFrom, dateTo } = get();
    try {
      const data = await api.getCategoryBreakdown(dateFrom, dateTo);
      set({ categoryData: data });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  fetchSubcategoryBreakdown: async (category: string) => {
    const { dateFrom, dateTo } = get();
    try {
      const data = await api.getSubcategoryBreakdown(category, dateFrom, dateTo);
      set({ subcategoryData: data });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  fetchTopMerchants: async () => {
    const { dateFrom, dateTo } = get();
    try {
      const data = await api.getTopMerchants(dateFrom, dateTo, 20);
      set({ topMerchants: data });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  fetchMemberSpending: async () => {
    const { dateFrom, dateTo } = get();
    try {
      const data = await api.getSpendingByMember(dateFrom, dateTo);
      set({ memberSpending: data });
    } catch (err) {
      set({ error: String(err) });
    }
  },
}));
