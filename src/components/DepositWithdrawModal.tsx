import React, { useState, useEffect } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, Calendar, User, FileText, Wallet } from 'lucide-react';
import { Person, PersonWalletSummary } from '../types';
import { getTodayJalaliString } from '../utils/persianDate';
import { formatToman, formatNumber } from '../utils/formatters';
import { NumericInput } from './NumericInput';

interface DepositWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'deposit' | 'withdrawal';
  onSave: (data: {
    personId: string;
    date: string;
    type: 'deposit' | 'withdrawal';
    amount: number;
    notes?: string;
  }) => void;
  people: Person[];
  summaries: PersonWalletSummary[];
  selectedPersonId?: string;
}

export const DepositWithdrawModal: React.FC<DepositWithdrawModalProps> = ({
  isOpen,
  onClose,
  type,
  onSave,
  people,
  summaries,
  selectedPersonId,
}) => {
  const [personId, setPersonId] = useState('');
  const [date, setDate] = useState(getTodayJalaliString());
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const prevIsOpenRef = React.useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setPersonId(selectedPersonId || (people.length > 0 ? people[0].id : ''));
      setDate(getTodayJalaliString());
      setAmount(0);
      setNotes('');
      setError('');
    } else if (isOpen) {
      setPersonId((prev) => {
        if (prev && people.some((p) => p.id === prev)) return prev;
        return selectedPersonId || (people.length > 0 ? people[0].id : '');
      });
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, selectedPersonId, people]);

  const selectedPersonSummary = summaries.find((s) => s.person.id === personId);
  const currentCash = selectedPersonSummary?.cashBalance || 0;

  if (!isOpen) return null;

  const isDeposit = type === 'deposit';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personId) {
      setError('لطفاً فرد مورد نظر را انتخاب کنید.');
      return;
    }
    if (amount <= 0) {
      setError('لطفاً مبلغ معتبر (بیشتر از صفر) را وارد کنید.');
      return;
    }
    if (!isDeposit && amount > currentCash) {
      setError(`موجودی ریالی شخص کافی نیست! حداکثر مبلغ قابل برداشت: ${formatToman(currentCash)}`);
      return;
    }

    onSave({
      personId,
      date: date.trim() || getTodayJalaliString(),
      type,
      amount,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 py-4 sm:py-6">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-md my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header (Sticky at top) */}
        <div className={`p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between shrink-0 z-10 ${
          isDeposit ? 'bg-emerald-50/90' : 'bg-rose-50/90'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center shadow-xs ${
              isDeposit ? 'bg-emerald-600' : 'bg-rose-600'
            }`}>
              {isDeposit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900">
                {isDeposit ? 'واریز وجه به کیف پول' : 'برداشت وجه از کیف پول'}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {isDeposit 
                  ? 'افزایش موجودی ریالی و شارژ حساب سرمایه‌گذاری' 
                  : 'کسر وجه و تسویه نقدینگی از حساب شخص'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-stone-200 transition-colors cursor-pointer"
            title="بستن پنجره"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-5 space-y-4 flex-1">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium leading-relaxed">
              {error}
            </div>
          )}

          {/* Person Selection */}
          <div>
            <label htmlFor="dep-person" className="block text-xs font-bold text-stone-700 mb-1.5">
              طرف حساب / نام شخص <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <select
                id="dep-person"
                value={personId}
                onChange={(e) => {
                  setPersonId(e.target.value);
                  setError('');
                }}
                required
                className="w-full pl-3 pr-9 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600 transition-all cursor-pointer"
              >
                <option value="" disabled>-- انتخاب شخص --</option>
                {people.map((p) => {
                  const pSummary = summaries.find((s) => s.person.id === p.id);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} {pSummary ? `(موجودی ریالی: ${formatNumber(pSummary.cashBalance)} ت)` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Current Person Balance Preview Card */}
          {selectedPersonSummary && (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-stone-600">
                <Wallet className="w-4 h-4 text-amber-700" />
                <span>موجودی ریالی فعلی شخص:</span>
              </div>
              <div className="font-bold text-stone-900 font-mono">
                {formatToman(selectedPersonSummary.cashBalance)}
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <label htmlFor="dep-date" className="block text-xs font-bold text-stone-700 mb-1.5">
              تاریخ تراکنش <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                id="dep-date"
                type="text"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="1403/12/10"
                className="w-full pl-3 pr-9 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 transition-all font-mono"
              />
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label htmlFor="dep-amount" className="block text-xs font-bold text-stone-700 mb-1.5">
              مبلغ {isDeposit ? 'واریزی' : 'برداشتی'} (تومان) <span className="text-rose-500">*</span>
            </label>
            <NumericInput
              id="dep-amount"
              value={amount}
              onChange={(val) => {
                setAmount(val);
                setError('');
              }}
              unitLabel="تومان"
              placeholder="مثال: 50,000,000"
              showWordHelper={true}
              required
            />
          </div>

          {/* New Balance After Transaction Preview */}
          {amount > 0 && selectedPersonSummary && (
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              isDeposit 
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                : 'bg-stone-100 border-stone-200 text-stone-900'
            }`}>
              <span>موجودی ریالی پس از این تراکنش:</span>
              <span className="font-bold font-mono text-sm">
                {formatToman(isDeposit ? currentCash + amount : currentCash - amount)}
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="dep-notes" className="block text-xs font-bold text-stone-700 mb-1.5">
              توضیحات و شماره فیش / واریزی <span className="text-stone-400 font-normal">(اختیاری)</span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-stone-400 absolute right-3 top-3" />
              <textarea
                id="dep-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="شماره پیگیری چک، ساتنا، پایا، کارت به کارت..."
                className="w-full pl-3 pr-9 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 transition-all resize-none"
              />
            </div>
          </div>

          </div>

          {/* Footer Actions (Fixed at bottom) */}
          <div className="p-4 border-t border-stone-200 bg-stone-50/90 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 bg-stone-200/70 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-sm font-bold text-white rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1.5 ${
                isDeposit 
                  ? 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900' 
                  : 'bg-rose-700 hover:bg-rose-800 active:bg-rose-900'
              }`}
            >
              {isDeposit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
              <span>{isDeposit ? 'ثبت واریز وجه' : 'ثبت برداشت وجه'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
