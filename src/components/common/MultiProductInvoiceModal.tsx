import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Trash2,
  Search,
  Check,
  ChevronDown,
  X,
  AlertCircle,
  Package,
} from 'lucide-react';
import { Product } from '../../types';
import { CreatePurchaseInput } from '../../context/VendingContext';
import { formatEuro, oggiLocale, roundUnitCost } from '../../utils/vendingUtils';
import { InteractiveDatePicker } from './InteractiveDatePicker';
import { SmartNumberInput } from './SmartNumberInput';
import { ConfirmUnsavedModal } from './ConfirmUnsavedModal';

interface MultiProductInvoiceModalProps {
  isOpen: boolean;
  products: Product[];
  existingSuppliers?: string[];
  onClose: () => void;
  onSave: (inputs: CreatePurchaseInput[]) => void;
}

interface InvoiceRowState {
  rowId: string;
  productId: string;
  packageCount: number | '';
  unitsPerPackage: number | '';
  priceInputType: 'per_pezzo' | 'per_confezione' | 'totale';
  isPriceWithoutVat: boolean;
  inputPrice: number | '';
  vatRate: number;
  expiryDate: string;
}

const createEmptyRow = (
  defaultPriceInputType: 'per_pezzo' | 'per_confezione' | 'totale' = 'per_pezzo',
  defaultIsWithoutVat: boolean = true
): InvoiceRowState => ({
  rowId: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  productId: '',
  packageCount: '',
  unitsPerPackage: '',
  priceInputType: defaultPriceInputType,
  isPriceWithoutVat: defaultIsWithoutVat,
  inputPrice: '',
  vatRate: 22,
  expiryDate: '',
});

const computeRowTotals = (row: InvoiceRowState) => {
  const packages = Number(row.packageCount) || 0;
  const unitsPerPkg = Number(row.unitsPerPackage) || 0;
  const totalUnits = packages * unitsPerPkg;
  const price = Number(row.inputPrice) || 0;
  const vat = Number(row.vatRate) || 0;

  let taxable = 0;
  let gross = 0;

  if (row.priceInputType === 'per_pezzo') {
    if (row.isPriceWithoutVat) {
      taxable = price * totalUnits;
      gross = taxable * (1 + vat / 100);
    } else {
      gross = price * totalUnits;
      taxable = gross / (1 + vat / 100);
    }
  } else if (row.priceInputType === 'per_confezione') {
    if (row.isPriceWithoutVat) {
      taxable = price * packages;
      gross = taxable * (1 + vat / 100);
    } else {
      gross = price * packages;
      taxable = gross / (1 + vat / 100);
    }
  } else {
    if (row.isPriceWithoutVat) {
      taxable = price;
      gross = taxable * (1 + vat / 100);
    } else {
      gross = price;
      taxable = gross / (1 + vat / 100);
    }
  }

  const unitNet = totalUnits > 0 ? roundUnitCost(taxable / totalUnits) : 0;
  const unitGross = totalUnits > 0 ? roundUnitCost(gross / totalUnits) : 0;

  return {
    totalUnits,
    taxable,
    vatAmount: Math.max(0, gross - taxable),
    gross,
    unitNet,
    unitGross,
  };
};

interface ProductSearchSelectProps {
  products: Product[];
  selectedProductId: string;
  onSelect: (product: Product) => void;
}

const ProductSearchSelect: React.FC<ProductSearchSelectProps> = ({
  products,
  selectedProductId,
  onSelect,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedProduct = useMemo(
    () => products.find(p => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name, 'it'));
    if (!q) return sorted;
    return sorted.filter(p => p.name.toLowerCase().includes(q));
  }, [products, query]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setQuery('');
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left rounded-xl border text-xs sm:text-sm transition-colors cursor-pointer ${
          selectedProduct
            ? 'bg-white border-stone-300 text-stone-950 font-bold hover:border-emerald-500'
            : 'bg-amber-50/70 border-amber-300 text-amber-950 font-semibold hover:border-amber-400'
        }`}
      >
        <span className="truncate">
          {selectedProduct ? selectedProduct.name : 'Seleziona o cerca un prodotto...'}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {selectedProduct && (
            <span className="text-3xs font-mono tabular-nums text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
              {selectedProduct.warehouseStock || 0} {selectedProduct.unit}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1.5 z-40 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-stone-100 bg-stone-50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Scrivi il nome del prodotto (es. Coca, Fanta)..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-emerald-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto divide-y divide-stone-100">
            {filteredProducts.length === 0 ? (
              <div className="p-3 text-center text-xs text-stone-500">
                Nessun prodotto trovato per &ldquo;{query.trim()}&rdquo;
              </div>
            ) : (
              filteredProducts.map(product => {
                const isSelected = product.id === selectedProductId;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      onSelect(product);
                      setOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-950 font-bold'
                        : 'hover:bg-stone-50 text-stone-800'
                    }`}
                  >
                    <span className="truncate flex items-center gap-1.5">
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      <span className="truncate">{product.name}</span>
                    </span>
                    <span className="text-3xs font-mono tabular-nums text-stone-500 shrink-0">
                      Mag: {product.warehouseStock || 0} {product.unit}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const MultiProductInvoiceModal: React.FC<MultiProductInvoiceModalProps> = ({
  isOpen,
  products,
  existingSuppliers = [],
  onClose,
  onSave,
}) => {
  const activeProducts = useMemo(() => products.filter(p => !p.archived), [products]);

  const [supplier, setSupplier] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [date, setDate] = useState<string>(() => oggiLocale());
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<InvoiceRowState[]>(() => [createEmptyRow()]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

  // Reset pulito ogni volta che la modale si apre
  useEffect(() => {
    if (isOpen) {
      setSupplier('');
      setInvoiceRef('');
      setDate(oggiLocale());
      setNotes('');
      setRows([createEmptyRow()]);
      setValidationError(null);
      setShowUnsavedConfirm(false);
    }
  }, [isOpen]);

  const isDirty = useMemo(() => {
    if (supplier.trim() !== '' || invoiceRef.trim() !== '' || notes.trim() !== '') return true;
    return rows.some(
      r =>
        r.productId !== '' ||
        r.packageCount !== '' ||
        r.unitsPerPackage !== '' ||
        r.inputPrice !== '' ||
        r.expiryDate !== ''
    );
  }, [supplier, invoiceRef, notes, rows]);

  const grandTotals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const calc = computeRowTotals(row);
        acc.totalUnits += calc.totalUnits;
        acc.taxable += calc.taxable;
        acc.vatAmount += calc.vatAmount;
        acc.gross += calc.gross;
        return acc;
      },
      { totalUnits: 0, taxable: 0, vatAmount: 0, gross: 0 }
    );
  }, [rows]);

  if (!isOpen) return null;

  const updateRow = (rowId: string, patch: Partial<InvoiceRowState>) => {
    setRows(prev => prev.map(r => (r.rowId === rowId ? { ...r, ...patch } : r)));
    if (validationError) setValidationError(null);
  };

  const handleSelectProduct = (rowId: string, product: Product) => {
    updateRow(rowId, {
      productId: product.id,
      vatRate: product.category === 'caffe_calde' ? 10 : 22,
    });
  };

  const handleAddRow = () => {
    const lastRow = rows[rows.length - 1];
    const nextRow = createEmptyRow(
      lastRow?.priceInputType || 'per_pezzo',
      lastRow?.isPriceWithoutVat ?? true
    );
    setRows(prev => [...prev, nextRow]);
    setTimeout(() => {
      bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const handleRemoveRow = (rowId: string) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter(r => r.rowId !== rowId));
  };

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!invoiceRef.trim()) {
      setValidationError('Inserisci il numero di Fattura / DDT prima di salvare.');
      return;
    }
    if (!supplier.trim()) {
      setValidationError('Inserisci il nome del Fornitore prima di salvare.');
      return;
    }

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.productId) {
        setValidationError(`Riga #${i + 1}: seleziona un prodotto dall'elenco.`);
        return;
      }
      const pkgs = Number(r.packageCount) || 0;
      const units = Number(r.unitsPerPackage) || 0;
      if (pkgs <= 0 || units <= 0) {
        const prod = activeProducts.find(p => p.id === r.productId);
        setValidationError(`Riga #${i + 1} (${prod?.name || 'Prodotto'}): inserisci N° Confezioni e Pezzi per Confezione maggiori di 0.`);
        return;
      }
      if (r.inputPrice === '' || Number(r.inputPrice) <= 0) {
        const prod = activeProducts.find(p => p.id === r.productId);
        setValidationError(`Riga #${i + 1} (${prod?.name || 'Prodotto'}): inserisci il prezzo di acquisto.`);
        return;
      }
    }

    const inputs: CreatePurchaseInput[] = rows.map(r => {
      const prod = activeProducts.find(p => p.id === r.productId);
      return {
        productId: r.productId,
        productName: prod?.name || 'Prodotto',
        supplier: supplier.trim(),
        packageCount: Number(r.packageCount) || 1,
        unitsPerPackage: Number(r.unitsPerPackage) || 1,
        priceInputType: r.priceInputType,
        isPriceWithoutVat: r.isPriceWithoutVat,
        inputPrice: Number(r.inputPrice) || 0,
        vatRate: r.vatRate,
        invoiceRef: invoiceRef.trim(),
        date,
        expiryDate: r.expiryDate,
        notes: notes.trim(),
      };
    });

    onSave(inputs);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-3xl w-full max-h-[94dvh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 my-auto"
        >
          {/* Header fisso */}
          <div className="shrink-0 px-4 sm:px-6 py-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-stone-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600 shrink-0" />
                Nuova Fattura Multi-Prodotto
              </h3>
              <p className="text-3xs sm:text-2xs text-stone-500 mt-0.5">
                Inserisci una volta fornitore e numero fattura, poi aggiungi tutti i prodotti: i lotti verranno caricati in automatico.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAttemptClose}
              className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer"
              title="Chiudi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Corpo scorrevole */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5">
            {/* 1. Testata unica Fattura */}
            <div className="bg-stone-50/90 p-3.5 sm:p-4 rounded-xl border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-stone-800 uppercase tracking-wide">
                  1. Dati Fattura / DDT
                </span>
                <span className="text-3xs text-stone-500 font-medium">
                  Validi per tutti i prodotti inseriti sotto
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-stone-700 mb-1">Fornitore *</label>
                  <input
                    type="text"
                    list="multi-invoice-suppliers-list"
                    value={supplier}
                    onChange={e => {
                      setSupplier(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="es. Metro, Cash & Carry..."
                    className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg text-stone-900 bg-white focus:border-emerald-500 focus:outline-hidden"
                    required
                  />
                  {existingSuppliers.length > 0 && (
                    <datalist id="multi-invoice-suppliers-list">
                      {existingSuppliers.map(s => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  )}
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 mb-1">Fattura / DDT N° *</label>
                  <input
                    type="text"
                    value={invoiceRef}
                    onChange={e => {
                      setInvoiceRef(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="es. 123"
                    className="w-full px-3 py-1.5 text-xs font-mono border border-stone-300 rounded-lg text-stone-900 bg-white focus:border-emerald-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <InteractiveDatePicker
                    id="multi-invoice-date-input"
                    label="Data Acquisto"
                    value={date}
                    onChange={newDate => setDate(newDate)}
                    required
                    showShortcuts={true}
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-stone-700 mb-1">
                  Note fattura (opzionale)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Eventuali note condivise per i lotti di questa fattura..."
                  className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg text-stone-900 bg-white focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* 2. Righe Prodotti */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-stone-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-600" />
                  2. Prodotti nella Fattura ({rows.length})
                </span>
                <span className="text-3xs text-stone-500">
                  Ogni riga creerà il lotto nel prodotto corrispondente
                </span>
              </div>

              {rows.map((row, idx) => {
                const selectedProd = activeProducts.find(p => p.id === row.productId);
                const unitLabel = selectedProd?.unit || 'pz';
                const calc = computeRowTotals(row);

                return (
                  <div
                    key={row.rowId}
                    className="bg-white rounded-xl border border-stone-200 p-3.5 sm:p-4 space-y-3 shadow-2xs"
                  >
                    {/* Intestazione riga: #numero + Selettore prodotto ricercabile + Elimina riga */}
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono tabular-nums text-xs font-black bg-stone-900 text-amber-300 px-2.5 py-1.5 rounded-lg shrink-0">
                        #{idx + 1}
                      </span>

                      <ProductSearchSelect
                        products={activeProducts}
                        selectedProductId={row.productId}
                        onSelect={prod => handleSelectProduct(row.rowId, prod)}
                      />

                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.rowId)}
                          className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Rimuovi questa riga dalla fattura"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Quantità Confezioni x Pezzi (stessa impostazione attuale) */}
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-stone-800">Quantità Caricata nel Lotto</span>
                        <span className="text-xs font-bold text-blue-700 font-mono tabular-nums bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          Totale: {calc.totalUnits} {unitLabel}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-3xs font-semibold text-stone-600 mb-1">N° Confezioni</label>
                          <SmartNumberInput
                            min={1}
                            value={row.packageCount}
                            defaultValueIfEmpty=""
                            allowEmpty={true}
                            placeholder=""
                            onChange={val => updateRow(row.rowId, { packageCount: val })}
                            className="w-full px-3 py-1.5 text-xs font-bold border border-stone-300 rounded-lg text-stone-900 bg-white text-center"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-3xs font-semibold text-stone-600 mb-1">Pezzi per Confezione</label>
                          <SmartNumberInput
                            min={1}
                            value={row.unitsPerPackage}
                            defaultValueIfEmpty=""
                            allowEmpty={true}
                            placeholder=""
                            onChange={val => updateRow(row.rowId, { unitsPerPackage: val })}
                            className="w-full px-3 py-1.5 text-xs font-bold border border-stone-300 rounded-lg text-stone-900 bg-white text-center"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Prezzo e IVA (stessa impostazione attuale) */}
                    <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <span className="text-xs font-bold text-emerald-950">Prezzo di Acquisto Fornitore</span>
                        <div className="inline-flex rounded border border-emerald-300 bg-white p-0.5 text-3xs shadow-2xs self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => updateRow(row.rowId, { priceInputType: 'per_pezzo' })}
                            className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                              row.priceInputType === 'per_pezzo'
                                ? 'bg-emerald-600 text-white font-bold'
                                : 'text-stone-600'
                            }`}
                          >
                            Al Pezzo
                          </button>
                          <button
                            type="button"
                            onClick={() => updateRow(row.rowId, { priceInputType: 'per_confezione' })}
                            className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                              row.priceInputType === 'per_confezione'
                                ? 'bg-emerald-600 text-white font-bold'
                                : 'text-stone-600'
                            }`}
                          >
                            A Confezione
                          </button>
                          <button
                            type="button"
                            onClick={() => updateRow(row.rowId, { priceInputType: 'totale' })}
                            className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                              row.priceInputType === 'totale'
                                ? 'bg-emerald-600 text-white font-bold'
                                : 'text-stone-600'
                            }`}
                          >
                            Totale
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-white/90 px-2.5 py-1.5 rounded-lg border border-emerald-200 text-3xs">
                        <span className="font-bold text-stone-700">Base Prezzo:</span>
                        <div className="inline-flex rounded bg-stone-100 p-0.5 border border-stone-200">
                          <button
                            type="button"
                            onClick={() => updateRow(row.rowId, { isPriceWithoutVat: true })}
                            className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                              row.isPriceWithoutVat
                                ? 'bg-emerald-700 text-white'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            Senza IVA (Netto)
                          </button>
                          <button
                            type="button"
                            onClick={() => updateRow(row.rowId, { isPriceWithoutVat: false })}
                            className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                              !row.isPriceWithoutVat
                                ? 'bg-emerald-700 text-white'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            Con IVA (Ivato)
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-3xs font-semibold text-stone-700 mb-1">
                            {row.priceInputType === 'per_pezzo'
                              ? `Prezzo al Pezzo (${row.isPriceWithoutVat ? 'senza IVA' : 'con IVA'}) (€)`
                              : row.priceInputType === 'per_confezione'
                              ? `Prezzo a Conf. (${row.isPriceWithoutVat ? 'senza IVA' : 'con IVA'}) (€)`
                              : `Prezzo Totale (${row.isPriceWithoutVat ? 'senza IVA' : 'con IVA'}) (€)`}
                          </label>
                          <SmartNumberInput
                            step="0.001"
                            min={0.001}
                            allowDecimals={true}
                            value={row.inputPrice}
                            defaultValueIfEmpty=""
                            allowEmpty={true}
                            placeholder=""
                            onChange={val => updateRow(row.rowId, { inputPrice: val })}
                            className="w-full px-3 py-1.5 text-xs font-black border border-emerald-300 rounded-lg text-stone-900 bg-white text-center"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-3xs font-semibold text-stone-700 mb-1">Aliquota IVA</label>
                          <select
                            value={row.vatRate}
                            onChange={e => updateRow(row.rowId, { vatRate: parseFloat(e.target.value) })}
                            className="w-full px-2 py-1.5 text-xs font-semibold border border-emerald-300 rounded-lg text-stone-900 bg-white"
                          >
                            <option value={22}>22% (Bevande, snack)</option>
                            <option value={10}>10% (Caffè)</option>
                            <option value={4}>4% (Beni prima nec.)</option>
                            <option value={0}>0% (Esente)</option>
                          </select>
                        </div>

                        <div>
                          <InteractiveDatePicker
                            id={`multi-invoice-expiry-${row.rowId}`}
                            label="Scadenza (opz.)"
                            value={row.expiryDate}
                            onChange={newDate => updateRow(row.rowId, { expiryDate: newDate })}
                            required={false}
                            showShortcuts={false}
                          />
                        </div>
                      </div>

                      {/* Riepilogo singola riga */}
                      <div className="pt-2 border-t border-emerald-200/70 flex flex-wrap items-center justify-between gap-2 text-2xs bg-emerald-100/80 px-2.5 py-2 rounded-lg border border-emerald-200">
                        <span className="text-emerald-900 font-mono tabular-nums">
                          Imponibile: <strong>{formatEuro(calc.taxable)}</strong> + IVA: <strong>{formatEuro(calc.vatAmount)}</strong>
                        </span>
                        <span className="text-emerald-950 font-mono tabular-nums font-bold">
                          Subtotale ivato: <strong className="text-sm">{formatEuro(calc.gross)}</strong>
                          {calc.totalUnits > 0 && (
                            <span className="text-3xs font-semibold text-emerald-800 ml-1.5">
                              ({formatEuro(calc.unitGross)}/{unitLabel} ivato · {formatEuro(calc.unitNet)} netto)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Tasto aggiungi riga */}
              <button
                type="button"
                onClick={handleAddRow}
                className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Aggiungi un altro prodotto alla fattura</span>
              </button>

              <div ref={bottomAnchorRef} />
            </div>

            {validationError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          {/* Footer fisso con Totale Fattura + Salva */}
          <div className="shrink-0 px-4 sm:px-6 py-3.5 bg-stone-50 border-t border-stone-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-900 text-white px-4 py-2.5 rounded-xl">
              <div className="text-2xs">
                <span className="font-bold text-amber-300 uppercase tracking-wide block">
                  Totale Fattura ({rows.length} {rows.length === 1 ? 'prodotto' : 'prodotti'} · {grandTotals.totalUnits} pz)
                </span>
                <span className="text-stone-300 font-mono tabular-nums">
                  Imponibile: {formatEuro(grandTotals.taxable)} + IVA: {formatEuro(grandTotals.vatAmount)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-3xs text-stone-400 uppercase block">Totale IVA Compresa</span>
                <span className="font-mono tabular-nums font-black text-lg text-emerald-400">
                  {formatEuro(grandTotals.gross)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleAttemptClose}
                className="px-4 py-2 text-stone-600 hover:text-stone-900 text-xs font-semibold cursor-pointer"
              >
                Annulla
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>
                  Salva Fattura e Carica {rows.length} {rows.length === 1 ? 'Lotto' : 'Lotti'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <ConfirmUnsavedModal
        isOpen={showUnsavedConfirm}
        onCancelStay={() => setShowUnsavedConfirm(false)}
        onConfirmLeave={() => {
          setShowUnsavedConfirm(false);
          onClose();
        }}
        title="Chiudere senza salvare la fattura?"
        message="Hai già inserito dei dati per questa fattura. Se esci ora verranno persi."
      />
    </>
  );
};
