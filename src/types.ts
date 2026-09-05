export type TransactionType = 'deposit' | 'withdrawal' | 'buy' | 'sell' | 'adjustment';

export type PaymentMethod = 'cash' | 'cheque';
export type ChequeStatus = 'pending' | 'cleared' | 'bounced';
export type ApprovalStatus = 
  | 'draft' 
  | 'pending' 
  | 'topup_step1_pending_bank'     // مرحله ۱: ثبت درخواست شارژ توسط مشتری، منتظر اختصاص شماره حساب/شبا توسط مدیرعامل
  | 'topup_step2_awaiting_receipt'   // مرحله ۲: اختصاص شماره حساب/شبا توسط مدیرعامل، منتظر واریز و بارگذاری فیش توسط مشتری
  | 'topup_step3_pending_approval'   // مرحله ۳: بارگذاری فیش واریزی و کد پیگیری توسط مشتری، منتظر بررسی نهایی مدیرعامل
  | 'approved'                       // مرحله ۴: تأیید نهایی توسط مدیرعامل و شارژ موجودی کیف پول
  | 'rejected';

export type UserRole = 'admin' | 'staff' | 'client';

export interface AuthSession {
  role: UserRole;
  personId?: string; // If role === 'client', personId is set
  username?: string; // e.g. "مدیرعامل", "مسئول مس", or person name
  loginAt: string;
}

export interface Person {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  password?: string; // Optional client-specific login password (default is last 4 digits of phone or 1234)
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
  cashBalanceBefore?: number; // Cash balance snapshot before this transaction
  cashBalanceAfter?: number; // Cash balance snapshot after this transaction
  copperStockBefore?: number; // Copper stock snapshot before this transaction
  copperStockAfter?: number; // Copper stock snapshot after this transaction
  notes?: string;
  createdAt: string;
  // CEO Approval Workflow Fields
  approvalStatus?: ApprovalStatus; // 'draft' | 'pending' | 'topup_step1_pending_bank' | ...
  registeredBy?: string; // e.g. "مسئول مس" or "مشتری"
  approvedBy?: string; // e.g. "مدیرعامل"
  saleCategory?: 'internal' | 'external'; // 'internal' (فروش داخلی / واریز به انبار شرکت), 'external' (فروش خارجی / خروج از انبار شرکت)
  approvedAt?: string; // e.g. "1403/12/10 ساعت 14:35"
  rejectionReason?: string; // e.g. "قیمت خرید اشتباه وارد شده است."
  receiptNumber?: string; // e.g. "REC-140312-8419"
  receiptImageUrl?: string; // Base64 data URL of uploaded bank receipt photo
  // 4-Step Top-up Assigned Bank Details
  assignedBankName?: string;
  assignedOwnerName?: string;
  assignedCardNumber?: string;
  assignedIbanNumber?: string;
  assignedBankNote?: string;
  // Cheque System Fields
  paymentMethod?: PaymentMethod; // 'cash' | 'cheque' (default 'cash')
  chequeNumber?: string; // شماره صیادی یا سریال چک
  chequeDueDate?: string; // تاریخ سررسید چک (مثال: 1403/12/25)
  chequeBank?: string; // نام بانک صادرکننده چک (مثال: ملی، ملت، صادرات)
  chequeStatus?: ChequeStatus; // 'pending' (در انتظار وصول) | 'cleared' (پاس شده) | 'bounced' (برگشت خورده)
  chequeClearedDate?: string; // تاریخ پاس شدن چک
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
  // Cheque Summary Fields
  pendingChequesCount: number; // تعداد چک‌های پاس نشده
  pendingChequesTotalAmount: number; // جمع مبلغ چک‌های پاس نشده
  hasUnclearedCheques: boolean; // آیا چک پاس نشده دارد (که مانع خرید جدید می‌شود)
  // Approval Summary Fields
  pendingApprovalsCount: number; // تعداد معاملات در انتظار تأیید مدیرعامل
  pendingReservedCash?: number; // مبلغ ریالی در انتظار تأیید برای خرید یا برداشت مس
  pendingDepositCash?: number; // مبلغ ریالی شارژ حساب در انتظار تأیید
  availableCashBalance?: number; // مانده ریالی آزاد و قابل استفاده (موجودی منهای درخواست‌های در جریان)
}

export interface MarketPrices {
  buyPrice: number; // e.g. 3,000,000 تومان
  sellPrice: number; // e.g. 2,850,000 تومان
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
  marketCopperPrice: number; // قیمت مرجع فعلی هر کیلو مس در بازار (ارزش‌گذاری)
  marketBuyPrice: number; // قیمت مرجع خرید مس
  marketSellPrice: number; // قیمت مرجع فروش مس
  pendingApprovalsCount: number; // مجموع کل معاملات منتظر تأیید مدیرعامل در کل سیستم
}

export type FilterStatus = 'all' | 'has_cash' | 'has_stock' | 'has_asset';

export type SortField = 'name' | 'cash' | 'stock' | 'copperValue' | 'totalAsset' | 'profit' | 'date';
export type SortOrder = 'asc' | 'desc';

export interface CompanyBankAccount {
  id: string;
  bankName: string; // e.g. "بانک ملی ایران"
  ownerName: string; // e.g. "شرکت بازرگانی مس واته (مدیریت رضایی)"
  cardNumber: string; // e.g. "6037-9979-1234-5678"
  ibanNumber: string; // e.g. "IR980170000000123456789001"
  rawCardNumber?: string;
  formattedIban?: string;
  isDefault?: boolean;
}

export interface CompanyBankInfo extends CompanyBankAccount {}

export interface ChatMessage {
  id: string;
  personId: string; // The client ID this chat belongs to
  senderRole: UserRole; // 'admin' | 'staff' | 'client'
  senderName: string;
  text: string;
  createdAt: string; // ISO date or formatted time
  isReadByAdmin?: boolean;
  isReadByClient?: boolean;
  imageUrl?: string;
}

