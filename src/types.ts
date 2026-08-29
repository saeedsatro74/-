export type TransactionType = 'deposit' | 'withdrawal' | 'buy' | 'sell' | 'adjustment';

export interface Person {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  personId: string;
  date: string; // e.g. "1403/12/10"
  type: TransactionType;
  amount: number; // in Toman (cash amount transferred or total buy/sell price)
  weightKg?: number; // for buy, sell, adjustment (in Kg)
  unitPrice?: number; // for buy, sell (price per Kg in Toman)
  cogs?: number; // Cost of Goods Sold (for sell transactions)
  profit?: number; // Realized profit on this sale (for sell transactions)
  profitPercentage?: number; // Profit percentage on this sale
  cashBalanceAfter?: number; // Cash balance snapshot after this transaction
  copperStockAfter?: number; // Copper stock snapshot after this transaction
  notes?: string;
  createdAt: string;
}

export interface PersonWalletSummary {
  person: Person;
  cashBalance: number; // موجودی ریالی فعلی (تومان)
  copperStockKg: number; // موجودی مس فعلی (کیلوگرم)
  copperMarketValue: number; // ارزش مس بر اساس قیمت روز = copperStockKg * marketPrice
  totalAssetValue: number; // مجموع دارایی = cashBalance + copperMarketValue
  totalDeposited: number; // مجموع کل واریزی‌ها
  totalWithdrawn: number; // مجموع کل برداشت‌ها
  totalPurchasedPrice: number; // مجموع مبالغ خریدهای مس
  totalPurchasedKg: number; // مجموع وزن مس خریداری‌شده
  totalSoldPrice: number; // مجموع مبالغ فروش‌های مس
  totalSoldKg: number; // مجموع وزن مس فروخته‌شده
  realizedProfit: number; // سود واقعی محقق شده (اختلاف فروش و بهای تمام شده)
  profitPercentage: number; // درصد سود واقعی
  weightedAvgBuyPrice: number; // میانگین موزون قیمت خرید هر کیلو
  transactionsCount: number;
}

export interface OverallStats {
  totalCashBalance: number; // کل موجودی ریالی همه افراد
  totalCopperStockKg: number; // مجموع مس موجود در انبار
  totalCopperMarketValue: number; // ارزش فعلی کل مس
  totalAssetValue: number; // مجموع کل دارایی‌ها (ریالی + ارزش مس)
  totalRealizedProfit: number; // مجموع سود واقعی
  overallProfitPercentage: number; // درصد سود کل
  totalPeopleCount: number; // تعداد کل افراد
  activeStockPeopleCount: number; // افراد دارای موجودی مس
  totalPurchasedPrice: number; // مجموع کل خریدها
  totalPurchasedKg: number; // مجموع کل مس خریداری‌شده
  totalSoldPrice: number; // مجموع کل فروش‌ها
  totalSoldKg: number; // مجموع کل مس فروخته‌شده
  marketCopperPrice: number; // قیمت مرجع فعلی هر کیلو مس در بازار
}

export type FilterStatus = 'all' | 'has_cash' | 'has_stock' | 'has_asset';

export type SortField = 'name' | 'cash' | 'stock' | 'copperValue' | 'totalAsset' | 'profit' | 'date';
export type SortOrder = 'asc' | 'desc';
