import React, { useState, useEffect } from 'react';
import { 
  X, 
  PackagePlus, 
  PackageMinus, 
  Layers, 
  Building2, 
  Gauge, 
  Ruler, 
  Hash, 
  Scale, 
  Truck, 
  FileText, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Trash2,
  ListPlus,
  Disc,
  Boxes,
  Scissors
} from 'lucide-react';
import { 
  WarehouseItem, 
  WarehouseCargoItem,
  CopperPackagingType, 
  WarehouseEntryType,
  CoilLengthType,
  SpoolPackagingType
} from '../types';
import { 
  COPPER_BRANDS, 
  COPPER_PACKAGING_TYPES, 
  COIL_LENGTH_OPTIONS,
  SPOOL_PACKAGING_OPTIONS,
  COPPER_THICKNESSES, 
  COPPER_DIAMETERS 
} from '../utils/storage';
import { 
  getTodayJalaliString, 
  getCurrentPersianTimeString, 
  generateReceiptNumber 
} from '../utils/persianDate';
import { formatNumber, formatWeight } from '../utils/formatters';
import type { ExtractedCargoVisionData } from './CopperCargoVisionScanner';

interface WarehouseEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: WarehouseItem) => void;
  initialItem?: WarehouseItem | null;
  defaultType?: WarehouseEntryType;
  initialTargetPartyName?: string;
  isLinkedToSaleFlow?: boolean;
}

export const WarehouseEntryModal: React.FC<WarehouseEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  defaultType = 'inbound',
  initialTargetPartyName,
  isLinkedToSaleFlow = false,
}) => {
  // Consignment Header Info
  const [entryType, setEntryType] = useState<WarehouseEntryType>(defaultType);
  const [date, setDate] = useState<string>(getTodayJalaliString());
  const [time, setTime] = useState<string>(getCurrentPersianTimeString());
  const [referenceDocNumber, setReferenceDocNumber] = useState<string>('');
  const [targetPartyName, setTargetPartyName] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [registeredBy, setRegisteredBy] = useState<string>('انباردار مس واته');

  // Multi-item consignment list
  const [cargoItems, setCargoItems] = useState<WarehouseCargoItem[]>([]);

  // Sub-item Current Form state (for adding a new item)
  const [itemPackaging, setItemPackaging] = useState<CopperPackagingType>('coil');
  const [itemBrand, setItemBrand] = useState<string>('باهنر');
  const [customBrand, setCustomBrand] = useState<string>('');
  const [thicknessMm, setThicknessMm] = useState<number>(0.75);
  const [diameterInch, setDiameterInch] = useState<string>('5/8');
  const [customDiameter, setCustomDiameter] = useState<string>('');
  
  // Coil specific
  const [coilLength, setCoilLength] = useState<CoilLengthType>('15m');
  const [coilQuantity, setCoilQuantity] = useState<number>(10);
  const [coilUnitWeight, setCoilUnitWeight] = useState<number>(15);
  const [coilManualTotalWeight, setCoilManualTotalWeight] = useState<number>(150);
  const [isCoilManualTotal, setIsCoilManualTotal] = useState<boolean>(false);

  // Straight specific
  const [straightMode, setStraightMode] = useState<'total_weight' | 'count_and_weight'>('total_weight');
  const [straightQuantity, setStraightQuantity] = useState<number>(5);
  const [straightTotalWeight, setStraightTotalWeight] = useState<number>(50);
  const [straightUnitWeight, setStraightUnitWeight] = useState<number>(10);

  // Spool specific (Individual weights list & Pallet type)
  const [spoolType, setSpoolType] = useState<SpoolPackagingType>('pallet');
  const [spoolWeightsList, setSpoolWeightsList] = useState<string[]>(['220', '235']);
  const [currentSpoolInput, setCurrentSpoolInput] = useState<string>('');

  // Retail specific (Loose / Custom weight sale)
  const [retailWeightKg, setRetailWeightKg] = useState<number>(20);

  const [itemNotes, setItemNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (initialItem) {
        setEntryType(initialItem.entryType);
        setDate(initialItem.date);
        setTime(initialItem.time || getCurrentPersianTimeString());
        setReferenceDocNumber(initialItem.referenceDocNumber || '');
        setTargetPartyName(initialItem.targetPartyName || '');
        setDriverName(initialItem.driverName || '');
        setVehiclePlate(initialItem.vehiclePlate || '');
        setNotes(initialItem.notes || '');
        setRegisteredBy(initialItem.registeredBy || 'انباردار مس واته');

        if (initialItem.items && initialItem.items.length > 0) {
          setCargoItems(initialItem.items);
        } else {
          // Fallback legacy single item
          const fallbackSubItem: WarehouseCargoItem = {
            id: initialItem.id + '-sub-1',
            packagingType: ((initialItem as any).packagingType === 'roll' ? 'coil' : initialItem.packagingType) || 'coil',
            brand: initialItem.brand || 'باهنر',
            thicknessMm: initialItem.thicknessMm || 0.75,
            diameterInch: initialItem.diameterInch || '5/8',
            coilLength: initialItem.coilLength || '15m',
            spoolType: initialItem.spoolType || 'pallet',
            quantity: initialItem.quantity || 1,
            unitWeightKg: initialItem.unitWeightKg || 0,
            totalWeightKg: initialItem.totalWeightKg || 0,
            spoolWeights: initialItem.spoolWeights,
            notes: initialItem.notes,
          };
          setCargoItems([fallbackSubItem]);
        }
      } else {
        setEntryType(defaultType);
        setDate(getTodayJalaliString());
        setTime(getCurrentPersianTimeString());
        setReferenceDocNumber(generateReceiptNumber(defaultType === 'inbound' ? 'WH-IN' : 'WH-OUT'));
        setTargetPartyName(initialTargetPartyName || '');
        setDriverName('');
        setVehiclePlate('');
        setNotes('');
        setRegisteredBy('انباردار مس واته');
        setCargoItems([]);
      }

      // Reset sub-item form
      setItemPackaging('coil');
      setItemBrand('باهنر');
      setCustomBrand('');
      setThicknessMm(0.75);
      setDiameterInch('5/8');
      setCustomDiameter('');
      setCoilLength('15m');
      setCoilQuantity(5);
      setCoilUnitWeight(15);
      setCoilManualTotalWeight(75);
      setIsCoilManualTotal(false);
      setStraightMode('total_weight');
      setStraightQuantity(5);
      setStraightTotalWeight(50);
      setStraightUnitWeight(10);
      setSpoolType('pallet');
      setSpoolWeightsList(['225.5', '230.2', '228.0', '234.8', '239.5']);
      setCurrentSpoolInput('');
      setItemNotes('');
      setError('');
    }
  }, [isOpen, initialItem, defaultType]);

  if (!isOpen) return null;

  // Spool handlers
  const handleSelectSpoolType = (type: SpoolPackagingType) => {
    setSpoolType(type);
    if (type === 'pallet') {
      if (spoolWeightsList.length !== 5) {
        setSpoolWeightsList(['225.5', '230.2', '228.0', '234.8', '239.5']);
      }
    } else if (type === 'non_pallet' && (spoolWeightsList.length === 0 || spoolWeightsList.length > 2)) {
      setSpoolWeightsList(['225.0']);
    }
  };

  const handleSetSpoolsCount = (count: number) => {
    const validCount = Math.max(1, Math.min(24, count));
    if (validCount === spoolWeightsList.length) return;
    
    if (validCount > spoolWeightsList.length) {
      const addedSlots = Array(validCount - spoolWeightsList.length).fill('');
      setSpoolWeightsList([...spoolWeightsList, ...addedSlots]);
    } else {
      setSpoolWeightsList(spoolWeightsList.slice(0, validCount));
    }
  };

  const handleUpdateSpoolWeight = (index: number, val: string) => {
    const updated = [...spoolWeightsList];
    updated[index] = val;
    setSpoolWeightsList(updated);
  };

  const handleAddSingleSpoolSlot = () => {
    setSpoolWeightsList([...spoolWeightsList, '']);
  };

  const handleRemoveSpoolSlot = (index: number) => {
    if (spoolWeightsList.length <= 1) {
      setSpoolWeightsList(['']);
      return;
    }
    setSpoolWeightsList(spoolWeightsList.filter((_, i) => i !== index));
  };

  const handleClearSpoolWeights = () => {
    setSpoolWeightsList(spoolWeightsList.map(() => ''));
  };

  // Handle AI Extracted Vision Data for all 3 formats (Spool, Straight, Coil)
  const handleApplyVisionData = (data: ExtractedCargoVisionData) => {
    setError('');

    // 1. Update Packaging Type if detected
    if (data.packagingType) {
      setItemPackaging(data.packagingType);
    }

    // 2. Update Brand
    if (data.brand) {
      const matchBrand = COPPER_BRANDS.find((b) => b.includes(data.brand!) || data.brand!.includes(b));
      if (matchBrand) {
        setItemBrand(matchBrand);
        setCustomBrand('');
      } else {
        setItemBrand('سایر');
        setCustomBrand(data.brand);
      }
    }

    // 3. Update Diameter
    if (data.diameterInch) {
      const matchDia = COPPER_DIAMETERS.find((d) => d === data.diameterInch || data.diameterInch!.includes(d));
      if (matchDia) {
        setDiameterInch(matchDia);
        setCustomDiameter('');
      } else {
        setDiameterInch('سایر');
        setCustomDiameter(data.diameterInch);
      }
    }

    // 4. Update Thickness
    if (typeof data.thicknessMm === 'number' && data.thicknessMm > 0) {
      // match closest standard thickness or use directly
      const closestThick = COPPER_THICKNESSES.reduce((prev, curr) => 
        Math.abs(curr - data.thicknessMm!) < Math.abs(prev - data.thicknessMm!) ? curr : prev, 
        COPPER_THICKNESSES[0]
      );
      setThicknessMm(closestThick);
    }

    // 5. Update Packaging-Specific Fields
    const targetPkg = data.packagingType || itemPackaging;

    if (targetPkg === 'coil') {
      if (data.coilLength) setCoilLength(data.coilLength);
      if (data.quantity) setCoilQuantity(data.quantity);
      if (data.unitWeightKg && data.unitWeightKg > 0) {
        setCoilUnitWeight(data.unitWeightKg);
        setIsCoilManualTotal(false);
      }
      if (data.totalWeightKg && data.totalWeightKg > 0) {
        setCoilManualTotalWeight(data.totalWeightKg);
        if (!data.unitWeightKg) setIsCoilManualTotal(true);
      }
    } else if (targetPkg === 'straight') {
      if (data.quantity) setStraightQuantity(data.quantity);
      if (data.totalWeightKg && data.totalWeightKg > 0) {
        setStraightTotalWeight(data.totalWeightKg);
        setStraightMode('total_weight');
      } else if (data.unitWeightKg && data.unitWeightKg > 0) {
        setStraightUnitWeight(data.unitWeightKg);
        setStraightMode('count_and_weight');
      }
    } else if (targetPkg === 'spool') {
      if (data.spoolType) setSpoolType(data.spoolType);
      if (data.spoolWeights && data.spoolWeights.length > 0) {
        setSpoolWeightsList(data.spoolWeights);
      } else if (data.quantity && data.unitWeightKg) {
        setSpoolWeightsList(Array(data.quantity).fill(String(data.unitWeightKg)));
      }
    }

    // 6. Update reference number or notes if found on invoice/label
    if (data.orderNo || data.batchNo) {
      if (!referenceDocNumber || referenceDocNumber.startsWith('WH-')) {
        setReferenceDocNumber(data.orderNo || data.batchNo || '');
      }
    }
  };

  // Add sub-item to consignment list
  const handleAddSubItemToConsignment = () => {
    setError('');

    const resolvedBrand = itemBrand === 'سایر' ? (customBrand.trim() || 'متفرقه') : itemBrand;
    const resolvedDiameter = diameterInch === 'سایر' ? (customDiameter.trim() || 'سفارشی') : diameterInch;

    let qty = 0;
    let unitWeight = 0;
    let totalWeight = 0;
    let spoolWeights: number[] | undefined = undefined;

    if (itemPackaging === 'coil') {
      qty = Math.max(1, coilQuantity);
      if (isCoilManualTotal) {
        totalWeight = Number(coilManualTotalWeight) || 0;
        unitWeight = qty > 0 ? Number((totalWeight / qty).toFixed(3)) : 0;
      } else {
        unitWeight = Number(coilUnitWeight) || 0;
        totalWeight = Number((qty * unitWeight).toFixed(3));
      }

      if (totalWeight <= 0) {
        setError('لطفاً وزن کل یا وزن واحد کلاف را به درستی وارد نمایید.');
        return;
      }
    } else if (itemPackaging === 'straight') {
      qty = Math.max(1, straightQuantity);
      if (straightMode === 'total_weight') {
        totalWeight = Number(straightTotalWeight) || 0;
        unitWeight = qty > 0 ? Number((totalWeight / qty).toFixed(3)) : 0;
      } else {
        unitWeight = Number(straightUnitWeight) || 0;
        totalWeight = Number((qty * unitWeight).toFixed(3));
      }

      if (totalWeight <= 0) {
        setError('لطفاً وزن شاخه‌ها را به درستی وارد نمایید.');
        return;
      }
    } else if (itemPackaging === 'spool') {
      const parsedSpoolWeights = spoolWeightsList
        .map((w) => parseFloat(w))
        .filter((w) => !isNaN(w) && w > 0);

      if (parsedSpoolWeights.length === 0) {
        setError('برای قرقره، لطفاً حداقل وزن یک قرقره را وارد کنید.');
        return;
      }

      qty = parsedSpoolWeights.length;
      totalWeight = Number(parsedSpoolWeights.reduce((sum, w) => sum + w, 0).toFixed(3));
      unitWeight = Number((totalWeight / qty).toFixed(3));
      spoolWeights = parsedSpoolWeights;
    } else if (itemPackaging === 'retail') {
      qty = 1;
      totalWeight = Number(retailWeightKg) || 0;
      unitWeight = totalWeight;

      if (totalWeight <= 0) {
        setError('لطفاً وزن خروجی خرده‌فروشی را به درستی وارد نمایید.');
        return;
      }
    }

    const newSubItem: WarehouseCargoItem = {
      id: 'cargo-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      packagingType: itemPackaging,
      brand: resolvedBrand,
      thicknessMm: Number(thicknessMm) || 0.75,
      diameterInch: resolvedDiameter,
      coilLength: itemPackaging === 'coil' ? coilLength : undefined,
      straightMode: itemPackaging === 'straight' ? straightMode : undefined,
      spoolType: itemPackaging === 'spool' ? spoolType : undefined,
      spoolWeights,
      quantity: qty,
      unitWeightKg: unitWeight,
      totalWeightKg: totalWeight,
      notes: itemNotes.trim() || undefined,
    };

    setCargoItems([...cargoItems, newSubItem]);

    // Reset sub-item form for next addition
    setItemNotes('');
    if (itemPackaging === 'spool') {
      setSpoolWeightsList(['', '', '', '']);
    }
  };

  const handleRemoveCargoItem = (id: string) => {
    setCargoItems(cargoItems.filter((it) => it.id !== id));
  };

  // Grand totals of the whole consignment
  const grandTotalWeightKg = Number(cargoItems.reduce((sum, it) => sum + (it.totalWeightKg || 0), 0).toFixed(3));
  const grandTotalQuantity = cargoItems.reduce((sum, it) => sum + (it.quantity || 0), 0);

  // Spool specific breakdown within consignment
  const palletSpoolsWeight = Number(
    cargoItems
      .filter((it) => it.packagingType === 'spool' && it.spoolType !== 'non_pallet')
      .reduce((sum, it) => sum + (it.totalWeightKg || 0), 0)
      .toFixed(3)
  );
  const palletSpoolsCount = cargoItems
    .filter((it) => it.packagingType === 'spool' && it.spoolType !== 'non_pallet')
    .reduce((sum, it) => sum + (it.quantity || 0), 0);

  const nonPalletSpoolsWeight = Number(
    cargoItems
      .filter((it) => it.packagingType === 'spool' && it.spoolType === 'non_pallet')
      .reduce((sum, it) => sum + (it.totalWeightKg || 0), 0)
      .toFixed(3)
  );
  const nonPalletSpoolsCount = cargoItems
    .filter((it) => it.packagingType === 'spool' && it.spoolType === 'non_pallet')
    .reduce((sum, it) => sum + (it.quantity || 0), 0);
  const hasSpoolsInConsignment = palletSpoolsCount > 0 || nonPalletSpoolsCount > 0;

  // Form Submit
  const handleSubmitConsignment = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (cargoItems.length === 0) {
      setError('حداقل یک قلم کالا باید به لیست بارنامه اضافه شود.');
      return;
    }

    const firstItem = cargoItems[0];

    const finalConsignment: WarehouseItem = {
      id: initialItem?.id || 'wh-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      entryType,
      date,
      time: time || getCurrentPersianTimeString(),
      referenceDocNumber: referenceDocNumber.trim() || generateReceiptNumber(entryType === 'inbound' ? 'WH-IN' : 'WH-OUT'),
      targetPartyName: targetPartyName.trim() || undefined,
      driverName: driverName.trim() || undefined,
      vehiclePlate: vehiclePlate.trim() || undefined,
      registeredBy: registeredBy.trim() || 'انباردار مس واته',
      notes: notes.trim() || undefined,
      createdAt: initialItem?.createdAt || new Date().toISOString(),
      items: cargoItems,
      totalWeightKg: grandTotalWeightKg,
      totalItemsCount: grandTotalQuantity,
      // Backward compatibility fields
      packagingType: firstItem.packagingType,
      brand: firstItem.brand,
      thicknessMm: firstItem.thicknessMm,
      diameterInch: firstItem.diameterInch,
      quantity: grandTotalQuantity,
      unitWeightKg: grandTotalQuantity > 0 ? Number((grandTotalWeightKg / grandTotalQuantity).toFixed(3)) : 0,
      coilLength: firstItem.coilLength,
      spoolType: firstItem.spoolType,
      spoolWeights: firstItem.spoolWeights,
    };

    onSave(finalConsignment);
  };

  const isInbound = entryType === 'inbound';

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 py-4 sm:py-6 animate-in fade-in duration-150 dir-rtl">
      <div className="bg-white border border-stone-200 rounded-3xl shadow-2xl w-full max-w-4xl my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden text-stone-900">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-2xs ${
              isInbound ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {isInbound ? <PackagePlus className="w-5 h-5" /> : <PackageMinus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-stone-900">
                {initialItem 
                  ? (isInbound ? 'ویرایش سند ورود مس به انبار' : 'ویرایش سند خروج مس از انبار')
                  : (isInbound ? 'ثبت ورود مس به انبار (صدور رسید)' : 'ثبت خروج مس از انبار (حواله خروج)')
                }
              </h2>
              <p className="text-xs text-stone-500 mt-0.5 font-medium">
                افزودن اقلام مس (کلاف، شاخه، قرقره و خرده‌فروشی) به محموله انبار
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmitConsignment} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Linked Flow Indicator */}
          {isLinkedToSaleFlow && (
            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-950">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <div>
                  <span className="font-extrabold text-amber-900 block text-xs sm:text-sm">مرحله ۱ از ۲: ثبت خروج فیزیکی اقلام مس از انبار</span>
                  <span className="text-[11px] text-amber-800">اقلام انتخابی خروج داده شده و وزن کل به فاکتور فروش منتقل می‌شود</span>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-100 border border-amber-300/80 px-3 py-1 rounded-xl shrink-0">
                گام بعدی: ثبت فاکتور فروش ➔
              </span>
            </div>
          )}

          {/* Section 1: Inbound / Outbound Switch & Clean Header */}
          <div className="bg-stone-50/80 p-3 sm:p-3.5 rounded-2xl border border-stone-200 flex flex-wrap items-center justify-between gap-3">
            
            {/* Inbound vs Outbound Toggle */}
            <div className="grid grid-cols-2 gap-1.5 flex-1 min-w-[260px] bg-stone-200/60 p-1 rounded-xl border border-stone-200/80">
              <button
                type="button"
                onClick={() => setEntryType('inbound')}
                className={`py-2 px-3 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isInbound 
                    ? 'bg-white text-emerald-800 shadow-2xs font-extrabold' 
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <PackagePlus className="w-4 h-4 text-emerald-600" />
                <span>ورود به انبار (رسید)</span>
              </button>

              <button
                type="button"
                onClick={() => setEntryType('outbound')}
                className={`py-2 px-3 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  !isInbound 
                    ? 'bg-white text-amber-900 shadow-2xs font-extrabold' 
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <PackageMinus className="w-4 h-4 text-amber-600" />
                <span>خروج از انبار (حواله)</span>
              </button>
            </div>

            {targetPartyName && (
              <div className="px-3.5 py-1.5 bg-white border border-stone-200 text-stone-800 rounded-xl font-bold text-xs flex items-center gap-2 shadow-2xs">
                <Building2 className="w-4 h-4 text-stone-500 shrink-0" />
                <span>طرف حساب: <strong className="text-stone-950 font-mono">{targetPartyName}</strong></span>
              </div>
            )}
          </div>

          {/* Section 2: Cargo Item Builder (افزودن قلم به بارنامه) */}
          <div className="bg-stone-50/60 p-4 sm:p-5 rounded-2xl border border-stone-200 space-y-4">
            
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <ListPlus className="w-5 h-5 text-stone-700" />
                <h3 className="text-sm font-black text-stone-900">
                  مشخصات قلم مس جدید
                </h3>
              </div>
              <span className="text-[11px] text-stone-600 bg-white px-2.5 py-1 rounded-lg border border-stone-200 font-medium">
                انتخاب قالب و اندازه
              </span>
            </div>

            {/* Packaging Type Selector (4 Options) */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-2">
                ۱. نوع قالب و بسته‌بندی مس:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                
                {/* کلاف */}
                <button
                  type="button"
                  onClick={() => setItemPackaging('coil')}
                  className={`py-2.5 px-2.5 rounded-xl font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
                    itemPackaging === 'coil'
                      ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                  }`}
                >
                  <Layers className={`w-4 h-4 ${itemPackaging === 'coil' ? 'text-purple-300' : 'text-purple-600'}`} />
                  <span>کلاف مس (Coil)</span>
                  <span className={`text-[10px] font-normal ${itemPackaging === 'coil' ? 'text-stone-300' : 'text-stone-500'}`}>۱۵ و ۵۰ متری</span>
                </button>

                {/* شاخه */}
                <button
                  type="button"
                  onClick={() => setItemPackaging('straight')}
                  className={`py-2.5 px-2.5 rounded-xl font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
                    itemPackaging === 'straight'
                      ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                  }`}
                >
                  <Ruler className={`w-4 h-4 ${itemPackaging === 'straight' ? 'text-blue-300' : 'text-blue-600'}`} />
                  <span>شاخه مس (Straight)</span>
                  <span className={`text-[10px] font-normal ${itemPackaging === 'straight' ? 'text-stone-300' : 'text-stone-500'}`}>ثبت وزنی / تعدادی</span>
                </button>

                {/* قرقره */}
                <button
                  type="button"
                  onClick={() => setItemPackaging('spool')}
                  className={`py-2.5 px-2.5 rounded-xl font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
                    itemPackaging === 'spool'
                      ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                  }`}
                >
                  <Disc className={`w-4 h-4 ${itemPackaging === 'spool' ? 'text-amber-300' : 'text-amber-600'}`} />
                  <span>قرقره مس (Spool)</span>
                  <span className={`text-[10px] font-normal ${itemPackaging === 'spool' ? 'text-stone-300' : 'text-stone-500'}`}>وزن مجزای هر قرقره</span>
                </button>

                {/* خرده‌فروشی / مس کیلویی */}
                <button
                  type="button"
                  onClick={() => setItemPackaging('retail')}
                  className={`py-2.5 px-2.5 rounded-xl font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
                    itemPackaging === 'retail'
                      ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                  }`}
                >
                  <Scissors className={`w-4 h-4 ${itemPackaging === 'retail' ? 'text-emerald-300' : 'text-emerald-600'}`} />
                  <span>خرده‌فروشی (کیلویی)</span>
                  <span className={`text-[10px] font-normal ${itemPackaging === 'retail' ? 'text-stone-300' : 'text-stone-500'}`}>فروش کیلوگرمی دلخواه</span>
                </button>

              </div>
            </div>

            {/* Brand, Thickness & Diameter */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Brand */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  شرکت سازنده (برند)
                </label>
                <div className="flex gap-2">
                  <select
                    value={itemBrand}
                    onChange={(e) => setItemBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900/10"
                  >
                    {COPPER_BRANDS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                {itemBrand === 'سایر' && (
                  <input
                    type="text"
                    value={customBrand}
                    onChange={(e) => setCustomBrand(e.target.value)}
                    placeholder="نام برند یا کارخانه..."
                    className="w-full mt-2 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                  />
                )}
              </div>

              {/* Diameter (سایز / قطر) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  سایز / قطر لوله (اینچ)
                </label>
                <select
                  value={diameterInch}
                  onChange={(e) => setDiameterInch(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 font-mono focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900/10"
                >
                  {COPPER_DIAMETERS.map((d) => (
                    <option key={d} value={d}>{d} اینچ</option>
                  ))}
                  <option value="سایر">سایز متفرقه / دستی...</option>
                </select>
                {diameterInch === 'سایر' && (
                  <input
                    type="text"
                    value={customDiameter}
                    onChange={(e) => setCustomDiameter(e.target.value)}
                    placeholder="سایز یا قطر سفارشی..."
                    className="w-full mt-2 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                  />
                )}
              </div>

              {/* Thickness (ضخامت) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  ضخامت گوشت لوله (میلی‌متر)
                </label>
                <select
                  value={thicknessMm}
                  onChange={(e) => setThicknessMm(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 font-mono focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900/10"
                >
                  {COPPER_THICKNESSES.map((t) => (
                    <option key={t} value={t}>{t.toFixed(2)} mm</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Specific Config based on packaging type */}
            
            {/* 1. COIL CONFIGURATION */}
            {itemPackaging === 'coil' && (
              <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800">
                    مدل کلاف:
                  </span>
                  <div className="flex items-center gap-2">
                    {COIL_LENGTH_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCoilLength(opt.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                          coilLength === opt.id
                            ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                            : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-xs text-stone-700 mb-1 font-medium">
                      تعداد کلاف ({coilLength === '50m' ? '۵۰ متری' : '۱۵ متری'})
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={coilQuantity || ''}
                      onChange={(e) => setCoilQuantity(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 font-mono focus:bg-white focus:outline-none focus:border-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-stone-700 mb-1 font-medium">
                      {isCoilManualTotal ? 'وزن کل تمام کلاف‌ها (kg)' : 'میانگین وزن هر کلاف (kg)'}
                    </label>
                    {isCoilManualTotal ? (
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={coilManualTotalWeight || ''}
                        onChange={(e) => setCoilManualTotalWeight(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 font-mono focus:bg-white focus:outline-none focus:border-stone-900"
                      />
                    ) : (
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={coilUnitWeight || ''}
                        onChange={(e) => setCoilUnitWeight(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 font-mono focus:bg-white focus:outline-none focus:border-stone-900"
                      />
                    )}
                  </div>

                  <div className="flex flex-col justify-end">
                    <button
                      type="button"
                      onClick={() => setIsCoilManualTotal(!isCoilManualTotal)}
                      className="text-[11px] text-stone-600 hover:text-stone-900 underline cursor-pointer py-2 text-right"
                    >
                      {isCoilManualTotal ? '← تغییر به محاسبه خودکار (تعداد × وزن واحد)' : '← ثبت دستی وزن کل بار کلاف‌ها'}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-stone-900 font-mono bg-stone-100 p-2.5 rounded-xl flex items-center justify-between border border-stone-200">
                  <span>جمع وزن این قلم کلاف:</span>
                  <span className="font-bold text-sm text-stone-900">
                    {formatNumber(isCoilManualTotal ? coilManualTotalWeight : coilQuantity * coilUnitWeight, 2)} کیلوگرم
                  </span>
                </div>
              </div>
            )}

            {/* 2. STRAIGHT CONFIGURATION */}
            {itemPackaging === 'straight' && (
              <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800">
                    نحوه ثبت شاخه‌ها:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStraightMode('total_weight')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        straightMode === 'total_weight'
                          ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                          : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                      }`}
                    >
                      ثبت وزن کل بار
                    </button>
                    <button
                      type="button"
                      onClick={() => setStraightMode('count_and_weight')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        straightMode === 'count_and_weight'
                          ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                          : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                      }`}
                    >
                      ثبت بر اساس تعداد و وزن شاخه
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs text-stone-700 mb-1 font-medium">
                      تعداد شاخه‌ها
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={straightQuantity || ''}
                      onChange={(e) => setStraightQuantity(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 font-mono focus:bg-white focus:outline-none focus:border-stone-900"
                    />
                  </div>

                  {straightMode === 'total_weight' ? (
                    <div>
                      <label className="block text-xs text-stone-700 mb-1 font-medium">
                        وزن کل شاخه‌ها (کیلوگرم)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={straightTotalWeight || ''}
                        onChange={(e) => setStraightTotalWeight(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 font-mono focus:bg-white focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs text-stone-700 mb-1 font-medium">
                        وزن هر شاخه (کیلوگرم)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={straightUnitWeight || ''}
                        onChange={(e) => setStraightUnitWeight(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 font-mono focus:bg-white focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  )}
                </div>

                <div className="text-xs text-stone-900 font-mono bg-stone-100 p-2.5 rounded-xl flex items-center justify-between border border-stone-200">
                  <span>جمع وزن این قلم شاخه:</span>
                  <span className="font-bold text-sm text-stone-900">
                    {formatNumber(straightMode === 'total_weight' ? straightTotalWeight : straightQuantity * straightUnitWeight, 2)} کیلوگرم
                  </span>
                </div>
              </div>
            )}

            {/* 3. SPOOL CONFIGURATION */}
            {itemPackaging === 'spool' && (
              <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Disc className="w-4 h-4 text-stone-700" />
                    <span className="text-xs font-bold text-stone-900">
                      ثبت تفکیکی وزن تک‌تک قرقره‌ها:
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-600 font-mono">
                    تعداد: {spoolWeightsList.length} قرقره
                  </span>
                </div>

                {/* Pallet vs Non-Pallet Selection */}
                <div>
                  <label className="block text-[11px] text-stone-700 mb-1.5 font-bold">
                    وضعیت بسته‌بندی قرقره (پالتی یا غیر پالتی):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectSpoolType('pallet')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        spoolType === 'pallet'
                          ? 'bg-stone-900 border-stone-900 text-white shadow-xs'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <span>📦</span>
                      <span>قرقره پالتی (با پالت)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectSpoolType('non_pallet')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        spoolType === 'non_pallet'
                          ? 'bg-stone-900 border-stone-900 text-white shadow-xs'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <span>🔘</span>
                      <span>قرقره غیر پالتی (تکی / فله)</span>
                    </button>
                  </div>
                </div>

                {/* Number of Spools */}
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-bold text-stone-800">
                      {spoolType === 'pallet' ? 'تعداد قرقره‌های روی این پالت:' : 'تعداد قرقره‌های غیر پالتی / فله:'}
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSetSpoolsCount(spoolWeightsList.length - 1)}
                        disabled={spoolWeightsList.length <= 1}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-stone-200 disabled:opacity-40 text-stone-800 font-bold text-sm flex items-center justify-center cursor-pointer border border-stone-300"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-stone-900 text-sm px-2.5">
                        {spoolWeightsList.length} عدد
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSetSpoolsCount(spoolWeightsList.length + 1)}
                        disabled={spoolWeightsList.length >= 24}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-stone-200 disabled:opacity-40 text-stone-800 font-bold text-sm flex items-center justify-center cursor-pointer border border-stone-300"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Preset Quick Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-stone-500">انتخاب سریع:</span>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleSetSpoolsCount(num)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                          spoolWeightsList.length === num
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                        }`}
                      >
                        <span>{num} قرقره</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Direct Weight Inputs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-800">
                      وزن هر قرقره را وارد نمایید:
                    </span>
                    <button
                      type="button"
                      onClick={handleClearSpoolWeights}
                      className="text-[11px] text-stone-500 hover:text-stone-900 underline cursor-pointer"
                    >
                      پاک کردن همه
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1">
                    {spoolWeightsList.map((wt, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1 focus-within:border-stone-800 transition-all"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-stone-700 text-[11px]">
                            قرقره {idx + 1}:
                          </span>
                          {spoolWeightsList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSpoolSlot(idx)}
                              className="text-stone-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="1"
                            value={wt}
                            onChange={(e) => handleUpdateSpoolWeight(idx, e.target.value)}
                            placeholder="مثال: ۲۲۵.۵"
                            className="w-full pl-9 pr-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 font-mono focus:outline-none focus:border-stone-900"
                          />
                          <span className="absolute left-2 top-1.5 text-[11px] font-mono text-stone-400">kg</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddSingleSpoolSlot}
                    className="w-full py-2 bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-bold rounded-xl border border-dashed border-stone-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ افزودن یک قرقره دیگر</span>
                  </button>
                </div>

                {/* Calculation */}
                {(() => {
                  const validWts = spoolWeightsList.map((w) => parseFloat(w)).filter((w) => !isNaN(w) && w > 0);
                  const sumWts = validWts.reduce((s, w) => s + w, 0);

                  return (
                    <div className="text-xs text-stone-900 font-mono bg-stone-100 p-2.5 rounded-xl flex items-center justify-between border border-stone-200">
                      <span>مجموع وزن قرقره‌ها:</span>
                      <span className="font-bold text-sm text-stone-900">
                        {formatNumber(sumWts, 2)} کیلوگرم
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 4. RETAIL CONFIGURATION */}
            {itemPackaging === 'retail' && (
              <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Scissors className="w-4 h-4 text-stone-700" />
                    <span>فروش کیلویی (خرده‌فروشی):</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs text-stone-700 mb-1 font-bold">
                      وزن دقیق مس درخواستی (کیلوگرم) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={retailWeightKg || ''}
                      onChange={(e) => setRetailWeightKg(parseFloat(e.target.value) || 0)}
                      placeholder="مثلاً 20"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 font-mono focus:bg-white focus:outline-none focus:border-stone-900"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="block text-[11px] text-stone-600 mb-1">
                      وزن‌های سریع:
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[5, 10, 15, 20, 25, 50, 100].map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setRetailWeightKg(w)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer border ${
                            retailWeightKg === w
                              ? 'bg-stone-900 text-white border-stone-900'
                              : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                          }`}
                        >
                          {w} کیلو
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-stone-900 font-mono bg-stone-100 p-2.5 rounded-xl flex items-center justify-between border border-stone-200">
                  <span>وزن ثبت‌شده خرده‌فروشی:</span>
                  <span className="font-bold text-sm text-stone-900">
                    {formatNumber(retailWeightKg || 0, 2)} کیلوگرم
                  </span>
                </div>
              </div>
            )}

            {/* Button to push this sub-item to consignment list */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleAddSubItemToConsignment}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>+ ثبت و افزودن این قلم مس به بارنامه</span>
              </button>
            </div>

          </div>

          {/* Section 3: Consignment Items List */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-stone-700" />
                <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                  اقلام موجود در این محموله ({cargoItems.length} قلم کالا)
                </h3>
              </div>
              <div className="text-xs font-mono text-stone-700">
                مجموع وزن کل بار: <span className="text-stone-950 font-extrabold">{formatWeight(grandTotalWeightKg)}</span>
              </div>
            </div>

            {cargoItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                هنوز قلمی به این بارنامه افزوده نشده است. از کادر بالا اقلام مورد نظر را انتخاب کرده و دکمه «افزودن قلم» را بزنید.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {cargoItems.map((item, index) => {
                  const pkgLabel = item.packagingType === 'coil' 
                    ? `کلاف (${item.coilLength === '50m' ? '۵۰ متری' : '۱۵ متری'})`
                    : item.packagingType === 'straight' 
                    ? 'شاخه' 
                    : item.packagingType === 'retail'
                    ? 'خرده‌فروشی (فروش کیلویی)'
                    : (item.spoolType === 'non_pallet' ? 'قرقره (غیر پالتی / تکی)' : 'قرقره (پالتی)');

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-stone-200 bg-stone-50/80 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-900"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-stone-200 text-stone-700 font-mono text-[11px] flex items-center justify-center shrink-0 font-bold">
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-bold flex items-center gap-2 text-stone-900">
                            <span>{pkgLabel}</span>
                            <span>•</span>
                            <span>{item.brand}</span>
                            <span>•</span>
                            <span className="font-mono">سایز {item.diameterInch}</span>
                            <span>•</span>
                            <span className="font-mono">ضخامت {item.thicknessMm}mm</span>
                          </div>
                          {item.packagingType === 'spool' && item.spoolWeights && (
                            <div className="text-[11px] text-stone-500 mt-0.5 font-mono">
                              وزن قرقره‌ها: [{item.spoolWeights.join(' ، ')} kg]
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-left font-mono">
                          <div className="text-stone-600">
                            تعداد: <span className="font-bold text-stone-900">{item.quantity}</span>
                          </div>
                          <div className="font-bold text-stone-950">
                            وزن: {formatWeight(item.totalWeightKg)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveCargoItem(item.id)}
                          className="p-1.5 rounded-lg bg-stone-200/80 hover:bg-rose-100 text-stone-600 hover:text-rose-700 transition-colors cursor-pointer"
                          title="حذف این قلم"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-3 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-stone-600 font-medium">
              مجموع اقلام: <span className="font-bold text-stone-900 font-mono">{grandTotalQuantity} قلم</span> | وزن نهایی بار: <span className="font-bold text-stone-950 font-mono text-sm">{formatWeight(grandTotalWeightKg)}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer border border-stone-200"
              >
                انصراف
              </button>

              <button
                type="submit"
                disabled={cargoItems.length === 0}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
                  cargoItems.length === 0
                    ? 'bg-stone-200 text-stone-400 border border-stone-300 cursor-not-allowed'
                    : 'bg-stone-900 hover:bg-stone-800 text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {initialItem 
                    ? 'ذخیره تغییرات بارنامه' 
                    : (isLinkedToSaleFlow 
                        ? 'ثبت نهایی خروج و ادامه به فاکتور فروش مس ➔' 
                        : (isInbound ? 'ثبت نهایی ورود و صدور رسید' : 'ثبت نهایی خروج و صدور حواله')
                      )}
                </span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
