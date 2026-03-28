import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Alert, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Grid, Chip, CircularProgress,
} from '@mui/material';
import { CloudUpload as UploadIcon, CheckCircle as CheckIcon } from '@mui/icons-material';
import { open } from '@tauri-apps/plugin-dialog';
import * as api from '../services/api';
import type { ImportSummary, ImportBatch, PaginatedResult, DataQualityIssue } from '../types';

export default function Import() {
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportBatch[]>([]);
  const [qualityIssues, setQualityIssues] = useState<PaginatedResult<DataQualityIssue> | null>(null);

  useEffect(() => {
    api.getImportHistory().then(setHistory).catch(console.error);
    api.getDataQualityIssues(1, 20).then(setQualityIssues).catch(console.error);
  }, []);

  const handleImport = async () => {
    try {
      const filePath = await open({
        multiple: false,
        filters: [{ name: 'Spreadsheet', extensions: ['xlsx', 'xls'] }],
      });

      if (!filePath) return;

      setImporting(true);
      setError(null);
      setSummary(null);

      const result = await api.importSpreadsheet(filePath as string);
      setSummary(result);

      // Refresh data
      const [h, q] = await Promise.all([
        api.getImportHistory(),
        api.getDataQualityIssues(1, 20),
      ]);
      setHistory(h);
      setQualityIssues(q);
    } catch (err) {
      setError(String(err));
    } finally {
      setImporting(false);
    }
  };

  const handleResolveIssue = async (id: string, category: string) => {
    try {
      await api.resolveDataQualityIssue(id, category);
      const q = await api.getDataQualityIssues(1, 20);
      setQualityIssues(q);
    } catch (err) {
      console.error('Failed to resolve issue:', err);
    }
  };

  return (
    <Box>
      {/* Import Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Import Spreadsheet</Typography>
          <Typography color="text.secondary" mb={2}>
            Import your family expense spreadsheet (.xlsx). The app will parse, validate, and normalize all transactions.
            Re-importing will update existing imported records while preserving manually added expenses.
          </Typography>

          <Button
            variant="contained"
            size="large"
            startIcon={<UploadIcon />}
            onClick={handleImport}
            disabled={importing}
          >
            {importing ? 'Importing...' : 'Select & Import Spreadsheet'}
          </Button>

          {importing && <LinearProgress sx={{ mt: 2 }} />}

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

          {summary && (
            <Alert severity="success" sx={{ mt: 2 }} icon={<CheckIcon />}>
              <Typography variant="subtitle2">Import Complete</Typography>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid size={4}><Typography variant="body2">Total rows: {summary.total_rows}</Typography></Grid>
                <Grid size={4}><Typography variant="body2">Imported: {summary.imported_rows}</Typography></Grid>
                <Grid size={4}><Typography variant="body2">Updated: {summary.updated_rows}</Typography></Grid>
                <Grid size={4}><Typography variant="body2">Errors: {summary.error_rows}</Typography></Grid>
                <Grid size={4}><Typography variant="body2">Warnings: {summary.warning_rows}</Typography></Grid>
                <Grid size={4}><Typography variant="body2">Merchants: {summary.merchants_imported}</Typography></Grid>
                <Grid size={4}><Typography variant="body2">Categories: {summary.categories_imported}</Typography></Grid>
                <Grid size={4}><Typography variant="body2">Quality issues: {summary.quality_issues_imported}</Typography></Grid>
              </Grid>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Import History */}
      {history.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Import History</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>File</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Imported</TableCell>
                    <TableCell align="right">Errors</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>{new Date(batch.imported_at).toLocaleDateString()}</TableCell>
                      <TableCell>{batch.filename}</TableCell>
                      <TableCell align="right">{batch.total_rows}</TableCell>
                      <TableCell align="right">{batch.imported_rows}</TableCell>
                      <TableCell align="right">{batch.error_rows}</TableCell>
                      <TableCell>
                        <Chip label={batch.status} size="small" color={batch.status === 'completed' ? 'success' : 'warning'} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Data Quality Issues */}
      {qualityIssues && qualityIssues.total > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Data Quality Issues ({qualityIssues.total})
            </Typography>
            <Typography color="text.secondary" mb={2}>
              These transactions need review. Click a category to re-categorize.
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Issue</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {qualityIssues.data.map((issue) => (
                    <TableRow key={issue.id} hover>
                      <TableCell>{issue.transaction_date}</TableCell>
                      <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {issue.raw_description || '-'}
                      </TableCell>
                      <TableCell align="right">${issue.amount.toFixed(2)}</TableCell>
                      <TableCell>{issue.data_quality_issue || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={issue.data_quality_status}
                          size="small"
                          color={issue.data_quality_status === 'flagged' ? 'warning' : 'success'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
