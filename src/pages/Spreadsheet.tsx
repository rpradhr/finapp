import { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, TextField, InputAdornment, CircularProgress,
  Chip, IconButton, Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  TableChart as TableChartIcon,
  FilterList as FilterListIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import * as api from '../services/api';
import type { Transaction } from '../types';

const COLUMNS = [
  { key: 'row_num', label: '#', width: 50, align: 'center' as const },
  { key: 'transaction_date', label: 'Date', width: 100 },
  { key: 'year', label: 'Year', width: 55, align: 'center' as const },
  { key: 'month_name', label: 'Month', width: 70 },
  { key: 'category', label: 'Category', width: 120 },
  { key: 'subcategory', label: 'Subcategory', width: 120 },
  { key: 'raw_description', label: 'Description', width: 200 },
  { key: 'std_merchant', label: 'Merchant', width: 140 },
  { key: 'amount', label: 'Amount', width: 100, align: 'right' as const, isCurrency: true },
  { key: 'signed_amount', label: 'Signed Amt', width: 100, align: 'right' as const, isCurrency: true },
  { key: 'debit_r', label: 'Debit R', width: 90, align: 'right' as const, isCurrency: true },
  { key: 'debit_s', label: 'Debit S', width: 90, align: 'right' as const, isCurrency: true },
  { key: 'inflow_outflow', label: 'Flow', width: 70, align: 'center' as const },
  { key: 'location', label: 'Location', width: 120 },
  { key: 'payment_method', label: 'Payment', width: 100 },
  { key: 'source', label: 'Source', width: 80 },
  { key: 'tags', label: 'Tags', width: 100 },
  { key: 'notes', label: 'Notes', width: 150 },
];

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

export default function Spreadsheet() {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadAllTransactions();
  }, []);

  const loadAllTransactions = async () => {
    setLoading(true);
    try {
      const allTxns: Transaction[] = [];
      let page = 1;
      const pageSize = 500;
      let hasMore = true;

      while (hasMore) {
        const result = await api.getTransactions({
          page,
          page_size: pageSize,
          sort_by: 'transaction_date',
          sort_dir: 'desc',
        });
        allTxns.push(...result.data);
        setTotalLoaded(allTxns.length);
        setTotalCount(result.total);
        hasMore = page < result.total_pages;
        page++;
      }

      setAllTransactions(allTxns);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    if (!search.trim()) return allTransactions;
    const lower = search.toLowerCase();
    return allTransactions.filter(t =>
      (t.raw_description?.toLowerCase().includes(lower)) ||
      (t.std_merchant?.toLowerCase().includes(lower)) ||
      (t.category.toLowerCase().includes(lower)) ||
      (t.subcategory?.toLowerCase().includes(lower)) ||
      (t.notes?.toLowerCase().includes(lower)) ||
      (t.location?.toLowerCase().includes(lower))
    );
  }, [allTransactions, search]);

  const totals = useMemo(() => {
    const data = filteredTransactions;
    return {
      amount: data.reduce((s, t) => s + t.amount, 0),
      signed_amount: data.reduce((s, t) => s + t.signed_amount, 0),
      debit_r: data.reduce((s, t) => s + (t.debit_r || 0), 0),
      debit_s: data.reduce((s, t) => s + (t.debit_s || 0), 0),
    };
  }, [filteredTransactions]);

  const getCellValue = (txn: Transaction, key: string, rowIdx: number): string => {
    if (key === 'row_num') return String(rowIdx + 1);
    const val = (txn as unknown as Record<string, unknown>)[key];
    if (val === null || val === undefined) return '';
    if (typeof val === 'number') {
      const col = COLUMNS.find(c => c.key === key);
      if (col?.isCurrency) return formatCurrency(val);
      return String(val);
    }
    return String(val);
  };

  const totalWidth = COLUMNS.reduce((s, c) => s + c.width, 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Toolbar */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 2, mb: 2,
        px: 1, flexWrap: 'wrap',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TableChartIcon sx={{ color: '#1a73e8' }} />
          <Typography variant="h6" fontWeight={600}>
            Spreadsheet View
          </Typography>
        </Box>
        <Chip
          label={`${filteredTransactions.length.toLocaleString()} of ${totalCount.toLocaleString()} rows`}
          size="small"
          sx={{ backgroundColor: '#e8f0fe', color: '#1a73e8', fontWeight: 500 }}
        />
        <TextField
          placeholder="Search..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            flex: 1,
            maxWidth: 300,
            '& .MuiOutlinedInput-root': { borderRadius: '8px', height: 36 },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: '#5f6368' }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <Tooltip title="Export as CSV (coming soon)">
          <IconButton size="small" sx={{ color: '#5f6368' }}>
            <DownloadIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 2 }}>
          <CircularProgress size={40} />
          <Typography color="text.secondary">
            Loading {totalLoaded.toLocaleString()} of {totalCount.toLocaleString()} transactions...
          </Typography>
        </Box>
      ) : (
        <Box sx={{
          flex: 1,
          overflow: 'auto',
          border: '1px solid #c0c0c0',
          borderRadius: '4px',
          backgroundColor: '#fff',
        }}>
          {/* Excel-like table */}
          <table style={{
            borderCollapse: 'collapse',
            minWidth: totalWidth,
            width: '100%',
            fontFamily: '"Inter", "Segoe UI", sans-serif',
            fontSize: 12,
          }}>
            {/* Header */}
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      backgroundColor: '#f0f0f0',
                      borderBottom: '2px solid #999',
                      borderRight: '1px solid #d0d0d0',
                      padding: '6px 8px',
                      textAlign: (col.align || 'left') as 'left' | 'right' | 'center',
                      fontWeight: 600,
                      color: '#333',
                      fontSize: 11,
                      whiteSpace: 'nowrap',
                      width: col.width,
                      minWidth: col.width,
                      userSelect: 'none',
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((txn, rowIdx) => (
                <tr
                  key={txn.id}
                  style={{
                    backgroundColor: rowIdx % 2 === 0 ? '#ffffff' : '#f8f9fb',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#e8f0fe';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = rowIdx % 2 === 0 ? '#ffffff' : '#f8f9fb';
                  }}
                >
                  {COLUMNS.map((col) => {
                    const val = getCellValue(txn, col.key, rowIdx);
                    const isAmount = col.isCurrency;
                    const numVal = isAmount ? (txn as unknown as Record<string, unknown>)[col.key] as number : 0;
                    return (
                      <td
                        key={col.key}
                        style={{
                          borderBottom: '1px solid #e0e0e0',
                          borderRight: '1px solid #e8e8e8',
                          padding: '4px 8px',
                          textAlign: (col.align || 'left') as 'left' | 'right' | 'center',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: col.width,
                          color: isAmount && numVal < 0 ? '#ea4335' : col.key === 'row_num' ? '#999' : '#333',
                          fontWeight: isAmount ? 500 : col.key === 'row_num' ? 400 : 'normal',
                          fontSize: col.key === 'row_num' ? 10 : 12,
                        }}
                      >
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Totals row */}
              <tr style={{ backgroundColor: '#e8f0fe', fontWeight: 600 }}>
                {COLUMNS.map((col) => {
                  let content = '';
                  if (col.key === 'row_num') content = '';
                  else if (col.key === 'transaction_date') content = 'TOTALS';
                  else if (col.key === 'amount') content = formatCurrency(totals.amount);
                  else if (col.key === 'signed_amount') content = formatCurrency(totals.signed_amount);
                  else if (col.key === 'debit_r') content = formatCurrency(totals.debit_r);
                  else if (col.key === 'debit_s') content = formatCurrency(totals.debit_s);
                  return (
                    <td
                      key={col.key}
                      style={{
                        position: 'sticky',
                        bottom: 0,
                        borderTop: '2px solid #999',
                        borderRight: '1px solid #d0d0d0',
                        padding: '6px 8px',
                        textAlign: (col.align || 'left') as 'left' | 'right' | 'center',
                        backgroundColor: '#e8f0fe',
                        fontWeight: 700,
                        fontSize: 12,
                        color: '#1a73e8',
                      }}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </Box>
      )}
    </Box>
  );
}
