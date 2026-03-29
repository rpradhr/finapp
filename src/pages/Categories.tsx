import { useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Grid, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Treemap,
} from 'recharts';
import { useAnalyticsStore } from '../stores/analyticsStore';
import { CHART_COLORS, formatCompactCurrency, CUSTOM_TOOLTIP_STYLE } from '../theme';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

interface TreemapContentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  name: string;
  total: number;
}

function CustomTreemapContent(props: TreemapContentProps) {
  const { x, y, width, height, index, name, total } = props;
  const fill = CHART_COLORS[index % CHART_COLORS.length];
  const showLabel = width > 60 && height > 40;
  const showAmount = width > 80 && height > 55;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        ry={4}
        style={{
          fill,
          stroke: '#fff',
          strokeWidth: 3,
          opacity: 0.9,
        }}
      />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showAmount ? 8 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontSize: Math.min(12, width / 8),
            fontWeight: 600,
            fill: '#fff',
            pointerEvents: 'none',
          }}
        >
          {name}
        </text>
      )}
      {showAmount && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 12}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontSize: Math.min(10, width / 10),
            fontWeight: 500,
            fill: 'rgba(255,255,255,0.85)',
            pointerEvents: 'none',
          }}
        >
          {formatCompactCurrency(total)}
        </text>
      )}
    </g>
  );
}

export default function Categories() {
  const {
    categoryData, subcategoryData, loading,
    fetchCategoryBreakdown, fetchSubcategoryBreakdown,
  } = useAnalyticsStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const initialSelectDone = useRef(false);

  useEffect(() => {
    fetchCategoryBreakdown();
  }, [fetchCategoryBreakdown]);

  // Auto-select category from URL query parameter
  useEffect(() => {
    if (initialSelectDone.current || categoryData.length === 0) return;
    const selected = searchParams.get('selected');
    if (selected) {
      handleCategoryClick(selected);
      setSearchParams({}, { replace: true });
      initialSelectDone.current = true;
    }
  }, [categoryData, searchParams]);

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    fetchSubcategoryBreakdown(category);
  };

  const totalSpending = useMemo(
    () => categoryData.reduce((sum, c) => sum + c.total, 0),
    [categoryData],
  );

  const top5Categories = useMemo(
    () => [...categoryData].sort((a, b) => b.total - a.total).slice(0, 5),
    [categoryData],
  );

  const treemapData = useMemo(
    () => categoryData.map((c) => ({ category: c.category, total: c.total })),
    [categoryData],
  );

  const hoveredItem = useMemo(() => {
    if (!hoveredCategory) return null;
    return categoryData.find((c) => c.category === hoveredCategory) || null;
  }, [hoveredCategory, categoryData]);

  if (loading && categoryData.length === 0) {
    return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Donut Chart */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: '#202124' }}>
                Spending by Category
              </Typography>
              <Box sx={{ position: 'relative' }}>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      stroke="#fff"
                      strokeWidth={3}
                      onClick={(_, idx) => handleCategoryClick(categoryData[idx].category)}
                      onMouseEnter={(_, idx) => setHoveredCategory(categoryData[idx].category)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      style={{ cursor: 'pointer', outline: 'none' }}
                    >
                      {categoryData.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: unknown) => [formatCurrency(Number(v)), 'Spending']}
                      {...CUSTOM_TOOLTIP_STYLE}
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
                  }}
                >
                  {hoveredItem ? (
                    <>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: '#202124', fontSize: 12, maxWidth: 90, lineHeight: 1.2 }}
                      >
                        {hoveredItem.category}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#202124', mt: 0.25 }}>
                        {formatCompactCurrency(hoveredItem.total)}
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#202124' }}>
                        {formatCompactCurrency(totalSpending)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#5f6368' }}>
                        Total
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>

              {/* Custom legend */}
              <Box sx={{ mt: 2, px: 1 }}>
                {top5Categories.map((cat, idx) => {
                  const colorIdx = categoryData.findIndex((c) => c.category === cat.category);
                  return (
                    <Box
                      key={cat.category}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        py: 0.75,
                        borderBottom: idx < top5Categories.length - 1 ? '1px solid #f1f3f4' : 'none',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: CHART_COLORS[colorIdx % CHART_COLORS.length],
                            flexShrink: 0,
                          }}
                        />
                        <Typography variant="body2" sx={{ color: '#202124', fontWeight: 500 }}>
                          {cat.category}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: '#5f6368', fontWeight: 500 }}>
                        {cat.percentage.toFixed(1)}%
                      </Typography>
                    </Box>
                  );
                })}
              </Box>

              <Typography variant="caption" color="text.secondary" textAlign="center" display="block" sx={{ mt: 2 }}>
                Click a segment to see subcategory breakdown
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Category Table */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#202124' }}>
                Category Details
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">Count</TableCell>
                      <TableCell align="right">%</TableCell>
                      <TableCell sx={{ width: 140 }}>Distribution</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categoryData.map((cat, idx) => (
                      <TableRow
                        key={cat.category}
                        hover
                        onClick={() => handleCategoryClick(cat.category)}
                        sx={{
                          cursor: 'pointer',
                          backgroundColor: selectedCategory === cat.category ? 'rgba(26, 115, 232, 0.06)' : undefined,
                          '&:hover': {
                            backgroundColor: selectedCategory === cat.category
                              ? 'rgba(26, 115, 232, 0.1)'
                              : 'rgba(0,0,0,0.02)',
                          },
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                                flexShrink: 0,
                              }}
                            />
                            <Typography variant="body2" fontWeight={selectedCategory === cat.category ? 600 : 500}>
                              {cat.category}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={500}>
                            {formatCurrency(cat.total)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            {cat.count.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={500}>
                            {cat.percentage.toFixed(1)}%
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                              width: `${Math.max(cat.percentage, 1)}%`,
                              opacity: 0.8,
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Subcategory Breakdown */}
        {selectedCategory && subcategoryData.length > 0 && (
          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#202124' }}>
                  {selectedCategory} — Subcategory Breakdown
                </Typography>
                <ResponsiveContainer width="100%" height={Math.max(300, subcategoryData.length * 40)}>
                  <BarChart
                    data={subcategoryData}
                    layout="vertical"
                    margin={{ top: 0, right: 30, bottom: 0, left: 10 }}
                  >
                    <defs>
                      <linearGradient id="subBarGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#1a73e8" stopOpacity={0.85} />
                        <stop offset="100%" stopColor="#1a73e8" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#f0f0f0" strokeDasharray="" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => formatCompactCurrency(v)}
                      tick={{ fontSize: 11, fill: '#5f6368' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="subcategory"
                      width={140}
                      tick={{ fontSize: 12, fill: '#202124', fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v: unknown) => [formatCurrency(Number(v)), 'Spending']}
                      {...CUSTOM_TOOLTIP_STYLE}
                    />
                    <Bar
                      dataKey="total"
                      fill="url(#subBarGradient)"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Treemap */}
        {categoryData.length > 0 && (
          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#202124' }}>
                  Category Treemap
                </Typography>
                <ResponsiveContainer width="100%" height={360}>
                  <Treemap
                    data={treemapData}
                    dataKey="total"
                    nameKey="category"
                    fill="#1a73e8"
                    animationDuration={800}
                    content={<CustomTreemapContent x={0} y={0} width={0} height={0} index={0} name="" total={0} />}
                  >
                    <Tooltip
                      formatter={(v: unknown) => [formatCurrency(Number(v)), 'Spending']}
                      {...CUSTOM_TOOLTIP_STYLE}
                    />
                  </Treemap>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
