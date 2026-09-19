import React, { useState, useMemo, useEffect } from 'react';
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
  addWarehouseItem,
  getStoredWarehouseItems
} from '../utils/storage';
import { formatNumber, formatWeight, toFaDigits } from '../utils/formatters';
import {
  dismantlePalletIntoLooseSpools,
  openSpoolToRetailFromPallet,
  openLooseSpoolToRetail,
  restoreLooseSpoolToPallet,
  restoreRetailToSpoolOrPallet
} from '../utils/warehousePalletManager';

// Realistic Product Assets
const COPPER_PALLET_IMG = '/src/assets/images/copper_pallet_5spools_1789803849566.jpg';
const COPPER_SPOOL_IMG = '/src/assets/images/copper_loose_spool_1789803863290.jpg';
const COPPER_COIL_IMG = '/src/assets/images/copper_pipe_coils_1789803878022.jpg';
const COPPER_STRAIGHT_IMG = '/src/assets/images/copper_straight_pipes_1789803890842.jpg';

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

  // Selected Spool in Pallet Cards (allows clean selection without instant destructive action)
  const [selectedSpoolByPallet, setSelectedSpoolByPallet] = useState<Record<string, number | null>>({});

  // Confirmation Modal State (so user cannot accidentally split or move to retail)
  const [confirmModalData, setConfirmModalData] = useState<{
    type: 'retail_from_pallet' | 'dismantle_pallet' | 'retail_from_loose';
    pallet?: PalletStockCard;
    looseSpool?: LooseSpoolItem;
    spoolIndex?: number;
    weightKg?: number;
  } | null>(null);

  // Undo Snapshot (stores the previous warehouse items so user can revert any action!)
  const [undoSnapshot, setUndoSnapshot] = useState<WarehouseItem[] | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; showUndo?: boolean } | null>(null);

  // Synchronized live items with instant event listener
  const [liveItems, setLiveItems] = useState<WarehouseItem[]>(items);

  useEffect(() => {
    setLiveItems(items);
  }, [items]);

  useEffect(() => {
    const handleStockUpdated = () => {
      setLiveItems(getStoredWarehouseItems());
    };
    window.addEventListener('warehouse-stock-updated', handleStockUpdated);
    return () => window.removeEventListener('warehouse-stock-updated', handleStockUpdated);
  }, []);

  // Active combined search query
  const activeQuery = useMemo(() => {
    return (externalSearchQuery || searchQuery).trim().toLowerCase();
  }, [externalSearchQuery, searchQuery]);

  // Show transient toast with optional Undo button
  const triggerToast = (message: string, showUndo: boolean = false) => {
    setFeedbackToast({ message, showUndo });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 6000);
  };

  const handleUndo = () => {
    if (undoSnapshot) {
      setLiveItems(undoSnapshot);
      localStorage.setItem('warehouse_inventory_items', JSON.stringify(undoSnapshot));
      window.dispatchEvent(new CustomEvent('warehouse-stock-updated'));
      setUndoSnapshot(null);
      triggerToast('عملیات لغو شد و اطلاعات به حالت قبل بازگشت.');
    }
  };

  const handleRestoreLooseSpool = (loose: LooseSpoolItem) => {
    setUndoSnapshot([...liveItems]);
    const updated = restoreLooseSpoolToPallet(loose.cargoItemId || loose.id);
    setLiveItems(updated);
    triggerToast(`قرقره (${toFaDigits(loose.totalWeightKg.toFixed(1))} kg) به پالت اصلی بازگردانده شد.`, true);
  };

  const handleRestoreRetailItem = (r: RetailCopperItem) => {
    setUndoSnapshot([...liveItems]);
    const updated = restoreRetailToSpoolOrPallet(r.cargoItemId || r.id);
    setLiveItems(updated);
    triggerToast(`مس باز شده (${toFaDigits(r.totalWeightKg.toFixed(1))} kg) به قرقره/پالت بازگردانده شد.`, true);
  };

  const handleExecuteConfirmedAction = () => {
    if (!confirmModalData) return;

    setUndoSnapshot([...liveItems]);

    if (confirmModalData.type === 'retail_from_pallet' && confirmModalData.pallet && confirmModalData.spoolIndex !== undefined) {
      const p = confirmModalData.pallet;
      const idx = confirmModalData.spoolIndex;
      const updated = openSpoolToRetailFromPallet(p, idx);
      setLiveItems(updated);
      setSelectedSpoolByPallet(prev => ({ ...prev, [p.id]: null }));
      triggerToast(`قرقره ق${toFaDigits(idx + 1)} (${toFaDigits((confirmModalData.weightKg || 0).toFixed(1))} kg) به بخش خورده‌ها منتقل گردید.`, true);
    } else if (confirmModalData.type === 'dismantle_pallet' && confirmModalData.pallet) {
      const p = confirmModalData.pallet;
      const updated = dismantlePalletIntoLooseSpools(p);
      setLiveItems(updated);
      setSelectedSpoolByPallet(prev => ({ ...prev, [p.id]: null }));
      triggerToast(`پالت #${toFaDigits(p.palletIndex)} تفکیک شد و تمام قرقره‌های آن به بخش غیرپالتی منتقل گردیدند.`, true);
    } else if (confirmModalData.type === 'retail_from_loose' && confirmModalData.looseSpool) {
      const updated = openLooseSpoolToRetail(confirmModalData.looseSpool);
      setLiveItems(updated);
      triggerToast(`قرقره آزاد (${toFaDigits(confirmModalData.looseSpool.totalWeightKg.toFixed(1))} kg) به بخش خورده‌ها منتقل گردید.`, true);
    }

    setConfirmModalData(null);
  };

  // Extract or generate default demo inventory matching Image 1 & 2
  const { palletCards, looseSpools, retailItems, coilsGroups, straightsGroups } = useMemo(() => {
    const pallets: PalletStockCard[] = [];
    const loose: LooseSpoolItem[] = [];
    const retail: RetailCopperItem[] = [];
    const coilsMap: Record<string, CoilsStockGroup> = {};
    const straightsMap: Record<string, StraightsStockGroup> = {};

    let palletGlobalCounter = 1;

    for (const consignment of liveItems) {
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
  }, [liveItems]);

  return (
    <div className="space-y-5 font-sans text-stone-800">
      
      {/* Toast Notification with Undo */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 text-xs font-bold border border-stone-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast.message}</span>
          {feedbackToast.showUndo && undoSnapshot && (
            <button
              type="button"
              onClick={handleUndo}
              className="mr-2 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>بازگردانی (Undo)</span>
            </button>
          )}
        </div>
      )}

      {/* SECTION 1: PALLETIZED SPOOLS INVENTORY */}
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
          </div>

          {/* Pallet Cards Grid */}
          {palletCards.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-6 text-center text-xs font-bold text-stone-500">
              هیچ پالت فعال در انبار موجود نیست (پالت‌ها تفکیک شده یا خارج گردیده‌اند).
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              
              {palletCards.map((pallet) => {
                const selectedSpoolIdx = selectedSpoolByPallet[pallet.id];
                const hasSelectedSpool = selectedSpoolIdx !== null && selectedSpoolIdx !== undefined;

                return (
                  <div
                    key={pallet.id}
                    className={`bg-white rounded-2xl border p-3.5 shadow-2xs transition-all flex flex-col justify-between space-y-3 ${
                      hasSelectedSpool ? 'border-amber-500 ring-1 ring-amber-400/50' : 'border-stone-200 hover:border-amber-300'
                    }`}
                  >
                    {/* Card Header with Large Centered Real Pallet Image */}
                    <div className="space-y-2.5">
                      <div className="relative w-full h-44 sm:h-48 rounded-xl overflow-hidden bg-stone-100 border border-amber-200/90 shadow-2xs group">
                        <img
                          src={COPPER_PALLET_IMG}
                          alt="پالت ۵ تایی مس"
                          className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        
                        {/* Top Badges (Pallet Number & Full/Incomplete status) */}
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg bg-amber-900/90 backdrop-blur-md text-white font-black text-xs font-mono shadow-xs border border-amber-700/50">
                            پالت {toFaDigits(pallet.palletIndex)}#
                          </span>
                          {pallet.isFullStandardPallet ? (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-100/95 backdrop-blur-md text-amber-950 border border-amber-300/80 shadow-xs">
                              {toFaDigits(5)} تایی فابریک
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-sky-100/95 backdrop-blur-md text-sky-950 border border-sky-300/80 shadow-xs">
                              {toFaDigits(pallet.spoolsCount)} تایی
                            </span>
                          )}
                        </div>

                        {/* Top Left Gross Weight Badge */}
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-stone-900/90 backdrop-blur-md text-white border border-stone-700/80 shadow-xs text-left">
                          <span className="text-[9px] text-stone-300 block font-bold leading-none">وزن کل</span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-sm font-black text-amber-300 font-mono">
                              {toFaDigits(pallet.totalWeightKg.toString())}
                            </span>
                            <span className="text-[10px] text-stone-300 font-mono font-bold">kg</span>
                          </div>
                        </div>

                        {/* Bottom Gradient Overlay for Specs */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/90 via-stone-950/50 to-transparent p-2.5 pt-6 flex items-center justify-between text-white">
                          <div className="text-[11px] font-bold flex items-center gap-1.5">
                            <span className="text-amber-300 font-black">برند {pallet.brand}</span>
                            <span className="text-stone-400">•</span>
                            <span className="text-stone-200">سایز "{pallet.diameterInch} ({pallet.thicknessMm}mm)</span>
                          </div>
                          <span className="text-[10px] font-mono text-stone-300 bg-stone-900/60 px-1.5 py-0.5 rounded border border-stone-700">
                            میانگین: {toFaDigits(pallet.avgWeightKg.toFixed(1))} kg
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sub-reels breakdown grid */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-stone-500 font-bold">
                        <span>قرقره‌ها (جهت انتخاب کلیک کنید):</span>
                        <span className="font-mono text-stone-600">
                          میانگین: {toFaDigits(pallet.avgWeightKg.toFixed(1))} kg
                        </span>
                      </div>

                      {/* Sub-reels boxes (Clean selection without accidental click triggers) */}
                      <div className="grid grid-cols-3 gap-1.5">
                        {pallet.spoolWeights.map((w, idx) => {
                          const isSelected = selectedSpoolIdx === idx;
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                setSelectedSpoolByPallet((prev) => ({
                                  ...prev,
                                  [pallet.id]: isSelected ? null : idx,
                                }));
                              }}
                              className={`p-2 rounded-xl text-center cursor-pointer transition-all shadow-2xs flex flex-col justify-between border ${
                                isSelected
                                  ? 'bg-amber-800 text-white border-amber-900 ring-2 ring-amber-500'
                                  : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-bold">
                                <span>قرقره {toFaDigits(idx + 1)}</span>
                                <span
                                  className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${
                                    isSelected
                                      ? 'bg-white text-amber-900 font-black'
                                      : 'border border-stone-300 bg-white'
                                  }`}
                                >
                                  {isSelected && <Check className="w-2.5 h-2.5 text-amber-900" />}
                                </span>
                              </div>
                              <span
                                className={`text-xs font-black font-mono block mt-1.5 ${
                                  isSelected ? 'text-white' : 'text-stone-900'
                                }`}
                              >
                                kg {toFaDigits(w.toFixed(1))}
                              </span>
                            </div>
                          );
                        })}

                        {/* If missing 5th reel */}
                        {!pallet.isFullStandardPallet && (
                          <div className="bg-amber-50/60 border border-amber-200/80 p-1.5 rounded-xl text-center flex flex-col items-center justify-center text-[10px] font-bold text-amber-800">
                            <span>۱ قرقره خارج شده</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Active Action Toolbar (Shown only when a spool is selected) */}
                    {hasSelectedSpool ? (
                      <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 flex flex-col gap-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                            <span>
                              قرقره {toFaDigits(selectedSpoolIdx + 1)} انتخاب شد (
                              {toFaDigits((pallet.spoolWeights[selectedSpoolIdx] || pallet.avgWeightKg).toFixed(1))} kg)
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedSpoolByPallet((prev) => ({ ...prev, [pallet.id]: null }))
                            }
                            className="text-[11px] text-stone-500 hover:text-stone-800 underline cursor-pointer"
                          >
                            لغو انتخاب
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1 border-t border-amber-200/80">
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmModalData({
                                type: 'retail_from_pallet',
                                pallet,
                                spoolIndex: selectedSpoolIdx,
                                weightKg: pallet.spoolWeights[selectedSpoolIdx] || pallet.avgWeightKg,
                              })
                            }
                            className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <Scissors className="w-3.5 h-3.5" />
                            <span>انتقال به خورده‌ها</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setConfirmModalData({
                                type: 'dismantle_pallet',
                                pallet,
                              })
                            }
                            className="py-1.5 px-2.5 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                            title="تفکیک کل این پالت به قرقره‌های غیرپالتی"
                          >
                            <Boxes className="w-3.5 h-3.5 text-amber-800" />
                            <span>تفکیک کل پالت</span>
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {/* Card Footer */}
                    <div className="pt-2 border-t border-stone-100 text-[10px] text-stone-600 flex items-center justify-between font-mono">
                      <span>سند ورودی: {pallet.referenceDocNumber}</span>
                      <span>{toFaDigits(pallet.date)}</span>
                    </div>
                  </div>
                );
              })}

            </div>
          )}

        </div>
      )}

      {/* SECTION 2: LOOSE SPOOLS */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {looseSpools.map((loose) => (
                <div
                  key={loose.id}
                  className="bg-white rounded-2xl border border-stone-200 p-3.5 shadow-2xs hover:border-amber-400 transition-all flex flex-col justify-between space-y-3"
                >
                  {/* Large Centered Spool Image Hero */}
                  <div className="relative w-full h-40 sm:h-44 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 group">
                    <img
                      src={COPPER_SPOOL_IMG}
                      alt="قرقره مس تکی"
                      className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2.5 right-2.5">
                      <span className="px-2.5 py-1 rounded-lg bg-stone-900/90 backdrop-blur-md text-amber-300 font-bold text-[11px] border border-stone-700 shadow-xs">
                        {loose.sourcePalletInfo || (loose.spoolCondition === 'opened' ? 'قرقره باز شده' : 'قرقره تکی / آزاد')}
                      </span>
                    </div>
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-stone-900/90 backdrop-blur-md text-white border border-stone-700 shadow-xs text-left font-mono">
                      <span className="text-[9px] text-stone-300 block font-bold leading-none">وزن صافی</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-sm font-black text-amber-300">
                          {toFaDigits(loose.totalWeightKg.toFixed(1))}
                        </span>
                        <span className="text-[10px] text-stone-300">kg</span>
                      </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/90 via-stone-950/50 to-transparent p-2.5 pt-6 flex items-center justify-between text-white">
                      <div className="text-[11px] font-bold flex items-center gap-1.5">
                        <span className="text-amber-300 font-black">برند {loose.brand}</span>
                        <span className="text-stone-400">•</span>
                        <span className="text-stone-200">سایز "{loose.diameterInch} ({loose.thicknessMm}mm)</span>
                      </div>
                      <span className="text-[10px] text-stone-300 font-mono bg-stone-900/60 px-1.5 py-0.5 rounded border border-stone-700">
                        تعداد: {toFaDigits(loose.quantity)} عدد
                      </span>
                    </div>
                  </div>

                  {/* Footer Info & Action buttons */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100 text-[11px]">
                    <span className="text-stone-500 font-mono truncate max-w-[130px]" title={loose.notes || loose.referenceDocNumber}>
                      {loose.notes || `بارنامه: ${loose.referenceDocNumber}`}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRestoreLooseSpool(loose)}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg text-xs font-bold border border-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
                        title="بازگرداندن این قرقره به پالت اصلی"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                        <span>بازگشت به پالت</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setConfirmModalData({
                            type: 'retail_from_loose',
                            looseSpool: loose,
                          })
                        }
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-900 rounded-lg text-xs font-bold border border-rose-300 flex items-center gap-1 cursor-pointer transition-colors"
                        title="باز کردن این قرقره و انتقال مستقیم به بخش خورده‌ها"
                      >
                        <Scissors className="w-3.5 h-3.5 text-rose-600" />
                        <span>به خورده‌ها</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
              هیچ مس باز شده یا خورده‌ای در حال حاضر ثبت نشده است.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {retailItems.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl border border-rose-200/90 p-3.5 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  {/* Centered Large Spool Image */}
                  <div className="relative w-full h-36 rounded-xl overflow-hidden bg-stone-100 border border-rose-200 group">
                    <img
                      src={COPPER_SPOOL_IMG}
                      alt="خورده مس باز شده"
                      className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2.5 right-2.5">
                      <span className="px-2.5 py-0.5 rounded-md bg-rose-700 text-white font-bold text-xs shadow-xs">
                        خورده مس
                      </span>
                    </div>
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-stone-900/90 backdrop-blur-md text-white border border-stone-700 shadow-xs text-left font-mono">
                      <span className="text-[9px] text-stone-300 block font-bold leading-none">وزن موجود</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-sm font-black text-rose-300">
                          {toFaDigits(r.totalWeightKg.toFixed(1))}
                        </span>
                        <span className="text-[10px] text-stone-300">kg</span>
                      </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/90 via-stone-950/50 to-transparent p-2.5 pt-6 text-white">
                      <div className="text-[11px] font-bold flex items-center gap-1.5">
                        <span className="text-amber-300 font-black">برند {r.brand}</span>
                        <span className="text-stone-400">•</span>
                        <span className="text-stone-200">{r.diameterInch ? `"${r.diameterInch}` : ''} ({r.thicknessMm}mm)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100">
                    <span className="text-stone-500 font-bold text-[11px] truncate max-w-[130px]">
                      {r.notes || `بارنامه: ${toFaDigits(r.referenceDocNumber)}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRestoreRetailItem(r)}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg text-xs font-bold border border-emerald-300 flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                      title="بازگرداندن این خورده به قرقره یا پالت اصلی"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                      <span>بازگشت به قرقره / پالت</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: COILS INVENTORY */}
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {coilsGroups.map((c) => (
              <div key={c.key} className="bg-white rounded-2xl border border-stone-200 p-3.5 space-y-3 shadow-2xs hover:border-amber-400 transition-all flex flex-col justify-between">
                {/* Centered Large Coil Image */}
                <div className="relative w-full h-36 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 group">
                  <img
                    src={COPPER_COIL_IMG}
                    alt="کلاف مس"
                    className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2.5 right-2.5">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-900/90 backdrop-blur-md text-white font-black text-xs shadow-xs">
                      کلاف مس {c.brand}
                    </span>
                  </div>
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-stone-900/90 backdrop-blur-md text-white border border-stone-700 shadow-xs text-left font-mono">
                    <span className="text-[9px] text-stone-300 block font-bold leading-none">وزن کل</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-sm font-black text-amber-300">
                        {toFaDigits(c.totalWeightKg)}
                      </span>
                      <span className="text-[10px] text-stone-300">kg</span>
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/90 via-stone-950/50 to-transparent p-2.5 pt-6 text-white">
                    <span className="text-[11px] font-bold text-stone-200 font-mono">
                      ضخامت: {c.thicknessMm}mm • سایز: "{c.diameterInch}
                    </span>
                  </div>
                </div>

                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/80 flex items-center justify-between text-xs font-bold text-stone-700 font-mono">
                  <div>
                    <span>۱۵ متری:</span>
                    <span className="text-amber-900 mr-1 font-black">{toFaDigits(c.length15mCount)} کلاف</span>
                  </div>
                  <div className="border-r border-stone-300 pr-2">
                    <span>۵۰ متری:</span>
                    <span className="text-amber-900 mr-1 font-black">{toFaDigits(c.length50mCount)} کلاف</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: STRAIGHT PIPES INVENTORY */}
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {straightsGroups.map((s) => (
              <div key={s.key} className="bg-white rounded-2xl border border-stone-200 p-3.5 space-y-3 shadow-2xs hover:border-amber-400 transition-all flex flex-col justify-between">
                {/* Centered Large Straight Image */}
                <div className="relative w-full h-36 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 group">
                  <img
                    src={COPPER_STRAIGHT_IMG}
                    alt="شاخه مس"
                    className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2.5 right-2.5">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-900/90 backdrop-blur-md text-white font-black text-xs shadow-xs">
                      شاخه مس {s.brand}
                    </span>
                  </div>
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-stone-900/90 backdrop-blur-md text-white border border-stone-700 shadow-xs text-left font-mono">
                    <span className="text-[9px] text-stone-300 block font-bold leading-none">وزن کل</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-sm font-black text-amber-300">
                        {toFaDigits(s.totalWeightKg)}
                      </span>
                      <span className="text-[10px] text-stone-300">kg</span>
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/90 via-stone-950/50 to-transparent p-2.5 pt-6 text-white">
                    <span className="text-[11px] font-bold text-stone-200 font-mono">
                      {s.thicknessMm}mm - "{s.diameterInch} {s.isHard ? '(سخت)' : '(شاخه سنگین)'}
                    </span>
                  </div>
                </div>

                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/80 flex items-center justify-between text-xs font-bold text-stone-700 font-mono">
                  <span>موجود: {toFaDigits(s.totalCount)} شاخه (طول ۶ متر)</span>
                  <span className="bg-stone-200/80 text-stone-800 px-2 py-0.5 rounded-md text-[10px]">
                    {s.badgeTag}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL TO PREVENT ACCIDENTAL CLICKS */}
      {confirmModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl relative my-auto text-stone-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-stone-900">
                    {confirmModalData.type === 'retail_from_pallet' && 'تأیید انتقال قرقره به خورده‌ها'}
                    {confirmModalData.type === 'dismantle_pallet' && 'تأیید تفکیک کامل پالت'}
                    {confirmModalData.type === 'retail_from_loose' && 'تأیید باز کردن قرقره آزاد به خورده‌ها'}
                  </h3>
                  <p className="text-[11px] text-stone-500 font-bold">
                    جلوگیری از تغییر تصادفی وضعیت اقلام
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConfirmModalData(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200">
              {confirmModalData.type === 'retail_from_pallet' && (
                <p>
                  آیا مطمئن هستید که می‌خواهید <span className="font-black text-rose-700">قرقره ق{toFaDigits((confirmModalData.spoolIndex ?? 0) + 1)}</span> به وزن <span className="font-black font-mono text-stone-900">kg {toFaDigits((confirmModalData.weightKg || 0).toFixed(1))}</span> از پالت #{toFaDigits(confirmModalData.pallet?.palletIndex || 1)} به بخش خورده‌ها منتقل گردد؟
                  <br />
                  <span className="text-[11px] text-stone-500 mt-1 block">
                    (در صورت اشتباه، امکان بازگردانی سریع با دکمه Undo و بازگشت به پالت وجود دارد).
                  </span>
                </p>
              )}

              {confirmModalData.type === 'dismantle_pallet' && (
                <p>
                  آیا از تفکیک کامل <span className="font-black text-amber-800">پالت #{toFaDigits(confirmModalData.pallet?.palletIndex || 1)}</span> و انتقال تمام {toFaDigits(confirmModalData.pallet?.spoolsCount || 0)} قرقره آن به بخش غیرپالتی اطمینان دارید؟
                </p>
              )}

              {confirmModalData.type === 'retail_from_loose' && (
                <p>
                  آیا از باز کردن این قرقره آزاد به وزن <span className="font-black font-mono text-stone-900">kg {toFaDigits((confirmModalData.looseSpool?.totalWeightKg || 0).toFixed(1))}</span> و انتقال آن به بخش خورده‌ها اطمینان دارید؟
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setConfirmModalData(null)}
                className="px-4 py-2 text-xs text-stone-700 hover:bg-stone-100 rounded-xl cursor-pointer font-bold transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmedAction}
                className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-black rounded-xl cursor-pointer transition-colors shadow-xs"
              >
                تأیید و انجام
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
