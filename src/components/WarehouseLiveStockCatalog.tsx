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
  AlertTriangle, 
  ArrowRightLeft, 
  Factory, 
  Send, 
  X, 
  SlidersHorizontal,
  ChevronDown,
  Info
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
import { formatNumber, formatWeight } from '../utils/formatters';

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
  externalSearchQuery?: string;
  onOpenAdd?: (type: 'inbound' | 'outbound') => void;
  onViewReceipt?: (item: WarehouseItem) => void;
  onUpdateItem?: (item: WarehouseItem) => void;
  onAddItem?: (item: WarehouseItem) => void;
}

export const WarehouseLiveStockCatalog: React.FC<WarehouseLiveStockCatalogProps> = ({
  items,
  inventorySummary,
  externalSearchQuery = '',
  onOpenAdd,
  onViewReceipt,
  onUpdateItem,
  onAddItem,
}) => {
  // Navigation & Category Filters
  const [stockCategoryFilter, setStockCategoryFilter] = useState<'all' | 'pallets' | 'loose_spools' | 'coils' | 'straights'>('all');
  
  // Specific Search & Property Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [diameterFilter, setDiameterFilter] = useState<string>('all');
  const [thicknessFilter, setThicknessFilter] = useState<string>('all');
  const [palletStatusFilter, setPalletStatusFilter] = useState<'all' | 'full_5' | 'split'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

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

  // Extract all pallets, loose spools, coils, and straights currently in stock
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
              notes: consignment.notes,
            }
          ];

      for (const item of cargoItems) {
        // 1. Spools (Pallet or Non-Pallet / Loose)
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

  // Apply multi-criteria filters to Pallets
  const filteredPallets = useMemo(() => {
    return palletCards.filter((p) => {
      if (brandFilter !== 'all' && p.brand !== brandFilter) return false;
      if (diameterFilter !== 'all' && p.diameterInch !== diameterFilter) return false;
      if (thicknessFilter !== 'all' && Math.abs(p.thicknessMm - parseFloat(thicknessFilter)) > 0.001) return false;
      if (palletStatusFilter === 'full_5' && p.spoolsCount < 5) return false;
      if (palletStatusFilter === 'split' && p.spoolsCount >= 5) return false;

      if (activeQuery) {
        const isTypeSearch = activeQuery.includes('قرقره') || activeQuery.includes('پالت') || activeQuery.includes('spool') || activeQuery.includes('pallet');
        const matchBrand = p.brand.toLowerCase().includes(activeQuery);
        const matchDiameter = p.diameterInch.toLowerCase().includes(activeQuery);
        const matchThickness = String(p.thicknessMm).includes(activeQuery);
        const matchDoc = p.referenceDocNumber.toLowerCase().includes(activeQuery);
        const matchDriver = (p.driverName || '').toLowerCase().includes(activeQuery);
        const matchParty = (p.targetPartyName || '').toLowerCase().includes(activeQuery);
        const matchPalletNo = `پالت ${p.palletIndex}`.includes(activeQuery) || `#${p.palletIndex}`.includes(activeQuery) || String(p.palletIndex) === activeQuery;
        if (!isTypeSearch && !matchBrand && !matchDiameter && !matchThickness && !matchDoc && !matchDriver && !matchParty && !matchPalletNo) {
          return false;
        }
      }
      return true;
    });
  }, [palletCards, brandFilter, diameterFilter, thicknessFilter, palletStatusFilter, activeQuery]);

  // Apply filters to Loose Spools
  const filteredLooseSpools = useMemo(() => {
    return looseSpools.filter((s) => {
      if (brandFilter !== 'all' && s.brand !== brandFilter) return false;
      if (diameterFilter !== 'all' && s.diameterInch !== diameterFilter) return false;
      if (thicknessFilter !== 'all' && Math.abs(s.thicknessMm - parseFloat(thicknessFilter)) > 0.001) return false;

      if (activeQuery) {
        const isTypeSearch = activeQuery.includes('قرقره') || activeQuery.includes('تکی') || activeQuery.includes('غیرپالتی') || activeQuery.includes('spool');
        const matchBrand = s.brand.toLowerCase().includes(activeQuery);
        const matchDiameter = s.diameterInch.toLowerCase().includes(activeQuery);
        const matchThickness = String(s.thicknessMm).includes(activeQuery);
        const matchDoc = s.referenceDocNumber.toLowerCase().includes(activeQuery);
        if (!isTypeSearch && !matchBrand && !matchDiameter && !matchThickness && !matchDoc) return false;
      }
      return true;
    });
  }, [looseSpools, brandFilter, diameterFilter, thicknessFilter, activeQuery]);

  // Apply filters to Coils
  const filteredCoils = useMemo(() => {
    return coilsGroups.filter((c) => {
      if (brandFilter !== 'all' && c.brand !== brandFilter) return false;
      if (diameterFilter !== 'all' && c.diameterInch !== diameterFilter) return false;
      if (thicknessFilter !== 'all' && Math.abs(c.thicknessMm - parseFloat(thicknessFilter)) > 0.001) return false;

      if (activeQuery) {
        const isTypeSearch = activeQuery.includes('کلاف') || activeQuery.includes('coil');
        const matchBrand = c.brand.toLowerCase().includes(activeQuery);
        const matchDiameter = c.diameterInch.toLowerCase().includes(activeQuery);
        const matchThickness = String(c.thicknessMm).includes(activeQuery);
        if (!isTypeSearch && !matchBrand && !matchDiameter && !matchThickness) return false;
      }
      return true;
    });
  }, [coilsGroups, brandFilter, diameterFilter, thicknessFilter, activeQuery]);

  // Apply filters to Straights
  const filteredStraights = useMemo(() => {
    return straightsGroups.filter((s) => {
      if (brandFilter !== 'all' && s.brand !== brandFilter) return false;
      if (diameterFilter !== 'all' && s.diameterInch !== diameterFilter) return false;
      if (thicknessFilter !== 'all' && Math.abs(s.thicknessMm - parseFloat(thicknessFilter)) > 0.001) return false;

      if (activeQuery) {
        const isTypeSearch = activeQuery.includes('شاخه') || activeQuery.includes('straight');
        const matchBrand = s.brand.toLowerCase().includes(activeQuery);
        const matchDiameter = s.diameterInch.toLowerCase().includes(activeQuery);
        const matchThickness = String(s.thicknessMm).includes(activeQuery);
        if (!isTypeSearch && !matchBrand && !matchDiameter && !matchThickness) return false;
      }
      return true;
    });
  }, [straightsGroups, brandFilter, diameterFilter, thicknessFilter, activeQuery]);

  const hasActiveFilters = brandFilter !== 'all' || diameterFilter !== 'all' || thicknessFilter !== 'all' || palletStatusFilter !== 'all' || activeQuery !== '';

  const handleClearFilters = () => {
    setBrandFilter('all');
    setDiameterFilter('all');
    setThicknessFilter('all');
    setPalletStatusFilter('all');
    setSearchQuery('');
  };

  // Depalletize (Split Spool from Pallet) Handler
  const handleConfirmDepalletize = () => {
    if (!depalletizeTarget) return;

    const { pallet, selectedSpoolIndex } = depalletizeTarget;
    const spoolWeightToMove = pallet.spoolWeights[selectedSpoolIndex] || pallet.avgWeightKg || 0;

    const targetConsignment = items.find((it) => it.id === pallet.consignmentId);
    if (!targetConsignment) {
      alert('خطا: بارنامه اصلی یافت نشد.');
      setDepalletizeTarget(null);
      return;
    }

    const updatedSubItems = (targetConsignment.items || []).map((subItem) => {
      if (subItem.id === pallet.cargoItemId) {
        const newWeights = [...(subItem.spoolWeights || [])];
        newWeights.splice(selectedSpoolIndex, 1);
        const newTotalWt = newWeights.reduce((a, b) => a + Number(b), 0);
        return {
          ...subItem,
          quantity: newWeights.length,
          spoolWeights: newWeights,
          totalWeightKg: newTotalWt,
        };
      }
      return subItem;
    });

    const newConsignmentTotalWeight = updatedSubItems.reduce((acc, it) => acc + (Number(it.totalWeightKg) || 0), 0);
    const updatedPalletConsignment: WarehouseItem = {
      ...targetConsignment,
      items: updatedSubItems,
      totalWeightKg: newConsignmentTotalWeight,
    };

    if (onUpdateItem) onUpdateItem(updatedPalletConsignment);

    // If destination is loose spool in warehouse
    if (depalletizeAction === 'to_loose') {
      const newLooseConsignmentId = `IN-LOOSE-${Date.now().toString().slice(-5)}`;
      const newLooseItem: WarehouseItem = {
        id: newLooseConsignmentId,
        entryType: 'inbound',
        referenceDocNumber: `تفکیک-پالت#${pallet.palletIndex}`,
        date: new Date().toLocaleDateString('fa-IR'),
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        targetPartyName: targetConsignment.targetPartyName || 'انبار فرعی / تفکیک پالت',
        driverName: 'برداشت از پالت',
        vehiclePlate: 'تفکیک داخلی',
        brand: pallet.brand,
        diameterInch: pallet.diameterInch,
        thicknessMm: pallet.thicknessMm,
        packagingType: 'spool',
        spoolType: 'non_pallet',
        quantity: 1,
        spoolWeights: [spoolWeightToMove],
        totalWeightKg: spoolWeightToMove,
        createdAt: new Date().toISOString(),
        totalItemsCount: 1,
        notes: `تفکیک شده از پالت #${pallet.palletIndex} (سند ${pallet.referenceDocNumber}). ${depalletizeNotes}`,
        items: [
          {
            id: `cargo-loose-${Date.now()}`,
            packagingType: 'spool',
            spoolType: 'non_pallet',
            brand: pallet.brand,
            diameterInch: pallet.diameterInch,
            thicknessMm: pallet.thicknessMm,
            quantity: 1,
            spoolWeights: [spoolWeightToMove],
            totalWeightKg: spoolWeightToMove,
            spoolCondition: depalletizeCondition as 'sealed' | 'opened',
            sourcePalletInfo: `پالت #${pallet.palletIndex}`,
            notes: depalletizeNotes,
          },
        ],
      };

      if (onAddItem) onAddItem(newLooseItem);
      triggerToast(`✅ قرقره به وزن ${formatNumber(spoolWeightToMove, 1)} kg با موفقیت به بخش قرقره‌های آزاد اضافه گردید.`);
    } else {
      // Outbound document for consumption or delivery
      const newOutboundConsignmentId = `OUT-DEPALLET-${Date.now().toString().slice(-5)}`;
      const outboundTitle = depalletizeAction === 'to_production' ? 'مصرف خط تولید' : 'تحویل به مشتری';
      
      const newOutboundItem: WarehouseItem = {
        id: newOutboundConsignmentId,
        entryType: 'outbound',
        referenceDocNumber: `حواله-برداشت#${pallet.palletIndex}`,
        date: new Date().toLocaleDateString('fa-IR'),
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        targetPartyName: outboundTitle,
        driverName: 'برداشت مستقیم از پالت',
        brand: pallet.brand,
        diameterInch: pallet.diameterInch,
        thicknessMm: pallet.thicknessMm,
        packagingType: 'spool',
        spoolType: 'non_pallet',
        quantity: 1,
        totalWeightKg: spoolWeightToMove,
        createdAt: new Date().toISOString(),
        totalItemsCount: 1,
        notes: `خروج ۱ عدد قرقره به وزن ${spoolWeightToMove} kg از پالت #${pallet.palletIndex}. ${depalletizeNotes}`,
        items: [
          {
            id: `out-cargo-${Date.now()}`,
            packagingType: 'spool',
            spoolType: 'non_pallet',
            brand: pallet.brand,
            diameterInch: pallet.diameterInch,
            thicknessMm: pallet.thicknessMm,
            quantity: 1,
            spoolWeights: [spoolWeightToMove],
            totalWeightKg: spoolWeightToMove,
            notes: depalletizeNotes,
          },
        ],
      };

      if (onAddItem) onAddItem(newOutboundItem);
      triggerToast(`✅ حواله خروج قرقره به وزن ${formatNumber(spoolWeightToMove, 1)} kg ثبت گردید.`);
    }

    setDepalletizeTarget(null);
  };

  // Toggle loose spool condition (sealed <-> opened)
  const handleToggleLooseSpoolCondition = (loose: LooseSpoolItem) => {
    const parentConsignment = items.find((it) => it.id === loose.consignmentId);
    if (!parentConsignment) return;

    const newCond: 'sealed' | 'opened' = loose.spoolCondition === 'opened' ? 'sealed' : 'opened';
    const updatedSubItems: WarehouseCargoItem[] = (parentConsignment.items || []).map((sub) => {
      if (sub.id === loose.cargoItemId) {
        return {
          ...sub,
          spoolCondition: newCond,
        };
      }
      return sub;
    });

    const updatedConsignment: WarehouseItem = {
      ...parentConsignment,
      items: updatedSubItems,
    };

    if (onUpdateItem) onUpdateItem(updatedConsignment);
    else updateWarehouseItem(updatedConsignment);

    triggerToast(`وضعیت قرقره به «${newCond === 'sealed' ? '🔒 پلمپ' : '🔓 باز شده'}» تغییر یافت.`);
  };

  const totalPalletsWeight = filteredPallets.reduce((acc, p) => acc + p.totalWeightKg, 0);
  const totalPalletsSpoolsCount = filteredPallets.reduce((acc, p) => acc + p.spoolsCount, 0);
  const full5PalletsCount = filteredPallets.filter((p) => p.isFullStandardPallet).length;
  const splitPalletsCount = filteredPallets.length - full5PalletsCount;

  return (
    <div className="space-y-4 font-sans text-slate-800">
      
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200 text-xs font-bold border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* SECTION 1: PALLETIZED SPOOLS INVENTORY */}
      {(stockCategoryFilter === 'all' || stockCategoryFilter === 'pallets') && (
        <div className="space-y-3">
          {filteredPallets.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
              پالت قرقره‌ای پیدا نشد.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredPallets.map((pallet) => (
                <div
                  key={pallet.id}
                  className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-2xs hover:border-amber-400 transition-all flex flex-col justify-between space-y-3 text-slate-800"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-xs font-mono">
                          پالت #{pallet.palletIndex}
                        </span>
                        {pallet.isFullStandardPallet ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            ۵ تایی کامل
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                            {pallet.spoolsCount} تایی
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-xs text-slate-900 mt-1.5 flex items-center gap-1 flex-wrap">
                        <span className="text-amber-900">برند {pallet.brand}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-800">سایز "{pallet.diameterInch}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-600">{pallet.thicknessMm}mm</span>
                      </div>
                    </div>

                    <div className="text-left font-mono">
                      <span className="text-[10px] text-slate-500 block">وزن پالت:</span>
                      <span className="text-sm font-black text-amber-700">
                        {formatWeight(pallet.totalWeightKg)}
                      </span>
                    </div>
                  </div>

                  {/* Spools Inside Pallet */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-slate-700">
                        وزن قرقره‌ها ({pallet.spoolWeights.length} عدد):
                      </span>
                      <span className="font-mono">میانگین: {formatNumber(pallet.avgWeightKg, 1)} kg</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {pallet.spoolWeights.map((w, idx) => (
                        <div
                          key={idx}
                          onClick={() => setDepalletizeTarget({ pallet, selectedSpoolIndex: idx })}
                          title="برای برداشت این قرقره کلیک کنید"
                          className="bg-slate-50 border border-slate-200 hover:border-amber-400 p-1.5 rounded-lg text-center font-mono space-y-0.5 cursor-pointer transition-all hover:scale-[1.02] text-xs"
                        >
                          <span className="text-[10px] text-slate-500 block">
                            قرقره {idx + 1}
                          </span>
                          <span className="font-bold text-amber-900 block">
                            {formatNumber(w, 1)} kg
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Depalletize button */}
                  <button
                    type="button"
                    onClick={() => setDepalletizeTarget({ pallet, selectedSpoolIndex: 0 })}
                    className="w-full py-1.5 bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Scissors className="w-3.5 h-3.5 text-amber-600" />
                    <span>برداشت / تفکیک قرقره از پالت</span>
                  </button>

                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between gap-1 font-mono">
                    <span>سند: {pallet.referenceDocNumber}</span>
                    <span>{pallet.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: LOOSE / NON-PALLET SPOOLS */}
      {(stockCategoryFilter === 'all' || stockCategoryFilter === 'loose_spools') && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
              <Disc className="w-4 h-4 text-amber-600" />
              <span>قرقره‌های غیرپالتی و تکی ({filteredLooseSpools.length} قلم)</span>
            </h3>
            <span className="text-xs font-mono text-slate-600">
              کل غیرپالتی: <strong className="text-slate-900">{inventorySummary.totalSpoolsNonPallet} عدد</strong> ({formatWeight(inventorySummary.spoolNonPalletWeightKg)})
            </span>
          </div>

          {filteredLooseSpools.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
              قرقره غیرپالتی ثبت نشده است.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredLooseSpools.map((loose) => (
                <div
                  key={loose.id}
                  className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2 shadow-2xs text-slate-800"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-amber-900">قرقره مس غیرپالتی</span>
                    <button
                      type="button"
                      onClick={() => handleToggleLooseSpoolCondition(loose)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border transition-all cursor-pointer ${
                        loose.spoolCondition === 'opened'
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      }`}
                    >
                      {loose.spoolCondition === 'opened' ? <Unlock className="w-3 h-3 text-amber-600" /> : <Lock className="w-3 h-3 text-emerald-600" />}
                      <span>{loose.spoolCondition === 'opened' ? '🔓 باز شده' : '🔒 پلمپ'}</span>
                    </button>
                  </div>

                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-mono">
                    <span>برند {loose.brand}</span>
                    <span>•</span>
                    <span>سایز "{loose.diameterInch}</span>
                    <span>•</span>
                    <span>{loose.thicknessMm}mm</span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-slate-100">
                    <span className="text-slate-600">تعداد: {loose.quantity} عدد</span>
                    <span className="font-black text-amber-700">وزن: {formatWeight(loose.totalWeightKg)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: COILS INVENTORY */}
      {(stockCategoryFilter === 'all' || stockCategoryFilter === 'coils') && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>کلاف‌های مس موجود ({filteredCoils.length} گروه)</span>
            </h3>
            <span className="text-xs font-mono text-slate-600">
              کل کلاف‌ها: <strong className="text-slate-900">{inventorySummary.totalCoils} کلاف</strong> ({formatWeight(inventorySummary.packagingBreakdown.coil?.weightKg || 0)})
            </span>
          </div>

          {filteredCoils.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
              کلاف مس ثبت نشده است.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCoils.map((c) => (
                <div key={c.key} className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2 shadow-2xs text-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900">کلاف مس</span>
                    <span className="text-xs font-mono font-black text-slate-900">{formatWeight(c.totalWeightKg)}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-mono">
                    <span>برند {c.brand}</span>
                    <span>•</span>
                    <span>سایز "{c.diameterInch}</span>
                    <span>•</span>
                    <span>{c.thicknessMm}mm</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono pt-1 text-slate-600">
                    <span className="bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
                      ۱۵ متری: {c.length15mCount} کلاف ({formatWeight(c.length15mWeightKg)})
                    </span>
                    <span className="bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
                      ۵۰ متری: {c.length50mCount} کلاف ({formatWeight(c.length50mWeightKg)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: STRAIGHTS INVENTORY */}
      {(stockCategoryFilter === 'all' || stockCategoryFilter === 'straights') && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
              <Ruler className="w-4 h-4 text-blue-600" />
              <span>شاخه‌های مس موجود ({filteredStraights.length} گروه)</span>
            </h3>
            <span className="text-xs font-mono text-slate-600">
              کل شاخه‌ها: <strong className="text-slate-900">{inventorySummary.totalStraights} شاخه</strong> ({formatWeight(inventorySummary.packagingBreakdown.straight?.weightKg || 0)})
            </span>
          </div>

          {filteredStraights.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
              شاخه مس ثبت نشده است.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredStraights.map((s) => (
                <div key={s.key} className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2 shadow-2xs text-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900">شاخه مس</span>
                    <span className="text-xs font-mono font-black text-slate-900">{formatWeight(s.totalWeightKg)}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-mono">
                    <span>برند {s.brand}</span>
                    <span>•</span>
                    <span>سایز "{s.diameterInch}</span>
                    <span>•</span>
                    <span>{s.thicknessMm}mm</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-600">
                    تعداد کل: <strong className="text-slate-900">{s.totalCount} شاخه</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DEPALLETIZE MODAL */}
      {depalletizeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-xl relative my-auto text-slate-800">
            
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                  <Scissors className="w-4 h-4 text-amber-600" />
                  <span>برداشت قرقره از پالت #{depalletizeTarget.pallet.palletIndex}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  برند {depalletizeTarget.pallet.brand} • سایز "{depalletizeTarget.pallet.diameterInch} • ضخامت {depalletizeTarget.pallet.thicknessMm}mm
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDepalletizeTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Select Spool */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                ۱. انتخاب قرقره مورد نظر:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {depalletizeTarget.pallet.spoolWeights.map((w, idx) => {
                  const isSelected = depalletizeTarget.selectedSpoolIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setDepalletizeTarget({ ...depalletizeTarget, selectedSpoolIndex: idx })}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-mono ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-[10px] block font-sans">قرقره {idx + 1}</span>
                      <span className="text-xs font-bold block">{formatNumber(w, 1)} kg</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Destination */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                ۲. مقصد قرقره برداشته شده:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDepalletizeAction('to_loose')}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    depalletizeAction === 'to_loose'
                      ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold">انتقال به قرقره آزاد</div>
                  <p className="text-[10px] text-slate-500">فله در انبار می‌ماند</p>
                </button>

                <button
                  type="button"
                  onClick={() => setDepalletizeAction('to_production')}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    depalletizeAction === 'to_production'
                      ? 'bg-purple-50 text-purple-900 border-purple-300 font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold">مصرف خط تولید</div>
                  <p className="text-[10px] text-slate-500">حواله مصرف داخلی</p>
                </button>

                <button
                  type="button"
                  onClick={() => setDepalletizeAction('to_outbound')}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    depalletizeAction === 'to_outbound'
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold">تحویل مشتری</div>
                  <p className="text-[10px] text-slate-500">حواله خروج فروش</p>
                </button>
              </div>
            </div>

            {/* Condition */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">۳. وضعیت فیزیکی قرقره:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDepalletizeCondition('sealed')}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    depalletizeCondition === 'sealed'
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>🔒 پلمپ و بسته</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDepalletizeCondition('opened')}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    depalletizeCondition === 'opened'
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <Unlock className="w-3.5 h-3.5 text-amber-600" />
                  <span>🔓 باز شده</span>
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">توضیحات:</label>
              <input
                type="text"
                value={depalletizeNotes}
                onChange={(e) => setDepalletizeNotes(e.target.value)}
                placeholder="توضیحات اختیاری..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDepalletizeTarget(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDepalletize}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>تأیید برداشت ({formatNumber(depalletizeTarget.pallet.spoolWeights[depalletizeTarget.selectedSpoolIndex], 1)} kg)</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
