import React, { useState } from 'react';
import { 
  Monitor, 
  Smartphone, 
  Download, 
  RotateCcw, 
  Sparkles,
  Undo2,
  Wrench,
  Check
} from 'lucide-react';
import { NavTab } from '../Navbar';
import { useVending } from '../../context/VendingContext';
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

interface MobileAppLayoutProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onSwitchToDesktop: () => void;
}

export const MobileAppLayout: React.FC<MobileAppLayoutProps> = ({
  currentTab,
  onSelectTab,
  onSwitchToDesktop,
}) => {
  const { 
    canUndo, 
    lastActionName, 
    undoLastAction, 
    exportBackupJSON 
  } = useVending();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

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
                <span className="font-graffiti text-xs font-black text-white tracking-wide">M&amp;S H24</span>
                <span className="px-1.5 py-0.2 rounded text-3xs font-mono font-bold bg-amber-500 text-stone-950">
                  MOBILE
                </span>
              </div>
              <span className="text-[10px] text-stone-400 block leading-tight">Gestione Distributori</span>
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

            <button
              type="button"
              onClick={handleQuickBackup}
              className="p-2 rounded-xl bg-stone-900 text-amber-300 border border-stone-700/80 cursor-pointer active:scale-95"
              title="Salva e scarica copia dati"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Switch Desktop */}
            <button
              type="button"
              onClick={onSwitchToDesktop}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-cyan-300 text-2xs font-bold border border-cyan-500/40 cursor-pointer active:scale-95"
              title="Torna alla visualizzazione desktop completa"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
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
      />
    </div>
  );
};
