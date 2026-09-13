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
  Boxes
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

interface WarehouseEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: WarehouseItem) => void;
  initialItem?: WarehouseItem | null;
  defaultType?: WarehouseEntryType;
}

export const WarehouseEntryModal: React.FC<WarehouseEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  defaultType = 'inbound',
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
        setTargetPartyName('');
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
      setSpoolWeightsList(['220', '235']);
      setCurrentSpoolInput('');
      setItemNotes('');
      setError('');
    }
  }, [isOpen, initialItem, defaultType]);

  if (!isOpen) return null;

  // Spool handlers
  const handleSelectSpoolType = (type: SpoolPackagingType) => {
    setSpoolType(type);
    if (type === 'pallet' && spoolWeightsList.length < 2) {
      setSpoolWeightsList(['225', '230', '228', '235']);
    } else if (type === 'non_pallet' && spoolWeightsList.length === 0) {
      setSpoolWeightsList(['220']);
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 py-4 sm:py-6 animate-in fade-in duration-150 dir-rtl">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl w-full max-w-4xl my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden text-stone-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 bg-stone-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-inner ${
              isInbound ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {isInbound ? <PackagePlus className="w-6 h-6" /> : <PackageMinus className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {initialItem 
                  ? (isInbound ? 'ویرایش سند ورود مس به انبار' : 'ویرایش سند خروج مس از انبار')
                  : (isInbound ? 'ثبت ورود مس به انبار (صدور رسید و بارنامه)' : 'ثبت خروج مس از انبار (صدور حواله خروج)')
                }
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                امکان افزودن چندین قلم مس (کلاف ۱۵/۵۰ متری، شاخه و قرقره با وزن مجزا) در یک بارنامه
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmitConsignment} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Section 1: Inbound / Outbound Switch & General Cargo Info */}
          <div className="bg-stone-950/40 p-4 sm:p-5 rounded-2xl border border-stone-800/80 space-y-4">
            
            {/* Inbound vs Outbound Toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEntryType('inbound')}
                className={`py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                  isInbound 
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-950/50' 
                    : 'bg-stone-900 text-stone-400 border-stone-800 hover:bg-stone-800'
                }`}
              >
                <PackagePlus className="w-4 h-4" />
                <span>ورود به انبار (رسید بار)</span>
              </button>

              <button
                type="button"
                onClick={() => setEntryType('outbound')}
                className={`py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                  !isInbound 
                    ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-950/50' 
                    : 'bg-stone-900 text-stone-400 border-stone-800 hover:bg-stone-800'
                }`}
              >
                <PackageMinus className="w-4 h-4" />
                <span>خروج از انبار (حواله خروج)</span>
              </button>
            </div>

            {/* General Consignment Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              
              {/* Reference Number */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>شماره بارنامه / حواله</span>
                </label>
                <input
                  type="text"
                  value={referenceDocNumber}
                  onChange={(e) => setReferenceDocNumber(e.target.value)}
                  placeholder="مثال: WH-IN-1403-882"
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Counterparty Name */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isInbound ? 'تامین‌کننده / فروشنده' : 'خریدار / مشتری'}</span>
                </label>
                <input
                  type="text"
                  value={targetPartyName}
                  onChange={(e) => setTargetPartyName(e.target.value)}
                  placeholder="نام شخص، شرکت یا کارخانه..."
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Driver Name */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>نام راننده</span>
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="نام راننده ماشین..."
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Vehicle Plate */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  شماره پلاک خودرو
                </label>
                <input
                  type="text"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  placeholder="مثال: ایران 68 - 425 ج 12"
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-100 font-mono focus:outline-none focus:border-stone-500"
                />
              </div>

            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
              <div>
                <label className="block text-[11px] text-stone-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>تاریخ ثبت</span>
                </label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-stone-200 font-mono text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>ساعت ثبت</span>
                </label>
                <input
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-stone-200 font-mono text-xs focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] text-stone-400 mb-1">
                  توضیحات کلی بارنامه
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="توضیحات بارنامه، وضعیت پلمپ و غیره..."
                  className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-stone-200 text-xs focus:outline-none"
                />
              </div>
            </div>

          </div>

          {/* Section 2: Cargo Item Builder (افزودن قلم به بارنامه) */}
          <div className="bg-stone-950/60 p-4 sm:p-5 rounded-2xl border border-stone-700 space-y-4">
            
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <ListPlus className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black text-white">
                  افزودن اقلام مس به این بارنامه / ماشین
                </h3>
              </div>
              <span className="text-[11px] text-amber-300/80 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                قرقره (وزن مجزا)، کلاف (۱۵ و ۵۰ متری) و شاخه
              </span>
            </div>

            {/* Packaging Type Selector (No Roll!) */}
            <div>
              <label className="block text-xs font-bold text-stone-300 mb-2">
                ۱. نوع قالب و بسته‌بندی مس:
              </label>
              <div className="grid grid-cols-3 gap-2">
                
                {/* کلاف */}
                <button
                  type="button"
                  onClick={() => setItemPackaging('coil')}
                  className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                    itemPackaging === 'coil'
                      ? 'bg-purple-600/30 text-purple-300 border-purple-500 shadow-md'
                      : 'bg-stone-900 text-stone-400 border-stone-800 hover:bg-stone-850'
                  }`}
                >
                  <Layers className="w-5 h-5" />
                  <span>کلاف مس (Coil)</span>
                  <span className="text-[10px] text-purple-400 font-normal">۱۵ متری / ۵۰ متری</span>
                </button>

                {/* شاخه */}
                <button
                  type="button"
                  onClick={() => setItemPackaging('straight')}
                  className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                    itemPackaging === 'straight'
                      ? 'bg-blue-600/30 text-blue-300 border-blue-500 shadow-md'
                      : 'bg-stone-900 text-stone-400 border-stone-800 hover:bg-stone-850'
                  }`}
                >
                  <Ruler className="w-5 h-5" />
                  <span>شاخه مس (Straight)</span>
                  <span className="text-[10px] text-blue-400 font-normal">ثبت وزنی / تعدادی</span>
                </button>

                {/* قرقره */}
                <button
                  type="button"
                  onClick={() => setItemPackaging('spool')}
                  className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                    itemPackaging === 'spool'
                      ? 'bg-amber-600/30 text-amber-300 border-amber-500 shadow-md'
                      : 'bg-stone-900 text-stone-400 border-stone-800 hover:bg-stone-850'
                  }`}
                >
                  <Disc className="w-5 h-5" />
                  <span>قرقره مس (Spool)</span>
                  <span className="text-[10px] text-amber-400 font-normal">وزن مجزای هر قرقره</span>
                </button>

              </div>
            </div>

            {/* Brand, Thickness & Diameter */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Brand */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  شرکت سازنده (برند)
                </label>
                <div className="flex gap-2">
                  <select
                    value={itemBrand}
                    onChange={(e) => setItemBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-blue-500"
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
                    className="w-full mt-2 px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-none"
                  />
                )}
              </div>

              {/* Diameter (سایز / قطر) */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  سایز / قطر لوله (اینچ)
                </label>
                <select
                  value={diameterInch}
                  onChange={(e) => setDiameterInch(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-100 font-mono focus:outline-none focus:border-blue-500"
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
                    className="w-full mt-2 px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-none"
                  />
                )}
              </div>

              {/* Thickness (ضخامت) */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  ضخامت گوشت لوله (میلی‌متر)
                </label>
                <select
                  value={thicknessMm}
                  onChange={(e) => setThicknessMm(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-100 font-mono focus:outline-none focus:border-blue-500"
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
              <div className="p-4 bg-purple-950/30 border border-purple-500/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300">
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
                            ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                            : 'bg-stone-900 text-stone-400 border-stone-800 hover:bg-stone-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-xs text-purple-200 mb-1">
                      تعداد کلاف ({coilLength === '50m' ? '۵۰ متری' : '۱۵ متری'})
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={coilQuantity || ''}
                      onChange={(e) => setCoilQuantity(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-stone-900 border border-purple-500/40 rounded-xl text-xs text-stone-100 font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-purple-200 mb-1">
                      {isCoilManualTotal ? 'وزن کل تمام کلاف‌ها (kg)' : 'میانگین وزن هر کلاف (kg)'}
                    </label>
                    {isCoilManualTotal ? (
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={coilManualTotalWeight || ''}
                        onChange={(e) => setCoilManualTotalWeight(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-stone-900 border border-purple-500/40 rounded-xl text-xs text-stone-100 font-mono focus:outline-none"
                      />
                    ) : (
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={coilUnitWeight || ''}
                        onChange={(e) => setCoilUnitWeight(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-stone-900 border border-purple-500/40 rounded-xl text-xs text-stone-100 font-mono focus:outline-none"
                      />
                    )}
                  </div>

                  <div className="flex flex-col justify-end">
                    <button
                      type="button"
                      onClick={() => setIsCoilManualTotal(!isCoilManualTotal)}
                      className="text-[11px] text-purple-300 hover:text-purple-200 underline cursor-pointer py-2 text-right"
                    >
                      {isCoilManualTotal ? '← تغییر به محاسبه خودکار (تعداد × وزن واحد)' : '← ثبت دستی وزن کل بار کلاف‌ها'}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-purple-300 font-mono bg-purple-900/30 p-2.5 rounded-xl flex items-center justify-between border border-purple-500/20">
                  <span>جمع وزن این قلم کلاف:</span>
                  <span className="font-bold text-sm text-purple-200">
                    {formatNumber(isCoilManualTotal ? coilManualTotalWeight : coilQuantity * coilUnitWeight, 2)} کیلوگرم
                  </span>
                </div>
              </div>
            )}

            {/* 2. STRAIGHT CONFIGURATION */}
            {itemPackaging === 'straight' && (
              <div className="p-4 bg-blue-950/30 border border-blue-500/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-300">
                    نحوه ثبت شاخه‌ها:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStraightMode('total_weight')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        straightMode === 'total_weight'
                          ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                          : 'bg-stone-900 text-stone-400 border-stone-800 hover:bg-stone-800'
                      }`}
                    >
                      ثبت وزن کل بار
                    </button>
                    <button
                      type="button"
                      onClick={() => setStraightMode('count_and_weight')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        straightMode === 'count_and_weight'
                          ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                          : 'bg-stone-900 text-stone-400 border-stone-800 hover:bg-stone-800'
                      }`}
                    >
                      ثبت بر اساس تعداد و وزن شاخه
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs text-blue-200 mb-1">
                      تعداد شاخه‌ها
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={straightQuantity || ''}
                      onChange={(e) => setStraightQuantity(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-stone-900 border border-blue-500/40 rounded-xl text-xs text-stone-100 font-mono focus:outline-none"
                    />
                  </div>

                  {straightMode === 'total_weight' ? (
                    <div>
                      <label className="block text-xs text-blue-200 mb-1">
                        وزن کل شاخه‌ها (کیلوگرم)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={straightTotalWeight || ''}
                        onChange={(e) => setStraightTotalWeight(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-stone-900 border border-blue-500/40 rounded-xl text-xs text-stone-100 font-mono focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs text-blue-200 mb-1">
                        وزن هر شاخه (کیلوگرم)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={straightUnitWeight || ''}
                        onChange={(e) => setStraightUnitWeight(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-stone-900 border border-blue-500/40 rounded-xl text-xs text-stone-100 font-mono focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="text-xs text-blue-300 font-mono bg-blue-900/30 p-2.5 rounded-xl flex items-center justify-between border border-blue-500/20">
                  <span>جمع وزن این قلم شاخه:</span>
                  <span className="font-bold text-sm text-blue-200">
                    {formatNumber(straightMode === 'total_weight' ? straightTotalWeight : straightQuantity * straightUnitWeight, 2)} کیلوگرم
                  </span>
                </div>
              </div>
            )}

            {/* 3. SPOOL CONFIGURATION (INDIVIDUAL WEIGHTS & PALLET/NON-PALLET) */}
            {itemPackaging === 'spool' && (
              <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Disc className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-300">
                      ثبت تفکیکی وزن تک‌تک قرقره‌ها:
                    </span>
                  </div>
                  <span className="text-[11px] text-amber-300 font-mono">
                    تعداد کادرهای باز شده: {spoolWeightsList.length} قرقره
                  </span>
                </div>

                {/* Pallet vs Non-Pallet Selection */}
                <div>
                  <label className="block text-[11px] text-stone-300 mb-1.5 font-bold">
                    وضعیت بسته‌بندی قرقره (پالتی یا غیر پالتی):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectSpoolType('pallet')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        spoolType === 'pallet'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400/50 shadow-sm'
                          : 'bg-stone-900/80 border-stone-700 text-stone-400 hover:border-stone-600 hover:text-stone-200'
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
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400/50 shadow-sm'
                          : 'bg-stone-900/80 border-stone-700 text-stone-400 hover:border-stone-600 hover:text-stone-200'
                      }`}
                    >
                      <span>🔘</span>
                      <span>قرقره غیر پالتی (تکی / فله)</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1">
                    {spoolType === 'pallet'
                      ? '• با انتخاب قرقره پالتی، کادرهای مجزا برای وارد کردن وزن هر قرقره روی پالت باز می‌شوند.'
                      : '• قرقره‌ها به صورت فله یا تکی هستند و وزن هر قرقره به صورت جداگانه وارد می‌شود.'}
                  </p>
                </div>

                {/* Number of Spools on this Pallet / Batch */}
                <div className="bg-stone-900/80 p-3 rounded-xl border border-stone-800 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-bold text-amber-200">
                      تعداد قرقره‌های روی این {spoolType === 'pallet' ? 'پالت' : 'قلم'}:
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSetSpoolsCount(spoolWeightsList.length - 1)}
                        disabled={spoolWeightsList.length <= 1}
                        className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 font-bold text-sm flex items-center justify-center cursor-pointer border border-stone-700"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-amber-300 text-sm px-2.5">
                        {spoolWeightsList.length} عدد
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSetSpoolsCount(spoolWeightsList.length + 1)}
                        disabled={spoolWeightsList.length >= 24}
                        className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 font-bold text-sm flex items-center justify-center cursor-pointer border border-stone-700"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Preset Quick Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-stone-400">انتخاب سریع تعداد:</span>
                    {[2, 3, 4, 6, 8, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleSetSpoolsCount(num)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                          spoolWeightsList.length === num
                            ? 'bg-amber-500/30 text-amber-200 border-amber-400 shadow-xs'
                            : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:bg-stone-700'
                        }`}
                      >
                        {num} قرقره
                      </button>
                    ))}
                  </div>
                </div>

                {/* Direct Weight Inputs for Each Spool */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-200">
                      وزن هر قرقره را در کادرهای زیر وارد نمایید:
                    </span>
                    <button
                      type="button"
                      onClick={handleClearSpoolWeights}
                      className="text-[11px] text-stone-400 hover:text-amber-300 transition-colors cursor-pointer"
                    >
                      پاک کردن همه وزن‌ها
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto p-1">
                    {spoolWeightsList.map((wt, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-stone-900/90 border border-amber-500/30 rounded-xl space-y-1.5 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/40 transition-all"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-amber-200">
                            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[11px] flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span>وزن قرقره {idx + 1}:</span>
                          </div>
                          {spoolWeightsList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSpoolSlot(idx)}
                              className="text-stone-500 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                              title="حذف این قرقره"
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
                            className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-xs text-stone-100 font-mono focus:outline-none focus:border-amber-400"
                          />
                          <span className="absolute left-2.5 top-2 text-[11px] font-mono text-stone-500">kg</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Extra Spool Button */}
                  <button
                    type="button"
                    onClick={handleAddSingleSpoolSlot}
                    className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-bold rounded-xl border border-dashed border-amber-500/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ افزودن یک قرقره دیگر به این {spoolType === 'pallet' ? 'پالت' : 'قلم'}</span>
                  </button>
                </div>

                {/* Live Real-time Weight & Count Calculation */}
                {(() => {
                  const validWts = spoolWeightsList.map((w) => parseFloat(w)).filter((w) => !isNaN(w) && w > 0);
                  const sumWts = validWts.reduce((s, w) => s + w, 0);
                  const avgWt = validWts.length > 0 ? sumWts / validWts.length : 0;

                  return (
                    <div className="text-xs text-amber-300 font-mono bg-amber-900/30 p-3 rounded-xl space-y-1.5 border border-amber-500/20">
                      <div className="flex items-center justify-between">
                        <span>تعداد قرقره‌های وزن‌گذاری شده:</span>
                        <span className="font-bold text-amber-200">
                          {validWts.length} از {spoolWeightsList.length} قرقره
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-amber-500/20 pt-1.5">
                        <span className="font-bold font-sans">مجموع وزن کل این پالت / قلم:</span>
                        <span className="font-black text-sm text-amber-200">
                          {formatNumber(sumWts, 2)} کیلوگرم
                        </span>
                      </div>
                      {validWts.length > 0 && (
                        <div className="flex items-center justify-between text-[11px] text-stone-400">
                          <span>میانگین وزن هر قرقره:</span>
                          <span>{formatNumber(avgWt, 2)} kg</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Button to push this sub-item to consignment list */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAddSubItemToConsignment}
                className="w-full py-3 bg-stone-800 hover:bg-stone-700 active:bg-stone-850 text-amber-300 hover:text-amber-200 font-bold text-xs sm:text-sm rounded-xl border border-amber-500/40 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>+ ثبت و افزودن این قلم مس به لیست محموله بارنامه</span>
              </button>
            </div>

          </div>

          {/* Section 3: Consignment Items List (اقلام محموله ثبت شده برای این بارنامه) */}
          <div className="bg-stone-950/40 p-4 sm:p-5 rounded-2xl border border-stone-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-blue-400" />
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  اقلام موجود در این محموله / بارنامه ({cargoItems.length} قلم کالا)
                </h3>
              </div>
              <div className="text-xs font-mono text-stone-300">
                مجموع وزن کل بار: <span className="text-amber-300 font-bold">{formatWeight(grandTotalWeightKg)}</span>
              </div>
            </div>

            {/* If there are spools in the consignment, display the pallet vs non-pallet weight breakdown */}
            {hasSpoolsInConsignment && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-amber-950/20 border border-amber-500/20 rounded-xl text-xs font-mono">
                <div className="flex items-center justify-between text-amber-300">
                  <span className="flex items-center gap-1.5 font-sans">
                    <span>📦</span>
                    <span>وزن قرقره‌های پالتی:</span>
                  </span>
                  <span className="font-bold">{formatWeight(palletSpoolsWeight)} ({palletSpoolsCount} عدد)</span>
                </div>
                <div className="flex items-center justify-between text-amber-300">
                  <span className="flex items-center gap-1.5 font-sans">
                    <span>🔘</span>
                    <span>وزن قرقره‌های غیر پالتی:</span>
                  </span>
                  <span className="font-bold">{formatWeight(nonPalletSpoolsWeight)} ({nonPalletSpoolsCount} عدد)</span>
                </div>
              </div>
            )}

            {cargoItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-400 bg-stone-900/40 rounded-xl border border-dashed border-stone-800">
                هنوز قلمی به این بارنامه افزوده نشده است. از کادر بالا اقلام مورد نظر را انتخاب و دکمه «افزودن قلم» را بزنید.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {cargoItems.map((item, index) => {
                  const pkgLabel = item.packagingType === 'coil' 
                    ? `کلاف (${item.coilLength === '50m' ? '۵۰ متری' : '۱۵ متری'})`
                    : item.packagingType === 'straight' 
                    ? 'شاخه' 
                    : (item.spoolType === 'non_pallet' ? 'قرقره (غیر پالتی / تکی)' : 'قرقره (پالتی)');

                  const colorClass = item.packagingType === 'coil'
                    ? 'border-purple-500/30 bg-purple-950/20 text-purple-300'
                    : item.packagingType === 'straight'
                    ? 'border-blue-500/30 bg-blue-950/20 text-blue-300'
                    : 'border-amber-500/30 bg-amber-950/20 text-amber-300';

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${colorClass}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-stone-800 text-stone-300 font-mono text-[11px] flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            <span>{pkgLabel}</span>
                            <span>•</span>
                            <span>{item.brand}</span>
                            <span>•</span>
                            <span className="font-mono">سایز {item.diameterInch}</span>
                            <span>•</span>
                            <span className="font-mono">ضخامت {item.thicknessMm}mm</span>
                          </div>
                          {item.packagingType === 'spool' && item.spoolWeights && (
                            <div className="text-[11px] text-stone-400 mt-1 font-mono">
                              وزن قرقره‌ها: [{item.spoolWeights.join(' ، ')} kg]
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-left font-mono">
                          <div className="text-stone-300">
                            تعداد: <span className="font-bold text-white">{item.quantity}</span>
                          </div>
                          <div className="font-bold text-amber-300">
                            وزن: {formatWeight(item.totalWeightKg)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveCargoItem(item.id)}
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-red-900/50 text-stone-400 hover:text-red-300 transition-colors cursor-pointer"
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
            <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-2 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-stone-400">
              مجموع اقلام: <span className="font-bold text-stone-200 font-mono">{grandTotalQuantity} قلم</span> | وزن نهایی بار: <span className="font-bold text-amber-300 font-mono text-sm">{formatWeight(grandTotalWeightKg)}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="submit"
                disabled={cargoItems.length === 0}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                  cargoItems.length === 0
                    ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    : isInbound
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{initialItem ? 'ذخیره تغییرات بارنامه' : (isInbound ? 'ثبت نهایی ورود و صدور رسید' : 'ثبت نهایی خروج و صدور حواله')}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
