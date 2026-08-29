import React, { useState, useEffect } from 'react';
import { X, Sliders, Calendar, User, FileText, Check, AlertCircle } from 'lucide-react';
import { Person, PersonWalletSummary } from '../types';
import { getTodayJalaliString } from '../utils/persianDate';
import { formatToman, formatWeight } from '../utils/formatters';
import { NumericInput } from './NumericInput';

interface AdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    personId: string;
    date: string;
    amount: number;
    weightKg: number;
    notes: string;
  }) => void;
  people: Person[];
  summaries: PersonWalletSummary[];
  selectedPersonId?: string;
}

export const AdjustmentModal: React.FC<AdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  people,
  summaries,
  selectedPersonId,
}) => {
  const [personId, setPersonId] = useState('');
  const [date, setDate] = useState(getTodayJalaliString());
  const [cashDirection, setCashDirection] = useState<'add' | 'subtract'>('add');
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [copperDirection, setCopperDirection] = useState<'add' | 'subtract'>('add');
  const [copperWeight, setCopperWeight] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPersonId(selectedPersonId || (people.length > 0 ? people[0].id : ''));
      setDate(getTodayJalaliString());
      setCashAmount(0);
      setCopperWeight(0);
      setCashDirection('add');
      setCopperDirection('add');
      setNotes('');
      setError('');
    }
  }, [isOpen, selectedPersonId, people]);

  const selectedPersonSummary = summaries.find((s) => s.person.id === personId);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personId) {
      setError('لطفاً فرد مورد نظر را انتخاب کنید.');
      return;
    }
    if (cashAmount === 0 && copperWeight === 0) {
      setError('حداقل یکی از موارد اصلاح ریالی یا اصلاح وزن مس باید وارد شود.');
      return;
    }
    if (!notes.trim()) {
      setError('ثبت علت اصلاح حساب در بخش توضیحات الزامی است.');
      return;
    }

    const finalAmount = cashDirection === 'add' ? cashAmount : -cashAmount;
    const finalWeight = copperDirection === 'add' ? copperWeight : -copperWeight;

    onSave({
      personId,
      date: date.trim() || getTodayJalaliString(),
      amount: finalAmount,
      weightKg: finalWeight,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-800 text-white flex items-center justify-center shadow-xs">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900">
                سند اصلاح حساب و تعدیل موجودی
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                تعدیل دستی موجودی ریالی یا وزن مس با ثبت دلیل
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

          {/* Person Selection */}
          <div>
            <label htmlFor="adj-person" className="block text-xs font-bold text-stone-700 mb-1.5">
              نام فرد / طرف حساب <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <select
                id="adj-person"
                value={personId}
                onChange={(e) => {
                  setPersonId(e.target.value);
                  setError('');
                }}
                required
                className="w-full pl-3 pr-9 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600 cursor-pointer"
              >
                <option value="" disabled>-- انتخاب کنید --</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedPersonSummary && (
            <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs flex justify-between">
              <div>
                <span className="text-stone-500">موجودی ریالی فعلی: </span>
                <span className="font-bold font-mono">{formatToman(selectedPersonSummary.cashBalance)}</span>
              </div>
              <div>
                <span className="text-stone-500">موجودی مس فعلی: </span>
                <span className="font-bold font-mono text-amber-900">{formatWeight(selectedPersonSummary.copperStockKg)}</span>
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <label htmlFor="adj-date" className="block text-xs font-bold text-stone-700 mb-1.5">
              تاریخ ثبت اصلاح <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                id="adj-date"
                type="text"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-3 pr-9 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 font-mono"
              />
            </div>
          </div>

          {/* Cash Adjustment */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800">تعدیل موجودی ریالی (تومان):</span>
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setCashDirection('add')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    cashDirection === 'add' ? 'bg-emerald-600 text-white font-bold' : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  + افزایش
                </button>
                <button
                  type="button"
                  onClick={() => setCashDirection('subtract')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    cashDirection === 'subtract' ? 'bg-rose-600 text-white font-bold' : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  - کاهش
                </button>
              </div>
            </div>
            <NumericInput
              value={cashAmount}
              onChange={(val) => setCashAmount(val)}
              placeholder="0"
              unitLabel="تومان"
              showWordHelper={true}
            />
          </div>

          {/* Copper Adjustment */}
          <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">تعدیل وزن مس (کیلوگرم):</span>
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setCopperDirection('add')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    copperDirection === 'add' ? 'bg-amber-700 text-white font-bold' : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  + افزایش
                </button>
                <button
                  type="button"
                  onClick={() => setCopperDirection('subtract')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    copperDirection === 'subtract' ? 'bg-rose-600 text-white font-bold' : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  - کاهش
                </button>
              </div>
            </div>
            <NumericInput
              value={copperWeight}
              onChange={(val) => setCopperWeight(val)}
              placeholder="0"
              unitLabel="کیلوگرم"
              allowDecimals={true}
            />
          </div>

          {/* Notes (Required) */}
          <div>
            <label htmlFor="adj-notes" className="block text-xs font-bold text-stone-700 mb-1.5">
              علت اصلاح حساب <span className="text-rose-500">* (الزامی)</span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-stone-400 absolute right-3 top-3" />
              <textarea
                id="adj-notes"
                rows={2}
                required
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="دلیل اصلاح (مثلاً: تخفیف ویژه، خطای ثبت قبلی، افت بار و پرتی، تسویه دستی...)"
                className="w-full pl-3 pr-9 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 transition-all resize-none"
              />
            </div>
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
              <span>ثبت سند اصلاح</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
