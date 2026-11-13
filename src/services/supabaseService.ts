import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import {
  VendingMachine,
  Product,
  PurchaseBatch,
  RestockSession,
  MaintenanceRecord,
  FixedCost,
  TrackedSpiralRecord,
  CoffeeDosagePreset
} from '../types';

export interface FullVendingData {
  machines: VendingMachine[];
  products: Product[];
  purchases: PurchaseBatch[];
  restockHistory: RestockSession[];
  maintenances: MaintenanceRecord[];
  fixedCosts: FixedCost[];
  trackedSpirals: TrackedSpiralRecord[];
  dosagePresets: CoffeeDosagePreset[];
  lastUpdated?: string;
}

// -------------------------------------------------------------
// Mapping Helpers (CamelCase <-> snake_case)
// -------------------------------------------------------------

function mapMachineToRow(m: VendingMachine) {
  return {
    id: m.id,
    code: m.code,
    name: m.name,
    type: m.type,
    address: m.address || '',
    zone: m.zone || '',
    coordinates: m.coordinates || { lat: 0, lng: 0, x: 50, y: 50 },
    status: m.status,
    slots: m.slots || [],
    cash_balance: m.cashBalance || 0,
    pos_balance: m.posBalance || 0,
    last_restock_date: m.lastRestockDate || '',
    coffee_counter_current: m.coffeeCounterCurrent || 0,
    coffee_counter_last_restock: m.coffeeCounterLastRestock || 0,
    updated_at: new Date().toISOString(),
  };
}

function mapRowToMachine(row: any): VendingMachine {
  return {
    id: row.id,
    code: row.code || '',
    name: row.name || '',
    type: row.type || 'snack_bevande',
    address: row.address || '',
    zone: row.zone || '',
    coordinates: row.coordinates || { lat: 0, lng: 0, x: 50, y: 50 },
    status: row.status || 'operativo',
    slots: Array.isArray(row.slots) ? row.slots : [],
    cashBalance: Number(row.cash_balance) || 0,
    posBalance: Number(row.pos_balance) || 0,
    lastRestockDate: row.last_restock_date || '',
    coffeeCounterCurrent: Number(row.coffee_counter_current) || 0,
    coffeeCounterLastRestock: Number(row.coffee_counter_last_restock) || 0,
  };
}

function mapProductToRow(p: Product) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    unit_cost: p.unitCost,
    default_price: p.defaultPrice,
    unit: p.unit || 'pz',
    warehouse_stock: p.warehouseStock ?? 0,
    warehouse_alert_threshold: p.warehouseAlertThreshold ?? 5,
    active_batch_id: p.activeBatchId || null,
    image_url: p.imageUrl || null,
    description: p.description || '',
    coffee_config: p.coffeeConfig || null,
    updated_at: new Date().toISOString(),
  };
}

function mapRowToProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name || 'Prodotto',
    category: row.category || 'bevande_fredde',
    unitCost: Number(row.unit_cost) || 0,
    defaultPrice: Number(row.default_price) || 0,
    unit: row.unit || 'pz',
    warehouseStock: Number(row.warehouse_stock) || 0,
    warehouseAlertThreshold: Number(row.warehouse_alert_threshold) || 5,
    activeBatchId: row.active_batch_id || undefined,
    imageUrl: row.image_url || undefined,
    description: row.description || undefined,
    coffeeConfig: row.coffee_config || undefined,
  };
}

function mapPurchaseToRow(b: PurchaseBatch) {
  return {
    id: b.id,
    date: b.date,
    batch_number: b.batchNumber,
    product_id: b.productId,
    product_name: b.productName,
    supplier: b.supplier,
    package_count: b.packageCount,
    units_per_package: b.unitsPerPackage,
    total_units: b.totalUnits,
    remaining_units: b.remainingUnits,
    price_input_type: b.priceInputType,
    is_price_without_vat: b.isPriceWithoutVat ?? false,
    input_price: b.inputPrice,
    vat_rate: b.vatRate,
    total_taxable: b.totalTaxable,
    total_vat: b.totalVat,
    total_gross: b.totalGross,
    unit_cost_net: b.unitCostNet,
    unit_cost_with_vat: b.unitCostWithVat,
    cost_basis_used: b.costBasisUsed,
    invoice_ref: b.invoiceRef || '',
    notes: b.notes || '',
    expiry_date: b.expiryDate || '',
    updated_at: new Date().toISOString(),
  };
}

function mapRowToPurchase(row: any): PurchaseBatch {
  return {
    id: row.id,
    date: row.date || '',
    batchNumber: row.batch_number || '',
    productId: row.product_id || '',
    productName: row.product_name || '',
    supplier: row.supplier || '',
    packageCount: Number(row.package_count) || 1,
    unitsPerPackage: Number(row.units_per_package) || 1,
    totalUnits: Number(row.total_units) || 0,
    remainingUnits: Number(row.remaining_units) || 0,
    priceInputType: row.price_input_type || 'per_confezione',
    isPriceWithoutVat: Boolean(row.is_price_without_vat),
    inputPrice: Number(row.input_price) || 0,
    vatRate: Number(row.vat_rate) || 22,
    totalTaxable: Number(row.total_taxable) || 0,
    totalVat: Number(row.total_vat) || 0,
    totalGross: Number(row.total_gross) || 0,
    unitCostNet: Number(row.unit_cost_net) || 0,
    unitCostWithVat: Number(row.unit_cost_with_vat) || 0,
    costBasisUsed: row.cost_basis_used || 'netto',
    invoiceRef: row.invoice_ref || undefined,
    notes: row.notes || undefined,
    expiryDate: row.expiry_date || undefined,
  };
}

function mapRestockToRow(s: RestockSession) {
  return {
    id: s.id,
    machine_id: s.machineId,
    machine_name: s.machineName,
    machine_code: s.machineCode,
    timestamp: s.timestamp,
    items: s.items || [],
    total_sold: s.totalSold,
    total_revenue: s.totalRevenue,
    total_cost: s.totalCost,
    total_profit: s.totalProfit,
    cash_collected: s.cashCollected || 0,
    operator_notes: s.operatorNotes || '',
    coffee_counter_previous: s.coffeeCounterPrevious || 0,
    coffee_counter_current: s.coffeeCounterCurrent || 0,
    coffee_dispenses: s.coffeeDispenses || 0,
    updated_at: new Date().toISOString(),
  };
}

function mapRowToRestock(row: any): RestockSession {
  return {
    id: row.id,
    machineId: row.machine_id || '',
    machineName: row.machine_name || '',
    machineCode: row.machine_code || '',
    timestamp: row.timestamp || new Date().toISOString(),
    items: Array.isArray(row.items) ? row.items : [],
    totalSold: Number(row.total_sold) || 0,
    totalRevenue: Number(row.total_revenue) || 0,
    totalCost: Number(row.total_cost) || 0,
    totalProfit: Number(row.total_profit) || 0,
    cashCollected: Number(row.cash_collected) || 0,
    operatorNotes: row.operator_notes || '',
    coffeeCounterPrevious: Number(row.coffee_counter_previous) || 0,
    coffeeCounterCurrent: Number(row.coffee_counter_current) || 0,
    coffeeDispenses: Number(row.coffee_dispenses) || 0,
  };
}

function mapMaintenanceToRow(m: MaintenanceRecord) {
  return {
    id: m.id,
    machine_id: m.machineId,
    machine_name: m.machineName,
    type: m.type,
    date: m.date,
    note: m.note || '',
    component_name: m.componentName || '',
    cost: m.cost || 0,
    created_at: m.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function mapRowToMaintenance(row: any): MaintenanceRecord {
  return {
    id: row.id,
    machineId: row.machine_id || '',
    machineName: row.machine_name || '',
    type: row.type || 'manutenzione',
    date: row.date || '',
    note: row.note || undefined,
    componentName: row.component_name || undefined,
    cost: row.cost !== null ? Number(row.cost) : undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapFixedCostToRow(fc: FixedCost) {
  return {
    id: fc.id,
    name: fc.name,
    category: fc.category,
    amount: fc.amount,
    recurrence: fc.recurrence,
    date_added: fc.dateAdded,
    due_date: fc.dueDate || '',
    notes: fc.notes || '',
    auto_deduction: fc.autoDeduction ?? true,
    updated_at: new Date().toISOString(),
  };
}

function mapRowToFixedCost(row: any): FixedCost {
  return {
    id: row.id,
    name: row.name || '',
    category: row.category || 'bollette',
    amount: Number(row.amount) || 0,
    recurrence: row.recurrence || 'mensile',
    dateAdded: row.date_added || new Date().toISOString(),
    dueDate: row.due_date || undefined,
    notes: row.notes || undefined,
    autoDeduction: Boolean(row.auto_deduction),
  };
}

function mapTrackedSpiralToRow(t: TrackedSpiralRecord) {
  return {
    id: t.id,
    machine_id: t.machineId,
    machine_code: t.machineCode,
    machine_name: t.machineName,
    machine_type: t.machineType || null,
    slot_id: t.slotId,
    slot_label: t.label || '',
    product_id: t.productId,
    product_name: t.productName,
    product_category: t.productCategory || null,
    total_sold_pieces: t.totalUnitsSold || 0,
    total_revenue: t.totalRevenue || 0,
    total_cost: t.totalCost || 0,
    total_profit: t.totalProfit || 0,
    current_capacity: t.currentCapacity ?? null,
    current_stock: t.currentStock ?? null,
    current_sale_price: t.currentSalePrice ?? null,
    status: t.status || 'attiva',
    start_date: t.startDate || new Date().toISOString(),
    closed_date: t.closedDate || null,
    updated_at: new Date().toISOString(),
  };
}

function mapRowToTrackedSpiral(row: any): TrackedSpiralRecord {
  return {
    id: row.id,
    machineId: row.machine_id,
    machineCode: row.machine_code || '',
    machineName: row.machine_name || '',
    machineType: row.machine_type || undefined,
    slotId: row.slot_id,
    label: row.slot_label || '',
    productId: row.product_id,
    productName: row.product_name || '',
    productCategory: row.product_category || undefined,
    totalUnitsSold: Number(row.total_sold_pieces) || 0,
    totalRevenue: Number(row.total_revenue) || 0,
    totalCost: Number(row.total_cost) || 0,
    totalProfit: Number(row.total_profit) || 0,
    currentCapacity: row.current_capacity != null ? Number(row.current_capacity) : undefined,
    currentStock: row.current_stock != null ? Number(row.current_stock) : undefined,
    currentSalePrice: row.current_sale_price != null ? Number(row.current_sale_price) : undefined,
    status: row.status || 'attiva',
    startDate: row.start_date || new Date().toISOString(),
    closedDate: row.closed_date || undefined,
  };
}

function mapDosagePresetToRow(p: CoffeeDosagePreset) {
  return {
    id: p.id,
    name: p.name,
    grams_per_dose: p.gramsPerDose,
    icon: p.icon || '☕',
    package_grams: p.packageGrams || 1000,
    notes: p.notes || '',
    is_custom: p.isCustom ?? false,
    updated_at: new Date().toISOString(),
  };
}

function mapRowToDosagePreset(row: any): CoffeeDosagePreset {
  return {
    id: row.id,
    name: row.name || 'Preset',
    gramsPerDose: Number(row.grams_per_dose) || 7,
    icon: row.icon || '☕',
    packageGrams: Number(row.package_grams) || 1000,
    notes: row.notes || undefined,
    isCustom: Boolean(row.is_custom),
  };
}

// -------------------------------------------------------------
// Core Database Sync Operations
// -------------------------------------------------------------

export const loadAllFromSupabase = fetchFullDatabaseFromSupabase;

export async function fetchFullDatabaseFromSupabase(): Promise<{
  success: boolean;
  data?: FullVendingData;
  error?: string;
  source: 'tables' | 'snapshot' | 'none';
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, source: 'none', error: 'Supabase non configurato' };
  }

  try {
    // 1. Prova prima a recuperare da tabelle relazionali dedicate
    const [
      machinesRes,
      productsRes,
      purchasesRes,
      historyRes,
      maintenancesRes,
      fixedCostsRes,
      trackedSpiralsRes,
      dosagePresetsRes
    ] = await Promise.allSettled([
      supabase.from('vending_machines').select('*'),
      supabase.from('vending_products').select('*'),
      supabase.from('vending_purchases').select('*'),
      supabase.from('vending_restock_history').select('*'),
      supabase.from('vending_maintenances').select('*'),
      supabase.from('vending_fixed_costs').select('*'),
      supabase.from('vending_tracked_spirals').select('*'),
      supabase.from('vending_dosage_presets').select('*'),
    ]);

    const hasTables =
      machinesRes.status === 'fulfilled' && !machinesRes.value.error &&
      productsRes.status === 'fulfilled' && !productsRes.value.error;

    if (hasTables) {
      const machinesRows = (machinesRes as PromiseFulfilledResult<any>).value.data || [];
      const productsRows = (productsRes as PromiseFulfilledResult<any>).value.data || [];
      const purchasesRows = purchasesRes.status === 'fulfilled' && purchasesRes.value.data ? purchasesRes.value.data : [];
      const historyRows = historyRes.status === 'fulfilled' && historyRes.value.data ? historyRes.value.data : [];
      const maintenancesRows = maintenancesRes.status === 'fulfilled' && maintenancesRes.value.data ? maintenancesRes.value.data : [];
      const fixedCostsRows = fixedCostsRes.status === 'fulfilled' && fixedCostsRes.value.data ? fixedCostsRes.value.data : [];
      const trackedSpiralsRows = trackedSpiralsRes.status === 'fulfilled' && trackedSpiralsRes.value.data ? trackedSpiralsRes.value.data : [];
      const dosagePresetsRows = dosagePresetsRes.status === 'fulfilled' && dosagePresetsRes.value.data ? dosagePresetsRes.value.data : [];

      const resultData: FullVendingData = {
        machines: machinesRows.map(mapRowToMachine),
        products: productsRows.map(mapRowToProduct),
        purchases: purchasesRows.map(mapRowToPurchase),
        restockHistory: historyRows.map(mapRowToRestock),
        maintenances: maintenancesRows.map(mapRowToMaintenance),
        fixedCosts: fixedCostsRows.map(mapRowToFixedCost),
        trackedSpirals: trackedSpiralsRows.map(mapRowToTrackedSpiral),
        dosagePresets: dosagePresetsRows.map(mapRowToDosagePreset),
        lastUpdated: new Date().toISOString(),
      };

      return {
        success: true,
        data: resultData,
        source: 'tables',
      };
    }

    // 2. Fallback: Controlla se è presente la tabella vending_store_state (snapshot unificato)
    const stateRes = await supabase
      .from('vending_store_state')
      .select('state_json, updated_at')
      .eq('id', 'primary_store')
      .maybeSingle();

    if (stateRes.data && stateRes.data.state_json) {
      const snap = stateRes.data.state_json;
      return {
        success: true,
        data: {
          machines: snap.machines || [],
          products: snap.products || [],
          purchases: snap.purchases || [],
          restockHistory: snap.restockHistory || [],
          maintenances: snap.maintenances || [],
          fixedCosts: snap.fixedCosts || [],
          trackedSpirals: snap.trackedSpirals || [],
          dosagePresets: snap.dosagePresets || [],
          lastUpdated: stateRes.data.updated_at || new Date().toISOString(),
        },
        source: 'snapshot',
      };
    }

    return {
      success: false,
      source: 'none',
      error: 'Tabelle Supabase non ancora create o prive di permessi RLS',
    };
  } catch (err: any) {
    console.error('[Supabase] Errore fetch:', err);
    return {
      success: false,
      source: 'none',
      error: err?.message || 'Errore di rete durante la connessione a Supabase',
    };
  }
}

// -------------------------------------------------------------
// Singole Operazioni di Salvataggio su Supabase (Upsert / Delete)
// -------------------------------------------------------------

export async function saveMachineToSupabase(machine: VendingMachine) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('vending_machines').upsert(mapMachineToRow(machine));
  } catch (e) {
    console.warn('[Supabase] Upsert machine error:', e);
  }
}

export async function deleteMachineFromSupabase(machineId: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('vending_machines').delete().eq('id', machineId);
  } catch (e) {
    console.warn('[Supabase] Delete machine error:', e);
  }
}

export async function saveProductToSupabase(product: Product) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('vending_products').upsert(mapProductToRow(product));
  } catch (e) {
    console.warn('[Supabase] Upsert product error:', e);
  }
}

export async function deleteProductFromSupabase(productId: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('vending_products').delete().eq('id', productId);
  } catch (e) {
    console.warn('[Supabase] Delete product error:', e);
  }
}

export async function savePurchaseToSupabase(purchase: PurchaseBatch) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('vending_purchases').upsert(mapPurchaseToRow(purchase));
  } catch (e) {
    console.warn('[Supabase] Upsert purchase error:', e);
  }
}

export async function deletePurchaseFromSupabase(batchId: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('vending_purchases').delete().eq('id', batchId);
  } catch (e) {
    console.warn('[Supabase] Delete purchase error:', e);
  }
}

export async function saveRestockSessionToSupabase(session: RestockSession) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('vending_restock_history').upsert(mapRestockToRow(session));
  } catch (e) {
    console.warn('[Supabase] Upsert restock error:', e);
  }
}

export async function saveMaintenanceToSupabase(record: MaintenanceRecord) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('vending_maintenances').upsert(mapMaintenanceToRow(record));
  } catch (e) {
    console.warn('[Supabase] Upsert maintenance error:', e);
  }
}

export async function deleteMaintenanceFromSupabase(id: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('vending_maintenances').delete().eq('id', id);
  } catch (e) {
    console.warn('[Supabase] Delete maintenance error:', e);
  }
}

export async function saveFixedCostToSupabase(cost: FixedCost) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('vending_fixed_costs').upsert(mapFixedCostToRow(cost));
  } catch (e) {
    console.warn('[Supabase] Upsert fixed cost error:', e);
  }
}

export async function deleteFixedCostFromSupabase(id: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('vending_fixed_costs').delete().eq('id', id);
  } catch (e) {
    console.warn('[Supabase] Delete fixed cost error:', e);
  }
}

export async function saveTrackedSpiralToSupabase(record: TrackedSpiralRecord) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('vending_tracked_spirals').upsert(mapTrackedSpiralToRow(record));
  } catch (e) {
    console.warn('[Supabase] Upsert tracked spiral error:', e);
  }
}

export async function saveDosagePresetToSupabase(preset: CoffeeDosagePreset) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('vending_dosage_presets').upsert(mapDosagePresetToRow(preset));
  } catch (e) {
    console.warn('[Supabase] Upsert dosage preset error:', e);
  }
}

export async function deleteDosagePresetFromSupabase(id: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('vending_dosage_presets').delete().eq('id', id);
  } catch (e) {
    console.warn('[Supabase] Delete dosage preset error:', e);
  }
}

// -------------------------------------------------------------
// Sincronizzazione Completa Atomica (Push Totale)
// -------------------------------------------------------------

export async function pushFullDatabaseToSupabase(data: FullVendingData): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase non configurato' };
  }

  try {
    const timestamp = new Date().toISOString();

    // 1. Salva snapshot compatto unificato (garantisce consistenza 100% istantanea su tutti i device)
    const statePromise = supabase
      .from('vending_store_state')
      .upsert({
        id: 'primary_store',
        state_json: {
          machines: data.machines,
          products: data.products,
          purchases: data.purchases,
          restockHistory: data.restockHistory,
          maintenances: data.maintenances,
          fixedCosts: data.fixedCosts,
          trackedSpirals: data.trackedSpirals,
          dosagePresets: data.dosagePresets,
        },
        updated_at: timestamp,
      });

    // 2. Salva contemporaneamente nelle tabelle relazionali normalizzate
    const machinesPromise = data.machines.length > 0
      ? supabase.from('vending_machines').upsert(data.machines.map(mapMachineToRow))
      : Promise.resolve();

    const productsPromise = data.products.length > 0
      ? supabase.from('vending_products').upsert(data.products.map(mapProductToRow))
      : Promise.resolve();

    const purchasesPromise = data.purchases.length > 0
      ? supabase.from('vending_purchases').upsert(data.purchases.map(mapPurchaseToRow))
      : Promise.resolve();

    const historyPromise = data.restockHistory.length > 0
      ? supabase.from('vending_restock_history').upsert(data.restockHistory.map(mapRestockToRow))
      : Promise.resolve();

    const maintenancesPromise = data.maintenances.length > 0
      ? supabase.from('vending_maintenances').upsert(data.maintenances.map(mapMaintenanceToRow))
      : Promise.resolve();

    const fixedCostsPromise = data.fixedCosts.length > 0
      ? supabase.from('vending_fixed_costs').upsert(data.fixedCosts.map(mapFixedCostToRow))
      : Promise.resolve();

    const trackedSpiralsPromise = data.trackedSpirals.length > 0
      ? supabase.from('vending_tracked_spirals').upsert(data.trackedSpirals.map(mapTrackedSpiralToRow))
      : Promise.resolve();

    const dosagePresetsPromise = data.dosagePresets.length > 0
      ? supabase.from('vending_dosage_presets').upsert(data.dosagePresets.map(mapDosagePresetToRow))
      : Promise.resolve();

    await Promise.allSettled([
      statePromise,
      machinesPromise,
      productsPromise,
      purchasesPromise,
      historyPromise,
      maintenancesPromise,
      fixedCostsPromise,
      trackedSpiralsPromise,
      dosagePresetsPromise
    ]);

    return { success: true };
  } catch (err: any) {
    console.error('[Supabase] Errore push completo:', err);
    return { success: false, error: err?.message || 'Errore di salvataggio su Supabase' };
  }
}

// -------------------------------------------------------------
// Realtime Subscription per Sincronizzazione Multidispositivo
// -------------------------------------------------------------

export function subscribeToRealtimeChanges(onRemoteUpdate: () => void): () => void {
  const supabase = getSupabase();
  if (!supabase) {
    return () => {};
  }

  try {
    const channelName = `vending_sync_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vending_store_state' },
        () => {
          onRemoteUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vending_machines' },
        () => {
          onRemoteUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vending_products' },
        () => {
          onRemoteUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vending_purchases' },
        () => {
          onRemoteUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vending_restock_history' },
        () => {
          onRemoteUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    console.warn('[Supabase] Impossibile avviare listener Realtime:', e);
    return () => {};
  }
}
