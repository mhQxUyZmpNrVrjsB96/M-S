import React, { useMemo } from 'react';
import { 
  Zap, 
  Layers, 
  Wrench, 
  Warehouse, 
  Menu,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { NavTab } from '../Navbar';
import { useVending } from '../../context/VendingContext';
import { getExpirySummary } from '../../utils/expiryUtils';

interface MobileBottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenMoreMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenMoreMenu,
}) => {
  const { purchases, products } = useVending();
  const expirySummary = useMemo(() => getExpirySummary(purchases), [purchases]);
  const warehouseAlertCount = useMemo(() => {
    return products.filter(p => {
      const threshold = p.warehouseAlertThreshold ?? 8;
      return (p.warehouseStock || 0) <= threshold;
    }).length;
  }, [products]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-stone-950/98 backdrop-blur-lg border-t border-stone-800/90 py-1.5 px-1.5 safe-area-bottom">
      <div className="max-w-md mx-auto grid grid-cols-6 gap-0.5">
        {/* Tab 1: Riconciliazione & Carico */}
        <button
          type="button"
          onClick={() => onSelectTab('quick_restock')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
            currentTab === 'quick_restock'
              ? 'text-amber-400 font-black'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentTab === 'quick_restock' ? 'bg-amber-500/20' : ''}`}>
            <Zap className="w-4.5 h-4.5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-bold whitespace-nowrap">Carica</span>
        </button>

        {/* Tab 2: Monitor Macchine & Spirali */}
        <button
          type="button"
          onClick={() => onSelectTab('stock')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
            currentTab === 'stock'
              ? 'text-amber-400 font-black'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentTab === 'stock' ? 'bg-amber-500/20' : ''}`}>
            <Layers className="w-4.5 h-4.5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-bold whitespace-nowrap">Spirali</span>
        </button>

        {/* Tab 3: Manutenzioni */}
        <button
          type="button"
          onClick={() => onSelectTab('maintenance')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
            currentTab === 'maintenance'
              ? 'text-amber-400 font-black'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentTab === 'maintenance' ? 'bg-amber-500/20' : ''}`}>
            <Wrench className="w-4.5 h-4.5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-bold whitespace-nowrap">Manut.</span>
        </button>

        {/* Tab 4: Magazzino */}
        <button
          type="button"
          onClick={() => onSelectTab('warehouse')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer relative ${
            currentTab === 'warehouse'
              ? 'text-amber-400 font-black'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <div className={`p-1 rounded-lg relative ${currentTab === 'warehouse' ? 'bg-amber-500/20' : ''}`}>
            <Warehouse className="w-4.5 h-4.5" />
            {warehouseAlertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-amber-500 text-stone-950 font-black text-[8px] flex items-center justify-center ring-1 ring-stone-950">
                {warehouseAlertCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-bold whitespace-nowrap">Magazz.</span>
        </button>

        {/* Tab 5: Menu Altro */}
        <button
          type="button"
          onClick={onOpenMoreMenu}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer relative ${
            currentTab === 'purchases' || currentTab === 'dashboard' || currentTab === 'products'
              ? 'text-amber-400 font-black'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <div className="p-1 rounded-lg relative">
            <Menu className="w-4.5 h-4.5" />
            {expirySummary.hasAlerts && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-stone-950 animate-ping" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-bold whitespace-nowrap">Altro</span>
        </button>

        {/* Tab 6: Tasto Scadenze Prodotti (IN FONDO A DESTRA) con ALLERT a 2 settimane */}
        <button
          id="btn-mobile-nav-expirations"
          type="button"
          onClick={() => onSelectTab('expirations')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer relative ${
            currentTab === 'expirations'
              ? 'text-amber-400 font-black'
              : expirySummary.hasAlerts
                ? 'text-rose-400 font-bold'
                : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <div className={`p-1 rounded-lg relative ${currentTab === 'expirations' ? 'bg-amber-500/20' : ''}`}>
            <Calendar className="w-4.5 h-4.5" />
            {expirySummary.hasAlerts && (
              <span className="absolute -top-1 -right-2 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-stone-950 shadow-md animate-pulse">
                {expirySummary.activeAlertsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-bold whitespace-nowrap flex items-center">
            Scadenze
            {expirySummary.hasAlerts && <span className="ml-0.5 text-rose-400 text-3xs font-black">!</span>}
          </span>
        </button>
      </div>
    </nav>
  );
};
