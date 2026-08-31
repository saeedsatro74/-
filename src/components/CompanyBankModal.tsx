import React, { useState, useEffect } from 'react';
import { X, Building2, CreditCard, Check, AlertCircle, Save, Plus, Trash2, Edit3, Star } from 'lucide-react';
import { CompanyBankAccount, CompanyBankInfo } from '../types';
import { getStoredCompanyBankAccounts, saveCompanyBankAccounts } from '../utils/storage';

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
  onSave,
}) => {
  const [accounts, setAccounts] = useState<CompanyBankAccount[]>([]);
  const [editingAccount, setEditingAccount] = useState<CompanyBankAccount | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [bankName, setBankName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [ibanNumber, setIbanNumber] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredCompanyBankAccounts();
      setAccounts(stored);
      setIsAdding(false);
      setEditingAccount(null);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setEditingAccount(null);
    setBankName('');
    setOwnerName('شرکت بازرگانی مس واته (مدیریت رضایی)');
    setCardNumber('');
    setIbanNumber('');
    setError('');
    setIsAdding(true);
  };

  const handleStartEdit = (acc: CompanyBankAccount) => {
    setEditingAccount(acc);
    setBankName(acc.bankName);
    setOwnerName(acc.ownerName);
    setCardNumber(acc.cardNumber);
    setIbanNumber(acc.ibanNumber);
    setError('');
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (accounts.length <= 1) {
      setError('حداقل یک شماره حساب باید در سیستم ثبت باشد.');
      return;
    }
    const filtered = accounts.filter((a) => a.id !== id);
    setAccounts(filtered);
    saveCompanyBankAccounts(filtered);
    if (filtered.length > 0) {
      const defaultAcc = filtered.find((a) => a.isDefault) || filtered[0];
      onSave(defaultAcc);
    }
  };

  const handleSetDefault = (id: string) => {
    const updated = accounts.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    setAccounts(updated);
    saveCompanyBankAccounts(updated);
    const selected = updated.find((a) => a.id === id);
    if (selected) {
      onSave(selected);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
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

    let formattedCard = cardNumber.trim();
    if (cleanCard.length === 16) {
      formattedCard = `${cleanCard.slice(0, 4)}-${cleanCard.slice(4, 8)}-${cleanCard.slice(8, 12)}-${cleanCard.slice(12, 16)}`;
    }

    let formattedIbanStr = cleanIban;
    if (cleanIban.startsWith('IR') && cleanIban.length === 26) {
      formattedIbanStr = `${cleanIban.slice(0, 4)} ${cleanIban.slice(4, 8)} ${cleanIban.slice(8, 12)} ${cleanIban.slice(12, 16)} ${cleanIban.slice(16, 20)} ${cleanIban.slice(20, 24)} ${cleanIban.slice(24, 26)}`;
    }

    const newAcc: CompanyBankAccount = {
      id: editingAccount ? editingAccount.id : `bank-${Date.now()}`,
      bankName: bankName.trim(),
      ownerName: ownerName.trim(),
      cardNumber: formattedCard,
      ibanNumber: cleanIban,
      rawCardNumber: cleanCard || cardNumber,
      formattedIban: formattedIbanStr,
      isDefault: editingAccount ? editingAccount.isDefault : accounts.length === 0,
    };

    let updatedList: CompanyBankAccount[];
    if (editingAccount) {
      updatedList = accounts.map((a) => (a.id === editingAccount.id ? newAcc : a));
    } else {
      updatedList = [...accounts, newAcc];
    }

    setAccounts(updatedList);
    saveCompanyBankAccounts(updatedList);

    const defaultAcc = updatedList.find((a) => a.isDefault) || updatedList[0];
    onSave(defaultAcc);

    setIsAdding(false);
    setEditingAccount(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-fadeIn dir-rtl">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-emerald-800 text-white px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg">مدیریت حساب‌های بانکی شرکت</h2>
              <p className="text-xs text-emerald-100">تعریف شماره کارت و شبای اختصاصی جهت ارسال به مشتریان</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isAdding ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">
                  لیست حساب‌های فعال ({accounts.length} حساب)
                </span>
                <button
                  type="button"
                  onClick={handleStartAdd}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن حساب جدید</span>
                </button>
              </div>

              <div className="space-y-3">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      acc.isDefault
                        ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/30'
                        : 'bg-stone-50 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-stone-200/60 mb-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-700" />
                        <span className="font-extrabold text-stone-900 text-sm">
                          {acc.bankName}
                        </span>
                        {acc.isDefault && (
                          <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3 fill-white" />
                            حساب اصلی
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {!acc.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(acc.id)}
                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                          >
                            پیش‌فرض شود
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(acc)}
                          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(acc.id)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-stone-600 mb-2">
                      صاحب حساب: <b className="text-stone-800">{acc.ownerName}</b>
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono bg-white p-2.5 rounded-xl border border-stone-200">
                      <div>
                        <span className="text-stone-400 font-sans block text-[10px]">شماره کارت:</span>
                        <span className="font-bold text-stone-900 tracking-wider dir-ltr inline-block">
                          {acc.cardNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 font-sans block text-[10px]">شماره شبا:</span>
                        <span className="font-bold text-stone-900 dir-ltr inline-block truncate max-w-full">
                          {acc.ibanNumber}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitForm} className="space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <span className="text-xs font-bold text-stone-800">
                  {editingAccount ? 'ویرایش حساب بانکی' : 'ثبت شماره حساب جدید'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-stone-500 hover:text-stone-800 font-bold cursor-pointer"
                >
                  بازگشت به لیست
                </button>
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  نام بانک صادرکننده <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="مثال: بانک پاسارگاد"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
                />
              </div>

              {/* Owner Name */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  نام صاحب حساب <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="مثال: شرکت بازرگانی مس واته (مدیریت رضایی)"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
                />
              </div>

              {/* Card Number */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                  <span>شماره کارت ۱۶ رقمی</span>
                  <CreditCard className="w-3.5 h-3.5 text-stone-400" />
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="6037-9979-1234-5678"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-mono font-bold tracking-wider text-center"
                />
              </div>

              {/* IBAN Number */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  شماره شبا (با IR)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={ibanNumber}
                  onChange={(e) => setIbanNumber(e.target.value)}
                  placeholder="IR980170000000123456789001"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-mono font-bold text-center"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingAccount ? 'ذخیره تغییرات' : 'افزودن حساب'}</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-stone-500">
            مدیرعامل هنگام بررسی درخواست‌های شارژ می‌تواند هر یک از این حساب‌ها را انتخاب کند.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            بستن
          </button>
        </div>

      </div>
    </div>
  );
};
