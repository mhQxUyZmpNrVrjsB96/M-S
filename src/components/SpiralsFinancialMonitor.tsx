import React, { useState, useMemo } from 'react';
import { 
  Sliders, 
  Layers, 
  Search, 
  Filter, 
  TrendingUp, 
  Package, 
  Calendar, 
  Clock, 
  Archive, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Tag, 
  Store, 
  ArrowUpRight,
  ChevronRight,
  Info
} from 'lucide-react';
import { useVending } from '../context/VendingContext';
import { formatEuro, formatPercent, CATEGORY_META } from '../utils/vendingUtils';
import { TrackedSpiralRecord, ProductCategory } from '../types';

export const SpiralsFinancialMonitor: React.FC = () => {
  const { machines, trackedSpirals, products } = useVending();

  // Distributore selezionato per il controllo
  const [selectedMachineId, setSelectedMachineId] = useState<string>('all');
  // Filtro stato spirale
  const [statusFilter, setStatusFilter] = useState<'all' | 'attiva' | 'chiusa'>('all');
  // Ricerca
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Macchina attiva se selezionata
  const activeMachine = useMemo(() => {
    if (selectedMachineId === 'all') return null;
    return machines.find(m => m.id === selectedMachineId) || null;
  }, [selectedMachineId, machines]);

  const isCoffeeMachine = activeMachine?.type === 'caffe_calde';
  const unitTerm = isCoffeeMachine ? 'Cassetto' : 'Spirale';
  const unitTermPlural = isCoffeeMachine ? 'Cassetti' : 'Spirali';
  const unitTermLower = isCoffeeMachine ? 'cassetto' : 'spirale';
  const unitTermPluralLower = isCoffeeMachine ? 'cassetti' : 'spirali';

  // Filtro spirali tracciate
  const filteredSpirals = useMemo(() => {
    return trackedSpirals.filter(record => {
      if (selectedMachineId !== 'all' && record.machineId !== selectedMachineId) {
        return false;
      }
      if (statusFilter !== 'all' && record.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchLabel = record.label.toLowerCase().includes(query);
        const matchProduct = record.productName.toLowerCase().includes(query);
        const matchMachine = record.machineName.toLowerCase().includes(query) || record.machineCode.toLowerCase().includes(query);
        if (!matchLabel && !matchProduct && !matchMachine) return false;
      }
      return true;
    });
  }, [trackedSpirals, selectedMachineId, statusFilter, searchQuery]);

  // Calcolo dato complessivo (della macchinetta selezionata o di tutte)
  const aggregateMachineStats = useMemo(() => {
    const relevantSpirals = trackedSpirals.filter(s => selectedMachineId === 'all' || s.machineId === selectedMachineId);
    const activeSpirals = relevantSpirals.filter(s => s.status === 'attiva');
    const closedSpirals = relevantSpirals.filter(s => s.status === 'chiusa');

    const totalSold = relevantSpirals.reduce((sum, s) => sum + (s.totalUnitsSold || 0), 0);
    const totalRevenue = relevantSpirals.reduce((sum, s) => sum + (s.totalRevenue || 0), 0);
    const totalCost = relevantSpirals.reduce((sum, s) => sum + (s.totalCost || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const marginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const currentCapacity = activeMachine 
      ? (activeMachine.slots || []).reduce((sum, sl) => sum + sl.capacity, 0)
      : machines.reduce((sum, m) => sum + (m.slots || []).reduce((sSum, sl) => sSum + sl.capacity, 0), 0);

    const currentStock = activeMachine 
      ? (activeMachine.slots || []).reduce((sum, sl) => sum + sl.currentStock, 0)
      : machines.reduce((sum, m) => sum + (m.slots || []).reduce((sSum, sl) => sSum + sl.currentStock, 0), 0);

    return {
      activeCount: activeSpirals.length,
      closedCount: closedSpirals.length,
      totalCount: relevantSpirals.length,
      totalSold,
      totalRevenue,
      totalCost,
      totalProfit,
      marginPct,
      currentCapacity,
      currentStock,
    };
  }, [trackedSpirals, selectedMachineId, activeMachine, machines]);

  return (
    <div className="space-y-6">
      {/* Header Sezione */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-semibold mb-2">
              <Sliders className="w-3.5 h-3.5" />
              <span>Controllo Singoli {unitTermPlural} &amp; Storico Finanziario</span>
            </div>
            <h2 className="text-xl font-bold text-stone-900">
              Sottocartella Distributori: Monitoraggio {unitTerm} per {unitTerm}
            </h2>
            <p className="text-xs text-stone-500 mt-1 max-w-2xl">
              Rilevamento automatico di ogni {unitTermLower} aggiunta/modificata/eliminata. I {unitTermPluralLower} dismessi o eliminati vengono conservati nello storico in colore diverso, preservando costi, incassi, pezzi venduti e periodo di attività.
            </p>
          </div>

          {/* Selettore Distributore Principale */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-500 whitespace-nowrap">Distributore:</span>
            <select
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
              className="px-3.5 py-2 text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl text-stone-800 focus:bg-white focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="all">🏢 Tutti i Distributori (Vista Globale)</option>
              {machines.map(m => {
                const mTerm = m.type === 'caffe_calde' ? 'cassetti' : 'spirali';
                return (
                  <option key={m.id} value={m.id}>
                    {m.code} - {m.name} ({m.slots?.length || 0} {mTerm})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Pulsanti Rapidi Selezione Distributori */}
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-stone-100">
          <button
            type="button"
            onClick={() => setSelectedMachineId('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedMachineId === 'all'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            Tutti ({machines.reduce((acc, m) => acc + (m.slots?.length || 0), 0)} attive)
          </button>
          {machines.map(m => {
            const isSelected = selectedMachineId === m.id;
            const machineTracked = trackedSpirals.filter(s => s.machineId === m.id);
            const activeSlots = m.slots?.length || 0;
            const closedSlots = machineTracked.filter(s => s.status === 'chiusa').length;
            const mTermSingular = m.type === 'caffe_calde' ? 'cassetto' : 'spirale';

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMachineId(m.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                <span>{m.code}</span>
                <span className="opacity-80 font-normal">({activeSlots} {m.type === 'caffe_calde' ? 'cassetti' : 'spirali'}{closedSlots > 0 ? ` + ${closedSlots} storici` : ''})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* DATO COMPLESSIVO DELLA MACCHINETTA (o di tutte) */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-purple-950 text-white rounded-2xl p-6 border border-stone-800 shadow-lg">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xs font-mono uppercase tracking-widest text-purple-300 block">
                Dato Complessivo Finanziario
              </span>
              <h3 className="text-lg font-bold text-white">
                {activeMachine ? `${activeMachine.name} (${activeMachine.code})` : 'Tutti i Distributori Negozio H24'}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
              {aggregateMachineStats.activeCount} {unitTermPlural} {isCoffeeMachine ? 'Attivi' : 'Attive'}
            </span>
            {aggregateMachineStats.closedCount > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                {aggregateMachineStats.closedCount} {unitTermPlural} {isCoffeeMachine ? 'Storici Chiusi' : 'Storiche Chiuse'}
              </span>
            )}
          </div>
        </div>

        {/* Griglia KPI Aggregati Macchinetta */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-stone-900/60 p-3.5 rounded-xl border border-stone-800">
            <span className="text-3xs text-stone-400 block uppercase font-medium">Pezzi Venduti Totali</span>
            <span className="text-xl font-bold font-mono text-white mt-1 block">
              {aggregateMachineStats.totalSold} <span className="text-xs font-normal text-stone-400">pz</span>
            </span>
            <span className="text-3xs text-stone-400 mt-1 block">Da tutte le spirali</span>
          </div>

          <div className="bg-stone-900/60 p-3.5 rounded-xl border border-stone-800">
            <span className="text-3xs text-stone-400 block uppercase font-medium">Fatturato Complessivo (Ivato)</span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
              {formatEuro(aggregateMachineStats.totalRevenue)}
            </span>
            <span className="text-3xs text-emerald-300/80 mt-1 block">Ricavi lordi registrati</span>
          </div>

          <div className="bg-stone-900/60 p-3.5 rounded-xl border border-stone-800">
            <span className="text-3xs text-stone-400 block uppercase font-medium">Costi Merci Vendute (Ivato)</span>
            <span className="text-xl font-bold font-mono text-stone-300 mt-1 block">
              {formatEuro(aggregateMachineStats.totalCost)}
            </span>
            <span className="text-3xs text-stone-400 mt-1 block">Base FIFO su lotti</span>
          </div>

          <div className="bg-stone-900/60 p-3.5 rounded-xl border border-stone-800">
            <span className="text-3xs text-stone-400 block uppercase font-medium">Guadagno Ivato</span>
            <span className={`text-xl font-bold font-mono mt-1 block ${aggregateMachineStats.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatEuro(aggregateMachineStats.totalProfit)}
            </span>
            <span className="text-3xs text-stone-400 mt-1 block">Ricavi - Merci</span>
          </div>

          <div className="bg-stone-900/60 p-3.5 rounded-xl border border-stone-800">
            <span className="text-3xs text-stone-400 block uppercase font-medium">Margine % Operativo</span>
            <span className="text-xl font-bold font-mono text-purple-300 mt-1 block">
              {formatPercent(aggregateMachineStats.marginPct)}
            </span>
            <span className="text-3xs text-purple-400/80 mt-1 block">Redditività media</span>
          </div>

          <div className="bg-stone-900/60 p-3.5 rounded-xl border border-stone-800">
            <span className="text-3xs text-stone-400 block uppercase font-medium">Scorta / Capacità</span>
            <span className="text-xl font-bold font-mono text-amber-300 mt-1 block">
              {aggregateMachineStats.currentStock} <span className="text-xs font-normal text-stone-400">/ {aggregateMachineStats.currentCapacity}</span>
            </span>
            <span className="text-3xs text-stone-400 mt-1 block">
              {aggregateMachineStats.currentCapacity > 0 ? Math.round((aggregateMachineStats.currentStock / aggregateMachineStats.currentCapacity) * 100) : 0}% riempimento
            </span>
          </div>
        </div>
      </div>

      {/* Barra Filtri e Ricerca Spirali */}
      <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Ricerca */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            placeholder="Cerca per codice spirale (A1, B2) o prodotto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:bg-white focus:outline-hidden"
          />
        </div>

        {/* Filtro Stato */}
        <div className="flex items-center space-x-1.5 bg-stone-100 p-1 rounded-lg text-xs font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              statusFilter === 'all' ? 'bg-white text-stone-900 font-bold shadow-2xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Tutte ({trackedSpirals.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('attiva')}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              statusFilter === 'attiva' ? 'bg-white text-emerald-700 font-bold shadow-2xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Solo Attive ({trackedSpirals.filter(s => s.status === 'attiva').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('chiusa')}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              statusFilter === 'chiusa' ? 'bg-white text-amber-700 font-bold shadow-2xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Solo Chiuse ({trackedSpirals.filter(s => s.status === 'chiusa').length})
          </button>
        </div>
      </div>

      {/* LISTA & TABELLA DELLE SINGOLE SPIRALI */}
      {filteredSpirals.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-stone-200 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
            <Sliders className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-stone-800">Nessuna spirale trovata</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
            {trackedSpirals.length === 0 
              ? 'Le spirali verranno rilevate automaticamente quando ne configuri una nella sezione Distributori.'
              : 'Nessuna spirale corrisponde ai filtri di ricerca impostati.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSpirals.map((spiral) => {
            const isClosed = spiral.status === 'chiusa';
            const catMeta = spiral.productCategory ? CATEGORY_META[spiral.productCategory] : null;
            const margin = spiral.totalRevenue > 0 ? ((spiral.totalProfit / spiral.totalRevenue) * 100) : 0;
            const machineOfSpiral = machines.find(m => m.id === spiral.machineId);
            const isSlotCoffee = machineOfSpiral?.type === 'caffe_calde' || spiral.machineType === 'caffe_calde';
            const slotItemTerm = isSlotCoffee ? 'Cassetto' : 'Spirale';

            // Formattazione periodo di attività
            const startDateStr = spiral.startDate 
              ? new Date(spiral.startDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : 'Inizio';
            const endDateStr = spiral.closedDate 
              ? new Date(spiral.closedDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : 'Attiva in linea';

            return (
              <div 
                key={spiral.id}
                className={`rounded-2xl border transition-all ${
                  isClosed
                    ? 'bg-stone-100/90 border-amber-300/80 shadow-xs' // Colore diverso e ben evidenziato per le chiuse
                    : 'bg-white border-stone-200 hover:border-purple-300 shadow-2xs'
                }`}
              >
                <div className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Info Principale Spirale & Prodotto */}
                    <div className="flex items-start space-x-3.5">
                      {/* Badge Codice Spirale */}
                      <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-mono font-bold shrink-0 border ${
                        isClosed 
                          ? 'bg-stone-200 text-stone-600 border-stone-300'
                          : 'bg-purple-50 text-purple-800 border-purple-200'
                      }`}>
                        <span className="text-xs text-stone-400 font-sans font-medium uppercase text-3xs">{slotItemTerm}</span>
                        <span className="text-base font-extrabold">{spiral.label}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-stone-900">
                            {spiral.productName}
                          </h4>

                          {/* Badge STATO: Attiva vs Chiusa in colore diverso */}
                          {isClosed ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <Archive className="w-3 h-3 text-amber-700" />
                              <span>CHIUSA / DISMESSA</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>ATTIVA</span>
                            </span>
                          )}

                          {catMeta && (
                            <span className={`text-3xs px-2 py-0.5 rounded-full font-semibold border ${catMeta.bg} ${catMeta.color} ${catMeta.border}`}>
                              {catMeta.label}
                            </span>
                          )}

                          <span className="text-2xs font-mono font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                            {spiral.machineCode} • {spiral.machineName}
                          </span>
                        </div>

                        {/* Periodo di Attività Richiesto */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 pt-1">
                          <div className="inline-flex items-center space-x-1.5 text-stone-600">
                            <Calendar className="w-3.5 h-3.5 text-purple-600" />
                            <span>
                              <strong className="text-stone-700">Periodo di attività:</strong> {startDateStr} ➔ <span className={isClosed ? 'font-bold text-amber-800' : 'text-emerald-700 font-semibold'}>{endDateStr}</span>
                            </span>
                          </div>

                          {spiral.currentSalePrice !== undefined && spiral.currentSalePrice > 0 && (
                            <div className="inline-flex items-center space-x-1 text-stone-600">
                              <Tag className="w-3.5 h-3.5 text-stone-400" />
                              <span>Prezzo vendita (ivato): <strong>{formatEuro(spiral.currentSalePrice)}</strong></span>
                            </div>
                          )}

                          {!isClosed && spiral.currentCapacity !== undefined && (
                            <div className="inline-flex items-center space-x-1 text-stone-600">
                              <Package className="w-3.5 h-3.5 text-stone-400" />
                              <span>Scorta attuale: <strong>{spiral.currentStock} / {spiral.currentCapacity} pz</strong></span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Dati Finanziari Richiesti per ogni singola spirale: costi, guadagni, pezzi venduti */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-stone-200">
                      {/* Pezzi Venduti Totali */}
                      <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/80 min-w-[95px]">
                        <span className="text-3xs text-stone-400 uppercase font-semibold block">Pezzi Venduti</span>
                        <span className="text-sm font-bold font-mono text-stone-800 block mt-0.5">
                          {spiral.totalUnitsSold} <span className="text-3xs font-normal text-stone-400">pz</span>
                        </span>
                      </div>

                      {/* Fatturato / Incasso */}
                      <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/80 min-w-[95px]">
                        <span className="text-3xs text-stone-400 uppercase font-semibold block">Incasso Tot.</span>
                        <span className="text-sm font-bold font-mono text-stone-900 block mt-0.5">
                          {formatEuro(spiral.totalRevenue)}
                        </span>
                      </div>

                      {/* Costi Merci */}
                      <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/80 min-w-[95px]">
                        <span className="text-3xs text-stone-400 uppercase font-semibold block">Costi Merci</span>
                        <span className="text-sm font-bold font-mono text-stone-600 block mt-0.5">
                          {formatEuro(spiral.totalCost)}
                        </span>
                      </div>

                      {/* Guadagno Netto & Margine */}
                      <div className={`p-2.5 rounded-xl border min-w-[110px] ${
                        spiral.totalProfit >= 0 
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                          : 'bg-rose-50/80 border-rose-200 text-rose-900'
                      }`}>
                        <span className="text-3xs uppercase font-semibold block opacity-80">Guadagno Netto</span>
                        <div className="flex items-baseline space-x-1.5 mt-0.5">
                          <span className="text-sm font-black font-mono">
                            {formatEuro(spiral.totalProfit)}
                          </span>
                          <span className="text-3xs font-bold opacity-80">
                            {formatPercent(margin)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
