import React, { useState, useMemo, useEffect } from 'react';
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
  RotateCcw,
  Sparkles,
  Layers,
  ChevronDown,
  HelpCircle,
  ChevronUp,
  Info,
  Sliders
} from 'lucide-react';
import { useVending } from '../../context/VendingContext';
import { formatEuro, consumeSlotFifo, calculateFifoLoadPlan } from '../../utils/vendingUtils';
import { EditSpiralsModal } from '../EditSpiralsModal';

interface MobileQuickRestockProps {
  onRestockSuccess?: () => void;
}

export const MobileQuickRestock: React.FC<MobileQuickRestockProps> = ({ onRestockSuccess }) => {
  const { machines, products, purchases, recordRestock } = useVending();

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
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const activeMachine = useMemo(() => {
    return machines.find(m => m.id === selectedMachineId) || machines[0];
  }, [machines, selectedMachineId]);

  // Conteggi per slot
  const [itemCounts, setItemCounts] = useState<Record<string, { counted: number; added: number; price: number }>>({});

  // Inizializza al cambio macchina
  useEffect(() => {
    if (!activeMachine) return;
    const initial: Record<string, { counted: number; added: number; price: number }> = {};
    activeMachine.slots.forEach(slot => {
      const counted = slot.currentStock;
      const missing = Math.max(0, slot.capacity - counted);
      initial[slot.id] = {
        counted,
        added: missing,
        price: slot.salePrice,
      };
    });
    setItemCounts(initial);
    setCashWithdrawn(activeMachine.cashBalance || 0);
    setIsSaved(false);
  }, [activeMachine]);

  // Calcolo dati riga per riga
  const rowData = useMemo(() => {
    if (!activeMachine) return [];

    return activeMachine.slots.map(slot => {
      const product = products.find(p => p.id === slot.productId);
      const state = itemCounts[slot.id] || { 
        counted: slot.currentStock, 
        added: Math.max(0, slot.capacity - slot.currentStock), 
        price: slot.salePrice 
      };

      const previousStock = slot.currentStock;
      const sold = Math.max(0, previousStock - state.counted);
      const newStock = Math.min(slot.capacity, state.counted + state.added);
      const revenue = sold * state.price;

      const fallbackCost = product ? product.unitCost : 0.50;
      const slotFifo = consumeSlotFifo(slot, sold, fallbackCost);
      const costOfSold = slotFifo.costOfSold;
      const profit = Math.max(0, revenue - costOfSold);
      const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

      const loadPlan = calculateFifoLoadPlan(slot.productId, state.added, purchases, fallbackCost);
      const loadCost = loadPlan.totalCost;

      const warehouseStock = product ? product.warehouseStock : 0;

      return {
        slotId: slot.id,
        slotLabel: slot.label || slot.id || 'Spirale',
        productId: slot.productId,
        productName: product?.name || 'Prodotto',
        category: product?.category || 'snack',
        previousStock,
        counted: state.counted,
        added: state.added,
        price: state.price,
        capacity: slot.capacity,
        sold,
        newStock,
        revenue,
        profit,
        marginPct,
        loadCost,
        warehouseStock,
      };
    });
  }, [activeMachine, products, itemCounts, purchases]);

  // Totali
  const totals = useMemo(() => {
    const totalSold = rowData.reduce((acc, r) => acc + r.sold, 0);
    const totalRevenue = rowData.reduce((acc, r) => acc + r.revenue, 0);
    const totalProfit = rowData.reduce((acc, r) => acc + r.profit, 0);
    const totalAdded = rowData.reduce((acc, r) => acc + r.added, 0);
    const totalLoadCost = rowData.reduce((acc, r) => acc + r.loadCost, 0);

    return {
      totalSold,
      totalRevenue,
      totalProfit,
      totalAdded,
      totalLoadCost,
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
    const clamped = Math.max(0, Math.min(slot.capacity, val));
    setItemCounts(prev => {
      const current = prev[slotId] || { counted: slot.currentStock, added: 0, price: slot.salePrice };
      const maxAdd = Math.max(0, slot.capacity - clamped);
      const newAdded = Math.min(current.added, maxAdd);
      return {
        ...prev,
        [slotId]: { ...current, counted: clamped, added: newAdded },
      };
    });
  };

  const setAdded = (slotId: string, val: number) => {
    const slot = activeMachine.slots.find(s => s.id === slotId);
    if (!slot) return;
    const current = itemCounts[slotId] || { counted: slot.currentStock, added: 0, price: slot.salePrice };
    const maxAdd = Math.max(0, slot.capacity - current.counted);
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
      activeMachine.slots.forEach(slot => {
        const current = next[slot.id] || { counted: slot.currentStock, added: 0, price: slot.salePrice };
        const missing = Math.max(0, slot.capacity - current.counted);
        next[slot.id] = { ...current, added: missing };
      });
      return next;
    });
  };

  const fillRowMax = (rowLetter: string) => {
    if (!activeMachine) return;
    setItemCounts(prev => {
      const next = { ...prev };
      activeMachine.slots.forEach(slot => {
        const letter = (slot.label || slot.id || '').charAt(0).toUpperCase();
        if (letter === rowLetter) {
          const current = next[slot.id] || { counted: slot.currentStock, added: 0, price: slot.salePrice };
          const missing = Math.max(0, slot.capacity - current.counted);
          next[slot.id] = { ...current, added: missing };
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
          added: 0,
          price: slot.salePrice,
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
      salePrice: r.price,
      unitCost: 0,
      revenue: r.revenue,
      cost: 0,
      profit: r.profit,
      addedStock: r.added,
      newStock: r.newStock,
      addedCost: r.loadCost,
      addedUnitCost: 0,
      marginPct: r.marginPct,
    }));

    recordRestock({
      machineId: activeMachine.id,
      machineName: activeMachine.name,
      machineCode: activeMachine.code,
      items,
      totalSold: totals.totalSold,
      totalRevenue: totals.totalRevenue,
      totalCost: totals.totalLoadCost,
      totalProfit: totals.totalProfit,
      cashCollected: typeof cashWithdrawn === 'number' ? cashWithdrawn : 0,
      operatorNotes: operatorNotes || 'Rifornimento rapido da smartphone',
    });

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
                    <span className="text-3xs text-stone-400 font-medium">{pct}%</span>
                    <span className="text-3xs font-mono font-semibold text-emerald-400">{formatEuro(m.cashBalance || 0)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-1 pt-1">
          <span className="text-3xs text-stone-400">
            {activeMachine.slots.length} spirali configurate
          </span>
          <button
            type="button"
            onClick={() => setIsEditSpiralsOpen(true)}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-3xs font-bold border border-stone-700 transition-colors cursor-pointer active:scale-95"
          >
            <Sliders className="w-3 h-3 text-amber-400" />
            <span>Configura Spirali a Mano</span>
          </button>
        </div>
      </div>

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
                  Conta quante bottiglie/snack trovi ancora nella spirale prima di toccarla. Inserendo questo numero, il sistema calcola in automatico <strong>quanti ne hai venduti</strong> e <strong>l&apos;incasso</strong>!
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
                  Indica quanti nuovi pezzi prendi dal magazzino/furgone e inserisci nella spirale. Questi pezzi verranno scalati in automatico dal magazzino e aggiunti al distributore.
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
            placeholder="Cerca spirale o prodotto (es. A1, Acqua, Caffè)..."
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
              <h4 className="text-sm font-bold text-white">Nessuna spirale configurata</h4>
              <p className="text-2xs text-stone-400 mt-1 max-w-xs mx-auto leading-relaxed">
                Tutti i dati e le capienze sono stati azzerati a zero. Puoi inserire a mano le spirali reali di questo distributore (codice, prodotto, capienza e prezzo).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditSpiralsOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-bold text-xs transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Aggiungi Spirali a Mano</span>
            </button>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 bg-stone-900/60 rounded-2xl border border-stone-800">
            Nessuna spirale trovata per la ricerca selezionata.
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
                    Ripiano {group.letter} • <span className="text-stone-400 font-normal">{group.rows.length} spirali</span>
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
                              <span>Capienza spirale: <strong className="text-stone-300">{row.capacity} pz</strong></span>
                              <span className="text-stone-600">•</span>
                              <span>In magazzino: <strong className="text-stone-300">{row.warehouseStock} pz</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-bold text-emerald-400 block">
                            {formatEuro(row.price)}
                          </span>
                          <span className="text-3xs text-stone-400">Prezzo vendita</span>
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

                              <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                max={row.capacity}
                                value={row.counted}
                                onChange={e => setCounted(row.slotId, parseInt(e.target.value) || 0)}
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

                              <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                max={row.capacity - row.counted}
                                value={row.added}
                                onChange={e => setAdded(row.slotId, parseInt(e.target.value) || 0)}
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

      {/* 4. SEZIONE CASSA & NOTE OPERATORE */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md space-y-3 mt-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-400" />
            Cassa &amp; Ritiro Monete
          </span>
          <span className="text-2xs font-mono text-stone-400">
            In cassa: {formatEuro(activeMachine?.cashBalance || 0)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              inputMode="decimal"
              step="0.50"
              value={cashWithdrawn}
              onChange={e => setCashWithdrawn(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">€</span>
          </div>

          <button
            type="button"
            onClick={() => setCashWithdrawn(activeMachine?.cashBalance || 0)}
            className="px-3 py-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold shrink-0 active:bg-amber-500 active:text-stone-950 cursor-pointer"
          >
            Preleva Tutto
          </button>
        </div>

        <input
          type="text"
          value={operatorNotes}
          onChange={e => setOperatorNotes(e.target.value)}
          placeholder="Note rifornimento (opzionale)..."
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

      {/* MODAL CONFERMA RIEPILOGO CARICO PRIMA DEL SALVATAGGIO */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div>
                <h3 className="text-sm font-black text-white">
                  Conferma Rifornimento
                </h3>
                <p className="text-2xs text-stone-400">
                  {activeMachine?.name || 'Distributore'} ({activeMachine?.code || ''})
                </p>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 bg-stone-950 p-3 rounded-2xl border border-stone-800 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-400">Articoli venduti:</span>
                <span className="font-mono font-bold text-white">{totals.totalSold} pz</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Incasso stimato:</span>
                <span className="font-mono font-bold text-amber-400">{formatEuro(totals.totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Utile netto stimato:</span>
                <span className="font-mono font-bold text-emerald-400">+{formatEuro(totals.totalProfit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Unità caricate da magazzino:</span>
                <span className="font-mono font-bold text-blue-400">+{totals.totalAdded} pz</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-stone-800">
                <span className="text-stone-400">Ritiro cassa contanti:</span>
                <span className="font-mono font-bold text-white">{formatEuro(typeof cashWithdrawn === 'number' ? cashWithdrawn : 0)}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-stone-800 text-stone-300 font-semibold text-xs cursor-pointer"
              >
                Modifica
              </button>
              <button
                type="button"
                onClick={handleSaveRestock}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-stone-950 font-black text-xs shadow-md cursor-pointer"
              >
                Conferma e Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICA SALVATAGGIO RIUSCITO */}
      {isSaved && (
        <div className="fixed top-16 left-4 right-4 z-50 max-w-sm mx-auto bg-emerald-600 text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center space-x-2">
            <Check className="w-5 h-5 shrink-0" />
            <span className="text-xs font-bold">Rifornimento registrato e magazzino aggiornato!</span>
          </div>
          <button
            onClick={() => setIsSaved(false)}
            className="text-white/80 hover:text-white text-xs font-bold ml-2"
          >
            OK
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
