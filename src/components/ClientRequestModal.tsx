import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ShoppingBag, 
  TrendingUp, 
  AlertTriangle, 
  Building2, 
  Wallet, 
  Clock, 
  Send,
  CheckCircle2,
  Copy,
  Upload,
  ImageIcon,
  ShieldCheck,
  AlertCircle,
  CreditCard,
  Calendar
} from 'lucide-react';
import { Person, PersonWalletSummary, MarketPrices, TransactionType, PaymentMethod, CompanyBankInfo, Transaction } from '../types';
import { formatNumber, formatToman, formatWeight } from '../utils/formatters';
import { NumericInput } from './NumericInput';

function formatPersianDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fa-IR');
  } catch {
    return dateStr;
  }
}

interface ClientRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person;
  summary: PersonWalletSummary;
  marketPrices: MarketPrices;
  companyCopperStockKg?: number;
  companyBankInfo?: CompanyBankInfo;
  initialType?: TransactionType;
  activeTopupTx?: Transaction | null;
  hasPendingDeposit?: boolean;
  onSubmitRequest: (data: {
    type: TransactionType;
    amount: number;
    weightKg?: number;
    unitPrice?: number;
    notes?: string;
    paymentMethod?: PaymentMethod;
    chequeNumber?: string;
    chequeDueDate?: string;
    chequeBank?: string;
    receiptImageUrl?: string;
    saleCategory?: 'internal' | 'external';
    buyerName?: string;
  }) => void;
  onSubmitTopupReceipt?: (
    txId: string,
    receiptImageUrl: string,
    receiptNumber: string,
    notes?: string
  ) => void;
  onCancelRequest?: (txId: string) => void;
}

export const ClientRequestModal: React.FC<ClientRequestModalProps> = ({
  isOpen,
  onClose,
  person,
  summary,
  marketPrices,
  companyCopperStockKg = 2000,
  initialType = 'deposit',
  activeTopupTx,
  hasPendingDeposit = false,
  onSubmitRequest,
  onSubmitTopupReceipt,
  onCancelRequest,
}) => {
  const [requestType, setRequestType] = useState<TransactionType>(initialType);

  // Form fields for fresh requests
  const [amount, setAmount] = useState<number>(0);
  const [weightKg, setWeightKg] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(
    initialType === 'buy' ? marketPrices.buyPrice : marketPrices.sellPrice
  );
  const [saleCategory, setSaleCategory] = useState<'internal' | 'external'>('internal');
  const [buyerName, setBuyerName] = useState<string>('');

  // Payment Method & Cheque State for Sell Copper
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDueDate, setChequeDueDate] = useState('');
  const [chequeBank, setChequeBank] = useState('');
  
  // Buy copper multi-step wizard states
  const [buyStep, setBuyStep] = useState<1 | 2>(1);
  const [buyInputMode, setBuyInputMode] = useState<'weight' | 'budget'>('weight');
  const [buyBudget, setBuyBudget] = useState<number>(0);
  
  // Withdrawal specific
  const [clientCardNumber, setClientCardNumber] = useState('');
  const [clientBankName, setClientBankName] = useState('');
  
  // Step 3 (Topup Receipt Upload) State inside Deposit Modal
  const [receiptImageBase64, setReceiptImageBase64] = useState<string>('');
  const [receiptCodeInput, setReceiptCodeInput] = useState<string>('');
  const [receiptNotesInput, setReceiptNotesInput] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // General Error & Feedback
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRequestType(initialType);
      setWeightKg(0);
      setAmount(0);
      setBuyStep(1);
      setBuyBudget(0);
      setBuyerName('');
      setPaymentMethod('cash');
      setChequeNumber('');
      setChequeDueDate('');
      setChequeBank('');
      setNotes('');
      setError('');
    }
  }, [isOpen, initialType]);

  useEffect(() => {
    if (isOpen) {
      if (requestType === 'sell' && saleCategory === 'external') {
        // External sale: user specifies custom negotiated price freely
      } else {
        const defaultPrice = requestType === 'buy' ? marketPrices.buyPrice : marketPrices.sellPrice;
        setUnitPrice(defaultPrice);
      }
    }
  }, [requestType, isOpen, marketPrices, saleCategory]);

  if (!isOpen) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('حجم تصویر نباید بیشتر از ۸ مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptImageBase64(reader.result as string);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitStep3Receipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTopupTx) return;

    if (!receiptImageBase64) {
      setError('لطفاً عکس فیش یا رسید واریزی را بارگذاری کنید.');
      return;
    }

    if (!receiptCodeInput.trim()) {
      setError('لطفاً شماره پیگیری یا کد ارجاع فیش واریزی را وارد کنید.');
      return;
    }

    if (onSubmitTopupReceipt) {
      onSubmitTopupReceipt(
        activeTopupTx.id,
        receiptImageBase64,
        receiptCodeInput.trim(),
        receiptNotesInput.trim()
      );
    }

    setReceiptImageBase64('');
    setReceiptCodeInput('');
    setReceiptNotesInput('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // --- DEPOSIT REQUEST (Step 1 of 4) ---
    if (requestType === 'deposit') {
      if (amount <= 0) {
        setError('لطفاً مبلغ مورد نظر جهت شارژ حساب را وارد نمایید.');
        return;
      }

      onSubmitRequest({
        type: 'deposit',
        amount,
        notes: notes.trim() ? `توضیحات مشتری: ${notes.trim()}` : undefined,
      });
      onClose();
      return;
    }

    // --- WITHDRAWAL REQUEST ---
    if (requestType === 'withdrawal') {
      if (amount <= 0) {
        setError('لطفاً مبلغ درخواستی برای برداشت را وارد کنید.');
        return;
      }
      if (amount > summary.cashBalance) {
        setError(
          `مبلغ درخواستی برداشت (${formatToman(amount)}) بیشتر از موجودی نقدی شما (${formatToman(
            summary.cashBalance
          )}) است.`
        );
        return;
      }
      if (!clientCardNumber.trim()) {
        setError('لطفاً شماره کارت یا شبا خود را جهت واریز وجه وارد کنید.');
        return;
      }
      let finalNotes = `شماره کارت/شبا مقصد: ${clientCardNumber.trim()} (${clientBankName.trim() || 'بانک مقصد'})`;
      if (notes.trim()) finalNotes += ` | توضیحات: ${notes.trim()}`;

      onSubmitRequest({
        type: 'withdrawal',
        amount,
        notes: finalNotes,
      });
      onClose();
      return;
    }

    // --- SELL COPPER REQUEST ---
    if (requestType === 'sell') {
      if (weightKg <= 0) {
        setError('لطفاً مقدار مس برای فروش به کیلوگرم را وارد کنید.');
        return;
      }
      if (weightKg > summary.copperStockKg) {
        setError(
          `موجودی مس شما کافی نیست! موجودی فعلی: ${formatWeight(summary.copperStockKg)}، مقدار درخواستی: ${formatWeight(
            weightKg
          )}`
        );
        return;
      }
      if (unitPrice <= 0) {
        setError('لطفاً قیمت پیشنهادی هر کیلوگرم مس را وارد کنید.');
        return;
      }
      if (saleCategory === 'external' && !buyerName.trim()) {
        setError('لطفاً نام شخص یا شرکت خریدار مس (مثلاً آقای سهرابی) را وارد نمایید.');
        return;
      }
      if (paymentMethod === 'cheque') {
        if (!chequeNumber.trim()) {
          setError('لطفاً شماره چک یا شناسه صیادی را وارد نمایید.');
          return;
        }
        if (!chequeDueDate.trim()) {
          setError('لطفاً تاریخ سررسید چک را وارد نمایید.');
          return;
        }
      }

      const effectiveBuyer = saleCategory === 'external' ? buyerName.trim() : 'شرکت مس واته';
      const totalCalculated = Math.round(weightKg * unitPrice);
      const catTitle = saleCategory === 'external' ? `فروش به خارج (خریدار: ${effectiveBuyer})` : 'فروش به انبار شرکت (خریدار: شرکت مس واته)';
      const payTitle = paymentMethod === 'cheque' ? `تسویه چکی (چک: ${chequeNumber.trim()} - سررسید: ${chequeDueDate.trim()})` : 'تسویه نقد (کیف پول)';
      let finalNotes = `[${catTitle} | ${payTitle}] درخواست فروش ${formatWeight(weightKg)} مس با نرخ ${formatToman(unitPrice)} | خریدار: ${effectiveBuyer}`;
      if (notes.trim()) finalNotes += ` | توضیحات: ${notes.trim()}`;

      onSubmitRequest({
        type: 'sell',
        amount: totalCalculated,
        weightKg,
        unitPrice,
        saleCategory,
        buyerName: effectiveBuyer,
        paymentMethod,
        chequeNumber: paymentMethod === 'cheque' ? chequeNumber.trim() : undefined,
        chequeDueDate: paymentMethod === 'cheque' ? chequeDueDate.trim() : undefined,
        chequeBank: paymentMethod === 'cheque' ? chequeBank.trim() : undefined,
        notes: finalNotes,
      });
      onClose();
      return;
    }

    // --- BUY COPPER REQUEST ---
    if (requestType === 'buy') {
      const curPrice = marketPrices.buyPrice;
      if (curPrice <= 0) {
        setError('قیمت مرجع روز نامعتبر است.');
        return;
      }

      if (buyStep === 1) {
        // Validation for step 1
        if (buyInputMode === 'weight') {
          if (weightKg <= 0) {
            setError('لطفاً وزن مس مورد نظر خود را به کیلوگرم وارد کنید.');
            return;
          }
          const totalAmount = Math.round(weightKg * curPrice);
          if (summary.cashBalance <= 0 || totalAmount > summary.cashBalance) {
            setError(
              `موجودی نقدی شما (${formatToman(summary.cashBalance)}) برای این خرید (${formatToman(
                totalAmount
              )}) کافی نیست. لطفاً ابتدا حساب خود را شارژ نمایید.`
            );
            return;
          }
          setAmount(totalAmount);
          setUnitPrice(curPrice);
          setBuyStep(2);
        } else {
          if (buyBudget <= 0) {
            setError('لطفاً مبلغ بودجه خود را به تومان وارد کنید.');
            return;
          }
          if (summary.cashBalance <= 0 || buyBudget > summary.cashBalance) {
            setError(
              `مبلغ بودجه وارد شده (${formatToman(buyBudget)}) بیشتر از موجودی ریالی فعلی شما (${formatToman(
                summary.cashBalance
              )}) می‌باشد. لطفاً ابتدا حساب خود را شارژ نمایید.`
            );
            return;
          }
          const calculatedWeight = Math.round((buyBudget / curPrice) * 100) / 100;
          setWeightKg(calculatedWeight);
          setAmount(buyBudget);
          setUnitPrice(curPrice);
          setBuyStep(2);
        }
        return;
      }

      // Step 2 submission
      const totalCalculated = amount;
      let finalNotes = buyInputMode === 'weight'
        ? `درخواست خرید ${formatWeight(weightKg)} مس با نرخ ${formatToman(unitPrice)} (بر اساس وزن)`
        : `درخواست خرید مس با بودجه ${formatToman(amount)} معادل ${formatWeight(weightKg)} کیلوگرم (بر اساس بودجه)`;

      if (notes.trim()) finalNotes += ` | توضیحات: ${notes.trim()}`;

      onSubmitRequest({
        type: 'buy',
        amount: totalCalculated,
        weightKg,
        unitPrice,
        notes: finalNotes,
      });
      onClose();
      return;
    }
  };

  const getHeaderInfo = () => {
    switch (requestType) {
      case 'deposit':
        return {
          title: 'فرآیند شارژ و واریز موجودی حساب',
          subtitle: 'پیگیری مرحله به مرحله ثبت درخواست، دریافت شماره حساب و واریز وجه',
          icon: <ArrowDownLeft className="w-6 h-6 text-emerald-400" />,
          colorBg: 'bg-emerald-900',
          btnColor: 'bg-emerald-700 hover:bg-emerald-800',
        };
      case 'withdrawal':
        return {
          title: 'درخواست برداشت موجودی ریالی',
          subtitle: 'ثبت درخواست تسویه و واریز وجه به شماره کارت شما توسط مدیرعامل',
          icon: <ArrowUpRight className="w-6 h-6 text-rose-400" />,
          colorBg: 'bg-rose-950',
          btnColor: 'bg-rose-700 hover:bg-rose-800',
        };
      case 'sell':
        return {
          title: saleCategory === 'external'
            ? 'درخواست فروش مس به خارج (خریدار بیرونی)'
            : 'درخواست فروش مس به شرکت',
          subtitle: saleCategory === 'external'
            ? 'فروش مس به خریدار مدنظر شما با قیمت توافقی و تسویه از طریق شرکت'
            : 'تبدیل مس موجود در انبار به موجودی ریالی (تسویه نقدی یا چک صیادی)',
          icon: <TrendingUp className="w-6 h-6 text-blue-400" />,
          colorBg: saleCategory === 'external' ? 'bg-amber-950' : 'bg-blue-950',
          btnColor: saleCategory === 'external' ? 'bg-amber-700 hover:bg-amber-800' : 'bg-blue-700 hover:bg-blue-800',
        };
      case 'buy':
        return {
          title: 'درخواست خرید مس از انبار',
          subtitle: 'خرید مس با موجودی کیف پول ریالی بر اساس نرخ روز بازار',
          icon: <ShoppingBag className="w-6 h-6 text-amber-400" />,
          colorBg: 'bg-amber-950',
          btnColor: 'bg-amber-700 hover:bg-amber-800',
        };
    }
  };

  const info = getHeaderInfo();

  // Helper to determine current deposit step number
  const getDepositStepNumber = () => {
    if (!activeTopupTx) return 1;
    if (activeTopupTx.approvalStatus === 'topup_step3_pending_approval') return 4;
    if (activeTopupTx.approvalStatus === 'topup_step2_awaiting_receipt' || !!activeTopupTx.assignedCardNumber) return 3;
    if (activeTopupTx.approvalStatus === 'topup_step1_pending_bank' || activeTopupTx.approvalStatus === 'pending') return 2;
    return 1;
  };

  const currentDepositStep = getDepositStepNumber();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 dir-rtl">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className={`p-5 ${info.colorBg} text-white flex items-center justify-between shrink-0 z-10 shadow-md`}>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              {info.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-xl text-white">
                  {info.title}
                </h3>
              </div>
              <p className="text-xs text-stone-300 mt-0.5">
                {info.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title="بستن"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-5 sm:p-7 space-y-5 flex-1">
            
            {/* Wallet Quick Overview */}
            <div className="grid grid-cols-2 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-stone-500 block text-[11px]">موجودی نقدی کیف پول:</span>
                  <span className="font-extrabold text-stone-900 font-mono text-sm block truncate">
                    {formatNumber(summary.cashBalance)} <span className="text-[10px] text-stone-500 font-sans">تومان</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 border-r border-stone-200 pr-4">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shrink-0">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-stone-500 block text-[11px]">موجودی مس در انبار:</span>
                  <span className="font-extrabold text-amber-900 font-mono text-sm block truncate">
                    {formatWeight(summary.copperStockKg)}
                  </span>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
                {requestType === 'buy' && summary.cashBalance <= 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setRequestType('deposit');
                    }}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>شارژ حساب (واریز)</span>
                  </button>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* DEPOSIT WORKFLOW (DYNAMIC 4-STEP WIZARD) */}
            {/* ======================================================== */}
            {requestType === 'deposit' && (
              <div className="space-y-6">

                {/* VISUAL 4-STEP PROGRESS BAR */}
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold text-stone-800 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-emerald-700" />
                      <span>مراحل شارژ و واریز وجه به حساب</span>
                    </span>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      مرحله {currentDepositStep} از ۴
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-bold relative">
                    
                    {/* Step 1 */}
                    <div className={`p-2.5 rounded-xl border transition-all flex flex-col items-center gap-1 ${
                      currentDepositStep > 1 
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                        : currentDepositStep === 1
                        ? 'bg-emerald-600 border-emerald-700 text-white shadow-md'
                        : 'bg-white border-stone-200 text-stone-400'
                    }`}>
                      <span className="text-[10px] opacity-80">مرحله ۱</span>
                      <span className="text-[11px] font-black leading-tight">ثبت مبلغ</span>
                      {currentDepositStep > 1 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 mt-0.5" />}
                    </div>

                    {/* Step 2 */}
                    <div className={`p-2.5 rounded-xl border transition-all flex flex-col items-center gap-1 ${
                      currentDepositStep > 2
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                        : currentDepositStep === 2
                        ? 'bg-amber-500 border-amber-600 text-white shadow-md animate-pulse'
                        : 'bg-white border-stone-200 text-stone-400'
                    }`}>
                      <span className="text-[10px] opacity-80">مرحله ۲</span>
                      <span className="text-[11px] font-black leading-tight">تأیید مدیر</span>
                      {currentDepositStep === 2 && <Clock className="w-3.5 h-3.5 text-amber-100 mt-0.5" />}
                      {currentDepositStep > 2 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 mt-0.5" />}
                    </div>

                    {/* Step 3 */}
                    <div className={`p-2.5 rounded-xl border transition-all flex flex-col items-center gap-1 ${
                      currentDepositStep > 3
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                        : currentDepositStep === 3
                        ? 'bg-emerald-600 border-emerald-700 text-white shadow-md ring-2 ring-emerald-400/50'
                        : 'bg-white border-stone-200 text-stone-400'
                    }`}>
                      <span className="text-[10px] opacity-80">مرحله ۳</span>
                      <span className="text-[11px] font-black leading-tight">آپلود فیش</span>
                      {currentDepositStep === 3 && <Upload className="w-3.5 h-3.5 text-white mt-0.5" />}
                      {currentDepositStep > 3 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 mt-0.5" />}
                    </div>

                    {/* Step 4 */}
                    <div className={`p-2.5 rounded-xl border transition-all flex flex-col items-center gap-1 ${
                      currentDepositStep === 4
                        ? 'bg-blue-600 border-blue-700 text-white shadow-md animate-pulse'
                        : 'bg-white border-stone-200 text-stone-400'
                    }`}>
                      <span className="text-[10px] opacity-80">مرحله ۴</span>
                      <span className="text-[11px] font-black leading-tight">شارژ نهایی</span>
                      {currentDepositStep === 4 && <Clock className="w-3.5 h-3.5 text-blue-100 mt-0.5" />}
                    </div>

                  </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* CASE A: STEP 1 FRESH FORM (No active topup request) */}
                {/* ------------------------------------------------------------- */}
                {!activeTopupTx && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4.5 space-y-1.5">
                      <div className="flex items-center gap-2 text-emerald-950 font-extrabold text-sm">
                        <Building2 className="w-5 h-5 text-emerald-700" />
                        <span>مرحله ۱: ثبت مبلغ درخواستی جهت دریافت شماره حساب</span>
                      </div>
                      <p className="text-xs text-emerald-900 leading-relaxed">
                        مبلغ مدنظر برای شارژ حساب را وارد نمایید. پس از ثبت، درخواست به مدیرعامل ارسال می‌گردد تا شماره حساب اختصاصی شرکت برای شما صادر شود.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-2">
                        مبلغ درخواستی جهت شارژ حساب (تومان) <span className="text-rose-500">*</span>
                      </label>
                      <NumericInput
                        value={amount}
                        onChange={(val) => {
                          setAmount(val);
                          setError('');
                        }}
                        placeholder="مثال: 50,000,000"
                        unitLabel="تومان"
                        showWordHelper={true}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-2">
                        توضیحات تکمیلی <span className="text-stone-400 font-normal">(اختیاری)</span>
                      </label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="هرگونه توضیح در مورد این واریزی..."
                        className="w-full p-3 text-xs bg-stone-50 border border-stone-300 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
                      />
                    </div>

                    <div className="p-4 border-t border-stone-200 bg-stone-50 rounded-2xl flex items-center justify-between">
                      <span className="text-xs text-stone-500">پس از ثبت، مدیرعامل شماره حساب جهت واریز وجه را ارسال می‌کند.</span>
                      <button
                        type="submit"
                        className="px-6 py-2.5 text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        <span>ثبت درخواست و دریافت شماره حساب</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* ------------------------------------------------------------- */}
                {/* CASE B: STEP 2 (Awaiting CEO Bank Account Assignment) */}
                {/* ------------------------------------------------------------- */}
                {activeTopupTx && !activeTopupTx.assignedCardNumber && (activeTopupTx.approvalStatus === 'topup_step1_pending_bank' || activeTopupTx.approvalStatus === 'pending') && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md animate-pulse">
                          <Clock className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-amber-900 bg-amber-200 px-2.5 py-0.5 rounded-full inline-block mb-1">
                            مرحله ۲ از ۴ • در حال بررسی توسط مدیرعامل
                          </span>
                          <h4 className="font-extrabold text-stone-900 text-base">
                            درخواست شارژ حساب شما ثبت گردید
                          </h4>
                        </div>
                      </div>

                      <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200 text-xs space-y-2">
                        <div className="flex justify-between items-center text-stone-700">
                          <span>مبلغ درخواستی شما:</span>
                          <span className="font-extrabold text-stone-950 font-mono text-sm">
                            {formatToman(activeTopupTx.amount)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-stone-600 border-t border-stone-100 pt-2 text-[11px]">
                          <span>کد پیگیری درخواست:</span>
                          <span className="font-mono text-stone-900 font-bold">{activeTopupTx.receiptNumber}</span>
                        </div>
                        <div className="flex justify-between items-center text-stone-600 text-[11px]">
                          <span>تاریخ ثبت:</span>
                          <span>{formatPersianDate(activeTopupTx.date)}</span>
                        </div>
                      </div>

                      <p className="text-xs text-amber-950 leading-relaxed font-semibold">
                        درخواست شما جهت اختصاص شماره حساب برای مدیرعامل ارسال گردیده است. به محض اینکه مدیرعامل شماره حساب و کارت شرکت را ثبت نماید، این صفحه به‌روزرسانی شده و کادر واریز وجه و آپلود فیش بانکی برای شما فعال می‌گردد.
                      </p>
                    </div>

                    <div className="p-4 bg-stone-100 border border-stone-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-600">
                      <span>لطفاً منتظر تأیید و ارسال شماره حساب اختصاصی توسط مدیرعامل باشید...</span>
                      {onCancelRequest && (
                        <button
                          type="button"
                          onClick={() => {
                            onCancelRequest(activeTopupTx.id);
                            onClose();
                          }}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs shrink-0"
                        >
                          لغو این درخواست و تغییر مبلغ
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* CASE C: STEP 3 (CEO Bank Assigned, Awaiting Receipt Upload) */}
                {/* ------------------------------------------------------------- */}
                {activeTopupTx && (activeTopupTx.approvalStatus === 'topup_step2_awaiting_receipt' || (!!activeTopupTx.assignedCardNumber && activeTopupTx.approvalStatus !== 'topup_step3_pending_approval')) && (
                  <form onSubmit={handleSubmitStep3Receipt} className="space-y-4">
                    
                    {/* Bank Info Card */}
                    <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4.5 space-y-3">
                      <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-emerald-700" />
                          <span className="text-xs font-extrabold text-emerald-950">
                            شماره حساب اختصاصی صادر شده توسط مدیرعامل
                          </span>
                        </div>
                        <span className="text-xs font-black text-emerald-900 bg-emerald-200 px-3 py-1 rounded-full font-mono">
                          مبلغ: {formatToman(activeTopupTx.amount)}
                        </span>
                      </div>

                      <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-2.5 text-xs text-stone-900">
                        <div className="flex justify-between font-bold text-stone-800">
                          <span>بانک: <b className="text-emerald-900">{activeTopupTx.assignedBankName || 'بانک شرکت'}</b></span>
                          <span>صاحب حساب: <b>{activeTopupTx.assignedOwnerName || 'شرکت مس واته'}</b></span>
                        </div>

                        {/* Card Number */}
                        <div className="flex justify-between items-center pt-2 border-t border-stone-100 font-mono bg-stone-50 p-2.5 rounded-xl">
                          <div className="flex items-center gap-2">
                            <span className="text-stone-500 text-[11px] font-sans">شماره کارت:</span>
                            <span className="text-stone-900 dir-ltr text-xs sm:text-sm font-black">
                              {activeTopupTx.assignedCardNumber}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(activeTopupTx.assignedCardNumber || '', 'card')}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedField === 'card' ? 'کپی شد!' : 'کپی شماره کارت'}</span>
                          </button>
                        </div>

                        {/* IBAN Number */}
                        {activeTopupTx.assignedIbanNumber && (
                          <div className="flex justify-between items-center font-mono bg-stone-50 p-2.5 rounded-xl text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-stone-500 text-[11px] font-sans">شماره شبا:</span>
                              <span className="text-stone-900 dir-ltr font-bold text-xs">
                                {activeTopupTx.assignedIbanNumber}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(activeTopupTx.assignedIbanNumber || '', 'iban')}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>{copiedField === 'iban' ? 'کپی شد!' : 'کپی شبا'}</span>
                            </button>
                          </div>
                        )}

                        {activeTopupTx.assignedBankNote && (
                          <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg font-medium">
                            💡 یادداشت مدیرعامل: {activeTopupTx.assignedBankNote}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Step 3 Form: Upload Receipt */}
                    <div className="space-y-4 pt-1">
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

                      {/* Receipt Code */}
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
                          placeholder="توضیحات واریز..."
                          className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 text-stone-900"
                        />
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-2">
                        {onCancelRequest && (
                          <button
                            type="button"
                            onClick={() => {
                              onCancelRequest(activeTopupTx.id);
                              onClose();
                            }}
                            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl transition-colors cursor-pointer text-xs shrink-0"
                          >
                            لغو درخواست
                          </button>
                        )}
                        <button
                          type="submit"
                          className="w-full py-3 text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 transition-all"
                        >
                          <Send className="w-4 h-4" />
                          <span>ارسال فیش جهت شارژ نهایی کیف پول (مرحله ۳)</span>
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* ------------------------------------------------------------- */}
                {/* CASE D: STEP 4 (Receipt Uploaded, Awaiting CEO Final Approval) */}
                {/* ------------------------------------------------------------- */}
                {activeTopupTx && activeTopupTx.approvalStatus === 'topup_step3_pending_approval' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md animate-pulse">
                          <Clock className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-blue-900 bg-blue-200 px-2.5 py-0.5 rounded-full inline-block mb-1">
                            مرحله ۴ از ۴ • بررسی فیش و شارژ کیف پول
                          </span>
                          <h4 className="font-extrabold text-stone-900 text-base">
                            تصویر فیش و کد پیگیری با موفقیت ارسال گردید
                          </h4>
                        </div>
                      </div>

                      <div className="bg-white/90 p-3.5 rounded-xl border border-blue-200 text-xs space-y-2">
                        <div className="flex justify-between items-center text-stone-700">
                          <span>مبلغ واریزی:</span>
                          <span className="font-extrabold text-stone-950 font-mono text-sm">
                            {formatToman(activeTopupTx.amount)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-stone-600 border-t border-stone-100 pt-2 text-[11px]">
                          <span>کد پیگیری فیش:</span>
                          <span className="font-mono text-stone-900 font-bold">{activeTopupTx.receiptNumber}</span>
                        </div>
                        {activeTopupTx.receiptImageUrl && (
                          <div className="pt-2">
                            <span className="text-stone-500 block text-[11px] mb-1">تصویر فیش بارگذاری شده:</span>
                            <img
                              src={activeTopupTx.receiptImageUrl}
                              alt="رسید"
                              className="max-h-40 rounded-lg object-contain border border-stone-300 shadow-xs"
                            />
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-blue-950 leading-relaxed font-semibold">
                        تصویر رسید و شماره پیگیری شما جهت تایید نهایی صورتحساب برای مدیرعامل ارسال شد. به محض تایید مدیریت، مبلغ کیف پول ریالی شما شارژ خواهد شد.
                      </p>

                      {onCancelRequest && (
                        <div className="pt-2 border-t border-blue-200 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              onCancelRequest(activeTopupTx.id);
                              onClose();
                            }}
                            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs"
                          >
                            لغو این درخواست
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ======================================================== */}
            {/* WITHDRAWAL FORM CONTENT */}
            {/* ======================================================== */}
            {requestType === 'withdrawal' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-2">
                    مبلغ درخواستی برای برداشت (تومان) <span className="text-rose-500">*</span>
                  </label>
                  <NumericInput
                    value={amount}
                    onChange={(val) => {
                      setAmount(val);
                      setError('');
                    }}
                    placeholder="مثال: 20,000,000"
                    unitLabel="تومان"
                    showWordHelper={true}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-2">
                      شماره کارت یا شماره شبا مقصد <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={clientCardNumber}
                      onChange={(e) => setClientCardNumber(e.target.value)}
                      placeholder="6037... یا IR..."
                      className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-600 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-2">
                      نام بانک حساب شما <span className="text-stone-400 font-normal">(اختیاری)</span>
                    </label>
                    <input
                      type="text"
                      value={clientBankName}
                      onChange={(e) => setClientBankName(e.target.value)}
                      placeholder="مثال: ملی، ملت، صادرات..."
                      className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-2">
                    توضیحات تکمیلی <span className="text-stone-400 font-normal">(اختیاری)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="توضیحات برداشت..."
                    className="w-full p-3 text-xs bg-stone-50 border border-stone-300 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-600 resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 text-xs font-bold text-stone-700 bg-stone-200 hover:bg-stone-300 rounded-xl cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-extrabold text-white bg-rose-700 hover:bg-rose-800 rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>ارسال درخواست برداشت</span>
                  </button>
                </div>
              </form>
            )}

            {/* ======================================================== */}
            {/* SELL COPPER FORM CONTENT */}
            {/* ======================================================== */}
            {requestType === 'sell' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Sale Category Selection */}
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-2">
                    نوع فروش <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Internal Sale */}
                    <button
                      type="button"
                      onClick={() => {
                        setSaleCategory('internal');
                        setUnitPrice(marketPrices.sellPrice);
                        setError('');
                      }}
                      className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                        saleCategory === 'internal'
                          ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-300 text-blue-950 shadow-xs'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-extrabold text-xs flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-blue-700" />
                          فروش به شرکت (نرخ روز)
                        </span>
                        {saleCategory === 'internal' && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 leading-tight">
                        مس با نرخ روز شرکت ({formatNumber(marketPrices.sellPrice)} ت) خریداری شده و به انبار شرکت افزوده می‌شود.
                      </p>
                    </button>

                    {/* External Sale */}
                    <button
                      type="button"
                      onClick={() => {
                        setSaleCategory('external');
                        if (unitPrice === marketPrices.sellPrice) {
                          setUnitPrice(0);
                        }
                        setError('');
                      }}
                      className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                        saleCategory === 'external'
                          ? 'bg-amber-50 border-amber-600 ring-2 ring-amber-300 text-amber-950 shadow-xs'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-extrabold text-xs flex items-center gap-1.5">
                          <ArrowUpRight className="w-4 h-4 text-amber-700" />
                          فروش به خارج (خریدار بیرونی)
                        </span>
                        {saleCategory === 'external' && (
                          <CheckCircle2 className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 leading-tight">
                        قیمت توافقی توسط شما وارد می‌شود و مدیریت شماره حساب شرکت را جهت پرداخت خریدار و آپلود فیش ارسال می‌کند.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Counterparty & Buyer Name Specification */}
                {saleCategory === 'external' ? (
                  <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-2xl space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <label htmlFor="client-external-buyer-name" className="block text-xs font-bold text-amber-950">
                        نام شخص یا شرکت خریدار مس <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md font-bold">
                        طرف حساب خارج شرکت
                      </span>
                    </div>
                    <input
                      id="client-external-buyer-name"
                      type="text"
                      value={buyerName}
                      onChange={(e) => {
                        setBuyerName(e.target.value);
                        setError('');
                      }}
                      placeholder="مثال: آقای سهرابی، کارگاه تراشکاری، یا نام خریدار..."
                      className="w-full p-2.5 text-xs bg-white border border-amber-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold placeholder:font-normal"
                      required
                    />
                    <div className="flex items-center justify-between text-[11px] text-amber-900 pt-1.5 border-t border-amber-200/80">
                      <span>فروشنده: <b className="text-stone-900">{person.name}</b></span>
                      <span>خریدار ثبت‌شده: <b className="text-amber-950">{buyerName.trim() || 'نامشخص'}</b></span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs flex items-center justify-between text-blue-950">
                    <div className="flex items-center gap-1.5">
                      <span className="text-stone-500 font-medium">فروشنده:</span>
                      <span className="font-bold text-stone-900">{person.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-stone-500 font-medium">خریدار:</span>
                      <span className="font-bold text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-lg border border-blue-200">
                        شرکت مس واته (انبار مرکزی)
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-2">
                      وزن مس جهت فروش (کیلوگرم) <span className="text-rose-500">*</span>
                    </label>
                    <NumericInput
                      value={weightKg}
                      onChange={(val) => {
                        setWeightKg(val);
                        setError('');
                      }}
                      placeholder="مثال: 50"
                      unitLabel="کیلوگرم"
                      allowDecimals={true}
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-stone-800">
                        {saleCategory === 'external' ? 'قیمت توافقی هر کیلو با خریدار' : 'قیمت هر کیلو (تومان)'}{' '}
                        <span className="text-rose-500">*</span>
                      </label>
                      {saleCategory === 'internal' ? (
                        <button
                          type="button"
                          onClick={() => setUnitPrice(marketPrices.sellPrice)}
                          className="text-[11px] text-blue-800 hover:text-blue-950 font-bold underline cursor-pointer"
                        >
                          نرخ روز شرکت: {formatNumber(marketPrices.sellPrice)} ت
                        </button>
                      ) : (
                        <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md font-bold">
                          قیمت توافقی آزاد شما با خریدار
                        </span>
                      )}
                    </div>
                    <NumericInput
                      value={unitPrice}
                      onChange={(val) => {
                        setUnitPrice(val);
                        setError('');
                      }}
                      placeholder={saleCategory === 'external' ? 'قیمت هر کیلو مس به تومان (مثلاً ۳,۲۰۰,۰۰۰)' : 'قیمت هر کیلو'}
                      unitLabel="تومان"
                      required
                    />
                  </div>
                </div>

                {weightKg > 0 && unitPrice > 0 && (
                  <div className={`p-4 rounded-2xl flex items-center justify-between text-xs border ${
                    saleCategory === 'external' ? 'bg-amber-50/80 border-amber-200' : 'bg-blue-50 border-blue-200'
                  }`}>
                    <span className={`font-bold ${saleCategory === 'external' ? 'text-amber-900' : 'text-blue-900'}`}>
                      {saleCategory === 'external' ? 'مبلغ کل دریافتی از خریدار بیرونی:' : 'مبلغ کل دریافت فروش:'}
                    </span>
                    <span className={`font-extrabold font-mono text-base ${saleCategory === 'external' ? 'text-amber-950' : 'text-blue-950'}`}>
                      {formatNumber(Math.round(weightKg * unitPrice))} تومان
                    </span>
                  </div>
                )}

                {/* Payment Method Selector (Cash vs Cheque) */}
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1.5">
                    نحوه تسویه وجه معامله <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('cash');
                        setError('');
                      }}
                      className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        paymentMethod === 'cash'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs ring-2 ring-emerald-300'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>تسویه نقد (کیف پول)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('cheque');
                        setError('');
                      }}
                      className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        paymentMethod === 'cheque'
                          ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-xs ring-2 ring-purple-300'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-purple-700" />
                      <span>دریافت چک صیادی</span>
                    </button>
                  </div>
                </div>

                {/* Cheque Details Box (Displayed when Cheque payment is selected) */}
                {paymentMethod === 'cheque' && (
                  <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-950">
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-purple-700" />
                        مشخصات چک صیادی دریافتی
                      </span>
                      <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">
                        ثبت در کاردکس و بخش چک‌ها
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Cheque Number */}
                      <div>
                        <label htmlFor="client-cheque-num" className="block text-[11px] font-bold text-stone-700 mb-1">
                          شماره چک / شناسه صیاد <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="client-cheque-num"
                          type="text"
                          required={paymentMethod === 'cheque'}
                          value={chequeNumber}
                          onChange={(e) => {
                            setChequeNumber(e.target.value);
                            setError('');
                          }}
                          placeholder="مثال: ۱۲۳۴۵۶۷۸۹ یا سریال صیادی"
                          className="w-full px-3 py-2 text-xs bg-white border border-purple-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono"
                        />
                      </div>

                      {/* Cheque Due Date */}
                      <div>
                        <label htmlFor="client-cheque-date" className="block text-[11px] font-bold text-stone-700 mb-1">
                          تاریخ سررسید چک <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Calendar className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            id="client-cheque-date"
                            type="text"
                            required={paymentMethod === 'cheque'}
                            value={chequeDueDate}
                            onChange={(e) => {
                              setChequeDueDate(e.target.value);
                              setError('');
                            }}
                            placeholder="مثال: 1404/02/15"
                            className="w-full pl-2.5 pr-8 py-2 text-xs bg-white border border-purple-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Cheque Bank */}
                    <div>
                      <label htmlFor="client-cheque-bank" className="block text-[11px] font-bold text-stone-700 mb-1">
                        نام بانک صادرکننده <span className="text-stone-400 font-normal">(اختیاری)</span>
                      </label>
                      <input
                        id="client-cheque-bank"
                        type="text"
                        value={chequeBank}
                        onChange={(e) => setChequeBank(e.target.value)}
                        placeholder="مثال: بانک ملی شعبه مرکزی"
                        className="w-full px-3 py-2 text-xs bg-white border border-purple-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                    </div>
                  </div>
                )}

                {/* Multi-step guidance notice for External Sale */}
                {saleCategory === 'external' && (
                  <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-2xl text-xs space-y-2 text-amber-950">
                    <div className="flex items-center gap-2 font-black text-amber-900">
                      <Building2 className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>فرآیند تسویه فروش به خارج (مشابه فرآیند شارژ حساب):</span>
                    </div>
                    <div className="space-y-1 text-[11px] text-amber-900 leading-relaxed pr-1 border-r-2 border-amber-400 mr-1">
                      <p><b>۱. ثبت درخواست:</b> مشخصات وزن و قیمت توافقی شما برای مدیریت ارسال می‌شود.</p>
                      <p><b>۲. ارسال شماره حساب و شبا:</b> مدیرعامل شماره حساب بانکی و شبای شرکت را انتخاب و در پورتال شما نمایش می‌دهد.</p>
                      <p><b>۳. واریز خریدار و ارسال فیش:</b> شماره شبا/کارت را به خریدار مس تحویل داده و پس از واریز، عکس فیش را بارگذاری می‌فرمایید.</p>
                      <p><b>۴. بررسی و تایید نهایی:</b> پس از تایید وصول وجه توسط مدیر، معامله قطعی شده و مبلغ به کیفتان واریز می‌گردد.</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-2">
                    توضیحات تکمیلی {saleCategory === 'external' && 'یا مشخصات خریدار بیرونی'} <span className="text-stone-400 font-normal">(اختیاری)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={saleCategory === 'external' ? 'مثال: نام خریدار، توافقات تحویل یا شماره تماس...' : 'توضیحات فروش مس...'}
                    className="w-full p-3 text-xs bg-stone-50 border border-stone-300 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 text-xs font-bold text-stone-700 bg-stone-200 hover:bg-stone-300 rounded-xl cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className={`px-6 py-2.5 text-xs font-extrabold text-white rounded-xl shadow-md cursor-pointer flex items-center gap-2 transition-all ${
                      saleCategory === 'external'
                        ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                        : 'bg-blue-700 hover:bg-blue-800'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {saleCategory === 'external'
                        ? 'ارسال به مدیریت جهت دریافت شماره شبا و حساب'
                        : 'ارسال درخواست فروش مس به شرکت'}
                    </span>
                  </button>
                </div>
              </form>
            )}

            {/* ======================================================== */}
            {/* BUY COPPER FORM CONTENT (TWO-STEP MODE) */}
            {/* ======================================================== */}
            {requestType === 'buy' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* STEP 1: Enter Weight or Budget */}
                {buyStep === 1 && (
                  <div className="space-y-4">
                    {/* Company Copper Stock Available Banner */}
                    <div className="bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 text-white p-4 rounded-2xl border border-amber-600/40 shadow-sm space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-amber-200 font-bold flex items-center gap-1.5">
                          <ShoppingBag className="w-4 h-4 text-amber-400" />
                          موجودی مس آماده تحویل شرکت:
                        </span>
                        <span className="font-mono font-black text-amber-300 text-sm">
                          {formatWeight(companyCopperStockKg)} ({(companyCopperStockKg / 1000).toFixed(3)} تن)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-stone-300 pt-1.5 border-t border-amber-900/60">
                        <span>موجودی ریالی کیف پول شما:</span>
                        <b className="font-mono text-emerald-300 font-bold">
                          {formatToman(summary.cashBalance)}
                        </b>
                      </div>
                    </div>

                    {/* Mode Segmented Controls */}
                    <div className="bg-stone-100 p-1 rounded-xl flex gap-1 border border-stone-200">
                      <button
                        type="button"
                        onClick={() => {
                          setBuyInputMode('weight');
                          setError('');
                        }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                          buyInputMode === 'weight'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                        }`}
                      >
                        خرید بر اساس وزن مس (کیلوگرم)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBuyInputMode('budget');
                          setError('');
                        }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                          buyInputMode === 'budget'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                        }`}
                      >
                        خرید بر اساس بودجه (تومان)
                      </button>
                    </div>

                    {/* Weight Input Mode */}
                    {buyInputMode === 'weight' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-stone-800">
                            وزن مس درخواستی (کیلوگرم) <span className="text-rose-500">*</span>
                          </label>
                          {summary.cashBalance > 0 && (
                            <div className="flex items-center gap-1 text-[10px] font-bold">
                              <button
                                type="button"
                                onClick={() => {
                                  const maxAfford = Math.floor((summary.cashBalance / marketPrices.buyPrice) * 100) / 100;
                                  const target = Math.min(companyCopperStockKg, maxAfford * 0.25);
                                  setWeightKg(Math.round(target * 100) / 100);
                                  setError('');
                                }}
                                className="px-2 py-0.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-md transition-colors cursor-pointer"
                              >
                                ۲۵٪ بودجه
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const maxAfford = Math.floor((summary.cashBalance / marketPrices.buyPrice) * 100) / 100;
                                  const target = Math.min(companyCopperStockKg, maxAfford * 0.50);
                                  setWeightKg(Math.round(target * 100) / 100);
                                  setError('');
                                }}
                                className="px-2 py-0.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-md transition-colors cursor-pointer"
                              >
                                ۵۰٪ بودجه
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const maxAfford = Math.floor((summary.cashBalance / marketPrices.buyPrice) * 100) / 100;
                                  const target = Math.min(companyCopperStockKg, maxAfford);
                                  setWeightKg(Math.round(target * 100) / 100);
                                  setError('');
                                }}
                                className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors cursor-pointer"
                              >
                                حداکثر توان خرید
                              </button>
                            </div>
                          )}
                        </div>
                        <NumericInput
                          value={weightKg}
                          onChange={(val) => {
                            setWeightKg(val);
                            setError('');
                          }}
                          placeholder="مثال: 50"
                          unitLabel="کیلوگرم"
                          allowDecimals={true}
                          required
                        />
                        <p className="text-[11px] text-stone-500 font-medium">
                          قیمت روز خرید مس: <span className="font-bold text-stone-700">{formatToman(marketPrices.buyPrice)}</span> به ازای هر کیلوگرم
                        </p>
                      </div>
                    )}

                    {/* Budget Input Mode */}
                    {buyInputMode === 'budget' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-stone-800">
                            مبلغ بودجه خرید مس (تومان) <span className="text-rose-500">*</span>
                          </label>
                          {summary.cashBalance > 0 && (
                            <div className="flex items-center gap-1 text-[10px] font-bold">
                              <button
                                type="button"
                                onClick={() => {
                                  setBuyBudget(Math.round(summary.cashBalance * 0.25));
                                  setError('');
                                }}
                                className="px-2 py-0.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-md transition-colors cursor-pointer"
                              >
                                ۲۵٪ موجودی
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setBuyBudget(Math.round(summary.cashBalance * 0.50));
                                  setError('');
                                }}
                                className="px-2 py-0.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-md transition-colors cursor-pointer"
                              >
                                ۵۰٪ موجودی
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setBuyBudget(summary.cashBalance);
                                  setError('');
                                }}
                                className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors cursor-pointer"
                              >
                                کل موجودی ریالی
                              </button>
                            </div>
                          )}
                        </div>
                        <NumericInput
                          value={buyBudget}
                          onChange={(val) => {
                            setBuyBudget(val);
                            setError('');
                          }}
                          placeholder="مثال: 50,000,000"
                          unitLabel="تومان"
                          required
                        />
                        <p className="text-[11px] text-stone-500 font-medium">
                          معادل‌سازی بر اساس نرخ روز: <span className="font-bold text-stone-700">{formatToman(marketPrices.buyPrice)}</span> تومان/کیلوگرم
                        </p>
                      </div>
                    )}

                    <div className="pt-2 flex justify-end gap-3 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-xs font-bold text-stone-700 bg-stone-200 hover:bg-stone-300 rounded-xl cursor-pointer"
                      >
                        انصراف
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 text-xs font-extrabold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                      >
                        <span>مرحله بعد: فاکتور و اطلاعات شبا ➔</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Invoice & Sheba Account Info */}
                {buyStep === 2 && (
                  <div className="space-y-4">
                    {/* Invoice Calculations */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2.5">
                      <h4 className="text-xs font-bold text-amber-900 border-b border-amber-200 pb-1.5 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-amber-700" />
                        پیش‌فاکتور محاسبه شده خرید مس:
                      </h4>
                      <div className="grid grid-cols-2 gap-y-2 text-xs">
                        <div className="text-stone-600">روش محاسبه:</div>
                        <div className="font-bold text-left text-stone-900">
                          {buyInputMode === 'weight' ? 'بر اساس وزن مس درخواستی' : 'بر اساس بودجه ریالی پیشنهادی'}
                        </div>
                        
                        <div className="text-stone-600">نرخ روز خرید مس:</div>
                        <div className="font-bold font-mono text-left text-stone-900">
                          {formatToman(unitPrice)} به ازای هر کیلو
                        </div>

                        <div className="text-stone-600 font-bold text-amber-950">وزن کل مس تعلق‌گرفته:</div>
                        <div className="font-black font-mono text-left text-amber-800 text-sm">
                          {formatWeight(weightKg)} کیلوگرم
                        </div>

                        <div className="text-stone-600 font-bold text-amber-950">مبلغ نهایی فاکتور:</div>
                        <div className="font-black font-mono text-left text-emerald-700 text-base">
                          {formatToman(amount)}
                        </div>
                      </div>
                    </div>

                    {/* Company Bank & Sheba Info Box */}
                    <div className="bg-stone-900 text-stone-100 rounded-2xl p-4 border border-stone-800 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4" />
                          اطلاعات حساب و شبا شرکت (مس واته):
                        </span>
                        <span className="text-[10px] text-stone-400 font-bold bg-stone-800 px-2 py-0.5 rounded-md">
                          جهت واریز مبلغ فاکتور
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        {/* Owner */}
                        <div className="flex items-center justify-between text-stone-300">
                          <span>نام صاحب حساب:</span>
                          <span className="font-bold text-white">شرکت توسعه تجارت فلزات مس واته</span>
                        </div>

                        {/* Card Number */}
                        <div className="flex items-center justify-between bg-stone-800/60 p-2 rounded-xl border border-stone-800">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-stone-400">شماره کارت بانک ملی:</span>
                            <span className="font-mono font-bold tracking-widest text-amber-200">۶۰۳۷-۹۹۷۹-۱۲۳۴-۵۶۷۸</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy('6037997912345678', 'companyCard')}
                            className="p-1.5 hover:bg-stone-700 rounded-lg text-stone-400 hover:text-white transition-colors"
                            title="کپی شماره کارت"
                          >
                            {copiedField === 'companyCard' ? (
                              <span className="text-[10px] text-emerald-400 font-bold">کپی شد!</span>
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* Sheba Number */}
                        <div className="flex items-center justify-between bg-stone-800/60 p-2 rounded-xl border border-stone-800">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-stone-400">شماره شبا حساب شرکت:</span>
                            <span className="font-mono font-bold tracking-wider text-amber-200">IR96-0120-0000-0000-1234-5678</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy('IR9601200000000012345678', 'companySheba')}
                            className="p-1.5 hover:bg-stone-700 rounded-lg text-stone-400 hover:text-white transition-colors"
                            title="کپی شماره شبا"
                          >
                            {copiedField === 'companySheba' ? (
                              <span className="text-[10px] text-emerald-400 font-bold">کپی شد!</span>
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="p-2 bg-stone-800/40 rounded-xl flex items-start gap-1.5 text-[10px] text-stone-300 leading-relaxed">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>
                          <b>توضیح مهم:</b> مشتری گرامی، لطفا فیش تسویه فاکتور خود را از موجودی حساب ریالی خود و یا حواله کارت به کارت انجام داده و سپس روی دکمه ثبت نهایی درخواست کلیک نمایید.
                        </span>
                      </div>
                    </div>

                    {/* Notes field */}
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1.5">
                        توضیحات تکمیلی <span className="text-stone-400 font-normal">(اختیاری)</span>
                      </label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="توضیحات یا زمان واریز حواله..."
                        className="w-full p-3 text-xs bg-stone-50 border border-stone-300 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600 resize-none"
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 flex justify-between gap-3 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => {
                          setBuyStep(1);
                          setError('');
                        }}
                        className="px-5 py-2.5 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
                      >
                        بازگشت به مرحله قبل
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 text-xs font-extrabold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        <span>تأیید و ارسال درخواست خرید مس</span>
                      </button>
                    </div>
                  </div>
                )}

              </form>
            )}

          </div>

          {/* Modal Footer (for non-deposit or close) */}
          {requestType === 'deposit' && (
            <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50 flex items-center justify-between shrink-0">
              <span className="text-xs text-stone-500">
                سامانه پیگیری ۴ مرحله‌ای شارژ واریزی مس واته
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold text-stone-700 hover:text-stone-900 bg-stone-200 hover:bg-stone-300 rounded-xl transition-colors cursor-pointer"
              >
                بستن پنجره
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
