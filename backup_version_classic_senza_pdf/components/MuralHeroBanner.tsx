import React, { useMemo } from 'react';
import { Sparkles, Sliders, RotateCcw, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useVending } from '../context/VendingContext';
import { formatEuro } from '../utils/vendingUtils';

export const MuralHeroBanner: React.FC = () => {
  const { machines, restockHistory, restoreSavedBackup, openRestockModal } = useVending();

  // Calcola l'incasso globale
  const totalRevenue = useMemo(() => {
    const historicalRevenue = restockHistory.reduce((acc, s) => acc + (s.totalRevenue || 0), 0);
    const currentCashInMachines = machines.reduce((acc, m) => acc + (m.cashBalance || 0), 0);
    return historicalRevenue + currentCashInMachines;
  }, [restockHistory, machines]);

  const totalSlots = machines.reduce((acc, m) => acc + (m.slots?.length || 0), 0);
  const totalStock = machines.reduce((acc, m) => acc + (m.slots || []).reduce((sAcc, s) => sAcc + s.currentStock, 0), 0);
  const totalCapacity = machines.reduce((acc, m) => acc + (m.slots || []).reduce((sAcc, s) => sAcc + s.capacity, 0), 0);
  const stockPercent = totalCapacity > 0 ? Math.round((totalStock / totalCapacity) * 100) : 0;

  return (
    <div className="relative mb-6 rounded-2xl border border-stone-800/80 bg-stone-900/50 backdrop-blur-md p-5 text-white shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Brand & Store Overview */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2.5">
            <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs">
              M&amp;S
            </span>
            <h1 className="font-outfit text-lg sm:text-xl font-bold text-white tracking-tight">
              Negozio Automatico H24
            </h1>
            <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Attivo</span>
            </span>
          </div>

          <p className="text-xs text-stone-400 max-w-2xl leading-relaxed">
            Gestione centralizzata dei 3 distributori del negozio: <strong className="text-stone-300">Caffè espresso &amp; calde</strong>, <strong className="text-stone-300">Snack &amp; alimentari</strong> e <strong className="text-stone-300">Bevande refrigerate</strong>.
          </p>

          {/* Machine summary badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-stone-800/60 border border-stone-700/60 text-2xs text-stone-300">
              <span>☕ DA-03 Calde:</span>
              <span className="font-semibold text-white">{machines.find(m => m.id === 'mach-03')?.slots?.length || 0} spirali</span>
            </div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-stone-800/60 border border-stone-700/60 text-2xs text-stone-300">
              <span>🍪 DA-02 Snack:</span>
              <span className="font-semibold text-white">{machines.find(m => m.id === 'mach-02')?.slots?.length || 0} spirali</span>
            </div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-stone-800/60 border border-stone-700/60 text-2xs text-stone-300">
              <span>🥤 DA-01 Bevande:</span>
              <span className="font-semibold text-white">{machines.find(m => m.id === 'mach-01')?.slots?.length || 0} spirali</span>
            </div>
          </div>
        </div>

        {/* Quick KPI stats */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <div className="px-4 py-3 rounded-xl bg-stone-800/50 border border-stone-700/50 min-w-[120px]">
            <span className="text-3xs text-stone-400 block uppercase font-medium tracking-wider">Incasso Cassa</span>
            <span className="text-base font-bold font-mono text-emerald-400 mt-0.5 block">
              {formatEuro(totalRevenue)}
            </span>
          </div>

          <div className="px-4 py-3 rounded-xl bg-stone-800/50 border border-stone-700/50 min-w-[120px]">
            <span className="text-3xs text-stone-400 block uppercase font-medium tracking-wider">Spirali Totali</span>
            <span className="text-base font-bold text-white mt-0.5 block">
              {totalSlots} <span className="text-xs font-normal text-stone-400">attive</span>
            </span>
          </div>

          <div className="px-4 py-3 rounded-xl bg-stone-800/50 border border-stone-700/50 min-w-[120px]">
            <span className="text-3xs text-stone-400 block uppercase font-medium tracking-wider">Scorte Totali</span>
            <span className="text-base font-bold text-amber-400 mt-0.5 block">
              {totalStock} <span className="text-xs font-normal text-stone-400">pezzi</span>
            </span>
          </div>
        </div>
      </div>

      {/* Avviso o guida quando i dati sono a zero */}
      {totalSlots === 0 && (
        <div className="mt-4 pt-3.5 border-t border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-stone-300">
            <Sliders className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Dati azzerati a zero:</strong> aggiungi a mano le spirali reali (es. A1, A2, 11, 12...) nella scheda <em>Distributori &amp; Spirali</em> o direttamente dalla <em>Carica Rapida</em>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Vuoi ripristinare la copia salvata con le spirali preimpostate di esempio?')) {
                restoreSavedBackup();
              }
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-2xs font-semibold border border-stone-700 transition-colors shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-amber-400" />
            <span>Ripristina Copia Precedente</span>
          </button>
        </div>
      )}
    </div>
  );
};
