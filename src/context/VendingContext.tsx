import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  VendingMachine, 
  Product, 
  RestockSession, 
  RestockItemRecord, 
  PurchaseBatch, 
  MachineSlot, 
  SlotLoadedBatch, 
  SpiralConfigUpdate, 
  MaintenanceRecord, 
  ParsedInvoiceData, 
  ParsedInvoiceItem, 
  AppVersionMode,
  FixedCost,
  TrackedSpiralRecord,
  ProductCategory,
  CoffeeDosagePreset,
  SaveCheckpoint
} from '../types';
import { INITIAL_MACHINES, INITIAL_PRODUCTS, INITIAL_RESTOCK_HISTORY, INITIAL_PURCHASES, DEFAULT_FIXED_COSTS, DEFAULT_COFFEE_DOSAGE_PRESETS } from '../data/initialData';
import { BACKUP_PREVIOUS_SOLUTION } from '../data/savedSolutionBackup';
import { calculateMachineStatus, consumeSlotFifo, calculateFifoLoadPlan, appendLoadedBatches, getSlotActiveCost, sortSlotsByNumericOrder, compareSlotLabelsNumeric } from '../utils/vendingUtils';
import { parseExpiryFromText } from '../utils/expiryUtils';

export interface CreatePurchaseInput {
  productId: string;
  productName?: string;
  supplier: string;
  packageCount: number;
  unitsPerPackage: number;
  priceInputType: 'per_confezione' | 'per_pezzo' | 'totale';
  isPriceWithoutVat?: boolean;
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
      priceInputType?: 'per_confezione' | 'per_pezzo' | 'totale';
      isPriceWithoutVat?: boolean;
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
  updateMachineSpirals: (machineId: string, updates: SpiralConfigUpdate[], newSlotOrderIds?: string[]) => void;
  moveSlotPosition: (machineId: string, slotId: string, direction: 'up' | 'down') => void;
  changeSlotIndex: (machineId: string, slotId: string, targetIndex: number) => void;
  reorderMachineSlots: (machineId: string, orderedSlotIds: string[]) => void;
  sortSlotsNaturally: (machineId: string) => void;
  addSlotToMachine: (machineId: string, newSlot: Omit<MachineSlot, 'id'>) => void;
  deleteSlotFromMachine: (machineId: string, slotId: string) => void;
  clearAllSlotsFromMachine: (machineId: string) => void;
  updateWarehouseStock: (productId: string, newStock: number) => void;
  addNewMachine: (newMachine: Omit<VendingMachine, 'id'>) => void;
  resetToSampleData: () => void;
  resetAllDataToZero: () => void;
  restoreSavedBackup: () => void;
  exportBackupJSON: () => void;
  exportSalesCSV: () => void;
  importBackupJSON: (jsonString: string) => { success: boolean; message: string; details?: { machines: number; products: number; purchases: number; history: number } };
  getLastLocalBackupInfo: () => { timestamp: string; machinesCount: number; productsCount: number; purchasesCount: number; exportDate?: string } | null;
  restoreLastLocalBackup: () => { success: boolean; message: string };
  // Preset Grammatura e Tazzina Caffè
  dosagePresets: CoffeeDosagePreset[];
  addDosagePreset: (preset: Omit<CoffeeDosagePreset, 'id'>) => CoffeeDosagePreset;
  updateDosagePreset: (preset: CoffeeDosagePreset) => void;
  deleteDosagePreset: (id: string) => void;
  resetDosagePresets: () => void;
  // Undo support
  canUndo: boolean;
  lastActionName: string | null;
  undoLastAction: () => void;
  undoToast: UndoToastInfo | null;
  dismissUndoToast: () => void;
  // Gestione Versioni e Importazione Fatture PDF AI
  appVersionMode: AppVersionMode;
  setAppVersionMode: (mode: AppVersionMode) => void;
  importInvoicePurchases: (invoice: ParsedInvoiceData, itemsToImport: ParsedInvoiceItem[]) => { importedCount: number; totalPieces: number };
  // Costi Fissi & Guadagno Vero
  fixedCosts: FixedCost[];
  addFixedCost: (cost: Omit<FixedCost, 'id' | 'dateAdded'>) => void;
  updateFixedCost: (cost: FixedCost) => void;
  deleteFixedCost: (id: string) => void;
  // Tracciamento Singole Spirali Storiche & Finanziarie
  trackedSpirals: TrackedSpiralRecord[];
  updateTrackedSpiral: (id: string, updates: Partial<TrackedSpiralRecord>) => void;
  // Salvataggio Manuale e Auto-salvataggio Carica Rapida
  saveAllDataNow: (customLabel?: string) => { success: boolean; timestamp: string; message: string };
  lastSavedAt: string | null;
  lastAutoRestockSavedAt: string | null;
  checkpoints: SaveCheckpoint[];
  restoreCheckpoint: (checkpointId: string) => { success: boolean; message: string };
  deleteCheckpoint: (checkpointId: string) => void;
  // Copia di sicurezza salvata prima di ogni conferma (rifornimento o magazzino)
  savePreviousStateBackup: (reason: string) => SaveCheckpoint;
  lastPreConfirmBackup: SaveCheckpoint | null;
  restoreLastPreConfirmBackup: () => { success: boolean; message: string };
}

const STORAGE_KEYS = {
  MACHINES: 'vending_machines_v9_clean_zero_empty',
  PRODUCTS: 'vending_products_v9_clean_zero_empty',
  HISTORY: 'vending_history_v9_clean_zero_empty',
  PURCHASES: 'vending_purchases_v9_clean_zero_empty',
  MAINTENANCE: 'vending_maintenance_v9_clean_zero_empty',
  FIXED_COSTS: 'vending_fixed_costs_v9_clean_zero_empty',
  TRACKED_SPIRALS: 'vending_tracked_spirals_v9_clean_zero_empty',
  DOSAGE_PRESETS: 'vending_dosage_presets_v1',
  LAST_BACKUP: 'vending_last_manual_backup_json',
  LAST_RESTOCK_AUTOSAVE: 'vending_last_restock_autosave_v1',
  CHECKPOINTS: 'vending_saved_checkpoints_v1',
  LAST_PRE_CONFIRM_BACKUP: 'vending_last_pre_confirm_backup_v1',
  LAST_SAVE_TIME: 'vending_last_save_time_v1',
};

// Pulisci automaticamente tutte le versioni precedenti per garantire partenza completamente pulita e a zero
try {
  [
    'vending_machines_v8_clean_zero',
    'vending_products_v8_clean_zero',
    'vending_history_v8_clean_zero',
    'vending_purchases_v8_clean_zero',
    'vending_maintenance_v8_clean_zero',
    'vending_fixed_costs_v8_clean_zero',
    'vending_tracked_spirals_v8_clean_zero',
    'vending_machines_store_v5_clean_zero',
    'vending_products_v6_clean_zero',
    'vending_history_v5_clean_zero',
    'vending_purchases_v5_clean_zero',
    'vending_maintenance_v5_clean_zero',
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
        const parsed: VendingMachine[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 3 && parsed[0]?.id === 'mach-01') {
          return parsed.map(m => ({
            ...m,
            slots: Array.isArray(m.slots) ? sortSlotsByNumericOrder(m.slots) : [],
            cashBalance: m.cashBalance ?? 0,
            posBalance: m.posBalance ?? 0,
            coffeeCounterCurrent: m.coffeeCounterCurrent ?? 0,
            coffeeCounterLastRestock: m.coffeeCounterLastRestock ?? 0,
          }));
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
      if (saved) {
        const parsed: Product[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
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

  // Gestione Costi Fissi
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FIXED_COSTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading saved fixed costs', e);
    }
    return DEFAULT_FIXED_COSTS;
  });

  // Tracciamento Storico e Finanziario per Ogni Singola Spirale
  const [trackedSpirals, setTrackedSpirals] = useState<TrackedSpiralRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRACKED_SPIRALS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading tracked spirals', e);
    }
    return [];
  });

  // Preset Grammatura & Tazzina Caffè/Solubili
  const [dosagePresets, setDosagePresets] = useState<CoffeeDosagePreset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DOSAGE_PRESETS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading saved dosage presets', e);
    }
    return DEFAULT_COFFEE_DOSAGE_PRESETS;
  });

  const [activeModalMachineId, setActiveModalMachineId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Salvataggio Manuale e Checkpoints
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_SAVE_TIME) || null;
    } catch {
      return null;
    }
  });

  const [lastAutoRestockSavedAt, setLastAutoRestockSavedAt] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LAST_RESTOCK_AUTOSAVE);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.timestamp || null;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [checkpoints, setCheckpoints] = useState<SaveCheckpoint[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CHECKPOINTS);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [];
  });

  const [lastPreConfirmBackup, setLastPreConfirmBackup] = useState<SaveCheckpoint | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LAST_PRE_CONFIRM_BACKUP);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return null;
  });

  // Modalità Versione Applicazione (v1.5 Classica senza AI vs v2.0 Con Scanner AI PDF)
  const [appVersionMode, setAppVersionModeState] = useState<AppVersionMode>(() => {
    try {
      const saved = localStorage.getItem('vending_app_version_mode_choice');
      if (saved === 'with_ai' || saved === 'without_ai') return saved as AppVersionMode;
    } catch (e) {
      // ignore
    }
    return 'with_ai';
  });

  const setAppVersionMode = (mode: AppVersionMode) => {
    setAppVersionModeState(mode);
    try {
      localStorage.setItem('vending_app_version_mode_choice', mode);
    } catch (e) {
      // ignore
    }
  };

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

  // Salva una copia integrale del file/stato precedente (invocato prima di ogni conferma)
  const savePreviousStateBackup = useCallback((reason: string): SaveCheckpoint => {
    const timestamp = new Date().toISOString();
    const timeFormatted = new Date(timestamp).toLocaleTimeString('it-IT');
    const snapshotData = {
      machines: JSON.parse(JSON.stringify(machines)),
      products: JSON.parse(JSON.stringify(products)),
      purchases: JSON.parse(JSON.stringify(purchases)),
      restockHistory: JSON.parse(JSON.stringify(restockHistory)),
      maintenances: JSON.parse(JSON.stringify(maintenances)),
      fixedCosts: JSON.parse(JSON.stringify(fixedCosts)),
      trackedSpirals: JSON.parse(JSON.stringify(trackedSpirals)),
      dosagePresets: JSON.parse(JSON.stringify(dosagePresets)),
    };

    const newCheckpoint: SaveCheckpoint = {
      id: `pre-confirm-${Date.now()}`,
      timestamp,
      type: 'pre_confirm_backup',
      label: `Copia Pre-Conferma: ${reason} (${timeFormatted})`,
      data: snapshotData,
      details: {
        machinesCount: machines.length,
        productsCount: products.length,
        purchasesCount: purchases.length,
        historyCount: restockHistory.length,
      }
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CHECKPOINTS);
      const prevCheckpoints: SaveCheckpoint[] = raw ? JSON.parse(raw) : [];
      const updatedCheckpoints = [newCheckpoint, ...prevCheckpoints.filter(c => c.id !== newCheckpoint.id)].slice(0, 20);
      localStorage.setItem(STORAGE_KEYS.CHECKPOINTS, JSON.stringify(updatedCheckpoints));
      localStorage.setItem(STORAGE_KEYS.LAST_PRE_CONFIRM_BACKUP, JSON.stringify(newCheckpoint));
      setCheckpoints(updatedCheckpoints);
      setLastPreConfirmBackup(newCheckpoint);
      setLastSavedAt(timestamp);
    } catch (e) {
      console.error('Errore salvataggio copia precedente:', e);
    }

    return newCheckpoint;
  }, [machines, products, purchases, restockHistory, maintenances, fixedCosts, trackedSpirals, dosagePresets]);

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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FIXED_COSTS, JSON.stringify(fixedCosts));
    } catch (e) {
      console.error(e);
    }
  }, [fixedCosts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TRACKED_SPIRALS, JSON.stringify(trackedSpirals));
    } catch (e) {
      console.error(e);
    }
  }, [trackedSpirals]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DOSAGE_PRESETS, JSON.stringify(dosagePresets));
    } catch (e) {
      console.error(e);
    }
  }, [dosagePresets]);

  // Tracciamento automatico e persistente di ogni singola spirale (attiva o chiusa)
  useEffect(() => {
    // 1. Calcola dati finanziari aggregati per ogni (machineId, slotId) dallo storico ricariche
    const financialsBySlot: Record<string, { unitsSold: number; revenue: number; cost: number; profit: number; firstDate?: string; lastDate?: string }> = {};
    for (const session of restockHistory) {
      for (const item of (session.items || [])) {
        const key = `${session.machineId}___${item.slotId}`;
        if (!financialsBySlot[key]) {
          financialsBySlot[key] = { unitsSold: 0, revenue: 0, cost: 0, profit: 0, firstDate: session.timestamp, lastDate: session.timestamp };
        }
        financialsBySlot[key].unitsSold += (item.unitsSold || 0);
        financialsBySlot[key].revenue += (item.revenue || 0);
        financialsBySlot[key].cost += (item.cost || 0);
        financialsBySlot[key].profit += (item.profit || 0);
        if (new Date(session.timestamp).getTime() < new Date(financialsBySlot[key].firstDate!).getTime()) {
          financialsBySlot[key].firstDate = session.timestamp;
        }
        if (new Date(session.timestamp).getTime() > new Date(financialsBySlot[key].lastDate!).getTime()) {
          financialsBySlot[key].lastDate = session.timestamp;
        }
      }
    }

    setTrackedSpirals(prevTracked => {
      const updated = [...prevTracked];
      let hasChanges = false;

      // 2. Assicurati che ogni spirale attualmente presente nei distributori sia tracciata come 'attiva'
      for (const machine of machines) {
        for (const slot of (machine.slots || [])) {
          const key = `${machine.id}___${slot.id}`;
          const prod = products.find(p => p.id === slot.productId) || products.find(p => p.name.toLowerCase() === slot.label.toLowerCase());
          const fin = financialsBySlot[key] || { unitsSold: 0, revenue: 0, cost: 0, profit: 0 };
          const existingIdx = updated.findIndex(t => t.machineId === machine.id && t.slotId === slot.id);

          if (existingIdx >= 0) {
            const current = updated[existingIdx];
            if (
              current.status !== 'attiva' ||
              current.label !== slot.label ||
              current.productId !== slot.productId ||
              current.productName !== (prod?.name || current.productName) ||
              current.productCategory !== prod?.category ||
              current.totalUnitsSold !== fin.unitsSold ||
              current.totalRevenue !== fin.revenue ||
              current.totalCost !== fin.cost ||
              current.totalProfit !== fin.profit ||
              current.currentCapacity !== slot.capacity ||
              current.currentStock !== slot.currentStock ||
              current.currentSalePrice !== slot.salePrice
            ) {
              hasChanges = true;
              updated[existingIdx] = {
                ...current,
                machineCode: machine.code,
                machineName: machine.name,
                machineType: machine.type,
                label: slot.label,
                productId: slot.productId,
                productName: prod?.name || slot.label,
                productCategory: prod?.category,
                status: 'attiva',
                closedDate: undefined,
                totalUnitsSold: fin.unitsSold,
                totalRevenue: fin.revenue,
                totalCost: fin.cost,
                totalProfit: fin.profit,
                currentCapacity: slot.capacity,
                currentStock: slot.currentStock,
                currentSalePrice: slot.salePrice,
              };
            }
          } else {
            hasChanges = true;
            updated.push({
              id: `track-${machine.id}-${slot.id}`,
              machineId: machine.id,
              machineCode: machine.code,
              machineName: machine.name,
              machineType: machine.type,
              slotId: slot.id,
              label: slot.label,
              productId: slot.productId,
              productName: prod?.name || slot.label,
              productCategory: prod?.category,
              status: 'attiva',
              startDate: fin.firstDate || new Date().toISOString(),
              totalUnitsSold: fin.unitsSold,
              totalRevenue: fin.revenue,
              totalCost: fin.cost,
              totalProfit: fin.profit,
              currentCapacity: slot.capacity,
              currentStock: slot.currentStock,
              currentSalePrice: slot.salePrice,
            });
          }
        }
      }

      // 3. Se una spirale era tracciata ma ora non è più presente nella macchinetta:
      // NON eliminarla! Mettila in colore diverso e contrassegnala come 'chiusa' mostrando costi, ricavi e periodo di attività
      for (let i = 0; i < updated.length; i++) {
        const item = updated[i];
        const machine = machines.find(m => m.id === item.machineId);
        const slotStillExists = machine?.slots?.some(s => s.id === item.slotId);

        if (!slotStillExists && item.status === 'attiva') {
          hasChanges = true;
          const key = `${item.machineId}___${item.slotId}`;
          const fin = financialsBySlot[key];
          updated[i] = {
            ...item,
            status: 'chiusa',
            closedDate: item.closedDate || fin?.lastDate || new Date().toISOString(),
            totalUnitsSold: fin ? fin.unitsSold : item.totalUnitsSold,
            totalRevenue: fin ? fin.revenue : item.totalRevenue,
            totalCost: fin ? fin.cost : item.totalCost,
            totalProfit: fin ? fin.profit : item.totalProfit,
          };
        }
      }

      return hasChanges ? updated : prevTracked;
    });
  }, [machines, restockHistory, products]);

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

  // Metodi Gestione Spese Fisse
  const addFixedCost = (cost: Omit<FixedCost, 'id' | 'dateAdded'>) => {
    pushUndoSnapshot(`Aggiunta spesa fissa "${cost.name}"`);
    const newCost: FixedCost = {
      ...cost,
      id: `fc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      dateAdded: new Date().toISOString().split('T')[0],
      autoDeduction: cost.autoDeduction ?? true,
    };
    setFixedCosts(prev => [newCost, ...prev]);
  };

  const updateFixedCost = (cost: FixedCost) => {
    pushUndoSnapshot(`Modifica spesa fissa "${cost.name}"`);
    setFixedCosts(prev => prev.map(c => c.id === cost.id ? cost : c));
  };

  const deleteFixedCost = (id: string) => {
    const target = fixedCosts.find(c => c.id === id);
    pushUndoSnapshot(`Eliminazione spesa fissa "${target?.name || ''}"`);
    setFixedCosts(prev => prev.filter(c => c.id !== id));
  };

  // Aggiornamento manuale o note singola spirale tracciata
  const updateTrackedSpiral = (id: string, updates: Partial<TrackedSpiralRecord>) => {
    setTrackedSpirals(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
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

    savePreviousStateBackup(`Carico acquisto ${totalUnits} pz "${prodName}"`);
    pushUndoSnapshot(`Acquisto ${totalUnits} pz "${prodName}" (${input.invoiceRef || 'Fattura'})`);

    let totalTaxable = 0;
    let totalGross = 0;

    // Se l'utente ha inserito il prezzo senza IVA (default true per l'acquisto all'ingrosso)
    const isWithoutVat = input.isPriceWithoutVat !== false;

    if (input.priceInputType === 'per_pezzo') {
      if (isWithoutVat) {
        totalTaxable = input.inputPrice * totalUnits;
        const totalVat = totalTaxable * (input.vatRate / 100);
        totalGross = totalTaxable + totalVat;
      } else {
        totalGross = input.inputPrice * totalUnits;
        totalTaxable = totalGross / (1 + input.vatRate / 100);
      }
    } else if (input.priceInputType === 'per_confezione') {
      if (isWithoutVat) {
        totalTaxable = input.inputPrice * input.packageCount;
        const totalVat = totalTaxable * (input.vatRate / 100);
        totalGross = totalTaxable + totalVat;
      } else {
        totalGross = input.inputPrice * input.packageCount;
        totalTaxable = totalGross / (1 + input.vatRate / 100);
      }
    } else {
      // totale
      if (isWithoutVat) {
        totalTaxable = input.inputPrice;
        const totalVat = totalTaxable * (input.vatRate / 100);
        totalGross = totalTaxable + totalVat;
      } else {
        totalGross = input.inputPrice;
        totalTaxable = totalGross / (1 + input.vatRate / 100);
      }
    }

    const totalVat = totalGross - totalTaxable;
    // Costo unitario netto e ivato: arrotondato ai 2 decimali (centesimi es. 0.537 -> 0.54)
    const unitCostNet = Math.round((totalTaxable / totalUnits) * 100) / 100;
    const unitCostWithVat = Math.round((totalGross / totalUnits) * 100) / 100;
    
    // Negli altri menu mostriamo tutti i prezzi già IVA compresa: usiamo di default 'ivato'
    const costBasis = input.costBasisUsed || 'ivato';
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
      isPriceWithoutVat: isWithoutVat,
      inputPrice: input.inputPrice,
      vatRate: input.vatRate,
      totalTaxable: Number(totalTaxable.toFixed(2)),
      totalVat: Number(totalVat.toFixed(2)),
      totalGross: Number(totalGross.toFixed(2)),
      unitCostNet: unitCostNet,
      unitCostWithVat: unitCostWithVat,
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
      ? (activeFifo.unitCostWithVat > 0 ? activeFifo.unitCostWithVat : (activeFifo.costBasisUsed === 'ivato' ? activeFifo.unitCostWithVat : activeFifo.unitCostNet))
      : unitCostWithVat;

    setProducts(prev => {
      const exists = prev.some(p => p.id === input.productId);
      const totalStock = calculateProductWarehouseStock(input.productId, nextPurchases);
      const activeCostVal = Number(activeCost.toFixed(2));
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
          ? (activeFifo.unitCostWithVat > 0 ? activeFifo.unitCostWithVat : (activeFifo.costBasisUsed === 'ivato' ? activeFifo.unitCostWithVat : activeFifo.unitCostNet))
          : p.unitCost;
        return {
          ...p,
          unitCost: Number(activeCost.toFixed(2)),
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
    savePreviousStateBackup(`Rettifica lotto "${target.batchNumber}" (a ${safeUnits} pz)`);
    pushUndoSnapshot(`Rettifica lotto "${target.batchNumber}" a ${safeUnits} pz`);

    const nextPurchases = purchases.map(p => (p.id === batchId ? { ...p, remainingUnits: safeUnits } : p));
    setPurchases(nextPurchases);

    const activeFifo = getActiveFifoBatch(target.productId, nextPurchases);
    setProducts(prev =>
      prev.map(p => {
        if (p.id !== target.productId) return p;
        const totalStock = calculateProductWarehouseStock(p.id, nextPurchases);
        const activeCost = activeFifo 
          ? (activeFifo.unitCostWithVat > 0 ? activeFifo.unitCostWithVat : (activeFifo.costBasisUsed === 'ivato' ? activeFifo.unitCostWithVat : activeFifo.unitCostNet))
          : p.unitCost;
        return {
          ...p,
          warehouseStock: totalStock,
          activeBatchId: activeFifo?.id,
          unitCost: Number(activeCost.toFixed(2)),
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

  // Importazione massiva e carico magazzino da fattura PDF analizzata con AI
  const importInvoicePurchases = (invoice: ParsedInvoiceData, itemsToImport: ParsedInvoiceItem[]): { importedCount: number; totalPieces: number } => {
    const validItems = itemsToImport.filter(item => (item.selectedForImport ?? true) && item.quantity > 0);
    if (validItems.length === 0) return { importedCount: 0, totalPieces: 0 };

    pushUndoSnapshot(`Importazione Fattura AI ${invoice.invoiceNumber || 'Doc'} (${invoice.supplierName || 'Fornitore'}) - ${validItems.length} articoli`);

    let nextProducts = [...products];
    const newBatches: PurchaseBatch[] = [];
    let totalPiecesImported = 0;

    validItems.forEach((item, idx) => {
      totalPiecesImported += item.quantity;
      const batchCode = item.batchNumber?.trim() || `LOT-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`;
      const purchaseDate = invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString() : new Date().toISOString();

      let targetProductId = item.matchedProductId;
      let prod = nextProducts.find(p => p.id === targetProductId);

      // Se non abbinato o se è un nuovo articolo, crealo a catalogo
      if (!prod || item.isNewProduct) {
        const cleanNameSlug = item.productName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
          .slice(0, 20);
        targetProductId = `prod-${cleanNameSlug}-${Date.now()}-${idx}`;

        const roundedUnitCost = Math.round((Number(item.unitCost) + Number.EPSILON) * 100) / 100;
        const newProduct: Product = {
          id: targetProductId,
          name: item.productName.trim(),
          category: item.category || 'bevande_fredde',
          unitCost: roundedUnitCost,
          defaultPrice: item.defaultPrice > 0 ? Number(item.defaultPrice.toFixed(2)) : Number((roundedUnitCost * 2.2).toFixed(2)),
          unit: item.unit?.trim() || 'pz',
          warehouseStock: item.quantity,
          warehouseAlertThreshold: 8,
          description: `Caricato da fattura ${invoice.invoiceNumber} (${invoice.supplierName})`,
        };
        nextProducts.push(newProduct);
      } else {
        // Articolo esistente: incrementa giacenza magazzino e aggiorna costo unitario d'acquisto
        const roundedUnitCost = Math.round((Number(item.unitCost) + Number.EPSILON) * 100) / 100;
        nextProducts = nextProducts.map(p => {
          if (p.id !== targetProductId) return p;
          return {
            ...p,
            warehouseStock: (p.warehouseStock || 0) + item.quantity,
            unitCost: roundedUnitCost,
            defaultPrice: item.defaultPrice > 0 ? item.defaultPrice : p.defaultPrice,
          };
        });
      }

      const roundedUnitCost = Math.round((Number(item.unitCost) + Number.EPSILON) * 100) / 100;
      const totalTaxable = Number((item.totalCostNet || (roundedUnitCost * item.quantity)).toFixed(2));
      const vatRate = item.vatRate || invoice.taxRate || 22;
      const totalVat = Number((totalTaxable * (vatRate / 100)).toFixed(2));
      const totalGross = Number((totalTaxable + totalVat).toFixed(2));
      const unitCostWithVat = Number((totalGross / item.quantity).toFixed(2));

      const newBatch: PurchaseBatch = {
        id: `purch-ai-${Date.now()}-${idx}`,
        date: purchaseDate,
        batchNumber: batchCode,
        productId: targetProductId,
        productName: item.productName.trim(),
        supplier: invoice.supplierName.trim() || 'Fornitore Fattura',
        packageCount: item.packageCount || 1,
        unitsPerPackage: item.unitsPerPackage || item.quantity,
        totalUnits: item.quantity,
        remainingUnits: item.quantity,
        priceInputType: 'totale',
        inputPrice: totalTaxable,
        vatRate,
        totalTaxable,
        totalVat,
        totalGross,
        unitCostNet: roundedUnitCost,
        unitCostWithVat,
        costBasisUsed: 'netto',
        invoiceRef: invoice.invoiceNumber?.trim() || 'Fattura AI',
        notes: `Fattura ${invoice.invoiceNumber || ''}${item.expiryDate ? ' | Scadenza: ' + item.expiryDate : ''}${invoice.notes ? ' | ' + invoice.notes : ''}`.trim(),
        expiryDate: item.expiryDate || undefined,
      };

      newBatches.push(newBatch);
    });

    const nextPurchases = [...newBatches, ...purchases];
    setPurchases(nextPurchases);
    setProducts(nextProducts);

    return { importedCount: validItems.length, totalPieces: totalPiecesImported };
  };


  // Registrazione operazione di carico e calcolo del venduto con FIFO rigoroso
  const recordRestock = (sessionData: Omit<RestockSession, 'id' | 'timestamp'>) => {
    // 0. SALVA SEMPRE LA COPIA DEL FILE PRECEDENTE PRIMA DI APPLICARE LA CONFERMA
    savePreviousStateBackup(`Rifornimento ${sessionData.machineName}`);
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

      // Se ci sono unità tolte dal distributore (scadute o rese a magazzino):
      if (item.unitsRemoved && item.unitsRemoved > 0) {
        let remainingToRemove = item.unitsRemoved;
        const cleanedBatches: SlotLoadedBatch[] = [];
        for (const b of finalSlotBatches) {
          if (remainingToRemove <= 0) {
            cleanedBatches.push(b);
          } else if (b.units <= remainingToRemove) {
            remainingToRemove -= b.units;
          } else {
            cleanedBatches.push({ ...b, units: b.units - remainingToRemove });
            remainingToRemove = 0;
          }
        }
        finalSlotBatches = cleanedBatches;

        // Se contrassegnato come "Reso a magazzino", riaccredita le unità a magazzino nel lotto del prodotto
        if (item.returnToWarehouse) {
          const targetBatchIndex = updatedPurchases.findIndex(p => p.productId === item.productId && p.remainingUnits > 0);
          const fallbackBatchIndex = updatedPurchases.findIndex(p => p.productId === item.productId);
          const idxToCredit = targetBatchIndex !== -1 ? targetBatchIndex : fallbackBatchIndex;
          if (idxToCredit !== -1) {
            updatedPurchases = updatedPurchases.map((p, pIdx) => 
              pIdx === idxToCredit ? { ...p, remainingUnits: p.remainingUnits + item.unitsRemoved! } : p
            );
          }
        }
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
    const updatedMachines = machines.map(machine => {
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
        coffeeCounterLastRestock: sessionData.coffeeCounterPrevious ?? machine.coffeeCounterLastRestock,
        coffeeCounterCurrent: sessionData.coffeeCounterCurrent ?? machine.coffeeCounterCurrent,
      };

      updatedMachine.status = calculateMachineStatus(updatedMachine);
      return updatedMachine;
    });

    setMachines(updatedMachines);

    // 2. Scarica le giacenze dai lotti fornitore in magazzino
    setPurchases(updatedPurchases);

    // 3. Aggiorna scorte e costo attivo FIFO dei prodotti a magazzino
    const updatedProducts = products.map(p => {
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
    });

    setProducts(updatedProducts);

    // 4. Aggiunge la sessione allo storico vendite
    const updatedHistory = [newSession, ...restockHistory];
    setRestockHistory(updatedHistory);

    // 5. SALVATAGGIO AUTOMATICO IMMEDIATO AD OGNI CARICA RAPIDA CONFERMATA:
    try {
      localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(updatedMachines));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
      localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(updatedPurchases));
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory));
      localStorage.setItem(STORAGE_KEYS.LAST_SAVE_TIME, timestamp);
      localStorage.setItem(STORAGE_KEYS.LAST_RESTOCK_AUTOSAVE, JSON.stringify({
        timestamp,
        machineName: sessionData.machineName,
        totalSold: sessionData.totalSold,
        totalRevenue,
      }));

      const autoSnapshotData = {
        machines: updatedMachines,
        products: updatedProducts,
        purchases: updatedPurchases,
        restockHistory: updatedHistory,
        maintenances,
        fixedCosts,
        trackedSpirals,
        dosagePresets,
      };

      const autoCheckpoint: SaveCheckpoint = {
        id: `auto-restock-${Date.now()}`,
        timestamp,
        type: 'auto_restock',
        label: `Carica Rapida: ${sessionData.machineName}`,
        data: autoSnapshotData,
        details: {
          machinesCount: updatedMachines.length,
          productsCount: updatedProducts.length,
          purchasesCount: updatedPurchases.length,
          historyCount: updatedHistory.length,
        }
      };

      const rawCheckpoints = localStorage.getItem(STORAGE_KEYS.CHECKPOINTS);
      const parsedCheckpoints: SaveCheckpoint[] = rawCheckpoints ? JSON.parse(rawCheckpoints) : [];
      const nextCheckpoints = [autoCheckpoint, ...parsedCheckpoints.filter(c => c.id !== autoCheckpoint.id)].slice(0, 15);
      localStorage.setItem(STORAGE_KEYS.CHECKPOINTS, JSON.stringify(nextCheckpoints));
      setCheckpoints(nextCheckpoints);
      setLastSavedAt(timestamp);
      setLastAutoRestockSavedAt(timestamp);
    } catch (e) {
      console.error('Errore auto-salvataggio carica rapida', e);
    }
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
    savePreviousStateBackup(`Modifica dati prodotto: ${updated.name}`);
    pushUndoSnapshot(`Modifica prodotto "${updated.name}"`);
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
      priceInputType?: 'per_confezione' | 'per_pezzo' | 'totale';
      isPriceWithoutVat?: boolean;
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
      const isWithoutVat = initialBatch.isPriceWithoutVat !== false;
      const inputPrice = initialBatch.inputPrice ?? (newProd.unitCost * unitsPerPackage);
      const vatRate = initialBatch.vatRate ?? 22;

      let totalTaxable = 0;
      let totalGross = 0;

      if (priceInputType === 'per_pezzo') {
        if (isWithoutVat) {
          totalTaxable = inputPrice * totalUnits;
          totalGross = totalTaxable * (1 + vatRate / 100);
        } else {
          totalGross = inputPrice * totalUnits;
          totalTaxable = totalGross / (1 + vatRate / 100);
        }
      } else if (priceInputType === 'per_confezione') {
        if (isWithoutVat) {
          totalTaxable = inputPrice * packageCount;
          totalGross = totalTaxable * (1 + vatRate / 100);
        } else {
          totalGross = inputPrice * packageCount;
          totalTaxable = totalGross / (1 + vatRate / 100);
        }
      } else {
        // totale
        if (isWithoutVat) {
          totalTaxable = inputPrice;
          totalGross = totalTaxable * (1 + vatRate / 100);
        } else {
          totalGross = inputPrice;
          totalTaxable = totalGross / (1 + vatRate / 100);
        }
      }

      const totalVat = Math.max(0, totalGross - totalTaxable);
      // Arrotondamento standard per eccesso/difetto ai centesimi (es. 0.537 -> 0.54)
      const unitCostNet = Math.round((totalTaxable / totalUnits) * 100) / 100;
      const unitCostWithVat = Math.round((totalGross / totalUnits) * 100) / 100;
      finalUnitCost = unitCostWithVat; // Negli altri menu mostriamo tutti i prezzi già IVA compresa

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
        isPriceWithoutVat: isWithoutVat,
        inputPrice,
        vatRate,
        totalTaxable: Number(totalTaxable.toFixed(2)),
        totalVat: Number(totalVat.toFixed(2)),
        totalGross: Number(totalGross.toFixed(2)),
        unitCostNet,
        unitCostWithVat,
        costBasisUsed: 'ivato',
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
    savePreviousStateBackup(`Eliminazione prodotto: ${prod?.name || 'Articolo'}`);
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
        const modifiedSlots = m.slots.map(s => {
          if (s.id !== slotId) return s;
          const newCap = updates.capacity !== undefined ? Math.max(1, Math.round(updates.capacity)) : s.capacity;
          return {
            ...s,
            ...updates,
            label: updates.label !== undefined ? updates.label.trim() : s.label,
            capacity: newCap,
            currentStock: Math.min(s.currentStock, newCap),
            lastRestockStock: Math.min(s.lastRestockStock ?? s.currentStock, newCap),
          };
        });

        // Riordina sempre le spirali in ordine numerico progressivo: se si modifica il numero si sposta automaticamente
        const sortedSlots = sortSlotsByNumericOrder(modifiedSlots);
        const updatedM: VendingMachine = {
          ...m,
          slots: sortedSlots,
        };
        updatedM.status = calculateMachineStatus(updatedM);
        return updatedM;
      })
    );
  };

  // Modifica multipla o singola di spirali, prodotti e capienza
  const updateMachineSpirals = (machineId: string, updates: SpiralConfigUpdate[], newSlotOrderIds?: string[]) => {
    const targetMachine = machines.find(m => m.id === machineId);
    if (!targetMachine || updates.length === 0) return;

    pushUndoSnapshot(`Modifica spirali e prodotti per ${targetMachine.name}`);

    // 1. Aggiorna nome spirale, capienza, prodotto e prezzo su ogni slot interessato
    setMachines(prev =>
      prev.map(m => {
        if (m.id !== machineId) return m;

        let updatedSlots = m.slots.map(slot => {
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

        // Ordina sempre le spirali in ordine numerico progressivo automatico
        updatedSlots = sortSlotsByNumericOrder(updatedSlots);

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

    const isCoffee = targetMachine.type === 'caffe_calde';
    pushUndoSnapshot(isCoffee ? `Aggiunto cassetto "${newSlot.label}" a ${targetMachine.name}` : `Aggiunta spirale "${newSlot.label}" a ${targetMachine.name}`);

    const slotId = `slot-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fullSlot: MachineSlot = {
      ...newSlot,
      id: slotId,
      capacity: Math.max(1, newSlot.capacity || (isCoffee ? 100 : 20)),
      currentStock: Math.max(0, newSlot.currentStock || 0),
      lastRestockStock: Math.max(0, newSlot.lastRestockStock || newSlot.currentStock || 0),
      salePrice: Math.max(0.0, newSlot.salePrice ?? (isCoffee ? 0 : 1.0)),
      alertThreshold: newSlot.alertThreshold ?? (isCoffee ? 20 : 5),
    };

    setMachines(prev =>
      prev.map(m => {
        if (m.id !== machineId) return m;
        // Colloca automaticamente il nuovo slot nella posizione numerica corretta
        const updatedSlots = sortSlotsByNumericOrder([...m.slots, fullSlot]);
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

    const isCoffee = targetMachine.type === 'caffe_calde';
    pushUndoSnapshot(isCoffee ? `Eliminazione cassetto "${targetSlot?.label || slotId}" da ${targetMachine.name}` : `Eliminazione spirale "${targetSlot?.label || slotId}" da ${targetMachine.name}`);

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

  const clearAllSlotsFromMachine = (machineId: string) => {
    const targetMachine = machines.find(m => m.id === machineId);
    if (!targetMachine) return;

    const isCoffee = targetMachine.type === 'caffe_calde';
    pushUndoSnapshot(isCoffee ? `Eliminazione di tutti i cassetti da ${targetMachine.name}` : `Eliminazione di tutte le spirali da ${targetMachine.name}`);

    setMachines(prev =>
      prev.map(m => {
        if (m.id !== machineId) return m;
        const updatedM: VendingMachine = { ...m, slots: [] };
        updatedM.status = calculateMachineStatus(updatedM);
        return updatedM;
      })
    );
  };

  // Sposta una spirale/cassetto di 1 posizione in su o in giù
  const moveSlotPosition = (machineId: string, slotId: string, direction: 'up' | 'down') => {
    const targetMachine = machines.find(m => m.id === machineId);
    if (!targetMachine) return;
    const currentIndex = targetMachine.slots.findIndex(s => s.id === slotId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= targetMachine.slots.length) return;

    const isCoffee = targetMachine.type === 'caffe_calde';
    const slotName = targetMachine.slots[currentIndex].label;
    pushUndoSnapshot(`Spostato ${isCoffee ? 'cassetto' : 'spirale'} "${slotName}" a posizione #${targetIndex + 1}`);

    setMachines(prev =>
      prev.map(m => {
        if (m.id !== machineId) return m;
        const newSlots = [...m.slots];
        const [moved] = newSlots.splice(currentIndex, 1);
        newSlots.splice(targetIndex, 0, moved);
        return { ...m, slots: newSlots };
      })
    );
  };

  // Sposta una spirale direttamente a un indice di posizione specifico (0-based)
  const changeSlotIndex = (machineId: string, slotId: string, targetIndex: number) => {
    const targetMachine = machines.find(m => m.id === machineId);
    if (!targetMachine) return;
    const currentIndex = targetMachine.slots.findIndex(s => s.id === slotId);
    if (currentIndex === -1) return;

    const clampedIndex = Math.max(0, Math.min(targetIndex, targetMachine.slots.length - 1));
    if (clampedIndex === currentIndex) return;

    const isCoffee = targetMachine.type === 'caffe_calde';
    const slotName = targetMachine.slots[currentIndex].label;
    pushUndoSnapshot(`Spostato ${isCoffee ? 'cassetto' : 'spirale'} "${slotName}" da pos. #${currentIndex + 1} a #${clampedIndex + 1}`);

    setMachines(prev =>
      prev.map(m => {
        if (m.id !== machineId) return m;
        const newSlots = [...m.slots];
        const [moved] = newSlots.splice(currentIndex, 1);
        newSlots.splice(clampedIndex, 0, moved);
        return { ...m, slots: newSlots };
      })
    );
  };

  // Riordina completamente gli slot in base a un array di ID
  const reorderMachineSlots = (machineId: string, orderedSlotIds: string[]) => {
    const targetMachine = machines.find(m => m.id === machineId);
    if (!targetMachine) return;

    const isCoffee = targetMachine.type === 'caffe_calde';
    pushUndoSnapshot(`Riordinamento ${isCoffee ? 'cassetti' : 'spirali'} per ${targetMachine.name}`);

    setMachines(prev =>
      prev.map(m => {
        if (m.id !== machineId) return m;
        const slotMap = new Map(m.slots.map(s => [s.id, s]));
        const newSlots: MachineSlot[] = [];
        for (const id of orderedSlotIds) {
          const slot = slotMap.get(id);
          if (slot) {
            newSlots.push(slot);
            slotMap.delete(id);
          }
        }
        slotMap.forEach(slot => newSlots.push(slot));
        return { ...m, slots: newSlots };
      })
    );
  };

  // Ordina le spirali in ordine numerico progressivo
  const sortSlotsNaturally = (machineId: string) => {
    const targetMachine = machines.find(m => m.id === machineId);
    if (!targetMachine) return;

    const isCoffee = targetMachine.type === 'caffe_calde';
    pushUndoSnapshot(`Ordinamento numerico ${isCoffee ? 'cassetti' : 'spirali'} per ${targetMachine.name}`);

    setMachines(prev =>
      prev.map(m => {
        if (m.id !== machineId) return m;
        const sortedSlots = sortSlotsByNumericOrder(m.slots);
        return { ...m, slots: sortedSlots };
      })
    );
  };

  const updateWarehouseStock = (productId: string, newStock: number) => {
    const prod = products.find(p => p.id === productId);
    const safeStock = Math.max(0, newStock);
    savePreviousStateBackup(`Rettifica magazzino: ${prod?.name || 'prodotto'} (a ${safeStock} pz)`);
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
    const cleanMachines: VendingMachine[] = INITIAL_MACHINES.map(m => ({
      ...m,
      slots: [],
      cashBalance: 0,
      posBalance: 0,
      lastRestockDate: '',
      coffeeCounterCurrent: 0,
      coffeeCounterLastRestock: 0,
      status: 'operativo' as const,
    }));
    setMachines(cleanMachines);
    setProducts([]);
    setRestockHistory([]);
    setPurchases([]);
    setMaintenances([]);
    setTrackedSpirals([]);
    try {
      localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(cleanMachines));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.MAINTENANCE, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.TRACKED_SPIRALS, JSON.stringify([]));
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
        fixedCosts,
        trackedSpirals,
        dosagePresets,
      };

      try {
        localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, JSON.stringify({
          timestamp: new Date().toISOString(),
          backupData
        }));
      } catch (storageErr) {
        console.warn('Impossibile salvare copia locale nel browser', storageErr);
      }

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

  const importBackupJSON = useCallback((jsonString: string): { success: boolean; message: string; details?: { machines: number; products: number; purchases: number; history: number } } => {
    try {
      if (!jsonString || !jsonString.trim()) {
        return { success: false, message: 'Il file selezionato è vuoto.' };
      }
      const parsed = JSON.parse(jsonString);
      const data = parsed.backupData || parsed;

      if (!data || (!data.machines && !data.products)) {
        return {
          success: false,
          message: 'Il file selezionato non è un backup valido di M&S Take a Management (mancano distributori o catalogo prodotti).'
        };
      }

      pushUndoSnapshot('Ripristino backup da file JSON');

      const restoredMachines: VendingMachine[] = Array.isArray(data.machines) ? data.machines : machines;
      const restoredProducts: Product[] = Array.isArray(data.products) ? data.products : products;
      const restoredPurchases: PurchaseBatch[] = Array.isArray(data.purchases) ? data.purchases : purchases;
      const restoredHistory: RestockSession[] = Array.isArray(data.restockHistory) ? data.restockHistory : restockHistory;
      const restoredMaintenances: MaintenanceRecord[] = Array.isArray(data.maintenances) ? data.maintenances : maintenances;
      const restoredFixedCosts: FixedCost[] = Array.isArray(data.fixedCosts) ? data.fixedCosts : fixedCosts;
      const restoredTrackedSpirals: TrackedSpiralRecord[] = Array.isArray(data.trackedSpirals) ? data.trackedSpirals : trackedSpirals;
      const restoredDosagePresets: CoffeeDosagePreset[] = Array.isArray(data.dosagePresets) ? data.dosagePresets : dosagePresets;

      setMachines(restoredMachines);
      setProducts(restoredProducts);
      setPurchases(restoredPurchases);
      setRestockHistory(restoredHistory);
      setMaintenances(restoredMaintenances);
      if (Array.isArray(data.fixedCosts)) setFixedCosts(restoredFixedCosts);
      if (Array.isArray(data.trackedSpirals)) setTrackedSpirals(restoredTrackedSpirals);
      if (Array.isArray(data.dosagePresets)) setDosagePresets(restoredDosagePresets);

      try {
        localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(restoredMachines));
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(restoredProducts));
        localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(restoredPurchases));
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(restoredHistory));
        localStorage.setItem(STORAGE_KEYS.MAINTENANCE, JSON.stringify(restoredMaintenances));
        if (Array.isArray(data.fixedCosts)) localStorage.setItem(STORAGE_KEYS.FIXED_COSTS, JSON.stringify(restoredFixedCosts));
        if (Array.isArray(data.trackedSpirals)) localStorage.setItem(STORAGE_KEYS.TRACKED_SPIRALS, JSON.stringify(restoredTrackedSpirals));
        if (Array.isArray(data.dosagePresets)) localStorage.setItem(STORAGE_KEYS.DOSAGE_PRESETS, JSON.stringify(restoredDosagePresets));
        
        localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, JSON.stringify({
          timestamp: new Date().toISOString(),
          backupData: data
        }));
      } catch (e) {
        console.error('Errore salvataggio storage dopo ripristino backup', e);
      }

      return {
        success: true,
        message: `Backup ripristinato con successo! ${data.exportDate ? `File generato il: ${new Date(data.exportDate).toLocaleString('it-IT')}` : ''}`,
        details: {
          machines: restoredMachines.length,
          products: restoredProducts.length,
          purchases: restoredPurchases.length,
          history: restoredHistory.length
        }
      };
    } catch (err: any) {
      console.error('Errore ripristino backup JSON', err);
      return {
        success: false,
        message: `Errore nella lettura del file: ${err?.message || 'Formato JSON non valido'}`
      };
    }
  }, [pushUndoSnapshot, machines, products, purchases, restockHistory, maintenances, fixedCosts, trackedSpirals, dosagePresets]);

  const getLastLocalBackupInfo = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      const data = parsed.backupData || parsed;
      return {
        timestamp: parsed.timestamp || data.exportDate || '',
        machinesCount: Array.isArray(data.machines) ? data.machines.length : 0,
        productsCount: Array.isArray(data.products) ? data.products.length : 0,
        purchasesCount: Array.isArray(data.purchases) ? data.purchases.length : 0,
        exportDate: data.exportDate
      };
    } catch {
      return null;
    }
  }, []);

  const restoreLastLocalBackup = useCallback((): { success: boolean; message: string } => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
      if (!saved) {
        return { success: false, message: 'Nessun backup recente salvato nella memoria locale del browser.' };
      }
      const parsed = JSON.parse(saved);
      const res = importBackupJSON(JSON.stringify(parsed.backupData || parsed));
      return {
        success: res.success,
        message: res.success ? `Ripristinato l'ultimo backup locale generato in questo browser!` : res.message
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Errore durante il ripristino del backup' };
    }
  }, [importBackupJSON]);

  // Gestione Preset Grammatura e Tazzina
  const addDosagePreset = useCallback((newPreset: Omit<CoffeeDosagePreset, 'id'>): CoffeeDosagePreset => {
    const created: CoffeeDosagePreset = {
      ...newPreset,
      id: `preset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      isCustom: true,
    };
    setDosagePresets(prev => [...prev, created]);
    return created;
  }, []);

  const updateDosagePreset = useCallback((updated: CoffeeDosagePreset) => {
    setDosagePresets(prev => prev.map(p => p.id === updated.id ? updated : p));
  }, []);

  const deleteDosagePreset = useCallback((id: string) => {
    setDosagePresets(prev => prev.filter(p => p.id !== id));
  }, []);

  const resetDosagePresets = useCallback(() => {
    setDosagePresets(DEFAULT_COFFEE_DOSAGE_PRESETS);
    try {
      localStorage.setItem(STORAGE_KEYS.DOSAGE_PRESETS, JSON.stringify(DEFAULT_COFFEE_DOSAGE_PRESETS));
    } catch (e) {
      console.error(e);
    }
  }, []);

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

  // Salvataggio manuale istantaneo di tutti i dati e valori
  const saveAllDataNow = useCallback((customLabel?: string): { success: boolean; timestamp: string; message: string } => {
    const timestamp = new Date().toISOString();
    const label = customLabel || 'Salvataggio manuale operatore';

    try {
      localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(machines));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(restockHistory));
      localStorage.setItem(STORAGE_KEYS.MAINTENANCE, JSON.stringify(maintenances));
      localStorage.setItem(STORAGE_KEYS.FIXED_COSTS, JSON.stringify(fixedCosts));
      localStorage.setItem(STORAGE_KEYS.TRACKED_SPIRALS, JSON.stringify(trackedSpirals));
      localStorage.setItem(STORAGE_KEYS.DOSAGE_PRESETS, JSON.stringify(dosagePresets));
      localStorage.setItem(STORAGE_KEYS.LAST_SAVE_TIME, timestamp);

      const snapshotData = {
        machines,
        products,
        purchases,
        restockHistory,
        maintenances,
        fixedCosts,
        trackedSpirals,
        dosagePresets,
      };

      localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, JSON.stringify({
        timestamp,
        backupData: {
          app: 'M&S Take a Managment - Negozio H24',
          exportDate: timestamp,
          storeName: 'M&S Take a Managment H24',
          ...snapshotData,
        }
      }));

      const newCheckpoint: SaveCheckpoint = {
        id: `manual-${Date.now()}`,
        timestamp,
        type: 'manual',
        label,
        data: snapshotData,
        details: {
          machinesCount: machines.length,
          productsCount: products.length,
          purchasesCount: purchases.length,
          historyCount: restockHistory.length,
        }
      };

      const raw = localStorage.getItem(STORAGE_KEYS.CHECKPOINTS);
      const prevCheckpoints: SaveCheckpoint[] = raw ? JSON.parse(raw) : [];
      const updatedCheckpoints = [newCheckpoint, ...prevCheckpoints.filter(c => c.id !== newCheckpoint.id)].slice(0, 15);
      localStorage.setItem(STORAGE_KEYS.CHECKPOINTS, JSON.stringify(updatedCheckpoints));
      setCheckpoints(updatedCheckpoints);
      setLastSavedAt(timestamp);

      return {
        success: true,
        timestamp,
        message: `Tutti i dati e valori salvati con successo alle ${new Date(timestamp).toLocaleTimeString('it-IT')}`
      };
    } catch (err: any) {
      console.error('Errore durante salvataggio completo:', err);
      return {
        success: false,
        timestamp,
        message: `Errore durante il salvataggio: ${err?.message || 'Memoria piena o non accessibile'}`
      };
    }
  }, [machines, products, purchases, restockHistory, maintenances, fixedCosts, trackedSpirals, dosagePresets]);

  const restoreCheckpoint = useCallback((checkpointId: string): { success: boolean; message: string } => {
    try {
      const target = checkpoints.find(c => c.id === checkpointId);
      if (!target || !target.data) {
        return { success: false, message: 'Punto di salvataggio non trovato.' };
      }
      pushUndoSnapshot(`Ripristino del salvataggio "${target.label}" (${new Date(target.timestamp).toLocaleTimeString('it-IT')})`);
      const { data } = target;
      if (Array.isArray(data.machines)) setMachines(data.machines);
      if (Array.isArray(data.products)) setProducts(data.products);
      if (Array.isArray(data.purchases)) setPurchases(data.purchases);
      if (Array.isArray(data.restockHistory)) setRestockHistory(data.restockHistory);
      if (Array.isArray(data.maintenances)) setMaintenances(data.maintenances);
      if (Array.isArray(data.fixedCosts)) setFixedCosts(data.fixedCosts);
      if (Array.isArray(data.trackedSpirals)) setTrackedSpirals(data.trackedSpirals);
      if (Array.isArray(data.dosagePresets)) setDosagePresets(data.dosagePresets);

      if (Array.isArray(data.machines)) localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(data.machines));
      if (Array.isArray(data.products)) localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products));
      if (Array.isArray(data.purchases)) localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(data.purchases));
      if (Array.isArray(data.restockHistory)) localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(data.restockHistory));
      if (Array.isArray(data.maintenances)) localStorage.setItem(STORAGE_KEYS.MAINTENANCE, JSON.stringify(data.maintenances));
      if (Array.isArray(data.fixedCosts)) localStorage.setItem(STORAGE_KEYS.FIXED_COSTS, JSON.stringify(data.fixedCosts));
      if (Array.isArray(data.trackedSpirals)) localStorage.setItem(STORAGE_KEYS.TRACKED_SPIRALS, JSON.stringify(data.trackedSpirals));
      if (Array.isArray(data.dosagePresets)) localStorage.setItem(STORAGE_KEYS.DOSAGE_PRESETS, JSON.stringify(data.dosagePresets));

      return {
        success: true,
        message: `Ripristinato punto di salvataggio: "${target.label}" del ${new Date(target.timestamp).toLocaleString('it-IT')}`
      };
    } catch (err: any) {
      console.error('Errore ripristino checkpoint', err);
      return { success: false, message: `Errore durante il ripristino: ${err?.message || 'dati corrotti'}` };
    }
  }, [checkpoints, pushUndoSnapshot]);

  const deleteCheckpoint = useCallback((checkpointId: string) => {
    setCheckpoints(prev => {
      const next = prev.filter(c => c.id !== checkpointId);
      try {
        localStorage.setItem(STORAGE_KEYS.CHECKPOINTS, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  }, []);

  const restoreLastPreConfirmBackup = useCallback((): { success: boolean; message: string } => {
    if (!lastPreConfirmBackup || !lastPreConfirmBackup.id) {
      return { success: false, message: 'Nessuna copia precedente trovata da ripristinare.' };
    }
    return restoreCheckpoint(lastPreConfirmBackup.id);
  }, [lastPreConfirmBackup, restoreCheckpoint]);

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
        moveSlotPosition,
        changeSlotIndex,
        reorderMachineSlots,
        sortSlotsNaturally,
        addSlotToMachine,
        deleteSlotFromMachine,
        clearAllSlotsFromMachine,
        updateWarehouseStock,
        addNewMachine,
        resetToSampleData,
        resetAllDataToZero,
        restoreSavedBackup,
        exportBackupJSON,
        exportSalesCSV,
        importBackupJSON,
        getLastLocalBackupInfo,
        restoreLastLocalBackup,
        dosagePresets,
        addDosagePreset,
        updateDosagePreset,
        deleteDosagePreset,
        resetDosagePresets,
        canUndo,
        lastActionName,
        undoLastAction,
        undoToast,
        dismissUndoToast,
        appVersionMode,
        setAppVersionMode,
        importInvoicePurchases,
        fixedCosts,
        addFixedCost,
        updateFixedCost,
        deleteFixedCost,
        trackedSpirals,
        updateTrackedSpiral,
        saveAllDataNow,
        lastSavedAt,
        lastAutoRestockSavedAt,
        checkpoints,
        restoreCheckpoint,
        deleteCheckpoint,
        savePreviousStateBackup,
        lastPreConfirmBackup,
        restoreLastPreConfirmBackup,
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

