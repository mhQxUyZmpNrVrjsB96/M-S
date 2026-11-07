import { Product, MachineSlot, CoffeeDosageConfig, RestockSession } from '../types';

export interface CoffeePresetSlot {
  id: string;
  label: string;
  productId: string;
  productName: string;
  capacityBags: number; // Capienza cassetto in buste/confezioni
  unit: string;
  defaultCost: number;
  dosage: CoffeeDosageConfig;
  description: string;
}

/**
 * Cassetti e ingredienti standard di una macchina da caffè e bevande calde H24
 */
export const DEFAULT_COFFEE_PRESETS: CoffeePresetSlot[] = [
  {
    id: 'slot-caffe-chicchi',
    label: 'Cassetto 1 - Caffè in Grani (Chicchi)',
    productId: 'prod-caffe-grani',
    productName: 'Caffè in Grani Espresso (1kg)',
    capacityBags: 3, // Tramoggia da ~3kg
    unit: 'busta 1kg',
    defaultCost: 11.50,
    dosage: {
      gramsPerDose: 7.0, // ~7 grammi a caffè
      packageGrams: 1000,
      dosesPerPackage: 142,
      averageCupPrice: 0.50,
    },
    description: 'Chicchi di caffè macinati freschi al momento per caffè espresso corto, lungo e americano',
  },
  {
    id: 'slot-caffe-ginseng',
    label: 'Cassetto 2 - Ginseng Solubile',
    productId: 'prod-caffe-ginseng',
    productName: 'Ginseng Solubile Bar (1kg)',
    capacityBags: 2, // Cassetto da ~2kg
    unit: 'busta 1kg',
    defaultCost: 13.00,
    dosage: {
      gramsPerDose: 14.0, // ~14 grammi per tazza
      packageGrams: 1000,
      dosesPerPackage: 71,
      averageCupPrice: 0.70,
    },
    description: 'Polvere solubile per bevanda calda al ginseng aromatizzata',
  },
  {
    id: 'slot-caffe-the',
    label: 'Cassetto 3 - The al Limone Solubile',
    productId: 'prod-caffe-the',
    productName: 'The al Limone Solubile (1kg)',
    capacityBags: 2, // Cassetto da ~2kg
    unit: 'busta 1kg',
    defaultCost: 7.50,
    dosage: {
      gramsPerDose: 12.0, // ~12 grammi per tazza
      packageGrams: 1000,
      dosesPerPackage: 83,
      averageCupPrice: 0.60,
    },
    description: 'Polvere solubile per the caldo al limone',
  },
  {
    id: 'slot-caffe-deca',
    label: 'Cassetto 4 - Decaffeinato Solubile',
    productId: 'prod-caffe-deca',
    productName: 'Caffè Decaffeinato Solubile (500g)',
    capacityBags: 2,
    unit: 'busta 500g',
    defaultCost: 9.80,
    dosage: {
      gramsPerDose: 7.0,
      packageGrams: 500,
      dosesPerPackage: 71,
      averageCupPrice: 0.60,
    },
    description: 'Caffè decaffeinato solubile monorigine',
  },
  {
    id: 'slot-caffe-cioccolato',
    label: 'Cassetto 5 - Cioccolato Solubile',
    productId: 'prod-caffe-cioccolato',
    productName: 'Cioccolato Solubile Denso (1kg)',
    capacityBags: 2,
    unit: 'busta 1kg',
    defaultCost: 8.90,
    dosage: {
      gramsPerDose: 20.0,
      packageGrams: 1000,
      dosesPerPackage: 50,
      averageCupPrice: 0.70,
    },
    description: 'Polvere di cacao zuccherata per cioccolata calda',
  },
  {
    id: 'slot-caffe-latte',
    label: 'Cassetto 6 - Latte Granulare in Polvere',
    productId: 'prod-caffe-latte',
    productName: 'Latte in Polvere Granulare (500g)',
    capacityBags: 2,
    unit: 'busta 500g',
    defaultCost: 4.80,
    dosage: {
      gramsPerDose: 6.0,
      packageGrams: 500,
      dosesPerPackage: 83,
      averageCupPrice: 0.50,
    },
    description: 'Latte granulare per macchiati e cappuccini',
  },
  {
    id: 'slot-caffe-bicchieri',
    label: 'Cassetto 7 - Bicchieri Monouso',
    productId: 'prod-bicchieri',
    productName: 'Bicchieri Distributore',
    capacityBags: 5, // 5 stecche da 100 = 500 pz
    unit: 'stecca 100pz',
    defaultCost: 2.00,
    dosage: {
      gramsPerDose: 1, // 1 bicchiere per dose
      packageGrams: 100, // 100 bicchieri per stecca
      dosesPerPackage: 100,
      averageCupPrice: 0,
    },
    description: 'Torretta bicchieri monouso certificati',
  },
  {
    id: 'slot-caffe-palette',
    label: 'Cassetto 8 - Palette Monouso',
    productId: 'prod-palette',
    productName: 'Palette Distributore',
    capacityBags: 5, // 5 pacchetti da 100 = 500 pz
    unit: 'pacco 100pz',
    defaultCost: 1.00,
    dosage: {
      gramsPerDose: 1,
      packageGrams: 100,
      dosesPerPackage: 100,
      averageCupPrice: 0,
    },
    description: 'Distributore palette per zucchero e miscelazione',
  },
];

/**
 * Dati di stima per singola bevanda calcolati dall'algoritmo
 */
export interface BeverageBreakdownItem {
  slotId: string;
  label: string;
  productName: string;
  productId: string;
  category: string;
  isConsumableUtility: boolean; // Bicchieri e Palette
  totalBagsLoaded: number;
  estimatedTotalServingsLoaded: number;
  popularitySharePct: number; // Quota % stimata sulle battute totali
  estimatedCupsSold: number; // Numero erogazioni stimate nel periodo
  averageSalePrice: number; // Prezzo medio tazza (€)
  estimatedRevenue: number; // Ricavi stimati (€)
  estimatedRawCost: number; // Costo ingrediente (€)
  estimatedPackagingCost: number; // Quota bicchiere + paletta (€)
  estimatedTotalCost: number; // Costo totale bevanda erogata (€)
  estimatedProfit: number; // Utile netto stimato (€)
  estimatedMarginPct: number; // Margine netto %
  unitCostPerCup: number; // Costo effettivo al millesimo di euro per singola tazzina
  remainingStockBags: number; // Giacenza stimata residua nel cassetto
  stockFillPct: number; // % riempimento cassetto stimata
}

/**
 * Calcola l'analisi completa della macchina da caffè:
 * - Utile certo e certificato (Incasso totale - Costo totale carichi FIFO)
 * - Scomposizione statistica per-bevanda basata su carichi e dosaggi
 * - Classifica di gradimento (cosa va di più)
 */
export function calculateCoffeeMachineAnalytics(
  slots: MachineSlot[],
  products: Product[],
  restockHistory: RestockSession[],
  currentCounterReading?: number,
  lastRestockCounter?: number,
  periodDispenses?: number,
  periodRevenue?: number
) {
  // 1. Identifica le erogazioni totali del periodo (da contatore o da sessioni)
  const coffeeSessions = restockHistory.filter(s => s.machineId === 'mach-03' || s.coffeeDispenses !== undefined);
  
  const totalHistoricalDispenses = coffeeSessions.reduce((sum, s) => sum + (s.coffeeDispenses || s.totalSold || 0), 0);
  const totalHistoricalRevenue = coffeeSessions.reduce((sum, s) => sum + (s.totalRevenue || 0), 0);
  const totalHistoricalCost = coffeeSessions.reduce((sum, s) => sum + (s.totalCost || 0), 0);
  const totalHistoricalProfit = totalHistoricalRevenue - totalHistoricalCost;

  // 2. Accumula le buste/confezioni caricate per ogni cassetto nello storico
  const bagsLoadedBySlot: Record<string, number> = {};
  for (const s of coffeeSessions) {
    for (const item of (s.items || [])) {
      bagsLoadedBySlot[item.slotId] = (bagsLoadedBySlot[item.slotId] || 0) + (item.addedStock || 0);
    }
  }

  // Costo medio unitario di bicchieri e palette (utilities) per tazza
  const bicchieriProd = products.find(p => p.id === 'prod-bicchieri');
  const paletteProd = products.find(p => p.id === 'prod-palette');
  const cupCostUnit = bicchieriProd?.unitCost || 0.02;
  const stirrerCostUnit = paletteProd?.unitCost || 0.01;
  const packagingCostPerCup = cupCostUnit + stirrerCostUnit; // ~0.03€ per tazzina

  // 3. Calcolo della capacità erogativa teorica caricata per ogni cassetto bevanda
  let totalBeveragePotentialServings = 0;

  const drinkSlots = slots.filter(sl => {
    const isCup = sl.productId === 'prod-bicchieri' || sl.label.toLowerCase().includes('bicchier');
    const isStirrer = sl.productId === 'prod-palette' || sl.label.toLowerCase().includes('palett');
    const isLatte = sl.productId === 'prod-caffe-latte' || sl.label.toLowerCase().includes('latte');
    return !isCup && !isStirrer && !isLatte;
  });

  // Trova o assegna dosaggio a ogni cassetto
  const slotDosages: Record<string, CoffeeDosageConfig> = {};
  for (const sl of slots) {
    if (sl.dosageConfig) {
      slotDosages[sl.id] = sl.dosageConfig;
    } else {
      const preset = DEFAULT_COFFEE_PRESETS.find(p => p.productId === sl.productId || p.label.toLowerCase() === sl.label.toLowerCase());
      if (preset) {
        slotDosages[sl.id] = preset.dosage;
      } else {
        // Fallback ragionevole
        slotDosages[sl.id] = {
          gramsPerDose: 10,
          packageGrams: 1000,
          dosesPerPackage: 100,
          averageCupPrice: sl.salePrice > 0 ? sl.salePrice : 0.50,
        };
      }
    }
  }

  // Calcola potenziali porzioni caricate
  const potentialServingsBySlot: Record<string, number> = {};
  for (const sl of drinkSlots) {
    const bagsLoaded = bagsLoadedBySlot[sl.id] || 0;
    const dosage = slotDosages[sl.id];
    // Se non ci sono carichi storici registrati, diamo una base di stima proporzionale al consumo medio
    let baselineServings = 0;
    if (sl.productId === 'prod-caffe-grani' || sl.label.toLowerCase().includes('grani') || sl.label.toLowerCase().includes('espresso')) {
      baselineServings = 140; // ~65% mix
    } else if (sl.productId === 'prod-caffe-ginseng' || sl.label.toLowerCase().includes('ginseng')) {
      baselineServings = 40; // ~18% mix
    } else if (sl.productId === 'prod-caffe-the' || sl.label.toLowerCase().includes('the') || sl.label.toLowerCase().includes('tè')) {
      baselineServings = 20; // ~10% mix
    } else if (sl.productId === 'prod-caffe-deca' || sl.label.toLowerCase().includes('deca')) {
      baselineServings = 15; // ~7% mix
    } else {
      baselineServings = 10;
    }

    const potential = bagsLoaded > 0 ? bagsLoaded * dosage.dosesPerPackage : baselineServings;
    potentialServingsBySlot[sl.id] = potential;
    totalBeveragePotentialServings += potential;
  }

  // 4. Calcola le metriche dettagliate per ogni cassetto bevanda
  const activeDispensesTotal = (periodDispenses && periodDispenses > 0) 
    ? periodDispenses 
    : (totalHistoricalDispenses > 0 ? totalHistoricalDispenses : 100); // 100 come base illustrativa se vuoto

  const breakdown: BeverageBreakdownItem[] = [];

  for (const sl of slots) {
    const isCup = sl.productId === 'prod-bicchieri' || sl.label.toLowerCase().includes('bicchier');
    const isStirrer = sl.productId === 'prod-palette' || sl.label.toLowerCase().includes('palett');
    const isLatte = sl.productId === 'prod-caffe-latte' || sl.label.toLowerCase().includes('latte');
    const isUtility = isCup || isStirrer || isLatte;

    const prod = products.find(p => p.id === sl.productId);
    const dosage = slotDosages[sl.id];
    const bagsLoaded = bagsLoadedBySlot[sl.id] || 0;

    if (isUtility) {
      // Accessori di consumo
      const bagsRemaining = Math.max(0, sl.currentStock);
      const cap = sl.capacity > 0 ? sl.capacity : 5;
      const fillPct = Math.min(100, Math.round((bagsRemaining / cap) * 100));

      breakdown.push({
        slotId: sl.id,
        label: sl.label,
        productName: prod?.name || sl.label,
        productId: sl.productId,
        category: 'utilities',
        isConsumableUtility: true,
        totalBagsLoaded: bagsLoaded,
        estimatedTotalServingsLoaded: bagsLoaded * dosage.dosesPerPackage,
        popularitySharePct: 100, // Serve a tutte le bevande
        estimatedCupsSold: activeDispensesTotal,
        averageSalePrice: 0,
        estimatedRevenue: 0,
        estimatedRawCost: activeDispensesTotal * (prod?.unitCost || 0.02),
        estimatedPackagingCost: 0,
        estimatedTotalCost: activeDispensesTotal * (prod?.unitCost || 0.02),
        estimatedProfit: 0,
        estimatedMarginPct: 0,
        unitCostPerCup: prod?.unitCost || 0.02,
        remainingStockBags: bagsRemaining,
        stockFillPct: fillPct,
      });
      continue;
    }

    // Bevanda specifica (Caffè, Ginseng, The, Cioccolato...)
    const potential = potentialServingsBySlot[sl.id] || 1;
    const sharePct = totalBeveragePotentialServings > 0 
      ? (potential / totalBeveragePotentialServings) * 100 
      : (100 / drinkSlots.length);

    const estimatedCups = Math.round((activeDispensesTotal * sharePct) / 100);
    const cupPrice = sl.salePrice > 0 ? sl.salePrice : dosage.averageCupPrice;
    const revenue = estimatedCups * cupPrice;

    // Costo polvere per singola tazza: (Costo Busta / Dosi Per Busta)
    const bagCost = prod?.unitCost && prod.unitCost > 0 ? prod.unitCost : 10.00;
    const powderCostPerCup = dosage.dosesPerPackage > 0 ? (bagCost / dosage.dosesPerPackage) : 0.08;
    const totalCupCost = powderCostPerCup + packagingCostPerCup; // Polvere + Bicchiere + Paletta

    const rawCost = estimatedCups * powderCostPerCup;
    const packCost = estimatedCups * packagingCostPerCup;
    const totalCost = estimatedCups * totalCupCost;
    const profit = revenue - totalCost;
    const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

    const bagsRemaining = Math.max(0, sl.currentStock);
    const cap = sl.capacity > 0 ? sl.capacity : 2;
    const fillPct = Math.min(100, Math.round((bagsRemaining / cap) * 100));

    breakdown.push({
      slotId: sl.id,
      label: sl.label,
      productName: prod?.name || sl.label,
      productId: sl.productId,
      category: 'caffe_calde',
      isConsumableUtility: false,
      totalBagsLoaded: bagsLoaded,
      estimatedTotalServingsLoaded: potential,
      popularitySharePct: Math.round(sharePct * 10) / 10,
      estimatedCupsSold: estimatedCups,
      averageSalePrice: cupPrice,
      estimatedRevenue: revenue,
      estimatedRawCost: rawCost,
      estimatedPackagingCost: packCost,
      estimatedTotalCost: totalCost,
      estimatedProfit: profit,
      estimatedMarginPct: Math.round(marginPct * 10) / 10,
      unitCostPerCup: Math.round(totalCupCost * 1000) / 1000,
      remainingStockBags: bagsRemaining,
      stockFillPct: fillPct,
    });
  }

  // Ordina le bevande per gradimento (quota di mercato stimata) decrescente
  const drinksOnly = breakdown.filter(b => !b.isConsumableUtility).sort((a, b) => b.popularitySharePct - a.popularitySharePct);
  const utilitiesOnly = breakdown.filter(b => b.isConsumableUtility);

  // Totali stimati complessivi
  const totalEstimatedRevenue = drinksOnly.reduce((sum, d) => sum + d.estimatedRevenue, 0);
  const totalEstimatedCost = drinksOnly.reduce((sum, d) => sum + d.estimatedTotalCost, 0);
  const totalEstimatedProfit = totalEstimatedRevenue - totalEstimatedCost;
  const overallMarginPct = totalEstimatedRevenue > 0 ? (totalEstimatedProfit / totalEstimatedRevenue) * 100 : 0;
  const avgCupCostOverall = activeDispensesTotal > 0 ? totalEstimatedCost / activeDispensesTotal : 0.15;
  const avgCupPriceOverall = activeDispensesTotal > 0 ? totalEstimatedRevenue / activeDispensesTotal : 0.55;

  return {
    totalHistoricalDispenses,
    totalHistoricalRevenue,
    totalHistoricalCost,
    totalHistoricalProfit,
    activeDispensesTotal,
    drinksBreakdown: drinksOnly,
    utilitiesBreakdown: utilitiesOnly,
    totalEstimatedRevenue,
    totalEstimatedCost,
    totalEstimatedProfit,
    overallMarginPct,
    avgCupCostOverall,
    avgCupPriceOverall,
    packagingCostPerCup,
  };
}
