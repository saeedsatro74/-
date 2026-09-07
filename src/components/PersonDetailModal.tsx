import React, { useState, useMemo } from 'react';
import { 
  X, 
  Wallet, 
  Boxes, 
  Landmark, 
  BadgePercent, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ShoppingBag, 
  TrendingUp, 
  Sliders, 
  Printer, 
  Edit3, 
  Trash2, 
  Phone, 
  Calendar, 
  FileText, 
  Info,
  Tag,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  CreditCard,
  Clock,
  Check,
  AlertCircle
} from 'lucide-react';
import { PersonWalletSummary, Transaction, Person, ChequeStatus } from '../types';
import { replayAndCalculatePersonLedger } from '../utils/storage';
import { formatNumber, formatToman, formatWeight, formatPercent } from '../utils/formatters';
import { getPersianDateRelativeInfo, getTransactionExactTime } from '../utils/persianDate';
import { getTransactionParties } from '../utils/parties';

interface PersonDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person | null;
  transactions: Transaction[];
  marketCopperPrice: number;
  onAddDeposit: (personId: string) => void;
  onAddWithdrawal: (personId: string) => void;
  onAddPurchase: (personId: string) => void;
  onAddSale: (personId: string) => void;
  onAddAdjustment: (personId: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (txId: string) => void;
  onEditPerson: (personId: string) => void;
  onOpenStatement?: (personId: string) => void;
  onViewReceipt?: (tx: Transaction) => void;
  onUpdateChequeStatus?: (txId: string, status: ChequeStatus, clearedDate?: string) => void;
  onOpenChequesModal?: () => void;
}

export const PersonDetailModal: React.FC<PersonDetailModalProps> = ({
  isOpen,
  onClose,
  person,
  transactions,
  marketCopperPrice,
  onAddDeposit,
  onAddWithdrawal,
  onAddPurchase,
  onAddSale,
  onAddAdjustment,
  onEditTransaction,
  onDeleteTransaction,
  onEditPerson,
  onOpenStatement,
  onViewReceipt,
  onUpdateChequeStatus,
  onOpenChequesModal,
}) => {
  const [filterType, setFilterType] = useState<string>('all');

  // Recalculate person ledger and summary on the fly
  const ledgerData = useMemo(() => {
    if (!person) return null;
    return replayAndCalculatePersonLedger(person.id, transactions);
  }, [person, transactions]);

  if (!isOpen || !person || !ledgerData) return null;

  const { recalculatedTransactions, summary } = ledgerData;
  const copperMarketValue = Math.round(summary.copperStockKg * marketCopperPrice);
  const totalAssetValue = summary.cashBalance + copperMarketValue;
  const isProfitPositive = summary.realizedProfit >= 0;

  // Filter transactions
  const displayedTransactions = recalculatedTransactions
    .filter((tx) => {
      if (filterType === 'all') return true;
      return tx.type === filterType;
    })
    // Show newest first in table or chronological
    .slice()
    .reverse();

  // Cheques belonging to this person
  const personCheques = useMemo(() => {
    if (!person) return [];
    return transactions
      .filter(
        (tx) =>
          tx.personId === person.id &&
          (tx.paymentMethod === 'cheque' || tx.chequeNumber || tx.chequeStatus)
      )
      .sort((a, b) => {
        const statusA = a.chequeStatus || 'pending';
        const statusB = b.chequeStatus || 'pending';
        if (statusA === 'pending' && statusB !== 'pending') return -1;
        if (statusA !== 'pending' && statusB === 'pending') return 1;
        return (a.chequeDueDate || a.date).localeCompare(b.chequeDueDate || b.date);
      });
  }, [transactions, person]);

  const handlePrint = () => {
    window.print();
  };

  const getTransactionBadge = (type: Transaction['type'], tx?: Transaction) => {
    switch (type) {
      case 'deposit':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
            <span>واریز وجه</span>
          </span>
        );
      case 'withdrawal':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-xs font-semibold">
            <ArrowUpRight className="w-3 h-3 text-rose-600" />
            <span>برداشت وجه</span>
          </span>
        );
      case 'buy':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs font-semibold">
            <ShoppingBag className="w-3 h-3 text-amber-700" />
            <span>خرید مس</span>
          </span>
        );
      case 'sell':
        const isCheque = tx?.paymentMethod === 'cheque';
        const isExternal = tx?.saleCategory === 'external';
        const parties = tx ? getTransactionParties(tx, person?.name) : null;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
              isExternal
                ? 'bg-amber-100 text-amber-950 border border-amber-300'
                : isCheque
                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                : 'bg-blue-100 text-blue-900 border border-blue-200'
            }`}
          >
            {isExternal ? (
              <TrendingUp className="w-3 h-3 text-amber-700" />
            ) : isCheque ? (
              <CreditCard className="w-3 h-3 text-purple-700" />
            ) : (
              <TrendingUp className="w-3 h-3 text-blue-700" />
            )}
            <span>
              {isExternal
                ? `فروش به خارج (${parties?.buyer.name || 'خریدار بیرونی'})`
                : isCheque
                ? 'فروش مس به شرکت (چکی)'
                : 'فروش مس به شرکت (نقدی)'}
            </span>
          </span>
        );
      case 'adjustment':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-200 text-stone-800 text-xs font-semibold">
            <Sliders className="w-3 h-3 text-stone-600" />
            <span>اصلاح حساب</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/75 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 py-4 sm:py-6">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-6xl my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header (Sticky at top) */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/95 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 z-10">
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              {person.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-stone-900">
                  {person.name}
                </h2>
                <button
                  type="button"
                  onClick={() => onEditPerson(person.id)}
                  className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-md transition-colors"
                  title="ویرایش مشخصات"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs text-stone-500 mt-0.5">
                {person.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 text-stone-400" />
                    {person.phone}
                  </span>
                )}
                <span>تاریخ افتتاح حساب: {person.createdAt}</span>
                {person.notes && (
                  <span className="text-stone-400 truncate max-w-xs">({person.notes})</span>
                )}
              </div>
            </div>
          </div>

          {/* Top Action Bar */}
          <div className="flex items-center gap-2">
            {onOpenStatement && (
              <button
                type="button"
                onClick={() => onOpenStatement(person.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-stone-900 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 rounded-lg transition-colors cursor-pointer shadow-xs"
                title="صدور صورت‌حساب رسمی، دریافت فایل PDF و ارسال به واتساپ"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>صورت‌حساب و PDF (واتساپ)</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg transition-colors cursor-pointer"
              title="چاپ صورتحساب و کاردکس"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Dedicated Cheques Management & Uncleared Cheques Banner with Interactive Ticking */}
          {(summary.hasUnclearedCheques || personCheques.length > 0) && (
            <div className="bg-stone-50 border border-stone-300 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-3.5 sm:p-4 bg-amber-50/90 border-b border-amber-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-800 text-white flex items-center justify-center shadow-xs shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2 flex-wrap">
                      <span>لیست چک‌های دریافتی از این طرف حساب</span>
                      {summary.pendingChequesCount > 0 ? (
                        <span className="text-xs bg-rose-600 text-white px-2.5 py-0.5 rounded-full font-bold">
                          {summary.pendingChequesCount} فقره چک پاس‌نشده (خرید مس مسدود است)
                        </span>
                      ) : (
                        <span className="text-xs bg-emerald-600 text-white px-2.5 py-0.5 rounded-full font-bold">
                          تمامی چک‌ها پاس شده‌اند ✓
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-stone-600 mt-0.5">
                      {summary.pendingChequesCount > 0
                        ? `مبلغ کل چک‌های پاس‌نشده: ${formatToman(summary.pendingChequesTotalAmount)}. هر چکی که زودتر پاس شد، کافیست تیک آن را بزنید تا حساب تسویه شود.`
                        : 'کلیه چک‌های این مشتری وصول شده و امکان ثبت سفارش خرید مس فعال است.'}
                    </p>
                  </div>
                </div>

                {onOpenChequesModal && (
                  <button
                    type="button"
                    onClick={onOpenChequesModal}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-800 text-xs font-semibold rounded-lg border border-stone-300 transition-colors shadow-2xs cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-stone-500" />
                    <span>مدیریت کلیه چک‌های سیستم</span>
                  </button>
                )}
              </div>

              {/* List of Cheques with direct checkbox / tick */}
              <div className="p-3.5 sm:p-4 divide-y divide-stone-200">
                {personCheques.map((ch) => {
                  const isCleared = ch.chequeStatus === 'cleared';
                  const isPending = !ch.chequeStatus || ch.chequeStatus === 'pending';
                  const isBounced = ch.chequeStatus === 'bounced';

                  return (
                    <div
                      key={ch.id}
                      className={`py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isCleared
                          ? 'opacity-85'
                          : isBounced
                          ? 'bg-amber-50/50 p-2.5 rounded-xl border border-amber-200'
                          : 'bg-white p-3 rounded-xl border border-rose-200 shadow-2xs'
                      }`}
                    >
                      {/* Checkbox and Cheque Information */}
                      <div className="flex items-start sm:items-center gap-3">
                        {/* Direct Checkbox */}
                        <label 
                          className="flex items-center gap-2 cursor-pointer select-none bg-stone-100 hover:bg-stone-200 p-2 rounded-lg border border-stone-300 transition-colors shrink-0"
                          title="تیک پاس شدن چک (شاید زودتر پاس بشه و بخوام تیکشو بزنم)"
                        >
                          <input
                            type="checkbox"
                            checked={isCleared}
                            onChange={() => {
                              if (onUpdateChequeStatus) {
                                onUpdateChequeStatus(ch.id, isCleared ? 'pending' : 'cleared');
                              }
                            }}
                            className="w-5 h-5 accent-emerald-600 rounded cursor-pointer transition-all"
                          />
                          <span className={`text-xs font-bold ${isCleared ? 'text-emerald-700' : 'text-stone-800'}`}>
                            {isCleared ? 'پاس شد ✓' : 'تیک پاس شدن چک'}
                          </span>
                        </label>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-stone-950 text-xs sm:text-sm">
                              شماره چک: {ch.chequeNumber || 'ثبت نشده'}
                            </span>
                            {ch.chequeBank && (
                              <span className="text-[11px] text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                                بانک {ch.chequeBank}
                              </span>
                            )}
                            <span className="font-bold font-mono text-purple-900 text-xs sm:text-sm bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              مبلغ: {formatToman(ch.amount)}
                            </span>
                          </div>

                          <div className="text-[11px] text-stone-500 flex items-center gap-3 flex-wrap">
                            <span>
                              تاریخ سررسید: <b className="font-mono text-stone-800">{ch.chequeDueDate || ch.date}</b>
                            </span>
                            {ch.weightKg && (
                              <span>
                                بابت فروش: <b className="text-amber-900 font-mono">{formatWeight(ch.weightKg)}</b> مس
                              </span>
                            )}
                            {isCleared && ch.chequeClearedDate && (
                              <span className="text-emerald-700 font-semibold bg-emerald-100 px-1.5 py-0.2 rounded">
                                وصول و پاس شده در تاریخ: {ch.chequeClearedDate}
                              </span>
                            )}
                            {isPending && (
                              <span className="text-rose-700 font-semibold bg-rose-100 px-1.5 py-0.2 rounded">
                                در انتظار وصول ⏳ (خرید مس مسدود)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 justify-end shrink-0">
                        {isPending && onUpdateChequeStatus && (
                          <button
                            type="button"
                            onClick={() => onUpdateChequeStatus(ch.id, 'cleared')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                            title="ثبت پاس شدن چک (حساب شخص بلافاصله تسویه و قفل خرید مس باز می‌شود)"
                          >
                            <Check className="w-4 h-4" />
                            <span>چک پاس شد (تیک وصول)</span>
                          </button>
                        )}
                        {isCleared && onUpdateChequeStatus && (
                          <button
                            type="button"
                            onClick={() => onUpdateChequeStatus(ch.id, 'pending')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            title="برگشت به حالت پاس‌نشده (در انتظار)"
                          >
                            <Clock className="w-3.5 h-3.5 text-stone-500" />
                            <span>تغییر به در انتظار وصول</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Asset & Wallet Overview Summary Cards - Clean Slate Palette */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            
            {/* 1. Cash Balance */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500">موجودی ریالی</span>
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-lg sm:text-xl font-bold font-mono text-emerald-800">
                {formatNumber(summary.cashBalance)} <span className="text-xs font-normal text-stone-500 font-sans">تومان</span>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                مانده نقدی در کیف پول
              </p>
            </div>

            {/* 2. Copper Stock */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500">موجودی مس</span>
                <Boxes className="w-4 h-4 text-amber-700" />
              </div>
              <div className="mt-2 text-lg sm:text-xl font-bold font-mono text-stone-900">
                {formatWeight(summary.copperStockKg, false)} <span className="text-xs font-normal text-stone-500 font-sans">کیلو</span>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {summary.weightedAvgBuyPrice > 0 ? `میانگین خرید: ${formatNumber(summary.weightedAvgBuyPrice)} ت` : 'بدون موجودی مس'}
              </p>
            </div>

            {/* 3. Copper Market Value */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500">ارزش روز مس</span>
                <Tag className="w-4 h-4 text-stone-500" />
              </div>
              <div className="mt-2 text-lg sm:text-xl font-bold font-mono text-stone-900">
                {formatNumber(copperMarketValue)} <span className="text-xs font-normal text-stone-500 font-sans">تومان</span>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                نرخ {formatNumber(marketCopperPrice)} ت/ک
              </p>
            </div>

            {/* 4. Total Asset Value */}
            <div className="bg-stone-900 text-white rounded-xl p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-300">مجموع ارزش دارایی</span>
                <Landmark className="w-4 h-4 text-stone-300" />
              </div>
              <div className="mt-2 text-lg sm:text-xl font-extrabold font-mono text-white">
                {formatNumber(totalAssetValue)} <span className="text-xs font-normal text-stone-300 font-sans">تومان</span>
              </div>
              <p className="text-[11px] text-stone-300 mt-0.5">
                نقدینگی + ارزش روز مس
              </p>
            </div>

            {/* 5. Realized Profit */}
            <div className="col-span-2 lg:col-span-1 rounded-xl p-3.5 border border-stone-200 bg-stone-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500">سود محقق‌شده</span>
                <BadgePercent className="w-4 h-4 text-stone-500" />
              </div>
              <div className={`mt-2 text-lg sm:text-xl font-bold font-mono ${
                isProfitPositive ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {summary.realizedProfit > 0 ? '+' : ''}{formatNumber(summary.realizedProfit)} <span className="text-xs font-normal text-stone-500 font-sans">ت</span>
              </div>
              <div className="flex items-center justify-between text-[11px] mt-0.5">
                <span className="text-stone-500">بازدهی معاملات:</span>
                <span className={`font-semibold ${isProfitPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatPercent(summary.profitPercentage)}
                </span>
              </div>
            </div>

          </div>

          {/* Fast Transaction Buttons Toolbar - Calm styling */}
          <div className="p-3.5 bg-stone-100/90 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <span>ثبت عملیات جدید برای {person.name}:</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onAddDeposit(person.id)}
                className="px-3 py-1.5 text-xs font-semibold text-stone-800 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                <span>واریز وجه</span>
              </button>

              <button
                type="button"
                onClick={() => onAddWithdrawal(person.id)}
                className="px-3 py-1.5 text-xs font-semibold text-stone-800 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                <span>برداشت وجه</span>
              </button>

              <button
                type="button"
                onClick={() => onAddPurchase(person.id)}
                className="px-3 py-1.5 text-xs font-semibold text-stone-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-amber-700" />
                <span>خرید مس</span>
              </button>

              <button
                type="button"
                onClick={() => onAddSale(person.id)}
                className="px-3 py-1.5 text-xs font-semibold text-stone-800 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span>فروش مس</span>
              </button>

              <button
                type="button"
                onClick={() => onAddAdjustment(person.id)}
                className="px-3 py-1.5 text-xs font-semibold text-stone-600 bg-stone-200 hover:bg-stone-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>اصلاح حساب</span>
              </button>
            </div>
          </div>

          {/* Ledger Table Section */}
          <div className="space-y-3">
            
            {/* Table Header & Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-stone-200">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-stone-900">
                  دفتر کل و ریز تراکنش‌ها (کاردکس)
                </h3>
                <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-mono">
                  {recalculatedTransactions.length} تراکنش ثبت‌شده
                </span>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded cursor-pointer ${filterType === 'all' ? 'bg-white font-bold shadow-2xs' : 'text-stone-600'}`}
                >
                  همه
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('deposit')}
                  className={`px-2.5 py-1 rounded cursor-pointer ${filterType === 'deposit' ? 'bg-white font-bold text-emerald-800 shadow-2xs' : 'text-stone-600'}`}
                >
                  واریزی‌ها
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('withdrawal')}
                  className={`px-2.5 py-1 rounded cursor-pointer ${filterType === 'withdrawal' ? 'bg-white font-bold text-rose-800 shadow-2xs' : 'text-stone-600'}`}
                >
                  برداشتی‌ها
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('buy')}
                  className={`px-2.5 py-1 rounded cursor-pointer ${filterType === 'buy' ? 'bg-white font-bold text-amber-900 shadow-2xs' : 'text-stone-600'}`}
                >
                  خریدها
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('sell')}
                  className={`px-2.5 py-1 rounded cursor-pointer ${filterType === 'sell' ? 'bg-white font-bold text-blue-900 shadow-2xs' : 'text-stone-600'}`}
                >
                  فروش‌ها
                </button>
              </div>
            </div>

            {/* Transactions Ledger Table */}
            <div className="border border-stone-200 rounded-xl overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">ردیف</th>
                    <th className="py-2.5 px-3 font-semibold">تاریخ</th>
                    <th className="py-2.5 px-3 font-semibold">نوع سند</th>
                    <th className="py-2.5 px-3 font-semibold text-center">مقدار مس (کیلو)</th>
                    <th className="py-2.5 px-3 font-semibold text-left">نرخ واحد (تومان)</th>
                    <th className="py-2.5 px-3 font-semibold text-left">مبلغ تراکنش (تومان)</th>
                    <th className="py-2.5 px-3 font-semibold text-left">سود معامله</th>
                    <th className="py-2.5 px-3 font-semibold text-left">مانده ریالی بعد</th>
                    <th className="py-2.5 px-3 font-semibold text-center">مانده مس بعد</th>
                    <th className="py-2.5 px-3 font-semibold">توضیحات</th>
                    <th className="py-2.5 px-3 font-semibold text-center">عملیات</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-100">
                  {displayedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-stone-400">
                        هیچ تراکنشی در این دسته‌بندی ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    displayedTransactions.map((tx, idx) => {
                      return (
                        <tr key={tx.id} className="hover:bg-stone-50/80 transition-colors">
                          
                          {/* Row number */}
                          <td className="py-3 px-3 font-mono text-stone-400">
                            {displayedTransactions.length - idx}
                          </td>

                          {/* Date */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {(() => {
                              const relInfo = getPersianDateRelativeInfo(tx.date);
                              return (
                                <div>
                                  <div className="font-mono font-bold text-stone-900">{tx.date}</div>
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <div className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200 dir-ltr">
                                      <Clock className="w-2.5 h-2.5 text-blue-600" />
                                      <span>{getTransactionExactTime(tx)}</span>
                                    </div>
                                    {relInfo.dayOfWeek && (
                                      <span className="text-[10px] text-stone-600 font-sans">
                                        {relInfo.dayOfWeek}
                                      </span>
                                    )}
                                  </div>
                                  {relInfo.relative && relInfo.relative !== 'امروز' && (
                                    <div className="text-[9.5px] text-amber-900 font-sans mt-0.5">
                                      {relInfo.relative}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>

                          {/* Type & Approval Status Badge */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {getTransactionBadge(tx.type, tx)}
                              </div>

                              {/* Party details (Buyer / Seller) */}
                              {(() => {
                                const p = getTransactionParties(tx, person?.name);
                                return (
                                  <div className="text-[10px] text-stone-600 bg-stone-100/80 px-2 py-1 rounded-md border border-stone-200/70 space-y-0.5">
                                    <div className="flex items-center gap-1 justify-between">
                                      <span className="text-stone-400 font-medium">فروشنده:</span>
                                      <span className="font-bold text-stone-800">{p.seller.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 justify-between">
                                      <span className="text-stone-400 font-medium">خریدار:</span>
                                      <span className={`font-black ${p.isExternalSale ? 'text-amber-900' : 'text-stone-800'}`}>
                                        {p.buyer.name}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Cheque details & Quick Tick Action */}
                              {tx.paymentMethod === 'cheque' && (
                                <div className="flex items-center gap-1.5 flex-wrap text-[11px] bg-purple-50/70 p-1.5 rounded-lg border border-purple-200/80 mt-0.5">
                                  <span className="font-mono font-bold text-purple-950">
                                    چک: {tx.chequeNumber || '—'}
                                  </span>
                                  {tx.chequeDueDate && (
                                    <span className="text-stone-500 font-mono text-[10px]">
                                      (سررسید: {tx.chequeDueDate})
                                    </span>
                                  )}
                                  {onUpdateChequeStatus && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onUpdateChequeStatus(
                                          tx.id,
                                          tx.chequeStatus === 'cleared' ? 'pending' : 'cleared'
                                        )
                                      }
                                      className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs ${
                                        tx.chequeStatus === 'cleared'
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                          : 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-emerald-100 hover:text-emerald-800'
                                      }`}
                                      title={
                                        tx.chequeStatus === 'cleared'
                                          ? 'چک پاس شده است (برای بازگشت به در انتظار کلیک کنید)'
                                          : 'تیک پاس شدن چک (شاید زودتر پاس بشه و بخوام تیکشو بزنم)'
                                      }
                                    >
                                      <span>
                                        {tx.chequeStatus === 'cleared' ? '✓ پاس شد' : '⏳ تیک پاس شدن'}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              )}

                              <div>
                                {tx.approvalStatus === 'topup_step1_pending_bank' && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping inline-block" />
                                    مرحله ۱: منتظر شماره حساب
                                  </span>
                                )}
                                {tx.approvalStatus === 'topup_step2_awaiting_receipt' && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
                                    مرحله ۲: منتظر فیش واریز
                                  </span>
                                )}
                                {tx.approvalStatus === 'topup_step3_pending_approval' && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-ping inline-block" />
                                    مرحله ۳: فیش ارسال شد (منتظر تایید)
                                  </span>
                                )}
                                {tx.approvalStatus === 'pending' && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping inline-block" />
                                    در انتظار تأیید مدیر
                                  </span>
                                )}
                                {(!tx.approvalStatus || tx.approvalStatus === 'approved') && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                    تأیید نهایی شده
                                  </span>
                                )}
                                {tx.approvalStatus === 'rejected' && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                    <XCircle className="w-2.5 h-2.5 text-rose-600" />
                                    رد شده
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Copper Weight */}
                          <td className="py-3 px-3 text-center font-mono font-medium">
                            {tx.weightKg ? (
                              <span className={tx.type === 'buy' ? 'text-amber-900' : tx.type === 'sell' ? 'text-blue-900' : 'text-stone-700'}>
                                {formatWeight(tx.weightKg, false)}
                              </span>
                            ) : (
                              <span className="text-stone-300">—</span>
                            )}
                          </td>

                          {/* Unit Price */}
                          <td className="py-3 px-3 text-left font-mono">
                            {tx.unitPrice ? (
                              <span>{formatNumber(tx.unitPrice)}</span>
                            ) : (
                              <span className="text-stone-300">—</span>
                            )}
                          </td>

                          {/* Amount */}
                          <td className="py-3 px-3 text-left font-mono font-bold">
                            <span className={
                              tx.type === 'deposit' ? 'text-emerald-700' :
                              tx.type === 'withdrawal' ? 'text-rose-700' :
                              tx.type === 'buy' ? 'text-amber-900' :
                              tx.type === 'sell' ? 'text-blue-800' : 'text-stone-800'
                            }>
                              {formatNumber(tx.amount)}
                            </span>
                          </td>

                          {/* Profit */}
                          <td className="py-3 px-3 text-left">
                            {tx.type === 'sell' && tx.profit !== undefined ? (
                              <div className="font-mono">
                                <span className={tx.profit >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                                  {tx.profit > 0 ? '+' : ''}{formatNumber(tx.profit)}
                                </span>
                                {tx.profitPercentage !== undefined && (
                                  <span className="text-[10px] text-stone-400 block">
                                    ({formatPercent(tx.profitPercentage)})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-stone-300">—</span>
                            )}
                          </td>

                          {/* Cash Balance After */}
                          <td className="py-3 px-3 text-left font-mono font-bold text-stone-900 bg-stone-50/50">
                            {tx.approvalStatus && tx.approvalStatus !== 'approved' ? (
                              <span className="text-[10px] font-sans font-normal text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 block whitespace-nowrap">
                                در انتظار تأیید نهایی
                              </span>
                            ) : (
                              formatNumber(tx.cashBalanceAfter || 0)
                            )}
                          </td>

                          {/* Copper Stock After */}
                          <td className="py-3 px-3 text-center font-mono font-bold text-amber-900 bg-amber-50/30">
                            {tx.approvalStatus && tx.approvalStatus !== 'approved' ? (
                              <span className="text-[10px] font-sans font-normal text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 block whitespace-nowrap">
                                در انتظار تأیید
                              </span>
                            ) : (
                              formatWeight(tx.copperStockAfter || 0, false)
                            )}
                          </td>

                          {/* Notes */}
                          <td className="py-3 px-3 text-stone-500 max-w-[150px] truncate" title={tx.notes || ''}>
                            {tx.notes || <span className="text-stone-300">—</span>}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {onViewReceipt && (
                                <button
                                  type="button"
                                  onClick={() => onViewReceipt(tx)}
                                  className="p-1 text-stone-500 hover:text-stone-900 hover:bg-stone-200/80 rounded transition-colors cursor-pointer"
                                  title="مشاهده و چاپ رسید رسمی معامله"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onEditTransaction(tx)}
                                className="p-1 text-stone-400 hover:text-stone-800 hover:bg-stone-200 rounded transition-colors cursor-pointer"
                                title="ویرایش سند"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteTransaction(tx.id)}
                                className="p-1 text-stone-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="حذف سند"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
