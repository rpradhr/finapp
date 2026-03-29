import { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Grid,
  Table, TableBody, TableCell, TableHead, TableRow, Alert,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
  Info as InfoIcon,
  SmartToy as SmartToyIcon,
  FileUpload as FileUploadIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import { useSettingsStore } from '../stores/settingsStore';
import { useAnalyticsStore } from '../stores/analyticsStore';
import * as api from '../services/api';
import { getCategoryColor, formatCompactCurrency } from '../theme';

export default function Settings() {
  const { settings, categories, importHistory, fetchSettings, updateSetting, fetchCategories, fetchImportHistory } = useSettingsStore();
  const { categoryData, fetchCategoryBreakdown } = useAnalyticsStore();
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchCategories();
    fetchImportHistory();
    fetchCategoryBreakdown();
  }, [fetchSettings, fetchCategories, fetchImportHistory, fetchCategoryBreakdown]);

  useEffect(() => {
    setApiKey(settings.ai_api_key || '');
  }, [settings]);

  const handleSaveApiKey = async () => {
    await updateSetting('ai_api_key', apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const statBoxes = [
    { icon: <InfoIcon sx={{ fontSize: 30, color: '#5f6368' }} />, value: '1.0.0', label: 'App Version' },
    { icon: <SmartToyIcon sx={{ fontSize: 30, color: '#5f6368' }} />, value: settings.ai_provider || 'local', label: 'AI Provider' },
    { icon: <FileUploadIcon sx={{ fontSize: 30, color: '#5f6368' }} />, value: String(importHistory.length), label: 'Total Imports' },
    { icon: <CategoryIcon sx={{ fontSize: 30, color: '#5f6368' }} />, value: String(categories.length), label: 'Categories' },
  ];

  return (
    <Box>
      <Grid container spacing={3}>
        {/* AI Configuration - full width */}
        <Grid size={12}>
          <Card sx={{ borderTop: '4px solid #1a73e8' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>AI Configuration</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Local mode uses rule-based NLP and statistical methods. External mode sends anonymized queries to Claude API for richer interaction.
                Your raw financial data stays local by default.
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <ToggleButtonGroup
                  value={settings.ai_provider || 'local'}
                  exclusive
                  onChange={(_, val) => { if (val) updateSetting('ai_provider', val); }}
                  sx={{
                    '& .MuiToggleButton-root': {
                      borderRadius: '20px !important',
                      px: 3,
                      py: 0.75,
                      border: '1px solid #e0e0e0',
                      '&.Mui-selected': {
                        backgroundColor: '#e8f0fe',
                        color: '#1a73e8',
                        borderColor: '#1a73e8',
                        '&:hover': {
                          backgroundColor: '#d2e3fc',
                        },
                      },
                    },
                  }}
                >
                  <ToggleButton value="local">Local</ToggleButton>
                  <ToggleButton value="external">Claude API</ToggleButton>
                </ToggleButtonGroup>

                {settings.ai_provider === 'external' && (
                  <>
                    <TextField
                      label="API Key"
                      type="password"
                      size="small"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-ant-..."
                      sx={{ flex: 1, minWidth: 240 }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleSaveApiKey}
                      sx={{ borderRadius: 20, px: 3 }}
                    >
                      Save
                    </Button>
                  </>
                )}
              </Box>

              {saved && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  API key saved successfully!
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Category Taxonomy */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ borderTop: '4px solid #34a853' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Category Taxonomy ({categories.length})
              </Typography>
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell>Subcategory</TableCell>
                      <TableCell align="right">Count</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categories.map((cat, idx) => (
                      <TableRow
                        key={cat.id}
                        sx={{
                          backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa',
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                backgroundColor: getCategoryColor(cat.category),
                                flexShrink: 0,
                              }}
                            />
                            {cat.category}
                          </Box>
                        </TableCell>
                        <TableCell>{cat.subcategory || '-'}</TableCell>
                        <TableCell align="right">{cat.transaction_count}</TableCell>
                        <TableCell align="right">
                          {formatCompactCurrency(cat.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Database Information */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ borderTop: '4px solid #5f6368' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Database Information</Typography>
              <Grid container spacing={2}>
                {statBoxes.map((stat) => (
                  <Grid size={6} key={stat.label}>
                    <Box
                      sx={{
                        borderRadius: 3,
                        backgroundColor: '#f8f9fa',
                        p: 2,
                        textAlign: 'center',
                      }}
                    >
                      {stat.icon}
                      <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                        {stat.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stat.label}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
