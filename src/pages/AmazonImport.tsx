import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Checkbox, Alert, CircularProgress, LinearProgress, Snackbar,
  Select, MenuItem, FormControl, Divider,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  ShoppingCart as CartIcon,
  Email as EmailIcon,
  OpenInNew as OpenInNewIcon,
  CheckCircle as CheckCircleIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { open as dialogOpen } from '@tauri-apps/plugin-dialog';
import { open as shellOpen } from '@tauri-apps/plugin-shell';
import { readTextFile } from '@tauri-apps/plugin-fs';
import * as api from '../services/api';
import * as amazon from '../services/amazon';
import * as gmail from '../services/gmail';
import type { ExtractedAmazonOrder } from '../services/amazon';

const EXPENSE_CATEGORIES = [
  'Food', 'Transportation', 'Car', 'Home', 'Utilities', 'Miscellaneous',
  'Education', 'Health & Life', 'Entertainment', 'Travel', 'Gifts',
  'India', 'General Expenses',
];

export default function AmazonImport() {
  const [orders, setOrders] = useState<ExtractedAmazonOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [gmailConnected, setGmailConnected] = useState(false);
  const [importedStats, setImportedStats] = useState<{ count: number; total: number; dateRange: string } | null>(null);

  useEffect(() => {
    api.getSettings().then(settings => {
      if (settings['gmail_access_token']) setGmailConnected(true);
    }).catch(console.error);
  }, []);

  const handleCSVImport = async () => {
    try {
      const filePath = await dialogOpen({
        title: 'Select Amazon Order History CSV',
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
        multiple: false,
      });

      if (!filePath) return;

      setLoading(true);
      setError(null);

      const csvContent = await readTextFile(filePath as string);
      const parsed = amazon.parseAmazonCSV(csvContent);

      if (parsed.length === 0) {
        setError('No valid orders found in the CSV. Please check the file format.');
      } else {
        setOrders(parsed);
        setSnackMsg(`Found ${parsed.length} orders in CSV`);
        setSnackOpen(true);
      }
    } catch (err) {
      setError(`Failed to read CSV: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGmailScan = async () => {
    setLoading(true);
    setError(null);

    try {
      const settings = await api.getSettings();
      const token = settings['gmail_access_token'];
      if (!token) {
        setError('Gmail not connected. Go to Gmail Import page to connect first.');
        return;
      }

      const emailOrders = await gmail.fetchRecentOrders(token, 100);
      // Filter to Amazon-only emails
      const amazonEmails = emailOrders.filter(o =>
        o.merchant.toLowerCase().includes('amazon') ||
        o.from.toLowerCase().includes('amazon')
      );

      if (amazonEmails.length === 0) {
        setSnackMsg('No Amazon order emails found in the last 30 days');
        setSnackOpen(true);
        return;
      }

      // Convert gmail orders to amazon order format
      const converted: ExtractedAmazonOrder[] = amazonEmails.map(e => ({
        id: e.id,
        orderDate: e.date,
        title: e.subject,
        amount: e.amount || 0,
        category: e.category,
        subcategory: 'Amazon Purchase',
        quantity: 1,
        asin: '',
        paymentMethod: '',
        selected: e.amount !== null && e.amount > 0,
      }));

      setOrders(converted);
      setSnackMsg(`Found ${converted.length} Amazon orders from Gmail`);
      setSnackOpen(true);
    } catch (err) {
      const errStr = String(err);
      if (errStr.includes('401')) {
        setError('Gmail session expired. Reconnect on the Gmail Import page.');
      } else {
        setError(`Gmail scan failed: ${err}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleOrder = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, selected: !o.selected } : o));
  };

  const toggleAll = () => {
    const allSelected = orders.every(o => o.selected);
    setOrders(prev => prev.map(o => ({ ...o, selected: !allSelected })));
  };

  const updateCategory = (id: string, category: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, category } : o));
  };

  const handleImport = async () => {
    const selected = orders.filter(o => o.selected && o.amount > 0);
    if (selected.length === 0) return;

    setImporting(true);
    setImportCount(0);

    try {
      const transactions = amazon.amazonOrdersToTransactions(selected);
      for (const txn of transactions) {
        await api.addTransaction(txn);
        setImportCount(prev => prev + 1);
      }

      const total = selected.reduce((s, o) => s + o.amount, 0);
      const dates = selected.map(o => o.orderDate).sort();
      setImportedStats({
        count: selected.length,
        total,
        dateRange: dates.length > 1 ? `${dates[0]} — ${dates[dates.length - 1]}` : dates[0] || '',
      });

      setSnackMsg(`Imported ${selected.length} Amazon orders ($${total.toLocaleString(undefined, { minimumFractionDigits: 2 })})`);
      setSnackOpen(true);

      // Remove imported from list
      const importedIds = new Set(selected.map(o => o.id));
      setOrders(prev => prev.filter(o => !importedIds.has(o.id)));
    } catch (err) {
      setError(`Import failed: ${err}`);
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = orders.filter(o => o.selected).length;
  const selectedTotal = orders.filter(o => o.selected).reduce((s, o) => s + o.amount, 0);

  // Count categories in selected orders
  const categoryCounts: Record<string, number> = {};
  orders.filter(o => o.selected).forEach(o => {
    categoryCounts[o.category] = (categoryCounts[o.category] || 0) + 1;
  });

  return (
    <Box>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3, borderRadius: '12px' }}>
          {error}
        </Alert>
      )}

      {/* Hero Card */}
      <Card sx={{ mb: 3, borderTop: '4px solid #ff9900', overflow: 'visible' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <CartIcon sx={{ color: '#ff9900', fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight={700} color="#232f3e">
                Amazon Orders
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Import your Amazon purchase history to track and categorize spending
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* CSV Import */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                variant="outlined"
                sx={{
                  p: 2.5,
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderStyle: 'dashed',
                  borderColor: '#ff9900',
                  borderWidth: 2,
                  '&:hover': { backgroundColor: '#fff8ef', borderStyle: 'solid' },
                  transition: 'all 0.2s ease',
                }}
                onClick={handleCSVImport}
              >
                <UploadIcon sx={{ fontSize: 40, color: '#ff9900', mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Import CSV File
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Upload your Amazon Order History Report
                </Typography>
              </Card>
            </Grid>

            {/* Gmail Scan */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                variant="outlined"
                sx={{
                  p: 2.5,
                  textAlign: 'center',
                  cursor: gmailConnected ? 'pointer' : 'default',
                  borderColor: gmailConnected ? '#1a73e8' : '#dadce0',
                  opacity: gmailConnected ? 1 : 0.5,
                  '&:hover': gmailConnected ? { backgroundColor: '#e8f0fe' } : {},
                  transition: 'all 0.2s ease',
                }}
                onClick={gmailConnected ? handleGmailScan : undefined}
              >
                <EmailIcon sx={{ fontSize: 40, color: gmailConnected ? '#1a73e8' : '#dadce0', mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Scan Gmail
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {gmailConnected ? 'Find Amazon emails from last 30 days' : 'Connect Gmail first (Gmail Import page)'}
                </Typography>
              </Card>
            </Grid>

            {/* Open Amazon */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                variant="outlined"
                sx={{
                  p: 2.5,
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#f8f9fa' },
                  transition: 'all 0.2s ease',
                }}
                onClick={() => shellOpen('https://www.amazon.com/gp/privacycentral/dsar/preview.html')}
              >
                <OpenInNewIcon sx={{ fontSize: 40, color: '#ff9900', mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Request Data from Amazon
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Download your full order history
                </Typography>
              </Card>
            </Grid>
          </Grid>

          {/* How to get CSV instructions */}
          <Card variant="outlined" sx={{ mt: 2, backgroundColor: '#fffbf0', borderColor: '#ffe0b2' }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, color: '#e65100' }}>
                How to get your Amazon order CSV
              </Typography>
              <Typography variant="body2" color="text.secondary" component="div">
                <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2 }}>
                  <li>
                    Click <strong>"Request Data from Amazon"</strong> above — this opens Amazon's{' '}
                    <strong>Request My Data</strong> page
                  </li>
                  <li>Select <strong>"Your Orders"</strong> and submit the request</li>
                  <li>Amazon will email you a download link (usually within minutes)</li>
                  <li>Download and unzip the file — look for <strong>Retail.OrderHistory.csv</strong></li>
                  <li>Click <strong>"Import CSV File"</strong> above and select that CSV</li>
                </ol>
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary">
                <strong>Tip:</strong> You can also view your orders at{' '}
                <Button
                  size="small"
                  sx={{ textTransform: 'none', p: 0, minWidth: 0, color: '#ff9900', fontWeight: 600 }}
                  onClick={(e) => { e.stopPropagation(); shellOpen('https://www.amazon.com/gp/your-account/order-history'); }}
                >
                  amazon.com/your-orders
                </Button>
              </Typography>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress sx={{ color: '#ff9900' }} />
        </Box>
      )}

      {/* Import Progress */}
      {importing && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary" mb={1}>
              Importing orders... {importCount} of {selectedCount}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={(importCount / Math.max(selectedCount, 1)) * 100}
              sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { backgroundColor: '#ff9900' } }}
            />
          </CardContent>
        </Card>
      )}

      {/* Import Success Stats */}
      {importedStats && (
        <Card sx={{ mb: 3, backgroundColor: '#f0faf0', border: '1px solid #34a853' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <CheckCircleIcon sx={{ color: '#34a853' }} />
              <Typography variant="h6" fontWeight={600} color="#34a853">
                Import Complete
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid size={{ xs: 4 }}>
                <Box textAlign="center">
                  <CartIcon sx={{ color: '#ff9900', fontSize: 28 }} />
                  <Typography variant="h5" fontWeight={700}>{importedStats.count}</Typography>
                  <Typography variant="caption" color="text.secondary">Orders</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Box textAlign="center">
                  <MoneyIcon sx={{ color: '#ea4335', fontSize: 28 }} />
                  <Typography variant="h5" fontWeight={700}>${importedStats.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Typography>
                  <Typography variant="caption" color="text.secondary">Total</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Box textAlign="center">
                  <CalendarIcon sx={{ color: '#1a73e8', fontSize: 28 }} />
                  <Typography variant="body2" fontWeight={600}>{importedStats.dateRange}</Typography>
                  <Typography variant="caption" color="text.secondary">Date Range</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      {orders.length > 0 && !loading && (
        <Card>
          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Amazon Orders ({orders.length})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Review categories and select orders to import
                </Typography>
              </Box>
              <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                {selectedCount > 0 && (
                  <Chip
                    label={`${selectedCount} selected · $${selectedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    sx={{ backgroundColor: '#fff3e0', color: '#e65100', fontWeight: 600 }}
                  />
                )}
                {Object.entries(categoryCounts).slice(0, 3).map(([cat, cnt]) => (
                  <Chip key={cat} label={`${cat}: ${cnt}`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                ))}
                <Button
                  variant="contained"
                  startIcon={<CartIcon />}
                  onClick={handleImport}
                  disabled={selectedCount === 0 || importing}
                  sx={{ backgroundColor: '#ff9900', '&:hover': { backgroundColor: '#e68a00' } }}
                >
                  Import Selected ({selectedCount})
                </Button>
              </Box>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={orders.length > 0 && orders.every(o => o.selected)}
                        indeterminate={orders.some(o => o.selected) && !orders.every(o => o.selected)}
                        onChange={toggleAll}
                        sx={{ '&.Mui-checked': { color: '#ff9900' } }}
                      />
                    </TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow
                      key={order.id}
                      hover
                      onClick={() => toggleOrder(order.id)}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor: order.selected ? 'rgba(255, 153, 0, 0.04)' : undefined,
                      }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={order.selected}
                          sx={{ '&.Mui-checked': { color: '#ff9900' } }}
                        />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                        {order.orderDate}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.85rem' }}>
                          {order.title}
                        </Typography>
                        {order.subcategory && order.subcategory !== 'Amazon Purchase' && (
                          <Typography variant="caption" color="text.secondary">
                            {order.subcategory}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                          <Select
                            value={order.category}
                            onChange={(e) => updateCategory(order.id, e.target.value)}
                            sx={{ fontSize: '0.8rem', borderRadius: '8px', height: 32 }}
                          >
                            {EXPENSE_CATEGORIES.map(c => (
                              <MenuItem key={c} value={c} sx={{ fontSize: '0.85rem' }}>{c}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: '#ea4335', whiteSpace: 'nowrap' }}>
                        ${order.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && orders.length === 0 && !importedStats && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CartIcon sx={{ fontSize: 64, color: '#dadce0', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Orders Loaded
            </Typography>
            <Typography color="text.secondary" mb={3} maxWidth={400} mx="auto">
              Upload an Amazon Order History CSV, scan your Gmail for Amazon receipts, or download your order report from Amazon.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              onClick={() => shellOpen('https://www.amazon.com/gp/privacycentral/dsar/preview.html')}
              sx={{ color: '#ff9900', borderColor: '#ff9900' }}
            >
              Request Your Order History from Amazon
            </Button>
          </CardContent>
        </Card>
      )}

      <Snackbar
        open={snackOpen}
        autoHideDuration={4000}
        onClose={() => setSnackOpen(false)}
        message={snackMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
