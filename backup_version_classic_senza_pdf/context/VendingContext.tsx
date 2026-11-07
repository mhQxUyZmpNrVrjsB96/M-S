import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { VendingMachine, Product, RestockSession, RestockItemRecord, PurchaseBatch, MachineSlot, SlotLoadedBatch, SpiralConfigUpdate, MaintenanceRecord } from '../types';
import { INITIAL_MACHINES, INITIAL_PRODUCTS, INITIAL_RESTOCK_HISTORY, INITIAL_PURCHASES } from '../data/initialData';
import { BACKUP_PREVIOUS_SOLUTION } from '../data/savedSolutionBackup';
import { calculateMachineStatus, consumeSlotFifo, calculateFifoLoadPlan, appendLoadedBatches, getSlotActiveCost } from '../utils/vendingUtils';
import { parseExpiryFromText } from '../utils/expiryUtils';

export interface CreatePurchaseInput {
  productId: string;
  productName?: string;
  supplier: string;
  packageCount: number;
  unitsPerPackage: number;
  priceInputType: 'per_confezione' | 'totale';
  inputPrice: number;
  vatRate: number;
  costBasisUsed?: 'netto' | 'ivato';
  batchNumber?: string;
  invoiceRef?: string;
  notes?: string;
  date?: string; // Data acquisto ISO o YYYY-MM-DD
  expiryDate?: string; // Data scadenza opzionale (es. AAAA-MM-GG) o estratta dalle note
}

export interface StateSnapshot {
  id: string;
  timestamp: number;
  actionName: string;
  machines: VendingMachine[];
  products: Product[];
  purchases: PurchaseBatch[];
  restockHistory: RestockSession[];
  maintenances: MaintenanceRecord[];
}

export interface UndoToastInfo {
  visible: boolean;
  actionName: string;
  isUndoConfirmation?: boolean;
  timestamp: number;
}

interface VendingContextType {
  machines: VendingMachine[];
  products: Product[];
  restockHistory: RestockSession[];
  purchases: PurchaseBatch[];
  maintenances: MaintenanceRecord[];
  addMaintenance: (record: Omit<MaintenanceRecord, 'id' | 'createdAt'>) => void;
  deleteMaintenance: (id: string) => void;
  updateMaintenance: (record: MaintenanceRecord) => void;
  activeModalMachineId: string | null;
  openRestockModal: (machineId?: string) => void;
  closeRestockModal: () => void;
  recordRestock: (session: Omit<RestockSession, 'id' | 'timestamp'>) => void;
  addPurchase: (input: CreatePurchaseInput) => void;
  deletePurchase: (id: string) => void;
  updateBatchUnits: (batchId: string, newRemainingUnits: number) => void;
  updateBatchExpiry: (batchId: string, expiryDate: string, notes?: string) => void;
  toggleBatchFinished: (batchId: string) => void;
  simulateSalesStep: () => void;
  isSimulating: boolean;
  toggleSimulation: () => void;
  updateProduct: (updated: Product) => void;
  addProduct: (
    newProd: Omit<Product, 'id'>,
    initialBatch?: {
      supplier?: string;
      packageCount?: number;
      unitsPerPackage?: number;
      priceInputType?: 'per_confezione' | 'totale';
      inputPrice?: number;
      vatRate?: number;
      invoiceRef?: string;
      expiryDate?: string;
      notes?: string;
      batchNumber?: string;
      date?: string;
    }
  ) => void;
  deleteProduct: (productId: string) => void;
  clearAllProducts: () => void;
  clearAllPurchases: () => void;
  updateMachineSlot: (machineId: string, slotId: string, updates: Partial<{ label: string; productId: string; salePrice: number; alertThreshold: number; capacity: number }>) => void;
  updateMachineSpirals: (machineId: string, updates: SpiralConfigUpdate[]) => void;
  addSlotToMachine: (machineId: string, newSlot: Omit<MachineSlot, 'id'>) => void;
  deleteSlotFromMachine: (machineId: string, slotId: string) => void;
  updateWarehouseStock: (productId: string, newStock: number) => void;
  addNewMachine: (newMachine: Omit<VendingMachine, 'id'>) => void;
  resetToSampleData: () => void;
  resetAllDataToZero: () => void;
  restoreSavedBackup: () => void;
  exportBackupJSON: () => void;
  exportSalesCSV: () => void;
  // Undo support
  canUndo: boolean;
  lastActionName: string | null;
  undoLastAction: () => void;
  undoToast: UndoToastInfo | null;
  dismissUndoToast: () => void;
}

const STORAGE_KEYS = {
  MACHINES: 'vending_machines_store_v5_clean_zero',
  PRODUCTS: 'vending_products_v6_clean_zero',
  HISTORY: 'vending_history_v5_clean_zero',
  PURCHASES: 'vending_purchases_v5_clean_zero',
  MAINTENANCE: 'vending_maintenance_v5_clean_zero',
};

// Pulisci automaticamente versioni precedenti con dati mock per garantire partenza pulita a zero
try {
  [
    'vending_products_v5_clean_zero',
    'vending_machines_store_v4', 'vending_products_v4', 'vending_history_v4', 'vending_purchases_v4', 'vending_maintenance_v4',
    'vending_machines_store_v3', 'vending_products_v3', 'vending_history_v3', 'vending_purchases_v3',
    'vending_machines_store_v2', 'vending_products_v2', 'vending_history_v2', 'vending_purchases_v2',
    'vending_machines_store', 'vending_products', 'vending_history', 'vending_purchases'
  ].forEach(k => {
    localStorage.removeItem(k);
  });
} catch (e) {
  // Ignora in ambienti non-browser
}

const VendingContext = createContext<VendingContextType | undefined>(undefined);

export const VendingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [machines, setMachines] = useState<VendingMachine[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MACHINES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 3 && parsed[0]?.id === 'mach-01') {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading saved machines', e);
    }
    return INITIAL_MACHINES;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading saved products', e);
    }
    return INITIAL_PRODUCTS;
  });

  const [restockHistory, setRestockHistory] = useState<RestockSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading saved history', e);
    }
    return INITIAL_RESTOCK_HISTORY;
  });

  const [purchases, setPurchases] = useState<PurchaseBatch[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PURCHASES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading saved purchases', e);
    }
    return INITIAL_PURCHASES;
  });

  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MAINTENANCE);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading saved maintenances', e);
    }
    return [];
  });

  const [activeModalMachineId, setActiveModalMachineId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Undo Stack State
  const [undoStack, setUndoStack] = useState<StateSnapshot[]>([]);
  const [undoToast, setUndoToast] = useState<UndoToastInfo | null>(null);

  // Auto-dismiss undo toast after 10s
  useEffect(() => {
    if (!undoToast?.visible) return;
    const timer = setTimeout(() => {
      setUndoToast(null);
    }, 10000);
    return () => clearTimeout(timer);
  }, [undoToast]);

  // Riconciliazione automatica per sanare eventuali lotti o spirali con costi fittizi (0.20) o mancanti
  useEffect(() => {
    let machinesChanged = false;
    const healedMachines = machines.map(m => {
      let slotChanged = false;
      const newSlots = m.slots.map(slot => {
        const prod = products.find(p => p.id === slot.productId) || products.find(p => p.name.toLowerCase() === slot.label.toLowerCase());
        const matchingPurchases = purchases.filter(p => p.productId === slot.productId || (prod && p.productId === prod.id));
        const activePurchase = matchingPurchases.find(p => p.remainingUnits > 0) || matchingPurchases[0];
        const realCost = activePurchase 
          ? (activePurchase.costBasisUsed === 'ivato' ? activePurchase.unitCostWithVat : activePurchase.unitCostNet)
          : (prod?.unitCost && prod.unitCost > 0 ? prod.unitCost : 0);

        const hasStale020 = slot.loadedBatches && slot.loadedBatches.some(b => b.unitCost === 0.20 || b.unitCost === 0.2);
        const isEmptyWithStock = (!slot.loadedBatches || slot.loadedBatches.length === 0) && slot.currentStock > 0;

        if (realCost > 0 && (hasStale020 || isEmptyWithStock)) {
          slotChanged = true;
          const healedBatches: SlotLoadedBatch[] = (slot.loadedBatches && slot.loadedBatches.length > 0 && !isEmptyWithStock)
            ? slot.loadedBatches.map(b => (b.unitCost === 0.20 || b.unitCost === 0.2) ? { ...b, unitCost: realCost, batchNumber: activePurchase?.batchNumber || b.batchNumber } : b)
            : [{
                batchId: activePurchase?.id,
                batchNumber: activePurchase?.batchNumber || 'Lotto Attivo',
                unitCost: realCost,
                units: slot.currentStock,
              }];

          return {
            ...slot,
            loadedBatches: healedBatches,
            activeBatchNumber: healedBatches[0]?.batchNumber || slot.activeBatchNumber,
          };
        }
        return slot;
      });

      if (slotChanged) {
        machinesChanged = true;
        return { ...m, slots: newSlots };
      }
      return m;
    });

    if (machinesChanged) {
      setMachines(healedMachines);
    }
  }, [purchases, products]);

  const pushUndoSnapshot = useCallback((actionName: string) => {
    const snapshot: StateSnapshot = {
      id: `snap-${Date.now()}`,
      timestamp: Date.now(),
      actionName,
      machines: JSON.parse(JSON.stringify(machines)),
      products: JSON.parse(JSON.stringify(products)),
      purchases: JSON.parse(JSON.stringify(purchases)),
      restockHistory: JSON.parse(JSON.stringify(restockHistory)),
      maintenances: JSON.parse(JSON.stringify(maintenances)),
    };
    setUndoStack(prev => [snapshot, ...prev.slice(0, 19)]);
    setUndoToast({
      visible: true,
      actionName,
      timestamp: Date.now(),
    });
  }, [machines, products, purchases, restockHistory, maintenances]);

  const undoLastAction = useCallback(() => {
    if (undoStack.length === 0) return;
    const [lastSnapshot, ...remaining] = undoStack;
    setMachines(lastSnapshot.machines);
    setProducts(lastSnapshot.products);
    setPurchases(lastSnapshot.purchases);
    setRestockHistory(lastSnapshot.restockHistory);
    if (lastSnapshot.maintenances) setMaintenances(lastSnapshot.maintenances);
    setUndoStack(remaining);
    setUndoToast({
      visible: true,
      actionName: lastSnapshot.actionName,
      isUndoConfirmation: true,
      timestamp: Date.now(),
    });
  }, [undoStack]);

  const dismissUndoToast = useCallback(() => {
    setUndoToast(null);
  }, []);

  // Helper FIFO: Cerca il lotto fornitore attivo secondo data più vecchia con giacenza residua > 0
  const getActiveFifoBatch = (productId: string, batchList: PurchaseBatch[]): PurchaseBatch | undefined => {
    const activeBatches = batchList
      .filter(b => b.productId === productId && b.remainingUnits > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (activeBatches.length > 0) {
      return activeBatches[0];
    }
    // Se esauriti, prendi l'ultimo acquistato come riferimento costo
    const allBatches = batchList
      .filter(b => b.productId === productId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return allBatches[0];
  };

  // Helper: Somma giacenze di tutti i lotti di un prodotto
  const calculateProductWarehouseStock = (productId: string, batchList: PurchaseBatch[]): number => {
    return batchList
      .filter(b => b.productId === productId)
      .reduce((sum, b) => sum + Math.max(0, b.remainingUnits), 0);
  };

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(machines));
    } catch (e) {
      console.error(e);
    }
  }, [machines]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error(e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(restockHistory));
    } catch (e) {
      console.error(e);
    }
  }, [restockHistory]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));
    } catch (e) {
      console.error(e);
    }
  }, [purchases]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MAINTENANCE, JSON.stringify(maintenances));
    } catch (e) {
      console.error(e);
    }
  }, [maintenances]);

  const addMaintenance = (record: Omit<MaintenanceRecord, 'id' | 'createdAt'>) => {
    pushUndoSnapshot(record.type === 'sostituzione' ? `Sostituzione componente ${record.componentName || ''}` : `Manutenzione ${record.machineName}`);
    const newRecord: MaintenanceRecord = {
      ...record,
      id: `maint-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setMaintenances(prev => [newRecord, ...prev]);
  };

  const deleteMaintenance = (id: string) => {
    pushUndoSnapshot('Eliminazione record manutenzione');
    setMaintenances(prev => prev.filter(m => m.id !== id));
  };

  const updateMaintenance = (updated: MaintenanceRecord) => {
    pushUndoSnapshot('Modifica record manutenzione');
    setMaintenances(prev => prev.map(m => (m.id === updated.id ? updated : m)));
  };

  const openRestockModal = (machineId?: string) => {
    setActiveModalMachineId(machineId || machines[0]?.id || null);
  };

  const closeRestockModal = () => {
    setActiveModalMachineId(null);
  };

  // Inserimento nuovo acquisto fornitore con tracciamento lotti indipendenti e FIFO
  const addPurchase = (input: CreatePurchaseInput) => {
    const totalUnits = input.packageCount * input.unitsPerPackage;
    if (totalUnits <= 0) return;

    const prod = products.find(p => p.id === input.productId);
    const prodName = prod ? prod.name : (input.productName || 'Prodotto');

    pushUndoSnapshot(`Acquisto ${totalUnits} pz "${prodName}" (${input.invoiceRef || 'Fattura'})`);

    let totalTaxable = 0;
    if (input.priceInputType === 'per_confezione') {
      totalTaxable = input.inputPrice * input.packageCount;
    } else {
      totalTaxable = input.inputPrice;
    }

    const totalVat = totalTaxable * (input.vatRate / 100);
    const totalGross = totalTaxable + totalVat;
    const unitCostNet = Number((totalTaxable / totalUnits).toFixed(4));
    const unitCostWithVat = Number((totalGross / totalUnits).toFixed(4));
    const costBasis = input.costBasisUsed || 'netto';
    const appliedUnitCost = costBasis === 'ivato' ? unitCostWithVat : unitCostNet;

    const batchCode = input.batchNumber?.trim() || `LOT-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`;
    const purchaseDate = input.date ? new Date(input.date).toISOString() : new Date().toISOString();

    const newBatch: PurchaseBatch = {
      id: `purch-${Date.now()}`,
      date: purchaseDate,
      batchNumber: batchCode,
      productId: input.productId,
      productName: prodName,
      supplier: input.supplier.trim() || 'Fornitore Principale',
      packageCount: input.packageCount,
      unitsPerPackage: input.unitsPerPackage,
      totalUnits,
      remainingUnits: totalUnits,
      priceInputType: input.priceInputType,
      inputPrice: input.inputPrice,
      vatRate: input.vatRate,
      totalTaxable: Number(totalTaxable.toFixed(2)),
      totalVat: Number(totalVat.toFixed(2)),
      totalGross: Number(totalGross.toFixed(2)),
      unitCostNet: Number(unitCostNet.toFixed(3)),
      unitCostWithVat: Number(unitCostWithVat.toFixed(3)),
      costBasisUsed: costBasis,
      invoiceRef: input.invoiceRef?.trim(),
      notes: input.notes?.trim(),
      expiryDate: parseExpiryFromText(input.notes, input.expiryDate) || undefined,
    };

    const nextPurchases = [newBatch, ...purchases];
    setPurchases(nextPurchases);

    // Determina il lotto prioritario FIFO per il calcolo del costo (data più vecchia con giacenza > 0)
    const activeFifo = getActiveFifoBatch(input.productId, nextPurchases);
    const activeCost = activeFifo 
      ? (activeFifo.costBasisUsed === 'ivato' ? activeFifo.unitCostWithVat : activeFifo.unitCostNet)
      : appliedUnitCost;

    setProducts(prev => {
      const exists = prev.some(p => p.id === input.productId);
      const totalStock = calculateProductWarehouseStock(input.productId, nextPurchases);
      const activeCostVal = Number(activeCost.toFixed(3));
      if (exists) {
        return prev.map(p => {
          if (p.id !== input.productId) return p;
          return {
            ...p,
            unitCost: activeCostVal,
            activeBatchId: activeFifo?.id || newBatch.id,
            warehouseStock: totalStock,
          };
        });
      } else {
        const newP: Product = {
          id: input.productId,
          name: prodName,
          category: 'bevande_fredde',
          defaultPrice: 1.0,
          unitCost: activeCostVal,
          activeBatchId: activeFifo?.id || newBatch.id,
          warehouseStock: totalStock,
          unit: 'pz',
        };
        return [...prev, newP];
      }
    });
  };

  const deletePurchase = (id: string) => {
    const toDelete = purchases.find(p => p.id === id);
    if (!toDelete) return;

    pushUndoSnapshot(`Eliminazione lotto "${toDelete.batchNumber}" (${toDelete.productName})`);

    const nextPurchases = purchases.filter(p => p.id !== id);
    setPurchases(nextPurchases);

    const activeFifo = getActiveFifoBatch(toDelete.productId, nextPurchases);
    setProducts(prev =>
      prev.map(p => {
        if (p.id !== toDelete.productId) return p;
        const totalStock = calculateProductWarehouseStock(p.id, nextPurchases);
        const activeCost = activeFifo 
          ? (activeFifo.costBasisUsed === 'ivato' ? activeFifo.unitCostWithVat : activeFifo.unitCostNet)
          : p.unitCost;
        return {
          ...p,
          unitCost: Number(activeCost.toFixed(3)),
          activeBatchId: activeFifo?.id,
          warehouseStock: totalStock,
        };
      })
    );
  };

  // Aggiorna singolarmente la giacenza di uno specifico lotto fornitore
  const updateBatchUnits = (batchId: string, newRemainingUnits: number) => {
    const target = purchases.find(p => p.id === batchId);
    if (!target) return;

    const safeUnits = Math.max(0, newRemainingUnits);
    pushUndoSnapshot(`Rettifica lotto "${target.batchNumber}" a ${safeUnits} pz`);

    const nextPurchases = purchases.map(p => (p.id === batchId ? { ...p, remainingUnits: safeUnits } : p));
    setPurchases(nextPurchases);

    const activeFifo = getActiveFifoBatch(target.productId, nextPurchases);
    setProducts(prev =>
      prev.map(p => {
        if (p.id !== target.productId) return p;
        const totalStock = calculateProductWarehouseStock(p.id, nextPurchases);
        const activeCost = activeFifo 
          ? (activeFifo.costBasisUsed === 'ivato' ? activeFifo.unitCostWithVat : activeFifo.unitCostNet)
          : p.unitCost;
        return {
          ...p,
          warehouseStock: totalStock,
          activeBatchId: activeFifo?.id,
          unitCost: Number(activeCost.toFixed(3)),
        };
      })
    );
  };

  // Aggiorna data di scadenza e note di uno specifico lotto
  const updateBatchExpiry = (batchId: string, expiryDate: string, newNotes?: string) => {
    const target = purchases.find(p => p.id === batchId);
    if (!target) return;

    pushUndoSnapshot(`Modifica scadenza lotto "${target.batchNumber}"`);
    const nextPurchases = purchases.map(p => {
      if (p.id !== batchId) return p;
      return {
        ...p,
        expiryDate: expiryDate.trim() || undefined,
        notes: newNotes !== undefined ? newNotes.trim() : p.notes,
      };
    });
    setPurchases(nextPurchases);
  };

  // Segna come finito/esaurito o ripristina le scorte del lotto
  const toggleBatchFinished = (batchId: string) => {
    const target = purchases.find(p => p.id === batchId);
    if (!target) return;

    const willBeFinished = target.remainingUnits > 0;
    const newUnits = willBeFinished ? 0 : target.totalUnits;

    pushUndoSnapshot(
      willBeFinished
        ? `Segna lotto "${target.batchNumber}" come finito`
        : `Riapri lotto "${target.batchNumber}" (${target.totalUnits} pz)`
    );

    updateBatchUnits(batchId, newUnits);
  };

  // Registrazione operazione di carico e calcolo del venduto con FIFO rigoroso
  const recordRestock = (sessionData: Omit<RestockSession, 'id' | 'timestamp'>) => {
    pushUndoSnapshot(`Carico distributore ${sessionData.machineName} (${sessionData.totalSold} venduti)`);

    const timestamp = new Date().toISOString();
    let updatedPurchases = [...purchases];

    const targetMachine = machines.find(m => m.id === sessionData.machineId);

    // Mappa ciascun articolo calcolando il consumo FIFO reale e i lotti caricati
    const processedItems: (RestockItemRecord & { _finalSlotBatches?: SlotLoadedBatch[] })[] = sessionData.items.map(item => {
      const slot = targetMachine?.slots.find(s => s.id === item.slotId);
      const prod = products.find(p => p.id === item.productId);
      const activeCostInfo = getSlotActiveCost(slot, prod, updatedPurchases);
      const fallbackCost = activeCostInfo.unitCost || (prod ? prod.unitCost : item.unitCost) || 0;

      // 1. Calcola il costo reale consumando le unità vendute dalla coda dello slot
      const fifoConsumption = slot 
        ? consumeSlotFifo(slot, item.unitsSold, fallbackCost)
        : { costOfSold: Number((item.unitsSold * fallbackCost).toFixed(2)), avgUnitCost: fallbackCost, consumptions: [], remainingBatches: [] };

      // 2. Alloca le unità aggiunte (addedStock) dai lotti di magazzino in ordine FIFO
      let loadPlanAllocations: any[] = [];
      let finalSlotBatches = fifoConsumption.remainingBatches;

      if (item.addedStock > 0) {
        const loadPlan = calculateFifoLoadPlan(item.productId, item.addedStock, updatedPurchases, fallbackCost);
        loadPlanAllocations = loadPlan.allocations;

        // Scarica le quantità dai lotti di magazzino
        for (const alloc of loadPlan.allocations) {
          updatedPurchases = updatedPurchases.map(p =>
            p.id === alloc.batchId ? { ...p, remainingUnits: Math.max(0, p.remainingUnits - alloc.quantity) } : p
          );
        }

        // Appendi i nuovi lotti in fondo alla coda dello slot
        finalSlotBatches = appendLoadedBatches(
          finalSlotBatches,
          loadPlan.allocations,
          fallbackCost,
          loadPlan.unallocatedUnits
        );
      }

      const cost = fifoConsumption.costOfSold;
      const unitCost = fifoConsumption.avgUnitCost;
      const profit = Number((item.revenue - cost).toFixed(2));

      return {
        ...item,
        unitCost,
        cost,
        profit,
        batchConsumptions: fifoConsumption.consumptions,
        loadedAllocations: loadPlanAllocations,
        batchNumber: finalSlotBatches[0]?.batchNumber || item.batchNumber,
        batchId: finalSlotBatches[0]?.batchId || item.batchId,
        _finalSlotBatches: finalSlotBatches,
      };
    });

    const totalRevenue = Number(processedItems.reduce((s, i) => s + i.revenue, 0).toFixed(2));
    const totalCost = Number(processedItems.reduce((s, i) => s + i.cost, 0).toFixed(2));
    const totalProfit = Number((totalRevenue - totalCost).toFixed(2));
    const totalSold = processedItems.reduce((s, i) => s + i.unitsSold, 0);

    const newSession: RestockSession = {
      ...sessionData,
      id: `restock-${Date.now()}`,
      timestamp,
      items: processedItems,
      totalRevenue,
      totalCost,
      totalProfit,
      totalSold,
    };

    // 1. Aggiorna scorte e coda lotti della macchina interessata
    setMachines(prevMachines =>
      prevMachines.map(machine => {
        if (machine.id !== sessionData.machineId) return machine;

        const updatedSlots = machine.slots.map(slot => {
          const itemRecord = processedItems.find(i => i.slotId === slot.id);
          if (!itemRecord) return slot;

          const finalLoadedBatches = itemRecord._finalSlotBatches || slot.loadedBatches;

          return {
            ...slot,
            currentStock: itemRecord.newStock,
            lastRestockStock: itemRecord.newStock,
            salePrice: itemRecord.salePrice,
            loadedBatches: finalLoadedBatches,
            activeBatchNumber: finalLoadedBatches[0]?.batchNumber || slot.activeBatchNumber,
          };
        });

        const newCash = Math.max(0, machine.cashBalance - (sessionData.cashCollected || 0));

        const updatedMachine: VendingMachine = {
          ...machine,
          slots: updatedSlots,
          cashBalance: newCash,
          lastRestockDate: timestamp,
          status: 'operativo',
        };

        updatedMachine.status = calculateMachineStatus(updatedMachine);
        return updatedMachine;
      })
    );

    // 2. Scarica le giacenze dai lotti fornitore in magazzino
    setPurchases(updatedPurchases);

    // 3. Aggiorna scorte e costo attivo FIFO dei prodotti a magazzino
    setProducts(prevProducts =>
      prevProducts.map(p => {
        const matchingBatches = updatedPurchases.filter(b => b.productId === p.id);
        const totalStock = matchingBatches.reduce((sum, b) => sum + Math.max(0, b.remainingUnits), 0);
        const activeFifo = getActiveFifoBatch(p.id, updatedPurchases);
        const activeCost = activeFifo 
          ? (activeFifo.costBasisUsed === 'ivato' ? activeFifo.unitCostWithVat : activeFifo.unitCostNet)
          : p.unitCost;

        const sessionItem = sessionData.items.find(i => i.productId === p.id);
        const newPrice = sessionItem && sessionItem.salePrice ? sessionItem.salePrice : p.defaultPrice;

        return {
          ...p,
          warehouseStock: totalStock,
          activeBatchId: activeFifo?.id,
          unitCost: Number(activeCost.toFixed(3)),
          defaultPrice: newPrice,
        };
      })
    );

    // 4. Aggiunge la sessione allo storico vendite
    setRestockHistory(prev => [newSession, ...prev]);
  };

  // Simula vendite casuali realistiche sulle macchine per testare in tempo reale il decremento scorte
  const simulateSalesStep = () => {
    setMachines(prevMachines => {
      // Scegli una macchina a caso con scorte disponibili
      const eligibleMachines = prevMachines.filter(m => m.slots.some(s => s.currentStock > 0));
      if (eligibleMachines.length === 0) return prevMachines;

      const randomMachineIndex = Math.floor(Math.random() * eligibleMachines.length);
      const targetMachine = eligibleMachines[randomMachineIndex];

      // Scegli uno slot con stock
      const availableSlots = targetMachine.slots.filter(s => s.currentStock > 0);
      if (availableSlots.length === 0) return prevMachines;

      const randomSlot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
      const isCard = Math.random() > 0.45; // 55% POS, 45% monete

      return prevMachines.map(m => {
        if (m.id !== targetMachine.id) return m;

        const updatedSlots = m.slots.map(s => {
          if (s.id === randomSlot.id) {
            const nextStock = Math.max(0, s.currentStock - 1);
            let nextLoaded = s.loadedBatches ? s.loadedBatches.map(b => ({ ...b })) : [];
            
            // Consuma 1 unità dalla testa della coda FIFO
            if (nextLoaded.length > 0) {
              if (nextLoaded[0].units > 1) {
                nextLoaded[0].units -= 1;
              } else {
                // Il primo lotto è finito, passa al secondo lotto!
                nextLoaded.shift();
              }
            }

            return {
              ...s,
              currentStock: nextStock,
              loadedBatches: nextLoaded,
              activeBatchNumber: nextLoaded[0]?.batchNumber || s.activeBatchNumber,
            };
          }
          return s;
        });

        const updatedMachine: VendingMachine = {
          ...m,
          slots: updatedSlots,
          cashBalance: isCard ? m.cashBalance : Number((m.cashBalance + randomSlot.salePrice).toFixed(2)),
          posBalance: isCard ? Number((m.posBalance + randomSlot.salePrice).toFixed(2)) : m.posBalance,
        };

        updatedMachine.status = calculateMachineStatus(updatedMachine);
        return updatedMachine;
      });
    });
  };

  // Timer di simulazione automatica
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      simulateSalesStep();
    }, 2400);

    return () => clearInterval(interval);
  }, [isSimulating]);

  const toggleSimulation = () => {
    setIsSimulating(prev => !prev);
  };

  const updateProduct = (updated: Product) => {
    setProducts(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    // Aggiorna anche i prezzi e costi di default sugli slot se appropriato
    setMachines(prev =>
      prev.map(m => ({
        ...m,
        slots: m.slots.map(s => (s.productId === updated.id ? { ...s, salePrice: updated.defaultPrice } : s)),
      }))
    );
  };

  const addProduct = (
    newProd: Omit<Product, 'id'>,
    initialBatch?: {
      supplier?: string;
      packageCount?: number;
      unitsPerPackage?: number;
      priceInputType?: 'per_confezione' | 'totale';
      inputPrice?: number;
      vatRate?: number;
      invoiceRef?: string;
      expiryDate?: string;
      notes?: string;
      batchNumber?: string;
      date?: string;
    }
  ) => {
    pushUndoSnapshot(`Aggiunta nuovo articolo a magazzino "${newProd.name}"`);

    const productId = `prod-${Date.now()}`;
    let productStock = newProd.warehouseStock || 0;
    let createdBatchId: string | undefined = undefined;
    let finalUnitCost = newProd.unitCost;

    if (initialBatch && ((initialBatch.packageCount && initialBatch.packageCount > 0) || (initialBatch.inputPrice && initialBatch.inputPrice > 0))) {
      const packageCount = initialBatch.packageCount || 1;
      const unitsPerPackage = initialBatch.unitsPerPackage || Math.max(1, productStock);
      const totalUnits = Math.max(1, packageCount * unitsPerPackage);
      productStock = totalUnits;

      const priceInputType = initialBatch.priceInputType || 'per_confezione';
      const inputPrice = initialBatch.inputPrice ?? (newProd.unitCost * unitsPerPackage);
      const vatRate = initialBatch.vatRate ?? 22;
      const totalTaxable = priceInputType === 'per_confezione' ? inputPrice * packageCount : inputPrice;
      const totalVat = totalTaxable * (vatRate / 100);
      const totalGross = totalTaxable + totalVat;
      const unitCostNet = Number((totalTaxable / totalUnits).toFixed(3));
      const unitCostWithVat = Number((totalGross / totalUnits).toFixed(3));
      finalUnitCost = unitCostNet;

      const batchId = `batch-${Date.now()}`;
      createdBatchId = batchId;
      const newBatch: PurchaseBatch = {
        id: batchId,
        date: initialBatch.date || new Date().toISOString().slice(0, 10),
        batchNumber: initialBatch.batchNumber || `LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        productId: productId,
        productName: newProd.name,
        supplier: initialBatch.supplier || 'Fornitore Principale',
        packageCount,
        unitsPerPackage,
        totalUnits,
        remainingUnits: totalUnits,
        priceInputType,
        inputPrice,
        vatRate,
        totalTaxable,
        totalVat,
        totalGross,
        unitCostNet,
        unitCostWithVat,
        costBasisUsed: 'netto',
        invoiceRef: initialBatch.invoiceRef || 'FT-Iniziale',
        notes: initialBatch.notes,
        expiryDate: initialBatch.expiryDate,
      };

      setPurchases(prev => [newBatch, ...prev]);
    }

    const product: Product = {
      ...newProd,
      id: productId,
      unitCost: finalUnitCost,
      warehouseStock: productStock,
      activeBatchId: createdBatchId,
    };

    setProducts(prev => [...prev, product]);
  };

  const deleteProduct = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    pushUndoSnapshot(`Eliminazione prodotto "${prod?.name || 'Articolo'}"`);
    setProducts(prev => prev.filter(p => p.id !== productId));
    setPurchases(prev => prev.filter(p => p.productId !== productId));
    setMachines(prev =>
      prev.map(m => ({
        ...m,
        slots: m.slots.map(s => s.productId === productId ? { ...s, currentStock: 0, lastRestockStock: 0 } : s),
      }))
    );
  };

  const clearAllProducts = () => {
    pushUndoSnapshot('Svuotamento completo magazzino e articoli');
    setProducts([]);
    setPurchases([]);
    setMachines(prev =>
      prev.map(m => ({
        ...m,
        slots: m.slots.map(s => ({ 
          ...s, 
          currentStock: 0, 
          lastRestockStock: 0, 
          loadedBatches: [], 
          activeBatchNumber: undefined 
        })),
      }))
    );
  };

  const clearAllPurchases = () => {
    pushUndoSnapshot('Svuotamento registro lotti fornitore');
    setPurchases([]);
  };

  const updateMachineSlot = (
    machineId: string,
    slotId: string,
    updates: Partial<{ label: string; productId: string; salePrice: number; alertThreshold: number; capacity: number }>
  ) => {
    setMachines(prev =>
      prev.map(m => {
        if (m.id !== machineId) return m;
        return {
          ...m,
          slots: m.slots.map(s => {
            if (s.id !== slotId) return s;
            const newCap = updates.capacity !== undefined ? Math.max(1, Math.round(updates.capacity)) : s.capacity;
            return {
              ...s,
              ...updates,
              capacity: newCap,
              currentStock: Math.min(s.currentStock, newCap),
              lastRestockStock: Math.min(s.lastRestockStock ?? s.currentStock, newCap),
            };
          }),
        };
      })
    );
  };

  // Modifica multipla o singola di spirali, prodotti e capienza
  const updateMachineSpirals = (machineId: string, updates: SpiralConfigUpdate[]) => {
    const targetMachine = machines.find(m => m.id === machineId);
    if (!targetMachine || updates.length === 0) return;

    pushUndoSnapshot(`Modifica spirali e prodotti per ${targetMachine.name}`);

    // 1. Aggiorna nome spirale, capienza, prodotto e prezzo su ogni slot interessato
    setMachines(prev =>
      prev.map(m => {
        if (m.id !== machineId) return m;

        const updatedSlots = m.slots.map(slot => {
          const match = updates.find(u => u.slotId === slot.id);
          if (!match) return slot;

          const safeCapacity = Math.max(1, Math.round(match.capacity));
          const safeCurrentStock = Math.min(slot.currentStock, safeCapacity);
          const safeLastRestock = Math.min(slot.lastRestockStock ?? slot.currentStock, safeCapacity);

          return {
            ...slot,
            label: match.label.trim() || slot.label,
            productId: match.productId || slot.productId,
            capacity: safeCapacity,
            currentStock: safeCurrentStock,
            lastRestockStock: safeLastRestock,
            salePrice: match.salePrice !== undefined ? Math.max(0.1, Number(match.salePrice.toFixed(2))) : slot.salePrice,
            alertThreshold: match.alertThreshold !== undefined ? Math.max(0, match.alertThreshold) : slot.alertThreshold,
          };
        });

        const updatedM: VendingMachine = {
          ...m,
          slots: updatedSlots,
        };
        updatedM.status = calculateMachineStatus(updatedM);
        return updatedM;
      })
    );

    // 2. Aggiorna i nomi dei prodotti in catalogo (e defaultPrice)
    setProducts(prevProducts => {
      let changed = false;
      const nextProducts = prevProducts.map(prod => {
        const matchingUpdates = updates.filter(u => u.productId === prod.id && u.productName && u.productName.trim());
        if (matchingUpdates.length === 0) return prod;

        const latestUpdate = matchingUpdates[matchingUpdates.length - 1];
        const newName = latestUpdate.productName.trim();
        if (newName && (newName !== prod.name || (latestUpdate.salePrice && latestUpdate.salePrice !== prod.defaultPrice))) {
          changed = true;
          return {
            ...prod,
            name: newName,
            defaultPrice: latestUpdate.salePrice !== undefined ? latestUpdate.salePrice : prod.defaultPrice,
          };
        }
        return prod;
      });
      return changed ? nextProducts : prevProducts;
    });

    // 3. Sincronizza i nomi dei prodotti anche sullo storico lotti fornitore per visualizzazione uniforme
    setPurchases(prevPurchases => {
      let changed = false;
      const nextPurchases = prevPurchases.map(batch => {
        const matchingUpdate = updates.find(u => u.productId === batch.productId && u.productName && u.productName.trim());
        if (matchingUpdate && matchingUpdate.productName.trim() !== batch.productName) {
          changed = true;
          return {
            ...batch,
            productName: matchingUpdate.productName.trim(),
          };
        }
        return batch;
      });
      return changed ? nextPurchases : prevPurchases;
    });
  };

  const addSlotToMachine = (machineId: string, newSlot: Omit<MachineSlot, 'id'>) => {
    const targetMachine = machines.find(m => m.id === machineId);
    if (!targetMachine) return;

    pushUndoSnapshot(`Aggiunta spirale "${newSlot.label}" a ${targetMachine.name}`);

    const slotId = `slot-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fullSlot: MachineSlot = {
      ...newSlot,
      id: slotId,
      capacity: Math.max(1, newSlot.capacity || 20),
      currentStock: Math.max(0, newSlot.currentStock || 0),
      lastRestockStock: Math.max(0, newSlot.lastRestockStock || newSlot.currentStock || 0),
      salePrice: Math.max(0.1, newSlot.salePrice || 1.0),
      alertThreshold: newSlot.alertThreshold ?? 5,
    };

    setMachines(prev =>
      prev.map(m => {
        if (m.id !== machineId) return m;
        const updatedSlots = [...m.slots, fullSlot];
        const updatedM: VendingMachine = { ...m, slots: updatedSlots };
        updatedM.status = calculateMachineStatus(updatedM);
        return updatedM;
      })
    );
  };

  const deleteSlotFromMachine = (machineId: string, slotId: string) => {
    const targetMachine = machines.find(m => m.id === machineId);
    if (!targetMachine) return;
    const targetSlot = targetMachine.slots.find(s => s.id === slotId);

    pushUndoSnapshot(`Eliminazione spirale "${targetSlot?.label || slotId}" da ${targetMachine.name}`);

    setMachines(prev =>
      prev.map(m => {
        if (m.id !== machineId) return m;
        const updatedSlots = m.slots.filter(s => s.id !== slotId);
        const updatedM: VendingMachine = { ...m, slots: updatedSlots };
        updatedM.status = calculateMachineStatus(updatedM);
        return updatedM;
      })
    );
  };

  const updateWarehouseStock = (productId: string, newStock: number) => {
    const prod = products.find(p => p.id === productId);
    const safeStock = Math.max(0, newStock);
    pushUndoSnapshot(`Rettifica scorta magazzino "${prod?.name || 'prodotto'}" a ${safeStock} pz`);

    // Sincronizza anche con i lotti esistenti
    const productBatches = purchases.filter(p => p.productId === productId);
    let nextPurchases = [...purchases];

    if (productBatches.length > 0) {
      const currentBatchSum = productBatches.reduce((s, b) => s + b.remainingUnits, 0);
      const diff = safeStock - currentBatchSum;

      if (diff > 0) {
        // Aggiungi la differenza al lotto più recente
        const newestBatch = [...productBatches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        nextPurchases = nextPurchases.map(b => b.id === newestBatch.id ? { ...b, remainingUnits: b.remainingUnits + diff } : b);
      } else if (diff < 0) {
        // Sottrai in ordine FIFO (dalla data più vecchia)
        let toSubtract = Math.abs(diff);
        const sortedOldest = [...productBatches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        for (const b of sortedOldest) {
          if (toSubtract <= 0) break;
          const sub = Math.min(toSubtract, b.remainingUnits);
          nextPurchases = nextPurchases.map(p => p.id === b.id ? { ...p, remainingUnits: p.remainingUnits - sub } : p);
          toSubtract -= sub;
        }
      }
      setPurchases(nextPurchases);
    }

    const activeFifo = getActiveFifoBatch(productId, nextPurchases);
    setProducts(prev =>
      prev.map(p => {
        if (p.id !== productId) return p;
        return {
          ...p,
          warehouseStock: safeStock,
          activeBatchId: activeFifo?.id || p.activeBatchId,
          unitCost: activeFifo 
            ? Number((activeFifo.costBasisUsed === 'ivato' ? activeFifo.unitCostWithVat : activeFifo.unitCostNet).toFixed(3))
            : p.unitCost,
        };
      })
    );
  };

  const addNewMachine = (newMachine: Omit<VendingMachine, 'id'>) => {
    const machine: VendingMachine = {
      ...newMachine,
      id: `mach-${Date.now()}`,
      status: 'operativo',
    };
    machine.status = calculateMachineStatus(machine);
    setMachines(prev => [...prev, machine]);
  };

  const resetAllDataToZero = () => {
    pushUndoSnapshot('Azzeramento completo del gestionale a zero');
    setMachines(INITIAL_MACHINES);
    setProducts(INITIAL_PRODUCTS);
    setRestockHistory([]);
    setPurchases([]);
    setMaintenances([]);
    try {
      localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(INITIAL_MACHINES));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.MAINTENANCE, JSON.stringify([]));
    } catch (e) {
      console.error('Error resetting data to zero', e);
    }
  };

  const restoreSavedBackup = () => {
    pushUndoSnapshot('Ripristino della configurazione precedente con spirali salvata');
    setMachines(BACKUP_PREVIOUS_SOLUTION.machines);
    setProducts(BACKUP_PREVIOUS_SOLUTION.products);
    setRestockHistory(BACKUP_PREVIOUS_SOLUTION.restockHistory || []);
    setPurchases(BACKUP_PREVIOUS_SOLUTION.purchases || []);
    setMaintenances(BACKUP_PREVIOUS_SOLUTION.maintenances || []);
    try {
      localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(BACKUP_PREVIOUS_SOLUTION.machines));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(BACKUP_PREVIOUS_SOLUTION.products));
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(BACKUP_PREVIOUS_SOLUTION.restockHistory || []));
      localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(BACKUP_PREVIOUS_SOLUTION.purchases || []));
      localStorage.setItem(STORAGE_KEYS.MAINTENANCE, JSON.stringify(BACKUP_PREVIOUS_SOLUTION.maintenances || []));
    } catch (e) {
      console.error('Error restoring saved backup', e);
    }
  };

  const resetToSampleData = () => {
    resetAllDataToZero();
  };

  const exportBackupJSON = () => {
    try {
      const backupData = {
        app: 'M&S Take a Managment - Negozio H24',
        exportDate: new Date().toISOString(),
        storeName: 'M&S Take a Managment H24',
        machines,
        products,
        purchases,
        restockHistory,
        maintenances,
      };
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const a = document.createElement('a');
      a.setAttribute('href', dataStr);
      a.setAttribute('download', `backup_ms_take_a_managment_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Errore durante esportazione backup JSON', err);
    }
  };

  const exportSalesCSV = () => {
    try {
      const headers = ['Data', 'Distributore', 'Pezzi Venduti', 'Incasso (€)', 'Costo Merce (€)', 'Utile Netto (€)', 'Contanti Cassetto (€)', 'Note'];
      const rows = restockHistory.map(r => [
        `"${new Date(r.timestamp).toLocaleString('it-IT')}"`,
        `"${r.machineName.replace(/"/g, '""')}"`,
        r.totalSold,
        r.totalRevenue.toFixed(2),
        r.totalCost.toFixed(2),
        r.totalProfit.toFixed(2),
        (r.cashCollected || 0).toFixed(2),
        `"${(r.operatorNotes || '').replace(/"/g, '""')}"`
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const a = document.createElement('a');
      a.setAttribute('href', encodeURI(csvContent));
      a.setAttribute('download', `report_incassi_negozio_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Errore durante esportazione CSV', err);
    }
  };

  const canUndo = undoStack.length > 0;
  const lastActionName = undoStack[0]?.actionName || null;

  return (
    <VendingContext.Provider
      value={{
        machines,
        products,
        restockHistory,
        purchases,
        maintenances,
        addMaintenance,
        deleteMaintenance,
        updateMaintenance,
        activeModalMachineId,
        openRestockModal,
        closeRestockModal,
        recordRestock,
        addPurchase,
        deletePurchase,
        updateBatchUnits,
        updateBatchExpiry,
        toggleBatchFinished,
        simulateSalesStep,
        isSimulating,
        toggleSimulation,
        updateProduct,
        addProduct,
        deleteProduct,
        clearAllProducts,
        clearAllPurchases,
        updateMachineSlot,
        updateMachineSpirals,
        addSlotToMachine,
        deleteSlotFromMachine,
        updateWarehouseStock,
        addNewMachine,
        resetToSampleData,
        resetAllDataToZero,
        restoreSavedBackup,
        exportBackupJSON,
        exportSalesCSV,
        canUndo,
        lastActionName,
        undoLastAction,
        undoToast,
        dismissUndoToast,
      }}
    >
      {children}
    </VendingContext.Provider>
  );
};

export const useVending = () => {
  const context = useContext(VendingContext);
  if (!context) {
    throw new Error('useVending must be used within a VendingProvider');
  }
  return context;
};

