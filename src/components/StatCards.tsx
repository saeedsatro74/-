import React from 'react';
import { 
  Wallet,
  Boxes, 
  ShoppingBag, 
  BadgePercent, 
  TrendingUp, 
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  Tag,
  Edit2
} from 'lucide-react';
import { OverallStats } from '../types';
import { formatNumber, formatToman, formatWeight, formatPercent } from '../utils/formatters';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

interface StatCardsProps {
  stats: OverallStats;
  userRole?: 'admin' | 'staff' | 'client';
  onOpenMarketPrice?: () => void;
  onOpenApprovals?: () => void;
  companyCopperStockKg?: number;
  onOpenEditCompanyStock?: () => void;
}

export const StatCards: React.FC<StatCardsProps> = ({ 
  stats, 
  userRole = 'admin', 
  onOpenMarketPrice, 
  onOpenApprovals,
  companyCopperStockKg = 0,
  onOpenEditCompanyStock
}) => {
  const isProfitPositive = stats.totalRealizedProfit >= 0;
  const pendingApprovalsCount = stats.pendingApprovalsCount || 0;

  return (
    <div className="space-y-3">
      
      {/* Zero Company Copper Stock Alert Banner (CEO Only) */}
      {userRole === 'admin' && companyCopperStockKg === 0 && onOpenEditCompanyStock && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 text-stone-950 rounded-xl p-3.5 sm:p-4 shadow-sm border border-amber-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-stone-950 text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-sm sm:text-base flex items-center gap-2">
                <span>موجودی مس انبار شرکت در حال حاضر «۰ کیلوگرم» است!</span>
              </div>
              <p className="text-xs text-stone-900 font-medium mt-0.5">
                جهت ثبت موجودی اولیه یا شارژ مس فیزیکی آماده تحویل در انبار مرکزی، دکمه روبرو را بزنید.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenEditCompanyStock}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-black text-white bg-stone-950 hover:bg-stone-900 rounded-xl transition-all cursor-pointer shrink-0 shadow-md ring-2 ring-stone-900/30 hover:scale-[1.02]"
          >
            <Boxes className="w-4 h-4 text-amber-400" />
            <span>+ وارد کردن موجودی مس انبار</span>
          </button>
        </div>
      )}

      {/* Pending Approvals Notice Banner */}
      {pendingApprovalsCount > 0 && (
        <div className="bg-amber-500 text-stone-950 rounded-xl p-3.5 sm:p-4 shadow-sm border border-amber-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-stone-950 text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm sm:text-base flex items-center gap-2">
                <span>تعداد {pendingApprovalsCount} معامله خرید/فروش مس در انتظار تأیید مدیرعامل است.</span>
              </div>
              <p className="text-xs text-stone-900 mt-0.5">
                {userRole === 'admin' 
                  ? 'جهت اعمال در دفاتر مالی و انبار، لطفاً معاملات را در کارتابل بررسی و تأیید فرمایید.' 
                  : 'این معاملات به کارتابل مدیرعامل ارسال شده و پس از تأیید نهایی ایشان در دفاتر ثبت خواهند شد.'}
              </p>
            </div>
          </div>
          {userRole === 'admin' && onOpenApprovals && (
            <button
              type="button"
              onClick={onOpenApprovals}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-stone-950 hover:bg-stone-900 rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              <span>ورود به کارتابل تأییدات</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}



      {/* Main Grid: 6 Statistical Asset Cards - High Density Layout */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        
        {/* 1. کل موجودی ریالی افراد (کیف پول‌ها) */}
        <div 
          id="card-stat-cash"
          className="bg-white rounded-lg border border-stone-200/90 p-2 sm:p-2.5 shadow-xs relative overflow-hidden transition-all hover:border-emerald-400"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-stone-500">کل موجودی ریالی</span>
            <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-xs sm:text-sm md:text-base font-bold text-stone-900 tracking-tight font-mono">
              {formatNumber(stats.totalCashBalance)}
              <span className="text-[10px] font-normal text-stone-500 mr-0.5">ت</span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-stone-500 truncate mt-0.5">
              مانده نقدی کل کیف پول‌ها
            </div>
          </div>
        </div>

        {/* 2. مجموع مس موجود در انبار */}
        <div 
          id="card-stat-stock"
          className="bg-white rounded-lg border border-stone-200/90 p-2 sm:p-2.5 shadow-xs relative overflow-hidden transition-all hover:border-amber-400 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-stone-500">مجموع مس مشتریان</span>
            <div className="w-6 h-6 rounded-md bg-amber-100/80 text-amber-800 flex items-center justify-center">
              <Boxes className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-xs sm:text-sm md:text-base font-bold text-amber-900 tracking-tight font-mono">
              {formatWeight(stats.totalCopperStockKg, false)}
              <span className="text-[10px] font-normal text-stone-500 mr-0.5">ک‌گ</span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-stone-500 truncate mt-0.5">
              مجموع دارایی مس مسجل مشتریان
            </div>
          </div>
        </div>

        {/* 3. ارزش فعلی کل مس */}
        <div 
          id="card-stat-copper-value"
          className="bg-white rounded-lg border border-stone-200/90 p-2 sm:p-2.5 shadow-xs relative overflow-hidden transition-all hover:border-amber-500"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-stone-500">ارزش روز کل مس</span>
            <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-800 flex items-center justify-center">
              <Tag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-xs sm:text-sm md:text-base font-bold text-stone-900 tracking-tight font-mono">
              {formatNumber(stats.totalCopperMarketValue)}
              <span className="text-[10px] font-normal text-stone-500 mr-0.5">ت</span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-stone-500 truncate mt-0.5">
              با نرخ {formatNumber(stats.marketCopperPrice)} ت/ک
            </div>
          </div>
        </div>

        {/* 4. مجموع کل دارایی‌ها (ریالی + مس) */}
        <div 
          id="card-stat-total-asset"
          className="bg-stone-900 text-white rounded-lg border border-stone-800 p-2 sm:p-2.5 shadow-xs relative overflow-hidden transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-stone-300">مجموع کل دارایی‌ها</span>
            <div className="w-6 h-6 rounded-md bg-stone-800 text-amber-400 flex items-center justify-center">
              <Landmark className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-xs sm:text-sm md:text-base font-extrabold text-white tracking-tight font-mono">
              {formatNumber(stats.totalAssetValue)}
              <span className="text-[10px] font-normal text-stone-400 mr-0.5">ت</span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-stone-400 truncate mt-0.5">
              نقدینگی + ارزش مس انبار
            </div>
          </div>
        </div>

        {/* 5. مجموع سود واقعی */}
        <div 
          id="card-stat-profit"
          className={`bg-white rounded-lg border p-2 sm:p-2.5 shadow-xs relative overflow-hidden transition-all ${
            isProfitPositive ? 'border-emerald-200 hover:border-emerald-400' : 'border-rose-200 hover:border-rose-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-stone-500">مجموع سود معاملات</span>
            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
              isProfitPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              <BadgePercent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className={`text-xs sm:text-sm md:text-base font-bold tracking-tight font-mono ${
              isProfitPositive ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {stats.totalRealizedProfit > 0 ? '+' : ''}{formatNumber(stats.totalRealizedProfit)}
              <span className="text-[10px] font-normal text-stone-500 mr-0.5">ت</span>
            </div>
            <div className="text-[9px] sm:text-[10px] flex items-center gap-1 mt-0.5 truncate">
              <span className={`font-semibold ${isProfitPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatPercent(stats.overallProfitPercentage)}
              </span>
              <span className="text-stone-400 truncate">بازدهی کل</span>
            </div>
          </div>
        </div>

        {/* 6. تعداد افراد / طرف حساب */}
        <div 
          id="card-stat-people"
          className="bg-white rounded-lg border border-stone-200/90 p-2 sm:p-2.5 shadow-xs relative overflow-hidden transition-all hover:border-stone-400"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-stone-500">تعداد طرف‌های حساب</span>
            <div className="w-6 h-6 rounded-md bg-stone-100 text-stone-700 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-xs sm:text-sm md:text-base font-bold text-stone-900 tracking-tight font-mono">
              {formatNumber(stats.totalPeopleCount)}
              <span className="text-[10px] font-normal text-stone-500 mr-0.5">نفر</span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-stone-500 truncate mt-0.5">
              خرید کل: {formatNumber(stats.totalPurchasedKg)} ک‌گ
            </div>
          </div>
        </div>

      </section>
    </div>
  );
};
