import React, { useState, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  Boxes, 
  Disc, 
  Layers, 
  Ruler, 
  Check, 
  PackageMinus, 
  Scale, 
  Scissors, 
  Search, 
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { WarehouseItem } from '../types';
import { formatNumber, formatWeight } from '../utils/formatters';

export interface SelectedStockItemsResult {
  selectedPallets: PalletStockCard[];
  selectedLooseSpools: LooseSpoolItem[];
  selectedCoilsWeightKg: number;
  selectedStraightsWeightKg: number;
  retailWeightKg: number;
  totalWeightKg: number;
  summaryText: string;
}

export interface PalletStockCard {
  id: string;
  palletIndex: number;
  consignmentId: string;
  cargoItemId: string;
  referenceDocNumber: string;
  date: string;
  targetPartyName?: string;
  brand: string;
  diameterInch: string;
  thicknessMm: number;
  spoolsCount: number;
  spoolWeights: number[];
  totalWeightKg: number;
  avgWeightKg: number;
  isFullStandardPallet: boolean;
}

export interface LooseSpoolItem {
  id: string;
  consignmentId: string;
  cargoItemId: string;
  referenceDocNumber: string;
  date: string;
  brand: string;
  diameterInch: string;
  thicknessMm: number;
  quantity: number;
  spoolWeights: number[];
  totalWeightKg: number;
  spoolCondition?: 'sealed' | 'opened';
  sourcePalletInfo?: string;
}

export interface CoilsStockGroup {
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

export interface StraightsStockGroup {
  key: string;
  brand: string;
  diameterInch: string;
  thicknessMm: number;
  totalCount: number;
  totalWeightKg: number;
}

interface WarehouseStockPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: WarehouseItem[];
  onConfirmSelection: (result: SelectedStockItemsResult) => void;
  title?: string;
  isStepOneOfSale?: boolean;
}

export const WarehouseStockPickerModal: React.FC<WarehouseStockPickerModalProps> = ({
  isOpen,
  onClose,
  items,
  onConfirmSelection,
  title = 'انتخاب تصویری پالت‌ها و اقلام از انبار جهت فروش / خروج',
  isStepOneOfSale = false,
}) => {
  // Category tab
  const [stockCategoryFilter, setStockCategoryFilter] = useState<'all' | 'pallets' | 'loose_spools' | 'coils' | 'straights'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selection states
  const [selectedPalletIds, setSelectedPalletIds] = useState<Set<string>>(new Set());
  const [selectedLooseSpoolIds, setSelectedLooseSpoolIds] = useState<Set<string>>(new Set());
  
  // Custom weights for Coils, Straights, Retail
  const [selectedCoilsWeight, setSelectedCoilsWeight] = useState<number>(0);
  const [selectedStraightsWeight, setSelectedStraightsWeight] = useState<number>(0);
  const [retailWeight, setRetailWeight] = useState<number>(0);

  // Extract all available stock items from inbound consignments
  const { palletCards, looseSpools, coilsGroups, straightsGroups } = useMemo(() => {
    const pallets: PalletStockCard[] = [];
    const loose: LooseSpoolItem[] = [];
    const coilsMap: Record<string, CoilsStockGroup> = {};
    const straightsMap: Record<string, StraightsStockGroup> = {};

    let palletGlobalCounter = 1;

    for (const consignment of items) {
      if (consignment.entryType !== 'inbound') continue;

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
              spoolCondition: (consignment as any).spoolCondition || 'sealed',
              sourcePalletInfo: (consignment as any).sourcePalletInfo,
            }
          ];

      for (const item of cargoItems) {
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
              cargoItemId: item.id,
              referenceDocNumber: consignment.referenceDocNumber || consignment.id,
              date: consignment.date,
              targetPartyName: consignment.targetPartyName,
              brand: item.brand || 'باهنر',
              diameterInch: item.diameterInch || '5/8',
              thicknessMm: Number(item.thicknessMm) || 0.75,
              spoolsCount: count,
              spoolWeights: weights,
              totalWeightKg: totalWt,
              avgWeightKg: avgWt,
              isFullStandardPallet: count >= 5,
            });
          } else {
            loose.push({
              id: `${consignment.id}-${item.id}`,
              consignmentId: consignment.id,
              cargoItemId: item.id,
              referenceDocNumber: consignment.referenceDocNumber || consignment.id,
              date: consignment.date,
              brand: item.brand || 'باهنر',
              diameterInch: item.diameterInch || '5/8',
              thicknessMm: Number(item.thicknessMm) || 0.75,
              quantity: count,
              spoolWeights: weights,
              totalWeightKg: totalWt,
              spoolCondition: item.spoolCondition || 'sealed',
              sourcePalletInfo: item.sourcePalletInfo,
            });
          }
        } else if (item.packagingType === 'coil') {
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
        } else if (item.packagingType === 'straight') {
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

  // Filtered lists
  const filteredPallets = useMemo(() => {
    if (!searchQuery.trim()) return palletCards;
    const q = searchQuery.trim().toLowerCase();
    return palletCards.filter((p) => {
      const pNo = `پالت ${p.palletIndex}`.toLowerCase();
      const pHash = `#${p.palletIndex}`;
      return (
        pNo.includes(q) ||
        pHash.includes(q) ||
        String(p.palletIndex) === q ||
        p.brand.toLowerCase().includes(q) ||
        p.diameterInch.toLowerCase().includes(q) ||
        String(p.thicknessMm).includes(q) ||
        p.referenceDocNumber.toLowerCase().includes(q)
      );
    });
  }, [palletCards, searchQuery]);

  const filteredLooseSpools = useMemo(() => {
    if (!searchQuery.trim()) return looseSpools;
    const q = searchQuery.trim().toLowerCase();
    return looseSpools.filter((s) => 
      s.brand.toLowerCase().includes(q) ||
      s.diameterInch.toLowerCase().includes(q) ||
      String(s.thicknessMm).includes(q)
    );
  }, [looseSpools, searchQuery]);

  // Toggle Pallet Selection
  const handleTogglePallet = (palletId: string) => {
    setSelectedPalletIds((prev) => {
      const next = new Set(prev);
      if (next.has(palletId)) {
        next.delete(palletId);
      } else {
        next.add(palletId);
      }
      return next;
    });
  };

  // Toggle Loose Spool Selection
  const handleToggleLooseSpool = (spoolId: string) => {
    setSelectedLooseSpoolIds((prev) => {
      const next = new Set(prev);
      if (next.has(spoolId)) {
        next.delete(spoolId);
      } else {
        next.add(spoolId);
      }
      return next;
    });
  };

  // Calculate selected total weight & summary
  const selectedPalletsList = useMemo(() => {
    return palletCards.filter((p) => selectedPalletIds.has(p.id));
  }, [palletCards, selectedPalletIds]);

  const selectedLooseSpoolsList = useMemo(() => {
    return looseSpools.filter((s) => selectedLooseSpoolIds.has(s.id));
  }, [looseSpools, selectedLooseSpoolIds]);

  const totalSelectedWeightKg = useMemo(() => {
    const palletsWt = selectedPalletsList.reduce((acc, p) => acc + p.totalWeightKg, 0);
    const looseWt = selectedLooseSpoolsList.reduce((acc, s) => acc + s.totalWeightKg, 0);
    return Math.round((palletsWt + looseWt + selectedCoilsWeight + selectedStraightsWeight + retailWeight) * 100) / 100;
  }, [selectedPalletsList, selectedLooseSpoolsList, selectedCoilsWeight, selectedStraightsWeight, retailWeight]);

  // Summary Text
  const summaryText = useMemo(() => {
    const parts: string[] = [];
    if (selectedPalletsList.length > 0) {
      const palletNums = selectedPalletsList.map((p) => `#${p.palletIndex}`).join('، ');
      parts.push(`برداشت پالت‌های (${palletNums})`);
    }
    if (selectedLooseSpoolsList.length > 0) {
      parts.push(`تعداد ${selectedLooseSpoolsList.length} قرقره آزاد`);
    }
    if (selectedCoilsWeight > 0) {
      parts.push(`کلاف مس (${formatWeight(selectedCoilsWeight)})`);
    }
    if (selectedStraightsWeight > 0) {
      parts.push(`شاخه مس (${formatWeight(selectedStraightsWeight)})`);
    }
    if (retailWeight > 0) {
      parts.push(`خرده‌فروشی (${formatWeight(retailWeight)})`);
    }

    if (parts.length === 0) return '';
    return parts.join(' + ');
  }, [selectedPalletsList, selectedLooseSpoolsList, selectedCoilsWeight, selectedStraightsWeight, retailWeight]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirmSelection({
      selectedPallets: selectedPalletsList,
      selectedLooseSpools: selectedLooseSpoolsList,
      selectedCoilsWeightKg: selectedCoilsWeight,
      selectedStraightsWeightKg: selectedStraightsWeight,
      retailWeightKg: retailWeight,
      totalWeightKg: totalSelectedWeightKg,
      summaryText,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[130] overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 py-4 sm:py-6 animate-in fade-in duration-150 dir-rtl font-sans text-stone-900">
      <div className="bg-white border border-stone-200 rounded-2xl shadow-xl w-full max-w-5xl my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden">
        
        {/* Step 1 Indicator Banner */}
        {isStepOneOfSale && (
          <div className="bg-stone-900 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shrink-0 dir-rtl">
            <span className="flex items-center gap-2">
              <span className="bg-amber-400 text-stone-950 px-2 py-0.5 rounded font-mono text-[11px] font-bold">مرحله ۱</span>
              <span>انتخاب پالت‌های خروجی</span>
            </span>
            <span className="text-stone-300 text-[11px] font-medium hidden sm:inline-block">
              مرحله ۲: فاکتور فروش ➔
            </span>
          </div>
        )}

        {/* Header */}
        <div className="p-4 border-b border-stone-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center font-bold border border-stone-200">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                {isStepOneOfSale ? 'مرحله ۱: انتخاب پالت‌ها' : 'انتخاب پالت‌ها'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar & Filter Options */}
        <div className="p-3 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-stone-200/60 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setStockCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                stockCategoryFilter === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              همه ({palletCards.length + looseSpools.length})
            </button>
            <button
              type="button"
              onClick={() => setStockCategoryFilter('pallets')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                stockCategoryFilter === 'pallets' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              پالت‌ها ({palletCards.length})
            </button>
            <button
              type="button"
              onClick={() => setStockCategoryFilter('loose_spools')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                stockCategoryFilter === 'loose_spools' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              قرقره آزاد ({looseSpools.length})
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو..."
              className="w-full pr-9 pl-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-stone-800"
            />
          </div>

        </div>

        {/* Scrollable Inventory Items List with Selection Checkboxes */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          
          {/* SECTION 1: PALLETS SELECTION */}
          {(stockCategoryFilter === 'all' || stockCategoryFilter === 'pallets') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-amber-600" />
                  <span>پالت‌های مس موجود در انبار ({filteredPallets.length} پالت)</span>
                </h3>
                <span className="text-xs text-stone-500">برای انتخاب هر پالت، روی کارت آن کلیک کرده یا تیک بزنید</span>
              </div>

              {filteredPallets.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-500 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                  هیچ پالتی با این مشخصات یافت نشد.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredPallets.map((pallet) => {
                    const isSelected = selectedPalletIds.has(pallet.id);
                    return (
                      <div
                        key={pallet.id}
                        onClick={() => handleTogglePallet(pallet.id)}
                        className={`rounded-2xl border-2 p-4 transition-all cursor-pointer relative flex flex-col justify-between space-y-3 shadow-2xs select-none ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-md scale-[1.01]'
                            : 'bg-white border-stone-200 hover:border-amber-300 hover:bg-stone-50/50'
                        }`}
                      >
                        {/* Checkbox Header */}
                        <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-2.5">
                          <div className="flex items-center gap-2.5">
                            {/* Checkbox Box */}
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-amber-500 border-amber-500 text-slate-950 font-black shadow-xs'
                                : 'bg-white border-stone-300 text-transparent'
                            }`}>
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded-md font-black text-xs font-mono ${
                                  isSelected ? 'bg-amber-500 text-slate-950' : 'bg-stone-900 text-white'
                                }`}>
                                  پالت #{pallet.palletIndex}
                                </span>
                                {pallet.isFullStandardPallet ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                                    ۵ تایی کامل
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                    {pallet.spoolsCount} تایی
                                  </span>
                                )}
                              </div>
                              <div className="font-bold text-xs text-stone-900 mt-1 flex items-center gap-1">
                                <span>برند {pallet.brand}</span>
                                <span>•</span>
                                <span className="font-mono">{pallet.diameterInch}"</span>
                                <span>•</span>
                                <span className="font-mono">{pallet.thicknessMm}mm</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-left font-mono">
                            <span className="text-[10px] text-stone-500 block">وزن پالت:</span>
                            <span className="text-sm font-black text-amber-700">
                              {formatWeight(pallet.totalWeightKg)}
                            </span>
                          </div>
                        </div>

                        {/* Spool Weights Preview */}
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 font-mono text-[11px] text-center">
                          {pallet.spoolWeights.map((w, idx) => (
                            <div key={idx} className="bg-stone-100 p-1 rounded border border-stone-200">
                              <span className="text-[9px] text-stone-400 block">ق{idx+1}</span>
                              <span className="font-bold text-stone-800">{formatNumber(w, 0)}k</span>
                            </div>
                          ))}
                        </div>

                        {/* Status Footer */}
                        <div className={`py-1.5 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 ${
                          isSelected ? 'bg-stone-900 text-white font-bold' : 'bg-stone-100 text-stone-600'
                        }`}>
                          {isSelected ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>انتخاب شد ({formatWeight(pallet.totalWeightKg)})</span>
                            </>
                          ) : (
                            <span>انتخاب پالت</span>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: LOOSE SPOOLS SELECTION */}
          {(stockCategoryFilter === 'all' || stockCategoryFilter === 'loose_spools') && looseSpools.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Disc className="w-4 h-4 text-stone-600" />
                  <span>قرقره‌های غیرپالتی ({filteredLooseSpools.length})</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredLooseSpools.map((loose) => {
                  const isSelected = selectedLooseSpoolIds.has(loose.id);
                  return (
                    <div
                      key={loose.id}
                      onClick={() => handleToggleLooseSpool(loose.id)}
                      className={`rounded-xl border p-3 transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                        isSelected
                          ? 'bg-stone-50 border-stone-900 ring-1 ring-stone-900'
                          : 'bg-white border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-300 text-transparent'
                        }`}>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-stone-900 block">
                            قرقره مس ({loose.brand})
                          </span>
                          <span className="text-[11px] font-mono text-stone-500">
                            سایز "{loose.diameterInch} • {loose.thicknessMm}mm
                          </span>
                        </div>
                      </div>

                      <div className="text-left font-mono">
                        <span className="text-xs font-bold text-stone-900 block">
                          {formatWeight(loose.totalWeightKg)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 3: RETAIL & OTHER MODES */}
          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2.5">
            <h4 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <Scissors className="w-4 h-4 text-stone-600" />
              <span>مقدار دستی (کیلوگرم):</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  کلاف مس
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={selectedCoilsWeight || ''}
                  onChange={(e) => setSelectedCoilsWeight(parseFloat(e.target.value) || 0)}
                  placeholder="وزن کیلوگرم"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg font-mono text-stone-900 focus:outline-none focus:border-stone-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  شاخه مس
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={selectedStraightsWeight || ''}
                  onChange={(e) => setSelectedStraightsWeight(parseFloat(e.target.value) || 0)}
                  placeholder="وزن کیلوگرم"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg font-mono text-stone-900 focus:outline-none focus:border-stone-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  خرده‌فروشی دستی
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={retailWeight || ''}
                  onChange={(e) => setRetailWeight(parseFloat(e.target.value) || 0)}
                  placeholder="وزن کیلوگرم"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg font-mono text-stone-900 focus:outline-none focus:border-stone-800"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Sticky Floating Action Bar */}
        <div className="p-4 border-t border-stone-200 bg-stone-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-stone-800 text-white flex items-center justify-center font-bold shrink-0 border border-stone-700">
              <Scale className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs text-stone-400">
                اقلام انتخابی: {selectedPalletIds.size} پالت ، {selectedLooseSpoolIds.size} قرقره
              </div>
              <div className="text-sm font-bold font-mono text-white mt-0.5">
                وزن کل انتخابی: <span className="text-amber-400 text-base font-mono">{formatWeight(totalSelectedWeightKg)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors cursor-pointer"
            >
              انصراف
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={totalSelectedWeightKg <= 0}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                totalSelectedWeightKg > 0
                  ? 'bg-amber-400 hover:bg-amber-500 text-stone-950 cursor-pointer shadow-2xs font-bold'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed'
              }`}
            >
              <PackageMinus className="w-4 h-4" />
              <span>تأیید و ادامه ➔</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
