import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, Grid, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Pagination, Chip, CircularProgress, Alert, Tooltip, Divider,
  InputAdornment, Snackbar,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Search as SearchIcon, Receipt as ReceiptIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
import { parseIntent } from '../services/nlp';
import type { ParsedIntent } from '../types';
import { useExpenseStore } from '../stores/expenseStore';
import { getCategoryColor } from '../theme';
import type { NewTransaction, UpdateTransaction, Transaction } from '../types';

const CATEGORIES = [
  'Food', 'Transportation', 'Car', 'Home', 'Utilities', 'Miscellaneous',
  'Education', 'Health & Life', 'Entertainment', 'Travel', 'Gifts',
  'India', 'General Expenses', 'Income', 'Uncategorized',
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function Transactions() {
  const { transactions, filters, loading, error, setFilters, fetchTransactions, addExpense, updateExpense, deleteExpense, clearError } = useExpenseStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);
  const [form, setForm] = useState<Partial<NewTransaction>>({
    transaction_date: new Date().toISOString().split('T')[0],
    category: '',
    amount: 0,
  });
  const [searchInput, setSearchInput] = useState('');
  const [nlInput, setNlInput] = useState('');
  const [parsedPreview, setParsedPreview] = useState<ParsedIntent | null>(null);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const urlFilterApplied = useRef(false);

  // Apply URL query parameters as filters on mount
  useEffect(() => {
    if (urlFilterApplied.current) return;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const merchant = searchParams.get('merchant');
    const category = searchParams.get('category');
    if (dateFrom || dateTo || merchant || category) {
      const newFilters: Record<string, string | undefined> = { page: undefined };
      if (dateFrom) newFilters.date_from = dateFrom;
      if (dateTo) newFilters.date_to = dateTo;
      if (merchant) { newFilters.search = merchant; setSearchInput(merchant); }
      if (category) newFilters.category = category;
      setFilters(newFilters as any);
      setSearchParams({}, { replace: true });
      urlFilterApplied.current = true;
    }
  }, [searchParams]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleNlParse = () => {
    if (!nlInput.trim()) { setParsedPreview(null); return; }
    const intent = parseIntent(nlInput);
    if (intent.type === 'add') {
      setParsedPreview(intent);
    } else {
      // Try to parse as add anyway
      setParsedPreview({ ...intent, type: 'add' });
    }
  };

  const handleNlAdd = async () => {
    if (!parsedPreview?.amount || !parsedPreview?.category) return;
    try {
      await addExpense({
        transaction_date: parsedPreview.date || new Date().toISOString().split('T')[0],
        category: parsedPreview.category,
        amount: parsedPreview.amount,
        std_merchant: parsedPreview.merchant,
        raw_description: parsedPreview.description,
      });
      setSnackMsg(`Added $${parsedPreview.amount.toFixed(2)} for ${parsedPreview.category}`);
      setSnackOpen(true);
      setNlInput('');
      setParsedPreview(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = useCallback(() => {
    setFilters({ search: searchInput || undefined, page: 1 });
    fetchTransactions();
  }, [searchInput, setFilters, fetchTransactions]);

  const handlePageChange = (_: unknown, page: number) => {
    setFilters({ page });
    fetchTransactions();
  };

  const handleCategoryFilter = (category: string) => {
    setFilters({ category: category || undefined, page: 1 });
    fetchTransactions();
  };

  const handleAdd = async () => {
    if (!form.amount || !form.category || !form.transaction_date) return;
    try {
      await addExpense(form as NewTransaction);
      setAddOpen(false);
      setForm({ transaction_date: new Date().toISOString().split('T')[0], category: '', amount: 0 });
    } catch (err) {
      console.error('Failed to add expense:', err);
    }
  };

  const handleEdit = async () => {
    if (!editTxn) return;
    const updates: UpdateTransaction = {};
    if (form.category) updates.category = form.category;
    if (form.amount) updates.amount = form.amount;
    if (form.transaction_date) updates.transaction_date = form.transaction_date;
    if (form.raw_description !== undefined) updates.raw_description = form.raw_description;
    if (form.std_merchant !== undefined) updates.std_merchant = form.std_merchant;
    if (form.notes !== undefined) updates.notes = form.notes;
    try {
      await updateExpense(editTxn.id, updates);
      setEditOpen(false);
      setEditTxn(null);
    } catch (err) {
      console.error('Failed to update expense:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this expense?')) {
      await deleteExpense(id);
    }
  };

  const openEdit = (txn: Transaction) => {
    setEditTxn(txn);
    setForm({
      transaction_date: txn.transaction_date,
      category: txn.category,
      amount: txn.amount,
      raw_description: txn.raw_description || '',
      std_merchant: txn.std_merchant || '',
      notes: txn.notes || '',
    });
    setEditOpen(true);
  };

  const resetAndOpenAdd = () => {
    setForm({
      transaction_date: new Date().toISOString().split('T')[0],
      category: '',
      amount: 0,
      subcategory: '',
      raw_description: '',
      std_merchant: '',
      notes: '',
    });
    setAddOpen(true);
  };

  const dialogFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
    },
  };

  const renderTransactionDialog = (
    open: boolean,
    onClose: () => void,
    title: string,
    onSubmit: () => void,
    submitLabel: string,
    submitDisabled?: boolean,
  ) => (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={600}>{title}</Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: '16px !important' }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
          Basic Information
        </Typography>
        <Grid container spacing={2}>
          <Grid size={6}>
            <TextField
              label="Date"
              type="date"
              fullWidth
              value={form.transaction_date || ''}
              onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={dialogFieldSx}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              label="Amount"
              type="number"
              fullWidth
              value={form.amount || ''}
              onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
              sx={dialogFieldSx}
            />
          </Grid>
          <Grid size={6}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={form.category || ''}
                label="Category"
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                sx={{ borderRadius: '12px' }}
              >
                {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={6}>
            <TextField
              label="Subcategory"
              fullWidth
              value={form.subcategory || ''}
              onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
              sx={dialogFieldSx}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
          Details
        </Typography>
        <Grid container spacing={2}>
          <Grid size={6}>
            <TextField
              label="Description"
              fullWidth
              value={form.raw_description || ''}
              onChange={(e) => setForm({ ...form, raw_description: e.target.value })}
              sx={dialogFieldSx}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              label="Merchant"
              fullWidth
              value={form.std_merchant || ''}
              onChange={(e) => setForm({ ...form, std_merchant: e.target.value })}
              sx={dialogFieldSx}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              label="Notes"
              fullWidth
              multiline
              rows={2}
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              sx={dialogFieldSx}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} sx={{ color: '#5f6368' }}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit} disabled={submitDisabled}>
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      {error && <Alert severity="error" onClose={clearError} sx={{ mb: 2, borderRadius: '12px' }}>{error}</Alert>}

      {/* Quick Add via Natural Language */}
      <Card sx={{ mb: 3, overflow: 'visible' }}>
        <CardContent sx={{ py: 2 }}>
          <Box display="flex" gap={1} alignItems="center">
            <AutoAwesomeIcon sx={{ color: '#1a73e8', fontSize: 20 }} />
            <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
              Quick Add
            </Typography>
          </Box>
          <TextField
            placeholder='Type naturally: "spent $50 on groceries at Wegmans" or "add $120 for electricity"'
            size="small"
            fullWidth
            value={nlInput}
            onChange={(e) => setNlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleNlParse(); }}
            onBlur={handleNlParse}
            sx={{
              mt: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                backgroundColor: '#f8f9fa',
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <EditIcon sx={{ color: '#5f6368', fontSize: 18 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          {parsedPreview && parsedPreview.amount && (
            <Box sx={{ mt: 2, p: 2, borderRadius: 3, backgroundColor: '#f8f9fa', border: '1px solid #e8eaed' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 3 }}>
                  <Typography variant="h5" fontWeight={700} color="#ea4335">
                    ${parsedPreview.amount.toFixed(2)}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <Chip label={parsedPreview.category || 'Unknown'} sx={{ backgroundColor: '#e8f0fe', color: '#1a73e8', fontWeight: 600 }} />
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    {parsedPreview.merchant || 'No merchant'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <Button variant="contained" size="small" onClick={handleNlAdd} disabled={!parsedPreview.category}>
                    Add Expense
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Filter Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                placeholder="Search description, merchant..."
                size="small"
                fullWidth
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#5f6368', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    backgroundColor: '#f8f9fa',
                    '&:hover': { backgroundColor: '#f1f3f4' },
                    '&.Mui-focused': { backgroundColor: '#fff' },
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category || ''}
                  label="Category"
                  onChange={(e) => handleCategoryFilter(e.target.value)}
                  sx={{ borderRadius: '12px' }}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <TextField
                label="From"
                type="date"
                size="small"
                fullWidth
                value={filters.date_from || ''}
                onChange={(e) => { setFilters({ date_from: e.target.value || undefined, page: 1 }); fetchTransactions(); }}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <TextField
                label="To"
                type="date"
                size="small"
                fullWidth
                value={filters.date_to || ''}
                onChange={(e) => { setFilters({ date_to: e.target.value || undefined, page: 1 }); fetchTransactions(); }}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={resetAndOpenAdd}
                fullWidth
                sx={{ height: 40 }}
              >
                Add Expense
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Transaction Table */}
      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={6}>
              <CircularProgress size={36} />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Merchant</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Source</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions?.data.map((txn) => {
                      const catColor = getCategoryColor(txn.category);
                      const isInflow = txn.inflow_outflow === 'Inflow' || txn.signed_amount > 0;
                      return (
                        <TableRow
                          key={txn.id}
                          sx={{
                            '&:hover': { backgroundColor: '#f8f9fa' },
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <TableCell sx={{ whiteSpace: 'nowrap', color: '#202124', fontSize: '0.875rem' }}>
                            {formatDate(txn.transaction_date)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={txn.category}
                              size="small"
                              sx={{
                                backgroundColor: `${catColor}26`,
                                color: catColor,
                                fontWeight: 500,
                                fontSize: '0.75rem',
                              }}
                            />
                            {txn.subcategory && (
                              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.25, pl: 0.5 }}>
                                {txn.subcategory}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#3c4043' }}>
                            {txn.raw_description || '-'}
                          </TableCell>
                          <TableCell sx={{ color: '#3c4043' }}>
                            {txn.std_merchant || '-'}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 600,
                              color: isInflow ? '#34a853' : '#ea4335',
                              fontSize: '0.875rem',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {isInflow ? '+' : ''}{formatCurrency(txn.amount)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={txn.source}
                              size="small"
                              variant="outlined"
                              sx={{
                                fontSize: '0.7rem',
                                height: 22,
                                borderColor: '#dadce0',
                                color: '#5f6368',
                              }}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                            <Tooltip title="Edit transaction" arrow>
                              <IconButton size="small" onClick={() => openEdit(txn)} sx={{ color: '#5f6368', '&:hover': { color: '#1a73e8', backgroundColor: '#e8f0fe' } }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete transaction" arrow>
                              <IconButton size="small" onClick={() => handleDelete(txn.id)} sx={{ color: '#5f6368', '&:hover': { color: '#ea4335', backgroundColor: '#fce8e6' } }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(!transactions || transactions.data.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 8, borderBottom: 'none' }}>
                          <ReceiptIcon sx={{ fontSize: 48, color: '#dadce0', mb: 1 }} />
                          <Typography color="text.secondary" fontSize="0.95rem">
                            No transactions found
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Try adjusting your filters or add a new expense
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {transactions && transactions.total_pages > 1 && (
                <Box display="flex" justifyContent="center" py={2.5}>
                  <Pagination
                    count={transactions.total_pages}
                    page={transactions.page}
                    onChange={handlePageChange}
                    color="primary"
                    shape="rounded"
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      {renderTransactionDialog(
        addOpen,
        () => setAddOpen(false),
        'Add Expense',
        handleAdd,
        'Add Expense',
        !form.amount || !form.category,
      )}

      {/* Edit Dialog */}
      {renderTransactionDialog(
        editOpen,
        () => { setEditOpen(false); setEditTxn(null); },
        'Edit Expense',
        handleEdit,
        'Save Changes',
      )}

      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
        message={snackMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
