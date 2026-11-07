import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Package, 
  Coins, 
  CreditCard, 
  Search, 
  Plus, 
  Layers, 
  Sparkles,
  ArrowUpDown,
  Filter,
  RefreshCw,
  Clock,
  MapPin,
  Coffee,
  ChevronDown,
  ChevronUp,
  Warehouse,
  Sliders,
  Edit3
} from 'lucide-react';
import { useVending } from '../context/VendingContext';
import { 
  formatEuro, 
  getMachineOverallStockPercent, 
  getMachineCriticalSlotsCount, 
  CATEGORY_META 
} from '../utils/vendingUtils';
import { VendingMachine } from '../types';
import { EditSpiralsModal } from './EditSpiralsModal';

interface StockMonitorProps {
  onNavigateToWarehouse?: () => void;
}

export const StockMonitor: React.FC<StockMonitorProps> = ({ onNavigateToWarehouse }) => {
  const { machines, products, openRestockModal, addNewMachine } = useVending();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedMachineIds, setExpandedMachineIds] = useState<Record<string, boolean>>({});
  const [isAddMachineOpen, setIsAddMachineOpen] = useState(false);
  const [editingMachineSpirals, setEditingMachineSpirals] = useState<VendingMachine | null>(null);
  const [initialFocusSlotId, setInitialFocusSlotId] = useState<string | null>(null);

  // New machine form state
  const [newCode, setNewCode] = useState(`DA-0${machines.length + 1}`);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newZone, setNewZone] = useState('');
  const [newType, setNewType] = useState<'combo_completo' | 'snack_bevande' | 'caffe_calde'>('combo_completo');

  // Toggle expand
  const toggleExpand = (machineId: string) => {
    setExpandedMachineIds(prev => ({
      ...prev,
      [machineId]: !prev[machineId],
    }));
  };

  // Expand all / collapse all
  const toggleAllExpanded = () => {
    const allExpanded = machines.every(m => expandedMachineIds[m.id]);
    const newState: Record<string, boolean> = {};
    machines.forEach(m => {
      newState[m.id] = !allExpanded;
    });
    setExpandedMachineIds(newState);
  };

  // KPI calculations
  const totalSlotsCount = useMemo(() => {
    return machines.reduce((sum, m) => sum + m.slots.length, 0);
  }, [machines]);

  const totalUnitsInStock = useMemo(() => {
    return machines.reduce((sum, m) => sum + m.slots.reduce((s, slot) => s + slot.currentStock, 0), 0);
  }, [machines]);

  const totalMaxCapacity = useMemo(() => {
    return machines.reduce((sum, m) => sum + m.slots.reduce((s, slot) => s + slot.capacity, 0), 0);
  }, [machines]);

  const fleetAverageStockPct = totalMaxCapacity > 0 ? Math.round((totalUnitsInStock / totalMaxCapacity) * 100) : 0;

  const criticalMachinesCount = useMemo(() => {
    return machines.filter(m => m.status === 'critico' || m.status === 'in_esaurimento').length;
  }, [machines]);

  const totalCashInMachines = useMemo(() => {
    return machines.reduce((sum, m) => sum + m.cashBalance, 0);
  }, [machines]);

  // Filtering
  const filteredMachines = useMemo(() => {
    return machines.filter(m => {
      const matchesSearch = 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.zone.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = filterType === 'all' || m.type === filterType;

      const matchesStatus = 
        filterStatus === 'all' ? true :
        filterStatus === 'alarms' ? (m.status === 'critico' || m.status === 'in_esaurimento') :
        m.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [machines, searchQuery, filterType, filterStatus]);

  // Add machine submit
  const handleAddMachineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    // Crea slot predefiniti in base al tipo
    const defaultSlots = products.slice(0, 6).map((p, idx) => ({
      id: `slot-${idx + 1}`,
      label: newType === 'caffe_calde' ? `Canestro ${idx + 1}` : `Spirale A${idx + 1}`,
      productId: p.id,
      capacity: newType === 'caffe_calde' ? 100 : 20,
      currentStock: newType === 'caffe_calde' ? 100 : 20,
      alertThreshold: newType === 'caffe_calde' ? 20 : 5,
      salePrice: p.defaultPrice,
      lastRestockStock: newType === 'caffe_calde' ? 100 : 20,
    }));

    addNewMachine({
      code: newCode,
      name: newName,
      address: newAddress || 'Indirizzo sede cliente',
      zone: newZone || 'Zona Urbana',
      type: newType,
      status: 'operativo',
      cashBalance: 0,
      posBalance: 0,
      lastRestockDate: new Date().toISOString(),
      coordinates: {
        lat: 45.4650,
        lng: 9.1850,
        x: Math.floor(Math.random() * 70) + 15,
        y: Math.floor(Math.random() * 70) + 15,
      },
      slots: defaultSlots,
    });

    setIsAddMachineOpen(false);
    setNewName('');
    setNewAddress('');
    setNewZone('');
  };

  return (
    <div className="space-y-6">
      {/* Selettore rapido: Distributori nel Negozio vs Solo Scorte Magazzino */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="flex items-center space-x-1.5 bg-stone-100 p-1 rounded-xl">
          <button
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-white text-stone-900 shadow-xs border border-stone-200/80"
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Distributori Automatici ({machines.length})</span>
          </button>

          {onNavigateToWarehouse && (
            <button
              onClick={onNavigateToWarehouse}
              className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-200/70 transition-colors cursor-pointer"
            >
              <Warehouse className="w-4 h-4 text-amber-600" />
              <span>📦 Solo Scorte in Magazzino</span>
            </button>
          )}
        </div>

        <p className="text-2xs text-stone-500 hidden md:block">
          Visualizzazione dettagliata delle spirali e dei canestri nel negozio
        </p>
      </div>

      {/* Top Store Health Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Scorte Totali Negozio */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-stone-500 tracking-wider">
              Scorte Negozio
            </span>
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-stone-900">{fleetAverageStockPct}%</span>
            <span className="text-xs text-stone-500 font-medium">
              ({totalUnitsInStock} / {totalMaxCapacity} pz)
            </span>
          </div>
          <div className="w-full h-2 bg-stone-100 rounded-full mt-3 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                fleetAverageStockPct >= 65 ? 'bg-emerald-500' : fleetAverageStockPct >= 40 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${fleetAverageStockPct}%` }}
            />
          </div>
        </div>

        {/* Allarmi Scorte Critiche */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-stone-500 tracking-wider">
              Da Rifornire
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              criticalMachinesCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-stone-900">{criticalMachinesCount}</span>
            <span className="text-xs text-stone-500 font-medium">
              su {machines.length} distributori
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-2">
            {criticalMachinesCount === 0 
              ? 'Tutti i distributori sono carichi' 
              : 'Alcuni canestri/spirali sono sotto soglia'}
          </p>
        </div>

        {/* Monete nei Cassetti */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-stone-500 tracking-wider">
              Cassa nei Distributori
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-amber-600">{formatEuro(totalCashInMachines)}</span>
          </div>
          <p className="text-xs text-stone-500 mt-2">
            Contante nei cassetti da svuotare
          </p>
        </div>

        {/* Stato Negozio */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-stone-500 tracking-wider">
              Punto Vendita H24
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-emerald-700">Aperto</span>
            <span className="text-xs text-stone-500 font-medium">24/7</span>
          </div>
          <p className="text-xs text-stone-500 mt-2">
            3 distributori attivi nel negozio
          </p>
        </div>
      </div>

      {/* Control Bar: Search, Filters & Add Machine Button */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cerca per codice, nome, zona..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Filter Type */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg text-stone-700 focus:bg-white focus:outline-hidden"
          >
            <option value="all">Tutte le tipologie</option>
            <option value="combo_completo">Combo Snack & Bibite & Caffè</option>
            <option value="caffe_calde">Caffè Espresso & Calde</option>
            <option value="snack_bevande">Snack & Bevande Fredde</option>
          </select>

          {/* Filter Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg text-stone-700 focus:bg-white focus:outline-hidden"
          >
            <option value="all">Tutti gli stati</option>
            <option value="alarms">Solo Macchine con Allarmi</option>
            <option value="critico">Stato Critico (&lt;25%)</option>
            <option value="in_esaurimento">In Esaurimento</option>
            <option value="operativo">Scorte Regolari</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={toggleAllExpanded}
            className="px-3 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap"
          >
            Espandi / Comprimi Tutti
          </button>

          <button
            id="btn-open-add-machine"
            onClick={() => setIsAddMachineOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Nuovo Distributore</span>
          </button>
        </div>
      </div>

      {/* Machine Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredMachines.map((machine) => {
          const stockPercent = getMachineOverallStockPercent(machine);
          const criticalCount = getMachineCriticalSlotsCount(machine);
          const isExpanded = expandedMachineIds[machine.id] ?? true;

          return (
            <div 
              key={machine.id} 
              id={`machine-card-${machine.code}`}
              className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden flex flex-col transition-all hover:border-stone-300"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-stone-100 bg-stone-50/50">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl leading-none">
                        {machine.type === 'caffe_calde' || machine.id === 'mach-03' 
                          ? '☕' 
                          : machine.id === 'mach-02' 
                            ? '🍪' 
                            : '🥤'}
                      </span>
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-stone-900 text-amber-400 border border-stone-800">
                        {machine.code}
                      </span>
                      <h3 className="font-bold text-stone-900 text-base">
                        {machine.name}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-stone-500">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" />
                        <span>{machine.address}</span>
                      </span>
                      <span className="text-stone-300">•</span>
                      <span className="font-medium text-stone-600">{machine.zone}</span>
                    </div>
                  </div>

                  {/* Status Badge & Edit Spirals Button */}
                  <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      id={`btn-edit-spirals-${machine.code}`}
                      onClick={() => {
                        setEditingMachineSpirals(machine);
                        setInitialFocusSlotId(null);
                      }}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-2xs transition-all cursor-pointer hover:shadow-xs"
                      title="Modifica il nome delle spirali, i nomi dei prodotti e le capienze massime"
                    >
                      <Sliders className="w-3.5 h-3.5 text-stone-950" />
                      <span>Modifica Spirali & Prodotti</span>
                    </button>

                    {machine.status === 'critico' ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                        <span>Critico ({criticalCount} allarmi)</span>
                      </span>
                    ) : machine.status === 'in_esaurimento' ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>In Esaurimento</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Scorte Regolari</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Main Progress Bar & Financial stats */}
                <div className="mt-4 pt-3 border-t border-stone-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span className="text-stone-600">Livello Scorte Complessivo</span>
                      <span className="font-bold text-stone-900">{stockPercent}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          stockPercent >= 65 ? 'bg-emerald-500' : stockPercent >= 35 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${stockPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-xs">
                    <div className="text-right">
                      <span className="text-stone-400 block text-2xs uppercase font-semibold">Cassa Monete</span>
                      <span className="font-bold text-amber-700">{formatEuro(machine.cashBalance)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-stone-400 block text-2xs uppercase font-semibold">Cassa POS</span>
                      <span className="font-bold text-stone-800">{formatEuro(machine.posBalance)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slots List / Detail */}
              <div className="p-5 flex-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Spire & Prodotti ({machine.slots.length})
                    </span>
                    <button
                      id={`btn-sub-edit-spirals-${machine.code}`}
                      onClick={() => {
                        setEditingMachineSpirals(machine);
                        setInitialFocusSlotId(null);
                      }}
                      className="inline-flex items-center space-x-1 text-2xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                      title="Modifica nomi spirali, prodotti e capienza per questa macchina"
                    >
                      <Edit3 className="w-3 h-3 text-amber-900" />
                      <span>Modifica Spirali</span>
                    </button>
                  </div>
                  <button
                    onClick={() => toggleExpand(machine.id)}
                    className="flex items-center space-x-1 text-xs text-stone-500 hover:text-stone-800 font-medium transition-colors"
                  >
                    <span>{isExpanded ? 'Comprimi' : 'Espandi'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {isExpanded ? (
                  <div className="space-y-2">
                    {machine.slots.length === 0 ? (
                      <div className="p-6 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300 space-y-2">
                        <p className="text-xs text-stone-500 font-medium">Nessuna spirale configurata per questo distributore.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMachineSpirals(machine);
                            setInitialFocusSlotId(null);
                          }}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-2xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Aggiungi Prima Spirale a Mano</span>
                        </button>
                      </div>
                    ) : (
                      machine.slots.map((slot) => {
                      const prod = products.find(p => p.id === slot.productId);
                      const isAlert = slot.currentStock <= slot.alertThreshold;
                      const slotPct = Math.round((slot.currentStock / slot.capacity) * 100);

                      return (
                        <div 
                          key={slot.id}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                            isAlert 
                              ? 'bg-rose-50/70 border-rose-200 text-rose-900' 
                              : 'bg-stone-50/50 border-stone-200/80 text-stone-800'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMachineSpirals(machine);
                                setInitialFocusSlotId(slot.id);
                              }}
                              className="font-mono font-bold px-1.5 py-0.5 rounded bg-white hover:bg-amber-50 hover:border-amber-400 border border-stone-200 text-stone-700 text-2xs cursor-pointer transition-colors"
                              title="Tocca per rinominare o modificare questa spirale"
                            >
                              {slot.label}
                            </button>
                            <span className="font-medium truncate max-w-[150px] sm:max-w-[220px]">
                              {prod?.name || slot.productId}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2.5 shrink-0">
                            <span className="font-bold text-stone-900">
                              {formatEuro(slot.salePrice)}
                            </span>

                            <div className="text-right">
                              <span className={`font-bold ${isAlert ? 'text-rose-700 font-extrabold' : 'text-stone-700'}`}>
                                {slot.currentStock} / {slot.capacity}
                              </span>
                              <span className="text-2xs text-stone-400 ml-1">pz</span>
                            </div>

                            <div className="w-10 sm:w-12 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  slotPct >= 60 ? 'bg-emerald-500' : slotPct >= 25 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${slotPct}%` }}
                              />
                            </div>

                            {/* Tasto modifica rapida per questa specifica spirale */}
                            <button
                              id={`btn-edit-slot-${machine.code}-${slot.id}`}
                              onClick={() => {
                                setEditingMachineSpirals(machine);
                                setInitialFocusSlotId(slot.id);
                              }}
                              title={`Modifica ${slot.label} (${prod?.name || 'prodotto'})`}
                              className="p-1 rounded text-stone-400 hover:text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    }))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {machine.slots.length === 0 ? (
                      <span className="text-2xs text-stone-400 italic">0 spirali configurate</span>
                    ) : (
                      machine.slots.map(s => {
                        const isAlert = s.currentStock <= s.alertThreshold;
                        return (
                          <span 
                            key={s.id}
                            className={`px-2 py-1 rounded text-2xs font-mono font-semibold border ${
                              isAlert 
                                ? 'bg-rose-100 text-rose-800 border-rose-300' 
                                : 'bg-stone-100 text-stone-700 border-stone-200'
                            }`}
                          >
                            {s.label}: {s.currentStock}/{s.capacity}
                          </span>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
                <span className="text-2xs text-stone-400 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Ultimo carico: {new Date(machine.lastRestockDate).toLocaleDateString('it-IT')}</span>
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    id={`btn-footer-edit-${machine.code}`}
                    onClick={() => {
                      setEditingMachineSpirals(machine);
                      setInitialFocusSlotId(null);
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 border border-stone-200 hover:border-amber-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-stone-700" />
                    <span>Configura Spirali</span>
                  </button>

                  <button
                    id={`btn-restock-machine-${machine.code}`}
                    onClick={() => openRestockModal(machine.id)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Rifornisci & Riconcilia</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Vending Machine Modal Dialog */}
      {isAddMachineOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-bold text-base text-stone-900">Aggiungi Nuovo Distributore Automatico</h3>
              <button 
                onClick={() => setIsAddMachineOpen(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMachineSubmit} className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Codice Identificativo</label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-stone-900 font-mono"
                    placeholder="DA-06"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Tipologia Macchina</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-stone-900"
                  >
                    <option value="combo_completo">Combo Snack, Bibite & Caffè</option>
                    <option value="caffe_calde">Solo Caffè Espresso & Calde</option>
                    <option value="snack_bevande">Solo Snack & Bevande</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nome / Denominazione Locale</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Es. Sede Centrale - Reception"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Indirizzo Completo</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Es. Corso Buenos Aires 120"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Zona / Quartiere</label>
                <input
                  type="text"
                  value={newZone}
                  onChange={(e) => setNewZone(e.target.value)}
                  placeholder="Es. Loreto / Buenos Aires"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-stone-900"
                />
              </div>

              <div className="pt-4 border-t border-stone-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddMachineOpen(false)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-800 text-sm font-medium"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-semibold shadow-xs"
                >
                  Aggiungi Macchina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modifica Spirali, Prodotti e Capienza Massima */}
      {editingMachineSpirals && (
        <EditSpiralsModal
          machine={machines.find(m => m.id === editingMachineSpirals.id) || editingMachineSpirals}
          onClose={() => {
            setEditingMachineSpirals(null);
            setInitialFocusSlotId(null);
          }}
          initialFocusSlotId={initialFocusSlotId}
        />
      )}
    </div>
  );
};
