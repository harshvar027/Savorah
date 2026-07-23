import { Transaction } from '../types';

export interface ExtractedTransaction {
  title: string;
  amount: number;
  type: 'expense' | 'income';
  category: string;
  date: string;
  paymentMethod: string;
  notes?: string;
  isEssential?: boolean;
  tags?: string[];
  confidence: number; // 0-100
  source: 'receipt' | 'statement' | 'sms' | 'manual';
}

const MERCHANT_MAP: Record<string, { category: string; isEssential: boolean; tags: string[] }> = {
  swiggy: { category: 'Groceries & Dining', isEssential: true, tags: ['food', 'delivery'] },
  zomato: { category: 'Groceries & Dining', isEssential: true, tags: ['food', 'delivery'] },
  dominos: { category: 'Groceries & Dining', isEssential: false, tags: ['food', 'pizza'] },
  "mcdonald's": { category: 'Groceries & Dining', isEssential: false, tags: ['food', 'fast-food'] },
  'reliance fresh': { category: 'Groceries & Dining', isEssential: true, tags: ['groceries'] },
  blinkit: { category: 'Groceries & Dining', isEssential: true, tags: ['groceries', 'delivery'] },
  zepto: { category: 'Groceries & Dining', isEssential: true, tags: ['groceries'] },
  uber: { category: 'Transport & Fuel', isEssential: false, tags: ['transport', 'cab'] },
  ola: { category: 'Transport & Fuel', isEssential: false, tags: ['transport', 'cab'] },
  rapido: { category: 'Transport & Fuel', isEssential: false, tags: ['transport', 'bike'] },
  amazon: { category: 'Shopping & Apparel', isEssential: false, tags: ['online', 'shopping'] },
  flipkart: { category: 'Shopping & Apparel', isEssential: false, tags: ['online', 'shopping'] },
  myntra: { category: 'Shopping & Apparel', isEssential: false, tags: ['fashion'] },
  netflix: { category: 'Entertainment & Leisure', isEssential: false, tags: ['streaming', 'subscription'] },
  spotify: { category: 'Entertainment & Leisure', isEssential: false, tags: ['music', 'subscription'] },
  'prime video': { category: 'Entertainment & Leisure', isEssential: false, tags: ['streaming'] },
  electricity: { category: 'Utilities & Bills', isEssential: true, tags: ['electricity'] },
  bsnl: { category: 'Utilities & Bills', isEssential: true, tags: ['telecom'] },
  airtel: { category: 'Utilities & Bills', isEssential: true, tags: ['telecom', 'internet'] },
  jio: { category: 'Utilities & Bills', isEssential: true, tags: ['telecom'] },
  tata: { category: 'Utilities & Bills', isEssential: true, tags: ['utilities'] },
  hospital: { category: 'Healthcare & Medical', isEssential: true, tags: ['health'] },
  pharmacy: { category: 'Healthcare & Medical', isEssential: true, tags: ['medicine'] },
  apollo: { category: 'Healthcare & Medical', isEssential: true, tags: ['medicine', 'pharmacy'] },
  medplus: { category: 'Healthcare & Medical', isEssential: true, tags: ['medicine'] },
  salary: { category: 'Salary & Allowance', isEssential: true, tags: ['income', 'salary'] },
  gym: { category: 'Healthcare & Medical', isEssential: false, tags: ['fitness'] },
  metro: { category: 'Transport & Fuel', isEssential: true, tags: ['transport', 'metro'] },
};

function detectCategoryFromText(text: string): { category: string; isEssential: boolean; tags: string[]; confidence: number } {
  const lower = text.toLowerCase();
  for (const [kw, data] of Object.entries(MERCHANT_MAP)) {
    if (lower.includes(kw)) {
      return { ...data, confidence: 90 + Math.floor(Math.random() * 9) };
    }
  }
  if (/grocery|supermarket|mart|bazaar|kirana/i.test(lower)) {
    return { category: 'Groceries & Dining', isEssential: true, tags: ['groceries'], confidence: 82 };
  }
  if (/taxi|auto|bus|rail|train|flight/i.test(lower)) {
    return { category: 'Transport & Fuel', isEssential: false, tags: ['transport'], confidence: 80 };
  }
  if (/bill|utility|water|gas|electric/i.test(lower)) {
    return { category: 'Utilities & Bills', isEssential: true, tags: ['bills'], confidence: 78 };
  }
  return { category: 'Other', isEssential: false, tags: [], confidence: 62 + Math.floor(Math.random() * 18) };
}

// ─── SMS PARSER ──────────────────────────────────────────────────────────────
export async function parseSMS(text: string): Promise<ExtractedTransaction> {
  await new Promise((r) => setTimeout(r, 1600));

  // Amount
  const amountMatch =
    text.match(/(?:Rs\.?|₹|INR)\s*([\d,]+(?:\.\d+)?)/i) ||
    text.match(/([\d,]+(?:\.\d+)?)\s*(?:Rs\.?|₹|INR)/i) ||
    text.match(/\$\s*([\d,]+(?:\.\d+)?)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

  // Merchant
  const merchantMatch =
    text.match(/(?:\bat\b|\bto\b|\bfrom\b|@)\s+([A-Za-z][A-Za-z0-9\s&'.,-]{2,35}?)(?:\s+on\b|\s+via\b|\s+Ref\b|\.|\n|$)/i);
  const merchant = merchantMatch ? merchantMatch[1].trim() : 'Unknown Merchant';

  // Date
  const dateMatch = text.match(
    /(\d{1,2}[\s\-\/](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-\/]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
  );
  let date = new Date().toISOString().split('T')[0];
  if (dateMatch) {
    try {
      const p = new Date(dateMatch[1]);
      if (!isNaN(p.getTime())) date = p.toISOString().split('T')[0];
    } catch {}
  }

  // Payment method
  let paymentMethod = 'UPI / Cash';
  if (/credit\s*card/i.test(text)) paymentMethod = 'Credit Card';
  else if (/debit\s*card/i.test(text)) paymentMethod = 'Debit Card';
  else if (/upi|gpay|google\s*pay|phonepe|paytm|bhim/i.test(text)) paymentMethod = 'UPI / Cash';
  else if (/bank\s*transfer|neft|imps|rtgs/i.test(text)) paymentMethod = 'Bank Transfer';

  const isIncome = /credited|received|salary|refund|cashback|deposited/i.test(text);
  const { category, isEssential, tags, confidence } = detectCategoryFromText(merchant + ' ' + text);

  return {
    title: merchant,
    amount,
    type: isIncome ? 'income' : 'expense',
    category,
    date,
    paymentMethod,
    isEssential,
    tags,
    confidence,
    source: 'sms',
  };
}

// ─── RECEIPT PARSER (mock OCR) ────────────────────────────────────────────────
const MOCK_RECEIPTS: Omit<ExtractedTransaction, 'source'>[] = [
  { title: 'Reliance Fresh', amount: 1249, category: 'Groceries & Dining', paymentMethod: 'Debit Card', type: 'expense', isEssential: true, tags: ['groceries'], confidence: 97, date: '' },
  { title: 'Cafe Coffee Day', amount: 380, category: 'Groceries & Dining', paymentMethod: 'Credit Card', type: 'expense', isEssential: false, tags: ['coffee', 'dining'], confidence: 95, date: '' },
  { title: 'Amazon India Order', amount: 1599, category: 'Shopping & Apparel', paymentMethod: 'Credit Card', type: 'expense', isEssential: false, tags: ['shopping', 'online'], confidence: 98, date: '' },
  { title: 'Uber Ride', amount: 245, category: 'Transport & Fuel', paymentMethod: 'UPI / Cash', type: 'expense', isEssential: false, tags: ['transport', 'cab'], confidence: 96, date: '' },
  { title: 'Apollo Pharmacy', amount: 850, category: 'Healthcare & Medical', paymentMethod: 'Debit Card', type: 'expense', isEssential: true, tags: ['medicine', 'health'], confidence: 94, date: '' },
  { title: 'Blinkit Grocery Delivery', amount: 765, category: 'Groceries & Dining', paymentMethod: 'UPI / Cash', type: 'expense', isEssential: true, tags: ['groceries', 'delivery'], confidence: 97, date: '' },
  { title: 'Zomato Dinner', amount: 520, category: 'Groceries & Dining', paymentMethod: 'Credit Card', type: 'expense', isEssential: false, tags: ['food', 'delivery'], confidence: 99, date: '' },
];

export async function parseReceiptImage(_file: File): Promise<ExtractedTransaction> {
  await new Promise((r) => setTimeout(r, 2800));
  const mock = MOCK_RECEIPTS[Math.floor(Math.random() * MOCK_RECEIPTS.length)];
  return {
    ...mock,
    date: new Date().toISOString().split('T')[0],
    source: 'receipt',
  };
}

// ─── STATEMENT PARSER ─────────────────────────────────────────────────────────
const MOCK_ROWS: Omit<ExtractedTransaction, 'source' | 'confidence'>[] = [
  { title: 'Netflix Subscription', amount: 649, category: 'Entertainment & Leisure', paymentMethod: 'Credit Card', type: 'expense', date: '2026-07-01', isEssential: false, tags: ['streaming'] },
  { title: 'Swiggy Order', amount: 485, category: 'Groceries & Dining', paymentMethod: 'UPI / Cash', type: 'expense', date: '2026-07-03', isEssential: true, tags: ['food'] },
  { title: 'Metro Card Recharge', amount: 300, category: 'Transport & Fuel', paymentMethod: 'UPI / Cash', type: 'expense', date: '2026-07-05', isEssential: true, tags: ['transport'] },
  { title: 'Electricity Bill', amount: 1240, category: 'Utilities & Bills', paymentMethod: 'Bank Transfer', type: 'expense', date: '2026-07-07', isEssential: true, tags: ['electricity'] },
  { title: 'Freelance Payment', amount: 15000, category: 'Salary & Allowance', paymentMethod: 'Bank Transfer', type: 'income', date: '2026-07-10', isEssential: true, tags: ['freelance', 'income'] },
  { title: 'Amazon Shopping', amount: 2399, category: 'Shopping & Apparel', paymentMethod: 'Credit Card', type: 'expense', date: '2026-07-12', isEssential: false, tags: ['shopping'] },
  { title: 'Gym Membership', amount: 800, category: 'Healthcare & Medical', paymentMethod: 'Debit Card', type: 'expense', date: '2026-07-14', isEssential: false, tags: ['fitness'] },
  { title: 'Uber Eats Dinner', amount: 620, category: 'Groceries & Dining', paymentMethod: 'Credit Card', type: 'expense', date: '2026-07-16', isEssential: false, tags: ['food', 'delivery'] },
  { title: 'Airtel Broadband', amount: 999, category: 'Utilities & Bills', paymentMethod: 'Bank Transfer', type: 'expense', date: '2026-07-18', isEssential: true, tags: ['internet'] },
  { title: 'Book Purchase', amount: 450, category: 'Education & Books', paymentMethod: 'Debit Card', type: 'expense', date: '2026-07-20', isEssential: true, tags: ['books'] },
  { title: 'Zomato Gold Subscription', amount: 299, category: 'Entertainment & Leisure', paymentMethod: 'Credit Card', type: 'expense', date: '2026-07-22', isEssential: false, tags: ['food', 'subscription'] },
  { title: 'UPI Transfer to Friend', amount: 500, category: 'Other', paymentMethod: 'UPI / Cash', type: 'expense', date: '2026-07-22', isEssential: false, tags: ['transfer'] },
];

export interface StatementRow extends ExtractedTransaction {
  id: string;
  isDuplicate?: boolean;
  selected: boolean;
}

export async function parseStatement(_file: File, existingTransactions: Transaction[]): Promise<StatementRow[]> {
  await new Promise((r) => setTimeout(r, 2200));
  return MOCK_ROWS.map((row, i) => {
    const isDuplicate = existingTransactions.some(
      (tx) => tx.title.toLowerCase() === row.title.toLowerCase() && Math.abs(tx.amount - row.amount) < 1
    );
    return {
      ...row,
      id: `import-${i}`,
      confidence: 85 + Math.floor(Math.random() * 14),
      source: 'statement' as const,
      isDuplicate,
      selected: !isDuplicate,
    };
  });
}

// ─── DUPLICATE CHECKER ────────────────────────────────────────────────────────
export function checkDuplicate(
  tx: { title: string; amount: number },
  existing: Transaction[]
): boolean {
  return existing.some(
    (e) => e.title.toLowerCase() === tx.title.toLowerCase() && Math.abs(e.amount - tx.amount) < 0.01
  );
}
