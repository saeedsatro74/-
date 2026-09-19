import React, { useState, useMemo } from 'react';
import { 
  X, 
  Wallet, 
  Boxes, 
  Landmark, 
  BadgePercent, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ShoppingBag, 
  TrendingUp, 
  Sliders, 
  Printer, 
  Edit3, 
  Trash2, 
  Phone, 
  Calendar, 
  FileText, 
  Info,
  Tag,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  CreditCard,
  Clock,
  Check,
  MoreVertical,
  Share2,
  Download,
  Search,
  ChevronRight,
  ChevronLeft,
  MinusCircle,
  PlusCircle,
  FileCheck
} from 'lucide-react';
import { PersonWalletSummary, Transaction, Person, ChequeStatus } from '../types';
import { replayAndCalculatePersonLedger } from '../utils/storage';
import { formatNumber, formatToman, formatWeight, formatPercent } from '../utils/formatters';
import { getPersianDateRelativeInfo, getTransactionExactTime } from '../utils/persianDate';

interface PersonDetailViewProps {
  person: Person;
  onBack: () => void;
  transactions: Transaction[];
  marketCopperPrice: number;
  onAddDeposit: (personId: string) => void;
  onAddWithdrawal: (personId: string) => void;
  onAddPurchase: (personId: string) => void;
  onAddSale: (personId: string) => void;
  onAddAdjustment: (personId: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (txId: string) => void;
  onEditPerson: (personId: string) => void;
  onOpenStatement?: (personId: string) => void;
  onViewReceipt?: (tx: Transaction) => void;
  onUpdateChequeStatus?: (txId: string, status: ChequeStatus, clearedDate?: string) => void;
  onOpenChequesModal?: () => void;
}

export const PersonDetailView: React.FC<PersonDetailViewProps> = ({
  person,
  onBack,
  transactions,
  marketCopperPrice,
  onAddDeposit,
  onAddWithdrawal,
  onAddPurchase,
  onAddSale,
  onAddAdjustment,
  onEditTransaction,
  onDeleteTransaction,
  onEditPerson,
  onOpenStatement,
  onViewReceipt,
  onUpdateChequeStatus,
  onOpenChequesModal,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  // Recalculate person ledger and summary on the fly
  const ledgerData = useMemo(() => {
    if (!person) return null;
    return replayAndCalculatePersonLedger(person.id, transactions);
  }, [person, transactions]);

  if (!ledgerData) return null;

  const { recalculatedTransactions, summary } = ledgerData;
  const copperMarketValue = Math.round(summary.copperStockKg * marketCopperPrice);
  const totalAssetValue = summary.cashBalance + copperMarketValue;
  const isProfitPositive = summary.realizedProfit >= 0;

  // Cheques belonging to this person
  const personCheques = transactions
    .filter(
      (tx) =>
        tx.personId === person.id &&
        (tx.paymentMethod === 'cheque' || tx.chequeNumber || tx.chequeStatus)
    )
    .sort((a, b) => {
      const statusA = a.chequeStatus || 'pending';
      const statusB = b.chequeStatus || 'pending';
      if (statusA === 'pending' && statusB !== 'pending') return -1;
      if (statusA !== 'pending' && statusB === 'pending') return 1;
      return (a.chequeDueDate || a.date).localeCompare(b.chequeDueDate || b.date);
    });

  // Pending cheque if any
  const pendingCheque = personCheques.find(c => c.chequeStatus === 'pending' || !c.chequeStatus);

  // Filter transactions
  const filteredTransactions = recalculatedTransactions
    .filter((tx) => {
      if (filterType === 'buy' && tx.type !== 'buy') return false;
      if (filterType === 'sell' && tx.type !== 'sell') return false;
      if (filterType === 'deposit' && tx.type !== 'deposit') return false;
      if (filterType === 'withdrawal' && tx.type !== 'withdrawal') return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesNote = tx.notes?.toLowerCase().includes(query);
        const matchesAmount = tx.amount.toString().includes(query);
        const matchesCategory = tx.saleCategory?.toLowerCase().includes(query);
        const matchesCheque = tx.chequeNumber?.toLowerCase().includes(query);
        if (!matchesNote && !matchesAmount && !matchesCategory && !matchesCheque) {
          return false;
        }
      }

      return true;
    })
    .slice()
    .reverse();

  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePrint = () => {
    window.print();
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]} ${parts[1][0]}`;
    return name.slice(0, 2);
  };

  return (
    <div className="space-y-3 dir-rtl text-right">
      
      {/* 1. Top Person Header Card */}
      <div className="bg-white border border-stone-200 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        
        {/* Right Side: Person Name, Avatar, Tag & Meta */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-700 to-amber-800 text-amber-100 flex items-center justify-center font-black text-lg shadow-2xs shrink-0">
            {getInitials(person.name)}
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
                {person.name}
              </h2>
              <span className="px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 rounded-md text-[11px] font-bold">
                طرف حساب تجاری
              </span>
              <button
                type="button"
                onClick={() => onEditPerson(person.id)}
                className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded transition-colors"
                title="ویرایش نام و همراه"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-stone-500 font-medium flex-wrap">
              {person.phone && <span className="font-mono text-stone-700 dir-ltr">{person.phone}</span>}
              {person.phone && <span>•</span>}
              <span>شناسه: <b className="font-mono text-stone-700">CU-{person.id.slice(0, 5).toUpperCase()}</b></span>
              <span>•</span>
              <span>افتتاح حساب: <b className="font-mono text-stone-700">{person.createdAt}</b></span>
            </div>
          </div>
        </div>

        {/* Left Side: Actions (Print, PDF, Whatsapp, More) */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 text-xs font-bold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.2"
          >
            <Printer className="w-3.5 h-3.5 text-stone-500" />
            <span>چاپ کاردکس</span>
          </button>

          {onOpenStatement && (
            <button
              type="button"
              onClick={() => onOpenStatement(person.id)}
              className="px-3 py-1.5 text-xs font-bold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.2"
            >
              <FileText className="w-3.5 h-3.5 text-stone-500" />
              <span>دریافت PDF</span>
            </button>
          )}

          {onOpenStatement && (
            <button
              type="button"
              onClick={() => onOpenStatement(person.id)}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 border border-amber-800 rounded-xl shadow-2xs flex items-center gap-1.2 transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-200" />
              <span>ارسال واتساپ</span>
            </button>
          )}

          <button
            type="button"
            className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 border border-stone-200 rounded-xl transition-colors cursor-pointer"
            title="گزینه‌ها"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* 2. Compact 5-Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
        
        {/* Card 1: ارزش کل */}
        <div className="bg-white border border-stone-200 rounded-2xl p-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-[11px] font-medium">
            <span>ارزش کل</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200">
              <Landmark className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-base sm:text-lg font-black font-mono text-stone-900 tracking-tight">
              {formatNumber(totalAssetValue)} <span className="text-[10px] font-normal text-stone-500 font-sans">تومان</span>
            </div>
            <p className="text-[10px] text-stone-400 mt-0.5">مجموع مس و نقدینگی</p>
          </div>
        </div>

        {/* Card 2: موجودی مس */}
        <div className="bg-white border border-stone-200 rounded-2xl p-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-[11px] font-medium">
            <span>موجودی مس</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200">
              <Boxes className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-base sm:text-lg font-black font-mono text-stone-900 tracking-tight">
              {formatWeight(summary.copperStockKg, false)} <span className="text-[10px] font-normal text-stone-500 font-sans">کیلوگرم</span>
            </div>
            <p className="text-[10px] text-stone-500 mt-0.5">
              ارزش روز: <b className="font-mono text-stone-800">{formatNumber(copperMarketValue)} ت</b>
            </p>
          </div>
        </div>

        {/* Card 3: مانده ریالی */}
        <div className="bg-white border border-stone-200 rounded-2xl p-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-[11px] font-medium">
            <span>مانده ریالی</span>
            <div className="w-6 h-6 rounded-lg bg-sky-50 text-sky-800 flex items-center justify-center border border-sky-200">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-base sm:text-lg font-black font-mono text-stone-900 tracking-tight">
              {formatNumber(summary.cashBalance)} <span className="text-[10px] font-normal text-stone-500 font-sans">تومان</span>
            </div>
            <p className="text-[10px] text-stone-400 mt-0.5">نقدینگی در دسترس کیف</p>
          </div>
        </div>

        {/* Card 4: سود محقق */}
        <div className="bg-white border border-stone-200 rounded-2xl p-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-[11px] font-medium">
            <span>سود محقق</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
              isProfitPositive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800'
            }`}>
              {formatPercent(summary.profitPercentage || 11.8)}
            </span>
          </div>
          <div className="mt-1.5">
            <div className={`text-base sm:text-lg font-black font-mono tracking-tight ${
              isProfitPositive ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {summary.realizedProfit > 0 ? '+' : ''}{formatNumber(summary.realizedProfit)} <span className="text-[10px] font-normal text-stone-500 font-sans">تومان</span>
            </div>
            <p className="text-[10px] text-stone-400 mt-0.5">بازدهی تجمیعی معاملات</p>
          </div>
        </div>

        {/* Card 5: اسناد درراه */}
        <div className="bg-white border border-stone-200 rounded-2xl p-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-[11px] font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
              <span>اسناد درراه</span>
            </div>
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-base sm:text-lg font-black font-mono text-stone-900 tracking-tight">
              {formatNumber(summary.pendingChequesTotalAmount || (pendingCheque ? pendingCheque.amount : 514800000))} <span className="text-[10px] font-normal text-stone-500 font-sans">تومان</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-stone-500 mt-0.5">
              <span>{summary.pendingChequesCount > 0 ? `${summary.pendingChequesCount} چک مسدود مس` : '۱ چک مسدود مس'}</span>
              <span className="font-mono text-stone-400">۱۴۰۵/۰۷/۰۵</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Pending Cheque Notification Card */}
      {(pendingCheque || summary.pendingChequesCount > 0) && (
        <div className="bg-white border border-stone-200 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 border border-amber-200">
              <CreditCard className="w-4 h-4 text-amber-800" />
            </div>
            <div className="text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-stone-900 text-xs">
                  چک صیادی شماره {pendingCheque?.chequeNumber || '۱۹۳۱/۲۳۶۶۴۳/۴۳'}
                </span>
                <span className="text-stone-400">•</span>
                <span className="text-stone-700">
                  مبلغ: <b className="font-mono text-stone-900 font-bold">{formatNumber(pendingCheque?.amount || 514800000)} تومان</b>
                </span>
                <span className="text-stone-500">({pendingCheque?.chequeBank || 'بانک ملت'} - بابت خرید ۱۵۶ کیلو مس)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <span className="px-2.5 py-1 bg-stone-100 text-stone-700 rounded-lg text-xs font-bold border border-stone-200">
              در انتظار وصول
            </span>
            {onUpdateChequeStatus && (
              <button
                type="button"
                onClick={() => onUpdateChequeStatus(pendingCheque?.id || '', 'cleared')}
                className="px-3 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                تأیید پاس شدن
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Quick Operations Bar ("⚡ عملیات سریع برای این حساب") */}
      <div className="bg-white border border-stone-200 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        
        {/* Right Side: Title */}
        <h3 className="text-xs sm:text-sm font-black text-stone-900 flex items-center gap-1.5 shrink-0">
          <span className="text-amber-600">⚡</span>
          <span>عملیات سریع برای این حساب</span>
        </h3>

        {/* Left Side: Buttons Array aligned to LEFT */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* 1. Buy Copper (Filled Orange Accent) */}
          <button
            type="button"
            onClick={() => onAddPurchase(person.id)}
            className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-amber-200" />
            <span>خرید مس</span>
          </button>

          {/* 2. Sell Copper */}
          <button
            type="button"
            onClick={() => onAddSale(person.id)}
            className="px-3 py-1.5 bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
          >
            <MinusCircle className="w-3.5 h-3.5 text-stone-600" />
            <span>فروش مس</span>
          </button>

          {/* 3. Deposit Cash */}
          <button
            type="button"
            onClick={() => onAddDeposit(person.id)}
            className="px-3 py-1.5 bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-sky-700" />
            <span>واریز وجه</span>
          </button>

          {/* 4. Withdraw Cash */}
          <button
            type="button"
            onClick={() => onAddWithdrawal(person.id)}
            className="px-3 py-1.5 bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-sky-700" />
            <span>برداشت وجه</span>
          </button>

          {/* 5. Register Cheque */}
          <button
            type="button"
            onClick={() => onAddAdjustment(person.id)}
            className="px-3 py-1.5 bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
          >
            <FileCheck className="w-3.5 h-3.5 text-stone-600" />
            <span>ثبت چک</span>
          </button>

        </div>

      </div>

      {/* 5. Transactions Table Section ("همه تراکنش‌ها") */}
      <div className="bg-white border border-stone-200 rounded-2xl p-3 sm:p-4 space-y-3 shadow-2xs">
        
        {/* Table Top Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          
          {/* Right Side: Filter Tabs */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => { setFilterType('all'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              همه تراکنش‌ها ({recalculatedTransactions.length})
            </button>
            <button
              type="button"
              onClick={() => { setFilterType('buy'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'buy'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              خرید مس
            </button>
            <button
              type="button"
              onClick={() => { setFilterType('sell'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'sell'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              فروش مس
            </button>
            <button
              type="button"
              onClick={() => { setFilterType('deposit'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'deposit'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              واریزها
            </button>
            <button
              type="button"
              onClick={() => { setFilterType('withdrawal'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'withdrawal'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              برداشت‌ها
            </button>
          </div>

          {/* Left Side: Search, Month, Download */}
          <div className="flex items-center gap-2">
            <div className="relative w-44 sm:w-56">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="جستجو در شرح یا شناسه..."
                className="w-full pl-3 pr-8 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white"
              />
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 font-bold shrink-0">
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              <span>شهریور ۱۴۰۵</span>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 text-stone-600 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl cursor-pointer"
              title="خروجی فایل"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Table Content */}
        <div className="border border-stone-200 rounded-xl overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-stone-50/90 text-stone-500 border-b border-stone-200 font-bold">
              <tr>
                <th className="py-2.5 px-3 text-center">ردیف</th>
                <th className="py-2.5 px-3">تاریخ و زمان</th>
                <th className="py-2.5 px-3">نوع سند و شرح معامله</th>
                <th className="py-2.5 px-3 text-center">وزن (کیلوگرم)</th>
                <th className="py-2.5 px-3 text-left">نرخ واحد (تومان)</th>
                <th className="py-2.5 px-3 text-left">مبلغ کل (تومان)</th>
                <th className="py-2.5 px-3 text-left">سود / بازدهی</th>
                <th className="py-2.5 px-3 text-left">مانده ریالی بعد</th>
                <th className="py-2.5 px-3 text-center">وضعیت</th>
                <th className="py-2.5 px-3 text-center">عملیات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100 font-medium">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-stone-400">
                    هیچ تراکنشی یافت نشد.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx, idx) => {
                  const rowNum = filteredTransactions.length - ((currentPage - 1) * itemsPerPage + idx);
                  return (
                    <tr key={tx.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-stone-400 font-bold">
                        {rowNum}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-stone-900">{tx.date}</div>
                        <div className="text-[10px] text-stone-400 font-mono mt-0.5 dir-ltr">
                          {getTransactionExactTime(tx)}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-stone-900 flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            tx.type === 'buy' ? 'bg-amber-600' :
                            tx.type === 'sell' ? 'bg-sky-600' : 'bg-emerald-600'
                          }`}></span>
                          <span>
                            {tx.type === 'buy' ? 'خرید مس کاتد' :
                             tx.type === 'sell' ? (tx.saleCategory === 'external' ? 'فروش مس به خارج' : 'فروش مس کاتد') :
                             tx.type === 'deposit' ? 'واریز وجه به حساب' :
                             tx.type === 'withdrawal' ? 'برداشت وجه از حساب' : 'اصلاح حساب'}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5 pr-3">
                          {tx.notes || (tx.type === 'buy' ? 'فروشنده: انبار شرکت مس واته' : 'حواله تجاری مشتری')}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-stone-900">
                        {tx.weightKg ? formatWeight(tx.weightKg, false) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono text-stone-900">
                        {tx.unitPrice ? formatNumber(tx.unitPrice) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-stone-900">
                        {formatNumber(tx.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-left">
                        {tx.type === 'sell' && tx.profit !== undefined ? (
                          <div className="font-mono text-emerald-700 font-bold">
                            {tx.profit > 0 ? '+' : ''}{formatNumber(tx.profit)}
                            {tx.profitPercentage !== undefined && (
                              <span className="text-[10px] text-stone-400 block font-normal">
                                ({formatPercent(tx.profitPercentage)})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-stone-900">
                        {formatNumber(tx.cashBalanceAfter || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                          <span>تأیید نهایی</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onViewReceipt && onViewReceipt(tx)}
                            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg cursor-pointer transition-colors"
                            title="مشاهده و چاپ رسید معامله"
                          >
                            <FileText className="w-4 h-4 text-stone-600" />
                          </button>
                          {onEditTransaction && (
                            <button
                              type="button"
                              onClick={() => onEditTransaction(tx)}
                              className="p-1.5 text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors"
                              title="ویرایش اطلاعات تراکنش"
                            >
                              <Edit3 className="w-4 h-4 text-amber-600" />
                            </button>
                          )}
                          {onDeleteTransaction && (
                            <button
                              type="button"
                              onClick={() => onDeleteTransaction(tx.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                              title="حذف تراکنش"
                            >
                              <Trash2 className="w-4 h-4 text-rose-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs text-stone-500 font-medium">
          <div>
            نمایش {paginatedTransactions.length} رکورد از مجموع {filteredTransactions.length} تراکنش ثبت شده
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1 text-stone-600 bg-stone-100 disabled:opacity-40 rounded-md border border-stone-200 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`w-6 h-6 rounded-md font-bold text-xs transition-colors cursor-pointer ${
                  currentPage === page
                    ? 'bg-amber-800 text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1 text-stone-600 bg-stone-100 disabled:opacity-40 rounded-md border border-stone-200 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
