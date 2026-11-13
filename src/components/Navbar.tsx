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
  Tablet,
  Calendar,
  AlertTriangle,
  Sliders,
  PieChart,
  Wallet,
  Upload,
  Save,
  Check,
  Clock,
  Cloud
} from 'lucide-react';
import { useVending } from '../context/VendingContext';
import { MuralBrandLogo } from './MuralBrandLogo';
import { getExpirySummary } from '../utils/expiryUtils';
import { BackupRestoreModal } from './BackupRestoreModal';
import { SupabaseSyncModal } from './common/SupabaseSyncModal';

export type NavTab = 
  | 'quick_restock' 
  | 'stock' 
  | 'spirals_monitor'
  | 'maintenance' 
  | 'warehouse' 
  | 'purchases' 
  | 'dashboard' 
  | 'analytics'
  | 'fixed_costs'
  | 'products' 
  | 'expirations';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onSwitchToMobile?: () => void;
  onSwitchToTablet?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, onSwitchToMobile, onSwitchToTablet }) => {
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
    undoLastAction,
    appVersionMode,
    setAppVersionMode,
    saveAllDataNow,
    lastSavedAt,
    checkpoints,
    restoreCheckpoint,
    supabaseStatus
  } = useVending();

  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isVersionMenuOpen, setIsVersionMenuOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreModalTab, setRestoreModalTab] = useState<'save' | 'restore'>('save');
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);

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
            {/* Tasto Switch Modalità Tablet */}
            {onSwitchToTablet && (
              <button
                id="btn-switch-to-tablet"
                onClick={onSwitchToTablet}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-bold border border-stone-700 hover:border-amber-500/50 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Passa alla versione su misura per Tablet"
              >
                <Tablet className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Vista Tablet</span>
              </button>
            )}

            {/* Tasto Switch Modalità Telefono / Smartphone */}
            {onSwitchToMobile && (
              <button
                id="btn-switch-to-mobile"
                onClick={onSwitchToMobile}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/50 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Passa alla versione creata su misura per smartphone"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Vista Telefono</span>
              </button>
            )}

            {/* SELETTORE VERSIONI (Con AI PDF vs Classica Senza AI) */}
            <div className="relative">
              <button
                id="btn-version-switcher"
                onClick={() => setIsVersionMenuOpen(prev => !prev)}
                className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  appVersionMode === 'with_ai'
                    ? 'bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border-emerald-600/70 shadow-2xs'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-stone-700/80'
                }`}
                title="Scegli tra Versione 2.0 con AI Scanner PDF o Versione 1.5 Classica Senza AI"
              >
                {appVersionMode === 'with_ai' ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span>v2.0 con AI</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5 text-stone-400" />
                    <span>v1.5 Classica</span>
                  </>
                )}
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {isVersionMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-72 bg-stone-900 rounded-xl shadow-2xl border border-stone-700 p-2 z-50 text-white animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setIsVersionMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-stone-800 mb-1">
                    <p className="text-xs font-bold text-amber-300">Selettore Versioni Programma</p>
                    <p className="text-2xs text-stone-400">Due versioni indipendenti del gestionale M&amp;S</p>
                  </div>

                  <button
                    id="btn-switch-to-ai"
                    onClick={() => {
                      setAppVersionMode('with_ai');
                      setIsVersionMenuOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg transition-colors cursor-pointer mb-1 ${
                      appVersionMode === 'with_ai' 
                        ? 'bg-emerald-900/40 border border-emerald-600/60 text-white' 
                        : 'hover:bg-stone-800 text-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Versione 2.0 (Con AI PDF)
                      </span>
                      {appVersionMode === 'with_ai' && (
                        <span className="text-3xs font-bold px-1.5 py-0.5 bg-emerald-500/30 text-emerald-300 rounded">Attiva</span>
                      )}
                    </div>
                    <p className="text-2xs text-stone-400 mt-1 leading-relaxed">
                      Include la scansione e l'importazione automatica di fatture e DDT da PDF con Gemini Multimodal.
                    </p>
                  </button>

                  <button
                    id="btn-switch-to-classic"
                    onClick={() => {
                      setAppVersionMode('without_ai');
                      setIsVersionMenuOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg transition-colors cursor-pointer ${
                      appVersionMode === 'without_ai' 
                        ? 'bg-stone-800 border border-stone-600 text-white' 
                        : 'hover:bg-stone-800 text-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-stone-400" />
                        Versione 1.5 Classica (Senza AI)
                      </span>
                      {appVersionMode === 'without_ai' && (
                        <span className="text-3xs font-bold px-1.5 py-0.5 bg-stone-700 text-stone-300 rounded">Attiva</span>
                      )}
                    </div>
                    <p className="text-2xs text-stone-400 mt-1 leading-relaxed">
                      Versione standard originale con inserimento manuale lotti e carichi.
                    </p>
                  </button>

                  <div className="mt-2 pt-2 border-t border-stone-800 px-2 py-1 bg-stone-950/60 rounded-md">
                    <p className="text-3xs text-stone-400 font-mono">
                      💾 Backup salvato in: <span className="text-amber-300">/backup_version_classic_senza_pdf</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Tasto Cloud Supabase (Stato sync & configurazione multi-device) */}
            <button
              id="btn-supabase-sync-modal"
              onClick={() => setIsSupabaseModalOpen(true)}
              className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                supabaseStatus === 'connected'
                  ? 'bg-emerald-950/70 border-emerald-600/70 text-emerald-300 hover:bg-emerald-900/80 shadow-xs'
                  : supabaseStatus === 'connecting'
                  ? 'bg-amber-950/70 border-amber-600/70 text-amber-300 hover:bg-amber-900/80 animate-pulse'
                  : supabaseStatus === 'error'
                  ? 'bg-rose-950/70 border-rose-600/70 text-rose-300 hover:bg-rose-900/80'
                  : 'bg-stone-900 border-stone-700/80 text-stone-400 hover:text-stone-200'
              }`}
              title="Cloud Supabase: Sincronizzazione in tempo reale PC, Tablet, Smartphone"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Cloud Supabase</span>
              <span className={`w-2 h-2 rounded-full ${
                supabaseStatus === 'connected' ? 'bg-emerald-400 animate-pulse' :
                supabaseStatus === 'connecting' ? 'bg-amber-400 animate-ping' :
                supabaseStatus === 'error' ? 'bg-rose-400' : 'bg-stone-500'
              }`} />
            </button>

            {/* Tasto Split SALVA DATI & FRECCIA PER CARICARE DATI PRECEDENTI */}
            <div className="relative inline-flex items-stretch shadow-xs">
              {/* Tasto Primario: Salva Subito */}
              <button
                id="btn-quick-save-all-data"
                onClick={() => {
                  saveAllDataNow();
                  setIsSavedFeedback(true);
                  setTimeout(() => setIsSavedFeedback(false), 2500);
                }}
                className={`inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-l-lg text-xs font-bold border transition-all cursor-pointer active:scale-95 ${
                  isSavedFeedback
                    ? 'bg-emerald-600 text-white border-emerald-500 scale-[1.02]'
                    : 'bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border-emerald-600/70 hover:border-emerald-500'
                }`}
                title="Salva subito tutti i dati, scorte e valori del gestionale"
              >
                {isSavedFeedback ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Salvato!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Salva Dati</span>
                  </>
                )}
              </button>

              {/* Freccia dedicata: apre menu a tendina per Caricare i dati precedentemente salvati */}
              <button
                id="btn-open-restore-data-dropdown"
                onClick={() => setIsSaveMenuOpen(prev => !prev)}
                className={`px-2 py-1.5 rounded-r-lg border-y border-r transition-all cursor-pointer flex items-center justify-center ${
                  isSaveMenuOpen
                    ? 'bg-emerald-800 text-white border-emerald-400 ring-2 ring-emerald-500/50'
                    : 'bg-emerald-950/95 hover:bg-emerald-900 text-emerald-300 hover:text-white border-emerald-600/70 hover:border-emerald-500'
                }`}
                title="Freccia: Carica dati precedentemente salvati o apri cronologia checkpoint"
                aria-label="Carica dati salvati o opzioni di ripristino"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isSaveMenuOpen ? 'rotate-180 text-amber-300' : 'text-emerald-400'}`} />
              </button>

              {/* Dropdown Menu per Caricare i Dati Precedentemente Salvati */}
              {isSaveMenuOpen && (
                <div 
                  className="absolute left-0 mt-10 w-80 sm:w-92 bg-stone-900/98 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-700/80 p-3 z-50 text-white animate-in fade-in zoom-in-95 duration-100"
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

                  {/* Azione Principale: Carica / Ripristina Dati Precedenti (Centro Completo) */}
                  <button
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
                          onClick={() => {
                            const res = restoreCheckpoint(checkpoints[0].id);
                            setIsSaveMenuOpen(false);
                            if (res.success) {
                              setIsSavedFeedback(true);
                              setTimeout(() => setIsSavedFeedback(false), 2000);
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

                  {/* Elenco altri salvataggi recenti se ce ne sono più di 1 */}
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
                  className="absolute right-0 mt-2 w-68 bg-stone-900 rounded-xl shadow-2xl border border-stone-700 p-2 z-50 text-white animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setIsExportMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-stone-800 mb-1">
                    <p className="text-xs font-bold text-amber-300">Salvataggio &amp; Esportazione</p>
                    <p className="text-2xs text-stone-400">Salva o ripristina una copia sicura dei tuoi dati</p>
                  </div>

                  <button
                    onClick={() => {
                      saveAllDataNow();
                      setIsExportMenuOpen(false);
                      setIsSavedFeedback(true);
                      setTimeout(() => setIsSavedFeedback(false), 2500);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-emerald-300 hover:bg-stone-800 rounded-lg flex items-center space-x-2.5 transition-colors cursor-pointer mb-1"
                  >
                    <Save className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold block text-emerald-300">Salva Dati Adesso</span>
                      <span className="text-2xs text-stone-400">Crea checkpoint istantaneo</span>
                    </div>
                  </button>

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

                  <div className="my-1.5 border-t border-stone-800" />

                  <button
                    onClick={() => {
                      setIsRestoreModalOpen(true);
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-amber-300 hover:bg-amber-950/30 rounded-lg flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold block text-amber-300">Carica / Ripristina Backup</span>
                      <span className="text-2xs text-stone-400">Carica file .JSON o memoria locale</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Pulsante rapido Carica Backup */}
            <button
              id="btn-quick-restore-backup"
              onClick={() => {
                setRestoreModalTab('restore');
                setIsRestoreModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors cursor-pointer"
              title="Carica un backup .JSON scaricato dal tuo PC/telefono o ripristina l'ultimo salvataggio"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Carica Backup</span>
            </button>

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
                if (window.confirm('Vuoi azzerare completamente tutti i dati (scorte a 0, lotti fornitore vuoti e storico a zero) per simulare le cariche partendo da zero?')) {
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
            </button>

            {/* Tab: Controllo Spirali per Distributore */}
            <button
              id="tab-spirals-monitor"
              onClick={() => onSelectTab('spirals_monitor')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'spirals_monitor'
                  ? 'bg-purple-900/60 text-purple-200 border border-purple-500/70 font-bold shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60 border border-transparent font-medium'
              }`}
            >
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Controllo Spirali &amp; Cassetti</span>
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

            {/* Tab: Statistiche & Grafici */}
            <button
              id="tab-analytics"
              onClick={() => onSelectTab('analytics')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'analytics'
                  ? 'bg-blue-950/60 text-blue-200 border border-blue-500/70 font-bold shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60 border border-transparent font-medium'
              }`}
            >
              <PieChart className="w-4 h-4 text-blue-400" />
              <span>Statistiche &amp; Grafici</span>
            </button>

            {/* Tab: Costi Fissi & Guadagno Reale */}
            <button
              id="tab-fixed-costs"
              onClick={() => onSelectTab('fixed_costs')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'fixed_costs'
                  ? 'bg-emerald-950/60 text-emerald-200 border border-emerald-500/70 font-bold shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60 border border-transparent font-medium'
              }`}
            >
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Costi Fissi &amp; Guadagno Reale</span>
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

      {/* Modale Carica & Ripristina Backup */}
      <BackupRestoreModal 
        isOpen={isRestoreModalOpen} 
        onClose={() => setIsRestoreModalOpen(false)} 
        initialTab={restoreModalTab}
      />

      {/* Modale Sincronizzazione Supabase Cloud */}
      <SupabaseSyncModal 
        isOpen={isSupabaseModalOpen} 
        onClose={() => setIsSupabaseModalOpen(false)} 
      />
    </header>
  );
};

