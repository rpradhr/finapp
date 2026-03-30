import type { ParsedIntent, Insight, ChatMessage, CategoryBreakdown, MonthlySpending, YearlySpending } from '../types';
import { parseIntent } from './nlp';
import * as api from './api';
import { v4 as uuidv4 } from 'uuid';

export interface AIProvider {
  name: string;
  parseIntent(input: string): Promise<ParsedIntent>;
  generateInsights(categories: CategoryBreakdown[], monthly: MonthlySpending[], yearly: YearlySpending[]): Promise<Insight[]>;
}

// ─── LLM Provider (Claude / OpenAI / Gemini / Custom) ─────────────────────

interface LLMConfig {
  provider: 'claude' | 'openai' | 'gemini' | 'custom';
  apiKey: string;
  endpoint?: string;
}

function getLLMEndpoint(config: LLMConfig): string {
  switch (config.provider) {
    case 'claude': return 'https://api.anthropic.com/v1/messages';
    case 'openai': return 'https://api.openai.com/v1/chat/completions';
    case 'gemini': return 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    case 'custom': return config.endpoint || '';
  }
}

function getLLMModel(provider: string): string {
  switch (provider) {
    case 'claude': return 'claude-sonnet-4-6';
    case 'openai': return 'gpt-4o';
    case 'gemini': return 'gemini-2.5-flash';
    default: return 'gpt-4o';
  }
}

async function callLLM(config: LLMConfig, systemPrompt: string, userMessage: string): Promise<string> {
  const endpoint = getLLMEndpoint(config);
  if (!endpoint) throw new Error('No API endpoint configured');

  if (config.provider === 'claude') {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: getLLMModel('claude'),
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Claude API error ${resp.status}: ${err}`);
    }
    const data = await resp.json();
    return data.content?.[0]?.text || '';
  }

  // OpenAI / Gemini / Custom all use OpenAI-compatible format
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (config.provider === 'gemini') {
    // Gemini's OpenAI-compatible endpoint uses Bearer token
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  } else {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: getLLMModel(config.provider),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 1024,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`${config.provider} API error ${resp.status}: ${err}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

const FINANCE_SYSTEM_PROMPT = `You are a helpful financial assistant for a family expense tracking app. You analyze spending data and answer questions about expenses.
When the user asks about spending, provide clear, concise answers with dollar amounts formatted properly.
Keep responses brief (2-4 sentences). Use **bold** for emphasis on key numbers and categories.
Do not use markdown headers or bullet points unless listing multiple items.`;

// ─── Local AI Provider (rule-based NLP) ────────────────────────────────────

class LocalAIProvider implements AIProvider {
  name = 'local';

  async parseIntent(input: string): Promise<ParsedIntent> {
    return parseIntent(input);
  }

  async generateInsights(
    categories: CategoryBreakdown[],
    monthly: MonthlySpending[],
    yearly: YearlySpending[],
  ): Promise<Insight[]> {
    const insights: Insight[] = [];

    if (categories.length > 0) {
      const top = categories[0];
      insights.push({
        id: uuidv4(),
        title: `Top Spending Category: ${top.category}`,
        description: `${top.category} accounts for ${top.percentage.toFixed(1)}% of total spending ($${top.total.toLocaleString()}).`,
        type: 'trend',
        severity: 'info',
      });
    }

    if (yearly.length >= 2) {
      const latest = yearly[yearly.length - 1];
      const previous = yearly[yearly.length - 2];
      if (previous.total > 0) {
        const pctChange = ((latest.total - previous.total) / previous.total) * 100;
        insights.push({
          id: uuidv4(),
          title: `${latest.year} vs ${previous.year} Spending`,
          description: `Spending ${pctChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(pctChange).toFixed(1)}% from $${previous.total.toLocaleString()} to $${latest.total.toLocaleString()}.`,
          type: 'comparison',
          severity: pctChange > 20 ? 'warning' : pctChange < -10 ? 'positive' : 'info',
        });
      }
    }

    if (monthly.length >= 6) {
      const totals = monthly.map(m => m.total);
      const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
      const stdDev = Math.sqrt(totals.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / totals.length);

      if (stdDev > 0) {
        const recent = monthly.slice(-3);
        for (const m of recent) {
          const zScore = (m.total - mean) / stdDev;
          if (zScore > 2) {
            insights.push({
              id: uuidv4(),
              title: `Spending Spike: ${m.year_month}`,
              description: `$${m.total.toLocaleString()} in ${m.year_month} is significantly above average ($${mean.toLocaleString()}). This is ${zScore.toFixed(1)} standard deviations above the mean.`,
              type: 'anomaly',
              severity: 'warning',
            });
          }
        }
      }
    }

    if (categories.length >= 3) {
      const top3Pct = categories.slice(0, 3).reduce((sum, c) => sum + c.percentage, 0);
      if (top3Pct > 80) {
        insights.push({
          id: uuidv4(),
          title: 'High Spending Concentration',
          description: `Top 3 categories account for ${top3Pct.toFixed(1)}% of all spending. Consider reviewing if this aligns with priorities.`,
          type: 'trend',
          severity: 'info',
        });
      }
    }

    return insights;
  }
}

// ─── External LLM Provider ────────────────────────────────────────────────

class ExternalAIProvider implements AIProvider {
  name: string;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.name = config.provider;
    this.config = config;
  }

  async parseIntent(input: string): Promise<ParsedIntent> {
    // Still use local NLP for structured intent parsing (fast & reliable)
    return parseIntent(input);
  }

  async generateInsights(
    categories: CategoryBreakdown[],
    monthly: MonthlySpending[],
    yearly: YearlySpending[],
  ): Promise<Insight[]> {
    // Use local insights as a baseline — LLM enriches in chat
    const local = new LocalAIProvider();
    return local.generateInsights(categories, monthly, yearly);
  }

  async chat(userMessage: string, context: string): Promise<string> {
    const systemPrompt = `${FINANCE_SYSTEM_PROMPT}\n\nHere is the relevant financial data:\n${context}`;
    return callLLM(this.config, systemPrompt, userMessage);
  }
}

// ─── Provider Manager ──────────────────────────────────────────────────────

class AIProviderManager {
  private local: LocalAIProvider;

  constructor() {
    this.local = new LocalAIProvider();
  }

  getProvider(): AIProvider {
    return this.local;
  }

  async getExternalProvider(): Promise<ExternalAIProvider | null> {
    try {
      const settings = await api.getSettings();
      const provider = settings.ai_provider;

      if (!provider || provider === 'local') return null;

      const keyMap: Record<string, string> = {
        claude: 'ai_api_key',
        openai: 'ai_api_key_openai',
        gemini: 'ai_api_key_gemini',
        custom: 'ai_api_key_custom',
      };

      const apiKey = settings[keyMap[provider]];
      if (!apiKey) return null;

      return new ExternalAIProvider({
        provider: provider as LLMConfig['provider'],
        apiKey,
        endpoint: settings.ai_custom_endpoint,
      });
    } catch {
      return null;
    }
  }
}

const providerManager = new AIProviderManager();

export async function processUserMessage(input: string): Promise<ChatMessage> {
  const provider = providerManager.getProvider();
  const intent = await provider.parseIntent(input);

  // For structured intents (add, compare, top, summarize), use local handler + data
  // For queries and unknowns, try LLM if available
  switch (intent.type) {
    case 'add':
      return handleAdd(intent);
    case 'compare':
      return handleCompare(intent);
    case 'top':
      return handleTop(intent);
    case 'summarize':
      return handleSummarize(intent);
    case 'query':
      return handleQuery(intent, input);
    default:
      return handleFreeform(input);
  }
}

async function handleFreeform(input: string): Promise<ChatMessage> {
  const external = await providerManager.getExternalProvider();

  if (external) {
    try {
      // Gather context data for the LLM
      const [categories, monthly, yearly] = await Promise.all([
        api.getCategoryBreakdown(),
        api.getMonthlySpending(),
        api.getYearlySpending(),
      ]);

      const total = yearly.reduce((s, y) => s + y.total, 0);
      const recentYear = yearly.length > 0 ? yearly[yearly.length - 1] : null;
      const top5 = categories.slice(0, 5);

      const context = [
        `Total lifetime spending: $${total.toLocaleString()}`,
        `Years of data: ${yearly.length} (${yearly[0]?.year || '?'} - ${yearly[yearly.length - 1]?.year || '?'})`,
        recentYear ? `Most recent year (${recentYear.year}): $${recentYear.total.toLocaleString()}` : '',
        `Top categories: ${top5.map(c => `${c.category} ($${c.total.toLocaleString()}, ${c.percentage.toFixed(1)}%)`).join(', ')}`,
        `Recent months: ${monthly.slice(-6).map(m => `${m.year_month}: $${m.total.toLocaleString()}`).join(', ')}`,
      ].filter(Boolean).join('\n');

      const response = await external.chat(input, context);

      return {
        id: uuidv4(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
    } catch (err) {
      return {
        id: uuidv4(),
        role: 'assistant',
        content: `AI provider error: ${err}. Falling back to local mode.\n\nI didn't understand that. Try:\n- "How much did I spend on groceries in 2023?"\n- "Add $50 for groceries at Wegmans"\n- "Compare 2023 vs 2024"`,
        timestamp: new Date(),
      };
    }
  }

  return {
    id: uuidv4(),
    role: 'assistant',
    content: `I didn't understand that. Try:\n- "How much did I spend on groceries in 2023?"\n- "Add $50 for groceries at Wegmans"\n- "Compare 2023 vs 2024"\n- "Top spending categories last year"\n- "Summarize 2024"\n\nTip: Enable an AI provider in Settings for richer conversations.`,
    timestamp: new Date(),
  };
}

async function handleQuery(intent: ParsedIntent, originalInput: string): Promise<ChatMessage> {
  try {
    let dateFrom: string | undefined;
    let dateTo: string | undefined;

    if (intent.period) {
      if (intent.period.length === 4) {
        dateFrom = `${intent.period}-01-01`;
        dateTo = `${intent.period}-12-31`;
      } else if (intent.period.length === 7) {
        dateFrom = `${intent.period}-01`;
        const [y, m] = intent.period.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        dateTo = `${intent.period}-${lastDay}`;
      }
    }

    if (intent.category) {
      const monthly = await api.getMonthlySpending(dateFrom, dateTo, intent.category);
      const total = monthly.reduce((sum, m) => sum + m.total, 0);
      const periodLabel = intent.period || 'all time';

      // Enrich with LLM if available
      const external = await providerManager.getExternalProvider();
      let content = `You spent **$${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}** on **${intent.category}** in **${periodLabel}** across ${monthly.length} months.`;

      if (external && monthly.length > 0) {
        try {
          const context = `Category: ${intent.category}, Period: ${periodLabel}, Total: $${total.toFixed(2)}, Monthly breakdown: ${monthly.map(m => `${m.year_month}: $${m.total.toFixed(2)}`).join(', ')}`;
          const enriched = await external.chat(
            `The user asked: "${originalInput}". Based on the data, give a brief 1-2 sentence insight about their ${intent.category} spending.`,
            context,
          );
          content += `\n\n${enriched}`;
        } catch { /* fallback to basic response */ }
      }

      return {
        id: uuidv4(),
        role: 'assistant',
        content,
        data: monthly,
        chart: 'bar',
        timestamp: new Date(),
      };
    }

    const monthly = await api.getMonthlySpending(dateFrom, dateTo);
    const total = monthly.reduce((sum, m) => sum + m.total, 0);
    const periodLabel = intent.period || 'all time';

    return {
      id: uuidv4(),
      role: 'assistant',
      content: `Total spending in **${periodLabel}**: **$${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}** across ${monthly.length} months.`,
      data: monthly,
      chart: 'bar',
      timestamp: new Date(),
    };
  } catch (err) {
    return {
      id: uuidv4(),
      role: 'assistant',
      content: `Error processing query: ${err}`,
      timestamp: new Date(),
    };
  }
}

async function handleAdd(intent: ParsedIntent): Promise<ChatMessage> {
  if (!intent.amount || !intent.category) {
    return {
      id: uuidv4(),
      role: 'assistant',
      content: `I need at least an amount and category. Try: "Add $50 for groceries at Wegmans"`,
      timestamp: new Date(),
    };
  }

  const date = intent.date || new Date().toISOString().split('T')[0];
  const details = [
    `**Amount:** $${intent.amount.toFixed(2)}`,
    `**Category:** ${intent.category}`,
    intent.merchant ? `**Merchant:** ${intent.merchant}` : null,
    `**Date:** ${date}`,
  ].filter(Boolean).join('\n');

  try {
    await api.addTransaction({
      transaction_date: date,
      category: intent.category,
      amount: intent.amount,
      std_merchant: intent.merchant,
      raw_description: intent.description,
    });

    return {
      id: uuidv4(),
      role: 'assistant',
      content: `Expense added successfully!\n\n${details}`,
      timestamp: new Date(),
    };
  } catch (err) {
    return {
      id: uuidv4(),
      role: 'assistant',
      content: `Failed to add expense: ${err}`,
      timestamp: new Date(),
    };
  }
}

async function handleCompare(intent: ParsedIntent): Promise<ChatMessage> {
  if (!intent.period || !intent.period2) {
    return {
      id: uuidv4(),
      role: 'assistant',
      content: `Please specify two years to compare. Try: "Compare 2023 vs 2024"`,
      timestamp: new Date(),
    };
  }

  try {
    const [data1, data2] = await Promise.all([
      api.getMonthlySpending(`${intent.period}-01-01`, `${intent.period}-12-31`),
      api.getMonthlySpending(`${intent.period2}-01-01`, `${intent.period2}-12-31`),
    ]);

    const total1 = data1.reduce((s, m) => s + m.total, 0);
    const total2 = data2.reduce((s, m) => s + m.total, 0);
    const diff = total2 - total1;
    const pctChange = total1 > 0 ? ((diff / total1) * 100).toFixed(1) : 'N/A';
    const direction = diff > 0 ? 'increase' : 'decrease';

    return {
      id: uuidv4(),
      role: 'assistant',
      content: `**${intent.period}:** $${total1.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n**${intent.period2}:** $${total2.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n\n**Change:** ${direction} of $${Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2 })} (${pctChange}%)`,
      data: { period1: data1, period2: data2, year1: intent.period, year2: intent.period2 },
      chart: 'line',
      timestamp: new Date(),
    };
  } catch (err) {
    return { id: uuidv4(), role: 'assistant', content: `Error: ${err}`, timestamp: new Date() };
  }
}

async function handleTop(intent: ParsedIntent): Promise<ChatMessage> {
  try {
    let dateFrom: string | undefined;
    let dateTo: string | undefined;
    if (intent.period) {
      dateFrom = `${intent.period}-01-01`;
      dateTo = `${intent.period}-12-31`;
    }

    const categories = await api.getCategoryBreakdown(dateFrom, dateTo);
    const top5 = categories.slice(0, 5);
    const periodLabel = intent.period || 'all time';

    const lines = top5.map((c, i) =>
      `${i + 1}. **${c.category}** - $${c.total.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${c.percentage.toFixed(1)}%)`
    );

    return {
      id: uuidv4(),
      role: 'assistant',
      content: `**Top Spending Categories (${periodLabel}):**\n\n${lines.join('\n')}`,
      data: top5,
      chart: 'pie',
      timestamp: new Date(),
    };
  } catch (err) {
    return { id: uuidv4(), role: 'assistant', content: `Error: ${err}`, timestamp: new Date() };
  }
}

async function handleSummarize(intent: ParsedIntent): Promise<ChatMessage> {
  try {
    let dateFrom: string | undefined;
    let dateTo: string | undefined;
    if (intent.period) {
      if (intent.period.length === 4) {
        dateFrom = `${intent.period}-01-01`;
        dateTo = `${intent.period}-12-31`;
      } else if (intent.period.length === 7) {
        dateFrom = `${intent.period}-01`;
        const [y, m] = intent.period.split('-').map(Number);
        dateTo = `${intent.period}-${new Date(y, m, 0).getDate()}`;
      }
    }

    const [categories, monthly] = await Promise.all([
      api.getCategoryBreakdown(dateFrom, dateTo),
      api.getMonthlySpending(dateFrom, dateTo),
    ]);

    const total = monthly.reduce((s, m) => s + m.total, 0);
    const avgMonthly = monthly.length > 0 ? total / monthly.length : 0;
    const top3 = categories.slice(0, 3).map(c => `${c.category} ($${c.total.toLocaleString()})`).join(', ');
    const periodLabel = intent.period || 'all time';

    return {
      id: uuidv4(),
      role: 'assistant',
      content: `**Summary for ${periodLabel}:**\n\n- **Total Spending:** $${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n- **Monthly Average:** $${avgMonthly.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n- **Months with Data:** ${monthly.length}\n- **Top Categories:** ${top3}\n- **Number of Categories:** ${categories.length}`,
      timestamp: new Date(),
    };
  } catch (err) {
    return { id: uuidv4(), role: 'assistant', content: `Error: ${err}`, timestamp: new Date() };
  }
}

export async function generateInsights(): Promise<Insight[]> {
  const provider = providerManager.getProvider();
  try {
    const [categories, monthly, yearly] = await Promise.all([
      api.getCategoryBreakdown(),
      api.getMonthlySpending(),
      api.getYearlySpending(),
    ]);
    return provider.generateInsights(categories, monthly, yearly);
  } catch {
    return [];
  }
}
