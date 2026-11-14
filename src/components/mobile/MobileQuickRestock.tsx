import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Zap, 
  Check, 
  Coins, 
  Package, 
  Plus, 
  Minus, 
  Search, 
  ArrowRight, 
  AlertCircle,
  TrendingUp,
  Sparkles,
  Layers,
  ChevronDown,
  HelpCircle,
  ChevronUp,
  Info,
  Sliders,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';
import { useVending } from '../../context/VendingContext';
import { formatEuro, consumeSlotFifo, calculateFifoLoadPlan, getSlotActiveCost } from '../../utils/vendingUtils';
import { EditSpiralsModal } from '../EditSpiralsModal';
import { CoffeeRestockView } from '../coffee/CoffeeRestockView';
import { SmartNumberInput } from '../common/SmartNumberInput';
import { RestockReviewModal } from '../common/RestockReviewModal';

interface MobileQuickRestockProps {
  onRestockSuccess?: () => void;
}

export const MobileQuickRestock: React.FC<MobileQuickRestockProps> = ({ onRestockSuccess }) => {
  const { 
    machines, 
    products, 
    purchases, 
    recordRestock, 
    restockHistory,
    savePreviousStateBackup,
    restoreLastPreConfirmBackup,
    lastPreConfirmBackup 
  } = useVending();

  // Macchina attiva
  const [selectedMachineId, setSelectedMachineId] = useState<string>(() => machines[0]?.id || 'mach-01');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRow, setFilterRow] = useState<string>('all');
  const [showHelpGuide, setShowHelpGuide] = useState(true);
  const [isEditSpiralsOpen, setIsEditSpiralsOpen] = useState(false);
  
  // Cassa & Note
  const [cashWithdrawn, setCashWithdrawn] = useState<number | ''>('');
  const [operatorNotes, setOperatorNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [savedTimeNotice, setSavedTimeNotice] = useState<string>('');
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const activeMachine = useMemo(() => {
    return machines.find(m => m.id === selectedMachineId) || machines[0];
  }, [machines, selectedMachineId]);

  const isCoffee = activeMachine?.type === 'caffe_calde';
  const unitTerm = isCoffee ? 'cassetto' : 'spirale';
  const unitTermPlural = isCoffee ? 'cassetti' : 'spirali';
  const unitTermCap = isCoffee ? 'Cassetto' : 'Spirale';
  const unitTermPluralCap = isCoffee ? 'Cassetti' : 'Spirali';

  // Conteggi per slot
  const [itemCounts, setItemCounts] = useState<Record<string, { 
    counted: number; 
    removed: number; 
    returnRemovedToWarehouse: boolean; 
    added: number; 
    price: number;
    showRemovedInput?: boolean;
  }>>({});

  // Inizializza al cambio macchina
  useEffect(() => {
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
      const counted = slot.currentStock;
      // IMPORTANTE: added parte da 0! L'operatore prima conta o toglie i prodotti trovati.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMachine?.id]);

  // Calcola quante scorte a magazzino sono libere per uno slot specifico
  const getSlotAvailableWarehouse = useCallback((slotId: string, currentItemCounts: Record<string, any>) => {
    const slot = activeMachine?.slots.find(s => s.id === slotId);
    if (!slot) return 0;
    const prod = products.find(p => p.id === slot.productId);
    const totalWarehouse = Math.max(0, prod?.warehouseStock ?? 0);
    if (totalWarehouse <= 0) return 0;

    const otherSlotsAdded = activeMachine?.slots
      .filter(s => s.id !== slotId && s.productId === slot.productId)
      .reduce((sum, s) => sum + (currentItemCounts[s.id]?.added || 0), 0) || 0;

    return Math.max(0, totalWarehouse - otherSlotsAdded);
  }, [activeMachine, products]);

  // Calcolo dati riga per riga
  const rowData = useMemo(() => {
    if (!activeMachine) return [];

    return activeMachine.slots.map(slot => {
      const product = products.find(p => p.id === slot.productId);
      const state = itemCounts[slot.id] || { 
        counted: slot.currentStock, 
        removed: 0,
        returnRemovedToWarehouse: false,
        added: 0, 
        price: slot.salePrice,
        showRemovedInput: false,
      };

      const previousStock = typeof slot.lastRestockStock === 'number' ? slot.lastRestockStock : slot.currentStock;
      const removed = state.removed || 0;
      // Venduti = PreviousStock - Counted - Removed (i pezzi tolti per scadenza o reso non sono vendite!)
      const sold = Math.max(0, previousStock - state.counted - removed);
      const newStock = Math.min(slot.capacity, state.counted + state.added);
      const oldPrice = slot.salePrice;
      const revenue = Number((sold * oldPrice).toFixed(2));

      const activeCostInfo = getSlotActiveCost(slot, product, purchases);
      const fallbackCost = activeCostInfo.unitCost || (product?.unitCost && product.unitCost > 0 ? product.unitCost : 0.50);
      const slotFifo = consumeSlotFifo(slot, sold, fallbackCost);
      const costOfSold = slotFifo.costOfSold;
      const unitCostOfSold = sold > 0 ? slotFifo.avgUnitCost : fallbackCost;
      const profit = Number((revenue - costOfSold).toFixed(2));
      const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

      const loadPlan = calculateFifoLoadPlan(slot.productId, state.added, purchases, fallbackCost);
      const loadCost = loadPlan.totalCost;
      const availableWarehouse = getSlotAvailableWarehouse(slot.id, itemCounts);
      const warehouseStock = product ? product.warehouseStock : 0;

      return {
        slotId: slot.id,
        slotLabel: slot.label || slot.id || 'Spirale',
        productId: slot.productId,
        productName: product?.name || 'Prodotto',
        category: product?.category || 'snack',
        previousStock,
        counted: state.counted,
        removed,
        returnRemovedToWarehouse: state.returnRemovedToWarehouse,
        showRemovedInput: state.showRemovedInput,
        added: state.added,
        price: state.price,
        unitCost: unitCostOfSold,
        capacity: slot.capacity,
        sold,
        newStock,
        revenue,
        cost: costOfSold,
        profit,
        marginPct,
        loadCost,
        availableWarehouse,
        warehouseStock,
      };
    });
  }, [activeMachine, products, itemCounts, purchases, getSlotAvailableWarehouse]);

  // Totali
  const totals = useMemo(() => {
    const totalSold = rowData.reduce((acc, r) => acc + r.sold, 0);
    const totalRevenue = rowData.reduce((acc, r) => acc + r.revenue, 0);
    const totalCost = rowData.reduce((acc, r) => acc + r.cost, 0);
    const totalProfit = rowData.reduce((acc, r) => acc + r.profit, 0);
    const totalAdded = rowData.reduce((acc, r) => acc + r.added, 0);
    const totalLoadCost = rowData.reduce((acc, r) => acc + r.loadCost, 0);
    const totalRemoved = rowData.reduce((acc, r) => acc + (r.removed || 0), 0);
    const marginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalSold,
      totalRevenue,
      totalCost,
      totalProfit,
      totalAdded,
      totalLoadCost,
      totalRemoved,
      marginPct,
    };
  }, [rowData]);

  // Filtro righe e ricerca
  const filteredRows = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    return rowData.filter(r => {
      const matchSearch = !q || 
        (r.productName && r.productName.toLowerCase().includes(q)) || 
        (r.slotLabel && r.slotLabel.toLowerCase().includes(q));
      const matchRow = filterRow === 'all' || (r.slotLabel && r.slotLabel.toUpperCase().startsWith(filterRow.toUpperCase()));
      return matchSearch && matchRow;
    });
  }, [rowData, searchQuery, filterRow]);

  // Fila di spirali disponibili (A, B, C...)
  const availableRows = useMemo(() => {
    if (!activeMachine || !activeMachine.slots) return [];
    const rows = new Set<string>();
    activeMachine.slots.forEach(s => {
      const label = s.label || s.id || '';
      const letter = label.charAt(0).toUpperCase();
      if (letter && /^[A-Z]$/.test(letter)) rows.add(letter);
    });
    return Array.from(rows).sort();
  }, [activeMachine]);

  // Raggruppa le spirali per Fila (A, B, C...) per creare sezioni ripiano con ampio spazio visivo
  const groupedRows = useMemo(() => {
    const map = new Map<string, typeof filteredRows>();

    filteredRows.forEach(r => {
      const letter = (r.slotLabel && r.slotLabel.charAt(0).toUpperCase()) || 'A';
      const key = /^[A-Z]$/.test(letter) ? letter : 'ALTRO';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(r);
    });

    const groups: { letter: string; rows: typeof filteredRows }[] = [];
    Array.from(map.keys()).sort().forEach(letter => {
      groups.push({
        letter,
        rows: map.get(letter)!,
      });
    });

    return groups;
  }, [filteredRows]);

  // Handlers
  const setCounted = (slotId: string, val: number) => {
    const slot = activeMachine.slots.find(s => s.id === slotId);
    if (!slot) return;
    const maxAllowed = Math.max(slot.capacity, slot.lastRestockStock ?? slot.capacity, 50);
    const clamped = Math.max(0, Math.min(maxAllowed, val));
    const prevStock = typeof slot.lastRestockStock === 'number' ? slot.lastRestockStock : slot.currentStock;
    const maxRemovable = Math.max(0, prevStock - clamped);
    setItemCounts(prev => {
      const current = prev[slotId] || { counted: slot.currentStock, removed: 0, returnRemovedToWarehouse: false, added: 0, price: slot.salePrice };
      const maxAdd = Math.max(0, slot.capacity - clamped);
      const newAdded = Math.min(current.added, maxAdd);
      const newRemoved = Math.min(current.removed || 0, maxRemovable);
      return {
        ...prev,
        [slotId]: { ...current, counted: clamped, added: newAdded, removed: newRemoved },
      };
    });
  };

  const setRemoved = (slotId: string, val: number, returnToWh?: boolean) => {
    const slot = activeMachine?.slots.find(s => s.id === slotId);
    const prevStock = typeof slot?.lastRestockStock === 'number' ? slot.lastRestockStock : (slot?.currentStock || 0);
    setItemCounts(prev => {
      const current = prev[slotId] || { counted: slot?.currentStock || 0, removed: 0, returnRemovedToWarehouse: false, added: 0, price: slot?.salePrice || 1 };
      const maxRemovable = Math.max(0, prevStock - current.counted);
      const clampedRemoved = Math.max(0, Math.min(val, maxRemovable));
      return {
        ...prev,
        [slotId]: {
          ...current,
          removed: clampedRemoved,
          returnRemovedToWarehouse: returnToWh !== undefined ? returnToWh : current.returnRemovedToWarehouse,
        }
      };
    });
  };

  const toggleShowRemovedInput = (slotId: string) => {
    setItemCounts(prev => {
      const current = prev[slotId] || { counted: 0, removed: 0, returnRemovedToWarehouse: false, added: 0, price: 1 };
      return {
        ...prev,
        [slotId]: {
          ...current,
          showRemovedInput: !current.showRemovedInput,
        }
      };
    });
  };

  const setAdded = (slotId: string, val: number) => {
    const slot = activeMachine.slots.find(s => s.id === slotId);
    if (!slot) return;
    const current = itemCounts[slotId] || { counted: slot.currentStock, removed: 0, returnRemovedToWarehouse: false, added: 0, price: slot.salePrice };
    const availableWh = getSlotAvailableWarehouse(slotId, itemCounts);
    const maxAdd = Math.min(Math.max(0, slot.capacity - current.counted), availableWh);
    const clamped = Math.max(0, Math.min(maxAdd, val));
    setItemCounts(prev => ({
      ...prev,
      [slotId]: { ...current, added: clamped },
    }));
  };

  const fillAllMax = () => {
    if (!activeMachine) return;
    setItemCounts(prev => {
      const next = { ...prev };
      const remainingWarehouse: Record<string, number> = {};

      products.forEach(p => {
        remainingWarehouse[p.id] = Math.max(0, p.warehouseStock || 0);
      });

      activeMachine.slots.forEach(slot => {
        const current = next[slot.id] || { counted: slot.currentStock, removed: 0, returnRemovedToWarehouse: false, added: 0, price: slot.salePrice };
        const missing = Math.max(0, slot.capacity - current.counted);
        const availableWh = remainingWarehouse[slot.productId] || 0;
        const toAdd = Math.min(missing, availableWh);
        remainingWarehouse[slot.productId] = Math.max(0, availableWh - toAdd);

        next[slot.id] = { ...current, added: toAdd };
      });
      return next;
    });
  };

  const fillRowMax = (rowLetter: string) => {
    if (!activeMachine) return;
    setItemCounts(prev => {
      const next = { ...prev };
      const remainingWarehouse: Record<string, number> = {};

      products.forEach(p => {
        remainingWarehouse[p.id] = Math.max(0, p.warehouseStock || 0);
      });

      activeMachine.slots.forEach(slot => {
        const letter = (slot.label || slot.id || '').charAt(0).toUpperCase();
        if (letter === rowLetter) {
          const current = next[slot.id] || { counted: slot.currentStock, removed: 0, returnRemovedToWarehouse: false, added: 0, price: slot.salePrice };
          const missing = Math.max(0, slot.capacity - current.counted);
          const availableWh = remainingWarehouse[slot.productId] || 0;
          const toAdd = Math.min(missing, availableWh);
          remainingWarehouse[slot.productId] = Math.max(0, availableWh - toAdd);

          next[slot.id] = { ...current, added: toAdd };
        }
      });
      return next;
    });
  };

  const setAllAsUnchanged = () => {
    if (!activeMachine) return;
    setItemCounts(prev => {
      const next = { ...prev };
      activeMachine.slots.forEach(slot => {
        next[slot.id] = {
          counted: slot.currentStock,
          removed: 0,
          returnRemovedToWarehouse: false,
          added: 0,
          price: slot.salePrice,
          showRemovedInput: false,
        };
      });
      return next;
    });
  };

  const handleSaveRestock = () => {
    if (!activeMachine) return;

    const items = rowData.map(r => ({
      slotId: r.slotId,
      slotLabel: r.slotLabel,
      productId: r.productId,
      productName: r.productName,
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
      newStock: r.newStock,
      addedCost: r.loadCost,
      addedUnitCost: r.added > 0 ? Number((r.loadCost / r.added).toFixed(4)) : 0,
      marginPct: r.marginPct,
    }));

    recordRestock({
      machineId: activeMachine.id,
      machineName: activeMachine.name,
      machineCode: activeMachine.code,
      items,
      totalSold: totals.totalSold,
      totalRevenue: totals.totalRevenue,
      totalCost: totals.totalCost,
      totalProfit: totals.totalProfit,
      cashCollected: typeof cashWithdrawn === 'number' ? cashWithdrawn : 0,
      operatorNotes: operatorNotes || 'Rifornimento rapido da smartphone',
    });

    const resetAfterSave: typeof itemCounts = {};
    rowData.forEach(r => {
      resetAfterSave[r.slotId] = {
        counted: r.newStock,
        removed: 0,
        returnRemovedToWarehouse: false,
        added: 0,
        price: r.price,
        showRemovedInput: false,
      };
    });
    setItemCounts(resetAfterSave);

    const now = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setSavedTimeNotice(now);
    setIsSaved(true);
    setShowSummaryModal(false);
    if (onRestockSuccess) {
      onRestockSuccess();
    }
  };

  const getMachineIcon = (id: string) => {
    if (id === 'mach-03') return '☕';
    if (id === 'mach-02') return '🍪';
    return '🥤';
  };

  if (!activeMachine || !activeMachine.slots) {
    return (
      <div className="p-8 text-center text-stone-400 bg-stone-900 rounded-2xl border border-stone-800 space-y-3">
        <p className="text-sm font-semibold">Caricamento distributori in corso...</p>
      </div>
    );
  }

  return (
    <div className="pb-32 space-y-4 max-w-lg mx-auto">
      {/* 1. SELETTORE DEI 3 DISTRIBUTORI PER SMARTPHONE */}
      <div className="space-y-1.5">
        <span className="text-2xs font-bold text-stone-400 uppercase tracking-wider px-1 flex items-center justify-between">
          <span>Distributore:</span>
          <span className="text-amber-400 font-mono">3 Macchine H24</span>
        </span>
        <div className="grid grid-cols-3 gap-2">
          {machines.map(m => {
            const isSelected = activeMachine ? m.id === activeMachine.id : false;
            const totalStock = Array.isArray(m.slots) ? m.slots.reduce((a, b) => a + (b.currentStock || 0), 0) : 0;
            const totalCap = Array.isArray(m.slots) ? m.slots.reduce((a, b) => a + (b.capacity || 0), 0) : 0;
            const pct = totalCap > 0 ? Math.round((totalStock / totalCap) * 100) : 0;

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMachineId(m.id)}
                className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                  isSelected 
                    ? 'bg-gradient-to-b from-stone-900 to-stone-950 border-amber-500 shadow-md ring-2 ring-amber-500/30' 
                    : 'bg-stone-900/80 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl leading-none">{getMachineIcon(m.id)}</span>
                  <span className={`text-2xs font-mono font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>
                    {m.code}
                  </span>
                </div>
                <div className="mt-2">
                  <span className={`text-xs font-bold block truncate ${isSelected ? 'text-white' : 'text-stone-300'}`}>
                    {(m.name || m.code).replace(/Distributore \d+ - /, '')}
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-3xs text-stone-400 font-medium">{pct}% scorta</span>
                    <span className="text-3xs font-mono font-semibold text-stone-400">{m.slots?.length || 0} slot</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-1 pt-1">
          <span className="text-3xs text-stone-400">
            {activeMachine.slots.length} {unitTermPlural} configurati
          </span>
          <button
            type="button"
            onClick={() => setIsEditSpiralsOpen(true)}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-3xs font-bold border border-stone-700 transition-colors cursor-pointer active:scale-95"
          >
            <Sliders className="w-3 h-3 text-amber-400" />
            <span>Configura {unitTermPluralCap} a Mano</span>
          </button>
        </div>
      </div>

      {/* Sezione Specializzata Macchina Caffè vs Spirali Snack/Bibite */}
      {isCoffee ? (
        <CoffeeRestockView
          machine={activeMachine}
          products={products}
          purchases={purchases}
          restockHistory={restockHistory}
          onSaveRestock={(sessionData) => {
            recordRestock(sessionData);
            if (onRestockSuccess) onRestockSuccess();
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2500);
          }}
          isMobile={true}
        />
      ) : (
        <>
          {/* GUIDA RAPIDA ALLA CARICA: SPIEGAZIONE DELLE 2 CASELLE */}
          <div className="bg-stone-900 border border-amber-500/40 rounded-2xl p-3.5 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Come funziona il rifornimento (2 comandi):</h3>
              <p className="text-3xs text-stone-400">Tocca per {showHelpGuide ? 'nascondere' : 'leggere la guida rapida'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowHelpGuide(!showHelpGuide)}
            className="p-1 rounded-lg bg-stone-800 text-stone-300 hover:text-white cursor-pointer"
          >
            {showHelpGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showHelpGuide && (
          <div className="mt-3 pt-3 border-t border-stone-800 space-y-2 text-2xs">
            <div className="flex items-start space-x-2.5 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-black text-2xs flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <div>
                <strong className="text-amber-300 font-bold block text-xs">1ª Casella: RIMASTI NEL DISTRIBUTORE</strong>
                <span className="text-stone-300 leading-relaxed text-3xs block mt-0.5">
                  Conta quante unità trovi ancora nel {unitTerm} prima di toccarlo. Inserendo questo numero, il sistema calcola in automatico <strong>quanti ne hai venduti</strong> e <strong>l&apos;incasso</strong>!
                </span>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 bg-blue-500/10 border border-blue-500/30 p-2.5 rounded-xl">
              <span className="w-5 h-5 rounded-full bg-blue-500 text-stone-950 font-black text-2xs flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <div>
                <strong className="text-blue-300 font-bold block text-xs">2ª Casella: CARICA DA MAGAZZINO</strong>
                <span className="text-stone-300 leading-relaxed text-3xs block mt-0.5">
                  Indica quanti nuovi pezzi prendi dal magazzino/furgone e inserisci nel {unitTerm}. Questi pezzi verranno scalati in automatico dal magazzino e aggiunti al distributore.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. BARRA DI RICERCA & FILTRO RAPIDO FILE (A, B, C...) */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-3 shadow-sm space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={`Cerca ${unitTerm} o prodotto (es. A1, Acqua, Caffè)...`}
            className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setFilterRow('all')}
              className={`px-2.5 py-1 rounded-lg text-2xs font-bold cursor-pointer transition-colors ${
                filterRow === 'all' ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              Tutte
            </button>
            {availableRows.map(rowLetter => (
              <button
                key={rowLetter}
                type="button"
                onClick={() => setFilterRow(rowLetter)}
                className={`px-2.5 py-1 rounded-lg text-2xs font-mono font-bold cursor-pointer transition-colors ${
                  filterRow === rowLetter ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                Fila {rowLetter}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fillAllMax}
            className="px-2.5 py-1 rounded-lg text-3xs font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40 shrink-0 hover:bg-blue-500/30 cursor-pointer active:scale-95 whitespace-nowrap"
          >
            + Riempi Tutto
          </button>
        </div>
      </div>

      {/* 3. LISTA SCHEDE SPIRALI SUDDIVISE PER FILA CON LE 2 CASELLE PASSO-PASSO */}
      <div className="space-y-8">
        {activeMachine.slots.length === 0 ? (
          <div className="p-7 text-center bg-stone-900/90 border border-stone-800 rounded-2xl space-y-3.5 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Nessun {unitTerm} configurato</h4>
              <p className="text-2xs text-stone-400 mt-1 max-w-xs mx-auto leading-relaxed">
                Tutti i dati e le capienze sono stati azzerati a zero. Puoi inserire a mano i {unitTermPlural} reali di questo distributore (codice, prodotto, capienza e prezzo).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditSpiralsOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-bold text-xs transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Aggiungi {unitTermPluralCap} a Mano</span>
            </button>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 bg-stone-900/60 rounded-2xl border border-stone-800">
            Nessun {unitTerm} trovato per la ricerca selezionata.
          </div>
        ) : (
          groupedRows.map(group => (
            <div key={group.letter} className="space-y-4">
              {/* SEPARATORE VISIVO E INTESTAZIONE RIPIANO / FILA */}
              <div className="pt-4 pb-2 border-b-2 border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="font-mono text-xs font-black bg-amber-500 text-stone-950 px-2.5 py-1 rounded-lg shadow-sm">
                    FILA {group.letter}
                  </span>
                  <span className="text-xs font-bold text-stone-200">
                    Ripiano {group.letter} • <span className="text-stone-400 font-normal">{group.rows.length} {unitTermPlural}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => fillRowMax(group.letter)}
                  className="px-2.5 py-1 rounded-lg text-3xs font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 cursor-pointer active:scale-95"
                >
                  + Riempi Fila
                </button>
              </div>

              {/* SCHEDE SPIRALI DELLA FILA */}
              <div className="space-y-4">
                {group.rows.map(row => {
                  return (
                    <div 
                      key={row.slotId}
                      className="bg-stone-900/95 border border-stone-800/90 rounded-2xl p-4 shadow-md space-y-3.5"
                    >
                      {/* Intestazione Spirale: Codice, Nome e Dettagli */}
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-stone-800/70">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span className="font-mono text-xs font-black bg-stone-800 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg shrink-0">
                            {row.slotLabel}
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">
                              {row.productName}
                            </h4>
                            <div className="flex items-center space-x-1.5 text-3xs text-stone-400 mt-0.5">
                              <span>Capienza: <strong className="text-stone-300">{row.capacity} pz</strong></span>
                              <span className="text-stone-600">•</span>
                              <span>In magazzino: <strong className="text-stone-300">{row.warehouseStock} pz</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-bold text-emerald-400 block">
                            {formatEuro(row.price)}
                          </span>
                          <span className="text-3xs text-stone-400">Prezzo ivato</span>
                        </div>
                      </div>

                      {/* LE DUE CASELLE OPERATIVE: 1. RIMASTI e 2. CARICA */}
                      <div className="space-y-3">
                        {/* CASELLA 1: RIMASTI NEL DISTRIBUTORE (PER CALCOLARE LE VENDITE) */}
                        <div className="bg-stone-950/90 p-3 rounded-xl border border-amber-500/40 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-black text-2xs flex items-center justify-center shrink-0">
                                  1
                                </span>
                                <span className="text-xs font-black text-amber-300 uppercase tracking-wide">
                                  RIMASTI NELLA SPIRALE
                                </span>
                              </div>
                              <p className="text-2xs text-stone-300 mt-1 pl-6">
                                Quante unità trovi ancora dentro? <span className="text-stone-400">(prima erano <strong className="text-stone-200 font-mono">{row.previousStock} pz</strong>)</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-800/80">
                            <div className="flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => setCounted(row.slotId, row.counted - 1)}
                                className="w-10 h-10 rounded-xl bg-stone-800 active:bg-amber-500 active:text-stone-950 text-white font-black flex items-center justify-center text-lg border border-stone-700 shadow-sm cursor-pointer shrink-0"
                                title="Diminuisci rimasti"
                              >
                                <Minus className="w-4 h-4" />
                              </button>

                              <SmartNumberInput
                                min={0}
                                max={row.capacity}
                                value={row.counted}
                                onNumberChange={val => setCounted(row.slotId, val)}
                                className="w-14 h-10 text-center font-mono font-black text-base text-amber-300 bg-stone-900 border border-amber-500/60 rounded-xl focus:outline-none"
                              />

                              <button
                                type="button"
                                onClick={() => setCounted(row.slotId, row.counted + 1)}
                                className="w-10 h-10 rounded-xl bg-stone-800 active:bg-amber-500 active:text-stone-950 text-white font-black flex items-center justify-center text-lg border border-stone-700 shadow-sm cursor-pointer shrink-0"
                                title="Aumenta rimasti"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="flex flex-col gap-1 items-end">
                              <button
                                type="button"
                                onClick={() => setCounted(row.slotId, 0)}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-2xs font-bold hover:bg-rose-500/30 cursor-pointer active:scale-95"
                              >
                                0 Vuoto (tutto venduto)
                              </button>
                              <button
                                type="button"
                                onClick={() => setCounted(row.slotId, row.previousStock)}
                                className="px-2.5 py-1 rounded-lg bg-stone-800 text-stone-300 border border-stone-700 text-2xs font-semibold hover:bg-stone-700 cursor-pointer active:scale-95"
                              >
                                Invariato ({row.previousStock} pz)
                              </button>
                            </div>
                          </div>

                          {/* Controllo Prodotti Tolti non venduti (scaduti o resi) */}
                          {!row.showRemovedInput && (row.removed || 0) === 0 ? (
                            <button
                              type="button"
                              onClick={() => toggleShowRemovedInput(row.slotId)}
                              className="mt-1 text-3xs text-stone-400 hover:text-amber-400 underline flex items-center gap-1 cursor-pointer"
                              title="Se hai rimosso pezzi dal distributore per scadenza o reso, segnalo qui così non vengono contati come venduti"
                            >
                              <span>− Hai tolto pezzi scaduti/resi dal distributore?</span>
                            </button>
                          ) : (
                            <div className="mt-2 p-2 bg-rose-950/40 border border-rose-500/50 rounded-xl space-y-1.5 text-xs">
                              <div className="flex items-center justify-between text-rose-300 font-bold text-2xs">
                                <span>Pezzi tolti (non venduti):</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRemoved(row.slotId, 0);
                                    toggleShowRemovedInput(row.slotId);
                                  }}
                                  className="text-stone-400 hover:text-white text-xs p-0.5 cursor-pointer"
                                  title="Chiudi"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setRemoved(row.slotId, (row.removed || 0) - 1)}
                                  className="w-7 h-7 rounded-lg bg-stone-800 text-rose-300 border border-rose-500/40 font-bold flex items-center justify-center text-sm cursor-pointer"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  max={Math.max(0, row.previousStock - row.counted)}
                                  value={row.removed}
                                  onChange={e => setRemoved(row.slotId, parseInt(e.target.value) || 0)}
                                  className="w-12 h-7 text-center font-bold text-white bg-stone-900 border border-rose-500/60 rounded-lg text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => setRemoved(row.slotId, (row.removed || 0) + 1)}
                                  className="w-7 h-7 rounded-lg bg-stone-800 text-rose-300 border border-rose-500/40 font-bold flex items-center justify-center text-sm cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                              <label className="flex items-center space-x-1.5 text-3xs text-rose-300 cursor-pointer pt-0.5">
                                <input
                                  type="checkbox"
                                  checked={row.returnRemovedToWarehouse}
                                  onChange={e => setRemoved(row.slotId, row.removed, e.target.checked)}
                                  className="rounded border-rose-500 text-rose-600 focus:ring-0"
                                />
                                <span>Reso a magazzino (riaccredita scorte)</span>
                              </label>
                            </div>
                          )}
                        </div>

                        {/* CASELLA 2: CARICA DAL MAGAZZINO (PER RIEMPIRE IL DISTRIBUTORE) */}
                        <div className="bg-stone-950/90 p-3 rounded-xl border border-blue-500/40 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="w-5 h-5 rounded-full bg-blue-500 text-stone-950 font-black text-2xs flex items-center justify-center shrink-0">
                                  2
                                </span>
                                <span className="text-xs font-black text-blue-300 uppercase tracking-wide">
                                  CARICA DA MAGAZZINO
                                </span>
                              </div>
                              <p className="text-2xs text-stone-300 mt-1 pl-6">
                                Quante nuove unità aggiungi adesso? <span className="text-stone-400">(spazio libero: <strong className="text-stone-200 font-mono">+{row.capacity - row.counted} pz</strong>)</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-800/80">
                            <div className="flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => setAdded(row.slotId, row.added - 1)}
                                className="w-10 h-10 rounded-xl bg-stone-800 active:bg-blue-500 active:text-stone-950 text-white font-black flex items-center justify-center text-lg border border-stone-700 shadow-sm cursor-pointer shrink-0"
                                title="Diminuisci aggiunti"
                              >
                                <Minus className="w-4 h-4" />
                              </button>

                              <SmartNumberInput
                                min={0}
                                max={row.capacity - row.counted}
                                value={row.added}
                                onNumberChange={val => setAdded(row.slotId, val)}
                                className="w-14 h-10 text-center font-mono font-black text-base text-blue-300 bg-stone-900 border border-blue-500/60 rounded-xl focus:outline-none"
                              />

                              <button
                                type="button"
                                onClick={() => setAdded(row.slotId, row.added + 1)}
                                className="w-10 h-10 rounded-xl bg-stone-800 active:bg-blue-500 active:text-stone-950 text-white font-black flex items-center justify-center text-lg border border-stone-700 shadow-sm cursor-pointer shrink-0"
                                title="Aumenta aggiunti"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="flex flex-col gap-1 items-end">
                              <button
                                type="button"
                                onClick={() => setAdded(row.slotId, row.capacity - row.counted)}
                                className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40 text-2xs font-extrabold hover:bg-blue-500/30 cursor-pointer active:scale-95"
                              >
                                + Riempi al Max (+{row.capacity - row.counted})
                              </button>
                              <span className="text-2xs font-mono font-semibold text-stone-300">
                                Totale finale: <strong className="text-white">{row.newStock}/{row.capacity} pz</strong>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* RISULTATO CALCOLATO DELLA SPIRALE (INCASSO E UTILE) */}
                      <div className="flex items-center justify-between bg-stone-950/80 px-3.5 py-2.5 rounded-xl border border-stone-800 text-2xs">
                        <div className="flex items-center space-x-2">
                          <span className="text-stone-400">Venduti calcolati:</span>
                          <span className="font-mono font-black text-amber-400">{row.sold} pz</span>
                          <span className="text-stone-300 font-mono">({formatEuro(row.revenue)})</span>
                        </div>
                        {row.sold > 0 ? (
                          <span className="font-mono font-bold text-emerald-400">
                            +{formatEuro(row.profit)} utile
                          </span>
                        ) : (
                          <span className="text-3xs text-stone-500">
                            Nessuna vendita
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. NOTE OPERATORE */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md space-y-2 mt-6">
        <label className="text-xs font-bold text-white flex items-center gap-1.5">
          Note Operatore sul Distributore (opzionale)
        </label>
        <input
          type="text"
          value={operatorNotes}
          onChange={e => setOperatorNotes(e.target.value)}
          placeholder="Note rifornimento (es. pulizia fatta, verifica ok)..."
          className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* 5. BARRA INFERIORE FISSA D'AZIONE (STICKY PER IL POLLICE) */}
      <div className="fixed bottom-16 left-0 right-0 z-30 px-3 py-2.5 bg-stone-950/95 backdrop-blur-md border-t border-stone-800 shadow-2xl">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 truncate">
              <span className="text-3xs text-stone-400 uppercase font-semibold">Venduti:</span>
              <span className="text-sm font-mono font-black text-amber-400">{totals.totalSold} pz</span>
              <span className="text-xs font-mono text-stone-300">({formatEuro(totals.totalRevenue)})</span>
            </div>
            <div className="text-3xs text-emerald-400 font-medium truncate">
              Utile: +{formatEuro(totals.totalProfit)}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSummaryModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 active:from-emerald-600 active:to-teal-600 text-stone-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center space-x-1.5 cursor-pointer shrink-0"
          >
            <Check className="w-4 h-4" />
            <span className="whitespace-nowrap">Salva Carico</span>
          </button>
        </div>
      </div>
      </>
      )}

      {/* MODALE DI REPORT E CONFERMA MODIFICHE PRIMA DEL SALVATAGGIO */}
      {showSummaryModal && (
        <RestockReviewModal
          isOpen={showSummaryModal}
          onClose={() => setShowSummaryModal(false)}
          onConfirm={handleSaveRestock}
          machineName={activeMachine?.name || 'Distributore'}
          machineCode={activeMachine?.code || ''}
          totals={{
            totalSold: totals.totalSold,
            totalRevenue: totals.totalRevenue,
            totalCost: totals.totalCost,
            totalProfit: totals.totalProfit,
            totalAdded: totals.totalAdded,
            totalAddedCost: totals.totalLoadCost,
            totalRemoved: totals.totalRemoved,
            marginPct: totals.marginPct,
          }}
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
            newStock: r.newStock,
            salePrice: r.price,
            revenue: r.revenue,
            profit: r.profit,
            warehouseStock: r.warehouseStock,
            availableWarehouse: r.availableWarehouse,
          }))}
          unitTermLower={unitTerm}
          unitTermPluralLower={unitTermPlural}
        />
      )}

      {/* NOTIFICA SALVATAGGIO RIUSCITO CON RIPRISTINO COPIA PRECEDENTE */}
      {isSaved && (
        <div className="fixed top-16 left-4 right-4 z-50 max-w-sm mx-auto bg-stone-900 border border-emerald-500/50 text-white p-3.5 rounded-2xl shadow-2xl space-y-2 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 text-stone-950 flex items-center justify-center font-bold shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block text-emerald-400">
                  Rifornimento registrato con successo!
                </span>
                <span className="text-3xs text-stone-300">
                  Copia precedente salvata alle {savedTimeNotice || 'ora'}.
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsSaved(false)}
              className="text-stone-400 hover:text-white text-xs p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              const res = restoreLastPreConfirmBackup();
              if (res.success) {
                alert('Copia precedente ripristinata con successo!');
                setIsSaved(false);
              } else {
                alert(res.message);
              }
            }}
            className="w-full py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-2xs flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>↩ Ripristina copia precedente</span>
          </button>
        </div>
      )}

      {/* MODALE MODIFICA / AGGIUNTA SPIRALI PER TELEFONO */}
      {isEditSpiralsOpen && activeMachine && (
        <EditSpiralsModal
          machine={activeMachine}
          onClose={() => setIsEditSpiralsOpen(false)}
        />
      )}
    </div>
  );
};
