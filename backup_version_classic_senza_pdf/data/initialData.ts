import { Product, VendingMachine, RestockSession, PurchaseBatch } from '../types';

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
    slots: [], // Spirali azzerate: l'utente le aggiunge manualmente come nella realtà
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
