import React, { useState } from 'react';
import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  Download, 
  RotateCcw, 
  Sparkles,
  Undo2,
  Wrench,
  Check,
  Zap,
  Layers,
  Warehouse,
  ShoppingCart,
  BarChart3,
  PieChart,
  Wallet,
  Calendar,
  Sliders,
  Menu,
  X,
  Save,
  ChevronDown,
  Clock,
  Upload,
  Database,
  Cloud
} from 'lucide-react';
import { NavTab } from '../Navbar';
import { useVending } from '../../context/VendingContext';
import { getExpirySummary } from '../../utils/expiryUtils';
import { QuickStoreRestock } from '../QuickStoreRestock';
import { StockMonitor } from '../StockMonitor';
import { WarehouseStockView } from '../WarehouseStockView';
import { PurchasesManager } from '../PurchasesManager';
import { ProfitsDashboard } from '../ProfitsDashboard';
import { ProductCatalog } from '../ProductCatalog';
import { MaintenanceManager } from '../MaintenanceManager';
import { ExpirationsManager } from '../ExpirationsManager';
import { SpiralsFinancialMonitor } from '../SpiralsFinancialMonitor';
import { AnalyticsDashboard } from '../AnalyticsDashboard';
import { FixedCostsManager } from '../FixedCostsManager';
import { BackupRestoreModal } from '../BackupRestoreModal';
import { SupabaseSyncModal } from '../common/SupabaseSyncModal';

interface TabletAppLayoutProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onSwitchToDesktop: () => void;
  onSwitchToMobile: () => void;
}

export const TabletAppLayout: React.FC<TabletAppLayoutProps> = ({
  currentTab,
  onSelectTab,
  onSwitchToDesktop,
  onSwitchToMobile,
}) => {
  const { 
    canUndo, 
    lastActionName, 
    undoLastAction, 
    exportBackupJSON,
    exportSalesCSV,
    saveAllDataNow,
    purchases,
    products,
    resetAllDataToZero,
    checkpoints,
    restoreCheckpoint,
    supabaseStatus
  } = useVending();

  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreModalTab, setRestoreModalTab] = useState<'save' | 'restore'>('restore');
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const [isSecondaryDrawerOpen, setIsSecondaryDrawerOpen] = useState(false);

  const expirySummary = getExpirySummary(purchases);
  const warehouseAlertCount = products.filter(p => {
    const threshold = p.warehouseAlertThreshold ?? 8;
    return (p.warehouseStock || 0) <= threshold;
  }).length;

  const handleQuickBackup = () => {
    exportBackupJSON();
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  return (
    <div className="min-h-screen bg-cosmic-nebula text-stone-100 flex flex-col font-sans antialiased selection:bg-amber-500 selection:text-stone-950 pb-20">
      {/* 1. HEADER DEDICATO TABLET (Touch-friendly 56px con scorciatoie) */}
      <header className="sticky top-0 z-40 bg-stone-950/95 backdrop-blur-md border-b border-stone-800 px-4 py-2.5 shadow-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo & Brand Tablet */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 border border-amber-500/60 flex items-center justify-center shadow-sm">
              <span className="font-graffiti text-amber-300 text-base font-extrabold">M&amp;S</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-graffiti text-sm font-black text-white tracking-wide">M&amp;S TAKE A MANAGMENT</span>
              </div>
              <span className="text-2xs text-stone-400 block leading-tight">Punto Vendita H24</span>
            </div>
          </div>

          {/* Barra Azioni Rapide Touch */}
          <div className="flex items-center space-x-2">
            {canUndo && (
              <button
                type="button"
                onClick={undoLastAction}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-pointer active:scale-95 text-xs font-bold transition-all"
                title={`Annulla: ${lastActionName}`}
              >
                <Undo2 className="w-4 h-4" />
                <span className="hidden sm:inline">Annulla</span>
              </button>
            )}

            {/* Tasto Cloud Supabase Tablet */}
            <button
              type="button"
              id="btn-tablet-supabase-sync"
              onClick={() => setIsSupabaseModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                supabaseStatus === 'connected'
                  ? 'bg-emerald-950/80 border-emerald-600/70 text-emerald-300'
                  : supabaseStatus === 'connecting'
                  ? 'bg-amber-950/80 border-amber-600/70 text-amber-300 animate-pulse'
                  : supabaseStatus === 'error'
                  ? 'bg-rose-950/80 border-rose-600/70 text-rose-300'
                  : 'bg-stone-900 border-stone-700 text-stone-400'
              }`}
              title="Cloud Supabase: Sincronizzazione in tempo reale"
            >
              <Cloud className="w-4 h-4" />
              <span className="hidden sm:inline">Cloud</span>
              <span className={`w-2 h-2 rounded-full ${
                supabaseStatus === 'connected' ? 'bg-emerald-400 animate-pulse' :
                supabaseStatus === 'connecting' ? 'bg-amber-400 animate-ping' :
                supabaseStatus === 'error' ? 'bg-rose-400' : 'bg-stone-500'
              }`} />
            </button>

            {/* Tasto Split SALVA DATI & FRECCIA PER CARICARE DATI PRECEDENTI TABLET */}
            <div className="relative inline-flex items-stretch shadow-xs">
              <button
                type="button"
                id="btn-tablet-quick-save-all-data"
                onClick={() => {
                  saveAllDataNow();
                  setShowSavedToast(true);
                  setTimeout(() => setShowSavedToast(false), 3000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-l-xl bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border-y border-l border-emerald-600/70 hover:border-emerald-500 cursor-pointer active:scale-95 text-xs font-bold transition-all shadow-xs"
                title="Salva subito tutti i dati, scorte e valori"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Salva Dati</span>
              </button>

              {/* Freccia dedicata per Caricare i dati precedentemente salvati */}
              <button
                type="button"
                id="btn-tablet-open-restore-dropdown"
                onClick={() => setIsSaveMenuOpen(prev => !prev)}
                className={`px-2 py-2 rounded-r-xl border-y border-r transition-all cursor-pointer flex items-center justify-center ${
                  isSaveMenuOpen
                    ? 'bg-emerald-800 text-white border-emerald-400 ring-2 ring-emerald-500/50'
                    : 'bg-emerald-950/95 hover:bg-emerald-900 text-emerald-300 hover:text-white border-emerald-600/70 hover:border-emerald-500'
                }`}
                title="Freccia: Carica dati precedentemente salvati o apri cronologia checkpoint"
                aria-label="Carica dati salvati o opzioni di ripristino"
              >
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isSaveMenuOpen ? 'rotate-180 text-amber-300' : 'text-emerald-400'}`} />
              </button>

              {/* Dropdown Menu Tablet per Caricare i Dati Precedentemente Salvati */}
              {isSaveMenuOpen && (
                <div 
                  className="absolute left-0 top-full mt-2 w-80 sm:w-92 bg-stone-900/98 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-700/80 p-3 z-50 text-white animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setIsSaveMenuOpen(false)}
                >
                  {/* Intestazione */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-800">
                    <div>
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        Carica Dati Salvati
                      </span>
                      <p className="text-3xs text-stone-400">Ripristina un salvataggio precedente o file backup</p>
                    </div>
                    {checkpoints.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-3xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {checkpoints.length} checkpoint
                      </span>
                    )}
                  </div>

                  {/* Azione Principale: Carica / Ripristina Dati Precedenti */}
                  <button
                    type="button"
                    onClick={() => {
                      setRestoreModalTab('restore');
                      setIsRestoreModalOpen(true);
                      setIsSaveMenuOpen(false);
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 hover:text-white transition-all cursor-pointer mb-2 flex items-center gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Upload className="w-4 h-4 text-amber-300" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block text-amber-300 group-hover:text-amber-200">
                        Carica / Ripristina Dati Precedenti
                      </span>
                      <span className="text-3xs text-stone-300 block">
                        Visualizza e ripristina tutti i salvataggi, checkpoint e file JSON
                      </span>
                    </div>
                  </button>

                  {/* Ripristino Rapido Ultimo Salvataggio (se presente) */}
                  {checkpoints.length > 0 && (
                    <div className="mb-2 p-2 rounded-xl bg-stone-950/80 border border-stone-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-3xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3 text-stone-400" />
                          Ultimo Salvataggio Eseguito
                        </span>
                        <span className={`text-3xs px-1.5 py-0.2 rounded font-mono font-semibold ${
                          checkpoints[0].type === 'auto_restock' 
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {checkpoints[0].type === 'auto_restock' ? 'Auto Restock' : 'Manuale'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="truncate pr-2">
                          <p className="text-2xs font-semibold text-stone-200 truncate">
                            {checkpoints[0].label}
                          </p>
                          <p className="text-3xs text-stone-400 font-mono">
                            {new Date(checkpoints[0].timestamp).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })} ore {new Date(checkpoints[0].timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const res = restoreCheckpoint(checkpoints[0].id);
                            setIsSaveMenuOpen(false);
                            if (res.success) {
                              setShowSavedToast(true);
                              setTimeout(() => setShowSavedToast(false), 2000);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer shadow-xs active:scale-95"
                          title="Carica subito questo salvataggio"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Carica</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Elenco altri checkpoint recenti se ce ne sono più di 1 */}
                  {checkpoints.length > 1 && (
                    <div className="mb-2">
                      <span className="text-3xs font-bold text-stone-500 uppercase tracking-wider block px-1 mb-1">
                        Altri checkpoint recenti
                      </span>
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5 custom-scrollbar">
                        {checkpoints.slice(1, 4).map(cp => (
                          <div 
                            key={cp.id}
                            className="flex items-center justify-between p-1.5 rounded-lg bg-stone-950/60 hover:bg-stone-800/80 border border-stone-800/80 transition-colors"
                          >
                            <div className="truncate pr-2">
                              <p className="text-3xs font-medium text-stone-300 truncate">
                                {cp.label}
                              </p>
                              <p className="text-3xs text-stone-500 font-mono">
                                {new Date(cp.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                restoreCheckpoint(cp.id);
                                setIsSaveMenuOpen(false);
                              }}
                              className="px-2 py-0.5 rounded bg-stone-800 hover:bg-emerald-600 text-stone-300 hover:text-white text-3xs font-bold transition-colors cursor-pointer shrink-0"
                            >
                              Carica
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Azioni secondarie */}
                  <div className="pt-2 border-t border-stone-800 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRestoreModalTab('restore');
                        setIsRestoreModalOpen(true);
                        setIsSaveMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-stone-300 hover:bg-stone-800 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Carica file backup (.JSON dal dispositivo)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRestoreModalTab('save');
                        setIsRestoreModalOpen(true);
                        setIsSaveMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-emerald-400 hover:bg-stone-800 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Salva checkpoint con nome personalizzato</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleQuickBackup}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 text-amber-300 border border-stone-700 hover:border-amber-500/50 cursor-pointer active:scale-95 text-xs font-bold transition-all"
              title="Salva e scarica copia dati"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Salva Copia</span>
            </button>

            {/* Switchers Dispositivi */}
            <div className="flex items-center bg-stone-900/90 p-1 rounded-xl border border-stone-700/80 gap-1">
              <button
                type="button"
                onClick={onSwitchToMobile}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-stone-400 hover:text-white text-xs font-bold hover:bg-stone-800 transition-all cursor-pointer"
                title="Passa a vista Telefono / Smartphone"
              >
                <Smartphone className="w-3.5 h-3.5 text-stone-400" />
                <span className="hidden md:inline">Telefono</span>
              </button>

              <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 text-stone-950 text-xs font-black shadow-xs">
                <Tablet className="w-3.5 h-3.5" />
                <span>Tablet</span>
              </div>

              <button
                type="button"
                onClick={onSwitchToDesktop}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-stone-400 hover:text-white text-xs font-bold hover:bg-stone-800 transition-all cursor-pointer"
                title="Passa a vista Desktop completa"
              >
                <Monitor className="w-3.5 h-3.5 text-stone-400" />
                <span className="hidden md:inline">Desktop</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. TOAST CONFERMA DOWNLOAD / BACKUP */}
      {showSavedToast && (
        <div className="fixed top-16 left-6 right-6 max-w-md mx-auto z-50 bg-amber-500 text-stone-950 px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2">
            <Check className="w-5 h-5 shrink-0" />
            <span>Copia di sicurezza scaricata con successo!</span>
          </div>
          <button onClick={() => setShowSavedToast(false)} className="text-stone-950 font-black p-1">
            ✕
          </button>
        </div>
      )}

      {/* 3. BARRA NAVIGAZIONE SUPERIORE PER TABLET (Ampia, scrollabile e touch-friendly) */}
      <div className="bg-stone-900/95 border-b border-stone-800 sticky top-[57px] z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
          <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-max">
            {/* Tab 1: Carica Rapida Negozio */}
            <button
              type="button"
              onClick={() => onSelectTab('quick_restock')}
              className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                currentTab === 'quick_restock'
                  ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-stone-950 font-black shadow-md shadow-orange-500/25 border border-amber-400'
                  : 'bg-stone-950/60 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
              }`}
            >
              <Zap className="w-4 h-4 shrink-0" />
              <span>⚡ Carica Rapida Negozio</span>
            </button>

            {/* Tab 2: Distributori */}
            <button
              type="button"
              onClick={() => onSelectTab('stock')}
              className={`flex items-center space-x-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                currentTab === 'stock'
                  ? 'bg-stone-800 text-white border border-stone-600 font-black shadow-xs'
                  : 'bg-stone-950/60 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
              }`}
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Distributori</span>
            </button>

            {/* Tab 3: Spirali & Cassetti */}
            <button
              type="button"
              onClick={() => onSelectTab('spirals_monitor')}
              className={`flex items-center space-x-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                currentTab === 'spirals_monitor'
                  ? 'bg-purple-900/60 text-purple-200 border border-purple-500/70 font-black shadow-xs'
                  : 'bg-stone-950/60 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
              }`}
            >
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Spirali &amp; Cassetti</span>
            </button>

            {/* Tab 4: Magazzino */}
            <button
              type="button"
              onClick={() => onSelectTab('warehouse')}
              className={`flex items-center space-x-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer relative active:scale-95 ${
                currentTab === 'warehouse'
                  ? 'bg-stone-800 text-white border border-amber-500/60 font-black shadow-xs'
                  : 'bg-stone-950/60 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
              }`}
            >
              <Warehouse className="w-4 h-4 text-amber-400" />
              <span>Magazzino</span>
              {warehouseAlertCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-3xs font-black bg-amber-500 text-stone-950">
                  {warehouseAlertCount}
                </span>
              )}
            </button>

            {/* Tab 5: Acquisti / Lotti */}
            <button
              type="button"
              onClick={() => onSelectTab('purchases')}
              className={`flex items-center space-x-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                currentTab === 'purchases'
                  ? 'bg-stone-800 text-white border border-emerald-500/60 font-black shadow-xs'
                  : 'bg-stone-950/60 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
              }`}
            >
              <ShoppingCart className="w-4 h-4 text-emerald-400" />
              <span>Acquisti &amp; Lotti</span>
            </button>

            {/* Tab 6: Manutenzioni */}
            <button
              type="button"
              onClick={() => onSelectTab('maintenance')}
              className={`flex items-center space-x-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                currentTab === 'maintenance'
                  ? 'bg-stone-800 text-amber-300 border border-amber-500/60 font-black shadow-xs'
                  : 'bg-stone-950/60 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
              }`}
            >
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>Manutenzioni</span>
            </button>

            {/* Tab 7: Scadenze (Con Alert) */}
            <button
              type="button"
              onClick={() => onSelectTab('expirations')}
              className={`flex items-center space-x-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer relative active:scale-95 ${
                currentTab === 'expirations'
                  ? 'bg-rose-950/80 text-rose-200 border border-rose-500 font-black shadow-xs'
                  : expirySummary.hasAlerts
                  ? 'bg-rose-950/40 text-rose-300 border border-rose-500/50 animate-pulse'
                  : 'bg-stone-950/60 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
              }`}
            >
              <Calendar className="w-4 h-4 text-rose-400" />
              <span>Scadenze</span>
              {expirySummary.hasAlerts && (
                <span className="px-1.5 py-0.2 rounded-full text-3xs font-black bg-rose-500 text-white">
                  {expirySummary.activeAlertsCount}
                </span>
              )}
            </button>
          </div>

          {/* Tasto Altri Menu Tablet */}
          <button
            type="button"
            onClick={() => setIsSecondaryDrawerOpen(true)}
            className="px-3 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-stone-700 flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
            title="Tutte le altre funzioni del gestionale"
          >
            <Menu className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Altre Funzioni</span>
          </button>
        </div>
      </div>

      {/* 4. CONTENUTO CENTRALE ADATTATO A SCHERMI TABLET (Touch, padding spazioso, target >= 44px) */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-5">
        {currentTab === 'quick_restock' && <QuickStoreRestock />}
        {currentTab === 'stock' && <StockMonitor onNavigateToWarehouse={() => onSelectTab('warehouse')} />}
        {currentTab === 'spirals_monitor' && <SpiralsFinancialMonitor />}
        {currentTab === 'maintenance' && <MaintenanceManager />}
        {currentTab === 'warehouse' && <WarehouseStockView onNavigateToPurchases={() => onSelectTab('purchases')} />}
        {currentTab === 'purchases' && <PurchasesManager />}
        {currentTab === 'dashboard' && <ProfitsDashboard />}
        {currentTab === 'analytics' && <AnalyticsDashboard />}
        {currentTab === 'fixed_costs' && <FixedCostsManager />}
        {currentTab === 'products' && <ProductCatalog />}
        {currentTab === 'expirations' && <ExpirationsManager onNavigateToPurchases={() => onSelectTab('purchases')} />}
      </main>

      {/* 5. DRAWER / MODALE SECONDARIO CON TUTTE LE SEZIONI DEL GESTIONALE */}
      {isSecondaryDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">Menu &amp; Finanze H24</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSecondaryDrawerOpen(false)}
                className="p-1.5 rounded-xl bg-stone-800 text-stone-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => {
                  onSelectTab('dashboard');
                  setIsSecondaryDrawerOpen(false);
                }}
                className="flex items-center justify-between p-3 rounded-xl bg-stone-950/70 border border-stone-800 hover:border-violet-500 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <BarChart3 className="w-5 h-5 text-violet-400" />
                  <div>
                    <span className="text-xs font-bold text-white block">Incassi &amp; Guadagni</span>
                    <span className="text-3xs text-stone-400">Margini vendite e ricavi per cassetto</span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectTab('analytics');
                  setIsSecondaryDrawerOpen(false);
                }}
                className="flex items-center justify-between p-3 rounded-xl bg-stone-950/70 border border-stone-800 hover:border-blue-500 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <PieChart className="w-5 h-5 text-blue-400" />
                  <div>
                    <span className="text-xs font-bold text-white block">Statistiche &amp; Grafici</span>
                    <span className="text-3xs text-stone-400">Trend temporali e performance prodotti</span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectTab('fixed_costs');
                  setIsSecondaryDrawerOpen(false);
                }}
                className="flex items-center justify-between p-3 rounded-xl bg-stone-950/70 border border-stone-800 hover:border-emerald-500 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  <div>
                    <span className="text-xs font-bold text-white block">Costi Fissi &amp; Utile Reale</span>
                    <span className="text-3xs text-stone-400">Affitti, bollette, assicurazioni ed ammortamenti</span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectTab('products');
                  setIsSecondaryDrawerOpen(false);
                }}
                className="flex items-center justify-between p-3 rounded-xl bg-stone-950/70 border border-stone-800 hover:border-amber-500 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  <div>
                    <span className="text-xs font-bold text-white block">Catalogo Articoli Generale</span>
                    <span className="text-3xs text-stone-400">Elenco prezzi e descrizioni prodotti</span>
                  </div>
                </div>
              </button>

              <div className="pt-2 border-t border-stone-800 mt-2 space-y-2">
                <span className="text-3xs font-bold text-stone-500 uppercase tracking-wider block">Backup &amp; Ripristino</span>
                <button
                  type="button"
                  onClick={() => {
                    exportSalesCSV();
                    setIsSecondaryDrawerOpen(false);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Scarica Storico Vendite (.CSV Excel)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsRestoreModalOpen(true);
                    setIsSecondaryDrawerOpen(false);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>Ripristina Backup da File</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ripristino Backup */}
      <BackupRestoreModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        initialTab={restoreModalTab}
      />

      {/* Modal Sincronizzazione Supabase Cloud */}
      <SupabaseSyncModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
};
