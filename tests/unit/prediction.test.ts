import { describe, it, expect } from 'vitest';
import { projectAnnualSpending, projectMonthlySpending, calculateGrowthRate, detectAnomalies } from '../../src/services/prediction';
import type { YearlySpending, MonthlySpending } from '../../src/types';

const sampleYearly: YearlySpending[] = [
  { year: 2020, total: 100000, category_totals: undefined },
  { year: 2021, total: 110000, category_totals: undefined },
  { year: 2022, total: 120000, category_totals: undefined },
  { year: 2023, total: 130000, category_totals: undefined },
  { year: 2024, total: 140000, category_totals: undefined },
];

const sampleMonthly: MonthlySpending[] = [];
for (let year = 2022; year <= 2024; year++) {
  for (let month = 1; month <= 12; month++) {
    sampleMonthly.push({
      year_month: `${year}-${String(month).padStart(2, '0')}`,
      total: 10000 + Math.sin(month / 12 * Math.PI * 2) * 3000 + (year - 2022) * 500,
      category_totals: undefined,
    });
  }
}

describe('Prediction Service', () => {
  describe('projectAnnualSpending', () => {
    it('returns projections for future years', () => {
      const projections = projectAnnualSpending(sampleYearly, 3, 0.03);
      expect(projections).toHaveLength(3);
      expect(projections[0].year).toBe(2025);
      expect(projections[1].year).toBe(2026);
      expect(projections[2].year).toBe(2027);
    });

    it('projects increasing values with positive growth', () => {
      const projections = projectAnnualSpending(sampleYearly, 3, 0.05);
      expect(projections[1].projected).toBeGreaterThan(projections[0].projected);
      expect(projections[2].projected).toBeGreaterThan(projections[1].projected);
    });

    it('assigns decreasing confidence for further years', () => {
      const projections = projectAnnualSpending(sampleYearly, 3);
      expect(projections[0].confidence).toBe('high');
      expect(projections[1].confidence).toBe('medium');
      expect(projections[2].confidence).toBe('low');
    });

    it('returns empty for insufficient data', () => {
      const projections = projectAnnualSpending([{ year: 2024, total: 100000, category_totals: undefined }]);
      expect(projections).toHaveLength(0);
    });

    it('handles zero totals gracefully', () => {
      const data = [
        { year: 2023, total: 0, category_totals: undefined },
        { year: 2024, total: 0, category_totals: undefined },
      ];
      const projections = projectAnnualSpending(data);
      expect(projections).toHaveLength(0);
    });
  });

  describe('projectMonthlySpending', () => {
    it('returns 12 monthly projections', () => {
      const projections = projectMonthlySpending(sampleMonthly, 2025);
      expect(projections).toHaveLength(12);
    });

    it('projects reasonable values', () => {
      const projections = projectMonthlySpending(sampleMonthly, 2025);
      for (const p of projections) {
        expect(p.projected).toBeGreaterThan(0);
        expect(p.projected).toBeLessThan(50000);
      }
    });

    it('returns empty for insufficient data', () => {
      const projections = projectMonthlySpending(sampleMonthly.slice(0, 5), 2025);
      expect(projections).toHaveLength(0);
    });
  });

  describe('calculateGrowthRate', () => {
    it('calculates positive growth rate for increasing data', () => {
      const rate = calculateGrowthRate(sampleYearly);
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThan(0.2);
    });

    it('returns default for insufficient data', () => {
      const rate = calculateGrowthRate([{ year: 2024, total: 100000, category_totals: undefined }]);
      expect(rate).toBe(0.03);
    });
  });

  describe('detectAnomalies', () => {
    it('detects anomalies with extreme values', () => {
      const data: MonthlySpending[] = [
        ...Array.from({ length: 11 }, (_, i) => ({
          year_month: `2024-${String(i + 1).padStart(2, '0')}`,
          total: 10000,
          category_totals: undefined,
        })),
        { year_month: '2024-12', total: 50000, category_totals: undefined },
      ];
      const anomalies = detectAnomalies(data);
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].yearMonth).toBe('2024-12');
    });

    it('returns empty for uniform data', () => {
      const data: MonthlySpending[] = Array.from({ length: 12 }, (_, i) => ({
        year_month: `2024-${String(i + 1).padStart(2, '0')}`,
        total: 10000,
        category_totals: undefined,
      }));
      const anomalies = detectAnomalies(data);
      expect(anomalies).toHaveLength(0);
    });

    it('returns empty for insufficient data', () => {
      const anomalies = detectAnomalies([]);
      expect(anomalies).toHaveLength(0);
    });
  });
});
