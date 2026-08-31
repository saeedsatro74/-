import React, { useRef } from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ShoppingBag, 
  TrendingUp, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Layers, 
  FileText, 
  Copy, 
  Check, 
  User, 
  Calendar, 
  CreditCard,
  Building2,
  ShieldCheck,
  Share2
} from 'lucide-react';
import { Transaction, Person } from '../types';
import { formatNumber, formatToman, formatWeight, numberToTomanWords } from '../utils/formatters';

interface TransactionReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  person: Person | null;
}

export const TransactionReceiptModal: React.FC<TransactionReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
  person,
}) => {
  const [copied, setCopied] = React.useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !transaction) return null;

  const status = transaction.approvalStatus || 'approved';
  const receiptNum = transaction.receiptNumber || `REC-${transaction.id.replace('tx-', '').toUpperCase()}`;

  const getTypeName = () => {
    switch (transaction.type) {
      case 'buy': return 'خرید مس (افزایش انبار / کسر وجه)';
      case 'sell': return 'فروش مس (تحویل کالا / افزایش وجه)';
      case 'deposit': return 'واریز وجه نقد به حساب';
      case 'withdrawal': return 'برداشت وجه نقد از حساب';
      case 'adjustment': return 'اصلاح و تعدیل موجودی حساب';
      default: return 'سند مالی';
    }
  };

  const getTypeShortName = () => {
    switch (transaction.type) {
      case 'buy': return 'خرید مس';
      case 'sell': return 'فروش مس';
      case 'deposit': return 'واریز وجه';
      case 'withdrawal': return 'برداشت وجه';
      case 'adjustment': return 'اصلاح حساب';
      default: return 'تراکنش مالی';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const text = `
📜 رسید عملیات مس - شماره: ${receiptNum}
طرف حساب: ${person?.name || 'نامشخص'}
نوع عملیات: ${getTypeShortName()}
تاریخ سند: ${transaction.date}
${transaction.weightKg ? `وزن مس: ${formatWeight(transaction.weightKg)}` : ''}
${transaction.unitPrice ? `قیمت هر کیلو: ${formatToman(transaction.unitPrice)}` : ''}
مبلغ کل: ${formatToman(transaction.amount)} (${numberToTomanWords(transaction.amount)})
وضعیت: ${status === 'approved' ? 'تأیید شده توسط مدیرعامل' : status === 'pending' ? 'در انتظار تأیید مدیرعامل' : 'رد شده'}
ثبت‌کننده: ${transaction.registeredBy || 'مسئول مس'}
${transaction.approvedBy ? `تأییدکننده: ${transaction.approvedBy}` : ''}
${transaction.notes ? `توضیحات: ${transaction.notes}` : ''}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`
📜 *رسید عملیات مس*
*شماره رسید:* ${receiptNum}
*طرف حساب:* ${person?.name || ''}
*نوع عملیات:* ${getTypeShortName()}
*تاریخ:* ${transaction.date}
${transaction.weightKg ? `*وزن:* ${formatWeight(transaction.weightKg)}\n` : ''}${transaction.unitPrice ? `*نرخ هر کیلو:* ${formatToman(transaction.unitPrice)}\n` : ''}*مبلغ کل:* ${formatToman(transaction.amount)}
*وضعیت:* ${status === 'approved' ? 'تأیید شده' : status === 'pending' ? 'در انتظار تأیید' : 'رد شده'}
    `.trim());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/75 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 py-4 sm:py-6 print:p-0 print:bg-white print:static">
      
      {/* Outer Card */}
      <div className="bg-white rounded-2xl border border-stone-300 shadow-2xl w-full max-w-3xl my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:max-h-none print:shadow-none print:border-none print:w-full print:max-w-none">
        
        {/* Modal Top Bar (Sticky at the top, hidden in print) */}
        <div className="p-3.5 sm:p-4 border-b border-stone-200 bg-stone-100 flex items-center justify-between shrink-0 print:hidden z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
            <h3 className="font-bold text-sm sm:text-base text-stone-900">
              رسید رسمی عملیات مس
            </h3>
            <span className="text-xs bg-stone-200 text-stone-700 px-2 py-0.5 rounded-md font-mono hidden sm:inline-block">
              {receiptNum}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="p-1.5 text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-200 border border-stone-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
              title="کپی متن رسید"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{copied ? 'کپی شد' : 'کپی'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="p-1.5 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
              title="ارسال به واتساپ"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">واتساپ</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 text-white bg-stone-800 hover:bg-black rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="چاپ یا ذخیره PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-stone-200 transition-colors cursor-pointer mr-1"
              title="بستن پنجره"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Canvas Body - Scrollable */}
        <div className="flex-1 overflow-y-auto print:overflow-visible">
          <div ref={printRef} className="p-5 sm:p-8 bg-white print:p-4 text-stone-900 space-y-6">
          
          {/* Header of Receipt */}
          <div className="border-b-2 border-stone-900 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-700 text-white flex items-center justify-center font-bold text-xl shadow-xs print:border print:border-amber-800">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-stone-950 tracking-tight">
                    سامانه معاملات مس واته
                  </h1>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">
                    رسید رسمی خرید، فروش و گردش انبار مس
                  </p>
                </div>
              </div>

              {/* Meta details */}
              <div className="text-left bg-stone-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-stone-200 space-y-1">
                <div className="text-xs font-mono font-bold text-stone-900">
                  <span className="text-stone-500 ml-1">شماره سند:</span>
                  <span className="text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">{receiptNum}</span>
                </div>
                <div className="text-xs text-stone-600">
                  <span className="text-stone-500 ml-1">تاریخ تراکنش:</span>
                  <span className="font-mono font-bold">{transaction.date}</span>
                </div>
                {transaction.createdAt && (
                  <div className="text-[11px] text-stone-400 font-mono">
                    ثبت در سیستم: {new Date(transaction.createdAt).toLocaleDateString('fa-IR')}
                  </div>
                )}
              </div>

            </div>

            {/* Approval Banner */}
            <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-600">نوع سند:</span>
                <span className="text-xs font-extrabold text-stone-900 bg-stone-100 px-2.5 py-1 rounded-md">
                  {getTypeName()}
                </span>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-1.5">
                {status === 'approved' && (
                  <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full text-xs font-bold shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تأیید شده توسط مدیرعامل (نهایی)</span>
                  </div>
                )}
                {status === 'pending' && (
                  <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-300 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>در انتظار تأیید مدیرعامل (موقت)</span>
                  </div>
                )}
                {status === 'rejected' && (
                  <div className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-800 border border-rose-300 px-3 py-1 rounded-full text-xs font-bold">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>رد شده توسط مدیرعامل</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Party Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200/90 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-stone-500">
                <User className="w-3.5 h-3.5 text-stone-400" />
                <span>طرف حساب / صاحب کیف پول:</span>
              </div>
              <p className="font-extrabold text-sm text-stone-950 pr-5.5">
                {person?.name || 'نامشخص'}
              </p>
              {person?.phone && (
                <p className="text-stone-500 font-mono pr-5.5 text-[11px]">
                  شماره تماس: {person.phone}
                </p>
              )}
            </div>

            <div className="space-y-1.5 border-t sm:border-t-0 sm:border-r border-stone-200 pt-2.5 sm:pt-0 sm:pr-4">
              <div className="flex items-center gap-2 text-stone-500">
                <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
                <span>عوامل ثبت و تأیید سند:</span>
              </div>
              <div className="text-stone-700 space-y-1 pr-5.5 text-xs">
                <p>
                  مسئول ثبت: <b className="text-stone-900">{transaction.registeredBy || 'مسئول مس'}</b>
                </p>
                {transaction.approvedBy && (
                  <p>
                    تأییدکننده: <b className="text-emerald-900">{transaction.approvedBy}</b>
                    {transaction.approvedAt && <span className="text-[10px] text-stone-400 mr-1.5">({transaction.approvedAt})</span>}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Transaction Specification Table */}
          <div className="overflow-hidden border border-stone-300 rounded-xl">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-stone-800 text-white font-bold">
                  <th className="py-2.5 px-3">شرح قلم / ردیف</th>
                  {transaction.weightKg !== undefined && <th className="py-2.5 px-3 text-center">مقدار مس (کیلوگرم)</th>}
                  {transaction.unitPrice !== undefined && <th className="py-2.5 px-3 text-left">قیمت واحد (تومان)</th>}
                  <th className="py-2.5 px-3 text-left">مبلغ کل (تومان)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                <tr className="bg-white">
                  <td className="py-3 px-3 font-semibold text-stone-900">
                    {getTypeName()}
                    {transaction.paymentMethod === 'cheque' && (
                      <span className="block text-[11px] text-stone-500 font-normal mt-0.5">
                        پرداخت با چک صیادی شماره {transaction.chequeNumber} (سررسید: {transaction.chequeDueDate} - {transaction.chequeBank})
                      </span>
                    )}
                  </td>
                  {transaction.weightKg !== undefined && (
                    <td className="py-3 px-3 text-center font-mono font-bold text-amber-900">
                      {formatWeight(transaction.weightKg, false)}
                    </td>
                  )}
                  {transaction.unitPrice !== undefined && (
                    <td className="py-3 px-3 text-left font-mono text-stone-800">
                      {formatNumber(transaction.unitPrice)}
                    </td>
                  )}
                  <td className="py-3 px-3 text-left font-mono font-extrabold text-stone-950 text-sm">
                    {formatNumber(transaction.amount)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-stone-50 font-bold border-t border-stone-300">
                  <td colSpan={transaction.weightKg !== undefined && transaction.unitPrice !== undefined ? 3 : (transaction.weightKg !== undefined || transaction.unitPrice !== undefined ? 2 : 1)} className="py-3 px-3 text-stone-700">
                    مبلغ کل سند به حروف:
                    <span className="font-normal text-stone-900 mr-2">
                      {numberToTomanWords(transaction.amount) || 'صفر تومان'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-left font-mono font-extrabold text-base text-amber-950">
                    {formatToman(transaction.amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Balance Snapshots Before & After */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Cash Balance Impact */}
            <div className="bg-stone-50/80 p-3.5 rounded-xl border border-stone-200 text-xs space-y-2">
              <span className="font-bold text-stone-800 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-stone-600" />
                <span>گردش کیف پول ریالی</span>
              </span>
              
              <div className="space-y-1 text-stone-600">
                <div className="flex justify-between">
                  <span>موجودی ریالی قبل از سند:</span>
                  <span className="font-mono font-medium">{formatToman(transaction.cashBalanceBefore || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-stone-900 pt-1 border-t border-stone-200">
                  <span>موجودی ریالی بعد از سند:</span>
                  <span className="font-mono text-amber-900">{formatToman(transaction.cashBalanceAfter || 0)}</span>
                </div>
              </div>
            </div>

            {/* Copper Stock Impact */}
            <div className="bg-amber-50/40 p-3.5 rounded-xl border border-amber-200/70 text-xs space-y-2">
              <span className="font-bold text-amber-950 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-700" />
                <span>گردش انبار مس (کاردکس)</span>
              </span>

              <div className="space-y-1 text-stone-600">
                <div className="flex justify-between">
                  <span>موجودی مس قبل از سند:</span>
                  <span className="font-mono font-medium">{formatWeight(transaction.copperStockBefore || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-950 pt-1 border-t border-amber-200/60">
                  <span>موجودی مس بعد از سند:</span>
                  <span className="font-mono text-amber-900">{formatWeight(transaction.copperStockAfter || 0)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Bank Receipt Attachment if uploaded */}
          {transaction.receiptImageUrl && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-2">
              <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span>تصویر فیش / رسید بانکی واریزی ضمیمه شده:</span>
              </span>
              <div className="flex justify-center p-2 bg-white rounded-lg border border-emerald-200">
                <img
                  src={transaction.receiptImageUrl}
                  alt="رسید بانکی واریزی"
                  className="max-h-64 object-contain rounded-md border border-stone-200 shadow-2xs"
                />
              </div>
            </div>
          )}

          {/* Notes or Rejection Reason */}
          {transaction.notes && (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
              <span className="font-bold text-stone-700">توضیحات و بابت:</span>
              <p className="text-stone-600 leading-relaxed">{transaction.notes}</p>
            </div>
          )}

          {status === 'rejected' && transaction.rejectionReason && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1 text-rose-900">
              <span className="font-bold flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                دلیل عدم تأیید توسط مدیرعامل:
              </span>
              <p className="text-rose-800">{transaction.rejectionReason}</p>
            </div>
          )}

          {/* Official Audit Statement */}
          <div className="p-3.5 bg-stone-100 rounded-xl border border-stone-300 text-[11px] text-stone-600 leading-relaxed text-center">
            {status === 'approved' ? (
              <p>
                🔒 <strong className="text-stone-900 font-bold">بیانیه اعتبار سند:</strong> این تراکنش با موفقیت توسط مدیرعامل تأیید و ثبت نهایی شده و در کاردکس انبار و دفاتر مالی اعمال گردیده است. طبق قوانین سیستم، اسناد تأییدشده غیرقابل حذف یا ویرایش مستقیم هستند و در صورت نیاز از سند اصلاحی استفاده می‌شود.
              </p>
            ) : status === 'pending' ? (
              <p className="text-amber-800 font-medium">
                ⏳ <strong className="font-bold">سند پیش‌نویس / در انتظار تأیید:</strong> این سند تا زمان تأیید رسمی توسط مدیرعامل، در مانده حساب ریالی و موجودی انبار طرف حساب اعمال نمی‌شود.
              </p>
            ) : (
              <p className="text-rose-800 font-medium">
                ❌ <strong className="font-bold">سند رد شده:</strong> این معامله توسط مدیریت رد گردیده و هیچ‌گونه اثری در دفاتر مالی و انبار ندارد.
              </p>
            )}
          </div>

          {/* Signatures & Seal Area */}
          <div className="pt-8 pb-4 border-t-2 border-stone-300 grid grid-cols-3 gap-4 text-center text-xs">
            <div className="space-y-12">
              <p className="font-bold text-stone-800">امضای صادرکننده</p>
              <p className="text-stone-400 text-[10px]">({transaction.registeredBy || 'حسابدار مس'})</p>
            </div>

            <div className="space-y-12 border-x border-stone-200">
              <p className="font-bold text-stone-800">تأیید و مهر مدیرعامل</p>
              <p className="text-stone-400 text-[10px]">
                {status === 'approved' ? 'تأیید الکترونیکی مدیرعامل' : '(در انتظار امضا)'}
              </p>
            </div>

            <div className="space-y-12">
              <p className="font-bold text-stone-800">امضای تحویل‌گیرنده / طرف حساب</p>
              <p className="text-stone-400 text-[10px]">({person?.name || 'مشتری'})</p>
            </div>
          </div>

        </div>
        </div>

        {/* Modal Bottom Footer (hidden in print) */}
        <div className="p-3 sm:p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between shrink-0 print:hidden">
          <div className="text-xs text-stone-500 hidden sm:block">
            سامانه معاملات مس واته • شناسه رهگیری: <span className="font-mono font-bold text-stone-700">{receiptNum}</span>
          </div>
          <div className="flex items-center gap-2 mr-auto sm:mr-0">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold text-stone-800 bg-stone-200 hover:bg-stone-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ سند</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-black rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              بستن پنجره
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
