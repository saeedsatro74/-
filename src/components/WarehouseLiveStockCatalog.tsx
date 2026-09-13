import React, { useState, useMemo } from 'react';
import { 
  Boxes, 
  Disc, 
  Layers, 
  Ruler, 
  Building2, 
  Search, 
  Filter, 
  Scale, 
  Truck, 
  Calendar, 
  Eye, 
  PackageCheck,
  CheckCircle2,
  TrendingUp,
  PackagePlus,
  ArrowUpDown,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { 
  WarehouseItem, 
  WarehouseInventorySummary, 
  CopperPackagingType,
  SpoolPackagingType
} from '../types';
import { COPPER_BRANDS, COPPER_PACKAGING_TYPES } from '../utils/storage';
import { formatNumber, formatWeight } from '../utils/formatters';

interface PalletStockCard {
  id: string;
  palletIndex: number;
  consignmentId: string;
  referenceDocNumber: string;
  date: string;
  targetPartyName?: string;
  driverName?: string;
  vehiclePlate?: string;
  brand: string;
  diameterInch: string;
  thicknessMm: number;
  spoolsCount: number;
  spoolWeights: number[];
  totalWeightKg: number;
  avgWeightKg: number;
}

interface LooseSpoolItem {
  id: string;
  consignmentId: string;
  referenceDocNumber: string;
  date: string;
  brand: string;
  diameterInch: string;
  thicknessMm: number;
  quantity: number;
  spoolWeights: number[];
  totalWeightKg: number;
}

interface CoilsStockGroup {
  key: string;
  brand: string;
  diameterInch: string;
  thicknessMm: number;
  length15mCount: number;
  length15mWeightKg: number;
  length50mCount: number;
  length50mWeightKg: number;
  totalCount: number;
  totalWeightKg: number;
}

interface StraightsStockGroup {
  key: string;
  brand: string;
  diameterInch: string;
  thicknessMm: number;
  totalCount: number;
  totalWeightKg: number;
}

interface WarehouseLiveStockCatalogProps {
  items: WarehouseItem[];
  inventorySummary: WarehouseInventorySummary;
  onOpenAdd?: (type: 'inbound' | 'outbound') => void;
  onViewReceipt?: (item: WarehouseItem) => void;
}

export const WarehouseLiveStockCatalog: React.FC<WarehouseLiveStockCatalogProps> = ({
  items,
  inventorySummary,
  onOpenAdd,
  onViewReceipt,
}) => {
  // Local view filters
  const [stockCategoryFilter, setStockCategoryFilter] = useState<'all' | 'pallets' | 'loose_spools' | 'coils' | 'straights'>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract all pallets currently in stock
  const { palletCards, looseSpools, coilsGroups, straightsGroups } = useMemo(() => {
    const pallets: PalletStockCard[] = [];
    const loose: LooseSpoolItem[] = [];
    const coilsMap: Record<string, CoilsStockGroup> = {};
    const straightsMap: Record<string, StraightsStockGroup> = {};

    let palletGlobalCounter = 1;

    // We iterate through items (inbounds add, outbounds subtract or track)
    for (const consignment of items) {
      if (consignment.entryType !== 'inbound') continue; // Inbound consignments represent stored goods

      const cargoItems = consignment.items && consignment.items.length > 0 
        ? consignment.items 
        : [
            {
              id: consignment.id + '-sub-1',
              packagingType: ((consignment as any).packagingType === 'roll' ? 'coil' : consignment.packagingType) || 'coil',
              brand: consignment.brand || 'باهنر',
              diameterInch: consignment.diameterInch || '5/8',
              thicknessMm: consignment.thicknessMm || 0.75,
              coilLength: consignment.coilLength || '15m',
              quantity: consignment.quantity || 1,
              totalWeightKg: consignment.totalWeightKg || 0,
              spoolType: consignment.spoolType || 'pallet',
              spoolWeights: consignment.spoolWeights || [consignment.totalWeightKg || 0],
            }
          ];

      for (const item of cargoItems) {
        // 1. Spools
        if (item.packagingType === 'spool') {
          const isPallet = item.spoolType !== 'non_pallet';
          const weights = item.spoolWeights && item.spoolWeights.length > 0
            ? item.spoolWeights.map(Number).filter(n => !isNaN(n) && n > 0)
            : [Number(item.totalWeightKg) || 0];

          const totalWt = weights.reduce((a, b) => a + b, 0) || Number(item.totalWeightKg) || 0;
          const count = weights.length || Number(item.quantity) || 1;
          const avgWt = count > 0 ? totalWt / count : 0;

          if (isPallet) {
            pallets.push({
              id: `${consignment.id}-${item.id}-pallet-${palletGlobalCounter}`,
              palletIndex: palletGlobalCounter++,
              consignmentId: consignment.id,
              referenceDocNumber: consignment.referenceDocNumber || consignment.id,
              date: consignment.date,
              targetPartyName: consignment.targetPartyName,
              driverName: consignment.driverName,
              vehiclePlate: consignment.vehiclePlate,
              brand: item.brand || 'باهنر',
              diameterInch: item.diameterInch || '5/8',
              thicknessMm: Number(item.thicknessMm) || 0.75,
              spoolsCount: count,
              spoolWeights: weights,
              totalWeightKg: totalWt,
              avgWeightKg: avgWt,
            });
          } else {
            loose.push({
              id: `${consignment.id}-${item.id}-loose`,
              consignmentId: consignment.id,
              referenceDocNumber: consignment.referenceDocNumber || consignment.id,
              date: consignment.date,
              brand: item.brand || 'باهنر',
              diameterInch: item.diameterInch || '5/8',
              thicknessMm: Number(item.thicknessMm) || 0.75,
              quantity: count,
              spoolWeights: weights,
              totalWeightKg: totalWt,
            });
          }
        }

        // 2. Coils
        else if (item.packagingType === 'coil') {
          const groupKey = `${item.brand || 'باهنر'}_${item.diameterInch || '5/8'}_${item.thicknessMm || 0.75}`;
          if (!coilsMap[groupKey]) {
            coilsMap[groupKey] = {
              key: groupKey,
              brand: item.brand || 'باهنر',
              diameterInch: item.diameterInch || '5/8',
              thicknessMm: Number(item.thicknessMm) || 0.75,
              length15mCount: 0,
              length15mWeightKg: 0,
              length50mCount: 0,
              length50mWeightKg: 0,
              totalCount: 0,
              totalWeightKg: 0,
            };
          }

          const qty = Number(item.quantity) || 0;
          const wt = Number(item.totalWeightKg) || 0;

          if (item.coilLength === '50m') {
            coilsMap[groupKey].length50mCount += qty;
            coilsMap[groupKey].length50mWeightKg += wt;
          } else {
            coilsMap[groupKey].length15mCount += qty;
            coilsMap[groupKey].length15mWeightKg += wt;
          }

          coilsMap[groupKey].totalCount += qty;
          coilsMap[groupKey].totalWeightKg += wt;
        }

        // 3. Straights
        else if (item.packagingType === 'straight') {
          const groupKey = `${item.brand || 'باهنر'}_${item.diameterInch || '5/8'}_${item.thicknessMm || 0.75}`;
          if (!straightsMap[groupKey]) {
            straightsMap[groupKey] = {
              key: groupKey,
              brand: item.brand || 'باهنر',
              diameterInch: item.diameterInch || '5/8',
              thicknessMm: Number(item.thicknessMm) || 0.75,
              totalCount: 0,
              totalWeightKg: 0,
            };
          }

          const qty = Number(item.quantity) || 0;
          const wt = Number(item.totalWeightKg) || 0;
          straightsMap[groupKey].totalCount += qty;
          straightsMap[groupKey].totalWeightKg += wt;
        }
      }
    }

    return {
      palletCards: pallets,
      looseSpools: loose,
      coilsGroups: Object.values(coilsMap),
      straightsGroups: Object.values(straightsMap),
    };
  }, [items]);

  // Apply filters to pallets
  const filteredPallets = useMemo(() => {
    return palletCards.filter((p) => {
      if (brandFilter !== 'all' && p.brand !== brandFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchBrand = p.brand.toLowerCase().includes(q);
        const matchDiameter = p.diameterInch.toLowerCase().includes(q);
        const matchThickness = String(p.thicknessMm).includes(q);
        const matchDoc = p.referenceDocNumber.toLowerCase().includes(q);
        const matchDriver = (p.driverName || '').toLowerCase().includes(q);
        const matchParty = (p.targetPartyName || '').toLowerCase().includes(q);
        if (!matchBrand && !matchDiameter && !matchThickness && !matchDoc && !matchDriver && !matchParty) {
          return false;
        }
      }
      return true;
    });
  }, [palletCards, brandFilter, searchQuery]);

  // Apply filters to loose spools
  const filteredLooseSpools = useMemo(() => {
    return looseSpools.filter((s) => {
      if (brandFilter !== 'all' && s.brand !== brandFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchBrand = s.brand.toLowerCase().includes(q);
        const matchDiameter = s.diameterInch.toLowerCase().includes(q);
        const matchDoc = s.referenceDocNumber.toLowerCase().includes(q);
        if (!matchBrand && !matchDiameter && !matchDoc) return false;
      }
      return true;
    });
  }, [looseSpools, brandFilter, searchQuery]);

  // Apply filters to coils
  const filteredCoils = useMemo(() => {
    return coilsGroups.filter((c) => {
      if (brandFilter !== 'all' && c.brand !== brandFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchBrand = c.brand.toLowerCase().includes(q);
        const matchDiameter = c.diameterInch.toLowerCase().includes(q);
        if (!matchBrand && !matchDiameter) return false;
      }
      return true;
    });
  }, [coilsGroups, brandFilter, searchQuery]);

  // Apply filters to straights
  const filteredStraights = useMemo(() => {
    return straightsGroups.filter((s) => {
      if (brandFilter !== 'all' && s.brand !== brandFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchBrand = s.brand.toLowerCase().includes(q);
        const matchDiameter = s.diameterInch.toLowerCase().includes(q);
        if (!matchBrand && !matchDiameter) return false;
      }
      return true;
    });
  }, [straightsGroups, brandFilter, searchQuery]);

  // Calculate total pallets weight in current filter
  const totalPalletsWeight = filteredPallets.reduce((s, p) => s + p.totalWeightKg, 0);
  const totalPalletsSpoolsCount = filteredPallets.reduce((s, p) => s + p.spoolsCount, 0);

  return (
    <div className="space-y-6">

      {/* Hero Stock Overview Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-stone-900 to-stone-900 p-5 sm:p-6 rounded-3xl border border-amber-500/30 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Boxes className="w-5 h-5" />
              </span>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                کاردکس موجودی فیزیکی و کالاهای چیده شده در انبار مس
              </h2>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              مشاهده تفکیکی تک‌تک <strong className="text-amber-300">پالت‌های قرقره (با ریز وزن هر قرقره)</strong>، کلاف‌های ۱۵ و ۵۰ متری، شاخه‌های مس و قرقره‌های فله در انبار مرکزی.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onOpenAdd && (
              <button
                type="button"
                onClick={() => onOpenAdd('inbound')}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer border border-emerald-500/40"
              >
                <PackagePlus className="w-4 h-4" />
                <span>+ ثبت پالت و مس جدید در انبار</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Quick Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-stone-800">
          <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800/80">
            <span className="text-[11px] text-stone-400 block mb-0.5">کل پالت‌های قرقره:</span>
            <div className="text-lg font-black font-mono text-amber-300">
              {palletCards.length} <span className="text-xs font-normal text-stone-400">پالت</span>
            </div>
            <span className="text-[10px] text-stone-400 font-mono">
              ({inventorySummary.totalSpoolsPallet} قرقره: {formatWeight(inventorySummary.spoolPalletWeightKg)})
            </span>
          </div>

          <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800/80">
            <span className="text-[11px] text-stone-400 block mb-0.5">کلاف‌های مس (۱۵ و ۵۰m):</span>
            <div className="text-lg font-black font-mono text-purple-300">
              {inventorySummary.totalCoils} <span className="text-xs font-normal text-stone-400">کلاف</span>
            </div>
            <span className="text-[10px] text-stone-400 font-mono">
              (وزن: {formatWeight(inventorySummary.packagingBreakdown.coil?.weightKg || 0)})
            </span>
          </div>

          <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800/80">
            <span className="text-[11px] text-stone-400 block mb-0.5">شاخه‌های مس:</span>
            <div className="text-lg font-black font-mono text-blue-300">
              {inventorySummary.totalStraights} <span className="text-xs font-normal text-stone-400">شاخه</span>
            </div>
            <span className="text-[10px] text-stone-400 font-mono">
              (وزن: {formatWeight(inventorySummary.packagingBreakdown.straight?.weightKg || 0)})
            </span>
          </div>

          <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800/80">
            <span className="text-[11px] text-stone-400 block mb-0.5">قرقره‌های غیر پالتی (فله):</span>
            <div className="text-lg font-black font-mono text-amber-200">
              {inventorySummary.totalSpoolsNonPallet} <span className="text-xs font-normal text-stone-400">عدد</span>
            </div>
            <span className="text-[10px] text-stone-400 font-mono">
              (وزن: {formatWeight(inventorySummary.spoolNonPalletWeightKg)})
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar for Stock Catalog */}
      <div className="bg-stone-900/80 p-4 rounded-3xl border border-stone-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-500 absolute right-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در پالت‌ها، سایز، برند، ضخامت، بارنامه ورودی..."
              className="w-full pl-3 pr-10 py-2 text-xs rounded-2xl border border-stone-700 bg-stone-950 text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Brand Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400 shrink-0 font-bold">برند مس:</span>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-2xl border border-stone-700 bg-stone-950 text-stone-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">همه برندها</option>
              {COPPER_BRANDS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills Switcher */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setStockCategoryFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              stockCategoryFilter === 'all'
                ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm'
                : 'bg-stone-950/80 text-stone-400 border-stone-800 hover:text-stone-200 hover:border-stone-700'
            }`}
          >
            همه موجودی فیزیکی
          </button>

          <button
            type="button"
            onClick={() => setStockCategoryFilter('pallets')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
              stockCategoryFilter === 'pallets'
                ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm'
                : 'bg-stone-950/80 text-amber-300 border-amber-500/30 hover:bg-amber-950/30'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span>📦 پالت‌های قرقره ({filteredPallets.length} پالت)</span>
          </button>

          <button
            type="button"
            onClick={() => setStockCategoryFilter('coils')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
              stockCategoryFilter === 'coils'
                ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                : 'bg-stone-950/80 text-purple-300 border-purple-500/30 hover:bg-purple-950/30'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>🌀 کلاف‌های مس ({inventorySummary.totalCoils} کلاف)</span>
          </button>

          <button
            type="button"
            onClick={() => setStockCategoryFilter('straights')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
              stockCategoryFilter === 'straights'
                ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                : 'bg-stone-950/80 text-blue-300 border-blue-500/30 hover:bg-blue-950/30'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>📏 شاخه‌های مس ({inventorySummary.totalStraights} شاخه)</span>
          </button>

          <button
            type="button"
            onClick={() => setStockCategoryFilter('loose_spools')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
              stockCategoryFilter === 'loose_spools'
                ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                : 'bg-stone-950/80 text-amber-200 border-stone-800 hover:text-stone-200'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span>🔘 قرقره‌های غیر پالتی/تکی ({inventorySummary.totalSpoolsNonPallet} عدد)</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: PALLETIZED SPOOLS INVENTORY (پالت‌های قرقره مس با ریز وزن هر قرقره) */}
      {(stockCategoryFilter === 'all' || stockCategoryFilter === 'pallets') && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
                <Disc className="w-4 h-4" />
              </span>
              <h3 className="text-sm sm:text-base font-black text-white">
                پالت‌های قرقره مس موجود در انبار ({filteredPallets.length} پالت فیزیکی)
              </h3>
            </div>
            <div className="text-xs font-mono text-stone-300">
              مجموع وزن پالت‌های موجود: <span className="text-amber-300 font-bold">{formatWeight(totalPalletsWeight)}</span> ({totalPalletsSpoolsCount} قرقره)
            </div>
          </div>

          {filteredPallets.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400 bg-stone-900/40 rounded-2xl border border-dashed border-stone-800">
              هیچ پالت قرقره‌ای با فیلتر انتخابی یافت نشد. با دکمه «ثبت ورود مس»، پالت‌های جدید با وزن هر قرقره ثبت کنید.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPallets.map((pallet) => {
                return (
                  <div
                    key={pallet.id}
                    className="bg-gradient-to-b from-stone-900 to-stone-950 rounded-3xl border border-amber-500/30 p-4 sm:p-5 shadow-xl hover:border-amber-400/60 transition-all flex flex-col justify-between space-y-4 relative group"
                  >
                    {/* Pallet Card Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-amber-500/20 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-stone-950 font-black text-xs font-mono">
                            پالت #{pallet.palletIndex}
                          </span>
                          <span className="text-xs font-bold text-amber-200">
                            پالت {pallet.spoolsCount} تایی قرقره
                          </span>
                        </div>
                        <div className="font-bold text-sm text-white mt-1.5 flex items-center gap-2">
                          <span>برند {pallet.brand}</span>
                          <span>•</span>
                          <span className="font-mono text-amber-300">سایز {pallet.diameterInch}</span>
                          <span>•</span>
                          <span className="font-mono text-stone-300">ضخامت {pallet.thicknessMm}mm</span>
                        </div>
                      </div>

                      <div className="text-left font-mono">
                        <span className="text-[10px] text-stone-400 block">وزن کل پالت:</span>
                        <span className="text-sm sm:text-base font-black text-amber-300">
                          {formatWeight(pallet.totalWeightKg)}
                        </span>
                      </div>
                    </div>

                    {/* Spools Inside This Pallet with Exact Weights */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-stone-400">
                        <span className="font-bold text-stone-300">
                          وزن تک‌تک قرقره‌های این پالت ({pallet.spoolWeights.length} عدد):
                        </span>
                        <span className="font-mono">
                          میانگین: {formatNumber(pallet.avgWeightKg, 1)} kg
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {pallet.spoolWeights.map((w, idx) => (
                          <div
                            key={idx}
                            className="bg-stone-950 border border-amber-500/20 p-2 rounded-xl text-center font-mono space-y-0.5 shadow-inner"
                          >
                            <span className="text-[10px] text-stone-500 block font-sans">
                              قرقره {idx + 1}
                            </span>
                            <span className="text-xs font-black text-amber-200">
                              {formatNumber(w, 1)} <span className="text-[10px] text-stone-400 font-normal">kg</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pallet Source Consignment Meta Info */}
                    <div className="pt-3 border-t border-stone-800/80 text-[11px] text-stone-400 flex flex-wrap items-center justify-between gap-2 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-500" />
                        <span>رسید: {pallet.referenceDocNumber}</span>
                        <span>•</span>
                        <span>{pallet.date}</span>
                      </div>
                      {pallet.driverName && (
                        <div className="text-stone-300 flex items-center gap-1">
                          <Truck className="w-3 h-3 text-stone-500" />
                          <span>{pallet.driverName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: COILS INVENTORY (کلاف‌های مس ۱۵ متری و ۵۰ متری) */}
      {(stockCategoryFilter === 'all' || stockCategoryFilter === 'coils') && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400">
                <Layers className="w-4 h-4" />
              </span>
              <h3 className="text-sm sm:text-base font-black text-white">
                موجودی کلاف‌های مس (تفکیک ۱۵ متری و ۵۰ متری)
              </h3>
            </div>
            <div className="text-xs font-mono text-purple-300">
              کل کلاف‌ها: <strong className="text-white">{inventorySummary.totalCoils} عدد</strong> (۱۵m: {inventorySummary.totalCoils15m} | ۵۰m: {inventorySummary.totalCoils50m})
            </div>
          </div>

          {filteredCoils.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400 bg-stone-900/40 rounded-2xl border border-dashed border-stone-800">
              کلافی با فیلتر انتخابی موجود نیست.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCoils.map((group) => (
                <div
                  key={group.key}
                  className="bg-stone-900/90 rounded-2xl border border-purple-500/30 p-4 space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                    <div>
                      <span className="text-xs font-black text-purple-200">کلاف مس {group.brand}</span>
                      <div className="text-xs text-stone-300 font-mono mt-0.5">
                        سایز {group.diameterInch} | ضخامت {group.thicknessMm}mm
                      </div>
                    </div>
                    <div className="text-left font-mono">
                      <span className="text-sm font-black text-purple-300">{group.totalCount} کلاف</span>
                      <span className="text-[10px] text-stone-400 block">{formatWeight(group.totalWeightKg)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-stone-950 p-2 rounded-xl border border-purple-900/60">
                      <span className="text-[10px] text-purple-400 block">کلاف ۱۵ متری:</span>
                      <span className="font-bold text-white">{group.length15mCount} عدد</span>
                      <span className="text-[10px] text-stone-400 block">{formatWeight(group.length15mWeightKg)}</span>
                    </div>

                    <div className="bg-stone-950 p-2 rounded-xl border border-purple-900/60">
                      <span className="text-[10px] text-purple-400 block">کلاف ۵۰ متری:</span>
                      <span className="font-bold text-white">{group.length50mCount} عدد</span>
                      <span className="text-[10px] text-stone-400 block">{formatWeight(group.length50mWeightKg)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: STRAIGHTS INVENTORY (شاخه‌های مس) */}
      {(stockCategoryFilter === 'all' || stockCategoryFilter === 'straights') && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-blue-500/20 text-blue-400">
                <Ruler className="w-4 h-4" />
              </span>
              <h3 className="text-sm sm:text-base font-black text-white">
                موجودی شاخه‌های مس در انبار
              </h3>
            </div>
            <div className="text-xs font-mono text-blue-300">
              کل شاخه‌ها: <strong className="text-white">{inventorySummary.totalStraights} شاخه</strong> (وزن: {formatWeight(inventorySummary.packagingBreakdown.straight?.weightKg || 0)})
            </div>
          </div>

          {filteredStraights.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400 bg-stone-900/40 rounded-2xl border border-dashed border-stone-800">
              شاخه‌ای با فیلتر انتخابی موجود نیست.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {filteredStraights.map((group) => (
                <div
                  key={group.key}
                  className="bg-stone-900/90 rounded-2xl border border-blue-500/30 p-4 space-y-2 shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-200">شاخه مس {group.brand}</span>
                    <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded-md bg-blue-950 border border-blue-800">
                      {group.totalCount} شاخه
                    </span>
                  </div>
                  <div className="text-xs text-stone-300 font-mono">
                    سایز {group.diameterInch} | ضخامت {group.thicknessMm}mm
                  </div>
                  <div className="pt-1 text-left font-mono text-xs text-blue-300 font-bold border-t border-stone-800">
                    وزن کل: {formatWeight(group.totalWeightKg)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: LOOSE / NON-PALLET SPOOLS (قرقره‌های غیر پالتی / تکی) */}
      {(stockCategoryFilter === 'all' || stockCategoryFilter === 'loose_spools') && filteredLooseSpools.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
                <Disc className="w-4 h-4" />
              </span>
              <h3 className="text-sm sm:text-base font-black text-white">
                قرقره‌های غیر پالتی (فله / تکی)
              </h3>
            </div>
            <div className="text-xs font-mono text-amber-300">
              کل قرقره‌های غیر پالتی: <strong className="text-white">{inventorySummary.totalSpoolsNonPallet} عدد</strong> (وزن: {formatWeight(inventorySummary.spoolNonPalletWeightKg)})
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredLooseSpools.map((loose) => (
              <div
                key={loose.id}
                className="bg-stone-900/90 rounded-2xl border border-stone-700 p-4 space-y-2 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">قرقره مس (غیر پالتی)</span>
                  <span className="text-xs font-mono font-bold text-stone-200">
                    {loose.quantity} قرقره
                  </span>
                </div>
                <div className="text-xs text-stone-300 font-mono">
                  {loose.brand} • سایز {loose.diameterInch} • ضخامت {loose.thicknessMm}mm
                </div>
                <div className="text-xs font-mono text-amber-200 bg-stone-950 p-2 rounded-xl border border-stone-800">
                  وزن قرقره‌ها: [{loose.spoolWeights.join(' ، ')} kg]
                </div>
                <div className="text-left text-xs font-mono font-black text-amber-300">
                  مجموع وزن: {formatWeight(loose.totalWeightKg)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
