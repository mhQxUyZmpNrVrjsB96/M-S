import React, { useState, useMemo, useEffect } from 'react';
import { 
  Coffee, 
  Sparkles, 
  Package, 
  TrendingUp, 
  Check, 
  AlertCircle, 
  Plus, 
  Minus, 
  Settings2, 
  Info, 
  HelpCircle,
  BarChart3,
  Scale,
  Euro,
  ArrowRight,
  PieChart as PieIcon
} from 'lucide-react';
import { VendingMachine, Product, PurchaseBatch, MachineSlot, RestockSession } from '../../types';
import { formatEuro, formatPercent, calculateFifoLoadPlan } from '../../utils/vendingUtils';
import { calculateCoffeeMachineAnalytics, DEFAULT_COFFEE_PRESETS, BeverageBreakdownItem } from '../../utils/coffeeUtils';
import { ManageDosagePresetsModal } from './ManageDosagePresetsModal';
import { SmartNumberInput } from '../common/SmartNumberInput';

interface CoffeeRestockViewProps {
  machine: VendingMachine;
  products: Product[];
  purchases: PurchaseBatch[];
  restockHistory: RestockSession[];
  onSaveRestock: (sessionData: Omit<RestockSession, 'id' | 'timestamp'>) => void;
  isMobile?: boolean;
}

export const CoffeeRestockView: React.FC<CoffeeRestockViewProps> = ({
  machine,
  products,
  purchases,
  restockHistory,
  onSaveRestock,
  isMobile = false,
}) => {
  const [isDosageModalOpen, setIsDosageModalOpen] = useState(false);
  // 1. Contatore battute erogazioni
  const previousCounter = machine.coffeeCounterCurrent || machine.coffeeCounterLastRestock || 0;
  const [currentCounterInput, setCurrentCounterInput] = useState<number | ''>(() => {
    return previousCounter > 0 ? previousCounter + 150 : 150;
  });

  const dispensesDelta = useMemo(() => {
    if (typeof currentCounterInput !== 'number') return 0;
    return Math.max(0, currentCounterInput - previousCounter);
  }, [currentCounterInput, previousCounter]);

  // 2. Buste/pezzi aggiunti per ogni cassetto
  // Per polveri/grani: espresso in numero di buste (es. 1, 2)
  // Per bicchieri/palette: espresso in numero di pezzi (es. 100, 200)
  const [addedItems, setAddedItems] = useState<Record<string, number>>({});

  // 3. Incasso rilevato
  const [revenueInput, setRevenueInput] = useState<number | ''>('');
  const [cashCollected, setCashCollected] = useState<number | ''>('');
  const [operatorNotes, setOperatorNotes] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);
  const [showDosageConfig, setShowDosageConfig] = useState(false);
  const [customDosages, setCustomDosages] = useState<Record<string, number>>({});

  // Inizializza i cassetti
  useEffect(() => {
    const initialAdded: Record<string, number> = {};
    const initialDosages: Record<string, number> = {};

    machine.slots.forEach(slot => {
      const isUtility = slot.productId === 'prod-bicchieri' || slot.productId === 'prod-palette';
      initialAdded[slot.id] = 0;
      initialDosages[slot.id] = slot.dosageConfig?.gramsPerDose || (isUtility ? 1 : 10);
    });

    setAddedItems(initialAdded);
    setCustomDosages(initialDosages);
    setIsSaved(false);
  }, [machine]);

  // Stima automatica dell'incasso in base alle erogazioni (prezzo medio ~0.55€)
  useEffect(() => {
    if (dispensesDelta > 0 && revenueInput === '') {
      const estimatedRev = Number((dispensesDelta * 0.55).toFixed(2));
      setRevenueInput(estimatedRev);
      setCashCollected(estimatedRev);
    }
  }, [dispensesDelta, revenueInput]);

  // Calcolo delle disponibilità a magazzino
  const getAvailableWarehouse = (productId: string, currentSlotId: string) => {
    const prod = products.find(p => p.id === productId);
    const totalWh = Math.max(0, prod?.warehouseStock || 0);
    const otherUsed = machine.slots
      .filter(s => s.id !== currentSlotId && s.productId === productId)
      .reduce((sum, s) => sum + (addedItems[s.id] || 0), 0);
    return Math.max(0, totalWh - otherUsed);
  };

  // Calcolo analitico del carico di ciascun cassetto
  const slotCalculations = useMemo(() => {
    return machine.slots.map(slot => {
      const prod = products.find(p => p.id === slot.productId);
      const addedQty = addedItems[slot.id] || 0;
      const isUtility = slot.productId === 'prod-bicchieri' || slot.productId === 'prod-palette';
      
      const availableWh = getAvailableWarehouse(slot.productId, slot.id);
      const fallbackCost = prod?.unitCost || (isUtility ? 0.02 : 10.00);

      // Calcola il piano FIFO di prelievo dal magazzino
      const loadPlan = calculateFifoLoadPlan(slot.productId, addedQty, purchases, fallbackCost);
      const addedCost = loadPlan.totalCost;
      const addedUnitCost = addedQty > 0 ? addedCost / addedQty : fallbackCost;

      // Dosaggio e stima porzioni
      const gramsPerDose = customDosages[slot.id] || slot.dosageConfig?.gramsPerDose || (isUtility ? 1 : 10);
      const packageGrams = slot.dosageConfig?.packageGrams || (isUtility ? 100 : 1000);
      const dosesPerPackage = gramsPerDose > 0 ? Math.floor(packageGrams / gramsPerDose) : 100;
      const potentialServings = addedQty * dosesPerPackage;

      return {
        slot,
        prod,
        addedQty,
        isUtility,
        availableWh,
        loadPlan,
        addedCost,
        addedUnitCost,
        gramsPerDose,
        packageGrams,
        dosesPerPackage,
        potentialServings,
      };
    });
  }, [machine, products, purchases, addedItems, customDosages]);

  // Totali finanziari certi del rifornimento
  const totalAddedCost = useMemo(() => {
    return slotCalculations.reduce((sum, item) => sum + item.addedCost, 0);
  }, [slotCalculations]);

  const effectiveRevenue = typeof revenueInput === 'number' ? revenueInput : (dispensesDelta * 0.55);
  const netProfit = effectiveRevenue - totalAddedCost;
  const marginPct = effectiveRevenue > 0 ? (netProfit / effectiveRevenue) * 100 : 0;
  const avgCostPerCup = dispensesDelta > 0 ? totalAddedCost / dispensesDelta : 0;

  // Stima scomposizione erogazioni bevande ("Cosa va di più")
  const coffeeAnalytics = useMemo(() => {
    return calculateCoffeeMachineAnalytics(
      machine.slots,
      products,
      restockHistory,
      typeof currentCounterInput === 'number' ? currentCounterInput : previousCounter,
      previousCounter,
      dispensesDelta > 0 ? dispensesDelta : 100,
      effectiveRevenue
    );
  }, [machine, products, restockHistory, currentCounterInput, previousCounter, dispensesDelta, effectiveRevenue]);

  // Gestione modifica quantità caricate
  const handleUpdateAdded = (slotId: string, val: number) => {
    const item = slotCalculations.find(sc => sc.slot.id === slotId);
    if (!item) return;

    const maxAllowed = item.availableWh;
    const clamped = Math.max(0, Math.min(val, maxAllowed));

    setAddedItems(prev => ({
      ...prev,
      [slotId]: clamped,
    }));
  };

  // Salva Rifornimento Caffè
  const handleSave = () => {
    const finalDispenses = dispensesDelta;
    const finalCounter = typeof currentCounterInput === 'number' ? currentCounterInput : previousCounter;
    const finalRevenue = Number(effectiveRevenue.toFixed(2));
    const finalCost = Number(totalAddedCost.toFixed(2));
    const finalProfit = Number((finalRevenue - finalCost).toFixed(2));

    // Ripartisci il venduto teorico sulle singole bevande e accessori
    const items = slotCalculations.map(sc => {
      const breakdownMatch = coffeeAnalytics.drinksBreakdown.find(d => d.slotId === sc.slot.id) 
        || coffeeAnalytics.utilitiesBreakdown.find(u => u.slotId === sc.slot.id);

      const estimatedSold = breakdownMatch ? breakdownMatch.estimatedCupsSold : 0;
      const estimatedRev = breakdownMatch ? breakdownMatch.estimatedRevenue : 0;
      const estimatedCost = sc.addedCost > 0 ? sc.addedCost : (breakdownMatch?.estimatedTotalCost || 0);

      return {
        slotId: sc.slot.id,
        slotLabel: sc.slot.label,
        productId: sc.slot.productId,
        productName: sc.prod?.name || sc.slot.label,
        batchId: sc.loadPlan.allocations[0]?.batchId,
        batchNumber: sc.loadPlan.allocations[0]?.batchNumber,
        previousStock: sc.slot.currentStock,
        countedRemaining: Math.max(0, sc.slot.currentStock),
        unitsSold: estimatedSold,
        salePrice: sc.slot.salePrice || 0.50,
        unitCost: sc.addedUnitCost,
        revenue: estimatedRev,
        cost: estimatedCost,
        profit: estimatedRev - estimatedCost,
        addedStock: sc.addedQty,
        newStock: Math.max(0, sc.slot.currentStock + sc.addedQty),
        loadedAllocations: sc.loadPlan.allocations,
        addedCost: sc.addedCost,
        addedUnitCost: sc.addedUnitCost,
      };
    });

    onSaveRestock({
      machineId: machine.id,
      machineName: machine.name,
      machineCode: machine.code,
      items,
      totalSold: finalDispenses,
      totalRevenue: finalRevenue,
      totalCost: finalCost,
      totalProfit: finalProfit,
      cashCollected: typeof cashCollected === 'number' ? cashCollected : finalRevenue,
      operatorNotes: operatorNotes || `Ricarica caffè - Contatore ${previousCounter} ➔ ${finalCounter} (+${finalDispenses} battute)`,
      coffeeCounterPrevious: previousCounter,
      coffeeCounterCurrent: finalCounter,
      coffeeDispenses: finalDispenses,
    });

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 2500);
  };

  return (
    <div className="space-y-6">
      {/* Banner Esplicativo Modello Caffè */}
      <div className="bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 shadow-xs">
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-xs shrink-0">
            <Coffee className="w-5 h-5" />
          </div>
          <div className="flex-1 text-sm text-stone-700">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-900 text-base">
                Gestione Intelligente Caffè & Bevande Calde ({machine.code})
              </h3>
              <span className="text-xs bg-amber-100 text-amber-900 font-semibold px-2.5 py-1 rounded-full border border-amber-300/60">
                Metodo Consumi & Contatore
              </span>
            </div>
            <p className="mt-1 text-stone-600 leading-relaxed">
              Dato che le polveri e i chicchi vengono versati sfusi nei contenitori, <strong className="text-stone-900">non serve contare i grammi rimasti</strong>. Inserisci semplicemente la <strong className="text-stone-900">lettura del contatore battute</strong> e quante <strong className="text-stone-900">buste o confezioni hai aggiunto</strong>. Il gestionale calcola il <strong className="text-amber-800">costo reale FIFO dal magazzino</strong>, il <strong className="text-emerald-800">margine esatto</strong> e la <strong className="text-stone-900">stima di cosa va di più</strong>!
            </p>
          </div>
        </div>
      </div>

      {/* Rilevazione Contatore Battute & Incasso */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contatore Erogazioni */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-stone-100 text-stone-700 rounded-lg">
                <BarChart3 className="w-4 h-4" />
              </div>
              <span className="font-bold text-stone-900 text-sm">Contatore Erogazioni Macchina</span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
              Precedente: {previousCounter.toLocaleString('it-IT')} battute
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">
              Nuova Lettura Contatore Display
            </label>
            <div className="relative">
              <SmartNumberInput
                min={previousCounter}
                value={currentCounterInput === '' ? 0 : currentCounterInput}
                onNumberChange={val => setCurrentCounterInput(val)}
                placeholder={`Es. ${previousCounter + 150}`}
                className="w-full pl-3.5 pr-20 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-base font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-stone-400">
                battute
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-stone-100">
            <span className="text-xs text-stone-500">Bevande calde erogate nel periodo:</span>
            <span className="text-sm font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
              +{dispensesDelta.toLocaleString('it-IT')} erogazioni
            </span>
          </div>
        </div>

        {/* Incasso e Ritiro Monete */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                <Euro className="w-4 h-4" />
              </div>
              <span className="font-bold text-stone-900 text-sm">Incasso Totale del Distributore</span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/50">
              Stima: ~{formatEuro(dispensesDelta * 0.55)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                Incasso Rilevato (€)
              </label>
              <SmartNumberInput
                min={0}
                allowDecimals={true}
                value={revenueInput === '' ? 0 : revenueInput}
                onNumberChange={val => setRevenueInput(val)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-base font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                Denaro Ritirato (€)
              </label>
              <SmartNumberInput
                min={0}
                allowDecimals={true}
                value={cashCollected === '' ? 0 : cashCollected}
                onNumberChange={val => setCashCollected(val)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-base font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
            <span className="text-stone-500">Prezzo medio per erogazione:</span>
            <span className="font-bold text-stone-800">
              {dispensesDelta > 0 ? formatEuro(effectiveRevenue / dispensesDelta) : '0,55 €'} / tazza
            </span>
          </div>
        </div>
      </div>

      {/* Ricarica Cassetti Materie Prime (Buste e Confezioni) */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-600" />
              Carica Cassetti (Buste Polveri, Chicchi & Accessori)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Seleziona quante buste intere o frazioni hai aggiunto direttamente nei contenitori della macchinetta
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsDosageModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors cursor-pointer"
              title="Personalizza, aggiungi o modifica i preset di grammatura e dosaggio tazzine"
            >
              <Scale className="w-3.5 h-3.5 text-amber-700" />
              <span>Preset Grammature</span>
            </button>
            <button
              type="button"
              onClick={() => setShowDosageConfig(!showDosageConfig)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-amber-700 bg-stone-100 hover:bg-amber-50 px-3 py-1.5 rounded-lg border border-stone-200 transition-colors cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5" />
              {showDosageConfig ? 'Nascondi dosaggi' : 'Visualizza dosaggi ricette'}
            </button>
          </div>
        </div>

        {/* Cassetti Grid */}
        {slotCalculations.length === 0 ? (
          <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300">
            <Coffee className="w-10 h-10 text-stone-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-stone-700">Nessun Cassetto Configurato nel Distributore Caffè</h4>
            <p className="text-xs text-stone-500 mt-1.5 max-w-md mx-auto">
              I cassetti di questo distributore sono attualmente azzerati. Puoi aggiungere ed associare i prodotti o miscele desiderati dalla schermata di Gestione Distributori o Modifica Spirali / Cassetti.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
            {slotCalculations.map(sc => {
              const added = sc.addedQty;
              const available = sc.availableWh;
              const isOut = available <= 0;

              return (
                <div 
                  key={sc.slot.id}
                  className={`rounded-xl border p-4 transition-all ${
                    added > 0 
                      ? 'border-amber-400 bg-amber-50/40 shadow-xs ring-1 ring-amber-300/50' 
                      : 'border-stone-200 bg-stone-50/50 hover:bg-stone-50 hover:border-stone-300'
                  }`}
                >
                  {/* Intestazione cassetto */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block truncate">
                        {sc.slot.label}
                      </span>
                      <span className="text-xs font-semibold text-stone-900 block truncate" title={sc.prod?.name || sc.slot.label}>
                        {sc.prod?.name || sc.slot.label}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${
                      sc.isUtility 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-stone-100 text-stone-700 border-stone-200'
                    }`}>
                      {sc.prod?.unit || 'busta'}
                    </span>
                  </div>

                  {/* Giacenza Magazzino */}
                  <div className="flex items-center justify-between text-[11px] text-stone-500 mb-3 bg-white/70 px-2.5 py-1.5 rounded-lg border border-stone-200/60">
                    <span>Disponibili in magazzino:</span>
                    <span className={`font-bold ${isOut ? 'text-rose-600' : 'text-stone-800'}`}>
                      {available} {sc.prod?.unit || 'pz'}
                    </span>
                  </div>

                  {/* Controlli Aggiunta */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-white border border-stone-200 rounded-xl p-1 shadow-xs">
                      <button
                        type="button"
                        onClick={() => handleUpdateAdded(sc.slot.id, Math.max(0, added - (sc.isUtility ? 50 : 1)))}
                        disabled={added <= 0}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <div className="text-center px-2">
                        <span className="text-base font-extrabold text-stone-900">
                          {added}
                        </span>
                        <span className="text-[10px] text-stone-400 block -mt-1">
                          {sc.isUtility ? 'pezzi' : 'buste'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpdateAdded(sc.slot.id, added + (sc.isUtility ? 50 : 1))}
                        disabled={added >= available}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Pulsanti Rapidi */}
                    <div className="flex items-center gap-1.5 justify-center">
                      {sc.isUtility ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateAdded(sc.slot.id, 0)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-600 hover:bg-stone-200"
                          >
                            0
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateAdded(sc.slot.id, 50)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-600 hover:bg-stone-200"
                          >
                            +50
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateAdded(sc.slot.id, 100)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-600 hover:bg-stone-200"
                          >
                            +100
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateAdded(sc.slot.id, 0)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-600 hover:bg-stone-200"
                          >
                            0
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateAdded(sc.slot.id, 1)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-600 hover:bg-stone-200"
                          >
                            +1 busta
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateAdded(sc.slot.id, 2)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-600 hover:bg-stone-200"
                          >
                            +2 buste
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Subtotale Costo Carico */}
                  <div className="mt-3 pt-2.5 border-t border-stone-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-stone-500">Costo carico:</span>
                    <span className={`font-bold ${added > 0 ? 'text-amber-700' : 'text-stone-400'}`}>
                      {formatEuro(sc.addedCost)}
                    </span>
                  </div>

                  {/* Info dosaggio se mostrato */}
                  {showDosageConfig && (
                    <div className="mt-2 pt-2 border-t border-dashed border-stone-200 text-[10px] text-stone-500 space-y-1">
                      <div className="flex justify-between">
                        <span>Dose per tazza:</span>
                        <span className="font-semibold">{sc.gramsPerDose}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Resa busta:</span>
                        <span className="font-semibold">~{sc.dosesPerPackage} tazze</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Spaccato di Gradimento e Consumi Stimati ("Cosa va di più") */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-indigo-600" />
              Gradimento Bevande & Margine per Tazzina ("Cosa Va di Più")
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Stima del mix di vendita basato sui consumi delle polveri versate nel tempo e sui dosaggi di tazza
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60">
              Margine Medio: {formatPercent(coffeeAnalytics.overallMarginPct)}
            </span>
          </div>
        </div>

        {/* Tabella / Schede Bevande */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 border-y border-stone-200 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-2.5 px-3">Bevanda / Selezione</th>
                <th className="py-2.5 px-3 text-center">Popolarità (%)</th>
                <th className="py-2.5 px-3 text-center">Tazze Stimate</th>
                <th className="py-2.5 px-3 text-right">Prezzo Tazza</th>
                <th className="py-2.5 px-3 text-right">Costo Unitario (Polvere + Bicchiere + Paletta)</th>
                <th className="py-2.5 px-3 text-right">Utile Stimato</th>
                <th className="py-2.5 px-3 text-center">Margine %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {coffeeAnalytics.drinksBreakdown.map((drink, idx) => {
                return (
                  <tr key={drink.slotId} className="hover:bg-amber-50/20 transition-colors">
                    <td className="py-3 px-3 font-semibold text-stone-900">
                      <div className="flex items-center space-x-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          idx === 0 
                            ? 'bg-amber-500 text-white' 
                            : idx === 1 
                              ? 'bg-stone-300 text-stone-800' 
                              : 'bg-stone-100 text-stone-600'
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <span>{drink.productName}</span>
                          <span className="text-[10px] text-stone-400 block">{drink.label}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center space-x-1.5">
                        <div className="w-16 bg-stone-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-amber-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, drink.popularitySharePct)}%` }}
                          />
                        </div>
                        <span className="font-bold text-stone-800">{drink.popularitySharePct}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-stone-800">
                      ~{drink.estimatedCupsSold}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-stone-700">
                      {formatEuro(drink.averageSalePrice)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-stone-900">
                      {formatEuro(drink.unitCostPerCup)}
                      <span className="text-[9px] text-stone-400 block">
                        polvere {formatEuro(drink.unitCostPerCup - 0.03)} + mat. 0,03€
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700">
                      {formatEuro(drink.estimatedProfit)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/50">
                        {formatPercent(drink.estimatedMarginPct)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Riepilogo Economico & Pulsante di Registrazione */}
      <div className="bg-stone-900 text-white rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Metriche Rapide */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
            <div>
              <span className="text-xs text-stone-400 block">Erogazioni Effettuate</span>
              <span className="text-xl font-black text-amber-400">
                +{dispensesDelta} <span className="text-xs font-normal text-stone-300">battute</span>
              </span>
            </div>
            <div>
              <span className="text-xs text-stone-400 block">Incasso Totale</span>
              <span className="text-xl font-black text-white">
                {formatEuro(effectiveRevenue)}
              </span>
            </div>
            <div>
              <span className="text-xs text-stone-400 block">Costo Merci Caricate (FIFO)</span>
              <span className="text-xl font-black text-rose-400">
                {formatEuro(totalAddedCost)}
              </span>
            </div>
            <div>
              <span className="text-xs text-stone-400 block">Guadagno Netto Reale</span>
              <span className="text-xl font-black text-emerald-400">
                {formatEuro(netProfit)}
              </span>
              <span className="text-[11px] text-emerald-300 block">
                {formatPercent(marginPct)} margine
              </span>
            </div>
          </div>

          {/* Azione di Salvataggio */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaved}
              className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                isSaved 
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-amber-500 hover:bg-amber-400 text-stone-950 hover:shadow-lg active:scale-98'
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-5 h-5" />
                  Ricarica Registrata con Successo!
                </>
              ) : (
                <>
                  <Coffee className="w-5 h-5" />
                  Conferma Ricarica Caffè ({dispensesDelta} Battute)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Note operatore facoltative */}
        <div className="pt-2 border-t border-stone-800">
          <input
            type="text"
            value={operatorNotes}
            onChange={e => setOperatorNotes(e.target.value)}
            placeholder="Note opzionali per questo passaggio (es. pulizia gruppo, controllo macinatura, sostituzione filtro acqua...)"
            className="w-full px-3 py-1.5 bg-stone-800/80 border border-stone-700 rounded-lg text-xs text-stone-200 placeholder-stone-500 focus:outline-hidden focus:border-amber-500"
          />
        </div>
      </div>

      {/* Modale Gestione Preset Grammature & Tazzine */}
      <ManageDosagePresetsModal
        isOpen={isDosageModalOpen}
        onClose={() => setIsDosageModalOpen(false)}
      />
    </div>
  );
};
