import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Check, 
  Calculator, 
  Coins, 
  TrendingUp, 
  Sparkles, 
  AlertCircle,
  Package,
  Layers,
  ArrowRight,
  Warehouse,
  Tag,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { useVending } from '../context/VendingContext';
import { 
  formatEuro, 
  formatPercent, 
  CATEGORY_META, 
  consumeSlotFifo, 
  calculateFifoLoadPlan, 
  formatBatchConsumptionSummary,
  getSlotActiveCost
} from '../utils/vendingUtils';
import { RestockReviewModal } from './common/RestockReviewModal';
import { SmartNumberInput } from './common/SmartNumberInput';

interface RestockRowState {
  slotId: string;
  slotLabel: string;
  productId: string;
  productName: string;
  category: string;
  capacity: number;
  oldSalePrice: number;
  salePrice: number;
  unitCost: number;
  batchId?: string;
  batchNumber?: string;
  warehouseAvailable: number;
  previousStock: number;
  countedRemaining: number;
  unitsRemoved?: number;
  returnToWarehouse?: boolean;
  showRemovedInput?: boolean;
  addedStock: number;
}

export const RestockModal: React.FC = () => {
  const { 
    machines, 
    products, 
    purchases,
    activeModalMachineId, 
    closeRestockModal, 
    recordRestock,
    savePreviousStateBackup,
    restoreLastPreConfirmBackup,
    lastPreConfirmBackup
  } = useVending();

  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [cashCollected, setCashCollected] = useState<number>(0);
  const [operatorNotes, setOperatorNotes] = useState<string>('');
  const [rows, setRows] = useState<RestockRowState[]>([]);
  const [isSuccessFeedback, setIsSuccessFeedback] = useState<boolean>(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);

  // Imposta macchina attiva
  useEffect(() => {
    if (activeModalMachineId) {
      setSelectedMachineId(activeModalMachineId);
    } else if (machines.length > 0 && !selectedMachineId) {
      setSelectedMachineId(machines[0].id);
    }
  }, [activeModalMachineId, machines]);

  const selectedMachine = useMemo(() => {
    return machines.find(m => m.id === selectedMachineId) || machines[0];
  }, [machines, selectedMachineId]);

  // Inizializza le righe con i dati correnti degli slot solo all'apertura modale o al cambio distributore
  useEffect(() => {
    if (!activeModalMachineId || !selectedMachine) return;

    const initialRows: RestockRowState[] = selectedMachine.slots.map(slot => {
      const prod = products.find(p => p.id === slot.productId);
      const prevStock = typeof slot.lastRestockStock === 'number' ? slot.lastRestockStock : slot.currentStock;
      const counted = slot.currentStock;

      // Determina il costo unitario reale e il lotto attivo per questo slot con FIFO
      const activeCostInfo = getSlotActiveCost(slot, prod, purchases);
      const effectiveUnitCost = activeCostInfo.unitCost || (prod?.unitCost && prod.unitCost > 0 ? prod.unitCost : 0);
      const warehouseStock = prod?.warehouseStock ?? 0;

      return {
        slotId: slot.id,
        slotLabel: slot.label,
        productId: slot.productId,
        productName: prod ? prod.name : 'Prodotto sconosciuto',
        category: prod ? prod.category : 'bevande_fredde',
        capacity: slot.capacity,
        oldSalePrice: slot.salePrice,
        salePrice: slot.salePrice,
        unitCost: effectiveUnitCost,
        batchId: activeCostInfo.batchId,
        batchNumber: activeCostInfo.batchNumber || slot.activeBatchNumber,
        warehouseAvailable: warehouseStock,
        previousStock: prevStock,
        countedRemaining: counted,
        unitsRemoved: 0,
        returnToWarehouse: false,
        showRemovedInput: false,
        addedStock: 0, // Inizia da 0! L'operatore prima conta o toglie i pezzi trovati.
      };
    });

    setRows(initialRows);
    setCashCollected(selectedMachine.cashBalance || 0);
    setOperatorNotes('');
    setIsSuccessFeedback(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMachine?.id, activeModalMachineId]);

  // Modifica valori di una riga
  const handleCountedChange = (slotId: string, val: number) => {
    setRows(prev => {
      return prev.map(r => {
        if (r.slotId !== slotId) return r;
        const maxAllowed = Math.max(r.capacity, r.previousStock, 50);
        const clampedCounted = Math.max(0, Math.min(val, maxAllowed));
        const spaceInSlot = Math.max(0, r.capacity - clampedCounted);
        const newAdded = Math.min(r.addedStock, spaceInSlot);
        const maxRemovable = Math.max(0, r.previousStock - clampedCounted);
        const clampedRemoved = Math.min(r.unitsRemoved || 0, maxRemovable);
        return {
          ...r,
          countedRemaining: clampedCounted,
          addedStock: newAdded,
          unitsRemoved: clampedRemoved,
        };
      });
    });
  };

  const handleRemovedChange = (slotId: string, val: number, returnToWh?: boolean) => {
    setRows(prev => prev.map(r => {
      if (r.slotId !== slotId) return r;
      const maxRemovable = Math.max(0, r.previousStock - r.countedRemaining);
      const clampedRemoved = Math.max(0, Math.min(val, maxRemovable));
      return {
        ...r,
        unitsRemoved: clampedRemoved,
        returnToWarehouse: returnToWh !== undefined ? returnToWh : r.returnToWarehouse,
      };
    }));
  };

  const toggleShowRemovedInput = (slotId: string) => {
    setRows(prev => prev.map(r => {
      if (r.slotId !== slotId) return r;
      return {
        ...r,
        showRemovedInput: !r.showRemovedInput,
      };
    }));
  };

  const handleAddedChange = (slotId: string, val: number) => {
    setRows(prev => {
      const target = prev.find(r => r.slotId === slotId);
      if (!target) return prev;
      const otherAdded = prev
        .filter(r => r.slotId !== slotId && r.productId === target.productId)
        .reduce((sum, r) => sum + r.addedStock, 0);
      const availableWh = Math.max(0, target.warehouseAvailable - otherAdded);

      return prev.map(r => {
        if (r.slotId !== slotId) return r;
        if (availableWh <= 0 && val > 0) {
          return {
            ...r,
            addedStock: 0,
          };
        }
        const spaceInSlot = Math.max(0, r.capacity - r.countedRemaining);
        const maxAddable = Math.min(spaceInSlot, availableWh);
        return {
          ...r,
          addedStock: Math.max(0, Math.min(val, maxAddable)),
        };
      });
    });
  };

  // Modifica dinamica prezzo di vendita ("idem se cambio prezzo di vendita")
  const handlePriceChange = (slotId: string, val: number) => {
    setRows(prev =>
      prev.map(r => (r.slotId === slotId ? { ...r, salePrice: Math.max(0.1, Number(val.toFixed(2))) } : r))
    );
  };

  // Modifica costo unitario o selezione lotto
  const handleCostChange = (slotId: string, val: number) => {
    setRows(prev =>
      prev.map(r => (r.slotId === slotId ? { ...r, unitCost: Math.max(0.0001, Number(val.toFixed(4))) } : r))
    );
  };

  // Azione rapida: riempi tutti al massimo nel limite rigoroso delle scorte in magazzino
  const handleFillAllToMax = () => {
    setRows(prev => {
      const remainingWh: Record<string, number> = {};
      products.forEach(p => {
        remainingWh[p.id] = Math.max(0, p.warehouseStock || 0);
      });

      return prev.map(r => {
        const missing = Math.max(0, r.capacity - r.countedRemaining);
        const available = remainingWh[r.productId] || 0;
        const toAdd = Math.min(missing, available);
        remainingWh[r.productId] = Math.max(0, available - toAdd);
        return {
          ...r,
          addedStock: toAdd,
        };
      });
    });
  };

  // Calcoli complessivi in tempo reale con calcolo rigoroso multi-lotto
  const summary = useMemo(() => {
    let totalSold = 0;
    let totalRevenue = 0;
    let totalCost = 0;
    let totalAdded = 0;
    let totalRemoved = 0;

    for (const r of rows) {
      const sold = Math.max(0, r.previousStock - r.countedRemaining - (r.unitsRemoved || 0));
      const rev = Number((sold * r.oldSalePrice).toFixed(2));
      const slot = selectedMachine?.slots.find(s => s.id === r.slotId);
      const fifoConsumption = slot
        ? consumeSlotFifo(slot, sold, r.unitCost)
        : { costOfSold: sold * r.unitCost, avgUnitCost: r.unitCost, consumptions: [], remainingBatches: [] };
      const cost = fifoConsumption.costOfSold;

      totalSold += sold;
      totalRevenue += rev;
      totalCost += cost;
      totalAdded += r.addedStock;
      totalRemoved += (r.unitsRemoved || 0);
    }

    const totalProfit = Number((totalRevenue - totalCost).toFixed(2));
    const marginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalSold,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      totalProfit,
      marginPct,
      totalAdded,
      totalRemoved,
    };
  }, [rows, selectedMachine]);

  // Invio e salvataggio con tracciamento esatto multi-lotto
  const handleSave = () => {
    if (!selectedMachine) return;

    const items = rows.map(r => {
      const sold = Math.max(0, r.previousStock - r.countedRemaining - (r.unitsRemoved || 0));
      const rev = Number((sold * r.oldSalePrice).toFixed(2));
      const slot = selectedMachine.slots.find(s => s.id === r.slotId);
      const fifoConsumption = slot
        ? consumeSlotFifo(slot, sold, r.unitCost)
        : { costOfSold: Number((sold * r.unitCost).toFixed(2)), avgUnitCost: r.unitCost, consumptions: [], remainingBatches: [] };
      const cost = fifoConsumption.costOfSold;
      const profit = Number((rev - cost).toFixed(2));
      const newStock = r.countedRemaining + r.addedStock;

      const loadPlan = calculateFifoLoadPlan(r.productId, r.addedStock, purchases, r.unitCost);

      return {
        slotId: r.slotId,
        slotLabel: r.slotLabel,
        productId: r.productId,
        productName: r.productName,
        batchId: r.batchId,
        batchNumber: r.batchNumber,
        previousStock: r.previousStock,
        countedRemaining: r.countedRemaining,
        unitsSold: sold,
        unitsRemoved: r.unitsRemoved,
        returnToWarehouse: r.returnToWarehouse,
        salePrice: r.salePrice,
        unitCost: fifoConsumption.avgUnitCost,
        revenue: rev,
        cost,
        profit,
        addedStock: r.addedStock,
        newStock,
        batchConsumptions: fifoConsumption.consumptions,
        loadedAllocations: loadPlan.allocations,
      };
    });

    recordRestock({
      machineId: selectedMachine.id,
      machineName: selectedMachine.name,
      machineCode: selectedMachine.code,
      items,
      totalSold: summary.totalSold,
      totalRevenue: summary.totalRevenue,
      totalCost: summary.totalCost,
      totalProfit: summary.totalProfit,
      cashCollected,
      operatorNotes: operatorNotes || 'Riconciliazione inventario, aggiornamento prezzi e scarico lotti effettuato',
    });

    setIsSuccessFeedback(true);
    setIsReviewModalOpen(false);
    setTimeout(() => {
      closeRestockModal();
    }, 1200);
  };

  if (!activeModalMachineId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="restock-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">
                Registra Rifornimento & Calcola Vendite
              </h2>
              <p className="text-xs text-stone-500">
                Riconciliazione automatica per differenza scorte e calcolo incassi
              </p>
            </div>
          </div>

          <button
            id="btn-close-restock-modal"
            onClick={closeRestockModal}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Machine Selector & Formula Hint */}
        <div className="px-6 py-3 bg-stone-100/70 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <label htmlFor="select-machine" className="text-xs font-semibold text-stone-700 uppercase tracking-wide">
              Distributore:
            </label>
            <select
              id="select-machine"
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
              className="bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-sm font-medium text-stone-900 shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              {machines.map(m => (
                <option key={m.id} value={m.id}>
                  {m.code} - {m.name} ({m.zone})
                </option>
              ))}
            </select>
          </div>

          {/* Educational Formula Badge */}
          <div className="text-xs text-stone-600 bg-white/80 border border-stone-200 rounded-lg px-3 py-1.5 flex items-center space-x-2">
            <span className="font-semibold text-emerald-700">Formula Vending:</span>
            <span>Venduto = Carica Prec. − Rimasti</span>
            <span className="text-stone-300">•</span>
            <span>Nuova Scorta = Rimasti + Carica</span>
          </div>
        </div>

        {/* Action toolbar */}
        <div className="px-6 py-2.5 bg-stone-50/50 border-b border-stone-200 flex items-center justify-between text-xs">
          <div className="text-stone-500">
            Compila la <strong className="text-stone-800">Rimanenza Rilevata</strong> trovata nel distributore e la <strong className="text-stone-800">Quantità Caricata</strong> per ogni prodotto.
          </div>
          <button
            id="btn-fill-all-max"
            onClick={handleFillAllToMax}
            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md bg-stone-200 hover:bg-stone-300/80 text-stone-800 font-medium transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Riempi tutti al massimo capienza</span>
          </button>
        </div>

        {/* Interactive Inventory Reconciliation Table */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-2">{selectedMachine?.type === 'caffe_calde' ? 'Cassetto' : 'Spirale / Slot'}</th>
                  <th className="py-2.5 px-2">Prodotto & Lotto Fornitore</th>
                  <th className="py-2.5 px-2 text-center bg-stone-50">Costo Acq. (€ Ivato)</th>
                  <th className="py-2.5 px-2 text-center">Prezzo Vendita (€ Ivato)</th>
                  <th className="py-2.5 px-2 text-center bg-stone-50">Scorta Prec.</th>
                  <th className="py-2.5 px-2 text-center bg-amber-50/50">Rimanenza Contata</th>
                  <th className="py-2.5 px-2 text-center font-bold text-emerald-700 bg-emerald-50/40">Venduto</th>
                  <th className="py-2.5 px-2 text-center">Incasso & Utile</th>
                  <th className="py-2.5 px-2 text-center bg-blue-50/50">Quantità Caricata</th>
                  <th className="py-2.5 px-2 text-center">Nuova Scorta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((row) => {
                  const slot = selectedMachine?.slots.find(s => s.id === row.slotId);
                  const sold = Math.max(0, row.previousStock - row.countedRemaining - (row.unitsRemoved || 0));
                  const lineRevenue = Number((sold * row.oldSalePrice).toFixed(2));
                  const fifoConsumption = slot
                    ? consumeSlotFifo(slot, sold, row.unitCost)
                    : { costOfSold: Number((sold * row.unitCost).toFixed(2)), avgUnitCost: row.unitCost, consumptions: [], remainingBatches: [] };
                  const lineCost = fifoConsumption.costOfSold;
                  const lineProfit = Number((lineRevenue - lineCost).toFixed(2));
                  const resultingStock = row.countedRemaining + row.addedStock;
                  const stockPct = Math.round((resultingStock / row.capacity) * 100);

                  // Calcolo prelievo lotti FIFO per Quantità Caricata
                  const loadPlan = calculateFifoLoadPlan(row.productId, row.addedStock, purchases, row.unitCost);

                  // Disponibilità reale in magazzino per questa specifica riga
                  const otherAdded = rows
                    .filter(r => r.slotId !== row.slotId && r.productId === row.productId)
                    .reduce((sum, r) => sum + r.addedStock, 0);
                  const availableForSlot = Math.max(0, row.warehouseAvailable - otherAdded);

                  return (
                    <tr key={row.slotId} className="hover:bg-stone-50/70 transition-colors">
                      {/* Slot Label */}
                      <td className="py-3 px-2 font-mono font-bold text-stone-700">
                        <span className="inline-block px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-xs">
                          {row.slotLabel}
                        </span>
                      </td>

                      {/* Product Name & Batch info */}
                      <td className="py-3 px-2">
                        <div className="font-medium text-stone-900 line-clamp-1">{row.productName}</div>
                        <div className="flex items-center space-x-2 text-2xs text-stone-500 mt-0.5">
                          {row.batchNumber ? (
                            <span className="inline-flex items-center text-emerald-700 font-mono font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              <Tag className="w-2.5 h-2.5 mr-1" />
                              {row.batchNumber}
                            </span>
                          ) : (
                            <span className="text-stone-400">Lotto standard</span>
                          )}
                          <span className="text-stone-300">•</span>
                          <span className="text-stone-500">
                            Magazzino:{' '}
                            <strong className="text-stone-800">{row.warehouseAvailable} pz</strong>
                          </span>
                        </div>
                      </td>

                      {/* Cost Input / Display */}
                      <td className="py-3 px-2 text-center bg-stone-50/50">
                        <div className="inline-flex items-center justify-center">
                          <span className="text-2xs text-stone-400 mr-0.5">€</span>
                          <SmartNumberInput
                            allowDecimals={true}
                            min={0.0001}
                            defaultValueIfEmpty={0.01}
                            value={sold > 0 && fifoConsumption.consumptions.length > 1 ? Number(fifoConsumption.avgUnitCost.toFixed(4)) : row.unitCost}
                            onChange={(val) => handleCostChange(row.slotId, Number(val))}
                            className="w-14 px-1 py-0.5 text-center text-xs font-mono font-bold text-stone-700 bg-white border border-stone-200 rounded"
                            title="Costo di acquisto unitario del lotto"
                          />
                        </div>
                        {sold > 0 && fifoConsumption.consumptions.length > 1 && (
                          <div className="text-3xs text-amber-700 font-semibold font-mono mt-0.5">
                            media FIFO
                          </div>
                        )}
                      </td>

                      {/* Sale Price Input */}
                      <td className="py-3 px-2 text-center">
                        <div className="inline-flex items-center">
                          <span className="text-xs text-stone-400 mr-1">€</span>
                          <SmartNumberInput
                            allowDecimals={true}
                            min={0.1}
                            defaultValueIfEmpty={0.1}
                            value={row.salePrice}
                            onChange={(val) => handlePriceChange(row.slotId, Number(val))}
                            className="w-16 px-1.5 py-1 text-center font-bold text-stone-900 border border-stone-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                            title="Prezzo di vendita al pubblico"
                          />
                        </div>
                      </td>

                      {/* Previous Stock */}
                      <td className="py-3 px-2 text-center font-mono font-medium text-stone-600 bg-stone-50/70">
                        {row.previousStock}
                      </td>

                      {/* Counted Remaining (Input 1) */}
                      <td className="py-3 px-2 text-center bg-amber-50/30">
                        <div className="inline-flex items-center justify-center space-x-1">
                          <input
                            id={`input-counted-${row.slotId}`}
                            type="number"
                            min="0"
                            max={Math.max(row.capacity, row.previousStock, 50)}
                            value={row.countedRemaining}
                            onChange={(e) => handleCountedChange(row.slotId, parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-center font-bold text-amber-900 bg-amber-50/80 border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                          />
                        </div>

                        {/* Controllo Prodotti Tolti non venduti */}
                        {!row.showRemovedInput && (row.unitsRemoved || 0) === 0 ? (
                          <button
                            type="button"
                            onClick={() => toggleShowRemovedInput(row.slotId)}
                            className="mt-1 text-3xs text-stone-500 hover:text-amber-800 underline block mx-auto cursor-pointer"
                            title="Se hai tolto pezzi scaduti o resi a magazzino, segnalo qui"
                          >
                            − Pezzi tolti?
                          </button>
                        ) : (
                          <div className="mt-1 p-1 bg-rose-50 border border-rose-200 rounded text-3xs">
                            <div className="flex items-center justify-between text-rose-800 font-bold mb-0.5">
                              <span>Tolti:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  handleRemovedChange(row.slotId, 0);
                                  toggleShowRemovedInput(row.slotId);
                                }}
                                className="text-stone-400 hover:text-stone-600 text-3xs cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                type="button"
                                onClick={() => handleRemovedChange(row.slotId, (row.unitsRemoved || 0) - 1)}
                                className="w-4 h-4 bg-white border border-rose-300 text-rose-700 font-bold rounded cursor-pointer"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={Math.max(0, row.previousStock - row.countedRemaining)}
                                value={row.unitsRemoved || 0}
                                onChange={e => handleRemovedChange(row.slotId, parseInt(e.target.value) || 0)}
                                className="w-8 text-center font-bold bg-white border border-rose-300 rounded text-3xs"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemovedChange(row.slotId, (row.unitsRemoved || 0) + 1)}
                                className="w-4 h-4 bg-white border border-rose-300 text-rose-700 font-bold rounded cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                            <label className="flex items-center justify-center space-x-1 text-3xs text-rose-900 mt-0.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={row.returnToWarehouse || false}
                                onChange={e => handleRemovedChange(row.slotId, row.unitsRemoved || 0, e.target.checked)}
                                className="rounded text-rose-600 w-3 h-3"
                              />
                              <span>Reso</span>
                            </label>
                          </div>
                        )}
                      </td>

                      {/* Sold Units (Automatic Difference) */}
                      <td className="py-3 px-2 text-center bg-emerald-50/40">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {sold} pz
                        </span>
                      </td>

                      {/* Line Revenue */}
                      <td className="py-3 px-2 text-center">
                        <div className="font-bold text-stone-900">{formatEuro(lineRevenue)}</div>
                        <div className={`text-2xs font-semibold ${lineProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          utile {formatEuro(lineProfit)}
                        </div>
                        {fifoConsumption.consumptions.length > 1 && (
                          <div 
                            className="mt-1 text-3xs font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"
                            title={`Dettaglio FIFO venduto: ${formatBatchConsumptionSummary(fifoConsumption.consumptions)}`}
                          >
                            FIFO: {formatBatchConsumptionSummary(fifoConsumption.consumptions)}
                          </div>
                        )}
                      </td>

                      {/* Added Stock / Refill Quantity (Input 2) */}
                      <td className="py-3 px-2 text-center bg-blue-50/30">
                        <div className="inline-flex items-center justify-center space-x-1">
                          <input
                            id={`input-added-${row.slotId}`}
                            type="number"
                            min="0"
                            max={Math.min(row.capacity - row.countedRemaining, availableForSlot + row.addedStock)}
                            value={row.addedStock}
                            disabled={row.warehouseAvailable <= 0 || (availableForSlot <= 0 && row.addedStock === 0)}
                            onChange={(e) => handleAddedChange(row.slotId, parseInt(e.target.value) || 0)}
                            className={`w-16 px-2 py-1 text-center font-bold rounded focus:outline-hidden ${
                              row.warehouseAvailable <= 0 || (availableForSlot <= 0 && row.addedStock === 0)
                                ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
                                : 'text-blue-900 bg-blue-50/80 border border-blue-300 focus:ring-2 focus:ring-blue-500'
                            }`}
                            title={
                              row.warehouseAvailable <= 0
                                ? 'Nessuna scorta a magazzino: impossibile aggiungere'
                                : 'Quantità da caricare'
                            }
                          />
                          <button
                            type="button"
                            disabled={availableForSlot <= 0}
                            onClick={() => handleAddedChange(row.slotId, row.capacity - row.countedRemaining)}
                            className={`px-1.5 py-1 text-2xs font-semibold rounded transition-colors ${
                              availableForSlot <= 0
                                ? 'text-stone-300 bg-stone-100 cursor-not-allowed'
                                : 'text-blue-700 bg-blue-100 hover:bg-blue-200 cursor-pointer'
                            }`}
                            title={
                              row.warehouseAvailable <= 0
                                ? 'Nessuna scorta a magazzino'
                                : availableForSlot <= 0
                                ? 'Scorte a magazzino già assegnate'
                                : 'Riempi al massimo della capienza'
                            }
                          >
                            Max
                          </button>
                        </div>
                        {row.warehouseAvailable <= 0 ? (
                          <div className="mt-1 text-3xs font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
                            Magazzino 0 pz
                          </div>
                        ) : availableForSlot <= 0 && row.addedStock === 0 ? (
                          <div className="mt-1 text-3xs font-medium text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                            Scorte già assegnate
                          </div>
                        ) : loadPlan.allocations.length > 1 ? (
                          <div className="mt-1 text-3xs text-blue-800 bg-blue-50 px-1 py-0.5 rounded border border-blue-200">
                            Carica multi-lotto: {loadPlan.allocations.map(a => `${a.quantity}pz (${formatEuro(a.unitCost)})`).join(' + ')}
                          </div>
                        ) : row.addedStock > 0 && loadPlan.allocations.length === 1 ? (
                          <div className="text-3xs font-mono text-emerald-800 mt-1 max-w-[130px] mx-auto truncate" title={`Lotto: ${loadPlan.allocations[0].batchNumber} @ ${formatEuro(loadPlan.allocations[0].unitCost)}`}>
                            Lotto: {loadPlan.allocations[0].batchNumber}
                          </div>
                        ) : null}
                      </td>

                      {/* Resulting Stock */}
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <span className="font-bold text-stone-800">{resultingStock}</span>
                          <span className="text-2xs text-stone-400">/{row.capacity}</span>
                        </div>
                        <div className="w-16 h-1.5 bg-stone-200 rounded-full mx-auto mt-1 overflow-hidden">
                          <div 
                            className={`h-full ${stockPct >= 70 ? 'bg-emerald-500' : stockPct >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(100, stockPct)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Notes Operatore */}
          <div className="mt-6 pt-4 border-t border-stone-200">
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
              <label htmlFor="input-notes" className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                Note Operatore sul Distributore (opzionale)
              </label>
              <input
                id="input-notes"
                type="text"
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                placeholder={
                  selectedMachine?.type === 'caffe_calde'
                    ? "Es. Pulizia cassetti eseguita, verifica bicchieri e palette OK..."
                    : "Es. Pulizia spirali eseguita, verifica funzionalità OK..."
                }
                className="px-3 py-2 w-full text-sm text-stone-900 bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <div className="text-2xs text-stone-500 mt-1">
                Le note saranno memorizzate nel registro storico del distributore.
              </div>
            </div>
          </div>
        </div>

        {/* Footer Summary & Confirmation */}
        <div className="px-6 py-4 bg-stone-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Live Totals summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full sm:w-auto text-left">
            <div>
              <div className="text-2xs text-stone-400 uppercase font-semibold">Pezzi Venduti</div>
              <div className="text-lg font-bold text-white flex items-center space-x-1">
                <span>{summary.totalSold}</span>
                <span className="text-xs text-stone-400 font-normal">pz</span>
              </div>
            </div>

            <div>
              <div className="text-2xs text-stone-400 uppercase font-semibold">Incasso Totale</div>
              <div className="text-lg font-bold text-amber-400">
                {formatEuro(summary.totalRevenue)}
              </div>
            </div>

            <div>
              <div className="text-2xs text-stone-400 uppercase font-semibold">Costo Merci</div>
              <div className="text-lg font-bold text-stone-300">
                {formatEuro(summary.totalCost)}
              </div>
            </div>

            <div>
              <div className="text-2xs text-emerald-400 uppercase font-semibold">Profitto Netto</div>
              <div className="text-lg font-bold text-emerald-400 flex items-center space-x-1">
                <span>{formatEuro(summary.totalProfit)}</span>
                <span className="text-xs text-emerald-300 font-normal">({formatPercent(summary.marginPct)})</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              id="btn-cancel-restock"
              onClick={closeRestockModal}
              className="px-4 py-2.5 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800 text-sm font-medium transition-colors"
            >
              Annulla
            </button>

            <button
              id="btn-confirm-restock"
              onClick={() => setIsReviewModalOpen(true)}
              disabled={isSuccessFeedback}
              className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer ${
                isSuccessFeedback
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isSuccessFeedback ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Riconciliazione Registrata!</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Rivedi & Salva Ricarica</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modale Report di Revisione prima di confermare */}
      {isReviewModalOpen && selectedMachine && (
        <RestockReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          onConfirm={handleSave}
          machineName={selectedMachine.name}
          machineCode={selectedMachine.code}
          totals={{
            totalSold: summary.totalSold,
            totalRevenue: summary.totalRevenue,
            totalCost: summary.totalCost,
            totalProfit: summary.totalProfit,
            totalAdded: summary.totalAdded,
            totalRemoved: summary.totalRemoved,
            marginPct: summary.marginPct,
          }}
          cashWithdrawn={cashCollected}
          items={rows.map(r => {
            const sold = Math.max(0, r.previousStock - r.countedRemaining - (r.unitsRemoved || 0));
            const rev = Number((sold * r.oldSalePrice).toFixed(2));
            const slot = selectedMachine.slots.find(s => s.id === r.slotId);
            const fifo = slot ? consumeSlotFifo(slot, sold, r.unitCost) : { costOfSold: sold * r.unitCost };
            return {
              slotId: r.slotId,
              slotLabel: r.slotLabel,
              productName: r.productName,
              previousStock: r.previousStock,
              countedRemaining: r.countedRemaining,
              unitsSold: sold,
              unitsRemoved: r.unitsRemoved,
              returnToWarehouse: r.returnToWarehouse,
              addedStock: r.addedStock,
              newStock: r.countedRemaining + r.addedStock,
              salePrice: r.salePrice,
              revenue: rev,
              profit: rev - fifo.costOfSold,
              warehouseStock: r.warehouseAvailable,
            };
          })}
        />
      )}
    </div>
  );
};
