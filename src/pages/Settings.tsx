import { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Select,
  MenuItem, FormControl, InputLabel, Grid, Table, TableBody,
  TableCell, TableHead, TableRow, Chip, Alert,
} from '@mui/material';
import { useSettingsStore } from '../stores/settingsStore';
import * as api from '../services/api';

export default function Settings() {
  const { settings, categories, importHistory, fetchSettings, updateSetting, fetchCategories, fetchImportHistory } = useSettingsStore();
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchCategories();
    fetchImportHistory();
  }, [fetchSettings, fetchCategories, fetchImportHistory]);

  useEffect(() => {
    setApiKey(settings.ai_api_key || '');
  }, [settings]);

  const handleSaveApiKey = async () => {
    await updateSetting('ai_api_key', apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* AI Configuration */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>AI Configuration</Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>AI Provider</InputLabel>
                    <Select
                      value={settings.ai_provider || 'local'}
                      label="AI Provider"
                      onChange={(e) => updateSetting('ai_provider', e.target.value)}
                    >
                      <MenuItem value="local">Local (Rule-based)</MenuItem>
                      <MenuItem value="external">External (Claude API)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {settings.ai_provider === 'external' && (
                  <>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label="API Key"
                        type="password"
                        fullWidth
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-ant-..."
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                      <Button variant="contained" onClick={handleSaveApiKey} fullWidth>Save</Button>
                    </Grid>
                  </>
                )}
              </Grid>
              {saved && <Alert severity="success" sx={{ mt: 1 }}>Saved!</Alert>}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Local mode uses rule-based NLP and statistical methods. External mode sends anonymized queries to Claude API for richer interaction.
                Your raw financial data stays local by default.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Category Taxonomy */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Category Taxonomy ({categories.length})</Typography>
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
                    {categories.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell>{cat.category}</TableCell>
                        <TableCell>{cat.subcategory || '-'}</TableCell>
                        <TableCell align="right">{cat.transaction_count}</TableCell>
                        <TableCell align="right">${cat.total_amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Database Info */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Database Information</Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>App Version</TableCell>
                    <TableCell>1.0.0</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>AI Provider</TableCell>
                    <TableCell><Chip label={settings.ai_provider || 'local'} size="small" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Total Imports</TableCell>
                    <TableCell>{importHistory.length}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Categories</TableCell>
                    <TableCell>{categories.length}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
