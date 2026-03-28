export interface Transaction {
  id: string;
  transaction_date: string;
  year: number;
  quarter: string | null;
  month: number;
  month_name: string | null;
  year_month: string;
  day_of_week: string | null;
  category: string;
  subcategory: string | null;
  raw_description: string | null;
  std_merchant: string | null;
  amount: number;
  inflow_outflow: string;
  signed_amount: number;
  debit_r: number | null;
  debit_s: number | null;
  location: string | null;
  travel_flag: number;
  payment_method: string | null;
  tags: string | null;
  notes: string | null;
  source: string;
  source_sheet: string | null;
  import_batch_id: string | null;
  data_quality_status: string;
  data_quality_issue: string | null;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export interface NewTransaction {
  transaction_date: string;
  category: string;
  subcategory?: string;
  raw_description?: string;
  std_merchant?: string;
  amount: number;
  inflow_outflow?: string;
  debit_r?: number;
  debit_s?: number;
  location?: string;
  travel_flag?: boolean;
  payment_method?: string;
  tags?: string;
  notes?: string;
}

export interface UpdateTransaction {
  transaction_date?: string;
  category?: string;
  subcategory?: string;
  raw_description?: string;
  std_merchant?: string;
  amount?: number;
  inflow_outflow?: string;
  debit_r?: number;
  debit_s?: number;
  payment_method?: string;
  tags?: string;
  notes?: string;
}

export interface TransactionFilters {
  date_from?: string;
  date_to?: string;
  category?: string;
  subcategory?: string;
  merchant?: string;
  search?: string;
  min_amount?: number;
  max_amount?: number;
  source?: string;
  sort_by?: string;
  sort_dir?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface MonthlySpending {
  year_month: string;
  total: number;
  category_totals?: Record<string, number>;
}

export interface YearlySpending {
  year: number;
  total: number;
  category_totals?: Record<string, number>;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface SubcategoryBreakdown {
  subcategory: string;
  total: number;
  count: number;
}

export interface MerchantSpending {
  merchant: string;
  total: number;
  count: number;
}

export interface MemberSpending {
  year_month: string;
  debit_r_total: number;
  debit_s_total: number;
}

export interface KeyMetrics {
  total_transactions: number;
  total_spending: number;
  avg_monthly_spending: number;
  ytd_spending: number;
  current_month_spending: number;
  years_of_data: number;
  top_category: string;
  top_category_amount: number;
  data_quality_issues: number;
}

export interface ImportBatch {
  id: string;
  filename: string;
  imported_at: string;
  total_rows: number | null;
  imported_rows: number | null;
  error_rows: number | null;
  warning_rows: number | null;
  status: string;
}

export interface ImportSummary {
  batch_id: string;
  total_rows: number;
  imported_rows: number;
  updated_rows: number;
  error_rows: number;
  warning_rows: number;
  merchants_imported: number;
  categories_imported: number;
  quality_issues_imported: number;
}

export interface Category {
  id: number;
  category: string;
  subcategory: string | null;
  transaction_count: number;
  total_amount: number;
  is_active: boolean;
}

export interface DataQualityIssue {
  id: string;
  raw_description: string | null;
  amount: number;
  transaction_date: string;
  data_quality_issue: string | null;
  data_quality_status: string;
  category: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  data?: unknown;
  chart?: 'bar' | 'line' | 'pie';
  timestamp: Date;
}

export interface ParsedIntent {
  type: 'query' | 'add' | 'edit' | 'compare' | 'summarize' | 'top' | 'unknown';
  category?: string;
  subcategory?: string;
  merchant?: string;
  amount?: number;
  period?: string;
  period2?: string;
  date?: string;
  description?: string;
  raw: string;
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  type: 'trend' | 'anomaly' | 'prediction' | 'comparison';
  severity: 'info' | 'warning' | 'positive' | 'negative';
  data?: unknown;
}

export interface AnnualProjection {
  year: number;
  projected: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface MonthlyProjection {
  year_month: string;
  projected: number;
  actual?: number;
}
