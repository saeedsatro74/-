import React, { useState, useMemo } from 'react';
import { 
  Boxes, 
  Disc, 
  Layers, 
  Ruler, 
  Search, 
  Filter, 
  Scale, 
  Truck, 
  Calendar, 
  PackagePlus, 
  Scissors, 
  Lock, 
  Unlock, 
  RotateCcw, 
  CheckCircle2, 
  Check,
  AlertTriangle, 
  ArrowRightLeft, 
  Factory, 
  Send, 
  X, 
  SlidersHorizontal,
  ChevronDown,
  Info,
  BarChart2,
  Tag,
  Download,
  Printer,
  FileText
} from 'lucide-react';
import { 
  WarehouseItem, 
  WarehouseInventorySummary, 
  CopperPackagingType,
  SpoolPackagingType,
  WarehouseCargoItem
} from '../types';
import { 
  COPPER_BRANDS, 
  COPPER_DIAMETERS, 
  COPPER_THICKNESSES,
  updateWarehouseItem,
  addWarehouseItem
} from '../utils/storage';
import { formatNumber, formatWeight, toFaDigits } from '../utils/formatters';
import {
  dismantlePalletIntoLooseSpools,
  openSpoolToRetailFromPallet,
  openLooseSpoolToRetail
} from '../utils/warehousePalletManager';

interface PalletStockCard {
  id: string;
  palletIndex: number;
  consignmentId: string;
  cargoItemId: string;
  referenceDocNumber: string;
  date: string;
  targetPartyName?: string;
  driverName?: string;
  vehiclePlate?: string;
  brand: string;
  diameterInch: string;
  thicknessMm: number;
  spoolsCount: number;
  originalSpoolsCount?: number;
  spoolWeights: number[];
  totalWeightKg: number;
  avgWeightKg: number;
  isFullStandardPallet: boolean;
  purityPercent?: string;
  isCustomBadge?: string;
}

interface LooseSpoolItem {
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
  notes?: string;
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
  standardName?: string;
}

interface StraightsStockGroup {
  key: string;
  brand: string;
  diameterInch: string;
  thicknessMm: number;
  totalCount: number;
  totalWeightKg: number;
  shelfCode?: string;
  badgeTag?: string;
  isHard?: boolean;
}

interface RetailCopperItem {
  id: string;
  consignmentId: string;
  cargoItemId: string;
  referenceDocNumber: string;
  date: string;
  brand: string;
  diameterInch: string;
  thicknessMm: number;
  totalWeightKg: number;
  notes?: string;
}

interface WarehouseLiveStockCatalogProps {
  items: WarehouseItem[];
  inventorySummary: WarehouseInventorySummary;
  externalSearchQuery?: string;
  categoryFilter?: 'all' | 'pallets' | 'loose_spools' | 'retail' | 'coils' | 'straights';
  onOpenAdd?: (type: 'inbound' | 'outbound') => void;
  onViewReceipt?: (item: WarehouseItem) => void;
  onUpdateItem?: (item: WarehouseItem) => void;
  onAddItem?: (item: WarehouseItem) => void;
}

export const WarehouseLiveStockCatalog: React.FC<WarehouseLiveStockCatalogProps> = ({
  items,
  inventorySummary,
  externalSearchQuery = '',
  categoryFilter,
  onOpenAdd,
  onViewReceipt,
  onUpdateItem,
  onAddItem,
}) => {
  // Navigation & Category Filters
  const [stockCategoryFilter, setStockCategoryFilter] = useState<'all' | 'pallets' | 'loose_spools' | 'retail' | 'coils' | 'straights'>('all');
  const effectiveCategoryFilter = categoryFilter || stockCategoryFilter;
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [diameterFilter, setDiameterFilter] = useState<string>('all');
  const [thicknessFilter, setThicknessFilter] = useState<string>('all');
  const [palletStatusFilter, setPalletStatusFilter] = useState<'all' | 'full_5' | 'split'>('all');

  // Depalletize (Split Pallet) Modal State
  const [depalletizeTarget, setDepalletizeTarget] = useState<{
    pallet: PalletStockCard;
    selectedSpoolIndex: number;
  } | null>(null);

  const [depalletizeAction, setDepalletizeAction] = useState<'to_loose' | 'to_production' | 'to_outbound'>('to_loose');
  const [depalletizeCondition, setDepalletizeCondition] = useState<'sealed' | 'opened'>('sealed');
  const [depalletizeNotes, setDepalletizeNotes] = useState<string>('');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Active combined search query
  const activeQuery = useMemo(() => {
    return (externalSearchQuery || searchQuery).trim().toLowerCase();
  }, [externalSearchQuery, searchQuery]);

  // Show transient toast
  const triggerToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4500);
  };

  // Extract or generate default demo inventory matching Image 1 & 2
  const { palletCards, looseSpools, retailItems, coilsGroups, straightsGroups } = useMemo(() => {
    const pallets: PalletStockCard[] = [];
    const loose: LooseSpoolItem[] = [];
    const retail: RetailCopperItem[] = [];
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
              notes: consignment.notes,
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
              driverName: consignment.driverName,
              vehiclePlate: consignment.vehiclePlate,
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
              notes: item.notes,
            });
          }
        } else if (item.packagingType === 'retail') {
          retail.push({
            id: `${consignment.id}-${item.id}`,
            consignmentId: consignment.id,
            cargoItemId: item.id,
            referenceDocNumber: consignment.referenceDocNumber || consignment.id,
            date: consignment.date,
            brand: item.brand || 'مس متفرقه',
            diameterInch: item.diameterInch || 'سفارشی',
            thicknessMm: Number(item.thicknessMm) || 0.75,
            totalWeightKg: Number(item.totalWeightKg) || 0,
            notes: item.notes || 'مس باز شده / خورده',
          });
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

    // Default fallback inventory matching Image 1 & 2 ONLY if empty and no consignments exist
    if (pallets.length === 0 && (!items || items.length === 0)) {
      pallets.push(
        {
          id: 'demo-pallet-1',
          palletIndex: 1,
          consignmentId: 'wh-in-101',
          cargoItemId: 'cargo-101',
          referenceDocNumber: 'BAR-1403-9101',
          date: '1403/12/10',
          brand: 'باهنر',
          diameterInch: '5/8',
          thicknessMm: 0.75,
          spoolsCount: 5,
          spoolWeights: [225.5, 230.2, 228.0, 234.8, 239.5],
          totalWeightKg: 1158,
          avgWeightKg: 231.6,
          isFullStandardPallet: true,
          purityPercent: '99/96',
        },
        {
          id: 'demo-pallet-2',
          palletIndex: 2,
          consignmentId: 'wh-in-102',
          cargoItemId: 'cargo-102',
          referenceDocNumber: 'BAR-1403-9101',
          date: '1403/12/10',
          brand: 'باهنر',
          diameterInch: '3/4',
          thicknessMm: 0.8,
          spoolsCount: 5,
          spoolWeights: [239.0, 231.5, 227.4, 233.0, 236.1],
          totalWeightKg: 1157,
          avgWeightKg: 231.4,
          isFullStandardPallet: true,
          purityPercent: '99/96',
        },
        {
          id: 'demo-pallet-3',
          palletIndex: 3,
          consignmentId: 'wh-in-103',
          cargoItemId: 'cargo-103',
          referenceDocNumber: 'BAR-1403-9102',
          date: '1403/12/11',
          brand: 'مهراصل',
          diameterInch: '1/2',
          thicknessMm: 0.75,
          spoolsCount: 5,
          spoolWeights: [224.0, 226.5, 228.2, 230.1, 232.0],
          totalWeightKg: 1140.8,
          avgWeightKg: 228.16,
          isFullStandardPallet: true,
          purityPercent: '99/99',
          isCustomBadge: '۲ رده',
        },
        {
          id: 'demo-pallet-4',
          palletIndex: 4,
          consignmentId: 'wh-in-104',
          cargoItemId: 'cargo-104',
          referenceDocNumber: 'BAR-1403-9102',
          date: '1403/12/11',
          brand: 'مهراصل',
          diameterInch: '5/8',
          thicknessMm: 0.8,
          spoolsCount: 5,
          spoolWeights: [238.0, 241.2, 239.5, 242.3, 240.0],
          totalWeightKg: 1201,
          avgWeightKg: 240.2,
          isFullStandardPallet: true,
          purityPercent: '99/99',
        },
        {
          id: 'demo-pallet-5',
          palletIndex: 5,
          consignmentId: 'wh-in-105',
          cargoItemId: 'cargo-105',
          referenceDocNumber: 'BAR-1403-9103',
          date: '1403/12/12',
          brand: 'قائم',
          diameterInch: '1/4',
          thicknessMm: 0.65,
          spoolsCount: 4,
          spoolWeights: [219.0, 222.5, 224.5, 223.0],
          totalWeightKg: 889,
          avgWeightKg: 222.3,
          isFullStandardPallet: false,
          purityPercent: '99/95',
        }
      );
    }

    if (loose.length === 0 && (!items || items.length === 0)) {
      loose.push({
        id: 'demo-loose-1',
        consignmentId: 'wh-in-106',
        cargoItemId: 'cargo-106',
        referenceDocNumber: 'BAR-1403-9103',
        date: '1403/12/12',
        brand: 'قائم',
        diameterInch: '1/4',
        thicknessMm: 0.65,
        quantity: 1,
        spoolWeights: [220],
        totalWeightKg: 220,
        spoolCondition: 'opened',
        sourcePalletInfo: 'باز شده از پالت ۵#',
        notes: 'شناسه: REEL-Q-882 • موقعیت دیپو: ردیف B-12 سالن فرعی',
      });
    }

    if (Object.keys(coilsMap).length === 0 && (!items || items.length === 0)) {
      coilsMap['bahaner_38'] = {
        key: 'bahaner_38',
        brand: 'باهنر',
        diameterInch: '3/8',
        thicknessMm: 0.7,
        length15mCount: 20,
        length15mWeightKg: 68,
        length50mCount: 0,
        length50mWeightKg: 0,
        totalCount: 20,
        totalWeightKg: 68,
        standardName: 'استاندارد برودتی CU-DHP',
      };
      coilsMap['mehrasl_12'] = {
        key: 'mehrasl_12',
        brand: 'مهراصل',
        diameterInch: '1/2',
        thicknessMm: 0.75,
        length15mCount: 0,
        length15mWeightKg: 0,
        length50mCount: 8,
        length50mWeightKg: 112,
        totalCount: 8,
        totalWeightKg: 112,
        standardName: 'کلاف آنیل نرم صنعتی',
      };
    }

    if (Object.keys(straightsMap).length === 0 && (!items || items.length === 0)) {
      straightsMap['mehrasl_78'] = {
        key: 'mehrasl_78',
        brand: 'مهراصل',
        diameterInch: '7/8',
        thicknessMm: 1.0,
        totalCount: 25,
        totalWeightKg: 75,
        shelfCode: 'SH-04',
        badgeTag: 'بک شرینک‌شده',
        isHard: true,
      };
      straightsMap['ghaem_118'] = {
        key: 'ghaem_118',
        brand: 'قائم',
        diameterInch: '1"1/8',
        thicknessMm: 1.2,
        totalCount: 30,
        totalWeightKg: 150,
        shelfCode: 'SH-05',
        badgeTag: 'کپ محافظ دو سر',
        isHard: false,
      };
    }

    return {
      palletCards: pallets,
      looseSpools: loose,
      retailItems: retail,
      coilsGroups: Object.values(coilsMap),
      straightsGroups: Object.values(straightsMap),
    };
  }, [items]);

  // Depalletize (Split Spool from Pallet) Handler
  const handleConfirmDepalletize = () => {
    if (!depalletizeTarget) return;

    const { pallet, selectedSpoolIndex } = depalletizeTarget;
    const spoolWeightToMove = pallet.spoolWeights[selectedSpoolIndex] || pallet.avgWeightKg || 0;

    if (depalletizeCondition === 'opened') {
      openSpoolToRetailFromPallet(pallet, selectedSpoolIndex);
      triggerToast(`✂ قرقره ق${toFaDigits(selectedSpoolIndex + 1)} (${toFaDigits(spoolWeightToMove.toFixed(1))} kg) باز شد و به بخش خورده‌ها منتقل گردید. مابقی قرقره‌های پالت به بخش غیرپالتی منتقل شدند.`);
    } else {
      dismantlePalletIntoLooseSpools(pallet);
      triggerToast(`✅ پالت #${toFaDigits(pallet.palletIndex)} تفکیک شد و قرقره‌های آن به بخش غیرپالتی منتقل گردیدند.`);
    }

    setDepalletizeTarget(null);
  };

  return (
    <div className="space-y-5 font-sans text-stone-800">
      
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200 text-xs font-bold border border-stone-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* SECTION 1: PALLETIZED SPOOLS INVENTORY (Matching Image 1) */}
      {(effectiveCategoryFilter === 'all' || effectiveCategoryFilter === 'pallets') && (
        <div className="space-y-3">
          
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-amber-950 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-800"></span>
              <span>پالت‌های آماده تحویل و چیدمان</span>
              <span className="text-xs text-amber-900 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300/80">
                {toFaDigits(palletCards.length)} پالت در محل
              </span>
            </h2>
            <span className="text-[11px] font-bold text-stone-400">
              استاندارد بسته‌بندی ASTM B280
            </span>
          </div>

          {/* 6 Cards Grid (Pallet Cards + Inventory Control Card) */}
          {palletCards.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-6 text-center text-xs font-bold text-stone-500">
              هیچ پالت فعال در انبار موجود نیست (پالت‌ها تفکیک شده یا خارج گردیده‌اند).
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              
              {palletCards.map((pallet) => (
                <div
                  key={pallet.id}
                  className="bg-white rounded-2xl border border-stone-200 p-3.5 shadow-2xs hover:border-amber-500 transition-all flex flex-col justify-between space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-amber-800 text-white font-black text-xs font-mono">
                          پالت {toFaDigits(pallet.palletIndex)}#
                        </span>
                        {pallet.isFullStandardPallet ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-950 border border-amber-300/80">
                            {toFaDigits(5)} تایی کامل
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-950 border border-sky-300/80">
                            {toFaDigits(pallet.spoolsCount)} تایی (تکمیل‌نشده)
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-xs text-stone-900 mt-2 flex items-center gap-1 flex-wrap">
                        <span className="text-stone-900 font-black">برند {pallet.brand}</span>
                        <span className="text-stone-300">•</span>
                        <span className="text-stone-700">"{pallet.diameterInch} ({pallet.thicknessMm}mm)</span>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="text-[10px] text-stone-600 block font-bold">وزن کل ناخالص</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-stone-600 font-mono font-bold">kg</span>
                        <span className="text-base font-black text-stone-900 font-mono">
                          {toFaDigits(pallet.totalWeightKg.toString())}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sub-reels breakdown grid */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-stone-500 font-bold">
                      <span>
                        قرقره‌ها (برای انتخاب و تفکیک کلیک کنید):
                      </span>
                      <span className="font-mono text-stone-600">
                        میانگین: {toFaDigits(pallet.avgWeightKg.toFixed(1))} kg
                      </span>
                    </div>

                    {/* Sub-reels boxes with check icon */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {pallet.spoolWeights.map((w, idx) => (
                        <div
                          key={idx}
                          onClick={() => setDepalletizeTarget({ pallet, selectedSpoolIndex: idx })}
                          title="کلیک جهت تفکیک یا باز کردن قرقره"
                          className="bg-stone-50/90 hover:bg-amber-100/80 border border-stone-200/90 hover:border-amber-500 p-2 rounded-xl text-center space-y-1 cursor-pointer transition-all relative group shadow-2xs"
                        >
                          <div className="flex items-center justify-between text-[10px] text-stone-600 font-bold">
                            <span>قرقره {toFaDigits(idx + 1)}</span>
                            <span className="w-3.5 h-3.5 rounded border border-amber-400 bg-white group-hover:bg-amber-800 group-hover:border-amber-800 flex items-center justify-center transition-colors">
                              <Check className="w-2.5 h-2.5 text-stone-400 group-hover:text-white" />
                            </span>
                          </div>
                          <span className="text-xs font-black text-stone-900 font-mono block">
                            kg {toFaDigits(w.toFixed(1))}
                          </span>
                        </div>
                      ))}

                      {/* If missing 5th reel (Pallet 5) */}
                      {!pallet.isFullStandardPallet && (
                        <div className="bg-amber-50/60 border border-amber-200/80 p-1.5 rounded-xl text-center flex flex-col items-center justify-center text-[10px] font-bold text-amber-800">
                          <span>۱ قرقره خارج شده</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action button */}
                  <button
                    type="button"
                    onClick={() => setDepalletizeTarget({ pallet, selectedSpoolIndex: 0 })}
                    className="w-full py-2 bg-stone-100 hover:bg-amber-800 hover:text-white text-stone-800 rounded-xl text-xs font-bold border border-stone-200/90 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <Scissors className="w-3.5 h-3.5 text-amber-800 hover:text-white" />
                    <span>
                      {pallet.isFullStandardPallet ? '⚖ برداشت / تفکیک قرقره از پالت' : '⚖ برداشت / خروج قرقره تکی'}
                    </span>
                  </button>

                  {/* Card Footer */}
                  <div className="pt-2 border-t border-stone-100 text-[10px] text-stone-600 flex items-center justify-between font-mono">
                    <span>سند ورودی: {pallet.referenceDocNumber}</span>
                    <span>{toFaDigits(pallet.date)}</span>
                  </div>
                </div>
              ))}

              {/* Card 6: Inventory Control Widget (Matching Image 1 bottom left) */}
              <div className="bg-gradient-to-br from-sky-50/80 to-stone-50 border border-sky-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-800 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <BarChart2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-black text-xs text-stone-900">کنترل موجودی پالت‌ها</h3>
                      <p className="text-[10px] text-stone-500 leading-snug">
                        پایش آنی حجم قرقره‌های بسته‌بندی شده در پالت بر مبنای تلورانس وزنی استاندارد کارخانجات.
                      </p>
                    </div>
                  </div>

                  {/* Progress 1 */}
                  <div className="space-y-1 pt-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-stone-700">
                      <span>تکمیل ظرفیت بارگیری پالت‌ها</span>
                      <span className="font-mono text-amber-950 font-black">{toFaDigits(94)}٪</span>
                    </div>
                    <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-800 h-full rounded-full w-[94%]"></div>
                    </div>
                  </div>

                  {/* Progress 2 */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-stone-700">
                      <span>پالت‌های دست‌نخورده فابریک</span>
                      <span className="font-mono text-stone-900 font-black">
                        {toFaDigits(palletCards.length)} پالت
                      </span>
                    </div>
                    <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-900 h-full rounded-full w-[80%]"></div>
                    </div>
                  </div>
                </div>

                {/* Bottom links */}
                <div className="pt-2 border-t border-sky-200/60 flex items-center justify-between text-[11px] font-bold text-sky-800">
                  <button type="button" className="hover:underline cursor-pointer">
                    مشاهده لاگ توزین
                  </button>
                  <button type="button" className="hover:underline cursor-pointer">
                    گزارش انبارگردانی دوره‌ای
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* SECTION 2: LOOSE SPOOLS (Matching Image 2) */}
      {(effectiveCategoryFilter === 'all' || effectiveCategoryFilter === 'loose_spools') && (
        <div className="space-y-3 pt-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-amber-950 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-800"></span>
              <span>قرقره‌های غیرپالتی و تکی</span>
              <span className="text-xs text-amber-900 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300/80">
                {toFaDigits(looseSpools.length)} قلم موجود
              </span>
            </h2>
            <span className="text-[11px] font-bold text-stone-600 font-mono">
              کل غیرپالتی: {toFaDigits(looseSpools.reduce((acc, l) => acc + l.quantity, 0))} عدد | مجموع وزن: kg {toFaDigits(looseSpools.reduce((acc, l) => acc + l.totalWeightKg, 0).toFixed(1))}
            </span>
          </div>

          {looseSpools.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-6 text-center text-xs font-bold text-stone-500">
              هیچ قرقره غیرپالتی در حال حاضر موجود نیست. با تفکیک پالت‌ها، قرقره‌های آزاد در اینجا قرار می‌گیرند.
            </div>
          ) : (
            looseSpools.map((loose) => (
              <div
                key={loose.id}
                className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-stone-900">قرقره مس تکی</h3>
                    <span className="px-2.5 py-0.5 rounded-md bg-stone-100 text-amber-900 font-bold text-xs border border-stone-200">
                      {loose.sourcePalletInfo || (loose.spoolCondition === 'opened' ? 'قرقره باز شده' : 'غیرپالتی / آزاد')}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-stone-700 flex items-center gap-2">
                    <span>برند {loose.brand}</span>
                    <span>•</span>
                    <span>سایز "{loose.diameterInch}</span>
                    <span>•</span>
                    <span>{loose.thicknessMm}mm</span>
                    <span className="text-stone-300">|</span>
                    <span className="text-stone-500">تعداد: {toFaDigits(loose.quantity)} عدد</span>
                  </div>
                  <div className="text-[11px] text-stone-600 font-mono">
                    {loose.notes || `بارنامه: ${loose.referenceDocNumber} • تاریخ: ${loose.date}`}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-left font-mono pl-3 border-l border-stone-200 hidden sm:block">
                    <span className="text-[10px] text-stone-600 block">وزن صافی</span>
                    <span className="text-xl font-black text-amber-800">kg {toFaDigits(loose.totalWeightKg.toFixed(1))}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        openLooseSpoolToRetail(loose);
                        triggerToast(`✂ قرقره (${toFaDigits(loose.totalWeightKg.toFixed(1))} kg) باز شد و به بخش خورده‌ها منتقل گردید.`);
                      }}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-900 rounded-xl text-xs font-bold border border-rose-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="باز کردن این قرقره و انتقال مستقیم به بخش خورده‌ها"
                    >
                      <Scissors className="w-3.5 h-3.5 text-rose-600" />
                      <span>باز کردن به خورده‌ها</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerToast('برچسب آماده چاپ می‌باشد.')}
                      className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold border border-stone-300 cursor-pointer"
                    >
                      برچسب
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerToast('حواله خروج تکی ثبت گردید.')}
                      className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>حواله خروج تکی</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SECTION: RETAIL COPPER (خورده‌ها و مس باز شده) */}
      {(effectiveCategoryFilter === 'all' || effectiveCategoryFilter === 'retail') && (
        <div className="space-y-3 pt-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-rose-950 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-700"></span>
              <span>خورده‌ها و مس باز شده (خرده‌فروشی)</span>
              <span className="text-xs text-rose-900 font-bold bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300/80">
                {toFaDigits(retailItems.length)} ردیف
              </span>
            </h2>
            <span className="text-[11px] font-bold text-stone-600 font-mono">
              مجموع وزن خورده‌ها: kg {toFaDigits(retailItems.reduce((acc, r) => acc + r.totalWeightKg, 0).toFixed(1))}
            </span>
          </div>

          {retailItems.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-6 text-center text-xs font-bold text-stone-500">
              هیچ مس باز شده یا خورده‌ای در حال حاضر ثبت نشده است. با کلیک بر روی «باز کردن به خورده‌ها» روی هر قرقره، به این بخش اضافه می‌شود.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {retailItems.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl border border-rose-200/90 p-4 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-rose-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-rose-700 text-white font-bold text-xs">
                          خورده مس
                        </span>
                        <span className="text-xs font-bold text-stone-800">
                          برند {r.brand} • {r.diameterInch ? `سایز "${r.diameterInch}` : ''} ({r.thicknessMm}mm)
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1 font-bold">
                        {r.notes || 'مس باز شده جهت مصارف خرد'}
                      </p>
                    </div>

                    <div className="text-left font-mono">
                      <span className="text-[10px] text-stone-500 block font-bold">وزن موجود</span>
                      <span className="text-base font-black text-rose-900">
                        kg {toFaDigits(r.totalWeightKg.toFixed(1))}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-stone-400 font-bold text-[11px]">
                      رسید/بارنامه: {toFaDigits(r.referenceDocNumber)} • {toFaDigits(r.date)}
                    </span>
                    <button
                      type="button"
                      onClick={() => triggerToast(`حواله خروج خورده مس به وزن ${toFaDigits(r.totalWeightKg.toFixed(1))} kg صادر گردید.`)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-900 rounded-xl text-xs font-bold border border-rose-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5 text-rose-700" />
                      <span>خروج خورده</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: COILS INVENTORY (Matching Image 2) */}
      {(effectiveCategoryFilter === 'all' || effectiveCategoryFilter === 'coils') && (
        <div className="space-y-3 pt-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-amber-950 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-800"></span>
              <span>کلاف‌های مس موجود</span>
              <span className="text-xs text-amber-900 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300/80">
                {toFaDigits(coilsGroups.length)} گروه کالایی
              </span>
            </h2>
            <span className="text-[11px] font-bold text-stone-600 font-mono">
              کل کلاف‌ها: {toFaDigits(coilsGroups.reduce((acc, c) => acc + c.totalCount, 0))} کلاف | مجموع وزن: kg {toFaDigits(coilsGroups.reduce((acc, c) => acc + c.totalWeightKg, 0))}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {coilsGroups.map((c) => (
              <div key={c.key} className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-sm text-stone-900">کلاف مس {c.brand}</h3>
                    <p className="text-xs text-stone-600 font-mono mt-0.5">{c.thicknessMm}mm - "{c.diameterInch}</p>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-base font-black text-amber-950">kg {toFaDigits(c.totalWeightKg)}</span>
                  </div>
                </div>

                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/80 flex items-center justify-between text-xs font-bold text-stone-700 font-mono">
                  <div>
                    <span>بسته‌بندی ۱۵ متری</span>
                    <span className="text-stone-400 mr-1.5">{toFaDigits(c.length15mCount)} کلاف</span>
                  </div>
                  <div>
                    <span>بسته‌بندی ۵۰ متری</span>
                    <span className="text-stone-400 mr-1.5">{toFaDigits(c.length50mCount)} کلاف</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-stone-500 font-bold text-[11px]">{c.standardName}</span>
                  <button
                    type="button"
                    onClick={() => triggerToast('حواله خروج کلاف صادر شد.')}
                    className="text-amber-800 font-black hover:underline cursor-pointer"
                  >
                    ثبت حواله خروج کلاف &gt;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: STRAIGHT PIPES INVENTORY (Matching Image 2) */}
      {(effectiveCategoryFilter === 'all' || effectiveCategoryFilter === 'straights') && (
        <div className="space-y-3 pt-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-amber-950 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-800"></span>
              <span>شاخه‌های مس موجود</span>
              <span className="text-xs text-amber-900 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300/80">
                {toFaDigits(straightsGroups.length)} رده کالایی
              </span>
            </h2>
            <span className="text-[11px] font-bold text-stone-600 font-mono">
              کل شاخه‌ها: {toFaDigits(straightsGroups.reduce((acc, s) => acc + s.totalCount, 0))} شاخه | مجموع وزن: kg {toFaDigits(straightsGroups.reduce((acc, s) => acc + s.totalWeightKg, 0))}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {straightsGroups.map((s) => (
              <div key={s.key} className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-sm text-stone-900">شاخه مس {s.brand}</h3>
                    <p className="text-xs text-stone-600 font-mono mt-0.5">
                      {s.thicknessMm}mm - "{s.diameterInch} {s.isHard ? '(سخت)' : '(شاخه سنگین)'}
                    </p>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-base font-black text-amber-950">kg {toFaDigits(s.totalWeightKg)}</span>
                  </div>
                </div>

                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/80 flex items-center justify-between text-xs font-bold text-stone-700 font-mono">
                  <span>تعداد کل موجود در انبار: {toFaDigits(s.totalCount)} شاخه (طول ۶ متر)</span>
                  <span className="bg-stone-200/80 text-stone-800 px-2 py-0.5 rounded-md text-[10px]">
                    {s.badgeTag}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-stone-500 font-bold text-[11px]">کد قفسه شاخه: {s.shelfCode}</span>
                  <button
                    type="button"
                    onClick={() => triggerToast('حواله شاخه صادر گردید.')}
                    className="text-amber-800 font-black hover:underline cursor-pointer"
                  >
                    صدور حواله شاخه &gt;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BOTTOM FOOTER BAR (Matching Image 2) */}
      <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-bold text-stone-700">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
            ✓
          </span>
          <p className="text-stone-700 leading-relaxed text-[11px]">
            کلیه اقلام انبار طبق نتائج آزمایشگاه متالورژی سلفچگان دارای خلوص مس بالاتر از ۹۹/۹۵٪ و با باسکول دیجیتال ۵۰ تنی کالیبره شده ثبت گردیده‌اند. 🈴
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => triggerToast('دانلود دفترچه موجودی آماده شد.')}
            className="px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-800 rounded-xl text-xs font-bold border border-stone-300 cursor-pointer shadow-2xs"
          >
            دانلود دفترچه موجودی PDF
          </button>
          <button
            type="button"
            onClick={() => triggerToast('انبارگردانی فوری آغاز گردید.')}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold border border-stone-300 cursor-pointer shadow-2xs"
          >
            انبارگردانی فوری
          </button>
        </div>
      </div>

      {/* BOTTOM MOST SYSTEM STATUS BAR */}
      <div className="flex items-center justify-between text-[11px] text-stone-600 font-bold px-2 pt-2 border-t border-stone-200">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>اتصال بورس کالا: برخط</span>
          </span>
          <span>انبار مرکزی سلفچگان: پذیرش باز</span>
        </div>
        <div>
          <span>V2.4.8-FIN سامانه متمرکز مس واته © ۱۴۰۳</span>
        </div>
      </div>

      {/* DEPALLETIZE MODAL */}
      {depalletizeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-xl relative my-auto text-stone-800">
            
            <div className="flex items-start justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-black text-stone-900 flex items-center gap-1.5">
                  <Scissors className="w-4 h-4 text-amber-800" />
                  <span>برداشت / تفکیک قرقره از پالت #{toFaDigits(depalletizeTarget.pallet.palletIndex)}</span>
                </h3>
                <p className="text-xs text-stone-500 font-bold mt-0.5">
                  برند {depalletizeTarget.pallet.brand} • سایز "{depalletizeTarget.pallet.diameterInch} • ضخامت {depalletizeTarget.pallet.thicknessMm}mm
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDepalletizeTarget(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Select Spool */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 block">
                ۱. انتخاب قرقره مورد نظر در پالت:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {depalletizeTarget.pallet.spoolWeights.map((w, idx) => {
                  const isSelected = depalletizeTarget.selectedSpoolIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setDepalletizeTarget({ ...depalletizeTarget, selectedSpoolIndex: idx })}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-mono relative ${
                        isSelected
                          ? 'bg-amber-800 text-white border-amber-800 font-black shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-sans">
                        <span>قرقره {toFaDigits(idx + 1)}</span>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs font-bold block mt-1">kg {toFaDigits(w.toFixed(1))}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Select Action Type */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 block">
                ۲. نوع عملیات تفکیک:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDepalletizeCondition('sealed')}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col gap-1 ${
                    depalletizeCondition === 'sealed'
                      ? 'bg-amber-50/80 border-amber-600 text-amber-950 ring-1 ring-amber-500'
                      : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <span className="text-xs font-black flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-amber-700" />
                    <span>تفکیک کل پالت به غیرپالتی</span>
                  </span>
                  <span className="text-[11px] text-stone-500 leading-tight font-medium">
                    پالت حذف و تمام {toFaDigits(depalletizeTarget.pallet.spoolsCount)} قرقره آن به بخش غیرپالتی آزاد منتقل می‌شوند.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDepalletizeCondition('opened')}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col gap-1 ${
                    depalletizeCondition === 'opened'
                      ? 'bg-rose-50/80 border-rose-500 text-rose-950 ring-1 ring-rose-400'
                      : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <span className="text-xs font-black flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-rose-600" />
                    <span>باز کردن و انتقال به خورده‌ها</span>
                  </span>
                  <span className="text-[11px] text-stone-500 leading-tight font-medium">
                    این قرقره باز شده و به خورده‌ها می‌رود؛ سایر قرقره‌های پالت به بخش غیرپالتی منتقل می‌شوند.
                  </span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-stone-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDepalletizeTarget(null)}
                className="px-3.5 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer font-bold"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDepalletize}
                className={`px-4 py-2 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer ${
                  depalletizeCondition === 'opened' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-amber-800 hover:bg-amber-900'
                }`}
              >
                {depalletizeCondition === 'opened' ? (
                  <>
                    <Scissors className="w-3.5 h-3.5" />
                    <span>تأیید انتقال به خورده‌ها (kg {toFaDigits(depalletizeTarget.pallet.spoolWeights[depalletizeTarget.selectedSpoolIndex].toFixed(1))})</span>
                  </>
                ) : (
                  <>
                    <Boxes className="w-3.5 h-3.5" />
                    <span>تأیید تفکیک کل پالت به غیرپالتی</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
