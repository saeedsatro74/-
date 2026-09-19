import { Person, Transaction, WarehouseItem } from '../types';

let isSyncing = false;
let hasInitialSynced = false;

/**
 * Synchronize local data with Cloud SQL PostgreSQL backend
 */
export async function syncWithCloudDatabase(): Promise<{
  success: boolean;
  peopleCount?: number;
  transactionsCount?: number;
  warehouseCount?: number;
}> {
  if (isSyncing) return { success: false };
  isSyncing = true;

  try {
    // Read current local state
    const rawPeople = localStorage.getItem('copper_wallet_people_v2');
    const rawTransactions = localStorage.getItem('copper_wallet_transactions_v2');
    const rawWarehouse = localStorage.getItem('waateh_warehouse_items_v1');

    const clientPeople: Person[] = rawPeople ? JSON.parse(rawPeople) : [];
    const clientTransactions: Transaction[] = rawTransactions ? JSON.parse(rawTransactions) : [];
    const clientWarehouse: WarehouseItem[] = rawWarehouse ? JSON.parse(rawWarehouse) : [];

    // Format warehouse items for server schema
    const formattedWarehouseItems: any[] = [];
    for (const entry of clientWarehouse) {
      if (entry && entry.items && Array.isArray(entry.items)) {
        for (const sub of entry.items) {
          formattedWarehouseItems.push({
            id: sub.id || `${entry.id}-${Math.random().toString(36).substr(2, 5)}`,
            consignmentId: entry.referenceDocNumber || entry.id,
            type: entry.entryType || 'inbound',
            packagingType: sub.packagingType || 'spool',
            brand: sub.brand || 'باهنر',
            diameterInch: sub.diameterInch || '3/8',
            thicknessMm: sub.thicknessMm || 0.75,
            quantity: sub.quantity || 1,
            totalWeightKg: sub.totalWeightKg || sub.unitWeightKg || 0,
            netWeightKg: sub.totalWeightKg || 0,
            spoolPackagingType: sub.spoolType || 'pallet',
            spoolWeights: sub.spoolWeights,
            coilLengthType: sub.coilLength,
            referenceDocNumber: entry.referenceDocNumber,
            driverName: entry.driverName,
            vehiclePlate: entry.vehiclePlate,
            targetPartyName: entry.targetPartyName,
            date: entry.date,
            notes: sub.notes || entry.notes,
            spoolCondition: sub.spoolCondition || 'sealed',
          });
        }
      }
    }

    const payload = {
      people: clientPeople.map((p) => ({
        id: p.id,
        name: p.name,
        phone: p.phone || null,
        nationalId: p.nationalId || null,
        initialCopperBalanceKg: p.initialCopperBalanceKg || 0,
        role: p.role || 'customer',
        notes: p.notes || null,
      })),
      transactions: clientTransactions.map((t) => ({
        id: t.id,
        personId: t.personId,
        type: t.type,
        copperWeightKg: t.weightKg || 0,
        pricePerKgToman: t.unitPrice || 0,
        totalToman: t.amount || 0,
        trackingCode: t.trackingCode || null,
        date: t.date,
        description: t.notes || null,
      })),
      warehouseItems: formattedWarehouseItems,
    };

    const response = await fetch('/api/sync/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Sync failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      // Merge Server People into LocalStorage
      if (Array.isArray(data.people) && data.people.length > 0) {
        const localMap = new Map(clientPeople.map((p) => [p.id, p]));
        for (const sp of data.people) {
          if (!sp.isDeleted) {
            const existing = localMap.get(sp.id);
            localMap.set(sp.id, {
              id: sp.id,
              name: sp.name,
              phone: sp.phone || existing?.phone || '',
              nationalId: sp.nationalId || existing?.nationalId || '',
              initialCopperBalanceKg: Number(sp.initialCopperBalanceKg || 0),
              role: (sp.role as any) || existing?.role || 'customer',
              notes: sp.notes || existing?.notes || '',
              createdAt: sp.createdAt || existing?.createdAt || new Date().toISOString(),
              password: existing?.password,
            });
          } else {
            localMap.delete(sp.id);
          }
        }
        const updatedPeople = Array.from(localMap.values());
        localStorage.setItem('copper_wallet_people_v2', JSON.stringify(updatedPeople));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('copper-people-updated', { detail: updatedPeople }));
        }
      }

      // Merge Server Transactions into LocalStorage
      if (Array.isArray(data.transactions) && data.transactions.length > 0) {
        const trxMap = new Map(clientTransactions.map((t) => [t.id, t]));
        for (const st of data.transactions) {
          const existing = trxMap.get(st.id);
          trxMap.set(st.id, {
            id: st.id,
            personId: st.personId,
            type: st.type as any,
            date: st.date,
            weightKg: Number(st.copperWeightKg || 0),
            unitPrice: Number(st.pricePerKgToman || 0),
            amount: Number(st.totalToman || 0),
            trackingCode: st.trackingCode || existing?.trackingCode,
            notes: st.description || existing?.notes,
            cashBalanceAfter: existing?.cashBalanceAfter ?? 0,
            copperStockAfter: existing?.copperStockAfter ?? 0,
            createdAt: existing?.createdAt || st.createdAt || new Date().toISOString(),
          });
        }
        const updatedTrxs = Array.from(trxMap.values());
        localStorage.setItem('copper_wallet_transactions_v2', JSON.stringify(updatedTrxs));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('copper-transactions-updated', { detail: updatedTrxs }));
        }
      }

      hasInitialSynced = true;
      return {
        success: true,
        peopleCount: data.people?.length || 0,
        transactionsCount: data.transactions?.length || 0,
        warehouseCount: data.warehouseItems?.length || 0,
      };
    }

    return { success: false };
  } catch (err) {
    console.warn('Sync with Cloud SQL skipped or offline:', err);
    return { success: false };
  } finally {
    isSyncing = false;
  }
}

/**
 * Initialize automatic background synchronization
 */
export function initAutoSync(): void {
  if (typeof window === 'undefined') return;

  // Run initial sync shortly after page loads
  if (!hasInitialSynced) {
    setTimeout(() => {
      syncWithCloudDatabase();
    }, 1500);
  }

  // Sync on window refocus
  window.addEventListener('focus', () => {
    syncWithCloudDatabase();
  });

  // Sync periodically every 2 minutes
  setInterval(() => {
    syncWithCloudDatabase();
  }, 2 * 60 * 1000);
}
