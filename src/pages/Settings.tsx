import { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Grid,
  Table, TableBody, TableCell, TableHead, TableRow, Alert,
  ToggleButton, ToggleButtonGroup, Chip, InputAdornment, IconButton,
} from '@mui/material';
import {
  Info as InfoIcon,
  SmartToy as SmartToyIcon,
  FileUpload as FileUploadIcon,
  Category as CategoryIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useSettingsStore } from '../stores/settingsStore';
import { useAnalyticsStore } from '../stores/analyticsStore';
import { getCategoryColor, formatCompactCurrency } from '../theme';

type AIProviderType = 'local' | 'claude' | 'openai' | 'gemini' | 'custom';

interface ProviderConfig {
  label: string;
  color: string;
  keySettingName: string;
  placeholder: string;
  modelHint: string;
}

const PROVIDERS: Record<Exclude<AIProviderType, 'local'>, ProviderConfig> = {
  claude: {
    label: 'Claude',
    color: '#D97706',
    keySettingName: 'ai_api_key',
    placeholder: 'sk-ant-api03-...',
    modelHint: 'claude-sonnet-4-6, claude-opus-4-6',
  },
  openai: {
    label: 'OpenAI',
    color: '#10A37F',
    keySettingName: 'ai_api_key_openai',
    placeholder: 'sk-proj-...',
    modelHint: 'gpt-4o, gpt-4o-mini, o1',
  },
  gemini: {
    label: 'Gemini',
    color: '#4285F4',
    keySettingName: 'ai_api_key_gemini',
    placeholder: 'AIzaSy...',
    modelHint: 'gemini-2.5-pro, gemini-2.5-flash',
  },
  custom: {
    label: 'Custom',
    color: '#7C3AED',
    keySettingName: 'ai_api_key_custom',
    placeholder: 'your-api-key',
    modelHint: 'Any OpenAI-compatible API',
  },
};

export default function Settings() {
  const { settings, categories, importHistory, fetchSettings, updateSetting, fetchCategories, fetchImportHistory } = useSettingsStore();
  const { categoryData, fetchCategoryBreakdown } = useAnalyticsStore();

  const [provider, setProvider] = useState<AIProviderType>('local');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchCategories();
    fetchImportHistory();
    fetchCategoryBreakdown();
  }, [fetchSettings, fetchCategories, fetchImportHistory, fetchCategoryBreakdown]);

  useEffect(() => {
    const p = settings.ai_provider || 'local';
    setProvider(p as AIProviderType);
    setApiKeys({
      ai_api_key: settings.ai_api_key || '',
      ai_api_key_openai: settings.ai_api_key_openai || '',
      ai_api_key_gemini: settings.ai_api_key_gemini || '',
      ai_api_key_custom: settings.ai_api_key_custom || '',
    });
    setCustomEndpoint(settings.ai_custom_endpoint || '');
  }, [settings]);

  const handleProviderChange = async (_: unknown, val: string | null) => {
    if (!val) return;
    setProvider(val as AIProviderType);
    await updateSetting('ai_provider', val);
  };

  const handleSave = async () => {
    // Save all API keys
    for (const [key, value] of Object.entries(apiKeys)) {
      await updateSetting(key, value);
    }
    if (provider === 'custom') {
      await updateSetting('ai_custom_endpoint', customEndpoint);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const activeConfig = provider !== 'local' ? PROVIDERS[provider] : null;

  const getKeyStatus = (key: string): boolean => {
    const val = apiKeys[key];
    return !!val && val.length > 10;
  };

  const statBoxes = [
    { icon: <InfoIcon sx={{ fontSize: 30, color: '#5f6368' }} />, value: '1.0.0', label: 'App Version' },
    { icon: <SmartToyIcon sx={{ fontSize: 30, color: '#5f6368' }} />, value: provider === 'local' ? 'Local' : PROVIDERS[provider as Exclude<AIProviderType, 'local'>]?.label || provider, label: 'AI Provider' },
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
              <Typography variant="h6" gutterBottom>AI Assistant Configuration</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choose an AI provider for the Assistant. Local mode uses rule-based NLP — your data never leaves your machine.
                External providers enable richer conversational queries. Only anonymized summaries are sent.
              </Typography>

              {/* Provider Toggle */}
              <ToggleButtonGroup
                value={provider}
                exclusive
                onChange={handleProviderChange}
                sx={{
                  mb: 3,
                  flexWrap: 'wrap',
                  '& .MuiToggleButton-root': {
                    borderRadius: '20px !important',
                    px: 2.5,
                    py: 0.75,
                    border: '1px solid #e0e0e0',
                    mr: 1,
                    mb: 1,
                    '&.Mui-selected': {
                      backgroundColor: '#e8f0fe',
                      color: '#1a73e8',
                      borderColor: '#1a73e8',
                      '&:hover': { backgroundColor: '#d2e3fc' },
                    },
                  },
                }}
              >
                <ToggleButton value="local">Local (Offline)</ToggleButton>
                <ToggleButton value="claude">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    Claude
                    {getKeyStatus('ai_api_key') && <CheckCircleIcon sx={{ fontSize: 14, color: '#34a853' }} />}
                  </Box>
                </ToggleButton>
                <ToggleButton value="openai">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    OpenAI
                    {getKeyStatus('ai_api_key_openai') && <CheckCircleIcon sx={{ fontSize: 14, color: '#34a853' }} />}
                  </Box>
                </ToggleButton>
                <ToggleButton value="gemini">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    Gemini
                    {getKeyStatus('ai_api_key_gemini') && <CheckCircleIcon sx={{ fontSize: 14, color: '#34a853' }} />}
                  </Box>
                </ToggleButton>
                <ToggleButton value="custom">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    Custom
                    {getKeyStatus('ai_api_key_custom') && <CheckCircleIcon sx={{ fontSize: 14, color: '#34a853' }} />}
                  </Box>
                </ToggleButton>
              </ToggleButtonGroup>

              {/* Provider-specific config */}
              {activeConfig && (
                <Card variant="outlined" sx={{ mb: 2, borderColor: activeConfig.color, borderLeftWidth: 3 }}>
                  <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <Chip
                        label={activeConfig.label}
                        size="small"
                        sx={{ backgroundColor: `${activeConfig.color}15`, color: activeConfig.color, fontWeight: 600 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Models: {activeConfig.modelHint}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <TextField
                        label="API Key"
                        type={showKey[provider] ? 'text' : 'password'}
                        size="small"
                        value={apiKeys[activeConfig.keySettingName] || ''}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, [activeConfig.keySettingName]: e.target.value }))}
                        placeholder={activeConfig.placeholder}
                        sx={{ flex: 1, minWidth: 300 }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => setShowKey(prev => ({ ...prev, [provider]: !prev[provider] }))}
                              >
                                {showKey[provider] ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />

                      {provider === 'custom' && (
                        <TextField
                          label="API Endpoint"
                          size="small"
                          value={customEndpoint}
                          onChange={(e) => setCustomEndpoint(e.target.value)}
                          placeholder="https://api.example.com/v1/chat/completions"
                          sx={{ flex: 1, minWidth: 300 }}
                        />
                      )}

                      <Button
                        variant="contained"
                        onClick={handleSave}
                        sx={{ borderRadius: 20, px: 3, minWidth: 100 }}
                      >
                        Save
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              )}

              {/* All configured keys summary */}
              {provider === 'local' && (
                <Card variant="outlined" sx={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed' }}>
                  <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Local mode uses built-in NLP to parse your queries. Switch to an AI provider for richer analysis.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {(Object.entries(PROVIDERS) as [Exclude<AIProviderType, 'local'>, ProviderConfig][]).map(([key, cfg]) => (
                        <Chip
                          key={key}
                          label={cfg.label}
                          size="small"
                          icon={getKeyStatus(cfg.keySettingName) ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : undefined}
                          variant={getKeyStatus(cfg.keySettingName) ? 'filled' : 'outlined'}
                          sx={{
                            ...(getKeyStatus(cfg.keySettingName) ? {
                              backgroundColor: '#e6f4ea',
                              color: '#34a853',
                            } : {
                              borderColor: '#dadce0',
                              color: '#9aa0a6',
                            }),
                          }}
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              )}

              {saved && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Settings saved successfully!
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
