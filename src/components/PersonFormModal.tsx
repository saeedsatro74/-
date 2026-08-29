import React, { useState, useEffect } from 'react';
import { X, UserPlus, Edit3, User, Phone, FileText } from 'lucide-react';
import { Person } from '../types';
import { getTodayJalaliString } from '../utils/persianDate';

interface PersonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (personData: { name: string; phone?: string; notes?: string }) => void;
  initialPerson?: Person | null;
}

export const PersonFormModal: React.FC<PersonFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPerson,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialPerson) {
      setName(initialPerson.name || '');
      setPhone(initialPerson.phone || '');
      setNotes(initialPerson.notes || '');
    } else {
      setName('');
      setPhone('');
      setNotes('');
    }
    setError('');
  }, [initialPerson, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('لطفاً نام و نام خانوادگی را وارد کنید');
      return;
    }

    onSave({
      name: name.trim(),
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-stone-200 bg-stone-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-stone-900 text-white flex items-center justify-center">
              {initialPerson ? <Edit3 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900">
                {initialPerson ? 'ویرایش اطلاعات شخص' : 'افزودن شخص جدید'}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {initialPerson ? 'ویرایش مشخصات و اطلاعات تماس' : 'ثبت نام و اطلاعات طرف حساب جدید'}
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

          {/* Name Field */}
          <div>
            <label htmlFor="person-name" className="block text-xs font-bold text-stone-700 mb-1.5">
              نام و نام خانوادگی <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                id="person-name"
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="مثال: مهندس حسینی (پروژه چیلر)"
                className="w-full pl-3 pr-9 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600 transition-all"
              />
            </div>
          </div>

          {/* Phone Field */}
          <div>
            <label htmlFor="person-phone" className="block text-xs font-bold text-stone-700 mb-1.5">
              شماره تماس <span className="text-stone-400 font-normal">(اختیاری)</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                id="person-phone"
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912..."
                className="w-full pl-3 pr-9 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600 transition-all text-left font-mono"
              />
            </div>
          </div>

          {/* Notes Field */}
          <div>
            <label htmlFor="person-notes" className="block text-xs font-bold text-stone-700 mb-1.5">
              توضیحات <span className="text-stone-400 font-normal">(اختیاری)</span>
            </label>
            <div className="relative">
              <textarea
                id="person-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="توضیحات تکمیلی، آدرس کارگاه، نوع لوله درخواستی و..."
                className="w-full p-3 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600 transition-all resize-none"
              />
            </div>
          </div>

          {/* Footer Buttons */}
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
              className="px-5 py-2 text-sm font-bold text-white bg-stone-900 hover:bg-stone-800 active:bg-black rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              {initialPerson ? 'ذخیره تغییرات' : 'ثبت شخص جدید'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
