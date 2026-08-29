/**
 * Copper Pipe Accounting & Dual-Asset Wallet Management WebApp
 * سیستم جامع مدیریت کیف پول، معاملات مس و انبار
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Person, Transaction, PersonWalletSummary, OverallStats } from './types';
import { 
  getStoredPeople, 
  getStoredTransactions, 
  getStoredMarketPrice,
  savePeople, 
  saveTransactions, 
  saveMarketPrice,
  calculatePersonSummary, 
  calculateOverallStats,
  replayAllTransactions,
  replayAndCalculatePersonLedger,
  resetToSampleData,
  DEFAULT_MARKET_COPPER_PRICE
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
import { DataBackupModal } from './components/DataBackupModal';
import { CheckCircle2, AlertTriangle, Cloud, CloudOff } from 'lucide-react';
import { getTodayJalaliString } from './utils/persianDate';
import { formatToman } from './utils/formatters';

export default function App() {
  // Core State
  const [people, setPeople] = useState<Person[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [marketPrice, setMarketPrice] = useState<number>(DEFAULT_MARKET_COPPER_PRICE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Selected Person for Detail / Ledger Modal
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

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

  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

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
          
          // If Supabase table is empty on first run, seed it with sample data
          if (cloudResult.people.length === 0) {
            const localPeople = getStoredPeople();
            const localTransactions = getStoredTransactions();
            const localPrice = getStoredMarketPrice();
            
            await seedSupabaseIfEmpty(localPeople, localTransactions, localPrice);
            
            // Replay and set
            const replayed = replayAllTransactions(localPeople, localTransactions);
            setPeople(localPeople);
            setTransactions(replayed);
            setMarketPrice(localPrice);
            savePeople(localPeople);
            saveTransactions(replayed);
            saveMarketPrice(localPrice);
            showToast('داده‌های اولیه در پایگاه‌داده Supabase با موفقیت ثبت شدند.', 'info');
          } else {
            // Load live data from Supabase
            const replayed = replayAllTransactions(cloudResult.people, cloudResult.transactions);
            setPeople(cloudResult.people);
            setTransactions(replayed);
            setMarketPrice(cloudResult.marketPrice);
            savePeople(cloudResult.people);
            saveTransactions(replayed);
            saveMarketPrice(cloudResult.marketPrice);
          }
        } else {
          // Cloud connection issue, fallback to local storage
          setIsCloudConnected(false);
          const storedPeople = getStoredPeople();
          const storedTransactions = getStoredTransactions();
          const storedPrice = getStoredMarketPrice();
          const replayed = replayAllTransactions(storedPeople, storedTransactions);

          setPeople(storedPeople);
          setTransactions(replayed);
          setMarketPrice(storedPrice);
          showToast('اتصال به سرور برقرار نشد، داده‌ها از حافظه محلی فراخوانی شدند.', 'info');
        }
      } catch (err) {
        console.error('Error during initial load:', err);
        setIsCloudConnected(false);
        const storedPeople = getStoredPeople();
        const storedTransactions = getStoredTransactions();
        const storedPrice = getStoredMarketPrice();
        const replayed = replayAllTransactions(storedPeople, storedTransactions);

        setPeople(storedPeople);
        setTransactions(replayed);
        setMarketPrice(storedPrice);
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
            const mapped = data.map((r: any) => ({
              id: r.id,
              personId: r.person_id,
              date: r.date,
              type: r.type as Transaction['type'],
              amount: Number(r.amount) || 0,
              weightKg: r.weight_kg !== null ? Number(r.weight_kg) : undefined,
              unitPrice: r.unit_price !== null ? Number(r.unit_price) : undefined,
              cogs: r.cogs !== null ? Number(r.cogs) : undefined,
              profit: r.profit !== null ? Number(r.profit) : undefined,
              profitPercentage: r.profit_percentage !== null ? Number(r.profit_percentage) : undefined,
              cashBalanceAfter: r.cash_balance_after !== null ? Number(r.cash_balance_after) : undefined,
              copperStockAfter: r.copper_stock_after !== null ? Number(r.copper_stock_after) : undefined,
              notes: r.notes || undefined,
              createdAt: r.created_at,
            }));
            setTransactions((prevTxs) => {
              const replayed = replayAllTransactions(people, mapped);
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
          if (payload.new && payload.new.key === 'market_copper_price') {
            const newP = Number(payload.new.value) || DEFAULT_MARKET_COPPER_PRICE;
            setMarketPrice(newP);
            saveMarketPrice(newP);
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

  const updateMarketPriceState = async (newPrice: number) => {
    setMarketPrice(newPrice);
    saveMarketPrice(newPrice);
    setIsSyncing(true);
    await dbSaveMarketPrice(newPrice);
    setIsSyncing(false);
    showToast(`قیمت مرجع مس به ${formatToman(newPrice)} برای هر کیلو در سرور به‌روز شد.`);
  };

  // Compute Summaries and Overall Stats
  const summaries: PersonWalletSummary[] = useMemo(() => {
    return people.map((p) => calculatePersonSummary(p, transactions, marketPrice));
  }, [people, transactions, marketPrice]);

  const overallStats: OverallStats = useMemo(() => {
    return calculateOverallStats(summaries, marketPrice);
  }, [summaries, marketPrice]);

  const selectedPerson = useMemo(() => {
    if (!selectedPersonId) return null;
    return people.find((p) => p.id === selectedPersonId) || null;
  }, [selectedPersonId, people]);

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
  }) => {
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      personId: data.personId,
      date: data.date,
      type: 'buy',
      amount: data.totalPrice,
      weightKg: data.weightKg,
      unitPrice: data.pricePerKg,
      notes: data.notes,
      createdAt: new Date().toISOString(),
    };

    const replayed = await updateTransactions([...transactions, newTx]);
    await syncPersonLedgerToCloud(data.personId, replayed);

    showToast(`خرید ${data.weightKg} کیلوگرم مس به ارزش ${formatToman(data.totalPrice)} در سرور ثبت شد.`);
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
  }) => {
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      personId: data.personId,
      date: data.date,
      type: 'sell',
      amount: data.totalPrice,
      weightKg: data.weightKg,
      unitPrice: data.pricePerKg,
      notes: data.notes,
      createdAt: new Date().toISOString(),
    };

    const replayed = await updateTransactions([...transactions, newTx]);
    await syncPersonLedgerToCloud(data.personId, replayed);

    showToast(`فروش ${data.weightKg} کیلوگرم مس به ارزش ${formatToman(data.totalPrice)} در سرور ثبت شد.`);
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
    const updated = transactions.map((t) => (t.id === updatedTx.id ? updatedTx : t));
    const replayed = await updateTransactions(updated);
    await syncPersonLedgerToCloud(updatedTx.personId, replayed);
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
      if (personId) {
        await syncPersonLedgerToCloud(personId, replayed);
      }
      showToast('سند با موفقیت از سرور حذف شد.');
    }
    setIsSyncing(false);
  };

  // --- Restore / Reset ---
  const handleRestoreData = async (newPeople: Person[], newTransactions: Transaction[], newMarketPrice?: number) => {
    setIsSyncing(true);
    updatePeople(newPeople);
    if (newMarketPrice) {
      setMarketPrice(newMarketPrice);
      saveMarketPrice(newMarketPrice);
      await dbSaveMarketPrice(newMarketPrice);
    }
    const replayed = await updateTransactions(newTransactions, newPeople);
    for (const p of newPeople) {
      await dbUpsertPerson(p);
    }
    await dbBatchUpsertTransactions(replayed);
    setIsSyncing(false);
    setIsDataModalOpen(false);
    showToast('اطلاعات پشتیبان با موفقیت در دیتابیس Supabase بازیابی شد.');
  };

  const handleResetToSample = async () => {
    setIsSyncing(true);
    const sample = resetToSampleData();
    setPeople(sample.people);
    setTransactions(sample.transactions);
    setMarketPrice(sample.marketPrice);

    // Sync sample to cloud
    for (const p of sample.people) {
      await dbUpsertPerson(p);
    }
    await dbBatchUpsertTransactions(sample.transactions);
    await dbSaveMarketPrice(sample.marketPrice);

    setIsSyncing(false);
    setIsDataModalOpen(false);
    showToast('داده‌های نمونه اولیه در دیتابیس Supabase بازنشانی شدند.');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-600">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-3 border-amber-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-stone-800">در حال اتصال به پایگاه‌داده Supabase...</p>
          <p className="text-xs text-stone-500">همگام‌سازی جداول افراد، تراکنش‌ها و انبار مس</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col selection:bg-amber-700 selection:text-white">
      
      {/* Top Header */}
      <Header
        onAddPerson={handleOpenAddPerson}
        onAddDeposit={() => handleOpenDeposit()}
        onAddWithdrawal={() => handleOpenWithdrawal()}
        onAddPurchase={() => handleOpenBuyCopper()}
        onAddSale={() => handleOpenSellCopper()}
        onOpenMarketPrice={() => setIsMarketPriceOpen(true)}
        onOpenDataModal={() => setIsDataModalOpen(true)}
        totalStockKg={overallStats.totalCopperStockKg}
        totalCash={overallStats.totalCashBalance}
        marketPrice={marketPrice}
        isCloudConnected={isCloudConnected}
        isSyncing={isSyncing}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        
        {/* Statistical Asset Cards */}
        <StatCards 
          stats={overallStats} 
          onOpenMarketPrice={() => setIsMarketPriceOpen(true)} 
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
        />

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-4 text-center text-xs text-stone-500 no-print mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-stone-700">سامانه حسابداری و کیف پول معاملات مس</span>
            <span className="text-stone-300">•</span>
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              متصل به پایگاه داده ابری Supabase
            </span>
          </div>
          <div className="text-stone-400">
            محاسبه خودکار ارزش دارایی، کاردکس انبار و ثبت لحظه‌ای در جداول دیتابیس
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
          marketCopperPrice={marketPrice}
          onAddDeposit={(personId) => handleOpenDeposit(personId)}
          onAddWithdrawal={(personId) => handleOpenWithdrawal(personId)}
          onAddPurchase={(personId) => handleOpenBuyCopper(personId)}
          onAddSale={(personId) => handleOpenSellCopper(personId)}
          onAddAdjustment={(personId) => handleOpenAdjustment(personId)}
          onEditTransaction={handleOpenEditTransaction}
          onDeleteTransaction={handlePromptDeleteTransaction}
          onEditPerson={handleOpenEditPerson}
        />
      )}

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
        currentPrice={marketPrice}
        onSave={updateMarketPriceState}
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

      {/* Backup & Export Modal */}
      <DataBackupModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        people={people}
        transactions={transactions}
        marketPrice={marketPrice}
        summaries={summaries}
        onRestoreData={handleRestoreData}
        onResetToSample={handleResetToSample}
      />

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
