import type { NewTransaction } from '../types';

export interface ExtractedAmazonOrder {
  id: string;
  orderDate: string;
  title: string;
  amount: number;
  category: string;
  subcategory: string;
  quantity: number;
  asin: string;
  paymentMethod: string;
  selected: boolean;
}

// Amazon product category → expense category mapping
const AMAZON_CATEGORY_MAP: Record<string, { category: string; subcategory: string }> = {
  'grocery': { category: 'Food', subcategory: 'Groceries' },
  'food': { category: 'Food', subcategory: 'Groceries' },
  'gourmet food': { category: 'Food', subcategory: 'Groceries' },
  'pantry': { category: 'Food', subcategory: 'Groceries' },
  'baby food': { category: 'Food', subcategory: 'Baby' },
  'books': { category: 'Education', subcategory: 'Books' },
  'kindle': { category: 'Education', subcategory: 'Books' },
  'audible': { category: 'Education', subcategory: 'Books' },
  'electronics': { category: 'Miscellaneous', subcategory: 'Electronics' },
  'computers': { category: 'Miscellaneous', subcategory: 'Electronics' },
  'software': { category: 'Miscellaneous', subcategory: 'Software' },
  'cell phones': { category: 'Miscellaneous', subcategory: 'Electronics' },
  'camera': { category: 'Miscellaneous', subcategory: 'Electronics' },
  'video games': { category: 'Entertainment', subcategory: 'Gaming' },
  'movies & tv': { category: 'Entertainment', subcategory: 'Media' },
  'music': { category: 'Entertainment', subcategory: 'Media' },
  'toys': { category: 'Miscellaneous', subcategory: 'Toys' },
  'baby': { category: 'Miscellaneous', subcategory: 'Baby' },
  'clothing': { category: 'Miscellaneous', subcategory: 'Clothing' },
  'shoes': { category: 'Miscellaneous', subcategory: 'Clothing' },
  'jewelry': { category: 'Miscellaneous', subcategory: 'Clothing' },
  'health': { category: 'Health & Life', subcategory: 'Health Products' },
  'beauty': { category: 'Health & Life', subcategory: 'Personal Care' },
  'personal care': { category: 'Health & Life', subcategory: 'Personal Care' },
  'sports': { category: 'Health & Life', subcategory: 'Fitness' },
  'outdoors': { category: 'Entertainment', subcategory: 'Recreation' },
  'home': { category: 'Home', subcategory: 'Household' },
  'kitchen': { category: 'Home', subcategory: 'Kitchen' },
  'garden': { category: 'Home', subcategory: 'Garden' },
  'tools': { category: 'Home', subcategory: 'Tools' },
  'home improvement': { category: 'Home', subcategory: 'Improvement' },
  'furniture': { category: 'Home', subcategory: 'Furniture' },
  'bedding': { category: 'Home', subcategory: 'Household' },
  'office': { category: 'Miscellaneous', subcategory: 'Office Supplies' },
  'pet supplies': { category: 'Miscellaneous', subcategory: 'Pets' },
  'automotive': { category: 'Car', subcategory: 'Auto Parts' },
  'industrial': { category: 'Miscellaneous', subcategory: 'Industrial' },
  'arts': { category: 'Miscellaneous', subcategory: 'Arts & Crafts' },
  'gift card': { category: 'Gifts', subcategory: 'Gift Cards' },
  'subscription': { category: 'Miscellaneous', subcategory: 'Subscriptions' },
  'prime': { category: 'Miscellaneous', subcategory: 'Subscriptions' },
  'digital': { category: 'Miscellaneous', subcategory: 'Digital' },
  'amazon fresh': { category: 'Food', subcategory: 'Groceries' },
  'whole foods': { category: 'Food', subcategory: 'Groceries' },
};

// Title-based categorization for when Amazon category isn't available
const TITLE_KEYWORDS: Array<{ pattern: RegExp; category: string; subcategory: string }> = [
  { pattern: /vitamin|supplement|medicine|tylenol|advil|bandaid|first aid|thermometer/i, category: 'Health & Life', subcategory: 'Health Products' },
  { pattern: /shampoo|soap|toothpaste|lotion|deodorant|razor|sunscreen/i, category: 'Health & Life', subcategory: 'Personal Care' },
  { pattern: /diaper|wipes|baby|infant|formula|stroller|car seat/i, category: 'Miscellaneous', subcategory: 'Baby' },
  { pattern: /dog|cat|pet|fish|bird|hamster|leash|collar|kibble/i, category: 'Miscellaneous', subcategory: 'Pets' },
  { pattern: /book|textbook|novel|kindle|paperback|hardcover/i, category: 'Education', subcategory: 'Books' },
  { pattern: /cable|charger|adapter|usb|hdmi|bluetooth|wireless|speaker|headphone|earbuds/i, category: 'Miscellaneous', subcategory: 'Electronics' },
  { pattern: /phone case|screen protector|mount|stand/i, category: 'Miscellaneous', subcategory: 'Electronics' },
  { pattern: /shirt|pants|dress|jacket|sweater|socks|underwear|shoes|sneakers|boots/i, category: 'Miscellaneous', subcategory: 'Clothing' },
  { pattern: /snack|coffee|tea|water|drink|food|organic|cereal|protein|bar/i, category: 'Food', subcategory: 'Groceries' },
  { pattern: /toy|lego|puzzle|game|doll|action figure|playhouse/i, category: 'Miscellaneous', subcategory: 'Toys' },
  { pattern: /lamp|light|bulb|curtain|pillow|blanket|towel|mat|rug|shelf|organizer/i, category: 'Home', subcategory: 'Household' },
  { pattern: /pan|pot|knife|spoon|plate|cup|bowl|kitchen|cooking|baking/i, category: 'Home', subcategory: 'Kitchen' },
  { pattern: /oil|filter|tire|wiper|car|auto|motor|dash cam/i, category: 'Car', subcategory: 'Auto Parts' },
  { pattern: /gift card|e-gift/i, category: 'Gifts', subcategory: 'Gift Cards' },
  { pattern: /prime video|prime membership|subscribe|membership/i, category: 'Miscellaneous', subcategory: 'Subscriptions' },
  { pattern: /movie|film|dvd|blu-ray|streaming/i, category: 'Entertainment', subcategory: 'Media' },
  { pattern: /garden|plant|seed|soil|hose|lawn/i, category: 'Home', subcategory: 'Garden' },
  { pattern: /tool|drill|saw|hammer|screwdriver|wrench/i, category: 'Home', subcategory: 'Tools' },
];

export function categorizeAmazonItem(title: string, amazonCategory?: string): { category: string; subcategory: string } {
  // First try Amazon's own category
  if (amazonCategory) {
    const lower = amazonCategory.toLowerCase();
    for (const [key, val] of Object.entries(AMAZON_CATEGORY_MAP)) {
      if (lower.includes(key)) return val;
    }
  }

  // Then try title-based matching
  for (const { pattern, category, subcategory } of TITLE_KEYWORDS) {
    if (pattern.test(title)) return { category, subcategory };
  }

  // Default
  return { category: 'Miscellaneous', subcategory: 'Amazon Purchase' };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseAmazonCSV(csvContent: string): ExtractedAmazonOrder[] {
  const lines = csvContent.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, ''));

  // Detect format by headers
  const orderDateIdx = headers.findIndex(h => h.includes('order date') || h === 'date');
  const orderIdIdx = headers.findIndex(h => h.includes('order id'));
  const titleIdx = headers.findIndex(h => h === 'title' || h.includes('product name') || h.includes('item'));
  const categoryIdx = headers.findIndex(h => h === 'category' || h.includes('product category'));
  const amountIdx = headers.findIndex(h =>
    h.includes('item total') || h.includes('total owed') || h.includes('total') || h.includes('price') || h.includes('amount')
  );
  const asinIdx = headers.findIndex(h => h.includes('asin') || h.includes('isbn'));
  const qtyIdx = headers.findIndex(h => h.includes('quantity') || h.includes('qty'));
  const paymentIdx = headers.findIndex(h => h.includes('payment'));

  if (orderDateIdx === -1 || amountIdx === -1) {
    throw new Error('Could not find required columns (Order Date, Amount/Total). Please check the CSV format.');
  }

  const orders: ExtractedAmazonOrder[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length <= Math.max(orderDateIdx, amountIdx)) continue;

    const rawDate = cols[orderDateIdx]?.replace(/['"]/g, '');
    const rawAmount = cols[amountIdx]?.replace(/['"$,]/g, '');
    const title = (titleIdx >= 0 ? cols[titleIdx] : 'Amazon Order')?.replace(/['"]/g, '') || 'Amazon Order';
    const orderId = (orderIdIdx >= 0 ? cols[orderIdIdx] : `amazon-${i}`)?.replace(/['"]/g, '') || `amazon-${i}`;
    const amazonCat = categoryIdx >= 0 ? cols[categoryIdx]?.replace(/['"]/g, '') : undefined;
    const asin = (asinIdx >= 0 ? cols[asinIdx] : '')?.replace(/['"]/g, '') || '';
    const qty = qtyIdx >= 0 ? parseInt(cols[qtyIdx]?.replace(/['"]/g, '') || '1') || 1 : 1;
    const payment = (paymentIdx >= 0 ? cols[paymentIdx] : '')?.replace(/['"]/g, '') || '';

    const amount = parseFloat(rawAmount);
    if (isNaN(amount) || amount <= 0) continue;

    // Parse date
    let orderDate = '';
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        orderDate = d.toISOString().split('T')[0];
      }
    } catch {
      continue;
    }
    if (!orderDate) continue;

    // Deduplicate by order ID + title
    const key = `${orderId}-${title.slice(0, 30)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const { category, subcategory } = categorizeAmazonItem(title, amazonCat);

    orders.push({
      id: `${orderId}-${i}`,
      orderDate,
      title: title.length > 120 ? title.slice(0, 117) + '...' : title,
      amount,
      category,
      subcategory,
      quantity: qty,
      asin,
      paymentMethod: payment,
      selected: true,
    });
  }

  return orders.sort((a, b) => b.orderDate.localeCompare(a.orderDate));
}

export function amazonOrdersToTransactions(orders: ExtractedAmazonOrder[]): NewTransaction[] {
  return orders
    .filter(o => o.selected)
    .map(o => ({
      transaction_date: o.orderDate,
      category: o.category,
      subcategory: o.subcategory,
      amount: o.amount,
      std_merchant: 'Amazon',
      raw_description: o.title,
      notes: o.asin ? `ASIN: ${o.asin}` : undefined,
      payment_method: o.paymentMethod || undefined,
      tags: 'amazon-import',
    }));
}
