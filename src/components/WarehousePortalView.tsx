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
  X,
  QrCode,
  SlidersHorizontal,
  Info,
  BarChart2,
  Check,
  Tag,
  Factory
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
import { formatNumber, formatWeight, toFaDigits } from '../utils/formatters';
import { WarehouseEntryModal } from './WarehouseEntryModal';
import { WarehouseReceiptModal } from './WarehouseReceiptModal';
import { WarehouseLiveStockCatalog } from './WarehouseLiveStockCatalog';
import { WarehouseStockPickerModal, SelectedStockItemsResult } from './WarehouseStockPickerModal';
import { Person, MarketPrices } from '../types';

interface WarehousePortalViewProps {
  items: WarehouseItem[];
  people?: Person[];
  marketPrices?: MarketPrices;
  onAddItem?: (item: WarehouseItem) => void;
  onUpdateItem?: (item: WarehouseItem) => void;
  onDeleteItem?: (id: string) => void;
  onBack?: () => void;
  onLogout?: () => void;
  onChangePassword?: () => void;
  userRole?: 'admin' | 'warehouse';
  onExecuteDirectSale?: (saleData: any) => Promise<void> | void;
  onOpenBuyCopper?: () => void;
  onOpenSellCopper?: () => void;
}

export const WarehousePortalView: React.FC<WarehousePortalViewProps> = ({
  items,
  people,
  marketPrices,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onBack,
  onLogout,
  onChangePassword,
  userRole = 'warehouse',
  onExecuteDirectSale,
  onOpenBuyCopper,
  onOpenSellCopper,
}) => {
  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'pallets' | 'loose_spools' | 'coils' | 'straights' | 'machine_production'>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Modals state
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isStockPickerOpen, setIsStockPickerOpen] = useState(false);
  const [entryModalType, setEntryModalType] = useState<'inbound' | 'outbound'>('inbound');
  const [editingItem, setEditingItem] = useState<WarehouseItem | null>(null);

  const [viewingReceiptItem, setViewingReceiptItem] = useState<WarehouseItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<WarehouseItem | null>(null);

  // Calculate live inventory totals
  const inventorySummary = useMemo(() => {
    return calculateWarehouseInventory(items);
  }, [items]);

  // Handle open add modal
  const handleOpenAdd = (type: 'inbound' | 'outbound' = 'inbound') => {
    setEditingItem(null);
    setEntryModalType(type);
    if (type === 'outbound') {
      setIsStockPickerOpen(true);
    } else {
      setIsEntryModalOpen(true);
    }
  };

  // Handle confirm outbound selection from visual stock picker catalog
  const handleConfirmOutboundStockPicker = (result: SelectedStockItemsResult) => {
    const cargoItemsList: any[] = [];

    // Map selected pallets
    result.selectedPallets.forEach((pallet) => {
      cargoItemsList.push({
        id: 'cargo-pallet-' + pallet.id + '-' + Date.now(),
        packagingType: 'spool',
        spoolType: 'pallet',
        brand: pallet.brand,
        thicknessMm: pallet.thicknessMm,
        diameterInch: pallet.diameterInch,
        quantity: pallet.spoolsCount,
        unitWeightKg: pallet.avgWeightKg,
        totalWeightKg: pallet.totalWeightKg,
        spoolWeights: pallet.spoolWeights,
        notes: `برداشت پالت #${pallet.palletIndex}`,
      });
    });

    // Map selected loose spools
    result.selectedLooseSpools.forEach((loose) => {
      cargoItemsList.push({
        id: 'cargo-loose-' + loose.id + '-' + Date.now(),
        packagingType: 'spool',
        spoolType: 'non_pallet',
        brand: loose.brand,
        thicknessMm: loose.thicknessMm,
        diameterInch: loose.diameterInch,
        quantity: loose.quantity,
        unitWeightKg: loose.totalWeightKg / Math.max(1, loose.quantity),
        totalWeightKg: loose.totalWeightKg,
        spoolWeights: loose.spoolWeights,
        notes: 'برداشت قرقره آزاد',
      });
    });

    // Coils
    if (result.selectedCoilsWeightKg > 0) {
      cargoItemsList.push({
        id: 'cargo-coil-' + Date.now(),
        packagingType: 'coil',
        brand: 'باهنر',
        thicknessMm: 0.75,
        diameterInch: '5/8',
        coilLength: '15m',
        quantity: 1,
        unitWeightKg: result.selectedCoilsWeightKg,
        totalWeightKg: result.selectedCoilsWeightKg,
        notes: 'برداشت کلاف مس',
      });
    }

    // Straights
    if (result.selectedStraightsWeightKg > 0) {
      cargoItemsList.push({
        id: 'cargo-straight-' + Date.now(),
        packagingType: 'straight',
        brand: 'باهنر',
        thicknessMm: 0.75,
        diameterInch: '5/8',
        quantity: 1,
        unitWeightKg: result.selectedStraightsWeightKg,
        totalWeightKg: result.selectedStraightsWeightKg,
        notes: 'برداشت شاخه مس',
      });
    }

    const firstItem = cargoItemsList[0] || {
      packagingType: 'spool',
      brand: 'باهنر',
      thicknessMm: 0.75,
      diameterInch: '5/8',
    };

    const outboundDoc: WarehouseItem = {
      id: 'wh-out-' + Date.now(),
      entryType: 'outbound',
      date: new Date().toLocaleDateString('fa-IR'),
      referenceDocNumber: 'WH-OUT-' + Math.floor(100000 + Math.random() * 900000),
      registeredBy: 'انباردار مس واته',
      notes: result.summaryText || 'حواله خروج انتخابی از انبار',
      createdAt: new Date().toISOString(),
      items: cargoItemsList,
      totalWeightKg: result.totalWeightKg,
      totalItemsCount: cargoItemsList.length,
      packagingType: firstItem.packagingType,
      brand: firstItem.brand,
      thicknessMm: firstItem.thicknessMm,
      diameterInch: firstItem.diameterInch,
      quantity: cargoItemsList.length,
      unitWeightKg: result.totalWeightKg / Math.max(1, cargoItemsList.length),
    };

    if (onAddItem) onAddItem(outboundDoc);
    else addWarehouseItem(outboundDoc);

    setIsStockPickerOpen(false);
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

  // Total calculated metrics formatted in Persian digits
  const totalWeightInTons = (inventorySummary.totalStockKg / 1000).toFixed(2);
  const totalWeightKgFormatted = formatNumber(inventorySummary.totalStockKg);

  return (
    <div className="space-y-4 text-stone-800 dir-rtl font-sans selection:bg-amber-500 selection:text-white pb-16">
      
      {/* Top Bar: Action Buttons & Warehouse Main Metrics Indicator */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-2xs">
        
        {/* Left Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleOpenAdd('inbound')}
            className="px-4 py-2.5 bg-amber-800 hover:bg-amber-900 active:bg-amber-950 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-300 stroke-[3]" />
            <span>ثبت ورود مس (رسید انبار)</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAdd('outbound')}
            className="px-4 py-2.5 bg-amber-700/90 hover:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Truck className="w-4 h-4 text-amber-200" />
            <span>ثبت خروج مس (حواله بار)</span>
          </button>
        </div>

        {/* Right Metric Box (Matching Image 1) */}
        <div className="flex items-center gap-3 bg-amber-50/60 border border-amber-200/80 p-2.5 px-4 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-amber-800 text-white flex items-center justify-center font-black shadow-xs shrink-0">
            <Warehouse className="w-5 h-5" />
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-600">
              <span>موجودی کل انبار فیزیکی سلفچگان</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-emerald-700 font-medium">توزین برخط</span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-black font-mono text-stone-900 tracking-tight">
                {toFaDigits(totalWeightInTons)}
              </span>
              <span className="text-xs font-bold text-amber-950">تن مس خالص</span>
              <span className="text-xs text-stone-500 font-mono">
                ~ kg {toFaDigits(totalWeightKgFormatted)}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Search Input & Advanced Filters Bar */}
      <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          
          {/* Advanced Filter Button */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              showAdvancedFilters || sizeFilter !== 'all'
                ? 'bg-amber-800 text-white border-amber-800'
                : 'bg-amber-700 hover:bg-amber-800 text-white border-amber-700'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>فیلتر پیشرفته</span>
          </button>

          {/* Size Filter Dropdown */}
          <div className="relative">
            <select
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              className="appearance-none bg-stone-100 hover:bg-stone-200/80 border border-stone-300 text-stone-700 font-bold text-xs py-2.5 pl-7 pr-3 rounded-xl cursor-pointer focus:outline-none"
            >
              <option value="all">فیلتر اندازه ∨</option>
              <option value="1/4">سایز "1/4</option>
              <option value="3/8">سایز "3/8</option>
              <option value="1/2">سایز "1/2</option>
              <option value="5/8">سایز "5/8</option>
              <option value="3/4">سایز "3/4</option>
              <option value="7/8">سایز "7/8</option>
              <option value="1-1/8">سایز "1-1/8</option>
            </select>
          </div>

          {/* Main Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در انبار (برند باهنر، مهراصل، 3/8، 1/2، کلاف، قرقره، شاخه، شماره پالت یا بارنامه)..."
              className="w-full pl-9 pr-4 py-2.5 text-xs font-bold bg-stone-100/90 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-8 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

        {/* Category Chips Bar (Matching Image 1) */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 pt-1 text-xs">
          
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white font-black shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <span>همه اقلام انبار</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${selectedCategory === 'all' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-stone-200 text-stone-700'}`}>
                {toFaDigits(14)} ردیف
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('pallets')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedCategory === 'pallets'
                  ? 'bg-slate-900 text-white font-black shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <span>پالت‌های قرقره (پالت‌دار)</span>
              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded-md text-[10px] font-black">
                {toFaDigits(5)} پالت
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('loose_spools')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedCategory === 'loose_spools'
                  ? 'bg-slate-900 text-white font-black shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <span>قرقره‌های غیرپالتی و تکی</span>
              <span className="px-1.5 py-0.2 bg-stone-200 text-stone-800 rounded-md text-[10px] font-bold">
                {toFaDigits(1)} قلم
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('coils')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedCategory === 'coils'
                  ? 'bg-slate-900 text-white font-black shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <span>کلاف‌های مس (Coil)</span>
              <span className="px-1.5 py-0.2 bg-stone-200 text-stone-800 rounded-md text-[10px] font-bold">
                {toFaDigits(2)} رده
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('straights')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedCategory === 'straights'
                  ? 'bg-slate-900 text-white font-black shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <span>شاخه‌های مس (Straight)</span>
              <span className="px-1.5 py-0.2 bg-stone-200 text-stone-800 rounded-md text-[10px] font-bold">
                {toFaDigits(2)} رده
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('machine_production')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedCategory === 'machine_production'
                  ? 'bg-purple-900 text-white font-black shadow-xs'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200/80'
              }`}
            >
              <Factory className="w-3.5 h-3.5 text-purple-600" />
              <span>مس مصرفی دستگاه (تولید)</span>
            </button>
          </div>

          <div className="hidden xl:flex items-center gap-1 text-[11px] text-stone-500 bg-amber-50/70 border border-amber-200/60 px-2.5 py-1 rounded-lg shrink-0">
            <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>مبنای صدور خروج: اولویت با پالت‌های دارای قرقره تفکیک‌شده</span>
          </div>

        </div>
      </div>

      {/* Main Live Stock Catalog View */}
      <WarehouseLiveStockCatalog
        items={items}
        inventorySummary={inventorySummary}
        people={people}
        marketPrices={marketPrices}
        externalSearchQuery={searchQuery}
        categoryFilter={selectedCategory}
        onOpenAdd={handleOpenAdd}
        onViewReceipt={(item) => setViewingReceiptItem(item)}
        onUpdateItem={(item) => {
          if (onUpdateItem) onUpdateItem(item);
          else updateWarehouseItem(item);
        }}
        onAddItem={(item) => {
          if (onAddItem) onAddItem(item);
          else addWarehouseItem(item);
        }}
        onExecuteDirectSale={onExecuteDirectSale}
      />

      {/* Modals */}
      {isEntryModalOpen && (
        <WarehouseEntryModal
          isOpen={isEntryModalOpen}
          onClose={() => setIsEntryModalOpen(false)}
          onSave={handleSaveItem}
          initialType={entryModalType}
          editingItem={editingItem}
        />
      )}

      {isStockPickerOpen && (
        <WarehouseStockPickerModal
          isOpen={isStockPickerOpen}
          onClose={() => setIsStockPickerOpen(false)}
          onConfirmSelection={handleConfirmOutboundStockPicker}
          items={items}
        />
      )}

      {viewingReceiptItem && (
        <WarehouseReceiptModal
          onClose={() => setViewingReceiptItem(null)}
          item={viewingReceiptItem}
        />
      )}

    </div>
  );
};
