import { PurchaseBatch, VendingMachine, Product } from '../types';

export interface BatchMachineLocation {
  machineId: string;
  machineCode: string;
  machineName: string;
  slotId: string;
  slotLabel: string;
  units: number;
}

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
  remainingUnits: number; // Totale rimanente (magazzino + distributori)
  warehouseRemainingUnits: number; // Rimanente in magazzino centrale
  machineUnits: number; // Unità attualmente caricate nei distributori
  machineLocations: BatchMachineLocation[];
  usedUnits: number;
  usagePct: number;
  isFinished: boolean; // warehouseRemainingUnits <= 0 && machineUnits <= 0
  isMachineOnly?: boolean; // Lotto presente nelle spirali senza record attivo in purchases
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
 * Considera una data nelle note come scadenza SOLO se accanto ad essa compare la parola "scad" o "exp":
 * - "scadenza: 15/10/2026", "scad 31-12-2026", "scad. 15.10.2026", "exp 15/10/2026"
 * - "scadenza 2026-10-15" (ISO)
 * - "scadenza 10/2026" o "scad 11/2026" (Mese/Anno -> fine mese)
 * - "scadenza 15 ottobre 2026"
 * - "15/10/2026 scad" / "2026-10-15 exp"
 */
export function parseExpiryFromText(notes?: string, fallbackExpiry?: string): string | null {
  if (fallbackExpiry && /^\d{4}-\d{2}-\d{2}$/.test(fallbackExpiry.trim())) {
    return fallbackExpiry.trim();
  }

  if (!notes || typeof notes !== 'string') {
    return null;
  }

  const text = notes.trim();

  // 1. Prefisso con parola "scad" / "exp" prima di GG/MM/AAAA (o GG/MM/AA)
  const prefixRegex = /\b(?:scad[a-zà-ù]*|exp[a-z]*)[:.\s]+([0-9]{1,2})[\/\-.]([0-9]{1,2})[\/\-.]([0-9]{2,4})\b/i;
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

  // 2. Prefisso "scad" / "exp" prima di formato ISO YYYY-MM-DD
  const prefixIsoRegex = /\b(?:scad[a-zà-ù]*|exp[a-z]*)[:.\s]+([0-9]{4})[\/\-.]([0-9]{1,2})[\/\-.]([0-9]{1,2})\b/i;
  const prefixIsoMatch = text.match(prefixIsoRegex);
  if (prefixIsoMatch) {
    const year = parseInt(prefixIsoMatch[1], 10);
    const month = parseInt(prefixIsoMatch[2], 10);
    const day = parseInt(prefixIsoMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 3. Prefisso "scad" / "exp" prima di mese/anno: "scadenza 10/2026" o "exp 11/2026"
  const monthYearRegex = /\b(?:scad[a-zà-ù]*|exp[a-z]*)[:.\s]+([0-9]{1,2})[\/\-.]([0-9]{4})\b/i;
  const myMatch = text.match(monthYearRegex);
  if (myMatch) {
    const month = parseInt(myMatch[1], 10);
    const year = parseInt(myMatch[2], 10);
    if (month >= 1 && month <= 12) {
      const lastDay = new Date(year, month, 0).getDate();
      return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }
  }

  // 4. Prefisso "scad" / "exp" con nome del mese in italiano: "scadenza 15 ott 2026"
  const wordMonthRegex = /\b(?:scad[a-zà-ù]*|exp[a-z]*)[:.\s]+([0-9]{1,2})[\s]+([a-zà-ù]+)[\s]+([0-9]{4})\b/i;
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

  // 5. Suffisso "scad" / "exp" subito dopo GG/MM/AAAA (es. "15/10/2026 scad" o "15/10/2026 (exp)")
  const suffixDmyRegex = /\b([0-9]{1,2})[\/\-.]([0-9]{1,2})[\/\-.]([0-9]{2,4})[\s(,-]*(?:scad[a-zà-ù]*|exp[a-z]*)\b/i;
  const suffixDmyMatch = text.match(suffixDmyRegex);
  if (suffixDmyMatch) {
    const day = parseInt(suffixDmyMatch[1], 10);
    const month = parseInt(suffixDmyMatch[2], 10);
    let year = parseInt(suffixDmyMatch[3], 10);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 6. Suffisso "scad" / "exp" subito dopo formato ISO YYYY-MM-DD
  const suffixIsoRegex = /\b([0-9]{4})[\/\-.]([0-9]{1,2})[\/\-.]([0-9]{1,2})[\s(,-]*(?:scad[a-zà-ù]*|exp[a-z]*)\b/i;
  const suffixIsoMatch = text.match(suffixIsoRegex);
  if (suffixIsoMatch) {
    const year = parseInt(suffixIsoMatch[1], 10);
    const month = parseInt(suffixIsoMatch[2], 10);
    const day = parseInt(suffixIsoMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return null;
}

function collectBatchMachineLocations(
  batch: PurchaseBatch,
  machines: VendingMachine[]
): { machineUnits: number; machineLocations: BatchMachineLocation[]; slotExpiryDate: string | null } {
  const machineLocations: BatchMachineLocation[] = [];
  let machineUnits = 0;
  let slotExpiryDate: string | null = null;

  for (const machine of machines) {
    for (const slot of machine.slots || []) {
      const loaded = slot.loadedBatches || [];
      let unitsInSlot = 0;
      for (const sb of loaded) {
        if (!sb || sb.units <= 0) continue;
        const matchesId = sb.batchId && sb.batchId === batch.id;
        const matchesFallback =
          !sb.batchId &&
          sb.batchNumber &&
          sb.batchNumber === batch.batchNumber &&
          slot.productId === batch.productId;
        if (matchesId || matchesFallback) {
          unitsInSlot += sb.units;
          if (!slotExpiryDate && sb.expiryDate) {
            slotExpiryDate = parseExpiryFromText(undefined, sb.expiryDate) || sb.expiryDate;
          }
        }
      }
      if (unitsInSlot > 0) {
        machineUnits += unitsInSlot;
        machineLocations.push({
          machineId: machine.id,
          machineCode: machine.code,
          machineName: machine.name,
          slotId: slot.id,
          slotLabel: slot.label,
          units: unitsInSlot,
        });
      }
    }
  }

  return { machineUnits, machineLocations, slotExpiryDate };
}

function formatExpiryDateLabel(expiryDate: string | null): string {
  if (!expiryDate) return 'Non specificata nelle note';
  try {
    const [y, m, d] = expiryDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return expiryDate;
  }
}

function buildExpiryStatusFields(expiryDate: string | null): {
  daysLeft: number | null;
  status: 'expired' | 'warning' | 'ok' | 'no_date';
  statusLabel: string;
  statusBadgeClass: string;
  isAlertActive: boolean;
} {
  if (!expiryDate) {
    return {
      daysLeft: null,
      status: 'no_date',
      statusLabel: 'Nessuna scadenza indicata',
      statusBadgeClass: 'bg-stone-800/80 text-stone-400 border-stone-700',
      isAlertActive: false,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [y, m, d] = expiryDate.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    const absDays = Math.abs(daysLeft);
    return {
      daysLeft,
      status: 'expired',
      statusLabel: absDays === 1 ? 'Scaduto da 1 giorno!' : `Scaduto da ${absDays} giorni!`,
      statusBadgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse',
      isAlertActive: true,
    };
  }

  if (daysLeft <= 14) {
    let label = `In scadenza: mancano ${daysLeft} giorni`;
    if (daysLeft === 0) label = 'Scade oggi!';
    else if (daysLeft === 1) label = 'Scade domani!';

    return {
      daysLeft,
      status: 'warning',
      statusLabel: label,
      statusBadgeClass: 'bg-amber-500/25 text-amber-300 border-amber-500/60 font-bold',
      isAlertActive: true,
    };
  }

  return {
    daysLeft,
    status: 'ok',
    statusLabel: `Regolare (${daysLeft} gg rimanenti)`,
    statusBadgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    isAlertActive: false,
  };
}

/**
 * Calcola i giorni rimanenti e lo stato di scadenza per un lotto d'acquisto,
 * controllando sia la giacenza in magazzino sia i pezzi ancora presenti nelle spirali dei distributori.
 */
export function getBatchExpiryInfo(batch: PurchaseBatch, machines: VendingMachine[] = []): BatchExpiryInfo {
  const { machineUnits, machineLocations, slotExpiryDate } = collectBatchMachineLocations(batch, machines);
  const expiryDate = parseExpiryFromText(batch.notes, batch.expiryDate) || slotExpiryDate;
  const warehouseRemainingUnits = Math.max(0, batch.remainingUnits || 0);
  const totalRemaining = warehouseRemainingUnits + machineUnits;
  const isFinished = totalRemaining <= 0;
  const usedUnits = Math.max(0, batch.totalUnits - totalRemaining);
  const usagePct = batch.totalUnits > 0 ? Math.min(100, (usedUnits / batch.totalUnits) * 100) : 100;
  const expiryDateFormatted = formatExpiryDateLabel(expiryDate);

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
      warehouseRemainingUnits: 0,
      machineUnits: 0,
      machineLocations: [],
      usedUnits: batch.totalUnits,
      usagePct: 100,
      isFinished: true,
      daysLeft: null,
      status: 'finished',
      statusLabel: 'Finito / Tutto Venduto',
      statusBadgeClass: 'bg-stone-800 text-stone-400 border-stone-700',
      isAlertActive: false,
    };
  }

  const statusInfo = buildExpiryStatusFields(expiryDate);

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
    expiryDateFormatted: expiryDate ? expiryDateFormatted : 'Nessuna data rilevata',
    totalUnits: batch.totalUnits,
    remainingUnits: totalRemaining,
    warehouseRemainingUnits,
    machineUnits,
    machineLocations,
    usedUnits,
    usagePct,
    isFinished: false,
    ...statusInfo,
  };
}

/**
 * Calcola i totali complessivi degli allarmi scadenze da mostrare sui pulsanti e sottomenu,
 * includendo i lotti presenti nei distributori (sia collegati a `purchases` sia caricati direttamente nelle spirali).
 */
export function getExpirySummary(
  purchases: PurchaseBatch[],
  machines: VendingMachine[] = [],
  products: Product[] = []
) {
  const purchaseItems = purchases.map(b => getBatchExpiryInfo(b, machines));

  // Eventuali lotti presenti nelle spirali con expiryDate ma non più/non collegati a nessun PurchaseBatch
  const unmatchedMap = new Map<string, BatchExpiryInfo>();
  for (const machine of machines) {
    for (const slot of machine.slots || []) {
      for (const sb of slot.loadedBatches || []) {
        if (!sb || sb.units <= 0 || !sb.expiryDate) continue;
        const matchedPurchase = purchases.find(
          b =>
            (sb.batchId && b.id === sb.batchId) ||
            (!sb.batchId && sb.batchNumber && b.batchNumber === sb.batchNumber && b.productId === slot.productId)
        );
        if (matchedPurchase) continue;

        const cleanExpiry = parseExpiryFromText(undefined, sb.expiryDate) || sb.expiryDate;
        const key = `${slot.productId}::${sb.batchId || sb.batchNumber || 'slot'}::${cleanExpiry}`;
        const prod = products.find(p => p.id === slot.productId);
        const existing = unmatchedMap.get(key);
        if (existing) {
          existing.remainingUnits += sb.units;
          existing.machineUnits += sb.units;
          existing.totalUnits += sb.units;
          const loc = existing.machineLocations.find(l => l.machineId === machine.id && l.slotId === slot.id);
          if (loc) {
            loc.units += sb.units;
          } else {
            existing.machineLocations.push({
              machineId: machine.id,
              machineCode: machine.code,
              machineName: machine.name,
              slotId: slot.id,
              slotLabel: slot.label,
              units: sb.units,
            });
          }
        } else {
          const statusInfo = buildExpiryStatusFields(cleanExpiry);
          unmatchedMap.set(key, {
            batchId: sb.batchId || `spiral-${machine.id}-${slot.id}-${cleanExpiry}`,
            batchNumber: sb.batchNumber || `SPIRALE-${slot.label}`,
            productId: slot.productId,
            productName: prod?.name || slot.label,
            supplier: 'Caricato in distributore',
            invoiceRef: sb.invoiceRef,
            purchaseDate: sb.loadedAt || new Date().toISOString(),
            expiryDate: cleanExpiry,
            expiryDateFormatted: formatExpiryDateLabel(cleanExpiry),
            totalUnits: sb.units,
            remainingUnits: sb.units,
            warehouseRemainingUnits: 0,
            machineUnits: sb.units,
            machineLocations: [
              {
                machineId: machine.id,
                machineCode: machine.code,
                machineName: machine.name,
                slotId: slot.id,
                slotLabel: slot.label,
                units: sb.units,
              },
            ],
            usedUnits: 0,
            usagePct: 0,
            isFinished: false,
            isMachineOnly: true,
            ...statusInfo,
          });
        }
      }
    }
  }

  const list = [...purchaseItems, ...Array.from(unmatchedMap.values())];
  const activeAlerts = list.filter(i => i.isAlertActive);
  const expiredCount = list.filter(i => i.status === 'expired' && !i.isFinished).length;
  const warningCount = list.filter(i => i.status === 'warning' && !i.isFinished).length;
  const okCount = list.filter(i => i.status === 'ok' && !i.isFinished).length;
  const finishedCount = list.filter(i => i.isFinished).length;
  const noDateCount = list.filter(i => i.status === 'no_date' && !i.isFinished).length;

  return {
    totalBatches: list.length,
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
