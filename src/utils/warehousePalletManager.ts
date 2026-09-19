import { WarehouseItem, WarehouseCargoItem } from '../types';
import { getStoredWarehouseItems, saveWarehouseItems } from './storage';

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
export function restoreRetailToSpoolOrPallet(
  retailItemId: string
): WarehouseItem[] {
  const allItems = getStoredWarehouseItems();
  let retailFound: WarehouseCargoItem | null = null;
  let parentConsignmentId: string | null = null;

  for (const consignment of allItems) {
    for (const item of consignment.items || []) {
      if (item.id === retailItemId) {
        retailFound = item;
        parentConsignmentId = consignment.id;
        break;
      }
    }
    if (retailFound) break;
  }

  if (!retailFound || !parentConsignmentId) return allItems;

  const restoredWeight = retailFound.totalWeightKg || retailFound.unitWeightKg || 0;

  // Convert the retail item back into a loose spool (or return to pallet)
  const updatedItems = allItems.map((consignment) => {
    if (consignment.id !== parentConsignmentId) return consignment;

    const newCargo: WarehouseCargoItem[] = [];
    for (const c of consignment.items || []) {
      if (c.id === retailItemId) {
        // Recreate as a non-pallet loose spool
        newCargo.push({
          id: `restored-spool-${Date.now()}`,
          packagingType: 'spool',
          spoolType: 'non_pallet',
          brand: retailFound!.brand,
          diameterInch: retailFound!.diameterInch,
          thicknessMm: retailFound!.thicknessMm,
          quantity: 1,
          unitWeightKg: restoredWeight,
          totalWeightKg: restoredWeight,
          spoolWeights: [restoredWeight],
          spoolCondition: 'sealed',
          sourcePalletInfo: 'بازگردانی شده از خورده‌ها',
          notes: `قرقره بازگردانی شده از بخش خورده‌ها (${retailFound!.brand})`,
        });
      } else {
        newCargo.push(c);
      }
    }

    return {
      ...consignment,
      items: newCargo,
    };
  });

  saveWarehouseItems(updatedItems);
  return updatedItems;
}
