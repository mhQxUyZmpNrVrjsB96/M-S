import { 
  VendingMachine, 
  Product, 
  ProductCategory, 
  RestockRoute, 
  RouteStop, 
  PurchaseBatch, 
  MachineSlot, 
  SlotLoadedBatch, 
  RestockItemBatchConsumption 
} from '../types';
import { WAREHOUSE_DEPOT } from '../data/initialData';

export interface FifoAllocation {
  batchId: string;
  batchNumber: string;
  invoiceRef?: string;
  date: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface FifoLoadPlan {
  totalUnits: number;
  totalCost: number;
  avgUnitCost: number;
  allocations: FifoAllocation[];
  unallocatedUnits: number;
}

export interface SlotFifoConsumptionResult {
  costOfSold: number;
  avgUnitCost: number;
  consumptions: RestockItemBatchConsumption[];
  remainingBatches: SlotLoadedBatch[];
}

/**
 * Determina il costo di acquisto effettivo unitario e il lotto di riferimento per uno slot:
 * 1. Coda lotti caricati nello slot (FIFO fisico: il primo lotto in coda è quello che verrà venduto adesso)
 * 2. Se vuoto o esaurito, cerca il primo lotto fornitore attivo in magazzino per questo prodotto
 * 3. Se ancora non trovato, usa unitCost del prodotto
 * 4. Fallback 0 (nessun valore inventato!)
 */
export function getSlotActiveCost(
  slot?: MachineSlot,
  product?: Product,
  purchases: PurchaseBatch[] = []
): { unitCost: number; batchNumber?: string; batchId?: string; isMultiBatch?: boolean } {
  if (!slot) {
    if (product && product.unitCost > 0) {
      return { unitCost: product.unitCost };
    }
    return { unitCost: 0 };
  }

  // 1. Coda fisica presente nella spirale
  if (slot.loadedBatches && slot.loadedBatches.length > 0) {
    const validBatches = slot.loadedBatches.filter(b => b.units > 0);
    if (validBatches.length > 0) {
      const active = validBatches[0];
      return {
        unitCost: active.unitCost,
        batchNumber: active.batchNumber,
        batchId: active.batchId,
        isMultiBatch: validBatches.length > 1,
      };
    }
  }

  // 2. Cerca nei lotti di acquisto fornitore in magazzino
  const targetProdId = slot.productId;
  const prodPurchases = purchases
    .filter(p => p.productId === targetProdId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const activeWarehouseBatch = prodPurchases.find(p => p.remainingUnits > 0) || prodPurchases[0];
  if (activeWarehouseBatch) {
    const cost = activeWarehouseBatch.costBasisUsed === 'ivato'
      ? activeWarehouseBatch.unitCostWithVat
      : activeWarehouseBatch.unitCostNet;
    return {
      unitCost: cost,
      batchNumber: activeWarehouseBatch.batchNumber,
      batchId: activeWarehouseBatch.id,
    };
  }

  // 3. Fallback sul prodotto nel listino
  if (product && product.unitCost > 0) {
    return {
      unitCost: product.unitCost,
      batchNumber: slot.activeBatchNumber,
    };
  }

  return {
    unitCost: 0,
    batchNumber: slot.activeBatchNumber,
  };
}

export function calculateFifoLoadPlan(
  productId: string,
  neededUnits: number,
  purchases: PurchaseBatch[],
  fallbackCost: number = 0
): FifoLoadPlan {
  if (neededUnits <= 0) {
    return {
      totalUnits: 0,
      totalCost: 0,
      avgUnitCost: fallbackCost,
      allocations: [],
      unallocatedUnits: 0,
    };
  }

  const activeBatches = purchases
    .filter(p => p.productId === productId && p.remainingUnits > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let remaining = neededUnits;
  let totalCost = 0;
  const allocations: FifoAllocation[] = [];

  for (const b of activeBatches) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, b.remainingUnits);
    const unitCost = b.costBasisUsed === 'ivato' ? b.unitCostWithVat : b.unitCostNet;
    const lineCost = take * unitCost;
    totalCost += lineCost;
    allocations.push({
      batchId: b.id,
      batchNumber: b.batchNumber,
      invoiceRef: b.invoiceRef,
      date: b.date,
      quantity: take,
      unitCost,
      totalCost: Number(lineCost.toFixed(4)),
    });
    remaining -= take;
  }

  if (remaining > 0) {
    totalCost += remaining * fallbackCost;
  }

  const avgUnitCost = neededUnits > 0 ? totalCost / neededUnits : fallbackCost;

  return {
    totalUnits: neededUnits,
    totalCost: Number(totalCost.toFixed(2)),
    avgUnitCost: Number(avgUnitCost.toFixed(4)),
    allocations,
    unallocatedUnits: remaining,
  };
}

/**
 * Consuma le unità vendute dalla coda FIFO dei lotti presenti fisicamente nello slot del distributore.
 * Se una carica di 10 pezzi comprendeva 5 pezzi a 0,50€ e 5 pezzi a 0,60€:
 * - le prime 5 vendite costano 0,50€
 * - dalla sesta in poi costano 0,60€
 * Restituisce il costo reale, il costo medio ponderato, il dettaglio per lotto e i lotti ancora rimasti nello slot.
 */
export function consumeSlotFifo(
  slot: MachineSlot,
  soldUnits: number,
  fallbackCost: number = 0
): SlotFifoConsumptionResult {
  if (soldUnits <= 0) {
    const activeUnitCost = (slot.loadedBatches && slot.loadedBatches.length > 0 && slot.loadedBatches[0].units > 0)
      ? slot.loadedBatches[0].unitCost
      : fallbackCost;

    return {
      costOfSold: 0,
      avgUnitCost: activeUnitCost,
      consumptions: [],
      remainingBatches: slot.loadedBatches ? slot.loadedBatches.map(b => ({ ...b })) : [],
    };
  }

  // Costruisci la coda attuale dello slot
  let currentQueue: SlotLoadedBatch[] = [];
  if (slot.loadedBatches && slot.loadedBatches.length > 0) {
    currentQueue = slot.loadedBatches.map(b => ({ ...b }));
    const totalUnitsInQueue = currentQueue.reduce((s, b) => s + b.units, 0);
    const expectedBase = Math.max(slot.lastRestockStock || 0, slot.currentStock || 0);
    if (totalUnitsInQueue < expectedBase) {
      currentQueue.push({
        batchNumber: slot.activeBatchNumber || 'Lotto Base',
        unitCost: fallbackCost,
        units: expectedBase - totalUnitsInQueue,
      });
    }
  } else {
    const initialCount = Math.max(slot.lastRestockStock || 0, slot.currentStock || 0, soldUnits);
    currentQueue = [
      {
        batchNumber: slot.activeBatchNumber || 'Lotto Iniziale',
        unitCost: fallbackCost,
        units: initialCount,
      },
    ];
  }

  let unitsToDeduct = soldUnits;
  let totalCost = 0;
  const consumptions: RestockItemBatchConsumption[] = [];
  const remainingBatches: SlotLoadedBatch[] = [];

  for (const batch of currentQueue) {
    if (unitsToDeduct <= 0) {
      if (batch.units > 0) {
        remainingBatches.push(batch);
      }
      continue;
    }

    if (batch.units <= unitsToDeduct) {
      // Intero lotto venduto
      const lineCost = batch.units * batch.unitCost;
      totalCost += lineCost;
      consumptions.push({
        batchId: batch.batchId,
        batchNumber: batch.batchNumber,
        invoiceRef: batch.invoiceRef,
        units: batch.units,
        unitCost: batch.unitCost,
        totalCost: Number(lineCost.toFixed(4)),
      });
      unitsToDeduct -= batch.units;
    } else {
      // Lotto parzialmente venduto: questa tranche viene intaccata
      const lineCost = unitsToDeduct * batch.unitCost;
      totalCost += lineCost;
      consumptions.push({
        batchId: batch.batchId,
        batchNumber: batch.batchNumber,
        invoiceRef: batch.invoiceRef,
        units: unitsToDeduct,
        unitCost: batch.unitCost,
        totalCost: Number(lineCost.toFixed(4)),
      });
      // Le rimanenti unità di questo lotto restano in prima posizione per le vendite successive!
      remainingBatches.push({
        ...batch,
        units: batch.units - unitsToDeduct,
      });
      unitsToDeduct = 0;
    }
  }

  // Se sono state vendute più unità rispetto alla coda nota, calcola al costo fallback
  if (unitsToDeduct > 0) {
    const extraCost = unitsToDeduct * fallbackCost;
    totalCost += extraCost;
    consumptions.push({
      batchNumber: 'Lotto Base',
      units: unitsToDeduct,
      unitCost: fallbackCost,
      totalCost: Number(extraCost.toFixed(4)),
    });
  }

  const avgUnitCost = soldUnits > 0 ? totalCost / soldUnits : fallbackCost;

  return {
    costOfSold: Number(totalCost.toFixed(2)),
    avgUnitCost: Number(avgUnitCost.toFixed(4)),
    consumptions,
    remainingBatches,
  };
}

/**
 * Appende i nuovi lotti prelevati da magazzino in coda ai lotti già presenti nello slot (FIFO).
 * I lotti più vecchi già presenti verranno venduti per primi; i nuovi lotti verranno venduti dopo.
 */
export function appendLoadedBatches(
  existingBatches: SlotLoadedBatch[],
  allocations: FifoAllocation[],
  fallbackCost: number = 0,
  unallocatedUnits: number = 0
): SlotLoadedBatch[] {
  const result: SlotLoadedBatch[] = existingBatches.map(b => ({ ...b })).filter(b => b.units > 0);

  for (const alloc of allocations) {
    if (alloc.quantity <= 0) continue;
    const last = result[result.length - 1];
    // Se l'ultimo lotto in coda è esattamente dello stesso acquisto e prezzo, aggrega le unità
    if (last && last.batchId === alloc.batchId && Math.abs(last.unitCost - alloc.unitCost) < 0.0001) {
      last.units += alloc.quantity;
    } else {
      result.push({
        batchId: alloc.batchId,
        batchNumber: alloc.batchNumber,
        invoiceRef: alloc.invoiceRef,
        unitCost: alloc.unitCost,
        units: alloc.quantity,
        loadedAt: new Date().toISOString(),
      });
    }
  }

  if (unallocatedUnits > 0) {
    result.push({
      batchNumber: 'Carica Standard',
      unitCost: fallbackCost,
      units: unallocatedUnits,
      loadedAt: new Date().toISOString(),
    });
  }

  return result;
}

/**
 * Crea una stringa leggibile del dettaglio vendite multi-lotto.
 * Es. "5 pz @ 0,50 € (LOT-01) + 5 pz @ 0,60 € (LOT-02)"
 */
export function formatBatchConsumptionSummary(consumptions?: RestockItemBatchConsumption[]): string {
  if (!consumptions || consumptions.length === 0) return '';
  return consumptions
    .map(c => `${c.units} pz @ ${formatEuro(c.unitCost)}${c.batchNumber ? ` [${c.batchNumber}]` : ''}`)
    .join(' + ');
}

export const CATEGORY_META: Record<ProductCategory, { label: string; color: string; bg: string; border: string }> = {
  caffe_calde: {
    label: 'Caffè & Calde',
    color: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  bevande_fredde: {
    label: 'Bevande Fredde',
    color: 'text-sky-800',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
  },
  snack_dolci: {
    label: 'Snack Dolci',
    color: 'text-rose-800',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
  },
  snack_salati: {
    label: 'Snack Salati',
    color: 'text-orange-800',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  freschi_healthy: {
    label: 'Freschi & Healthy',
    color: 'text-emerald-800',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
};

export function formatEuro(amount?: number | null): string {
  const safe = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function formatPercent(value: number): string {
  if (isNaN(value) || !isFinite(value)) return '0.0%';
  return `${value.toFixed(1)}%`;
}

export function getMachineOverallStockPercent(machine: VendingMachine): number {
  if (!machine.slots || machine.slots.length === 0) return 0;
  const totalStock = machine.slots.reduce((sum, slot) => sum + slot.currentStock, 0);
  const totalCapacity = machine.slots.reduce((sum, slot) => sum + slot.capacity, 0);
  if (totalCapacity === 0) return 0;
  return Math.round((totalStock / totalCapacity) * 100);
}

export function getMachineCriticalSlotsCount(machine: VendingMachine): number {
  return machine.slots.filter(s => s.currentStock <= s.alertThreshold).length;
}

export function calculateMachineStatus(machine: VendingMachine): 'operativo' | 'in_esaurimento' | 'critico' {
  if (!machine.slots || machine.slots.length === 0) {
    return 'operativo';
  }
  const stockPct = getMachineOverallStockPercent(machine);
  const criticalCount = getMachineCriticalSlotsCount(machine);

  if (stockPct <= 25 || criticalCount >= 3) {
    return 'critico';
  }
  if (stockPct <= 50 || criticalCount >= 1) {
    return 'in_esaurimento';
  }
  return 'operativo';
}

// Calcolo distanza approssimativa in km tra due punti
export function getDistanceKm(
  point1: { lat: number; lng: number; x: number; y: number },
  point2: { lat: number; lng: number; x: number; y: number }
): number {
  // Conversione dalle coordinate x,y della mappa (0-100) a raggio urbano realistico (scala ~15km per lato)
  const dx = (point1.x - point2.x) * 0.15;
  const dy = (point1.y - point2.y) * 0.15;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // Minimo 0.8 km e arrotondato a 1 decimale
  return Math.max(0.8, Number(dist.toFixed(1)));
}

// Algoritmo di ottimizzazione del percorso (Nearest Neighbor) a partire dal Deposito Centrale
export function buildOptimizedRoute(
  machines: VendingMachine[],
  products: Product[],
  filterCriticalOnly: boolean = false
): RestockRoute {
  // Filtra macchine che necessitano rifornimento se richiesto
  let candidateMachines = machines.filter(m => {
    if (!filterCriticalOnly) return true;
    const criticalCount = getMachineCriticalSlotsCount(m);
    const stockPct = getMachineOverallStockPercent(m);
    return criticalCount > 0 || stockPct < 50;
  });

  if (candidateMachines.length === 0) {
    candidateMachines = [...machines];
  }

  // Risoluzione percorso Nearest Neighbor da WAREHOUSE_DEPOT
  const orderedStops: RouteStop[] = [];
  const remaining = [...candidateMachines];
  let currentLoc = { ...WAREHOUSE_DEPOT.coordinates };
  let totalDistanceKm = 0;
  let totalEstMinutes = 0;

  let stopOrder = 1;
  while (remaining.length > 0) {
    let nearestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = getDistanceKm(currentLoc, remaining[i].coordinates);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = i;
      }
    }

    const nextMachine = remaining.splice(nearestIdx, 1)[0];
    const distanceToNext = minDistance;
    const travelTime = Math.round(distanceToNext * 2.2); // ~2.2 min per km nel traffico urbano
    const serviceTime = 12; // 12 min per sosta rifornimento e cassa
    const stopMinutes = travelTime + serviceTime;

    totalDistanceKm += distanceToNext;
    totalEstMinutes += stopMinutes;

    const criticalItems = getMachineCriticalSlotsCount(nextMachine);

    orderedStops.push({
      machineId: nextMachine.id,
      machine: nextMachine,
      stopOrder,
      distanceKm: distanceToNext,
      estimatedMinutes: stopMinutes,
      needsRestock: criticalItems > 0 || getMachineOverallStockPercent(nextMachine) < 60,
      criticalItemsCount: criticalItems,
      status: 'in_attesa',
    });

    currentLoc = { ...nextMachine.coordinates };
    stopOrder++;
  }

  // Aggiungi rientro al magazzino
  const returnDist = getDistanceKm(currentLoc, WAREHOUSE_DEPOT.coordinates);
  totalDistanceKm += returnDist;
  totalEstMinutes += Math.round(returnDist * 2.2);

  // Calcolo Picking List (fabbisogno per rifornire fino alla capacità massima tutte le macchine del percorso)
  const productQuantitiesMap = new Map<string, number>();

  for (const stop of orderedStops) {
    for (const slot of stop.machine.slots) {
      const missing = Math.max(0, slot.capacity - slot.currentStock);
      if (missing > 0) {
        const prev = productQuantitiesMap.get(slot.productId) || 0;
        productQuantitiesMap.set(slot.productId, prev + missing);
      }
    }
  }

  const pickingList = Array.from(productQuantitiesMap.entries())
    .map(([productId, quantityToPick]) => {
      const prod = products.find(p => p.id === productId);
      return {
        productId,
        productName: prod ? prod.name : productId,
        category: prod ? prod.category : 'bevande_fredde',
        quantityToPick,
        unit: prod ? prod.unit : 'pz',
      };
    })
    .sort((a, b) => b.quantityToPick - a.quantityToPick);

  return {
    id: `route-${Date.now()}`,
    name: filterCriticalOnly ? 'Giro Espresso Macchine Critiche' : 'Giro Completo di Rifornimento',
    date: new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    totalStops: orderedStops.length,
    totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
    totalEstMinutes,
    stops: orderedStops,
    pickingList,
  };
}

// Download dati in formato CSV per reportistica contabile
export function exportSalesCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(';'),
    ...rows.map(row => 
      headers.map(field => {
        const val = row[field];
        if (typeof val === 'string' && val.includes(';')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val ?? '';
      }).join(';')
    ),
  ];

  const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
