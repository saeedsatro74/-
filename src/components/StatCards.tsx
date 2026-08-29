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

interface StatCardsProps {
  stats: OverallStats;
  onOpenMarketPrice?: () => void;
}

export const StatCards: React.FC<StatCardsProps> = ({ stats, onOpenMarketPrice }) => {
  const isProfitPositive = stats.totalRealizedProfit >= 0;

  return (
    <div className="space-y-3">
      
      {/* Top Banner: Market Price Bar */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-stone-900 text-white rounded-xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-amber-300">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-200">قیمت مرجع فعلی مس در بازار:</span>
              <span className="font-bold text-base sm:text-lg font-mono text-white">
                {formatNumber(stats.marketCopperPrice)}
              </span>
              <span className="text-xs text-amber-200">تومان/کیلو</span>
            </div>
            <p className="text-[11px] text-amber-200/80 mt-0.5">
              مبنای محاسبه ارزش روز دارایی مس افراد و انبار کل
            </p>
          </div>
        </div>

        {onOpenMarketPrice && (
          <button
            type="button"
            onClick={onOpenMarketPrice}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-950 bg-amber-100 hover:bg-white active:bg-amber-200 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>تغییر قیمت مرجع بازار</span>
          </button>
        )}
      </div>

      {/* Main Grid: 6 Statistical Asset Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        
        {/* 1. کل موجودی ریالی افراد (کیف پول‌ها) */}
        <div 
          id="card-stat-cash"
          className="bg-white rounded-xl border border-stone-200/90 p-3.5 shadow-xs relative overflow-hidden transition-all hover:border-emerald-400"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">کل موجودی ریالی</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight font-mono">
              {formatNumber(stats.totalCashBalance)}
              <span className="text-xs font-normal text-stone-500 mr-1">ت</span>
            </div>
            <div className="mt-1 text-[11px] text-stone-500">
              مجموع مانده نقدی در کیف پول‌ها
            </div>
          </div>
        </div>

        {/* 2. مجموع مس موجود در انبار */}
        <div 
          id="card-stat-stock"
          className="bg-white rounded-xl border border-stone-200/90 p-3.5 shadow-xs relative overflow-hidden transition-all hover:border-amber-400"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">مجموع مس موجود</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100/80 text-amber-800 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-lg sm:text-xl font-bold text-amber-900 tracking-tight font-mono">
              {formatWeight(stats.totalCopperStockKg, false)}
              <span className="text-xs font-normal text-stone-500 mr-1">کیلو</span>
            </div>
            <div className="mt-1 text-[11px] text-stone-500">
              {stats.activeStockPeopleCount} نفر دارای موجودی مس
            </div>
          </div>
        </div>

        {/* 3. ارزش فعلی کل مس */}
        <div 
          id="card-stat-copper-value"
          className="bg-white rounded-xl border border-stone-200/90 p-3.5 shadow-xs relative overflow-hidden transition-all hover:border-amber-500"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">ارزش روز کل مس</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight font-mono">
              {formatNumber(stats.totalCopperMarketValue)}
              <span className="text-xs font-normal text-stone-500 mr-1">ت</span>
            </div>
            <div className="mt-1 text-[11px] text-stone-500">
              با نرخ {formatNumber(stats.marketCopperPrice)} ت/ک
            </div>
          </div>
        </div>

        {/* 4. مجموع کل دارایی‌ها (ریالی + مس) */}
        <div 
          id="card-stat-total-asset"
          className="bg-amber-50/70 rounded-xl border border-amber-200 p-3.5 shadow-xs relative overflow-hidden transition-all hover:border-amber-400"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">مجموع کل دارایی‌ها</span>
            <div className="w-7 h-7 rounded-lg bg-amber-700 text-white flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-lg sm:text-xl font-extrabold text-amber-950 tracking-tight font-mono">
              {formatNumber(stats.totalAssetValue)}
              <span className="text-xs font-normal text-amber-900 mr-1">ت</span>
            </div>
            <div className="mt-1 text-[11px] text-amber-800">
              نقدینگی + ارزش مس انبار
            </div>
          </div>
        </div>

        {/* 5. مجموع سود واقعی */}
        <div 
          id="card-stat-profit"
          className={`bg-white rounded-xl border p-3.5 shadow-xs relative overflow-hidden transition-all ${
            isProfitPositive ? 'border-emerald-200 hover:border-emerald-400' : 'border-rose-200 hover:border-rose-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">مجموع سود معاملات</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              isProfitPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              <BadgePercent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className={`text-lg sm:text-xl font-bold tracking-tight font-mono ${
              isProfitPositive ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {stats.totalRealizedProfit > 0 ? '+' : ''}{formatNumber(stats.totalRealizedProfit)}
              <span className="text-xs font-normal text-stone-500 mr-1">ت</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px]">
              <span className={`font-semibold ${isProfitPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatPercent(stats.overallProfitPercentage)}
              </span>
              <span className="text-stone-400">بازدهی کل</span>
            </div>
          </div>
        </div>

        {/* 6. تعداد افراد / طرف حساب */}
        <div 
          id="card-stat-people"
          className="bg-white rounded-xl border border-stone-200/90 p-3.5 shadow-xs relative overflow-hidden transition-all hover:border-stone-400"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">تعداد طرف‌های حساب</span>
            <div className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight font-mono">
              {formatNumber(stats.totalPeopleCount)}
              <span className="text-xs font-normal text-stone-500 mr-1">نفر</span>
            </div>
            <div className="mt-1 text-[11px] text-stone-500">
              خرید کل: {formatNumber(stats.totalPurchasedKg)} کیلو
            </div>
          </div>
        </div>

      </section>
    </div>
  );
};
