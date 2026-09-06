import * as XLSX from 'xlsx';
import { Person, Transaction, PersonWalletSummary, OverallStats, MarketPrices } from '../types';
import { getPersianFullDate } from './persianDate';

interface ExportOptions {
  people: Person[];
  transactions: Transaction[];
  summaries: PersonWalletSummary[];
  overallStats: OverallStats;
  marketPrices: MarketPrices;
  companyCopperStockKg?: number;
}

/**
 * Generates a comprehensive Multi-Sheet Excel workbook backup
 * containing:
 * 1. People Balances & Wallets Summary
 * 2. Full Detailed Ledger of All Transactions
 * 3. System Overview & Totals
 */
export function exportComprehensiveBackupToExcel({
  people,
  transactions,
  summaries,
  overallStats,
  marketPrices,
  companyCopperStockKg = 0,
}: ExportOptions): void {
  // Create workbook
  const workbook = XLSX.utils.book_new();

  const currentDatePersian = getPersianFullDate();
  const todayDateObj = new Date();
  const dateStr = todayDateObj.toISOString().slice(0, 10);

  // Map people by ID for quick lookup
  const peopleMap = new Map<string, Person>();
  people.forEach((p) => peopleMap.set(p.id, p));

  // Sort summaries alphabetically by name
  const sortedSummaries = [...summaries].sort((a, b) => 
    a.person.name.localeCompare(b.person.name, 'fa')
  );

  // -------------------------------------------------------------
  // Sheet 1: خلاصه حساب و کیف‌پول افراد (People Balances)
  // -------------------------------------------------------------
  const peopleRows = sortedSummaries.map((item, index) => {
    const cash = item.cashBalance;
    const cashStatus = cash > 0 ? 'بستانکار (طلبکار ریالی)' : cash < 0 ? 'بدهکار ریالی' : 'بی‌حساب';
    
    const stockKg = item.copperStockKg;
    const stockGrams = Math.round(stockKg * 1000);
    const stockStatus = stockKg > 0 ? 'دارای موجودی مس' : stockKg < 0 ? 'بدهکار مس' : 'بدون مس';

    return {
      'ردیف': index + 1,
      'نام و نام خانوادگی': item.person.name,
      'شماره تماس': item.person.phone || '-',
      'موجودی نقدی (تومان)': cash,
      'وضعیت نقدی': cashStatus,
      'موجودی مس (گرم)': stockGrams,
      'موجودی مس (کیلوگرم)': Number(stockKg.toFixed(3)),
      'وضعیت مس': stockStatus,
      'ارزش روز مس (تومان)': item.copperMarketValue,
      'مجموع ارزش دارایی (تومان)': item.totalAssetValue,
      'میانگین موزون خرید (تومان/کیلو)': item.weightedAvgBuyPrice || 0,
      'سود/زیان مس (تومان)': item.realizedProfit,
      'درصد سود مس': Number(item.profitPercentage.toFixed(2)),
      'کل خرید مس (کیلو)': Number(item.totalPurchasedKg.toFixed(3)),
      'کل مبلغ خرید مس (تومان)': item.totalPurchasedPrice,
      'کل فروش مس (کیلو)': Number(item.totalSoldKg.toFixed(3)),
      'کل مبلغ فروش مس (تومان)': item.totalSoldPrice,
      'کل واریز نقدی (تومان)': item.totalDeposited,
      'کل برداشت نقدی (تومان)': item.totalWithdrawn,
      'تعداد تراکنش‌ها': item.transactionsCount,
      'تراکنش‌های در انتظار': item.pendingApprovalsCount || 0,
      'تاریخ عضویت': item.person.createdAt ? new Date(item.person.createdAt).toLocaleDateString('fa-IR') : '-',
      'توضیحات و یادداشت': item.person.notes || '-',
    };
  });

  const peopleWorksheet = XLSX.utils.json_to_sheet(peopleRows);
  
  // Set column widths for People sheet
  peopleWorksheet['!cols'] = [
    { wch: 6 },  // ردیف
    { wch: 24 }, // نام
    { wch: 16 }, // شماره تماس
    { wch: 18 }, // موجودی نقدی
    { wch: 22 }, // وضعیت نقدی
    { wch: 14 }, // مس گرم
    { wch: 16 }, // مس کیلو
    { wch: 16 }, // وضعیت مس
    { wch: 18 }, // ارزش روز مس
    { wch: 20 }, // مجموع دارایی
    { wch: 24 }, // میانگین موزون خرید
    { wch: 16 }, // سود/زیان
    { wch: 12 }, // درصد سود
    { wch: 14 }, // خرید کیلو
    { wch: 18 }, // مبلغ خرید
    { wch: 14 }, // فروش کیلو
    { wch: 18 }, // مبلغ فروش
    { wch: 16 }, // واریز
    { wch: 16 }, // برداشت
    { wch: 12 }, // تعداد تراکنش
    { wch: 12 }, // در انتظار
    { wch: 12 }, // تاریخ
    { wch: 30 }, // توضیحات
  ];

  // Set Right-To-Left view for worksheet
  peopleWorksheet['!views'] = [{ RTL: true }];

  XLSX.utils.book_append_sheet(workbook, peopleWorksheet, 'مانده_حساب_افراد');

  // -------------------------------------------------------------
  // Sheet 2: دفتر کل ریز تراکنش‌ها (All Transactions Ledger)
  // -------------------------------------------------------------
  // Sort transactions by date or creation time descending
  const sortedTransactions = [...transactions].sort((a, b) => {
    const timeA = new Date(a.date || a.createdAt).getTime();
    const timeB = new Date(b.date || b.createdAt).getTime();
    return timeB - timeA;
  });

  const txTypeMap: Record<string, string> = {
    deposit: 'واریز وجه (شارژ نقدی)',
    withdrawal: 'برداشت وجه (تسویه نقدی)',
    buy: 'خرید مس',
    sell: 'فروش مس',
    adjustment: 'سند اصلاحی',
  };

  const statusMap: Record<string, string> = {
    approved: 'تأیید نهایی شده',
    pending: 'در انتظار تأیید مدیر',
    rejected: 'رد شده / لغو',
    draft: 'پیش‌نویس',
    topup_step1_pending_bank: 'در انتظار تخصیص حساب بانکی',
    topup_step2_awaiting_receipt: 'منتظر واریز و فیش مشتری',
    topup_step3_pending_approval: 'فیش ارسال شده (منتظر تایید مدیر)',
  };

  const paymentMethodMap: Record<string, string> = {
    cash: 'نقدی / حساب بانکی',
    cheque: 'چک صیادی',
  };

  const transactionRows = sortedTransactions.map((tx, index) => {
    const person = peopleMap.get(tx.personId);
    const personName = person?.name || 'نامشخص / حذف شده';
    const personPhone = person?.phone || '-';

    const weightKg = tx.weightKg || 0;
    const weightGrams = weightKg > 0 ? Math.round(weightKg * 1000) : 0;

    return {
      'ردیف': index + 1,
      'شناسه تراکنش': tx.id,
      'نام طرف حساب': personName,
      'شماره تماس': personPhone,
      'تاریخ سند': tx.date || '-',
      'نوع عملیات': txTypeMap[tx.type] || tx.type,
      'مبلغ تراکنش (تومان)': tx.amount || 0,
      'وزن مس (کیلوگرم)': weightKg > 0 ? Number(weightKg.toFixed(3)) : '-',
      'وزن مس (گرم)': weightGrams > 0 ? weightGrams : '-',
      'نرخ واحد مس (تومان/کیلو)': tx.unitPrice || '-',
      'سود/زیان معامله (تومان)': tx.profit !== undefined ? tx.profit : '-',
      'مانده نقدی پس از تراکنش': tx.cashBalanceAfter !== undefined ? tx.cashBalanceAfter : '-',
      'مانده مس پس از تراکنش (کیلو)': tx.copperStockAfter !== undefined ? Number(tx.copperStockAfter.toFixed(3)) : '-',
      'روش پرداخت': paymentMethodMap[tx.paymentMethod || 'cash'] || tx.paymentMethod || 'نقدی',
      'وضعیت سند': statusMap[tx.approvalStatus || 'approved'] || tx.approvalStatus || 'تأیید شده',
      'ثبت‌کننده': tx.registeredBy || 'سیستم',
      'تأییدکننده': tx.approvedBy || '-',
      'شماره رسید/پیگیری': tx.receiptNumber || '-',
      'تاریخ دقیق ایجاد': tx.createdAt ? new Date(tx.createdAt).toLocaleString('fa-IR') : '-',
      'توضیحات و بابت': tx.notes || '-',
    };
  });

  const txWorksheet = XLSX.utils.json_to_sheet(transactionRows);
  
  // Column widths for Transactions sheet
  txWorksheet['!cols'] = [
    { wch: 6 },  // ردیف
    { wch: 18 }, // شناسه
    { wch: 22 }, // نام
    { wch: 14 }, // تلفن
    { wch: 14 }, // تاریخ
    { wch: 22 }, // نوع عملیات
    { wch: 18 }, // مبلغ
    { wch: 16 }, // مس کیلو
    { wch: 14 }, // مس گرم
    { wch: 18 }, // نرخ هر کیلو
    { wch: 16 }, // سود/زیان
    { wch: 20 }, // مانده نقدی بعد
    { wch: 20 }, // مانده مس بعد
    { wch: 16 }, // روش پرداخت
    { wch: 20 }, // وضعیت سند
    { wch: 16 }, // ثبت‌کننده
    { wch: 16 }, // تأییدکننده
    { wch: 18 }, // شماره رسید
    { wch: 20 }, // تاریخ ثبت
    { wch: 35 }, // توضیحات
  ];

  txWorksheet['!views'] = [{ RTL: true }];

  XLSX.utils.book_append_sheet(workbook, txWorksheet, 'دفتر_کل_تراکنش‌ها');

  // -------------------------------------------------------------
  // Sheet 3: تراز کلی و مشخصات نسخه پشتیبان (System Overview)
  // -------------------------------------------------------------
  const summaryRows = [
    { 'عنوان شاخص': 'نام سامانه', 'مقدار': 'پلتفرم جامع معاملات مس واته (Waateh Copper Platform)' },
    { 'عنوان شاخص': 'تاریخ و زمان تهیه پشتیبان (شمسی)', 'مقدار': currentDatePersian },
    { 'عنوان شاخص': 'تاریخ میلادی گزارش', 'مقدار': new Date().toLocaleString() },
    { 'عنوان شاخص': 'تعداد کل طرف حساب‌ها و مشتریان', 'مقدار': people.length },
    { 'عنوان شاخص': 'تعداد مشتریان دارای موجودی مس', 'مقدار': overallStats.activeStockPeopleCount },
    { 'عنوان شاخص': 'مجموع کل نقدینگی و مانده ریالی افراد (تومان)', 'مقدار': overallStats.totalCashBalance },
    { 'عنوان شاخص': 'مجموع کل مس نزد مشتریان (کیلوگرم)', 'مقدار': overallStats.totalCopperStockKg },
    { 'عنوان شاخص': 'موجودی انبار مس شرکت (کیلوگرم)', 'مقدار': companyCopperStockKg },
    { 'عنوان شاخص': 'مجموع مس کل پلتفرم (کیلوگرم)', 'مقدار': Number((overallStats.totalCopperStockKg + companyCopperStockKg).toFixed(3)) },
    { 'عنوان شاخص': 'نرخ خرید مس در زمان بکاپ (تومان/کیلو)', 'مقدار': marketPrices.buyPrice },
    { 'عنوان شاخص': 'نرخ فروش مس در زمان بکاپ (تومان/کیلو)', 'مقدار': marketPrices.sellPrice },
    { 'عنوان شاخص': 'ارزش ریالی مس مشتریان به نرخ روز (تومان)', 'مقدار': overallStats.totalCopperMarketValue },
    { 'عنوان شاخص': 'مجموع کل دارایی‌های ریالی و وزنی (تومان)', 'مقدار': overallStats.totalAssetValue },
    { 'عنوان شاخص': 'کل سود/زیان محقق شده معاملات مس (تومان)', 'مقدار': overallStats.totalRealizedProfit },
    { 'عنوان شاخص': 'تعداد کل تراکنش‌های ثبت شده در سیستم', 'مقدار': transactions.length },
    { 'عنوان شاخص': 'تراکنش‌های در انتظار تأیید در کارتابل', 'مقدار': overallStats.pendingApprovalsCount || 0 },
  ];

  const overviewWorksheet = XLSX.utils.json_to_sheet(summaryRows);
  overviewWorksheet['!cols'] = [
    { wch: 38 },
    { wch: 45 },
  ];
  overviewWorksheet['!views'] = [{ RTL: true }];

  XLSX.utils.book_append_sheet(workbook, overviewWorksheet, 'تراز_کلی_سیستم');

  // Generate and trigger download
  const sanitizedDate = dateStr.replace(/[^0-9-]/g, '_');
  const fileName = `Waateh_Full_Backup_${sanitizedDate}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
