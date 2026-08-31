import React, { useState, useMemo } from 'react';
import { 
  X, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  User, 
  Calendar, 
  Building2, 
  FileText, 
  Check, 
  Ban, 
  ArrowDownLeft,
  DollarSign
} from 'lucide-react';
import { Person, Transaction, ChequeStatus } from '../types';
import { formatNumber, formatToman, formatWeight } from '../utils/formatters';
import { getTodayJalaliString } from '../utils/persianDate';

interface ChequesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  people: Person[];
  onUpdateChequeStatus: (txId: string, status: ChequeStatus, clearedDate?: string) => void;
  onSelectPerson?: (personId: string) => void;
}

export const ChequesManagementModal: React.FC<ChequesManagementModalProps> = ({
  isOpen,
  onClose,
  transactions,
  people,
  onUpdateChequeStatus,
  onSelectPerson,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'cleared' | 'bounced'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>('all');

  // Filter all cheque transactions (sales paid by cheque or any cheque tx)
  const chequeTransactions = useMemo(() => {
    return transactions.filter(
      (tx) => tx.paymentMethod === 'cheque' || tx.chequeNumber || tx.chequeStatus
    );
  }, [transactions]);

  // Cheque stats
  const stats = useMemo(() => {
    let pendingCount = 0;
    let pendingAmount = 0;
    let clearedCount = 0;
    let clearedAmount = 0;
    let bouncedCount = 0;
    let bouncedAmount = 0;

    for (const tx of chequeTransactions) {
      const status = tx.chequeStatus || 'pending';
      const amount = tx.amount || 0;
      if (status === 'pending') {
        pendingCount += 1;
        pendingAmount += amount;
      } else if (status === 'cleared') {
        clearedCount += 1;
        clearedAmount += amount;
      } else if (status === 'bounced') {
        bouncedCount += 1;
        bouncedAmount += amount;
      }
    }

    return {
      total: chequeTransactions.length,
      pendingCount,
      pendingAmount,
      clearedCount,
      clearedAmount,
      bouncedCount,
      bouncedAmount,
    };
  }, [chequeTransactions]);

  // Filter and sort cheques
  const filteredCheques = useMemo(() => {
    return chequeTransactions
      .filter((tx) => {
        const currentStatus = tx.chequeStatus || 'pending';
        if (filterStatus !== 'all' && currentStatus !== filterStatus) {
          return false;
        }

        if (selectedPersonFilter !== 'all' && tx.personId !== selectedPersonFilter) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const person = people.find((p) => p.id === tx.personId);
          const pName = person?.name.toLowerCase() || '';
          const chNum = (tx.chequeNumber || '').toLowerCase();
          const chBank = (tx.chequeBank || '').toLowerCase();
          const notes = (tx.notes || '').toLowerCase();
          return pName.includes(q) || chNum.includes(q) || chBank.includes(q) || notes.includes(q);
        }

        return true;
      })
      .sort((a, b) => {
        // Pending first, then by dueDate/date
        const statusA = a.chequeStatus || 'pending';
        const statusB = b.chequeStatus || 'pending';
        if (statusA === 'pending' && statusB !== 'pending') return -1;
        if (statusA !== 'pending' && statusB === 'pending') return 1;

        const dateA = a.chequeDueDate || a.date;
        const dateB = b.chequeDueDate || b.date;
        return dateA.localeCompare(dateB);
      });
  }, [chequeTransactions, filterStatus, selectedPersonFilter, searchQuery, people]);

  if (!isOpen) return null;

  const handleMarkAsCleared = (txId: string) => {
    const today = getTodayJalaliString();
    onUpdateChequeStatus(txId, 'cleared', today);
  };

  const handleMarkAsPending = (txId: string) => {
    onUpdateChequeStatus(txId, 'pending', undefined);
  };

  const handleMarkAsBounced = (txId: string) => {
    onUpdateChequeStatus(txId, 'bounced', undefined);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/75 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 py-4 sm:py-6">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-5xl my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header (Sticky at top) */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-amber-50/90 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-800 text-white flex items-center justify-center shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-900">
                  مدیریت و وصول چک‌های دریافتی
                </h2>
                {stats.pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold animate-pulse">
                    {stats.pendingCount} چک در انتظار پاس شدن
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-600 mt-0.5">
                تغییر وضعیت چک‌ها به «پاس شده» جهت رفع انسداد خرید طرف‌های حساب
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-stone-200 transition-colors cursor-pointer"
            title="بستن پنجره"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary Stats */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          {/* Pending Cheques */}
          <div 
            onClick={() => setFilterStatus('pending')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              filterStatus === 'pending'
                ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400'
                : 'bg-white border-stone-200 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-rose-900 font-bold mb-1">
              <span>در انتظار وصول (پاس‌نشده)</span>
              <Clock className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-base sm:text-lg font-mono font-black text-rose-900">
              {stats.pendingCount} <span className="text-xs font-sans font-normal text-stone-500">فقره</span>
            </div>
            <div className="text-xs font-mono font-semibold text-rose-800 mt-0.5">
              {formatToman(stats.pendingAmount)}
            </div>
          </div>

          {/* Cleared Cheques */}
          <div 
            onClick={() => setFilterStatus('cleared')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              filterStatus === 'cleared'
                ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400'
                : 'bg-white border-stone-200 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-emerald-900 font-bold mb-1">
              <span>پاس شده (وصول‌شده)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-base sm:text-lg font-mono font-black text-emerald-900">
              {stats.clearedCount} <span className="text-xs font-sans font-normal text-stone-500">فقره</span>
            </div>
            <div className="text-xs font-mono font-semibold text-emerald-800 mt-0.5">
              {formatToman(stats.clearedAmount)}
            </div>
          </div>

          {/* Bounced Cheques */}
          <div 
            onClick={() => setFilterStatus('bounced')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              filterStatus === 'bounced'
                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400'
                : 'bg-white border-stone-200 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-amber-900 font-bold mb-1">
              <span>برگشت خورده</span>
              <Ban className="w-4 h-4 text-amber-700" />
            </div>
            <div className="text-base sm:text-lg font-mono font-black text-amber-900">
              {stats.bouncedCount} <span className="text-xs font-sans font-normal text-stone-500">فقره</span>
            </div>
            <div className="text-xs font-mono font-semibold text-amber-800 mt-0.5">
              {formatToman(stats.bouncedAmount)}
            </div>
          </div>

          {/* All Cheques */}
          <div 
            onClick={() => setFilterStatus('all')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              filterStatus === 'all'
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white border-stone-200 text-stone-900 hover:border-stone-400'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span>مجموع کل چک‌ها</span>
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="text-base sm:text-lg font-mono font-black">
              {stats.total} <span className="text-xs font-sans font-normal opacity-80">فقره</span>
            </div>
            <div className="text-xs font-mono font-semibold opacity-90 mt-0.5">
              {formatToman(stats.pendingAmount + stats.clearedAmount + stats.bouncedAmount)}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-3.5 bg-white border-b border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس نام طرف حساب، شماره چک، بانک..."
              className="w-full pl-3 pr-9 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Person Filter */}
            <select
              value={selectedPersonFilter}
              onChange={(e) => setSelectedPersonFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600"
            >
              <option value="all">همه طرف‌های حساب</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Status Filter Tabs */}
            <div className="inline-flex rounded-lg bg-stone-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded cursor-pointer ${filterStatus === 'all' ? 'bg-white font-bold shadow-2xs text-stone-900' : 'text-stone-600'}`}
              >
                همه ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('pending')}
                className={`px-2.5 py-1 rounded cursor-pointer ${filterStatus === 'pending' ? 'bg-white font-bold text-rose-800 shadow-2xs' : 'text-stone-600'}`}
              >
                پاس‌نشده ({stats.pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('cleared')}
                className={`px-2.5 py-1 rounded cursor-pointer ${filterStatus === 'cleared' ? 'bg-white font-bold text-emerald-800 shadow-2xs' : 'text-stone-600'}`}
              >
                پاس‌شده ({stats.clearedCount})
              </button>
            </div>
          </div>

        </div>

        {/* Cheques Table & List */}
        <div className="overflow-y-auto flex-1 p-4">
          {filteredCheques.length === 0 ? (
            <div className="py-16 text-center text-stone-400 space-y-2">
              <CreditCard className="w-12 h-12 mx-auto text-stone-300" />
              <p className="font-bold text-stone-600">هیچ چکی با مشخصات انتخابی یافت نشد</p>
              <p className="text-xs text-stone-400">
                هنگام ثبت فاکتور فروش مس، می‌توانید نوع تسویه را «دریافت چک مدت‌دار» انتخاب کنید.
              </p>
            </div>
          ) : (
            <div className="border border-stone-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-3 font-bold text-center w-8">ردیف</th>
                    <th className="py-3 px-3 font-bold">طرف حساب / صادرکننده</th>
                    <th className="py-3 px-3 font-bold">شماره چک / صیادی</th>
                    <th className="py-3 px-3 font-bold text-left">مبلغ چک (تومان)</th>
                    <th className="py-3 px-3 font-bold">سررسید چک</th>
                    <th className="py-3 px-3 font-bold">بانک</th>
                    <th className="py-3 px-3 font-bold text-center">وضعیت وصول</th>
                    <th className="py-3 px-3 font-bold text-center">تغییر وضعیت / اقدام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredCheques.map((tx, idx) => {
                    const person = people.find((p) => p.id === tx.personId);
                    const status = tx.chequeStatus || 'pending';
                    const isPending = status === 'pending';
                    const isCleared = status === 'cleared';
                    const isBounced = status === 'bounced';

                    return (
                      <tr 
                        key={tx.id} 
                        className={`transition-colors ${
                          isPending ? 'bg-rose-50/30 hover:bg-rose-50/60' : 'hover:bg-stone-50/80'
                        }`}
                      >
                        {/* Index */}
                        <td className="py-3 px-3 font-mono text-center text-stone-400">
                          {idx + 1}
                        </td>

                        {/* Person */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => {
                                if (onSelectPerson && tx.personId) {
                                  onClose();
                                  onSelectPerson(tx.personId);
                                }
                              }}
                              className="font-bold text-stone-900 hover:text-amber-800 text-right cursor-pointer"
                            >
                              {person?.name || 'طرف حساب نامشخص'}
                            </button>
                            {person?.phone && (
                              <span className="text-[11px] font-mono text-stone-500">
                                {person.phone}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Cheque Number */}
                        <td className="py-3 px-3 font-mono font-bold text-stone-800">
                          {tx.chequeNumber || 'ثبت نشده'}
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-3 text-left font-mono font-extrabold text-stone-900">
                          {formatNumber(tx.amount)}
                        </td>

                        {/* Due Date */}
                        <td className="py-3 px-3 font-mono whitespace-nowrap">
                          <div className="flex items-center gap-1 text-stone-800">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            <span>{tx.chequeDueDate || tx.date}</span>
                          </div>
                          {tx.chequeClearedDate && isCleared && (
                            <span className="text-[10px] text-emerald-700 block mt-0.5">
                              پاس شده در: {tx.chequeClearedDate}
                            </span>
                          )}
                        </td>

                        {/* Bank */}
                        <td className="py-3 px-3 text-stone-600">
                          {tx.chequeBank ? (
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-stone-400" />
                              {tx.chequeBank}
                            </span>
                          ) : (
                            <span className="text-stone-300">—</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3 text-center">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-xs">
                              <Clock className="w-3.5 h-3.5 text-rose-600" />
                              <span>در انتظار پاس شدن (مسدود)</span>
                            </span>
                          )}
                          {isCleared && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>پاس شده (وصول)</span>
                            </span>
                          )}
                          {isBounced && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs">
                              <Ban className="w-3.5 h-3.5 text-amber-700" />
                              <span>برگشت خورده</span>
                            </span>
                          )}
                        </td>

                        {/* Action Buttons: Pass cheque / Mark uncleared */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => handleMarkAsCleared(tx.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer shadow-xs"
                                title="تایید پاس شدن چک و باز شدن قفل خرید شخص"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>چک پاس شد</span>
                              </button>
                            )}

                            {isCleared && (
                              <button
                                type="button"
                                onClick={() => handleMarkAsPending(tx.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                                title="برگشت به حالت در انتظار وصول"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>تغییر به در انتظار</span>
                              </button>
                            )}

                            {!isBounced && (
                              <button
                                type="button"
                                onClick={() => handleMarkAsBounced(tx.id)}
                                className="p-1.5 text-stone-400 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                title="علامت‌گذاری به عنوان چک برگشتی"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <span>
              نکته: با زدن دکمه <b>«چک پاس شد»</b>، وضعیت وصول ثبت شده و امکان خرید مس مجدداً برای طرف حساب فعال می‌شود.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg transition-colors cursor-pointer"
          >
            بستن
          </button>
        </div>

      </div>
    </div>
  );
};
