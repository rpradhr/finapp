import { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, Grid, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Pagination, Chip, CircularProgress, Alert,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useExpenseStore } from '../stores/expenseStore';
import type { NewTransaction, UpdateTransaction, Transaction } from '../types';

const CATEGORIES = [
  'Food', 'Transportation', 'Car', 'Home', 'Utilities', 'Miscellaneous',
  'Education', 'Health & Life', 'Entertainment', 'Travel', 'Gifts',
  'India', 'General Expenses', 'Income', 'Uncategorized',
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

export default function Transactions() {
  const { transactions, filters, loading, error, setFilters, fetchTransactions, addExpense, updateExpense, deleteExpense, clearError } = useExpenseStore();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);
  const [form, setForm] = useState<Partial<NewTransaction>>({
    transaction_date: new Date().toISOString().split('T')[0],
    category: '',
    amount: 0,
  });
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

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

  return (
    <Box>
      {error && <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filters */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Search"
                size="small"
                fullWidth
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search description, merchant..."
              />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category || ''}
                  label="Category"
                  onChange={(e) => handleCategoryFilter(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
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
              />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)} fullWidth>
                Add Expense
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
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
                    {transactions?.data.map((txn) => (
                      <TableRow key={txn.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{txn.transaction_date}</TableCell>
                        <TableCell>
                          <Chip label={txn.category} size="small" />
                          {txn.subcategory && <Typography variant="caption" display="block" color="text.secondary">{txn.subcategory}</Typography>}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {txn.raw_description || '-'}
                        </TableCell>
                        <TableCell>{txn.std_merchant || '-'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(txn.amount)}</TableCell>
                        <TableCell>
                          <Chip label={txn.source} size="small" variant="outlined" color={txn.source === 'manual' ? 'primary' : 'default'} />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => openEdit(txn)}><EditIcon fontSize="small" /></IconButton>
                          <IconButton size="small" onClick={() => handleDelete(txn.id)} color="error"><DeleteIcon fontSize="small" /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!transactions || transactions.data.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">No transactions found</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {transactions && transactions.total_pages > 1 && (
                <Box display="flex" justifyContent="center" p={2}>
                  <Pagination
                    count={transactions.total_pages}
                    page={transactions.page}
                    onChange={handlePageChange}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Expense</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={6}>
              <TextField label="Date" type="date" fullWidth value={form.transaction_date || ''} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={6}>
              <TextField label="Amount" type="number" fullWidth value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select value={form.category || ''} label="Category" onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}>
              <TextField label="Subcategory" fullWidth value={form.subcategory || ''} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} />
            </Grid>
            <Grid size={6}>
              <TextField label="Description" fullWidth value={form.raw_description || ''} onChange={(e) => setForm({ ...form, raw_description: e.target.value })} />
            </Grid>
            <Grid size={6}>
              <TextField label="Merchant" fullWidth value={form.std_merchant || ''} onChange={(e) => setForm({ ...form, std_merchant: e.target.value })} />
            </Grid>
            <Grid size={12}>
              <TextField label="Notes" fullWidth multiline rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={!form.amount || !form.category}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Expense</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={6}>
              <TextField label="Date" type="date" fullWidth value={form.transaction_date || ''} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={6}>
              <TextField label="Amount" type="number" fullWidth value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select value={form.category || ''} label="Category" onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}>
              <TextField label="Description" fullWidth value={form.raw_description || ''} onChange={(e) => setForm({ ...form, raw_description: e.target.value })} />
            </Grid>
            <Grid size={6}>
              <TextField label="Merchant" fullWidth value={form.std_merchant || ''} onChange={(e) => setForm({ ...form, std_merchant: e.target.value })} />
            </Grid>
            <Grid size={6}>
              <TextField label="Notes" fullWidth value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEdit}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
