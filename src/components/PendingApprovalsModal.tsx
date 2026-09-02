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
  Info,
  Building2,
  CreditCard,
  Send,
  Copy,
  Check
} from 'lucide-react';
import { Transaction, Person, CompanyBankAccount } from '../types';
import { formatNumber, formatToman, formatWeight } from '../utils/formatters';
import { getStoredCompanyBankAccounts } from '../utils/storage';

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
  onAssignBank?: (transactionId: string, bankDetails: CompanyBankAccount, note?: string) => void;
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
  onAssignBank,
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

  // Step 2 Assign Bank Modal State
  const [assignBankTx, setAssignBankTx] = useState<Transaction | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [bankNote, setBankNote] = useState<string>('');

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const companyBankAccounts = useMemo(() => getStoredCompanyBankAccounts(), [isOpen]);

  const personMap = useMemo(() => {
    const map = new Map<string, Person>();
    for (const p of people) {
      map.set(p.id, p);
    }
    return map;
  }, [people]);

  // Check if a transaction is in pending state (including topup steps 1, 2, 3)
  const isPendingStatus = (s?: string) => 
    s === 'pending' || 
    s === 'topup_step1_pending_bank' || 
    s === 'topup_step2_awaiting_receipt' || 
    s === 'topup_step3_pending_approval';

  // Separate transactions into Pending vs History
  const pendingTransactions = useMemo(() => {
    return transactions
      .filter((tx) => isPendingStatus(tx.approvalStatus))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [transactions]);

  const historyTransactions = useMemo(() => {
    return transactions
      .filter((tx) => !isPendingStatus(tx.approvalStatus))
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

  const handleStartAssignBank = (tx: Transaction) => {
    setAssignBankTx(tx);
    const defaultAcc = companyBankAccounts.find((a) => a.isDefault) || companyBankAccounts[0];
    setSelectedBankId(defaultAcc?.id || '');
    setBankNote('لطفاً پس از واریز به این شماره حساب، تصویر فیش واریزی را بارگذاری کنید.');
  };

  const handleConfirmAssignBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignBankTx) return;
    const bank = companyBankAccounts.find((a) => a.id === selectedBankId) || companyBankAccounts[0];
    if (!bank) return;

    if (onAssignBank) {
      onAssignBank(assignBankTx.id, bank, bankNote);
    }
    setAssignBankTx(null);
  };

  const handleBulkApproveAll = () => {
    if (pendingTransactions.length === 0) return;
    const ids = pendingTransactions.filter(t => t.approvalStatus === 'pending' || t.approvalStatus === 'topup_step3_pending_approval').map((tx) => tx.id);
    if (ids.length === 0) return;
    if (userRole !== 'admin') {
      setCeoPinPrompt({ action: 'bulk', txIds: ids });
      setEnteredPin('');
      setPinError('');
      return;
    }
    if (onBulkApprove) {
      onBulkApprove(ids, approverName.trim() || 'مدیرعامل');
    } else {
      for (const id of ids) {
        onApprove(id, approverName.trim() || 'مدیرعامل');
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

  const getTypeBadge = (tx: Transaction) => {
    const status = tx.approvalStatus || 'approved';
    if (status === 'topup_step1_pending_bank') {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-950 px-2.5 py-0.5 rounded-md text-xs font-black border border-amber-300 animate-pulse">
          <ArrowDownLeft className="w-3.5 h-3.5 text-amber-700" />
          شارژ حساب (مرحله ۱: منتظر تخصیص شماره حساب)
        </span>
      );
    }
    if (status === 'topup_step2_awaiting_receipt') {
      return (
        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md text-xs font-bold border border-blue-200">
          <Building2 className="w-3.5 h-3.5 text-blue-700" />
          شارژ حساب (مرحله ۲: شماره حساب ارسال شد، منتظر فیش مشتری)
        </span>
      );
    }
    if (status === 'topup_step3_pending_approval') {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-950 px-2.5 py-0.5 rounded-md text-xs font-black border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
          شارژ حساب (مرحله ۳: فیش واریزی آپلود شد، منتظر بررسی نهایی)
        </span>
      );
    }

    switch (tx.type) {
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
            واریز / شارژ حساب
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/75 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 py-4 sm:py-6 dir-rtl">
      <div className="bg-white rounded-2xl border border-stone-300 shadow-2xl w-full max-w-4xl my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-900 text-white flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">
                  کارتابل تأییدات و تخصیص شماره حساب مدیرعامل
                </h3>
                {pendingTransactions.length > 0 && (
                  <span className="bg-amber-500 text-stone-950 text-xs font-extrabold px-2 py-0.5 rounded-full">
                    {formatNumber(pendingTransactions.length)} درخواست جدید
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                فرآیند ۴ مرحله‌ای شارژ حساب، بررسی فیش‌های واریزی و تأیید معاملات مس
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

        {/* Toolbar & Tabs */}
        <div className="p-4 border-b border-stone-200 bg-stone-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
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
              <span>در انتظار اقدام مدیر</span>
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

          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="جستجوی نام مشتری، کد پیگیری..."
                className="w-full pl-3 pr-8 py-1.5 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>
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
                  ? 'هیچ درخواستی در صف تأیید یا تخصیص شماره حساب مدیرعامل وجود ندارد.' 
                  : 'موردی در تاریخچه یافت نشد.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredList.map((tx) => {
                const person = personMap.get(tx.personId);
                const status = tx.approvalStatus || 'approved';
                const isPending = isPendingStatus(status);

                return (
                  <div
                    key={tx.id}
                    className={`rounded-xl border transition-all p-4 sm:p-5 ${
                      status === 'topup_step1_pending_bank'
                        ? 'bg-amber-50/70 border-amber-300 shadow-sm ring-2 ring-amber-400/40'
                        : status === 'topup_step3_pending_approval'
                        ? 'bg-emerald-50/70 border-emerald-300 shadow-sm ring-2 ring-emerald-400/40'
                        : isPending
                        ? 'bg-white border-amber-200 shadow-xs'
                        : status === 'approved'
                        ? 'bg-stone-50/70 border-stone-200'
                        : 'bg-rose-50/40 border-rose-200'
                    }`}
                  >
                    {/* Top Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200/60">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {getTypeBadge(tx)}
                        <span className="font-extrabold text-stone-900 text-sm sm:text-base">
                          {person?.name || 'نامشخص'}
                        </span>
                        {person?.phone && (
                          <span className="text-stone-500 text-xs font-mono">
                            ({person.phone})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {tx.receiptNumber && (
                          <span className="text-[11px] font-mono text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                            کد پیگیری: {tx.receiptNumber}
                          </span>
                        )}
                        <span className="text-xs text-stone-500 font-mono">
                          {tx.date}
                        </span>
                      </div>
                    </div>

                    {/* Transaction Amount Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 text-xs bg-stone-50/70 p-3 rounded-xl border border-stone-200/80 mb-3">
                      <div className="space-y-0.5">
                        <span className="text-stone-500">مبلغ معامله / درخواست:</span>
                        <p className="font-extrabold text-stone-950 font-mono text-base">
                          {formatToman(tx.amount)}
                        </p>
                      </div>

                      {tx.weightKg !== undefined && (
                        <div className="space-y-0.5">
                          <span className="text-stone-500">وزن مس:</span>
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
                        <span className="text-stone-500">موجودی فعلی مشتری:</span>
                        <p className="font-bold text-stone-900 font-mono">
                          {formatToman(tx.cashBalanceBefore ?? 0)}
                        </p>
                      </div>

                      {/* Buy Balance Impact Preview */}
                      {tx.type === 'buy' && (
                        <div className="col-span-2 sm:col-span-4 bg-amber-100/70 text-amber-950 p-2 rounded-lg text-xs font-semibold flex items-center justify-between border border-amber-200">
                          <span>
                            📉 مانده ریالی مشتری پس از تأیید کسر وجه:
                          </span>
                          <span className="font-bold font-mono text-emerald-800 text-sm">
                            {formatToman(Math.max(0, (tx.cashBalanceBefore ?? 0) - tx.amount))}
                          </span>
                        </div>
                      )}

                      {/* Sell Balance Impact Preview */}
                      {tx.type === 'sell' && (
                        <div className="col-span-2 sm:col-span-4 bg-blue-100/70 text-blue-950 p-2 rounded-lg text-xs font-semibold flex items-center justify-between border border-blue-200">
                          <span>
                            📈 مانده ریالی مشتری پس از واریز مبلغ فروش:
                          </span>
                          <span className="font-bold font-mono text-emerald-800 text-sm">
                            {formatToman((tx.cashBalanceBefore ?? 0) + tx.amount)}
                          </span>
                        </div>
                      )}

                      {/* Withdrawal Balance Impact Preview */}
                      {tx.type === 'withdrawal' && (
                        <div className="col-span-2 sm:col-span-4 bg-rose-100/70 text-rose-950 p-2 rounded-lg text-xs font-semibold flex items-center justify-between border border-rose-200">
                          <span>
                            📉 مانده ریالی مشتری پس از پرداخت و تسویه وجه:
                          </span>
                          <span className="font-bold font-mono text-stone-900 text-sm">
                            {formatToman(Math.max(0, (tx.cashBalanceBefore ?? 0) - tx.amount))}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Step 2 Assigned Bank Display */}
                    {tx.assignedBankName && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 mb-3 space-y-1">
                        <div className="font-bold flex items-center justify-between">
                          <span>شماره حساب اختصاص‌یافته به مشتری: {tx.assignedBankName} ({tx.assignedOwnerName})</span>
                          <span className="font-mono">{tx.assignedCardNumber}</span>
                        </div>
                        {tx.assignedIbanNumber && (
                          <p className="font-mono text-[11px] text-blue-700">شبا: {tx.assignedIbanNumber}</p>
                        )}
                        {tx.assignedBankNote && (
                          <p className="text-[11px] text-blue-800">پیام مدیر: {tx.assignedBankNote}</p>
                        )}
                      </div>
                    )}

                    {/* Receipt Image if Uploaded (Step 3) */}
                    {tx.receiptImageUrl && (
                      <div className="p-3 bg-emerald-50/80 border border-emerald-300 rounded-xl mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={tx.receiptImageUrl}
                            alt="رسید بانکی"
                            className="w-14 h-14 rounded-lg object-cover border border-emerald-400 shadow-xs cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => setPreviewImageUrl(tx.receiptImageUrl || null)}
                          />
                          <div>
                            <span className="text-xs font-bold text-emerald-950 block">عکس رسید واریزی بانکی مشتری (مرحله ۳)</span>
                            <span className="text-[11px] text-emerald-700 font-mono">کد پیگیری/فیش: {tx.receiptNumber || 'ثبت شده'}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPreviewImageUrl(tx.receiptImageUrl || null)}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>مشاهده کامل عکس فیش</span>
                        </button>
                      </div>
                    )}

                    {/* Step Warning / Helper Banners for Topup */}
                    {tx.type === 'deposit' && (
                      <div className="mb-3">
                        {(status === 'topup_step1_pending_bank' || status === 'pending') && (
                          <div className="p-2.5 bg-amber-100/80 border border-amber-300 text-amber-900 rounded-lg text-xs font-medium flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0 animate-ping" />
                            <span>
                              <b>مرحله ۱ از ۴:</b> مشتری درخواست شارژ داده است. لطفاً ابتدا روی <b>«انتخاب و ارسال شماره حساب»</b> کلیک کنید. تا زمان ارسال فیش توسط مشتری و تأیید نهایی آن در مرحله ۴، موجودی به حساب افزوده نمی‌شود.
                            </span>
                          </div>
                        )}
                        {status === 'topup_step2_awaiting_receipt' && (
                          <div className="p-2.5 bg-blue-100/80 border border-blue-300 text-blue-950 rounded-lg text-xs font-medium flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                            <span>
                              <b>مرحله ۲ از ۴:</b> شماره حساب برای مشتری ارسال شده است. اکنون در انتظار واریز وجه و ارسال عکس فیش توسط مشتری هستید.
                            </span>
                          </div>
                        )}
                        {status === 'topup_step3_pending_approval' && (
                          <div className="p-2.5 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-lg text-xs font-bold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 animate-ping" />
                            <span>
                              <b>مرحله ۳ از ۴ (آماده تایید نهایی):</b> عکس فیش و کد رهگیری توسط مشتری بارگذاری شد. پس از بررسی حساب بانکی و مطابقت فیش، دکمه <b>«تأیید فیش و شارژ نهایی حساب»</b> را بزنید.
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {tx.notes && (
                      <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-200 mb-3">
                        <strong className="text-stone-700">توضیحات:</strong> {tx.notes}
                      </p>
                    )}

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                      
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
                            <span>رد شده: {tx.rejectionReason}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onViewReceipt(tx)}
                          className="px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-stone-950 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>مشاهده رسید</span>
                        </button>

                        {/* STEP 1: CEO Assign Bank Account Button */}
                        {(status === 'topup_step1_pending_bank' || (tx.type === 'deposit' && status === 'pending')) && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartReject(tx.id)}
                              className="px-3 py-1.5 text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>رد درخواست</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartAssignBank(tx)}
                              className="px-3.5 py-1.5 text-xs font-black text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <Building2 className="w-3.5 h-3.5" />
                              <span>مرحله ۲: انتخاب و ارسال شماره حساب</span>
                            </button>
                          </>
                        )}

                        {/* STEP 2: CEO Change Bank Account or Reject */}
                        {status === 'topup_step2_awaiting_receipt' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartReject(tx.id)}
                              className="px-3 py-1.5 text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>رد درخواست</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartAssignBank(tx)}
                              className="px-3.5 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Building2 className="w-3.5 h-3.5 text-amber-700" />
                              <span>تغییر شماره حساب ارسال‌شده</span>
                            </button>
                          </>
                        )}

                        {/* STEP 3: Receipt Uploaded -> CEO Step 4 Final Approval */}
                        {status === 'topup_step3_pending_approval' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartReject(tx.id)}
                              className="px-3 py-1.5 text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>رد فیش / درخواست</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => executeApprove(tx.id)}
                              className="px-4 py-1.5 text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer animate-pulse"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                              <span>مرحله ۴: تأیید فیش و شارژ نهایی حساب</span>
                            </button>
                          </>
                        )}

                        {/* Other non-deposit pending transactions (buy, sell, withdrawal) */}
                        {tx.type !== 'deposit' && status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartReject(tx.id)}
                              className="px-3 py-1.5 text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>رد درخواست</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => executeApprove(tx.id)}
                              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>
                                {tx.type === 'buy' 
                                  ? 'تأیید نهایی و کسر از موجودی' 
                                  : tx.type === 'sell' 
                                  ? 'تأیید نهایی و واریز به حساب' 
                                  : 'تأیید نهایی و تسویه وجه'}
                              </span>
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
            با تأیید نهایی مدیرعامل، شارژ حساب بلافاصله در موجودی مشتری ثبت می‌گردد.
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

      {/* STEP 2: CEO Assign Bank Modal */}
      {assignBankTx && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-stone-300 shadow-2xl w-full max-w-lg p-5 space-y-4 animate-in fade-in zoom-in-95 dir-rtl">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
                <Building2 className="w-5 h-5 text-emerald-700" />
                <span>تخصیص شماره حساب اختصاصی (مرحله ۲ از ۴)</span>
              </div>
              <button
                type="button"
                onClick={() => setAssignBankTx(null)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              مشتری درخواست شارژ مبلغ <b>{formatToman(assignBankTx.amount)}</b> ثبت کرده است. لطفاً شماره حساب شرکت که مایلید مشتری پول را به آن واریز کند انتخاب نمایید:
            </p>

            <form onSubmit={handleConfirmAssignBank} className="space-y-4">
              <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                {companyBankAccounts.map((acc) => (
                  <label
                    key={acc.id}
                    className={`block p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedBankId === acc.id
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-stone-50 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="bankAcc"
                          checked={selectedBankId === acc.id}
                          onChange={() => setSelectedBankId(acc.id)}
                          className="accent-emerald-700"
                        />
                        <span className="font-extrabold text-stone-900 text-xs">{acc.bankName}</span>
                      </div>
                      <span className="text-[11px] text-stone-500">{acc.ownerName}</span>
                    </div>
                    <div className="font-mono text-xs text-stone-800 flex items-center justify-between pl-6 pr-2 pt-1 border-t border-stone-200/50 mt-1">
                      <span>شماره کارت: {acc.cardNumber}</span>
                      <span>شبا: {acc.ibanNumber}</span>
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  پیام / راهنمای مدیر برای مشتری (اختیاری)
                </label>
                <textarea
                  rows={2}
                  value={bankNote}
                  onChange={(e) => setBankNote(e.target.value)}
                  placeholder="مثال: لطفاً حداکثر تا ۲ ساعت آینده واریز کرده و تصویر فیش را قرار دهید..."
                  className="w-full p-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setAssignBankTx(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>تخصیص و ارسال شماره حساب به مشتری</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CEO PIN Verification Prompt Dialog */}
      {ceoPinPrompt && (
        <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 dir-rtl">
          <div className="bg-white rounded-2xl border border-stone-300 shadow-2xl w-full max-w-sm p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-amber-700 font-bold text-sm border-b border-stone-200 pb-3">
              <ShieldCheck className="w-5 h-5" />
              <span>تأیید هویت مدیرعامل</span>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              تأیید یا رد نهایی معاملات فقط با رمز عبور مدیرعامل امکان‌پذیر است:
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
                  تأیید هویت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Reason Dialog */}
      {rejectingTxId && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 dir-rtl">
          <div className="bg-white rounded-2xl border border-stone-300 shadow-2xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <XCircle className="w-4 h-4" />
                <span>رد کردن درخواست</span>
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
                  دلیل رد درخواست توسط مدیرعامل <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="علت رد را وارد کنید..."
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
                  ثبت رد درخواست
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Image Preview Lightbox */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-80 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative max-w-3xl max-h-[90vh] w-full bg-stone-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-3 bg-stone-800 text-white flex items-center justify-between border-b border-stone-700">
              <span className="text-xs font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>تصویر رسید واریزی بانکی مشتری</span>
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
                alt="تصویر رسید کامل"
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
