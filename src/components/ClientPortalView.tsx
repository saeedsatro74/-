import React, { useState } from 'react';
import { 
  User, 
  Wallet, 
  Layers, 
  FileText, 
  LogOut, 
  KeyRound, 
  TrendingUp, 
  Calculator,
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
  X,
  XCircle,
  Sparkles,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { Person, Transaction, PersonWalletSummary, MarketPrices, TransactionType, PaymentMethod, CompanyBankInfo, AuthSession } from '../types';
import { formatToman, formatWeight, formatNumber } from '../utils/formatters';
import { getPersianFullDate } from '../utils/persianDate';
import { ClientRequestModal } from './ClientRequestModal';
import { SupportChatWidget } from './SupportChatWidget';
import { getStoredCompanyBankInfo, DEFAULT_COMPANY_BANK_INFO } from '../utils/storage';
import { CompanyCopperStockCard } from './CompanyCopperStockCard';
import { CopperChartView } from './CopperChartView';
import { AiAnalysisView } from './AiAnalysisView';

interface ClientPortalViewProps {
  person: Person;
  summary: PersonWalletSummary;
  transactions: Transaction[];
  marketPrices: MarketPrices;
  companyCopperStockKg?: number;
  companyBankInfo?: CompanyBankInfo;
  onChangePassword: () => void;
  onOpenStatement: () => void;
  onViewReceipt: (tx: Transaction) => void;
  onLogout: () => void;
  onOpenCopperChart?: () => void;
  onOpenAiAnalysis?: () => void;
  activeView?: 'dashboard' | 'copper-chart' | 'ai-analysis';
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
  onCancelRequest?: (txId: string) => void;
  onRefreshData?: () => void;
  isSyncing?: boolean;
}

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  person,
  summary,
  transactions,
  marketPrices,
  companyCopperStockKg = 2000,
  companyBankInfo,
  onChangePassword,
  onOpenStatement,
  onViewReceipt,
  onLogout,
  onOpenCopperChart,
  onOpenAiAnalysis,
  activeView = 'dashboard',
  onSubmitRequest,
  onSubmitTopupReceipt,
  onCancelRequest,
  onRefreshData,
  isSyncing = false,
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
  const rejectedTxs = clientTxList.filter((t) => t.approvalStatus === 'rejected');
  
  // Pending topup workflow transactions
  const pendingDepositTxs = clientTxList.filter(
    (t) => t.type === 'deposit' && t.approvalStatus !== 'approved' && t.approvalStatus !== 'rejected'
  );

  const step1Txs = pendingDepositTxs.filter(
    (t) => t.approvalStatus === 'topup_step1_pending_bank' || (t.approvalStatus === 'pending' && !t.assignedCardNumber)
  );

  const step2Txs = pendingDepositTxs.filter(
    (t) => t.approvalStatus === 'topup_step2_awaiting_receipt' || (t.approvalStatus === 'pending' && !!t.assignedCardNumber)
  );

  const step3Txs = pendingDepositTxs.filter(
    (t) => t.approvalStatus === 'topup_step3_pending_approval'
  );

  const standardPendingTxs = clientTxList.filter((t) => t.type !== 'deposit' && t.approvalStatus === 'pending');

  // Currently active topup transaction for 4-step wizard
  const activeTopupTx = step2Txs[0] || step1Txs[0] || step3Txs[0] || null;

  const hasPendingDeposit = clientTxList.some(
    (t) => t.type === 'deposit' && t.approvalStatus !== 'approved' && t.approvalStatus !== 'rejected'
  );

  const authSession: AuthSession = {
    role: 'client',
    personId: person.id,
    username: person.name,
    loginAt: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col text-stone-900 selection:bg-stone-800 selection:text-white dir-rtl">
      
      {/* Client Top Header */}
      <header className="bg-white border-b border-stone-200 lg:sticky lg:top-0 z-30 shadow-xs">
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
            {onRefreshData && (
              <button
                type="button"
                onClick={() => {
                  if (onRefreshData) onRefreshData();
                  window.location.reload();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 border border-amber-300 rounded-lg transition-colors cursor-pointer shadow-xs"
                title="دریافت و بروزرسانی لحظه‌ای اطلاعات و وضعیت تاییدات از سرور"
              >
                <RefreshCw className={`w-4 h-4 text-amber-800 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>بروزرسانی</span>
              </button>
            )}

            {onOpenCopperChart && (
              <button
                type="button"
                onClick={onOpenCopperChart}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                  activeView === 'copper-chart'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                }`}
                title="مشاهده چارت زنده قیمت جهانی مس در TradingView"
              >
                <TrendingUp className={`w-4 h-4 ${activeView === 'copper-chart' ? 'text-white' : 'text-amber-700'}`} />
                <span>چارت جهانی مس</span>
              </button>
            )}

            {onOpenAiAnalysis && (
              <button
                type="button"
                onClick={onOpenAiAnalysis}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                  activeView === 'ai-analysis'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                }`}
                title="مشاهده تحلیل هوشمند بازار مس با هوش مصنوعی جمنای"
              >
                <Sparkles className={`w-4 h-4 ${activeView === 'ai-analysis' ? 'text-white' : 'text-amber-500'}`} />
                <span>تحلیل هوشمند جمنای</span>
              </button>
            )}



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
      <main className="max-w-6xl w-full mx-auto px-2 sm:px-4 py-3 space-y-3 flex-1">
        
        {activeView === 'copper-chart' ? (
          <CopperChartView onBack={() => onOpenCopperChart?.()} userRole="client" />
        ) : activeView === 'ai-analysis' ? (
          <AiAnalysisView 
            onBack={() => onOpenAiAnalysis?.()} 
            overallStats={{
              totalCashBalance: summary.cashBalance,
              totalCopperStockKg: summary.copperStockKg,
              totalCopperMarketValue: summary.copperMarketValue,
              totalAssetValue: summary.totalAssetValue,
              totalRealizedProfit: summary.realizedProfit,
              pendingApprovalsCount: 0
            }}
            peopleCount={1}
            activeStockPeople={1}
            companyStock={companyCopperStockKg}
            livePrices={marketPrices}
          />
        ) : (
          <>
            {/* 4-STEP TOPUP ACTION BANNERS FOR CLIENT */}
            {step2Txs.length > 0 && (
              <div className="space-y-3">
                {step2Txs.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-stone-900 text-white rounded-2xl p-4 sm:p-5 shadow-xl border-2 border-emerald-500/40 space-y-3.5 animate-in fade-in zoom-in-95"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/30 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="inline-flex items-center gap-1 bg-amber-400 text-stone-950 px-2 py-0.5 rounded-md text-[11px] font-black">
                            <span>مرحله ۳ از ۴: شماره حساب صادر شد</span>
                          </div>
                          <h3 className="font-black text-sm sm:text-base text-emerald-100 mt-0.5">
                            واریز به حساب جهت شارژ مبلغ {formatToman(tx.amount)}
                          </h3>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setUploadReceiptTx(tx);
                          setReceiptImageBase64('');
                          setReceiptCodeInput('');
                          setReceiptNotesInput('');
                        }}
                        className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0 animate-bounce"
                      >
                        <Upload className="w-4 h-4" />
                        <span>بارگذاری عکس فیش بانکی ➔</span>
                      </button>
                    </div>

                    {/* Bank Card Info */}
                    <div className="bg-stone-950/60 backdrop-blur-md p-3.5 sm:p-4 rounded-xl border border-emerald-500/30 space-y-2.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-emerald-200">
                        <span>بانک مقصد: <b className="text-white text-sm">{tx.assignedBankName || 'بانک شرکت'}</b></span>
                        <span>نام صاحب حساب: <b className="text-white text-sm">{tx.assignedOwnerName || 'شرکت مس واته'}</b></span>
                      </div>

                      {/* Card Number */}
                      {tx.assignedCardNumber && (
                        <div className="flex items-center justify-between bg-emerald-950/80 p-2.5 rounded-lg border border-emerald-500/40">
                          <div className="flex items-center gap-2 font-mono">
                            <CreditCard className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="text-stone-300 text-[11px] font-sans">شماره کارت:</span>
                            <span className="text-amber-300 font-extrabold dir-ltr text-xs sm:text-sm tracking-wider">
                              {tx.assignedCardNumber}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(tx.assignedCardNumber || '', 'card')}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-md cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedField === 'card' ? 'کپی شد!' : 'کپی کارت'}</span>
                          </button>
                        </div>
                      )}

                      {/* IBAN */}
                      {tx.assignedIbanNumber && (
                        <div className="flex items-center justify-between bg-emerald-950/80 p-2.5 rounded-lg border border-emerald-500/40 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-stone-300 text-[11px] font-sans">شماره شبا:</span>
                            <span className="text-emerald-200 font-bold dir-ltr text-[11px] sm:text-xs tracking-wider">
                              {tx.assignedIbanNumber}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(tx.assignedIbanNumber || '', 'iban')}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-md cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedField === 'iban' ? 'کپی شد!' : 'کپی شبا'}</span>
                          </button>
                        </div>
                      )}

                      {tx.assignedBankNote && (
                        <p className="text-[11px] text-amber-200 bg-amber-950/40 p-2 rounded-md border border-amber-500/30">
                          💡 یادداشت مدیریت: {tx.assignedBankNote}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

        {step1Txs.length > 0 && (
          <div 
            onClick={() => handleOpenRequest('deposit')}
            className="p-2.5 bg-amber-50 border border-amber-200 hover:border-amber-300 rounded-lg text-amber-950 flex items-center justify-between gap-3 shadow-xs cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-spin-slow" />
              <div className="text-[11px] space-y-0.5">
                <span className="font-bold block">مرحله ۲: درخواست شارژ در حال بررسی مدیرعامل</span>
                <p className="text-amber-800 text-[10px]">
                  درخواست شارژ مبلغ <b>{formatToman(step1Txs[0].amount)}</b> ثبت شده و در انتظار تعیین حساب است.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-amber-900 underline group-hover:text-amber-950 shrink-0">
              بررسی ➔
            </span>
          </div>
        )}

        {step3Txs.length > 0 && (
          <div className="space-y-3">
            {step3Txs.map((tx) => (
              <div 
                key={tx.id}
                className="bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-xl border-2 border-blue-500/40 space-y-3 animate-in fade-in zoom-in-95"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-500/30 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1 bg-emerald-400 text-slate-950 px-2.5 py-0.5 rounded-md text-[11px] font-black">
                        <span>مرحله ۴ از ۴: فیش ارسال شد</span>
                      </div>
                      <h3 className="font-black text-sm sm:text-base text-blue-100 mt-0.5">
                        فیش واریزی مبلغ {formatToman(tx.amount)} جهت بررسی نهایی ثبت شد
                      </h3>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-200 border border-blue-400/40 px-3 py-1 rounded-xl text-xs font-bold shrink-0">
                    <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                    <span>در انتظار بررسی و شارژ مدیرعامل</span>
                  </span>
                </div>

                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-blue-500/30 text-xs space-y-2">
                  <p className="text-stone-300 leading-relaxed">
                    رسید واریزی بانکی و کد پیگیری <b className="font-mono text-amber-300">{tx.receiptNumber || 'ثبت شده'}</b> با موفقیت دریافت شد. پس از بررسی حساب بانکی توسط مدیرعامل، کیف پول شما به مبلغ <b>{formatToman(tx.amount)}</b> شارژ می‌گردد.
                  </p>

                  {tx.receiptImageUrl && (
                    <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                      <img 
                        src={tx.receiptImageUrl} 
                        alt="پیش‌نمایش فیش" 
                        className="w-12 h-12 rounded-lg object-cover border border-blue-400/60 shadow-xs cursor-pointer"
                        onClick={() => onViewReceipt(tx)}
                      />
                      <div className="flex-1">
                        <span className="text-[11px] text-stone-400 block">تصویر رسید واریزی ارسال‌شده:</span>
                        <span className="text-xs text-blue-200 font-mono">کد پیگیری: {tx.receiptNumber || 'ندارد'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onViewReceipt(tx)}
                        className="px-2.5 py-1.5 bg-blue-800 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                      >
                        مشاهده فیش
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rejected Requests Banner (Dismissible) */}
        {rejectedTxs.length > 0 && (
          <div className="space-y-2">
            {rejectedTxs.map((tx) => (
              <div 
                key={tx.id}
                className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                    <XCircle className="w-4 h-4" />
                  </div>
                  <div className="text-xs space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-rose-900">
                        درخواست {tx.type === 'deposit' ? 'شارژ حساب' : tx.type === 'withdrawal' ? 'برداشت' : tx.type === 'buy' ? 'خرید مس' : 'فروش مس'} به مبلغ {formatToman(tx.amount)} رد شد
                      </span>
                      <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.2 rounded font-bold">
                        توسط مدیر
                      </span>
                    </div>
                    {tx.rejectionReason && (
                      <p className="text-[11px] text-rose-800">
                        علت رد: <b>{tx.rejectionReason}</b>
                      </p>
                    )}
                  </div>
                </div>
                {onCancelRequest && (
                  <button
                    type="button"
                    onClick={() => onCancelRequest(tx.id)}
                    className="px-2.5 py-1 bg-rose-200 hover:bg-rose-300 text-rose-900 text-[11px] font-bold rounded-lg transition-colors cursor-pointer self-end sm:self-auto shrink-0"
                  >
                    بستن و حذف اعلان ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Standard Pending Tickets (Buy / Sell / Withdrawal) */}
        {standardPendingTxs.length > 0 && (
          <div className="space-y-2">
            {standardPendingTxs.map((tx) => (
              <div 
                key={tx.id}
                className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="text-xs space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold">
                        {tx.type === 'buy' ? '📦 تیکت درخواست خرید مس' : tx.type === 'sell' ? '📈 تیکت درخواست فروش مس' : '💳 تیکت درخواست برداشت وجه'}
                      </span>
                      <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                        در انتظار تأیید مدیرعامل
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900">
                      مبلغ: <b className="font-mono">{formatToman(tx.amount)}</b> {tx.weightKg ? `(وزن: ${formatWeight(tx.weightKg)})` : ''} • کد رهگیری: <span className="font-mono font-bold">{tx.receiptNumber}</span>
                    </p>
                    {tx.type === 'buy' && (
                      <p className="text-[10px] text-amber-800 font-semibold">
                        💡 به محض تأیید مدیرعامل، مبلغ {formatToman(tx.amount)} از موجودی کسر شده و مس به انبار شما اضافه می‌شود.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => onViewReceipt(tx)}
                    className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>مشاهده پیش‌فاکتور</span>
                  </button>
                  {onCancelRequest && (
                    <button
                      type="button"
                      onClick={() => onCancelRequest(tx.id)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                      title="لغو و حذف این درخواست"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>لغو و حذف درخواست</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Action Buttons for Client Requests */}
        <div className="bg-stone-900 rounded-lg p-3 sm:p-3.5 text-white shadow-sm space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-stone-800 pb-2">
            <div>
              <h2 className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-amber-400" />
                <span>ثبت درخواست‌های مالی و معاملاتی</span>
              </h2>
              <p className="text-[10px] text-stone-400">
                شارژ کیف پول، برداشت، یا خرید و فروش مس مستقیم با مدیرعامل
              </p>
            </div>
            <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold w-fit">
              تأیید فوری
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => handleOpenRequest('deposit')}
              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex flex-col items-center justify-center gap-1 cursor-pointer group"
            >
              <ArrowDownLeft className="w-4 h-4 group-hover:scale-110 transition-transform text-emerald-200" />
              <span>{hasPendingDeposit ? 'پیگیری و مدیریت شارژ' : 'شارژ حساب (واریز)'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenRequest('withdrawal')}
              className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex flex-col items-center justify-center gap-1 cursor-pointer group"
            >
              <ArrowUpRight className="w-4 h-4 text-rose-200 group-hover:scale-110 transition-transform" />
              <span>برداشت موجودی</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenRequest('sell')}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex flex-col items-center justify-center gap-1 cursor-pointer group"
            >
              <TrendingUp className="w-4 h-4 text-blue-200 group-hover:scale-110 transition-transform" />
              <span>فروش مس به شرکت</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenRequest('buy')}
              className="p-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex flex-col items-center justify-center gap-1 cursor-pointer group"
            >
              <ShoppingBag className="w-4 h-4 group-hover:scale-110 transition-transform text-amber-200" />
              <span>خرید مس از شرکت</span>
            </button>
          </div>

          {hasPendingDeposit && activeTopupTx && (
            <div className="bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mt-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  یک درخواست شارژ مبلغ <b className="text-white font-mono">{formatToman(activeTopupTx.amount)}</b> در جریان دارید.
                </span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {onCancelRequest && (
                  <button
                    type="button"
                    onClick={() => onCancelRequest(activeTopupTx.id)}
                    className="px-2.5 py-1 bg-rose-600/80 hover:bg-rose-600 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    لغو این درخواست
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenRequest('deposit')}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 text-[11px] font-extrabold rounded-lg transition-colors cursor-pointer"
                >
                  مشاهده و اقدام ➔
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Date and Rates Info Bar */}
        <div className="bg-white rounded-lg border border-stone-200 p-2 sm:p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-stone-500">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <span>امروز: <b>{persianDate}</b></span>
          </div>

          <div className="flex items-center gap-2 text-[10px] sm:text-xs bg-stone-50 border border-stone-100 px-2 py-1 rounded-md">
            <span className="text-stone-500">نرخ روز مس در بازار:</span>
            <span className="text-stone-700">خرید: <b className="font-mono text-stone-900">{formatNumber(buyRate)}</b> ت</span>
            <span className="text-stone-300">|</span>
            <span className="text-stone-700">فروش: <b className="font-mono text-stone-900">{formatNumber(sellRate)}</b> ت</span>
          </div>

          <button
            type="button"
            onClick={onOpenStatement}
            className="px-2.5 py-1 bg-stone-900 hover:bg-black text-white text-[10px] sm:text-xs font-bold rounded-md transition-colors flex items-center gap-1 cursor-pointer shadow-xs mr-auto sm:mr-0"
          >
            <FileText className="w-3 h-3 text-amber-400" />
            <span>چاپ صورت‌حساب رسمی</span>
          </button>
        </div>

        {/* Big Asset Summary Cards - High Density 2-Column Mobile Layout */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          
          {/* Card 1: Total Wealth */}
          <div className="bg-gradient-to-br from-stone-900 to-stone-850 text-white rounded-lg p-2.5 sm:p-3 shadow-xs space-y-1 border border-stone-800">
            <div className="flex items-center justify-between text-stone-400 text-[10px] sm:text-xs font-semibold">
              <span className="truncate">ارزش کل دارایی</span>
              <Wallet className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            </div>
            <div className="text-sm sm:text-base md:text-lg font-black font-mono tracking-tight text-white truncate">
              {formatNumber(summary.totalAssetValue)}
              <span className="text-[10px] font-normal text-stone-300 mr-0.5">ت</span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-stone-400 pt-1 border-t border-stone-800/80 truncate">
              مجموع ریالی + ارزش روز مس
            </p>
          </div>

          {/* Card 2: Copper Stock */}
          <div className="bg-white rounded-lg p-2.5 sm:p-3 shadow-xs border border-stone-200/95 space-y-1">
            <div className="flex items-center justify-between text-stone-500 text-[10px] sm:text-xs font-semibold">
              <span className="truncate">موجودی مس شما</span>
              <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            </div>
            <div className="text-sm sm:text-base md:text-lg font-black font-mono tracking-tight text-amber-700 truncate">
              {formatNumber(summary.copperStockKg, 2)}
              <span className="text-[10px] font-bold text-stone-600 mr-0.5">ک‌گ</span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-stone-500 pt-1 border-t border-stone-100 flex items-center justify-between truncate">
              <span>ارزش روز:</span>
              <b className="font-mono text-stone-800">{formatNumber(summary.copperMarketValue)} ت</b>
            </p>
          </div>

          {/* Card 3: Cash Wallet Balance */}
          <div className="bg-white rounded-lg p-2.5 sm:p-3 shadow-xs border border-stone-200/95 space-y-1">
            <div className="flex items-center justify-between text-stone-500 text-[10px] sm:text-xs font-semibold">
              <span className="truncate">مانده کیف پول (ریالی)</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>
            </div>
            <div className={`text-sm sm:text-base md:text-lg font-black font-mono tracking-tight truncate ${
              summary.cashBalance >= 0 ? 'text-stone-900' : 'text-rose-600'
            }`}>
              {formatNumber(summary.cashBalance)}
              <span className="text-[10px] font-bold text-stone-600 mr-0.5">ت</span>
            </div>
            {summary.pendingReservedCash && summary.pendingReservedCash > 0 ? (
              <p className="text-[9px] sm:text-[10px] text-amber-800 pt-1 border-t border-stone-100 truncate font-medium">
                در انتظار تأیید خرید/برداشت: <b>{formatNumber(summary.pendingReservedCash)} ت</b>
              </p>
            ) : (
              <p className="text-[9px] sm:text-[10px] text-stone-500 pt-1 border-t border-stone-100 truncate">
                {summary.cashBalance >= 0 ? 'مانده مثبت (بستانکار)' : 'مانده منفی (بدهکار)'}
              </p>
            )}
          </div>

          {/* Card 4: Profit & Trade Volume */}
          <div className="bg-white rounded-lg p-2.5 sm:p-3 shadow-xs border border-stone-200/95 space-y-1">
            <div className="flex items-center justify-between text-stone-500 text-[10px] sm:text-xs font-semibold">
              <span className="truncate">سود محقق شده</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            </div>
            <div className="text-sm sm:text-base md:text-lg font-black font-mono tracking-tight text-emerald-700 truncate">
              {formatNumber(summary.realizedProfit)}
              <span className="text-[10px] font-bold text-stone-600 mr-0.5">ت</span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-stone-500 pt-1 border-t border-stone-100 flex items-center justify-between truncate">
              <span>خرید کل:</span>
              <b className="font-mono text-stone-800">{formatWeight(summary.totalPurchasedKg)}</b>
            </p>
          </div>

        </div>

        {/* Transactions History Table */}
        <div className="bg-white rounded-lg border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-3 sm:p-3.5 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-stone-900">
                تاریخچه تراکنش‌ها و ریز گردش حساب شما
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                لیست تمام واریزها، برداشت‌ها، و خرید و فروش‌های مس قطعی و تأییدشده
              </p>
            </div>
            <span className="text-xs text-stone-500 font-mono">
              تعداد: <b>{formatNumber(approvedTxList.length)}</b> تراکنش تأیید شده
            </span>
          </div>

          {approvedTxList.length === 0 ? (
            <div className="p-10 text-center text-stone-400 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-stone-300" />
              <p className="text-xs font-semibold">هنوز هیچ تراکنش قطعی و تأییدشده‌ای برای حساب شما ثبت نشده است.</p>
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
                          {formatNumber(tx.cashBalanceAfter || 0)}
                        </td>
                        <td className="p-3 font-mono text-stone-700 whitespace-nowrap">
                          {formatWeight(tx.copperStockAfter || 0)}
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
          </>
        )}

      </main>

      {/* STEP 3: Client Upload Topup Receipt Modal */}
      {uploadReceiptTx && (
        <div className="fixed inset-0 z-60 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 dir-rtl">
          <div className="bg-white rounded-xl border border-stone-200 shadow-2xl w-full max-w-xl my-auto max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-4 bg-emerald-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <Upload className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    واریز وجه و بارگذاری فیش (مرحله ۳ از ۴)
                  </h3>
                  <p className="text-[10px] text-stone-300">
                    شماره حساب اختصاصی را کپی کرده، وجه را واریز و عکس فیش را آپلود کنید.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUploadReceiptTx(null)}
                className="p-1.5 text-stone-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="بستن"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              
              {/* Assigned Bank Info Card */}
              <div className="bg-emerald-50/90 border border-emerald-300 rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-center justify-between border-b border-emerald-200/80 pb-1.5">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>شماره حساب اختصاصی صادر شده توسط مدیرعامل</span>
                  </span>
                  <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
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
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-lg flex items-center gap-2">
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
                    <div className="relative rounded-lg border-2 border-dashed border-emerald-500 p-2.5 bg-emerald-50/50 flex flex-col items-center gap-2.5">
                      <img
                        src={receiptImageBase64}
                        alt="پیش‌نمایش فیش"
                        className="max-h-52 rounded-lg object-contain shadow-sm border border-emerald-300"
                      />
                      <button
                        type="button"
                        onClick={() => setReceiptImageBase64('')}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                      >
                        حذف و انتخاب مجدد تصویر
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-stone-300 hover:border-emerald-600 rounded-lg p-5 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-stone-50 hover:bg-emerald-50/30 transition-all group">
                      <ImageIcon className="w-8 h-8 text-stone-400 group-hover:text-emerald-600 transition-colors" />
                      <span className="text-xs font-bold text-stone-800 group-hover:text-emerald-900">
                        برای آپلود تصویر فیش واریزی اینجا کلیک کنید
                      </span>
                      <span className="text-[10px] text-stone-400">فرمت‌های JPG, PNG, WEBP (حداکثر ۸ مگابایت)</span>
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
          companyCopperStockKg={companyCopperStockKg}
          companyBankInfo={bankInfo}
          initialType={activeRequestType}
          activeTopupTx={activeTopupTx}
          hasPendingDeposit={hasPendingDeposit}
          onSubmitRequest={onSubmitRequest}
          onSubmitTopupReceipt={onSubmitTopupReceipt}
          onCancelRequest={onCancelRequest}
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
