import React, { useState } from 'react';
import { Layers, ShoppingBag, Edit3, ShieldCheck, Sparkles, ArrowLeft, Info, CheckCircle2 } from 'lucide-react';
import { formatNumber, formatToman, formatWeight } from '../utils/formatters';
import { PersonWalletSummary, MarketPrices } from '../types';

interface CompanyCopperStockCardProps {
  companyCopperStockKg: number;
  marketPrices: MarketPrices;
  userRole?: 'admin' | 'staff' | 'client';
  clientSummary?: PersonWalletSummary;
  onOpenBuyModal?: () => void;
  onOpenEditStockModal?: () => void;
}

export const CompanyCopperStockCard: React.FC<CompanyCopperStockCardProps> = ({
  companyCopperStockKg,
  marketPrices,
  userRole = 'admin',
  clientSummary,
  onOpenBuyModal,
  onOpenEditStockModal,
}) => {
  const isClient = userRole === 'client';
  const buyPrice = marketPrices.buyPrice || 3000000;
  
  // Calculate company copper value in Toman
  const totalValueToman = Math.round(companyCopperStockKg * buyPrice);
  
  // Convert kg to tons
  const stockTons = (companyCopperStockKg / 1000).toFixed(3);

  // Client max purchase capacity calculations
  const clientCash = clientSummary?.cashBalance || 0;
  const maxKgClientCanAfford = buyPrice > 0 ? Math.floor((clientCash / buyPrice) * 100) / 100 : 0;
  const maxKgPurchasable = Math.min(maxKgClientCanAfford, companyCopperStockKg);
  const maxTonsPurchasable = (maxKgPurchasable / 1000).toFixed(3);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-stone-950 via-amber-950 to-stone-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-amber-600/40">
      
      {/* Background Metallic Copper Glow Effect */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-amber-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-orange-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-amber-800/40 relative z-10">
        <div className="flex items-center gap-3">
          {/* Metallic Copper Icon Badge */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-700 via-orange-500 to-amber-400 p-0.5 shadow-lg shadow-amber-900/50 shrink-0">
            <div className="w-full h-full bg-stone-950 rounded-[14px] flex items-center justify-center text-amber-400">
              <Layers className="w-6 h-6 animate-pulse" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-amber-100">
                موجود مـس آمـاده تحویـل شـرکت (انـبـار مـرکـزی)
              </h2>
              <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold">
                <Sparkles className="w-3 h-3 text-amber-400" />
                تحویل آنی
              </span>
            </div>
            <p className="text-xs text-amber-200/70 mt-0.5">
              موجودی مس خالص شرکت جهت فروش و تخصیص به کیف پول مشتریان
            </p>
          </div>
        </div>

        {/* Action Button for CEO or Client */}
        {!isClient && onOpenEditStockModal && (
          <button
            type="button"
            onClick={onOpenEditStockModal}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-stone-950 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 rounded-xl transition-all shadow-md cursor-pointer shrink-0"
          >
            <Edit3 className="w-4 h-4" />
            <span>ویرایش / شارژ موجودی مس شرکت</span>
          </button>
        )}

        {isClient && onOpenBuyModal && (
          companyCopperStockKg <= 0 ? (
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-black text-stone-500 bg-stone-800 border border-stone-700 rounded-xl transition-all shadow-lg cursor-not-allowed shrink-0"
            >
              <ShoppingBag className="w-4 h-4 text-stone-600" />
              <span>اتمام موجودی مس شرکت</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenBuyModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-black text-stone-950 bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400 hover:from-amber-300 hover:to-orange-300 rounded-xl transition-all shadow-lg cursor-pointer shrink-0 animate-bounce-slow"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>خرید مس از شرکت</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          )
        )}
      </div>

      {/* Main Stock Display Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 relative z-10 items-center">
        
        {/* Left Side: 3D Copper Ingot Graphic & Metric Numbers */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="flex flex-wrap items-baseline gap-3">
            {/* Stock in Tons */}
            <div className="bg-amber-950/60 border border-amber-700/50 rounded-2xl px-4 py-3 text-center sm:text-right flex-1 min-w-[160px]">
              <span className="text-xs text-amber-300/80 font-medium block">موجودی به تن:</span>
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-amber-300">
                {formatNumber(Number(stockTons), 3)}
                <span className="text-sm font-extrabold text-amber-400 mr-2">تن</span>
              </div>
            </div>

            {/* Stock in Kg */}
            <div className="bg-amber-950/60 border border-amber-700/50 rounded-2xl px-4 py-3 text-center sm:text-right flex-1 min-w-[160px]">
              <span className="text-xs text-amber-300/80 font-medium block">موجودی به کیلوگرم:</span>
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-amber-100">
                {formatNumber(companyCopperStockKg, 1)}
                <span className="text-sm font-extrabold text-amber-400 mr-2">کیلوگرم</span>
              </div>
            </div>
          </div>

          {/* Copper Valuation & Rate Details */}
          <div className="flex flex-wrap items-center justify-between text-xs text-amber-200/80 bg-stone-900/80 p-3 rounded-xl border border-stone-800 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-amber-400">ارزش کل موجودی مس:</span>
              <b className="font-mono text-sm text-white">{formatToman(totalValueToman)}</b>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-amber-300/70">
              <span>(با نرخ روز {formatToman(buyPrice)} / کیلو)</span>
            </div>
          </div>

        </div>

        {/* Right Side: 3D Visual Ingot Representation & Client Purchasing Limit */}
        <div className="lg:col-span-5 bg-gradient-to-b from-stone-900/90 to-amber-950/80 p-4 rounded-2xl border border-amber-700/30 space-y-3">
          
          {/* 3D Shiny Ingot Bars Visual Graphic */}
          <div className="relative py-2 px-3 bg-stone-950/80 rounded-xl border border-amber-800/40 flex items-center justify-around overflow-hidden">
            <div className="flex items-center gap-3">
              {/* Stacked 3D Ingot Art */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                {/* Top Ingot */}
                <div className="w-16 h-4 bg-gradient-to-r from-amber-600 via-orange-400 to-amber-700 rounded-sm shadow-md border-t border-amber-300/60 relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-sm" />
                </div>
                {/* Middle Ingot */}
                <div className="w-20 h-4 bg-gradient-to-r from-amber-700 via-orange-500 to-amber-800 rounded-sm shadow-md border-t border-amber-400/50 relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-sm" />
                </div>
                {/* Base Ingot */}
                <div className="w-24 h-5 bg-gradient-to-r from-amber-800 via-amber-600 to-amber-900 rounded-sm shadow-lg border-t border-amber-400/70 relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent rounded-sm" />
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>انبار مس خالص (کاتد / ۹۹.۹۹٪)</span>
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  آماده تحویل فوری و ثبت فاکتور
                </p>
              </div>
            </div>
          </div>

          {/* Client Purchase Limit Indicator */}
          {isClient && clientSummary && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-300">حد مجاز خرید با موجودی شما:</span>
                <b className="text-amber-300 font-mono text-xs">
                  {maxKgPurchasable > 0 
                    ? `${formatNumber(maxKgPurchasable, 1)} کیلوگرم (${maxTonsPurchasable} تن)` 
                    : 'موجودی ریالی کافی نیست'}
                </b>
              </div>

              {/* Progress Bar of Available Cash to Buy Stock */}
              <div className="w-full bg-stone-950 rounded-full h-2.5 p-0.5 border border-amber-900/60">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-orange-400 h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min(100, Math.max(5, (maxKgPurchasable / (companyCopperStockKg || 1)) * 100))}%` 
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-stone-400">
                <span>موجودی کیف پول: {formatToman(clientCash)}</span>
                <span>تأمین تا {companyCopperStockKg} کیلو</span>
              </div>
            </div>
          )}

          {!isClient && (
            <div className="flex items-center justify-between text-xs text-amber-200/90 pt-1">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                تأمین مس برای خرید تمام مشتریان
              </span>
              <span className="font-mono text-amber-400 font-bold">{stockTons} تن</span>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
