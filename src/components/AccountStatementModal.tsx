import React, { useState, useMemo, useRef } from 'react';
import { 
  X, 
  Download, 
  Share2, 
  Printer, 
  Copy, 
  Check, 
  Send, 
  FileText, 
  Wallet, 
  Boxes, 
  TrendingUp, 
  Landmark, 
  Calendar, 
  Phone, 
  User, 
  Info,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingBag,
  Sliders,
  CheckCircle2,
  Sparkles,
  Loader2
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Person, Transaction } from '../types';
import { replayAndCalculatePersonLedger } from '../utils/storage';
import { formatNumber, formatToman, formatWeight, formatPercent } from '../utils/formatters';
import { getTodayJalaliString, getPersianFullDate } from '../utils/persianDate';

interface AccountStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person | null;
  transactions: Transaction[];
  marketCopperPrice: number;
}

export const AccountStatementModal: React.FC<AccountStatementModalProps> = ({
  isOpen,
  onClose,
  person,
  transactions,
  marketCopperPrice,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [statementNote, setStatementNote] = useState('این صورت‌حساب جهت بررسی، تسویه حساب و تطبیق کاردکس معاملات مس صادر شده است.');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  // Recalculate person ledger
  const ledgerData = useMemo(() => {
    if (!person) return null;
    return replayAndCalculatePersonLedger(person.id, transactions);
  }, [person, transactions]);

  // Statement Metadata
  const issueDate = useMemo(() => getTodayJalaliString(), []);
  const statementId = useMemo(() => {
    if (!person) return 'ST-000';
    const cleanDate = issueDate.replace(/\//g, '');
    const shortId = person.id.slice(-4).toUpperCase();
    return `ST-${cleanDate}-${shortId}`;
  }, [person, issueDate]);

  if (!isOpen || !person || !ledgerData) return null;

  const { recalculatedTransactions, summary } = ledgerData;
  const copperMarketValue = Math.round(summary.copperStockKg * marketCopperPrice);
  const totalAssetValue = summary.cashBalance + copperMarketValue;
  const isProfitPositive = summary.realizedProfit >= 0;

  // Chronological order for statement
  const sortedTransactions = recalculatedTransactions.slice().sort((a, b) => {
    const dComp = a.date.localeCompare(b.date);
    if (dComp !== 0) return dComp;
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });

  // Format WhatsApp Message
  const generateWhatsAppMessage = () => {
    const border = '══════════════════════';
    const divider = '──────────────────────';
    
    let msg = `📄 *صورت‌حساب مالی و کاردکس مس*\n`;
    msg += `🏢 *سامانه معاملات مس واته*\n`;
    msg += `${border}\n`;
    msg += `👤 *طرف حساب:* ${person.name}\n`;
    if (person.phone) msg += `📱 *شماره تماس:* ${person.phone}\n`;
    msg += `📅 *تاریخ صدور:* ${issueDate}\n`;
    msg += `🔖 *شماره سند:* \`${statementId}\`\n`;
    msg += `${divider}\n`;
    msg += `📊 *خلاصه وضعیت دارایی و حساب:*\n\n`;
    msg += `💵 *مانده نقدینگی:* ${formatToman(summary.cashBalance)} ${summary.cashBalance >= 0 ? '(بستانکار)' : '(بدهکار)'}\n`;
    msg += `📦 *موجودی مس:* ${formatWeight(summary.copperStockKg)}\n`;
    msg += `🏷️ *نرخ روز مس:* ${formatNumber(marketCopperPrice)} تومان/کیلو\n`;
    msg += `💰 *ارزش روز مس:* ${formatToman(copperMarketValue)}\n`;
    msg += `💎 *مجموع کل ارزش دارایی:* ${formatToman(totalAssetValue)}\n`;
    if (summary.realizedProfit !== 0) {
      msg += `📈 *سود معاملات:* ${summary.realizedProfit > 0 ? '+' : ''}${formatToman(summary.realizedProfit)} (${formatPercent(summary.profitPercentage)})\n`;
    }
    msg += `${divider}\n`;
    msg += `📋 *گردش کل معاملات:*\n`;
    msg += `• مجموع واریزی‌ها: ${formatToman(summary.totalDeposited)}\n`;
    msg += `• مجموع برداشت‌ها: ${formatToman(summary.totalWithdrawn)}\n`;
    msg += `• کل خرید مس: ${formatWeight(summary.totalPurchasedKg)} (${formatToman(summary.totalPurchasedPrice)})\n`;
    msg += `• کل فروش مس: ${formatWeight(summary.totalSoldKg)} (${formatToman(summary.totalSoldPrice)})\n`;
    msg += `• تعداد کل تراکنش‌ها: ${sortedTransactions.length} فقره\n`;
    msg += `${divider}\n`;
    msg += `📝 *یادداشت:* ${statementNote}\n\n`;
    msg += `جهت مشاهده یا دانلود فایل PDF صورت‌حساب می‌توانید با ما در ارتباط باشید.`;

    return msg;
  };

  // 1. WhatsApp Link Opening
  const handleOpenWhatsApp = () => {
    const text = generateWhatsAppMessage();
    let cleanPhone = (person.phone || '').replace(/[^0-9]/g, '');
    
    // Normalize Iranian Phone Numbers (e.g. 09121234567 -> 989121234567)
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '98' + cleanPhone.slice(1);
    } else if (cleanPhone && !cleanPhone.startsWith('98')) {
      cleanPhone = '98' + cleanPhone;
    }

    const encodedText = encodeURIComponent(text);
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    window.open(waUrl, '_blank');
  };

  // 2. Copy Message Text to Clipboard
  const handleCopyText = async () => {
    try {
      const text = generateWhatsAppMessage();
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  // 3. Generate & Download PDF
  const handleDownloadPdf = async (shareDirectly = false) => {
    if (!printableRef.current) return;
    setIsGeneratingPdf(true);

    try {
      const element = printableRef.current;
      
      // Temporary styling for pristine canvas capture
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      // Additional pages if statement is long
      while (heightLeft > 5) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      const fileName = `صورتحساب_${person.name.replace(/\s+/g, '_')}_${issueDate.replace(/\//g, '-')}.pdf`;

      if (shareDirectly && navigator.share && navigator.canShare) {
        // Native Web Share API with PDF file
        const blob = pdf.output('blob');
        const file = new File([blob], fileName, { type: 'application/pdf' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `صورتحساب ${person.name}`,
            text: generateWhatsAppMessage(),
            files: [file],
          });
          setIsGeneratingPdf(false);
          return;
        }
      }

      // Download file to user device
      pdf.save(fileName);

    } catch (err) {
      console.error('PDF Generation failed, fallback to print:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getTxTypeLabel = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit': return 'واریز وجه';
      case 'withdrawal': return 'برداشت وجه';
      case 'buy': return 'خرید مس';
      case 'sell': return 'فروش مس';
      case 'adjustment': return 'اصلاح حساب';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/75 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 py-4 sm:py-6">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-5xl my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Control Bar (Sticky at top) */}
        <div className="p-3.5 sm:p-4 border-b border-stone-200 bg-stone-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 z-10 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-stone-800 text-amber-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>صورت‌حساب رسمی و کاردکس:</span>
                <span className="text-amber-300 font-semibold">{person.name}</span>
              </h3>
              <p className="text-[11px] text-stone-300">
                فرمت استاندارد A4 قابل دانلود به صورت PDF و ارسال مستقیم به واتساپ
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            
            {/* Direct WhatsApp Send */}
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-xs"
              title="ارسال مستقیم متن صورتحساب به چت واتساپ طرف حساب"
            >
              <Send className="w-3.5 h-3.5" />
              <span>ارسال به واتساپ</span>
            </button>

            {/* Download PDF */}
            <button
              type="button"
              onClick={() => handleDownloadPdf(false)}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-stone-900 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 disabled:opacity-50 rounded-lg transition-colors cursor-pointer shadow-xs"
              title="دانلود فایل PDF رسمی برای ارسال در واتساپ یا تلگرام"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isGeneratingPdf ? 'تولید PDF...' : 'دانلود فایل PDF'}</span>
            </button>

            {/* Native Share (if supported) */}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={() => handleDownloadPdf(true)}
                disabled={isGeneratingPdf}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stone-200 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors cursor-pointer"
                title="اشتراک‌گذاری فایل PDF در واتساپ و دیگر برنامه‌ها"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>اشتراک‌گذاری PDF</span>
              </button>
            )}

            {/* Copy Text */}
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stone-200 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors cursor-pointer"
              title="کپی خلاصه متنی صورتحساب برای پیام‌رسان‌ها"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'کپی شد!' : 'کپی متن'}</span>
            </button>

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stone-200 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors cursor-pointer"
              title="چاپ با پرینتر یا ذخیره مرورگر"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Statement Sheet */}
        <div className="overflow-y-auto p-3 sm:p-6 bg-stone-100/70 flex justify-center">
          
          {/* A4 Sheet Container */}
          <div 
            ref={printableRef}
            className="bg-white text-stone-900 border border-stone-300 shadow-md rounded-xl w-full max-w-[210mm] min-h-[297mm] p-6 sm:p-8 space-y-6 print:border-0 print:shadow-none print:p-0 print:m-0"
            style={{ minWidth: '300px' }}
          >

            {/* 1. Official Header */}
            <div className="border-b-2 border-stone-800 pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center font-extrabold text-xl shadow-xs">
                    W
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                      دفتر بازرگانی و معاملات مس واته
                    </h1>
                    <p className="text-xs text-stone-600 font-medium mt-0.5">
                      صورت‌حساب رسمی، خلاصه وضعیت دارایی و کاردکس معاملات
                    </p>
                  </div>
                </div>

                {/* Metadata Box */}
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs text-stone-700 space-y-1 self-stretch sm:self-auto min-w-[200px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-stone-500">شماره سند:</span>
                    <span className="font-mono font-bold text-stone-900">{statementId}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-stone-500">تاریخ صدور:</span>
                    <span className="font-mono font-bold text-stone-900">{issueDate}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-stone-500">وضعیت حساب:</span>
                    <span className="font-bold text-emerald-800">فعال و تایید شده</span>
                  </div>
                </div>

              </div>
            </div>

            {/* 2. Customer / Account Holder Information Box */}
            <div className="bg-stone-50/80 border border-stone-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-stone-500 block mb-0.5 font-medium">نام طرف حساب:</span>
                <span className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-stone-500" />
                  {person.name}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block mb-0.5 font-medium">شماره تماس / همراه:</span>
                <span className="font-mono font-bold text-stone-800 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-stone-500" />
                  {person.phone || 'ثبت نشده'}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block mb-0.5 font-medium">تاریخ افتتاح حساب:</span>
                <span className="font-mono text-stone-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-stone-500" />
                  {person.createdAt}
                </span>
              </div>
            </div>

            {/* 3. Account Balance & Portfolio Summary Cards */}
            <div>
              <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-stone-600" />
                <span>خلاصه وضعیت مالی و مانده دارایی</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                
                {/* Cash Balance */}
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/60">
                  <span className="text-[11px] font-semibold text-emerald-900 block">مانده نقدینگی (کیف پول)</span>
                  <div className="text-base sm:text-lg font-extrabold font-mono text-emerald-900 mt-1">
                    {formatNumber(summary.cashBalance)} <span className="text-[10px] font-normal font-sans">تومان</span>
                  </div>
                  <span className="text-[10px] text-emerald-800 block mt-0.5">
                    {summary.cashBalance >= 0 ? 'بستانکار (نزد دفتر)' : 'بدهکار'}
                  </span>
                </div>

                {/* Copper Stock */}
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/60">
                  <span className="text-[11px] font-semibold text-amber-950 block">موجودی مس (انبار)</span>
                  <div className="text-base sm:text-lg font-extrabold font-mono text-amber-950 mt-1">
                    {formatWeight(summary.copperStockKg, false)} <span className="text-[10px] font-normal font-sans">کیلو</span>
                  </div>
                  <span className="text-[10px] text-amber-800 block mt-0.5">
                    {summary.weightedAvgBuyPrice > 0 ? `میانگین: ${formatNumber(summary.weightedAvgBuyPrice)} ت` : 'بدون موجودی مس'}
                  </span>
                </div>

                {/* Copper Market Value */}
                <div className="p-3 rounded-lg border border-stone-200 bg-stone-50">
                  <span className="text-[11px] font-semibold text-stone-700 block">ارزش روز مس</span>
                  <div className="text-base sm:text-lg font-extrabold font-mono text-stone-900 mt-1">
                    {formatNumber(copperMarketValue)} <span className="text-[10px] font-normal font-sans">تومان</span>
                  </div>
                  <span className="text-[10px] text-stone-500 block mt-0.5">
                    نرخ: {formatNumber(marketCopperPrice)} ت/ک
                  </span>
                </div>

                {/* Total Asset Portfolio */}
                <div className="p-3 rounded-lg border border-stone-800 bg-stone-900 text-white">
                  <span className="text-[11px] font-semibold text-stone-300 block">مجموع کل دارایی</span>
                  <div className="text-base sm:text-lg font-extrabold font-mono text-white mt-1">
                    {formatNumber(totalAssetValue)} <span className="text-[10px] font-normal font-sans">تومان</span>
                  </div>
                  <span className="text-[10px] text-stone-300 block mt-0.5">
                    نقدینگی + ارزش روز مس
                  </span>
                </div>

              </div>

              {/* Secondary stats row */}
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-stone-50 p-2.5 rounded-lg border border-stone-200 text-stone-600">
                <div>
                  <span className="text-stone-400 block text-[10px]">کل واریزی‌ها:</span>
                  <span className="font-mono font-bold text-stone-800">{formatToman(summary.totalDeposited)}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">کل برداشت‌ها:</span>
                  <span className="font-mono font-bold text-stone-800">{formatToman(summary.totalWithdrawn)}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">مجموع خرید مس:</span>
                  <span className="font-mono font-bold text-stone-800">{formatWeight(summary.totalPurchasedKg)}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">سود محقق‌شده معاملات:</span>
                  <span className={`font-mono font-bold ${isProfitPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {summary.realizedProfit > 0 ? '+' : ''}{formatToman(summary.realizedProfit)} ({formatPercent(summary.profitPercentage)})
                  </span>
                </div>
              </div>

            </div>

            {/* 4. Complete Detailed Transactions Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-stone-600" />
                  <span>ریز کلیه اسناد و تراکنش‌های حساب (کاردکس)</span>
                </h3>
                <span className="text-xs text-stone-500 font-mono">
                  تعداد کل: {sortedTransactions.length} سند
                </span>
              </div>

              <div className="border border-stone-300 rounded-lg overflow-hidden">
                <table className="w-full text-right text-[11px]">
                  <thead className="bg-stone-100 text-stone-700 border-b border-stone-300 font-bold">
                    <tr>
                      <th className="py-2 px-2 text-center w-8">ردیف</th>
                      <th className="py-2 px-2">تاریخ</th>
                      <th className="py-2 px-2">شرح سند / نوع</th>
                      <th className="py-2 px-2 text-center">مقدار مس (kg)</th>
                      <th className="py-2 px-2 text-left">نرخ واحد (تومان)</th>
                      <th className="py-2 px-2 text-left">مبلغ سند (تومان)</th>
                      <th className="py-2 px-2 text-left">سود معامله</th>
                      <th className="py-2 px-2 text-left">مانده ریالی بعد</th>
                      <th className="py-2 px-2 text-center">مانده مس بعد</th>
                      <th className="py-2 px-2">توضیحات و بابت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {sortedTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-6 text-center text-stone-400">
                          هیچ سندی برای این طرف حساب ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      sortedTransactions.map((tx, idx) => {
                        return (
                          <tr key={tx.id} className={idx % 2 === 1 ? 'bg-stone-50/60' : 'bg-white'}>
                            {/* Row */}
                            <td className="py-1.5 px-2 text-center font-mono text-stone-500">
                              {idx + 1}
                            </td>

                            {/* Date */}
                            <td className="py-1.5 px-2 font-mono whitespace-nowrap text-stone-800">
                              {tx.date}
                            </td>

                            {/* Type */}
                            <td className="py-1.5 px-2 font-bold whitespace-nowrap">
                              <span className={
                                tx.type === 'deposit' ? 'text-emerald-800' :
                                tx.type === 'withdrawal' ? 'text-rose-800' :
                                tx.type === 'buy' ? 'text-amber-900' :
                                tx.type === 'sell' ? 'text-blue-900' : 'text-stone-800'
                              }>
                                {getTxTypeLabel(tx.type)}
                              </span>
                            </td>

                            {/* Weight */}
                            <td className="py-1.5 px-2 text-center font-mono font-semibold text-stone-900">
                              {tx.weightKg ? formatWeight(tx.weightKg, false) : '—'}
                            </td>

                            {/* Unit Price */}
                            <td className="py-1.5 px-2 text-left font-mono text-stone-700">
                              {tx.unitPrice ? formatNumber(tx.unitPrice) : '—'}
                            </td>

                            {/* Amount */}
                            <td className="py-1.5 px-2 text-left font-mono font-bold text-stone-900">
                              {formatNumber(tx.amount)}
                            </td>

                            {/* Profit */}
                            <td className="py-1.5 px-2 text-left font-mono">
                              {tx.type === 'sell' && tx.profit !== undefined ? (
                                <span className={tx.profit >= 0 ? 'text-emerald-800 font-bold' : 'text-rose-800 font-bold'}>
                                  {tx.profit > 0 ? '+' : ''}{formatNumber(tx.profit)}
                                </span>
                              ) : (
                                <span className="text-stone-300">—</span>
                              )}
                            </td>

                            {/* Balance Cash After */}
                            <td className="py-1.5 px-2 text-left font-mono font-bold text-stone-900">
                              {formatNumber(tx.cashBalanceAfter || 0)}
                            </td>

                            {/* Stock After */}
                            <td className="py-1.5 px-2 text-center font-mono font-bold text-amber-950">
                              {formatWeight(tx.copperStockAfter || 0, false)}
                            </td>

                            {/* Notes */}
                            <td className="py-1.5 px-2 text-stone-600 max-w-[130px] truncate" title={tx.notes || ''}>
                              {tx.notes || '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. Statement Custom Note & Disclaimers */}
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs space-y-1.5">
              <span className="font-bold text-stone-800 block">یادداشت و توضیحات صورت‌حساب:</span>
              <p className="text-stone-600 leading-relaxed text-[11px]">
                {statementNote}
              </p>
              <p className="text-[10px] text-stone-400 pt-1 border-t border-stone-200">
                * توجه: ارزش روز مس بر مبنای نرخ بازار ({formatNumber(marketCopperPrice)} تومان برای هر کیلوگرم) محاسبه گردیده و به منزله ارزش دفتری روز است.
              </p>
            </div>

            {/* 6. Signatures and Stamp Section */}
            <div className="pt-6 border-t border-stone-300 grid grid-cols-2 gap-8 text-xs text-stone-700">
              <div className="text-center space-y-12">
                <span className="font-bold block">مهر و امضای امور مالی / مدیریت بازرگانی</span>
                <span className="text-stone-400 block text-[11px]">(دفتر معاملات مس واته)</span>
              </div>
              <div className="text-center space-y-12">
                <span className="font-bold block">امضا و تایید طرف حساب</span>
                <span className="text-stone-500 font-semibold block text-[11px]">{person.name}</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
