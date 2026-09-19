import { WarehouseItem, WarehouseCargoItem } from '../types';
import { getStoredWarehouseItems, saveWarehouseItems } from './storage';
import { toFaDigits } from './formatters';

export interface PalletCardRef {
  id: string;
  palletIndex: number;
  consignmentId: string;
  cargoItemId: string;
  brand: string;
  diameterInch: string;
  thicknessMm: number;
  spoolWeights: number[];
  totalWeightKg: number;
  referenceDocNumber?: string;
}

export interface LooseSpoolRef {
  id: string;
  consignmentId: string;
  cargoItemId: string;
  brand: string;
  diameterInch: string;
  thicknessMm: number;
  spoolWeights: number[];
  totalWeightKg: number;
  referenceDocNumber?: string;
  notes?: string;
}

export interface RetailItemRef {
  id: string;
  consignmentId: string;
  cargoItemId: string;
  brand: string;
  diameterInch: string;
  thicknessMm: number;
  weightKg: number;
  referenceDocNumber?: string;
  sourceInfo?: string;
  notes?: string;
}

/**
 * Dismantles a full pallet into independent loose (non-pallet) spools.
 * The pallet ceases to exist in the pallets list and all spools appear in the non-pallet section.
 */
export function dismantlePalletIntoLooseSpools(
  pallet: PalletCardRef,
  customNotes?: string
): WarehouseItem[] {
  const allItems = getStoredWarehouseItems();
  let updated = false;

  const newItems = allItems.map((consignment) => {
    if (consignment.id !== pallet.consignmentId) return consignment;

    const updatedCargoItems: WarehouseCargoItem[] = [];

    for (const cargoItem of consignment.items || []) {
      if (cargoItem.id === pallet.cargoItemId) {
        updated = true;
        // Transform pallet into loose spools
        const looseItems: WarehouseCargoItem[] = pallet.spoolWeights.map((w, idx) => ({
          id: `${cargoItem.id}-loose-${idx + 1}-${Date.now()}`,
          packagingType: 'spool',
          spoolType: 'non_pallet',
          brand: pallet.brand,
          diameterInch: pallet.diameterInch,
          thicknessMm: pallet.thicknessMm,
          quantity: 1,
          unitWeightKg: w,
          totalWeightKg: w,
          spoolWeights: [w],
          spoolCondition: 'sealed',
          sourcePalletInfo: `تفکیک شده از پالت #${pallet.palletIndex} (${pallet.brand})`,
          notes: customNotes || `قرقره غیرپالتی تفکیک شده از پالت #${pallet.palletIndex}`,
        }));

        updatedCargoItems.push(...looseItems);
      } else {
        updatedCargoItems.push(cargoItem);
      }
    }

    return {
      ...consignment,
      items: updatedCargoItems,
    };
  });

  // If not found in existing consignments (e.g. initial demo item), create a new inbound consignment
  if (!updated) {
    const looseCargoItems: WarehouseCargoItem[] = pallet.spoolWeights.map((w, idx) => ({
      id: `loose-${pallet.id}-${idx + 1}-${Date.now()}`,
      packagingType: 'spool',
      spoolType: 'non_pallet',
      brand: pallet.brand,
      diameterInch: pallet.diameterInch,
      thicknessMm: pallet.thicknessMm,
      quantity: 1,
      unitWeightKg: w,
      totalWeightKg: w,
      spoolWeights: [w],
      spoolCondition: 'sealed',
      sourcePalletInfo: `تفکیک شده از پالت #${pallet.palletIndex} (${pallet.brand})`,
      notes: customNotes || `قرقره غیرپالتی تفکیک شده از پالت #${pallet.palletIndex}`,
    }));

    // Add as a new inbound consignment holding these loose spools
    const newDoc: WarehouseItem = {
      id: `wh-dismantled-${pallet.id}-${Date.now()}`,
      entryType: 'inbound',
      referenceDocNumber: `DISM-P#${pallet.palletIndex}`,
      date: new Date().toLocaleDateString('fa-IR'),
      targetPartyName: `تفکیک پالت #${pallet.palletIndex}`,
      registeredBy: 'انباردار مس واته',
      notes: `تفکیک پالت شماره #${pallet.palletIndex} به قرقره‌های آزاد`,
      createdAt: new Date().toISOString(),
      items: looseCargoItems,
      totalWeightKg: pallet.totalWeightKg,
      totalItemsCount: looseCargoItems.length,
    };

    const finalItems = [newDoc, ...allItems];
    saveWarehouseItems(finalItems);
    return finalItems;
  }

  saveWarehouseItems(newItems);
  return newItems;
}

/**
 * Opens a specific spool from a pallet:
 * 1. The pallet is dismantled.
 * 2. The other spools of the pallet become loose spools in the non-pallet section.
 * 3. The opened spool is converted into a retail copper item (خورده‌ها / خرده‌فروشی) with its exact weight.
 */
export function openSpoolToRetailFromPallet(
  pallet: PalletCardRef,
  spoolIndex: number
): WarehouseItem[] {
  const allItems = getStoredWarehouseItems();
  const openedWeight = pallet.spoolWeights[spoolIndex] || 0;
  const remainingWeights = pallet.spoolWeights.filter((_, idx) => idx !== spoolIndex);

  let updated = false;

  const newItems = allItems.map((consignment) => {
    if (consignment.id !== pallet.consignmentId) return consignment;

    const updatedCargoItems: WarehouseCargoItem[] = [];

    for (const cargoItem of consignment.items || []) {
      if (cargoItem.id === pallet.cargoItemId) {
        updated = true;

        // 1. Remaining spools become loose spools
        const looseItems: WarehouseCargoItem[] = remainingWeights.map((w, idx) => ({
          id: `${cargoItem.id}-loose-${idx + 1}-${Date.now()}`,
          packagingType: 'spool',
          spoolType: 'non_pallet',
          brand: pallet.brand,
          diameterInch: pallet.diameterInch,
          thicknessMm: pallet.thicknessMm,
          quantity: 1,
          unitWeightKg: w,
          totalWeightKg: w,
          spoolWeights: [w],
          spoolCondition: 'sealed',
          sourcePalletInfo: `باقی‌مانده تفکیک پالت #${pallet.palletIndex}`,
          notes: `قرقره غیرپالتی باقی‌مانده از پالت #${pallet.palletIndex}`,
        }));

        // 2. The opened spool becomes a retail (خورده‌ها) item
        const retailItem: WarehouseCargoItem = {
          id: `${cargoItem.id}-retail-${spoolIndex + 1}-${Date.now()}`,
          packagingType: 'retail',
          brand: pallet.brand,
          diameterInch: pallet.diameterInch,
          thicknessMm: pallet.thicknessMm,
          quantity: 1,
          unitWeightKg: openedWeight,
          totalWeightKg: openedWeight,
          notes: `مس باز شده / خورده (باز شده از قرقره ق${spoolIndex + 1} پالت #${pallet.palletIndex})`,
        };

        updatedCargoItems.push(...looseItems, retailItem);
      } else {
        updatedCargoItems.push(cargoItem);
      }
    }

    return {
      ...consignment,
      items: updatedCargoItems,
    };
  });

  if (!updated) {
    // Fallback: create fresh entry for the dismantled loose items + retail item
    const looseItems: WarehouseCargoItem[] = remainingWeights.map((w, idx) => ({
      id: `loose-${pallet.id}-${idx + 1}-${Date.now()}`,
      packagingType: 'spool',
      spoolType: 'non_pallet',
      brand: pallet.brand,
      diameterInch: pallet.diameterInch,
      thicknessMm: pallet.thicknessMm,
      quantity: 1,
      unitWeightKg: w,
      totalWeightKg: w,
      spoolWeights: [w],
      spoolCondition: 'sealed',
      sourcePalletInfo: `باقی‌مانده تفکیک پالت #${pallet.palletIndex}`,
      notes: `قرقره غیرپالتی باقی‌مانده از پالت #${pallet.palletIndex}`,
    }));

    const retailItem: WarehouseCargoItem = {
      id: `retail-${pallet.id}-${spoolIndex + 1}-${Date.now()}`,
      packagingType: 'retail',
      brand: pallet.brand,
      diameterInch: pallet.diameterInch,
      thicknessMm: pallet.thicknessMm,
      quantity: 1,
      unitWeightKg: openedWeight,
      totalWeightKg: openedWeight,
      notes: `مس باز شده / خورده (باز شده از قرقره ق${spoolIndex + 1} پالت #${pallet.palletIndex})`,
    };

    const newDoc: WarehouseItem = {
      id: `wh-opened-${pallet.id}-${Date.now()}`,
      entryType: 'inbound',
      referenceDocNumber: `OPEN-P#${pallet.palletIndex}-S#${spoolIndex + 1}`,
      date: new Date().toLocaleDateString('fa-IR'),
      targetPartyName: `باز کردن قرقره از پالت #${pallet.palletIndex}`,
      registeredBy: 'انباردار مس واته',
      notes: `باز کردن قرقره ق${spoolIndex + 1} از پالت #${pallet.palletIndex} و انتقال به خورده‌ها`,
      createdAt: new Date().toISOString(),
      items: [...looseItems, retailItem],
      totalWeightKg: pallet.totalWeightKg,
      totalItemsCount: looseItems.length + 1,
    };

    const finalItems = [newDoc, ...allItems];
    saveWarehouseItems(finalItems);
    return finalItems;
  }

  saveWarehouseItems(newItems);
  return newItems;
}

/**
 * Opens a loose spool and moves its full weight to retail copper (خورده‌ها).
 */
export function openLooseSpoolToRetail(
  looseSpool: LooseSpoolRef
): WarehouseItem[] {
  const allItems = getStoredWarehouseItems();
  let updated = false;

  const newItems = allItems.map((consignment) => {
    if (consignment.id !== looseSpool.consignmentId) return consignment;

    const updatedCargoItems: WarehouseCargoItem[] = [];

    for (const cargoItem of consignment.items || []) {
      if (cargoItem.id === looseSpool.cargoItemId) {
        updated = true;
        // Convert to retail (خورده‌ها)
        const retailItem: WarehouseCargoItem = {
          id: `${cargoItem.id}-retail-${Date.now()}`,
          packagingType: 'retail',
          brand: looseSpool.brand,
          diameterInch: looseSpool.diameterInch,
          thicknessMm: looseSpool.thicknessMm,
          quantity: 1,
          unitWeightKg: looseSpool.totalWeightKg,
          totalWeightKg: looseSpool.totalWeightKg,
          notes: `مس باز شده / خورده (تبدیل شده از قرقره آزاد ${looseSpool.brand})`,
        };
        updatedCargoItems.push(retailItem);
      } else {
        updatedCargoItems.push(cargoItem);
      }
    }

    return {
      ...consignment,
      items: updatedCargoItems,
    };
  });

  if (!updated) {
    const retailItem: WarehouseCargoItem = {
      id: `retail-${looseSpool.id}-${Date.now()}`,
      packagingType: 'retail',
      brand: looseSpool.brand,
      diameterInch: looseSpool.diameterInch,
      thicknessMm: looseSpool.thicknessMm,
      quantity: 1,
      unitWeightKg: looseSpool.totalWeightKg,
      totalWeightKg: looseSpool.totalWeightKg,
      notes: `مس باز شده / خورده (تبدیل شده از قرقره آزاد ${looseSpool.brand})`,
    };

    const newDoc: WarehouseItem = {
      id: `wh-retail-${looseSpool.id}-${Date.now()}`,
      entryType: 'inbound',
      referenceDocNumber: `RETAIL-${Date.now()}`,
      date: new Date().toLocaleDateString('fa-IR'),
      targetPartyName: 'تبدیل قرقره به خورده‌ها',
      registeredBy: 'انباردار مس واته',
      notes: 'باز کردن قرقره آزاد و انتقال به خورده‌ها',
      createdAt: new Date().toISOString(),
      items: [retailItem],
      totalWeightKg: looseSpool.totalWeightKg,
      totalItemsCount: 1,
    };

    const finalItems = [newDoc, ...allItems];
    saveWarehouseItems(finalItems);
    return finalItems;
  }

  saveWarehouseItems(newItems);
  return newItems;
}

/**
 * Breaks pallets where only a partial set of spools was selected for sale/exit.
 * The unselected spools become loose spools in warehouse storage.
 * The pallet is deleted from the pallets list.
 */
export function processPalletDismantlingOnSale(
  palletSpoolSelections: Map<string, number[]>, // palletId -> array of selected spool indices
  palletCards: PalletCardRef[]
): WarehouseItem[] {
  let items = getStoredWarehouseItems();

  for (const [palletId, selectedIndices] of palletSpoolSelections.entries()) {
    const pallet = palletCards.find((p) => p.id === palletId);
    if (!pallet) continue;

    // If ALL spools were selected, the entire pallet was sold as a whole; no dismantling required
    if (selectedIndices.length === pallet.spoolWeights.length) {
      continue;
    }

    // Partial selection: Pallet must be dismantled!
    // The unselected spools remain in warehouse as loose spools.
    const unselectedWeights = pallet.spoolWeights.filter(
      (_, idx) => !selectedIndices.includes(idx)
    );

    if (unselectedWeights.length > 0) {
      // Create loose spools for remaining unselected weights
      const looseItems: WarehouseCargoItem[] = unselectedWeights.map((w, idx) => ({
        id: `remaining-${pallet.id}-${idx + 1}-${Date.now()}`,
        packagingType: 'spool',
        spoolType: 'non_pallet',
        brand: pallet.brand,
        diameterInch: pallet.diameterInch,
        thicknessMm: pallet.thicknessMm,
        quantity: 1,
        unitWeightKg: w,
        totalWeightKg: w,
        spoolWeights: [w],
        spoolCondition: 'sealed',
        sourcePalletInfo: `باقی‌مانده تفکیک پالت #${pallet.palletIndex} (${pallet.brand})`,
        notes: `قرقره آزاد باقی‌مانده از تفکیک و فروش پالت #${pallet.palletIndex}`,
      }));

      // Find and remove/replace the original pallet cargo item
      let replaced = false;
      items = items.map((consignment) => {
        if (consignment.id !== pallet.consignmentId) return consignment;

        const filteredCargo = (consignment.items || []).filter(
          (c) => c.id !== pallet.cargoItemId
        );
        replaced = true;
        return {
          ...consignment,
          items: [...filteredCargo, ...looseItems],
        };
      });

      if (!replaced) {
        const remainingDoc: WarehouseItem = {
          id: `wh-remaining-${pallet.id}-${Date.now()}`,
          entryType: 'inbound',
          referenceDocNumber: `REMAIN-P#${pallet.palletIndex}`,
          date: new Date().toLocaleDateString('fa-IR'),
          targetPartyName: `تفکیک پالت #${pallet.palletIndex}`,
          registeredBy: 'انباردار مس واته',
          notes: `قرقره‌های باقی‌مانده از تفکیک پالت #${pallet.palletIndex}`,
          createdAt: new Date().toISOString(),
          items: looseItems,
          totalWeightKg: unselectedWeights.reduce((a, b) => a + b, 0),
          totalItemsCount: looseItems.length,
        };
        items = [remainingDoc, ...items];
      }
    }
  }

  saveWarehouseItems(items);
  return items;
}

/**
 * Restores a loose spool back into its parent pallet (or recreates the pallet).
 */
export function restoreLooseSpoolToPallet(
  looseItemId: string,
  targetPalletIndex?: number
): WarehouseItem[] {
  const allItems = getStoredWarehouseItems();
  let looseItemFound: WarehouseCargoItem | null = null;
  let parentConsignmentId: string | null = null;

  // 1. Locate the loose item
  for (const consignment of allItems) {
    for (const item of consignment.items || []) {
      if (item.id === looseItemId) {
        looseItemFound = item;
        parentConsignmentId = consignment.id;
        break;
      }
    }
    if (looseItemFound) break;
  }

  if (!looseItemFound || !parentConsignmentId) return allItems;

  const spoolWeight = looseItemFound.unitWeightKg || looseItemFound.totalWeightKg || 0;
  let palletIndex = targetPalletIndex;
  if (!palletIndex && looseItemFound.sourcePalletInfo) {
    const match = looseItemFound.sourcePalletInfo.match(/#(\d+)/);
    if (match) palletIndex = parseInt(match[1], 10);
  }
  if (!palletIndex) palletIndex = 1;

  // 2. Look for existing pallet with matching brand, diameter, thickness & palletIndex
  let palletRestored = false;
  const updatedItems = allItems.map((consignment) => {
    // Remove the loose item
    const remainingCargo = (consignment.items || []).filter((c) => c.id !== looseItemId);

    // Check if an existing pallet exists here to absorb the spool
    const modifiedCargo = remainingCargo.map((c) => {
      if (
        c.packagingType === 'spool' &&
        c.spoolType === 'pallet' &&
        c.palletIndex === palletIndex &&
        c.brand === looseItemFound!.brand
      ) {
        palletRestored = true;
        const currentWeights = c.spoolWeights || [];
        const newWeights = [...currentWeights, spoolWeight];
        return {
          ...c,
          quantity: newWeights.length,
          spoolsCount: newWeights.length,
          spoolWeights: newWeights,
          totalWeightKg: newWeights.reduce((a, b) => a + b, 0),
          isFullStandardPallet: newWeights.length >= 5,
        };
      }
      return c;
    });

    return {
      ...consignment,
      items: modifiedCargo,
    };
  });

  // 3. If no existing pallet was found to absorb it, recreate the pallet in the consignment
  if (!palletRestored) {
    const finalItems = updatedItems.map((consignment) => {
      if (consignment.id === parentConsignmentId) {
        const newPalletItem: WarehouseCargoItem = {
          id: `restored-pallet-${palletIndex}-${Date.now()}`,
          packagingType: 'spool',
          spoolType: 'pallet',
          palletIndex: palletIndex!,
          brand: looseItemFound!.brand,
          diameterInch: looseItemFound!.diameterInch,
          thicknessMm: looseItemFound!.thicknessMm,
          quantity: 1,
          spoolsCount: 1,
          unitWeightKg: spoolWeight,
          totalWeightKg: spoolWeight,
          spoolWeights: [spoolWeight],
          isFullStandardPallet: false,
          notes: `پالت بازگردانی شده شماره #${palletIndex}`,
        };

        return {
          ...consignment,
          items: [newPalletItem, ...(consignment.items || [])],
        };
      }
      return consignment;
    });

    saveWarehouseItems(finalItems);
    return finalItems;
  }

  saveWarehouseItems(updatedItems);
  return updatedItems;
}

/**
 * Restores a retail item back to a loose spool or pallet.
 */
const PALLET_SPLIT_HISTORY_KEY = 'waateh_pallet_split_history_v1';

export function savePalletSplitSnapshot(snapshot: WarehouseItem[]): void {
  try {
    const raw = localStorage.getItem(PALLET_SPLIT_HISTORY_KEY);
    const list: WarehouseItem[][] = raw ? JSON.parse(raw) : [];
    list.push(snapshot);
    // Keep up to 10 latest snapshots
    if (list.length > 10) list.shift();
    localStorage.setItem(PALLET_SPLIT_HISTORY_KEY, JSON.stringify(list));
  } catch (e) {}
}

export function hasPalletSplitHistory(): boolean {
  try {
    const raw = localStorage.getItem(PALLET_SPLIT_HISTORY_KEY);
    const list: WarehouseItem[][] = raw ? JSON.parse(raw) : [];
    return list.length > 0;
  } catch {
    return false;
  }
}

export function undoLastPalletSplit(): WarehouseItem[] | null {
  try {
    const raw = localStorage.getItem(PALLET_SPLIT_HISTORY_KEY);
    const list: WarehouseItem[][] = raw ? JSON.parse(raw) : [];
    if (list.length === 0) return null;
    const lastState = list.pop();
    localStorage.setItem(PALLET_SPLIT_HISTORY_KEY, JSON.stringify(list));
    if (lastState && Array.isArray(lastState)) {
      saveWarehouseItems(lastState);
      return lastState;
    }
  } catch (e) {}
  return null;
}

/**
 * Opens multiple specified spools from a pallet to retail copper (خورده‌ها),
 * and moves any unselected remaining spools to loose non-pallet spools.
 */
export function openMultipleSpoolsToRetailFromPallet(
  pallet: PalletCardRef,
  spoolIndices: number[]
): WarehouseItem[] {
  const allItems = getStoredWarehouseItems();
  savePalletSplitSnapshot(allItems);

  const selectedWeights = spoolIndices.map((idx) => pallet.spoolWeights[idx] || 0);
  const remainingWeights = pallet.spoolWeights.filter((_, idx) => !spoolIndices.includes(idx));

  let updated = false;

  const newItems = allItems.map((consignment) => {
    if (consignment.id !== pallet.consignmentId) return consignment;

    const updatedCargoItems: WarehouseCargoItem[] = [];

    for (const cargoItem of consignment.items || []) {
      if (cargoItem.id === pallet.cargoItemId) {
        updated = true;

        // 1. Remaining spools become loose spools
        const looseItems: WarehouseCargoItem[] = remainingWeights.map((w, idx) => ({
          id: `${cargoItem.id}-loose-${idx + 1}-${Date.now()}`,
          packagingType: 'spool',
          spoolType: 'non_pallet',
          brand: pallet.brand,
          diameterInch: pallet.diameterInch,
          thicknessMm: pallet.thicknessMm,
          quantity: 1,
          unitWeightKg: w,
          totalWeightKg: w,
          spoolWeights: [w],
          spoolCondition: 'sealed',
          sourcePalletInfo: `باقی‌مانده تفکیک پالت #${pallet.palletIndex}`,
          notes: `قرقره غیرپالتی باقی‌مانده از پالت #${pallet.palletIndex}`,
        }));

        // 2. The selected spools become retail (خورده‌ها) items
        const retailItems: WarehouseCargoItem[] = selectedWeights.map((w, idx) => ({
          id: `${cargoItem.id}-retail-${spoolIndices[idx] + 1}-${Date.now() + idx}`,
          packagingType: 'retail',
          brand: pallet.brand,
          diameterInch: pallet.diameterInch,
          thicknessMm: pallet.thicknessMm,
          quantity: 1,
          unitWeightKg: w,
          totalWeightKg: w,
          notes: `مس باز شده / خورده (باز شده از قرقره ق${spoolIndices[idx] + 1} پالت #${pallet.palletIndex})`,
        }));

        updatedCargoItems.push(...looseItems, ...retailItems);
      } else {
        updatedCargoItems.push(cargoItem);
      }
    }

    return {
      ...consignment,
      items: updatedCargoItems,
    };
  });

  if (!updated) {
    const looseItems: WarehouseCargoItem[] = remainingWeights.map((w, idx) => ({
      id: `loose-${pallet.id}-${idx + 1}-${Date.now()}`,
      packagingType: 'spool',
      spoolType: 'non_pallet',
      brand: pallet.brand,
      diameterInch: pallet.diameterInch,
      thicknessMm: pallet.thicknessMm,
      quantity: 1,
      unitWeightKg: w,
      totalWeightKg: w,
      spoolWeights: [w],
      spoolCondition: 'sealed',
      sourcePalletInfo: `باقی‌مانده تفکیک پالت #${pallet.palletIndex}`,
      notes: `قرقره غیرپالتی باقی‌مانده از پالت #${pallet.palletIndex}`,
    }));

    const retailItems: WarehouseCargoItem[] = selectedWeights.map((w, idx) => ({
      id: `retail-${pallet.id}-${spoolIndices[idx] + 1}-${Date.now() + idx}`,
      packagingType: 'retail',
      brand: pallet.brand,
      diameterInch: pallet.diameterInch,
      thicknessMm: pallet.thicknessMm,
      quantity: 1,
      unitWeightKg: w,
      totalWeightKg: w,
      notes: `مس باز شده / خورده (باز شده از قرقره ق${spoolIndices[idx] + 1} پالت #${pallet.palletIndex})`,
    }));

    const newDoc: WarehouseItem = {
      id: `wh-opened-${pallet.id}-${Date.now()}`,
      entryType: 'inbound',
      referenceDocNumber: `OPEN-P#${pallet.palletIndex}`,
      date: new Date().toLocaleDateString('fa-IR'),
      targetPartyName: `تفکیک قرقره‌ها از پالت #${pallet.palletIndex}`,
      registeredBy: 'انباردار مس واته',
      notes: `تفکیک ${toFaDigits(spoolIndices.length)} قرقره از پالت #${pallet.palletIndex}`,
      createdAt: new Date().toISOString(),
      items: [...looseItems, ...retailItems],
      totalWeightKg: pallet.totalWeightKg,
      totalItemsCount: looseItems.length + retailItems.length,
    };

    const finalItems = [newDoc, ...allItems];
    saveWarehouseItems(finalItems);
    return finalItems;
  }

  saveWarehouseItems(newItems);
  return newItems;
}

/**
 * Deducts selected items sold directly from warehouse stock:
 * 1. If full pallets sold: remove the pallets.
 * 2. If partial spools in pallet sold: remove selected spools, move remaining unselected spools to loose spools.
 * 3. If loose spools sold: remove sold loose spools.
 * 4. If retail sold: reduce or remove retail item.
 */
export function executeDirectSaleStockDeduction(params: {
  selectedPalletSpools?: Map<string, { pallet: PalletCardRef; selectedIndices: number[] }>;
  selectedLooseSpools?: LooseSpoolRef[];
  selectedRetailItems?: RetailItemRef[];
  notes?: string;
}): WarehouseItem[] {
  let items = getStoredWarehouseItems();
  savePalletSplitSnapshot(items);

  // 1. Process Pallets & Partial Spools
  if (params.selectedPalletSpools && params.selectedPalletSpools.size > 0) {
    for (const [_, { pallet, selectedIndices }] of params.selectedPalletSpools.entries()) {
      const isFullPalletSold = selectedIndices.length === pallet.spoolWeights.length;

      if (isFullPalletSold) {
        // Remove entire pallet cargo item
        items = items.map((c) => {
          if (c.id !== pallet.consignmentId) return c;
          return {
            ...c,
            items: (c.items || []).filter((item) => item.id !== pallet.cargoItemId),
          };
        });
      } else {
        // Partial sale: Remaining unselected spools become loose spools
        const remainingWeights = pallet.spoolWeights.filter((_, idx) => !selectedIndices.includes(idx));
        
        const remainingLoose: WarehouseCargoItem[] = remainingWeights.map((w, idx) => ({
          id: `${pallet.cargoItemId}-rem-loose-${idx + 1}-${Date.now()}`,
          packagingType: 'spool',
          spoolType: 'non_pallet',
          brand: pallet.brand,
          diameterInch: pallet.diameterInch,
          thicknessMm: pallet.thicknessMm,
          quantity: 1,
          unitWeightKg: w,
          totalWeightKg: w,
          spoolWeights: [w],
          spoolCondition: 'sealed',
          sourcePalletInfo: `باقی‌مانده فروش پالت #${pallet.palletIndex}`,
          notes: `قرقره آزاد باقی‌مانده پس از فروش پالت #${pallet.palletIndex}`,
        }));

        items = items.map((c) => {
          if (c.id !== pallet.consignmentId) return c;
          const otherCargo = (c.items || []).filter((item) => item.id !== pallet.cargoItemId);
          return {
            ...c,
            items: [...otherCargo, ...remainingLoose],
          };
        });
      }
    }
  }

  // 2. Process Loose Spools sold
  if (params.selectedLooseSpools && params.selectedLooseSpools.length > 0) {
    const looseCargoIds = new Set(params.selectedLooseSpools.map((l) => l.cargoItemId || l.id));
    items = items.map((c) => ({
      ...c,
      items: (c.items || []).filter((item) => !looseCargoIds.has(item.id)),
    }));
  }

  // 3. Process Retail Items sold
  if (params.selectedRetailItems && params.selectedRetailItems.length > 0) {
    const retailCargoIds = new Set(params.selectedRetailItems.map((r) => r.cargoItemId || r.id));
    items = items.map((c) => ({
      ...c,
      items: (c.items || []).filter((item) => !retailCargoIds.has(item.id)),
    }));
  }

  // Clean empty consignments if any
  const cleanedItems = items.filter((c) => (c.items && c.items.length > 0) || c.entryType === 'outbound');
  saveWarehouseItems(cleanedItems);
  return cleanedItems;
}

export interface MachineTransferParams {
  selectedPalletSpools?: Map<string, { pallet: PalletCardRef; selectedIndices: number[] }>;
  selectedLooseSpools?: LooseSpoolRef[];
  selectedRetailItems?: RetailItemRef[];
  machineName: string;
  notes: string;
}

/**
 * Transfers selected spools/pallets/items from standard saleable warehouse stock
 * into the Machine Production / Factory Consumption stock section.
 */
export function transferSelectedToMachineProduction(params: MachineTransferParams): WarehouseItem[] {
  let items = getStoredWarehouseItems();
  const transferredAt = new Date().toLocaleDateString('fa-IR');
  const machineCargoItems: WarehouseCargoItem[] = [];

  // 1. Process Pallet Spools selected for machine
  if (params.selectedPalletSpools) {
    for (const [_, { pallet, selectedIndices }] of params.selectedPalletSpools.entries()) {
      if (selectedIndices.length === 0) continue;

      const selectedSpoolWeights = selectedIndices.map((idx) => pallet.spoolWeights[idx] || 0);

      // Create machine cargo items for selected spools
      selectedSpoolWeights.forEach((w, idx) => {
        machineCargoItems.push({
          id: `machine-spool-${pallet.id}-${selectedIndices[idx]}-${Date.now()}-${Math.random()}`,
          packagingType: 'spool',
          spoolType: 'non_pallet',
          brand: pallet.brand,
          diameterInch: pallet.diameterInch,
          thicknessMm: pallet.thicknessMm,
          quantity: 1,
          unitWeightKg: w,
          totalWeightKg: w,
          spoolWeights: [w],
          spoolCondition: 'opened',
          isMachineProduction: true,
          machineName: params.machineName || 'دستگاه اواپراتور',
          machineNotes: params.notes || 'برای استفاده دستگاه اواپراتور بوده است',
          transferredToMachineAt: transferredAt,
          sourcePalletInfo: `انتقال یافته از پالت #${pallet.palletIndex} (${pallet.brand})`,
          notes: params.notes || `برای استفاده ${params.machineName || 'دستگاه اواپراتور'} بوده است`,
        });
      });

      // Handle remaining spools on the pallet
      const isEntirePallet = selectedIndices.length === pallet.spoolWeights.length;
      if (isEntirePallet) {
        // Remove entire pallet cargo item
        items = items.map((c) => {
          if (c.id !== pallet.consignmentId) return c;
          return {
            ...c,
            items: (c.items || []).filter((item) => item.id !== pallet.cargoItemId),
          };
        });
      } else {
        // Remaining unselected spools become loose spools in sales warehouse
        const remainingWeights = pallet.spoolWeights.filter((_, idx) => !selectedIndices.includes(idx));
        const remainingLoose: WarehouseCargoItem[] = remainingWeights.map((w, idx) => ({
          id: `${pallet.cargoItemId}-rem-loose-${idx + 1}-${Date.now()}`,
          packagingType: 'spool',
          spoolType: 'non_pallet',
          brand: pallet.brand,
          diameterInch: pallet.diameterInch,
          thicknessMm: pallet.thicknessMm,
          quantity: 1,
          unitWeightKg: w,
          totalWeightKg: w,
          spoolWeights: [w],
          spoolCondition: 'sealed',
          sourcePalletInfo: `باقی‌مانده انتقال پالت #${pallet.palletIndex} به دستگاه`,
          notes: `قرقره آزاد باقی‌مانده پس از انتقال به دستگاه ${params.machineName}`,
        }));

        items = items.map((c) => {
          if (c.id !== pallet.consignmentId) return c;
          const otherCargo = (c.items || []).filter((item) => item.id !== pallet.cargoItemId);
          return {
            ...c,
            items: [...otherCargo, ...remainingLoose],
          };
        });
      }
    }
  }

  // 2. Process Loose Spools selected for machine
  if (params.selectedLooseSpools && params.selectedLooseSpools.length > 0) {
    const looseCargoIds = new Set(params.selectedLooseSpools.map((l) => l.cargoItemId || l.id));
    items = items.map((c) => ({
      ...c,
      items: (c.items || []).map((item) => {
        if (looseCargoIds.has(item.id)) {
          return {
            ...item,
            isMachineProduction: true,
            machineName: params.machineName || 'دستگاه اواپراتور',
            machineNotes: params.notes || 'برای استفاده دستگاه اواپراتور بوده است',
            transferredToMachineAt: transferredAt,
            notes: params.notes || `برای استفاده ${params.machineName || 'دستگاه اواپراتور'} بوده است`,
          };
        }
        return item;
      }),
    }));
  }

  // 3. Process Retail Items selected for machine
  if (params.selectedRetailItems && params.selectedRetailItems.length > 0) {
    const retailCargoIds = new Set(params.selectedRetailItems.map((r) => r.cargoItemId || r.id));
    items = items.map((c) => ({
      ...c,
      items: (c.items || []).map((item) => {
        if (retailCargoIds.has(item.id)) {
          return {
            ...item,
            isMachineProduction: true,
            machineName: params.machineName || 'دستگاه اواپراتور',
            machineNotes: params.notes || 'برای استفاده دستگاه اواپراتور بوده است',
            transferredToMachineAt: transferredAt,
            notes: params.notes || `برای استفاده ${params.machineName || 'دستگاه اواپراتور'} بوده است`,
          };
        }
        return item;
      }),
    }));
  }

  // If new machine cargo items were created from pallets, add them as a new inbound machine consignment
  if (machineCargoItems.length > 0) {
    const totalMachineW = machineCargoItems.reduce((sum, item) => sum + item.totalWeightKg, 0);
    const newDoc: WarehouseItem = {
      id: `wh-machine-${Date.now()}`,
      entryType: 'inbound',
      referenceDocNumber: `MAC-${params.machineName || 'اواپراتور'}-${Math.floor(100 + Math.random() * 900)}`,
      date: transferredAt,
      targetPartyName: `خط تولید / ${params.machineName || 'دستگاه اواپراتور'}`,
      registeredBy: 'انباردار مس واته',
      notes: params.notes || `انتقال به ${params.machineName || 'دستگاه اواپراتور'}`,
      createdAt: new Date().toISOString(),
      items: machineCargoItems,
      totalWeightKg: totalMachineW,
      totalItemsCount: machineCargoItems.length,
    };
    items = [newDoc, ...items];
  }

  saveWarehouseItems(items);
  return items;
}

/**
 * Returns a machine production item back into standard saleable warehouse stock.
 */
export function returnFromMachineProduction(cargoItemId: string): WarehouseItem[] {
  let items = getStoredWarehouseItems();
  items = items.map((c) => ({
    ...c,
    items: (c.items || []).map((item) => {
      if (item.id === cargoItemId) {
        const { isMachineProduction, machineName, machineNotes, transferredToMachineAt, ...rest } = item;
        return {
          ...rest,
          isMachineProduction: false,
          notes: `بازگردانده شده از ${machineName || 'دستگاه'} به انبار فروش`,
        };
      }
      return item;
    }),
  }));

  saveWarehouseItems(items);
  return items;
}

