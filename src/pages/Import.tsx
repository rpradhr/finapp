import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Alert, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Grid, Chip,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { open } from '@tauri-apps/plugin-dialog';
import * as api from '../services/api';
import type { ImportSummary, ImportBatch, PaginatedResult, DataQualityIssue } from '../types';

interface StatBoxProps {
  label: string;
  value: number | string;
  bg: string;
  color: string;
}

function StatBox({ label, value, bg, color }: StatBoxProps) {
  return (
    <Box
      sx={{
        borderRadius: '12px',
        p: 2,
        textAlign: 'center',
        backgroundColor: bg,
      }}
    >
      <Typography variant="h5" fontWeight={700} sx={{ color, lineHeight: 1.2 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Typography>
      <Typography variant="caption" sx={{ color: '#5f6368', mt: 0.5, display: 'block' }}>
        {label}
      </Typography>
    </Box>
  );
}

export default function Import() {
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportBatch[]>([]);
  const [qualityIssues, setQualityIssues] = useState<PaginatedResult<DataQualityIssue> | null>(null);
  const [hovered, setHovered] = useState(false);

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
      {/* Upload Zone */}
      <Box
        onClick={!importing ? handleImport : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        sx={{
          border: '2px dashed',
          borderColor: hovered ? '#1a73e8' : '#dadce0',
          borderRadius: '16px',
          p: 6,
          textAlign: 'center',
          cursor: importing ? 'default' : 'pointer',
          backgroundColor: hovered && !importing ? '#f8f9fa' : 'transparent',
          transition: 'all 0.2s ease',
          mb: 3,
        }}
      >
        <CloudUploadIcon sx={{ fontSize: 64, color: '#1a73e8', mb: 2 }} />
        <Typography variant="h6" fontWeight={600} sx={{ color: '#202124', mb: 0.5 }}>
          Select & Import Spreadsheet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
          Import your family expense spreadsheet (.xlsx). The app will parse, validate, and normalize all transactions.
          Re-importing will update existing imported records while preserving manually added expenses.
        </Typography>

        {importing && (
          <LinearProgress
            sx={{
              mt: 3,
              mx: 'auto',
              maxWidth: 400,
              borderRadius: '4px',
              height: 6,
              backgroundColor: '#e8eaed',
              '& .MuiLinearProgress-bar': {
                borderRadius: '4px',
              },
            }}
          />
        )}
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3, borderRadius: '12px' }}>
          {error}
        </Alert>
      )}

      {/* Import Summary */}
      {summary && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2.5, color: '#202124' }}>
              Import Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatBox label="Total Rows" value={summary.total_rows} bg="#e8f0fe" color="#1a73e8" />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatBox label="Imported" value={summary.imported_rows} bg="#e6f4ea" color="#34a853" />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatBox label="Updated" value={summary.updated_rows} bg="#e8f0fe" color="#1a73e8" />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatBox label="Errors" value={summary.error_rows} bg="#fce8e6" color="#ea4335" />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatBox label="Warnings" value={summary.warning_rows} bg="#fef7e0" color="#f9ab00" />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatBox label="Merchants" value={summary.merchants_imported} bg="#e8f0fe" color="#1a73e8" />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatBox label="Categories" value={summary.categories_imported} bg="#e8f0fe" color="#1a73e8" />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatBox label="Quality Issues" value={summary.quality_issues_imported} bg="#fef7e0" color="#f9ab00" />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Import History */}
      {history.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: '#202124' }}>
              Import History
            </Typography>
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
                    <TableRow
                      key={batch.id}
                      sx={{
                        '&:hover': { backgroundColor: '#f8f9fa' },
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <TableCell sx={{ whiteSpace: 'nowrap', color: '#202124' }}>
                        {new Date(batch.imported_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </TableCell>
                      <TableCell sx={{ color: '#3c4043' }}>{batch.filename}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>{batch.total_rows}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: '#34a853' }}>{batch.imported_rows}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: batch.error_rows ? '#ea4335' : '#5f6368' }}>{batch.error_rows}</TableCell>
                      <TableCell>
                        <Chip
                          label={batch.status}
                          size="small"
                          variant={batch.status === 'completed' ? 'filled' : 'outlined'}
                          sx={
                            batch.status === 'completed'
                              ? { backgroundColor: '#e6f4ea', color: '#34a853', fontWeight: 500 }
                              : { borderColor: '#f9ab00', color: '#f9ab00', fontWeight: 500 }
                          }
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

      {/* Data Quality Issues */}
      {qualityIssues && qualityIssues.total > 0 && (
        <Card>
          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5, color: '#202124' }}>
              Data Quality Issues
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {qualityIssues.total} transaction{qualityIssues.total !== 1 ? 's' : ''} need review. Click a category to re-categorize.
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
                    <TableRow
                      key={issue.id}
                      sx={{
                        '&:hover': { backgroundColor: '#f8f9fa' },
                        transition: 'background-color 0.15s ease',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        if (issue.data_quality_status === 'flagged') {
                          const newCat = prompt('Enter new category:', issue.category);
                          if (newCat) handleResolveIssue(issue.id, newCat);
                        }
                      }}
                    >
                      <TableCell sx={{ whiteSpace: 'nowrap', color: '#202124' }}>
                        {issue.transaction_date}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#3c4043' }}>
                        {issue.raw_description || '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: '#ea4335', whiteSpace: 'nowrap' }}>
                        ${issue.amount.toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ color: '#5f6368', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {issue.data_quality_issue || '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={issue.data_quality_status}
                          size="small"
                          sx={
                            issue.data_quality_status === 'flagged'
                              ? { backgroundColor: '#fef7e0', color: '#f9ab00', fontWeight: 500 }
                              : { backgroundColor: '#e6f4ea', color: '#34a853', fontWeight: 500 }
                          }
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
