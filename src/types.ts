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

export type UserRole = 'admin' | 'staff' | 'client' | 'warehouse';

export interface AuthSession {
  role: UserRole;
  personId?: string; // If role === 'client', personId is set
  username?: string; // e.g. "مدیرعامل", "مسئول مس", "انباردار مس واته", or person name
  loginAt: string;
}

export type CopperPackagingType = 'coil' | 'straight' | 'spool'; // کلاف، شاخه، قرقره (رول حذف شد)

export type CoilLengthType = '15m' | '50m'; // کلاف ۱۵ متری و کلاف ۵۰ متری

export type SpoolPackagingType = 'pallet' | 'non_pallet'; // قرقره پالتی (با پالت) و قرقره غیر پالتی (فله/تکی)

export type CopperBrand = 'bahonar' | 'mehrasl' | 'ghaem' | 'babak' | 'asteria' | 'other'; // باهنر، مهراصل، قائم، بابک، استریا، سایر

export type WarehouseEntryType = 'inbound' | 'outbound'; // ورود به انبار (رسید)، خروج از انبار (حواله)

export interface WarehouseCargoItem {
  id: string;
  packagingType: CopperPackagingType; // 'coil' | 'straight' | 'spool'
  brand: string; // 'باهنر' | 'مهراصل' | 'قائم' | 'بابک' | 'استریا' | string
  thicknessMm: number; // 0.15 to 3.00 mm
  diameterInch: string; // e.g. "3/16", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8", "1", "1 1/8", ...
  diameterMm?: number;
  
  // Specific properties per packaging type:
  coilLength?: CoilLengthType; // '15m' | '50m' for coils
  straightMode?: 'total_weight' | 'count_and_weight'; // for straight branches
  spoolType?: SpoolPackagingType; // 'pallet' (پالتی) | 'non_pallet' (غیر پالتی / تکی)
  spoolWeights?: number[]; // Individual spool weights in kg (e.g. [210.5, 230, 245.2])
  spoolCondition?: 'sealed' | 'opened'; // وضعیت قرقره تکی: پلمپ / بسته یا باز شده (در حال مصرف)
  sourcePalletInfo?: string; // مشخصات پالت مبدا (مثلاً «پالت ۵ تایی باهنر بارنامه BAR-1403-9101»)
  
  quantity: number; // تعداد (تعداد کلاف، تعداد شاخه، تعداد قرقره)
  unitWeightKg?: number; // وزن تقریبی یا دقیق هر واحد (کیلوگرم)
  totalWeightKg: number; // مجموع وزن این قلم به کیلوگرم
  notes?: string;
}

export interface WarehouseItem {
  id: string;
  entryType: WarehouseEntryType; // 'inbound' (ورود) | 'outbound' (خروج)
  date: string; // e.g. "1403/12/10"
  time?: string; // e.g. "14:35:20"
  referenceDocNumber?: string; // شماره بارنامه، حواله یا قبض انبار
  targetPartyName?: string; // نام طرف‌حساب (مشتری، خریدار، فروشنده، کارخانه)
  driverName?: string; // نام راننده
  vehiclePlate?: string; // شماره پلاک خودرو
  registeredBy?: string; // e.g. "انباردار مس واته"
  notes?: string; // توضیحات کلی بارنامه
  createdAt: string;

  // Consignment items (چندین قلم در یک بارنامه / ماشین)
  items: WarehouseCargoItem[];
  totalWeightKg: number; // مجموع وزن کل محموله (کیلوگرم)
  totalItemsCount: number; // مجموع تعداد اقلام محموله

  // Backward compatibility legacy single item fields:
  packagingType?: CopperPackagingType;
  brand?: string;
  thicknessMm?: number;
  diameterInch?: string;
  quantity?: number;
  unitWeightKg?: number;
  coilLength?: CoilLengthType;
  spoolType?: SpoolPackagingType;
  spoolWeights?: number[];
}

export interface WarehouseInventorySummary {
  totalStockKg: number;
  totalCoils: number;
  totalCoils15m: number;
  totalCoils50m: number;
  totalStraights: number;
  totalSpools: number;
  totalSpoolsPallet: number; // تعداد قرقره‌های پالتی
  totalSpoolsNonPallet: number; // تعداد قرقره‌های غیر پالتی
  spoolPalletWeightKg: number; // مجموع وزن قرقره‌های پالتی
  spoolNonPalletWeightKg: number; // مجموع وزن قرقره‌های غیر پالتی
  brandBreakdown: Record<string, { weightKg: number; count: number }>;
  packagingBreakdown: Record<CopperPackagingType, { weightKg: number; count: number }>;
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
  time?: string; // exact time e.g. "14:35:22" or "14:35"
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
  saleCategory?: 'internal' | 'external'; // 'internal' (فروش به انبار شرکت - افزایش موجودی انبار), 'external' (فروش به خارج - بدون تغییر انبار)
  buyerName?: string; // نام شخص یا شرکت خریدار (مثال: شرکت مس واته یا آقای سهرابی)
  sellerName?: string; // نام شخص یا شرکت فروشنده (مثال: شرکت مس واته یا نام مشتری)
  counterpartyName?: string; // نام طرف معامله
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

