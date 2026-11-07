import React from 'react';
import { 
  Warehouse, 
  X, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  AlertTriangle,
  Package
} from 'lucide-react';
import { formatEuro } from '../../utils/vendingUtils';

export interface WarehouseConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type?: 'stock' | 'batch' | 'product_delete' | 'product_edit';
  productName: string;
  unit: string;
  oldValue: number;
  newValue: number;
  unitCost?: number;
  batchNumber?: string;
  invoiceRef?: string;
}

export const WarehouseConfirmModal: React.FC<WarehouseConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  type = 'stock',
  productName,
  unit,
  oldValue,
  newValue,
  unitCost = 0,
  batchNumber,
  invoiceRef,
}) => {
  if (!isOpen) return null;

  const diff = newValue - oldValue;
  const isIncrease = diff > 0;
  const isDecrease = diff < 0;

  const oldTotalCost = oldValue * unitCost;
  const newTotalCost = newValue * unitCost;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="warehouse-confirm-title"
      >
        {/* Header Modale */}
        <div className="px-6 py-5 border-b border-stone-200 bg-gradient-to-r from-stone-50 via-amber-50/40 to-stone-50 flex items-start justify-between gap-4">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-amber-500 text-stone-950 font-bold shadow-xs">
              <Warehouse className="w-5 h-5" />
            </span>
            <div>
              <h2 id="warehouse-confirm-title" className="text-lg font-bold text-stone-900">
                Conferma Modifica Magazzino
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Richiesta di conferma prima di applicare la variazione
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenuto Report Modifica */}
        <div className="p-6 space-y-5">
          {/* Prodotto e Dettagli */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-bold text-stone-500 uppercase tracking-wide">
                Articolo Magazzino
              </span>
              {batchNumber && (
                <span className="text-2xs font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                  Lotto: {batchNumber} {invoiceRef ? `(${invoiceRef})` : ''}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-stone-400" />
              <h3 className="font-extrabold text-base text-stone-900">
                {productName}
              </h3>
            </div>

            {/* Confronto Prima -> Dopo */}
            <div className="pt-2 border-t border-stone-200/80 flex items-center justify-between gap-3">
              <div className="bg-white border border-stone-200 rounded-xl p-3 flex-1 text-center">
                <span className="text-3xs text-stone-400 block uppercase font-semibold">
                  Giacenza Precedente
                </span>
                <span className="text-base font-bold text-stone-700 mt-0.5 block">
                  {oldValue} <span className="text-xs font-normal text-stone-500">{unit}</span>
                </span>
                {unitCost > 0 && (
                  <span className="text-3xs text-stone-400 block mt-0.5">
                    valore {formatEuro(oldTotalCost)}
                  </span>
                )}
              </div>

              <div className="flex flex-col items-center justify-center shrink-0">
                <ArrowRight className="w-4 h-4 text-stone-400" />
                <span className={`text-2xs font-extrabold mt-0.5 ${
                  isIncrease ? 'text-emerald-700' : (isDecrease ? 'text-rose-700' : 'text-stone-500')
                }`}>
                  {diff > 0 ? `+${diff}` : diff} {unit}
                </span>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex-1 text-center">
                <span className="text-3xs text-amber-800 block uppercase font-bold">
                  Nuova Giacenza
                </span>
                <span className="text-base font-extrabold text-amber-950 mt-0.5 block">
                  {newValue} <span className="text-xs font-bold text-amber-800">{unit}</span>
                </span>
                {unitCost > 0 && (
                  <span className="text-3xs text-amber-800 block mt-0.5 font-medium">
                    valore {formatEuro(newTotalCost)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Salvataggio Automatico Copia Precedente */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start space-x-3 text-emerald-950">
            <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-2xs leading-relaxed">
              <span className="font-bold block text-emerald-900 text-xs">
                Copia del file precedente salvata in automatico
              </span>
              Confermando questa modifica, il sistema salverà una copia esatta del file prima della modifica nei punti di ripristino.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-200/60 font-bold text-xs transition-colors cursor-pointer"
          >
            Annulla
          </button>

          <button
            type="button"
            id="btn-confirm-warehouse-change"
            onClick={onConfirm}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Conferma Modifica Magazzino</span>
          </button>
        </div>
      </div>
    </div>
  );
};
