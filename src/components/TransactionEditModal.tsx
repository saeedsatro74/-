import React, { useState, useEffect, useMemo } from 'react';
import { X, Edit3, Calendar, FileText, Check, AlertTriangle } from 'lucide-react';
import { Transaction, Person } from '../types';
import { formatNumber, formatToman } from '../utils/formatters';
import { NumericInput } from './NumericInput';

interface TransactionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  people: Person[];
  onSave: (updatedTx: Transaction) => void;
}

export const TransactionEditModal: React.FC<TransactionEditModalProps> = ({
  isOpen,
  onClose,
  transaction,
  people,
  onSave,
}) => {
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [weightKg, setWeightKg] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (transaction) {
      setDate(transaction.date || '');
      setAmount(transaction.amount || 0);
      setWeightKg(transaction.weightKg || 0);
      setUnitPrice(transaction.unitPrice || 0);
      setNotes(transaction.notes || '');
      setError('');
    }
  }, [transaction]);

  const person = people.find((p) => p.id === transaction?.personId);

  // If buy or sell, keep amount synced if weight or unit price changed
  const isBuyOrSell = transaction?.type === 'buy' || transaction?.type === 'sell';

  const calculatedAmount = useMemo(() => {
    if (isBuyOrSell && weightKg > 0 && unitPrice > 0) {
      return Math.round(weightKg * unitPrice);
    }
    return amount;
  }, [isBuyOrSell, weightKg, unitPrice, amount]);

  if (!isOpen || !transaction) return null;

  const getTypeName = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit': return 'واریز وجه';
      case 'withdrawal': return 'برداشت وجه';
      case 'buy': return 'خرید مس';
      case 'sell': return 'فروش مس';
      case 'adjustment': return 'اصلاح حساب';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date.trim()) {
      setError('تاریخ تراکنش الزامی است.');
      return;
    }

    const finalAmount = isBuyOrSell ? calculatedAmount : amount;
    if (finalAmount <= 0 && transaction.type !== 'adjustment') {
      setError('مبلغ تراکنش باید بیشتر از صفر باشد.');
      return;
    }

    onSave({
      ...transaction,
      date: date.trim(),
      amount: finalAmount,
      weightKg: isBuyOrSell || transaction.type === 'adjustment' ? weightKg : undefined,
      unitPrice: isBuyOrSell ? unitPrice : undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-800 text-white flex items-center justify-center shadow-xs">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900">
                ویرایش سند «{getTypeName(transaction.type)}»
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                طرف حساب: <b className="text-stone-800">{person?.name}</b>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
              {error}
            </div>
          )}

          {/* Date */}
          <div>
            <label htmlFor="edit-tx-date" className="block text-xs font-bold text-stone-700 mb-1.5">
              تاریخ تراکنش <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                id="edit-tx-date"
                type="text"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-3 pr-9 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600 font-mono"
              />
            </div>
          </div>

          {/* Weight & Unit Price if Buy or Sell */}
          {isBuyOrSell && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="edit-tx-weight" className="block text-xs font-bold text-stone-700 mb-1.5">
                  مقدار مس (کیلوگرم) <span className="text-rose-500">*</span>
                </label>
                <NumericInput
                  id="edit-tx-weight"
                  value={weightKg}
                  onChange={(val) => setWeightKg(val)}
                  allowDecimals={true}
                  unitLabel="کیلوگرم"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-tx-unit-price" className="block text-xs font-bold text-stone-700 mb-1.5">
                  قیمت هر کیلوگرم (تومان) <span className="text-rose-500">*</span>
                </label>
                <NumericInput
                  id="edit-tx-unit-price"
                  value={unitPrice}
                  onChange={(val) => setUnitPrice(val)}
                  unitLabel="تومان/کیلو"
                  required
                />
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label htmlFor="edit-tx-amount" className="block text-xs font-bold text-stone-700 mb-1.5">
              {isBuyOrSell ? 'مبلغ کل تراکنش (محاسبه خودکار)' : 'مبلغ تراکنش (تومان)'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            {isBuyOrSell ? (
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-300 flex items-center justify-between">
                <span className="text-xs text-stone-500">مبلغ کل:</span>
                <span className="font-bold text-base text-stone-900 font-mono">
                  {formatNumber(calculatedAmount)} <span className="text-xs font-normal">تومان</span>
                </span>
              </div>
            ) : (
              <NumericInput
                id="edit-tx-amount"
                value={amount}
                onChange={(val) => setAmount(val)}
                unitLabel="تومان"
                showWordHelper={true}
                required
              />
            )}
          </div>

          {/* Weight if adjustment */}
          {transaction.type === 'adjustment' && (
            <div>
              <label htmlFor="edit-tx-adj-weight" className="block text-xs font-bold text-stone-700 mb-1.5">
                تغییر موجودی مس (کیلوگرم)
              </label>
              <NumericInput
                id="edit-tx-adj-weight"
                value={weightKg}
                onChange={(val) => setWeightKg(val)}
                allowDecimals={true}
                unitLabel="کیلوگرم"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="edit-tx-notes" className="block text-xs font-bold text-stone-700 mb-1.5">
              توضیحات و بابت <span className="text-stone-400 font-normal">(اختیاری)</span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-stone-400 absolute right-3 top-3" />
              <textarea
                id="edit-tx-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full pl-3 pr-9 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 transition-all resize-none"
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              با ویرایش این سند، کلیه موجودی‌های ریالی، مس و سودهای بعدی شخص به‌صورت خودکار و دقیق از نو محاسبه خواهند شد.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold text-white bg-stone-900 hover:bg-black rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>ذخیره تغییرات سند</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
