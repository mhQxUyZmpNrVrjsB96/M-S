import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Tag,
} from 'lucide-react';
import { PurchaseBatch } from '../../types';
import { UpdatePurchaseInput } from '../../context/VendingContext';
import { formatEuro, roundUnitCost, oggiLocale } from '../../utils/vendingUtils';
import { InteractiveDatePicker } from './InteractiveDatePicker';
import { SmartNumberInput } from './SmartNumberInput';

interface EditBatchModalProps {
  batch: PurchaseBatch;
  productUnit?: string;
  onClose: () => void;
  onSave: (batchId: string, updates: UpdatePurchaseInput) => void;
  onDelete: (batchId: string) => void;
}

const toDateInputValue = (isoOrYmd?: string): string => {
  if (!isoOrYmd) return oggiLocale();
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrYmd)) return isoOrYmd;
  const d = new Date(isoOrYmd);
  if (isNaN(d.getTime())) return oggiLocale();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const EditBatchModal: React.FC<EditBatchModalProps> = ({
  batch,
  productUnit = 'pz',
  onClose,
  onSave,
  onDelete,
}) => {
  const [date, setDate] = useState<string>(() => toDateInputValue(batch.date));
  const [batchNumber, setBatchNumber] = useState<string>(batch.batchNumber || '');
  const [invoiceRef, setInvoiceRef] = useState<string>(batch.invoiceRef || '');
  const [supplier, setSupplier] = useState<string>(batch.supplier || '');
  const [packageCount, setPackageCount] = useState<number>(batch.packageCount || 1);
  const [unitsPerPackage, setUnitsPerPackage] = useState<number>(batch.unitsPerPackage || batch.totalUnits || 1);
  const [remainingUnits, setRemainingUnits] = useState<number>(batch.remainingUnits ?? 0);
  const [priceInputType, setPriceInputType] = useState<'per_confezione' | 'per_pezzo' | 'totale'>(
    batch.priceInputType || 'per_pezzo'
  );
  const [isPriceWithoutVat, setIsPriceWithoutVat] = useState<boolean>(batch.isPriceWithoutVat !== false);
  const [inputPrice, setInputPrice] = useState<number>(batch.inputPrice ?? 0);
  const [vatRate, setVatRate] = useState<number>(batch.vatRate ?? 22);
  const [expiryDate, setExpiryDate] = useState<string>(() =>
    batch.expiryDate ? toDateInputValue(batch.expiryDate) : ''
  );
  const [notes, setNotes] = useState<string>(batch.notes || '');
  const [confirmingDelete, setConfirmingDelete] = useState<boolean>(false);

  useEffect(() => {
    setDate(toDateInputValue(batch.date));
    setBatchNumber(batch.batchNumber || '');
    setInvoiceRef(batch.invoiceRef || '');
    setSupplier(batch.supplier || '');
    setPackageCount(batch.packageCount || 1);
    setUnitsPerPackage(batch.unitsPerPackage || batch.totalUnits || 1);
    setRemainingUnits(batch.remainingUnits ?? 0);
    setPriceInputType(batch.priceInputType || 'per_pezzo');
    setIsPriceWithoutVat(batch.isPriceWithoutVat !== false);
    setInputPrice(batch.inputPrice ?? 0);
    setVatRate(batch.vatRate ?? 22);
    setExpiryDate(batch.expiryDate ? toDateInputValue(batch.expiryDate) : '');
    setNotes(batch.notes || '');
    setConfirmingDelete(false);
  }, [batch]);

  const safePackages = Math.max(1, Number(packageCount) || 1);
  const safeUnitsPerPkg = Math.max(1, Number(unitsPerPackage) || 1);
  const totalUnits = safePackages * safeUnitsPerPkg;
  const safePrice = Math.max(0, Number(inputPrice) || 0);
  const safeVat = Math.max(0, Number(vatRate) || 0);

  let totalTaxable = 0;
  let totalGross = 0;

  if (priceInputType === 'per_pezzo') {
    if (isPriceWithoutVat) {
      totalTaxable = safePrice * totalUnits;
      totalGross = totalTaxable * (1 + safeVat / 100);
    } else {
      totalGross = safePrice * totalUnits;
      totalTaxable = totalGross / (1 + safeVat / 100);
    }
  } else if (priceInputType === 'per_confezione') {
    if (isPriceWithoutVat) {
      totalTaxable = safePrice * safePackages;
      totalGross = totalTaxable * (1 + safeVat / 100);
    } else {
      totalGross = safePrice * safePackages;
      totalTaxable = totalGross / (1 + safeVat / 100);
    }
  } else {
    if (isPriceWithoutVat) {
      totalTaxable = safePrice;
      totalGross = totalTaxable * (1 + safeVat / 100);
    } else {
      totalGross = safePrice;
      totalTaxable = totalGross / (1 + safeVat / 100);
    }
  }

  const totalVat = Math.max(0, totalGross - totalTaxable);
  const unitCostNet = totalUnits > 0 ? roundUnitCost(totalTaxable / totalUnits) : 0;
  const unitCostWithVat = totalUnits > 0 ? roundUnitCost(totalGross / totalUnits) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(batch.id, {
      date: date || oggiLocale(),
      batchNumber: batchNumber.trim() || batch.batchNumber,
      invoiceRef: invoiceRef.trim(),
      supplier: supplier.trim() || '-',
      packageCount: safePackages,
      unitsPerPackage: safeUnitsPerPkg,
      remainingUnits: Math.max(0, Number(remainingUnits) || 0),
      priceInputType,
      isPriceWithoutVat,
      inputPrice: safePrice,
      vatRate: safeVat,
      costBasisUsed: batch.costBasisUsed || 'ivato',
      expiryDate: expiryDate.trim() || undefined,
      notes: notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full max-h-[94dvh] sm:max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="shrink-0 px-4 sm:px-6 py-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Tag className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-stone-900 truncate">
                Modifica Lotto • {batch.productName}
              </h3>
              <p className="text-2xs text-stone-500 font-mono truncate">
                {batch.batchNumber} {batch.invoiceRef ? `• ${batch.invoiceRef}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-200/60 cursor-pointer shrink-0"
            title="Chiudi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3.5 text-sm overscroll-contain">
            {/* Data e Codice Lotto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <InteractiveDatePicker
                  id="edit-batch-date-input"
                  label="Data Lotto / Fattura"
                  value={date}
                  onChange={(newDate) => setDate(newDate)}
                  required={true}
                  showShortcuts={false}
                />
              </div>
              <div>
                <label className="block text-2xs font-bold text-stone-700 mb-1">
                  Codice Lotto
                </label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-stone-300 rounded-lg text-stone-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            {/* Fornitore e Rif. Fattura */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-2xs font-bold text-stone-700 mb-1">
                  Fornitore
                </label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Es. Metro, Sogegross..."
                  className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg text-stone-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-2xs font-bold text-stone-700 mb-1">
                  Rif. Fattura / DDT
                </label>
                <input
                  type="text"
                  value={invoiceRef}
                  onChange={(e) => setInvoiceRef(e.target.value)}
                  placeholder="Es. 028990"
                  className="w-full px-3 py-1.5 text-xs font-mono border border-stone-300 rounded-lg text-stone-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Quantità Totali & Residui Magazzino */}
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-stone-800">Quantità Lotto</span>
                <span className="text-xs font-bold text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Totale lotto: {totalUnits} {productUnit}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-3xs font-semibold text-stone-600 mb-1">N° Confezioni</label>
                  <SmartNumberInput
                    min={1}
                    value={packageCount}
                    defaultValueIfEmpty={1}
                    onChange={(val) => setPackageCount(Math.max(1, Number(val) || 1))}
                    className="w-full px-2 py-1.5 text-xs font-bold border border-stone-300 rounded-lg text-stone-900 bg-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-3xs font-semibold text-stone-600 mb-1">Pz / Conf.</label>
                  <SmartNumberInput
                    min={1}
                    value={unitsPerPackage}
                    defaultValueIfEmpty={1}
                    onChange={(val) => setUnitsPerPackage(Math.max(1, Number(val) || 1))}
                    className="w-full px-2 py-1.5 text-xs font-bold border border-stone-300 rounded-lg text-stone-900 bg-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-3xs font-semibold text-emerald-800 mb-1">
                    Residui Mag.
                  </label>
                  <SmartNumberInput
                    min={0}
                    value={remainingUnits}
                    defaultValueIfEmpty={0}
                    onChange={(val) => setRemainingUnits(Math.max(0, Number(val) || 0))}
                    className="w-full px-2 py-1.5 text-xs font-black border border-emerald-400 rounded-lg text-emerald-950 bg-emerald-50 text-center"
                  />
                </div>
              </div>
              {remainingUnits !== totalUnits && (
                <div className="flex items-center justify-between text-3xs text-stone-500">
                  <span>
                    Consumati / caricati da questo lotto: <strong>{Math.max(0, totalUnits - remainingUnits)} {productUnit}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setRemainingUnits(totalUnits)}
                    className="text-emerald-700 hover:underline font-semibold cursor-pointer"
                  >
                    Riporta residui a {totalUnits}
                  </button>
                </div>
              )}
            </div>

            {/* Prezzo e IVA */}
            <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="text-xs font-bold text-emerald-950">Prezzo di Acquisto</span>
                <div className="inline-flex rounded border border-emerald-300 bg-white p-0.5 text-3xs shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setPriceInputType('per_pezzo')}
                    className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                      priceInputType === 'per_pezzo' ? 'bg-emerald-600 text-white font-bold' : 'text-stone-600'
                    }`}
                  >
                    Al Pezzo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceInputType('per_confezione')}
                    className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                      priceInputType === 'per_confezione' ? 'bg-emerald-600 text-white font-bold' : 'text-stone-600'
                    }`}
                  >
                    A Confezione
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceInputType('totale')}
                    className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                      priceInputType === 'totale' ? 'bg-emerald-600 text-white font-bold' : 'text-stone-600'
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
                    onClick={() => setIsPriceWithoutVat(true)}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                      isPriceWithoutVat ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Senza IVA (Netto)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPriceWithoutVat(false)}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                      !isPriceWithoutVat ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Con IVA (Ivato)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-3xs font-semibold text-stone-700 mb-1">
                    {priceInputType === 'per_pezzo'
                      ? `Prezzo al Pezzo (${isPriceWithoutVat ? 'senza IVA' : 'con IVA'}) (€)`
                      : priceInputType === 'per_confezione'
                      ? `Prezzo a Conf. (${isPriceWithoutVat ? 'senza IVA' : 'con IVA'}) (€)`
                      : `Prezzo Totale (${isPriceWithoutVat ? 'senza IVA' : 'con IVA'}) (€)`}
                  </label>
                  <SmartNumberInput
                    step="0.001"
                    min={0}
                    allowDecimals={true}
                    value={inputPrice}
                    defaultValueIfEmpty={0}
                    onChange={(val) => setInputPrice(Math.max(0, Number(val) || 0))}
                    className="w-full px-3 py-1.5 text-xs font-black border border-emerald-300 rounded-lg text-stone-900 bg-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-3xs font-semibold text-stone-700 mb-1">Aliquota IVA</label>
                  <select
                    value={vatRate}
                    onChange={(e) => setVatRate(parseFloat(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs font-semibold border border-emerald-300 rounded-lg text-stone-900 bg-white"
                  >
                    <option value={22}>22% (Bevande, snack)</option>
                    <option value={10}>10% (Caffè / alimentari)</option>
                    <option value={4}>4% (Beni prima nec.)</option>
                    <option value={0}>0% (Esente)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs bg-emerald-100/90 p-2.5 rounded-lg border border-emerald-300">
                <div>
                  <span className="font-extrabold text-emerald-950 block">Totale IVA Compresa:</span>
                  <span className="text-3xs text-emerald-800 font-mono">
                    Imp.: {formatEuro(totalTaxable)} + IVA: {formatEuro(totalVat)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-emerald-900 text-base block">
                    {formatEuro(totalGross)}
                  </span>
                  <span className="text-3xs font-bold text-emerald-800">
                    Ivato: {formatEuro(unitCostWithVat)} / {productUnit} (netto: {formatEuro(unitCostNet)})
                  </span>
                </div>
              </div>
            </div>

            {/* Scadenza e Note */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <InteractiveDatePicker
                  id="edit-batch-expiry-input"
                  label="Data di Scadenza (opzionale)"
                  value={expiryDate}
                  onChange={(newDate) => setExpiryDate(newDate)}
                  required={false}
                  showShortcuts={false}
                />
                {expiryDate && (
                  <button
                    type="button"
                    onClick={() => setExpiryDate('')}
                    className="mt-1 text-3xs text-stone-500 hover:text-rose-600 underline cursor-pointer"
                  >
                    Rimuovi scadenza
                  </button>
                )}
              </div>
              <div>
                <label className="block text-2xs font-bold text-stone-700 mb-1">
                  Note (opzionale)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Note sul lotto..."
                  className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg text-stone-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Conferma eliminazione inline */}
            {confirmingDelete && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 space-y-2 animate-in fade-in">
                <div className="flex items-start space-x-2 text-xs text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    Eliminare definitivamente il lotto <strong>{batch.batchNumber}</strong> ({batch.remainingUnits} {productUnit} residui in magazzino)? Le scorte del prodotto verranno ricalcolate automaticamente.
                  </span>
                </div>
                <div className="flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-stone-600 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg cursor-pointer"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(batch.id)}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs inline-flex items-center space-x-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sì, Elimina Lotto</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-4 sm:px-6 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2">
            {!confirmingDelete ? (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Elimina Lotto</span>
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-stone-600 hover:text-stone-800 text-xs font-semibold cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salva Modifiche</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
