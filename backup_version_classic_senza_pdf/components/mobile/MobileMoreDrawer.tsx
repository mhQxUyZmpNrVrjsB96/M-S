import React, { useMemo } from 'react';
import { 
  BarChart3, 
  ShoppingCart, 
  Tag, 
  Download, 
  RotateCcw, 
  Trash2, 
  Monitor, 
  Smartphone, 
  X, 
  Check, 
  Sparkles,
  Undo2,
  FileSpreadsheet,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { NavTab } from '../Navbar';
import { useVending } from '../../context/VendingContext';
import { SAVED_SNAPSHOT } from '../../data/savedSnapshotCopy';
import { getExpirySummary } from '../../utils/expiryUtils';

interface MobileMoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: NavTab) => void;
  onSwitchToDesktop: () => void;
}

export const MobileMoreDrawer: React.FC<MobileMoreDrawerProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onSwitchToDesktop,
}) => {
  const { 
    purchases,
    exportBackupJSON, 
    exportSalesCSV, 
    resetAllDataToZero, 
    resetToSampleData,
    canUndo,
    undoLastAction 
  } = useVending();

  const expirySummary = useMemo(() => getExpirySummary(purchases), [purchases]);

  if (!isOpen) return null;

  const handleRestoreSavedCopy = () => {
    if (window.confirm('Vuoi ripristinare la copia salvata azzerata originale?')) {
      resetAllDataToZero();
      onClose();
      alert('Copia originale ripristinata con successo!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end p-0">
      <div 
        className="bg-stone-900 border-t border-stone-700 rounded-t-3xl max-w-lg w-full mx-auto p-5 shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-6 duration-200"
      >
        {/* Intestazione Drawer */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div>
            <span className="text-2xs font-mono font-bold text-amber-400">M&amp;S TAKE A MANAGMENT</span>
            <h3 className="text-base font-black text-white">Menu &amp; Funzioni Gestionale</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-stone-800 text-stone-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SEZIONI SECONDARIE */}
        <div className="py-3 space-y-2">
          <span className="text-2xs font-bold text-stone-400 uppercase tracking-wider block">
            Pagine &amp; Strumenti
          </span>

          {/* SOTTO-MENU SCADENZE CON ALLERT 2 SETTIMANE */}
          <button
            id="drawer-item-expirations"
            type="button"
            onClick={() => {
              onSelectTab('expirations');
              onClose();
            }}
            className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left cursor-pointer transition-all ${
              expirySummary.hasAlerts
                ? 'bg-rose-950/40 border-rose-500/70 shadow-lg shadow-rose-950/40'
                : 'bg-stone-950/70 border-stone-800 hover:border-stone-700'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-xl border ${
                expirySummary.hasAlerts
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-white block">Scadenze Prodotti &amp; Lotti</span>
                  {expirySummary.hasAlerts && (
                    <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded-full text-3xs font-black bg-rose-500 text-white animate-pulse">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      <span>{expirySummary.activeAlertsCount} ALLERT</span>
                    </span>
                  )}
                </div>
                <span className="text-2xs text-stone-400 block mt-0.5">
                  {expirySummary.hasAlerts
                    ? `⚠️ ${expirySummary.activeAlertsCount} lotti in scadenza entro 14 giorni o scaduti!`
                    : 'Controllo date automatiche lotti d\'acquisto'}
                </span>
              </div>
            </div>
            <span className="text-stone-500 text-xs">›</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectTab('dashboard');
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-stone-950/70 border border-stone-800 hover:border-stone-700 text-left cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Dashboard Incassi &amp; Cassa</span>
                <span className="text-2xs text-stone-400">Statistiche e grafici margine vendite</span>
              </div>
            </div>
            <span className="text-stone-500 text-xs">›</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectTab('purchases');
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-stone-950/70 border border-stone-800 hover:border-stone-700 text-left cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Acquisti Fornitore &amp; Fatture</span>
                <span className="text-2xs text-stone-400">Registrazione carichi lotti con IVA</span>
              </div>
            </div>
            <span className="text-stone-500 text-xs">›</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectTab('products');
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-stone-950/70 border border-stone-800 hover:border-stone-700 text-left cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Catalogo Articoli &amp; Prezzi</span>
                <span className="text-2xs text-stone-400">Personalizzazione prodotti snack/bevande/caffè</span>
              </div>
            </div>
            <span className="text-stone-500 text-xs">›</span>
          </button>
        </div>

        {/* COPIA & BACKUP SICUREZZA */}
        <div className="py-3 border-t border-stone-800 space-y-2">
          <span className="text-2xs font-bold text-amber-300 uppercase tracking-wider block">
            Salvataggio &amp; Copia di Sicurezza
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                exportBackupJSON();
                onClose();
              }}
              className="flex items-center justify-center space-x-2 p-3 rounded-2xl bg-stone-950 border border-stone-800 text-amber-300 hover:bg-stone-800 text-xs font-bold cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Scarica Backup (JSON)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                exportSalesCSV();
                onClose();
              }}
              className="flex items-center justify-center space-x-2 p-3 rounded-2xl bg-stone-950 border border-stone-800 text-emerald-300 hover:bg-stone-800 text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Esporta CSV</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleRestoreSavedCopy}
            className="w-full flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 hover:text-white text-2xs font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ripristina Copia Salvata Iniziale</span>
          </button>
        </div>

        {/* CAMBIO MODALITÀ DESKTOP / TELEFONO */}
        <div className="py-3 border-t border-stone-800 space-y-2">
          <span className="text-2xs font-bold text-stone-400 uppercase tracking-wider block">
            Visualizzazione Schermo
          </span>

          <button
            type="button"
            onClick={() => {
              onSwitchToDesktop();
              onClose();
            }}
            className="w-full flex items-center justify-center space-x-2 p-3 rounded-2xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs border border-stone-700 cursor-pointer"
          >
            <Monitor className="w-4 h-4 text-cyan-400" />
            <span>Passa a Modalità Desktop (Originale)</span>
          </button>
        </div>

        {/* AZZERAMENTO TOTALE */}
        <div className="pt-2 border-t border-stone-800">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Attenzione: confermi di voler azzerare tutti i dati a zero?')) {
                resetAllDataToZero();
                onClose();
              }
            }}
            className="w-full text-center py-2 text-rose-400 text-2xs hover:underline cursor-pointer"
          >
            Azzera completamente tutti i contatori e lo storico a 0
          </button>
        </div>
      </div>
    </div>
  );
};
