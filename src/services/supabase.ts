import { createClient } from '@supabase/supabase-js';
import { Person, Transaction, MarketPrices } from '../types';
import { DEFAULT_MARKET_BUY_PRICE, DEFAULT_MARKET_SELL_PRICE, DEFAULT_MARKET_COPPER_PRICE } from '../utils/storage';

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
  cash_balance_after: number | null;
  copper_stock_after: number | null;
  notes: string | null;
  created_at: string;
  payment_method?: string | null;
  cheque_number?: string | null;
  cheque_due_date?: string | null;
  cheque_bank?: string | null;
  cheque_status?: string | null;
  cheque_cleared_date?: string | null;
}

export interface AppSettingRow {
  key: string;
  value: number;
}

export function toPerson(row: PersonRow): Person {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

export function toPersonRow(p: Person): PersonRow {
  return {
    id: p.id,
    name: p.name,
    phone: p.phone || null,
    notes: p.notes || null,
    created_at: p.createdAt || new Date().toISOString(),
  };
}

export function toTransaction(row: TransactionRow): Transaction {
  return {
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
    cashBalanceAfter: row.cash_balance_after !== null ? Number(row.cash_balance_after) : undefined,
    copperStockAfter: row.copper_stock_after !== null ? Number(row.copper_stock_after) : undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    paymentMethod: (row.payment_method as any) || undefined,
    chequeNumber: row.cheque_number || undefined,
    chequeDueDate: row.cheque_due_date || undefined,
    chequeBank: row.cheque_bank || undefined,
    chequeStatus: (row.cheque_status as any) || undefined,
    chequeClearedDate: row.cheque_cleared_date || undefined,
  };
}

export function toTransactionRow(tx: Transaction): TransactionRow {
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
    notes: tx.notes || null,
    created_at: tx.createdAt || new Date().toISOString(),
    payment_method: tx.paymentMethod || null,
    cheque_number: tx.chequeNumber || null,
    cheque_due_date: tx.chequeDueDate || null,
    cheque_bank: tx.chequeBank || null,
    cheque_status: tx.chequeStatus || null,
    cheque_cleared_date: tx.chequeClearedDate || null,
  };
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
  isConnected: boolean;
  error?: string;
}> {
  try {
    const [peopleRes, txRes, settingsRes, buySettingsRes, sellSettingsRes] = await Promise.all([
      supabase.from('people').select('*').order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').order('date', { ascending: true }),
      supabase.from('app_settings').select('*').eq('key', 'market_copper_price').maybeSingle(),
      supabase.from('app_settings').select('*').eq('key', 'market_buy_price').maybeSingle(),
      supabase.from('app_settings').select('*').eq('key', 'market_sell_price').maybeSingle(),
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

    return {
      people,
      transactions,
      marketPrice: buyPrice,
      marketPrices: { buyPrice, sellPrice },
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
    const row = toTransactionRow(tx);
    const { error } = await supabase.from('transactions').upsert(row, { onConflict: 'id' });
    if (error) {
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
    const rows = txList.map(toTransactionRow);
    const { error } = await supabase.from('transactions').upsert(rows, { onConflict: 'id' });
    if (error) {
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
 * Clear all data completely in Supabase (Factory reset)
 */
export async function dbClearAllCloudData(): Promise<boolean> {
  try {
    // Delete in reverse order of foreign key constraints
    await supabase.from('transactions').delete().neq('id', '___non_existent___');
    await supabase.from('people').delete().neq('id', '___non_existent___');
    await supabase.from('app_settings').upsert({ key: 'market_copper_price', value: DEFAULT_MARKET_COPPER_PRICE });
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
      const txRows = initialTransactions.map(toTransactionRow);
      await supabase.from('transactions').insert(txRows);

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
