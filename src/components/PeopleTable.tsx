import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  PackageCheck, 
  ShoppingBag, 
  TrendingUp, 
  Eye, 
  Edit3, 
  Trash2, 
  Phone, 
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Landmark,
  UserPlus
} from 'lucide-react';
import { PersonWalletSummary, FilterStatus, SortField, SortOrder } from '../types';
import { formatNumber, formatToman, formatWeight, formatPercent } from '../utils/formatters';

interface PeopleTableProps {
  summaries: PersonWalletSummary[];
  onSelectPerson: (personId: string) => void;
  onEditPerson: (personId: string) => void;
  onDeletePerson: (personId: string) => void;
  onAddDeposit: (personId: string) => void;
  onAddWithdrawal: (personId: string) => void;
  onAddPurchase: (personId: string) => void;
  onAddSale: (personId: string) => void;
  onAddNewPerson: () => void;
}

export const PeopleTable: React.FC<PeopleTableProps> = ({
  summaries,
  onSelectPerson,
  onEditPerson,
  onDeletePerson,
  onAddDeposit,
  onAddWithdrawal,
  onAddPurchase,
  onAddSale,
  onAddNewPerson,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('totalAsset');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Toggle Sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Filter and Sort Data
  const filteredAndSortedSummaries = useMemo(() => {
    return summaries
      .filter((item) => {
        // Status filter
        if (filterStatus === 'has_cash' && item.cashBalance <= 0) return false;
        if (filterStatus === 'has_stock' && item.copperStockKg <= 0) return false;
        if (filterStatus === 'has_asset' && item.totalAssetValue <= 0) return false;

        // Search filter
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const nameMatch = item.person.name.toLowerCase().includes(term);
          const phoneMatch = item.person.phone ? item.person.phone.includes(term) : false;
          const notesMatch = item.person.notes ? item.person.notes.toLowerCase().includes(term) : false;
          return nameMatch || phoneMatch || notesMatch;
        }
        return true;
      })
      .sort((a, b) => {
        const factor = sortOrder === 'asc' ? 1 : -1;
        switch (sortField) {
          case 'name':
            return factor * a.person.name.localeCompare(b.person.name, 'fa');
          case 'cash':
            return factor * (a.cashBalance - b.cashBalance);
          case 'stock':
            return factor * (a.copperStockKg - b.copperStockKg);
          case 'copperValue':
            return factor * (a.copperMarketValue - b.copperMarketValue);
          case 'totalAsset':
            return factor * (a.totalAssetValue - b.totalAssetValue);
          case 'profit':
            return factor * (a.realizedProfit - b.realizedProfit);
          case 'date':
          default:
            return factor * a.person.createdAt.localeCompare(b.person.createdAt);
        }
      });
  }, [summaries, searchTerm, filterStatus, sortField, sortOrder]);

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
      
      {/* Table Toolbar */}
      <div className="p-4 sm:p-5 border-b border-stone-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3.5">
        
        {/* Title and Count */}
        <div className="flex items-center gap-2.5">
          <h2 className="text-base sm:text-lg font-bold text-stone-900">
            دفتر حساب و کیف پول افراد
          </h2>
          <span className="bg-stone-100 text-stone-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            {formatNumber(filteredAndSortedSummaries.length)} نفر
          </span>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          
          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-people"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجوی نام، تلفن، توضیحات..."
              className="w-full pl-3 pr-9 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700"
              >
                پاک کردن
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200/80 text-xs font-medium">
            <button
              id="filter-all"
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              همه ({summaries.length})
            </button>
            <button
              id="filter-has-stock"
              type="button"
              onClick={() => setFilterStatus('has_stock')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filterStatus === 'has_stock'
                  ? 'bg-white text-amber-900 shadow-2xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              دارای مس ({summaries.filter(s => s.copperStockKg > 0).length})
            </button>
            <button
              id="filter-has-cash"
              type="button"
              onClick={() => setFilterStatus('has_cash')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filterStatus === 'has_cash'
                  ? 'bg-white text-emerald-900 shadow-2xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              دارای نقدینگی ({summaries.filter(s => s.cashBalance > 0).length})
            </button>
          </div>

        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-stone-50 text-stone-600 text-xs border-b border-stone-200">
            <tr>
              <th scope="col" className="py-3.5 px-4 font-semibold">
                <button
                  type="button"
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-stone-900 cursor-pointer"
                >
                  <span>نام شخص</span>
                  <ArrowUpDown className="w-3 h-3 text-stone-400" />
                </button>
              </th>
              
              <th scope="col" className="py-3.5 px-4 font-semibold text-left">
                <button
                  type="button"
                  onClick={() => handleSort('cash')}
                  className="flex items-center justify-end gap-1 ml-auto hover:text-stone-900 cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>موجودی ریالی (تومان)</span>
                  <ArrowUpDown className="w-3 h-3 text-stone-400" />
                </button>
              </th>

              <th scope="col" className="py-3.5 px-4 font-semibold text-center">
                <button
                  type="button"
                  onClick={() => handleSort('stock')}
                  className="flex items-center justify-center gap-1 mx-auto hover:text-stone-900 cursor-pointer"
                >
                  <span>موجودی مس (کیلوگرم)</span>
                  <ArrowUpDown className="w-3 h-3 text-stone-400" />
                </button>
              </th>

              <th scope="col" className="py-3.5 px-4 font-semibold text-left">
                <button
                  type="button"
                  onClick={() => handleSort('copperValue')}
                  className="flex items-center justify-end gap-1 ml-auto hover:text-stone-900 cursor-pointer"
                >
                  <span>ارزش روز مس (تومان)</span>
                  <ArrowUpDown className="w-3 h-3 text-stone-400" />
                </button>
              </th>

              <th scope="col" className="py-3.5 px-4 font-semibold text-left">
                <button
                  type="button"
                  onClick={() => handleSort('totalAsset')}
                  className="flex items-center justify-end gap-1 ml-auto text-amber-950 hover:text-amber-700 cursor-pointer"
                >
                  <Landmark className="w-3.5 h-3.5 text-amber-700" />
                  <span>مجموع دارایی (تومان)</span>
                  <ArrowUpDown className="w-3 h-3 text-amber-700" />
                </button>
              </th>

              <th scope="col" className="py-3.5 px-4 font-semibold text-left">
                <button
                  type="button"
                  onClick={() => handleSort('profit')}
                  className="flex items-center justify-end gap-1 ml-auto hover:text-stone-900 cursor-pointer"
                >
                  <span>سود واقعی</span>
                  <ArrowUpDown className="w-3 h-3 text-stone-400" />
                </button>
              </th>

              <th scope="col" className="py-3.5 px-4 font-semibold text-center">
                عملیات کیف پول و معاملات
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-stone-100">
            {filteredAndSortedSummaries.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-stone-400">
                  <PackageCheck className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                  <p className="font-medium text-stone-600">هیچ رکوردی یافت نشد</p>
                  <button
                    type="button"
                    onClick={onAddNewPerson}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>افزودن شخص جدید</span>
                  </button>
                </td>
              </tr>
            ) : (
              filteredAndSortedSummaries.map((item) => {
                const isProfitPos = item.realizedProfit >= 0;
                return (
                  <tr 
                    key={item.person.id} 
                    className="hover:bg-amber-50/40 transition-colors group cursor-pointer"
                    onClick={() => onSelectPerson(item.person.id)}
                  >
                    {/* Name & Phone */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-stone-900 group-hover:text-amber-800 transition-colors">
                          {item.person.name}
                        </span>
                        {item.person.phone && (
                          <span className="text-xs text-stone-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-stone-400" />
                            {item.person.phone}
                          </span>
                        )}
                        {item.person.notes && (
                          <span className="text-[11px] text-stone-400 truncate max-w-[180px] mt-0.5">
                            {item.person.notes}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cash Balance */}
                    <td className="py-3.5 px-4 text-left font-mono">
                      <div className={`font-bold text-sm ${item.cashBalance > 0 ? 'text-emerald-700' : 'text-stone-400'}`}>
                        {formatNumber(item.cashBalance)}
                      </div>
                      <span className="text-[11px] text-stone-400 font-sans">
                        {item.transactionsCount} تراکنش
                      </span>
                    </td>

                    {/* Copper Stock (Kg) */}
                    <td className="py-3.5 px-4 text-center">
                      <div className={`font-bold font-mono text-sm ${item.copperStockKg > 0 ? 'text-amber-900' : 'text-stone-400'}`}>
                        {formatWeight(item.copperStockKg, false)}
                      </div>
                      <span className="text-[11px] text-stone-400 font-sans">
                        کیلوگرم
                      </span>
                    </td>

                    {/* Copper Market Value */}
                    <td className="py-3.5 px-4 text-left font-mono">
                      <div className={`font-semibold text-sm ${item.copperMarketValue > 0 ? 'text-stone-800' : 'text-stone-400'}`}>
                        {formatNumber(item.copperMarketValue)}
                      </div>
                      {item.copperStockKg > 0 && (
                        <span className="text-[10px] text-amber-700 font-sans">
                          ارزش انبار
                        </span>
                      )}
                    </td>

                    {/* Total Asset Value */}
                    <td className="py-3.5 px-4 text-left font-mono">
                      <div className="font-extrabold text-base text-amber-950">
                        {formatNumber(item.totalAssetValue)}
                      </div>
                      <span className="text-[10px] text-stone-500 font-sans">
                        نقدینگی + مس
                      </span>
                    </td>

                    {/* Profit */}
                    <td className="py-3.5 px-4 text-left">
                      <div className={`font-bold font-mono text-sm ${isProfitPos ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {item.realizedProfit > 0 ? '+' : ''}{formatNumber(item.realizedProfit)}
                      </div>
                      {item.realizedProfit !== 0 && (
                        <div className="flex items-center gap-1 text-[11px] mt-0.5">
                          <span className={`font-semibold ${isProfitPos ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {formatPercent(item.profitPercentage)}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        
                        {/* Primary View & Manage Button */}
                        <button
                          type="button"
                          onClick={() => onSelectPerson(item.person.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-stone-600" />
                          <span>مشاهده و عملیات</span>
                        </button>

                        {/* Quick Buy */}
                        <button
                          type="button"
                          onClick={() => onAddPurchase(item.person.id)}
                          className="p-1.5 text-stone-700 hover:text-amber-900 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="خرید مس"
                        >
                          <ShoppingBag className="w-4 h-4 text-amber-700" />
                        </button>

                        {/* Quick Sell */}
                        <button
                          type="button"
                          onClick={() => onAddSale(item.person.id)}
                          className="p-1.5 text-stone-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="فروش مس"
                        >
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                        </button>

                        {/* Quick Deposit */}
                        <button
                          type="button"
                          onClick={() => onAddDeposit(item.person.id)}
                          className="p-1.5 text-stone-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="واریز وجه"
                        >
                          <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                        </button>

                        {/* Edit Person */}
                        <button
                          type="button"
                          onClick={() => onEditPerson(item.person.id)}
                          className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                          title="ویرایش مشخصات"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden divide-y divide-stone-200">
        {filteredAndSortedSummaries.length === 0 ? (
          <div className="p-8 text-center text-stone-400">
            <PackageCheck className="w-10 h-10 mx-auto text-stone-300 mb-2" />
            <p className="font-medium text-stone-600">هیچ رکوردی یافت نشد</p>
          </div>
        ) : (
          filteredAndSortedSummaries.map((item) => {
            const isProfitPos = item.realizedProfit >= 0;
            return (
              <div 
                key={item.person.id}
                className="p-4 space-y-3 hover:bg-stone-50/70 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 
                      onClick={() => onSelectPerson(item.person.id)}
                      className="font-bold text-base text-stone-900 hover:text-amber-800 cursor-pointer"
                    >
                      {item.person.name}
                    </h3>
                    {item.person.phone && (
                      <p className="text-xs text-stone-500 font-mono mt-0.5">{item.person.phone}</p>
                    )}
                  </div>

                  <div className="text-left font-mono">
                    <span className="text-xs text-stone-400 block font-sans">مجموع دارایی</span>
                    <span className="font-extrabold text-sm text-amber-950">
                      {formatNumber(item.totalAssetValue)} ت
                    </span>
                  </div>
                </div>

                {/* Mobile Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200/80 text-xs">
                  <div>
                    <span className="text-stone-500 block">موجودی ریالی:</span>
                    <span className="font-bold text-emerald-800 text-sm font-mono">{formatNumber(item.cashBalance)} ت</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">موجودی مس:</span>
                    <span className="font-bold text-amber-900 text-sm font-mono">{formatWeight(item.copperStockKg)}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">ارزش روز مس:</span>
                    <span className="font-medium text-stone-800 font-mono">{formatNumber(item.copperMarketValue)} ت</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">سود واقعی:</span>
                    <span className={`font-bold font-mono ${isProfitPos ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {item.realizedProfit > 0 ? '+' : ''}{formatNumber(item.realizedProfit)} ت
                    </span>
                  </div>
                </div>

                {/* Mobile Actions */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => onSelectPerson(item.person.id)}
                    className="text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-stone-600" />
                    <span>مشاهده پرونده و تراکنش‌ها</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onAddPurchase(item.person.id)}
                      className="p-1.5 text-amber-800 bg-amber-50 rounded-lg"
                      title="خرید مس"
                    >
                      <ShoppingBag className="w-4 h-4 text-amber-700" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddSale(item.person.id)}
                      className="p-1.5 text-blue-700 bg-blue-50 rounded-lg"
                      title="فروش مس"
                    >
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddDeposit(item.person.id)}
                      className="p-1.5 text-emerald-700 bg-emerald-50 rounded-lg"
                      title="واریز وجه"
                    >
                      <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditPerson(item.person.id)}
                      className="p-1.5 text-stone-500 bg-stone-100 rounded-lg"
                      title="ویرایش"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
