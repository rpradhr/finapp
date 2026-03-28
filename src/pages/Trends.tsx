import { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, ToggleButtonGroup, ToggleButton,
  TextField, Grid, CircularProgress,
} from '@mui/material';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useAnalyticsStore } from '../stores/analyticsStore';
import { CHART_COLORS } from '../theme';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export default function Trends() {
  const {
    monthlyData, yearlyData, loading, dateFrom, dateTo,
    setDateRange, fetchMonthlySpending, fetchYearlySpending,
  } = useAnalyticsStore();
  const [view, setView] = useState<'monthly' | 'yearly'>('monthly');
  const [localFrom, setLocalFrom] = useState(dateFrom || '');
  const [localTo, setLocalTo] = useState(dateTo || '');

  useEffect(() => {
    fetchMonthlySpending();
    fetchYearlySpending();
  }, [fetchMonthlySpending, fetchYearlySpending]);

  const handleApplyFilter = () => {
    setDateRange(localFrom || undefined, localTo || undefined);
    fetchMonthlySpending();
    fetchYearlySpending();
  };

  if (loading && monthlyData.length === 0) {
    return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
  }

  return (
    <Box>
      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }}>
              <ToggleButtonGroup
                value={view}
                exclusive
                onChange={(_, v) => v && setView(v)}
                size="small"
                fullWidth
              >
                <ToggleButton value="monthly">Monthly</ToggleButton>
                <ToggleButton value="yearly">Yearly</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField
                label="From"
                type="date"
                size="small"
                fullWidth
                value={localFrom}
                onChange={(e) => setLocalFrom(e.target.value)}
                onBlur={handleApplyFilter}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField
                label="To"
                type="date"
                size="small"
                fullWidth
                value={localTo}
                onChange={(e) => setLocalTo(e.target.value)}
                onBlur={handleApplyFilter}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {view === 'monthly' ? 'Monthly Spending Trend' : 'Yearly Spending Trend'}
          </Typography>
          <ResponsiveContainer width="100%" height={450}>
            {view === 'monthly' ? (
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year_month" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(monthlyData.length / 24))} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Line type="monotone" dataKey="total" stroke="#1565c0" strokeWidth={2} dot={false} />
              </LineChart>
            ) : (
              <BarChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="total" fill="#1565c0" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {view === 'yearly' && yearlyData.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Year-over-Year Comparison</Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '2px solid #eee' }}>Year</th>
                    <th style={{ textAlign: 'right', padding: 8, borderBottom: '2px solid #eee' }}>Total</th>
                    <th style={{ textAlign: 'right', padding: 8, borderBottom: '2px solid #eee' }}>Change</th>
                    <th style={{ textAlign: 'right', padding: 8, borderBottom: '2px solid #eee' }}>% Change</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyData.map((y, i) => {
                    const prev = i > 0 ? yearlyData[i - 1].total : 0;
                    const change = i > 0 ? y.total - prev : 0;
                    const pctChange = i > 0 && prev > 0 ? (change / prev) * 100 : 0;
                    return (
                      <tr key={y.year}>
                        <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{y.year}</td>
                        <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>{formatCurrency(y.total)}</td>
                        <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0', textAlign: 'right', color: change > 0 ? '#d32f2f' : '#388e3c' }}>
                          {i > 0 ? formatCurrency(change) : '-'}
                        </td>
                        <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0', textAlign: 'right', color: pctChange > 0 ? '#d32f2f' : '#388e3c' }}>
                          {i > 0 ? `${pctChange.toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
