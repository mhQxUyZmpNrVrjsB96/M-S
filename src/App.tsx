import React, { useState, useEffect } from 'react';
import { VendingProvider } from './context/VendingContext';
import { Navbar, NavTab } from './components/Navbar';
import { QuickStoreRestock } from './components/QuickStoreRestock';
import { ProfitsDashboard } from './components/ProfitsDashboard';
import { StockMonitor } from './components/StockMonitor';
import { WarehouseStockView } from './components/WarehouseStockView';
import { ProductCatalog } from './components/ProductCatalog';
import { PurchasesManager } from './components/PurchasesManager';
import { RestockModal } from './components/RestockModal';
import { UndoNotificationBanner } from './components/UndoNotificationBanner';
import { MuralHeroBanner } from './components/MuralHeroBanner';
import { MaintenanceManager } from './components/MaintenanceManager';
import { ExpirationsManager } from './components/ExpirationsManager';
import { SpiralsFinancialMonitor } from './components/SpiralsFinancialMonitor';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { FixedCostsManager } from './components/FixedCostsManager';
import { MobileAppLayout } from './components/mobile/MobileAppLayout';
import { TabletAppLayout } from './components/tablet/TabletAppLayout';
import { Smartphone, Tablet, Monitor, Check } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { StorageErrorBanner } from './components/StorageErrorBanner';

function MainLayout() {
  const [currentTab, setCurrentTab] = useState<NavTab>('quick_restock');
  
  // Modalità di visualizzazione: 'desktop', 'tablet' o 'mobile'
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>(() => {
    try {
      const saved = localStorage.getItem('vending_view_mode');
      if (saved === 'desktop' || saved === 'tablet' || saved === 'mobile') return saved;
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 640) return 'mobile';
        if (window.innerWidth < 1024) return 'tablet';
      }
      return 'desktop';
    } catch {
      return 'desktop';
    }
  });

  const handleSetViewMode = (mode: 'desktop' | 'tablet' | 'mobile') => {
    setViewMode(mode);
    try {
      localStorage.setItem('vending_view_mode', mode);
    } catch (e) {
      console.error(e);
    }
  };

  // 1. Modalità Telefono (Smartphone Mobile-First)
  if (viewMode === 'mobile') {
    return (
      <ErrorBoundary
        fallbackTitle="Visualizzazione Mobile"
        onSwitchToDesktop={() => handleSetViewMode('desktop')}
      >
        <MobileAppLayout
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onSwitchToDesktop={() => handleSetViewMode('desktop')}
          onSwitchToTablet={() => handleSetViewMode('tablet')}
        />
        {/* Modali globali */}
        <RestockModal />
        <UndoNotificationBanner />
      </ErrorBoundary>
    );
  }

  // 2. Modalità Tablet (Touchscreen intermedio 768px-1024px con barra touch)
  if (viewMode === 'tablet') {
    return (
      <ErrorBoundary
        fallbackTitle="Visualizzazione Tablet"
        onSwitchToDesktop={() => handleSetViewMode('desktop')}
      >
        <TabletAppLayout
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onSwitchToDesktop={() => handleSetViewMode('desktop')}
          onSwitchToMobile={() => handleSetViewMode('mobile')}
        />
        {/* Modali globali */}
        <RestockModal />
        <UndoNotificationBanner />
      </ErrorBoundary>
    );
  }

  // 3. Altrimenti modalità Desktop (Copia originale)
  return (
    <div className="min-h-screen bg-cosmic-nebula text-stone-100 flex flex-col font-sans antialiased selection:bg-amber-500 selection:text-stone-950">
      {/* Navigation Header Desktop */}
      <Navbar 
        currentTab={currentTab} 
        onSelectTab={setCurrentTab} 
        onSwitchToMobile={() => handleSetViewMode('mobile')}
        onSwitchToTablet={() => handleSetViewMode('tablet')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Mural Tribute Hero Banner */}
        <MuralHeroBanner />

        {currentTab === 'quick_restock' && <QuickStoreRestock />}
        {currentTab === 'stock' && <StockMonitor onNavigateToWarehouse={() => setCurrentTab('warehouse')} />}
        {currentTab === 'spirals_monitor' && <SpiralsFinancialMonitor />}
        {currentTab === 'maintenance' && <MaintenanceManager />}
        {currentTab === 'warehouse' && <WarehouseStockView onNavigateToPurchases={() => setCurrentTab('purchases')} />}
        {currentTab === 'purchases' && <PurchasesManager />}
        {currentTab === 'dashboard' && <ProfitsDashboard />}
        {currentTab === 'analytics' && <AnalyticsDashboard />}
        {currentTab === 'fixed_costs' && <FixedCostsManager />}
        {currentTab === 'products' && <ProductCatalog />}
        {currentTab === 'expirations' && <ExpirationsManager onNavigateToPurchases={() => setCurrentTab('purchases')} />}
      </main>

      {/* Global Restock & Reconciliation Modal */}
      <RestockModal />

      {/* Floating Undo Notification Toast */}
      <UndoNotificationBanner />

      {/* Footer */}
      <footer className="border-t border-stone-800/80 bg-stone-950/90 py-5 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400 gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-graffiti text-amber-400 text-sm font-bold tracking-wide">M&amp;S</span>
            <span className="font-bold text-white uppercase tracking-wider">TAKE A MANAGMENT</span>
            <span className="text-stone-600">•</span>
            <span className="text-stone-400">Negozio H24 Distributori Automatici</span>
          </div>
          <div className="flex items-center space-x-3 text-2xs text-stone-400">
            <button
              onClick={() => handleSetViewMode('mobile')}
              className="text-amber-400 hover:underline flex items-center gap-1 font-bold"
            >
              <Smartphone className="w-3 h-3" />
              Versione per Telefono
            </button>
            <span className="text-stone-700">•</span>
            <span>Riconciliazione Rapida &amp; Lotti</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <VendingProvider>
        <StorageErrorBanner />
        <MainLayout />
      </VendingProvider>
    </ErrorBoundary>
  );
}

