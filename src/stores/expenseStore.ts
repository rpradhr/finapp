import { create } from 'zustand';
import * as api from '../services/api';
import type { Transaction, TransactionFilters, PaginatedResult, NewTransaction, UpdateTransaction } from '../types';

interface ExpenseStore {
  transactions: PaginatedResult<Transaction> | null;
  filters: TransactionFilters;
  loading: boolean;
  error: string | null;

  setFilters: (filters: Partial<TransactionFilters>) => void;
  fetchTransactions: () => Promise<void>;
  addExpense: (expense: NewTransaction) => Promise<Transaction>;
  updateExpense: (id: string, updates: UpdateTransaction) => Promise<Transaction>;
  deleteExpense: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useExpenseStore = create<ExpenseStore>((set, get) => ({
  transactions: null,
  filters: { page: 1, page_size: 50, sort_by: 'transaction_date', sort_dir: 'desc' },
  loading: false,
  error: null,

  setFilters: (filters) => {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
  },

  fetchTransactions: async () => {
    set({ loading: true, error: null });
    try {
      const result = await api.getTransactions(get().filters);
      set({ transactions: result, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  addExpense: async (expense) => {
    const txn = await api.addTransaction(expense);
    await get().fetchTransactions();
    return txn;
  },

  updateExpense: async (id, updates) => {
    const txn = await api.updateTransaction(id, updates);
    await get().fetchTransactions();
    return txn;
  },

  deleteExpense: async (id) => {
    await api.deleteTransaction(id);
    await get().fetchTransactions();
  },

  clearError: () => set({ error: null }),
}));
