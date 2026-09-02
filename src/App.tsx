/**
 * Copper Pipe Accounting & Dual-Asset Wallet Management WebApp
 * سیستم جامع مدیریت کیف پول، معاملات مس و انبار
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Person, Transaction, PersonWalletSummary, OverallStats, MarketPrices, TransactionType, PaymentMethod, CompanyBankInfo, CompanyBankAccount } from './types';
import { 
  getStoredPeople, 
  getStoredTransactions, 
  getStoredMarketPrice,
  getStoredMarketPrices,
  getStoredCompanyBankInfo,
  getStoredCompanyCopperStock,
  saveStoredCompanyCopperStock,
  saveCompanyBankInfo,
  savePeople, 
  saveTransactions, 
  saveMarketPrice,
  saveMarketPrices,
  saveAdminPassword,
  saveClientPassword,
  clearAllData,
  calculatePersonSummary, 
  calculateOverallStats,
  replayAllTransactions,
  replayAndCalculatePersonLedger,
  resetToSampleData,
  DEFAULT_MARKET_COPPER_PRICE,
  DEFAULT_MARKET_BUY_PRICE,
  DEFAULT_MARKET_SELL_PRICE
} from './utils/storage';
import { 
  fetchAllFromSupabase, 
  seedSupabaseIfEmpty, 
  dbUpsertPerson, 
  dbDeletePerson, 
  dbUpsertTransaction, 
  dbBatchUpsertTransactions, 
  dbDeleteTransaction, 
  dbSaveMarketPrice,
  dbSaveMarketPrices,
  dbSaveCompanyCopperStock,
  dbClearAllCloudData,
  toTransaction,
  toPerson,
  supabase
} from './services/supabase';
import { Header } from './components/Header';
import { StatCards } from './components/StatCards';
import { PeopleTable } from './components/PeopleTable';
import { PersonDetailModal } from './components/PersonDetailModal';
import { PersonFormModal } from './components/PersonFormModal';
import { DepositWithdrawModal } from './components/DepositWithdrawModal';
import { BuyCopperModal } from './components/BuyCopperModal';
import { SellCopperModal } from './components/SellCopperModal';
import { AdjustmentModal } from './components/AdjustmentModal';
import { MarketPriceModal } from './components/MarketPriceModal';
import { TransactionEditModal } from './components/TransactionEditModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { FactoryResetModal } from './components/FactoryResetModal';
import { AccountStatementModal } from './components/AccountStatementModal';
import { PendingApprovalsModal } from './components/PendingApprovalsModal';
import { TransactionReceiptModal } from './components/TransactionReceiptModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { CompanyBankModal } from './components/CompanyBankModal';
import { CompanyCopperStockCard } from './components/CompanyCopperStockCard';
import { CompanyCopperStockModal } from './components/CompanyCopperStockModal';
import { SupportChatWidget } from './components/SupportChatWidget';
import { LoginScreen } from './components/LoginScreen';
import { ClientPortalView } from './components/ClientPortalView';
import { CopperChartView } from './components/CopperChartView';
import { AiAnalysisView } from './components/AiAnalysisView';
import { CheckCircle2, AlertTriangle, Cloud, CloudOff } from 'lucide-react';
import { getTodayJalaliString, generateReceiptNumber, getPersianDateTimeString } from './utils/persianDate';
import { formatToman } from './utils/formatters';
import { AuthSession } from './types';

export default function App() {
  // Auth State & Session (Session-based auth: closing tab/browser or opening link in new session forces login)
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    try {
      localStorage.removeItem('waateh_auth_session');
      localStorage.removeItem('waateh_auth_token');
    } catch (e) {}

    const raw = sessionStorage.getItem('waateh_auth_session');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!sessionStorage.getItem('waateh_auth_session') || !!sessionStorage.getItem('waateh_auth_token');
  });

  // Core State
  const [people, setPeople] = useState<Person[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [marketPrices, setMarketPrices] = useState<MarketPrices>(() => getStoredMarketPrices());
  const marketPrice = marketPrices.buyPrice;
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'copper-chart' | 'ai-analysis'>('dashboard');

  // Selected Person for Detail / Ledger Modal
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [statementPersonId, setStatementPersonId] = useState<string | null>(null);

  // Approvals & Receipts Modal State
  const [isApprovalsModalOpen, setIsApprovalsModalOpen] = useState(false);
  const [receiptModalTx, setReceiptModalTx] = useState<Transaction | null>(null);

  // Modal States
  const [isPersonFormOpen, setIsPersonFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  const [depositWithdrawState, setDepositWithdrawState] = useState<{
    isOpen: boolean;
    type: 'deposit' | 'withdrawal';
    targetPersonId?: string;
  }>({
    isOpen: false,
    type: 'deposit',
  });

  const [buyCopperState, setBuyCopperState] = useState<{
    isOpen: boolean;
    targetPersonId?: string;
  }>({
    isOpen: false,
  });

  const [sellCopperState, setSellCopperState] = useState<{
    isOpen: boolean;
    targetPersonId?: string;
  }>({
    isOpen: false,
  });

  const [adjustmentState, setAdjustmentState] = useState<{
    isOpen: boolean;
    targetPersonId?: string;
  }>({
    isOpen: false,
  });

  const [isMarketPriceOpen, setIsMarketPriceOpen] = useState(false);

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'person' | 'transaction';
    id: string;
    title: string;
    message: string;
    warningNote?: string;
  }>({
    isOpen: false,
    type: 'person',
    id: '',
    title: '',
    message: '',
  });

  const [isFactoryResetModalOpen, setIsFactoryResetModalOpen] = useState(false);
  const [isChangePassModalOpen, setIsChangePassModalOpen] = useState(false);
  const [isCompanyBankModalOpen, setIsCompanyBankModalOpen] = useState(false);
  const [companyBankInfo, setCompanyBankInfo] = useState<CompanyBankInfo>(() => getStoredCompanyBankInfo());

  // Company Copper Stock State
  const [companyCopperStockKg, setCompanyCopperStockKg] = useState<number>(() => getStoredCompanyCopperStock());
  const [isCompanyCopperStockModalOpen, setIsCompanyCopperStockModalOpen] = useState(false);

  const handleSaveCompanyCopperStock = async (newStockKg: number) => {
    setCompanyCopperStockKg(newStockKg);
    saveStoredCompanyCopperStock(newStockKg);
    if (isCloudConnected) {
      await dbSaveCompanyCopperStock(newStockKg);
    }
    showToast(`موجودی مس شرکت با موفقیت بروزرسانی گردید.`);
  };

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Initial Load from Supabase (with fallback to local storage)
  useEffect(() => {
    async function loadData() {
      setIsSyncing(true);
      try {
        const cloudResult = await fetchAllFromSupabase();

        if (cloudResult.isConnected) {
          setIsCloudConnected(true);
          
          // Load live data from Supabase directly & merge local pending approvals
          const storedTxs = getStoredTransactions();
          const mergedTxs = cloudResult.transactions.map((mTx) => {
            const localMatch = storedTxs.find((p) => p.id === mTx.id);
            if (
              localMatch && 
              localMatch.approvalStatus && 
              localMatch.approvalStatus !== 'approved' && 
              mTx.approvalStatus === 'approved'
            ) {
              return { ...mTx, ...localMatch, cashBalanceAfter: mTx.cashBalanceAfter, copperStockAfter: mTx.copperStockAfter };
            }
            return mTx;
          });
          const remoteIds = new Set(cloudResult.transactions.map((m) => m.id));
          const localOnlyPending = storedTxs.filter(
            (p) => !remoteIds.has(p.id) && p.approvalStatus && p.approvalStatus !== 'approved'
          );
          const combined = [...localOnlyPending, ...mergedTxs];

          const replayed = replayAllTransactions(cloudResult.people, combined);
          setPeople(cloudResult.people);
          setTransactions(replayed);
          setMarketPrices(cloudResult.marketPrices);
          if (cloudResult.companyCopperStock !== undefined) {
            setCompanyCopperStockKg(cloudResult.companyCopperStock);
            saveStoredCompanyCopperStock(cloudResult.companyCopperStock);
          }
          savePeople(cloudResult.people);
          saveTransactions(replayed);
          saveMarketPrices(cloudResult.marketPrices);
        } else {
          // Cloud connection issue, fallback to local storage
          setIsCloudConnected(false);
          const storedPeople = getStoredPeople();
          const storedTransactions = getStoredTransactions();
          const storedPrices = getStoredMarketPrices();
          const replayed = replayAllTransactions(storedPeople, storedTransactions);

          setPeople(storedPeople);
          setTransactions(replayed);
          setMarketPrices(storedPrices);
          showToast('اتصال به سرور برقرار نشد، داده‌ها از حافظه محلی فراخوانی شدند.', 'info');
        }
      } catch (err) {
        console.error('Error during initial load:', err);
        setIsCloudConnected(false);
        const storedPeople = getStoredPeople();
        const storedTransactions = getStoredTransactions();
        const storedPrices = getStoredMarketPrices();
        const replayed = replayAllTransactions(storedPeople, storedTransactions);

        setPeople(storedPeople);
        setTransactions(replayed);
        setMarketPrices(storedPrices);
      } finally {
        setIsLoaded(true);
        setIsSyncing(false);
      }
    }

    loadData();
  }, [showToast]);

  // Supabase Realtime Channel Subscription
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'people' },
        async () => {
          // Refresh people
          const { data } = await supabase.from('people').select('*');
          if (data) {
            const mapped = data.map((r: any) => ({
              id: r.id,
              name: r.name,
              phone: r.phone || undefined,
              notes: r.notes || undefined,
              createdAt: r.created_at,
            }));
            setPeople(mapped);
            savePeople(mapped);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        async () => {
          // Refresh transactions
          const { data } = await supabase.from('transactions').select('*');
          if (data) {
            const mapped = data.map(toTransaction);
            setTransactions((prevTxs) => {
              const merged = mapped.map((mTx) => {
                const localMatch = prevTxs.find((p) => p.id === mTx.id);
                if (
                  localMatch && 
                  localMatch.approvalStatus && 
                  localMatch.approvalStatus !== 'approved' && 
                  mTx.approvalStatus === 'approved'
                ) {
                  return { ...mTx, ...localMatch, cashBalanceAfter: mTx.cashBalanceAfter, copperStockAfter: mTx.copperStockAfter };
                }
                return mTx;
              });
              const remoteIds = new Set(mapped.map((m) => m.id));
              const localOnlyPending = prevTxs.filter(
                (p) => !remoteIds.has(p.id) && p.approvalStatus && p.approvalStatus !== 'approved'
              );
              const combined = [...localOnlyPending, ...merged];
              const replayed = replayAllTransactions(people, combined);
              saveTransactions(replayed);
              return replayed;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        async (payload: any) => {
          if (payload.new && (payload.new.key === 'market_copper_price' || payload.new.key === 'market_buy_price' || payload.new.key === 'market_sell_price')) {
            const current = getStoredMarketPrices();
            if (payload.new.key === 'market_buy_price' || payload.new.key === 'market_copper_price') {
              const buy = Number(payload.new.value) || DEFAULT_MARKET_BUY_PRICE;
              const updated: MarketPrices = { ...current, buyPrice: buy };
              setMarketPrices(updated);
              saveMarketPrices(updated);
            } else if (payload.new.key === 'market_sell_price') {
              const sell = Number(payload.new.value) || DEFAULT_MARKET_SELL_PRICE;
              const updated: MarketPrices = { ...current, sellPrice: sell };
              setMarketPrices(updated);
              saveMarketPrices(updated);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [people]);

  // Save changes to state & Supabase
  const updatePeople = async (newPeople: Person[]) => {
    setPeople(newPeople);
    savePeople(newPeople);
  };

  const updateTransactions = async (newTransactions: Transaction[], currentPeople = people) => {
    const replayed = replayAllTransactions(currentPeople, newTransactions);
    setTransactions(replayed);
    saveTransactions(replayed);
    return replayed;
  };

  const updateMarketPricesState = async (newPrices: MarketPrices) => {
    setMarketPrices(newPrices);
    saveMarketPrices(newPrices);
    setIsSyncing(true);
    await dbSaveMarketPrices(newPrices);
    setIsSyncing(false);
    showToast(`قیمت‌های مرجع مس (خرید: ${formatToman(newPrices.buyPrice)} | فروش: ${formatToman(newPrices.sellPrice)}) به‌روز شدند.`);
  };

  // Compute Summaries and Overall Stats
  const summaries: PersonWalletSummary[] = useMemo(() => {
    return people.map((p) => calculatePersonSummary(p, transactions, marketPrices.buyPrice));
  }, [people, transactions, marketPrices.buyPrice]);

  const overallStats: OverallStats = useMemo(() => {
    return calculateOverallStats(summaries, marketPrices);
  }, [summaries, marketPrices]);

  const selectedPerson = useMemo(() => {
    if (!selectedPersonId) return null;
    return people.find((p) => p.id === selectedPersonId) || null;
  }, [selectedPersonId, people]);

  const statementPerson = useMemo(() => {
    if (!statementPersonId) return null;
    return people.find((p) => p.id === statementPersonId) || null;
  }, [statementPersonId, people]);

  // --- Handlers for Person ---
  const handleOpenAddPerson = () => {
    setEditingPerson(null);
    setIsPersonFormOpen(true);
  };

  const handleOpenEditPerson = (personId: string) => {
    const p = people.find((item) => item.id === personId);
    if (p) {
      setEditingPerson(p);
      setIsPersonFormOpen(true);
    }
  };

  const handleSavePerson = async (personData: { name: string; phone?: string; notes?: string }) => {
    setIsSyncing(true);
    if (editingPerson) {
      const updatedPerson: Person = { ...editingPerson, ...personData };
      const updated = people.map((p) =>
        p.id === editingPerson.id ? updatedPerson : p
      );
      updatePeople(updated);
      await dbUpsertPerson(updatedPerson);
      showToast(`اطلاعات «${personData.name}» در سوپابیس ذخیره شد.`);
    } else {
      const newPerson: Person = {
        id: `person-${Date.now()}`,
        name: personData.name,
        phone: personData.phone,
        notes: personData.notes,
        createdAt: getTodayJalaliString(),
      };
      const updatedPeople = [newPerson, ...people];
      updatePeople(updatedPeople);
      await dbUpsertPerson(newPerson);
      showToast(`حساب کاربری جدید برای «${personData.name}» در سوپابیس ایجاد شد.`);
    }
    setIsSyncing(false);
    setEditingPerson(null);
  };

  const handleSavePersonPassword = async (personId: string, newPass: string) => {
    const cleanPass = newPass.trim();
    setIsSyncing(true);
    saveClientPassword(personId, cleanPass);
    const updatedPeople = people.map((p) => (p.id === personId ? { ...p, password: cleanPass } : p));
    setPeople(updatedPeople);
    savePeople(updatedPeople);

    const target = updatedPeople.find((p) => p.id === personId);
    if (target) {
      await dbUpsertPerson(target);
    }
    setIsSyncing(false);
    showToast('رمز عبور حساب کاربر با موفقیت بروزرسانی گردید.');
  };

  const handlePromptDeletePerson = (personId: string) => {
    const p = people.find((item) => item.id === personId);
    if (!p) return;
    const personTxs = transactions.filter((tx) => tx.personId === personId);

    let warning = undefined;
    if (personTxs.length > 0) {
      warning = `توجه: این شخص دارای ${personTxs.length} تراکنش ثبت‌شده است که با حذف شخص، تمام تاریخچه مالی آن در دیتابیس سوپابیس نیز حذف خواهد شد.`;
    }

    setDeleteConfirm({
      isOpen: true,
      type: 'person',
      id: personId,
      title: `حذف حساب «${p.name}»`,
      message: `آیا از حذف کامل حساب ${p.name} اطمینان دارید؟`,
      warningNote: warning,
    });
  };

  // Helper to sync replayed ledger of a person to Supabase
  const syncPersonLedgerToCloud = async (personId: string, updatedAllTxs: Transaction[]) => {
    setIsSyncing(true);
    const { recalculatedTransactions } = replayAndCalculatePersonLedger(personId, updatedAllTxs);
    await dbBatchUpsertTransactions(recalculatedTransactions);
    setIsSyncing(false);
  };

  // --- Handlers for Deposits & Withdrawals ---
  const handleOpenDeposit = (targetPersonId?: string) => {
    setDepositWithdrawState({
      isOpen: true,
      type: 'deposit',
      targetPersonId,
    });
  };

  const handleOpenWithdrawal = (targetPersonId?: string) => {
    setDepositWithdrawState({
      isOpen: true,
      type: 'withdrawal',
      targetPersonId,
    });
  };

  const handleSaveDepositWithdrawal = async (data: {
    personId: string;
    date: string;
    type: 'deposit' | 'withdrawal';
    amount: number;
    notes?: string;
  }) => {
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      personId: data.personId,
      date: data.date,
      type: data.type,
      amount: data.amount,
      notes: data.notes,
      createdAt: new Date().toISOString(),
    };

    const replayed = await updateTransactions([...transactions, newTx]);
    await syncPersonLedgerToCloud(data.personId, replayed);

    showToast(
      data.type === 'deposit' 
        ? `واریز مبلغ ${formatToman(data.amount)} با موفقیت در سرور ثبت شد.` 
        : `برداشت مبلغ ${formatToman(data.amount)} با موفقیت در سرور ثبت شد.`
    );
  };

  // --- Handlers for Buy Copper ---
  const handleOpenBuyCopper = (targetPersonId?: string) => {
    setBuyCopperState({
      isOpen: true,
      targetPersonId,
    });
  };

  const handleSaveBuyCopper = async (data: {
    personId: string;
    date: string;
    weightKg: number;
    pricePerKg: number;
    totalPrice: number;
    notes?: string;
    registeredBy?: string;
  }) => {
    const pSummary = summaries.find((s) => s.person.id === data.personId);
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      personId: data.personId,
      date: data.date,
      type: 'buy',
      amount: data.totalPrice,
      weightKg: data.weightKg,
      unitPrice: data.pricePerKg,
      notes: data.notes,
      approvalStatus: 'pending',
      registeredBy: data.registeredBy || 'مسئول مس',
      receiptNumber: generateReceiptNumber('buy'),
      cashBalanceBefore: pSummary?.cashBalance ?? 0,
      copperStockBefore: pSummary?.copperStockKg ?? 0,
      createdAt: new Date().toISOString(),
    };

    const replayed = await updateTransactions([...transactions, newTx]);
    await syncPersonLedgerToCloud(data.personId, replayed);
    
    // Decrease company copper stock
    const newStock = Math.max(0, companyCopperStockKg - data.weightKg);
    await handleSaveCompanyCopperStock(newStock);

    showToast(`سند خرید ${data.weightKg} کیلوگرم مس ثبت و با وضعیت «در انتظار تأیید مدیرعامل» ارسال گردید.`);
    setReceiptModalTx(newTx);
  };

  // --- Handlers for Sell Copper ---
  const handleOpenSellCopper = (targetPersonId?: string) => {
    setSellCopperState({
      isOpen: true,
      targetPersonId,
    });
  };

  const handleSaveSellCopper = async (data: {
    personId: string;
    date: string;
    weightKg: number;
    pricePerKg: number;
    totalPrice: number;
    notes?: string;
    registeredBy?: string;
    paymentMethod?: any;
    chequeNumber?: string;
    chequeDueDate?: string;
    chequeBank?: string;
  }) => {
    const pSummary = summaries.find((s) => s.person.id === data.personId);
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      personId: data.personId,
      date: data.date,
      type: 'sell',
      amount: data.totalPrice,
      weightKg: data.weightKg,
      unitPrice: data.pricePerKg,
      notes: data.notes,
      approvalStatus: 'pending',
      registeredBy: data.registeredBy || 'مسئول مس',
      receiptNumber: generateReceiptNumber('sell'),
      cashBalanceBefore: pSummary?.cashBalance ?? 0,
      copperStockBefore: pSummary?.copperStockKg ?? 0,
      paymentMethod: data.paymentMethod,
      chequeNumber: data.chequeNumber,
      chequeDueDate: data.chequeDueDate,
      chequeBank: data.chequeBank,
      chequeStatus: data.paymentMethod === 'cheque' ? 'pending' : undefined,
      createdAt: new Date().toISOString(),
    };

    const replayed = await updateTransactions([...transactions, newTx]);
    await syncPersonLedgerToCloud(data.personId, replayed);

    showToast(`حواله فروش ${data.weightKg} کیلوگرم مس ثبت و با وضعیت «در انتظار تأیید مدیرعامل» ارسال گردید.`);
    setReceiptModalTx(newTx);
  };

  // --- Handlers for Client Self-Service Requests ---
  const handleSaveClientRequest = async (data: {
    type: TransactionType;
    amount: number;
    weightKg?: number;
    unitPrice?: number;
    notes?: string;
    paymentMethod?: PaymentMethod;
    receiptImageUrl?: string;
  }) => {
    if (!authSession?.personId) return;
    const personId = authSession.personId;
    const clientPerson = people.find((p) => p.id === personId);
    const pSummary = summaries.find((s) => s.person.id === personId);
    const registeredBy = `درخواست مشتری (${clientPerson?.name || ''})`;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      personId,
      date: getTodayJalaliString(),
      type: data.type,
      amount: data.amount,
      weightKg: data.weightKg,
      unitPrice: data.unitPrice,
      notes: data.notes,
      approvalStatus: data.type === 'deposit' ? 'topup_step1_pending_bank' : 'pending',
      registeredBy,
      receiptNumber: generateReceiptNumber(data.type),
      cashBalanceBefore: pSummary?.cashBalance ?? 0,
      copperStockBefore: pSummary?.copperStockKg ?? 0,
      paymentMethod: data.paymentMethod,
      receiptImageUrl: data.receiptImageUrl,
      createdAt: new Date().toISOString(),
    };

    const replayed = await updateTransactions([...transactions, newTx]);
    await syncPersonLedgerToCloud(personId, replayed);

    // Decrease company copper stock
    if (data.type === 'buy' && data.weightKg) {
      const newStock = Math.max(0, companyCopperStockKg - data.weightKg);
      await handleSaveCompanyCopperStock(newStock);
    }

    let msg = 'درخواست شما ثبت گردید و جهت بررسی به مدیرعامل ارسال شد.';
    if (data.type === 'deposit') msg = 'درخواست شارژ حساب ثبت گردید. به زودی شماره حساب اختصاصی توسط مدیرعامل برای شما ارسال می‌شود.';
    if (data.type === 'withdrawal') msg = 'درخواست برداشت موجودی ثبت شد. پس از واریز وجه توسط مدیریت، تایید نهایی می‌شود.';
    if (data.type === 'sell') msg = 'درخواست فروش مس ثبت شد و جهت تایید به مدیرعامل ارسال گردید.';
    if (data.type === 'buy') msg = 'درخواست خرید مس با موفقیت ثبت گردید.';

    showToast(msg);
  };

  const handleAssignBankToTransaction = async (
    txId: string,
    bankDetails: CompanyBankAccount,
    note?: string,
    approverName: string = 'مدیرعامل'
  ) => {
    const targetTx = transactions.find((t) => t.id === txId);
    if (!targetTx) return;

    const updatedTxs = transactions.map((t) => {
      if (t.id === txId) {
        return {
          ...t,
          approvalStatus: 'topup_step2_awaiting_receipt' as const,
          assignedBankName: bankDetails.bankName,
          assignedOwnerName: bankDetails.ownerName,
          assignedCardNumber: bankDetails.cardNumber,
          assignedIbanNumber: bankDetails.ibanNumber,
          assignedBankNote: note || undefined,
          approvedBy: approverName,
        };
      }
      return t;
    });

    const replayed = await updateTransactions(updatedTxs);
    await syncPersonLedgerToCloud(targetTx.personId, replayed);
    showToast(`شماره حساب (${bankDetails.bankName}) جهت واریز وجه برای مشتری ارسال گردید.`);
  };

  const handleSubmitTopupReceipt = async (
    txId: string,
    receiptImageUrl: string,
    receiptNumber: string,
    notes?: string
  ) => {
    const targetTx = transactions.find((t) => t.id === txId);
    if (!targetTx) return;

    const updatedTxs = transactions.map((t) => {
      if (t.id === txId) {
        return {
          ...t,
          approvalStatus: 'topup_step3_pending_approval' as const,
          receiptImageUrl,
          receiptNumber,
          notes: notes ? `${t.notes || ''} | ${notes}` : t.notes,
        };
      }
      return t;
    });

    const replayed = await updateTransactions(updatedTxs);
    await syncPersonLedgerToCloud(targetTx.personId, replayed);
    showToast('عکس فیش و کد پیگیری با موفقیت جهت تأیید نهایی برای مدیرعامل ارسال شد.');
  };

  // --- Manager CEO Approval & Rejection Handlers ---
  const handleApproveTransaction = async (txId: string, approverName: string = 'مدیرعامل') => {
    const targetTx = transactions.find((t) => t.id === txId);
    if (!targetTx) return;

    const updatedTxs = transactions.map((t) => {
      if (t.id === txId) {
        return {
          ...t,
          approvalStatus: 'approved' as const,
          approvedBy: approverName,
          approvedAt: getPersianDateTimeString(),
          rejectionReason: undefined,
        };
      }
      return t;
    });

    const replayed = await updateTransactions(updatedTxs);
    await syncPersonLedgerToCloud(targetTx.personId, replayed);
    showToast(`معامله مس (${targetTx.type === 'buy' ? 'خرید' : 'فروش'}) توسط ${approverName} تأیید شد و اثر مالی آن اعمال گردید.`);
  };

  const handleRejectTransaction = async (txId: string, reason: string, approverName: string = 'مدیرعامل') => {
    const targetTx = transactions.find((t) => t.id === txId);
    if (!targetTx) return;

    const updatedTxs = transactions.map((t) => {
      if (t.id === txId) {
        return {
          ...t,
          approvalStatus: 'rejected' as const,
          approvedBy: approverName,
          approvedAt: getPersianDateTimeString(),
          rejectionReason: reason,
        };
      }
      return t;
    });

    const replayed = await updateTransactions(updatedTxs);
    await syncPersonLedgerToCloud(targetTx.personId, replayed);

    // Restore company copper stock if previous status wasn't rejected
    if (targetTx.type === 'buy' && targetTx.weightKg && targetTx.approvalStatus !== 'rejected') {
      const newStock = companyCopperStockKg + targetTx.weightKg;
      await handleSaveCompanyCopperStock(newStock);
    }

    showToast(`معامله مس رد شد و تأثیری در موجودی نخواهد داشت.`);
  };

  const handleBulkApprove = async (txIds: string[], approverName: string = 'مدیرعامل') => {
    if (txIds.length === 0) return;

    const updatedTxs = transactions.map((t) => {
      if (txIds.includes(t.id)) {
        return {
          ...t,
          approvalStatus: 'approved' as const,
          approvedBy: approverName,
          approvedAt: getPersianDateTimeString(),
          rejectionReason: undefined,
        };
      }
      return t;
    });

    const replayed = await updateTransactions(updatedTxs);
    const affectedPersonIds: string[] = Array.from(
      new Set(transactions.filter((t) => txIds.includes(t.id)).map((t) => t.personId))
    );
    for (const pId of affectedPersonIds) {
      await syncPersonLedgerToCloud(pId, replayed);
    }
    showToast(`تعداد ${txIds.length} معامله مس به صورت یکجا تأیید شدند.`);
  };

  // --- Handlers for Adjustment ---
  const handleOpenAdjustment = (targetPersonId?: string) => {
    setAdjustmentState({
      isOpen: true,
      targetPersonId,
    });
  };

  const handleSaveAdjustment = async (data: {
    personId: string;
    date: string;
    amount: number;
    weightKg: number;
    notes: string;
  }) => {
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      personId: data.personId,
      date: data.date,
      type: 'adjustment',
      amount: data.amount,
      weightKg: data.weightKg,
      notes: data.notes,
      createdAt: new Date().toISOString(),
    };

    const replayed = await updateTransactions([...transactions, newTx]);
    await syncPersonLedgerToCloud(data.personId, replayed);

    showToast('سند اصلاح حساب و تعدیل موجودی در سرور ثبت شد.');
  };

  // --- Handlers for Transaction Edit & Delete ---
  const handleOpenEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
  };

  const handleSaveEditedTransaction = async (updatedTx: Transaction) => {
    const oldTx = transactions.find((t) => t.id === updatedTx.id);
    const updated = transactions.map((t) => (t.id === updatedTx.id ? updatedTx : t));
    const replayed = await updateTransactions(updated);
    await syncPersonLedgerToCloud(updatedTx.personId, replayed);

    // Adjust company copper stock if the weight of a buy transaction was modified
    if (oldTx && oldTx.type === 'buy' && oldTx.approvalStatus !== 'rejected') {
      const oldWeight = oldTx.weightKg || 0;
      const newWeight = (updatedTx.type === 'buy' && updatedTx.approvalStatus !== 'rejected') ? (updatedTx.weightKg || 0) : 0;
      const diff = newWeight - oldWeight;
      if (diff !== 0) {
        const newStock = Math.max(0, companyCopperStockKg - diff);
        await handleSaveCompanyCopperStock(newStock);
      }
    } else if (updatedTx.type === 'buy' && updatedTx.approvalStatus !== 'rejected' && (!oldTx || oldTx.type !== 'buy' || oldTx.approvalStatus === 'rejected')) {
      // If it transitioned into a valid buy transaction
      const newStock = Math.max(0, companyCopperStockKg - (updatedTx.weightKg || 0));
      await handleSaveCompanyCopperStock(newStock);
    }

    setEditingTransaction(null);
    showToast('سند با موفقیت ویرایش شد و در پایگاه‌داده همگام گردید.');
  };

  const handlePromptDeleteTransaction = (txId: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'transaction',
      id: txId,
      title: 'حذف تراکنش از دفتر کل',
      message: 'آیا از حذف این سند حسابداری اطمینان دارید؟ تمام مانده‌های بعد از آن باز محاسبه و در دیتابیس ابری به‌روز خواهند شد.',
    });
  };

  // --- Confirm Delete Execution ---
  const handleExecuteDelete = async () => {
    const { type, id } = deleteConfirm;
    setIsSyncing(true);
    if (type === 'person') {
      const updatedPeople = people.filter((p) => p.id !== id);
      const updatedTxs = transactions.filter((t) => t.personId !== id);
      updatePeople(updatedPeople);
      updateTransactions(updatedTxs, updatedPeople);
      await dbDeletePerson(id);
      if (selectedPersonId === id) setSelectedPersonId(null);
      showToast('حساب فرد و سوابق آن با موفقیت از سرور حذف شد.');
    } else if (type === 'transaction') {
      const targetTx = transactions.find((t) => t.id === id);
      const personId = targetTx?.personId;
      const updatedTxs = transactions.filter((t) => t.id !== id);
      const replayed = await updateTransactions(updatedTxs);
      await dbDeleteTransaction(id);
      
      // Restore company copper stock if previous status wasn't rejected and type is buy
      if (targetTx && targetTx.type === 'buy' && targetTx.weightKg && targetTx.approvalStatus !== 'rejected') {
        const newStock = companyCopperStockKg + targetTx.weightKg;
        await handleSaveCompanyCopperStock(newStock);
      }

      if (personId) {
        await syncPersonLedgerToCloud(personId, replayed);
      }
      showToast('سند با موفقیت از سرور حذف شد.');
    }
    setIsSyncing(false);
  };

  // --- Factory Reset ---
  const handleFactoryReset = async () => {
    if (authSession?.role !== 'admin') {
      showToast('حذف کلی داده‌ها فقط توسط مدیرعامل امکان‌پذیر است.', 'error');
      return;
    }
    setIsSyncing(true);
    clearAllData();
    // Reset company copper stock and save
    setCompanyCopperStockKg(0);
    saveStoredCompanyCopperStock(0);
    // Keeps the people (customers) state intact as requested, only resetting transactions
    setTransactions([]);
    setMarketPrices({
      buyPrice: DEFAULT_MARKET_BUY_PRICE,
      sellPrice: DEFAULT_MARKET_SELL_PRICE,
    });
    setSelectedPersonId(null);

    // Wipe all rows from Cloud except people
    await dbClearAllCloudData();

    setIsSyncing(false);
    setIsFactoryResetModalOpen(false);
    showToast('تمامی تراکنش‌ها، خرید و فروش‌ها و موجودی‌ها صفر شدند، اما مشخصات و حساب مشتریان به طور کامل حفظ گردیدند.');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('waateh_auth_token');
    sessionStorage.removeItem('waateh_auth_session');
    localStorage.removeItem('waateh_auth_token');
    localStorage.removeItem('waateh_auth_session');
    setAuthSession(null);
    setIsAuthenticated(false);
    setActiveView('dashboard');
  };

  const handleLoginSuccess = (session?: AuthSession) => {
    if (session) {
      setAuthSession(session);
    } else {
      const raw = sessionStorage.getItem('waateh_auth_session');
      if (raw) {
        try {
          setAuthSession(JSON.parse(raw));
        } catch (e) {}
      }
    }
    setIsAuthenticated(true);
  };

  const handleSaveClientPassword = async (personId: string, newPass: string) => {
    return handleSavePersonPassword(personId, newPass);
  };

  if (!isAuthenticated) {
    return <LoginScreen people={people} onLoginSuccess={handleLoginSuccess} />;
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-600">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-3 border-stone-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-stone-800">در حال بارگذاری داده‌های سامانه معاملات واته...</p>
          <p className="text-xs text-stone-500">همگام‌سازی اطلاعات حساب‌ها و انبار مس</p>
        </div>
      </div>
    );
  }

  // --- CLIENT ROLE PORTAL VIEW ---
  if (authSession?.role === 'client' && authSession.personId) {
    const clientPerson = people.find((p) => p.id === authSession.personId);
    const clientSummary = summaries.find((s) => s.person.id === authSession.personId);

    if (clientPerson && clientSummary) {
      return (
        <>
          <ClientPortalView
            person={clientPerson}
            summary={clientSummary}
            transactions={transactions}
            marketPrices={marketPrices}
            companyCopperStockKg={companyCopperStockKg}
            companyBankInfo={companyBankInfo}
            onChangePassword={() => setIsChangePassModalOpen(true)}
            onOpenStatement={() => setStatementPersonId(clientPerson.id)}
            onViewReceipt={(tx) => setReceiptModalTx(tx)}
            onSubmitRequest={handleSaveClientRequest}
            onSubmitTopupReceipt={handleSubmitTopupReceipt}
            onLogout={handleLogout}
            onOpenCopperChart={() => setActiveView(activeView === 'copper-chart' ? 'dashboard' : 'copper-chart')}
            onOpenAiAnalysis={() => setActiveView(activeView === 'ai-analysis' ? 'dashboard' : 'ai-analysis')}
            activeView={activeView}
          />

          {/* Client Statement / Cardex Modal */}
          {statementPersonId && (
            <AccountStatementModal
              isOpen={!!statementPersonId}
              onClose={() => setStatementPersonId(null)}
              person={clientPerson}
              transactions={transactions}
              marketCopperPrice={marketPrices.buyPrice}
            />
          )}

          {/* Client Transaction Receipt Modal */}
          {receiptModalTx && (
            <TransactionReceiptModal
              isOpen={!!receiptModalTx}
              onClose={() => setReceiptModalTx(null)}
              transaction={receiptModalTx}
              person={clientPerson}
            />
          )}

          {/* Change Password Modal */}
          {isChangePassModalOpen && (
            <ChangePasswordModal
              role="client"
              person={clientPerson}
              onClose={() => setIsChangePassModalOpen(false)}
              onSavePassword={(personId, newPass) => {
                handleSavePersonPassword(personId, newPass);
              }}
            />
          )}

          {/* Toast Notification Alert */}
          {toast && (
            <div className="fixed bottom-5 left-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
              <div className="bg-stone-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-sm border border-stone-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{toast.message}</span>
              </div>
            </div>
          )}
        </>
      );
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col selection:bg-stone-800 selection:text-white">
      
      {/* Top Header */}
      <Header
        onAddPerson={handleOpenAddPerson}
        onAddDeposit={() => handleOpenDeposit()}
        onAddWithdrawal={() => handleOpenWithdrawal()}
        onAddPurchase={() => handleOpenBuyCopper()}
        onAddSale={() => handleOpenSellCopper()}
        onOpenMarketPrice={() => setIsMarketPriceOpen(true)}
        onOpenCopperChart={() => setActiveView(activeView === 'copper-chart' ? 'dashboard' : 'copper-chart')}
        onOpenAiAnalysis={() => setActiveView(activeView === 'ai-analysis' ? 'dashboard' : 'ai-analysis')}
        activeView={activeView}
        onOpenFactoryReset={() => setIsFactoryResetModalOpen(true)}
        onOpenApprovalsModal={() => setIsApprovalsModalOpen(true)}
        pendingApprovalsCount={overallStats.pendingApprovalsCount || 0}
        onOpenBankModal={() => setIsCompanyBankModalOpen(true)}
        onChangePassword={() => setIsChangePassModalOpen(true)}
        onLogout={handleLogout}
        totalStockKg={overallStats.totalCopperStockKg}
        companyCopperStockKg={companyCopperStockKg}
        totalCash={overallStats.totalCashBalance}
        marketPrice={marketPrices.buyPrice}
        marketBuyPrice={marketPrices.buyPrice}
        marketSellPrice={marketPrices.sellPrice}
        isCloudConnected={isCloudConnected}
        isSyncing={isSyncing}
        userRole={authSession?.role || 'admin'}
        currentUsername={authSession?.username}
        onOpenEditCompanyStock={() => setIsCompanyCopperStockModalOpen(true)}
        isPersonSelected={!!selectedPersonId}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-3 flex-1 w-full space-y-3">
        
        {activeView === 'copper-chart' ? (
          <CopperChartView onBack={() => setActiveView('dashboard')} userRole={authSession?.role || 'admin'} />
        ) : activeView === 'ai-analysis' ? (
          <AiAnalysisView
            onBack={() => setActiveView('dashboard')}
            overallStats={overallStats}
            peopleCount={people.length}
            activeStockPeople={summaries.filter((s) => s.copperStockKg > 0).length}
            companyStock={companyCopperStockKg}
            livePrices={null}
          />
        ) : (
          <>
            {/* Statistical Asset Cards */}
            <StatCards 
              stats={overallStats} 
              userRole={authSession?.role || 'admin'}
              onOpenMarketPrice={() => setIsMarketPriceOpen(true)} 
              onOpenApprovals={authSession?.role === 'admin' ? () => setIsApprovalsModalOpen(true) : undefined}
            />

            {/* Primary People and Copper Wallets Table */}
            <PeopleTable
              summaries={summaries}
              onSelectPerson={(personId) => setSelectedPersonId(personId)}
              onEditPerson={handleOpenEditPerson}
              onDeletePerson={handlePromptDeletePerson}
              onAddDeposit={(personId) => handleOpenDeposit(personId)}
              onAddWithdrawal={(personId) => handleOpenWithdrawal(personId)}
              onAddPurchase={(personId) => handleOpenBuyCopper(personId)}
              onAddSale={(personId) => handleOpenSellCopper(personId)}
              onAddNewPerson={handleOpenAddPerson}
              onOpenStatement={(personId) => setStatementPersonId(personId)}
            />
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-4 text-center text-xs text-stone-500 no-print mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-stone-800">سامانه معاملات مس واته (Waateh)</span>
            <span className="text-stone-300">•</span>
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              سامانه متصل و فعال
            </span>
          </div>
          <div className="text-stone-400">
            محاسبه خودکار ارزش دارایی، کاردکس انبار و ثبت لحظه‌ای
          </div>
        </div>
      </footer>

      {/* Person Detail / Ledger Modal */}
      {selectedPerson && (
        <PersonDetailModal
          isOpen={!!selectedPersonId}
          onClose={() => setSelectedPersonId(null)}
          person={selectedPerson}
          transactions={transactions}
          marketCopperPrice={marketPrices.buyPrice}
          onAddDeposit={(personId) => handleOpenDeposit(personId)}
          onAddWithdrawal={(personId) => handleOpenWithdrawal(personId)}
          onAddPurchase={(personId) => handleOpenBuyCopper(personId)}
          onAddSale={(personId) => handleOpenSellCopper(personId)}
          onAddAdjustment={(personId) => handleOpenAdjustment(personId)}
          onEditTransaction={handleOpenEditTransaction}
          onDeleteTransaction={handlePromptDeleteTransaction}
          onEditPerson={handleOpenEditPerson}
          onOpenStatement={(personId) => setStatementPersonId(personId)}
          onViewReceipt={(tx) => setReceiptModalTx(tx)}
        />
      )}

      {/* Official Account Statement & PDF Modal */}
      {statementPerson && (
        <AccountStatementModal
          isOpen={!!statementPersonId}
          onClose={() => setStatementPersonId(null)}
          person={statementPerson}
          transactions={transactions}
          marketCopperPrice={marketPrices.buyPrice}
        />
      )}

      {/* CEO Approvals Management Modal */}
      <PendingApprovalsModal
        isOpen={isApprovalsModalOpen}
        onClose={() => setIsApprovalsModalOpen(false)}
        transactions={transactions}
        people={people}
        userRole={authSession?.role || 'admin'}
        onApprove={handleApproveTransaction}
        onReject={handleRejectTransaction}
        onBulkApprove={handleBulkApprove}
        onViewReceipt={(tx) => setReceiptModalTx(tx)}
        onAssignBank={handleAssignBankToTransaction}
      />

      {/* Official Transaction Receipt Modal */}
      <TransactionReceiptModal
        isOpen={!!receiptModalTx}
        onClose={() => setReceiptModalTx(null)}
        transaction={receiptModalTx}
        person={receiptModalTx ? people.find((p) => p.id === receiptModalTx.personId) || null : null}
      />

      {/* Add / Edit Person Modal */}
      <PersonFormModal
        isOpen={isPersonFormOpen}
        onClose={() => setIsPersonFormOpen(false)}
        onSave={handleSavePerson}
        initialPerson={editingPerson}
      />

      {/* Deposit / Withdraw Modal */}
      <DepositWithdrawModal
        isOpen={depositWithdrawState.isOpen}
        onClose={() => setDepositWithdrawState((prev) => ({ ...prev, isOpen: false }))}
        type={depositWithdrawState.type}
        onSave={handleSaveDepositWithdrawal}
        people={people}
        summaries={summaries}
        selectedPersonId={depositWithdrawState.targetPersonId}
      />

      {/* Buy Copper Modal */}
      <BuyCopperModal
        isOpen={buyCopperState.isOpen}
        onClose={() => setBuyCopperState((prev) => ({ ...prev, isOpen: false }))}
        onSave={handleSaveBuyCopper}
        people={people}
        summaries={summaries}
        selectedPersonId={buyCopperState.targetPersonId}
        defaultPricePerKg={marketPrices.buyPrice}
        onOpenDepositForPerson={(pId) => handleOpenDeposit(pId)}
      />

      {/* Sell Copper Modal */}
      <SellCopperModal
        isOpen={sellCopperState.isOpen}
        onClose={() => setSellCopperState((prev) => ({ ...prev, isOpen: false }))}
        onSave={handleSaveSellCopper}
        people={people}
        summaries={summaries}
        selectedPersonId={sellCopperState.targetPersonId}
        defaultPricePerKg={marketPrices.sellPrice}
      />

      {/* Adjustment Modal */}
      <AdjustmentModal
        isOpen={adjustmentState.isOpen}
        onClose={() => setAdjustmentState((prev) => ({ ...prev, isOpen: false }))}
        onSave={handleSaveAdjustment}
        people={people}
        summaries={summaries}
        selectedPersonId={adjustmentState.targetPersonId}
      />

      {/* Market Reference Price Modal */}
      <MarketPriceModal
        isOpen={isMarketPriceOpen}
        onClose={() => setIsMarketPriceOpen(false)}
        currentPrices={marketPrices}
        onSave={updateMarketPricesState}
      />

      {/* Transaction Edit Modal */}
      <TransactionEditModal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        transaction={editingTransaction}
        people={people}
        onSave={handleSaveEditedTransaction}
      />

      {/* Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        warningNote={deleteConfirm.warningNote}
        onClose={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleExecuteDelete}
      />

      {/* Factory Reset Modal (CEO / Manager Only) */}
      <FactoryResetModal
        isOpen={isFactoryResetModalOpen}
        onClose={() => setIsFactoryResetModalOpen(false)}
        onConfirmReset={handleFactoryReset}
        userRole={authSession?.role || 'admin'}
      />

      {/* Change Password Modal for CEO / Client */}
      {isChangePassModalOpen && (
        <ChangePasswordModal
          role={authSession?.role || 'admin'}
          person={authSession?.role === 'client' && authSession.personId ? people.find((p) => p.id === authSession.personId) || null : null}
          onClose={() => setIsChangePassModalOpen(false)}
          onSaveAdminPassword={(newPass) => {
            saveAdminPassword(newPass);
            showToast('رمز عبور مدیرعامل با موفقیت بروزرسانی شد.');
          }}
          onSavePassword={(personId, newPass) => {
            handleSavePersonPassword(personId, newPass);
          }}
        />
      )}

      {/* Company Bank Credentials Modal */}
      <CompanyBankModal
        isOpen={isCompanyBankModalOpen}
        onClose={() => setIsCompanyBankModalOpen(false)}
        bankInfo={companyBankInfo}
        initialInfo={companyBankInfo}
        onSave={(updated) => {
          setCompanyBankInfo(updated);
          saveCompanyBankInfo(updated);
          showToast('اطلاعات کارت و شماره شبای شرکت بروزرسانی شد.');
        }}
      />

      {/* Company Copper Stock Modal */}
      <CompanyCopperStockModal
        isOpen={isCompanyCopperStockModalOpen}
        onClose={() => setIsCompanyCopperStockModalOpen(false)}
        currentStockKg={companyCopperStockKg}
        marketPrices={marketPrices}
        onSaveStockKg={handleSaveCompanyCopperStock}
      />

      {/* Floating Support Chat Widget */}
      <SupportChatWidget authSession={authSession} people={people} />

      {/* Toast Notification Alert */}
      {toast && (
        <div className="fixed bottom-5 left-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="bg-stone-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-sm border border-stone-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

    </div>
  );
}
