import React, { useState, useMemo } from 'react';
import { 
  PackagePlus, 
  PackageMinus, 
  Layers, 
  Building2, 
  Gauge, 
  Ruler, 
  Scale, 
  Search, 
  Filter, 
  Printer, 
  Edit3, 
  Trash2, 
  Download, 
  RefreshCw, 
  LogOut, 
  Calendar, 
  Clock, 
  Boxes, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Plus, 
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  ChevronDown,
  KeyRound,
  ArrowRight,
  Truck,
  Disc,
  FileText,
  Warehouse,
  X
} from 'lucide-react';
import { 
  WarehouseItem, 
  WarehouseInventorySummary, 
  CopperPackagingType,
  SpoolPackagingType 
} from '../types';
import { 
  calculateWarehouseInventory, 
  COPPER_BRANDS, 
  addWarehouseItem, 
  updateWarehouseItem, 
  deleteWarehouseItem 
} from '../utils/storage';
import { formatNumber, formatWeight } from '../utils/formatters';
import { WarehouseEntryModal } from './WarehouseEntryModal';
import { WarehouseReceiptModal } from './WarehouseReceiptModal';
import { WarehouseLiveStockCatalog } from './WarehouseLiveStockCatalog';

interface WarehousePortalViewProps {
  items: WarehouseItem[];
  onAddItem?: (item: WarehouseItem) => void;
  onUpdateItem?: (item: WarehouseItem) => void;
  onDeleteItem?: (id: string) => void;
  onBack?: () => void;
  onLogout?: () => void;
  onChangePassword?: () => void;
  userRole?: 'admin' | 'warehouse';
}

export const WarehousePortalView: React.FC<WarehousePortalViewProps> = ({
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onBack,
  onLogout,
  onChangePassword,
  userRole = 'warehouse',
}) => {
  // Navigation & Sub-View state
  const [activeWarehouseTab, setActiveWarehouseTab] = useState<'live_stock' | 'transactions'>('live_stock');

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [packagingFilter, setPackagingFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');

  // Modals state
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryModalType, setEntryModalType] = useState<'inbound' | 'outbound'>('inbound');
  const [editingItem, setEditingItem] = useState<WarehouseItem | null>(null);

  const [viewingReceiptItem, setViewingReceiptItem] = useState<WarehouseItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<WarehouseItem | null>(null);

  // Calculate live inventory totals
  const inventorySummary = useMemo(() => {
    return calculateWarehouseInventory(items);
  }, [items]);

  // Filter transactions for Cardex Ledger
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Type Filter
      if (typeFilter !== 'all' && item.entryType !== typeFilter) return false;

      // Brand Filter
      if (brandFilter !== 'all') {
        const itemBrand = item.brand || (item.items && item.items[0]?.brand);
        if (itemBrand !== brandFilter) return false;
      }

      // Packaging Filter
      if (packagingFilter !== 'all') {
        if (packagingFilter === 'spool_pallet') {
          const isPallet = item.spoolType !== 'non_pallet' && item.items?.some(i => i.spoolType !== 'non_pallet');
          if (!isPallet) return false;
        } else if (packagingFilter === 'spool_non_pallet') {
          const isNonPallet = item.spoolType === 'non_pallet' || item.items?.some(i => i.spoolType === 'non_pallet');
          if (!isNonPallet) return false;
        } else {
          const pType = item.packagingType || (item.items && item.items[0]?.packagingType);
          if (pType !== packagingFilter) return false;
        }
      }

      // Free-text Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const docNo = (item.referenceDocNumber || item.id).toLowerCase();
        const party = (item.targetPartyName || '').toLowerCase();
        const driver = (item.driverName || '').toLowerCase();
        const plate = (item.vehiclePlate || '').toLowerCase();
        const brand = (item.brand || '').toLowerCase();
        const diameter = (item.diameterInch || '').toLowerCase();
        const notes = (item.notes || '').toLowerCase();

        const matchItems = item.items?.some(
          (sub) =>
            (sub.brand || '').toLowerCase().includes(q) ||
            (sub.diameterInch || '').toLowerCase().includes(q) ||
            String(sub.thicknessMm || '').includes(q) ||
            (sub.packagingType || '').toLowerCase().includes(q)
        );

        if (
          !docNo.includes(q) &&
          !party.includes(q) &&
          !driver.includes(q) &&
          !plate.includes(q) &&
          !brand.includes(q) &&
          !diameter.includes(q) &&
          !notes.includes(q) &&
          !matchItems
        ) {
          return false;
        }
      }

      return true;
    });
  }, [items, typeFilter, packagingFilter, brandFilter, searchQuery]);

  // Handle open add modal
  const handleOpenAdd = (type: 'inbound' | 'outbound' = 'inbound') => {
    setEditingItem(null);
    setEntryModalType(type);
    setIsEntryModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (item: WarehouseItem) => {
    setEditingItem(item);
    setEntryModalType(item.entryType);
    setIsEntryModalOpen(true);
  };

  // Handle save item from modal
  const handleSaveItem = (savedItem: WarehouseItem) => {
    if (editingItem) {
      if (onUpdateItem) onUpdateItem(savedItem);
      else updateWarehouseItem(savedItem);
    } else {
      if (onAddItem) onAddItem(savedItem);
      else addWarehouseItem(savedItem);
    }
    setIsEntryModalOpen(false);
  };

  // Handle delete item
  const handleConfirmDelete = () => {
    if (itemToDelete) {
      if (onDeleteItem) onDeleteItem(itemToDelete.id);
      else deleteWarehouseItem(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  // Handle view receipt
  const handleViewReceipt = (item: WarehouseItem) => {
    setViewingReceiptItem(item);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredItems.length === 0) return;

    const headers = [
      'نوع سند',
      'شماره بارنامه/سند',
      'تاریخ',
      'ساعت',
      'طرف‌حساب',
      'راننده',
      'پلاک خودرو',
      'تعداد کل واحدها',
      'وزن کل (کیلوگرم)',
      'توضیحات',
    ];

    const rows = filteredItems.map((item) => [
      item.entryType === 'inbound' ? 'ورود (رسید)' : 'خروج (حواله)',
      item.referenceDocNumber || item.id,
      item.date,
      item.time || '',
      item.targetPartyName || '',
      item.driverName || '',
      item.vehiclePlate || '',
      item.totalItemsCount || item.quantity || 1,
      item.totalWeightKg,
      item.notes || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `انبار_مس_واته_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 overflow-y-auto min-h-screen text-slate-800 dir-rtl font-sans selection:bg-amber-500 selection:text-white">
      
      {/* Top Fixed White Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        
        {/* Total Inventory Metric in Header (Requested by user) */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-md border border-amber-300 shrink-0">
            <Warehouse className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2.5 bg-gradient-to-r from-amber-50 to-orange-50/80 border border-amber-200/90 px-3.5 py-1.5 rounded-2xl shadow-2xs">
            <Scale className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-slate-700">موجودی کل انبار:</span>
            <span className="text-base sm:text-lg font-black font-mono text-amber-950">
              {formatNumber(inventorySummary.totalStockKg / 1000, 3)} تن
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          
          <button
            type="button"
            onClick={() => handleOpenAdd('inbound')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <PackagePlus className="w-4 h-4" />
            <span>+ ثبت ورود مس (رسید انبار)</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAdd('outbound')}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <PackageMinus className="w-4 h-4" />
            <span>- ثبت خروج مس (حواله بار)</span>
          </button>

          {onChangePassword && (
            <button
              type="button"
              onClick={onChangePassword}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
              title="تغییر رمز عبور"
            >
              <KeyRound className="w-4 h-4" />
            </button>
          )}

          {(onBack || onLogout) && (
            <button
              type="button"
              onClick={onBack || onLogout}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span>بازگشت به پنل اصلی</span>
            </button>
          )}

        </div>

      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        
        {/* HERO CENTERED 3D SEARCH SECTION - Occupies full viewport height initially */}
        <div className="min-h-[70vh] flex flex-col items-center justify-center w-full max-w-3xl mx-auto py-12 text-center space-y-6">
          
          <div className="w-full relative group">
            {/* Ambient 3D Glow Backlight */}
            <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-400/40 via-orange-400/40 to-amber-500/40 rounded-3xl blur-lg opacity-80 group-hover:opacity-100 transition duration-300"></div>

            {/* 3D Glass-Embossed Shell */}
            <div className="relative bg-gradient-to-b from-white via-slate-50 to-slate-100/95 border-2 border-slate-300/80 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-[0_20px_45px_-10px_rgba(0,0,0,0.15),0_8px_20px_rgba(0,0,0,0.08),inset_0_2px_3px_rgba(255,255,255,0.95)] flex items-center gap-3.5 transition-all duration-300 focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-500/20">
              
              {/* 3D Tactile Search Icon Badge */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-slate-950 flex items-center justify-center shrink-0 shadow-[0_6px_15px_rgba(245,158,11,0.45),inset_0_1px_1px_rgba(255,255,255,0.7)] border border-amber-300/90">
                <Search className="w-6 h-6 sm:w-7 sm:h-7 text-slate-950 drop-shadow-xs" />
              </div>

              {/* Input */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در انبار (برند باهنر، مهراصل، 3/8، 1/2، کلاف، قرقره، شاخه، راننده...)"
                className="w-full bg-transparent border-0 text-sm sm:text-base font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 py-1.5"
              />

              {/* Clear Button */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer shrink-0"
                  title="پاک کردن"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {/* 3D Badge Indicator */}
              <div className="hidden sm:flex items-center gap-1 text-xs font-mono text-slate-400 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl shrink-0">
                <span>جستجوی ۳ بعدی</span>
              </div>
            </div>
          </div>

          {/* Minimal scroll hint */}
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 pt-6 animate-bounce">
            <ChevronDown className="w-4 h-4 text-amber-500" />
            <span>برای مشاهده تمام اقلام موجود در انبار به پایین اسکرول کنید</span>
            <ChevronDown className="w-4 h-4 text-amber-500" />
          </div>

        </div>

        {/* DISTANCED INVENTORY CATALOG SECTION - Placed far below search hero */}
        <div className="pt-20 border-t border-slate-200/80">
          
          {/* TAB 1: LIVE PHYSICAL INVENTORY CATALOG */}
          {activeWarehouseTab === 'live_stock' && (
            <WarehouseLiveStockCatalog
              items={items}
              inventorySummary={inventorySummary}
              externalSearchQuery={searchQuery}
              onOpenAdd={handleOpenAdd}
              onViewReceipt={handleViewReceipt}
              onUpdateItem={(item) => {
                if (onUpdateItem) onUpdateItem(item);
                else updateWarehouseItem(item);
              }}
              onAddItem={(item) => {
                if (onAddItem) onAddItem(item);
                else addWarehouseItem(item);
              }}
            />
          )}

          {/* TAB 2: CONSIGNMENTS LEDGER / TRANSACTIONS TABLE */}
        {activeWarehouseTab === 'transactions' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-0">
            
            {/* Filters Toolbar */}
            <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              
              <div className="flex flex-wrap items-center gap-2 text-xs">
                
                {/* Type Switch */}
                <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setTypeFilter('all')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      typeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    همه اسناد ({items.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeFilter('inbound')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      typeFilter === 'inbound' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:text-emerald-900'
                    }`}
                  >
                    ورود (رسید)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeFilter('outbound')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      typeFilter === 'outbound' ? 'bg-amber-600 text-white shadow-2xs' : 'text-amber-700 hover:text-amber-900'
                    }`}
                  >
                    خروج (حواله)
                  </button>
                </div>

                {/* Packaging Filter */}
                <select
                  value={packagingFilter}
                  onChange={(e) => setPackagingFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">همه قالب‌ها (کلاف، شاخه، قرقره)</option>
                  <option value="coil">فقط کلاف مس (۱۵ و ۵۰ متری)</option>
                  <option value="straight">فقط شاخه مس</option>
                  <option value="spool">همه قرقره‌ها</option>
                  <option value="spool_pallet">📦 فقط قرقره پالتی</option>
                  <option value="spool_non_pallet">🔘 فقط قرقره غیر پالتی (فله)</option>
                </select>

                {/* Brand Filter */}
                <select
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">همه برندها</option>
                  {COPPER_BRANDS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>

              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                disabled={filteredItems.length === 0}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>خروجی اکسل</span>
              </button>

            </div>

            {/* Consignments List Table */}
            <div className="overflow-x-auto">
              {filteredItems.length === 0 ? (
                <div className="p-12 text-center text-slate-500 space-y-2">
                  <Boxes className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">هیچ سندی با مشخصات انتخابی پیدا نشد.</p>
                </div>
              ) : (
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="p-2.5">نوع سند</th>
                      <th className="p-2.5">شماره بارنامه / سند</th>
                      <th className="p-2.5">تاریخ</th>
                      <th className="p-2.5">طرف‌حساب / راننده</th>
                      <th className="p-2.5">ریز اقلام مس</th>
                      <th className="p-2.5 text-center">تعداد واحد</th>
                      <th className="p-2.5 text-left">وزن کل</th>
                      <th className="p-2.5 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((consignment) => {
                      const isInbound = consignment.entryType === 'inbound';
                      const subItems = consignment.items && consignment.items.length > 0
                        ? consignment.items
                        : [
                            {
                              id: consignment.id + '-1',
                              packagingType: ((consignment as any).packagingType === 'roll' ? 'coil' : consignment.packagingType) || 'coil',
                              brand: consignment.brand || 'باهنر',
                              thicknessMm: consignment.thicknessMm || 0.75,
                              diameterInch: consignment.diameterInch || '5/8',
                              coilLength: consignment.coilLength,
                              quantity: consignment.quantity || 1,
                              totalWeightKg: consignment.totalWeightKg || 0,
                              spoolWeights: consignment.spoolWeights,
                            }
                          ];

                      const totalCount = consignment.totalItemsCount || consignment.quantity || subItems.reduce((s, it) => s + (it.quantity || 0), 0);

                      return (
                        <tr key={consignment.id} className="hover:bg-slate-50 transition-colors">
                          
                          {/* Type */}
                          <td className="p-2.5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[11px] border ${
                              isInbound 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {isInbound ? <TrendingUp className="w-3 h-3 text-emerald-600" /> : <TrendingDown className="w-3 h-3 text-amber-600" />}
                              <span>{isInbound ? 'ورود' : 'خروج'}</span>
                            </span>
                          </td>

                          {/* Reference Doc */}
                          <td className="p-2.5 whitespace-nowrap font-mono font-bold text-slate-900">
                            {consignment.referenceDocNumber || consignment.id}
                          </td>

                          {/* Date */}
                          <td className="p-2.5 whitespace-nowrap font-mono text-slate-600">
                            {consignment.date}
                          </td>

                          {/* Party & Driver */}
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900">
                              {consignment.targetPartyName || 'عمومی'}
                            </div>
                            {(consignment.driverName || consignment.vehiclePlate) && (
                              <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                                <span>{consignment.driverName}</span>
                                {consignment.vehiclePlate && (
                                  <span className="bg-slate-100 px-1 py-0.5 rounded text-[10px] text-slate-600 border border-slate-200">
                                    {consignment.vehiclePlate}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Sub items */}
                          <td className="p-2.5 max-w-md">
                            <div className="space-y-1">
                              {subItems.map((it, idx) => {
                                const pkgLabel = it.packagingType === 'coil'
                                  ? `کلاف (${it.coilLength === '50m' ? '۵۰m' : '۱۵m'})`
                                  : it.packagingType === 'straight'
                                  ? 'شاخه'
                                  : (it.spoolType === 'non_pallet' ? 'قرقره آزاد' : 'قرقره پالت');

                                return (
                                  <div key={it.id || idx} className="flex flex-wrap items-center gap-1 text-[11px]">
                                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold border border-slate-200">
                                      {pkgLabel}
                                    </span>
                                    <span className="font-bold text-slate-800">{it.brand}</span>
                                    <span className="text-slate-500 font-mono">سایز {it.diameterInch}</span>
                                    <span className="text-slate-500 font-mono">{it.thicknessMm}mm</span>
                                    <span className="text-slate-900 font-mono font-bold">[{it.quantity} عدد: {formatWeight(it.totalWeightKg)}]</span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>

                          {/* Count */}
                          <td className="p-2.5 text-center font-mono font-bold text-slate-800 whitespace-nowrap">
                            {totalCount}
                          </td>

                          {/* Total Weight */}
                          <td className="p-2.5 text-left font-mono font-black text-xs whitespace-nowrap">
                            <span className={isInbound ? 'text-emerald-700' : 'text-amber-700'}>
                              {isInbound ? '+' : '-'}{formatWeight(consignment.totalWeightKg)}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setViewingReceiptItem(consignment)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                title="چاپ قبض"
                              >
                                <Printer className="w-3.5 h-3.5 text-blue-600" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEdit(consignment)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                title="ویرایش"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setItemToDelete(consignment)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        )}

        </div>

      </main>

      {/* Entry / Exit Modal */}
      <WarehouseEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        onSave={handleSaveItem}
        initialItem={editingItem}
        defaultType={entryModalType}
      />

      {/* Official Receipt Print Modal */}
      <WarehouseReceiptModal
        item={viewingReceiptItem}
        onClose={() => setViewingReceiptItem(null)}
      />

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 max-w-sm w-full shadow-xl space-y-3 text-slate-800">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-bold text-slate-900">حذف سند بارنامه</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              آیا از حذف سند {itemToDelete.entryType === 'inbound' ? 'ورود' : 'خروج'} شماره {itemToDelete.referenceDocNumber || itemToDelete.id} به وزن {formatWeight(itemToDelete.totalWeightKg)} اطمینان دارید؟
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer shadow-xs"
              >
                بله، حذف شود
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
