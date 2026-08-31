import React, { useState, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  ShoppingBag, 
  TrendingUp, 
  AlertTriangle, 
  FileText, 
  Printer, 
  Search, 
  Filter, 
  CheckCheck,
  User,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { Transaction, Person } from '../types';
import { formatNumber, formatToman, formatWeight } from '../utils/formatters';

interface PendingApprovalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  people: Person[];
  userRole?: 'admin' | 'staff' | 'client';
  onApprove: (transactionId: string, approverName?: string) => void;
  onReject: (transactionId: string, reason: string, approverName?: string) => void;
  onBulkApprove?: (transactionIds: string[], approverName?: string) => void;
  onViewReceipt: (transaction: Transaction) => void;
}

export const PendingApprovalsModal: React.FC<PendingApprovalsModalProps> = ({
  isOpen,
  onClose,
  transactions,
  people,
  userRole = 'admin',
  onApprove,
  onReject,
  onBulkApprove,
  onViewReceipt,
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [approverName, setApproverName] = useState('مدیرعامل');
  const [ceoPinPrompt, setCeoPinPrompt] = useState<{ action: 'approve' | 'reject' | 'bulk'; txId?: string; txIds?: string[]; reason?: string } | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Reject modal state
  const [rejectingTxId, setRejectingTxId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const personMap = useMemo(() => {
    const map = new Map<string, Person>();
    for (const p of people) {
      map.set(p.id, p);
    }
    return map;
  }, [people]);

  // Separate transactions into Pending vs History
  const pendingTransactions = useMemo(() => {
    return transactions
      .filter((tx) => (tx.approvalStatus || 'approved') === 'pending')
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [transactions]);

  const historyTransactions = useMemo(() => {
    return transactions
      .filter((tx) => (tx.approvalStatus || 'approved') !== 'pending')
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [transactions]);

  // Filtered by search
  const filteredList = useMemo(() => {
    const list = activeTab === 'pending' ? pendingTransactions : historyTransactions;
    if (!searchTerm.trim()) return list;

    const term = searchTerm.toLowerCase();
    return list.filter((tx) => {
      const person = personMap.get(tx.personId);
      const nameMatch = person?.name.toLowerCase().includes(term);
      const notesMatch = tx.notes?.toLowerCase().includes(term);
      const receiptMatch = tx.receiptNumber?.toLowerCase().includes(term);
      const regMatch = tx.registeredBy?.toLowerCase().includes(term);
      return nameMatch || notesMatch || receiptMatch || regMatch;
    });
  }, [activeTab, pendingTransactions, historyTransactions, searchTerm, personMap]);

  if (!isOpen) return null;

  const executeApprove = (txId: string) => {
    if (userRole !== 'admin') {
      setCeoPinPrompt({ action: 'approve', txId });
      setEnteredPin('');
      setPinError('');
      return;
    }
    onApprove(txId, approverName.trim() || 'مدیرعامل');
  };

  const handleStartReject = (txId: string) => {
    if (userRole !== 'admin') {
      setCeoPinPrompt({ action: 'reject', txId });
      setEnteredPin('');
      setPinError('');
      return;
    }
    setRejectingTxId(txId);
    setRejectionReason('');
    setRejectError('');
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setRejectError('لطفاً دلیل رد معامله را بنویسید.');
      return;
    }
    if (rejectingTxId) {
      onReject(rejectingTxId, rejectionReason.trim(), approverName.trim() || 'مدیرعامل');
      setRejectingTxId(null);
      setRejectionReason('');
    }
  };

  const handleBulkApproveAll = () => {
    if (pendingTransactions.length === 0) return;
    const ids = pendingTransactions.map((tx) => tx.id);
    if (userRole !== 'admin') {
      setCeoPinPrompt({ action: 'bulk', txIds: ids });
      setEnteredPin('');
      setPinError('');
      return;
    }
    if (onBulkApprove) {
      onBulkApprove(ids, approverName.trim() || 'مدیرعامل');
    } else {
      for (const tx of pendingTransactions) {
        onApprove(tx.id, approverName.trim() || 'مدیرعامل');
      }
    }
  };

  const handleVerifyCeoPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin.trim() === 'milad@68' || enteredPin.trim() === 'admin123') {
      if (ceoPinPrompt?.action === 'approve' && ceoPinPrompt.txId) {
        onApprove(ceoPinPrompt.txId, 'مدیرعامل');
      } else if (ceoPinPrompt?.action === 'reject' && ceoPinPrompt.txId) {
        setRejectingTxId(ceoPinPrompt.txId);
      } else if (ceoPinPrompt?.action === 'bulk' && ceoPinPrompt.txIds) {
        if (onBulkApprove) {
          onBulkApprove(ceoPinPrompt.txIds, 'مدیرعامل');
        } else {
          for (const id of ceoPinPrompt.txIds) {
            onApprove(id, 'مدیرعامل');
          }
        }
      }
      setCeoPinPrompt(null);
      setEnteredPin('');
      setPinError('');
    } else {
      setPinError('رمز مدیرعامل اشتباه است. فقط مدیرعامل مجاز به تأیید است.');
    }
  };

  const getTypeBadge = (type: Transaction['type']) => {
    switch (type) {
      case 'buy':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md text-xs font-bold">
            <ShoppingBag className="w-3 h-3" />
            خرید مس
          </span>
        );
      case 'sell':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md text-xs font-bold">
            <TrendingUp className="w-3 h-3" />
            فروش مس
          </span>
        );
      case 'deposit':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md text-xs font-bold">
            <ArrowDownLeft className="w-3 h-3" />
            واریز وجه
          </span>
        );
      case 'withdrawal':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-900 px-2 py-0.5 rounded-md text-xs font-bold">
            <ArrowUpRight className="w-3 h-3" />
            برداشت وجه
          </span>
        );
      case 'adjustment':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 px-2 py-0.5 rounded-md text-xs font-bold">
            <Layers className="w-3 h-3" />
            اصلاح حساب
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/75 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 py-4 sm:py-6">
      <div className="bg-white rounded-2xl border border-stone-300 shadow-2xl w-full max-w-4xl my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header (Sticky at top) */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-900 text-white flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">
                  کارتابل تأییدات مدیرعامل
                </h3>
                {pendingTransactions.length > 0 && (
                  <span className="bg-amber-500 text-stone-950 text-xs font-extrabold px-2 py-0.5 rounded-full">
                    {formatNumber(pendingTransactions.length)} معامله جدید
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                بررسی، تأیید نهایی یا رد معاملات ثبت‌شده توسط حسابدار مس
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
            title="بستن پنجره"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Approver Role Setting */}
        <div className="p-4 border-b border-stone-200 bg-stone-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Tabs */}
          <div className="flex items-center bg-stone-200/80 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>در انتظار تأیید</span>
              {pendingTransactions.length > 0 && (
                <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full mr-1">
                  {formatNumber(pendingTransactions.length)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>تاریخچه تأیید و رد شده‌ها</span>
              <span className="text-stone-400 text-[10px] mr-1">
                ({formatNumber(historyTransactions.length)})
              </span>
            </button>
          </div>

          {/* Search & Bulk Action */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="جستجوی شخص، شماره رسید..."
                className="w-full pl-3 pr-8 py-1.5 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>

            {activeTab === 'pending' && pendingTransactions.length > 1 && (
              <button
                type="button"
                onClick={handleBulkApproveAll}
                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>تأیید همه ({formatNumber(pendingTransactions.length)})</span>
              </button>
            )}
          </div>

        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {filteredList.length === 0 ? (
            <div className="py-16 text-center text-stone-400 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                {activeTab === 'pending' ? <CheckCircle2 className="w-7 h-7 text-emerald-600" /> : <FileText className="w-7 h-7" />}
              </div>
              <p className="text-sm font-bold text-stone-700">
                {activeTab === 'pending' 
                  ? 'هیچ معامله‌ای در صف تأیید مدیرعامل وجود ندارد.' 
                  : 'موردی در تاریخچه یافت نشد.'}
              </p>
              <p className="text-xs text-stone-500">
                {activeTab === 'pending'
                  ? 'تمامی خرید و فروش‌های ثبت‌شده تأیید و نهایی شده‌اند.'
                  : 'معاملات تأییدشده یا ردشده در این بخش بایگانی می‌شوند.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredList.map((tx) => {
                const person = personMap.get(tx.personId);
                const status = tx.approvalStatus || 'approved';
                const isPending = status === 'pending';

                return (
                  <div
                    key={tx.id}
                    className={`rounded-xl border transition-all p-4 sm:p-5 ${
                      isPending
                        ? 'bg-white border-amber-300 shadow-sm hover:border-amber-400 ring-1 ring-amber-400/20'
                        : status === 'approved'
                        ? 'bg-stone-50/70 border-stone-200'
                        : 'bg-rose-50/40 border-rose-200'
                    }`}
                  >
                    {/* Top Row: Party Name & Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                      <div className="flex items-center gap-2.5">
                        {getTypeBadge(tx.type)}
                        <span className="font-extrabold text-stone-900 text-sm sm:text-base">
                          {person?.name || 'نامشخص'}
                        </span>
                        {person?.phone && (
                          <span className="text-stone-400 text-xs font-mono">
                            ({person.phone})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {tx.receiptNumber && (
                          <span className="text-[11px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                            {tx.receiptNumber}
                          </span>
                        )}
                        <span className="text-xs text-stone-500 font-mono">
                          {tx.date}
                        </span>
                      </div>
                    </div>

                    {/* Transaction Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 text-xs">
                      {tx.weightKg !== undefined && (
                        <div className="space-y-0.5">
                          <span className="text-stone-500">مقدار مس:</span>
                          <p className="font-bold text-amber-950 font-mono text-sm">
                            {formatWeight(tx.weightKg)}
                          </p>
                        </div>
                      )}

                      {tx.unitPrice !== undefined && (
                        <div className="space-y-0.5">
                          <span className="text-stone-500">قیمت هر کیلو:</span>
                          <p className="font-bold text-stone-800 font-mono">
                            {formatToman(tx.unitPrice)}
                          </p>
                        </div>
                      )}

                      <div className="space-y-0.5">
                        <span className="text-stone-500">مبلغ کل فاکتور:</span>
                        <p className="font-extrabold text-stone-950 font-mono text-sm">
                          {formatToman(tx.amount)}
                        </p>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-stone-500">ثبت‌شده توسط:</span>
                        <p className="font-medium text-stone-800">
                          {tx.registeredBy || 'مسئول مس'}
                        </p>
                      </div>
                    </div>

                    {/* Cheque Info if any */}
                    {tx.paymentMethod === 'cheque' && (
                      <div className="p-2.5 bg-blue-50/60 border border-blue-200/70 rounded-lg text-xs text-blue-900 flex items-center justify-between mb-3">
                        <span className="font-medium">
                          پرداخت با چک صیادی شماره: <b className="font-mono">{tx.chequeNumber}</b> ({tx.chequeBank})
                        </span>
                        <span className="font-mono text-blue-800">سررسید: {tx.chequeDueDate}</span>
                      </div>
                    )}

                    {/* Bank Receipt Image Attachment (if uploaded) */}
                    {tx.receiptImageUrl && (
                      <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={tx.receiptImageUrl}
                            alt="رسید بانکی"
                            className="w-14 h-14 rounded-lg object-cover border border-emerald-300 shadow-xs cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => setPreviewImageUrl(tx.receiptImageUrl || null)}
                          />
                          <div>
                            <span className="text-xs font-bold text-emerald-950 block">تصویر رسید بانکی واریزی (ضمیمه مشتری)</span>
                            <span className="text-[11px] text-emerald-700">توسط مشتری بارگذاری شده است</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPreviewImageUrl(tx.receiptImageUrl || null)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>مشاهده کامل رسید</span>
                        </button>
                      </div>
                    )}

                    {/* Notes */}
                    {tx.notes && (
                      <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-200 mb-3">
                        <strong className="text-stone-700">توضیحات:</strong> {tx.notes}
                      </p>
                    )}

                    {/* Rejection Reason if rejected */}
                    {status === 'rejected' && tx.rejectionReason && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 mb-3">
                        <strong>دلیل رد:</strong> {tx.rejectionReason}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                      
                      {/* Status Info for History */}
                      <div>
                        {status === 'approved' && (
                          <div className="flex items-center gap-1 text-xs text-emerald-800 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>تأیید شده توسط: {tx.approvedBy || 'مدیرعامل'} {tx.approvedAt && `(${tx.approvedAt})`}</span>
                          </div>
                        )}
                        {status === 'rejected' && (
                          <div className="flex items-center gap-1 text-xs text-rose-800 font-bold">
                            <XCircle className="w-4 h-4 text-rose-600" />
                            <span>رد شده توسط: {tx.approvedBy || 'مدیرعامل'} {tx.approvedAt && `(${tx.approvedAt})`}</span>
                          </div>
                        )}
                        {isPending && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-800 font-medium">
                            <Info className="w-4 h-4 text-amber-600" />
                            <span>تا قبل از تأیید مدیرعامل، موجودی ریالی و انبار تغییر نمی‌کند.</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onViewReceipt(tx)}
                          className="px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-stone-950 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>مشاهده رسید</span>
                        </button>

                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartReject(tx.id)}
                              className="px-3 py-1.5 text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>رد کردن</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => executeApprove(tx.id)}
                              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>تأیید و اعمال نهایی</span>
                            </button>
                          </>
                        )}
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          <p className="text-xs text-stone-500">
            تأییدات به‌صورت بلادرنگ در دفاتر مالی و سرور اعمال خواهند شد.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-stone-700 bg-stone-200 hover:bg-stone-300 rounded-lg transition-colors cursor-pointer"
          >
            بستن
          </button>
        </div>

      </div>

      {/* CEO PIN Verification Prompt Dialog */}
      {ceoPinPrompt && (
        <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-stone-300 shadow-2xl w-full max-w-sm p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-amber-700 font-bold text-sm border-b border-stone-200 pb-3">
              <ShieldCheck className="w-5 h-5" />
              <span>تأیید هویت مدیرعامل</span>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              تأیید یا رد نهایی معاملات در سیستم فقط با اختیارات و رمز عبور مدیرعامل امکان‌پذیر است. لطفاً رمز عبور را وارد کنید:
            </p>

            <form onSubmit={handleVerifyCeoPin} className="space-y-3">
              {pinError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {pinError}
                </div>
              )}

              <div>
                <input
                  type="password"
                  required
                  value={enteredPin}
                  onChange={(e) => {
                    setEnteredPin(e.target.value);
                    if (pinError) setPinError('');
                  }}
                  placeholder="رمز عبور مدیرعامل (milad@68)..."
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600 font-mono"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setCeoPinPrompt(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  تأیید هویت و اعمال
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Reason Dialog */}
      {rejectingTxId && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-stone-300 shadow-2xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <XCircle className="w-4 h-4" />
                <span>رد کردن معامله مس</span>
              </div>
              <button
                type="button"
                onClick={() => setRejectingTxId(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-3">
              {rejectError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {rejectError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  دلیل رد معامله توسط مدیرعامل <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="مثال: نرخ خرید بالاتر از نرخ مصوب روز است / مغایرت در وزن..."
                  className="w-full p-2.5 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setRejectingTxId(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  ثبت رد معامله
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Image Preview Modal Lightbox */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative max-w-3xl max-h-[90vh] w-full bg-stone-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-3 bg-stone-800 text-white flex items-center justify-between border-b border-stone-700">
              <span className="text-xs font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>تصویر فیش / رسید بانکی واریزی</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                className="p-1 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-stone-950">
              <img
                src={previewImageUrl}
                alt="تصویر رسید بانکی کامل"
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
