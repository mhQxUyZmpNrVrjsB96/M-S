import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Check, 
  Sliders, 
  Plus, 
  Trash2, 
  Search, 
  Info,
  AlertTriangle,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';
import { useVending } from '../context/VendingContext';
import { VendingMachine, Product, SpiralConfigUpdate } from '../types';
import { formatEuro, compareSlotLabelsNumeric } from '../utils/vendingUtils';
import { SmartNumberInput } from './common/SmartNumberInput';
import { ConfirmUnsavedModal } from './common/ConfirmUnsavedModal';

interface EditSpiralsModalProps {
  machine: VendingMachine;
  onClose: () => void;
  initialFocusSlotId?: string | null;
}

interface LocalSpiralRow {
  slotId: string;
  label: string;
  productId: string;
  productName: string;
  capacity: number;
  salePrice: number;
  alertThreshold: number;
  currentStock: number;
  isNew?: boolean;
}

export const EditSpiralsModal: React.FC<EditSpiralsModalProps> = ({ 
  machine, 
  onClose,
  initialFocusSlotId 
}) => {
  const { 
    products, 
    updateMachineSpirals, 
    updateMachineSlot, 
    deleteSlotFromMachine, 
    clearAllSlotsFromMachine,
    addSlotToMachine 
  } = useVending();

  // Inizializza le righe con i valori correnti degli slot della macchina
  const [rows, setRows] = useState<LocalSpiralRow[]>(() => {
    return machine.slots.map(slot => {
      const prod = products.find(p => p.id === slot.productId);
      return {
        slotId: slot.id,
        label: slot.label,
        productId: slot.productId,
        productName: prod ? prod.name : 'Prodotto',
        capacity: slot.capacity,
        salePrice: slot.salePrice,
        alertThreshold: slot.alertThreshold ?? 5,
        currentStock: slot.currentStock,
      };
    });
  });

  const [slotIdConfirmingDelete, setSlotIdConfirmingDelete] = useState<string | null>(null);
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [pendingDeletedSlotIds, setPendingDeletedSlotIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [showProductPickerForSlot, setShowProductPickerForSlot] = useState<string | null>(null);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  // Snapshot iniziale per verificare se ci sono modifiche non salvate
  const initialSnapshotRef = useRef<string>('');
  useEffect(() => {
    initialSnapshotRef.current = JSON.stringify(
      machine.slots.map(s => ({
        id: s.id,
        label: s.label,
        productId: s.productId,
        capacity: s.capacity,
        salePrice: s.salePrice,
      }))
    );
  }, [machine.id]);

  // Controlla se le righe attuali differiscono dallo snapshot iniziale
  const hasUnsavedChanges = useMemo(() => {
    if (isSaved) return false;
    if (pendingDeletedSlotIds.length > 0) return true;
    const currentSnapshot = JSON.stringify(
      rows.map(r => ({
        id: r.slotId,
        label: r.label,
        productId: r.productId,
        capacity: r.capacity,
        salePrice: r.salePrice,
      }))
    );
    return currentSnapshot !== initialSnapshotRef.current;
  }, [rows, pendingDeletedSlotIds, isSaved]);

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  };

  const isCoffee = machine.type === 'caffe_calde';
  const termSingular = isCoffee ? 'Cassetto' : 'Spirale';
  const termSingularLower = isCoffee ? 'cassetto' : 'spirale';
  const termPlural = isCoffee ? 'Cassetti' : 'Spirali';
  const termPluralLower = isCoffee ? 'cassetti' : 'spirali';

  // Ricarica le righe solo se cambia il distributore selezionato
  const currentMachineIdRef = useRef(machine.id);
  useEffect(() => {
    if (currentMachineIdRef.current !== machine.id) {
      currentMachineIdRef.current = machine.id;
      const sortedSlots = [...machine.slots].sort((a, b) => compareSlotLabelsNumeric(a.label, b.label));
      setRows(
        sortedSlots.map(slot => {
          const prod = products.find(p => p.id === slot.productId);
          return {
            slotId: slot.id,
            label: slot.label,
            productId: slot.productId,
            productName: prod ? prod.name : 'Prodotto',
            capacity: slot.capacity,
            salePrice: slot.salePrice,
            alertThreshold: slot.alertThreshold ?? 5,
            currentStock: slot.currentStock,
          };
        })
      );
      setPendingDeletedSlotIds([]);
      setSlotIdConfirmingDelete(null);
      setIsConfirmingClearAll(false);
    }
  }, [machine.id, machine.slots, products]);

  // Se è stato indicato uno slot iniziale da modificare, focus automatico
  useEffect(() => {
    if (initialFocusSlotId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`input-spiral-label-${initialFocusSlotId}`);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [initialFocusSlotId]);

  // Inserimento nuova spirale o nuovo cassetto
  const handleAddNewSpiral = () => {
    const nextIndex = rows.length + 1;
    const defaultProduct = products[0] || { id: `prod-${Date.now()}`, name: 'Nuovo Prodotto', defaultPrice: 1.0 };
    const newSlotId = `new-slot-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newLabel = isCoffee ? `Cassetto ${nextIndex}` : `${nextIndex}`;

    const newRow: LocalSpiralRow = {
      slotId: newSlotId,
      label: newLabel,
      productId: defaultProduct.id,
      productName: defaultProduct.name,
      capacity: isCoffee ? 100 : 20,
      salePrice: defaultProduct.defaultPrice ?? (isCoffee ? 0 : 1.0),
      alertThreshold: isCoffee ? 20 : 5,
      currentStock: 0,
      isNew: true,
    };

    setRows(prev => [...prev, newRow].sort((a, b) => compareSlotLabelsNumeric(a.label, b.label)));
    setStatusMessage({
      text: `Nuovo ${termSingularLower} "${newLabel}" inserito in ordine numerico!`,
      type: 'info'
    });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Modifica campo singola riga
  const handleRowChange = (slotId: string, field: keyof LocalSpiralRow, value: any) => {
    setRows(prev =>
      prev.map(r => {
        if (r.slotId !== slotId) return r;
        return {
          ...r,
          [field]: value,
        };
      })
    );
  };

  // Assegna prodotto dal catalogo
  const handleSelectCatalogProduct = (slotId: string, selectedProd: Product) => {
    setRows(prev =>
      prev.map(r => {
        if (r.slotId !== slotId) return r;
        return {
          ...r,
          productId: selectedProd.id,
          productName: selectedProd.name,
          salePrice: selectedProd.defaultPrice || r.salePrice,
        };
      })
    );
    setShowProductPickerForSlot(null);
  };

  // Richiesta eliminazione spirale o cassetto
  const handleRequestDeleteRow = (slotId: string) => {
    setSlotIdConfirmingDelete(slotId);
  };

  // Conferma eliminazione spirale o cassetto
  const handleConfirmDeleteRow = (slotId: string) => {
    const target = rows.find(r => r.slotId === slotId);
    if (!target) return;

    // Se lo slot esisteva già a livello di database, eliminalo subito
    if (!target.isNew) {
      deleteSlotFromMachine(machine.id, slotId);
      setPendingDeletedSlotIds(prev => [...prev, slotId]);
    }

    // Rimuovi la riga dall'interfaccia corrente
    setRows(prev => prev.filter(r => r.slotId !== slotId));
    setSlotIdConfirmingDelete(null);

    setStatusMessage({
      text: `${termSingular} "${target.label}" (${target.productName}) eliminato con successo!`,
      type: 'success'
    });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Elimina tutti i cassetti o le spirali di questo distributore
  const handleClearAllSpirals = () => {
    clearAllSlotsFromMachine(machine.id);
    setRows([]);
    setPendingDeletedSlotIds([]);
    setIsConfirmingClearAll(false);
    setStatusMessage({
      text: `Tutti i ${termPluralLower} di "${machine.name}" sono stati rimossi con successo.`,
      type: 'info'
    });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Sposta la riga di una posizione su o giù
  const handleMoveRow = (slotId: string, direction: 'up' | 'down') => {
    const currentIndex = rows.findIndex(r => r.slotId === slotId);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= rows.length) return;

    const next = [...rows];
    const [moved] = next.splice(currentIndex, 1);
    next.splice(targetIndex, 0, moved);
    setRows(next);
  };

  // Sposta la riga a un indice di destinazione specifico
  const handleChangeRowIndex = (slotId: string, targetIndex: number) => {
    const currentIndex = rows.findIndex(r => r.slotId === slotId);
    if (currentIndex === -1) return;
    const clampedIndex = Math.max(0, Math.min(targetIndex, rows.length - 1));
    if (clampedIndex === currentIndex) return;

    const next = [...rows];
    const [moved] = next.splice(currentIndex, 1);
    next.splice(clampedIndex, 0, moved);
    setRows(next);
  };

  // Ordina le righe in ordine numerico progressivo
  const handleSortRowsNaturally = () => {
    const sorted = [...rows].sort((a, b) =>
      compareSlotLabelsNumeric(a.label, b.label)
    );
    setRows(sorted);
    setStatusMessage({
      text: `Righe ordinate in ordine numerico progressivo. Clicca "Salva modifiche" per confermare.`,
      type: 'info'
    });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Salva tutte le modifiche
  const handleSaveAll = () => {
    // 1. Assicurati che tutti gli slot rimossi siano stati eliminati dal distributore
    pendingDeletedSlotIds.forEach(slotId => {
      deleteSlotFromMachine(machine.id, slotId);
    });

    // 2. Gestisci nuovi slot aggiunti
    const newRows = rows.filter(r => r.isNew);
    for (const newR of newRows) {
      addSlotToMachine(machine.id, {
        label: newR.label.trim() || termSingular,
        productId: newR.productId,
        capacity: Math.max(1, newR.capacity),
        currentStock: 0,
        alertThreshold: newR.alertThreshold,
        salePrice: newR.salePrice,
        lastRestockStock: 0,
      });
    }

    // 3. Prepara gli aggiornamenti per le righe esistenti rimaste
    const existingUpdates: SpiralConfigUpdate[] = rows
      .filter(r => !r.isNew)
      .map(r => ({
        slotId: r.slotId,
        label: r.label.trim() || termSingular,
        productId: r.productId,
        productName: r.productName.trim() || 'Prodotto',
        capacity: Math.max(1, Math.round(r.capacity)),
        salePrice: r.salePrice,
        alertThreshold: r.alertThreshold,
      }));

    const orderedSlotIds = rows.filter(r => !r.isNew).map(r => r.slotId);

    if (existingUpdates.length > 0) {
      updateMachineSpirals(machine.id, existingUpdates, orderedSlotIds);
    }

    setIsSaved(true);
    setStatusMessage({
      text: `Configurazione ${termPluralLower} salvata con successo per ${machine.name}!`,
      type: 'success'
    });
    setTimeout(() => {
      onClose();
    }, 800);
  };

  // Filtra righe per ricerca
  const filteredRows = rows.filter(r => {
    const q = searchQuery.toLowerCase();
    return (
      r.label.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-1.5 sm:p-4 overflow-y-auto overscroll-contain">
      <div 
        id="modal-edit-spirals"
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-5xl max-h-[94dvh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto"
      >
        {/* Header fisso in alto */}
        <div className="px-4 sm:px-6 py-3 border-b border-stone-200 bg-stone-50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-xs">
              <Sliders className="w-5 h-5 text-stone-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-900">
                  Configurazione {termPlural}, Prodotti & Capienza
                </h2>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-stone-900 text-white">
                  {machine.code}
                </span>
              </div>
              <p className="text-2xs sm:text-xs text-stone-500 truncate max-w-[240px] sm:max-w-md">
                {machine.name} • {machine.address}
              </p>
            </div>
          </div>

          <button
            id="btn-close-edit-spirals-modal"
            onClick={handleAttemptClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Info Callout */}
        <div className="px-4 sm:px-6 py-2 bg-amber-50/90 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="text-2xs sm:text-xs">
              <strong>Sincronizzazione Automatica:</strong> Nomi {termPluralLower}, prodotti e capienze modificati qui saranno aggiornati subito anche nella <strong>⚡ Carica Rapida</strong> e nel catalogo.
            </span>
          </div>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold bg-white text-amber-900 border border-amber-300 shrink-0">
            {rows.length} {termPluralLower} {isCoffee ? 'configurati' : 'configurate'}
          </span>
        </div>

        {/* Notifica di stato / eliminazione */}
        {statusMessage && (
          <div 
            className={`px-4 sm:px-6 py-2 text-xs font-semibold flex items-center justify-between shrink-0 transition-all ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-900 border-b border-emerald-200' 
                : 'bg-amber-50 text-amber-900 border-b border-amber-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-stone-400 hover:text-stone-700 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Banner di conferma svuota tutte le spirali o tutti i cassetti */}
        {isConfirmingClearAll && (
          <div className="px-4 sm:px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 animate-in fade-in">
            <div className="flex items-center space-x-2 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Attenzione:</strong> Sei sicuro di voler eliminare <strong>tutti i {rows.length} {termPluralLower}</strong> di questo distributore?
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsConfirmingClearAll(false)}
                className="px-3 py-1 text-xs font-semibold text-stone-600 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                id="btn-confirm-clear-all-spirals"
                onClick={handleClearAllSpirals}
                className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs flex items-center space-x-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sì, elimina tutti</span>
              </button>
            </div>
          </div>
        )}

        {/* Search & Action Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-stone-100/70 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-spirals"
              type="text"
              placeholder={`Cerca ${termSingularLower} o prodotto...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-base sm:text-xs bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center space-x-2">
            {rows.length > 1 && (
              <button
                id="btn-sort-spirals-az"
                type="button"
                onClick={handleSortRowsNaturally}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300 border border-stone-300 text-stone-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                title="Ordina automaticamente le righe in ordine alfabetico naturale per sigla (A1, A2, A3...)"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
                <span>Ordina A-Z</span>
              </button>
            )}

            {rows.length > 0 && !isConfirmingClearAll && (
              <button
                id="btn-clear-all-spirals-trigger"
                type="button"
                onClick={() => setIsConfirmingClearAll(true)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 border border-stone-300 hover:border-rose-200 text-stone-600 hover:text-rose-600 text-xs font-semibold transition-colors cursor-pointer"
                title={`Elimina tutti i ${termPluralLower} da questo distributore`}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Svuota tutti i {termPluralLower}</span>
              </button>
            )}

            <button
              id="btn-add-spiral-row"
              type="button"
              onClick={handleAddNewSpiral}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>+ Aggiungi Nuovo {termSingular}</span>
            </button>
          </div>
        </div>

        {/* Spirals List Table */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 overscroll-contain">
          <div className="space-y-3">
            {filteredRows.map((row) => {
              const rowIndex = rows.findIndex(r => r.slotId === row.slotId);
              const isPickerOpen = showProductPickerForSlot === row.slotId;
              const isConfirmingDelete = slotIdConfirmingDelete === row.slotId;

              return (
                <div 
                  key={row.slotId}
                  id={`edit-spiral-row-${row.slotId}`}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all space-y-2.5 focus-within:ring-2 focus-within:ring-amber-500 focus-within:bg-amber-50/40 focus-within:border-amber-400 ${
                    isConfirmingDelete 
                      ? 'bg-rose-50/60 border-rose-300 shadow-xs' 
                      : 'bg-stone-50/80 hover:bg-stone-50 border-stone-200 shadow-2xs'
                  }`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    {/* 1. Posizione & Sigla della Spirale */}
                    <div className="md:col-span-3">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wide">
                          Pos. & Sigla
                        </label>
                        <span className="text-3xs font-mono font-bold text-stone-500">
                          #{rowIndex + 1} di {rows.length}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        {/* Selettore rapido posizione e frecce su/giù */}
                        <div className="flex items-center bg-white border-2 border-stone-300 rounded-lg px-1.5 py-1.5 shadow-2xs space-x-1 shrink-0">
                          <select
                            value={rowIndex}
                            onChange={(e) => handleChangeRowIndex(row.slotId, parseInt(e.target.value, 10))}
                            className="bg-transparent font-mono font-black text-xs text-stone-800 cursor-pointer focus:outline-hidden hover:text-amber-800 pr-0.5"
                            title="Cambia posizione ordine"
                          >
                            {rows.map((_, i) => (
                              <option key={i} value={i}>
                                #{i + 1}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center border-l border-stone-200 pl-1 ml-0.5 space-x-0.5">
                            <button
                              type="button"
                              disabled={rowIndex === 0}
                              onClick={() => handleMoveRow(row.slotId, 'up')}
                              className={`p-0.5 rounded transition-colors ${
                                rowIndex === 0 
                                  ? 'text-stone-300 cursor-not-allowed opacity-40' 
                                  : 'text-stone-600 hover:text-amber-800 hover:bg-amber-100 cursor-pointer'
                              }`}
                              title="Sposta prima (in su)"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={rowIndex === rows.length - 1}
                              onClick={() => handleMoveRow(row.slotId, 'down')}
                              className={`p-0.5 rounded transition-colors ${
                                rowIndex === rows.length - 1 
                                  ? 'text-stone-300 cursor-not-allowed opacity-40' 
                                  : 'text-stone-600 hover:text-amber-800 hover:bg-amber-100 cursor-pointer'
                              }`}
                              title="Sposta dopo (in giù)"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Input Sigla o Numero */}
                        <input
                          id={`input-spiral-label-${row.slotId}`}
                          type="text"
                          value={row.label}
                          onChange={(e) => handleRowChange(row.slotId, 'label', e.target.value)}
                          onFocus={(e) => {
                            e.target.select();
                            try {
                              e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            } catch {}
                          }}
                          onBlur={() => {
                            const trimmed = row.label.trim();
                            if (!row.isNew && trimmed) {
                              updateMachineSlot(machine.id, row.slotId, { label: trimmed });
                            }
                            // Riordina automaticamente in ordine numerico progressivo spostando la riga
                            setRows(prev => [...prev].sort((a, b) => compareSlotLabelsNumeric(a.label, b.label)));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          placeholder="es. 1, 2, 10"
                          className="w-full px-2.5 py-2 font-mono font-black text-base sm:text-sm text-stone-900 bg-white border-2 border-stone-300 focus:border-amber-500 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-hidden shadow-2xs text-center"
                        />
                      </div>
                    </div>

                    {/* 2. Nome del Prodotto */}
                    <div className="md:col-span-3">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wide">
                          Prodotto Associato
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowProductPickerForSlot(isPickerOpen ? null : row.slotId)}
                          className="text-2xs font-semibold text-amber-700 hover:text-amber-800 underline cursor-pointer"
                        >
                          {isPickerOpen ? 'Chiudi catalogo' : 'Scegli da catalogo'}
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          id={`input-spiral-product-${row.slotId}`}
                          type="text"
                          value={row.productName}
                          onChange={(e) => handleRowChange(row.slotId, 'productName', e.target.value)}
                          onFocus={(e) => {
                            e.target.select();
                            try {
                              e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            } catch {}
                          }}
                          placeholder="Nome prodotto (es. Coca Cola 33cl)"
                          className="w-full px-3 py-2 font-bold text-base sm:text-sm text-stone-900 bg-white border-2 border-stone-300 focus:border-amber-500 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-hidden shadow-2xs"
                        />
                      </div>

                      {/* Dropdown rapido per selezionare prodotto da catalogo esistente */}
                      {isPickerOpen && (
                        <div className="mt-2 p-2 bg-white rounded-lg border-2 border-amber-400 shadow-xl max-h-48 overflow-y-auto text-xs z-30 animate-in fade-in">
                          <p className="text-2xs font-bold text-stone-500 px-2 py-1 uppercase">
                            Seleziona articolo dal listino prodotti:
                          </p>
                          <div className="divide-y divide-stone-100">
                            {products.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleSelectCatalogProduct(row.slotId, p)}
                                className="w-full text-left px-2 py-1.5 hover:bg-amber-50 rounded flex items-center justify-between transition-colors cursor-pointer"
                              >
                                <span className="font-semibold text-stone-800">{p.name}</span>
                                <span className="text-stone-500 text-2xs font-mono">{formatEuro(p.defaultPrice)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3. Quantità Massima per la Spirale (Capienza) */}
                    <div className="md:col-span-2">
                      <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                        Capienza (pz)
                      </label>
                      <div className="flex items-center space-x-1">
                        <SmartNumberInput
                          id={`input-spiral-capacity-${row.slotId}`}
                          min={1}
                          max={999}
                          value={row.capacity}
                          defaultValueIfEmpty={1}
                          onChange={(val) => handleRowChange(row.slotId, 'capacity', val)}
                          className="w-full px-2 py-2 font-black text-base sm:text-sm text-center text-stone-900 bg-white border-2 border-stone-300 focus:border-amber-500 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-hidden shadow-2xs"
                        />
                        <span className="text-2xs text-stone-500 font-medium">pz</span>
                      </div>
                    </div>

                    {/* 4. Prezzo di Vendita (€ IVA compresa) */}
                    <div className="md:col-span-2">
                      <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                        Prezzo Ivato (€)
                      </label>
                      <SmartNumberInput
                        id={`input-spiral-price-${row.slotId}`}
                        step="0.05"
                        min={0.10}
                        allowDecimals={true}
                        value={row.salePrice}
                        defaultValueIfEmpty={0.10}
                        onChange={(val) => handleRowChange(row.slotId, 'salePrice', val)}
                        className="w-full px-2 py-2 font-black text-base sm:text-sm text-center text-stone-900 bg-white border-2 border-stone-300 focus:border-amber-500 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-hidden shadow-2xs"
                      />
                    </div>

                    {/* 5. Tasto Elimina Spirale con Conferma Inline (Disponibile SOLO nel menù configurazione) */}
                    <div className="md:col-span-2 flex items-center justify-end pt-2 md:pt-0">
                      {isConfirmingDelete ? (
                        <div className="flex items-center space-x-1 bg-white border border-rose-300 rounded-lg p-1 shadow-xs animate-in fade-in">
                          <span className="text-3xs font-bold text-rose-700 px-1">Eliminare?</span>
                          <button
                            type="button"
                            id={`btn-cancel-delete-${row.slotId}`}
                            onClick={() => setSlotIdConfirmingDelete(null)}
                            className="px-2 py-1 text-3xs font-semibold text-stone-600 hover:bg-stone-100 rounded transition-colors cursor-pointer"
                          >
                            No
                          </button>
                          <button
                            type="button"
                            id={`btn-confirm-delete-${row.slotId}`}
                            onClick={() => handleConfirmDeleteRow(row.slotId)}
                            className="px-2 py-1 text-3xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors flex items-center space-x-1 cursor-pointer shadow-2xs"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Sì, elimina</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          id={`btn-delete-spiral-${row.slotId}`}
                          type="button"
                          onClick={() => handleRequestDeleteRow(row.slotId)}
                          title={`Elimina ${termSingularLower} ${row.label}`}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs text-stone-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                          <span className="text-2xs font-semibold">Elimina</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Informazione scorta e alert per questa spirale o cassetto */}
                  <div className="flex flex-wrap items-center justify-between text-2xs text-stone-500 pt-1 border-t border-stone-200/50">
                    <div className="flex items-center space-x-3">
                      <span>
                        Giacenza attuale: <strong className="text-stone-700">{row.currentStock} pz</strong>
                      </span>
                    </div>

                    {row.currentStock > row.capacity && (
                      <span className="text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded">
                        ⚠️ La giacenza attuale ({row.currentStock}) supera la nuova capienza ({row.capacity})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredRows.length === 0 && (
              <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300">
                {rows.length === 0 ? (
                  <>
                    <p className="text-sm font-bold text-stone-800 mb-1">Nessun {termSingularLower} configurato per questo distributore</p>
                    <p className="text-xs text-stone-500 mb-4">
                      Tutti i {termPluralLower} sono stati eliminati. Puoi aggiungere a mano i {termPluralLower} reali con i rispettivi codici (es. {isCoffee ? 'Cassetto 1, Cassetto 2...' : 'A1, A2, 11...'}).
                    </p>
                    <button
                      type="button"
                      onClick={handleAddNewSpiral}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Aggiungi il Primo {termSingular}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-stone-600">Nessun {termSingularLower} trovato con questo termine di ricerca</p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-2 text-xs text-amber-700 font-semibold hover:underline cursor-pointer"
                    >
                      Mostra tutti i {termPluralLower}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer (Pinned in basso) */}
        <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-3.5 bg-stone-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-800">
          <div className="text-xs text-stone-400">
            <span>Le modifiche avranno effetto immediato in tutte le schermate operative.</span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              id="btn-cancel-edit-spirals"
              type="button"
              onClick={handleAttemptClose}
              className="px-4 py-2.5 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              Chiudi
            </button>

            <button
              id="btn-save-edit-spirals"
              type="button"
              onClick={handleSaveAll}
              disabled={isSaved}
              className={`inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer ${
                isSaved
                  ? 'bg-emerald-500 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-stone-950 hover:shadow-lg'
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Modifiche Salvate con Successo!</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-stone-950" />
                  <span>Salva Modifiche {termPlural} & Prodotti</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Avviso di conferma modifiche non salvate */}
      <ConfirmUnsavedModal
        isOpen={showUnsavedConfirm}
        title={`Modifiche a ${termPlural} non salvate!`}
        message={`Hai apportato delle modifiche alla configurazione dei ${termPluralLower} di "${machine.name}" che non sono state ancora registrate. Se esci adesso, perderai tutti i nuovi valori inseriti.`}
        confirmText="Esci e scarta modifiche"
        cancelText="Continua a modificare"
        onConfirmLeave={() => {
          setShowUnsavedConfirm(false);
          onClose();
        }}
        onCancelStay={() => setShowUnsavedConfirm(false)}
      />
    </div>
  );
};
