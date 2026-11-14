import React, { useState, useMemo, useCallback } from 'react';
import { 
  Zap, 
  Check, 
  CheckCircle2,
  Package, 
  TrendingUp, 
  Coffee, 
  Sparkles, 
  AlertCircle, 
  Tag, 
  Layers, 
  Warehouse,
  Plus,
  Minus,
  ArrowRight,
  Sliders,
  Edit3,
  Trash2,
  ShieldCheck,
  RotateCcw,
  Undo2
} from 'lucide-react';
import { useVending } from '../context/VendingContext';
import { formatEuro, formatPercent, calculateFifoLoadPlan, consumeSlotFifo, getSlotActiveCost, costoUnitarioLotto } from '../utils/vendingUtils';
import { EditSpiralsModal } from './EditSpiralsModal';
import { CoffeeRestockView } from './coffee/CoffeeRestockView';
import { SmartNumberInput } from './common/SmartNumberInput';
import { RestockReviewModal } from './common/RestockReviewModal';

export const QuickStoreRestock: React.FC = () => {
  const { 
    machines, 
    products, 
    purchases, 
    recordRestock, 
    updateMachineSlot, 
    deleteSlotFromMachine, 
    restockHistory,
    lastPreConfirmBackup,
    restoreCheckpoint,
    restoreLastPreConfirmBackup
  } = useVending();

  // Macchina selezionata (default la prima del negozio)
  const [selectedMachineId, setSelectedMachineId] = useState<string>(() => machines[0]?.id || 'mach-01');
  const [cashWithdrawn, setCashWithdrawn] = useState<number | ''>('');
  const [operatorNotes, setOperatorNotes] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [savedCheckpointId, setSavedCheckpointId] = useState<string | null>(null);
  const [savedTimeNotice, setSavedTimeNotice] = useState<string>('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [restoreFeedback, setRestoreFeedback] = useState<string | null>(null);
  const [isEditSpiralsOpen, setIsEditSpiralsOpen] = useState<boolean>(false);
  const [initialFocusSlotId, setInitialFocusSlotId] = useState<string | undefined>(undefined);
  const [slotIdConfirmingDelete, setSlotIdConfirmingDelete] = useState<string | null>(null);

  const activeMachine = useMemo(() => {
    return machines.find(m => m.id === selectedMachineId) || machines[0];
  }, [machines, selectedMachineId]);

  const isCoffee = activeMachine?.type === 'caffe_calde';
  const unitTerm = isCoffee ? 'Cassetto' : 'Spirale';
  const unitTermPlural = isCoffee ? 'Cassetti' : 'Spirali';
  const unitTermLower = isCoffee ? 'cassetto' : 'spirale';
  const unitTermPluralLower = isCoffee ? 'cassetti' : 'spirali';

  // Stato delle righe del distributore selezionato
  const [itemCounts, setItemCounts] = useState<Record<string, { 
    counted: number; 
    removed: number; 
    returnRemovedToWarehouse: boolean; 
    added: number; 
    price: number;
    showRemovedInput?: boolean;
  }>>({});

  // Inizializza i valori solo quando cambia il distributore selezionato
  React.useEffect(() => {
    if (!activeMachine) return;
    const initial: Record<string, { 
      counted: number; 
      removed: number; 
      returnRemovedToWarehouse: boolean; 
      added: number; 
      price: number;
      showRemovedInput?: boolean;
    }> = {};

    activeMachine.slots.forEach(slot => {
      // Rimanenza precedentemente nota nello scomparto
      const counted = slot.currentStock;
      // IMPORTANTE: added parte da 0! L'operatore in negozio prima conta i pezzi trovati.
      // Non pre-popolare added con missing, che causava calcoli sballati e svuotamento artificiale del magazzino!
      initial[slot.id] = {
        counted,
        removed: 0,
        returnRemovedToWarehouse: false,
        added: 0,
        price: slot.salePrice,
        showRemovedInput: false,
      };
    });
    setItemCounts(initial);
    setCashWithdrawn(activeMachine.cashBalance || 0);
    setIsSaved(false);
    setSavedCheckpointId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMachine?.id]);

  // Nasconde automaticamente il banner di conferma dopo 30 secondi
  React.useEffect(() => {
    if (!isSaved) return;
    const timer = setTimeout(() => {
      setIsSaved(false);
    }, 30000);
    return () => clearTimeout(timer);
  }, [isSaved]);

  // Calcola quante scorte a magazzino sono effettivamente disponibili per uno slot specifico
  const getSlotAvailableWarehouse = useCallback((slotId: string, currentItemCounts: Record<string, { counted: number; removed: number; returnRemovedToWarehouse: boolean; added: number; price: number; showRemovedInput?: boolean }>) => {
    const slot = activeMachine?.slots.find(s => s.id === slotId);
    if (!slot) return 0;
    const prod = products.find(p => p.id === slot.productId);
    const totalWarehouse = Math.max(0, prod?.warehouseStock ?? 0);
    if (totalWarehouse <= 0) return 0;

    // Sottrai i pezzi dello stesso prodotto già aggiunti nelle ALTRE spirali della macchina
    const otherSlotsAdded = activeMachine?.slots
      .filter(s => s.id !== slotId && s.productId === slot.productId)
      .reduce((sum, s) => sum + (currentItemCounts[s.id]?.added || 0), 0) || 0;

    return Math.max(0, totalWarehouse - otherSlotsAdded);
  }, [activeMachine, products]);

  // Calcoli riga per riga con FIFO rigoroso sia sulle vendite che sui carichi
  const rowData = useMemo(() => {
    if (!activeMachine) return [];

    return activeMachine.slots.map(slot => {
      const prod = products.find(p => p.id === slot.productId);
      const state = itemCounts[slot.id] || { counted: slot.currentStock, removed: 0, returnRemovedToWarehouse: false, added: 0, price: slot.salePrice };
      
      const prevStock = typeof slot.lastRestockStock === 'number' ? slot.lastRestockStock : slot.currentStock;
      const removed = state.removed || 0;
      // Venduti = PreviousStock - Counted - Removed (i pezzi tolti per scadenza o reso non sono vendite!)
      const sold = Math.max(0, prevStock - state.counted - removed);
      const oldPrice = slot.salePrice;
      const price = state.price;

      // Determina il costo unitario reale di acquisto del lotto attualmente attivo nella spirale
      const activeCostInfo = getSlotActiveCost(slot, prod, purchases);
      const fallbackCost = activeCostInfo.unitCost || (prod?.unitCost && prod.unitCost > 0 ? prod.unitCost : 0);

      // 1. Calcolo del costo reale del venduto consumando i lotti precedentemente presenti nello slot (FIFO)
      const slotFifo = consumeSlotFifo(slot, sold, fallbackCost);
      const costOfSold = slotFifo.costOfSold;

      // Costo unitario e lotto di riferimento per la riga:
      const activeUnitCost = (slotFifo.remainingBatches && slotFifo.remainingBatches.length > 0 && slotFifo.remainingBatches[0].units > 0)
        ? slotFifo.remainingBatches[0].unitCost
        : (slotFifo.avgUnitCost > 0 ? slotFifo.avgUnitCost : fallbackCost);

      const unitCostOfSold = sold > 0 ? slotFifo.avgUnitCost : activeUnitCost;
      const currentActiveBatchNumber = (slotFifo.remainingBatches && slotFifo.remainingBatches.length > 0 && slotFifo.remainingBatches[0].batchNumber)
        ? slotFifo.remainingBatches[0].batchNumber
        : (activeCostInfo.batchNumber || slot.activeBatchNumber);

      // 2. Calcolo del piano di carico e costo per le unità caricate da magazzino (FIFO: dal lotto più vecchio)
      const loadPlan = calculateFifoLoadPlan(slot.productId, state.added, purchases, fallbackCost);

      const revenue = Number((sold * oldPrice).toFixed(2));
      const profit = Number((revenue - costOfSold).toFixed(2));
      const marginPct = revenue > 0 
        ? (profit / revenue) * 100 
        : (price > 0 ? ((price - activeUnitCost) / price) * 100 : 0);
      const resultingStock = state.counted + state.added;
      const warehouseStock = prod?.warehouseStock ?? 0;
      const availableWarehouse = getSlotAvailableWarehouse(slot.id, itemCounts);

      // Margine e utile atteso sui pezzi che si stanno caricando ora in base ai lotti prelevati
      const addedCost = loadPlan.totalCost;
      const addedAvgCost = loadPlan.avgUnitCost;
      const expectedProfitOnAdded = state.added > 0 ? (state.added * price) - addedCost : 0;
      const expectedMarginOnAdded = price > 0 ? ((price - addedAvgCost) / price) * 100 : 0;

      return {
        slotId: slot.id,
        slotLabel: slot.label,
        productId: slot.productId,
        productName: prod ? prod.name : 'Prodotto',
        category: prod ? prod.category : 'snack_bevande',
        capacity: slot.capacity,
        previousStock: prevStock,
        counted: state.counted,
        removed,
        returnRemovedToWarehouse: state.returnRemovedToWarehouse,
        showRemovedInput: state.showRemovedInput,
        added: state.added,
        price,
        unitCost: unitCostOfSold,
        batchNumber: currentActiveBatchNumber || loadPlan.allocations[0]?.batchNumber,
        warehouseStock,
        availableWarehouse,
        sold,
        revenue,
        cost: costOfSold,
        profit,
        marginPct,
        resultingStock,
        // Dettagli FIFO Vendita & Carico
        consumptions: slotFifo.consumptions,
        loadPlan,
        addedCost,
        addedAvgCost,
        expectedProfitOnAdded,
        expectedMarginOnAdded,
      };
    });
  }, [activeMachine, products, purchases, itemCounts, getSlotAvailableWarehouse]);

  // Totali complessivi della sessione
  const totals = useMemo(() => {
    let totalSold = 0;
    let totalRevenue = 0;
    let totalCost = 0;
    let totalAdded = 0;
    let totalAddedCost = 0;
    let totalRemoved = 0;

    rowData.forEach(r => {
      totalSold += r.sold;
      totalRevenue += r.revenue;
      totalCost += r.cost;
      totalAdded += r.added;
      totalAddedCost += r.addedCost;
      totalRemoved += r.removed;
    });

    const totalProfit = totalRevenue - totalCost;
    const marginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalSold,
      totalRevenue,
      totalCost,
      totalProfit,
      marginPct,
      totalAdded,
      totalAddedCost,
      totalRemoved,
    };
  }, [rowData]);

  // Aggiornamento rimanenza contata (trovata nel distributore)
  const setCounted = (slotId: string, val: number) => {
    const slot = activeMachine?.slots.find(s => s.id === slotId);
    const cap = slot?.capacity || 20;
    const maxAllowed = Math.max(cap, slot?.lastRestockStock ?? cap, 50);
    const clamped = Math.max(0, Math.min(val, maxAllowed));
    setItemCounts(prevCounts => {
      const current = prevCounts[slotId] || { counted: clamped, removed: 0, returnRemovedToWarehouse: false, added: 0, price: slot?.salePrice || 1 };
      // Mantieni rigorosamente il valore di added specificato dall'utente senza forzature!
      // Se counted + current.added > cap, riduci added solo per non eccedere la capienza
      const spaceLeft = Math.max(0, cap - clamped);
      const safeAdded = Math.min(current.added, spaceLeft);
      // Se prevStock - clamped è minore di removed, clamp removed
      const prevStock = typeof slot?.lastRestockStock === 'number' ? slot.lastRestockStock : (slot?.currentStock || 0);
      const maxRemovable = Math.max(0, prevStock - clamped);
      const safeRemoved = Math.min(current.removed || 0, maxRemovable);

      return {
        ...prevCounts,
        [slotId]: {
          ...current,
          counted: clamped,
          added: safeAdded,
          removed: safeRemoved,
        },
      };
    });
  };

  // Aggiornamento pezzi tolti dal distributore (scaduti, difettosi o resi a magazzino)
  const setRemoved = (slotId: string, val: number, returnToWarehouse?: boolean) => {
    const slot = activeMachine?.slots.find(s => s.id === slotId);
    const prevStock = typeof slot?.lastRestockStock === 'number' ? slot.lastRestockStock : (slot?.currentStock || 0);
    setItemCounts(prevCounts => {
      const current = prevCounts[slotId] || { counted: slot?.currentStock || 0, removed: 0, returnRemovedToWarehouse: false, added: 0, price: slot?.salePrice || 1 };
      const maxRemovable = Math.max(0, prevStock - current.counted);
      const clampedRemoved = Math.max(0, Math.min(val, maxRemovable));
      return {
        ...prevCounts,
        [slotId]: {
          ...current,
          removed: clampedRemoved,
          returnRemovedToWarehouse: returnToWarehouse !== undefined ? returnToWarehouse : current.returnRemovedToWarehouse,
        },
      };
    });
  };

  const toggleShowRemovedInput = (slotId: string) => {
    setItemCounts(prevCounts => {
      const current = prevCounts[slotId] || { counted: 0, removed: 0, returnRemovedToWarehouse: false, added: 0, price: 1 };
      return {
        ...prevCounts,
        [slotId]: {
          ...current,
          showRemovedInput: !current.showRemovedInput,
        },
      };
    });
  };

  // Aggiornamento quantità caricata da magazzino
  const setAdded = (slotId: string, val: number) => {
    const slot = activeMachine?.slots.find(s => s.id === slotId);
    const cap = slot?.capacity || 20;
    setItemCounts(prevCounts => {
      const current = prevCounts[slotId] || { counted: 0, removed: 0, returnRemovedToWarehouse: false, added: 0, price: slot?.salePrice || 1 };
      const availableWh = getSlotAvailableWarehouse(slotId, prevCounts);

      // Se non ci sono scorte in magazzino, non permettere di aggiungere alcunché (0)
      if (availableWh <= 0 && val > 0) {
        return {
          ...prevCounts,
          [slotId]: {
            ...current,
            added: 0,
          },
        };
      }

      const spaceInSlot = Math.max(0, cap - current.counted);
      const maxAddable = Math.min(spaceInSlot, availableWh);

      return {
        ...prevCounts,
        [slotId]: {
          ...current,
          added: Math.max(0, Math.min(val, maxAddable)),
        },
      };
    });
  };

  // Ricarica al massimo questo singolo slot
  const fillSlotMax = (slotId: string) => {
    const slot = activeMachine?.slots.find(s => s.id === slotId);
    if (!slot) return;
    const cap = slot.capacity || 20;
    setItemCounts(prevCounts => {
      const current = prevCounts[slotId] || { counted: slot.currentStock, removed: 0, returnRemovedToWarehouse: false, added: 0, price: slot.salePrice };
      const availableWh = getSlotAvailableWarehouse(slotId, prevCounts);
      const spaceInSlot = Math.max(0, cap - current.counted);
      const maxAddable = Math.min(spaceInSlot, availableWh);
      return {
        ...prevCounts,
        [slotId]: {
          ...current,
          added: maxAddable,
        },
      };
    });
  };

  // Modifica prezzo rapido
  const setPrice = (slotId: string, val: number) => {
    setItemCounts(prevCounts => {
      const current = prevCounts[slotId] || { counted: 0, removed: 0, returnRemovedToWarehouse: false, added: 0, price: 1 };
      return {
        ...prevCounts,
        [slotId]: {
          ...current,
          price: Math.max(0.1, Number(val.toFixed(2))),
        },
      };
    });
  };

  // Riempi tutti al massimo nel limite rigoroso delle scorte presenti a magazzino
  const handleFillAllMax = () => {
    if (!activeMachine) return;
    setItemCounts(prevCounts => {
      const next = { ...prevCounts };
      const remainingWarehouse: Record<string, number> = {};

      products.forEach(p => {
        remainingWarehouse[p.id] = Math.max(0, p.warehouseStock || 0);
      });

      activeMachine.slots.forEach(s => {
        const current = next[s.id] || { counted: s.currentStock, removed: 0, returnRemovedToWarehouse: false, added: 0, price: s.salePrice };
        const missing = Math.max(0, s.capacity - current.counted);
        const availableWh = remainingWarehouse[s.productId] || 0;
        const toAdd = Math.min(missing, availableWh);

        remainingWarehouse[s.productId] = Math.max(0, availableWh - toAdd);

        next[s.id] = {
          ...current,
          added: toAdd,
        };
      });
      return next;
    });
  };

  // Salva carico (invocato dalla conferma del report)
  const handleSaveRestock = () => {
    if (!activeMachine) return;

    const items = rowData.map(r => ({
      slotId: r.slotId,
      slotLabel: r.slotLabel,
      productId: r.productId,
      productName: r.productName,
      batchId: r.loadPlan.allocations[0]?.batchId,
      batchNumber: r.batchNumber,
      previousStock: r.previousStock,
      countedRemaining: r.counted,
      unitsSold: r.sold,
      unitsRemoved: r.removed,
      returnToWarehouse: r.returnRemovedToWarehouse,
      salePrice: r.price,
      unitCost: r.unitCost,
      revenue: r.revenue,
      cost: r.cost,
      profit: r.profit,
      addedStock: r.added,
      newStock: r.resultingStock,
      batchConsumptions: r.consumptions,
      loadedAllocations: r.loadPlan.allocations,
      addedCost: r.addedCost,
      addedUnitCost: r.addedAvgCost,
      addedBatches: r.loadPlan.allocations,
      potentialProfit: r.expectedProfitOnAdded,
      marginPct: r.marginPct,
    }));

    const savedCp = recordRestock({
      machineId: activeMachine.id,
      machineName: activeMachine.name,
      machineCode: activeMachine.code,
      items,
      totalSold: totals.totalSold,
      totalRevenue: totals.totalRevenue,
      totalCost: totals.totalCost,
      totalProfit: totals.totalProfit,
      cashCollected: typeof cashWithdrawn === 'number' ? cashWithdrawn : 0,
      operatorNotes: operatorNotes || 'Rifornimento rapido in negozio registrato con successo',
    });

    // Allinea le righe alle nuove giacenze post-carico senza attendere il cambio macchina
    const resetAfterSave: typeof itemCounts = {};
    rowData.forEach(r => {
      resetAfterSave[r.slotId] = {
        counted: r.resultingStock,
        removed: 0,
        returnRemovedToWarehouse: false,
        added: 0,
        price: r.price,
        showRemovedInput: false,
      };
    });
    setItemCounts(resetAfterSave);

    const nowFormatted = new Date().toLocaleTimeString('it-IT');
    setSavedCheckpointId(savedCp?.id || null);
    setSavedTimeNotice(nowFormatted);
    setIsReviewModalOpen(false);
    setIsSaved(true);
  };

  const handleRestorePreviousCopy = () => {
    const res = savedCheckpointId
      ? restoreCheckpoint(savedCheckpointId)
      : restoreLastPreConfirmBackup();
    if (res.success) {
      setRestoreFeedback(res.message);
      setIsSaved(false);
      setSavedCheckpointId(null);
      setTimeout(() => setRestoreFeedback(null), 5000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header rapido */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
              <Zap className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-stone-900">
              Carica Rapida In Negozio
            </h1>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Pensato per quando ti trovi fisicamente davanti ai distributori: compila rimanenze e cariche in meno di 1 minuto.
          </p>
        </div>

        {/* Pulsante rapido riempi tutti */}
        <button
          onClick={handleFillAllMax}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-xs transition-colors cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Riempi tutti al massimo</span>
        </button>
      </div>

      {/* Selezione dei 3 Distributori del Negozio */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {machines.map((m) => {
          const isSelected = m.id === selectedMachineId;
          const totalUnits = m.slots.reduce((acc, s) => acc + s.currentStock, 0);
          const maxUnits = m.slots.reduce((acc, s) => acc + s.capacity, 0);
          const pct = maxUnits > 0 ? Math.round((totalUnits / maxUnits) * 100) : 0;
          
          // Mural icon according to machine category / id
          const machineIcon = m.type === 'caffe_calde' || m.id === 'mach-03' 
            ? '☕' 
            : m.id === 'mach-02' 
              ? '🍪' 
              : '🥤';
          
          const categoryTag = m.type === 'caffe_calde' || m.id === 'mach-03'
            ? 'Caffè & Calde'
            : m.id === 'mach-02'
              ? 'Snack & Alimenti'
              : 'Bevande Fredde';

          return (
            <button
              key={m.id}
              onClick={() => setSelectedMachineId(m.id)}
              className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-stone-900 text-white border-2 border-amber-500 shadow-xl shadow-orange-500/10 scale-[1.01]'
                  : 'bg-white text-stone-900 border border-stone-200 hover:border-amber-400 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="text-lg leading-none">{machineIcon}</span>
                  <span className={`text-2xs font-mono font-bold px-2 py-0.5 rounded ${
                    isSelected ? 'bg-stone-800 text-amber-300' : 'bg-stone-100 text-stone-700'
                  }`}>
                    {m.code}
                  </span>
                </div>
                <span className={`text-xs font-bold ${
                  pct <= 30 ? (isSelected ? 'text-rose-400' : 'text-rose-600') : (isSelected ? 'text-emerald-400' : 'text-emerald-600')
                }`}>
                  {pct}% pieno
                </span>
              </div>
              <h3 className="font-bold text-sm mt-2 line-clamp-1">
                {m.name}
              </h3>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-2xs font-medium ${isSelected ? 'text-amber-300/80' : 'text-amber-800'}`}>
                  {categoryTag}
                </span>
                <span className={`text-2xs font-mono ${isSelected ? 'text-stone-400' : 'text-stone-500'}`}>
                  {m.slots?.length || 0} {m.type === 'caffe_calde' ? 'cassetti' : 'spirali'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Vista Specializzata per Macchina del Caffè vs Macchine Snack & Bevande */}
      {isCoffee ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsEditSpiralsOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-700" />
              <span>Configura Cassetti a Mano</span>
            </button>
          </div>

          <CoffeeRestockView
            machine={activeMachine}
            products={products}
            purchases={purchases}
            restockHistory={restockHistory}
            onSaveRestock={recordRestock}
          />
        </div>
      ) : (
        <>
          {/* Lista Prodotti e Compilazione Touch */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-stone-900 text-sm">
                {activeMachine?.name}
              </h2>
              <span className="text-2xs font-mono font-bold px-2 py-0.5 rounded bg-stone-200 text-stone-700">
                {rowData.length} {unitTermPluralLower}
              </span>
            </div>
            <p className="text-2xs text-stone-500 mt-0.5">
              Inserisci i pezzi rimasti dentro e la quantità ricaricata
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setIsEditSpiralsOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-700" />
              <span>Configura {unitTermPlural} a Mano</span>
            </button>

            <div className="hidden md:flex items-center space-x-2 text-xs">
              <span className="text-stone-500 font-medium">Formula:</span>
              <span className="bg-white px-2.5 py-1 rounded-md border border-stone-200 text-2xs font-mono font-semibold text-emerald-700">
                Venduto = Carica Prec. − Rimasti
              </span>
            </div>
          </div>
        </div>

        {rowData.length === 0 ? (
          <div className="p-10 text-center bg-stone-50/50 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Sliders className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-900">
              Nessun {unitTermLower} configurato per questo distributore
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
              Tutti i dati, i {unitTermPluralLower} e le capienze massime sono stati azzerati come richiesto. Puoi inserire a mano i {unitTermPluralLower} reali con i relativi codici (A1, A2...), prodotti, prezzi e capienze.
            </p>
            <button
              type="button"
              onClick={() => setIsEditSpiralsOpen(true)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Aggiungi {unitTermPlural} a Mano Ora</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
          {rowData.map((row, index) => {
            // Calcolo previsione scarico FIFO per i pezzi ricaricati (row.added)
            const availableBatches = purchases
              .filter(p => p.productId === row.productId && p.remainingUnits > 0)
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            let remainingToDeduct = row.added;
            const fifoDeductionPlan: { batchNumber: string; invoiceRef?: string; date: string; cost: number; qty: number }[] = [];
            for (const b of availableBatches) {
              if (remainingToDeduct <= 0) break;
              const take = Math.min(remainingToDeduct, b.remainingUnits);
              fifoDeductionPlan.push({
                batchNumber: b.batchNumber,
                invoiceRef: b.invoiceRef,
                date: b.date,
                cost: costoUnitarioLotto(b),
                qty: take
              });
              remainingToDeduct -= take;
            }

            return (
              <div 
                key={row.slotId}
                className="p-4 sm:p-5 hover:bg-stone-50/50 transition-colors flex flex-col gap-3"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Info Prodotto e Prezzo */}
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center space-x-2">
                      <span 
                        className="font-mono text-2xs font-black text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200 select-none shadow-2xs"
                        title={`Posizione #${index + 1} nella sequenza distributore`}
                      >
                        #{index + 1}
                      </span>
                      <input
                        type="text"
                        defaultValue={row.slotLabel}
                        key={`${row.slotId}-${row.slotLabel}`}
                        onFocus={(e) => e.target.select()}
                        onBlur={(e) => {
                          const newLabel = e.target.value.trim();
                          if (newLabel && newLabel !== row.slotLabel) {
                            updateMachineSlot(activeMachine.id, row.slotId, { label: newLabel });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className="font-mono text-xs font-bold bg-white text-stone-800 px-2 py-0.5 rounded border border-stone-300 hover:border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 w-20 sm:w-24 text-center transition-all shadow-2xs"
                        placeholder="N°"
                        title="Numero spirale a piacere (si riordina automaticamente in ordine numerico)"
                      />
                      {slotIdConfirmingDelete === row.slotId ? (
                        <div className="flex items-center space-x-1 bg-white border border-rose-300 rounded px-1.5 py-0.5 shadow-2xs animate-in fade-in">
                          <span className="text-3xs font-bold text-rose-700">Eliminare {unitTermLower}?</span>
                          <button
                            type="button"
                            onClick={() => setSlotIdConfirmingDelete(null)}
                            className="text-3xs text-stone-600 hover:text-stone-900 px-1 font-semibold cursor-pointer"
                          >
                            No
                          </button>
                          <button
                            type="button"
                            id={`btn-confirm-delete-quick-${row.slotId}`}
                            onClick={() => {
                              deleteSlotFromMachine(activeMachine.id, row.slotId);
                              setSlotIdConfirmingDelete(null);
                            }}
                            className="text-3xs text-white bg-rose-600 hover:bg-rose-700 font-bold px-1.5 py-0.5 rounded cursor-pointer shadow-2xs"
                          >
                            Sì
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-0.5">
                          <button
                            type="button"
                            id={`btn-edit-quick-${row.slotId}`}
                            onClick={() => {
                              setInitialFocusSlotId(row.slotId);
                              setIsEditSpiralsOpen(true);
                            }}
                            className="p-1 text-stone-400 hover:text-amber-700 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
                            title={`Configura prodotto, capienza e allarmi di questo ${unitTermLower}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            id={`btn-delete-quick-${row.slotId}`}
                            onClick={() => setSlotIdConfirmingDelete(row.slotId)}
                            className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title={`Elimina questo ${unitTermLower} dal distributore`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <h3 className="font-bold text-stone-900 text-sm">
                        {row.productName}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-2xs text-stone-500">
                      <span className="inline-flex items-center">
                        Prezzo ivato:
                        <SmartNumberInput
                          allowDecimals={true}
                          min={0.1}
                          defaultValueIfEmpty={0.1}
                          value={row.price}
                          onChange={(val) => setPrice(row.slotId, Number(val))}
                          className="w-14 ml-1 px-1.5 py-0.5 text-center font-bold text-stone-900 border border-stone-300 rounded focus:ring-1 focus:ring-emerald-500 bg-white"
                          title="Tocca per cambiare prezzo di vendita al volo (IVA compresa)"
                        />
                        <span className="ml-0.5">€</span>
                      </span>

                      <span className="text-stone-300">•</span>
                      <span>Capacità max: <strong className="text-stone-700">{row.capacity} pz</strong></span>

                      {row.batchNumber ? (
                        <>
                          <span className="text-stone-300">•</span>
                          <span className="text-emerald-800 font-mono font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Lotto: {row.batchNumber} (costo ivato {formatEuro(row.unitCost)})
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-stone-300">•</span>
                          <span className="text-stone-500 font-mono">
                            Costo rif. ivato: {formatEuro(row.unitCost)}
                          </span>
                        </>
                      )}

                      <span className="text-stone-300">•</span>
                      <span className="text-stone-700 font-medium">
                        Margine unitario: <strong className="text-emerald-700">+{formatEuro(Math.max(0, row.price - row.unitCost))}</strong> ({row.price > 0 ? (((row.price - row.unitCost) / row.price) * 100).toFixed(0) : 0}%)
                      </span>

                      <span className="text-stone-300">•</span>
                      <span>
                        Disponibili magazzino:{' '}
                        <strong className="text-stone-700">
                          {row.warehouseStock} pz
                          {row.availableWarehouse < row.warehouseStock && (
                            <span className="text-stone-400 font-normal ml-1">
                              ({row.availableWarehouse} pz liberi)
                            </span>
                          )}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Blocco Input Rimasti e Caricati */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-stone-50/80 p-3 rounded-xl border border-stone-200">
                    {/* 1. Rimasti dentro */}
                    <div className="flex flex-col items-center">
                      <span className="text-2xs font-bold text-amber-900 uppercase tracking-wide">
                        1. Rimasti dentro
                      </span>
                      <div className="flex items-center space-x-1 mt-1">
                        <button
                          type="button"
                          onClick={() => setCounted(row.slotId, row.counted - 1)}
                          className="w-8 h-8 rounded-lg bg-white border border-stone-300 hover:bg-stone-100 active:scale-95 flex items-center justify-center font-bold text-stone-700 cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <SmartNumberInput
                          min={0}
                          max={Math.max(row.capacity, row.previousStock, 50)}
                          value={row.counted}
                          defaultValueIfEmpty={0}
                          onChange={(val) => setCounted(row.slotId, val)}
                          className="w-16 h-8 text-center font-extrabold text-sm text-amber-950 bg-amber-50 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => setCounted(row.slotId, row.counted + 1)}
                          className="w-8 h-8 rounded-lg bg-white border border-stone-300 hover:bg-stone-100 active:scale-95 flex items-center justify-center font-bold text-stone-700 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-2xs text-stone-400 mt-0.5">da precedente {row.previousStock}</span>

                      {/* Controllo Prodotti Tolti/Rimossi non venduti (scaduti/resi) */}
                      {!row.showRemovedInput && (row.removed || 0) === 0 ? (
                        <button
                          type="button"
                          onClick={() => toggleShowRemovedInput(row.slotId)}
                          className="mt-1 text-3xs text-stone-500 hover:text-amber-800 underline flex items-center gap-0.5 cursor-pointer"
                          title="Se hai rimosso prodotti scaduti o da rendere a magazzino, segnalo qui così non vengono contati come venduti"
                        >
                          <span>− Hai tolto pezzi scaduti/resi?</span>
                        </button>
                      ) : (
                        <div className="mt-1.5 p-1.5 bg-rose-50 border border-rose-200 rounded-lg flex flex-col items-center animate-in fade-in text-3xs">
                          <div className="flex items-center justify-between w-full space-x-1 text-rose-800 font-bold">
                            <span>Tolti (non venduti):</span>
                            <button
                              type="button"
                              onClick={() => {
                                setRemoved(row.slotId, 0);
                                toggleShowRemovedInput(row.slotId);
                              }}
                              className="text-stone-400 hover:text-stone-600 cursor-pointer"
                              title="Chiudi"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="flex items-center space-x-1 mt-0.5">
                            <button
                              type="button"
                              onClick={() => setRemoved(row.slotId, (row.removed || 0) - 1)}
                              className="w-5 h-5 rounded bg-white border border-rose-300 text-rose-700 font-bold flex items-center justify-center cursor-pointer"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={0}
                              value={row.removed}
                              onChange={(e) => setRemoved(row.slotId, parseInt(e.target.value) || 0)}
                              className="w-8 h-5 text-center font-bold text-rose-950 bg-white border border-rose-300 rounded"
                            />
                            <button
                              type="button"
                              onClick={() => setRemoved(row.slotId, (row.removed || 0) + 1)}
                              className="w-5 h-5 rounded bg-white border border-rose-300 text-rose-700 font-bold flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                          <label className="flex items-center space-x-1 text-3xs text-rose-900 mt-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={row.returnRemovedToWarehouse}
                              onChange={(e) => setRemoved(row.slotId, row.removed, e.target.checked)}
                              className="rounded text-rose-600"
                            />
                            <span>Reso a magazzino</span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* 2. Risultato Venduto & Guadagno Netto FIFO */}
                    <div className="flex flex-col items-center justify-center min-w-[85px] border-r border-stone-200 pr-3 sm:pr-4">
                      <span className="text-2xs font-bold text-stone-500 uppercase tracking-wide">
                        Venduto
                      </span>
                      <span className="text-base font-extrabold text-stone-900 mt-0.5">
                        {row.sold} pz
                      </span>
                      <span className="text-2xs text-stone-500">
                        {formatEuro(row.revenue)}
                      </span>
                      {row.sold > 0 && (
                        <div className="mt-1 text-center">
                          <span className="text-2xs font-extrabold text-emerald-700 block">
                            +{formatEuro(row.profit)}
                          </span>
                          <span className="text-3xs text-emerald-600 font-semibold">
                            (utile {row.marginPct.toFixed(0)}%)
                          </span>
                          {row.consumptions && row.consumptions.length > 1 && (
                            <span 
                              className="text-3xs text-amber-800 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 block mt-1 font-semibold"
                              title={`Multi-lotto FIFO: ${row.consumptions.map(c => `${c.units}pz @ ${formatEuro(c.unitCost)}`).join(' + ')}`}
                            >
                              FIFO Multi-lotto
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 3. Aggiunti / Ricaricati */}
                    <div className="flex flex-col items-center">
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-2xs font-bold uppercase tracking-wide ${row.warehouseStock <= 0 ? 'text-stone-400' : 'text-blue-900'}`}>
                          2. Carica ora
                        </span>
                        <button
                          type="button"
                          disabled={row.availableWarehouse <= 0}
                          onClick={() => fillSlotMax(row.slotId)}
                          className={`text-2xs font-semibold ml-2 ${
                            row.availableWarehouse <= 0
                              ? 'text-stone-300 cursor-not-allowed'
                              : 'text-blue-600 hover:text-blue-800 underline cursor-pointer'
                          }`}
                          title={
                            row.warehouseStock <= 0
                              ? 'Nessuna scorta disponibile in magazzino'
                              : row.availableWarehouse <= 0
                              ? 'Tutte le scorte sono già state assegnate ad altre spirali'
                              : 'Carica fino al massimo consentito dalle scorte'
                          }
                        >
                          + Max
                        </button>
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        <button
                          type="button"
                          disabled={row.added <= 0}
                          onClick={() => setAdded(row.slotId, row.added - 1)}
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold active:scale-95 ${
                            row.added <= 0
                              ? 'bg-stone-50 border-stone-200 text-stone-300 cursor-not-allowed'
                              : 'bg-white border-stone-300 hover:bg-stone-100 text-stone-700 cursor-pointer'
                          }`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <SmartNumberInput
                          min={0}
                          max={Math.min(row.capacity - row.counted, row.availableWarehouse + row.added)}
                          value={row.added}
                          defaultValueIfEmpty={0}
                          disabled={row.warehouseStock <= 0 || (row.availableWarehouse <= 0 && row.added === 0)}
                          onChange={(val) => setAdded(row.slotId, val)}
                          className={`w-16 h-8 text-center font-extrabold text-sm rounded-lg ${
                            row.warehouseStock <= 0 || (row.availableWarehouse <= 0 && row.added === 0)
                              ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
                              : 'text-blue-950 bg-blue-50 border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500'
                          }`}
                          title={
                            row.warehouseStock <= 0
                              ? 'Scorte esaurite a magazzino: impossibile aggiungere pezzi'
                              : row.availableWarehouse <= 0 && row.added === 0
                              ? 'Tutte le scorte sono già state assegnate'
                              : 'Quantità da caricare'
                          }
                        />
                        <button
                          type="button"
                          disabled={
                            row.warehouseStock <= 0 ||
                            row.availableWarehouse <= 0 ||
                            (row.counted + row.added) >= row.capacity
                          }
                          onClick={() => setAdded(row.slotId, row.added + 1)}
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold active:scale-95 ${
                            row.warehouseStock <= 0 ||
                            row.availableWarehouse <= 0 ||
                            (row.counted + row.added) >= row.capacity
                              ? 'bg-stone-50 border-stone-200 text-stone-300 cursor-not-allowed'
                              : 'bg-white border-stone-300 hover:bg-stone-100 text-stone-700 cursor-pointer'
                          }`}
                          title={
                            row.warehouseStock <= 0
                              ? 'Magazzino vuoto: non ci sono scorte per caricare questo prodotto'
                              : row.availableWarehouse <= 0
                              ? 'Scorte disponibili a magazzino già assegnate'
                              : (row.counted + row.added) >= row.capacity
                              ? 'Spirale già al massimo della capienza'
                              : 'Aggiungi 1 pezzo'
                          }
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {row.warehouseStock <= 0 ? (
                        <span className="text-3xs font-medium text-stone-500 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded mt-1 flex items-center gap-0.5">
                          Magazzino 0 pz
                        </span>
                      ) : row.availableWarehouse <= 0 && row.added === 0 ? (
                        <span className="text-3xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-1">
                          Scorte già assegnate
                        </span>
                      ) : (
                        <span className="text-2xs text-stone-400 mt-0.5">
                          Nuova scorta: <strong>{row.resultingStock}</strong>/{row.capacity}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dettaglio di scarico FIFO in tempo reale */}
                {row.added > 0 && (
                  <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/80 flex flex-wrap items-center justify-between gap-2 text-2xs">
                    <div className="flex flex-wrap items-center gap-1.5 text-stone-700">
                      <span className="font-bold text-emerald-800 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-emerald-600" />
                        Prelievo da Magazzino:
                      </span>
                      {fifoDeductionPlan.length > 0 ? (
                        fifoDeductionPlan.map((plan, idx) => (
                          <span 
                            key={idx} 
                            className="bg-white px-2 py-0.5 rounded border border-emerald-300 font-mono text-emerald-900 shadow-2xs font-medium"
                          >
                            <strong>{plan.qty} pz</strong> da {plan.batchNumber} {plan.invoiceRef ? `(Fatt. ${plan.invoiceRef})` : ''} @ {formatEuro(plan.cost)} del {new Date(plan.date).toLocaleDateString('it-IT')}
                          </span>
                        ))
                      ) : (
                        <span className="text-stone-500 italic">Nessun lotto fornitore presente a magazzino</span>
                      )}
                      {remainingToDeduct > 0 && (
                        <span className="text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-semibold border border-amber-200">
                          ⚠️ {remainingToDeduct} pz oltre le scorte registrate
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        )}

        {/* Footer con Cassa e Totali */}
        <div className="p-5 bg-stone-50 border-t border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Info distributore */}
          <div className="flex items-center space-x-2 text-stone-600">
            <span className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-bold text-stone-800 block">
                {activeMachine?.name} ({activeMachine?.code})
              </span>
              <span className="text-2xs text-stone-500">
                {activeMachine?.slots.length || 0} {unitTermPluralLower} configurati • Verifica scorte e ricarica
              </span>
            </div>
          </div>

          {/* Riepilogo Vendite del distributore */}
          <div className="flex items-center space-x-6">
            <div>
              <span className="text-2xs text-stone-500 block uppercase font-semibold">Venduto</span>
              <span className="text-sm font-extrabold text-stone-800">{totals.totalSold} pz</span>
            </div>
            <div>
              <span className="text-2xs text-stone-500 block uppercase font-semibold">Incasso (Ivato)</span>
              <span className="text-base font-extrabold text-stone-900">{formatEuro(totals.totalRevenue)}</span>
            </div>
            <div>
              <span className="text-2xs text-emerald-600 block uppercase font-semibold">Guadagno Ivato</span>
              <span className="text-base font-extrabold text-emerald-700">+{formatEuro(totals.totalProfit)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tasto Gigante di Salvataggio con feedback */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <p className="text-xs text-stone-500">
          Premendo il pulsante, il sistema calcola i ricavi, scarica i prodotti dal magazzino centrale con il loro costo di acquisto e registra le vendite.
        </p>

        <button
          id="btn-confirm-quick-restock"
          type="button"
          onClick={() => setIsReviewModalOpen(true)}
          className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-base shadow-lg transition-all flex items-center justify-center space-x-3 cursor-pointer ${
            isSaved
              ? 'bg-emerald-700 text-white scale-[1.02]'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-xl'
          }`}
        >
          {isSaved ? (
            <>
              <Check className="w-6 h-6 animate-bounce" />
              <span>CARICO REGISTRATO &amp; COPIA PRECEDENTE SALVATA!</span>
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              <span>CONFERMA &amp; REPORT RIEPILOGO ({formatEuro(totals.totalRevenue)})</span>
            </>
          )}
        </button>
      </div>

      {/* Modale Report di Riepilogo prima della conferma finale */}
      <RestockReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onConfirm={handleSaveRestock}
        machineName={activeMachine.name}
        machineCode={activeMachine.code}
        totals={totals}
        cashWithdrawn={cashWithdrawn}
        items={rowData.map(r => ({
          slotId: r.slotId,
          slotLabel: r.slotLabel,
          productName: r.productName,
          previousStock: r.previousStock,
          countedRemaining: r.counted,
          unitsSold: r.sold,
          unitsRemoved: r.removed,
          returnToWarehouse: r.returnRemovedToWarehouse,
          addedStock: r.added,
          newStock: r.resultingStock,
          salePrice: r.price,
          revenue: r.revenue,
          profit: r.profit,
          warehouseStock: r.warehouseStock,
          availableWarehouse: r.availableWarehouse,
        }))}
        unitTermLower={unitTermLower}
        unitTermPluralLower={unitTermPluralLower}
      />

      {/* Notifica Flottante Salvataggio Automatico */}
      {isSaved && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-stone-900 border-2 border-emerald-500 p-4 rounded-2xl shadow-2xl flex items-start space-x-3 text-white animate-in slide-in-from-bottom-5 duration-200">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/40">
            <Check className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-extrabold text-sm text-emerald-300">
              Operazione Confermata &amp; Copia Precedente Salvata!
            </h4>
            <p className="text-2xs text-stone-300 mt-0.5 leading-relaxed">
              Dati registrati alle ore {savedTimeNotice || 'recenti'}. Il sistema ha archiviato automaticamente una copia identica dello stato precedente nei punti di ripristino.
            </p>
            {(savedCheckpointId || lastPreConfirmBackup) && (
              <button
                type="button"
                onClick={handleRestorePreviousCopy}
                className="mt-2.5 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 text-2xs font-bold border border-amber-500/40 cursor-pointer transition-colors shadow-2xs"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Annulla / Ripristina copia precedente</span>
              </button>
            )}
          </div>
        </div>
      )}

      {restoreFeedback && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-amber-950 border-2 border-amber-400 p-4 rounded-2xl shadow-2xl flex items-start space-x-3 text-white animate-in slide-in-from-bottom-5 duration-200">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/40">
            <RotateCcw className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-amber-300">
              Copia Precedente Ripristinata!
            </h4>
            <p className="text-2xs text-amber-100 mt-0.5 leading-relaxed">
              {restoreFeedback}
            </p>
          </div>
        </div>
      )}
      </>
      )}

      {/* Modale configurazione spirali a mano */}
      {isEditSpiralsOpen && activeMachine && (
        <EditSpiralsModal
          machine={activeMachine}
          initialFocusSlotId={initialFocusSlotId}
          onClose={() => {
            setIsEditSpiralsOpen(false);
            setInitialFocusSlotId(undefined);
          }}
        />
      )}
    </div>
  );
};
