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
  FileText,
  ShoppingBag,
  UserCheck,
  Trash2
} from 'lucide-react';
import { 
  WarehouseItem, 
  WarehouseInventorySummary, 
  CopperPackagingType,
  SpoolPackagingType,
  WarehouseCargoItem,
  Person,
  MarketPrices
} from '../types';
import { 
  COPPER_BRANDS, 
  COPPER_DIAMETERS, 
  COPPER_THICKNESSES,
  updateWarehouseItem,
  addWarehouseItem,
  getStoredWarehouseItems,
  getStoredPeople,
  getStoredMarketPrices
} from '../utils/storage';
import { formatNumber, formatWeight, toFaDigits } from '../utils/formatters';
import {
  dismantlePalletIntoLooseSpools,
  openSpoolToRetailFromPallet,
  openMultipleSpoolsToRetailFromPallet,
  openLooseSpoolToRetail,
  hasPalletSplitHistory,
  undoLastPalletSplit,
  executeDirectSaleStockDeduction,
  transferSelectedToMachineProduction,
  returnFromMachineProduction
} from '../utils/warehousePalletManager';
import { 
  WarehouseDirectSaleModal, 
  SelectedWarehouseStockForSale 
} from './WarehouseDirectSaleModal';

// Realistic Product Assets
const COPPER_PALLET_IMG = '/src/assets/images/copper_pallet_5spools_1789803849566.jpg';
const COPPER_SPOOL_IMG = '/src/assets/images/copper_loose_spool_1789803863290.jpg';
const COPPER_COIL_IMG = '/src/assets/images/copper_pipe_coils_1789803878022.jpg';
const COPPER_STRAIGHT_IMG = '/src/assets/images/copper_straight_pipes_1789803890842.jpg';

export interface PalletStockCard {
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
  diameterInch?: string;
  thicknessMm?: number;
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
  standardName?: string;
}

export interface StraightsStockGroup {
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

export interface MachineProductionStockItem {
  id: string;
  consignmentId: string;
  cargoItemId: string;
  referenceDocNumber: string;
  date: string;
  brand: string;
  diameterInch: string;
  thicknessMm: number;
  totalWeightKg: number;
  machineName: string;
  machineNotes: string;
  transferredToMachineAt?: string;
  sourcePalletInfo?: string;
  notes?: string;
}

interface WarehouseLiveStockCatalogProps {
  items: WarehouseItem[];
  inventorySummary: WarehouseInventorySummary;
  people?: Person[];
  marketPrices?: MarketPrices;
  externalSearchQuery?: string;
  categoryFilter?: 'all' | 'pallets' | 'loose_spools' | 'retail' | 'coils' | 'straights' | 'machine_production';
  onOpenAdd?: (type: 'inbound' | 'outbound') => void;
  onViewReceipt?: (item: WarehouseItem) => void;
  onUpdateItem?: (item: WarehouseItem) => void;
  onAddItem?: (item: WarehouseItem) => void;
  onExecuteDirectSale?: (saleData: any) => Promise<void> | void;
}

export const WarehouseLiveStockCatalog: React.FC<WarehouseLiveStockCatalogProps> = ({
  items,
  inventorySummary,
  people,
  marketPrices,
  externalSearchQuery = '',
  categoryFilter,
  onOpenAdd,
  onViewReceipt,
  onUpdateItem,
  onAddItem,
  onExecuteDirectSale,
}) => {
  // Navigation & Category Filters
  const [stockCategoryFilter, setStockCategoryFilter] = useState<'all' | 'pallets' | 'loose_spools' | 'retail' | 'coils' | 'straights' | 'machine_production'>('all');
  const effectiveCategoryFilter = categoryFilter || stockCategoryFilter;
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [diameterFilter, setDiameterFilter] = useState<string>('all');
  const [thicknessFilter, setThicknessFilter] = useState<string>('all');
  const [palletStatusFilter, setPalletStatusFilter] = useState<'all' | 'full_5' | 'split'>('all');

  // Multi-Selection State for Spools inside Pallets: palletId -> array of selected spool indices e.g. [0, 2]
  const [selectedSpoolsByPallet, setSelectedSpoolsByPallet] = useState<Record<string, number[]>>({});
  // Multi-Selection State for Loose Spools: Set of loose item IDs
  const [selectedLooseSpoolIds, setSelectedLooseSpoolIds] = useState<Set<string>>(new Set());
  // Multi-Selection State for Retail Items: Set of retail item IDs
  const [selectedRetailIds, setSelectedRetailIds] = useState<Set<string>>(new Set());

  // Direct Sale Modal State
  const [isDirectSaleModalOpen, setIsDirectSaleModalOpen] = useState(false);

  // Machine Transfer Modal State
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [machineNameInput, setMachineNameInput] = useState('دستگاه اواپراتور');
  const [machineNotesInput, setMachineNotesInput] = useState('برای استفاده دستگاه اواپراتور بوده است');

  // Confirmation Modal State (for explicit dismantle or retail split)
  const [confirmModalData, setConfirmModalData] = useState<{
    type: 'retail_from_pallet' | 'dismantle_pallet' | 'retail_from_loose';
    pallet?: PalletStockCard;
    looseSpool?: LooseSpoolItem;
    spoolIndices?: number[];
    weightKg?: number;
  } | null>(null);

  // Toast with undo
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

  // Show transient toast
  const triggerToast = (message: string, showUndo: boolean = false) => {
    setFeedbackToast({ message, showUndo });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 6000);
  };

  // Undo Last Pallet Split Handler
  const handleUndoLastPalletSplit = () => {
    const restored = undoLastPalletSplit();
    if (restored) {
      setLiveItems(restored);
      window.dispatchEvent(new CustomEvent('warehouse-stock-updated'));
      triggerToast('آخرین تفکیک پالت با موفقیت لغو شد و پالت به حالت اولیه بازگشت.');
    } else {
      triggerToast('تاریخچه‌ای برای بازگردانی تفکیک پالت یافت نشد.');
    }
  };

  // Extract inventory items from liveItems
  const { palletCards, looseSpools, retailItems, coilsGroups, straightsGroups, machineItems } = useMemo(() => {
    const pallets: PalletStockCard[] = [];
    const loose: LooseSpoolItem[] = [];
    const retail: RetailCopperItem[] = [];
    const coilsMap: Record<string, CoilsStockGroup> = {};
    const straightsMap: Record<string, StraightsStockGroup> = {};
    const machineList: MachineProductionStockItem[] = [];

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

      for (const cargoItem of cargoItems) {
        const cargo = cargoItem as WarehouseCargoItem;
        // 0. Machine Production / Factory Usage Item
        if (cargo.isMachineProduction) {
          machineList.push({
            id: cargo.id || `machine-${consignment.id}`,
            consignmentId: consignment.id,
            cargoItemId: cargo.id,
            referenceDocNumber: consignment.referenceDocNumber,
            date: cargo.transferredToMachineAt || consignment.date,
            brand: cargo.brand || 'باهنر',
            diameterInch: cargo.diameterInch || '5/8',
            thicknessMm: cargo.thicknessMm || 0.75,
            totalWeightKg: cargo.totalWeightKg || (cargo.spoolWeights ? cargo.spoolWeights[0] : 0) || 0,
            machineName: cargo.machineName || 'دستگاه اواپراتور',
            machineNotes: cargo.machineNotes || cargo.notes || 'برای استفاده دستگاه اواپراتور بوده است',
            transferredToMachineAt: cargo.transferredToMachineAt,
            sourcePalletInfo: cargo.sourcePalletInfo,
            notes: cargo.notes,
          });
          continue;
        }

        // 1. Spool / Pallets vs Loose Spools
        if (cargo.packagingType === 'spool') {
          const weights = cargo.spoolWeights && cargo.spoolWeights.length > 0
            ? cargo.spoolWeights
            : [cargo.totalWeightKg || (cargo as any).unitWeightKg || 220];

          if (cargo.spoolType === 'pallet') {
            const isFull = weights.length >= 5;
            const totalW = weights.reduce((a, b) => a + b, 0);
            pallets.push({
              id: cargo.id || `pallet-${consignment.id}`,
              palletIndex: (cargo as any).palletIndex || palletGlobalCounter++,
              consignmentId: consignment.id,
              cargoItemId: cargo.id,
              referenceDocNumber: consignment.referenceDocNumber,
              date: consignment.date,
              targetPartyName: consignment.targetPartyName,
              driverName: consignment.driverName,
              vehiclePlate: consignment.vehiclePlate,
              brand: cargo.brand || 'باهنر',
              diameterInch: cargo.diameterInch || '5/8',
              thicknessMm: cargo.thicknessMm || 0.75,
              spoolsCount: weights.length,
              spoolWeights: weights,
              totalWeightKg: totalW,
              avgWeightKg: totalW / (weights.length || 1),
              isFullStandardPallet: isFull,
              purityPercent: '۹۹.۹۶٪ مس خالص',
            });
          } else {
            // Non-pallet loose spool
            loose.push({
              id: cargo.id || `loose-${consignment.id}`,
              consignmentId: consignment.id,
              cargoItemId: cargo.id,
              referenceDocNumber: consignment.referenceDocNumber,
              date: consignment.date,
              brand: cargo.brand || 'باهنر',
              diameterInch: cargo.diameterInch || '5/8',
              thicknessMm: cargo.thicknessMm || 0.75,
              quantity: cargo.quantity || 1,
              spoolWeights: weights,
              totalWeightKg: cargo.totalWeightKg || weights.reduce((a, b) => a + b, 0),
              spoolCondition: cargo.spoolCondition || 'sealed',
              sourcePalletInfo: cargo.sourcePalletInfo,
              notes: cargo.notes,
            });
          }
        } else if (cargo.packagingType === 'retail') {
          // Retail copper (خورده‌ها)
          retail.push({
            id: cargo.id || `retail-${consignment.id}`,
            consignmentId: consignment.id,
            cargoItemId: cargo.id,
            referenceDocNumber: consignment.referenceDocNumber,
            date: consignment.date,
            brand: cargo.brand || 'باهنر',
            diameterInch: cargo.diameterInch,
            thicknessMm: cargo.thicknessMm,
            totalWeightKg: cargo.totalWeightKg || (cargo as any).unitWeightKg || 0,
            notes: cargo.notes,
          });
        } else if (cargo.packagingType === 'coil') {
          const key = `${cargo.brand}_${cargo.diameterInch}_${cargo.thicknessMm}`;
          const is15m = cargo.coilLength === '15m' || !cargo.coilLength;
          const count = cargo.quantity || 1;
          const weight = cargo.totalWeightKg || 0;

          if (!coilsMap[key]) {
            coilsMap[key] = {
              key,
              brand: cargo.brand || 'باهنر',
              diameterInch: cargo.diameterInch || '3/8',
              thicknessMm: cargo.thicknessMm || 0.7,
              length15mCount: 0,
              length15mWeightKg: 0,
              length50mCount: 0,
              length50mWeightKg: 0,
              totalCount: 0,
              totalWeightKg: 0,
              standardName: 'استاندارد برودتی ASTM B280',
            };
          }

          if (is15m) {
            coilsMap[key].length15mCount += count;
            coilsMap[key].length15mWeightKg += weight;
          } else {
            coilsMap[key].length50mCount += count;
            coilsMap[key].length50mWeightKg += weight;
          }
          coilsMap[key].totalCount += count;
          coilsMap[key].totalWeightKg += weight;
        } else if (cargo.packagingType === 'straight') {
          const key = `${cargo.brand}_${cargo.diameterInch}_${cargo.thicknessMm}`;
          const count = cargo.quantity || 1;
          const weight = cargo.totalWeightKg || 0;

          if (!straightsMap[key]) {
            straightsMap[key] = {
              key,
              brand: cargo.brand || 'مهراصل',
              diameterInch: cargo.diameterInch || '7/8',
              thicknessMm: cargo.thicknessMm || 1.0,
              totalCount: 0,
              totalWeightKg: 0,
              shelfCode: 'SH-01',
              badgeTag: 'شاخه ۶ متری استاندارد',
              isHard: true,
            };
          }
          straightsMap[key].totalCount += count;
          straightsMap[key].totalWeightKg += weight;
        }
      }
    }

    return {
      palletCards: pallets,
      looseSpools: loose,
      retailItems: retail,
      coilsGroups: Object.values(coilsMap),
      straightsGroups: Object.values(straightsMap),
      machineItems: machineList,
    };
  }, [liveItems]);

  // Compute Selection Summary
  const selectionSummary = useMemo(() => {
    let totalCount = 0;
    let totalWeight = 0;
    const itemsDetails: Array<{ title: string; weightKg: number; brand: string; specs: string }> = [];
    const selectedPalletSpoolsMap = new Map<string, { pallet: PalletStockCard; selectedIndices: number[] }>();
    const selectedLooseList: LooseSpoolItem[] = [];
    const selectedRetailList: RetailCopperItem[] = [];

    // 1. Selected Spools from Pallets
    for (const pallet of palletCards) {
      const indices = selectedSpoolsByPallet[pallet.id] || [];
      if (indices.length > 0) {
        selectedPalletSpoolsMap.set(pallet.id, { pallet, selectedIndices: indices });
        totalCount += indices.length;
        indices.forEach((idx) => {
          const w = pallet.spoolWeights[idx] || pallet.avgWeightKg;
          totalWeight += w;
          itemsDetails.push({
            title: `پالت #${pallet.palletIndex} (قرقره ق${idx + 1})`,
            weightKg: w,
            brand: pallet.brand,
            specs: `سایز "${pallet.diameterInch} (${pallet.thicknessMm}mm)`,
          });
        });
      }
    }

    // 2. Selected Loose Spools
    for (const loose of looseSpools) {
      if (selectedLooseSpoolIds.has(loose.id)) {
        totalCount += loose.quantity || 1;
        totalWeight += loose.totalWeightKg;
        selectedLooseList.push(loose);
        itemsDetails.push({
          title: `قرقره تکی ${loose.brand} (${loose.sourcePalletInfo || 'غیرپالتی'})`,
          weightKg: loose.totalWeightKg,
          brand: loose.brand,
          specs: `سایز "${loose.diameterInch} (${loose.thicknessMm}mm)`,
        });
      }
    }

    // 3. Selected Retail Items
    for (const r of retailItems) {
      if (selectedRetailIds.has(r.id)) {
        totalCount += 1;
        totalWeight += r.totalWeightKg;
        selectedRetailList.push(r);
        itemsDetails.push({
          title: `خورده مس ${r.brand}`,
          weightKg: r.totalWeightKg,
          brand: r.brand,
          specs: r.diameterInch ? `سایز "${r.diameterInch}` : 'خورده مس',
        });
      }
    }

    const hasAnySelection = totalCount > 0;
    const summaryLabel = hasAnySelection
      ? `${toFaDigits(totalCount)} قلم مس به وزن کل ${toFaDigits(totalWeight.toFixed(1))} کیلوگرم`
      : '';

    return {
      hasAnySelection,
      totalCount,
      totalWeight,
      summaryLabel,
      itemsDetails,
      selectedPalletSpoolsMap,
      selectedLooseList,
      selectedRetailList,
    };
  }, [palletCards, looseSpools, retailItems, selectedSpoolsByPallet, selectedLooseSpoolIds, selectedRetailIds]);

  // Toggle single spool selection inside a pallet
  const handleTogglePalletSpool = (palletId: string, spoolIdx: number) => {
    setSelectedSpoolsByPallet((prev) => {
      const current = prev[palletId] || [];
      const isSelected = current.includes(spoolIdx);
      const next = isSelected ? current.filter((i) => i !== spoolIdx) : [...current, spoolIdx];
      return {
        ...prev,
        [palletId]: next,
      };
    });
  };

  // Toggle ALL spools inside a pallet
  const handleToggleEntirePallet = (pallet: PalletStockCard) => {
    setSelectedSpoolsByPallet((prev) => {
      const current = prev[pallet.id] || [];
      const allSelected = current.length === pallet.spoolWeights.length;
      return {
        ...prev,
        [pallet.id]: allSelected ? [] : pallet.spoolWeights.map((_, i) => i),
      };
    });
  };

  // Toggle single loose spool selection
  const handleToggleLooseSpool = (looseId: string) => {
    setSelectedLooseSpoolIds((prev) => {
      const next = new Set(prev);
      if (next.has(looseId)) next.delete(looseId);
      else next.add(looseId);
      return next;
    });
  };

  // Toggle retail item selection
  const handleToggleRetailItem = (retailId: string) => {
    setSelectedRetailIds((prev) => {
      const next = new Set(prev);
      if (next.has(retailId)) next.delete(retailId);
      else next.add(retailId);
      return next;
    });
  };

  // Clear all selections
  const handleClearAllSelections = () => {
    setSelectedSpoolsByPallet({});
    setSelectedLooseSpoolIds(new Set());
    setSelectedRetailIds(new Set());
  };

  // Move selected pallet spools to retail
  const handleMoveSelectedToRetail = () => {
    const selectedEntries = Array.from(selectionSummary.selectedPalletSpoolsMap.entries());
    if (selectedEntries.length === 0) {
      triggerToast('لطفاً حداقل یک قرقره از پالت‌ها را برای انتقال به خورده‌ها انتخاب کنید.');
      return;
    }

    let updated = liveItems;
    for (const [_, { pallet, selectedIndices }] of selectedEntries) {
      updated = openMultipleSpoolsToRetailFromPallet(pallet as any, selectedIndices);
    }
    setLiveItems(updated);
    handleClearAllSelections();
    window.dispatchEvent(new CustomEvent('warehouse-stock-updated'));
    triggerToast('قرقره‌های انتخاب‌شده به بخش خورده‌ها منتقل شدند و باقیمانده به قرقره‌های غیرپالتی اضافه گردید.', true);
  };

  // Dismantle entire selected pallets to loose spools
  const handleDismantleSelectedPallets = () => {
    const selectedEntries = Array.from(selectionSummary.selectedPalletSpoolsMap.entries());
    if (selectedEntries.length === 0) {
      triggerToast('لطفاً پالت‌های مورد نظر را انتخاب کنید.');
      return;
    }

    let updated = liveItems;
    for (const [_, { pallet }] of selectedEntries) {
      updated = dismantlePalletIntoLooseSpools(pallet as any);
    }
    setLiveItems(updated);
    handleClearAllSelections();
    window.dispatchEvent(new CustomEvent('warehouse-stock-updated'));
    triggerToast('پالت‌های انتخاب‌شده تفکیک شده و تمام قرقره‌های آن‌ها به بخش غیرپالتی منتقل شدند.', true);
  };

  // Handle Transfer to Machine Production
  const handleConfirmTransferToMachine = () => {
    if (!selectionSummary.hasAnySelection) {
      triggerToast('هیچ کالایی برای انتقال انتخاب نشده است.');
      return;
    }

    const mName = machineNameInput.trim() || 'دستگاه اواپراتور';
    const mNotes = machineNotesInput.trim() || `برای استفاده ${mName} بوده است`;

    const updated = transferSelectedToMachineProduction({
      selectedPalletSpools: selectionSummary.selectedPalletSpoolsMap as any,
      selectedLooseSpools: selectionSummary.selectedLooseList as any,
      selectedRetailItems: selectionSummary.selectedRetailList as any,
      machineName: mName,
      notes: mNotes,
    });

    setLiveItems(updated);
    handleClearAllSelections();
    setIsMachineModalOpen(false);
    window.dispatchEvent(new CustomEvent('warehouse-stock-updated'));
    triggerToast(`اقلام انتخابی با موفقیت به مس مصرفی ${mName} منتقل شدند و از لیست انبار فروش کسر گردیدند.`);
  };

  // Handle Return From Machine Production to Sales Warehouse
  const handleReturnFromMachine = (cargoItemId: string, machineName: string) => {
    const restored = returnFromMachineProduction(cargoItemId);
    setLiveItems(restored);
    window.dispatchEvent(new CustomEvent('warehouse-stock-updated'));
    triggerToast(`کالای مورد نظر با موفقیت از ${machineName || 'دستگاه'} به انبار فروش بازگردانده شد.`);
  };

  // Handle direct sale submission from modal
  const handleConfirmDirectSale = async (saleData: any) => {
    // 1. Perform stock deduction in warehouse
    const deductionPayload = {
      selectedPalletSpools: selectionSummary.selectedPalletSpoolsMap as any,
      selectedLooseSpools: selectionSummary.selectedLooseList as any,
      selectedRetailItems: selectionSummary.selectedRetailList as any,
      notes: saleData.notes,
    };

    const updated = executeDirectSaleStockDeduction(deductionPayload);
    setLiveItems(updated);
    window.dispatchEvent(new CustomEvent('warehouse-stock-updated'));

    // 2. Call outer sale handler if available
    if (onExecuteDirectSale) {
      await onExecuteDirectSale({
        ...saleData,
        rawPayload: deductionPayload,
      });
    }

    handleClearAllSelections();
    triggerToast(`فروش مستقیم ${formatWeight(saleData.weightKg)} مس با موفقیت انجام و از انبار کسر گردید.`);
  };

  // Open Direct Sale Modal with current selections
  const handleOpenSaleModalWithSelection = () => {
    if (!selectionSummary.hasAnySelection) {
      triggerToast('لطفاً ابتدا حداقل یک قرقره، پالت یا کالا را از لیست انبار تیک بزنید.');
      return;
    }
    setIsDirectSaleModalOpen(true);
  };

  const availablePeople = people || getStoredPeople();
  const availablePrices = marketPrices || getStoredMarketPrices();

  return (
    <div className="space-y-5 font-sans text-stone-800 pb-20">
      
      {/* Toast Notification with Undo */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 text-xs font-bold border border-stone-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast.message}</span>
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
            <span className="text-[11px] text-stone-500 font-bold">
              جهت انتخاب و فروش، روی هر تعداد قرقره که می‌خواهید کلیک کنید
            </span>
          </div>

          {/* Pallet Cards Grid */}
          {palletCards.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-6 text-center text-xs font-bold text-stone-500">
              هیچ پالت فعال در انبار موجود نیست (پالت‌ها تفکیک شده یا خارج گردیده‌اند).
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              
              {palletCards.map((pallet) => {
                const selectedIndices = selectedSpoolsByPallet[pallet.id] || [];
                const hasSelectedSpools = selectedIndices.length > 0;
                const isEntirePalletSelected = selectedIndices.length === pallet.spoolWeights.length;

                return (
                  <div
                    key={pallet.id}
                    className={`bg-white rounded-2xl border p-3.5 shadow-2xs transition-all flex flex-col justify-between space-y-3 ${
                      hasSelectedSpools ? 'border-amber-600 ring-2 ring-amber-500/40 bg-amber-50/20' : 'border-stone-200 hover:border-amber-300'
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
                        
                        {/* Top Right Pallet Number & Select All Button */}
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleToggleEntirePallet(pallet)}
                            className={`px-2.5 py-1 rounded-lg font-black text-xs font-mono shadow-xs border cursor-pointer flex items-center gap-1.5 transition-all ${
                              isEntirePalletSelected
                                ? 'bg-amber-600 text-white border-amber-700 ring-2 ring-white'
                                : 'bg-amber-900/90 hover:bg-amber-800 backdrop-blur-md text-white border-amber-700/50'
                            }`}
                            title="انتخاب تمام قرقره‌های این پالت"
                          >
                            <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                              isEntirePalletSelected ? 'bg-white text-amber-900' : 'border-stone-300 bg-stone-800'
                            }`}>
                              {isEntirePalletSelected && <Check className="w-2.5 h-2.5 text-amber-900" />}
                            </span>
                            <span>پالت {toFaDigits(pallet.palletIndex)}#</span>
                          </button>

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

                    {/* Sub-reels breakdown grid (Multi-Selectable) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-stone-600 font-bold">
                        <span>انتخاب قرقره‌ها جهت فروش یا تفکیک:</span>
                        {selectedIndices.length > 0 && (
                          <span className="text-amber-900 font-black bg-amber-100 px-2 py-0.5 rounded-md text-[10px]">
                            {toFaDigits(selectedIndices.length)} قرقره انتخاب شد
                          </span>
                        )}
                      </div>

                      {/* Sub-reels boxes */}
                      <div className="grid grid-cols-3 gap-1.5">
                        {pallet.spoolWeights.map((w, idx) => {
                          const isSelected = selectedIndices.includes(idx);
                          return (
                            <div
                              key={idx}
                              onClick={() => handleTogglePalletSpool(pallet.id, idx)}
                              className={`p-2 rounded-xl text-center cursor-pointer transition-all shadow-2xs flex flex-col justify-between border ${
                                isSelected
                                  ? 'bg-amber-800 text-white border-amber-950 ring-2 ring-amber-500 shadow-sm'
                                  : 'bg-stone-50 hover:bg-stone-100/90 border-stone-200 text-stone-800'
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
                                {toFaDigits(w.toFixed(1))} kg
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

      {/* SECTION 2: LOOSE SPOOLS (قرقره‌های غیرپالتی و تکی) */}
      {(effectiveCategoryFilter === 'all' || effectiveCategoryFilter === 'loose_spools') && (
        <div className="space-y-3 pt-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-black text-amber-950 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-800"></span>
              <span>قرقره‌های غیرپالتی و تکی</span>
              <span className="text-xs text-amber-900 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300/80">
                {toFaDigits(looseSpools.length)} قلم موجود
              </span>
            </h2>

            {/* Smart Undo Last Pallet Split Button */}
            <button
              type="button"
              onClick={handleUndoLastPalletSplit}
              className="px-3 py-1.5 bg-stone-100 hover:bg-amber-100 text-stone-800 hover:text-amber-950 border border-stone-300 hover:border-amber-400 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              title="بازگرداندن آخرین پالت تفکیک‌شده به حالت اولیه ۵ تایی"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-800" />
              <span>بازگشت آخرین تفکیک پالت</span>
            </button>
          </div>

          {looseSpools.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-6 text-center text-xs font-bold text-stone-500">
              هیچ قرقره غیرپالتی در حال حاضر موجود نیست. با تفکیک پالت‌ها، قرقره‌های آزاد در اینجا قرار می‌گیرند.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {looseSpools.map((loose) => {
                const isSelected = selectedLooseSpoolIds.has(loose.id);

                return (
                  <div
                    key={loose.id}
                    onClick={() => handleToggleLooseSpool(loose.id)}
                    className={`bg-white rounded-2xl border p-3.5 shadow-2xs transition-all flex flex-col justify-between space-y-3 cursor-pointer ${
                      isSelected ? 'border-amber-600 ring-2 ring-amber-500/40 bg-amber-50/20' : 'border-stone-200 hover:border-amber-400'
                    }`}
                  >
                    {/* Large Centered Spool Image Hero */}
                    <div className="relative w-full h-40 sm:h-44 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 group">
                      <img
                        src={COPPER_SPOOL_IMG}
                        alt="قرقره مس تکی"
                        className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                        <span className={`w-5 h-5 rounded-lg flex items-center justify-center border shadow-xs ${
                          isSelected ? 'bg-amber-800 border-amber-900 text-white' : 'bg-white/90 border-stone-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </span>
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

                    {/* Footer Info */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100 text-[11px]">
                      <span className="text-stone-500 font-mono truncate max-w-[150px]" title={loose.notes || loose.referenceDocNumber}>
                        {loose.notes || `بارنامه: ${loose.referenceDocNumber}`}
                      </span>
                      <span className="text-[10px] font-bold text-amber-800">
                        {isSelected ? '✓ انتخاب شده' : 'جهت انتخاب کلیک کنید'}
                      </span>
                    </div>
                  </div>
                );
              })}
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
              {retailItems.map((r) => {
                const isSelected = selectedRetailIds.has(r.id);

                return (
                  <div
                    key={r.id}
                    onClick={() => handleToggleRetailItem(r.id)}
                    className={`bg-white rounded-2xl border p-3.5 shadow-2xs space-y-3 flex flex-col justify-between cursor-pointer transition-all ${
                      isSelected ? 'border-rose-500 ring-2 ring-rose-400/50 bg-rose-50/20' : 'border-rose-200/90 hover:border-rose-300'
                    }`}
                  >
                    {/* Centered Large Spool Image */}
                    <div className="relative w-full h-36 rounded-xl overflow-hidden bg-stone-100 border border-rose-200 group">
                      <img
                        src={COPPER_SPOOL_IMG}
                        alt="خورده مس باز شده"
                        className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                        <span className={`w-5 h-5 rounded-lg flex items-center justify-center border shadow-xs ${
                          isSelected ? 'bg-rose-700 border-rose-800 text-white' : 'bg-white/90 border-stone-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </span>
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
                      <span className="text-stone-500 font-bold text-[11px] truncate max-w-[150px]">
                        {r.notes || `بارنامه: ${toFaDigits(r.referenceDocNumber)}`}
                      </span>
                      <span className="text-[10px] font-bold text-rose-800">
                        {isSelected ? '✓ انتخاب شده' : 'جهت انتخاب کلیک کنید'}
                      </span>
                    </div>
                  </div>
                );
              })}
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

      {/* SECTION 5: MACHINE PRODUCTION / FACTORY USAGE INVENTORY */}
      {(effectiveCategoryFilter === 'all' || effectiveCategoryFilter === 'machine_production') && (
        <div className="space-y-3 pt-4 border-t border-purple-200/80">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-black text-purple-950 flex items-center gap-2">
              <Factory className="w-4 h-4 text-purple-800" />
              <span>مس مصرفی دستگاه‌ها و خطوط تولید (کارخانه)</span>
              <span className="text-xs text-purple-900 font-bold bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-300">
                {toFaDigits(machineItems.length)} قلم در حال استفاده
              </span>
            </h2>
            <span className="text-[11px] font-bold text-purple-900 bg-purple-100/90 px-2.5 py-1 rounded-xl border border-purple-300/80 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-rose-600" />
              <span>غیرقابل فروش مستقیم (تجهیزات و خط تولید کارخانه)</span>
            </span>
          </div>

          {machineItems.length === 0 ? (
            <div className="bg-purple-50/50 border border-purple-200/80 rounded-2xl p-6 text-center text-xs font-bold text-purple-900 space-y-1">
              <p className="font-black text-purple-950">هیچ قرقره یا پالت متصلی به دستگاه‌های تولید گزارش نشده است.</p>
              <p className="text-[11px] text-stone-500 font-normal">
                جهت انتقال قرقره یا پالت به دستگاه اواپراتور یا خط تولید، گزینه مورد نظر را در جدول بالا تیک زده و دکمه «انتقال به تولید / دستگاه» را فشار دهید.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {machineItems.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-purple-200/90 shadow-2xs p-3.5 space-y-3 relative overflow-hidden hover:border-purple-400 transition-all">
                  {/* Card Banner */}
                  <div className="flex items-center justify-between bg-purple-900 text-white px-3.5 py-2 -mx-3.5 -mt-3.5 mb-2 border-b border-purple-800">
                    <div className="flex items-center gap-2 text-xs font-black">
                      <Factory className="w-4 h-4 text-purple-300" />
                      <span>{item.machineName}</span>
                    </div>
                    <span className="text-[10px] font-bold bg-purple-950/90 text-rose-300 px-2 py-0.5 rounded-md border border-purple-700/80 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-rose-400" />
                      <span>غیرقابل فروش</span>
                    </span>
                  </div>

                  {/* Weight & Specs */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-stone-900 block">
                          برند {item.brand} — سایز "{item.diameterInch} ({item.thicknessMm}mm)
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          سند: {item.referenceDocNumber} • تاریخ انتقال: {toFaDigits(item.date)}
                        </span>
                      </div>
                      <div className="text-left bg-purple-50 border border-purple-200 px-3 py-1 rounded-xl shrink-0">
                        <span className="text-[9px] text-purple-700 font-bold block">وزن صافی</span>
                        <span className="text-sm font-black font-mono text-purple-950">
                          {toFaDigits(item.totalWeightKg.toFixed(1))} kg
                        </span>
                      </div>
                    </div>

                    {/* Machine Usage Note */}
                    <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl p-2.5 text-xs font-bold text-purple-950 space-y-1">
                      <div className="flex items-center gap-1 text-[11px] text-purple-900 font-black">
                        <Info className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                        <span>توضیحات و علت استفاده:</span>
                      </div>
                      <p className="text-[11px] text-stone-700 font-medium leading-relaxed pr-1">
                        {item.machineNotes || item.notes || 'برای استفاده دستگاه اواپراتور بوده است'}
                      </p>
                      {item.sourcePalletInfo && (
                        <p className="text-[10px] text-stone-400 font-mono pt-0.5">
                          {item.sourcePalletInfo}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Return Action Button */}
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[10px] text-stone-400 font-mono">
                      تجهیزات تولید
                    </span>
                    <button
                      type="button"
                      onClick={() => handleReturnFromMachine(item.cargoItemId || item.id, item.machineName)}
                      className="px-3 py-1.5 bg-stone-800 hover:bg-stone-950 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs border border-stone-700"
                      title="بازگردانی این قلم از دستگاه تولید به انبار فروش"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>بازگردانی به انبار فروش</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FLOATING ACTION TOOLBAR WHEN ITEMS/SPOOLS ARE SELECTED */}
      {selectionSummary.hasAnySelection && (
        <div className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:right-8 sm:left-8 z-40 bg-stone-950/95 text-white border border-stone-700/80 shadow-2xl rounded-2xl p-3 sm:p-4 backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-200 flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Left / Info info */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="w-10 h-10 rounded-xl bg-amber-800 flex items-center justify-center text-amber-200 shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                <span>{toFaDigits(selectionSummary.totalCount)} قلم انتخاب شده</span>
                <span className="text-amber-400 font-mono font-black">
                  • مجموع صافی: {toFaDigits(selectionSummary.totalWeight.toFixed(1))} kg
                </span>
              </div>
              <p className="text-[11px] text-stone-400 truncate max-w-sm">
                آماده فروش مستقیم به مشتری/بورس، تفکیک یا انتقال به دستگاه تولید
              </p>
            </div>

            <button
              type="button"
              onClick={handleClearAllSelections}
              className="text-[11px] text-stone-400 hover:text-white underline cursor-pointer md:hidden"
            >
              لغو انتخاب
            </button>
          </div>

          {/* Right / Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
            
            <button
              type="button"
              onClick={handleClearAllSelections}
              className="hidden md:inline-flex px-3 py-2 text-stone-400 hover:text-white text-xs font-bold cursor-pointer transition-colors"
            >
              لغو انتخاب
            </button>

            {/* NEW BUTTON: Move to Machine Production */}
            <button
              type="button"
              onClick={() => {
                if (!selectionSummary.hasAnySelection) {
                  triggerToast('لطفاً ابتدا حداقل یک قرقره، پالت یا کالا را از لیست تیک بزنید.');
                  return;
                }
                setIsMachineModalOpen(true);
              }}
              className="px-3.5 py-2 bg-purple-900 hover:bg-purple-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors border border-purple-700 shadow-sm"
              title="ارسال و اختصاص اقلام انتخابی به دستگاه‌های تولید کارخانه (مثل دستگاه اواپراتور)"
            >
              <Factory className="w-3.5 h-3.5 text-purple-300" />
              <span>انتقال به تولید / دستگاه</span>
            </button>

            {selectionSummary.selectedPalletSpoolsMap.size > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleMoveSelectedToRetail}
                  className="px-3 py-2 bg-rose-900/90 hover:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors border border-rose-700/50"
                  title="انتقال قرقره‌های پالتی انتخاب‌شده به خورده‌ها و ارسال باقیمانده به قرقره‌های آزاد"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>انتقال به خورده‌ها</span>
                </button>

                <button
                  type="button"
                  onClick={handleDismantleSelectedPallets}
                  className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors border border-stone-600"
                  title="تفکیک کامل پالت‌های انتخاب‌شده"
                >
                  <Boxes className="w-3.5 h-3.5 text-amber-400" />
                  <span>تفکیک پالت</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleOpenSaleModalWithSelection}
              className="flex-1 md:flex-initial px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm ring-2 ring-amber-500/50"
            >
              <UserCheck className="w-4 h-4 text-amber-200" />
              <span>ثبت فروش مستقیم (مشتری / بورس)</span>
            </button>

          </div>

        </div>
      )}

      {/* MACHINE TRANSFER MODAL */}
      {isMachineModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 dir-rtl font-sans">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-stone-200 shadow-2xl p-5 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center font-black">
                  <Factory className="w-5 h-5 text-purple-800" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    انتقال به مس مصرفی دستگاه (خط تولید)
                  </h3>
                  <p className="text-xs text-stone-500 font-bold">
                    ارسال اقلام انتخابی به تجهیزات کارخانه — غیرقابل فروش مستقیم
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMachineModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selected Items Summary Box */}
            <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-purple-800 block">اقلام انتخاب‌شده برای دستگاه:</span>
                <span className="text-sm font-black text-purple-950">
                  {toFaDigits(selectionSummary.totalCount)} قلم (
                  {toFaDigits(selectionSummary.totalWeight.toFixed(1))} کیلوگرم مس)
                </span>
              </div>
              <span className="text-xs font-mono font-bold bg-purple-900 text-white px-2.5 py-1 rounded-xl">
                {toFaDigits(selectionSummary.totalWeight.toFixed(1))} kg
              </span>
            </div>

            {/* Machine Selection Options */}
            <div className="space-y-2">
              <label className="text-xs font-black text-stone-800 block">
                دستگاه / بخش مصرف‌کننده:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'دستگاه اواپراتور',
                  'خط تولید کندانسور',
                  'دستگاه کشش و فرم‌دهی',
                  'خط کلاف‌پیچی کارخانه',
                ].map((mName) => (
                  <button
                    key={mName}
                    type="button"
                    onClick={() => {
                      setMachineNameInput(mName);
                      setMachineNotesInput(`برای استفاده ${mName} بوده است`);
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-right transition-all cursor-pointer flex items-center justify-between ${
                      machineNameInput === mName
                        ? 'bg-purple-900 text-white border-purple-950 shadow-xs'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                    }`}
                  >
                    <span>{mName}</span>
                    {machineNameInput === mName && <Check className="w-3.5 h-3.5 text-purple-300" />}
                  </button>
                ))}
              </div>

              {/* Custom Machine Name Input */}
              <input
                type="text"
                value={machineNameInput}
                onChange={(e) => {
                  setMachineNameInput(e.target.value);
                  if (!machineNotesInput || machineNotesInput.startsWith('برای استفاده')) {
                    setMachineNotesInput(`برای استفاده ${e.target.value} بوده است`);
                  }
                }}
                placeholder="یا نام دستگاه دلخواه را وارد کنید..."
                className="w-full px-3 py-2 text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-purple-600 focus:outline-none"
              />
            </div>

            {/* Usage Note / Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-stone-800 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-purple-700" />
                <span>توضیحات و علت استفاده:</span>
              </label>
              <textarea
                rows={3}
                value={machineNotesInput}
                onChange={(e) => setMachineNotesInput(e.target.value)}
                placeholder="مثلاً: برای استفاده دستگاه اواپراتور بوده است..."
                className="w-full p-2.5 text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-purple-600 focus:outline-none leading-relaxed"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsMachineModalOpen(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={handleConfirmTransferToMachine}
                className="px-5 py-2.5 bg-purple-900 hover:bg-purple-950 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Factory className="w-4 h-4 text-purple-300" />
                <span>تأیید و انتقال به تولید دستگاه</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIRECT SALE MODAL */}
      <WarehouseDirectSaleModal
        isOpen={isDirectSaleModalOpen}
        onClose={() => setIsDirectSaleModalOpen(false)}
        selectedStock={{
          totalWeightKg: selectionSummary.totalWeight,
          itemsCount: selectionSummary.totalCount,
          summaryLabel: selectionSummary.summaryLabel,
          itemsDetails: selectionSummary.itemsDetails,
          rawPayload: {
            selectedPalletSpools: selectionSummary.selectedPalletSpoolsMap,
            selectedLooseSpools: selectionSummary.selectedLooseList,
            selectedRetailItems: selectionSummary.selectedRetailList,
          },
        }}
        people={availablePeople}
        marketPrices={availablePrices}
        onSubmitSale={handleConfirmDirectSale}
      />

    </div>
  );
};
