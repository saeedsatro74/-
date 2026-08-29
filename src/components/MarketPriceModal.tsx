import React, { useState } from 'react';
import { X, Tag, DollarSign, Check, Info } from 'lucide-react';
import { NumericInput } from './NumericInput';
import { formatToman } from '../utils/formatters';

interface MarketPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrice: number;
  onSave: (newPrice: number) => void;
}

export const MarketPriceModal: React.FC<MarketPriceModalProps> = ({
  isOpen,
  onClose,
  currentPrice,
  onSave,
}) => {
  const [price, setPrice] = useState(currentPrice);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setPrice(currentPrice);
      setError('');
    }
  }, [isOpen, currentPrice]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (price <= 0) {
      setError('لطفاً قیمت معتبر برای هر کیلوگرم مس وارد کنید.');
      return;
    }
    onSave(price);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-amber-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-700 text-white flex items-center justify-center shadow-xs">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900">
                تنظیم قیمت روز مس در بازار
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                محاسبه خودکار ارزش روز دارایی مس تمام افراد و انبار
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

          <div>
            <label htmlFor="market-price-input" className="block text-xs font-bold text-stone-700 mb-1.5">
              قیمت مرجع هر کیلوگرم مس (تومان) <span className="text-rose-500">*</span>
            </label>
            <NumericInput
              id="market-price-input"
              value={price}
              onChange={(val) => {
                setPrice(val);
                setError('');
              }}
              placeholder="مثال: 750,000"
              unitLabel="تومان/کیلو"
              showWordHelper={true}
              autoFocus
              required
            />
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-stone-700">
              <Info className="w-3.5 h-3.5 text-amber-700" />
              <span>نحوه عملکرد قیمت مرجع:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              ارزش مس موجود در انبار هر شخص بر اساس فرمول «موجودی مس × قیمت مرجع» محاسبه شده و بلافاصله ارزش کل دارایی‌های افراد در داشبورد و کاردکس به‌روزرسانی می‌شود.
            </p>
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
              className="px-5 py-2 text-sm font-bold text-white bg-amber-700 hover:bg-amber-800 active:bg-amber-900 rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>به‌روزرسانی قیمت</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
