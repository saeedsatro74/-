import React from 'react';
import { 
  Plus, 
  ShoppingBag, 
  TrendingUp, 
  UserPlus, 
  Database, 
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Tag,
  Edit2
} from 'lucide-react';
import { getPersianFullDate } from '../utils/persianDate';
import { formatNumber, formatToman, formatWeight } from '../utils/formatters';

interface HeaderProps {
  onAddPerson: () => void;
  onAddDeposit: () => void;
  onAddWithdrawal: () => void;
  onAddPurchase: () => void;
  onAddSale: () => void;
  onOpenMarketPrice: () => void;
  onOpenDataModal: () => void;
  totalStockKg: number;
  totalCash: number;
  marketPrice: number;
  isCloudConnected?: boolean;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onAddPerson,
  onAddDeposit,
  onAddWithdrawal,
  onAddPurchase,
  onAddSale,
  onOpenMarketPrice,
  onOpenDataModal,
  totalStockKg,
  totalCash,
  marketPrice,
  isCloudConnected = true,
  isSyncing = false,
}) => {
  const persianDate = getPersianFullDate();

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3.5 gap-3">
          
          {/* Logo and App Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 flex items-center justify-center text-white shadow-sm ring-2 ring-amber-500/20">
                <Layers className="w-5 h-5 text-amber-100" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
                    حسابداری و کیف پول معاملات مس
                  </h1>
                  <span className="bg-amber-100 text-amber-900 text-xs font-semibold px-2 py-0.5 rounded-md border border-amber-200/60 hidden sm:inline-block">
                    مدیریت دارایی دوگانه
                  </span>
                  
                  {/* Cloud Connection Badge */}
                  <div 
                    onClick={onOpenDataModal}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium cursor-pointer transition-colors border bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                    title="پایگاه داده ابری Supabase متصل است و تغییرات بلافاصله ذخیره می‌شوند"
                  >
                    <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-ping' : isCloudConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className="hidden md:inline">
                      {isSyncing ? 'در حال ذخیره ابری...' : isCloudConnected ? 'Supabase متصل' : 'آفلاین'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  <span>{persianDate}</span>
                  <span className="text-stone-300">•</span>
                  <span>موجودی انبار: <b className="font-semibold text-amber-800">{formatWeight(totalStockKg)}</b></span>
                </div>
              </div>
            </div>

            {/* Mobile Data Modal Icon */}
            <div className="lg:hidden flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenMarketPrice}
                className="p-2 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                title="تنظیم نرخ روز مس"
              >
                <Tag className="w-3.5 h-3.5 text-amber-700" />
                <span>نرخ مس</span>
              </button>
              <button
                type="button"
                onClick={onOpenDataModal}
                className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg border border-stone-200"
              >
                <Database className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Action & Market Price Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Market Price Widget */}
            <div 
              onClick={onOpenMarketPrice}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50/80 hover:bg-amber-100/80 border border-amber-300/80 rounded-lg cursor-pointer transition-colors"
              title="برای تغییر قیمت مرجع کلیک کنید"
            >
              <Tag className="w-3.5 h-3.5 text-amber-700" />
              <div className="text-xs">
                <span className="text-stone-500">قیمت روز مس: </span>
                <span className="font-bold text-amber-950 font-mono">{formatNumber(marketPrice)}</span>
                <span className="text-[11px] text-stone-500 mr-1">تومان/کیلو</span>
              </div>
              <Edit2 className="w-3 h-3 text-amber-700 mr-0.5" />
            </div>

            {/* Deposit Cash Button */}
            <button
              id="btn-deposit-header"
              type="button"
              onClick={onAddDeposit}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="واریز وجه به کیف پول شخص"
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-700" />
              <span>واریز وجه</span>
            </button>

            {/* Buy Copper Button */}
            <button
              id="btn-buy-header"
              type="button"
              onClick={onAddPurchase}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-amber-950 bg-amber-100/80 hover:bg-amber-200/70 active:bg-amber-200 border border-amber-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="ثبت خرید مس"
            >
              <ShoppingBag className="w-4 h-4 text-amber-800" />
              <span>خرید مس</span>
            </button>

            {/* Sell Copper Button */}
            <button
              id="btn-sell-header"
              type="button"
              onClick={onAddSale}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="ثبت فروش مس"
            >
              <TrendingUp className="w-4 h-4 text-blue-700" />
              <span>فروش مس</span>
            </button>

            {/* Add Person Button */}
            <button
              id="btn-add-person-header"
              type="button"
              onClick={onAddPerson}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 active:bg-black rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="افزودن شخص / طرف حساب جدید"
            >
              <UserPlus className="w-4 h-4" />
              <span>شخص جدید</span>
            </button>

            {/* Backup & Settings Button (Desktop) */}
            <button
              id="btn-data-modal"
              type="button"
              onClick={onOpenDataModal}
              className="hidden lg:flex p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors cursor-pointer"
              title="پشتیبان‌گیری، خروجی اکسل و تنظیمات داده‌ها"
            >
              <Database className="w-4 h-4" />
            </button>

          </div>
        </div>
      </div>
    </header>
  );
};
