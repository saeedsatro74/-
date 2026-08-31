import React, { useState } from 'react';
import { 
  User, 
  Wallet, 
  Layers, 
  FileText, 
  LogOut, 
  KeyRound, 
  TrendingUp, 
  ShoppingBag, 
  ArrowDownLeft, 
  ArrowUpRight,
  Printer,
  ShieldCheck,
  Calendar,
  Phone,
  CheckCircle2,
  Clock,
  ExternalLink,
  PlusCircle,
  Building2,
  CreditCard,
  Copy,
  Check,
  Send,
  Upload,
  AlertCircle,
  MessageSquare,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { Person, Transaction, PersonWalletSummary, MarketPrices, TransactionType, PaymentMethod, CompanyBankInfo, AuthSession } from '../types';
import { formatToman, formatWeight, formatNumber } from '../utils/formatters';
import { getPersianFullDate } from '../utils/persianDate';
import { ClientRequestModal } from './ClientRequestModal';
import { SupportChatWidget } from './SupportChatWidget';
import { getStoredCompanyBankInfo, DEFAULT_COMPANY_BANK_INFO } from '../utils/storage';

interface ClientPortalViewProps {
  person: Person;
  summary: PersonWalletSummary;
  transactions: Transaction[];
  marketPrices: MarketPrices;
  companyBankInfo?: CompanyBankInfo;
  onChangePassword: () => void;
  onOpenStatement: () => void;
  onViewReceipt: (tx: Transaction) => void;
  onLogout: () => void;
  onSubmitRequest?: (data: {
    type: TransactionType;
    amount: number;
    weightKg?: number;
    unitPrice?: number;
    notes?: string;
    paymentMethod?: PaymentMethod;
    receiptImageUrl?: string;
  }) => void;
  onSubmitTopupReceipt?: (txId: string, receiptImageUrl: string, receiptNumber: string, notes?: string) => void;
}

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  person,
  summary,
  transactions,
  marketPrices,
  companyBankInfo,
  onChangePassword,
  onOpenStatement,
  onViewReceipt,
  onLogout,
  onSubmitRequest,
  onSubmitTopupReceipt,
}) => {
  const bankInfo = companyBankInfo || getStoredCompanyBankInfo() || DEFAULT_COMPANY_BANK_INFO;
  const persianDate = getPersianFullDate();
  const buyRate = marketPrices.buyPrice;
  const sellRate = marketPrices.sellPrice;

  // Request modal state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [activeRequestType, setActiveRequestType] = useState<TransactionType>('deposit');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Step 3 Upload Receipt Modal State
  const [uploadReceiptTx, setUploadReceiptTx] = useState<Transaction | null>(null);
  const [receiptImageBase64, setReceiptImageBase64] = useState<string>('');
  const [receiptCodeInput, setReceiptCodeInput] = useState<string>('');
  const [receiptNotesInput, setReceiptNotesInput] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');

  const handleOpenRequest = (type: TransactionType) => {
    setActiveRequestType(type);
    setIsRequestModalOpen(true);
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('حجم تصویر نباید بیشتر از ۵ مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptImageBase64(reader.result as string);
      setUploadError('');
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmSubmitReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadReceiptTx) return;

    if (!receiptImageBase64) {
      setUploadError('لطفاً عکس فیش واریزی بانکی را انتخاب یا آپلود کنید.');
      return;
    }

    if (!receiptCodeInput.trim()) {
      setUploadError('لطفاً شماره فیش یا کد پیگیری واریز را وارد نمایید.');
      return;
    }

    if (onSubmitTopupReceipt) {
      onSubmitTopupReceipt(
        uploadReceiptTx.id,
        receiptImageBase64,
        receiptCodeInput.trim(),
        receiptNotesInput.trim()
      );
    }

    setUploadReceiptTx(null);
    setReceiptImageBase64('');
    setReceiptCodeInput('');
    setReceiptNotesInput('');
  };

  // Filter client transactions
  const clientTxList = transactions.filter((t) => t.personId === person.id);
  const approvedTxList = clientTxList.filter((t) => (t.approvalStatus || 'approved') === 'approved');
  
  // Pending topup workflow transactions
  const step1Txs = clientTxList.filter((t) => t.approvalStatus === 'topup_step1_pending_bank');
  const step2Txs = clientTxList.filter((t) => t.approvalStatus === 'topup_step2_awaiting_receipt');
  const step3Txs = clientTxList.filter((t) => t.approvalStatus === 'topup_step3_pending_approval');
  const standardPendingTxs = clientTxList.filter((t) => t.approvalStatus === 'pending');

  // Currently active topup transaction for 4-step wizard
  const activeTopupTx = step2Txs[0] || step1Txs[0] || step3Txs[0] || null;

  const authSession: AuthSession = {
    role: 'client',
    personId: person.id,
    username: person.name,
    loginAt: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col text-stone-900 selection:bg-stone-800 selection:text-white dir-rtl">
      
      {/* Client Top Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black tracking-wider text-base shadow-sm">
              واته
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-stone-900">
                  پورتال مشتریان مس واته
                </h1>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                  حساب کاربری شخصی
                </span>
              </div>
              <p className="text-xs text-stone-500">
                خوش آمدید، <b>{person.name}</b> {person.phone && `(${person.phone})`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onChangePassword}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg transition-colors cursor-pointer"
              title="تغییر رمز عبور ورود"
            >
              <KeyRound className="w-4 h-4 text-stone-600" />
              <span className="hidden sm:inline">تغییر رمز عبور</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
              title="خروج از حساب"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6 flex-1">
        
        {/* 4-STEP TOPUP ACTION BANNERS FOR CLIENT */}
        {step2Txs.length > 0 && (
          <div className="space-y-3">
            {step2Txs.map((tx) => (
              <div
                key={tx.id}
                className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-stone-900 text-white rounded-2xl p-5 shadow-lg border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in zoom-in-95"
              >
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 bg-amber-400 text-stone-950 px-2.5 py-0.5 rounded-full text-xs font-black">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>مرحله ۲ از ۴: شماره حساب اختصاصی صادر شد!</span>
                  </div>
                  <h3 className="font-extrabold text-base sm:text-lg text-emerald-100">
                    شماره حساب واریز مبلغ {formatToman(tx.amount)} توسط مدیرعامل تعیین گردید.
                  </h3>
                  <p className="text-xs text-stone-300">
                    بانک مقصد: <b>{tx.assignedBankName}</b> ({tx.assignedOwnerName}) | شماره کارت: <span className="font-mono">{tx.assignedCardNumber}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenRequest('deposit')}
                  className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0 animate-pulse"
                >
                  <Upload className="w-4 h-4" />
                  <span>مشاهده شماره حساب و بارگذاری عکس فیش</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {step1Txs.length > 0 && (
          <div 
            onClick={() => handleOpenRequest('deposit')}
            className="p-4 bg-amber-50 border border-amber-300 hover:border-amber-400 rounded-2xl text-amber-950 flex items-center justify-between gap-3 shadow-xs cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 animate-spin-slow" />
              <div className="text-xs space-y-0.5">
                <span className="font-extrabold block">مرحله ۲: درخواست شارژ حساب در حال بررسی توسط مدیرعامل</span>
                <p className="text-amber-800">
                  درخواست شارژ مبلغ <b>{formatToman(step1Txs[0].amount)}</b> ثبت شد و در صف تعیین شماره حساب توسط مدیرعامل است.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-900 underline group-hover:text-amber-950 shrink-0">
              مشاهده وضعیت ➔
            </span>
          </div>
        )}

        {step3Txs.length > 0 && (
          <div 
            onClick={() => handleOpenRequest('deposit')}
            className="p-4 bg-blue-50 border border-blue-300 hover:border-blue-400 rounded-2xl text-blue-950 flex items-center justify-between gap-3 shadow-xs cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
              <div className="text-xs space-y-0.5">
                <span className="font-extrabold block">مرحله ۴: عکس فیش واریزی ارسال گردید (در انتظار شارژ نهایی)</span>
                <p className="text-blue-800">
                  عکس رسید بانکی شما با موفقیت دریافت شد و در حال بررسی نهایی و تأیید شارژ کیف پول توسط مدیرعامل می‌باشد.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-900 underline group-hover:text-blue-950 shrink-0">
              مشاهده وضعیت ➔
            </span>
          </div>
        )}

        {/* Quick Action Buttons for Client Requests */}
        <div className="bg-stone-900 rounded-2xl p-4 sm:p-5 text-white shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-400" />
                <span>ثبت درخواست‌های مالی و معاملاتی (شارژ فرآیند ۴ مرحله‌ای)</span>
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                شارژ حساب، برداشت پول، یا درخواست خرید و فروش مس مستقیم با مدیرعامل
              </p>
            </div>
            <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg font-semibold w-fit">
              تأیید سریع توسط مدیرعامل
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => handleOpenRequest('deposit')}
              className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
            >
              <ArrowDownLeft className="w-5 h-5 text-emerald-200 group-hover:scale-110 transition-transform" />
              <span>شارژ / واریز حساب</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenRequest('withdrawal')}
              className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
            >
              <ArrowUpRight className="w-5 h-5 text-rose-200 group-hover:scale-110 transition-transform" />
              <span>برداشت موجودی</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenRequest('sell')}
              className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
            >
              <TrendingUp className="w-5 h-5 text-blue-200 group-hover:scale-110 transition-transform" />
              <span>درخواست فروش مس</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenRequest('buy')}
              className="p-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
            >
              <ShoppingBag className="w-5 h-5 text-amber-200 group-hover:scale-110 transition-transform" />
              <span>درخواست خرید مس</span>
            </button>
          </div>
        </div>

        {/* Date and Rates Info Bar */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Calendar className="w-4 h-4 text-stone-400" />
            <span>امروز: <b>{persianDate}</b></span>
          </div>

          <div className="flex items-center gap-3 text-xs bg-stone-50 border border-stone-200/80 px-3 py-1.5 rounded-xl">
            <span className="text-stone-500">نرخ روز مس در بازار:</span>
            <span className="text-stone-700">خرید: <b className="font-mono text-stone-900">{formatNumber(buyRate)}</b> تومان</span>
            <span className="text-stone-300">|</span>
            <span className="text-stone-700">فروش: <b className="font-mono text-stone-900">{formatNumber(sellRate)}</b> تومان</span>
          </div>

          <button
            type="button"
            onClick={onOpenStatement}
            className="px-3.5 py-1.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs mr-auto sm:mr-0"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>چاپ صورت‌حساب رسمی و کاردکس</span>
          </button>
        </div>

        {/* Big Asset Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Wealth */}
          <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-white rounded-2xl p-5 shadow-sm space-y-2 border border-stone-700">
            <div className="flex items-center justify-between text-stone-400 text-xs font-semibold">
              <span>ارزش کل دارایی شما</span>
              <Wallet className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-white">
              {formatNumber(summary.totalAssetValue)}
              <span className="text-xs font-normal text-stone-300 mr-1.5">تومان</span>
            </div>
            <p className="text-[11px] text-stone-400 pt-1 border-t border-stone-700">
              مجموع موجودی ریالی + ارزش روز مس
            </p>
          </div>

          {/* Card 2: Copper Stock */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-stone-200 space-y-2">
            <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
              <span>موجودی مس در انبار</span>
              <Layers className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-amber-700">
              {formatNumber(summary.copperStockKg, 2)}
              <span className="text-xs font-bold text-stone-600 mr-1.5">کیلوگرم</span>
            </div>
            <p className="text-[11px] text-stone-500 pt-1 border-t border-stone-100 flex items-center justify-between">
              <span>ارزش روز مس:</span>
              <b className="font-mono text-stone-800">{formatNumber(summary.copperMarketValue)} تومان</b>
            </p>
          </div>

          {/* Card 3: Cash Wallet Balance */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-stone-200 space-y-2">
            <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
              <span>مانده کیف پول نقدی (ریالی)</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            </div>
            <div className={`text-2xl font-black font-mono tracking-tight ${
              summary.cashBalance >= 0 ? 'text-stone-900' : 'text-rose-600'
            }`}>
              {formatNumber(summary.cashBalance)}
              <span className="text-xs font-bold text-stone-600 mr-1.5">تومان</span>
            </div>
            <p className="text-[11px] text-stone-500 pt-1 border-t border-stone-100">
              {summary.cashBalance >= 0 ? 'مانده مثبت (بستانکار)' : 'مانده منفی (بدهکار)'}
            </p>
          </div>

          {/* Card 4: Profit & Trade Volume */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-stone-200 space-y-2">
            <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
              <span>سود محقق شده معاملات</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-emerald-700">
              {formatNumber(summary.realizedProfit)}
              <span className="text-xs font-bold text-stone-600 mr-1.5">تومان</span>
            </div>
            <p className="text-[11px] text-stone-500 pt-1 border-t border-stone-100 flex items-center justify-between">
              <span>کل مس خریداری شده:</span>
              <b className="font-mono text-stone-800">{formatWeight(summary.totalPurchasedKg)}</b>
            </p>
          </div>

        </div>

        {/* Transactions History Table */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-stone-900">
                تاریخچه تراکنش‌ها و ریز گردش حساب شما
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                لیست تمام واریزها، برداشت‌ها، و خرید و فروش‌های مس ثبت شده
              </p>
            </div>
            <span className="text-xs text-stone-500 font-mono">
              تعداد: <b>{formatNumber(approvedTxList.length)}</b> معامله
            </span>
          </div>

          {approvedTxList.length === 0 ? (
            <div className="p-10 text-center text-stone-400 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-stone-300" />
              <p className="text-xs font-semibold">هنوز هیچ تراکنشی برای حساب شما ثبت نشده است.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="p-3">تاریخ</th>
                    <th className="p-3">نوع معامله</th>
                    <th className="p-3">مقدار / وزن</th>
                    <th className="p-3">فی (تومان)</th>
                    <th className="p-3">مبلغ کل (تومان)</th>
                    <th className="p-3">مانده ریالی</th>
                    <th className="p-3">موجودی مس (kg)</th>
                    <th className="p-3 text-center">رسید</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {approvedTxList.map((tx) => {
                    const isPlusCash = tx.type === 'deposit' || tx.type === 'sell';
                    const isPlusCopper = tx.type === 'buy';

                    return (
                      <tr key={tx.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="p-3 font-mono text-stone-600 whitespace-nowrap">{tx.date}</td>
                        <td className="p-3 whitespace-nowrap">
                          {tx.type === 'deposit' && (
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              شارژ / واریز
                            </span>
                          )}
                          {tx.type === 'withdrawal' && (
                            <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              برداشت
                            </span>
                          )}
                          {tx.type === 'buy' && (
                            <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              خرید مس
                            </span>
                          )}
                          {tx.type === 'sell' && (
                            <span className="text-blue-800 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              فروش مس
                            </span>
                          )}
                          {tx.type === 'adjustment' && (
                            <span className="text-purple-800 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              اصلاحیه
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono whitespace-nowrap">
                          {tx.weightKg ? formatWeight(tx.weightKg) : '—'}
                        </td>
                        <td className="p-3 font-mono whitespace-nowrap">
                          {tx.unitPrice ? formatNumber(tx.unitPrice) : '—'}
                        </td>
                        <td className={`p-3 font-mono font-black whitespace-nowrap ${
                          isPlusCash ? 'text-emerald-700' : 'text-stone-900'
                        }`}>
                          {formatNumber(tx.amount)} تومان
                        </td>
                        <td className="p-3 font-mono text-stone-700 whitespace-nowrap">
                          {tx.cashBalanceAfter !== undefined ? formatNumber(tx.cashBalanceAfter) : '—'}
                        </td>
                        <td className="p-3 font-mono text-stone-700 whitespace-nowrap">
                          {tx.copperStockAfter !== undefined ? formatWeight(tx.copperStockAfter) : '—'}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onViewReceipt(tx)}
                            className="p-1.5 text-stone-600 hover:text-stone-950 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                            title="مشاهده رسید رسمی"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </main>

      {/* STEP 3: Client Upload Topup Receipt Modal */}
      {uploadReceiptTx && (
        <div className="fixed inset-0 z-60 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 dir-rtl">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-xl my-auto max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 bg-emerald-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <Upload className="w-6 h-6 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-white">
                    واریز وجه و بارگذاری فیش (مرحله ۳ از ۴)
                  </h3>
                  <p className="text-xs text-stone-300 mt-0.5">
                    شماره حساب اختصاصی را کپی کرده، وجه را واریز و عکس فیش را آپلود کنید.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUploadReceiptTx(null)}
                className="p-2 text-stone-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="بستن"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              
              {/* Assigned Bank Info Card */}
              <div className="bg-emerald-50/90 border border-emerald-300 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                  <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    <span>شماره حساب اختصاصی صادر شده توسط مدیرعامل</span>
                  </span>
                  <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    مبلغ: {formatToman(uploadReceiptTx.amount)}
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-2 text-xs text-stone-900">
                  <div className="flex justify-between font-bold text-stone-800">
                    <span>بانک: <b>{uploadReceiptTx.assignedBankName || 'بانک شرکت'}</b></span>
                    <span>صاحب حساب: <b>{uploadReceiptTx.assignedOwnerName || 'شرکت مس واته'}</b></span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-stone-100 font-mono bg-stone-50 p-2 rounded-lg">
                    <span className="text-stone-700 dir-ltr text-xs sm:text-sm font-bold">
                      {uploadReceiptTx.assignedCardNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(uploadReceiptTx.assignedCardNumber || '', 'card')}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedField === 'card' ? 'کپی شد!' : 'کپی کارت'}</span>
                    </button>
                  </div>

                  {uploadReceiptTx.assignedIbanNumber && (
                    <div className="flex justify-between items-center font-mono bg-stone-50 p-2 rounded-lg text-xs">
                      <span className="text-stone-700 dir-ltr font-bold">
                        {uploadReceiptTx.assignedIbanNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(uploadReceiptTx.assignedIbanNumber || '', 'iban')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedField === 'iban' ? 'کپی شد!' : 'کپی شبا'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleConfirmSubmitReceipt} className="space-y-4">
                {uploadError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Upload Receipt Image */}
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-2">
                    تصویر فیش یا رسید واریزی بانکی <span className="text-rose-500">*</span>
                  </label>
                  
                  {receiptImageBase64 ? (
                    <div className="relative rounded-2xl border-2 border-dashed border-emerald-500 p-3 bg-emerald-50/50 flex flex-col items-center gap-3">
                      <img
                        src={receiptImageBase64}
                        alt="پیش‌نمایش فیش"
                        className="max-h-52 rounded-xl object-contain shadow-md border border-emerald-300"
                      />
                      <button
                        type="button"
                        onClick={() => setReceiptImageBase64('')}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                      >
                        حذف و انتخاب مجدد تصویر
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-stone-300 hover:border-emerald-600 rounded-2xl p-7 flex flex-col items-center justify-center gap-2 cursor-pointer bg-stone-50 hover:bg-emerald-50/30 transition-all group">
                      <ImageIcon className="w-9 h-9 text-stone-400 group-hover:text-emerald-600 transition-colors" />
                      <span className="text-xs font-bold text-stone-800 group-hover:text-emerald-900">
                        برای آپلود تصویر فیش واریزی اینجا کلیک کنید
                      </span>
                      <span className="text-[10px] text-stone-400">فرمت‌های تصویری JPG, PNG, WEBP (حداکثر ۸ مگابایت)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Receipt / Reference Code */}
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-2">
                    شماره پیگیری / کد ارجاع فیش واریزی <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={receiptCodeInput}
                    onChange={(e) => setReceiptCodeInput(e.target.value)}
                    placeholder="مثال: ۱۲۳۴۵۶۷۸۹"
                    className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600 text-stone-900"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-2">
                    توضیحات تکمیلی <span className="text-stone-400 font-normal">(اختیاری)</span>
                  </label>
                  <input
                    type="text"
                    value={receiptNotesInput}
                    onChange={(e) => setReceiptNotesInput(e.target.value)}
                    placeholder="توضیحات در مورد واریز..."
                    className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 text-stone-900"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setUploadReceiptTx(null)}
                    className="px-4 py-2 text-xs font-bold text-stone-700 bg-stone-200 hover:bg-stone-300 rounded-xl cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>ارسال فیش جهت شارژ نهایی کیف پول (مرحله ۳)</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Client Request Modal */}
      {onSubmitRequest && (
        <ClientRequestModal
          isOpen={isRequestModalOpen}
          onClose={() => setIsRequestModalOpen(false)}
          person={person}
          summary={summary}
          marketPrices={marketPrices}
          companyBankInfo={bankInfo}
          initialType={activeRequestType}
          activeTopupTx={activeTopupTx}
          onSubmitRequest={onSubmitRequest}
          onSubmitTopupReceipt={onSubmitTopupReceipt}
        />
      )}

      {/* Real-time Support Chat Widget for Client */}
      <SupportChatWidget
        authSession={authSession}
        people={[person]}
      />

      {/* Client Footer */}
      <footer className="border-t border-stone-200 bg-white py-4 text-center text-xs text-stone-500">
        سامانه امن مدیریت معاملات مس واته • تمامی اطلاعات شما به صورت کدگذاری شده و اختصاصی محافظت می‌شود.
      </footer>

    </div>
  );
};
