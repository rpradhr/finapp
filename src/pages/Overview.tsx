import { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, CircularProgress, Alert, Chip,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useAnalyticsStore } from '../stores/analyticsStore';
import { generateInsights } from '../services/ai';
import { projectAnnualSpending } from '../services/prediction';
import { CHART_COLORS } from '../theme';
import type { Insight, AnnualProjection } from '../types';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export default function Overview() {
  const { keyMetrics, monthlyData, categoryData, yearlyData, loading, error, fetchAll } = useAnalyticsStore();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [projections, setProjections] = useState<AnnualProjection[]>([]);

  useEffect(() => {
    fetchAll().then(() => {
      // Generate insights after data loads
    });
  }, [fetchAll]);

  useEffect(() => {
    if (categoryData.length > 0 && monthlyData.length > 0 && yearlyData.length > 0) {
      generateInsights().then(setInsights);
      setProjections(projectAnnualSpending(yearlyData));
    }
  }, [categoryData, monthlyData, yearlyData]);

  if (loading && !keyMetrics) {
    return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  }

  if (!keyMetrics || keyMetrics.total_transactions === 0) {
    return (
      <Box textAlign="center" mt={8}>
        <Typography variant="h5" gutterBottom>Welcome to Family Expense App</Typography>
        <Typography color="text.secondary" mb={2}>
          No data yet. Import your spreadsheet to get started.
        </Typography>
        <Chip label="Go to Import" onClick={() => window.location.hash = '/import'} color="primary" clickable />
      </Box>
    );
  }

  const recentMonths = monthlyData.slice(-12);
  const topCategories = categoryData.slice(0, 8);

  return (
    <Box>
      {/* Key Metrics */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Total Spending', value: formatCurrency(keyMetrics.total_spending) },
          { label: 'Avg Monthly', value: formatCurrency(keyMetrics.avg_monthly_spending) },
          { label: 'YTD Spending', value: formatCurrency(keyMetrics.ytd_spending) },
          { label: 'Transactions', value: keyMetrics.total_transactions.toLocaleString() },
          { label: 'Years of Data', value: String(keyMetrics.years_of_data) },
          { label: 'Data Quality Issues', value: String(keyMetrics.data_quality_issues) },
        ].map((metric) => (
          <Grid size={{ xs: 6, md: 2 }} key={metric.label}>
            <Card>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">{metric.label}</Typography>
                <Typography variant="h6" fontWeight={700}>{metric.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Monthly Trend */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Monthly Spending (Last 12 Months)</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={recentMonths}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year_month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="total" fill="#1565c0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Category Breakdown */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Category Breakdown</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={topCategories}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(props: any) => `${props.category} ${props.percentage?.toFixed(0) ?? 0}%`}
                    labelLine={false}
                  >
                    {topCategories.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Insights */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>AI Insights</Typography>
              {insights.length === 0 ? (
                <Typography color="text.secondary">Loading insights...</Typography>
              ) : (
                insights.map((insight) => (
                  <Alert
                    key={insight.id}
                    severity={insight.severity === 'positive' ? 'success' : insight.severity === 'negative' ? 'error' : insight.severity}
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="subtitle2">{insight.title}</Typography>
                    <Typography variant="body2">{insight.description}</Typography>
                  </Alert>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Projections */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Spending Projections</Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Estimates based on weighted historical trends. Not financial advice.
              </Typography>
              {projections.length === 0 ? (
                <Typography color="text.secondary">Insufficient data for projections.</Typography>
              ) : (
                projections.map((p) => (
                  <Box key={p.year} display="flex" justifyContent="space-between" alignItems="center" py={1} borderBottom="1px solid #eee">
                    <Box>
                      <Typography variant="subtitle1">{p.year}</Typography>
                      <Chip label={p.confidence} size="small" color={p.confidence === 'high' ? 'success' : p.confidence === 'medium' ? 'warning' : 'default'} />
                    </Box>
                    <Typography variant="h6" fontWeight={600}>{formatCurrency(p.projected)}</Typography>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
