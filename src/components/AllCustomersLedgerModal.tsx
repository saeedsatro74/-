import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Download,
  FileText,
  Search,
  Filter,
  Users,
  Wallet,
  Boxes,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  Phone,
  BookOpen,
  SlidersHorizontal,
  ChevronDown,
  CreditCard
} from 'lucide-react';
import { Person, Transaction, MarketPrices } from '../types';
import {
  replayAndCalculatePersonLedger,
  calculatePersonSummary,
  calculateOverallStats,
  getStoredCompanyCopperStock
} from '../utils/storage';
import { formatNumber, formatToman, formatWeight, formatPercent } from '../utils/formatters';
import {
  getTodayJalaliString,
  getPersianFullDate,
  getPersianDateRelativeInfo,
  getPersianDayOfWeek,
  getRelativePersianDays
} from '../utils/persianDate';

interface AllCustomersLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  transactions: Transaction[];
  marketPrices: MarketPrices;
}

export const AllCustomersLedgerModal: React.FC<AllCustomersLedgerModalProps> = ({
  isOpen,
  onClose,
  people,
  transactions,
  marketPrices,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'with_transactions' | 'all'>('with_transactions');
  const [sortOrder, setSortOrder] = useState<'alphabetical' | 'tx_count' | 'cash_balance'>('alphabetical');
  const [orderDirection, setOrderDirection] = useState<'desc' | 'asc'>('desc'); // for transactions inside each person

  const printableContainerRef = useRef<HTMLDivElement>(null);
  const customerSectionsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  const issueDate = useMemo(() => getTodayJalaliString(), []);
  const fullPersianDate = useMemo(() => getPersianFullDate(), []);
  const marketCopperPrice = marketPrices.buyPrice || 3000000;

  // Calculate ledger and summary for each person
  const customersLedgerList = useMemo(() => {
    return people.map((person) => {
      const ledger = replayAndCalculatePersonLedger(person.id, transactions);
      const copperMarketValue = Math.round(ledger.summary.copperStockKg * marketCopperPrice);
      const totalAssetValue = ledger.summary.cashBalance + copperMarketValue;

      // Filter/sort transactions for this person
      let txs = [...ledger.recalculatedTransactions];
      if (orderDirection === 'desc') {
        txs.reverse(); // Newest first (like PersonDetailModal in screenshot)
      }

      return {
        person,
        summary: ledger.summary,
        copperMarketValue,
        totalAssetValue,
        transactions: txs,
        rawTransactionsCount: ledger.recalculatedTransactions.length,
      };
    });
  }, [people, transactions, marketCopperPrice, orderDirection]);

  // Filter and sort the customers list
  const filteredCustomers = useMemo(() => {
    return customersLedgerList
      .filter((item) => {
        // Filter by transaction existence if chosen
        if (filterMode === 'with_transactions' && item.rawTransactionsCount === 0) {
          return false;
        }

        // Search term filter (name or phone)
        if (searchTerm.trim()) {
          const term = searchTerm.trim().toLowerCase();
          const matchName = item.person.name.toLowerCase().includes(term);
          const matchPhone = (item.person.phone || '').toLowerCase().includes(term);
          if (!matchName && !matchPhone) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'alphabetical') {
          return a.person.name.localeCompare(b.person.name, 'fa');
        } else if (sortOrder === 'tx_count') {
          return b.rawTransactionsCount - a.rawTransactionsCount;
        } else if (sortOrder === 'cash_balance') {
          return b.summary.cashBalance - a.summary.cashBalance;
        }
        return 0;
      });
  }, [customersLedgerList, filterMode, searchTerm, sortOrder]);

  // Overall totals for the active filtered list
  const overallFilteredTotals = useMemo(() => {
    let totalCash = 0;
    let totalCopperKg = 0;
    let totalAsset = 0;
    let totalTxCount = 0;

    filteredCustomers.forEach((item) => {
      totalCash += item.summary.cashBalance;
      totalCopperKg += item.summary.copperStockKg;
      totalAsset += item.totalAssetValue;
      totalTxCount += item.rawTransactionsCount;
    });

    return {
      peopleCount: filteredCustomers.length,
      totalCash,
      totalCopperKg,
      totalAsset,
      totalTxCount,
    };
  }, [filteredCustomers]);

  if (!isOpen) return null;

  // Build the complete, beautifully styled HTML report for direct PDF printing and export
  const generatePrintableHtml = () => {
    return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>بکاپ و کاردکس تراکنش‌های مشتریان - ${issueDate}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    body { font-family: Tahoma, 'Segoe UI', Arial, sans-serif; background: #ffffff; color: #0f172a; margin: 0; padding: 10px; direction: rtl; }
    .header { background: #0f172a; color: white; padding: 18px 20px; border-radius: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
    .title { font-size: 19px; font-weight: bold; margin: 0; }
    .subtitle { font-size: 13px; color: #cbd5e1; margin-top: 4px; }
    .global-stats { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
    .global-stat-box { flex: 1; min-width: 140px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; text-align: center; }
    .global-stat-label { font-size: 11px; color: #64748b; margin-bottom: 4px; }
    .global-stat-val { font-size: 15px; font-weight: bold; color: #0f172a; }
    .card { background: white; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin-bottom: 18px; page-break-inside: avoid; break-inside: avoid; }
    .card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 10px; flex-wrap: wrap; gap: 8px; }
    .person-name { font-size: 17px; font-weight: bold; color: #0f172a; }
    .person-stats { display: flex; gap: 8px; flex-wrap: wrap; }
    .stat-badge { background: #f8fafc; border: 1px solid #cbd5e1; padding: 5px 10px; border-radius: 6px; font-size: 12px; }
    .stat-badge strong { color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11.5px; text-align: right; }
    th { background: #f1f5f9; color: #1e293b; padding: 8px 6px; border: 1px solid #cbd5e1; font-weight: bold; }
    td { padding: 7px 6px; border: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10.5px; font-weight: bold; }
    .badge-buy { background: #fef3c7; color: #78350f; }
    .badge-sell { background: #dbeafe; color: #1e3a8a; }
    .badge-deposit { background: #d1fae5; color: #065f46; }
    .badge-withdrawal { background: #ffe4e6; color: #881337; }
    .badge-adjustment { background: #f3e8ff; color: #581c87; }
    .print-btn { background: #f59e0b; color: #0f172a; border: none; padding: 8px 16px; font-weight: bold; border-radius: 8px; cursor: pointer; font-size: 13px; }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; background: white; }
      .card { page-break-inside: avoid; break-inside: avoid; border: 1px solid #94a3b8; }
      .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">سامانه مدیریت معاملات مس واته - کاردکس و بکاپ تراکنش‌ها</div>
      <div class="subtitle">تاریخ گزارش: ${fullPersianDate} | نرخ مرجع مس: ${formatToman(marketCopperPrice)} تومان</div>
    </div>
    <div class="no-print">
      <button class="print-btn" onclick="window.print()">🖨️ ذخیره به صورت PDF / چاپ</button>
    </div>
  </div>

  <div class="global-stats">
    <div class="global-stat-box">
      <div class="global-stat-label">تعداد طرف‌حساب‌ها</div>
      <div class="global-stat-val">${filteredCustomers.length} نفر</div>
    </div>
    <div class="global-stat-box">
      <div class="global-stat-label">مجموع مانده ریالی</div>
      <div class="global-stat-val" style="color:#0284c7">${formatToman(overallFilteredTotals.totalCash)} تومان</div>
    </div>
    <div class="global-stat-box">
      <div class="global-stat-label">مجموع موجودی مس</div>
      <div class="global-stat-val" style="color:#d97706">${formatWeight(overallFilteredTotals.totalCopperKg)}</div>
    </div>
    <div class="global-stat-box">
      <div class="global-stat-label">تعداد کل تراکنش‌ها</div>
      <div class="global-stat-val">${overallFilteredTotals.totalTxCount} سند</div>
    </div>
  </div>

  ${filteredCustomers.map((item, idx) => `
    <div class="card">
      <div class="card-header">
        <div class="person-name">${idx + 1}. ${item.person.name} ${item.person.phone ? `<span style="font-size:12px;color:#64748b;font-weight:normal">(${item.person.phone})</span>` : ''}</div>
        <div class="person-stats">
          <div class="stat-badge">مانده نقدینگی: <strong>${formatToman(item.summary.cashBalance)} تومان</strong></div>
          <div class="stat-badge">موجودی مس: <strong>${formatWeight(item.summary.copperStockKg)}</strong></div>
          <div class="stat-badge">مجموع ارزش دارایی: <strong>${formatToman(item.totalAssetValue)} تومان</strong></div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:35px;text-align:center">ردیف</th>
            <th style="width:110px;text-align:center">تاریخ و زمان</th>
            <th style="width:130px;text-align:center">نوع سند</th>
            <th style="text-align:center">مقدار مس</th>
            <th style="text-align:center">نرخ مس (تومان)</th>
            <th style="text-align:center">مبلغ سند (تومان)</th>
            <th style="text-align:center">سود/زیان</th>
            <th style="text-align:center">مانده ریالی بعد</th>
            <th style="text-align:center">مانده مس بعد</th>
            <th>توضیحات و بابت</th>
          </tr>
        </thead>
        <tbody>
          ${item.transactions.length === 0 ? `<tr><td colspan="10" style="text-align:center;padding:12px;color:#94a3b8">تراکنشی ثبت نشده است</td></tr>` : 
            item.transactions.map((tx, tIdx) => {
              const rel = getPersianDateRelativeInfo(tx.date);
              return `
              <tr>
                <td style="text-align:center">${tIdx + 1}</td>
                <td style="text-align:center">
                  <div style="font-weight:bold;font-family:monospace">${tx.date}</div>
                  <div style="font-size:10px;color:#64748b;margin-top:2px">${rel.dayOfWeek ? `${rel.dayOfWeek} (${rel.relative})` : ''}</div>
                </td>
                <td style="text-align:center">
                  <span class="badge badge-${tx.type}">${tx.type === 'buy' ? 'خرید مس' : tx.type === 'sell' ? (tx.paymentMethod === 'cheque' ? `فروش مس (چکی - ${tx.chequeNumber || 'ثبت‌نشده'})` : 'فروش مس (نقدی)') : tx.type === 'deposit' ? 'واریز وجه' : tx.type === 'withdrawal' ? 'برداشت وجه' : 'سند اصلاحی'}</span>
                </td>
                <td style="text-align:center">${tx.weightKg ? formatWeight(tx.weightKg) : '-'}</td>
                <td style="text-align:center">${tx.unitPrice ? formatNumber(tx.unitPrice) : '-'}</td>
                <td style="text-align:center;font-weight:bold">${tx.amount ? formatNumber(tx.amount) : '-'}</td>
                <td style="text-align:center;color:${(tx.profit || 0) > 0 ? '#15803d' : (tx.profit || 0) < 0 ? '#b91c1c' : '#64748b'}">${tx.profit ? formatNumber(tx.profit) : '-'}</td>
                <td style="text-align:center">${tx.cashBalanceAfter !== undefined ? formatNumber(tx.cashBalanceAfter) : '-'}</td>
                <td style="text-align:center">${tx.copperStockAfter !== undefined ? formatWeight(tx.copperStockAfter) : '-'}</td>
                <td>${tx.notes || '-'}</td>
              </tr>
            `}).join('')
          }
        </tbody>
      </table>
    </div>
  `).join('')}

  <script>
    // Auto-trigger print if loaded
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`;
  };

  // Direct and 100% reliable HTML Report download (opens in any browser and allows 1-click Save as PDF)
  const handleDownloadReportHtml = () => {
    if (filteredCustomers.length === 0) return;
    try {
      const htmlContent = generatePrintableHtml();
      const dateSanitized = issueDate.replace(/\//g, '-');
      const fileName = `بکاپ_کاردکس_مشتریان_${dateSanitized}.html`;

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      console.error('Failed to download report file:', err);
      alert('خطا در دانلود فایل گزارش.');
    }
  };

  const getTransactionBadge = (type: Transaction['type'], tx?: Transaction) => {
    switch (type) {
      case 'deposit':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
            <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
            <span>واریز وجه</span>
          </span>
        );
      case 'withdrawal':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[11px] font-semibold">
            <ArrowUpRight className="w-3 h-3 text-rose-600" />
            <span>برداشت وجه</span>
          </span>
        );
      case 'buy':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-semibold">
            <ShoppingBag className="w-3 h-3 text-amber-700" />
            <span>خرید مس</span>
          </span>
        );
      case 'sell':
        const isCheque = tx?.paymentMethod === 'cheque';
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
              isCheque
                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                : 'bg-blue-100 text-blue-900 border border-blue-200'
            }`}
          >
            {isCheque ? (
              <CreditCard className="w-3 h-3 text-purple-700" />
            ) : (
              <TrendingUp className="w-3 h-3 text-blue-700" />
            )}
            <span>{isCheque ? 'فروش مس (چکی)' : 'فروش مس (نقدی)'}</span>
          </span>
        );
      case 'adjustment':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 text-[11px] font-semibold">
            <span>سند اصلاحی</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-semibold">
            <span>{type}</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-900/80 backdrop-blur-xs overflow-y-auto">
      
      {/* Modal Card */}
      <div className="relative w-full max-w-6xl max-h-[94vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-stone-200">
        
        {/* Top Header Controls (No-Print) */}
        <div className="no-print p-4 sm:px-6 sm:py-4 bg-stone-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 shrink-0">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>بکاپ و کاردکس تراکنش‌ها</span>
                <span className="text-xs font-normal text-stone-400">
                  (خروجی PDF و چاپ)
                </span>
              </h2>
              <p className="text-xs text-stone-300">
                گزارش پیوسته حساب و ریز تراکنش‌های مشتریان به همراه کاردکس و مانده حساب
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Download HTML/PDF Report Button */}
            <button
              id="btn-download-all-pdf"
              type="button"
              onClick={handleDownloadReportHtml}
              disabled={filteredCustomers.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-stone-900 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 disabled:opacity-50 rounded-xl transition-all cursor-pointer shadow-md"
              title="دانلود فایل گزارش جامع کاردکس (با باز کردن این فایل، می‌توانید مستقیماً آن را با کیفیت عالی به صورت PDF ذخیره یا چاپ کنید)"
            >
              <Download className="w-4 h-4" />
              <span>دانلود PDF (فایل گزارش)</span>
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Toolbar Bar (No-Print) */}
        <div className="no-print p-3 sm:px-6 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          
          <div className="flex items-center flex-wrap gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="جستجوی نام یا تلفن مشتری..."
                className="w-full pr-9 pl-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center bg-stone-200/80 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setFilterMode('with_transactions')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filterMode === 'with_transactions'
                    ? 'bg-white text-stone-900 shadow-2xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                فقط دارای تراکنش ({customersLedgerList.filter((c) => c.rawTransactionsCount > 0).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                همه افراد ({people.length})
              </button>
            </div>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-700 text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="alphabetical">مرتب‌سازی: الفبای نام</option>
              <option value="tx_count">مرتب‌سازی: بیشترین تراکنش</option>
              <option value="cash_balance">مرتب‌سازی: مانده نقدی</option>
            </select>

            {/* Transaction Order inside each person */}
            <button
              type="button"
              onClick={() => setOrderDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-stone-700 font-medium hover:bg-stone-50 transition-colors cursor-pointer"
              title="تغییر ترتیب ردیف‌های تراکنش"
            >
              {orderDirection === 'desc' ? 'ترتیب: جدیدترین اول' : 'ترتیب: قدیمی به جدید'}
            </button>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 text-stone-600 text-xs">
            <span>نمایش: <strong className="text-stone-900">{filteredCustomers.length}</strong> مشتری</span>
            <span>•</span>
            <span>مجموع تراکنش‌ها: <strong className="text-stone-900">{overallFilteredTotals.totalTxCount}</strong></span>
          </div>
        </div>

        {/* Scrollable Printable Area */}
        <div className="overflow-y-auto p-4 sm:p-6 bg-stone-100/70 flex-1">
          <div 
            ref={printableContainerRef}
            className="w-full max-w-5xl mx-auto space-y-8"
          >
            
            {/* Global Report Title Banner (Included in Print/PDF) */}
            <div className="bg-white border border-stone-300 rounded-2xl p-5 sm:p-6 shadow-xs text-stone-900">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                    W
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight">
                      پلتفرم جامع معاملات مس واته
                    </h1>
                    <p className="text-xs text-stone-500 mt-0.5">
                      دفتر کل جامع و کاردکس تجمیعی ریز تراکنش‌های طرف حساب‌ها
                    </p>
                  </div>
                </div>

                <div className="text-left font-mono text-xs text-stone-600 space-y-1">
                  <div>تاریخ گزارش: <strong className="text-stone-800">{fullPersianDate}</strong></div>
                  <div>نرخ مرجع مس: <strong className="text-stone-800">{formatNumber(marketCopperPrice)}</strong> تومان/کیلو</div>
                  <div>تعداد کل پرونده‌ها: <strong className="text-stone-800">{overallFilteredTotals.peopleCount}</strong></div>
                </div>
              </div>

              {/* Overall Summary Metric Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-center">
                <div className="bg-stone-50 rounded-xl p-2.5 border border-stone-100">
                  <span className="text-[11px] text-stone-500 block mb-1">تعداد افراد گزارش</span>
                  <span className="font-bold text-sm text-stone-800">{overallFilteredTotals.peopleCount} نفر</span>
                </div>
                <div className="bg-stone-50 rounded-xl p-2.5 border border-stone-100">
                  <span className="text-[11px] text-stone-500 block mb-1">مجموع مانده ریالی</span>
                  <span className={`font-bold text-sm font-mono ${overallFilteredTotals.totalCash >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatToman(overallFilteredTotals.totalCash)}
                  </span>
                </div>
                <div className="bg-stone-50 rounded-xl p-2.5 border border-stone-100">
                  <span className="text-[11px] text-stone-500 block mb-1">مجموع مس نزد مشتریان</span>
                  <span className="font-bold text-sm font-mono text-amber-800">
                    {formatWeight(overallFilteredTotals.totalCopperKg)}
                  </span>
                </div>
                <div className="bg-stone-50 rounded-xl p-2.5 border border-stone-100">
                  <span className="text-[11px] text-stone-500 block mb-1">تعداد کل تراکنش‌ها</span>
                  <span className="font-bold text-sm font-mono text-stone-800">
                    {overallFilteredTotals.totalTxCount} سند
                  </span>
                </div>
              </div>
            </div>

            {/* Customers Sections (One after another - exactly like the user screenshot) */}
            {filteredCustomers.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-stone-200 shadow-xs">
                <Users className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-stone-700">هیچ مشتری‌ای مطابق فیلتر یافت نشد</h3>
                <p className="text-xs text-stone-400 mt-1">
                  لطفاً فیلتر جستجو را پاک کنید یا گزینه «همه افراد» را انتخاب نمایید.
                </p>
              </div>
            ) : (
              filteredCustomers.map((item, customerIndex) => {
                const { person, summary, copperMarketValue, totalAssetValue, transactions: personTxs } = item;
                const isCashPositive = summary.cashBalance >= 0;

                return (
                  <div
                    key={person.id}
                    ref={(el) => {
                      if (el) {
                        customerSectionsRef.current.set(person.id, el);
                      } else {
                        customerSectionsRef.current.delete(person.id);
                      }
                    }}
                    className="bg-white rounded-2xl border border-stone-300 shadow-sm p-5 sm:p-6 space-y-4 break-inside-avoid print:shadow-none print:border print:border-stone-300 print:mb-8"
                  >
                    
                    {/* Customer Header Card (Just like user screenshot) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-stone-100 pb-4">
                      
                      {/* Person Identity */}
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-sm">
                          {person.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base sm:text-lg font-bold text-stone-900">
                              {person.name}
                            </h3>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-mono">
                              ردیف {customerIndex + 1}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-stone-500 mt-0.5 font-mono">
                            {person.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-stone-400" />
                                <span>{person.phone}</span>
                              </span>
                            )}
                            {person.createdAt && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-stone-400" />
                                <span>افتتاح حساب: {new Date(person.createdAt).toLocaleDateString('fa-IR')}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Person Current Balances Summary Badges */}
                      <div className="flex items-center flex-wrap gap-2 text-xs">
                        {/* Cash Balance */}
                        <div className={`px-3 py-1.5 rounded-xl border font-mono ${
                          isCashPositive 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          <span className="text-[10px] text-stone-500 block">مانده نقدینگی:</span>
                          <strong>{formatToman(summary.cashBalance)}</strong>
                          <span className="text-[10px] mr-1">({isCashPositive ? 'طلبکار' : 'بدهکار'})</span>
                        </div>

                        {/* Copper Stock */}
                        <div className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-mono">
                          <span className="text-[10px] text-amber-700 block">موجودی مس:</span>
                          <strong>{formatWeight(summary.copperStockKg)}</strong>
                        </div>

                        {/* Total Asset */}
                        <div className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-800 border border-stone-200 font-mono">
                          <span className="text-[10px] text-stone-500 block">کل ارزش دارایی:</span>
                          <strong>{formatToman(totalAssetValue)}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Section Subtitle */}
                    <div className="flex items-center justify-between text-xs text-stone-600">
                      <div className="font-bold flex items-center gap-1.5 text-stone-800">
                        <FileText className="w-4 h-4 text-amber-600" />
                        <span>دفتر کل و ریز تراکنش‌ها (کاردکس)</span>
                      </div>
                      <div className="font-mono text-stone-500">
                        {personTxs.length} تراکنش ثبت‌شده
                      </div>
                    </div>

                    {/* Transaction Ledger Table (Exact Match to User's Screenshot!) */}
                    <div className="border border-stone-200 rounded-xl overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 font-semibold">
                          <tr>
                            <th className="py-2.5 px-3">ردیف</th>
                            <th className="py-2.5 px-3">تاریخ</th>
                            <th className="py-2.5 px-3">نوع سند</th>
                            <th className="py-2.5 px-3 text-center">مقدار مس (کیلو)</th>
                            <th className="py-2.5 px-3 text-left">نرخ واحد (تومان)</th>
                            <th className="py-2.5 px-3 text-left">مبلغ تراکنش (تومان)</th>
                            <th className="py-2.5 px-3 text-left">سود معامله</th>
                            <th className="py-2.5 px-3 text-left">مانده ریالی بعد</th>
                            <th className="py-2.5 px-3 text-center">مانده مس بعد</th>
                            <th className="py-2.5 px-3">توضیحات</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-stone-100">
                          {personTxs.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="py-6 text-center text-stone-400">
                                هنوز هیچ تراکنشی برای این طرف‌حساب ثبت نشده است.
                              </td>
                            </tr>
                          ) : (
                            personTxs.map((tx, txIdx) => {
                              const rowNumber = orderDirection === 'desc' 
                                ? personTxs.length - txIdx 
                                : txIdx + 1;
                              const relInfo = getPersianDateRelativeInfo(tx.date);

                              return (
                                <tr key={tx.id} className="hover:bg-stone-50/70 transition-colors">
                                  
                                  {/* Row Number */}
                                  <td className="py-2.5 px-3 font-mono text-stone-400">
                                    {rowNumber}
                                  </td>

                                  {/* Date */}
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    <div className="font-mono font-medium text-stone-800">{tx.date}</div>
                                    {relInfo.dayOfWeek && (
                                      <div className="text-[10px] text-stone-500 font-sans mt-0.5 flex items-center gap-1">
                                        <span className="font-medium text-stone-700">{relInfo.dayOfWeek}</span>
                                        {relInfo.relative && (
                                          <span className="text-amber-900 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                            {relInfo.relative}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </td>

                                  {/* Type & Badge */}
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {getTransactionBadge(tx.type, tx)}
                                      </div>
                                      {tx.paymentMethod === 'cheque' && (
                                        <div className="text-[10px] text-purple-900 font-mono bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                          چک: {tx.chequeNumber || '—'} {tx.chequeStatus === 'cleared' ? '✓ پاس شد' : '⏳ در انتظار'}
                                        </div>
                                      )}

                                      <div>
                                        {(!tx.approvalStatus || tx.approvalStatus === 'approved') && (
                                          <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                            تأیید نهایی شده
                                          </span>
                                        )}
                                        {tx.approvalStatus === 'pending' && (
                                          <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                            در انتظار تأیید
                                          </span>
                                        )}
                                        {tx.approvalStatus === 'rejected' && (
                                          <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                            رد شده
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  {/* Weight Kg */}
                                  <td className="py-2.5 px-3 text-center font-mono font-medium whitespace-nowrap">
                                    {tx.weightKg ? (
                                      <span className={tx.type === 'buy' ? 'text-amber-900' : tx.type === 'sell' ? 'text-blue-900' : 'text-stone-700'}>
                                        {formatWeight(tx.weightKg, false)}
                                      </span>
                                    ) : (
                                      <span className="text-stone-300">—</span>
                                    )}
                                  </td>

                                  {/* Unit Price */}
                                  <td className="py-2.5 px-3 text-left font-mono whitespace-nowrap">
                                    {tx.unitPrice ? (
                                      <span>{formatNumber(tx.unitPrice)}</span>
                                    ) : (
                                      <span className="text-stone-300">—</span>
                                    )}
                                  </td>

                                  {/* Amount */}
                                  <td className="py-2.5 px-3 text-left font-mono font-bold whitespace-nowrap">
                                    <span className={
                                      tx.type === 'deposit' ? 'text-emerald-700' :
                                      tx.type === 'withdrawal' ? 'text-rose-700' :
                                      tx.type === 'buy' ? 'text-amber-800' :
                                      tx.type === 'sell' ? 'text-blue-800' : 'text-stone-800'
                                    }>
                                      {formatNumber(tx.amount)}
                                    </span>
                                  </td>

                                  {/* Profit */}
                                  <td className="py-2.5 px-3 text-left font-mono whitespace-nowrap">
                                    {tx.type === 'sell' && tx.profit !== undefined ? (
                                      <span className={`font-semibold ${tx.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        {tx.profit >= 0 ? `+${formatNumber(tx.profit)}` : formatNumber(tx.profit)}
                                      </span>
                                    ) : (
                                      <span className="text-stone-300">—</span>
                                    )}
                                  </td>

                                  {/* Cash Balance After */}
                                  <td className="py-2.5 px-3 text-left font-mono whitespace-nowrap font-medium">
                                    {tx.cashBalanceAfter !== undefined ? (
                                      <span className={tx.cashBalanceAfter >= 0 ? 'text-stone-800' : 'text-rose-700'}>
                                        {formatNumber(tx.cashBalanceAfter)}
                                      </span>
                                    ) : (
                                      <span className="text-stone-300">—</span>
                                    )}
                                  </td>

                                  {/* Copper Stock After */}
                                  <td className="py-2.5 px-3 text-center font-mono whitespace-nowrap font-medium text-amber-900">
                                    {tx.copperStockAfter !== undefined ? (
                                      <span>{formatWeight(tx.copperStockAfter, false)}</span>
                                    ) : (
                                      <span className="text-stone-300">—</span>
                                    )}
                                  </td>

                                  {/* Notes */}
                                  <td className="py-2.5 px-3 text-stone-600 max-w-xs truncate text-[11px]" title={tx.notes || ''}>
                                    {tx.notes || <span className="text-stone-300">—</span>}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}

            {/* Footer Notice */}
            <div className="text-center text-xs text-stone-400 py-4 border-t border-stone-200">
              سامانه حسابداری و معاملات مس واته • تهیه شده در تاریخ {fullPersianDate}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
