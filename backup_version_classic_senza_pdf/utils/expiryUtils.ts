import { PurchaseBatch } from '../types';

export interface BatchExpiryInfo {
  batchId: string;
  batchNumber: string;
  productId: string;
  productName: string;
  supplier: string;
  invoiceRef?: string;
  notes?: string;
  purchaseDate: string;
  expiryDate: string | null; // ISO YYYY-MM-DD
  expiryDateFormatted: string;
  totalUnits: number;
  remainingUnits: number;
  usedUnits: number;
  usagePct: number;
  isFinished: boolean; // remainingUnits <= 0
  daysLeft: number | null; // null if no expiry date
  status: 'finished' | 'expired' | 'warning' | 'ok' | 'no_date';
  statusLabel: string;
  statusBadgeClass: string;
  isAlertActive: boolean; // true ONLY if NOT finished AND daysLeft <= 14 (or expired)
}

const ITALIAN_MONTHS: Record<string, number> = {
  gen: 1, gennaio: 1,
  feb: 2, febbraio: 2,
  mar: 3, marzo: 3,
  apr: 4, aprile: 4,
  mag: 5, maggio: 5,
  giu: 6, giugno: 6,
  lug: 7, luglio: 7,
  ago: 8, agosto: 8,
  set: 9, settembre: 9,
  ott: 10, ottobre: 10,
  nov: 11, novembre: 11,
  dic: 12, dicembre: 12,
};

/**
 * Estrae automaticamente la data di scadenza dalle note del lotto o dal campo dedicato.
 * Supporta formati italiani comuni:
 * - "scadenza: 15/10/2026", "scad 31-12-2026", "scad. 15.10.2026"
 * - "scadenza 2026-10-15" (ISO)
 * - "scadenza 10/2026" o "scad 11/2026" (Mese/Anno -> fine mese)
 * - "scadenza 15 ottobre 2026"
 * - Date isolate come "15/10/2026" o "2026-10-15"
 */
export function parseExpiryFromText(notes?: string, fallbackExpiry?: string): string | null {
  if (fallbackExpiry && /^\d{4}-\d{2}-\d{2}$/.test(fallbackExpiry.trim())) {
    return fallbackExpiry.trim();
  }

  if (!notes || typeof notes !== 'string') {
    return null;
  }

  const text = notes.trim();

  // 1. Cerca pattern con prefisso "scad" / "scadenza"
  // Esempio: "scadenza: 15/10/2026" o "scad. 15-10-2026" o "scad 15/10/26"
  const prefixRegex = /(?:scad(?:enza)?|exp(?:iry)?|bbf)[:.\s]+([0-9]{1,2})[\/\-.]([0-9]{1,2})[\/\-.]([0-9]{2,4})/i;
  const prefixMatch = text.match(prefixRegex);
  if (prefixMatch) {
    const day = parseInt(prefixMatch[1], 10);
    const month = parseInt(prefixMatch[2], 10);
    let year = parseInt(prefixMatch[3], 10);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 2. Prefisso con formato ISO: "scadenza 2026-10-15"
  const prefixIsoRegex = /(?:scad(?:enza)?|exp(?:iry)?|bbf)[:.\s]+([0-9]{4})[\/\-.]([0-9]{1,2})[\/\-.]([0-9]{1,2})/i;
  const prefixIsoMatch = text.match(prefixIsoRegex);
  if (prefixIsoMatch) {
    const year = parseInt(prefixIsoMatch[1], 10);
    const month = parseInt(prefixIsoMatch[2], 10);
    const day = parseInt(prefixIsoMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 3. Prefisso con mese/anno: "scadenza 10/2026" o "scad 11/2026" (tipico su alimentari e bibite)
  const monthYearRegex = /(?:scad(?:enza)?|exp(?:iry)?|bbf)[:.\s]+([0-9]{1,2})[\/\-.]([0-9]{4})/i;
  const myMatch = text.match(monthYearRegex);
  if (myMatch) {
    const month = parseInt(myMatch[1], 10);
    const year = parseInt(myMatch[2], 10);
    if (month >= 1 && month <= 12) {
      // Ultimo giorno del mese
      const lastDay = new Date(year, month, 0).getDate();
      return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }
  }

  // 4. Con nome del mese in italiano: "scadenza 15 ott 2026", "scadenza 15 ottobre 2026"
  const wordMonthRegex = /(?:scad(?:enza)?|exp(?:iry)?)[:.\s]+([0-9]{1,2})[\s]+([a-zà-ù]+)[\s]+([0-9]{4})/i;
  const wmMatch = text.match(wordMonthRegex);
  if (wmMatch) {
    const day = parseInt(wmMatch[1], 10);
    const monthWord = wmMatch[2].toLowerCase();
    const year = parseInt(wmMatch[3], 10);
    const month = ITALIAN_MONTHS[monthWord] || ITALIAN_MONTHS[monthWord.slice(0, 3)];
    if (month && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 5. Ricerca generica di data standalone DD/MM/YYYY (anche senza parola "scadenza")
  const genericDateRegex = /\b([0-9]{1,2})[\/\-.]([0-9]{1,2})[\/\-.]([0-9]{4})\b/;
  const genMatch = text.match(genericDateRegex);
  if (genMatch) {
    const day = parseInt(genMatch[1], 10);
    const month = parseInt(genMatch[2], 10);
    const year = parseInt(genMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 6. Ricerca data generica ISO YYYY-MM-DD
  const isoRegex = /\b([0-9]{4})-([0-9]{2})-([0-9]{2})\b/;
  const isoMatch = text.match(isoRegex);
  if (isoMatch) {
    return isoMatch[0];
  }

  return null;
}

/**
 * Calcola i giorni rimanenti e lo stato di scadenza per un lotto d'acquisto.
 * Regola fondamentale dell'utente:
 * - Se il lotto è esaurito/finito (`remainingUnits <= 0`), viene segnalato come 'finished'
 *   e NON genera alcun allarme (nemmeno se la data è vicina o passata), ma non viene eliminato.
 * - Se mancano <= 14 giorni (2 settimane) o se è già scaduto ed ha rimanenze > 0, genera ALERT!
 */
export function getBatchExpiryInfo(batch: PurchaseBatch): BatchExpiryInfo {
  const expiryDate = parseExpiryFromText(batch.notes, batch.expiryDate);
  const isFinished = batch.remainingUnits <= 0;
  const usedUnits = Math.max(0, batch.totalUnits - batch.remainingUnits);
  const usagePct = batch.totalUnits > 0 ? Math.min(100, (usedUnits / batch.totalUnits) * 100) : 100;

  // Calcolo formattazione data
  let expiryDateFormatted = 'Non specificata nelle note';
  if (expiryDate) {
    try {
      const [y, m, d] = expiryDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      expiryDateFormatted = dateObj.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      expiryDateFormatted = expiryDate;
    }
  }

  // Se il lotto è completamente finito/venduto
  if (isFinished) {
    return {
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      productId: batch.productId,
      productName: batch.productName,
      supplier: batch.supplier,
      invoiceRef: batch.invoiceRef,
      notes: batch.notes,
      purchaseDate: batch.date,
      expiryDate,
      expiryDateFormatted,
      totalUnits: batch.totalUnits,
      remainingUnits: 0,
      usedUnits: batch.totalUnits,
      usagePct: 100,
      isFinished: true,
      daysLeft: null,
      status: 'finished',
      statusLabel: 'Finito / Tutto Venduto',
      statusBadgeClass: 'bg-stone-800 text-stone-400 border-stone-700',
      isAlertActive: false, // Disattivato! Non calcolato negli allarmi
    };
  }

  // Se non c'è una data di scadenza rilevata
  if (!expiryDate) {
    return {
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      productId: batch.productId,
      productName: batch.productName,
      supplier: batch.supplier,
      invoiceRef: batch.invoiceRef,
      notes: batch.notes,
      purchaseDate: batch.date,
      expiryDate: null,
      expiryDateFormatted: 'Nessuna data rilevata',
      totalUnits: batch.totalUnits,
      remainingUnits: batch.remainingUnits,
      usedUnits,
      usagePct,
      isFinished: false,
      daysLeft: null,
      status: 'no_date',
      statusLabel: 'Nessuna scadenza indicata',
      statusBadgeClass: 'bg-stone-800/80 text-stone-400 border-stone-700',
      isAlertActive: false,
    };
  }

  // Calcolo differenza in giorni da oggi (azzerando ore/minuti)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [y, m, d] = expiryDate.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // 1. Prodotto già scaduto
  if (daysLeft < 0) {
    const absDays = Math.abs(daysLeft);
    return {
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      productId: batch.productId,
      productName: batch.productName,
      supplier: batch.supplier,
      invoiceRef: batch.invoiceRef,
      notes: batch.notes,
      purchaseDate: batch.date,
      expiryDate,
      expiryDateFormatted,
      totalUnits: batch.totalUnits,
      remainingUnits: batch.remainingUnits,
      usedUnits,
      usagePct,
      isFinished: false,
      daysLeft,
      status: 'expired',
      statusLabel: absDays === 1 ? 'Scaduto da 1 giorno!' : `Scaduto da ${absDays} giorni!`,
      statusBadgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse',
      isAlertActive: true,
    };
  }

  // 2. Prodotto in scadenza entro 2 settimane (14 giorni)
  if (daysLeft <= 14) {
    let label = `In scadenza: mancano ${daysLeft} giorni`;
    if (daysLeft === 0) label = 'Scade oggi!';
    else if (daysLeft === 1) label = 'Scade domani!';

    return {
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      productId: batch.productId,
      productName: batch.productName,
      supplier: batch.supplier,
      invoiceRef: batch.invoiceRef,
      notes: batch.notes,
      purchaseDate: batch.date,
      expiryDate,
      expiryDateFormatted,
      totalUnits: batch.totalUnits,
      remainingUnits: batch.remainingUnits,
      usedUnits,
      usagePct,
      isFinished: false,
      daysLeft,
      status: 'warning',
      statusLabel: label,
      statusBadgeClass: 'bg-amber-500/25 text-amber-300 border-amber-500/60 font-bold',
      isAlertActive: true,
    };
  }

  // 3. Prodotto regolare (> 14 giorni)
  return {
    batchId: batch.id,
    batchNumber: batch.batchNumber,
    productId: batch.productId,
    productName: batch.productName,
    supplier: batch.supplier,
    invoiceRef: batch.invoiceRef,
    notes: batch.notes,
    purchaseDate: batch.date,
    expiryDate,
    expiryDateFormatted,
    totalUnits: batch.totalUnits,
    remainingUnits: batch.remainingUnits,
    usedUnits,
    usagePct,
    isFinished: false,
    daysLeft,
    status: 'ok',
    statusLabel: `Regolare (${daysLeft} gg rimanenti)`,
    statusBadgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    isAlertActive: false,
  };
}

/**
 * Calcola i totali complessivi degli allarmi scadenze da mostrare sui pulsanti e sottomenu.
 */
export function getExpirySummary(purchases: PurchaseBatch[]) {
  const list = purchases.map(getBatchExpiryInfo);
  const activeAlerts = list.filter(i => i.isAlertActive);
  const expiredCount = list.filter(i => i.status === 'expired' && !i.isFinished).length;
  const warningCount = list.filter(i => i.status === 'warning' && !i.isFinished).length;
  const okCount = list.filter(i => i.status === 'ok' && !i.isFinished).length;
  const finishedCount = list.filter(i => i.isFinished).length;
  const noDateCount = list.filter(i => i.status === 'no_date' && !i.isFinished).length;

  return {
    totalBatches: purchases.length,
    activeAlertsCount: activeAlerts.length,
    expiredCount,
    warningCount,
    okCount,
    finishedCount,
    noDateCount,
    hasAlerts: activeAlerts.length > 0,
    items: list,
  };
}
