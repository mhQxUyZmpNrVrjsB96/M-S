import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Store, 
  Layers, 
  BarChart3, 
  PackagePlus, 
  RotateCcw, 
  Sparkles, 
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
  Sliders,
  PieChart,
  Wallet,
  Upload,
  Save,
  Check,
  Clock,
  Cloud,
  Monitor
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

const GESTIONE_TABS: { id: NavTab; label: string; shortLabel: string; description: string; icon: React.ComponentType<{ className?: string }>; iconColor: string }[] = [
  {
    id: 'spirals_monitor',
    label: 'Controllo Spirali & Cassetti',
    shortLabel: 'Spirali & Cassetti',
    description: 'Prezzi, capienza e stato di ogni spirale',
    icon: Sliders,
    iconColor: 'text-purple-400',
  },
  {
    id: 'purchases',
    label: 'Acquisti Fornitori (Lotti)',
    shortLabel: 'Acquisti & Lotti',
    description: 'Fatture, carichi fornitore e giacenze lotti',
    icon: ShoppingCart,
    iconColor: 'text-emerald-400',
  },
  {
    id: 'products',
    label: 'Listino Prezzi & Prodotti',
    shortLabel: 'Prodotti & Prezzi',
    description: 'Catalogo articoli, margini e soglie scorta',
    icon: Store,
    iconColor: 'text-rose-400',
  },
  {
    id: 'maintenance',
    label: 'Manutenzioni',
    shortLabel: 'Manutenzioni',
    description: 'Segnalazioni guasti e interventi tecnici',
    icon: Wrench,
    iconColor: 'text-amber-400',
  },
];

const FINANZA_TABS: { id: NavTab; label: string; shortLabel: string; description: string; icon: React.ComponentType<{ className?: string }>; iconColor: string }[] = [
  {
    id: 'dashboard',
    label: 'Incassi & Guadagni',
    shortLabel: 'Incassi & Guadagni',
    description: 'Ricavi vendite e margini per distributore',
    icon: BarChart3,
    iconColor: 'text-violet-400',
  },
  {
    id: 'analytics',
    label: 'Statistiche & Grafici',
    shortLabel: 'Statistiche',
    description: 'Trend temporali e classifica prodotti',
    icon: PieChart,
    iconColor: 'text-blue-400',
  },
  {
    id: 'fixed_costs',
    label: 'Costi Fissi & Guadagno Reale',
    shortLabel: 'Costi Fissi',
    description: 'Affitti, bollette, spese e utile netto reale',
    icon: Wallet,
    iconColor: 'text-emerald-400',
  },
];

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, onSwitchToMobile, onSwitchToTablet }) => {
  const { 
    purchases,
    products,
    machines,
    openRestockModal, 
    resetAllDataToZero,
    exportBackupJSON,
    exportSalesCSV,
    canUndo,
    lastActionName,
    undoLastAction,
    appVersionMode,
    setAppVersionMode,
    saveAllDataNow,
    checkpoints,
    restoreCheckpoint,
    supabaseStatus
  } = useVending();

  const headerRef = useRef<HTMLElement | null>(null);
  const [openMenu, setOpenMenu] = useState<'save' | 'system' | 'gestione' | 'finanza' | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreModalTab, setRestoreModalTab] = useState<'save' | 'restore'>('save');
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);

  // Chiude qualsiasi menu a tendina cliccando fuori o premendo Esc (funziona sia su PC che su Tablet touch)
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Calcola scadenze e allarmi a 2 settimane (14 giorni) su magazzino e spirali
  const expirySummary = useMemo(() => getExpirySummary(purchases, machines, products), [purchases, machines, products]);

  // Calcola articoli a magazzino sotto la soglia di allerta personalizzata
  const warehouseAlertCount = useMemo(() => {
    return products.filter(p => {
      if (p.archived) return false;
      const threshold = p.warehouseAlertThreshold ?? 8;
      return (p.warehouseStock || 0) <= threshold;
    }).length;
  }, [products]);

  const activeGestioneTab = GESTIONE_TABS.find(t => t.id === currentTab);
  const activeFinanzaTab = FINANZA_TABS.find(t => t.id === currentTab);

  const toggleMenu = (menu: 'save' | 'system' | 'gestione' | 'finanza') => {
    setOpenMenu(prev => (prev === menu ? null : menu));
  };

  return (
    <header ref={headerRef} className="bg-stone-950/95 backdrop-blur-md border-b border-stone-800/90 sticky top-0 z-40 shadow-xl bg-cosmic-header">
      {/* Top status bar: pulita, singola riga su PC, compatta su Tablet */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 lg:gap-4">
          {/* Logo & Brand */}
          <MuralBrandLogo />

          {/* Barra Azioni Principali (compatta con menu a tendina) */}
          <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2">
            {/* 1. Menu a tendina Vista Dispositivo & Versione */}
            <div className="relative shrink-0">
              <button
                id="btn-version-switcher"
                type="button"
                onClick={() => toggleMenu('system')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  openMenu === 'system'
                    ? 'bg-stone-800 text-white border-amber-500/60'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-200 border-stone-700/80'
                }`}
                title="Cambia vista (PC, Tablet, Telefono) o scegli versione programma"
              >
                <Monitor className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Vista</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] leading-none font-bold ${
                  appVersionMode === 'with_ai'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-stone-800 text-stone-300 border border-stone-700'
                }`}>
                  {appVersionMode === 'with_ai' ? 'v2.0 AI' : 'v1.5'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-150 shrink-0 ${openMenu === 'system' ? 'rotate-180 text-amber-300' : ''}`} />
              </button>

              {openMenu === 'system' && (
                <div className="absolute left-0 lg:left-auto lg:right-0 top-full mt-2 w-76 max-w-[calc(100vw-2rem)] bg-stone-900/98 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-700/80 p-2.5 z-50 text-white">
                  {/* Sezione Vista Dispositivo */}
                  {(onSwitchToTablet || onSwitchToMobile) && (
                    <div className="mb-2 pb-2 border-b border-stone-800">
                      <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Modalità Schermo
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-bold">
                          <Monitor className="w-4 h-4" />
                          <span>PC (Attiva)</span>
                        </div>

                        {onSwitchToTablet && (
                          <button
                            id="btn-switch-to-tablet"
                            type="button"
                            onClick={() => {
                              setOpenMenu(null);
                              onSwitchToTablet();
                            }}
                            className="flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-xl bg-stone-950/70 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/40 text-stone-300 hover:text-amber-300 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <Tablet className="w-4 h-4 text-amber-400" />
                            <span>Tablet</span>
                          </button>
                        )}

                        {onSwitchToMobile && (
                          <button
                            id="btn-switch-to-mobile"
                            type="button"
                            onClick={() => {
                              setOpenMenu(null);
                              onSwitchToMobile();
                            }}
                            className="flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-xl bg-stone-950/70 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/40 text-stone-300 hover:text-amber-300 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <Smartphone className="w-4 h-4 text-amber-400" />
                            <span>Telefono</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sezione Versione Programma */}
                  <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Versione Gestionale
                  </p>

                  <button
                    id="btn-switch-to-ai"
                    type="button"
                    onClick={() => {
                      setAppVersionMode('with_ai');
                      setOpenMenu(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-colors cursor-pointer mb-1 ${
                      appVersionMode === 'with_ai' 
                        ? 'bg-emerald-900/40 border border-emerald-600/60 text-white' 
                        : 'hover:bg-stone-800 text-stone-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Versione 2.0 (Con AI PDF)
                      </span>
                      {appVersionMode === 'with_ai' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-500/30 text-emerald-300 rounded">Attiva</span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1 leading-snug">
                      Scansione e importazione automatica fatture e DDT da PDF con AI.
                    </p>
                  </button>

                  <button
                    id="btn-switch-to-classic"
                    type="button"
                    onClick={() => {
                      setAppVersionMode('without_ai');
                      setOpenMenu(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-colors cursor-pointer ${
                      appVersionMode === 'without_ai' 
                        ? 'bg-stone-800 border border-stone-600 text-white' 
                        : 'hover:bg-stone-800 text-stone-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-stone-400" />
                        Versione 1.5 Classica (Senza AI)
                      </span>
                      {appVersionMode === 'without_ai' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-stone-700 text-stone-300 rounded">Attiva</span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1 leading-snug">
                      Inserimento manuale lotti e carichi senza moduli AI.
                    </p>
                  </button>
                </div>
              )}
            </div>

            {/* 2. Stato Cloud Supabase */}
            <button
              id="btn-supabase-sync-modal"
              type="button"
              onClick={() => {
                setOpenMenu(null);
                setIsSupabaseModalOpen(true);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
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
              <Cloud className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Cloud</span>
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                supabaseStatus === 'connected' ? 'bg-emerald-400 animate-pulse' :
                supabaseStatus === 'connecting' ? 'bg-amber-400 animate-ping' :
                supabaseStatus === 'error' ? 'bg-rose-400' : 'bg-stone-500'
              }`} />
            </button>

            {/* 3. Menu Unificato Salva, Backup, Esporta & Ripristina */}
            <div className="relative inline-flex items-stretch shadow-xs shrink-0">
              <button
                id="btn-quick-save-all-data"
                type="button"
                onClick={() => {
                  saveAllDataNow();
                  setIsSavedFeedback(true);
                  setTimeout(() => setIsSavedFeedback(false), 2500);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg text-xs font-bold border transition-all cursor-pointer active:scale-95 whitespace-nowrap ${
                  isSavedFeedback
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border-emerald-600/70 hover:border-emerald-500'
                }`}
                title="Salva subito tutti i dati, scorte e valori del gestionale"
              >
                {isSavedFeedback ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white shrink-0" />
                    <span>Salvato!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Salva Dati</span>
                  </>
                )}
              </button>

              <button
                id="btn-open-restore-data-dropdown"
                type="button"
                onClick={() => toggleMenu('save')}
                className={`px-2 py-1.5 rounded-r-lg border-y border-r transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold whitespace-nowrap ${
                  openMenu === 'save'
                    ? 'bg-emerald-800 text-white border-emerald-400'
                    : 'bg-emerald-950/95 hover:bg-emerald-900 text-emerald-300 hover:text-white border-emerald-600/70 hover:border-emerald-500'
                }`}
                title="Apri menu Salvataggi, Backup (.JSON/.CSV), Ripristino e Reset"
                aria-label="Opzioni salvataggio, backup ed esportazione"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${openMenu === 'save' ? 'rotate-180 text-amber-300' : 'text-emerald-400'}`} />
              </button>

              {openMenu === 'save' && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-92 max-w-[calc(100vw-2rem)] bg-stone-900/98 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-700/80 p-3 z-50 text-white">
                  {/* Intestazione */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-800">
                    <div>
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-amber-400" />
                        Salvataggio, Backup &amp; Export
                      </span>
                      <p className="text-[11px] text-stone-400">Gestisci copie di sicurezza e ripristini</p>
                    </div>
                    {checkpoints.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {checkpoints.length} checkpoint
                      </span>
                    )}
                  </div>

                  {/* Carica / Ripristina Dati */}
                  <button
                    id="btn-quick-restore-backup"
                    type="button"
                    onClick={() => {
                      setRestoreModalTab('restore');
                      setIsRestoreModalOpen(true);
                      setOpenMenu(null);
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 hover:text-white transition-all cursor-pointer mb-2 flex items-center gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                      <Upload className="w-4 h-4 text-amber-300" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block text-amber-300">
                        Carica / Ripristina Backup
                      </span>
                      <span className="text-[11px] text-stone-300 block">
                        Carica file .JSON o scegli un checkpoint salvato
                      </span>
                    </div>
                  </button>

                  {/* Ultimo Checkpoint rapido */}
                  {checkpoints.length > 0 && (
                    <div className="mb-2 p-2 rounded-xl bg-stone-950/80 border border-stone-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3 text-stone-400" />
                          Ultimo Checkpoint
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                          checkpoints[0].type === 'auto_restock' 
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {checkpoints[0].type === 'auto_restock' ? 'Auto Restock' : 'Manuale'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate">
                          <p className="text-[11px] font-semibold text-stone-200 truncate">
                            {checkpoints[0].label}
                          </p>
                          <p className="text-[10px] text-stone-400 font-mono">
                            {new Date(checkpoints[0].timestamp).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })} • {new Date(checkpoints[0].timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const res = restoreCheckpoint(checkpoints[0].id);
                            setOpenMenu(null);
                            if (res.success) {
                              setIsSavedFeedback(true);
                              setTimeout(() => setIsSavedFeedback(false), 2000);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Carica</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Esportazione & Checkpoint personalizzato */}
                  <div className="pt-2 border-t border-stone-800 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        exportBackupJSON();
                        setOpenMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-2 text-xs text-stone-200 hover:bg-stone-800 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-semibold block">Scarica Backup Completo (.JSON)</span>
                        <span className="text-[10px] text-stone-400">Esporta distributori, scorte e lotti</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        exportSalesCSV();
                        setOpenMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-2 text-xs text-stone-200 hover:bg-stone-800 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <span className="font-semibold block">Esporta Report Vendite (.CSV)</span>
                        <span className="text-[10px] text-stone-400">Apribile in Excel o Fogli Google</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRestoreModalTab('save');
                        setIsRestoreModalOpen(true);
                        setOpenMenu(null);
                      }}
                      className="w-full text-left px-2.5 py-2 text-xs text-emerald-300 hover:bg-stone-800 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Save className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Salva checkpoint con nome personalizzato</span>
                    </button>
                  </div>

                  {/* Azione Reset separata in fondo per sicurezza */}
                  <div className="mt-2 pt-2 border-t border-stone-800">
                    <button
                      id="btn-reset-data"
                      type="button"
                      onClick={() => {
                        setOpenMenu(null);
                        if (window.confirm('Vuoi azzerare completamente tutti i dati (scorte a 0, lotti fornitore vuoti e storico a zero) per simulare le cariche partendo da zero?')) {
                          resetAllDataToZero();
                        }
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                      <span>Azzera tutti i dati (parti da zero)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Tasto rapido ANNULLA */}
            <button
              id="btn-undo-action"
              type="button"
              onClick={undoLastAction}
              disabled={!canUndo}
              title={canUndo && lastActionName ? `Annulla: "${lastActionName}"` : 'Nessuna operazione da annullare'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                canUndo 
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-xs active:scale-95' 
                  : 'bg-stone-900/60 text-stone-600 border border-stone-800 cursor-not-allowed opacity-50'
              }`}
            >
              <Undo2 className={`w-3.5 h-3.5 shrink-0 ${canUndo ? 'text-amber-400' : 'text-stone-600'}`} />
              <span className="hidden sm:inline">Annulla</span>
            </button>

            {/* 5. CTA Principale: Ricarica Veloce */}
            <button
              id="btn-open-restock-header"
              type="button"
              onClick={() => {
                setOpenMenu(null);
                openRestockModal();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <PackagePlus className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Ricarica Veloce</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main navigation bar: 1 riga pulita con 4 sezioni dirette + 2 menu a tendina */}
      <div className="bg-stone-900/90 border-t border-stone-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap items-center gap-1.5 py-2" aria-label="Navigazione principale">
            {/* Tab 1: Carica Rapida in Negozio */}
            <button
              id="tab-quick-restock"
              type="button"
              onClick={() => {
                setOpenMenu(null);
                onSelectTab('quick_restock');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                currentTab === 'quick_restock'
                  ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-stone-950 font-extrabold shadow-md shadow-orange-500/25 border border-amber-400'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/70 border border-transparent font-medium'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 shrink-0 ${currentTab === 'quick_restock' ? 'text-stone-950' : 'text-amber-400'}`} />
              <span>⚡ Carica Rapida</span>
            </button>

            {/* Tab 2: Distributori */}
            <button
              id="tab-stock"
              type="button"
              onClick={() => {
                setOpenMenu(null);
                onSelectTab('stock');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                currentTab === 'stock'
                  ? 'bg-stone-800 text-white border border-stone-600 font-bold shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60 border border-transparent font-medium'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Distributori</span>
            </button>

            {/* Tab 3: Magazzino */}
            <button
              id="tab-warehouse"
              type="button"
              onClick={() => {
                setOpenMenu(null);
                onSelectTab('warehouse');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                currentTab === 'warehouse'
                  ? 'bg-stone-800 text-white border border-stone-600 font-bold shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60 border border-transparent font-medium'
              }`}
            >
              <Warehouse className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Magazzino</span>
              {warehouseAlertCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] leading-none font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {warehouseAlertCount}
                </span>
              )}
            </button>

            {/* Dropdown 1: Gestione Negozio (Spirali, Acquisti/Lotti, Listino Prodotti, Manutenzioni) */}
            <div className="relative shrink-0">
              <button
                id="nav-dropdown-gestione"
                type="button"
                onClick={() => toggleMenu('gestione')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeGestioneTab
                    ? 'bg-stone-800 text-white border border-purple-500/60 font-bold shadow-xs'
                    : openMenu === 'gestione'
                    ? 'bg-stone-800 text-white border border-stone-700 font-semibold'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800/60 border border-transparent font-medium'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>{activeGestioneTab ? activeGestioneTab.shortLabel : 'Gestione'}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-150 shrink-0 ${openMenu === 'gestione' ? 'rotate-180 text-amber-300' : ''}`} />
              </button>

              {openMenu === 'gestione' && (
                <div className="absolute left-0 top-full mt-2 w-76 max-w-[calc(100vw-2rem)] bg-stone-900/98 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-700/80 p-2 z-50 text-white">
                  <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Controllo &amp; Rifornimento
                  </p>
                  <div className="space-y-1 mt-1">
                    {GESTIONE_TABS.map(item => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onSelectTab(item.id);
                            setOpenMenu(null);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl flex items-start gap-3 transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-stone-800 border border-amber-500/50 text-white'
                              : 'hover:bg-stone-800/70 text-stone-200 border border-transparent'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center shrink-0 mt-0.5">
                            <Icon className={`w-4 h-4 ${item.iconColor}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold truncate">{item.label}</span>
                              {isActive && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            </div>
                            <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">{item.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Dropdown 2: Finanza & Analisi (Incassi & Guadagni, Statistiche, Costi Fissi) */}
            <div className="relative shrink-0">
              <button
                id="nav-dropdown-finanza"
                type="button"
                onClick={() => toggleMenu('finanza')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeFinanzaTab
                    ? 'bg-stone-800 text-white border border-emerald-500/60 font-bold shadow-xs'
                    : openMenu === 'finanza'
                    ? 'bg-stone-800 text-white border border-stone-700 font-semibold'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800/60 border border-transparent font-medium'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{activeFinanzaTab ? activeFinanzaTab.shortLabel : 'Finanza & Analisi'}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-150 shrink-0 ${openMenu === 'finanza' ? 'rotate-180 text-amber-300' : ''}`} />
              </button>

              {openMenu === 'finanza' && (
                <div className="absolute left-0 top-full mt-2 w-76 max-w-[calc(100vw-2rem)] bg-stone-900/98 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-700/80 p-2 z-50 text-white">
                  <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Contabilità &amp; Statistiche
                  </p>
                  <div className="space-y-1 mt-1">
                    {FINANZA_TABS.map(item => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onSelectTab(item.id);
                            setOpenMenu(null);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl flex items-start gap-3 transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-stone-800 border border-emerald-500/50 text-white'
                              : 'hover:bg-stone-800/70 text-stone-200 border border-transparent'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center shrink-0 mt-0.5">
                            <Icon className={`w-4 h-4 ${item.iconColor}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold truncate">{item.label}</span>
                              {isActive && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                            </div>
                            <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">{item.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Tab 4: Scadenze Lotti (con avviso immediato a colpo d'occhio) */}
            <button
              id="tab-expirations"
              type="button"
              onClick={() => {
                setOpenMenu(null);
                onSelectTab('expirations');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                currentTab === 'expirations'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                  : expirySummary.hasAlerts
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/50 font-semibold'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60 border border-transparent font-medium'
              }`}
              title={expirySummary.hasAlerts ? `Attenzione: ${expirySummary.activeAlertsCount} lotti in scadenza o scaduti!` : 'Controllo scadenze lotti'}
            >
              <Calendar className={`w-3.5 h-3.5 shrink-0 ${currentTab === 'expirations' ? 'text-stone-950' : expirySummary.hasAlerts ? 'text-rose-400' : 'text-amber-400'}`} />
              <span>Scadenze</span>
              {expirySummary.hasAlerts && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] leading-none font-extrabold bg-rose-500 text-white animate-pulse">
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

