import React, { useState, useMemo } from 'react';
import { 
  Wrench, 
  Plus, 
  Trash2, 
  Calendar, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  TrendingDown,
  Filter
} from 'lucide-react';
import { useVending } from '../context/VendingContext';
import { MaintenanceRecord, MaintenanceType } from '../types';
import { formatEuro, parseEuro, oggiLocale } from '../utils/vendingUtils';

export const MaintenanceManager: React.FC = () => {
  const { machines, maintenances, addMaintenance, deleteMaintenance } = useVending();

  // Stato per la modal di inserimento rapido
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState<string>(machines[0]?.id || 'mach-01');
  const [entryType, setEntryType] = useState<MaintenanceType>('manutenzione');
  
  // Campi form:
  // Se 'manutenzione': solo una nota
  // Se 'sostituzione': data e costo (+ nome del componente)
  const [note, setNote] = useState('');
  const [componentName, setComponentName] = useState('');
  const [cost, setCost] = useState('');
  const [date, setDate] = useState(() => oggiLocale());

  // Filtro visualizzazione storico
  const [filterMachineId, setFilterMachineId] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'manutenzione' | 'sostituzione'>('all');

  // Calcolo a parte: Somma di tutti i componenti sostituiti
  const replacedComponentsSummary = useMemo(() => {
    const replaced = maintenances.filter(m => m.type === 'sostituzione');
    const totalCost = replaced.reduce((sum, m) => sum + (m.cost || 0), 0);
    const totalCount = replaced.length;

    // Spaccato per distributore
    const byMachine = machines.map(m => {
      const machineReplaced = replaced.filter(r => r.machineId === m.id);
      const machineCost = machineReplaced.reduce((sum, r) => sum + (r.cost || 0), 0);
      return {
        machineId: m.id,
        code: m.code,
        name: m.name,
        count: machineReplaced.length,
        totalCost: machineCost,
        items: machineReplaced,
      };
    });

    return {
      totalCost,
      totalCount,
      byMachine,
      allReplaced: replaced,
    };
  }, [maintenances, machines]);

  // Lista interventi filtrata
  const filteredList = useMemo(() => {
    return maintenances.filter(item => {
      const matchMachine = filterMachineId === 'all' || item.machineId === filterMachineId;
      const matchType = filterType === 'all' || item.type === filterType;
      return matchMachine && matchType;
    });
  }, [maintenances, filterMachineId, filterType]);

  const handleOpenAdd = (machineId: string, initialType: MaintenanceType = 'manutenzione') => {
    setSelectedMachineId(machineId);
    setEntryType(initialType);
    setNote('');
    setComponentName('');
    setCost('');
    setDate(oggiLocale());
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const machine = machines.find(m => m.id === selectedMachineId);
    const machineName = machine ? machine.name : 'Distributore';

    if (entryType === 'manutenzione') {
      if (!note.trim()) {
        alert('Inserisci la nota della manutenzione.');
        return;
      }
      addMaintenance({
        machineId: selectedMachineId,
        machineName,
        type: 'manutenzione',
        date: date || oggiLocale(),
        note: note.trim(),
      });
    } else {
      // Sostituzione componente: richiede data e costo
      const parsedCost = parseEuro(cost);
      if (isNaN(parsedCost) || parsedCost < 0) {
        alert('Inserisci un costo valido per il componente sostituito.');
        return;
      }
      if (!date) {
        alert('Inserisci la data della sostituzione.');
        return;
      }
      addMaintenance({
        machineId: selectedMachineId,
        machineName,
        type: 'sostituzione',
        date,
        componentName: componentName.trim() || 'Componente generico',
        cost: parsedCost,
        note: note.trim() || undefined,
      });
    }

    setIsModalOpen(false);
  };

  const getMachineIcon = (id: string, type?: string) => {
    if (type === 'caffe_calde' || id === 'mach-03') return '☕';
    if (id === 'mach-02') return '🍪';
    return '🥤';
  };

  return (
    <div className="space-y-6">
      {/* Header Casella Manutenzioni */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 shadow-xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>Manutenzioni &amp; Sostituzione Componenti</span>
                </h1>
                <p className="text-xs text-stone-400 mt-0.5">
                  Gestione indipendente per i 3 distributori automatici del punto vendita M&amp;S
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-quick-new-maint"
              onClick={() => handleOpenAdd(machines[0]?.id || 'mach-01', 'manutenzione')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-extrabold text-xs shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registra Intervento</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CALCOLO A PARTE: SOMMA TUTTI I COMPONENTI SOSTITUITI */}
        {/* ======================================================== */}
        <div className="mt-6 pt-6 border-t border-stone-800/80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Calcolo Totale Componenti Sostituiti
            </span>
            <span className="text-2xs text-stone-400">
              Conteggio indipendente ricambi
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Box Totale Globale Sostituzioni */}
            <div className="bg-stone-950/80 border-2 border-emerald-500/40 rounded-2xl p-4 shadow-inner">
              <span className="text-2xs font-semibold text-stone-400 block uppercase">
                Totale Spesa Ricambi
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-400">
                  {formatEuro(replacedComponentsSummary.totalCost)}
                </span>
              </div>
              <span className="text-2xs text-stone-400 mt-1 block">
                {replacedComponentsSummary.totalCount} {replacedComponentsSummary.totalCount === 1 ? 'componente sostituito' : 'componenti sostituiti'}
              </span>
            </div>

            {/* Dettaglio per i 3 distributori */}
            {replacedComponentsSummary.byMachine.map((bm) => (
              <div 
                key={bm.machineId}
                className="bg-stone-950/50 border border-stone-800/90 rounded-2xl p-4 flex flex-col justify-between hover:border-stone-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                      {bm.code}
                    </span>
                    <span className="text-lg leading-none">{getMachineIcon(bm.machineId)}</span>
                  </div>
                  <h4 className="text-xs font-bold text-stone-200 mt-2 line-clamp-1">
                    {bm.name}
                  </h4>
                </div>
                <div className="mt-2 pt-2 border-t border-stone-800/60 flex items-baseline justify-between">
                  <span className="text-2xs text-stone-400">Ricambi:</span>
                  <span className="text-sm font-mono font-bold text-stone-100">
                    {formatEuro(bm.totalCost)}
                    <span className="text-2xs text-stone-500 ml-1">({bm.count})</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* I 3 DISTRIBUTORI: CASSETTE INDIPENDENTI CON AZIONI */}
      {/* ======================================================== */}
      <div>
        <h2 className="text-sm font-bold text-stone-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          I 3 Distributori del Punto Vendita
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {machines.map(m => {
            const machineRecords = maintenances.filter(rec => rec.machineId === m.id);
            const maintenanceOnlyCount = machineRecords.filter(r => r.type === 'manutenzione').length;
            const replacedCount = machineRecords.filter(r => r.type === 'sostituzione').length;
            const replacedCost = machineRecords.filter(r => r.type === 'sostituzione').reduce((sum, r) => sum + (r.cost || 0), 0);
            const icon = getMachineIcon(m.id, m.type);

            return (
              <div 
                key={m.id} 
                className="bg-stone-900/85 border border-stone-800 hover:border-stone-700/90 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all"
              >
                <div>
                  {/* Intestazione Distributore */}
                  <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-2xl leading-none">{icon}</span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 text-2xs font-mono font-bold bg-stone-800 text-amber-400 rounded border border-stone-700">
                            {m.code}
                          </span>
                          <span className="text-2xs text-stone-400 font-medium">{m.zone}</span>
                        </div>
                        <h3 className="text-sm font-black text-white mt-1">
                          {m.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Statistiche Indipendenti Distributore */}
                  <div className="grid grid-cols-2 gap-2 my-4">
                    <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800/80">
                      <span className="text-2xs text-stone-400 block font-medium">Manutenzioni</span>
                      <span className="text-base font-mono font-bold text-amber-300">
                        {maintenanceOnlyCount}
                      </span>
                    </div>
                    <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800/80">
                      <span className="text-2xs text-stone-400 block font-medium">Spesa Componenti</span>
                      <span className="text-base font-mono font-bold text-emerald-400">
                        {formatEuro(replacedCost)}
                      </span>
                      <span className="text-2xs text-stone-500 block">
                        {replacedCount} sostituzioni
                      </span>
                    </div>
                  </div>

                  {/* Ultimi interventi recenti per questo distributore */}
                  <div className="space-y-2 mb-4">
                    <span className="text-2xs font-semibold text-stone-400 uppercase tracking-wider block">
                      Ultimi Interventi:
                    </span>
                    {machineRecords.length === 0 ? (
                      <p className="text-xs text-stone-500 italic py-2">
                        Nessun intervento registrato finora.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {machineRecords.slice(0, 3).map(rec => (
                          <div 
                            key={rec.id}
                            className="text-xs p-2 rounded-lg bg-stone-950/40 border border-stone-800/70 flex items-start justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                {rec.type === 'manutenzione' ? (
                                  <span className="px-1.5 py-0.5 rounded text-2xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Manutenzione
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-2xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    Sostituzione: {formatEuro(rec.cost || 0)}
                                  </span>
                                )}
                                <span className="text-2xs text-stone-400 font-mono">
                                  {rec.date}
                                </span>
                              </div>
                              <p className="text-stone-300 text-2xs mt-1 line-clamp-2">
                                {rec.type === 'manutenzione' ? rec.note : (
                                  <span>
                                    <strong className="text-white">{rec.componentName}</strong>
                                    {rec.note && ` — ${rec.note}`}
                                  </span>
                                )}
                              </p>
                            </div>

                            <button
                              onClick={() => deleteMaintenance(rec.id)}
                              className="text-stone-500 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer shrink-0"
                              title="Elimina record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Due pulsanti di aggiunta indipendenti: Manutenzione (solo nota) o Sostituzione (data e costo) */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-stone-800">
                  <button
                    onClick={() => handleOpenAdd(m.id, 'manutenzione')}
                    className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-bold border border-amber-500/30 transition-colors cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>+ Manutenzione</span>
                  </button>

                  <button
                    onClick={() => handleOpenAdd(m.id, 'sostituzione')}
                    className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Sostituzione</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* STORICO DETTAGLIATO DEGLI INTERVENTI CON FILTRI */}
      {/* ======================================================== */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Registro Completo Interventi
            </h3>
            <p className="text-2xs text-stone-400 mt-0.5">
              Elenco cronologico di tutte le manutenzioni e ricambi installati
            </p>
          </div>

          {/* Filtri */}
          <div className="flex items-center gap-2">
            <select
              value={filterMachineId}
              onChange={e => setFilterMachineId(e.target.value)}
              className="bg-stone-950 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Tutti i Distributori</option>
              {machines.map(m => (
                <option key={m.id} value={m.id}>
                  {m.code} - {m.name}
                </option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
              className="bg-stone-950 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Tutti i tipi</option>
              <option value="manutenzione">Solo Manutenzioni</option>
              <option value="sostituzione">Solo Sostituzioni Componente</option>
            </select>
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="text-center py-12 text-stone-500 text-xs">
            Nessun intervento corrisponde ai criteri selezionati.
          </div>
        ) : (
          <div className="divide-y divide-stone-800/80">
            {filteredList.map(item => {
              const icon = getMachineIcon(item.machineId);
              return (
                <div key={item.id} className="py-3.5 flex items-start justify-between gap-4">
                  <div className="flex items-start space-x-3 min-w-0">
                    <span className="text-xl shrink-0 mt-0.5">{icon}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        {item.type === 'manutenzione' ? (
                          <span className="px-2 py-0.5 rounded text-2xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            MANUTENZIONE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-2xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            SOSTITUZIONE COMPONENTE
                          </span>
                        )}
                        <span className="text-xs font-bold text-stone-200">
                          {item.machineName}
                        </span>
                        <span className="text-2xs text-stone-400 font-mono">
                          • {item.date}
                        </span>
                      </div>

                      {/* Dettaglio contenuto */}
                      {item.type === 'manutenzione' ? (
                        <p className="text-xs text-stone-300 mt-1.5 bg-stone-950/40 p-2.5 rounded-xl border border-stone-800/80">
                          <span className="font-semibold text-stone-400 mr-1.5">Nota:</span>
                          {item.note}
                        </p>
                      ) : (
                        <div className="mt-1.5 bg-stone-950/40 p-2.5 rounded-xl border border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-white text-xs">
                              {item.componentName || 'Componente'}
                            </span>
                            {item.note && (
                              <p className="text-2xs text-stone-400 mt-0.5">{item.note}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-2xs text-stone-400 block">Costo Ricambio</span>
                            <span className="text-sm font-mono font-black text-emerald-400">
                              {formatEuro(item.cost || 0)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (window.confirm('Eliminare questo intervento?')) {
                        deleteMaintenance(item.id);
                      }
                    }}
                    className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Elimina"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL AGGIUNGI MANUTENZIONE / SOSTITUZIONE COMPONENTE */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/30">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Registra Intervento
                  </h3>
                  <p className="text-2xs text-stone-400">
                    Seleziona il distributore e la tipologia di intervento
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* 1. Selezione del Distributore */}
              <div>
                <label className="block text-2xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                  Distributore Automatico
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {machines.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMachineId(m.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedMachineId === m.id
                          ? 'bg-amber-500/10 border-amber-500 text-white font-bold'
                          : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs">{getMachineIcon(m.id)}</span>
                        <span className="text-2xs font-mono font-bold">{m.code}</span>
                      </div>
                      <p className="text-2xs mt-1 truncate">
                        {m.name.replace(/Distributore \d+ - /, '')}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Scelta Tipo: Manutenzione (solo nota) VS Sostituzione Componente (data e costo) */}
              <div>
                <label className="block text-2xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                  Tipo Intervento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEntryType('manutenzione')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      entryType === 'manutenzione'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-extrabold shadow-sm'
                        : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <Wrench className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-xs block">Manutenzione</span>
                    <span className="text-2xs opacity-75 font-normal">Solo nota descrittiva</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEntryType('sostituzione')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      entryType === 'sostituzione'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-extrabold shadow-sm'
                        : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-xs block">Sostituzione Componente</span>
                    <span className="text-2xs opacity-75 font-normal">Richiede data e costo</span>
                  </button>
                </div>
              </div>

              {/* Se MANUTENZIONE: SOLO UNA NOTA */}
              {entryType === 'manutenzione' ? (
                <div className="space-y-3 bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-amber-300">
                      Nota di Manutenzione
                    </label>
                    <span className="text-2xs text-stone-500">
                      Data automatica: {date}
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Es. Pulizia gruppo erogatore caffè, disincrostazione anticalcare, pulizia ventole refrigerazione e lubrificazione guide..."
                    className="w-full bg-stone-900 border border-stone-700 rounded-xl p-3 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-400"
                    required
                  />
                  <p className="text-2xs text-stone-400 italic">
                    * Per la manutenzione ordinaria è richiesta unicamente la descrizione/nota delle operazioni svolte.
                  </p>
                </div>
              ) : (
                /* Se SOSTITUZIONE COMPONENTE: DATA E COSTO */
                <div className="space-y-3 bg-stone-950/60 p-4 rounded-2xl border border-emerald-500/30">
                  <div>
                    <label className="block text-xs font-bold text-emerald-300 mb-1">
                      Nome Componente Sostituito *
                    </label>
                    <input
                      type="text"
                      value={componentName}
                      onChange={e => setComponentName(e.target.value)}
                      placeholder="Es. Gettoniera NRI G-13, Motore spirale 24V, Termostato, Pompa Ulka..."
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl p-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-400"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* DATA OBBLIGATORIA */}
                    <div>
                      <label className="block text-xs font-bold text-emerald-300 mb-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        Data Sostituzione *
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-xl p-2.5 text-xs text-stone-100 focus:outline-none focus:border-emerald-400"
                        required
                      />
                    </div>

                    {/* COSTO OBBLIGATORIO */}
                    <div>
                      <label className="block text-xs font-bold text-emerald-300 mb-1 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        Costo Componente (€) *
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={cost}
                        onChange={e => setCost(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-stone-900 border border-stone-700 rounded-xl p-2.5 text-xs text-stone-100 font-mono font-bold focus:outline-none focus:border-emerald-400"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-2xs font-semibold text-stone-400 mb-1">
                      Note opzionali sul ricambio (fornitore, garanzia, matricola)
                    </label>
                    <input
                      type="text"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Opzionale: es. Pezzo originale ricambio fornito con 12 mesi garanzia"
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl p-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              )}

              {/* Bottoni di conferma */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 text-xs font-extrabold shadow-md cursor-pointer"
                >
                  Salva Intervento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
