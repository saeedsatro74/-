import { pgTable, text, serial, timestamp, doublePrecision, integer, boolean } from 'drizzle-orm/pg-core';

// Mandatory users table linked to Firebase Auth UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// People (مشتریان و همکاران مس)
export const people = pgTable('people', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  nationalId: text('national_id'),
  initialCopperBalanceKg: doublePrecision('initial_copper_balance_kg').default(0),
  role: text('role').default('customer'),
  notes: text('notes'),
  isDeleted: boolean('is_deleted').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Transactions (تراکنش‌های خرید و فروش مس و تسویه)
export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  personId: text('person_id').notNull(),
  type: text('type').notNull(), // 'buy' | 'sell' | 'deposit' | 'withdraw'
  copperWeightKg: doublePrecision('copper_weight_kg').notNull(),
  pricePerKgToman: doublePrecision('price_per_kg_toman').default(0),
  totalToman: doublePrecision('total_toman').default(0),
  trackingCode: text('tracking_code'),
  date: text('date').notNull(),
  description: text('description'),
  paymentStatus: text('payment_status').default('completed'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Warehouse Inventory Items (اقلام انبار مس: پالت، قرقره، کلاف، شاخه، خورده)
export const warehouseItems = pgTable('warehouse_items', {
  id: text('id').primaryKey(),
  consignmentId: text('consignment_id').notNull(),
  type: text('type').notNull(), // 'inbound' | 'outbound'
  packagingType: text('packaging_type').notNull(), // 'pallet' | 'loose_spool' | 'coil' | 'straight' | 'retail'
  brand: text('brand').notNull(),
  diameterInch: text('diameter_inch'),
  thicknessMm: doublePrecision('thickness_mm'),
  quantity: integer('quantity').default(1),
  totalWeightKg: doublePrecision('total_weight_kg').notNull(),
  netWeightKg: doublePrecision('net_weight_kg'),
  spoolPackagingType: text('spool_packaging_type'),
  spoolWeightsJson: text('spool_weights_json'), // Array of spool weights in JSON
  coilLengthType: text('coil_length_type'),
  pipePurityPercent: text('pipe_purity_percent'),
  isCustomBadge: text('is_custom_badge'),
  referenceDocNumber: text('reference_doc_number'),
  driverName: text('driver_name'),
  vehiclePlate: text('vehicle_plate'),
  targetPartyName: text('target_party_name'),
  date: text('date').notNull(),
  notes: text('notes'),
  isDepalletized: boolean('is_depalletized').default(false),
  sourcePalletInfo: text('source_pallet_info'),
  spoolCondition: text('spool_condition'), // 'sealed' | 'opened'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Key-Value App Settings (قیمت‌های بازار مس، حساب‌های بانکی شرکت و سایر تنظیمات عمومی)
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
