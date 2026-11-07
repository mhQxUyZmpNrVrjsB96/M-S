import React, { useState, useMemo } from 'react';
import { 
  Navigation, 
  MapPin, 
  Clock, 
  Truck, 
  CheckCircle2, 
  AlertTriangle, 
  PackageCheck, 
  ArrowRight, 
  RotateCw, 
  Printer, 
  ListChecks,
  ExternalLink,
  Layers,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useVending } from '../context/VendingContext';
import { 
  buildOptimizedRoute, 
  formatEuro, 
  getMachineOverallStockPercent, 
  getMachineCriticalSlotsCount,
  CATEGORY_META 
} from '../utils/vendingUtils';
import { WAREHOUSE_DEPOT } from '../data/initialData';

export const RoutePlanner: React.FC = () => {
  const { machines, products, openRestockModal } = useVending();

  const [filterCriticalOnly, setFilterCriticalOnly] = useState(true);
  const [completedStopIds, setCompletedStopIds] = useState<Record<string, boolean>>({});
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  // Calcola il percorso ottimizzato
  const route = useMemo(() => {
    return buildOptimizedRoute(machines, products, filterCriticalOnly);
  }, [machines, products, filterCriticalOnly]);

  const toggleStopCompleted = (machineId: string) => {
    setCompletedStopIds(prev => ({
      ...prev,
      [machineId]: !prev[machineId],
    }));
  };

  const completedCount = useMemo(() => {
    return route.stops.filter(s => completedStopIds[s.machineId]).length;
  }, [route, completedStopIds]);

  const progressPercent = route.stops.length > 0 ? Math.round((completedCount / route.stops.length) * 100) : 0;

  // Stampa o copia la lista di prelievo per il furgone
  const handlePrintOrCopyPickingList = () => {
    const lines = [
      `LISTA PRELIEVO FURGONE - ${route.name.toUpperCase()}`,
      `Data: ${route.date}`,
      `Tappe totali: ${route.totalStops} distributori | Distanza totale: ${route.totalDistanceKm} km`,
      '-------------------------------------------------------',
      'PRODOTTI DA CARICARE A BORDO:',
      ...route.pickingList.map(item => `- [ ] ${item.quantityToPick} ${item.unit} | ${item.productName}`),
      '-------------------------------------------------------',
      'ORDINE DELLE TAPPE:',
      ...route.stops.map((s, idx) => `${idx + 1}. [${s.machine.code}] ${s.machine.name} - ${s.machine.address}`),
    ];

    const text = lines.join('\n');
    navigator.clipboard.writeText(text);
    alert('Lista di prelievo furgone copiata negli appunti! Pronta per WhatsApp o stampa.');
  };

  return (
    <div className="space-y-6">
      {/* Route Control & KPI Header */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Navigation className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-stone-900">
                Percorsi di Rifornimento Ottimizzati
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Partenza e rientro al {WAREHOUSE_DEPOT.name} ({WAREHOUSE_DEPOT.address})
            </p>
          </div>

          {/* Mode Switcher & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg border border-stone-200 bg-stone-100 p-1 text-xs">
              <button
                id="btn-route-critical"
                onClick={() => setFilterCriticalOnly(true)}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  filterCriticalOnly
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Solo Macchine Critiche
              </button>
              <button
                id="btn-route-all"
                onClick={() => setFilterCriticalOnly(false)}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  !filterCriticalOnly
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Tutti i Distributori
              </button>
            </div>

            <button
              id="btn-print-picking-list"
              onClick={handlePrintOrCopyPickingList}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Copia / Stampa Picking List</span>
            </button>
          </div>
        </div>

        {/* Route Highlights Bar */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-stone-100 text-sm">
          <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/60">
            <span className="text-2xs text-stone-400 uppercase font-semibold block">Tappe Previste</span>
            <span className="text-xl font-bold text-stone-900">{route.totalStops} fermate</span>
          </div>

          <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/60">
            <span className="text-2xs text-stone-400 uppercase font-semibold block">Chilometraggio Giro</span>
            <span className="text-xl font-bold text-indigo-600">{route.totalDistanceKm} km</span>
          </div>

          <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/60">
            <span className="text-2xs text-stone-400 uppercase font-semibold block">Tempo Stimato</span>
            <span className="text-xl font-bold text-stone-900">{route.totalEstMinutes} min</span>
            <span className="text-2xs text-stone-500 block">incl. 12 min sosta/macchina</span>
          </div>

          <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/60">
            <span className="text-2xs text-stone-400 uppercase font-semibold block">Avanzamento Giro</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-bold text-emerald-600">{completedCount}/{route.totalStops}</span>
              <span className="text-xs text-stone-500 font-medium">({progressPercent}%)</span>
            </div>
            <div className="w-full h-1.5 bg-stone-200 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Map & Waypoint sequence (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Interactive Visual Map */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-stone-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Mappa del Percorso & Waypoint Urbani
                </span>
              </div>
              <span className="text-2xs text-stone-400">Clicca su un segnaposto per evidenziare la tappa</span>
            </div>

            <div className="p-4 bg-stone-900/5 relative select-none">
              {/* SVG Vector Map Canvas */}
              <div className="w-full aspect-[16/10] bg-stone-900 rounded-xl relative overflow-hidden shadow-inner border border-stone-800">
                {/* Subtle map road grid pattern */}
                <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="city-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#64748b" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#city-grid)" />
                  {/* Decorative city arterial roads */}
                  <line x1="0%" y1="40%" x2="100%" y2="50%" stroke="#94a3b8" strokeWidth="2.5" />
                  <line x1="30%" y1="0%" x2="35%" y2="100%" stroke="#94a3b8" strokeWidth="2.5" />
                  <line x1="65%" y1="0%" x2="70%" y2="100%" stroke="#94a3b8" strokeWidth="2" />
                  <line x1="0%" y1="75%" x2="100%" y2="70%" stroke="#94a3b8" strokeWidth="2" />
                </svg>

                {/* Connecting Route Trajectory Polyline */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {/* Lines between consecutive stops */}
                  <polyline
                    points={[
                      `${WAREHOUSE_DEPOT.coordinates.x}%,${WAREHOUSE_DEPOT.coordinates.y}%`,
                      ...route.stops.map(s => `${s.machine.coordinates.x}%,${s.machine.coordinates.y}%`),
                      `${WAREHOUSE_DEPOT.coordinates.x}%,${WAREHOUSE_DEPOT.coordinates.y}%`,
                    ].join(' ')}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="3"
                    strokeDasharray="6,4"
                    className="opacity-80"
                  />
                </svg>

                {/* Warehouse Depot Pin */}
                <div 
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer"
                  style={{ left: `${WAREHOUSE_DEPOT.coordinates.x}%`, top: `${WAREHOUSE_DEPOT.coordinates.y}%` }}
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-900 border-2 border-white shadow-lg flex items-center justify-center font-bold text-xs">
                    <Truck className="w-4 h-4 text-white" />
                  </div>
                  <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-2xs px-2 py-1 rounded shadow whitespace-nowrap opacity-90">
                    Sede / Deposito
                  </div>
                </div>

                {/* Stops Pins */}
                {route.stops.map((stop, idx) => {
                  const isCompleted = completedStopIds[stop.machineId];
                  const isSelected = selectedStopId === stop.machineId;

                  return (
                    <div
                      key={stop.machineId}
                      onClick={() => setSelectedStopId(stop.machineId)}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                      style={{ left: `${stop.machine.coordinates.x}%`, top: `${stop.machine.coordinates.y}%` }}
                    >
                      <div className={`w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-xs font-bold transition-all ${
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isSelected
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-400/50 scale-125'
                          : stop.criticalItemsCount > 0
                          ? 'bg-rose-600 text-white animate-bounce'
                          : 'bg-stone-800 text-white hover:bg-stone-700'
                      }`}>
                        {isCompleted ? '✓' : idx + 1}
                      </div>

                      {/* Tooltip on pin hover/click */}
                      <div className={`absolute top-9 left-1/2 -translate-x-1/2 bg-white text-stone-900 border border-stone-200 text-2xs px-2.5 py-1.5 rounded-lg shadow-md whitespace-nowrap z-30 pointer-events-none transition-opacity ${
                        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        <div className="font-bold">{stop.machine.code}: {stop.machine.name}</div>
                        <div className="text-stone-500">{stop.machine.address}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Map Legend */}
            <div className="px-4 py-2.5 bg-stone-50 text-2xs text-stone-600 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                  <span>Sede Centrale / Partenza</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                  <span>Scorte Critiche</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Tappa Completata</span>
                </span>
              </div>
              <span className="font-mono text-stone-400">Algoritmo TSP Nearest-Neighbor</span>
            </div>
          </div>

          {/* Turn by turn stops cards list */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Sequenza Tappe Rifornimento ({route.stops.length})
            </h3>

            {route.stops.map((stop, idx) => {
              const isCompleted = completedStopIds[stop.machineId];
              const isSelected = selectedStopId === stop.machineId;
              const stockPct = getMachineOverallStockPercent(stop.machine);

              return (
                <div
                  key={stop.machineId}
                  id={`route-stop-${stop.machine.code}`}
                  className={`p-4 rounded-xl border transition-all ${
                    isCompleted 
                      ? 'bg-emerald-50/40 border-emerald-200 opacity-80' 
                      : isSelected 
                      ? 'bg-indigo-50/50 border-indigo-300 ring-2 ring-indigo-200' 
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {/* Step Number badge */}
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-900 text-white'
                      }`}>
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-stone-500">{stop.machine.code}</span>
                          <span className="font-bold text-stone-900 text-sm">{stop.machine.name}</span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">{stop.machine.address}</p>

                        {/* Travel info from previous */}
                        <div className="mt-2 flex items-center space-x-3 text-2xs text-stone-500">
                          <span className="inline-flex items-center space-x-1">
                            <Truck className="w-3 h-3 text-indigo-500" />
                            <span>+{stop.distanceKm} km da tappa prec.</span>
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-stone-400" />
                            <span>~{stop.estimatedMinutes} min (guida + scarico)</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stock Meter & Actions */}
                    <div className="text-right flex flex-col items-end space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-stone-500">Giacenza:</span>
                        <span className={`text-xs font-bold ${
                          stockPct < 30 ? 'text-rose-600' : 'text-stone-800'
                        }`}>
                          {stockPct}%
                        </span>
                        {stop.criticalItemsCount > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-bold bg-rose-100 text-rose-800">
                            {stop.criticalItemsCount} allarmi
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleStopCompleted(stop.machineId)}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
                            isCompleted
                              ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                              : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
                          }`}
                        >
                          {isCompleted ? 'Rifornita ✓' : 'Segna Fatta'}
                        </button>

                        <button
                          onClick={() => openRestockModal(stop.machineId)}
                          className="px-3 py-1 rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors"
                        >
                          Rifornisci Ora
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Van Picking List (Lista Prelievo Magazzino Furgone) (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden sticky top-24">
            <div className="p-5 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <ListChecks className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-stone-900 text-sm">
                    Picking List Furgone
                  </h3>
                </div>
                <p className="text-2xs text-stone-500 mt-1">
                  Totale merci da prelevare in magazzino per coprire l'intero giro
                </p>
              </div>

              <span className="text-xs font-mono font-bold px-2 py-1 bg-stone-100 rounded text-stone-700 border border-stone-200">
                {route.pickingList.reduce((acc, i) => acc + i.quantityToPick, 0)} pezzi tot.
              </span>
            </div>

            {/* List by category */}
            <div className="p-4 max-h-[600px] overflow-y-auto divide-y divide-stone-100">
              {route.pickingList.length === 0 ? (
                <div className="py-8 text-center text-stone-400 text-xs">
                  Nessun prodotto richiesto per questo giro. Tutte le macchine sono piene!
                </div>
              ) : (
                route.pickingList.map((item) => {
                  const meta = CATEGORY_META[item.category];

                  return (
                    <div key={item.productId} className="py-3 flex items-center justify-between text-xs">
                      <div className="space-y-0.5 pr-2">
                        <div className="font-medium text-stone-900">{item.productName}</div>
                        <span className={`inline-block px-1.5 py-0.2 rounded text-2xs font-medium ${meta.bg} ${meta.color} border ${meta.border}`}>
                          {meta.label}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-extrabold text-stone-900">
                          +{item.quantityToPick}
                        </span>
                        <span className="text-2xs text-stone-400 ml-1">{item.unit}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer advice */}
            <div className="p-4 bg-stone-50 border-t border-stone-100 text-2xs text-stone-500 space-y-2">
              <div className="flex items-start space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  La lista calcola in tempo reale la somma di tutti gli slot sotto la capienza massima delle {route.totalStops} tappe del percorso.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
