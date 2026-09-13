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
  onOpenAdd?: (type: 'inbound' | 'outbound') => void;
  onViewReceipt?: (item: WarehouseItem) => void;
  onUpdateItem?: (item: WarehouseItem) => void;
  onAddItem?: (item: WarehouseItem) => void;
}

export const WarehouseLiveStockCatalog: React.FC<WarehouseLiveStockCatalogProps> = ({
  items,
  inventorySummary,
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
      // Brand filter
      if (brandFilter !== 'all' && p.brand !== brandFilter) return false;
      // Diameter filter (e.g. 3/8)
      if (diameterFilter !== 'all' && p.diameterInch !== diameterFilter) return false;
      // Thickness filter (e.g. 0.75)
      if (thicknessFilter !== 'all' && Math.abs(p.thicknessMm - parseFloat(thicknessFilter)) > 0.001) return false;
      // Pallet status filter
      if (palletStatusFilter === 'full_5' && p.spoolsCount < 5) return false;
      if (palletStatusFilter === 'split' && p.spoolsCount >= 5) return false;

      // Free-text search
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchBrand = p.brand.toLowerCase().includes(q);
        const matchDiameter = p.diameterInch.toLowerCase().includes(q);
        const matchThickness = String(p.thicknessMm).includes(q);
        const matchDoc = p.referenceDocNumber.toLowerCase().includes(q);
        const matchDriver = (p.driverName || '').toLowerCase().includes(q);
        const matchParty = (p.targetPartyName || '').toLowerCase().includes(q);
        const matchPalletNo = `پالت ${p.palletIndex}`.includes(q) || `#${p.palletIndex}`.includes(q) || String(p.palletIndex) === q;
        if (!matchBrand && !matchDiameter && !matchThickness && !matchDoc && !matchDriver && !matchParty && !matchPalletNo) {
          return false;
        }
      }
      return true;
    });
  }, [palletCards, brandFilter, diameterFilter, thicknessFilter, palletStatusFilter, searchQuery]);

  // Apply filters to Loose Spools
  const filteredLooseSpools = useMemo(() => {
    return looseSpools.filter((s) => {
      if (brandFilter !== 'all' && s.brand !== brandFilter) return false;
      if (diameterFilter !== 'all' && s.diameterInch !== diameterFilter) return false;
      if (thicknessFilter !== 'all' && Math.abs(s.thicknessMm - parseFloat(thicknessFilter)) > 0.001) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchBrand = s.brand.toLowerCase().includes(q);
        const matchDiameter = s.diameterInch.toLowerCase().includes(q);
        const matchDoc = s.referenceDocNumber.toLowerCase().includes(q);
        const matchSource = (s.sourcePalletInfo || '').toLowerCase().includes(q);
        if (!matchBrand && !matchDiameter && !matchDoc && !matchSource) return false;
      }
      return true;
    });
  }, [looseSpools, brandFilter, diameterFilter, thicknessFilter, searchQuery]);

  // Apply filters to Coils
  const filteredCoils = useMemo(() => {
    return coilsGroups.filter((c) => {
      if (brandFilter !== 'all' && c.brand !== brandFilter) return false;
      if (diameterFilter !== 'all' && c.diameterInch !== diameterFilter) return false;
      if (thicknessFilter !== 'all' && Math.abs(c.thicknessMm - parseFloat(thicknessFilter)) > 0.001) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchBrand = c.brand.toLowerCase().includes(q);
        const matchDiameter = c.diameterInch.toLowerCase().includes(q);
        if (!matchBrand && !matchDiameter) return false;
      }
      return true;
    });
  }, [coilsGroups, brandFilter, diameterFilter, thicknessFilter, searchQuery]);

  // Apply filters to Straights
  const filteredStraights = useMemo(() => {
    return straightsGroups.filter((s) => {
      if (brandFilter !== 'all' && s.brand !== brandFilter) return false;
      if (diameterFilter !== 'all' && s.diameterInch !== diameterFilter) return false;
      if (thicknessFilter !== 'all' && Math.abs(s.thicknessMm - parseFloat(thicknessFilter)) > 0.001) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchBrand = s.brand.toLowerCase().includes(q);
        const matchDiameter = s.diameterInch.toLowerCase().includes(q);
        if (!matchBrand && !matchDiameter) return false;
      }
      return true;
    });
  }, [straightsGroups, brandFilter, diameterFilter, thicknessFilter, searchQuery]);

  // Check if any filter is active
  const hasActiveFilters = brandFilter !== 'all' || diameterFilter !== 'all' || thicknessFilter !== 'all' || palletStatusFilter !== 'all' || searchQuery.trim() !== '';

  const handleClearFilters = () => {
    setBrandFilter('all');
    setDiameterFilter('all');
    setThicknessFilter('all');
    setPalletStatusFilter('all');
    setSearchQuery('');
  };

  // Pallet depalletization confirmation handler
  const handleConfirmDepalletize = () => {
    if (!depalletizeTarget) return;

    const { pallet, selectedSpoolIndex } = depalletizeTarget;
    const pickedSpoolWeight = pallet.spoolWeights[selectedSpoolIndex];

    if (!pickedSpoolWeight || pickedSpoolWeight <= 0) {
      alert('خطا در انتخاب قرقره');
      return;
    }

    // 1. Locate the parent consignment
    const parentConsignment = items.find((it) => it.id === pallet.consignmentId);
    if (!parentConsignment) {
      alert('بارنامه مبدا پالت یافت نشد.');
      return;
    }

    // 2. Clone and update cargo items in the consignment
    const existingCargoItems: WarehouseCargoItem[] = parentConsignment.items && parentConsignment.items.length > 0
      ? JSON.parse(JSON.stringify(parentConsignment.items))
      : [
          {
            id: pallet.cargoItemId,
            packagingType: 'spool',
            spoolType: 'pallet',
            brand: pallet.brand,
            diameterInch: pallet.diameterInch,
            thicknessMm: pallet.thicknessMm,
            quantity: pallet.spoolsCount,
            spoolWeights: pallet.spoolWeights,
            totalWeightKg: pallet.totalWeightKg,
          }
        ];

    // Find the target cargo item
    const targetItemIndex = existingCargoItems.findIndex((ci) => ci.id === pallet.cargoItemId);
    if (targetItemIndex === -1) {
      alert('قلم کالای پالت یافت نشد.');
      return;
    }

    const targetCargo = existingCargoItems[targetItemIndex];
    const currentWeights = targetCargo.spoolWeights ? [...targetCargo.spoolWeights] : [];

    // Remove the selected spool weight from pallet
    currentWeights.splice(selectedSpoolIndex, 1);
    const newQuantity = currentWeights.length;
    const newTotalWeight = currentWeights.reduce((s, w) => s + w, 0);

    if (newQuantity > 0) {
      // Update the pallet cargo item with remaining spools
      existingCargoItems[targetItemIndex] = {
        ...targetCargo,
        quantity: newQuantity,
        spoolWeights: currentWeights,
        totalWeightKg: newTotalWeight,
        notes: targetCargo.notes ? `${targetCargo.notes} | (یک قرقره ${pickedSpoolWeight}kg کسر شد)` : `پالت تفکیک شده (کسر ۱ قرقره ${pickedSpoolWeight}kg)`,
      };
    } else {
      // All spools taken from this pallet
      existingCargoItems.splice(targetItemIndex, 1);
    }

    // Recalculate consignment total weight
    const updatedConsignmentTotalWeight = existingCargoItems.reduce((s, ci) => s + (ci.totalWeightKg || 0), 0);
    const updatedConsignmentTotalItems = existingCargoItems.reduce((s, ci) => s + (ci.quantity || 1), 0);

    const updatedConsignment: WarehouseItem = {
      ...parentConsignment,
      items: existingCargoItems,
      totalWeightKg: updatedConsignmentTotalWeight,
      totalItemsCount: updatedConsignmentTotalItems,
    };

    // Save the updated consignment
    if (onUpdateItem) {
      onUpdateItem(updatedConsignment);
    } else {
      updateWarehouseItem(updatedConsignment);
    }

    const nowStr = new Date().toLocaleDateString('fa-IR');
    const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    // Handle Destination
    if (depalletizeAction === 'to_loose') {
      // Add as loose spool to warehouse stock
      const looseConsignment: WarehouseItem = {
        id: `wh-loose-${Date.now()}`,
        entryType: 'inbound',
        date: nowStr,
        time: timeStr,
        referenceDocNumber: `تفکیک-پالت-${pallet.palletIndex}`,
        targetPartyName: `انبار داخلی (جدا شده از پالت #${pallet.palletIndex} ${pallet.brand})`,
        notes: `قرقره جدا شده از پالت #${pallet.palletIndex} (بارنامه ${pallet.referenceDocNumber}). وضعیت: ${depalletizeCondition === 'sealed' ? 'پلمپ' : 'باز شده'}. ${depalletizeNotes}`,
        createdAt: new Date().toISOString(),
        items: [
          {
            id: `sub-loose-${Date.now()}`,
            packagingType: 'spool',
            spoolType: 'non_pallet',
            brand: pallet.brand,
            diameterInch: pallet.diameterInch,
            thicknessMm: pallet.thicknessMm,
            quantity: 1,
            spoolWeights: [pickedSpoolWeight],
            totalWeightKg: pickedSpoolWeight,
            spoolCondition: depalletizeCondition,
            sourcePalletInfo: `پالت #${pallet.palletIndex} (${pallet.brand} ${pallet.diameterInch} - ضخامت ${pallet.thicknessMm}mm) بارنامه ${pallet.referenceDocNumber}`,
            notes: depalletizeNotes,
          }
        ],
        totalWeightKg: pickedSpoolWeight,
        totalItemsCount: 1,
      };

      if (onAddItem) {
        onAddItem(looseConsignment);
      } else {
        addWarehouseItem(looseConsignment);
      }

      triggerToast(`✅ ۱ قرقره با وزن ${pickedSpoolWeight} kg از پالت #${pallet.palletIndex} کسر و به لیست «قرقره‌های آزاد انبار» با وضعیت (${depalletizeCondition === 'sealed' ? 'پلمپ' : 'باز شده'}) منتقل گردید.`);
    } else if (depalletizeAction === 'to_production') {
      // Outbound dispatch for factory production line
      const outboundItem: WarehouseItem = {
        id: `wh-out-${Date.now()}`,
        entryType: 'outbound',
        date: nowStr,
        time: timeStr,
        referenceDocNumber: `حواله-مصرف-تولید-${Date.now().toString().slice(-4)}`,
        targetPartyName: 'خط تولید کارخانه (مصرف داخلی)',
        driverName: 'تحویل‌گیرنده خط تولید',
        notes: `برداشت مستقیم ۱ قرقره از پالت #${pallet.palletIndex} برای خط تولید. وضعیت: ${depalletizeCondition === 'sealed' ? 'پلمپ' : 'باز شده'}. ${depalletizeNotes}`,
        createdAt: new Date().toISOString(),
        items: [
          {
            id: `sub-out-${Date.now()}`,
            packagingType: 'spool',
            spoolType: 'non_pallet',
            brand: pallet.brand,
            diameterInch: pallet.diameterInch,
            thicknessMm: pallet.thicknessMm,
            quantity: 1,
            spoolWeights: [pickedSpoolWeight],
            totalWeightKg: pickedSpoolWeight,
            spoolCondition: depalletizeCondition,
            sourcePalletInfo: `پالت #${pallet.palletIndex} بارنامه ${pallet.referenceDocNumber}`,
            notes: depalletizeNotes,
          }
        ],
        totalWeightKg: pickedSpoolWeight,
        totalItemsCount: 1,
      };

      if (onAddItem) {
        onAddItem(outboundItem);
      } else {
        addWarehouseItem(outboundItem);
      }

      triggerToast(`🏭 ۱ قرقره به وزن ${pickedSpoolWeight} kg مستقیماً به عنوان حواله مصرف در خط تولید ثبت و از موجودی انبار کسر شد.`);
    } else {
      // Outbound dispatch for customer delivery
      const outboundItem: WarehouseItem = {
        id: `wh-out-${Date.now()}`,
        entryType: 'outbound',
        date: nowStr,
        time: timeStr,
        referenceDocNumber: `حواله-خروج-${Date.now().toString().slice(-4)}`,
        targetPartyName: 'مشتری خروجی',
        notes: `خروج ۱ قرقره از پالت #${pallet.palletIndex}. ${depalletizeNotes}`,
        createdAt: new Date().toISOString(),
        items: [
          {
            id: `sub-out-${Date.now()}`,
            packagingType: 'spool',
            spoolType: 'non_pallet',
            brand: pallet.brand,
            diameterInch: pallet.diameterInch,
            thicknessMm: pallet.thicknessMm,
            quantity: 1,
            spoolWeights: [pickedSpoolWeight],
            totalWeightKg: pickedSpoolWeight,
            spoolCondition: depalletizeCondition,
            sourcePalletInfo: `پالت #${pallet.palletIndex} بارنامه ${pallet.referenceDocNumber}`,
            notes: depalletizeNotes,
          }
        ],
        totalWeightKg: pickedSpoolWeight,
        totalItemsCount: 1,
      };

      if (onAddItem) {
        onAddItem(outboundItem);
      } else {
        addWarehouseItem(outboundItem);
      }

      triggerToast(`🚚 ۱ قرقره به وزن ${pickedSpoolWeight} kg به عنوان حواله خروج مشتری ثبت شد.`);
    }

    // Close modal
    setDepalletizeTarget(null);
    setDepalletizeNotes('');
  };

  // Toggle loose spool condition (sealed <-> opened)
  const handleToggleLooseSpoolCondition = (loose: LooseSpoolItem) => {
    const parentConsignment = items.find((it) => it.id === loose.consignmentId);
    if (!parentConsignment) return;

    const newCondition: 'sealed' | 'opened' = loose.spoolCondition === 'opened' ? 'sealed' : 'opened';
    const existingCargoItems: WarehouseCargoItem[] = JSON.parse(JSON.stringify(parentConsignment.items || []));
    const targetIdx = existingCargoItems.findIndex((ci) => ci.id === loose.cargoItemId);

    if (targetIdx !== -1) {
      existingCargoItems[targetIdx].spoolCondition = newCondition;
      const updatedConsignment: WarehouseItem = {
        ...parentConsignment,
        items: existingCargoItems,
      };
      if (onUpdateItem) onUpdateItem(updatedConsignment);
      else updateWarehouseItem(updatedConsignment);

      triggerToast(`وضعیت قرقره به «${newCondition === 'sealed' ? 'پلمپ و بسته' : 'باز شده / در حال مصرف'}» تغییر یافت.`);
    }
  };

  // Total weight of current filtered pallets
  const totalPalletsWeight = filteredPallets.reduce((s, p) => s + p.totalWeightKg, 0);
  const totalPalletsSpoolsCount = filteredPallets.reduce((s, p) => s + p.spoolsCount, 0);
  const full5PalletsCount = filteredPallets.filter((p) => p.isFullStandardPallet).length;
  const splitPalletsCount = filteredPallets.filter((p) => !p.isFullStandardPallet).length;

  return (
    <div className="space-y-6">

      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 border border-emerald-500/50 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs font-bold leading-relaxed">{feedbackToast}</p>
          <button 
            type="button" 
            onClick={() => setFeedbackToast(null)} 
            className="text-stone-400 hover:text-white p-1 rounded-lg mr-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
              مشاهده تفکیکی تک‌تک <strong className="text-amber-300">پالت‌های قرقره (پالت‌های ۵ تایی استاندارد با ریز وزن هر قرقره)</strong>، امکان تفکیک و برداشت قرقره از پالت، کلاف‌های مس و قرقره‌های آزاد با فیلتر سریع برند و سایز.
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
            <span className="text-[11px] text-stone-400 block mb-0.5">قرقره‌های غیر پالتی (فله/تکی):</span>
            <div className="text-lg font-black font-mono text-amber-200">
              {inventorySummary.totalSpoolsNonPallet} <span className="text-xs font-normal text-stone-400">عدد</span>
            </div>
            <span className="text-[10px] text-stone-400 font-mono">
              (وزن: {formatWeight(inventorySummary.spoolNonPalletWeightKg)})
            </span>
          </div>
        </div>
      </div>

      {/* ADVANCED MULTI-CRITERIA SEARCH & FILTER TOOLBAR */}
      <div className="bg-stone-900/90 p-4 sm:p-5 rounded-3xl border border-stone-800 space-y-4 shadow-xl">
        
        {/* Top Row: Search Input + Category Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Live Search Box */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در شماره پالت (مثلا #1)، بارنامه، برند، سایز (مثلا 3/8)، راننده..."
              className="w-full pl-3 pr-10 py-2.5 text-xs rounded-2xl border border-stone-700 bg-stone-950 text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-2.5 text-stone-400 hover:text-white p-0.5 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Toggle and Clear Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                showAdvancedFilters || hasActiveFilters
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-stone-950 text-stone-300 border-stone-800 hover:bg-stone-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>فیلترهای مشخصات کالا (برند، سایز، ضخامت)</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse"></span>
              )}
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3 py-2 rounded-2xl text-xs text-red-400 hover:text-red-300 bg-red-950/30 border border-red-800/40 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>حذف فیلترها</span>
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Filters (Brand, Diameter, Thickness, Pallet Status) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-stone-800/80">
          
          {/* 1. Brand Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-stone-400 flex items-center gap-1">
              <span>کارخانه / برند مس:</span>
            </label>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-stone-700 bg-stone-950 text-stone-200 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="all">همه کارخانه‌ها و برندها</option>
              {COPPER_BRANDS.map((b) => (
                <option key={b} value={b}>برند {b}</option>
              ))}
            </select>
          </div>

          {/* 2. Diameter / Inch Size Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-stone-400 flex items-center gap-1">
              <span>سایز لوله (قطر اینچ):</span>
            </label>
            <select
              value={diameterFilter}
              onChange={(e) => setDiameterFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold font-mono rounded-xl border border-stone-700 bg-stone-950 text-stone-200 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="all">همه سایزها (3/8 ، 1/2 ، 5/8 ...)</option>
              {COPPER_DIAMETERS.map((d) => (
                <option key={d} value={d}>سایز "{d} اینچ</option>
              ))}
            </select>
          </div>

          {/* 3. Thickness Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-stone-400 flex items-center gap-1">
              <span>ضخامت گوشت مس (mm):</span>
            </label>
            <select
              value={thicknessFilter}
              onChange={(e) => setThicknessFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold font-mono rounded-xl border border-stone-700 bg-stone-950 text-stone-200 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="all">همه ضخامت‌ها</option>
              {COPPER_THICKNESSES.map((t) => (
                <option key={t} value={String(t)}>ضخامت {t.toFixed(2)} mm</option>
              ))}
            </select>
          </div>

          {/* 4. Pallet Status Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-stone-400 flex items-center gap-1">
              <span>وضعیت پالت قرقره:</span>
            </label>
            <select
              value={palletStatusFilter}
              onChange={(e) => setPalletStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-stone-700 bg-stone-950 text-stone-200 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="all">همه پالت‌ها (کامل و تفکیک‌شده)</option>
              <option value="full_5">🌟 فقط پالت‌های ۵ تایی کامل</option>
              <option value="split">✂️ پالت‌های باز شده / کسری‌دار</option>
            </select>
          </div>

        </div>

        {/* Category Pills Switcher */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-800">
          <button
            type="button"
            onClick={() => setStockCategoryFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              stockCategoryFilter === 'all'
                ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm font-black'
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
                ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm font-black'
                : 'bg-stone-950/80 text-amber-300 border-amber-500/30 hover:bg-amber-950/30'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span>📦 پالت‌های قرقره ({filteredPallets.length} پالت)</span>
          </button>

          <button
            type="button"
            onClick={() => setStockCategoryFilter('loose_spools')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
              stockCategoryFilter === 'loose_spools'
                ? 'bg-amber-600 text-white border-amber-500 shadow-sm font-black'
                : 'bg-stone-950/80 text-amber-200 border-stone-800 hover:text-stone-200'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span>🔘 قرقره‌های غیر پالتی / تکی ({filteredLooseSpools.length} قلم)</span>
          </button>

          <button
            type="button"
            onClick={() => setStockCategoryFilter('coils')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
              stockCategoryFilter === 'coils'
                ? 'bg-purple-600 text-white border-purple-500 shadow-sm font-black'
                : 'bg-stone-950/80 text-purple-300 border-purple-500/30 hover:bg-purple-950/30'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>🌀 کلاف‌های مس ({filteredCoils.length} گروه)</span>
          </button>

          <button
            type="button"
            onClick={() => setStockCategoryFilter('straights')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
              stockCategoryFilter === 'straights'
                ? 'bg-blue-600 text-white border-blue-500 shadow-sm font-black'
                : 'bg-stone-950/80 text-blue-300 border-blue-500/30 hover:bg-blue-950/30'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>📏 شاخه‌های مس ({filteredStraights.length} گروه)</span>
          </button>
        </div>

      </div>

      {/* SECTION 1: PALLETIZED SPOOLS INVENTORY (پالت‌های قرقره مس با ریز وزن هر قرقره و امکان تفکیک) */}
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
            <div className="text-xs font-mono text-stone-300 flex items-center gap-3">
              <span>
                مجموع وزن پالت‌ها: <strong className="text-amber-300 font-bold">{formatWeight(totalPalletsWeight)}</strong> ({totalPalletsSpoolsCount} قرقره)
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-400">
                {full5PalletsCount} پالت ۵ تایی کامل | {splitPalletsCount} پالت باز شده
              </span>
            </div>
          </div>

          {filteredPallets.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400 bg-stone-900/40 rounded-2xl border border-dashed border-stone-800 space-y-2">
              <p>هیچ پالت قرقره‌ای با مشخصات و فیلترهای انتخابی یافت نشد.</p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-amber-400 underline font-bold cursor-pointer"
                >
                  بازنشانی فیلترها و مشاهده همه پالت‌ها
                </button>
              )}
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
                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-stone-950 font-black text-xs font-mono shadow-xs">
                            پالت #{pallet.palletIndex}
                          </span>
                          {pallet.isFullStandardPallet ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              🌟 پالت ۵ تایی استاندارد
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              ⚠️ پالت {pallet.spoolsCount} تایی (تفکیک شده)
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-sm text-white mt-2 flex items-center gap-2 flex-wrap">
                          <span className="text-amber-200">برند {pallet.brand}</span>
                          <span>•</span>
                          <span className="font-mono text-amber-300">سایز "{pallet.diameterInch}</span>
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
                          وزن قرقره‌های روی این پالت ({pallet.spoolWeights.length} عدد):
                        </span>
                        <span className="font-mono">
                          میانگین: {formatNumber(pallet.avgWeightKg, 1)} kg
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {pallet.spoolWeights.map((w, idx) => (
                          <div
                            key={idx}
                            onClick={() => setDepalletizeTarget({ pallet, selectedSpoolIndex: idx })}
                            title="برای برداشت و تفکیک این قرقره کلیک کنید"
                            className="bg-stone-950 border border-amber-500/20 hover:border-amber-400 p-2 rounded-xl text-center font-mono space-y-0.5 shadow-inner cursor-pointer transition-all hover:scale-[1.02] group/spool relative"
                          >
                            <span className="text-[10px] text-stone-500 block font-sans group-hover/spool:text-amber-300 transition-colors">
                              قرقره {idx + 1}
                            </span>
                            <span className="text-xs font-black text-amber-200 block">
                              {formatNumber(w, 1)} <span className="text-[10px] text-stone-400 font-normal">kg</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action: Depalletize (برداشتن یک قرقره از پالت) */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setDepalletizeTarget({ pallet, selectedSpoolIndex: 0 })}
                        className="w-full py-2 bg-stone-950 hover:bg-amber-500 hover:text-stone-950 text-amber-300 rounded-xl text-xs font-bold border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Scissors className="w-3.5 h-3.5" />
                        <span>برداشت / تفکیک قرقره از این پالت</span>
                      </button>
                    </div>

                    {/* Pallet Source Consignment Meta Info */}
                    <div className="pt-2.5 border-t border-stone-800/80 text-[11px] text-stone-400 flex flex-wrap items-center justify-between gap-2 font-mono">
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

      {/* SECTION 2: LOOSE / NON-PALLET SPOOLS (قرقره‌های غیر پالتی / تکی / تفکیک‌شده از پالت با وضعیت پلمپ/باز) */}
      {(stockCategoryFilter === 'all' || stockCategoryFilter === 'loose_spools') && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
                <Disc className="w-4 h-4" />
              </span>
              <h3 className="text-sm sm:text-base font-black text-white">
                قرقره‌های غیر پالتی و تکی موجود در انبار ({filteredLooseSpools.length} قلم)
              </h3>
            </div>
            <div className="text-xs font-mono text-amber-300">
              کل قرقره‌های غیر پالتی: <strong className="text-white">{inventorySummary.totalSpoolsNonPallet} عدد</strong> (وزن: {formatWeight(inventorySummary.spoolNonPalletWeightKg)})
            </div>
          </div>

          {filteredLooseSpools.length === 0 ? (
            <div className="p-6 text-center text-xs text-stone-400 bg-stone-900/40 rounded-2xl border border-dashed border-stone-800">
              قرقره غیر پالتی در انبار موجود نیست. با دکمه «برداشت از پالت»، می‌توانید هر قرقره‌ای را از پالت جدا کرده و به این بخش اضافه نمایید.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredLooseSpools.map((loose) => (
                <div
                  key={loose.id}
                  className="bg-stone-900/90 rounded-2xl border border-stone-700 p-4 space-y-3 shadow-md flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-amber-300">قرقره مس (غیر پالتی / تکی)</span>
                      
                      {/* Sealed vs Opened Status Badge & Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleLooseSpoolCondition(loose)}
                        title="کلیک برای تغییر وضعیت پلمپ / باز شده"
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 border transition-all cursor-pointer ${
                          loose.spoolCondition === 'opened'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                        }`}
                      >
                        {loose.spoolCondition === 'opened' ? (
                          <>
                            <Unlock className="w-3 h-3" />
                            <span>🔓 باز شده (در حال مصرف)</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" />
                            <span>🔒 پلمپ و بسته</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="text-xs text-stone-200 font-mono">
                      برند {loose.brand} • سایز "{loose.diameterInch} • ضخامت {loose.thicknessMm}mm
                    </div>

                    {/* Source Pallet Provenance */}
                    {loose.sourcePalletInfo && (
                      <div className="text-[11px] text-amber-300/80 bg-stone-950 p-2 rounded-xl border border-amber-500/20 flex items-start gap-1.5 leading-relaxed">
                        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>منشا: {loose.sourcePalletInfo}</span>
                      </div>
                    )}

                    <div className="text-xs font-mono text-amber-200 bg-stone-950 p-2 rounded-xl border border-stone-800">
                      وزن قرقره: <strong className="text-white text-sm">[{loose.spoolWeights.join(' ، ')} kg]</strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-[11px] text-stone-400">سند: {loose.referenceDocNumber}</span>
                    <span className="text-amber-300 font-bold">{formatWeight(loose.totalWeightKg)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: COILS INVENTORY (کلاف‌های مس ۱۵ متری و ۵۰ متری) */}
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
              کلافی با فیلترهای انتخابی موجود نیست.
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
                        سایز "{group.diameterInch} | ضخامت {group.thicknessMm}mm
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

      {/* SECTION 4: STRAIGHTS INVENTORY (شاخه‌های مس) */}
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
              شاخه‌ای با فیلترهای انتخابی موجود نیست.
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
                    سایز "{group.diameterInch} | ضخامت {group.thicknessMm}mm
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

      {/* MODAL: DEPALLETIZE / EXTRACT SPOOL FROM PALLET (تفکیک و برداشتن قرقره از پالت) */}
      {depalletizeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-xs overflow-y-auto">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl w-full max-w-lg p-5 sm:p-6 space-y-5 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-amber-500/20 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300">
                    <Scissors className="w-5 h-5" />
                  </span>
                  <h3 className="text-base font-black text-white">
                    برداشت و تفکیک قرقره از پالت #{depalletizeTarget.pallet.palletIndex}
                  </h3>
                </div>
                <p className="text-xs text-stone-300">
                  برند {depalletizeTarget.pallet.brand} • سایز "{depalletizeTarget.pallet.diameterInch} • ضخامت {depalletizeTarget.pallet.thicknessMm}mm
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDepalletizeTarget(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Select Which Spool to Pick */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-amber-200 block">
                ۱. انتخاب قرقره مورد نظر جهت برداشت از پالت:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {depalletizeTarget.pallet.spoolWeights.map((w, idx) => {
                  const isSelected = depalletizeTarget.selectedSpoolIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setDepalletizeTarget({ ...depalletizeTarget, selectedSpoolIndex: idx })}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer font-mono ${
                        isSelected
                          ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-lg font-black ring-2 ring-amber-400'
                          : 'bg-stone-950 text-stone-200 border-stone-800 hover:border-amber-500/40'
                      }`}
                    >
                      <span className="text-[10px] block font-sans opacity-75">
                        قرقره شماره {idx + 1}
                      </span>
                      <span className="text-sm font-black block mt-0.5">
                        {formatNumber(w, 1)} kg
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Destination Action */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-amber-200 block">
                ۲. مقصد قرقره برداشته شده:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDepalletizeAction('to_loose')}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer space-y-1 ${
                    depalletizeAction === 'to_loose'
                      ? 'bg-amber-500/20 text-amber-200 border-amber-400 shadow-xs'
                      : 'bg-stone-950 text-stone-300 border-stone-800 hover:bg-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Boxes className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>انتقال به قرقره آزاد انبار</span>
                  </div>
                  <p className="text-[10px] text-stone-400 leading-tight">
                    قرقره به عنوان فله/تکی در انبار باقی می‌ماند
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDepalletizeAction('to_production')}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer space-y-1 ${
                    depalletizeAction === 'to_production'
                      ? 'bg-amber-500/20 text-amber-200 border-amber-400 shadow-xs'
                      : 'bg-stone-950 text-stone-300 border-stone-800 hover:bg-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Factory className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>مصرف در خط تولید</span>
                  </div>
                  <p className="text-[10px] text-stone-400 leading-tight">
                    ثبت حواله مصرف داخلی در کارخانه
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDepalletizeAction('to_outbound')}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer space-y-1 ${
                    depalletizeAction === 'to_outbound'
                      ? 'bg-amber-500/20 text-amber-200 border-amber-400 shadow-xs'
                      : 'bg-stone-950 text-stone-300 border-stone-800 hover:bg-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>خروج و تحویل مشتری</span>
                  </div>
                  <p className="text-[10px] text-stone-400 leading-tight">
                    ثبت حواله فروش یا ارسال به مشتری
                  </p>
                </button>
              </div>
            </div>

            {/* Step 3: Spool Physical Condition */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-amber-200 block">
                ۳. وضعیت فیزیکی قرقره برداشته شده:
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDepalletizeCondition('sealed')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    depalletizeCondition === 'sealed'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-xs'
                      : 'bg-stone-950 text-stone-400 border-stone-800'
                  }`}
                >
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>🔒 پلمپ و بسته (دست‌نخورده)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDepalletizeCondition('opened')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    depalletizeCondition === 'opened'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-xs'
                      : 'bg-stone-950 text-stone-400 border-stone-800'
                  }`}
                >
                  <Unlock className="w-4 h-4 text-amber-400" />
                  <span>🔓 باز شده (در حال مصرف)</span>
                </button>
              </div>
            </div>

            {/* Step 4: Notes */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-300 block">
                توضیحات / علت برداشتن قرقره:
              </label>
              <input
                type="text"
                value={depalletizeNotes}
                onChange={(e) => setDepalletizeNotes(e.target.value)}
                placeholder="مثال: جهت خط کویل‌سازی سالن ۲ یا تحویل به انبار فرعی..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-700 bg-stone-950 text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Confirmation Footer */}
            <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setDepalletizeTarget(null)}
                className="px-4 py-2 text-xs text-stone-400 hover:text-white rounded-xl bg-stone-800 hover:bg-stone-700 transition-colors cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={handleConfirmDepalletize}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black rounded-2xl flex items-center gap-1.5 shadow-lg shadow-amber-950/40 transition-all cursor-pointer"
              >
                <Scissors className="w-4 h-4" />
                <span>تأیید برداشت قرقره ({formatNumber(depalletizeTarget.pallet.spoolWeights[depalletizeTarget.selectedSpoolIndex], 1)} kg)</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
