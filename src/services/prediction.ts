import type { AnnualProjection, MonthlyProjection, YearlySpending, MonthlySpending } from '../types';

const DEFAULT_GROWTH_RATE = 0.03;
const RECENT_YEARS_WEIGHT = 5;

export function projectAnnualSpending(
  yearlyData: YearlySpending[],
  yearsToProject: number = 3,
  growthRate: number = DEFAULT_GROWTH_RATE,
): AnnualProjection[] {
  if (yearlyData.length < 2) return [];

  // Use weighted average of recent years as base
  const validYears = yearlyData.filter(y => y.total > 0);
  if (validYears.length === 0) return [];

  const recentYears = validYears.slice(-RECENT_YEARS_WEIGHT);
  const weights = recentYears.map((_, i) => i + 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weightedAvg = recentYears.reduce((sum, y, i) => sum + y.total * weights[i], 0) / totalWeight;

  const lastYear = validYears[validYears.length - 1].year;
  const projections: AnnualProjection[] = [];

  for (let i = 1; i <= yearsToProject; i++) {
    const projected = weightedAvg * Math.pow(1 + growthRate, i);
    projections.push({
      year: lastYear + i,
      projected: Math.round(projected * 100) / 100,
      confidence: i <= 1 ? 'high' : i <= 2 ? 'medium' : 'low',
    });
  }

  return projections;
}

export function projectMonthlySpending(
  monthlyData: MonthlySpending[],
  targetYear: number,
  growthRate: number = DEFAULT_GROWTH_RATE,
): MonthlyProjection[] {
  if (monthlyData.length < 12) return [];

  // Calculate seasonal factors from historical data
  const monthlyTotals: Record<number, number[]> = {};
  for (const m of monthlyData) {
    const month = parseInt(m.year_month.split('-')[1]);
    if (!monthlyTotals[month]) monthlyTotals[month] = [];
    monthlyTotals[month].push(m.total);
  }

  const monthlyAverages: Record<number, number> = {};
  for (const [month, totals] of Object.entries(monthlyTotals)) {
    // Weighted toward recent values
    const recent = totals.slice(-3);
    monthlyAverages[parseInt(month)] = recent.reduce((a, b) => a + b, 0) / recent.length;
  }

  const totalAvg = Object.values(monthlyAverages).reduce((a, b) => a + b, 0);
  const seasonalFactors: Record<number, number> = {};
  for (const [month, avg] of Object.entries(monthlyAverages)) {
    seasonalFactors[parseInt(month)] = totalAvg > 0 ? avg / totalAvg * 12 : 1;
  }

  // Get last complete year's total for base
  const yearTotals: Record<number, number> = {};
  for (const m of monthlyData) {
    const year = parseInt(m.year_month.split('-')[0]);
    yearTotals[year] = (yearTotals[year] || 0) + m.total;
  }

  const years = Object.keys(yearTotals).map(Number).sort();
  const lastCompleteYear = years.filter(y => {
    const months = monthlyData.filter(m => m.year_month.startsWith(String(y))).length;
    return months >= 10;
  }).pop() || years[years.length - 1];

  const baseTotal = yearTotals[lastCompleteYear] || 0;
  const yearsAhead = targetYear - lastCompleteYear;
  const projectedAnnual = baseTotal * Math.pow(1 + growthRate, yearsAhead);

  const projections: MonthlyProjection[] = [];
  for (let month = 1; month <= 12; month++) {
    const factor = seasonalFactors[month] || 1;
    const projected = (projectedAnnual / 12) * factor;
    const ym = `${targetYear}-${String(month).padStart(2, '0')}`;

    // Check if we have actual data for this month
    const actual = monthlyData.find(m => m.year_month === ym);

    projections.push({
      year_month: ym,
      projected: Math.round(projected * 100) / 100,
      actual: actual?.total,
    });
  }

  return projections;
}

export function calculateGrowthRate(yearlyData: YearlySpending[]): number {
  const valid = yearlyData.filter(y => y.total > 0);
  if (valid.length < 2) return DEFAULT_GROWTH_RATE;

  const recent = valid.slice(-5);
  let totalGrowth = 0;
  let count = 0;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i - 1].total > 0) {
      totalGrowth += (recent[i].total - recent[i - 1].total) / recent[i - 1].total;
      count++;
    }
  }

  return count > 0 ? totalGrowth / count : DEFAULT_GROWTH_RATE;
}

export function detectAnomalies(
  monthlyData: MonthlySpending[],
  threshold: number = 2.0,
): Array<{ yearMonth: string; total: number; zScore: number; mean: number }> {
  if (monthlyData.length < 6) return [];

  const totals = monthlyData.map(m => m.total);
  const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
  const stdDev = Math.sqrt(totals.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / totals.length);

  if (stdDev === 0) return [];

  return monthlyData
    .map(m => ({
      yearMonth: m.year_month,
      total: m.total,
      zScore: (m.total - mean) / stdDev,
      mean,
    }))
    .filter(a => Math.abs(a.zScore) > threshold);
}
