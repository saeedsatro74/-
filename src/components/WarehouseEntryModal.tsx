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
  Scissors,
  ArrowRightLeft,
  Printer,
  ChevronDown,
  RotateCcw,
  Check,
  Tag,
  ShieldCheck,
  MapPin,
  User,
  Info,
  Building
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
import { WarehouseStockPickerModal, SelectedStockItemsResult } from './WarehouseStockPickerModal';
import { 
  getTodayJalaliString, 
  getCurrentPersianTimeString, 
  generateReceiptNumber 
} from '../utils/persianDate';
import { formatNumber, formatWeight, formatWeightSlash, toFaDigits } from '../utils/formatters';

interface WarehouseEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: WarehouseItem) => void;
  initialItem?: WarehouseItem | null;
  initialType?: WarehouseEntryType;
  defaultType?: WarehouseEntryType;
  initialTargetPartyName?: string;
  isLinkedToSaleFlow?: boolean;
  editingItem?: WarehouseItem | null;
}

export const WarehouseEntryModal: React.FC<WarehouseEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  initialType,
  defaultType = 'inbound',
  initialTargetPartyName,
  isLinkedToSaleFlow = false,
  editingItem,
}) => {
  const activeInitial = editingItem || initialItem;
  const activeType = initialType || defaultType;

  // Entry Type State (Inbound vs Outbound)
  const [entryType, setEntryType] = useState<WarehouseEntryType>(activeType);

  // Inbound / Outbound Header Metadata
  const [date, setDate] = useState<string>(getTodayJalaliString());
  const [time, setTime] = useState<string>(getCurrentPersianTimeString());
  const [referenceDocNumber, setReferenceDocNumber] = useState<string>('');
  const [targetPartyName, setTargetPartyName] = useState<string>('جواد شکرالهی');
  const [customerCode, setCustomerCode] = useState<string>('CU-09240');
  const [customerSubtext, setCustomerSubtext] = useState<string>('پیمانکار کشش و نورد لوله مسی پارس');
  const [customerQuotaKg, setCustomerQuotaKg] = useState<number>(197.76);
  const [driverName, setDriverName] = useState<string>('محمدرضا سلطانی');
  const [vehiclePlate, setVehiclePlate] = useState<string>('۱۲ ع ۹۳۸ - ایران ۶۸');
  const [transportCompany, setTransportCompany] = useState<string>('باربری ماهان‌سیر (۶۳ ع ۸۲ - ایران ۶۱)');
  const [destinationFactory, setDestinationFactory] = useState<string>('کارخانه اصفهان');
  const [destinationLocation, setDestinationLocation] = useState<string>('شهرک صنعتی مورچه‌خورت');
  const [warehouseLocation, setWarehouseLocation] = useState<string>('انبار مرکزی سلفچگان - هانگار C');
  const [notes, setNotes] = useState<string>('');
  const [registeredBy, setRegisteredBy] = useState<string>('انباردار مس واته');

  // Multi-item consignment list (Default populated matching images if empty)
  const [cargoItems, setCargoItems] = useState<WarehouseCargoItem[]>([]);

  // Sub-item Current Form state for INBOUND (مشخصات قلم مس جدید)
  const [inboundPackaging, setInboundPackaging] = useState<CopperPackagingType>('coil');
  const [inboundBrand, setInboundBrand] = useState<string>('صنایع مس شهید باهنر (کرمان)');
  const [inboundPurity, setInboundPurity] = useState<string>('کاتد (Cu-ETP 99.99%) A');
  const [inboundDiameter, setInboundDiameter] = useState<string>('5/8');
  const [inboundThickness, setInboundThickness] = useState<number>(0.75);
  const [inboundCoilModel, setInboundCoilModel] = useState<CoilLengthType>('15m');
  const [inboundCoilQuantity, setInboundCoilQuantity] = useState<number>(5);
  const [inboundCoilAvgWeight, setInboundCoilAvgWeight] = useState<number>(15.00);
  const [inboundSpoolType, setInboundSpoolType] = useState<SpoolPackagingType>('pallet');
  const [inboundSpoolWeights, setInboundSpoolWeights] = useState<number[]>([220.0, 222.5, 219.0, 224.5, 223.0]);
  const [inboundSingleSpoolWeight, setInboundSingleSpoolWeight] = useState<number>(225.0);
  const [inboundStraightCount, setInboundStraightCount] = useState<number>(25);
  const [inboundStraightUnitWeight, setInboundStraightUnitWeight] = useState<number>(3.0);
  const [inboundRetailWeight, setInboundRetailWeight] = useState<number>(45.0);
  const [inboundHeatNo, setInboundHeatNo] = useState<string>('BAK-CU-XX11-A');
  const [inboundShelfLocation, setInboundShelfLocation] = useState<string>('سکوی شرقی - ردیف ۳ - طبقه ۵');

  // Sub-item Current Form state for OUTBOUND (انتخاب و تخصیص اقلام از انبار)
  const [outboundCategory, setOutboundCategory] = useState<'spool' | 'coil' | 'straight' | 'retail'>('spool');
  const [outboundSelectedItem, setOutboundSelectedItem] = useState<string>('مس کاتد / کلاف مس باهنر ۳/۸ اینچ (ضخامت ۰.۷۰ میلی‌متر)');
  const [outboundCoilQty, setOutboundCoilQty] = useState<number>(10);
  const [outboundAvgWeightPerCoil, setOutboundAvgWeightPerCoil] = useState<number>(3.4);
  const [outboundBoxLocation, setOutboundBoxLocation] = useState<string>('انبار مرکزی سلفچگان / باکس B-04 / ردیف ۲');
  const [isStockPickerOpen, setIsStockPickerOpen] = useState<boolean>(false);

  const [error, setError] = useState<string>('');

  // Initialize or populate default sample data matching images
  useEffect(() => {
    if (isOpen) {
      if (activeInitial) {
        setEntryType(activeInitial.entryType);
        setDate(activeInitial.date);
        setTime(activeInitial.time || getCurrentPersianTimeString());
        setReferenceDocNumber(activeInitial.referenceDocNumber || '');
        setTargetPartyName(activeInitial.targetPartyName || 'جواد شکرالهی');
        setDriverName(activeInitial.driverName || 'محمدرضا سلطانی');
        setVehiclePlate(activeInitial.vehiclePlate || '۱۲ ع ۹۳۸ - ایران ۶۸');
        setNotes(activeInitial.notes || '');
        setRegisteredBy(activeInitial.registeredBy || 'انباردار مس واته');

        if (activeInitial.items && activeInitial.items.length > 0) {
          setCargoItems(activeInitial.items);
        }
      } else {
        setEntryType(activeType);
        setDate(getTodayJalaliString());
        setTime(getCurrentPersianTimeString());
        setReferenceDocNumber(
          activeType === 'inbound' ? 'BAR-1403-9104' : 'HAV-1403-5521'
        );
        setTargetPartyName('جواد شکرالهی');
        setCustomerCode('CU-09240');
        setDriverName('محمدرضا سلطانی');
        setVehiclePlate('۱۲ ع ۹۳۸ - ایران ۶۸');
        setTransportCompany('باربری ماهان‌سیر (۶۳ ع ۸۲ - ایران ۶۱)');
        setDestinationFactory('کارخانه اصفهان');
        setDestinationLocation('شهرک صنعتی مورچه‌خورت');
        setWarehouseLocation('انبار مرکزی سلفچگان - هانگار C');

        // Populate initial demo items matching Image 1 & Image 2 for perfect visual preview
        if (activeType === 'inbound') {
          setCargoItems([
            {
              id: 'in-item-1',
              packagingType: 'coil',
              brand: 'باهنر',
              thicknessMm: 0.75,
              diameterInch: '5/8',
              coilLength: '15m',
              quantity: 5,
              unitWeightKg: 15,
              totalWeightKg: 75.00,
              notes: 'کد رهگیری: RHR-CU-8041 • کلاف ۱۵ متری',
            },
            {
              id: 'in-item-2',
              packagingType: 'spool',
              brand: 'مهراصل',
              thicknessMm: 0.75,
              diameterInch: '1/2',
              spoolType: 'pallet',
              quantity: 5,
              unitWeightKg: 228,
              totalWeightKg: 1140.00,
              spoolWeights: [224, 226.5, 228.2, 230.1, 231.2],
              notes: 'بارکد: SPL-MEHR-094 • پالت ۶# (LWC)',
            },
            {
              id: 'in-item-3',
              packagingType: 'straight',
              brand: 'قائم اصفهان',
              thicknessMm: 1.00,
              diameterInch: '7/8',
              quantity: 20,
              unitWeightKg: 3.75,
              totalWeightKg: 75.00,
              notes: 'شاخه مس سخت ۶ متری • بسته فلزی محکم',
            },
          ]);
        } else {
          setCargoItems([
            {
              id: 'out-item-1',
              packagingType: 'coil',
              brand: 'باهنر',
              thicknessMm: 0.70,
              diameterInch: '3/8',
              coilLength: '15m',
              quantity: 10,
              unitWeightKg: 3.4,
              totalWeightKg: 34.00,
              notes: 'SN-BAH-09410-0 • ردیف رهگیری B-04',
            },
            {
              id: 'out-item-2',
              packagingType: 'spool',
              brand: 'قائم',
              thicknessMm: 0.75,
              diameterInch: '1/2',
              spoolType: 'non_pallet',
              quantity: 1,
              unitWeightKg: 222.50,
              totalWeightKg: 222.50,
              spoolWeights: [222.50],
              notes: 'تفکیک از پالت شماره ۵# - سریال PLT-664 • ردیف رهگیری A-12',
            },
          ]);
        }
      }
      setError('');
    }
  }, [isOpen, activeInitial, activeType]);

  if (!isOpen) return null;

  const isInbound = entryType === 'inbound';

  // Calculations
  const grandTotalWeightKg = cargoItems.reduce((sum, item) => sum + item.totalWeightKg, 0);
  const grandTotalQuantity = cargoItems.reduce((sum, item) => sum + item.quantity, 0);

  // Add Item Inbound Handler
  const handleAddInboundItem = () => {
    let totalWt = 0;
    let qty = 1;
    let unitWt = 0;
    let spoolWeights: number[] | undefined = undefined;

    if (inboundPackaging === 'coil') {
      qty = inboundCoilQuantity;
      unitWt = inboundCoilAvgWeight;
      totalWt = qty * unitWt;
    } else if (inboundPackaging === 'spool') {
      if (inboundSpoolType === 'pallet') {
        spoolWeights = [...inboundSpoolWeights];
        qty = spoolWeights.length;
        totalWt = spoolWeights.reduce((a, b) => a + b, 0);
        unitWt = qty > 0 ? totalWt / qty : 0;
      } else {
        qty = 1;
        unitWt = inboundSingleSpoolWeight;
        totalWt = inboundSingleSpoolWeight;
        spoolWeights = [inboundSingleSpoolWeight];
      }
    } else if (inboundPackaging === 'straight') {
      qty = inboundStraightCount;
      unitWt = inboundStraightUnitWeight;
      totalWt = qty * unitWt;
    } else if (inboundPackaging === 'retail') {
      qty = 1;
      unitWt = inboundRetailWeight;
      totalWt = inboundRetailWeight;
    }

    const newItem: WarehouseCargoItem = {
      id: 'in-item-' + Date.now(),
      packagingType: inboundPackaging,
      brand: inboundBrand.includes('باهنر') ? 'باهنر' : (inboundBrand.includes('مهراصل') ? 'مهراصل' : 'قائم'),
      thicknessMm: inboundThickness,
      diameterInch: inboundDiameter,
      coilLength: inboundPackaging === 'coil' ? inboundCoilModel : undefined,
      spoolType: inboundPackaging === 'spool' ? inboundSpoolType : undefined,
      spoolWeights: spoolWeights,
      spoolCondition: 'sealed',
      quantity: qty,
      unitWeightKg: unitWt,
      totalWeightKg: totalWt,
      notes: `کد رهگیری: ${inboundHeatNo} • جانمایی: ${inboundShelfLocation}`,
    };
    setCargoItems([...cargoItems, newItem]);
  };

  // Stock Picker Selection Handler (for Outbound)
  const handleStockPickerSelect = (result: SelectedStockItemsResult) => {
    const newItems: WarehouseCargoItem[] = [];

    result.selectedPallets.forEach((p) => {
      newItems.push({
        id: 'out-plt-' + p.id + '-' + Date.now(),
        packagingType: 'spool',
        brand: p.brand,
        diameterInch: p.diameterInch,
        thicknessMm: p.thicknessMm,
        quantity: p.spoolsCount,
        unitWeightKg: p.avgWeightKg,
        totalWeightKg: p.totalWeightKg,
        spoolType: 'pallet',
        spoolWeights: p.spoolWeights,
        notes: `پالت #${p.palletIndex} (سند ${p.referenceDocNumber})`,
      });
    });

    result.selectedLooseSpools.forEach((l) => {
      newItems.push({
        id: 'out-loose-' + l.id + '-' + Date.now(),
        packagingType: 'spool',
        brand: l.brand,
        diameterInch: l.diameterInch,
        thicknessMm: l.thicknessMm,
        quantity: 1,
        unitWeightKg: l.totalWeightKg,
        totalWeightKg: l.totalWeightKg,
        spoolType: 'non_pallet',
        notes: l.sourcePalletInfo ? `قرقره تفکیکی (${l.sourcePalletInfo})` : 'قرقره آزاد',
      });
    });

    if (result.selectedCoilsWeightKg > 0) {
      newItems.push({
        id: 'out-coil-' + Date.now(),
        packagingType: 'coil',
        brand: 'باهنر',
        diameterInch: '3/8',
        thicknessMm: 0.7,
        coilLength: '15m',
        quantity: Math.max(1, Math.round(result.selectedCoilsWeightKg / 3.4)),
        unitWeightKg: 3.4,
        totalWeightKg: result.selectedCoilsWeightKg,
        notes: 'کلاف مس انتخابی از انبار',
      });
    }

    if (result.selectedStraightsWeightKg > 0) {
      newItems.push({
        id: 'out-str-' + Date.now(),
        packagingType: 'straight',
        brand: 'مهراصل',
        diameterInch: '7/8',
        thicknessMm: 1.0,
        quantity: Math.max(1, Math.round(result.selectedStraightsWeightKg / 3.0)),
        unitWeightKg: 3.0,
        totalWeightKg: result.selectedStraightsWeightKg,
        notes: 'شاخه مس انتخابی از انبار',
      });
    }

    if (result.retailWeightKg > 0) {
      newItems.push({
        id: 'out-rtl-' + Date.now(),
        packagingType: 'retail',
        brand: 'باهنر',
        diameterInch: '1/2',
        thicknessMm: 0.75,
        quantity: 1,
        unitWeightKg: result.retailWeightKg,
        totalWeightKg: result.retailWeightKg,
        notes: 'خورده مس انتخابی از انبار',
      });
    }

    setCargoItems((prev) => [...prev, ...newItems]);
    setIsStockPickerOpen(false);
  };

  // Add Item Outbound Handler
  const handleAddOutboundItem = () => {
    const totalWt = outboundCoilQty * outboundAvgWeightPerCoil;
    const newItem: WarehouseCargoItem = {
      id: 'out-item-' + Date.now(),
      packagingType: outboundCategory,
      brand: 'باهنر',
      thicknessMm: 0.70,
      diameterInch: '3/8',
      coilLength: '15m',
      quantity: outboundCoilQty,
      unitWeightKg: outboundAvgWeightPerCoil,
      totalWeightKg: totalWt,
      notes: `تخصیص انبار: ${outboundBoxLocation}`,
    };
    setCargoItems([...cargoItems, newItem]);
  };

  // Delete cargo item
  const handleRemoveCargoItem = (id: string) => {
    setCargoItems(cargoItems.filter(it => it.id !== id));
  };

  // Form Submit / Save
  const handleSaveConsignment = () => {
    const doc: WarehouseItem = {
      id: activeInitial?.id || 'wh-' + Date.now(),
      entryType,
      date,
      time,
      referenceDocNumber,
      targetPartyName,
      driverName,
      vehiclePlate,
      registeredBy,
      notes,
      createdAt: new Date().toISOString(),
      items: cargoItems,
      totalWeightKg: grandTotalWeightKg,
      totalItemsCount: grandTotalQuantity,
      packagingType: cargoItems[0]?.packagingType || 'coil',
      brand: cargoItems[0]?.brand || 'باهنر',
      thicknessMm: cargoItems[0]?.thicknessMm || 0.75,
      diameterInch: cargoItems[0]?.diameterInch || '5/8',
      quantity: grandTotalQuantity,
      unitWeightKg: grandTotalQuantity > 0 ? grandTotalWeightKg / grandTotalQuantity : 0,
    };
    onSave(doc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 dir-rtl font-sans text-stone-800 selection:bg-amber-500 selection:text-white">
      <div className="bg-slate-50 border border-stone-300 rounded-3xl shadow-2xl w-full max-w-7xl my-auto h-[95vh] max-h-[96vh] flex flex-col overflow-hidden">
        
        {/* TOP BAR / BREADCRUMB & TYPE SWITCHER (Matching Image 1 & 2 Header) */}
        <div className="bg-white border-b border-stone-200 p-3 sm:p-4 px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          
          <div className="space-y-1">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-stone-500 font-bold">
              <span>انبار مس</span>
              <span>&gt;</span>
              <span className="text-amber-900 font-black">
                {isInbound ? 'ورود مس به انبار (رسید ورود)' : 'خروج مس از انبار (حواله بار)'}
              </span>
            </div>

            {/* Title & Tag */}
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-slate-900">
                {isInbound ? 'ثبت ورود مس به انبار (رسید ورود)' : 'ثبت خروج مس از انبار (صدور حواله بار)'}
              </h1>
              {isInbound ? (
                <span className="px-2.5 py-0.5 rounded-md bg-sky-100 text-sky-950 text-xs font-bold border border-sky-300/80">
                  پارت ورودی ۱۴۰۳ سلفچگان
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-950 text-xs font-bold border border-amber-300/80 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
                  <span>آماده بارگیری</span>
                </span>
              )}
            </div>

            <p className="text-[11px] text-stone-500 font-medium">
              {isInbound 
                ? 'ثبت، وزن‌سنجی و تفکیک مجموعه‌های ورودی بارنامه بر اساس فرم فیزیکی، گرید آلیاژی و شناسه رهگیری'
                : 'تخصیص، توزین، بارگیری و صدور سند حواله خروج مس به مقصد مشتری یا واحد تبدیل'
              }
            </p>
          </div>

          {/* Top Switcher Tabs & Close Button */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            
            <div className="bg-stone-100 p-1 rounded-2xl border border-stone-200 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setEntryType('inbound')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isInbound 
                    ? 'bg-amber-800 text-white font-black shadow-xs' 
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <PackagePlus className="w-4 h-4 text-amber-300" />
                <span>ورود به انبار (رسید)</span>
              </button>

              <button
                type="button"
                onClick={() => setEntryType('outbound')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  !isInbound 
                    ? 'bg-amber-800 text-white font-black shadow-xs' 
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Truck className="w-4 h-4 text-amber-300" />
                <span>خروج از انبار (حواله بار)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-900 flex items-center justify-center transition-all cursor-pointer border border-stone-200 shrink-0"
            >
              <X className="w-5 h-5" />
            </button>

          </div>

        </div>

        {/* MAIN BODY CONTENT (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* HEADER METADATA CARDS */}
          {isInbound ? (
            /* INBOUND HEADER CARD (Image 2) */
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <h3 className="font-black text-xs text-stone-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-800" />
                  <span>اطلاعات سند بارنامه و مبدأ بار</span>
                </h3>
                <span className="text-[11px] text-stone-600 font-bold">ورودی انبار سلفچگان</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                
                {/* Field 1: Doc Number */}
                <div className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-200">
                  <label className="text-[10px] text-stone-600 font-bold block mb-1">شماره بارنامه / سند ورود</label>
                  <div className="flex items-center gap-1 font-mono font-black text-stone-900 text-xs">
                    <span className="text-amber-800">#</span>
                    <input
                      type="text"
                      value={referenceDocNumber}
                      onChange={(e) => setReferenceDocNumber(e.target.value)}
                      className="bg-transparent font-mono font-black text-stone-900 focus:outline-none w-full"
                    />
                  </div>
                </div>

                {/* Field 2: Date */}
                <div className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-200">
                  <label className="text-[10px] text-stone-600 font-bold block mb-1">تاریخ ورود به انبار</label>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <input
                      type="text"
                      value={toFaDigits(date)}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-transparent font-bold text-stone-900 focus:outline-none w-full"
                    />
                  </div>
                </div>

                {/* Field 3: Fleet & Driver */}
                <div className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-200">
                  <label className="text-[10px] text-stone-600 font-bold block mb-1">شرکت ترابری و پلاک ناوگان</label>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                    <Truck className="w-3.5 h-3.5 text-stone-400" />
                    <input
                      type="text"
                      value={transportCompany}
                      onChange={(e) => setTransportCompany(e.target.value)}
                      className="bg-transparent font-bold text-stone-900 focus:outline-none w-full truncate"
                    />
                  </div>
                </div>

                {/* Field 4: Destination Warehouse */}
                <div className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-200">
                  <label className="text-[10px] text-stone-600 font-bold block mb-1">انبار و سکوی مقصد</label>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                    <Building className="w-3.5 h-3.5 text-stone-400" />
                    <select
                      value={warehouseLocation}
                      onChange={(e) => setWarehouseLocation(e.target.value)}
                      className="bg-transparent font-bold text-stone-900 focus:outline-none w-full cursor-pointer"
                    >
                      <option value="انبار مرکزی سلفچگان - هانگار C">انبار مرکزی سلفچگان - هانگار C</option>
                      <option value="انبار فرعی سالن B">انبار فرعی سالن B</option>
                      <option value="سکوی تخصصی کلاف و شاخه">سکوی تخصصی کلاف و شاخه</option>
                    </select>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* OUTBOUND HEADER CARDS (Image 1 - 4 Cards Grid) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Card 1: Customer Info */}
              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs space-y-2 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-xs text-stone-900">{targetPartyName}</h4>
                      <span className="text-[10px] text-stone-600 block">{customerSubtext}</span>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-700 font-mono text-[10px] font-bold">
                    {customerCode}
                  </span>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-stone-600">موجودی اعتبار سهم مس در انبار:</span>
                  <span className="font-mono text-amber-800 font-black">{toFaDigits(customerQuotaKg.toString())} کیلوگرم</span>
                </div>
                <div className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md font-bold text-left">
                  وضعیت سقف حواله: تسویه نقدی - مجاز
                </div>
              </div>

              {/* Card 2: Doc Info */}
              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-800" />
                  <span className="text-xs font-bold text-stone-600">مشخصات سند حواله</span>
                </div>
                <div className="font-mono font-black text-base text-stone-900">{referenceDocNumber}</div>
                <div className="text-[11px] text-stone-600 font-bold pt-1 border-t border-stone-100 flex items-center justify-between">
                  <span>تاریخ صدور:</span>
                  <span className="font-mono">{toFaDigits(date)}</span>
                </div>
              </div>

              {/* Card 3: Driver & Transport */}
              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs space-y-2">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-800" />
                  <span className="text-xs font-bold text-stone-600">ناوگان و راننده</span>
                </div>
                <div className="font-black text-xs text-stone-900">{driverName}</div>
                <div className="text-[11px] text-stone-600 font-bold pt-1 border-t border-stone-100 flex items-center justify-between">
                  <span>شماره پلاک:</span>
                  <span className="font-mono text-stone-900">{toFaDigits(vehiclePlate)}</span>
                </div>
              </div>

              {/* Card 4: Destination */}
              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-800" />
                  <span className="text-xs font-bold text-stone-600">مقصد نهایی تخلیه</span>
                </div>
                <div className="font-black text-xs text-stone-900">{destinationFactory}</div>
                <div className="text-[11px] text-stone-600 font-bold pt-1 border-t border-stone-100 flex items-center justify-between">
                  <span>محل تخلیه:</span>
                  <span className="text-stone-700">{destinationLocation}</span>
                </div>
              </div>

            </div>
          )}

          {/* MAIN 2-COLUMN SECTION */}
          {isInbound ? (
            /* INBOUND 2 COLUMNS (Image 2) */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* LEFT COLUMN: Registered items list (Image 2 Left) */}
              <div className="lg:col-span-5 bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3 flex flex-col justify-between">
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <h3 className="font-black text-xs text-stone-900 flex items-center gap-1.5">
                      <ListPlus className="w-4 h-4 text-slate-800" />
                      <span>اقلام ثبت‌شده در بارنامه</span>
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 font-bold text-[10px]">
                      {toFaDigits(cargoItems.length)} قلم ثبت‌شده
                    </span>
                  </div>

                  {/* Cargo Items List */}
                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {cargoItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="bg-stone-50/90 border border-stone-200/90 p-3 rounded-xl flex items-center justify-between gap-2 hover:border-amber-400 transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-xs text-stone-900">
                              {item.packagingType === 'coil' ? 'کلاف مس ۱۵ متری' : item.packagingType === 'spool' ? 'قرقره مس پالت ۶# (LWC)' : 'شاخه مس سخت ۶ متری'}
                            </span>
                            <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">
                              برند {item.brand}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 font-mono">
                            سایز: "{item.diameterInch} | ضخامت: {item.thicknessMm}mm
                          </p>
                          <p className="text-[10px] text-stone-400 font-mono truncate">{item.notes}</p>
                        </div>

                        <div className="text-left shrink-0">
                          <div className="text-xs font-black text-stone-900 font-mono">
                            {toFaDigits(item.quantity)} {item.packagingType === 'coil' ? 'کلاف' : item.packagingType === 'spool' ? 'قرقره' : 'شاخه'}
                          </div>
                          <div className="text-xs font-bold text-amber-800 font-mono">
                            {formatWeightSlash(item.totalWeightKg, 2)} کیلوگرم
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCargoItem(item.id)}
                            className="mt-1 text-red-500 hover:text-red-700 p-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weighing & Capacity Info Box (Image 2 Left Bottom) */}
                <div className="bg-stone-50/80 p-3 rounded-xl border border-stone-200 space-y-2 text-xs font-bold text-stone-700">
                  <div className="flex items-center justify-between text-[11px]">
                    <span>تطابق توزین با باسکول ورودی:</span>
                    <span className="text-emerald-700 font-black">۹۹/۸٪ همپوشانی توزین رسمی</span>
                  </div>
                  <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-800 h-full rounded-full w-[88%]"></div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-stone-500">
                    <span>توزیع فرم اقلام: ۸۸٪ قرقره | ۱۲٪ کلاف و شاخه</span>
                    <span>ظرفیت پذیرش باقی‌مانده سلفچگان: ۶۵۰ تن خالص</span>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: New Item Form (Image 2 Right) */}
              <div className="lg:col-span-7 bg-white p-4.5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
                
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <h3 className="font-black text-xs text-stone-900 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-amber-800" />
                    <span>مشخصات قلم مس جدید</span>
                  </h3>
                  <span className="text-[11px] text-stone-500 font-bold">افزودن محموله فیزیکی به بارنامه ورودی</span>
                </div>

                {/* 4 Format Tabs (Matching Image 2) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setInboundPackaging('coil')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      inboundPackaging === 'coil'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-black'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <span className="block text-xs font-bold">کلاف مس</span>
                    <span className="block text-[10px] opacity-75 font-normal">کلاف و ۵۰ متری</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInboundPackaging('straight')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      inboundPackaging === 'straight'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-black'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <span className="block text-xs font-bold">شاخه مس</span>
                    <span className="block text-[10px] opacity-75 font-normal">۶ متری سخت/نیمه‌سخت</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInboundPackaging('spool')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      inboundPackaging === 'spool'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-black'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <span className="block text-xs font-bold">قرقره مس</span>
                    <span className="block text-[10px] opacity-75 font-normal">پالت و تک LWC</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInboundPackaging('retail')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      inboundPackaging === 'retail'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-black'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <span className="block text-xs font-bold">خرده‌فروشی</span>
                    <span className="block text-[10px] opacity-75 font-normal">ضایعات و کیتویی</span>
                  </button>
                </div>

                {/* Form Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  
                  {/* Brand */}
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">شرکت سازنده (برند تولیدی)</label>
                    <select
                      value={inboundBrand}
                      onChange={(e) => setInboundBrand(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 text-stone-900 font-bold p-2.5 rounded-xl focus:outline-none focus:bg-white focus:border-amber-600"
                    >
                      <option value="صنایع مس شهید باهنر (کرمان)">صنایع مس شهید باهنر (کرمان)</option>
                      <option value="صنایع مس مهراصل">صنایع مس مهراصل</option>
                      <option value="صنایع مس قائم اصفهان">صنایع مس قائم اصفهان</option>
                    </select>
                  </div>

                  {/* Alloy Purity */}
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">خلوص آلیاژ مس</label>
                    <select
                      value={inboundPurity}
                      onChange={(e) => setInboundPurity(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 text-stone-900 font-bold p-2.5 rounded-xl focus:outline-none focus:bg-white focus:border-amber-600"
                    >
                      <option value="کاتد (Cu-ETP 99.99%) A">کاتد (Cu-ETP 99.99%) A</option>
                      <option value="مس آلیاژی DHP">مس آلیاژی DHP</option>
                    </select>
                  </div>

                  {/* Outer Diameter */}
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">سایز / قطر خارجی لوله</label>
                    <select
                      value={inboundDiameter}
                      onChange={(e) => setInboundDiameter(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 text-stone-900 font-bold p-2.5 rounded-xl focus:outline-none focus:bg-white focus:border-amber-600 font-mono"
                    >
                      <option value="5/8">5/8" (15.88 mm)</option>
                      <option value="3/8">3/8" (9.52 mm)</option>
                      <option value="1/2">1/2" (12.70 mm)</option>
                      <option value="1/4">1/4" (6.35 mm)</option>
                      <option value="3/4">3/4" (19.05 mm)</option>
                    </select>
                  </div>

                  {/* Wall Thickness */}
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">ضخامت گوشت لوله</label>
                    <select
                      value={inboundThickness}
                      onChange={(e) => setInboundThickness(parseFloat(e.target.value))}
                      className="w-full bg-stone-50 border border-stone-300 text-stone-900 font-bold p-2.5 rounded-xl focus:outline-none focus:bg-white focus:border-amber-600 font-mono"
                    >
                      <option value={0.75}>0.75 mm (گوشت استاندارد)</option>
                      <option value={0.65}>0.65 mm</option>
                      <option value={0.80}>0.80 mm</option>
                      <option value={1.00}>1.00 mm</option>
                    </select>
                  </div>

                </div>

                {/* Dynamic Packaging & Weights Form */}
                {inboundPackaging === 'spool' && (
                  <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-700">نوع بسته‌بندی قرقره مس:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInboundSpoolType('pallet')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            inboundSpoolType === 'pallet'
                              ? 'bg-amber-800 text-white font-black shadow-xs'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          پالت استاندارد (چند قرقره‌ای)
                        </button>
                        <button
                          type="button"
                          onClick={() => setInboundSpoolType('non_pallet')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            inboundSpoolType === 'non_pallet'
                              ? 'bg-amber-800 text-white font-black shadow-xs'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          قرقره منفرد / غیرپالتی (آزاد)
                        </button>
                      </div>
                    </div>

                    {inboundSpoolType === 'pallet' ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-stone-600">
                          <span>ثبت اوزان تک‌تک قرقره‌های این پالت ({toFaDigits(inboundSpoolWeights.length)} قرقره):</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setInboundSpoolWeights([...inboundSpoolWeights, 220.0])}
                              className="px-2 py-0.5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold cursor-pointer"
                            >
                              + افزودن قرقره
                            </button>
                            {inboundSpoolWeights.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setInboundSpoolWeights(inboundSpoolWeights.slice(0, -1))}
                                className="px-2 py-0.5 rounded-md bg-rose-100 hover:bg-rose-200 text-rose-800 text-[10px] font-bold cursor-pointer"
                              >
                                - حذف قرقره
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {inboundSpoolWeights.map((w, idx) => (
                            <div key={idx} className="bg-white p-2 rounded-xl border border-stone-200 text-center">
                              <label className="text-[10px] font-bold text-stone-500 block mb-0.5">
                                قرقره {toFaDigits(idx + 1)}
                              </label>
                              <div className="flex items-center justify-center gap-1 font-mono">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={w}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const updated = [...inboundSpoolWeights];
                                    updated[idx] = val;
                                    setInboundSpoolWeights(updated);
                                  }}
                                  className="w-full text-center font-black text-xs text-amber-950 bg-stone-50 focus:bg-white rounded-md py-1 border border-stone-300"
                                />
                                <span className="text-[9px] text-stone-400 font-sans">kg</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="bg-[#fbf3ec] border border-amber-200/80 p-3 rounded-2xl flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-amber-800 block font-bold">مجموع وزن پالت ورودی:</span>
                            <span className="text-xl font-black text-amber-950 font-mono">
                              {formatWeightSlash(inboundSpoolWeights.reduce((a, b) => a + b, 0), 2)} کیلوگرم خالص
                            </span>
                          </div>
                          <div className="text-left text-xs text-amber-900 font-mono font-bold">
                            میانگین: {toFaDigits((inboundSpoolWeights.reduce((a, b) => a + b, 0) / (inboundSpoolWeights.length || 1)).toFixed(1))} kg/قرقره
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        <div>
                          <label className="text-[10px] text-stone-500 font-bold block mb-1">وزن قرقره منفرد (کیلوگرم)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={inboundSingleSpoolWeight}
                            onChange={(e) => setInboundSingleSpoolWeight(parseFloat(e.target.value) || 0)}
                            className="w-full bg-white border border-stone-300 font-mono font-bold text-center py-2 rounded-xl text-stone-900 text-sm"
                          />
                        </div>
                        <div className="bg-[#fbf3ec] border border-amber-200/80 p-3 rounded-2xl text-right">
                          <span className="text-[10px] text-amber-800 font-bold block mb-0.5">وزن ثبت‌شده این قرقره آزاد</span>
                          <span className="text-xl font-black text-amber-950 font-mono">
                            {formatWeightSlash(inboundSingleSpoolWeight, 2)} کیلوگرم
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {inboundPackaging === 'coil' && (
                  <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-700">مدل کلاف انتخابی:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInboundCoilModel('15m')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            inboundCoilModel === '15m'
                              ? 'bg-amber-800 text-white font-black shadow-xs'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          کلاف ۱۵ متری
                        </button>
                        <button
                          type="button"
                          onClick={() => setInboundCoilModel('50m')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            inboundCoilModel === '50m'
                              ? 'bg-amber-800 text-white font-black shadow-xs'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          کلاف ۵۰ متری صنعتی
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                      <div>
                        <label className="text-[10px] text-stone-500 font-bold block mb-1">تعداد کلاف ورودی</label>
                        <input
                          type="number"
                          value={inboundCoilQuantity}
                          onChange={(e) => setInboundCoilQuantity(parseInt(e.target.value) || 1)}
                          className="w-full bg-white border border-stone-300 font-mono font-bold text-center py-2 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-stone-500 font-bold block mb-1">میانگین وزن هر کلاف (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={inboundCoilAvgWeight}
                          onChange={(e) => setInboundCoilAvgWeight(parseFloat(e.target.value) || 1)}
                          className="w-full bg-white border border-stone-300 font-mono font-bold text-center py-2 rounded-xl"
                        />
                      </div>

                      <div className="bg-[#fbf3ec] border border-amber-200/80 p-3 sm:p-3.5 rounded-2xl text-right">
                        <span className="text-xs font-bold text-[#92400e] block mb-1">محاسبه هوشمند وزن این قلم</span>
                        <div className="flex items-baseline justify-start gap-2 pt-0.5">
                          <span className="text-2xl sm:text-3xl font-black text-[#92400e] tracking-tight leading-none font-mono">
                            {formatWeightSlash(inboundCoilQuantity * inboundCoilAvgWeight, 2)}
                          </span>
                          <span className="text-xs font-bold text-[#92400e]">
                            کیلوگرم خالص
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {inboundPackaging === 'straight' && (
                  <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/80 space-y-3">
                    <span className="text-xs font-bold text-stone-700 block">مشخصات شاخه‌های ۶ متری:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                      <div>
                        <label className="text-[10px] text-stone-500 font-bold block mb-1">تعداد شاخه ۶ متری</label>
                        <input
                          type="number"
                          value={inboundStraightCount}
                          onChange={(e) => setInboundStraightCount(parseInt(e.target.value) || 1)}
                          className="w-full bg-white border border-stone-300 font-mono font-bold text-center py-2 rounded-xl text-stone-900"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-stone-500 font-bold block mb-1">وزن هر شاخه (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={inboundStraightUnitWeight}
                          onChange={(e) => setInboundStraightUnitWeight(parseFloat(e.target.value) || 1)}
                          className="w-full bg-white border border-stone-300 font-mono font-bold text-center py-2 rounded-xl text-stone-900"
                        />
                      </div>

                      <div className="bg-[#fbf3ec] border border-amber-200/80 p-3 rounded-2xl text-right">
                        <span className="text-xs font-bold text-[#92400e] block mb-1">مجموع وزن شاخه‌ها</span>
                        <div className="flex items-baseline justify-start gap-2 pt-0.5">
                          <span className="text-2xl sm:text-3xl font-black text-[#92400e] tracking-tight leading-none font-mono">
                            {formatWeightSlash(inboundStraightCount * inboundStraightUnitWeight, 2)}
                          </span>
                          <span className="text-xs font-bold text-[#92400e]">کیلوگرم خالص</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {inboundPackaging === 'retail' && (
                  <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/80 space-y-3">
                    <span className="text-xs font-bold text-stone-700 block">ثبت اقلام خورده‌فروشی / ضایعات / تکه‌های مس:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div>
                        <label className="text-[10px] text-stone-500 font-bold block mb-1">وزن خالص اقلام خورده (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={inboundRetailWeight}
                          onChange={(e) => setInboundRetailWeight(parseFloat(e.target.value) || 0)}
                          className="w-full bg-white border border-stone-300 font-mono font-bold text-center py-2 rounded-xl text-stone-900 text-sm"
                        />
                      </div>

                      <div className="bg-[#fbf3ec] border border-amber-200/80 p-3 rounded-2xl text-right">
                        <span className="text-xs font-bold text-[#92400e] block mb-1">محاسبه وزن ورودی خورده‌ها</span>
                        <div className="flex items-baseline justify-start gap-2 pt-0.5">
                          <span className="text-2xl sm:text-3xl font-black text-[#92400e] tracking-tight leading-none font-mono">
                            {formatWeightSlash(inboundRetailWeight, 2)}
                          </span>
                          <span className="text-xs font-bold text-[#92400e]">کیلوگرم خالص</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Heat No & Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-stone-500 block mb-1">کد رهگیری بچ تولیدی کارخانه (Heat No)</label>
                    <input
                      type="text"
                      value={inboundHeatNo}
                      onChange={(e) => setInboundHeatNo(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 font-mono font-bold py-2 px-3 rounded-xl text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-stone-500 block mb-1">جانمایی در قفسه / پالت انبار</label>
                    <input
                      type="text"
                      value={inboundShelfLocation}
                      onChange={(e) => setInboundShelfLocation(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 font-bold py-2 px-3 rounded-xl text-stone-900"
                    />
                  </div>
                </div>

                {/* Primary Add Button */}
                <button
                  type="button"
                  onClick={handleAddInboundItem}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-950 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>ثبت و افزودن این قلم به بارنامه ورودی</span>
                </button>

              </div>

            </div>
          ) : (
            /* OUTBOUND 2 COLUMNS (Image 1) */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* LEFT COLUMN: Assigned Cargo Items & Weights (Image 1 Left) */}
              <div className="lg:col-span-6 bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-4 flex flex-col justify-between">
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <h3 className="font-black text-xs text-stone-900 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-amber-800" />
                      <span>سند اقلام بارگیری و حواله خروج</span>
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 font-bold text-[10px]">
                      شماره ردیف‌های تخصیص: {toFaDigits(cargoItems.length)} قلم کالا
                    </span>
                  </div>

                  {/* Items list table */}
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {cargoItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-stone-50/90 border border-stone-200/90 p-3 rounded-xl flex items-center justify-between gap-2 hover:border-amber-400 transition-all"
                      >
                        <div className="space-y-1">
                          <h4 className="font-black text-xs text-stone-900">
                            {item.packagingType === 'coil' ? 'کلاف مس ۱۵ متری' : 'قرقره مس تکی (تفکیک از پالت)'}
                          </h4>
                          <p className="text-[11px] text-stone-600 font-bold">
                            برند {item.brand} / "{item.diameterInch} اینچ
                          </p>
                          <p className="text-[10px] text-stone-400 font-mono truncate">{item.notes}</p>
                        </div>

                        <div className="text-left shrink-0">
                          <div className="text-xs font-black text-stone-900 font-mono">
                            {toFaDigits(item.quantity)} {item.packagingType === 'coil' ? 'کلاف' : 'قرقره'}
                          </div>
                          <div className="text-xs font-bold text-amber-800 font-mono">
                            {formatWeightSlash(item.totalWeightKg, 2)} کیلوگرم
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCargoItem(item.id)}
                            className="mt-1 text-red-500 hover:text-red-700 p-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Scale / Weighing Indicator Box */}
                  <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Scale className="w-5 h-5 text-amber-800 shrink-0 animate-pulse" />
                      <div className="text-right">
                        <span className="text-xs font-black text-stone-900 block">توزین دیجیتال انبار مرکزی (باسکول متصل)</span>
                        <span className="text-[10px] text-stone-500 font-mono block">باسکول ۲، وضعیت کالیبره | تلرانس مجاز ۰.۰۵± کیلوگرم</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-lg text-xs font-bold cursor-pointer shadow-2xs"
                    >
                      تأیید مجدد وزن‌سنجی
                    </button>
                  </div>
                </div>

                {/* 3 Summary Metrics Cards */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-100 text-center font-mono">
                  <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                    <span className="text-[10px] text-stone-500 block font-sans font-bold">جمع اقلام بارگیری</span>
                    <span className="text-xs font-black text-stone-900">{toFaDigits(cargoItems.length)} ردیف</span>
                  </div>

                  <div className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-200">
                    <span className="text-[10px] text-amber-900 block font-sans font-bold">مجموع وزن خروجی کل</span>
                    <span className="text-sm font-black text-amber-950 font-mono">{formatWeightSlash(grandTotalWeightKg, 2)} کیلوگرم</span>
                  </div>

                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 block font-sans font-bold">وضعیت کسر از سهم مشتری</span>
                    <span className="text-[11px] font-black text-emerald-900 font-sans">✓ تطابق با حواله فروش</span>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: Allocation & Selection Form (Image 1 Right) */}
              <div className="lg:col-span-6 bg-white p-4.5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
                
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <h3 className="font-black text-xs text-stone-900 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-amber-800" />
                    <span>انتخاب و تخصیص اقلام از انبار</span>
                  </h3>
                  <span className="text-[11px] text-stone-500 font-bold">گام اول: درج ردیف کالا</span>
                </div>

                {/* DIRECT STOCK PICKER BANNER */}
                <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
                      <Boxes className="w-4 h-4 text-amber-800" />
                      <span>انتخاب مستقیم و هوشمند از موجودی زنده انبار</span>
                    </div>
                    <p className="text-[11px] text-amber-800 font-medium">
                      انتخاب پالت‌ها با تیک زدن قرقره‌های دلخواه، تفکیک خودکار و انتقال مستقیم به حواله خروج
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsStockPickerOpen(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Boxes className="w-3.5 h-3.5 text-amber-200" />
                    <span>باز کردن کاتالوگ و انتخابگر پالت</span>
                  </button>
                </div>

                {/* Category Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setOutboundCategory('spool')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      outboundCategory === 'spool' ? 'bg-amber-800 text-white font-black' : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    قرقره و پالت ⚖ ({toFaDigits(44)})
                  </button>

                  <button
                    type="button"
                    onClick={() => setOutboundCategory('coil')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      outboundCategory === 'coil' ? 'bg-amber-800 text-white font-black' : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    کلاف (Coil) 🟠 ({toFaDigits(24)})
                  </button>

                  <button
                    type="button"
                    onClick={() => setOutboundCategory('straight')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      outboundCategory === 'straight' ? 'bg-amber-800 text-white font-black' : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    شاخه (Straight) 📏 ({toFaDigits(12)})
                  </button>
                </div>

                {/* Dropdown Product Selector */}
                <div>
                  <label className="text-[11px] font-bold text-stone-600 block mb-1">نوع کالا و برند تجاری مس</label>
                  <select
                    value={outboundSelectedItem}
                    onChange={(e) => setOutboundSelectedItem(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 text-stone-900 font-bold p-2.5 rounded-xl focus:outline-none focus:bg-white focus:border-amber-600 text-xs"
                  >
                    <option value="مس کاتد / کلاف مس باهنر ۳/۸ اینچ (ضخامت ۰.۷۰ میلی‌متر)">
                      مس کاتد / کلاف مس باهنر ۳/۸ اینچ (ضخامت ۰.۷۰ میلی‌متر)
                    </option>
                    <option value="قرقره مس قائم ۱/۲ اینچ (تک میل)">قرقره مس قائم ۱/۲ اینچ (تک میل)</option>
                    <option value="کلاف مس مهراصل ۵/۸ اینچ">کلاف مس مهراصل ۵/۸ اینچ</option>
                  </select>
                </div>

                {/* Packaging & Stock Box */}
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80 flex items-center justify-between text-xs font-bold text-stone-700">
                  <div>
                    <span className="text-[10px] text-stone-500 block">نوع بسته‌بندی</span>
                    <span>کلاف ۱۵ متری کارتن‌دار 📦</span>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-[10px] text-stone-500 block font-sans">موجودی آزاد ضمن پارت</span>
                    <span className="text-amber-800 font-black">{toFaDigits(68)} کیلوگرم ({toFaDigits(20)} کلاف)</span>
                  </div>
                </div>

                {/* Stepper Quantity Request */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-stone-600 block">تعداد کلاف درخواستی جهت خروج</label>
                  <div className="flex items-center justify-between bg-stone-100 p-2 rounded-xl border border-stone-200">
                    <button
                      type="button"
                      onClick={() => setOutboundCoilQty(Math.max(1, outboundCoilQty - 1))}
                      className="w-9 h-9 rounded-lg bg-white text-stone-800 font-black text-lg flex items-center justify-center cursor-pointer shadow-2xs hover:bg-amber-100"
                    >
                      -
                    </button>
                    <span className="font-mono font-black text-base text-stone-900">{toFaDigits(outboundCoilQty)} کلاف</span>
                    <button
                      type="button"
                      onClick={() => setOutboundCoilQty(outboundCoilQty + 1)}
                      className="w-9 h-9 rounded-lg bg-white text-stone-800 font-black text-lg flex items-center justify-center cursor-pointer shadow-2xs hover:bg-amber-100"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-stone-500 font-bold">
                    <span>ضریب میانگین: ۳.۴ کیلو / کلاف</span>
                    <span>وزن تقریبی انتخابی: <strong className="text-amber-800 font-mono font-black">{formatWeightSlash(outboundCoilQty * 3.4, 2)} کیلوگرم</strong></span>
                  </div>
                </div>

                {/* Location */}
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 flex items-center justify-between">
                  <span>محل استقرار در انبار مبدأ:</span>
                  <span className="text-stone-900 font-mono">انبار مرکزی سلفچگان / باکس B-04 / ردیف ۲</span>
                </div>

                {/* Primary Add Button */}
                <button
                  type="button"
                  onClick={handleAddOutboundItem}
                  className="w-full py-3 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-amber-300" />
                  <span>+ افزودن به لیست بارگیری حواله</span>
                </button>

                <p className="text-[10px] text-stone-500 leading-snug">
                  ✓ تأییدیه کنترل کیفیت پارت باهنر قبلاً ثبت شده و سریال‌های اختصاصی دارای گواهی آزمون متالورژی هستند.
                </p>

              </div>

            </div>
          )}

        </div>

        {/* BOTTOM FOOTER SUMMARY & ACTIONS BAR (Matching Image 1 & 2 Footer) */}
        <div className="bg-white border-t border-stone-200 p-3.5 sm:p-4 px-5 space-y-3 shrink-0">
          
          {/* Top Info line */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-bold text-stone-700 border-b border-stone-100 pb-2">
            <div className="flex items-center gap-2 text-[11px]">
              <Info className="w-4 h-4 text-amber-800 shrink-0" />
              <span>
                {isInbound 
                  ? 'کلیه اقلام کلاف و آلیاژ مس، مشمول ۱٪ تلرانس باسکول رسمی هستند.'
                  : 'کسر مستقیم از کاردکس مس انبار سلفچگان • تطابق بارگیر با استانداردهای حمل مفتول و کلاف'
                }
              </span>
            </div>

            <div className="flex items-center gap-3 font-mono text-stone-900">
              <span>مجموع اقلام: {toFaDigits(cargoItems.length)} قلم</span>
              <span>•</span>
              <span>مجموع وزن کل: <strong className="text-amber-800 font-black">{formatWeightSlash(grandTotalWeightKg, 2)} کیلوگرم</strong></span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSaveConsignment}
                className={`flex-1 sm:flex-none px-5 py-2.5 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                  isInbound ? 'bg-amber-800 hover:bg-amber-900' : 'bg-amber-800 hover:bg-amber-900'
                }`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isInbound ? 'تأیید نهایی ورود و صدور رسید انبار' : 'تأیید و صدور نهایی حواله خروج مس'}</span>
              </button>

              <button
                type="button"
                onClick={() => alert('پیش‌نویس آماده چاپ است.')}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold border border-stone-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-stone-600" />
                <span>{isInbound ? 'چاپ پیش‌نویس' : 'چاپ فاکتور و مجوز خروج انبار'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-500 hover:text-stone-800 text-xs font-bold cursor-pointer"
            >
              انصراف و بازگشت
            </button>

          </div>

        </div>

      </div>

      {/* Warehouse Stock Picker Modal for Direct Outbound Selection */}
      {isStockPickerOpen && (
        <WarehouseStockPickerModal
          isOpen={isStockPickerOpen}
          onClose={() => setIsStockPickerOpen(false)}
          onConfirm={handleStockPickerSelect}
          title="انتخاب و تفکیک اقلام خروجی از موجودی زنده انبار"
        />
      )}

    </div>
  );
};
