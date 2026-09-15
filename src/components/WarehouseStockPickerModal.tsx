import React, { useState, useMemo, useEffect } from 'react';
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
  Info,
  AlertTriangle,
  PackageOpen,
  CornerDownLeft,
  Sparkles
} from 'lucide-react';
import { WarehouseItem, WarehouseCargoItem } from '../types';
import { formatNumber, formatWeight, formatWeightSlash, toFaDigits } from '../utils/formatters';
import { 
  dismantlePalletIntoLooseSpools, 
  openSpoolToRetailFromPallet, 
  openLooseSpoolToRetail, 
  processPalletDismantlingOnSale,
  PalletCardRef,
  LooseSpoolRef,
  RetailItemRef
} from '../utils/warehousePalletManager';
import { getStoredWarehouseItems } from '../utils/storage';

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
  notes?: string;
}

export interface RetailCopperItem {
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
  items: initialItems,
  onConfirmSelection,
  title = 'انتخاب تصویری پالت‌ها و اقلام از انبار جهت فروش / خروج',
  isStepOneOfSale = false,
}) => {
  // Live items state that updates when pallets are dismantled or spools opened
  const [liveItems, setLiveItems] = useState<WarehouseItem[]>(() => {
    return initialItems && initialItems.length > 0 ? initialItems : getStoredWarehouseItems();
  });

  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setLiveItems(initialItems);
    } else {
      setLiveItems(getStoredWarehouseItems());
    }
  }, [initialItems]);

  useEffect(() => {
    const handleStockUpdated = () => {
      setLiveItems(getStoredWarehouseItems());
    };
    window.addEventListener('warehouse-stock-updated', handleStockUpdated);
    return () => window.removeEventListener('warehouse-stock-updated', handleStockUpdated);
  }, []);

  // Category tab filter
  const [stockCategoryFilter, setStockCategoryFilter] = useState<'all' | 'pallets' | 'loose_spools' | 'retail' | 'coils' | 'straights'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selection states:
  // Pallet spools: Map of palletId -> Set of selected spool indices [0, 1, 2, ...]
  const [selectedPalletSpools, setSelectedPalletSpools] = useState<Map<string, Set<number>>>(new Map());
  // Loose spools selection
  const [selectedLooseSpoolIds, setSelectedLooseSpoolIds] = useState<Set<string>>(new Set());
  // Retail items selection
  const [selectedRetailIds, setSelectedRetailIds] = useState<Set<string>>(new Set());

  // Custom manual weights for Coils, Straights, Retail
  const [selectedCoilsWeight, setSelectedCoilsWeight] = useState<number>(0);
  const [selectedStraightsWeight, setSelectedStraightsWeight] = useState<number>(0);
  const [retailWeight, setRetailWeight] = useState<number>(0);

  // Toast / notification message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Modals for confirmation of action
  const [confirmDismantlePallet, setConfirmDismantlePallet] = useState<PalletStockCard | null>(null);
  const [confirmOpenSpool, setConfirmOpenSpool] = useState<{
    pallet?: PalletStockCard;
    spoolIndex?: number;
    looseSpool?: LooseSpoolItem;
    weightKg: number;
    title: string;
  } | null>(null);

  // Extract inventory items from live consignments
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
            brand: item.brand || 'مس خورده',
            diameterInch: item.diameterInch || '-',
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

    return {
      palletCards: pallets,
      looseSpools: loose,
      retailItems: retail,
      coilsGroups: Object.values(coilsMap),
      straightsGroups: Object.values(straightsMap),
    };
  }, [liveItems]);

  // Search filter
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
      String(s.thicknessMm).includes(q) ||
      (s.sourcePalletInfo && s.sourcePalletInfo.toLowerCase().includes(q))
    );
  }, [looseSpools, searchQuery]);

  const filteredRetailItems = useMemo(() => {
    if (!searchQuery.trim()) return retailItems;
    const q = searchQuery.trim().toLowerCase();
    return retailItems.filter((r) => 
      r.brand.toLowerCase().includes(q) ||
      (r.notes && r.notes.toLowerCase().includes(q))
    );
  }, [retailItems, searchQuery]);

  // Pallet Entire Selection Toggle
  const handleToggleWholePallet = (pallet: PalletStockCard) => {
    setSelectedPalletSpools((prev) => {
      const next = new Map(prev);
      const currentSelected = next.get(pallet.id);
      
      if (currentSelected && currentSelected.size === pallet.spoolWeights.length) {
        // Deselect all spools
        next.delete(pallet.id);
      } else {
        // Select all spools
        const allIndices = new Set<number>(pallet.spoolWeights.map((_, idx) => idx));
        next.set(pallet.id, allIndices);
      }
      return next;
    });
  };

  // Individual Spool Selection Toggle inside Pallet
  const handleTogglePalletSpool = (e: React.MouseEvent, pallet: PalletStockCard, spoolIndex: number) => {
    e.stopPropagation();
    setSelectedPalletSpools((prev) => {
      const next = new Map(prev);
      const currentSet = new Set(next.get(pallet.id) || []);

      if (currentSet.has(spoolIndex)) {
        currentSet.delete(spoolIndex);
      } else {
        currentSet.add(spoolIndex);
      }

      if (currentSet.size === 0) {
        next.delete(pallet.id);
      } else {
        next.set(pallet.id, currentSet);
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

  // Toggle Retail Item Selection
  const handleToggleRetailItem = (retailId: string) => {
    setSelectedRetailIds((prev) => {
      const next = new Set(prev);
      if (next.has(retailId)) {
        next.delete(retailId);
      } else {
        next.add(retailId);
      }
      return next;
    });
  };

  // Execute Dismantling of Pallet into Loose Spools
  const handleExecuteDismantlePallet = (pallet: PalletStockCard) => {
    const updated = dismantlePalletIntoLooseSpools(pallet);
    setLiveItems(updated);
    
    // Clear selections for this pallet
    setSelectedPalletSpools((prev) => {
      const next = new Map(prev);
      next.delete(pallet.id);
      return next;
    });

    setConfirmDismantlePallet(null);
    showToast(`✅ پالت #${pallet.palletIndex} با موفقیت تفکیک شد و تمام قرقره‌های آن به بخش غیرپالتی منتقل گردیدند.`);
  };

  // Execute Opening Spool to Retail (خورده‌ها)
  const handleExecuteOpenSpool = () => {
    if (!confirmOpenSpool) return;

    if (confirmOpenSpool.pallet && confirmOpenSpool.spoolIndex !== undefined) {
      const { pallet, spoolIndex, weightKg } = confirmOpenSpool;
      const updated = openSpoolToRetailFromPallet(pallet, spoolIndex);
      setLiveItems(updated);

      // Deselect this spool from pallet selections
      setSelectedPalletSpools((prev) => {
        const next = new Map(prev);
        const currentSet = new Set(next.get(pallet.id) || []);
        currentSet.delete(spoolIndex);
        if (currentSet.size === 0) next.delete(pallet.id);
        else next.set(pallet.id, currentSet);
        return next;
      });

      showToast(`✂ قرقره ق${spoolIndex + 1} (${formatWeight(weightKg)}) باز شد و به بخش خورده‌ها منتقل گردید.`);
    } else if (confirmOpenSpool.looseSpool) {
      const { looseSpool, weightKg } = confirmOpenSpool;
      const updated = openLooseSpoolToRetail(looseSpool);
      setLiveItems(updated);

      // Deselect from loose spools
      setSelectedLooseSpoolIds((prev) => {
        const next = new Set(prev);
        next.delete(looseSpool.id);
        return next;
      });

      showToast(`✂ قرقره آزاد (${formatWeight(weightKg)}) باز شد و به بخش خورده‌ها منتقل گردید.`);
    }

    setConfirmOpenSpool(null);
  };

  // Calculate selections:
  // 1. Fully selected pallets (where all spools are selected)
  // 2. Partially selected pallets (where only some spools are selected)
  // 3. Total selected weight
  const {
    fullySelectedPallets,
    partiallySelectedPallets,
    selectedSpoolsFromPalletsCount,
    totalPalletsWeightKg,
  } = useMemo(() => {
    const full: PalletStockCard[] = [];
    const partial: { pallet: PalletStockCard; selectedIndices: number[]; selectedWeight: number }[] = [];
    let totalPalletWeight = 0;
    let spoolsCount = 0;

    palletCards.forEach((pallet) => {
      const indices = selectedPalletSpools.get(pallet.id);
      if (!indices || indices.size === 0) return;

      if (indices.size === pallet.spoolWeights.length) {
        full.push(pallet);
        totalPalletWeight += pallet.totalWeightKg;
        spoolsCount += pallet.spoolsCount;
      } else {
        const selArray = Array.from(indices);
        const wt = selArray.reduce((acc, idx) => acc + (pallet.spoolWeights[idx] || 0), 0);
        partial.push({
          pallet,
          selectedIndices: selArray,
          selectedWeight: wt,
        });
        totalPalletWeight += wt;
        spoolsCount += selArray.length;
      }
    });

    return {
      fullySelectedPallets: full,
      partiallySelectedPallets: partial,
      selectedSpoolsFromPalletsCount: spoolsCount,
      totalPalletsWeightKg: Math.round(totalPalletWeight * 100) / 100,
    };
  }, [palletCards, selectedPalletSpools]);

  const selectedLooseSpoolsList = useMemo(() => {
    return looseSpools.filter((s) => selectedLooseSpoolIds.has(s.id));
  }, [looseSpools, selectedLooseSpoolIds]);

  const selectedRetailList = useMemo(() => {
    return retailItems.filter((r) => selectedRetailIds.has(r.id));
  }, [retailItems, selectedRetailIds]);

  const selectedLooseSpoolsWeightKg = useMemo(() => {
    return selectedLooseSpoolsList.reduce((acc, s) => acc + s.totalWeightKg, 0);
  }, [selectedLooseSpoolsList]);

  const selectedRetailWeightKg = useMemo(() => {
    return selectedRetailList.reduce((acc, r) => acc + r.totalWeightKg, 0);
  }, [selectedRetailList]);

  const totalSelectedWeightKg = useMemo(() => {
    const total = totalPalletsWeightKg + 
      selectedLooseSpoolsWeightKg + 
      selectedRetailWeightKg + 
      selectedCoilsWeight + 
      selectedStraightsWeight + 
      retailWeight;
    return Math.round(total * 100) / 100;
  }, [
    totalPalletsWeightKg, 
    selectedLooseSpoolsWeightKg, 
    selectedRetailWeightKg, 
    selectedCoilsWeight, 
    selectedStraightsWeight, 
    retailWeight
  ]);

  // Summary Text formulation
  const summaryText = useMemo(() => {
    const parts: string[] = [];

    if (fullySelectedPallets.length > 0) {
      const palletNums = fullySelectedPallets.map((p) => `#${p.palletIndex}`).join('، ');
      parts.push(`برداشت پالت‌های کامل (${palletNums})`);
    }

    if (partiallySelectedPallets.length > 0) {
      partiallySelectedPallets.forEach(({ pallet, selectedIndices, selectedWeight }) => {
        const spoolsText = selectedIndices.map((i) => `ق${i + 1}`).join('، ');
        parts.push(`تفکیک پالت #${pallet.palletIndex} (قرقره‌های ${spoolsText} به وزن ${formatWeight(selectedWeight)})`);
      });
    }

    if (selectedLooseSpoolsList.length > 0) {
      parts.push(`تعداد ${selectedLooseSpoolsList.length} قرقره آزاد`);
    }

    if (selectedRetailList.length > 0) {
      parts.push(`مس خورده / باز شده (${formatWeight(selectedRetailWeightKg)})`);
    }

    if (selectedCoilsWeight > 0) {
      parts.push(`کلاف مس (${formatWeight(selectedCoilsWeight)})`);
    }
    if (selectedStraightsWeight > 0) {
      parts.push(`شاخه مس (${formatWeight(selectedStraightsWeight)})`);
    }
    if (retailWeight > 0) {
      parts.push(`خرده‌فروشی دستی (${formatWeight(retailWeight)})`);
    }

    return parts.join(' + ');
  }, [
    fullySelectedPallets,
    partiallySelectedPallets,
    selectedLooseSpoolsList,
    selectedRetailList,
    selectedRetailWeightKg,
    selectedCoilsWeight,
    selectedStraightsWeight,
    retailWeight
  ]);

  if (!isOpen) return null;

  // Handle final confirmation:
  // Breaks partially selected pallets so that their unselected spools become loose non-pallet spools!
  const handleConfirm = () => {
    // 1. Process dismantling of partially selected pallets
    if (partiallySelectedPallets.length > 0) {
      const partialMap = new Map<string, number[]>();
      partiallySelectedPallets.forEach(({ pallet, selectedIndices }) => {
        partialMap.set(pallet.id, selectedIndices);
      });
      processPalletDismantlingOnSale(partialMap, palletCards);
    }

    // 2. Build items for sale/outbound
    // Include both previously loose spools + individually selected spools from broken pallets
    const outboundLooseSpools: LooseSpoolItem[] = [...selectedLooseSpoolsList];

    partiallySelectedPallets.forEach(({ pallet, selectedIndices }) => {
      selectedIndices.forEach((idx) => {
        const spoolWt = pallet.spoolWeights[idx] || 0;
        outboundLooseSpools.push({
          id: `spool-${pallet.id}-${idx + 1}-${Date.now()}`,
          consignmentId: pallet.consignmentId,
          cargoItemId: pallet.cargoItemId,
          referenceDocNumber: pallet.referenceDocNumber,
          date: pallet.date,
          brand: pallet.brand,
          diameterInch: pallet.diameterInch,
          thicknessMm: pallet.thicknessMm,
          quantity: 1,
          spoolWeights: [spoolWt],
          totalWeightKg: spoolWt,
          spoolCondition: 'sealed',
          sourcePalletInfo: `تفکیک شده از پالت #${pallet.palletIndex}`,
          notes: `قرقره ق${idx + 1} تفکیک شده از پالت #${pallet.palletIndex}`,
        });
      });
    });

    const totalRetailOutKg = selectedRetailWeightKg + retailWeight;

    onConfirmSelection({
      selectedPallets: fullySelectedPallets,
      selectedLooseSpools: outboundLooseSpools,
      selectedCoilsWeightKg: selectedCoilsWeight,
      selectedStraightsWeightKg: selectedStraightsWeight,
      retailWeightKg: totalRetailOutKg,
      totalWeightKg: totalSelectedWeightKg,
      summaryText,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[130] overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 py-4 sm:py-6 animate-in fade-in duration-150 dir-rtl font-sans text-stone-900">
      <div className="bg-white border border-stone-200 rounded-2xl shadow-xl w-full max-w-5xl my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden relative">
        
        {/* Step 1 Indicator Banner */}
        {isStepOneOfSale && (
          <div className="bg-stone-900 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shrink-0 dir-rtl border-b border-stone-800">
            <span className="flex items-center gap-2">
              <span className="bg-amber-400 text-stone-950 px-2 py-0.5 rounded font-mono text-[11px] font-bold">مرحله ۱</span>
              <span>انتخاب پالت‌های خروجی</span>
            </span>
            <span className="text-stone-300 text-[11px] font-medium hidden sm:inline-block">
              مرحله ۲: فاکتور فروش ➔
            </span>
          </div>
        )}

        {/* Modal Header */}
        <div className="p-4 border-b border-stone-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center font-bold border border-stone-200">
              <Boxes className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                {isStepOneOfSale ? 'مرحله ۱: انتخاب پالت‌ها' : title}
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

        {/* Toast Alert */}
        {toastMessage && (
          <div className="bg-amber-500 text-stone-950 px-4 py-2 text-xs font-bold flex items-center justify-between animate-in slide-in-from-top duration-200 shrink-0">
            <span>{toastMessage}</span>
            <button type="button" onClick={() => setToastMessage(null)} className="cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Toolbar & Filter Options */}
        <div className="p-3 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-stone-200/60 p-1 rounded-xl text-xs font-bold overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setStockCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                stockCategoryFilter === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              همه ({palletCards.length + looseSpools.length + retailItems.length})
            </button>
            <button
              type="button"
              onClick={() => setStockCategoryFilter('pallets')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                stockCategoryFilter === 'pallets' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>پالت‌ها</span>
              <span className="font-mono">({palletCards.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setStockCategoryFilter('loose_spools')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                stockCategoryFilter === 'loose_spools' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>قرقره آزاد</span>
              <span className="font-mono">({looseSpools.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setStockCategoryFilter('retail')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                stockCategoryFilter === 'retail' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>خورده‌ها</span>
              <span className="font-mono">({retailItems.length})</span>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-2 gap-1">
                <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-amber-600" />
                  <span>پالت‌های مس موجود در انبار ({filteredPallets.length} پالت)</span>
                </h3>
                <span className="text-xs text-stone-500">
                  می‌توانید کل پالت یا قرقره‌های خاصی از آن را با تیک زدن انتخاب نمایید
                </span>
              </div>

              {filteredPallets.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-500 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                  پالتی با این مشخصات یافت نشد یا تمام پالت‌ها تفکیک گردیده‌اند.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredPallets.map((pallet) => {
                    const selectedIndices = selectedPalletSpools.get(pallet.id) || new Set<number>();
                    const isFullySelected = selectedIndices.size === pallet.spoolWeights.length;
                    const isPartiallySelected = selectedIndices.size > 0 && !isFullySelected;
                    const isAnySelected = selectedIndices.size > 0;

                    // Calculate weight of selected spools in this pallet
                    const currentSelectedWeight = Array.from(selectedIndices).reduce(
                      (acc, idx) => acc + (pallet.spoolWeights[idx] || 0),
                      0
                    );

                    return (
                      <div
                        key={pallet.id}
                        className={`rounded-2xl border-2 p-4 transition-all relative flex flex-col justify-between space-y-3 shadow-2xs select-none ${
                          isFullySelected
                            ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-md scale-[1.01]'
                            : isPartiallySelected
                            ? 'bg-amber-50/40 border-amber-400 ring-1 ring-amber-400/20'
                            : 'bg-white border-stone-200 hover:border-amber-300 hover:bg-stone-50/50'
                        }`}
                      >
                        {/* Pallet Card Header */}
                        <div 
                          onClick={() => handleToggleWholePallet(pallet)}
                          className="flex items-start justify-between gap-2 border-b border-stone-100 pb-2.5 cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            {/* Pallet Checkbox */}
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                              isFullySelected
                                ? 'bg-amber-500 border-amber-500 text-slate-950 font-black shadow-xs'
                                : isPartiallySelected
                                ? 'bg-amber-100 border-amber-500 text-amber-900 font-black'
                                : 'bg-white border-stone-300 text-transparent'
                            }`}>
                              {isFullySelected ? (
                                <Check className="w-4 h-4 stroke-[3]" />
                              ) : isPartiallySelected ? (
                                <span className="text-xs font-black leading-none">−</span>
                              ) : null}
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-md font-black text-xs font-mono ${
                                  isFullySelected ? 'bg-amber-500 text-slate-950' : 'bg-stone-900 text-white'
                                }`}>
                                  پالت #{pallet.palletIndex}
                                </span>
                                
                                {isFullySelected ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                                    ۵ تایی کامل
                                  </span>
                                ) : isPartiallySelected ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-950 border border-amber-400">
                                    تفکیک شده ({selectedIndices.size} از {pallet.spoolWeights.length})
                                  </span>
                                ) : pallet.isFullStandardPallet ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                                    ۵ تایی کامل
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-300">
                                    {pallet.spoolsCount} تایی
                                  </span>
                                )}
                              </div>

                              <div className="font-bold text-xs text-stone-900 mt-1 flex items-center gap-1 flex-wrap">
                                <span>برند {pallet.brand}</span>
                                <span>•</span>
                                <span className="font-mono">{pallet.diameterInch}"</span>
                                <span>•</span>
                                <span className="font-mono">{pallet.thicknessMm}mm</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-left font-mono shrink-0">
                            <span className="text-[10px] text-stone-500 block">وزن پالت:</span>
                            <span className="text-sm font-black text-amber-700">
                              {formatWeight(pallet.totalWeightKg)}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Individual Spools Selection Chips */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-stone-500 px-0.5">
                            <span>قرقره‌های داخل پالت (کلیک جهت انتخاب تکی):</span>
                          </div>

                          <div className="grid grid-cols-5 gap-1.5 font-mono text-[11px] text-center">
                            {pallet.spoolWeights.map((w, idx) => {
                              const isSpoolSelected = selectedIndices.has(idx);

                              return (
                                <div
                                  key={idx}
                                  onClick={(e) => handleTogglePalletSpool(e, pallet, idx)}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer relative group flex flex-col items-center justify-between ${
                                    isSpoolSelected
                                      ? 'bg-amber-400 border-amber-600 text-stone-950 font-black shadow-xs ring-1 ring-amber-500'
                                      : 'bg-stone-50 border-stone-200 text-stone-800 hover:border-amber-400 hover:bg-amber-50/50'
                                  }`}
                                  title={`قرقره شماره ${idx + 1} - وزن ${formatWeight(w)}`}
                                >
                                  {/* Top row: spool label & indicator */}
                                  <div className="w-full flex items-center justify-between gap-0.5">
                                    <span className="text-[9px] font-bold opacity-80">ق{idx+1}</span>
                                    {isSpoolSelected && (
                                      <Check className="w-2.5 h-2.5 stroke-[3] text-stone-950" />
                                    )}
                                  </div>

                                  {/* Weight */}
                                  <span className="font-bold text-[10px] mt-0.5 block">
                                    {formatNumber(w, 0)}k
                                  </span>

                                  {/* Scissors Quick Action: Open to Retail */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmOpenSpool({
                                        pallet,
                                        spoolIndex: idx,
                                        weightKg: w,
                                        title: `باز کردن قرقره ق${idx + 1} از پالت #${pallet.palletIndex}`,
                                      });
                                    }}
                                    className="opacity-0 group-hover:opacity-100 hover:scale-115 transition-all text-stone-600 hover:text-red-700 mt-1 cursor-pointer"
                                    title="باز کردن این قرقره و انتقال به بخش خورده‌ها"
                                  >
                                    <Scissors className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Dismantling Notice Banner if partially selected */}
                        {isPartiallySelected && (
                          <div className="bg-amber-100/90 border border-amber-300 rounded-xl p-2 text-[11px] text-amber-950 flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                            <span>
                              <strong>تفکیک پالت:</strong> {selectedIndices.size} قرقره برای خروج انتخاب شده و {pallet.spoolWeights.length - selectedIndices.size} قرقره باقی‌مانده به بخش قرقره‌های آزاد منتقل می‌شوند.
                            </span>
                          </div>
                        )}

                        {/* Pallet Bottom Action Bar */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleToggleWholePallet(pallet)}
                            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              isFullySelected
                                ? 'bg-stone-900 text-white shadow-xs'
                                : isPartiallySelected
                                ? 'bg-amber-500 text-stone-950 font-bold'
                                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                            }`}
                          >
                            {isFullySelected ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>انتخاب کل پالت ({formatWeight(pallet.totalWeightKg)})</span>
                              </>
                            ) : isPartiallySelected ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>انتخاب تفکیکی ({formatWeight(currentSelectedWeight)})</span>
                              </>
                            ) : (
                              <span>انتخاب کل پالت</span>
                            )}
                          </button>

                          {/* Instant Dismantle Pallet Button */}
                          <button
                            type="button"
                            onClick={() => setConfirmDismantlePallet(pallet)}
                            className="p-1.5 rounded-xl border border-stone-200 hover:border-amber-400 bg-stone-50 hover:bg-amber-50 text-stone-600 hover:text-amber-800 transition-colors cursor-pointer"
                            title="تفکیک این پالت به قرقره‌های آزاد (بدون فروش)"
                          >
                            <PackageOpen className="w-4 h-4" />
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: LOOSE SPOOLS SELECTION (غیر پالتی / آزاد) */}
          {(stockCategoryFilter === 'all' || stockCategoryFilter === 'loose_spools') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Disc className="w-4 h-4 text-stone-700" />
                  <span>قرقره‌های غیرپالتی و آزاد ({filteredLooseSpools.length})</span>
                </h3>
                <span className="text-xs text-stone-500">
                  قرقره‌های تفکیک‌شده از پالت یا ورودی‌های تکی
                </span>
              </div>

              {filteredLooseSpools.length === 0 ? (
                <div className="p-4 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                  در حال حاضر هیچ قرقره آزادی در انبار موجود نیست. با تفکیک پالت‌ها، قرقره‌ها به این بخش اضافه می‌شوند.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredLooseSpools.map((loose) => {
                    const isSelected = selectedLooseSpoolIds.has(loose.id);
                    return (
                      <div
                        key={loose.id}
                        className={`rounded-xl border p-3 transition-all flex flex-col justify-between gap-2.5 select-none ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/30'
                            : 'bg-white border-stone-200 hover:border-amber-300'
                        }`}
                      >
                        <div 
                          onClick={() => handleToggleLooseSpool(loose.id)}
                          className="flex items-start justify-between gap-2.5 cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                              isSelected ? 'bg-amber-500 border-amber-500 text-stone-950 font-bold' : 'bg-white border-stone-300 text-transparent'
                            }`}>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-stone-900 block">
                                قرقره آزاد مس ({loose.brand})
                              </span>
                              <span className="text-[11px] font-mono text-stone-500">
                                سایز "{loose.diameterInch} • {loose.thicknessMm}mm
                              </span>
                              {loose.sourcePalletInfo && (
                                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1 inline-block">
                                  {loose.sourcePalletInfo}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-left font-mono">
                            <span className="text-xs font-black text-amber-800 block">
                              {formatWeight(loose.totalWeightKg)}
                            </span>
                          </div>
                        </div>

                        {/* Actions row: Toggle selection & Open to Retail */}
                        <div className="flex items-center justify-between border-t border-stone-100 pt-2 text-xs">
                          <button
                            type="button"
                            onClick={() => handleToggleLooseSpool(loose.id)}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer ${
                              isSelected ? 'bg-amber-500 text-stone-950' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                            }`}
                          >
                            {isSelected ? 'انتخاب شده ✓' : 'انتخاب قرقره'}
                          </button>

                          <button
                            type="button"
                            onClick={() => setConfirmOpenSpool({
                              looseSpool: loose,
                              weightKg: loose.totalWeightKg,
                              title: `باز کردن قرقره آزاد (${loose.brand})`,
                            })}
                            className="flex items-center gap-1 text-[11px] text-stone-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg border border-stone-200 transition-colors cursor-pointer"
                            title="باز کردن این قرقره و انتقال به بخش خورده‌ها"
                          >
                            <Scissors className="w-3 h-3 text-red-600" />
                            <span>انتقال به خورده‌ها</span>
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: RETAIL SECTION (خورده‌ها / خرده‌فروشی) */}
          {(stockCategoryFilter === 'all' || stockCategoryFilter === 'retail') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-red-600" />
                  <span>انبار مس خورده و باز شده ({filteredRetailItems.length} قلم)</span>
                </h3>
                <span className="text-xs text-stone-500">
                  قرقره‌های باز شده و موجودی خرده‌فروشی
                </span>
              </div>

              {filteredRetailItems.length === 0 ? (
                <div className="p-4 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                  در حال حاضر هیچ قلم خورده‌ای در انبار ثبت نشده است. با کلیک روی دکمه قیچی هر قرقره، آن قرقره باز شده و به این قسمت منتقل می‌شود.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredRetailItems.map((retail) => {
                    const isSelected = selectedRetailIds.has(retail.id);
                    return (
                      <div
                        key={retail.id}
                        onClick={() => handleToggleRetailItem(retail.id)}
                        className={`rounded-xl border p-3 transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                          isSelected
                            ? 'bg-red-500/10 border-red-500 ring-1 ring-red-500/30'
                            : 'bg-white border-stone-200 hover:border-red-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                            isSelected ? 'bg-red-600 border-red-600 text-white font-bold' : 'bg-white border-stone-300 text-transparent'
                          }`}>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-stone-900 block">
                              مس خورده ({retail.brand})
                            </span>
                            <span className="text-[11px] text-stone-500 block">
                              {retail.notes}
                            </span>
                          </div>
                        </div>

                        <div className="text-left font-mono">
                          <span className="text-xs font-black text-red-700 block">
                            {formatWeight(retail.totalWeightKg)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: MANUAL WEIGHT INPUTS */}
          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2.5">
            <h4 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-stone-600" />
              <span>برداشت دستی وزن (کیلوگرم):</span>
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
                  خورده‌فروشی دستی
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

        {/* Sticky Floating Action Bar matching screenshot */}
        <div className="p-4 border-t border-stone-200 bg-stone-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-stone-800 text-white flex items-center justify-center font-bold shrink-0 border border-stone-700">
              <Scale className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs text-stone-400">
                اقلام انتخابی: {fullySelectedPallets.length} پالت کامل
                {selectedSpoolsFromPalletsCount > (fullySelectedPallets.reduce((a, b) => a + b.spoolsCount, 0)) && (
                  <span> ، {selectedSpoolsFromPalletsCount - (fullySelectedPallets.reduce((a, b) => a + b.spoolsCount, 0))} قرقره تفکیکی</span>
                )}
                {selectedLooseSpoolsList.length > 0 && (
                  <span> ، {selectedLooseSpoolsList.length} قرقره آزاد</span>
                )}
                {selectedRetailList.length > 0 && (
                  <span> ، {selectedRetailList.length} خورده</span>
                )}
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

        {/* Confirmation Modal: Dismantle Pallet */}
        {confirmDismantlePallet && (
          <div className="fixed inset-0 z-[140] bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 dir-rtl">
            <div className="bg-white border border-stone-200 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
              <div className="flex items-center gap-3 text-amber-800">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <PackageOpen className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">تفکیک پالت به قرقره‌های آزاد</h3>
                  <p className="text-xs text-stone-500">پالت #{confirmDismantlePallet.palletIndex} ({confirmDismantlePallet.brand})</p>
                </div>
              </div>

              <p className="text-xs text-stone-700 leading-relaxed bg-amber-50 p-3 rounded-xl border border-amber-200">
                آیا مایلید این پالت را تفکیک کنید؟ با انجام این عملیات، <strong>تمام {confirmDismantlePallet.spoolsCount} قرقره</strong> این پالت به بخش <strong>قرقره‌های غیرپالتی (آزاد)</strong> منتقل شده و پالت از بخش پالت‌ها حذف خواهد شد.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDismantlePallet(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteDismantlePallet(confirmDismantlePallet)}
                  className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl cursor-pointer shadow-xs"
                >
                  تأیید تفکیک پالت
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal: Open Spool to Retail */}
        {confirmOpenSpool && (
          <div className="fixed inset-0 z-[140] bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 dir-rtl">
            <div className="bg-white border border-stone-200 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
              <div className="flex items-center gap-3 text-red-800">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <Scissors className="w-5 h-5 text-red-700" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">{confirmOpenSpool.title}</h3>
                  <p className="text-xs text-stone-500">وزن قرقره: {formatWeight(confirmOpenSpool.weightKg)}</p>
                </div>
              </div>

              <p className="text-xs text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200">
                آیا مایلید این قرقره را باز کرده و وزن آن ({formatWeight(confirmOpenSpool.weightKg)}) را به <strong>بخش خورده‌ها (خرده‌فروشی)</strong> منتقل نمایید؟
                {confirmOpenSpool.pallet && (
                  <span className="block mt-1 text-amber-800">
                    * با باز کردن این قرقره، پالت تفکیک شده و سایر قرقره‌های آن به بخش قرقره‌های آزاد منتقل می‌شوند.
                  </span>
                )}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmOpenSpool(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleExecuteOpenSpool}
                  className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl cursor-pointer shadow-xs"
                >
                  تأیید باز کردن و انتقال به خورده‌ها
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
