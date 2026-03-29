import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, CircularProgress, Chip, LinearProgress,
} from '@mui/material';
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, AccountBalance, CalendarToday,
  Warning, AutoGraph, Category as CategoryIcon, CloudUpload,
} from '@mui/icons-material';
import { useAnalyticsStore } from '../stores/analyticsStore';
import { projectAnnualSpending, calculateGrowthRate, detectAnomalies } from '../services/prediction';
import { generateInsights } from '../services/ai';
import {
  CHART_COLORS, SEVERITY_COLORS, formatCompactCurrency, getCategoryColor, CUSTOM_TOOLTIP_STYLE,
} from '../theme';
import type { Insight, AnnualProjection } from '../types';

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function Overview() {
  const navigate = useNavigate();
  const {
    keyMetrics, monthlyData, yearlyData, categoryData, topMerchants, fetchAll, loading,
    setSelectedCategory,
  } = useAnalyticsStore();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [projections, setProjections] = useState<AnnualProjection[]>([]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (categoryData.length > 0 && monthlyData.length > 0 && yearlyData.length > 0) {
      generateInsights().then(setInsights);
      setProjections(projectAnnualSpending(yearlyData));
    }
  }, [categoryData, monthlyData, yearlyData]);

  const last12months = useMemo(() => monthlyData.slice(-12), [monthlyData]);

  const yoyChange = useMemo(() => {
    if (yearlyData.length < 2) return 0;
    const sorted = [...yearlyData].sort((a, b) => a.year - b.year);
    const current = sorted[sorted.length - 1];
    const previous = sorted[sorted.length - 2];
    if (!previous || previous.total === 0) return 0;
    return ((current.total - previous.total) / previous.total) * 100;
  }, [yearlyData]);

  const avgMonthlyChange = useMemo(() => {
    if (yearlyData.length < 2 || monthlyData.length < 24) return 0;
    const sorted = [...yearlyData].sort((a, b) => a.year - b.year);
    const currentYear = sorted[sorted.length - 1].year;
    const prevYear = sorted[sorted.length - 2].year;
    const currentMonths = monthlyData.filter(m => m.year_month.startsWith(String(currentYear)));
    const prevMonths = monthlyData.filter(m => m.year_month.startsWith(String(prevYear)));
    if (prevMonths.length === 0) return 0;
    const currentAvg = currentMonths.reduce((s, m) => s + m.total, 0) / currentMonths.length;
    const prevAvg = prevMonths.reduce((s, m) => s + m.total, 0) / prevMonths.length;
    if (prevAvg === 0) return 0;
    return ((currentAvg - prevAvg) / prevAvg) * 100;
  }, [yearlyData, monthlyData]);

  const projectedAnnual = useMemo(() => {
    if (yearlyData.length < 2) return 0;
    const projs = projectAnnualSpending(yearlyData, 1);
    return projs.length > 0 ? projs[0].projected : 0;
  }, [yearlyData]);

  const ytdPercent = useMemo(() => {
    if (!keyMetrics || projectedAnnual === 0) return 0;
    return Math.min((keyMetrics.ytd_spending / projectedAnnual) * 100, 100);
  }, [keyMetrics, projectedAnnual]);

  const topCategoriesForMiniBar = useMemo(() => {
    return categoryData.slice(0, 3);
  }, [categoryData]);

  const totalCategorySpending = useMemo(() => {
    return categoryData.reduce((s, c) => s + c.total, 0);
  }, [categoryData]);

  const projectionChartData = useMemo(() => {
    const actuals = yearlyData.map(y => ({
      year: String(y.year),
      actual: y.total,
      projected: 0,
    }));
    const projs = projections.map(p => ({
      year: String(p.year),
      actual: 0,
      projected: p.projected,
    }));
    return [...actuals, ...projs];
  }, [yearlyData, projections]);

  const top8Merchants = useMemo(() => {
    return topMerchants.slice(0, 8).reverse();
  }, [topMerchants]);

  // Loading state
  if (loading && !keyMetrics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  // Empty state
  if (!keyMetrics || keyMetrics.total_transactions === 0) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight={500}
      >
        <CloudUpload sx={{ fontSize: 80, color: '#dadce0', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Welcome to FinApp
        </Typography>
        <Typography color="text.secondary" mb={3} textAlign="center" maxWidth={400}>
          Import your financial data to unlock spending insights, trends, and projections.
        </Typography>
        <Chip
          label="Go to Import"
          onClick={() => window.location.hash = '/import'}
          color="primary"
          clickable
          sx={{ fontWeight: 600, px: 2, py: 0.5 }}
        />
      </Box>
    );
  }

  const severityIconMap: Record<string, React.ReactNode> = {
    info: <AutoGraph sx={{ fontSize: 20 }} />,
    warning: <Warning sx={{ fontSize: 20 }} />,
    positive: <TrendingUp sx={{ fontSize: 20 }} />,
    negative: <TrendingDown sx={{ fontSize: 20 }} />,
  };

  const severityToColorKey = (severity: string): keyof typeof SEVERITY_COLORS => {
    if (severity === 'positive') return 'success';
    if (severity === 'negative') return 'error';
    if (severity === 'warning') return 'warning';
    return 'info';
  };

  return (
    <Box>
      {/* ===== Section 1: Hero Metric Cards ===== */}
      <Grid container spacing={3} mb={3}>
        {/* Card 1: Total Spending */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ overflow: 'hidden', p: 0 }}>
            <Box sx={{ borderLeft: '4px solid #1a73e8', p: 2.5 }}>
              <Typography variant="overline" sx={{ color: '#5f6368' }}>
                TOTAL SPENDING
              </Typography>
              <Typography variant="h4" fontWeight={800}>
                {formatCurrency(keyMetrics.total_spending)}
              </Typography>
              <Chip
                icon={yoyChange >= 0 ? <TrendingUp sx={{ fontSize: 16 }} /> : <TrendingDown sx={{ fontSize: 16 }} />}
                label={`${yoyChange >= 0 ? '+' : ''}${yoyChange.toFixed(1)}% YoY`}
                size="small"
                sx={{
                  mt: 1,
                  backgroundColor: yoyChange <= 0 ? '#e6f4ea' : '#fce8e6',
                  color: yoyChange <= 0 ? '#137333' : '#c5221f',
                  fontWeight: 600,
                  '& .MuiChip-icon': { color: 'inherit' },
                }}
              />
              <Box mt={1.5}>
                <ResponsiveContainer width="100%" height={45}>
                  <AreaChart data={last12months}>
                    <defs>
                      <linearGradient id="sparkBlue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1a73e8" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#1a73e8" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#1a73e8"
                      strokeWidth={2}
                      fill="url(#sparkBlue)"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Card 2: Monthly Average */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ overflow: 'hidden', p: 0 }}>
            <Box sx={{ borderLeft: '4px solid #34a853', p: 2.5 }}>
              <Typography variant="overline" sx={{ color: '#5f6368' }}>
                MONTHLY AVERAGE
              </Typography>
              <Typography variant="h4" fontWeight={800}>
                {formatCurrency(keyMetrics.avg_monthly_spending)}
              </Typography>
              <Chip
                icon={avgMonthlyChange <= 0 ? <TrendingDown sx={{ fontSize: 16 }} /> : <TrendingUp sx={{ fontSize: 16 }} />}
                label={`${avgMonthlyChange >= 0 ? '+' : ''}${avgMonthlyChange.toFixed(1)}% vs prior yr`}
                size="small"
                sx={{
                  mt: 1,
                  backgroundColor: avgMonthlyChange <= 0 ? '#e6f4ea' : '#fce8e6',
                  color: avgMonthlyChange <= 0 ? '#137333' : '#c5221f',
                  fontWeight: 600,
                  '& .MuiChip-icon': { color: 'inherit' },
                }}
              />
              <Box mt={1.5}>
                <ResponsiveContainer width="100%" height={45}>
                  <AreaChart data={last12months}>
                    <defs>
                      <linearGradient id="sparkGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34a853" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#34a853" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#34a853"
                      strokeWidth={2}
                      fill="url(#sparkGreen)"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Card 3: YTD Spending */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ overflow: 'hidden', p: 0 }}>
            <Box sx={{ borderLeft: '4px solid #f9ab00', p: 2.5 }}>
              <Typography variant="overline" sx={{ color: '#5f6368' }}>
                YTD SPENDING
              </Typography>
              <Typography variant="h4" fontWeight={800}>
                {formatCurrency(keyMetrics.ytd_spending)}
              </Typography>
              <Box mt={1}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    {ytdPercent.toFixed(0)}% of projected annual
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatCurrency(projectedAnnual)}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={ytdPercent}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#fef7e0',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      backgroundColor: '#f9ab00',
                    },
                  }}
                />
              </Box>
              <Box mt={1.5}>
                <ResponsiveContainer width="100%" height={45}>
                  <AreaChart data={last12months}>
                    <defs>
                      <linearGradient id="sparkAmber" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f9ab00" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#f9ab00" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#f9ab00"
                      strokeWidth={2}
                      fill="url(#sparkAmber)"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Card 4: Top Category */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Card
            sx={{ overflow: 'hidden', p: 0, cursor: 'pointer', '&:hover': { boxShadow: '0 2px 12px rgba(0,0,0,0.1)' } }}
            onClick={() => navigate('/categories')}
          >
            <Box sx={{ borderLeft: '4px solid #ea4335', p: 2.5 }}>
              <Typography variant="overline" sx={{ color: '#5f6368' }}>
                TOP CATEGORY
              </Typography>
              <Typography variant="h4" fontWeight={800}>
                {formatCurrency(keyMetrics.top_category_amount)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#5f6368', mt: 0.5 }}>
                {keyMetrics.top_category}
              </Typography>
              <Box mt={1.5}>
                {topCategoriesForMiniBar.map((cat, idx) => {
                  const pct = totalCategorySpending > 0
                    ? (cat.total / totalCategorySpending) * 100
                    : 0;
                  const colors = ['#ea4335', '#fbbc04', '#34a853'];
                  return (
                    <Box
                      key={cat.category}
                      mb={0.5}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategory(cat.category);
                        navigate(`/categories?selected=${encodeURIComponent(cat.category)}`);
                      }}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 1,
                        p: 0.25,
                        '&:hover': { backgroundColor: 'rgba(234, 67, 53, 0.06)' },
                      }}
                    >
                      <Box display="flex" justifyContent="space-between" mb={0.25}>
                        <Typography variant="caption" sx={{ color: '#5f6368', fontSize: 10 }}>
                          {cat.category}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#5f6368', fontSize: 10 }}>
                          {pct.toFixed(0)}%
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: '#f1f3f4',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            width: `${pct}%`,
                            borderRadius: 3,
                            backgroundColor: colors[idx % colors.length],
                            transition: 'width 0.8s ease',
                          }}
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* ===== Section 2: Main Charts ===== */}
      <Grid container spacing={3} mb={3}>
        {/* Monthly Spending Trend */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monthly Spending Trend
              </Typography>
              <ResponsiveContainer width="100%" height={340}>
                <AreaChart
                  data={last12months}
                  onClick={(data: any) => {
                    if (data?.activePayload?.[0]?.payload?.year_month) {
                      const ym = data.activePayload[0].payload.year_month;
                      const [year, month] = ym.split('-');
                      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
                      navigate(`/transactions?dateFrom=${ym}-01&dateTo=${ym}-${lastDay}`);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1a73e8" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#1a73e8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="year_month"
                    fontSize={11}
                    fill="#5f6368"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    fontSize={11}
                    fill="#5f6368"
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatCompactCurrency}
                  />
                  <Tooltip
                    {...CUSTOM_TOOLTIP_STYLE}
                    formatter={(value) => [formatCurrency(Number(value)), 'Spending']}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#1a73e8"
                    strokeWidth={2.5}
                    fill="url(#areaGradient)"
                    animationDuration={1000}
                    dot={{ r: 3, fill: '#1a73e8', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#1a73e8', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
                Click to explore details
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Spending by Category */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Spending by Category
              </Typography>
              <Box position="relative">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={categoryData.slice(0, 8)}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      stroke="white"
                      strokeWidth={2}
                      animationDuration={800}
                      onClick={(_, idx) => {
                        const cat = categoryData[idx]?.category;
                        if (cat) {
                          setSelectedCategory(cat);
                          navigate(`/categories?selected=${encodeURIComponent(cat)}`);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {categoryData.slice(0, 8).map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      {...CUSTOM_TOOLTIP_STYLE}
                      formatter={(value) => [formatCurrency(Number(value)), 'Spending']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                    mt: '-12px',
                  }}
                >
                  <Typography variant="h5" fontWeight={800} lineHeight={1.1}>
                    {formatCompactCurrency(totalCategorySpending)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total
                  </Typography>
                </Box>
              </Box>
              {/* Custom Legend */}
              <Box mt={1}>
                {categoryData.slice(0, 5).map((cat, idx) => (
                  <Box
                    key={cat.category}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    py={0.5}
                    onClick={() => {
                      setSelectedCategory(cat.category);
                      navigate(`/categories?selected=${encodeURIComponent(cat.category)}`);
                    }}
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 1,
                      px: 0.5,
                      '&:hover': { backgroundColor: 'rgba(26, 115, 232, 0.06)' },
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="body2" sx={{ color: '#202124', fontSize: 13 }}>
                        {cat.category}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#5f6368', fontSize: 13, fontWeight: 600 }}>
                      {cat.percentage.toFixed(1)}%
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                Click to explore details
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ===== Section 3: Insights + Projections ===== */}
      <Grid container spacing={3} mb={3}>
        {/* Insights */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Insights
              </Typography>
              {insights.length === 0 ? (
                <Box display="flex" alignItems="center" gap={1} py={2}>
                  <CircularProgress size={20} />
                  <Typography color="text.secondary" variant="body2">
                    Generating insights...
                  </Typography>
                </Box>
              ) : (
                insights.map((insight) => {
                  const colorKey = severityToColorKey(insight.severity);
                  const colors = SEVERITY_COLORS[colorKey];
                  return (
                    <Box
                      key={insight.id}
                      onClick={() => {
                        if (insight.type === 'trend' || insight.type === 'prediction') {
                          navigate('/trends');
                        } else {
                          navigate('/categories');
                        }
                      }}
                      sx={{
                        borderRadius: 3,
                        p: 2,
                        mb: 1.5,
                        backgroundColor: colors.bg,
                        borderLeft: `4px solid ${colors.border}`,
                        cursor: 'pointer',
                        transition: 'box-shadow 0.2s ease',
                        '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <Box sx={{ color: colors.icon }}>
                          {severityIconMap[insight.severity] || <AutoGraph sx={{ fontSize: 20 }} />}
                        </Box>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ color: colors.text }}>
                          {insight.title}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: '#5f6368', ml: 3.5 }}>
                        {insight.description}
                      </Typography>
                    </Box>
                  );
                })
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Spending Projections */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Spending Projections
              </Typography>
              {projectionChartData.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  Insufficient data for projections.
                </Typography>
              ) : (
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart
                    data={projectionChartData}
                    onClick={() => navigate('/trends')}
                    style={{ cursor: 'pointer' }}
                  >
                    <defs>
                      <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#90caf9" stopOpacity={1} />
                        <stop offset="100%" stopColor="#90caf9" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="year"
                      fontSize={11}
                      fill="#5f6368"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      fontSize={11}
                      fill="#5f6368"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatCompactCurrency}
                    />
                    <Tooltip
                      {...CUSTOM_TOOLTIP_STYLE}
                      formatter={(value, name) => [
                        formatCurrency(Number(value)),
                        String(name) === 'actual' ? 'Actual' : 'Projected',
                      ]}
                    />
                    <Legend
                      formatter={(value) => (value === 'actual' ? 'Actual' : 'Projected')}
                    />
                    <Bar
                      dataKey="actual"
                      fill="#1a73e8"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                    <Bar
                      dataKey="projected"
                      fill="url(#projectedGradient)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
                Click to explore details
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ===== Section 4: Top Merchants ===== */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Merchants
              </Typography>
              {top8Merchants.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  No merchant data available.
                </Typography>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(top8Merchants.length * 45, 300)}>
                  <BarChart
                    data={top8Merchants}
                    layout="vertical"
                    onClick={(data: any) => {
                      if (data?.activePayload?.[0]?.payload?.merchant) {
                        navigate(`/transactions?merchant=${encodeURIComponent(data.activePayload[0].payload.merchant)}`);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <defs>
                      <linearGradient id="merchantGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#1a73e8" stopOpacity={1} />
                        <stop offset="100%" stopColor="#4da3ff" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis
                      type="number"
                      fontSize={11}
                      fill="#5f6368"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatCompactCurrency}
                    />
                    <YAxis
                      type="category"
                      dataKey="merchant"
                      width={130}
                      fontSize={12}
                      fill="#5f6368"
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      {...CUSTOM_TOOLTIP_STYLE}
                      formatter={(value) => [formatCurrency(Number(value)), 'Spending']}
                    />
                    <Bar
                      dataKey="total"
                      fill="url(#merchantGradient)"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
                Click to explore details
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
