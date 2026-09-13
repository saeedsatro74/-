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
  FileText
} from 'lucide-react';
import { 
  WarehouseItem, 
  CopperPackagingType, 
  WarehouseEntryType,
  WarehouseInventorySummary
} from '../types';
import { 
  COPPER_BRANDS, 
  COPPER_PACKAGING_TYPES, 
  calculateWarehouseInventory,
  addWarehouseItem,
  updateWarehouseItem,
  deleteWarehouseItem
} from '../utils/storage';
import { formatNumber, formatWeight } from '../utils/formatters';
import { useLivePersianClock } from '../utils/persianDate';
import { WATTEH_LOGO } from '../assets/branding';
import { WarehouseEntryModal } from './WarehouseEntryModal';
import { WarehouseReceiptModal } from './WarehouseReceiptModal';
import { WarehouseLiveStockCatalog } from './WarehouseLiveStockCatalog';

interface WarehousePortalViewProps {
  items: WarehouseItem[];
  onAddItem?: (item: WarehouseItem) => void;
  onUpdateItem?: (item: WarehouseItem) => void;
  onDeleteItem?: (id: string) => void;
  onViewReceipt?: (item: WarehouseItem) => void;
  onLogout?: () => void;
  onChangePassword?: () => void;
  onBack?: () => void;
  userRole?: 'admin' | 'staff' | 'client' | 'warehouse';
  companyStockKg?: number;
  onSyncCompanyStock?: (newStock: number) => void;
}

export const WarehousePortalView: React.FC<WarehousePortalViewProps> = ({
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onViewReceipt,
  onLogout,
  onChangePassword,
  onBack,
  userRole = 'warehouse',
  companyStockKg = 0,
  onSyncCompanyStock,
}) => {
  const { date: liveDate, time: liveTime } = useLivePersianClock();

  // Active warehouse navigation tab
  const [activeWarehouseTab, setActiveWarehouseTab] = useState<'live_stock' | 'transactions'>('live_stock');

  // Modals state
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryModalType, setEntryModalType] = useState<WarehouseEntryType>('inbound');
  const [editingItem, setEditingItem] = useState<WarehouseItem | null>(null);
  const [viewingReceiptItem, setViewingReceiptItem] = useState<WarehouseItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<WarehouseItem | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [packagingFilter, setPackagingFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');

  // Inventory Calculations
  const inventorySummary: WarehouseInventorySummary = useMemo(() => {
    return calculateWarehouseInventory(items);
  }, [items]);

  // Filtered Consignments for Cardex
  const filteredItems = useMemo(() => {
    return items.filter((consignment) => {
      // Type Filter
      if (typeFilter !== 'all' && consignment.entryType !== typeFilter) return false;

      const subItems = consignment.items && consignment.items.length > 0 
        ? consignment.items 
        : [
            {
              packagingType: ((consignment as any).packagingType === 'roll' ? 'coil' : consignment.packagingType) || 'coil',
              brand: consignment.brand || 'باهنر',
              diameterInch: consignment.diameterInch || '5/8',
              thicknessMm: consignment.thicknessMm || 0.75,
            }
          ];

      // Packaging Filter
      if (packagingFilter !== 'all') {
        if (packagingFilter === 'spool_pallet') {
          const hasPkg = subItems.some((sub) => sub.packagingType === 'spool' && sub.spoolType !== 'non_pallet');
          if (!hasPkg) return false;
        } else if (packagingFilter === 'spool_non_pallet') {
          const hasPkg = subItems.some((sub) => sub.packagingType === 'spool' && sub.spoolType === 'non_pallet');
          if (!hasPkg) return false;
        } else {
          const hasPkg = subItems.some((sub) => sub.packagingType === packagingFilter);
          if (!hasPkg) return false;
        }
      }

      // Brand Filter
      if (brandFilter !== 'all') {
        const hasBrand = subItems.some((sub) => sub.brand === brandFilter);
        if (!hasBrand) return false;
      }

      // Text Search
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchTarget = (consignment.targetPartyName || '').toLowerCase().includes(query);
        const matchDriver = (consignment.driverName || '').toLowerCase().includes(query);
        const matchPlate = (consignment.vehiclePlate || '').toLowerCase().includes(query);
        const matchDoc = (consignment.referenceDocNumber || '').toLowerCase().includes(query);
        const matchNotes = (consignment.notes || '').toLowerCase().includes(query);
        const matchSubItems = subItems.some(
          (sub) =>
            sub.brand.toLowerCase().includes(query) ||
            sub.diameterInch.toLowerCase().includes(query) ||
            String(sub.thicknessMm).includes(query) ||
            (sub.notes || '').toLowerCase().includes(query)
        );

        if (!matchTarget && !matchDriver && !matchPlate && !matchDoc && !matchNotes && !matchSubItems) {
          return false;
        }
      }

      return true;
    });
  }, [items, typeFilter, packagingFilter, brandFilter, searchQuery]);

  // Open Add Modal
  const handleOpenAdd = (type: WarehouseEntryType) => {
    setEditingItem(null);
    setEntryModalType(type);
    setIsEntryModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: WarehouseItem) => {
    setEditingItem(item);
    setEntryModalType(item.entryType);
    setIsEntryModalOpen(true);
  };

  // Handle Save
  const handleSaveItem = (item: WarehouseItem) => {
    if (editingItem) {
      if (onUpdateItem) {
        onUpdateItem(item);
      } else {
        updateWarehouseItem(item);
      }
    } else {
      if (onAddItem) {
        onAddItem(item);
      } else {
        addWarehouseItem(item);
      }
    }
    setIsEntryModalOpen(false);
    setEditingItem(null);
  };

  // View Receipt Handler
  const handleViewReceipt = (item: WarehouseItem) => {
    setViewingReceiptItem(item);
    if (onViewReceipt) {
      onViewReceipt(item);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (itemToDelete) {
      if (onDeleteItem) {
        onDeleteItem(itemToDelete.id);
      } else {
        deleteWarehouseItem(itemToDelete.id);
      }
      setItemToDelete(null);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredItems.length === 0) return;

    const headers = [
      'شماره بارنامه/سند',
      'نوع عملیات',
      'تاریخ',
      'ساعت',
      'طرف‌حساب',
      'نام راننده',
      'شماره پلاک',
      'تعداد کل اقلام',
      'وزن کل (کیلوگرم)',
      'شرح اقلام بارنامه',
      'توضیحات'
    ];

    const rows = filteredItems.map((c) => {
      const subItems = c.items && c.items.length > 0 ? c.items : [];
      const subItemsText = subItems
        .map(
          (sub) =>
            `${sub.packagingType === 'coil' ? `کلاف (${sub.coilLength || '15m'})` : sub.packagingType === 'straight' ? 'شاخه' : 'قرقره'} ${sub.brand} سایز ${sub.diameterInch} ضخامت ${sub.thicknessMm}mm [${sub.quantity} عدد - ${sub.totalWeightKg}kg]`
        )
        .join(' | ');

      return [
        c.referenceDocNumber || c.id,
        c.entryType === 'inbound' ? 'ورود به انبار' : 'خروج از انبار',
        c.date,
        c.time || '',
        c.targetPartyName || '',
        c.driverName || '',
        c.vehiclePlate || '',
        c.totalItemsCount || c.quantity || 1,
        c.totalWeightKg,
        subItemsText,
        c.notes || ''
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `watteh-warehouse-consignments-${liveDate.replace(/\//g, '-')}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 pb-16 dir-rtl font-sans">
      
      {/* Top Modern Dark Header */}
      <header className="bg-stone-900/90 backdrop-blur-md sticky top-0 z-30 shadow-xl border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            
            {/* Logo & Portal Title */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl overflow-hidden bg-blue-600 border border-blue-500/40 shadow-lg shadow-blue-950/40 flex items-center justify-center shrink-0">
                <img 
                  src={WATTEH_LOGO} 
                  alt="لوگوی مس واته" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                    سامانه هوشمند انبارداری مس واته
                  </h1>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    userRole === 'admin'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  }`}>
                    {userRole === 'admin' ? 'مدیریت بازرگانی' : 'انبار مرکزی'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5 font-mono">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-stone-500" />
                    <span>{liveDate}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="dir-ltr font-bold text-amber-300">{liveTime}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  title="بازگشت به پنل مدیریت"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>پنل مدیریت</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleOpenAdd('inbound')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-500/50"
              >
                <PackagePlus className="w-4 h-4" />
                <span>+ ثبت ورود مس (رسید انبار)</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAdd('outbound')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-lg shadow-amber-950/40 flex items-center gap-1.5 transition-all cursor-pointer border border-amber-500/50"
              >
                <PackageMinus className="w-4 h-4" />
                <span>- ثبت خروج مس (حواله بار)</span>
              </button>

              {onChangePassword && (
                <button
                  type="button"
                  onClick={onChangePassword}
                  className="p-2.5 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer border border-stone-700"
                  title="تغییر رمز عبور"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
              )}

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-2.5 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer border border-stone-700"
                  title="خروج از سامانه"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Top Metric Cards (Customized per User specs: Coils 15m/50m, Straight count/weight, Spools individual weights) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Stock Weight */}
          <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 p-5 rounded-3xl shadow-xl border border-stone-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-400 font-bold">کل موجودی فیزیکی مس</span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Boxes className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-black font-mono text-amber-300 tracking-tight">
                {formatNumber(inventorySummary.totalStockKg / 1000, 3)} <span className="text-xs font-normal text-stone-400">تن</span>
              </div>
              <div className="text-xs text-stone-400 mt-1 font-mono">
                معادل {formatWeight(inventorySummary.totalStockKg)}
              </div>
            </div>
          </div>

          {/* Card 2: Coils (15m vs 50m) */}
          <div className="bg-stone-900/90 p-5 rounded-3xl shadow-lg border border-stone-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-300 font-bold">موجودی کلاف‌ها</span>
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-black font-mono text-purple-200">
                {formatNumber(inventorySummary.totalCoils)} <span className="text-xs text-stone-400 font-normal">کلاف</span>
              </div>
              <div className="text-[11px] text-stone-400 font-mono mt-1.5 flex items-center gap-2">
                <span className="bg-purple-950 text-purple-300 px-2 py-0.5 rounded-md border border-purple-800">
                  ۱۵ متری: {inventorySummary.totalCoils15m}
                </span>
                <span className="bg-purple-950 text-purple-300 px-2 py-0.5 rounded-md border border-purple-800">
                  ۵۰ متری: {inventorySummary.totalCoils50m}
                </span>
              </div>
              <div className="text-[11px] text-stone-400 mt-1 font-mono">
                وزن کل: {formatWeight(inventorySummary.packagingBreakdown.coil?.weightKg || 0)}
              </div>
            </div>
          </div>

          {/* Card 3: Straights */}
          <div className="bg-stone-900/90 p-5 rounded-3xl shadow-lg border border-stone-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-300 font-bold">موجودی شاخه‌ها</span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <Ruler className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-black font-mono text-blue-200">
                {formatNumber(inventorySummary.totalStraights)} <span className="text-xs text-stone-400 font-normal">شاخه</span>
              </div>
              <div className="text-xs text-stone-400 mt-1 font-mono">
                وزن کل: {formatWeight(inventorySummary.packagingBreakdown.straight?.weightKg || 0)}
              </div>
              <div className="text-[10px] text-blue-400/80 mt-1">
                ثبت وزنی و تعدادی شاخه
              </div>
            </div>
          </div>

          {/* Card 4: Spools */}
          <div className="bg-stone-900/90 p-5 rounded-3xl shadow-lg border border-stone-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-300 font-bold">موجودی قرقره‌ها</span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Disc className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-black font-mono text-amber-200">
                {formatNumber(inventorySummary.totalSpools)} <span className="text-xs text-stone-400 font-normal">قرقره</span>
              </div>
              <div className="text-[11px] text-stone-400 font-mono mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded-md border border-amber-800/80">
                  📦 پالتی: {inventorySummary.totalSpoolsPallet} ({formatWeight(inventorySummary.spoolPalletWeightKg)})
                </span>
                <span className="bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded-md border border-amber-800/80">
                  🔘 غیرپالتی: {inventorySummary.totalSpoolsNonPallet} ({formatWeight(inventorySummary.spoolNonPalletWeightKg)})
                </span>
              </div>
              <div className="text-[11px] text-stone-400 mt-1.5 font-mono">
                مجموع وزن کل: {formatWeight(inventorySummary.packagingBreakdown.spool?.weightKg || 0)}
              </div>
            </div>
          </div>

        </div>

        {/* Brand Stock Matrix Cards */}
        <div className="bg-stone-900/80 p-5 rounded-3xl border border-stone-800 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold text-stone-200 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>موجودی تفکیکی برندهای معتبر مس (باهنر، مهراصل، قائم، بابک، استریا)</span>
            </h2>
            <span className="text-xs text-stone-400 font-mono">
              تعداد کل بارنامه‌ها: {items.length} سند
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {COPPER_BRANDS.map((brand) => {
              const bData = inventorySummary.brandBreakdown[brand] || { weightKg: 0, count: 0 };
              const percent = inventorySummary.totalStockKg > 0 
                ? (bData.weightKg / inventorySummary.totalStockKg) * 100 
                : 0;

              return (
                <div key={brand} className="p-3.5 bg-stone-950/60 rounded-2xl border border-stone-800/80 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-200">{brand}</span>
                    <span className="text-[10px] font-mono font-bold text-amber-400">{percent.toFixed(1)}%</span>
                  </div>
                  <div className="mt-2.5">
                    <div className="text-sm font-black font-mono text-stone-100">
                      {formatWeight(bData.weightKg)}
                    </div>
                    <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden mt-2">
                      <div 
                        className="bg-amber-500 h-full rounded-full transition-all" 
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation Tabs between Live Stock vs Consignments Ledger */}
        <div className="flex items-center gap-2 p-1.5 bg-stone-900/90 rounded-2xl border border-stone-800 w-fit">
          <button
            type="button"
            onClick={() => setActiveWarehouseTab('live_stock')}
            className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeWarehouseTab === 'live_stock'
                ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/80'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>📦 ویترین موجودی فیزیکی و پالت‌های انبار</span>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
              activeWarehouseTab === 'live_stock' ? 'bg-stone-950/20 text-stone-950 font-black' : 'bg-stone-800 text-amber-300'
            }`}>
              {inventorySummary.totalSpoolsPallet > 0 ? `${Math.ceil(inventorySummary.totalSpoolsPallet / 5)} پالت` : 'زنده'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveWarehouseTab('transactions')}
            className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeWarehouseTab === 'transactions'
                ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/80'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>📋 دفترچه بارنامه‌ها و اسناد تراکنش (کاردکس)</span>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
              activeWarehouseTab === 'transactions' ? 'bg-stone-950/20 text-stone-950 font-black' : 'bg-stone-800 text-stone-300'
            }`}>
              {items.length} سند
            </span>
          </button>
        </div>

        {/* TAB 1: LIVE PHYSICAL INVENTORY & PALLETS CATALOG */}
        {activeWarehouseTab === 'live_stock' && (
          <WarehouseLiveStockCatalog
            items={items}
            inventorySummary={inventorySummary}
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
        <div className="bg-stone-900/80 rounded-3xl border border-stone-800 shadow-xl overflow-hidden">
          
          {/* Filters and Search Toolbar */}
          <div className="p-4 sm:p-5 border-b border-stone-800 bg-stone-950/50 space-y-3">
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-stone-500 absolute right-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در شماره بارنامه، راننده، خریدار، پلاک، برند..."
                  className="w-full pl-3 pr-10 py-2.5 text-xs rounded-2xl border border-stone-700 bg-stone-900 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={filteredItems.length === 0}
                  className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 border border-stone-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>خروجی اکسل</span>
                </button>
              </div>

            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              
              {/* Operation Type Switch */}
              <div className="flex items-center bg-stone-900 p-1 rounded-2xl border border-stone-800 text-xs">
                <button
                  type="button"
                  onClick={() => setTypeFilter('all')}
                  className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                    typeFilter === 'all' ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  همه اسناد ({items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('inbound')}
                  className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    typeFilter === 'inbound' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-400 hover:bg-stone-800'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>ورود به انبار (رسید)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('outbound')}
                  className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    typeFilter === 'outbound' ? 'bg-amber-600 text-white shadow-sm' : 'text-amber-400 hover:bg-stone-800'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>خروج از انبار (حواله)</span>
                </button>
              </div>

              {/* Packaging Filter (No Roll!) */}
              <select
                value={packagingFilter}
                onChange={(e) => setPackagingFilter(e.target.value)}
                className="px-3 py-2 text-xs font-bold rounded-2xl border border-stone-700 bg-stone-900 text-stone-200 focus:outline-none focus:border-amber-500"
              >
                <option value="all">همه قالب‌ها (کلاف، شاخه، قرقره)</option>
                <option value="coil">فقط کلاف مس (۱۵ و ۵۰ متری)</option>
                <option value="straight">فقط شاخه مس</option>
                <option value="spool">همه قرقره‌ها (پالتی و غیرپالتی)</option>
                <option value="spool_pallet">📦 فقط قرقره پالتی</option>
                <option value="spool_non_pallet">🔘 فقط قرقره غیر پالتی (فله)</option>
              </select>

              {/* Brand Filter */}
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="px-3 py-2 text-xs font-bold rounded-2xl border border-stone-700 bg-stone-900 text-stone-200 focus:outline-none focus:border-amber-500"
              >
                <option value="all">همه برندها (باهنر، مهراصل، قائم، بابک، استریا)</option>
                {COPPER_BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

            </div>

          </div>

          {/* Consignments List Table */}
          <div className="overflow-x-auto">
            {filteredItems.length === 0 ? (
              <div className="p-16 text-center text-stone-500 space-y-3">
                <Boxes className="w-14 h-14 mx-auto text-stone-700" />
                <p className="text-sm font-bold text-stone-300">هیچ سندی با فیلترهای انتخابی یافت نشد.</p>
                <p className="text-xs text-stone-500">
                  برای ثبت اولین محموله، روی دکمه «ثبت ورود مس» یا «ثبت خروج مس» کلیک کنید.
                </p>
              </div>
            ) : (
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-950/80 border-b border-stone-800 text-stone-400 font-bold">
                  <tr>
                    <th className="p-3.5">نوع سند</th>
                    <th className="p-3.5">شماره بارنامه / سند</th>
                    <th className="p-3.5">تاریخ و ساعت</th>
                    <th className="p-3.5">طرف‌حساب / راننده</th>
                    <th className="p-3.5">ریز اقلام مس محموله</th>
                    <th className="p-3.5 text-center">تعداد کل</th>
                    <th className="p-3.5 text-left">وزن کل محموله</th>
                    <th className="p-3.5 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/80">
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
                      <tr key={consignment.id} className="hover:bg-stone-850/50 transition-colors">
                        
                        {/* Entry Type Badge */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold text-xs border ${
                            isInbound 
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-xs' 
                              : 'bg-amber-950/60 text-amber-300 border-amber-500/40 shadow-xs'
                          }`}>
                            {isInbound ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            <span>{isInbound ? 'ورود به انبار' : 'خروج از انبار'}</span>
                          </span>
                        </td>

                        {/* Reference / Waybill Number */}
                        <td className="p-3.5 whitespace-nowrap font-mono">
                          <span className="font-bold text-stone-100 bg-stone-900 px-2.5 py-1 rounded-lg border border-stone-700">
                            {consignment.referenceDocNumber || consignment.id}
                          </span>
                        </td>

                        {/* Date & Time */}
                        <td className="p-3.5 whitespace-nowrap font-mono text-stone-300">
                          <div>{consignment.date}</div>
                          {consignment.time && (
                            <div className="text-[11px] text-stone-500 dir-ltr">{consignment.time}</div>
                          )}
                        </td>

                        {/* Counterparty & Driver */}
                        <td className="p-3.5">
                          <div className="font-bold text-stone-100 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span>{consignment.targetPartyName || 'طرف‌حساب عمومی'}</span>
                          </div>
                          {(consignment.driverName || consignment.vehiclePlate) && (
                            <div className="text-[11px] text-stone-400 font-mono mt-0.5 flex items-center gap-1.5">
                              <Truck className="w-3 h-3 text-stone-500" />
                              <span>{consignment.driverName}</span>
                              {consignment.vehiclePlate && (
                                <span className="bg-stone-900 px-1.5 py-0.5 rounded text-[10px] text-stone-300 border border-stone-800">
                                  {consignment.vehiclePlate}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Items in Consignment */}
                        <td className="p-3.5 max-w-md">
                          <div className="space-y-1">
                            {subItems.map((it, idx) => {
                              const pkgLabel = it.packagingType === 'coil'
                                ? `کلاف (${it.coilLength === '50m' ? '۵۰ متری' : '۱۵ متری'})`
                                : it.packagingType === 'straight'
                                ? 'شاخه'
                                : (it.spoolType === 'non_pallet' ? 'قرقره (غیر پالتی)' : 'قرقره (پالتی)');

                              const badgeColor = it.packagingType === 'coil'
                                ? 'bg-purple-950/60 text-purple-300 border-purple-800/80'
                                : it.packagingType === 'straight'
                                ? 'bg-blue-950/60 text-blue-300 border-blue-800/80'
                                : it.spoolType === 'non_pallet'
                                ? 'bg-amber-950/40 text-amber-200 border-amber-600/60'
                                : 'bg-amber-950/70 text-amber-300 border-amber-500/80';

                              return (
                                <div key={it.id || idx} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                  <span className={`px-2 py-0.5 rounded-md border font-bold ${badgeColor}`}>
                                    {pkgLabel}
                                  </span>
                                  <span className="font-bold text-stone-200">{it.brand}</span>
                                  <span className="text-stone-400 font-mono">سایز {it.diameterInch}</span>
                                  <span className="text-stone-400 font-mono">ضخامت {it.thicknessMm}mm</span>
                                  <span className="text-stone-300 font-mono font-bold">[{it.quantity} عدد: {formatWeight(it.totalWeightKg)}]</span>
                                  {it.packagingType === 'spool' && it.spoolWeights && it.spoolWeights.length > 0 && (
                                    <span className="text-[10px] text-amber-400 font-mono">
                                      ({it.spoolWeights.join(' ، ')} kg)
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        {/* Total Count */}
                        <td className="p-3.5 text-center font-mono font-bold text-stone-200 whitespace-nowrap">
                          {totalCount} واحد
                        </td>

                        {/* Total Consignment Weight */}
                        <td className="p-3.5 text-left font-mono font-black text-sm whitespace-nowrap">
                          <span className={isInbound ? 'text-emerald-400' : 'text-amber-400'}>
                            {isInbound ? '+' : '-'}{formatWeight(consignment.totalWeightKg)}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewingReceiptItem(consignment)}
                              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors cursor-pointer shadow-xs"
                              title="مشاهده و چاپ قبض رسمی"
                            >
                              <Printer className="w-3.5 h-3.5 text-blue-400" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(consignment)}
                              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors cursor-pointer shadow-xs"
                              title="ویرایش بارنامه"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setItemToDelete(consignment)}
                              className="p-2 rounded-xl bg-stone-800 hover:bg-rose-950 text-stone-400 hover:text-rose-400 border border-stone-700 transition-colors cursor-pointer shadow-xs"
                              title="حذف بارنامه"
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 rounded-3xl border border-stone-800 p-6 max-w-sm w-full shadow-2xl space-y-4 text-stone-100">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-950/60 border border-rose-800 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white">حذف سند بارنامه</h3>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              آیا از حذف سند {itemToDelete.entryType === 'inbound' ? 'ورود' : 'خروج'} شماره {itemToDelete.referenceDocNumber || itemToDelete.id} به وزن {formatWeight(itemToDelete.totalWeightKg)} اطمینان دارید؟
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-stone-400 hover:bg-stone-800 rounded-xl cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer shadow-lg shadow-rose-950/50"
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
