export type ProductCategory = 
  | 'caffe_calde'
  | 'bevande_fredde'
  | 'snack_dolci'
  | 'snack_salati'
  | 'freschi_healthy';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  unitCost: number; // Costo di acquisto/fornitore (€)
  defaultPrice: number; // Prezzo di vendita al pubblico (€)
  unit: string; // es. 'pz', 'porzione', 'lattina', 'bottiglia'
  warehouseStock?: number; // Giacenza disponibile in magazzino centrale
  warehouseAlertThreshold?: number; // Soglia pezzi minimi rimanenti per allert sotto scorta magazzino
  activeBatchId?: string; // ID del lotto fornitore attivo
  imageUrl?: string;
  description?: string;
}

export interface PurchaseBatch {
  id: string;
  date: string; // ISO date
  batchNumber: string; // Codice lotto / fornitura
  productId: string;
  productName: string;
  supplier: string;
  packageCount: number; // es. 2 confezioni
  unitsPerPackage: number; // es. 24 lattine ciascuna
  totalUnits: number; // packageCount * unitsPerPackage
  remainingUnits: number; // Unità ancora disponibili in magazzino
  priceInputType: 'per_confezione' | 'totale'; // Se il prezzo inserito è a confezione o totale
  inputPrice: number; // es. 12.00 €
  vatRate: number; // IVA % (es. 22, 10, 4, 0)
  totalTaxable: number; // Totale imponibile
  totalVat: number; // Totale IVA
  totalGross: number; // Totale con IVA
  unitCostNet: number; // Costo unitario al netto IVA (es. 0.50 €)
  unitCostWithVat: number; // Costo unitario comprensivo di IVA (es. 0.61 €)
  costBasisUsed: 'netto' | 'ivato'; // Base usata per il calcolo del profitto
  invoiceRef?: string;
  notes?: string;
  expiryDate?: string; // Data di scadenza (es. AAAA-MM-GG o estratta in automatico dalle note)
}

export interface SlotLoadedBatch {
  batchId?: string;
  batchNumber?: string;
  invoiceRef?: string;
  unitCost: number; // Costo unitario (€) di acquisto
  units: number; // Numero di pezzi presenti nella spirale appartenenti a questo lotto
  loadedAt?: string;
  expiryDate?: string;
}

export interface MachineSlot {
  id: string; // es. 'A1', 'A2', 'Caffè Espresso'
  label: string; // Codice spirale o tasto bevanda
  productId: string;
  capacity: number; // Capacità massima slot
  currentStock: number; // Giacenza attuale
  alertThreshold: number; // Soglia minima allarme
  salePrice: number; // Prezzo specifico impostato in questa macchina (€)
  lastRestockStock: number; // Livello registrato all'ultimo carico
  activeBatchNumber?: string; // Codice lotto attivo
  loadedBatches?: SlotLoadedBatch[]; // Coda FIFO fisica dei lotti caricati nella spirale
}

export interface SpiralConfigUpdate {
  slotId: string;
  label: string; // nome della spirale
  productId: string;
  productName: string; // nome del prodotto
  capacity: number; // quantità massima per ogni spirale
  salePrice?: number;
  alertThreshold?: number;
}

export type MachineStatus = 'operativo' | 'in_esaurimento' | 'critico' | 'manutenzione';

export interface VendingMachine {
  id: string;
  code: string; // es. 'DA-01'
  name: string;
  type: 'snack_bevande' | 'caffe_calde' | 'combo_completo';
  address: string;
  zone: string;
  coordinates: {
    lat: number;
    lng: number;
    x: number; // Coordinate proiettate per mappa visuale (0-100%)
    y: number;
  };
  status: MachineStatus;
  slots: MachineSlot[];
  cashBalance: number; // Monete accumulate nel cassetto (€)
  posBalance: number; // Pagamenti elettronici (€)
  lastRestockDate: string; // ISO date string
}

export interface RestockItemBatchConsumption {
  batchId?: string;
  batchNumber?: string;
  invoiceRef?: string;
  units: number;
  unitCost: number;
  totalCost: number;
}

export interface RestockItemRecord {
  slotId: string;
  slotLabel: string;
  productId: string;
  productName: string;
  batchId?: string; // ID del lotto di provenienza
  batchNumber?: string; // Codice lotto
  previousStock: number; // Stock presente all'ultimo carico
  countedRemaining: number; // Rimanenza effettiva trovata nel distributore
  unitsSold: number; // previousStock - countedRemaining
  salePrice: number;
  unitCost: number; // Costo medio effettivo ponderato FIFO (€)
  revenue: number; // unitsSold * salePrice
  cost: number; // Costo reale FIFO delle unità vendute
  profit: number; // revenue - cost
  addedStock: number; // Quantità di carica inserita
  newStock: number; // countedRemaining + addedStock
  batchConsumptions?: RestockItemBatchConsumption[]; // Dettaglio esatto dei lotti consumati dal venduto
  loadedAllocations?: Array<{
    batchId?: string;
    batchNumber?: string;
    invoiceRef?: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>; // Dettaglio lotti caricati da magazzino per questa spirale
  addedCost?: number;
  addedUnitCost?: number;
  potentialProfit?: number;
  marginPct?: number;
}

export interface RestockSession {
  id: string;
  machineId: string;
  machineName: string;
  machineCode: string;
  timestamp: string; // ISO format
  items: RestockItemRecord[];
  totalSold: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  cashCollected?: number;
  operatorNotes?: string;
}

export interface RouteStop {
  machineId: string;
  machine: VendingMachine;
  stopOrder: number;
  distanceKm: number;
  estimatedMinutes: number;
  needsRestock: boolean;
  criticalItemsCount: number;
  status: 'in_attesa' | 'in_corso' | 'completato';
}

export interface RestockRoute {
  id: string;
  name: string;
  date: string;
  totalStops: number;
  totalDistanceKm: number;
  totalEstMinutes: number;
  stops: RouteStop[];
  pickingList: {
    productId: string;
    productName: string;
    category: ProductCategory;
    quantityToPick: number;
    unit: string;
  }[];
}

export interface DailySaleStat {
  date: string; // 'YYYY-MM-DD'
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  unitsSold: number;
  byCategory: Record<ProductCategory, { revenue: number; units: number; profit: number }>;
}

export type MaintenanceType = 'manutenzione' | 'sostituzione';

export interface MaintenanceRecord {
  id: string;
  machineId: string; // ID distributore (es. 'mach-01', 'mach-02', 'mach-03')
  machineName: string;
  type: MaintenanceType; // 'manutenzione' (solo nota) | 'sostituzione' (data e costo)
  date: string; // Data intervento (YYYY-MM-DD o ISO)
  note?: string; // Nota per manutenzione
  componentName?: string; // Nome componente sostituito
  cost?: number; // Costo del componente (€)
  createdAt: string;
}
