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
    <div className="relative overflow-hidden bg-gradient-to-r from-stone-950 via-amber-950 to-stone-900 text-white rounded-xl p-3 sm:p-4 shadow-md border border-amber-600/35">
      
      {/* Background Subtle Glow Effect */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-600/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Modern, High-Density Layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        
        {/* Left Side: Label & Quantities */}
        <div className="flex items-center gap-2.5">
          {/* Compact Icon */}
          <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold text-amber-100">
                موجودی مس آماده تحویل شرکت (انبار مرکزی)
              </h2>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-md text-[9px] font-black">
                تحویل آنی
              </span>
            </div>
            
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-base sm:text-lg font-black text-amber-300 font-mono">
                {formatNumber(Number(stockTons), 3)}
                <span className="text-[10px] font-medium text-amber-400 mr-0.5">تن</span>
              </span>
              <span className="text-xs text-stone-300 font-mono">
                ({formatNumber(companyCopperStockKg, 1)} کیلوگرم)
              </span>
              <span className="text-[10px] text-amber-200/60 hidden md:inline-block">
                ارزش کل: {formatToman(totalValueToman)} (نرخ روز {formatToman(buyPrice)})
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Action Button & Capacity */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {isClient && clientSummary && (
            <div className="text-right hidden md:block text-[10px] text-stone-300 ml-2">
              <div>حد خرید شما: <b className="text-amber-300 font-mono">{maxKgPurchasable > 0 ? `${formatNumber(maxKgPurchasable, 1)} ک‌گ` : 'عدم موجودی ریالی'}</b></div>
              <div className="w-24 bg-stone-950 rounded-full h-1 mt-1 overflow-hidden border border-amber-900/40">
                <div 
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, (maxKgPurchasable / (companyCopperStockKg || 1)) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {!isClient && onOpenEditStockModal && (
            <button
              type="button"
              onClick={onOpenEditStockModal}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-stone-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>شارژ انبار شرکت</span>
            </button>
          )}

          {isClient && onOpenBuyModal && (
            companyCopperStockKg <= 0 ? (
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-[11px] font-bold text-stone-500 bg-stone-800 rounded-lg cursor-not-allowed"
              >
                <span>اتمام مس شرکت</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenBuyModal}
                className="inline-flex items-center justify-center gap-1 px-3.5 py-1.5 text-[11px] font-extrabold text-stone-950 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 rounded-lg transition-all shadow-md cursor-pointer shrink-0"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>خرید مس از شرکت</span>
                <ArrowLeft className="w-3 h-3" />
              </button>
            )
          )}
        </div>

      </div>
    </div>
  );
};
