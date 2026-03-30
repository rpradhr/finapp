import type { NewTransaction } from '../types';

// Google OAuth2 configuration for Desktop apps
// Uses loopback redirect: http://127.0.0.1 (no port needed, Google shows code on page)
const GMAIL_SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';
const REDIRECT_URI = 'http://127.0.0.1';

export interface ExtractedOrder {
  id: string;
  from: string;
  subject: string;
  date: string;
  merchant: string;
  amount: number | null;
  category: string;
  description: string;
  snippet: string;
  selected: boolean;
}

// Known order email senders and their parsing patterns
const ORDER_SENDERS: Record<string, { merchant: string; category: string }> = {
  'auto-confirm@amazon.com': { merchant: 'Amazon', category: 'Miscellaneous' },
  'order-update@amazon.com': { merchant: 'Amazon', category: 'Miscellaneous' },
  'digital-no-reply@amazon.com': { merchant: 'Amazon', category: 'Miscellaneous' },
  'ship-confirm@amazon.com': { merchant: 'Amazon', category: 'Miscellaneous' },
  'noreply@uber.com': { merchant: 'Uber', category: 'Transportation' },
  'uber.us@uber.com': { merchant: 'Uber', category: 'Transportation' },
  'receipts@uber.com': { merchant: 'Uber Eats', category: 'Food' },
  'no-reply@doordash.com': { merchant: 'DoorDash', category: 'Food' },
  'noreply@grubhub.com': { merchant: 'Grubhub', category: 'Food' },
  'orders@instacart.com': { merchant: 'Instacart', category: 'Food' },
  'receipt@square.com': { merchant: 'Square', category: 'Miscellaneous' },
  'noreply@venmo.com': { merchant: 'Venmo', category: 'Miscellaneous' },
  'service@paypal.com': { merchant: 'PayPal', category: 'Miscellaneous' },
  'noreply@apple.com': { merchant: 'Apple', category: 'Miscellaneous' },
  'no_reply@email.apple.com': { merchant: 'Apple', category: 'Miscellaneous' },
  'receipts@netflix.com': { merchant: 'Netflix', category: 'Entertainment' },
  'info@spotify.com': { merchant: 'Spotify', category: 'Entertainment' },
  'noreply@youtube.com': { merchant: 'YouTube', category: 'Entertainment' },
  'noreply@target.com': { merchant: 'Target', category: 'Miscellaneous' },
  'noreply@walmart.com': { merchant: 'Walmart', category: 'Miscellaneous' },
  'orders@costco.com': { merchant: 'Costco', category: 'Food' },
  'receipts@starbucks.com': { merchant: 'Starbucks', category: 'Food' },
};

// Amount extraction patterns
const AMOUNT_PATTERNS = [
  /(?:total|amount|charged|paid|price|cost)[:\s]*\$?([\d,]+\.?\d*)/i,
  /\$\s*([\d,]+\.\d{2})/,
  /(?:USD|US\$)\s*([\d,]+\.\d{2})/i,
  /(?:order total|grand total|subtotal)[:\s]*\$?([\d,]+\.?\d*)/i,
];

export function extractAmountFromText(text: string): number | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (amount > 0 && amount < 100000) return amount;
    }
  }
  return null;
}

export function extractMerchantFromSubject(subject: string): string | null {
  const patterns = [
    /your\s+(.+?)\s+(?:order|receipt|purchase|confirmation)/i,
    /(?:order|receipt|purchase|confirmation)\s+from\s+(.+?)(?:\s*[-|#]|$)/i,
    /(.+?)\s+(?:order|receipt|purchase)\s+confirmation/i,
  ];
  for (const p of patterns) {
    const m = subject.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

export function categorizeMerchant(merchant: string): string {
  const lower = merchant.toLowerCase();
  if (/amazon|walmart|target|costco|ebay/.test(lower)) return 'Miscellaneous';
  if (/uber(?!\s*eat)|lyft|taxi|transit/.test(lower)) return 'Transportation';
  if (/uber\s*eat|doordash|grubhub|instacart|starbucks|restaurant|food/.test(lower)) return 'Food';
  if (/netflix|spotify|hulu|disney|youtube|hbo|apple\s*tv/.test(lower)) return 'Entertainment';
  if (/airbnb|hotel|flight|airline|booking/.test(lower)) return 'Travel';
  if (/cvs|walgreens|pharmacy|doctor|hospital/.test(lower)) return 'Health & Life';
  return 'Miscellaneous';
}

export function parseEmailToOrder(
  messageId: string,
  from: string,
  subject: string,
  date: string,
  snippet: string,
  body: string,
): ExtractedOrder {
  const fromLower = from.toLowerCase();
  let merchant = '';
  let category = 'Miscellaneous';

  for (const [sender, info] of Object.entries(ORDER_SENDERS)) {
    if (fromLower.includes(sender)) {
      merchant = info.merchant;
      category = info.category;
      break;
    }
  }

  if (!merchant) {
    merchant = extractMerchantFromSubject(subject) || from.split('<')[0].trim() || 'Unknown';
    category = categorizeMerchant(merchant);
  }

  const amount = extractAmountFromText(body) || extractAmountFromText(snippet) || extractAmountFromText(subject);

  return {
    id: messageId,
    from,
    subject,
    date: new Date(date).toISOString().split('T')[0],
    merchant,
    amount,
    category,
    description: subject,
    snippet: snippet.slice(0, 200),
    selected: amount !== null,
  };
}

export function ordersToTransactions(orders: ExtractedOrder[]): NewTransaction[] {
  return orders
    .filter(o => o.selected && o.amount !== null)
    .map(o => ({
      transaction_date: o.date,
      category: o.category,
      amount: o.amount!,
      std_merchant: o.merchant,
      raw_description: o.description,
      notes: `Imported from Gmail: ${o.subject}`,
      tags: 'gmail-import',
    }));
}

// OAuth2 with S256 PKCE for Desktop apps
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

let storedCodeVerifier = '';

export async function getAuthUrl(clientId: string): Promise<string> {
  storedCodeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(storedCodeVerifier);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: GMAIL_SCOPES,
    access_type: 'offline',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForToken(
  clientId: string,
  clientSecret: string,
  code: string,
): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      code_verifier: storedCodeVerifier,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Token exchange failed: ${response.status} — ${errBody}`);
  }

  return response.json();
}

export async function fetchRecentOrders(accessToken: string, maxResults: number = 50): Promise<ExtractedOrder[]> {
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const afterDate = fourWeeksAgo.toISOString().split('T')[0].replace(/-/g, '/');

  const query = encodeURIComponent(
    `after:${afterDate} (subject:order OR subject:receipt OR subject:confirmation OR subject:payment OR subject:invoice) -subject:cancel -subject:return`
  );

  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=${maxResults}`;
  const listResponse = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listResponse.ok) {
    throw new Error(`Gmail API error: ${listResponse.status} ${listResponse.statusText}`);
  }

  const listData = await listResponse.json();
  const messageIds: string[] = (listData.messages || []).map((m: { id: string }) => m.id);

  if (messageIds.length === 0) return [];

  const orders: ExtractedOrder[] = [];

  for (const msgId of messageIds.slice(0, 20)) {
    try {
      const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`;
      const msgResponse = await fetch(msgUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!msgResponse.ok) continue;

      const msgData = await msgResponse.json();
      const headers = msgData.payload?.headers || [];
      const from = headers.find((h: { name: string }) => h.name === 'From')?.value || '';
      const subject = headers.find((h: { name: string }) => h.name === 'Subject')?.value || '';
      const date = headers.find((h: { name: string }) => h.name === 'Date')?.value || '';
      const snippet = msgData.snippet || '';

      let body = snippet;
      const parts = msgData.payload?.parts || [];
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          break;
        }
      }

      const order = parseEmailToOrder(msgId, from, subject, date, snippet, body);
      if (order.amount !== null || order.merchant !== 'Unknown') {
        orders.push(order);
      }
    } catch (err) {
      console.error(`Error processing message ${msgId}:`, err);
    }
  }

  return orders;
}
