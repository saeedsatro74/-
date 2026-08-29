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
  FileSpreadsheet
} from 'lucide-react';
import { PersonWalletSummary, Transaction, Person } from '../types';
import { replayAndCalculatePersonLedger } from '../utils/storage';
import { formatNumber, formatToman, formatWeight, formatPercent } from '../utils/formatters';

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

  const handlePrint = () => {
    window.print();
  };

  const getTransactionBadge = (type: Transaction['type']) => {
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
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 text-xs font-semibold">
            <TrendingUp className="w-3 h-3 text-blue-700" />
            <span>فروش مس</span>
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-800 text-white flex items-center justify-center font-bold text-lg shadow-sm">
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
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="چاپ صورتحساب و کاردکس"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ صورتحساب</span>
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
          
          {/* Asset & Wallet Overview Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            
            {/* 1. Cash Balance */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-900">موجودی ریالی (تومان)</span>
                <Wallet className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="mt-2 text-lg sm:text-xl font-bold font-mono text-emerald-950">
                {formatNumber(summary.cashBalance)}
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                مانده وجه نقد قابل خرید یا برداشت
              </p>
            </div>

            {/* 2. Copper Stock */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-900">موجودی مس (کیلو)</span>
                <Boxes className="w-4 h-4 text-amber-700" />
              </div>
              <div className="mt-2 text-lg sm:text-xl font-bold font-mono text-amber-950">
                {formatWeight(summary.copperStockKg, false)}
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                {summary.weightedAvgBuyPrice > 0 ? `میانگین خرید: ${formatNumber(summary.weightedAvgBuyPrice)} ت` : 'بدون موجودی مس'}
              </p>
            </div>

            {/* 3. Copper Market Value */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-600">ارزش روز مس موجود</span>
                <Tag className="w-4 h-4 text-stone-500" />
              </div>
              <div className="mt-2 text-lg sm:text-xl font-bold font-mono text-stone-900">
                {formatNumber(copperMarketValue)}
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                با نرخ {formatNumber(marketCopperPrice)} ت/ک
              </p>
            </div>

            {/* 4. Total Asset Value */}
            <div className="bg-gradient-to-br from-amber-700 to-amber-900 text-white rounded-xl p-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-200">مجموع ارزش دارایی</span>
                <Landmark className="w-4 h-4 text-amber-200" />
              </div>
              <div className="mt-2 text-lg sm:text-xl font-extrabold font-mono text-white">
                {formatNumber(totalAssetValue)}
              </div>
              <p className="text-[11px] text-amber-200 mt-0.5">
                نقدینگی + ارزش روز مس
              </p>
            </div>

            {/* 5. Realized Profit */}
            <div className={`col-span-2 lg:col-span-1 rounded-xl p-3 border shadow-2xs ${
              isProfitPositive ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-700">سود محقق‌شده</span>
                <BadgePercent className="w-4 h-4 text-stone-600" />
              </div>
              <div className={`mt-2 text-lg sm:text-xl font-bold font-mono ${
                isProfitPositive ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {summary.realizedProfit > 0 ? '+' : ''}{formatNumber(summary.realizedProfit)}
              </div>
              <div className="flex items-center justify-between text-[11px] mt-0.5">
                <span className="text-stone-500">بازدهی معاملات:</span>
                <span className={`font-semibold ${isProfitPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatPercent(summary.profitPercentage)}
                </span>
              </div>
            </div>

          </div>

          {/* Fast Transaction Buttons Toolbar */}
          <div className="p-3 bg-stone-100 rounded-xl border border-stone-200/90 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <span>عملیات سریع برای {person.name}:</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onAddDeposit(person.id)}
                className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>+ واریز وجه</span>
              </button>

              <button
                type="button"
                onClick={() => onAddWithdrawal(person.id)}
                className="px-3 py-1.5 text-xs font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>- برداشت وجه</span>
              </button>

              <button
                type="button"
                onClick={() => onAddPurchase(person.id)}
                className="px-3 py-1.5 text-xs font-bold text-amber-950 bg-amber-200/80 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>خرید مس</span>
              </button>

              <button
                type="button"
                onClick={() => onAddSale(person.id)}
                className="px-3 py-1.5 text-xs font-bold text-blue-900 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>فروش مس</span>
              </button>

              <button
                type="button"
                onClick={() => onAddAdjustment(person.id)}
                className="px-3 py-1.5 text-xs font-semibold text-stone-800 bg-stone-200 hover:bg-stone-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
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
                          <td className="py-3 px-3 font-mono text-stone-700 whitespace-nowrap">
                            {tx.date}
                          </td>

                          {/* Type */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {getTransactionBadge(tx.type)}
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
                            {formatNumber(tx.cashBalanceAfter || 0)}
                          </td>

                          {/* Copper Stock After */}
                          <td className="py-3 px-3 text-center font-mono font-bold text-amber-900 bg-amber-50/30">
                            {formatWeight(tx.copperStockAfter || 0, false)}
                          </td>

                          {/* Notes */}
                          <td className="py-3 px-3 text-stone-500 max-w-[150px] truncate" title={tx.notes || ''}>
                            {tx.notes || <span className="text-stone-300">—</span>}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
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
