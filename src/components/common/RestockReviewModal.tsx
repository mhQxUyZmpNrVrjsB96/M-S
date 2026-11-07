import React, { useState } from 'react';
import { 
  CheckCircle2, 
  X, 
  ArrowRight, 
  Warehouse, 
  ShieldCheck, 
  Coins, 
  TrendingUp, 
  Package, 
  AlertTriangle,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { formatEuro } from '../../utils/vendingUtils';

export interface RestockReviewItem {
  slotId: string;
  slotLabel: string;
  productName: string;
  previousStock: number;
  countedRemaining: number;
  unitsSold: number;
  unitsRemoved?: number;
  returnToWarehouse?: boolean;
  addedStock: number;
  newStock: number;
  salePrice: number;
  revenue: number;
  profit: number;
  warehouseStock?: number;
  availableWarehouse?: number;
}

export interface RestockReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  machineName: string;
  machineCode: string;
  totals: {
    totalSold: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    totalAdded: number;
    totalAddedCost?: number;
    totalRemoved?: number;
    marginPct?: number;
  };
  cashWithdrawn?: number | '';
  items: RestockReviewItem[];
  unitTermLower?: string;
  unitTermPluralLower?: string;
}

export const RestockReviewModal: React.FC<RestockReviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  machineName,
  machineCode,
  totals,
  cashWithdrawn,
  items,
  unitTermLower = 'spirale',
  unitTermPluralLower = 'spirali',
}) => {
  const [filterOnlyModified, setFilterOnlyModified] = useState(true);

  if (!isOpen) return null;

  // Filtra solo le righe dove c'è stata una reale modifica
  const modifiedItems = items.filter(i => 
    i.countedRemaining !== i.previousStock || 
    (i.unitsSold || 0) > 0 || 
    (i.addedStock || 0) > 0 || 
    (i.unitsRemoved || 0) > 0
  );

  const displayedItems = filterOnlyModified ? modifiedItems : items;
  const cashNum = typeof cashWithdrawn === 'number' ? cashWithdrawn : 0;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        {/* Header Modale */}
        <div className="px-6 py-5 border-b border-stone-200 bg-gradient-to-r from-stone-50 via-amber-50/40 to-stone-50 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-amber-500 text-stone-950 font-bold shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              <div>
                <h2 id="report-modal-title" className="text-lg sm:text-xl font-extrabold text-stone-900">
                  Riepilogo e Report Modifiche
                </h2>
                <p className="text-xs text-stone-600 mt-0.5">
                  Verifica cosa è stato rilevato e caricato in <strong className="text-stone-900">{machineName}</strong> ({machineCode}) prima di salvare.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            title="Chiudi e torna alla compilazione"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo Scrollabile */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Badge Sicurezza: Copia precedente salvata automaticamente */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start space-x-3 text-emerald-950 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-xs leading-relaxed">
              <span className="font-bold block text-emerald-900 text-sm">
                Salvataggio di sicurezza automatico attivato
              </span>
              Nel momento in cui confermi, il sistema <strong className="text-emerald-950 underline">salverà automaticamente una copia identica del precedente file e stato</strong>. Se qualsiasi calcolo non ti convince o vuoi annullare, potrai ripristinare la copia precedente con 1 solo clic.
            </div>
          </div>

          {/* Schede KPI Totali */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 flex flex-col">
              <span className="text-2xs font-bold text-stone-500 uppercase tracking-wide">
                Venduti Rilevati
              </span>
              <span className="text-xl font-extrabold text-stone-900 mt-1">
                {totals.totalSold} <span className="text-xs font-normal text-stone-500">pz</span>
              </span>
              <span className="text-xs text-stone-500 mt-0.5">
                Incasso: <strong className="text-stone-800">{formatEuro(totals.totalRevenue)}</strong>
              </span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex flex-col">
              <span className="text-2xs font-bold text-emerald-700 uppercase tracking-wide">
                Utile Netto FIFO
              </span>
              <span className="text-xl font-extrabold text-emerald-800 mt-1">
                +{formatEuro(totals.totalProfit)}
              </span>
              <span className="text-xs text-emerald-700 mt-0.5">
                Margine: <strong>{totals.marginPct ? totals.marginPct.toFixed(0) : 0}%</strong>
              </span>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex flex-col">
              <span className="text-2xs font-bold text-blue-700 uppercase tracking-wide">
                Caricati da Magazzino
              </span>
              <span className="text-xl font-extrabold text-blue-900 mt-1">
                +{totals.totalAdded} <span className="text-xs font-normal text-blue-600">pz</span>
              </span>
              <span className="text-xs text-blue-700 mt-0.5">
                Valore merce: {formatEuro(totals.totalAddedCost || 0)}
              </span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex flex-col">
              <span className="text-2xs font-bold text-amber-800 uppercase tracking-wide">
                Cassa Ritirata
              </span>
              <span className="text-xl font-extrabold text-amber-950 mt-1">
                {formatEuro(cashNum)}
              </span>
              <span className="text-xs text-amber-700 mt-0.5">
                {cashNum > 0 ? 'Incassato fisicamente' : 'Nessun prelievo'}
              </span>
            </div>
          </div>

          {/* Eventuali Pezzi Tolti / Non Venduti */}
          {(totals.totalRemoved || 0) > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-center justify-between text-xs text-rose-900">
              <span className="font-semibold">
                Pezzi tolti/rimossi dalla macchinetta (scaduti o resi a magazzino):
              </span>
              <span className="font-extrabold text-rose-700 bg-white px-2.5 py-1 rounded-lg border border-rose-200">
                {totals.totalRemoved} pz (non conteggiati come vendite)
              </span>
            </div>
          )}

          {/* Dettaglio Riga per Riga */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-stone-900">
                  Dettaglio {unitTermPluralLower} ({displayedItems.length})
                </h3>
                {modifiedItems.length < items.length && (
                  <span className="text-2xs font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    {modifiedItems.length} modificati su {items.length}
                  </span>
                )}
              </div>

              {/* Filtro tra solo modificati e tutti */}
              {items.length > modifiedItems.length && (
                <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-xl text-2xs font-bold">
                  <button
                    type="button"
                    onClick={() => setFilterOnlyModified(true)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      filterOnlyModified 
                        ? 'bg-white text-stone-900 shadow-2xs font-bold' 
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    Solo modificati ({modifiedItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterOnlyModified(false)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      !filterOnlyModified 
                        ? 'bg-white text-stone-900 shadow-2xs font-bold' 
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    Tutti ({items.length})
                  </button>
                </div>
              )}
            </div>

            {displayedItems.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 text-stone-500 text-xs">
                Nessuna modifica rilevata. Tutti i valori corrispondono alla situazione precedente.
              </div>
            ) : (
              <div className="border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-100 shadow-2xs">
                {displayedItems.map((item) => {
                  const hasChanges = 
                    item.countedRemaining !== item.previousStock || 
                    (item.unitsSold || 0) > 0 || 
                    (item.addedStock || 0) > 0 || 
                    (item.unitsRemoved || 0) > 0;

                  return (
                    <div 
                      key={item.slotId}
                      className={`p-3.5 sm:p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        hasChanges ? 'bg-white' : 'bg-stone-50/50 opacity-75'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-[200px]">
                        <span className="font-mono text-xs font-black px-2 py-1 bg-stone-100 border border-stone-300 rounded text-stone-700 shrink-0">
                          {item.slotLabel}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-stone-900 leading-tight">
                            {item.productName}
                          </h4>
                          <span className="text-2xs text-stone-500">
                            Prezzo: {formatEuro(item.salePrice)}
                          </span>
                        </div>
                      </div>

                      {/* Sequenza Modifiche: Precedente -> Rimasti -> Venduti -> Caricati -> Risultante */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
                        <div className="flex items-center space-x-1.5 bg-stone-100/80 px-2.5 py-1 rounded-lg text-stone-600">
                          <span className="text-2xs text-stone-400">Prima:</span>
                          <span className="font-bold">{item.previousStock} pz</span>
                        </div>

                        <ArrowRight className="w-3.5 h-3.5 text-stone-300 hidden sm:block" />

                        <div className="flex items-center space-x-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-amber-900">
                          <span className="text-2xs text-amber-700">Trovati dentro:</span>
                          <span className="font-extrabold">{item.countedRemaining} pz</span>
                        </div>

                        {(item.unitsRemoved || 0) > 0 && (
                          <div className="flex items-center space-x-1.5 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg text-rose-800 text-2xs">
                            <span>Tolti: <strong className="font-bold">{item.unitsRemoved} pz</strong></span>
                            {item.returnToWarehouse && <span className="text-3xs bg-rose-200/60 px-1 rounded font-semibold">a magazzino</span>}
                          </div>
                        )}

                        <div className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-emerald-900">
                          <span className="text-2xs text-emerald-700">Venduti:</span>
                          <span className="font-extrabold">{item.unitsSold} pz</span>
                          <span className="text-2xs text-emerald-700 font-semibold">({formatEuro(item.revenue)})</span>
                        </div>

                        {item.addedStock > 0 ? (
                          <div className="flex items-center space-x-1.5 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg text-blue-900 font-bold">
                            <span className="text-2xs text-blue-600">Caricati:</span>
                            <span>+{item.addedStock} pz</span>
                          </div>
                        ) : (
                          <div className="text-2xs text-stone-400 px-2">
                            Nessuna ricarica
                          </div>
                        )}

                        <div className="flex items-center space-x-1.5 bg-stone-900 text-white px-2.5 py-1 rounded-lg">
                          <span className="text-2xs text-stone-400">Nuova giacenza:</span>
                          <span className="font-extrabold text-amber-400">{item.newStock} pz</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer con Pulsanti Azione */}
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-200/60 font-bold text-xs transition-colors cursor-pointer"
          >
            ← Torna indietro e modifica
          </button>

          <button
            type="button"
            id="btn-confirm-save-restock-final"
            onClick={onConfirm}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Conferma e Salva Definitivamente</span>
          </button>
        </div>
      </div>
    </div>
  );
};
