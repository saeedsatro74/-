import { createClient } from '@supabase/supabase-js';
import { Person, Transaction, MarketPrices } from '../types';
import { DEFAULT_MARKET_BUY_PRICE, DEFAULT_MARKET_SELL_PRICE, DEFAULT_MARKET_COPPER_PRICE, getClientPassword } from '../utils/storage';

// Supabase URL & Public Anon Key
export const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 'https://zgymtzwgygycheuwoimu.supabase.co';

export const SUPABASE_ANON_KEY = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_LMZ6TJDapqRKtP4l4muCCw_K67Qa01W';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Data mapping: Database Row <-> Application Model

export interface PersonRow {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  password?: string | null;
  created_at: string;
}

export interface TransactionRow {
  id: string;
  person_id: string;
  date: string;
  type: string;
  amount: number;
  weight_kg: number | null;
  unit_price: number | null;
  cogs: number | null;
  profit: number | null;
  profit_percentage: number | null;
  cash_balance_before?: number | null;
  cash_balance_after: number | null;
  copper_stock_before?: number | null;
  copper_stock_after: number | null;
  notes: string | null;
  created_at: string;
  // CEO Approval Fields
  approval_status?: string | null;
  registered_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  receipt_number?: string | null;
  // Cheque & Topup Fields
  payment_method?: string | null;
  cheque_number?: string | null;
  cheque_due_date?: string | null;
  cheque_bank?: string | null;
  cheque_status?: string | null;
  cheque_cleared_date?: string | null;
  receipt_image_url?: string | null;
  assigned_bank_account_id?: string | null;
  admin_bank_note?: string | null;
  assigned_bank_name?: string | null;
  assigned_owner_name?: string | null;
  assigned_card_number?: string | null;
  assigned_iban_number?: string | null;
  sale_category?: string | null;
}

export interface AppSettingRow {
  key: string;
  value: number;
}

export function toPerson(row: PersonRow): Person {
  const storedPass = row.password || getClientPassword(row.id);
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    password: storedPass || undefined,
  };
}

export function toPersonRow(p: Person): PersonRow {
  return {
    id: p.id,
    name: p.name,
    phone: p.phone || null,
    notes: p.notes || null,
    password: p.password || getClientPassword(p.id) || null,
    created_at: p.createdAt || new Date().toISOString(),
  };
}

export function buildNotesWithMetadata(tx: Transaction): string | null {
  const metadata: Record<string, any> = {
    approvalStatus: tx.approvalStatus,
    registeredBy: tx.registeredBy,
    approvedBy: tx.approvedBy,
    approvedAt: tx.approvedAt,
    rejectionReason: tx.rejectionReason,
    receiptNumber: tx.receiptNumber,
    paymentMethod: tx.paymentMethod,
    chequeNumber: tx.chequeNumber,
    chequeDueDate: tx.chequeDueDate,
    chequeBank: tx.chequeBank,
    chequeStatus: tx.chequeStatus,
    chequeClearedDate: tx.chequeClearedDate,
    receiptImageUrl: tx.receiptImageUrl,
    assignedBankName: tx.assignedBankName,
    assignedOwnerName: tx.assignedOwnerName,
    assignedCardNumber: tx.assignedCardNumber,
    assignedIbanNumber: tx.assignedIbanNumber,
    assignedBankNote: tx.assignedBankNote,
    assignedAccountId: (tx as any).assignedAccountId,
    saleCategory: tx.saleCategory,
  };

  // Filter out undefined/null values to keep string short
  const cleanMetadata: Record<string, any> = {};
  for (const k in metadata) {
    if (metadata[k] !== undefined && metadata[k] !== null) {
      cleanMetadata[k] = metadata[k];
    }
  }

  const userNotes = tx.notes || '';
  if (Object.keys(cleanMetadata).length > 0) {
    return `${userNotes} |||__METADATA__||| ${JSON.stringify(cleanMetadata)}`;
  }
  return userNotes || null;
}

export function toTransaction(row: TransactionRow): Transaction {
  let notes = row.notes || undefined;
  let metadata: Record<string, any> = {};

  if (row.notes && row.notes.includes('|||__METADATA__|||')) {
    const parts = row.notes.split('|||__METADATA__|||');
    notes = parts[0].trim() || undefined;
    try {
      metadata = JSON.parse(parts[1]);
    } catch (e) {
      console.error('Failed to parse transaction metadata:', e);
    }
  }

  // Fallback to reading columns if metadata doesn't have the key, keeping it backward compatible
  const approvalStatus = metadata.approvalStatus || row.approval_status || 'approved';
  const registeredBy = metadata.registeredBy || row.registered_by || undefined;
  const approvedBy = metadata.approvedBy || row.approved_by || undefined;
  const approvedAt = metadata.approvedAt || row.approved_at || undefined;
  const rejectionReason = metadata.rejectionReason || row.rejection_reason || undefined;
  const receiptNumber = metadata.receiptNumber || row.receipt_number || undefined;
  const paymentMethod = metadata.paymentMethod || row.payment_method || undefined;
  const chequeNumber = metadata.chequeNumber || row.cheque_number || undefined;
  const chequeDueDate = metadata.chequeDueDate || row.cheque_due_date || undefined;
  const chequeBank = metadata.chequeBank || row.cheque_bank || undefined;
  const chequeStatus = metadata.chequeStatus || row.cheque_status || undefined;
  const chequeClearedDate = metadata.chequeClearedDate || row.cheque_cleared_date || undefined;
  const receiptImageUrl = metadata.receiptImageUrl || row.receipt_image_url || undefined;
  const assignedBankName = metadata.assignedBankName || (row as any).assigned_bank_name || undefined;
  const assignedOwnerName = metadata.assignedOwnerName || (row as any).assigned_owner_name || undefined;
  const assignedCardNumber = metadata.assignedCardNumber || (row as any).assigned_card_number || undefined;
  const assignedIbanNumber = metadata.assignedIbanNumber || (row as any).assigned_iban_number || undefined;
  const assignedBankNote = metadata.assignedBankNote || row.admin_bank_note || undefined;
  const assignedAccountId = metadata.assignedAccountId || (row as any).assigned_bank_account_id || undefined;
  const saleCategory = metadata.saleCategory || row.sale_category || undefined;

  const tx: Transaction = {
    id: row.id,
    personId: row.person_id,
    date: row.date,
    type: row.type as Transaction['type'],
    amount: Number(row.amount) || 0,
    weightKg: row.weight_kg !== null ? Number(row.weight_kg) : undefined,
    unitPrice: row.unit_price !== null ? Number(row.unit_price) : undefined,
    cogs: row.cogs !== null ? Number(row.cogs) : undefined,
    profit: row.profit !== null ? Number(row.profit) : undefined,
    profitPercentage: row.profit_percentage !== null ? Number(row.profit_percentage) : undefined,
    cashBalanceBefore: row.cash_balance_before !== undefined && row.cash_balance_before !== null ? Number(row.cash_balance_before) : undefined,
    cashBalanceAfter: row.cash_balance_after !== null ? Number(row.cash_balance_after) : undefined,
    copperStockBefore: row.copper_stock_before !== undefined && row.copper_stock_before !== null ? Number(row.copper_stock_before) : undefined,
    copperStockAfter: row.copper_stock_after !== null ? Number(row.copper_stock_after) : undefined,
    notes,
    createdAt: row.created_at,
    approvalStatus: approvalStatus as any,
    registeredBy,
    approvedBy,
    approvedAt,
    rejectionReason,
    receiptNumber,
    paymentMethod: paymentMethod as any,
    chequeNumber,
    chequeDueDate,
    chequeBank,
    chequeStatus: chequeStatus as any,
    chequeClearedDate,
    receiptImageUrl,
    assignedBankName,
    assignedOwnerName,
    assignedCardNumber,
    assignedIbanNumber,
    assignedBankNote,
    saleCategory: saleCategory as any,
  };

  if (assignedAccountId) {
    (tx as any).assignedAccountId = assignedAccountId;
  }

  return tx;
}

export function toTransactionRow(tx: Transaction): TransactionRow {
  const notesWithMeta = buildNotesWithMetadata(tx);
  return {
    id: tx.id,
    person_id: tx.personId,
    date: tx.date,
    type: tx.type,
    amount: Number(tx.amount) || 0,
    weight_kg: tx.weightKg !== undefined && tx.weightKg !== null ? Number(tx.weightKg) : null,
    unit_price: tx.unitPrice !== undefined && tx.unitPrice !== null ? Number(tx.unitPrice) : null,
    cogs: tx.cogs !== undefined && tx.cogs !== null ? Number(tx.cogs) : null,
    profit: tx.profit !== undefined && tx.profit !== null ? Number(tx.profit) : null,
    profit_percentage: tx.profitPercentage !== undefined && tx.profitPercentage !== null ? Number(tx.profitPercentage) : null,
    cash_balance_before: tx.cashBalanceBefore !== undefined && tx.cashBalanceBefore !== null ? Number(tx.cashBalanceBefore) : null,
    cash_balance_after: tx.cashBalanceAfter !== undefined && tx.cashBalanceAfter !== null ? Number(tx.cashBalanceAfter) : null,
    copper_stock_before: tx.copperStockBefore !== undefined && tx.copperStockBefore !== null ? Number(tx.copperStockBefore) : null,
    copper_stock_after: tx.copperStockAfter !== undefined && tx.copperStockAfter !== null ? Number(tx.copperStockAfter) : null,
    notes: notesWithMeta,
    created_at: tx.createdAt || new Date().toISOString(),
    approval_status: tx.approvalStatus || 'approved',
    registered_by: tx.registeredBy || null,
    approved_by: tx.approvedBy || null,
    approved_at: tx.approvedAt || null,
    rejection_reason: tx.rejectionReason || null,
    receipt_number: tx.receiptNumber || null,
    payment_method: tx.paymentMethod || null,
    cheque_number: tx.chequeNumber || null,
    cheque_due_date: tx.chequeDueDate || null,
    cheque_bank: tx.chequeBank || null,
    cheque_status: tx.chequeStatus || null,
    cheque_cleared_date: tx.chequeClearedDate || null,
    receipt_image_url: tx.receiptImageUrl || null,
    assigned_bank_account_id: (tx as any).assignedAccountId || null,
    admin_bank_note: tx.assignedBankNote || null,
    assigned_bank_name: tx.assignedBankName || null,
    assigned_owner_name: tx.assignedOwnerName || null,
    assigned_card_number: tx.assignedCardNumber || null,
    assigned_iban_number: tx.assignedIbanNumber || null,
    sale_category: tx.saleCategory || null,
  };
}

/**
 * Base transaction row without newly added schema columns
 * Used as a fallback when the remote Supabase table does not have extended columns.
 */
export function toBaseTransactionRow(tx: Transaction): Record<string, any> {
  const notesWithMeta = buildNotesWithMetadata(tx);
  return {
    id: tx.id,
    person_id: tx.personId,
    date: tx.date,
    type: tx.type,
    amount: Number(tx.amount) || 0,
    weight_kg: tx.weightKg !== undefined && tx.weightKg !== null ? Number(tx.weightKg) : null,
    unit_price: tx.unitPrice !== undefined && tx.unitPrice !== null ? Number(tx.unitPrice) : null,
    cogs: tx.cogs !== undefined && tx.cogs !== null ? Number(tx.cogs) : null,
    profit: tx.profit !== undefined && tx.profit !== null ? Number(tx.profit) : null,
    profit_percentage: tx.profitPercentage !== undefined && tx.profitPercentage !== null ? Number(tx.profitPercentage) : null,
    cash_balance_after: tx.cashBalanceAfter !== undefined && tx.cashBalanceAfter !== null ? Number(tx.cashBalanceAfter) : null,
    copper_stock_after: tx.copperStockAfter !== undefined && tx.copperStockAfter !== null ? Number(tx.copperStockAfter) : null,
    notes: notesWithMeta,
    created_at: tx.createdAt || new Date().toISOString(),
  };
}

let isExtendedSchemaSupported = true;

function isSchemaColumnError(error: any): boolean {
  if (!error) return false;
  return (
    error.code === 'PGRST204' ||
    error.code === '42703' ||
    (typeof error.message === 'string' && (
      error.message.includes('Could not find') ||
      error.message.includes('column') ||
      error.message.includes('schema cache')
    ))
  );
}

// --- Supabase Cloud Operations ---

/**
 * Fetch all records from Supabase
 */
export async function fetchAllFromSupabase(): Promise<{
  people: Person[];
  transactions: Transaction[];
  marketPrice: number;
  marketPrices: MarketPrices;
  companyCopperStock?: number;
  isConnected: boolean;
  error?: string;
}> {
  try {
    const fetchPromise = Promise.all([
      supabase.from('people').select('*').order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').order('date', { ascending: true }),
      supabase.from('app_settings').select('*').eq('key', 'market_copper_price').maybeSingle(),
      supabase.from('app_settings').select('*').eq('key', 'market_buy_price').maybeSingle(),
      supabase.from('app_settings').select('*').eq('key', 'market_sell_price').maybeSingle(),
      supabase.from('app_settings').select('*').eq('key', 'company_copper_stock').maybeSingle(),
    ]);

    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Supabase request timeout')), 3000)
    );

    const [peopleRes, txRes, settingsRes, buySettingsRes, sellSettingsRes, stockRes] = await Promise.race([
      fetchPromise,
      timeoutPromise
    ]);

    if (peopleRes.error) {
      console.warn('Supabase people fetch error:', peopleRes.error);
      return { 
        people: [], 
        transactions: [], 
        marketPrice: DEFAULT_MARKET_BUY_PRICE, 
        marketPrices: { buyPrice: DEFAULT_MARKET_BUY_PRICE, sellPrice: DEFAULT_MARKET_SELL_PRICE },
        isConnected: false, 
        error: peopleRes.error.message 
      };
    }

    const people = (peopleRes.data as PersonRow[] || []).map(toPerson);
    const transactions = (txRes.data as TransactionRow[] || []).map(toTransaction);
    
    let buyPrice = DEFAULT_MARKET_BUY_PRICE;
    let sellPrice = DEFAULT_MARKET_SELL_PRICE;

    if (buySettingsRes.data && buySettingsRes.data.value) {
      buyPrice = Number(buySettingsRes.data.value) || DEFAULT_MARKET_BUY_PRICE;
    } else if (settingsRes.data && settingsRes.data.value) {
      buyPrice = Number(settingsRes.data.value) || DEFAULT_MARKET_BUY_PRICE;
    }

    if (sellSettingsRes.data && sellSettingsRes.data.value) {
      sellPrice = Number(sellSettingsRes.data.value) || DEFAULT_MARKET_SELL_PRICE;
    } else {
      sellPrice = Math.max(0, buyPrice - 150000);
    }

    let companyCopperStock: number | undefined;
    if (stockRes.data && stockRes.data.value !== null) {
      companyCopperStock = Number(stockRes.data.value);
    }

    return {
      people,
      transactions,
      marketPrice: buyPrice,
      marketPrices: { buyPrice, sellPrice },
      companyCopperStock,
      isConnected: true,
    };
  } catch (err: any) {
    console.error('Supabase connection error:', err);
    return {
      people: [],
      transactions: [],
      marketPrice: DEFAULT_MARKET_BUY_PRICE,
      marketPrices: { buyPrice: DEFAULT_MARKET_BUY_PRICE, sellPrice: DEFAULT_MARKET_SELL_PRICE },
      isConnected: false,
      error: err?.message || 'Failed to connect to Supabase',
    };
  }
}

/**
 * Upsert a single Person in Supabase
 */
export async function dbUpsertPerson(person: Person): Promise<boolean> {
  try {
    const row = toPersonRow(person);
    const { error } = await supabase.from('people').upsert(row, { onConflict: 'id' });
    if (error) {
      if (error.code === '42501' || error.message?.includes('row-level security')) {
        console.error('CRITICAL: Supabase Row-Level Security (RLS) is blocking writes on "people" table. Execute: ALTER TABLE public.people DISABLE ROW LEVEL SECURITY; in Supabase SQL Editor.', error.message);
      }
      if (isSchemaColumnError(error)) {
        console.warn('Supabase people table missing password column; retrying without password...', error.message);
        const baseRow = {
          id: person.id,
          name: person.name,
          phone: person.phone || null,
          notes: person.notes || null,
          created_at: person.createdAt || new Date().toISOString(),
        };
        const { error: retryErr } = await supabase.from('people').upsert(baseRow, { onConflict: 'id' });
        if (retryErr) {
          console.error('Error upserting person (base schema):', retryErr);
          return false;
        }
        return true;
      }
      console.error('Error upserting person:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase dbUpsertPerson error:', err);
    return false;
  }
}

/**
 * Batch Upsert / Sync all people to Supabase
 */
export async function dbSyncAllPeopleToCloud(peopleList: Person[]): Promise<boolean> {
  if (peopleList.length === 0) return true;
  try {
    for (const p of peopleList) {
      await dbUpsertPerson(p);
    }
    return true;
  } catch (err) {
    console.error('Supabase dbSyncAllPeopleToCloud error:', err);
    return false;
  }
}

/**
 * Delete a Person in Supabase (Cascades to transactions due to SQL schema)
 */
export async function dbDeletePerson(personId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('people').delete().eq('id', personId);
    if (error) {
      console.error('Error deleting person:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase dbDeletePerson error:', err);
    return false;
  }
}

/**
 * Upsert a single Transaction in Supabase
 */
export async function dbUpsertTransaction(tx: Transaction): Promise<boolean> {
  try {
    const row = isExtendedSchemaSupported ? toTransactionRow(tx) : toBaseTransactionRow(tx);
    const { error } = await supabase.from('transactions').upsert(row, { onConflict: 'id' });
    if (error) {
      if (isSchemaColumnError(error)) {
        isExtendedSchemaSupported = false;
        console.warn('Supabase transactions table missing extended columns; falling back to base schema fields...', error.message);
        const baseRow = toBaseTransactionRow(tx);
        const { error: retryErr } = await supabase.from('transactions').upsert(baseRow, { onConflict: 'id' });
        if (retryErr) {
          console.error('Error upserting transaction (base schema):', retryErr);
          return false;
        }
        return true;
      }
      console.error('Error upserting transaction:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase dbUpsertTransaction error:', err);
    return false;
  }
}

/**
 * Batch Upsert Transactions in Supabase (Used during recalculations/replays)
 */
export async function dbBatchUpsertTransactions(txList: Transaction[]): Promise<boolean> {
  if (txList.length === 0) return true;
  try {
    const rows = isExtendedSchemaSupported ? txList.map(toTransactionRow) : txList.map(toBaseTransactionRow);
    const { error } = await supabase.from('transactions').upsert(rows, { onConflict: 'id' });
    if (error) {
      if (isSchemaColumnError(error)) {
        isExtendedSchemaSupported = false;
        console.warn('Supabase transactions table missing extended columns; falling back to base schema fields for batch upsert...', error.message);
        const baseRows = txList.map(toBaseTransactionRow);
        const { error: retryErr } = await supabase.from('transactions').upsert(baseRows, { onConflict: 'id' });
        if (retryErr) {
          console.error('Error batch upserting transactions (base schema):', retryErr);
          return false;
        }
        return true;
      }
      console.error('Error batch upserting transactions:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase dbBatchUpsertTransactions error:', err);
    return false;
  }
}

/**
 * Delete a Transaction in Supabase
 */
export async function dbDeleteTransaction(txId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('transactions').delete().eq('id', txId);
    if (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase dbDeleteTransaction error:', err);
    return false;
  }
}

/**
 * Save market copper prices (buy and sell) in app_settings table
 */
export async function dbSaveMarketPrices(prices: MarketPrices): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert([
        { key: 'market_buy_price', value: prices.buyPrice },
        { key: 'market_sell_price', value: prices.sellPrice },
        { key: 'market_copper_price', value: prices.buyPrice },
      ], { onConflict: 'key' });
    if (error) {
      console.error('Error saving market prices:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase dbSaveMarketPrices error:', err);
    return false;
  }
}

/**
 * Save market copper price in app_settings table (legacy compatibility)
 */
export async function dbSaveMarketPrice(price: number): Promise<boolean> {
  return dbSaveMarketPrices({
    buyPrice: price,
    sellPrice: Math.max(0, price - 150000),
  });
}

/**
 * Save company copper stock in app_settings table
 */
export async function dbSaveCompanyCopperStock(stockKg: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'company_copper_stock', value: String(stockKg) }, { onConflict: 'key' });
    if (error) {
      console.error('Error saving company copper stock:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase dbSaveCompanyCopperStock error:', err);
    return false;
  }
}

/**
 * Clear all data completely in Supabase (Factory reset)
 */
export async function dbClearAllCloudData(): Promise<boolean> {
  try {
    // Delete all transactions and people in Supabase
    await supabase.from('transactions').delete().neq('id', '___non_existent___');
    await supabase.from('people').delete().neq('id', '___non_existent___');
    await supabase.from('app_settings').upsert({ key: 'market_copper_price', value: DEFAULT_MARKET_COPPER_PRICE });
    await supabase.from('app_settings').upsert({ key: 'company_copper_stock', value: 0 });
    return true;
  } catch (err) {
    console.error('Supabase dbClearAllCloudData error:', err);
    return false;
  }
}

/**
 * Seed initial sample data into Supabase if empty
 */
export async function seedSupabaseIfEmpty(
  initialPeople: Person[],
  initialTransactions: Transaction[],
  marketPrice: number
): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Error checking people count:', error);
      return false;
    }

    if (count === 0 && initialPeople.length > 0) {
      console.log('Seeding initial data into Supabase...');
      // 1. Insert people
      const peopleRows = initialPeople.map(toPersonRow);
      await supabase.from('people').insert(peopleRows);

      // 2. Insert transactions
      const txRows = isExtendedSchemaSupported ? initialTransactions.map(toTransactionRow) : initialTransactions.map(toBaseTransactionRow);
      const { error: txErr } = await supabase.from('transactions').insert(txRows);
      if (txErr && isSchemaColumnError(txErr)) {
        isExtendedSchemaSupported = false;
        console.warn('Supabase transactions table missing extended columns during seed; inserting base schema fields...');
        const baseRows = initialTransactions.map(toBaseTransactionRow);
        await supabase.from('transactions').insert(baseRows);
      }

      // 3. Insert price setting
      await supabase.from('app_settings').upsert({ key: 'market_copper_price', value: marketPrice });
      
      console.log('Supabase initial seed completed successfully.');
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error in seedSupabaseIfEmpty:', err);
    return false;
  }
}
