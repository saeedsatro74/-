import React from 'react';
import { 
  ShoppingBag, 
  TrendingUp, 
  UserPlus, 
  Database, 
  Calendar,
  Layers,
  ArrowDownLeft,
  Tag,
  Edit2,
  LogOut,
  CreditCard
} from 'lucide-react';
import { getPersianFullDate } from '../utils/persianDate';
import { formatNumber, formatWeight } from '../utils/formatters';

interface HeaderProps {
  onAddPerson: () => void;
  onAddDeposit: () => void;
  onAddWithdrawal: () => void;
  onAddPurchase: () => void;
  onAddSale: () => void;
  onOpenMarketPrice: () => void;
  onOpenDataModal: () => void;
  onOpenChequesModal?: () => void;
  pendingChequesCount?: number;
  onLogout?: () => void;
  totalStockKg: number;
  totalCash: number;
  marketPrice: number;
  marketBuyPrice?: number;
  marketSellPrice?: number;
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
  onOpenChequesModal,
  pendingChequesCount = 0,
  onLogout,
  totalStockKg,
  marketPrice,
  marketBuyPrice,
  marketSellPrice,
  isCloudConnected = true,
  isSyncing = false,
}) => {
  const persianDate = getPersianFullDate();
  const buyRate = marketBuyPrice || marketPrice;
  const sellRate = marketSellPrice || Math.max(0, buyRate - 150000);

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 gap-3">
          
          {/* Logo and App Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center font-black tracking-wider text-base shadow-sm">
                واته
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                    سامانه معاملات مس واته
                  </h1>
                  <span className="text-[11px] font-medium text-stone-500 hidden sm:inline-block">
                    (Waateh)
                  </span>
                  
                  {/* Clean Server Status Badge */}
                  <div 
                    onClick={onOpenDataModal}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium cursor-pointer transition-colors bg-stone-100 text-stone-700 hover:bg-stone-200"
                    title="وضعیت اتصال سرور داده‌های آنلاین"
                  >
                    <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-ping' : isCloudConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className="hidden md:inline">
                      {isSyncing ? 'در حال ذخیره...' : isCloudConnected ? 'سرور آنلاین' : 'آفلاین'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  <span>{persianDate}</span>
                  <span className="text-stone-300">•</span>
                  <span>موجودی انبار: <b className="font-semibold text-stone-800">{formatWeight(totalStockKg)}</b></span>
                </div>
              </div>
            </div>

            {/* Mobile Data & Market Price Buttons */}
            <div className="lg:hidden flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenMarketPrice}
                className="px-2.5 py-1.5 text-stone-800 bg-stone-100 border border-stone-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                title="تنظیم نرخ مس"
              >
                <Tag className="w-3.5 h-3.5 text-stone-600" />
                <span>نرخ مس</span>
              </button>
              <button
                type="button"
                onClick={onOpenDataModal}
                className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg border border-stone-200"
                title="مدیریت داده‌ها"
              >
                <Database className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Action Toolbar - Calm & Harmonious Palette */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Market Price Widget */}
            <div 
              onClick={onOpenMarketPrice}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg cursor-pointer transition-colors"
              title="برای تغییر قیمت‌های مرجع خرید و فروش کلیک کنید"
            >
              <Tag className="w-3.5 h-3.5 text-stone-600" />
              <div className="text-xs flex items-center gap-1.5">
                <span className="text-stone-500">خرید:</span>
                <span className="font-bold text-stone-900 font-mono">{formatNumber(buyRate)}</span>
                <span className="text-stone-300">|</span>
                <span className="text-stone-500">فروش:</span>
                <span className="font-bold text-stone-900 font-mono">{formatNumber(sellRate)}</span>
                <span className="text-[11px] text-stone-400 mr-0.5">تومان</span>
              </div>
              <Edit2 className="w-3 h-3 text-stone-400 mr-0.5" />
            </div>

            {/* Deposit Cash Button */}
            <button
              id="btn-deposit-header"
              type="button"
              onClick={onAddDeposit}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg transition-colors cursor-pointer"
              title="واریز وجه به کیف پول شخص"
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              <span>واریز وجه</span>
            </button>

            {/* Buy Copper Button */}
            <button
              id="btn-buy-header"
              type="button"
              onClick={onAddPurchase}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-stone-800 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 rounded-lg transition-colors cursor-pointer"
              title="ثبت خرید مس"
            >
              <ShoppingBag className="w-4 h-4 text-amber-700" />
              <span>خرید مس</span>
            </button>

            {/* Sell Copper Button */}
            <button
              id="btn-sell-header"
              type="button"
              onClick={onAddSale}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg transition-colors cursor-pointer"
              title="ثبت فروش مس"
            >
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>فروش مس</span>
            </button>

            {/* Add Person Button */}
            <button
              id="btn-add-person-header"
              type="button"
              onClick={onAddPerson}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer shadow-xs"
              title="افزودن طرف حساب جدید"
            >
              <UserPlus className="w-4 h-4" />
              <span>شخص جدید</span>
            </button>

            {/* Backup & Settings Button */}
            <button
              id="btn-data-modal"
              type="button"
              onClick={onOpenDataModal}
              className="hidden lg:flex p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors cursor-pointer"
              title="پشتیبان‌گیری و تنظیمات داده‌ها"
            >
              <Database className="w-4 h-4" />
            </button>

            {/* Logout / Lock Button */}
            {onLogout && (
              <button
                id="btn-logout"
                type="button"
                onClick={() => {
                  if (window.confirm('آیا می‌خواهید از سامانه خارج شوید و صفحه قفل شود؟')) {
                    onLogout();
                  }
                }}
                className="p-2 text-stone-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-stone-200 transition-colors cursor-pointer"
                title="قفل و خروج از سامانه"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

          </div>
        </div>
      </div>
    </header>
  );
};
