import type { ParsedIntent } from '../types';

const CATEGORY_ALIASES: Record<string, string> = {
  grocery: 'Food', groceries: 'Food', food: 'Food', dining: 'Food', restaurant: 'Food',
  eating: 'Food', lunch: 'Food', dinner: 'Food', breakfast: 'Food',
  gas: 'Transportation', fuel: 'Transportation', transport: 'Transportation',
  uber: 'Transportation', lyft: 'Transportation', transit: 'Transportation',
  car: 'Car', auto: 'Car', vehicle: 'Car',
  rent: 'Home', mortgage: 'Home', home: 'Home', house: 'Home',
  electric: 'Utilities', water: 'Utilities', utility: 'Utilities', utilities: 'Utilities',
  phone: 'Utilities', internet: 'Utilities',
  doctor: 'Health & Life', medical: 'Health & Life', health: 'Health & Life',
  medicine: 'Health & Life', pharmacy: 'Health & Life',
  school: 'Education', education: 'Education', tuition: 'Education', class: 'Education',
  travel: 'Travel', trip: 'Travel', hotel: 'Travel', flight: 'Travel', vacation: 'Travel',
  gift: 'Gifts', gifts: 'Gifts', present: 'Gifts',
  shopping: 'Miscellaneous', clothes: 'Miscellaneous', clothing: 'Miscellaneous',
  entertainment: 'Entertainment', movie: 'Entertainment', concert: 'Entertainment',
  india: 'India', remittance: 'India',
};

const MONTH_MAP: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
  april: 4, apr: 4, may: 5, june: 6, jun: 6,
  july: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9,
  october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};

function resolveCategory(input: string): string | undefined {
  const lower = input.toLowerCase().trim();
  if (CATEGORY_ALIASES[lower]) return CATEGORY_ALIASES[lower];
  // Try partial match
  for (const [alias, cat] of Object.entries(CATEGORY_ALIASES)) {
    if (lower.includes(alias) || alias.includes(lower)) return cat;
  }
  return undefined;
}

function resolvePeriod(input: string): string | undefined {
  const lower = input.toLowerCase().trim();

  // Year: "2023", "in 2023"
  const yearMatch = lower.match(/\b(20\d{2})\b/);
  if (yearMatch) return yearMatch[1];

  // "last year", "this year"
  const now = new Date();
  if (lower.includes('last year')) return String(now.getFullYear() - 1);
  if (lower.includes('this year')) return String(now.getFullYear());
  if (lower.includes('last month')) {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  if (lower.includes('this month')) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  // "january 2024", "march"
  for (const [name, num] of Object.entries(MONTH_MAP)) {
    if (lower.includes(name)) {
      const yr = yearMatch ? yearMatch[1] : String(now.getFullYear());
      return `${yr}-${String(num).padStart(2, '0')}`;
    }
  }

  return undefined;
}

export function parseIntent(input: string): ParsedIntent {
  const trimmed = input.trim();
  if (!trimmed) return { type: 'unknown', raw: input };

  // ADD patterns
  const addPatterns = [
    /^add\s+\$?([\d,.]+)\s+(?:for\s+)?(.+?)(?:\s+at\s+(.+?))?(?:\s+on\s+(.+))?$/i,
    /^spent\s+\$?([\d,.]+)\s+(?:on\s+)?(.+?)(?:\s+at\s+(.+?))?(?:\s+on\s+(.+))?$/i,
    /^(?:log|record|enter)\s+\$?([\d,.]+)\s+(?:for\s+)?(.+?)(?:\s+at\s+(.+?))?$/i,
  ];

  for (const pattern of addPatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      const categoryInput = match[2]?.trim();
      const merchant = match[3]?.trim();
      const dateStr = match[4]?.trim();
      const category = resolveCategory(categoryInput || '') || categoryInput;

      let date: string | undefined;
      if (dateStr) {
        if (dateStr.toLowerCase() === 'today') {
          date = new Date().toISOString().split('T')[0];
        } else if (dateStr.toLowerCase() === 'yesterday') {
          const d = new Date();
          d.setDate(d.getDate() - 1);
          date = d.toISOString().split('T')[0];
        }
      } else {
        date = new Date().toISOString().split('T')[0];
      }

      return {
        type: 'add',
        amount,
        category,
        merchant,
        date,
        description: categoryInput,
        raw: input,
      };
    }
  }

  // COMPARE patterns
  const compareMatch = trimmed.match(/compare\s+(\d{4})\s+(?:vs|versus|to|and|with)\s+(\d{4})/i);
  if (compareMatch) {
    return {
      type: 'compare',
      period: compareMatch[1],
      period2: compareMatch[2],
      raw: input,
    };
  }

  // TOP patterns
  if (/top\s+(?:spending\s+)?categor/i.test(trimmed) ||
      /biggest\s+expense/i.test(trimmed) ||
      /where.*most.*money/i.test(trimmed) ||
      /highest\s+spending/i.test(trimmed)) {
    const period = resolvePeriod(trimmed);
    return { type: 'top', period, raw: input };
  }

  // SUMMARIZE patterns
  const summarizeMatch = trimmed.match(/(?:summarize|summary\s+(?:for|of))\s+(.+)/i);
  if (summarizeMatch) {
    const period = resolvePeriod(summarizeMatch[1]);
    return { type: 'summarize', period, raw: input };
  }

  // QUERY patterns
  const queryPatterns = [
    /how\s+much.*spend.*on\s+(.+?)\s+in\s+(.+)/i,
    /how\s+much.*spend.*on\s+(.+)/i,
    /what.*spend.*on\s+(.+?)\s+in\s+(.+)/i,
    /total\s+(.+?)\s+spending(?:\s+in\s+(.+))?/i,
    /show\s+(?:me\s+)?(.+?)\s+(?:expenses?|spending)(?:\s+(?:in|for|during)\s+(.+))?/i,
    /(.+?)\s+spending\s+(?:in|for|during)\s+(.+)/i,
  ];

  for (const pattern of queryPatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const categoryInput = match[1]?.trim();
      const periodInput = match[2]?.trim();
      const category = resolveCategory(categoryInput || '');
      const period = periodInput ? resolvePeriod(periodInput) || periodInput : resolvePeriod(trimmed);

      return {
        type: 'query',
        category: category || categoryInput,
        period,
        raw: input,
      };
    }
  }

  // Generic period query
  if (/how\s+much.*spend/i.test(trimmed)) {
    const period = resolvePeriod(trimmed);
    return { type: 'query', period, raw: input };
  }

  return { type: 'unknown', raw: input };
}
