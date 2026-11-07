import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Sliders, 
  Plus, 
  Trash2, 
  Package, 
  Search, 
  AlertCircle, 
  Sparkles,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import { useVending } from '../context/VendingContext';
import { VendingMachine, Product, SpiralConfigUpdate } from '../types';
import { formatEuro } from '../utils/vendingUtils';

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
  const { products, updateMachineSpirals, updateMachineSlot, deleteSlotFromMachine, addSlotToMachine } = useVending();

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

  // Sincronizza lo stato quando la macchina o i prodotti cambiano
  useEffect(() => {
    setRows(
      machine.slots.map(slot => {
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

  const [searchQuery, setSearchQuery] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [showProductPickerForSlot, setShowProductPickerForSlot] = useState<string | null>(null);

  // Inserimento nuova spirale
  const handleAddNewSpiral = () => {
    const nextIndex = rows.length + 1;
    const defaultProduct = products[0] || { id: `prod-${Date.now()}`, name: 'Nuovo Prodotto', defaultPrice: 1.0 };
    const newSlotId = `new-slot-${Date.now()}`;
    const newLabel = machine.type === 'caffe_calde' ? `Canestro ${nextIndex}` : `Spirale A${nextIndex}`;

    const newRow: LocalSpiralRow = {
      slotId: newSlotId,
      label: newLabel,
      productId: defaultProduct.id,
      productName: defaultProduct.name,
      capacity: machine.type === 'caffe_calde' ? 100 : 20,
      salePrice: defaultProduct.defaultPrice || 1.0,
      alertThreshold: machine.type === 'caffe_calde' ? 20 : 5,
      currentStock: 0,
      isNew: true,
    };

    setRows(prev => [...prev, newRow]);
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

  // Rimuovi spirale
  const handleRemoveRow = (slotId: string) => {
    const target = rows.find(r => r.slotId === slotId);
    if (!target) return;

    if (window.confirm(`Vuoi rimuovere la spirale "${target.label}" (${target.productName}) da questo distributore?`)) {
      if (!target.isNew) {
        deleteSlotFromMachine(machine.id, slotId);
      }
      setRows(prev => prev.filter(r => r.slotId !== slotId));
    }
  };

  // Salva tutte le modifiche
  const handleSaveAll = () => {
    // 1. Gestisci nuove spirali aggiunte
    const newRows = rows.filter(r => r.isNew);
    for (const newR of newRows) {
      addSlotToMachine(machine.id, {
        label: newR.label.trim() || 'Spirale',
        productId: newR.productId,
        capacity: Math.max(1, newR.capacity),
        currentStock: 0,
        alertThreshold: newR.alertThreshold,
        salePrice: newR.salePrice,
        lastRestockStock: 0,
      });
    }

    // 2. Prepara gli aggiornamenti per le spirali esistenti
    const existingUpdates: SpiralConfigUpdate[] = rows
      .filter(r => !r.isNew)
      .map(r => ({
        slotId: r.slotId,
        label: r.label.trim() || 'Spirale',
        productId: r.productId,
        productName: r.productName.trim() || 'Prodotto',
        capacity: Math.max(1, Math.round(r.capacity)),
        salePrice: r.salePrice,
        alertThreshold: r.alertThreshold,
      }));

    if (existingUpdates.length > 0) {
      updateMachineSpirals(machine.id, existingUpdates);
    }

    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 900);
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="modal-edit-spirals"
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
              <Sliders className="w-5 h-5 text-stone-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-stone-900">
                  Modifica Spirali, Prodotti & Capienza
                </h2>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-stone-900 text-white">
                  {machine.code}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                {machine.name} • {machine.address}
              </p>
            </div>
          </div>

          <button
            id="btn-close-edit-spirals-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Info Callout */}
        <div className="px-6 py-3 bg-amber-50/80 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Sincronizzazione Automatica:</strong> Il nome della spirale, il nome del prodotto e la capienza massima modificati qui saranno aggiornati all'istante anche nella <strong>⚡ Pagina di Carica Rapida</strong> e nel catalogo.
            </span>
          </div>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold bg-white text-amber-900 border border-amber-300">
            {rows.length} spirali configurate
          </span>
        </div>

        {/* Search & Action Bar */}
        <div className="px-6 py-3 bg-stone-100/70 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-spirals"
              type="text"
              placeholder="Cerca spirale o prodotto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          <button
            id="btn-add-spiral-row"
            type="button"
            onClick={handleAddNewSpiral}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>+ Aggiungi Nuova Spirale</span>
          </button>
        </div>

        {/* Spirals List Table */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-3">
            {filteredRows.map((row, idx) => {
              const isPickerOpen = showProductPickerForSlot === row.slotId;

              return (
                <div 
                  key={row.slotId}
                  id={`edit-spiral-row-${row.slotId}`}
                  className="p-4 bg-stone-50/70 hover:bg-stone-50 rounded-xl border border-stone-200 transition-all space-y-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    {/* 1. Nome/Sigla della Spirale */}
                    <div className="md:col-span-3">
                      <label className="block text-2xs font-bold text-stone-600 uppercase tracking-wide mb-1">
                        Nome / Sigla Spirale
                      </label>
                      <div className="relative">
                        <input
                          id={`input-spiral-label-${row.slotId}`}
                          type="text"
                          value={row.label}
                          onChange={(e) => handleRowChange(row.slotId, 'label', e.target.value)}
                          onBlur={() => {
                            if (!row.isNew && row.label.trim()) {
                              updateMachineSlot(machine.id, row.slotId, { label: row.label.trim() });
                            }
                          }}
                          placeholder="es. Spirale A1, Canestro 1"
                          className="w-full px-3 py-1.5 font-mono font-bold text-sm text-stone-900 bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    {/* 2. Nome del Prodotto */}
                    <div className="md:col-span-5">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-2xs font-bold text-stone-600 uppercase tracking-wide">
                          Nome Prodotto Associato
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
                          placeholder="Nome prodotto (es. Coca Cola 33cl)"
                          className="w-full px-3 py-1.5 font-medium text-sm text-stone-900 bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                        />
                      </div>

                      {/* Dropdown rapido per selezionare prodotto da catalogo esistente */}
                      {isPickerOpen && (
                        <div className="mt-2 p-2 bg-white rounded-lg border border-amber-300 shadow-lg max-h-48 overflow-y-auto text-xs z-20 animate-in fade-in">
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
                      <label className="block text-2xs font-bold text-stone-600 uppercase tracking-wide mb-1">
                        Quantità Max (pz)
                      </label>
                      <div className="flex items-center space-x-1">
                        <input
                          id={`input-spiral-capacity-${row.slotId}`}
                          type="number"
                          min="1"
                          max="999"
                          value={row.capacity}
                          onChange={(e) => handleRowChange(row.slotId, 'capacity', parseInt(e.target.value) || 1)}
                          className="w-full px-2.5 py-1.5 font-extrabold text-sm text-center text-stone-900 bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                        />
                        <span className="text-2xs text-stone-500 font-medium">pz</span>
                      </div>
                    </div>

                    {/* 4. Prezzo di Vendita (€) */}
                    <div className="md:col-span-1">
                      <label className="block text-2xs font-bold text-stone-600 uppercase tracking-wide mb-1">
                        Prezzo (€)
                      </label>
                      <input
                        id={`input-spiral-price-${row.slotId}`}
                        type="number"
                        step="0.10"
                        min="0.10"
                        value={row.salePrice}
                        onChange={(e) => handleRowChange(row.slotId, 'salePrice', parseFloat(e.target.value) || 0.1)}
                        className="w-full px-2 py-1.5 font-bold text-xs text-center text-stone-900 bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      />
                    </div>

                    {/* 5. Tasto Elimina Spirale */}
                    <div className="md:col-span-1 flex items-center justify-end pt-3 md:pt-0">
                      <button
                        id={`btn-delete-spiral-${row.slotId}`}
                        type="button"
                        onClick={() => handleRemoveRow(row.slotId)}
                        title="Elimina questa spirale"
                        className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Informazione scorta e alert per questa spirale */}
                  <div className="flex flex-wrap items-center justify-between text-2xs text-stone-500 pt-1 border-t border-stone-200/50">
                    <div className="flex items-center space-x-3">
                      <span>
                        Giacenza attuale: <strong className="text-stone-700">{row.currentStock} pz</strong>
                      </span>
                      <span className="text-stone-300">•</span>
                      <span>
                        Soglia allarme rifornimento:
                        <input
                          type="number"
                          min="0"
                          value={row.alertThreshold}
                          onChange={(e) => handleRowChange(row.slotId, 'alertThreshold', parseInt(e.target.value) || 0)}
                          className="w-12 ml-1 px-1 py-0.5 text-center text-xs border border-stone-300 rounded bg-white"
                        /> pz
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
                <p className="text-sm font-semibold text-stone-600">Nessuna spirale trovata con questo termine di ricerca</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs text-amber-700 font-semibold hover:underline"
                >
                  Mostra tutte le spirali
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-stone-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-stone-400">
            <span>Le modifiche avranno effetto immediato in tutte le schermate operative.</span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              id="btn-cancel-edit-spirals"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              Annulla
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
                  <span>Salva Modifiche Spirali & Prodotti</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
