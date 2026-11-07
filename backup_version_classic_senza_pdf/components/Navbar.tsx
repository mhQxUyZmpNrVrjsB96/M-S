import React, { useState, useMemo } from 'react';
import { 
  Store, 
  Layers, 
  BarChart3, 
  PackagePlus, 
  RotateCcw, 
  Play, 
  Pause, 
  Sparkles, 
  Coffee, 
  ShoppingCart, 
  Zap, 
  Download, 
  FileText, 
  Database,
  ChevronDown,
  Warehouse,
  Undo2,
  Wrench,
  Smartphone,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { useVending } from '../context/VendingContext';
import { MuralBrandLogo } from './MuralBrandLogo';
import { getExpirySummary } from '../utils/expiryUtils';

export type NavTab = 'quick_restock' | 'stock' | 'maintenance' | 'warehouse' | 'purchases' | 'dashboard' | 'products' | 'expirations';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onSwitchToMobile?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, onSwitchToMobile }) => {
  const { 
    machines, 
    purchases,
    products,
    openRestockModal, 
    isSimulating, 
    toggleSimulation, 
    simulateSalesStep,
    resetToSampleData,
    resetAllDataToZero,
    exportBackupJSON,
    exportSalesCSV,
    canUndo,
    lastActionName,
    undoLastAction
  } = useVending();

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Calcola scadenze e allarmi a 2 settimane (14 giorni)
  const expirySummary = useMemo(() => getExpirySummary(purchases), [purchases]);

  // Calcola quante macchine sono in stato critico o esaurimento
  const criticalCount = machines.filter(m => m.status === 'critico' || m.status === 'in_esaurimento').length;

  // Calcola articoli a magazzino sotto la soglia di allerta personalizzata
  const warehouseAlertCount = useMemo(() => {
    return products.filter(p => {
      const threshold = p.warehouseAlertThreshold ?? 8;
      return (p.warehouseStock || 0) <= threshold;
    }).length;
  }, [products]);

  return (
    <header className="bg-stone-950/95 backdrop-blur-md border-b border-stone-800/90 sticky top-0 z-40 shadow-xl bg-cosmic-header">
      {/* Top status bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & Brand: M&S Take a Managment inspired by the murales */}
          <MuralBrandLogo />

          {/* Action buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Tasto Switch Modalità Telefono / Smartphone */}
            {onSwitchToMobile && (
              <button
                id="btn-switch-to-mobile"
                onClick={onSwitchToMobile}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/50 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Passa alla versione creata su misura per smartphone"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>Vista Telefono</span>
              </button>
            )}

            {/* Download / Esporta Dati Dropdown */}
            <div className="relative">
              <button
                id="btn-export-menu"
                onClick={() => setIsExportMenuOpen(prev => !prev)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 text-xs font-semibold border border-stone-700/80 transition-colors cursor-pointer"
                title="Scarica i dati del gestionale sul tuo computer o telefono"
              >
                <Download className="w-3.5 h-3.5 text-stone-400" />
                <span>Scarica Dati</span>
                <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
              </button>

              {isExportMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-64 bg-stone-900 rounded-xl shadow-2xl border border-stone-700 p-2 z-50 text-white animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setIsExportMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-stone-800 mb-1">
                    <p className="text-xs font-bold text-amber-300">Salvataggio &amp; Esportazione</p>
                    <p className="text-2xs text-stone-400">Salva una copia sicura dei tuoi dati M&amp;S</p>
                  </div>

                  <button
                    onClick={() => {
                      exportBackupJSON();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-stone-200 hover:bg-stone-800 rounded-lg flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <Database className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-semibold block text-stone-100">Backup Completo (.JSON)</span>
                      <span className="text-2xs text-stone-400">Salva distributori, scorte e lotti</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      exportSalesCSV();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-stone-200 hover:bg-stone-800 rounded-lg flex items-center space-x-2.5 transition-colors cursor-pointer mt-1"
                  >
                    <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <span className="font-semibold block text-stone-100">Report Vendite (.CSV)</span>
                      <span className="text-2xs text-stone-400">Apribile in Excel o Fogli Google</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Live sales simulator controls */}
            <div className="flex items-center bg-stone-900 rounded-lg p-1 border border-stone-800 text-xs">
              <button
                id="btn-toggle-simulation"
                onClick={toggleSimulation}
                title={isSimulating ? "Metti in pausa simulazione vendite clienti" : "Avvia simulazione clienti automatici"}
                className={`flex items-center space-x-1 px-2 py-1 rounded-md font-medium transition-colors ${
                  isSimulating 
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-xs' 
                    : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{isSimulating ? 'Vendite Live' : 'Simula'}</span>
              </button>

              <button
                id="btn-step-simulation"
                onClick={simulateSalesStep}
                title="Genera singola vendita istantanea"
                className="px-1.5 py-1 text-stone-400 hover:text-amber-300 hover:bg-stone-800 rounded-md font-medium transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tasto ANNULLA Operazione Appena Eseguita */}
            <button
              id="btn-undo-action"
              onClick={undoLastAction}
              disabled={!canUndo}
              title={canUndo && lastActionName ? `Annulla: "${lastActionName}"` : 'Nessuna operazione da annullare'}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                canUndo 
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-xs active:scale-95' 
                  : 'bg-stone-900/60 text-stone-600 border border-stone-800 cursor-not-allowed opacity-50'
              }`}
            >
              <Undo2 className={`w-3.5 h-3.5 ${canUndo ? 'text-amber-400' : 'text-stone-600'}`} />
              <span className="hidden sm:inline">Annulla</span>
              {canUndo && lastActionName && (
                <span className="max-w-[120px] truncate text-2xs text-amber-300/80 font-normal hidden lg:inline">
                  ({lastActionName})
                </span>
              )}
            </button>

            {/* Pulsante rapido Scadenze Prodotti (in fondo a destra) con ALLERT a 2 settimane */}
            <button
              id="btn-header-expirations"
              onClick={() => onSelectTab('expirations')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
                currentTab === 'expirations'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : expirySummary.hasAlerts
                    ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/60 shadow-sm animate-pulse'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700/80'
              }`}
              title={expirySummary.hasAlerts ? `Attenzione: ${expirySummary.activeAlertsCount} lotti in scadenza o scaduti!` : 'Controllo scadenze lotti'}
            >
              <Calendar className={`w-3.5 h-3.5 ${expirySummary.hasAlerts ? 'text-rose-400' : 'text-amber-400'}`} />
              <span>Scadenze</span>
              {expirySummary.hasAlerts && (
                <span className="px-1.5 py-0.2 rounded-full text-2xs font-black bg-rose-500 text-white">
                  {expirySummary.activeAlertsCount}
                </span>
              )}
            </button>

            {/* Pulsante rapido Nuovo Rifornimento */}
            <button
              id="btn-open-restock-header"
              onClick={() => openRestockModal()}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-colors cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              <span className="hidden sm:inline">Ricarica Veloce</span>
            </button>

            {/* Reset button: Azzera tutti i dati a zero */}
            <button
              id="btn-reset-data"
              onClick={() => {
                if (window.confirm('Vuoi azzerare completamente tutti i dati (scorte a 0, lotti fornitore vuoti, storico e cassa a zero) per simulare le cariche partendo da zero?')) {
                  resetAllDataToZero();
                }
              }}
              title="Azzera tutti i dati (parti da zero)"
              className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main navigation tabs */}
      <div className="bg-stone-900/90 border-t border-stone-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none" aria-label="Tabs">
            {/* Tab 1: Carica Rapida Negozio */}
            <button
              id="tab-quick-restock"
              onClick={() => onSelectTab('quick_restock')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'quick_restock'
                  ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-stone-950 font-extrabold shadow-md shadow-orange-500/25 border border-amber-400'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/70 border border-transparent font-medium'
              }`}
            >
              <Zap className="w-4 h-4 text-stone-950" />
              <span>⚡ Carica Rapida in Negozio</span>
            </button>

            {/* Tab 2: Distributori & Scorte */}
            <button
              id="tab-stock"
              onClick={() => onSelectTab('stock')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'stock'
                  ? 'bg-stone-800 text-white border border-stone-600 font-bold shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60 border border-transparent font-medium'
              }`}
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Distributori</span>
              {criticalCount > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-2xs font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {criticalCount}
                </span>
              )}
            </button>

            {/* Tab: Casella Manutenzioni */}
            <button
              id="tab-maintenance"
              onClick={() => onSelectTab('maintenance')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'maintenance'
                  ? 'bg-stone-800 text-amber-300 border border-amber-500/60 font-bold shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60 border border-transparent font-medium'
              }`}
            >
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>Manutenzioni</span>
            </button>

            {/* Tab 3: Solo Scorte Magazzino */}
            <button
              id="tab-warehouse"
              onClick={() => onSelectTab('warehouse')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'warehouse'
                  ? 'bg-stone-800 text-white border border-stone-600 font-bold shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60 border border-transparent font-medium'
              }`}
            >
              <Warehouse className="w-4 h-4 text-amber-400" />
              <span>Scorte Magazzino</span>
              {warehouseAlertCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-3xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {warehouseAlertCount}
                </span>
              )}
            </button>

            {/* Tab 4: Acquisti & Fatture */}
            <button
              id="tab-purchases"
              onClick={() => onSelectTab('purchases')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'purchases'
                  ? 'bg-stone-800 text-white border border-stone-600 font-bold shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60 border border-transparent font-medium'
              }`}
            >
              <ShoppingCart className="w-4 h-4 text-emerald-400" />
              <span>Acquisti Fornitori (Lotti)</span>
            </button>

            {/* Tab 5: Incassi & Profitti */}
            <button
              id="tab-dashboard"
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-stone-800 text-white border border-stone-600 font-bold shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60 border border-transparent font-medium'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-violet-400" />
              <span>Incassi &amp; Guadagni</span>
            </button>

            {/* Tab 6: Listino Prezzi & Catalogo */}
            <button
              id="tab-products"
              onClick={() => onSelectTab('products')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'products'
                  ? 'bg-stone-800 text-white border border-stone-600 font-bold shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60 border border-transparent font-medium'
              }`}
            >
              <Store className="w-4 h-4 text-rose-400" />
              <span>Listino Prezzi &amp; Prodotti</span>
            </button>

            {/* Tab 7: Scadenze Prodotti & Lotti (in fondo a destra) */}
            <button
              id="tab-expirations"
              onClick={() => onSelectTab('expirations')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'expirations'
                  ? 'bg-stone-800 text-amber-300 border border-amber-500/60 font-bold shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60 border border-transparent font-medium'
              }`}
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Scadenze Lotti</span>
              {expirySummary.hasAlerts && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-2xs font-extrabold bg-rose-500 text-white animate-pulse">
                  {expirySummary.activeAlertsCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

