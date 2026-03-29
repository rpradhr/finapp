import { useState, useRef, useEffect } from 'react';
import {
  Box, Card, Typography, TextField, IconButton, Chip,
} from '@mui/material';
import {
  Send as SendIcon,
  Person as PersonIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { processUserMessage } from '../services/ai';
import { CHART_COLORS, formatCompactCurrency, CUSTOM_TOOLTIP_STYLE } from '../theme';
import type { ChatMessage } from '../types';

const SUGGESTIONS = [
  'How much did I spend on groceries in 2023?',
  'Compare 2023 vs 2024',
  'Top spending categories last year',
  'Summarize 2024',
  'Add $50 for groceries at Wegmans',
];

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

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
      <Card sx={{ borderRadius: 3, overflow: 'hidden', mt: 1.5 }}>
        <Box sx={{ height: 200, p: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            {msg.chart === 'bar' ? (
              <BarChart data={data} barCategoryGap="20%">
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a73e8" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#1a73e8" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey={data[0]?.year_month ? 'year_month' : 'category'}
                  tick={{ fontSize: 10 }}
                />
                <YAxis tickFormatter={(v) => formatCompactCurrency(v)} tick={{ fontSize: 10 }} />
                <Tooltip
                  {...CUSTOM_TOOLTIP_STYLE}
                  formatter={(v) => formatCompactCurrency(Number(v))}
                />
                <Bar
                  dataKey="total"
                  fill="url(#barGrad)"
                  radius={[6, 6, 0, 0]}
                  animationDuration={800}
                />
              </BarChart>
            ) : msg.chart === 'pie' ? (
              <PieChart>
                <Pie
                  data={data}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  animationDuration={800}
                >
                  {data.map((_: unknown, idx: number) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  {...CUSTOM_TOOLTIP_STYLE}
                  formatter={(v) => formatCompactCurrency(Number(v))}
                />
              </PieChart>
            ) : (
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a73e8" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#1a73e8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year_month" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => formatCompactCurrency(v)} tick={{ fontSize: 10 }} />
                <Tooltip
                  {...CUSTOM_TOOLTIP_STYLE}
                  formatter={(v) => formatCompactCurrency(Number(v))}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#1a73e8"
                  strokeWidth={2}
                  fill="url(#areaGrad)"
                  animationDuration={800}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </Box>
      </Card>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Messages area */}
      <Box sx={{ flex: 1, overflow: 'auto', mb: 2, px: 1 }}>
        {messages.map((msg) => (
          <Box
            key={msg.id}
            sx={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-end',
              gap: 1,
              mb: 2,
            }}
          >
            {/* Assistant avatar */}
            {msg.role === 'assistant' && (
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1a73e8, #8e24aa)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AutoAwesomeIcon sx={{ color: 'white', fontSize: 18 }} />
              </Box>
            )}

            {/* Message bubble */}
            <Box sx={{ maxWidth: '70%' }}>
              <Box
                sx={{
                  p: 2,
                  ...(msg.role === 'user'
                    ? {
                        background: '#1a73e8',
                        color: 'white',
                        borderRadius: '20px 20px 4px 20px',
                        ml: 'auto',
                      }
                    : {
                        background: '#f8f9fa',
                        borderRadius: '20px 20px 20px 4px',
                        borderLeft: '3px solid #1a73e8',
                      }),
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(msg.content),
                  }}
                />
              </Box>
              {msg.role === 'assistant' && renderChart(msg)}
            </Box>

            {/* User avatar */}
            {msg.role === 'user' && (
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#1a73e8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <PersonIcon sx={{ color: 'white', fontSize: 18 }} />
              </Box>
            )}
          </Box>
        ))}

        {/* Typing indicator */}
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mb: 2 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1a73e8, #8e24aa)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AutoAwesomeIcon sx={{ color: 'white', fontSize: 18 }} />
            </Box>
            <Box
              sx={{
                background: '#f8f9fa',
                borderRadius: '20px 20px 20px 4px',
                borderLeft: '3px solid #1a73e8',
                p: 2,
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
                '@keyframes bounce': {
                  '0%, 60%, 100%': { transform: 'translateY(0)' },
                  '30%': { transform: 'translateY(-8px)' },
                },
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#1a73e8',
                  animation: 'bounce 1.2s infinite',
                  animationDelay: '0s',
                }}
              />
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#1a73e8',
                  animation: 'bounce 1.2s infinite',
                  animationDelay: '0.15s',
                }}
              />
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#1a73e8',
                  animation: 'bounce 1.2s infinite',
                  animationDelay: '0.3s',
                }}
              />
            </Box>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Suggestion chips */}
      {messages.length <= 1 && (
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', px: 1 }}>
          {SUGGESTIONS.map((s) => (
            <Chip
              key={s}
              label={s}
              onClick={() => handleSend(s)}
              clickable
              variant="outlined"
              sx={{
                borderRadius: 20,
                border: '1px solid #e0e0e0',
                '&:hover': {
                  backgroundColor: '#e8f0fe',
                  borderColor: '#1a73e8',
                },
              }}
            />
          ))}
        </Box>
      )}

      {/* Input area */}
      <Card sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Ask about your expenses..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={loading}
            InputProps={{
              sx: {
                borderRadius: '24px',
              },
            }}
          />
          <IconButton
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            sx={{
              backgroundColor: '#1a73e8',
              color: 'white',
              borderRadius: '50%',
              width: 40,
              height: 40,
              '&:hover': {
                backgroundColor: '#0d47a1',
              },
              '&.Mui-disabled': {
                backgroundColor: '#e0e0e0',
                color: '#9e9e9e',
              },
            }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Box>
      </Card>
    </Box>
  );
}
