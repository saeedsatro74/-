import React, { useState, useEffect } from 'react';
import { X, Building2, CreditCard, Check, AlertCircle, Save } from 'lucide-react';
import { CompanyBankInfo } from '../types';
import { DEFAULT_COMPANY_BANK_INFO } from '../utils/storage';

interface CompanyBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankInfo?: CompanyBankInfo;
  initialInfo?: CompanyBankInfo;
  onSave: (newInfo: CompanyBankInfo) => void;
}

export const CompanyBankModal: React.FC<CompanyBankModalProps> = ({
  isOpen,
  onClose,
  bankInfo,
  initialInfo,
  onSave,
}) => {
  const effectiveInfo = bankInfo || initialInfo || DEFAULT_COMPANY_BANK_INFO;

  const [bankName, setBankName] = useState(effectiveInfo?.bankName || DEFAULT_COMPANY_BANK_INFO.bankName);
  const [ownerName, setOwnerName] = useState(effectiveInfo?.ownerName || DEFAULT_COMPANY_BANK_INFO.ownerName);
  const [cardNumber, setCardNumber] = useState(effectiveInfo?.cardNumber || DEFAULT_COMPANY_BANK_INFO.cardNumber);
  const [ibanNumber, setIbanNumber] = useState(effectiveInfo?.ibanNumber || DEFAULT_COMPANY_BANK_INFO.ibanNumber);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const info = bankInfo || initialInfo || DEFAULT_COMPANY_BANK_INFO;
      setBankName(info?.bankName || DEFAULT_COMPANY_BANK_INFO.bankName);
      setOwnerName(info?.ownerName || DEFAULT_COMPANY_BANK_INFO.ownerName);
      setCardNumber(info?.cardNumber || DEFAULT_COMPANY_BANK_INFO.cardNumber);
      setIbanNumber(info?.ibanNumber || DEFAULT_COMPANY_BANK_INFO.ibanNumber);
      setError('');
    }
  }, [isOpen, bankInfo, initialInfo]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!bankName.trim()) {
      setError('لطفاً نام بانک را وارد کنید.');
      return;
    }
    if (!ownerName.trim()) {
      setError('لطفاً نام صاحب حساب را وارد کنید.');
      return;
    }

    const cleanCard = cardNumber.replace(/\D/g, '');
    const cleanIban = ibanNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    // Format Card: 6037-9979-1234-5678
    let formattedCard = cardNumber.trim();
    if (cleanCard.length === 16) {
      formattedCard = `${cleanCard.slice(0, 4)}-${cleanCard.slice(4, 8)}-${cleanCard.slice(8, 12)}-${cleanCard.slice(12, 16)}`;
    }

    // Format IBAN: IR98 0170 0000 0012 3456 7890 01
    let formattedIbanStr = cleanIban;
    if (cleanIban.startsWith('IR') && cleanIban.length === 26) {
      formattedIbanStr = `${cleanIban.slice(0, 4)} ${cleanIban.slice(4, 8)} ${cleanIban.slice(8, 12)} ${cleanIban.slice(12, 16)} ${cleanIban.slice(16, 20)} ${cleanIban.slice(20, 24)} ${cleanIban.slice(24, 26)}`;
    }

    onSave({
      bankName: bankName.trim(),
      ownerName: ownerName.trim(),
      cardNumber: formattedCard,
      ibanNumber: cleanIban,
      rawCardNumber: cleanCard || cardNumber,
      formattedIban: formattedIbanStr,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-fadeIn dir-rtl">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-700 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg">تنظیمات حساب بانکی شرکت</h2>
              <p className="text-xs text-emerald-100">ویژه مدیرعامل (ویرایش شماره کارت و شبا جهت واریزی مشتریان)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Owner Name */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              نام صاحب حساب (نام شرکت / مدیرعامل)
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="مثال: شرکت بازرگانی مس واته (مدیریت رضایی)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-stone-900 font-semibold"
            />
          </div>

          {/* Bank Name */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              نام بانک صادرکننده
            </label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="مثال: بانک ملی ایران"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-stone-900 font-semibold"
            />
          </div>

          {/* Card Number */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center justify-between">
              <span>شماره کارت ۱۶ رقمی شرکت</span>
              <CreditCard className="w-4 h-4 text-stone-400" />
            </label>
            <input
              type="text"
              dir="ltr"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="6037-9979-1234-5678"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-mono font-bold text-stone-900 tracking-wider text-center"
            />
          </div>

          {/* IBAN Number */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              شماره شبا حساب (با IR)
            </label>
            <input
              type="text"
              dir="ltr"
              value={ibanNumber}
              onChange={(e) => setIbanNumber(e.target.value)}
              placeholder="IR980170000000123456789001"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-mono font-bold text-stone-900 text-center"
            />
          </div>

          {/* Notice Box */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
            <b>نکته مهم:</b> پس از ثبت شماره جدید، این اطلاعات بلافاصله در پنل تمامی مشتریان و فرم واریز حساب آن‌ها نمایش داده می‌شود تا مبالغ جدید به شماره حساب به‌روز شده واریز گردد.
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>ذخیره تغییرات شماره حساب</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
