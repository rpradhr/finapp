import { useEffect, useMemo, useState } from 'react';
import {
  Box, Card, CardContent, Typography, ToggleButtonGroup, ToggleButton,
  TextField, Grid, CircularProgress, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList,
} from 'recharts';
import { useAnalyticsStore } from '../stores/analyticsStore';
import { CHART_COLORS, formatCompactCurrency, CUSTOM_TOOLTIP_STYLE } from '../theme';

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

  const yoyData = useMemo(() => {
    return yearlyData.map((y, i) => {
      const prev = i > 0 ? yearlyData[i - 1].total : 0;
      const change = i > 0 ? y.total - prev : 0;
      const pctChange = i > 0 && prev > 0 ? (change / prev) * 100 : 0;
      return { ...y, change, pctChange, isFirst: i === 0 };
    });
  }, [yearlyData]);

  const periodSummary = useMemo(() => {
    if (monthlyData.length === 0) return null;
    const totals = monthlyData.map((m) => m.total);
    const sum = totals.reduce((a, b) => a + b, 0);
    const avg = sum / totals.length;
    const max = Math.max(...totals);
    const min = Math.min(...totals);
    const highestMonth = monthlyData.find((m) => m.total === max);
    const lowestMonth = monthlyData.find((m) => m.total === min);
    return {
      avg,
      highest: { month: highestMonth?.year_month || '', value: max },
      lowest: { month: lowestMonth?.year_month || '', value: min },
    };
  }, [monthlyData]);

  if (loading && monthlyData.length === 0) {
    return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
  }

  return (
    <Box>
      {/* Controls Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }}>
              <ToggleButtonGroup
                value={view}
                exclusive
                onChange={(_, v) => v && setView(v)}
                size="small"
                fullWidth
                sx={{
                  '& .MuiToggleButton-root': {
                    borderRadius: '24px !important',
                    border: '1px solid #e0e0e0',
                    mx: 0.5,
                    px: 3,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#5f6368',
                    '&.Mui-selected': {
                      backgroundColor: '#1a73e8',
                      color: '#fff',
                      border: '1px solid #1a73e8',
                      '&:hover': {
                        backgroundColor: '#1557b0',
                      },
                    },
                  },
                }}
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
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#202124' }}>
            {view === 'monthly' ? 'Monthly Spending Trend' : 'Yearly Spending Trend'}
          </Typography>
          <ResponsiveContainer width="100%" height={420}>
            {view === 'monthly' ? (
              <AreaChart data={monthlyData} margin={{ top: 10, right: 20, bottom: 0, left: 10 }}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a73e8" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#1a73e8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f0f0f0" strokeDasharray="" vertical={false} />
                <XAxis
                  dataKey="year_month"
                  tick={{ fontSize: 11, fill: '#5f6368' }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.max(0, Math.floor(monthlyData.length / 18))}
                />
                <YAxis
                  tickFormatter={(v) => formatCompactCurrency(v)}
                  tick={{ fontSize: 11, fill: '#5f6368' }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip
                  formatter={(v: unknown) => [formatCurrency(Number(v)), 'Spending']}
                  {...CUSTOM_TOOLTIP_STYLE}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#1a73e8"
                  strokeWidth={2.5}
                  fill="url(#areaGradient)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#1a73e8', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            ) : (
              <BarChart data={yearlyData} margin={{ top: 30, right: 20, bottom: 0, left: 10 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a73e8" stopOpacity={1} />
                    <stop offset="100%" stopColor="#1a73e8" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f0f0f0" strokeDasharray="" vertical={false} />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11, fill: '#5f6368' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => formatCompactCurrency(v)}
                  tick={{ fontSize: 11, fill: '#5f6368' }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip
                  formatter={(v: unknown) => [formatCurrency(Number(v)), 'Spending']}
                  {...CUSTOM_TOOLTIP_STYLE}
                />
                <Bar dataKey="total" fill="url(#barGradient)" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  <LabelList
                    dataKey="total"
                    position="top"
                    formatter={(v: unknown) => formatCompactCurrency(Number(v))}
                    style={{ fontSize: 11, fontWeight: 600, fill: '#5f6368' }}
                  />
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* YoY Comparison Table */}
      {view === 'yearly' && yoyData.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#202124' }}>
              Year-over-Year Comparison
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Year</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Change</TableCell>
                    <TableCell align="right">% Change</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {yoyData.map((row, idx) => {
                    const isIncrease = row.change > 0;
                    const dotColor = row.isFirst
                      ? '#9e9e9e'
                      : isIncrease
                        ? '#ea4335'
                        : '#34a853';
                    return (
                      <TableRow key={row.year} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                backgroundColor: dotColor,
                                flexShrink: 0,
                              }}
                            />
                            <Typography variant="body2" fontWeight={600}>
                              {row.year}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={500}>
                            {formatCurrency(row.total)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {row.isFirst ? (
                            <Typography variant="body2" color="text.secondary">-</Typography>
                          ) : (
                            <Typography
                              variant="body2"
                              fontWeight={500}
                              sx={{ color: isIncrease ? '#ea4335' : '#34a853' }}
                            >
                              {isIncrease ? '+' : ''}{formatCurrency(row.change)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {row.isFirst ? (
                            <Typography variant="body2" color="text.secondary">-</Typography>
                          ) : (
                            <Chip
                              label={`${isIncrease ? '+' : ''}${row.pctChange.toFixed(1)}%`}
                              size="small"
                              sx={{
                                fontWeight: 600,
                                fontSize: 12,
                                backgroundColor: isIncrease ? '#fce8e6' : '#e6f4ea',
                                color: isIncrease ? '#c5221f' : '#137333',
                                border: 'none',
                              }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Period Summary */}
      {periodSummary && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#202124' }}>
              Period Summary
            </Typography>
            <Grid container spacing={2}>
              {[
                {
                  label: 'Average Monthly',
                  value: formatCurrency(periodSummary.avg),
                  color: CHART_COLORS[0],
                  bgColor: '#e8f0fe',
                },
                {
                  label: 'Highest Month',
                  value: formatCurrency(periodSummary.highest.value),
                  subtitle: periodSummary.highest.month,
                  color: '#ea4335',
                  bgColor: '#fce8e6',
                },
                {
                  label: 'Lowest Month',
                  value: formatCurrency(periodSummary.lowest.value),
                  subtitle: periodSummary.lowest.month,
                  color: '#34a853',
                  bgColor: '#e6f4ea',
                },
              ].map((stat) => (
                <Grid size={{ xs: 12, md: 4 }} key={stat.label}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      backgroundColor: stat.bgColor,
                      textAlign: 'center',
                    }}
                  >
                    <Typography
                      variant="overline"
                      sx={{ color: '#5f6368', display: 'block', mb: 0.5 }}
                    >
                      {stat.label}
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 700, color: stat.color }}
                    >
                      {stat.value}
                    </Typography>
                    {stat.subtitle && (
                      <Typography variant="caption" sx={{ color: '#5f6368', mt: 0.5, display: 'block' }}>
                        {stat.subtitle}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
