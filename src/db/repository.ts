import { db } from './index.ts';
import { people, transactions, warehouseItems, appSettings, users } from './schema.ts';
import { eq, desc } from 'drizzle-orm';

// --- Users (Firebase Sync) ---
export async function getOrCreateUser(uid: string, email: string, displayName?: string, photoUrl?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        displayName: displayName || null,
        photoUrl: photoUrl || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName || null,
          photoUrl: photoUrl || null,
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Failed to upsert user:', error);
    throw new Error('User operation failed', { cause: error });
  }
}

// --- People (مشتریان و همکاران مس) ---
export async function getPeople() {
  try {
    return await db.select().from(people);
  } catch (error) {
    console.error('Failed to get people:', error);
    throw new Error('Failed to retrieve people', { cause: error });
  }
}

export async function upsertPerson(data: {
  id: string;
  name: string;
  phone?: string;
  nationalId?: string;
  initialCopperBalanceKg?: number;
  role?: string;
  notes?: string;
  isDeleted?: boolean;
}) {
  try {
    const result = await db.insert(people)
      .values({
        id: data.id,
        name: data.name,
        phone: data.phone || null,
        nationalId: data.nationalId || null,
        initialCopperBalanceKg: Number(data.initialCopperBalanceKg || 0),
        role: data.role || 'customer',
        notes: data.notes || null,
        isDeleted: !!data.isDeleted,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: people.id,
        set: {
          name: data.name,
          phone: data.phone || null,
          nationalId: data.nationalId || null,
          initialCopperBalanceKg: Number(data.initialCopperBalanceKg || 0),
          role: data.role || 'customer',
          notes: data.notes || null,
          isDeleted: !!data.isDeleted,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Failed to upsert person:', error);
    throw new Error('Failed to save person', { cause: error });
  }
}

export async function deletePerson(id: string) {
  try {
    await db.update(people)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(people.id, id));
    return { success: true };
  } catch (error) {
    console.error('Failed to delete person:', error);
    throw new Error('Failed to delete person', { cause: error });
  }
}

// --- Transactions (تراکنش‌های مس) ---
export async function getTransactions() {
  try {
    return await db.select().from(transactions).orderBy(desc(transactions.createdAt));
  } catch (error) {
    console.error('Failed to get transactions:', error);
    throw new Error('Failed to retrieve transactions', { cause: error });
  }
}

export async function upsertTransaction(data: {
  id: string;
  personId: string;
  type: string;
  copperWeightKg: number;
  pricePerKgToman?: number;
  totalToman?: number;
  trackingCode?: string;
  date: string;
  description?: string;
  paymentStatus?: string;
}) {
  try {
    const result = await db.insert(transactions)
      .values({
        id: data.id,
        personId: data.personId,
        type: data.type,
        copperWeightKg: Number(data.copperWeightKg),
        pricePerKgToman: Number(data.pricePerKgToman || 0),
        totalToman: Number(data.totalToman || 0),
        trackingCode: data.trackingCode || null,
        date: data.date,
        description: data.description || null,
        paymentStatus: data.paymentStatus || 'completed',
      })
      .onConflictDoUpdate({
        target: transactions.id,
        set: {
          personId: data.personId,
          type: data.type,
          copperWeightKg: Number(data.copperWeightKg),
          pricePerKgToman: Number(data.pricePerKgToman || 0),
          totalToman: Number(data.totalToman || 0),
          trackingCode: data.trackingCode || null,
          date: data.date,
          description: data.description || null,
          paymentStatus: data.paymentStatus || 'completed',
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Failed to save transaction:', error);
    throw new Error('Failed to save transaction', { cause: error });
  }
}

export async function deleteTransaction(id: string) {
  try {
    await db.delete(transactions).where(eq(transactions.id, id));
    return { success: true };
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    throw new Error('Failed to delete transaction', { cause: error });
  }
}

// --- Warehouse Items (اقلام انبار مس) ---
export async function getWarehouseItems() {
  try {
    return await db.select().from(warehouseItems).orderBy(desc(warehouseItems.updatedAt));
  } catch (error) {
    console.error('Failed to get warehouse items:', error);
    throw new Error('Failed to retrieve warehouse items', { cause: error });
  }
}

export async function upsertWarehouseItem(data: any) {
  try {
    const result = await db.insert(warehouseItems)
      .values({
        id: data.id,
        consignmentId: data.consignmentId || 'DEFAULT',
        type: data.type || 'inbound',
        packagingType: data.packagingType,
        brand: data.brand,
        diameterInch: data.diameterInch || null,
        thicknessMm: data.thicknessMm != null ? Number(data.thicknessMm) : null,
        quantity: data.quantity != null ? Number(data.quantity) : 1,
        totalWeightKg: Number(data.totalWeightKg || 0),
        netWeightKg: data.netWeightKg != null ? Number(data.netWeightKg) : null,
        spoolPackagingType: data.spoolPackagingType || null,
        spoolWeightsJson: data.spoolWeights ? JSON.stringify(data.spoolWeights) : (data.spoolWeightsJson || null),
        coilLengthType: data.coilLengthType || null,
        pipePurityPercent: data.pipePurityPercent || null,
        isCustomBadge: data.isCustomBadge || null,
        referenceDocNumber: data.referenceDocNumber || null,
        driverName: data.driverName || null,
        vehiclePlate: data.vehiclePlate || null,
        targetPartyName: data.targetPartyName || null,
        date: data.date || new Date().toISOString().split('T')[0],
        notes: data.notes || null,
        isDepalletized: !!data.isDepalletized,
        sourcePalletInfo: data.sourcePalletInfo ? (typeof data.sourcePalletInfo === 'string' ? data.sourcePalletInfo : JSON.stringify(data.sourcePalletInfo)) : null,
        spoolCondition: data.spoolCondition || 'sealed',
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: warehouseItems.id,
        set: {
          type: data.type || 'inbound',
          packagingType: data.packagingType,
          brand: data.brand,
          diameterInch: data.diameterInch || null,
          thicknessMm: data.thicknessMm != null ? Number(data.thicknessMm) : null,
          quantity: data.quantity != null ? Number(data.quantity) : 1,
          totalWeightKg: Number(data.totalWeightKg || 0),
          netWeightKg: data.netWeightKg != null ? Number(data.netWeightKg) : null,
          spoolPackagingType: data.spoolPackagingType || null,
          spoolWeightsJson: data.spoolWeights ? JSON.stringify(data.spoolWeights) : (data.spoolWeightsJson || null),
          coilLengthType: data.coilLengthType || null,
          pipePurityPercent: data.pipePurityPercent || null,
          isCustomBadge: data.isCustomBadge || null,
          referenceDocNumber: data.referenceDocNumber || null,
          driverName: data.driverName || null,
          vehiclePlate: data.vehiclePlate || null,
          targetPartyName: data.targetPartyName || null,
          date: data.date || new Date().toISOString().split('T')[0],
          notes: data.notes || null,
          isDepalletized: !!data.isDepalletized,
          sourcePalletInfo: data.sourcePalletInfo ? (typeof data.sourcePalletInfo === 'string' ? data.sourcePalletInfo : JSON.stringify(data.sourcePalletInfo)) : null,
          spoolCondition: data.spoolCondition || 'sealed',
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Failed to upsert warehouse item:', error);
    throw new Error('Failed to save warehouse item', { cause: error });
  }
}

export async function deleteWarehouseItem(id: string) {
  try {
    await db.delete(warehouseItems).where(eq(warehouseItems.id, id));
    return { success: true };
  } catch (error) {
    console.error('Failed to delete warehouse item:', error);
    throw new Error('Failed to delete warehouse item', { cause: error });
  }
}

// --- App Settings (تنظیمات عمومی) ---
export async function getAppSetting(key: string) {
  try {
    const result = await db.select().from(appSettings).where(eq(appSettings.key, key));
    return result[0]?.value || null;
  } catch (error) {
    console.error(`Failed to get setting ${key}:`, error);
    return null;
  }
}

export async function setAppSetting(key: string, value: string) {
  try {
    await db.insert(appSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedAt: new Date() },
      });
    return true;
  } catch (error) {
    console.error(`Failed to set setting ${key}:`, error);
    return false;
  }
}
