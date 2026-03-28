import { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
} from '@mui/material';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useAnalyticsStore } from '../stores/analyticsStore';
import { CHART_COLORS } from '../theme';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export default function Categories() {
  const {
    categoryData, subcategoryData, loading,
    fetchCategoryBreakdown, fetchSubcategoryBreakdown,
  } = useAnalyticsStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchCategoryBreakdown();
  }, [fetchCategoryBreakdown]);

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    fetchSubcategoryBreakdown(category);
  };

  if (loading && categoryData.length === 0) {
    return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Category Donut Chart */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Spending by Category</Typography>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={140}
                    onClick={(_, idx) => handleCategoryClick(categoryData[idx].category)}
                    style={{ cursor: 'pointer' }}
                  >
                    {categoryData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
                Click a segment to see subcategory breakdown
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Category Table */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Category Details</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">Count</TableCell>
                      <TableCell align="right">%</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categoryData.map((cat) => (
                      <TableRow
                        key={cat.category}
                        hover
                        onClick={() => handleCategoryClick(cat.category)}
                        sx={{ cursor: 'pointer', backgroundColor: selectedCategory === cat.category ? 'action.selected' : undefined }}
                      >
                        <TableCell>
                          <Chip label={cat.category} size="small" variant={selectedCategory === cat.category ? 'filled' : 'outlined'} color="primary" />
                        </TableCell>
                        <TableCell align="right">{formatCurrency(cat.total)}</TableCell>
                        <TableCell align="right">{cat.count.toLocaleString()}</TableCell>
                        <TableCell align="right">{cat.percentage.toFixed(1)}%</TableCell>
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
                <Typography variant="h6" gutterBottom>
                  {selectedCategory} - Subcategory Breakdown
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={subcategoryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="subcategory" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Bar dataKey="total" fill="#00897b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
