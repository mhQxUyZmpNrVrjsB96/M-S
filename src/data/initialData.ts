import { Product, VendingMachine, RestockSession, PurchaseBatch, CoffeeDosagePreset } from '../types';

export const DEFAULT_COFFEE_DOSAGE_PRESETS: CoffeeDosagePreset[] = [
  {
    id: 'preset-espresso-std',
    name: 'Espresso Standard',
    gramsPerDose: 7.0,
    icon: '☕',
    packageGrams: 1000,
    notes: 'Dose classica espresso da bar (7g / erogazione)',
  },
  {
    id: 'preset-espresso-carico',
    name: 'Espresso Carico / Forte',
    gramsPerDose: 8.0,
    icon: '☕',
    packageGrams: 1000,
    notes: 'Dose più robusta, corpo intenso (8g / erogazione)',
  },
  {
    id: 'preset-espresso-leggero',
    name: 'Espresso Ristretto / Leggero',
    gramsPerDose: 6.5,
    icon: '☕',
    packageGrams: 1000,
    notes: 'Dose più delicata (6.5g / erogazione)',
  },
  {
    id: 'preset-ginseng',
    name: 'Ginseng',
    gramsPerDose: 14.0,
    icon: '🌿',
    packageGrams: 1000,
    notes: 'Solubile ginseng dolce/amaro standard (14g / erogazione)',
  },
  {
    id: 'preset-the-limone',
    name: 'The al Limone',
    gramsPerDose: 12.0,
    icon: '🍋',
    packageGrams: 1000,
    notes: 'The al limone solubile zuccherato (12g / erogazione)',
  },
  {
    id: 'preset-cioccolata',
    name: 'Cioccolata Calda',
    gramsPerDose: 20.0,
    icon: '🍫',
    packageGrams: 1000,
    notes: 'Cacao solubile denso per tazza grande (20g / erogazione)',
  },
  {
    id: 'preset-orzo',
    name: 'Orzo',
    gramsPerDose: 8.0,
    icon: '🌾',
    packageGrams: 500,
    notes: 'Orzo tostato solubile (8g / erogazione)',
  },
  {
    id: 'preset-latte',
    name: 'Latte in Polvere / Macchiato',
    gramsPerDose: 6.0,
    icon: '🥛',
    packageGrams: 500,
    notes: 'Latte granulato per macchiati o latte caldo (6g / dose)',
  },
];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_MACHINES: VendingMachine[] = [
  {
    id: 'mach-01',
    code: 'DA-01',
    name: 'Distributore 1 - Bevande Fredde (Refrigerato)',
    type: 'snack_bevande',
    address: 'Punto Vendita H24 - Parete Sinistra',
    zone: 'Negozio H24',
    coordinates: {
      lat: 45.4642,
      lng: 9.1900,
      x: 20,
      y: 50,
    },
    status: 'operativo',
    cashBalance: 0,
    posBalance: 0,
    lastRestockDate: '',
    slots: [], // Spirali azzerate: l'utente le aggiunge manualmente come nella realtà
  },
  {
    id: 'mach-02',
    code: 'DA-02',
    name: 'Distributore 2 - Snack & Alimenti',
    type: 'snack_bevande',
    address: 'Punto Vendita H24 - Parete Centrale',
    zone: 'Negozio H24',
    coordinates: {
      lat: 45.4642,
      lng: 9.1900,
      x: 50,
      y: 50,
    },
    status: 'operativo',
    cashBalance: 0,
    posBalance: 0,
    lastRestockDate: '',
    slots: [], // Spirali azzerate: l'utente le aggiunge manualmente come nella realtà
  },
  {
    id: 'mach-03',
    code: 'DA-03',
    name: 'Distributore 3 - Caffè & Bevande Calde',
    type: 'caffe_calde',
    address: 'Punto Vendita H24 - Parete Destra',
    zone: 'Negozio H24',
    coordinates: {
      lat: 45.4642,
      lng: 9.1900,
      x: 80,
      y: 50,
    },
    status: 'operativo',
    cashBalance: 0,
    posBalance: 0,
    lastRestockDate: '',
    coffeeCounterCurrent: 0,
    coffeeCounterLastRestock: 0,
    slots: [], // Cassetti azzerati: l'utente li aggiunge e configura manualmente
  },
];

export const WAREHOUSE_DEPOT = {
  name: 'Retrobottega / Deposito Negozio',
  address: 'Punto Vendita H24 - Locale Magazzino',
  coordinates: {
    lat: 45.4642,
    lng: 9.1900,
    x: 10,
    y: 10,
  },
};

// Storico vendite e rifornimenti vuoto (tutto a zero)
export const INITIAL_RESTOCK_HISTORY: RestockSession[] = [];

// Lotti fornitore vuoti (tutto a zero)
export const INITIAL_PURCHASES: PurchaseBatch[] = [];

// Spese Fisse predefinite per il negozio H24 (personalizzabili dall'utente)
export const DEFAULT_FIXED_COSTS: import('../types').FixedCost[] = [
  {
    id: 'fc-affitto',
    name: 'Canone Locazione Negozio H24',
    category: 'affitto',
    amount: 450,
    recurrence: 'mensile',
    dateAdded: '2026-01-01',
    dueDate: '2026-10-05',
    notes: 'Canone mensile di locazione fondo commerciale',
    autoDeduction: true,
  },
  {
    id: 'fc-luce',
    name: 'Energia Elettrica (Luce & Refrigeratori)',
    category: 'bollette',
    amount: 195,
    recurrence: 'mensile',
    dateAdded: '2026-01-01',
    dueDate: '2026-10-15',
    notes: 'Consumi medi stimati per 3 distributori automatici sempre accesi',
    autoDeduction: true,
  },
  {
    id: 'fc-sim',
    name: 'SIM Dati & Telemetria 4G',
    category: 'telefonia_sim',
    amount: 15,
    recurrence: 'mensile',
    dateAdded: '2026-01-01',
    dueDate: '2026-10-01',
    notes: 'Abbonamento SIM M2M per telemetria remota e trasmissione corrispettivi',
    autoDeduction: true,
  },
  {
    id: 'fc-pos',
    name: 'Canone POS Bancario & Lettore Carte',
    category: 'canoni_pos',
    amount: 22,
    recurrence: 'mensile',
    dateAdded: '2026-01-01',
    dueDate: '2026-10-10',
    notes: 'Canone gateway di pagamento cashless',
    autoDeduction: true,
  },
  {
    id: 'fc-assicurazione',
    name: 'Polizza Furto, Incendio & Atti Vandalici',
    category: 'assicurazione',
    amount: 40,
    recurrence: 'mensile',
    dateAdded: '2026-01-01',
    dueDate: '2026-12-31',
    notes: 'Assicurazione fondo e macchine distributori',
    autoDeduction: true,
  },
  {
    id: 'fc-accessorie',
    name: 'Pulizie, Igienizzazione & Kit Buste',
    category: 'accessorie',
    amount: 30,
    recurrence: 'mensile',
    dateAdded: '2026-01-01',
    dueDate: '2026-10-20',
    notes: 'Sanificazione locale, cestini e prodotti di pulizia',
    autoDeduction: true,
  },
];
