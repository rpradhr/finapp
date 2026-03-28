import { invoke } from '@tauri-apps/api/core';
import type {
  Transaction, NewTransaction, UpdateTransaction, TransactionFilters,
  PaginatedResult, MonthlySpending, YearlySpending, CategoryBreakdown,
  SubcategoryBreakdown, MerchantSpending, MemberSpending, KeyMetrics,
  ImportSummary, ImportBatch, Category, DataQualityIssue,
} from '../types';

// Expense commands
export async function getTransactions(filters: TransactionFilters): Promise<PaginatedResult<Transaction>> {
  return invoke('get_transactions', { filters });
}

export async function addTransaction(transaction: NewTransaction): Promise<Transaction> {
  return invoke('add_transaction', { transaction });
}

export async function updateTransaction(id: string, updates: UpdateTransaction): Promise<Transaction> {
  return invoke('update_transaction', { id, updates });
}

export async function deleteTransaction(id: string): Promise<void> {
  return invoke('delete_transaction', { id });
}

// Analytics commands
export async function getMonthlySpending(dateFrom?: string, dateTo?: string, category?: string): Promise<MonthlySpending[]> {
  return invoke('get_monthly_spending', { date_from: dateFrom, date_to: dateTo, category });
}

export async function getYearlySpending(dateFrom?: string, dateTo?: string, category?: string): Promise<YearlySpending[]> {
  return invoke('get_yearly_spending', { date_from: dateFrom, date_to: dateTo, category });
}

export async function getCategoryBreakdown(dateFrom?: string, dateTo?: string): Promise<CategoryBreakdown[]> {
  return invoke('get_category_breakdown', { date_from: dateFrom, date_to: dateTo });
}

export async function getSubcategoryBreakdown(category: string, dateFrom?: string, dateTo?: string): Promise<SubcategoryBreakdown[]> {
  return invoke('get_subcategory_breakdown', { category, date_from: dateFrom, date_to: dateTo });
}

export async function getTopMerchants(dateFrom?: string, dateTo?: string, limit?: number): Promise<MerchantSpending[]> {
  return invoke('get_top_merchants', { date_from: dateFrom, date_to: dateTo, limit });
}

export async function getKeyMetrics(): Promise<KeyMetrics> {
  return invoke('get_key_metrics');
}

export async function getSpendingByMember(dateFrom?: string, dateTo?: string): Promise<MemberSpending[]> {
  return invoke('get_spending_by_member', { date_from: dateFrom, date_to: dateTo });
}

// Import commands
export async function importSpreadsheet(filePath: string): Promise<ImportSummary> {
  return invoke('import_spreadsheet', { file_path: filePath });
}

export async function getImportHistory(): Promise<ImportBatch[]> {
  return invoke('get_import_history');
}

// Settings commands
export async function getSettings(): Promise<Record<string, string>> {
  return invoke('get_settings');
}

export async function updateSetting(key: string, value: string): Promise<void> {
  return invoke('update_setting', { key, value });
}

export async function getCategories(): Promise<Category[]> {
  return invoke('get_categories');
}

export async function getDataQualityIssues(page?: number, pageSize?: number): Promise<PaginatedResult<DataQualityIssue>> {
  return invoke('get_data_quality_issues', { page, page_size: pageSize });
}

export async function resolveDataQualityIssue(id: string, category: string, subcategory?: string): Promise<void> {
  return invoke('resolve_data_quality_issue', { id, category, subcategory });
}
