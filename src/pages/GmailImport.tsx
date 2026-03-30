import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Grid, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Checkbox, Alert, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, LinearProgress, Snackbar, Link,
} from '@mui/material';
import {
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  CloudDownload as CloudDownloadIcon,
  ShoppingCart as ShoppingCartIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { open as shellOpen } from '@tauri-apps/plugin-shell';
import * as api from '../services/api';
import * as gmail from '../services/gmail';
import type { ExtractedOrder } from '../services/gmail';

export default function GmailImport() {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [orders, setOrders] = useState<ExtractedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [importCount, setImportCount] = useState(0);

  useEffect(() => {
    api.getSettings().then(settings => {
      if (settings['gmail_client_id']) setClientId(settings['gmail_client_id']);
      if (settings['gmail_client_secret']) setClientSecret(settings['gmail_client_secret']);
      if (settings['gmail_access_token']) {
        setAccessToken(settings['gmail_access_token']);
        setConnected(true);
      }
    }).catch(console.error);
  }, []);

  const openExternalUrl = async (url: string) => {
    try {
      await shellOpen(url);
    } catch (err) {
      console.error('Failed to open URL:', err);
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        setSnackMsg('URL copied to clipboard — paste it in your browser');
        setSnackOpen(true);
      } catch {
        setError(`Could not open browser. Please visit: ${url}`);
      }
    }
  };

  const handleConnect = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      setError('Please enter both your Client ID and Client Secret');
      return;
    }
    // Save credentials
    api.updateSetting('gmail_client_id', clientId).catch(console.error);
    api.updateSetting('gmail_client_secret', clientSecret).catch(console.error);

    // Build auth URL and open in system browser
    const authUrl = await gmail.getAuthUrl(clientId);
    await openExternalUrl(authUrl);
    setAuthDialogOpen(true);
  };

  const handleAuthCodeSubmit = async () => {
    if (!authCode.trim()) return;
    setLoading(true);
    setError(null);

    // The user may paste the full redirect URL or just the code
    let code = authCode.trim();
    // If they pasted the full URL like http://127.0.0.1/?code=4/xxx&scope=...
    if (code.includes('code=')) {
      try {
        const url = new URL(code);
        code = url.searchParams.get('code') || code;
      } catch {
        // If it starts with code= but isn't a valid URL, extract manually
        const match = code.match(/code=([^&]+)/);
        if (match) code = decodeURIComponent(match[1]);
      }
    }

    try {
      const tokenData = await gmail.exchangeCodeForToken(clientId, clientSecret, code);
      setAccessToken(tokenData.access_token);
      setConnected(true);
      setAuthDialogOpen(false);
      setAuthCode('');

      await api.updateSetting('gmail_access_token', tokenData.access_token);
      if (tokenData.refresh_token) {
        await api.updateSetting('gmail_refresh_token', tokenData.refresh_token);
      }

      setSnackMsg('Gmail connected successfully!');
      setSnackOpen(true);
    } catch (err) {
      setError(`Authentication failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setAccessToken(null);
    setConnected(false);
    setOrders([]);
    await api.updateSetting('gmail_access_token', '');
    await api.updateSetting('gmail_refresh_token', '');
    setSnackMsg('Gmail disconnected');
    setSnackOpen(true);
  };

  const handleFetchOrders = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      const fetchedOrders = await gmail.fetchRecentOrders(accessToken);
      setOrders(fetchedOrders);

      if (fetchedOrders.length === 0) {
        setSnackMsg('No order emails found in the last 4 weeks');
        setSnackOpen(true);
      }
    } catch (err) {
      const errStr = String(err);
      if (errStr.includes('401') || errStr.includes('Unauthorized')) {
        setError('Gmail session expired. Please reconnect.');
        setConnected(false);
        setAccessToken(null);
      } else {
        setError(`Failed to fetch orders: ${err}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderSelection = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, selected: !o.selected } : o));
  };

  const toggleAllOrders = () => {
    const allSelected = orders.every(o => o.selected);
    setOrders(prev => prev.map(o => ({ ...o, selected: !allSelected })));
  };

  const handleImportSelected = async () => {
    const selected = orders.filter(o => o.selected && o.amount !== null);
    if (selected.length === 0) return;

    setImporting(true);
    setImportCount(0);

    try {
      const transactions = gmail.ordersToTransactions(selected);
      for (const txn of transactions) {
        await api.addTransaction(txn);
        setImportCount(prev => prev + 1);
      }

      setSnackMsg(`Successfully imported ${transactions.length} transactions from Gmail`);
      setSnackOpen(true);

      const importedIds = new Set(selected.map(o => o.id));
      setOrders(prev => prev.filter(o => !importedIds.has(o.id)));
    } catch (err) {
      setError(`Import failed: ${err}`);
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = orders.filter(o => o.selected && o.amount !== null).length;
  const selectedTotal = orders
    .filter(o => o.selected && o.amount !== null)
    .reduce((sum, o) => sum + (o.amount || 0), 0);

  return (
    <Box>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3, borderRadius: '12px' }}>
          {error}
        </Alert>
      )}

      {/* Connection Card */}
      <Card sx={{ mb: 3, borderTop: connected ? '4px solid #34a853' : '4px solid #1a73e8' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <EmailIcon sx={{ color: connected ? '#34a853' : '#1a73e8', fontSize: 28 }} />
            <Box flex={1}>
              <Typography variant="h6" fontWeight={600}>
                Gmail Connection
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Connect your Gmail to automatically extract orders and purchases from email receipts
              </Typography>
            </Box>
            {connected ? (
              <Chip
                icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                label="Connected"
                sx={{ backgroundColor: '#e6f4ea', color: '#34a853', fontWeight: 600 }}
              />
            ) : (
              <Chip
                label="Not Connected"
                variant="outlined"
                sx={{ borderColor: '#dadce0', color: '#5f6368' }}
              />
            )}
          </Box>

          {!connected && (
            <Box>
              {/* Setup Instructions */}
              <Card variant="outlined" sx={{ mb: 3, backgroundColor: '#f8f9fa', borderColor: '#e8eaed' }}>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, color: '#202124' }}>
                    Setup Instructions
                  </Typography>
                  <Typography variant="body2" color="text.secondary" component="div">
                    <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2 }}>
                      <li>
                        Go to{' '}
                        <Link
                          component="button"
                          variant="body2"
                          sx={{ color: '#1a73e8', fontWeight: 500, verticalAlign: 'baseline' }}
                          onClick={() => openExternalUrl('https://console.cloud.google.com/apis/credentials')}
                        >
                          Google Cloud Console → Credentials <OpenInNewIcon sx={{ fontSize: 12, ml: 0.25 }} />
                        </Link>
                      </li>
                      <li>Create a new project (or select existing one)</li>
                      <li>
                        Enable the{' '}
                        <Link
                          component="button"
                          variant="body2"
                          sx={{ color: '#1a73e8', fontWeight: 500, verticalAlign: 'baseline' }}
                          onClick={() => openExternalUrl('https://console.cloud.google.com/apis/library/gmail.googleapis.com')}
                        >
                          Gmail API <OpenInNewIcon sx={{ fontSize: 12, ml: 0.25 }} />
                        </Link>
                      </li>
                      <li>Go to <strong>Credentials → Create Credentials → OAuth Client ID</strong></li>
                      <li>Application type: <strong>Desktop app</strong></li>
                      <li>Copy both the <strong>Client ID</strong> and <strong>Client Secret</strong> and paste them below</li>
                      <li>Under <strong>OAuth consent screen</strong>, add your email as a test user</li>
                    </ol>
                  </Typography>
                </CardContent>
              </Card>

              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Client ID"
                    placeholder="xxxxxxxxxxxx-xxxxxxxx.apps.googleusercontent.com"
                    fullWidth
                    size="small"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Client Secret"
                    placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxx"
                    fullWidth
                    size="small"
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Button
                    variant="contained"
                    startIcon={<LinkIcon />}
                    onClick={handleConnect}
                    fullWidth
                    disabled={!clientId.trim() || !clientSecret.trim()}
                  >
                    Connect Gmail
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}

          {connected && (
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                startIcon={<CloudDownloadIcon />}
                onClick={handleFetchOrders}
                disabled={loading}
              >
                {loading ? 'Scanning Emails...' : 'Scan Recent Orders'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<LinkOffIcon />}
                onClick={handleDisconnect}
                sx={{ color: '#ea4335', borderColor: '#ea4335' }}
              >
                Disconnect
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Import Progress */}
      {importing && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary" mb={1}>
              Importing transactions... {importCount} of {selectedCount}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={(importCount / selectedCount) * 100}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      {orders.length > 0 && !loading && (
        <Card>
          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Extracted Orders ({orders.length})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Review and select orders to import as expenses
                </Typography>
              </Box>
              <Box display="flex" gap={1} alignItems="center">
                {selectedCount > 0 && (
                  <Chip
                    label={`${selectedCount} selected · $${selectedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    sx={{ backgroundColor: '#e8f0fe', color: '#1a73e8', fontWeight: 600 }}
                  />
                )}
                <Button
                  variant="contained"
                  startIcon={<ShoppingCartIcon />}
                  onClick={handleImportSelected}
                  disabled={selectedCount === 0 || importing}
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
                        onChange={toggleAllOrders}
                      />
                    </TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Merchant</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow
                      key={order.id}
                      hover
                      onClick={() => toggleOrderSelection(order.id)}
                      sx={{
                        cursor: 'pointer',
                        opacity: order.amount === null ? 0.5 : 1,
                        backgroundColor: order.selected ? 'rgba(26, 115, 232, 0.04)' : undefined,
                      }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox checked={order.selected} disabled={order.amount === null} />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{order.date}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {order.merchant}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.subject}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={order.category}
                          size="small"
                          sx={{ backgroundColor: '#e8f0fe', color: '#1a73e8', fontWeight: 500, fontSize: '0.75rem' }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: order.amount ? '#ea4335' : '#999' }}>
                        {order.amount !== null ? `$${order.amount.toFixed(2)}` : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Empty state when connected but no orders */}
      {connected && !loading && orders.length === 0 && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <EmailIcon sx={{ fontSize: 64, color: '#dadce0', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Ready to Scan
            </Typography>
            <Typography color="text.secondary" mb={2}>
              Click "Scan Recent Orders" to find order confirmations and receipts in your Gmail.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Auth Code Dialog */}
      <Dialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>Complete Gmail Sign-In</Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, borderRadius: '12px' }}>
            A Google sign-in page has opened in your browser.
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>Steps:</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div" sx={{ mb: 2 }}>
            <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2 }}>
              <li>Sign in with your Google account in the browser</li>
              <li>Click <strong>"Allow"</strong> to grant read-only email access</li>
              <li>You'll be redirected to a page that won't load (that's OK!)</li>
              <li>Copy the <strong>entire URL</strong> from your browser's address bar</li>
              <li>Paste it below — the auth code will be extracted automatically</li>
            </ol>
          </Typography>
          <TextField
            label="Paste the URL or authorization code"
            fullWidth
            multiline
            rows={2}
            value={authCode}
            onChange={(e) => setAuthCode(e.target.value)}
            placeholder="http://127.0.0.1/?code=4/0Axx... OR just the code"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setAuthDialogOpen(false)} sx={{ color: '#5f6368' }}>Cancel</Button>
          <Button variant="contained" onClick={handleAuthCodeSubmit} disabled={!authCode.trim() || loading}>
            {loading ? <CircularProgress size={20} /> : 'Connect'}
          </Button>
        </DialogActions>
      </Dialog>

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
