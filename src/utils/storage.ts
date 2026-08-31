import { Person, Transaction, PersonWalletSummary, OverallStats, MarketPrices } from '../types';

const STORAGE_KEYS = {
  PEOPLE: 'copper_wallet_people_v2',
  TRANSACTIONS: 'copper_wallet_transactions_v2',
  MARKET_PRICE: 'copper_wallet_market_price_v2',
  MARKET_PRICES: 'copper_wallet_market_prices_v3',
  ADMIN_PASSWORD: 'waateh_admin_password_v1',
  STAFF_PASSWORD: 'waateh_staff_password_v1',
};

export const DEFAULT_ADMIN_PASSWORD = 'milad@68';
export const DEFAULT_STAFF_PASSWORD = 'staff123';

export function getStoredAdminPassword(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_PASSWORD) || DEFAULT_ADMIN_PASSWORD;
  } catch {
    return DEFAULT_ADMIN_PASSWORD;
  }
}

export function saveAdminPassword(pass: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ADMIN_PASSWORD, pass.trim());
  } catch (e) {
    console.error('Failed to save admin password', e);
  }
}

export function getStoredStaffPassword(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.STAFF_PASSWORD) || DEFAULT_STAFF_PASSWORD;
  } catch {
    return DEFAULT_STAFF_PASSWORD;
  }
}

export function saveStaffPassword(pass: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STAFF_PASSWORD, pass.trim());
  } catch (e) {
    console.error('Failed to save staff password', e);
  }
}

export const DEFAULT_MARKET_BUY_PRICE = 3000000; // 3,000,000 Toman per Kg
export const DEFAULT_MARKET_SELL_PRICE = 2850000; // 2,850,000 Toman per Kg (150,000 Toman less)
export const DEFAULT_MARKET_COPPER_PRICE = DEFAULT_MARKET_BUY_PRICE;

// Realistic Seed People
const INITIAL_PEOPLE: Person[] = [
  {
    id: 'p-ali',
    name: 'علی رضایی',
    phone: '09121113344',
    notes: 'پروژه نمونه کیف پول و معاملات مس',
    createdAt: '1403/11/01',
  },
  {
    id: 'p-reza',
    name: 'حاج رضا احمدی (تاسیسات قائم)',
    phone: '09122224455',
    notes: 'تامین کننده لوله های مهراصل و باهنر',
    createdAt: '1403/11/05',
  },
  {
    id: 'p-hoseini',
    name: 'مهندس حسینی (پیمانکار چیلر)',
    phone: '09123335566',
    notes: 'لوله مسی کلاف و شاخه ای ضخامت ۰.۸۱',
    createdAt: '1403/11/10',
  },
  {
    id: 'p-karimi',
    name: 'علی کریمی (فروشگاه برودت)',
    phone: '09125557788',
    notes: 'فروش کامل و تسویه مس',
    createdAt: '1403/11/15',
  },
  {
    id: 'p-alborz',
    name: 'شرکت سرمایش البرز (محمودی)',
    phone: '02188997766',
    notes: 'سرمایه‌گذاری عمده لوله مسی سنگین',
    createdAt: '1403/11/20',
  },
];

// Initial Transactions showcasing real wallet workflow
const INITIAL_TRANSACTIONS: Transaction[] = [
  // --- علی رضایی (Exact example from user prompt) ---
  // مرحله ۱: واریز ۱۰۰ میلیون تومان
  {
    id: 'tx-ali-1',
    personId: 'p-ali',
    date: '1403/11/01',
    type: 'deposit',
    amount: 100000000,
    cashBalanceAfter: 100000000,
    copperStockAfter: 0,
    notes: 'واریز اولیه سرمایه به حساب',
    createdAt: '1403-11-01T08:00:00.000Z',
  },
  // مرحله ۲: خرید مس به مبلغ ۵۰ میلیون تومان (۱۰۰ کیلو با نرخ ۵۰۰ هزار تومان)
  {
    id: 'tx-ali-2',
    personId: 'p-ali',
    date: '1403/11/05',
    type: 'buy',
    amount: 50000000,
    weightKg: 100,
    unitPrice: 500000,
    cashBalanceAfter: 50000000,
    copperStockAfter: 100,
    notes: 'خرید ۱۰۰ کیلو لوله مسی',
    createdAt: '1403-11-05T09:30:00.000Z',
  },
  // مرحله ۳: فروش ۴۰ کیلو مس به مبلغ ۲۴ میلیون تومان (با نرخ ۶۰۰ هزار تومان)
  // بهای تمام شده = ۴۰ * ۵۰۰,۰۰۰ = ۲۰,۰۰۰,۰۰۰ تومان => سود = ۴,۰۰۰,۰۰۰ تومان
  {
    id: 'tx-ali-3',
    personId: 'p-ali',
    date: '1403/11/12',
    type: 'sell',
    amount: 24000000,
    weightKg: 40,
    unitPrice: 600000,
    cogs: 20000000,
    profit: 4000000,
    profitPercentage: 20,
    cashBalanceAfter: 74000000,
    copperStockAfter: 60,
    notes: 'فروش ۴۰ کیلو مس به پروژه',
    createdAt: '1403-11-12T11:00:00.000Z',
  },

  // --- حاج رضا احمدی ---
  {
    id: 'tx-reza-1',
    personId: 'p-reza',
    date: '1403/11/05',
    type: 'deposit',
    amount: 350000000,
    cashBalanceAfter: 350000000,
    copperStockAfter: 0,
    notes: 'واریز نقدی وجه سرمایه‌گذاری مس',
    createdAt: '1403-11-05T10:00:00.000Z',
  },
  {
    id: 'tx-reza-2',
    personId: 'p-reza',
    date: '1403/11/08',
    type: 'buy',
    amount: 130000000,
    weightKg: 200,
    unitPrice: 650000,
    cashBalanceAfter: 220000000,
    copperStockAfter: 200,
    notes: 'خرید پارت اول لوله مهراصل',
    createdAt: '1403-11-08T11:00:00.000Z',
  },
  {
    id: 'tx-reza-3',
    personId: 'p-reza',
    date: '1403/11/15',
    type: 'buy',
    amount: 102000000,
    weightKg: 150,
    unitPrice: 680000,
    cashBalanceAfter: 118000000,
    copperStockAfter: 350,
    notes: 'خرید پارت دوم کلاف مسی',
    createdAt: '1403-11-15T14:00:00.000Z',
  },
  {
    id: 'tx-reza-4',
    personId: 'p-reza',
    date: '1403/11/22',
    type: 'sell',
    amount: 136800000,
    weightKg: 180,
    unitPrice: 760000,
    cogs: 119314285,
    profit: 17485715,
    profitPercentage: 14.65,
    cashBalanceAfter: 254800000,
    copperStockAfter: 170,
    notes: 'فروش به پروژه سپید فاز ۱',
    createdAt: '1403-11-22T16:00:00.000Z',
  },

  // --- مهندس حسینی ---
  {
    id: 'tx-hos-1',
    personId: 'p-hoseini',
    date: '1403/11/10',
    type: 'deposit',
    amount: 500000000,
    cashBalanceAfter: 500000000,
    copperStockAfter: 0,
    notes: 'شارژ کیف پول جهت خرید لوله چیلر',
    createdAt: '1403-11-10T09:00:00.000Z',
  },
  {
    id: 'tx-hos-2',
    personId: 'p-hoseini',
    date: '1403/11/14',
    type: 'buy',
    amount: 268000000,
    weightKg: 400,
    unitPrice: 670000,
    cashBalanceAfter: 232000000,
    copperStockAfter: 400,
    notes: 'خرید لوله باهنر سایز ۵/۸',
    createdAt: '1403-11-14T12:00:00.000Z',
  },
  {
    id: 'tx-hos-3',
    personId: 'p-hoseini',
    date: '1403/11/28',
    type: 'sell',
    amount: 187500000,
    weightKg: 250,
    unitPrice: 750000,
    cogs: 167500000,
    profit: 20000000,
    profitPercentage: 11.94,
    cashBalanceAfter: 419500000,
    copperStockAfter: 150,
    notes: 'فروش پارت اول لوله چیلر',
    createdAt: '1403-11-28T15:00:00.000Z',
  },

  // --- علی کریمی ---
  {
    id: 'tx-kar-1',
    personId: 'p-karimi',
    date: '1403/11/15',
    type: 'deposit',
    amount: 150000000,
    cashBalanceAfter: 150000000,
    copperStockAfter: 0,
    notes: 'واریز وجه خرید و فروش',
    createdAt: '1403-11-15T10:00:00.000Z',
  },
  {
    id: 'tx-kar-2',
    personId: 'p-karimi',
    date: '1403/11/16',
    type: 'buy',
    amount: 115200000,
    weightKg: 180,
    unitPrice: 640000,
    cashBalanceAfter: 34800000,
    copperStockAfter: 180,
    notes: 'خرید ۱۸۰ کیلو مس',
    createdAt: '1403-11-16T11:00:00.000Z',
  },
  {
    id: 'tx-kar-3',
    personId: 'p-karimi',
    date: '1403/11/26',
    type: 'sell',
    amount: 133200000,
    weightKg: 180,
    unitPrice: 740000,
    cogs: 115200000,
    profit: 18000000,
    profitPercentage: 15.62,
    cashBalanceAfter: 168000000,
    copperStockAfter: 0,
    notes: 'فروش کل موجودی و تسویه مس',
    createdAt: '1403-11-26T17:00:00.000Z',
  },

  // --- شرکت سرمایش البرز (Large numbers: 1 Billion Toman) ---
  {
    id: 'tx-alb-1',
    personId: 'p-alborz',
    date: '1403/11/20',
    type: 'deposit',
    amount: 1000000000, // ۱ میلیارد تومان
    cashBalanceAfter: 1000000000,
    copperStockAfter: 0,
    notes: 'سرمایه‌گذاری ۱ میلیارد تومانی شرکت',
    createdAt: '1403-11-20T09:00:00.000Z',
  },
  {
    id: 'tx-alb-2',
    personId: 'p-alborz',
    date: '1403/11/25',
    type: 'buy',
    amount: 408000000, // ۴۰۸ میلیون تومان
    weightKg: 600,
    unitPrice: 680000,
    cashBalanceAfter: 592000000,
    copperStockAfter: 600,
    notes: 'خرید ۶۰۰ کیلوگرم مس ضخامت بالا',
    createdAt: '1403-11-25T13:00:00.000Z',
  },
];

// --- Storage API ---

export function getStoredPeople(): Person[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PEOPLE);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.PEOPLE, JSON.stringify(INITIAL_PEOPLE));
      return INITIAL_PEOPLE;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_PEOPLE;
  }
}

export function savePeople(people: Person[]): void {
  localStorage.setItem(STORAGE_KEYS.PEOPLE, JSON.stringify(people));
}

export function getStoredTransactions(): Transaction[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
      return INITIAL_TRANSACTIONS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_TRANSACTIONS;
  }
}

export function saveTransactions(transactions: Transaction[]): void {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
}

export function getStoredMarketPrices(): MarketPrices {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MARKET_PRICES);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed.buyPrice === 'number' && parsed.buyPrice > 0) {
        return {
          buyPrice: parsed.buyPrice,
          sellPrice: typeof parsed.sellPrice === 'number' && parsed.sellPrice > 0 
            ? parsed.sellPrice 
            : Math.max(0, parsed.buyPrice - 150000),
        };
      }
    }
    
    // Fallback to legacy single price if exists
    const legacyData = localStorage.getItem(STORAGE_KEYS.MARKET_PRICE);
    if (legacyData) {
      const val = JSON.parse(legacyData);
      if (typeof val === 'number' && val > 0) {
        return {
          buyPrice: val,
          sellPrice: Math.max(0, val - 150000),
        };
      }
    }

    return {
      buyPrice: DEFAULT_MARKET_BUY_PRICE,
      sellPrice: DEFAULT_MARKET_SELL_PRICE,
    };
  } catch {
    return {
      buyPrice: DEFAULT_MARKET_BUY_PRICE,
      sellPrice: DEFAULT_MARKET_SELL_PRICE,
    };
  }
}

export function saveMarketPrices(prices: MarketPrices): void {
  localStorage.setItem(STORAGE_KEYS.MARKET_PRICES, JSON.stringify(prices));
  // Keep legacy single key synced with buy price
  localStorage.setItem(STORAGE_KEYS.MARKET_PRICE, JSON.stringify(prices.buyPrice));
}

export function getStoredMarketPrice(): number {
  return getStoredMarketPrices().buyPrice;
}

export function saveMarketPrice(price: number): void {
  const current = getStoredMarketPrices();
  saveMarketPrices({
    buyPrice: price,
    sellPrice: current.sellPrice > 0 ? current.sellPrice : Math.max(0, price - 150000),
  });
}

export function resetToSampleData(): { people: Person[]; transactions: Transaction[]; marketPrice: number } {
  localStorage.setItem(STORAGE_KEYS.PEOPLE, JSON.stringify(INITIAL_PEOPLE));
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
  localStorage.setItem(STORAGE_KEYS.MARKET_PRICE, JSON.stringify(DEFAULT_MARKET_COPPER_PRICE));
  return {
    people: INITIAL_PEOPLE,
    transactions: INITIAL_TRANSACTIONS,
    marketPrice: DEFAULT_MARKET_COPPER_PRICE,
  };
}

export function clearAllData(): void {
  localStorage.setItem(STORAGE_KEYS.PEOPLE, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
}

/**
 * Recalculate full ledger history for a list of transactions of a single person or all transactions.
 * Guarantees zero balance corruption on add, edit, or delete!
 */
export function replayAndCalculatePersonLedger(
  personId: string,
  allTransactions: Transaction[]
): {
  recalculatedTransactions: Transaction[];
  summary: Omit<PersonWalletSummary, 'person' | 'copperMarketValue' | 'totalAssetValue'>;
} {
  // Filter for this person and sort chronologically
  const personTxs = allTransactions
    .filter((tx) => tx.personId === personId)
    .sort((a, b) => {
      // Sort primarily by date, then by createdAt timestamp
      const dateCmp = (a.date || '').localeCompare(b.date || '');
      if (dateCmp !== 0) return dateCmp;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

  let runningCashBalance = 0;
  let runningCopperStockKg = 0;
  let runningWeightedCostPerKg = 0;
  let totalRealizedProfit = 0;

  let totalDeposited = 0;
  let totalWithdrawn = 0;
  let totalPurchasedPrice = 0;
  let totalPurchasedKg = 0;
  let totalSoldPrice = 0;
  let totalSoldKg = 0;

  let pendingChequesCount = 0;
  let pendingChequesTotalAmount = 0;
  let pendingApprovalsCount = 0;

  const recalculatedTransactions: Transaction[] = [];

  for (const rawTx of personTxs) {
    const tx: Transaction = { ...rawTx };
    const amount = Number(tx.amount) || 0;
    const weight = Number(tx.weightKg) || 0;
    const status = tx.approvalStatus || 'approved'; // Default legacy to approved

    // Always record snapshots of balance BEFORE this transaction
    tx.cashBalanceBefore = Math.round(runningCashBalance);
    tx.copperStockBefore = Number(runningCopperStockKg.toFixed(3));

    // Track pending transactions awaiting CEO approval
    if (status === 'pending') {
      pendingApprovalsCount += 1;
    }

    // NON-APPROVED transactions (pending, draft, rejected) MUST NOT affect balances or ledger stats
    if (status !== 'approved') {
      tx.cashBalanceAfter = Math.round(runningCashBalance);
      tx.copperStockAfter = Number(runningCopperStockKg.toFixed(3));
      recalculatedTransactions.push(tx);
      continue;
    }

    // --- Only APPROVED transactions update balances and stock ---

    // Track pending cheques for approved sales
    if (tx.type === 'sell' && tx.paymentMethod === 'cheque') {
      if (!tx.chequeStatus || tx.chequeStatus === 'pending') {
        pendingChequesCount += 1;
        pendingChequesTotalAmount += amount;
      }
    }

    switch (tx.type) {
      case 'deposit': {
        runningCashBalance += amount;
        totalDeposited += amount;
        break;
      }
      case 'withdrawal': {
        runningCashBalance -= amount;
        totalWithdrawn += amount;
        break;
      }
      case 'buy': {
        runningCashBalance -= amount;
        totalPurchasedPrice += amount;
        totalPurchasedKg += weight;

        // Update weighted average buy cost
        const prevTotalValue = runningCopperStockKg * runningWeightedCostPerKg;
        const newTotalValue = prevTotalValue + amount;
        const newTotalStock = runningCopperStockKg + weight;

        runningCopperStockKg = newTotalStock;
        runningWeightedCostPerKg = newTotalStock > 0 ? newTotalValue / newTotalStock : 0;
        break;
      }
      case 'sell': {
        // Cash balance only increases if payment is cash OR if the cheque has been CLEARED (پاس شده)
        const isCashOrClearedCheque = tx.paymentMethod !== 'cheque' || tx.chequeStatus === 'cleared';
        if (isCashOrClearedCheque) {
          runningCashBalance += amount;
        }

        totalSoldPrice += amount;
        totalSoldKg += weight;

        // Calculate COGS and Profit based on weighted average buy price at time of sale
        const cogs = Math.round(weight * runningWeightedCostPerKg);
        const profit = Math.round(amount - cogs);
        const profitPercentage = cogs > 0 ? (profit / cogs) * 100 : 0;

        tx.cogs = cogs;
        tx.profit = profit;
        tx.profitPercentage = profitPercentage;

        totalRealizedProfit += profit;
        runningCopperStockKg = Math.max(0, runningCopperStockKg - weight);
        // If stock hits 0, runningWeightedCostPerKg can remain or reset to last unit price
        break;
      }
      case 'adjustment': {
        // Adjustments can adjust cash or stock
        if (amount) {
          runningCashBalance += amount;
        }
        if (weight) {
          runningCopperStockKg += weight;
        }
        break;
      }
    }

    tx.cashBalanceAfter = Math.round(runningCashBalance);
    tx.copperStockAfter = Number(runningCopperStockKg.toFixed(3));

    recalculatedTransactions.push(tx);
  }

  // Calculate profit percentage
  const profitPercentage = totalPurchasedPrice > 0 
    ? (totalRealizedProfit / totalPurchasedPrice) * 100 
    : 0;

  return {
    recalculatedTransactions,
    summary: {
      cashBalance: Math.round(runningCashBalance),
      copperStockKg: Number(runningCopperStockKg.toFixed(3)),
      totalDeposited,
      totalWithdrawn,
      totalPurchasedPrice,
      totalPurchasedKg,
      totalSoldPrice,
      totalSoldKg,
      realizedProfit: Math.round(totalRealizedProfit),
      profitPercentage,
      weightedAvgBuyPrice: Math.round(runningWeightedCostPerKg),
      transactionsCount: recalculatedTransactions.length,
      pendingChequesCount,
      pendingChequesTotalAmount,
      hasUnclearedCheques: pendingChequesCount > 0,
      pendingApprovalsCount,
    },
  };
}

/**
 * Compute Person Wallet Summary including Market Value
 */
export function calculatePersonSummary(
  person: Person,
  transactions: Transaction[],
  marketCopperPrice: number
): PersonWalletSummary {
  const { summary } = replayAndCalculatePersonLedger(person.id, transactions);
  const copperMarketValue = Math.round(summary.copperStockKg * marketCopperPrice);
  const totalAssetValue = summary.cashBalance + copperMarketValue;

  return {
    person,
    ...summary,
    copperMarketValue,
    totalAssetValue,
  };
}

/**
 * Replay entire transaction store and update all transaction snapshots
 */
export function replayAllTransactions(
  people: Person[],
  transactions: Transaction[]
): Transaction[] {
  const replayedMap = new Map<string, Transaction>();
  
  for (const p of people) {
    const { recalculatedTransactions } = replayAndCalculatePersonLedger(p.id, transactions);
    for (const tx of recalculatedTransactions) {
      replayedMap.set(tx.id, tx);
    }
  }

  // Keep any remaining or return sorted
  return transactions.map((t) => replayedMap.get(t.id) || t);
}

/**
 * Calculate Global Dashboard Statistics
 */
export function calculateOverallStats(
  summaries: PersonWalletSummary[],
  marketPricesInput: MarketPrices | number
): OverallStats {
  const buyPrice = typeof marketPricesInput === 'number' 
    ? marketPricesInput 
    : (marketPricesInput?.buyPrice || DEFAULT_MARKET_BUY_PRICE);
  const sellPrice = typeof marketPricesInput === 'number' 
    ? Math.max(0, marketPricesInput - 150000) 
    : (marketPricesInput?.sellPrice || DEFAULT_MARKET_SELL_PRICE);
  const marketCopperPrice = buyPrice; // Valuation reference

  const totalCashBalance = summaries.reduce((sum, s) => sum + s.cashBalance, 0);
  const totalCopperStockKg = summaries.reduce((sum, s) => sum + s.copperStockKg, 0);
  const totalCopperMarketValue = Math.round(totalCopperStockKg * marketCopperPrice);
  const totalAssetValue = totalCashBalance + totalCopperMarketValue;
  const totalRealizedProfit = summaries.reduce((sum, s) => sum + s.realizedProfit, 0);
  const totalPurchasedPrice = summaries.reduce((sum, s) => sum + s.totalPurchasedPrice, 0);
  const totalPurchasedKg = summaries.reduce((sum, s) => sum + s.totalPurchasedKg, 0);
  const totalSoldPrice = summaries.reduce((sum, s) => sum + s.totalSoldPrice, 0);
  const totalSoldKg = summaries.reduce((sum, s) => sum + s.totalSoldKg, 0);

  const overallProfitPercentage = totalPurchasedPrice > 0 
    ? (totalRealizedProfit / totalPurchasedPrice) * 100 
    : 0;

  const totalPeopleCount = summaries.length;
  const activeStockPeopleCount = summaries.filter((s) => s.copperStockKg > 0).length;
  const pendingApprovalsCount = summaries.reduce((sum, s) => sum + (s.pendingApprovalsCount || 0), 0);

  return {
    totalCashBalance,
    totalCopperStockKg: Number(totalCopperStockKg.toFixed(3)),
    totalCopperMarketValue,
    totalAssetValue,
    totalRealizedProfit,
    overallProfitPercentage,
    totalPeopleCount,
    activeStockPeopleCount,
    totalPurchasedPrice,
    totalPurchasedKg,
    totalSoldPrice,
    totalSoldKg,
    marketCopperPrice,
    marketBuyPrice: buyPrice,
    marketSellPrice: sellPrice,
    pendingApprovalsCount,
  };
}
