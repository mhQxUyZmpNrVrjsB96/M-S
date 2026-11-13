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
  Save,
  ChevronDown,
  Clock,
  Upload,
  Database,
  Cloud
} from 'lucide-react';
import { NavTab } from '../Navbar';
import { useVending } from '../../context/VendingContext';
import { BackupRestoreModal } from '../BackupRestoreModal';
import { SupabaseSyncModal } from '../common/SupabaseSyncModal';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileMoreDrawer } from './MobileMoreDrawer';
import { MobileQuickRestock } from './MobileQuickRestock';
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

interface MobileAppLayoutProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onSwitchToDesktop: () => void;
  onSwitchToTablet?: () => void;
}

export const MobileAppLayout: React.FC<MobileAppLayoutProps> = ({
  currentTab,
  onSelectTab,
  onSwitchToDesktop,
  onSwitchToTablet,
}) => {
  const { 
    canUndo, 
    lastActionName, 
    undoLastAction, 
    exportBackupJSON,
    saveAllDataNow,
    checkpoints,
    restoreCheckpoint,
    supabaseStatus
  } = useVending();

  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreModalTab, setRestoreModalTab] = useState<'save' | 'restore'>('restore');
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);

  const handleQuickBackup = () => {
    exportBackupJSON();
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  return (
    <div className="min-h-screen bg-cosmic-nebula text-stone-100 flex flex-col font-sans antialiased selection:bg-amber-500 selection:text-stone-950 pb-20">
      {/* 1. HEADER COMPATTO PER SMARTPHONE */}
      <header className="sticky top-0 z-40 bg-stone-950/95 backdrop-blur-md border-b border-stone-800 px-3 py-2.5 shadow-lg">
        <div className="flex items-center justify-between">
          {/* Logo brand compatto */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-stone-900 border border-amber-500/60 flex items-center justify-center shadow-xs">
              <span className="font-graffiti text-amber-300 text-sm font-extrabold">M&amp;S</span>
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <span className="font-graffiti text-xs font-black text-white tracking-wide">M&amp;S TAKE A MANAGMENT</span>
              </div>
              <span className="text-[10px] text-stone-400 block leading-tight">Punto Vendita H24</span>
            </div>
          </div>

          {/* Azioni rapide di testata */}
          <div className="flex items-center space-x-1.5">
            {canUndo && (
              <button
                type="button"
                onClick={undoLastAction}
                className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-pointer active:scale-95"
                title={`Annulla: ${lastActionName}`}
              >
                <Undo2 className="w-4 h-4" />
              </button>
            )}

            {/* Tasto Cloud Supabase Mobile */}
            <button
              type="button"
              id="btn-mobile-supabase-sync"
              onClick={() => setIsSupabaseModalOpen(true)}
              className={`p-2 rounded-xl border cursor-pointer active:scale-95 transition-all flex items-center justify-center relative ${
                supabaseStatus === 'connected'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/70'
                  : supabaseStatus === 'connecting'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-600/70 animate-pulse'
                  : supabaseStatus === 'error'
                  ? 'bg-rose-950/80 text-rose-300 border-rose-600/70'
                  : 'bg-stone-900 text-stone-400 border-stone-700/80'
              }`}
              title="Cloud Supabase: Sincronizzazione in tempo reale"
            >
              <Cloud className="w-4 h-4" />
              <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-stone-950 ${
                supabaseStatus === 'connected' ? 'bg-emerald-400 animate-pulse' :
                supabaseStatus === 'connecting' ? 'bg-amber-400 animate-ping' :
                supabaseStatus === 'error' ? 'bg-rose-400' : 'bg-stone-500'
              }`} />
            </button>

            {/* Tasto Salva Dati Istantaneo */}
            <button
              type="button"
              onClick={() => {
                saveAllDataNow();
                setShowSavedToast(true);
                setTimeout(() => setShowSavedToast(false), 3000);
              }}
              className="p-2 rounded-xl bg-emerald-950/80 text-emerald-300 border border-emerald-600/70 hover:border-emerald-500 cursor-pointer active:scale-95 shadow-xs"
              title="Salva subito tutti i dati e valori del gestionale"
            >
              <Save className="w-4 h-4 text-emerald-400" />
            </button>

            <button
              type="button"
              onClick={handleQuickBackup}
              className="p-2 rounded-xl bg-stone-900 text-amber-300 border border-stone-700/80 cursor-pointer active:scale-95"
              title="Salva e scarica copia file .JSON"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Switch Tablet */}
            {onSwitchToTablet && (
              <button
                type="button"
                onClick={onSwitchToTablet}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-2xs font-bold border border-amber-500/40 cursor-pointer active:scale-95"
                title="Passa alla visualizzazione Tablet"
              >
                <Tablet className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Tablet</span>
              </button>
            )}

            {/* Switch Desktop */}
            <button
              type="button"
              onClick={onSwitchToDesktop}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-cyan-300 text-2xs font-bold border border-cyan-500/40 cursor-pointer active:scale-95"
              title="Torna alla visualizzazione desktop completa"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Desktop</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. TOAST CONFERMA DOWNLOAD / BACKUP */}
      {showSavedToast && (
        <div className="fixed top-14 left-4 right-4 z-50 bg-amber-500 text-stone-950 px-4 py-2.5 rounded-2xl shadow-xl flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4" />
            <span>Copia di sicurezza scaricata con successo!</span>
          </div>
          <button onClick={() => setShowSavedToast(false)} className="text-stone-950 font-black">
            ✕
          </button>
        </div>
      )}

      {/* 3. CONTENUTO ATTIVO DELLA TAB */}
      <main className="flex-1 px-3 py-3 max-w-lg w-full mx-auto">
        {currentTab === 'quick_restock' && (
          <MobileQuickRestock onRestockSuccess={() => {}} />
        )}
        {currentTab === 'stock' && (
          <div className="space-y-4">
            <StockMonitor onNavigateToWarehouse={() => onSelectTab('warehouse')} />
          </div>
        )}
        {currentTab === 'spirals_monitor' && (
          <div className="space-y-4">
            <SpiralsFinancialMonitor />
          </div>
        )}
        {currentTab === 'maintenance' && (
          <div className="space-y-4">
            <MaintenanceManager />
          </div>
        )}
        {currentTab === 'warehouse' && (
          <div className="space-y-4">
            <WarehouseStockView onNavigateToPurchases={() => onSelectTab('purchases')} />
          </div>
        )}
        {currentTab === 'purchases' && (
          <div className="space-y-4">
            <PurchasesManager />
          </div>
        )}
        {currentTab === 'dashboard' && (
          <div className="space-y-4">
            <ProfitsDashboard />
          </div>
        )}
        {currentTab === 'analytics' && (
          <div className="space-y-4">
            <AnalyticsDashboard />
          </div>
        )}
        {currentTab === 'fixed_costs' && (
          <div className="space-y-4">
            <FixedCostsManager />
          </div>
        )}
        {currentTab === 'products' && (
          <div className="space-y-4">
            <ProductCatalog />
          </div>
        )}
        {currentTab === 'expirations' && (
          <div className="space-y-4">
            <ExpirationsManager onNavigateToPurchases={() => onSelectTab('purchases')} />
          </div>
        )}
      </main>

      {/* 4. BARRA DI NAVIGAZIONE INFERIORE (BOTTOM NAV) */}
      <MobileBottomNav
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        onOpenMoreMenu={() => setIsDrawerOpen(true)}
      />

      {/* 5. DRAWER MENU MOBILE */}
      <MobileMoreDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelectTab={onSelectTab}
        onSwitchToDesktop={onSwitchToDesktop}
        onSwitchToTablet={onSwitchToTablet}
      />

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
