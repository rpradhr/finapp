import { useState, useRef, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, IconButton, Paper, Chip,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { processUserMessage } from '../services/ai';
import { CHART_COLORS } from '../theme';
import type { ChatMessage } from '../types';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

const SUGGESTIONS = [
  'How much did I spend on groceries in 2023?',
  'Compare 2023 vs 2024',
  'Top spending categories last year',
  'Summarize 2024',
  'Add $50 for groceries at Wegmans',
];

export default function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I can help you understand your expenses. Try asking about spending, adding expenses, or comparing periods.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const message = text || input.trim();
    if (!message || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await processUserMessage(message);
      setMessages(prev => [...prev, response]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Error: ${err}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderChart = (msg: ChatMessage) => {
    if (!msg.data || !msg.chart) return null;

    const data = Array.isArray(msg.data) ? msg.data : [];
    if (data.length === 0) return null;

    return (
      <Box sx={{ mt: 2, height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          {msg.chart === 'bar' ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={data[0]?.year_month ? 'year_month' : 'category'} tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="total" fill="#1565c0" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : msg.chart === 'pie' ? (
            <PieChart>
              <Pie data={data} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80}>
                {data.map((_: unknown, idx: number) => (
                  <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
            </PieChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year_month" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Line type="monotone" dataKey="total" stroke="#1565c0" />
            </LineChart>
          )}
        </ResponsiveContainer>
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Messages */}
      <Box sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
        {messages.map((msg) => (
          <Box
            key={msg.id}
            sx={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              mb: 2,
            }}
          >
            <Paper
              sx={{
                p: 2,
                maxWidth: '70%',
                backgroundColor: msg.role === 'user' ? 'primary.main' : 'grey.100',
                color: msg.role === 'user' ? 'white' : 'text.primary',
                borderRadius: 2,
              }}
            >
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap' }}
                dangerouslySetInnerHTML={{
                  __html: msg.content
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br/>'),
                }}
              />
              {renderChart(msg)}
            </Paper>
          </Box>
        ))}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
            <Paper sx={{ p: 2, backgroundColor: 'grey.100', borderRadius: 2 }}>
              <Typography variant="body2">Thinking...</Typography>
            </Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {SUGGESTIONS.map((s) => (
            <Chip key={s} label={s} onClick={() => handleSend(s)} clickable variant="outlined" />
          ))}
        </Box>
      )}

      {/* Input */}
      <Card>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Ask about your expenses..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={loading}
          />
          <IconButton color="primary" onClick={() => handleSend()} disabled={!input.trim() || loading}>
            <SendIcon />
          </IconButton>
        </CardContent>
      </Card>
    </Box>
  );
}
