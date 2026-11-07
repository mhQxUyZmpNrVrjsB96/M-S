import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart as PieIcon, 
  Package, 
  Calendar, 
  Store, 
  ArrowUpRight, 
  Layers, 
  Award, 
  DollarSign,
  Activity,
  Zap,
  Filter
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { useVending } from '../context/VendingContext';
import { formatEuro, formatPercent, CATEGORY_META } from '../utils/vendingUtils';
import { ProductCategory } from '../types';

const CATEGORY_COLORS: Record<ProductCategory, string> = {
  caffe_calde: '#d97706',     // amber-600
  bevande_fredde: '#0284c7',   // sky-600
  snack_dolci: '#e11d48',      // rose-600
  snack_salati: '#ea580c',     // orange-600
  freschi_healthy: '#059669',  // emerald-600
  utilities: '#7c3aed',        // violet-600
};

export const AnalyticsDashboard: React.FC = () => {
  const { restockHistory, machines, products } = useVending();

  const [periodFilter, setPeriodFilter] = useState<'all' | 'year' | '30days' | '7days' | 'today'>('all');
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'profit' | 'units'>('revenue');

  // Filtra sessioni per periodo
  const filteredSessions = useMemo(() => {
    const now = new Date();
    const nowTime = now.getTime();

    return restockHistory.filter(session => {
      const sessionDate = new Date(session.timestamp);
      const sessionTime = sessionDate.getTime();
      const diffHours = (nowTime - sessionTime) / (1000 * 3600);

      if (periodFilter === 'today') return diffHours <= 24;
      if (periodFilter === '7days') return diffHours <= 24 * 7;
      if (periodFilter === '30days') return diffHours <= 24 * 30;
      if (periodFilter === 'year') return sessionDate.getFullYear() === now.getFullYear();
      return true;
    });
  }, [restockHistory, periodFilter]);

  // KPI Numerici Globali del Periodo
  const numericalSummary = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalUnits = 0;

    for (const s of filteredSessions) {
      totalRevenue += s.totalRevenue || 0;
      totalCost += s.totalCost || 0;
      totalUnits += s.totalSold || 0;
    }

    const totalProfit = totalRevenue - totalCost;
    const marginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const avgTicket = totalUnits > 0 ? totalRevenue / totalUnits : 0;
    const avgProfitPerUnit = totalUnits > 0 ? totalProfit / totalUnits : 0;

    // Calcolo giorni coperti nel periodo
    const sessionDates = filteredSessions.map(s => new Date(s.timestamp).toDateString());
    const uniqueDays = new Set(sessionDates).size || 1;
    const dailyAvgRevenue = totalRevenue / uniqueDays;
    const dailyAvgUnits = totalUnits / uniqueDays;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      marginPct,
      totalUnits,
      avgTicket,
      avgProfitPerUnit,
      uniqueDays,
      dailyAvgRevenue,
      dailyAvgUnits,
      sessionCount: filteredSessions.length,
    };
  }, [filteredSessions]);

  // Dati Serie Storica per Grafico ad Area (Andamento Temporale)
  const timelineData = useMemo(() => {
    const map = new Map<string, { date: string; fullDate: string; revenue: number; cost: number; profit: number; units: number }>();

    // Ordina sessioni cronologicamente
    const sorted = [...filteredSessions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    for (const s of sorted) {
      const d = new Date(s.timestamp);
      const key = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
      const fullDate = d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });

      const current = map.get(key) || { date: key, fullDate, revenue: 0, cost: 0, profit: 0, units: 0 };
      current.revenue += (s.totalRevenue || 0);
      current.cost += (s.totalCost || 0);
      current.profit += (s.totalProfit || 0);
      current.units += (s.totalSold || 0);
      map.set(key, current);
    }

    return Array.from(map.values());
  }, [filteredSessions]);

  // Dati Ripartizione per Categoria (Torta / Donut)
  const categoryData = useMemo(() => {
    const stats: Record<ProductCategory, { name: string; category: ProductCategory; value: number; cost: number; units: number }> = {
      caffe_calde: { name: 'Caffè & Calde', category: 'caffe_calde', value: 0, cost: 0, units: 0 },
      bevande_fredde: { name: 'Bevande Fredde', category: 'bevande_fredde', value: 0, cost: 0, units: 0 },
      snack_dolci: { name: 'Snack Dolci', category: 'snack_dolci', value: 0, cost: 0, units: 0 },
      snack_salati: { name: 'Snack Salati', category: 'snack_salati', value: 0, cost: 0, units: 0 },
      freschi_healthy: { name: 'Freschi & Healthy', category: 'freschi_healthy', value: 0, cost: 0, units: 0 },
      utilities: { name: 'Utilities / Varie', category: 'utilities', value: 0, cost: 0, units: 0 },
    };

    for (const s of filteredSessions) {
      for (const item of (s.items || [])) {
        const prod = products.find(p => p.id === item.productId);
        const cat = (prod?.category || 'bevande_fredde') as ProductCategory;
        if (stats[cat]) {
          stats[cat].value += item.revenue;
          stats[cat].cost += item.cost;
          stats[cat].units += item.unitsSold;
        }
      }
    }

    return Object.values(stats).filter(s => s.value > 0 || s.units > 0);
  }, [filteredSessions, products]);

  // Confronto Performance tra i Distributori (Bar Chart)
  const machineComparisonData = useMemo(() => {
    return machines.map(m => {
      const machineSessions = filteredSessions.filter(s => s.machineId === m.id);
      const revenue = machineSessions.reduce((sum, s) => sum + s.totalRevenue, 0);
      const cost = machineSessions.reduce((sum, s) => sum + s.totalCost, 0);
      const profit = revenue - cost;
      const units = machineSessions.reduce((sum, s) => sum + s.totalSold, 0);

      return {
        name: m.code,
        fullName: m.name,
        revenue,
        cost,
        profit,
        units,
      };
    });
  }, [machines, filteredSessions]);

  // Top Prodotti Bestseller per volume e utile
  const topProducts = useMemo(() => {
    const map = new Map<string, { id: string; name: string; category: ProductCategory; units: number; revenue: number; cost: number; profit: number }>();

    for (const s of filteredSessions) {
      for (const item of (s.items || [])) {
        const existing = map.get(item.productId) || {
          id: item.productId,
          name: item.productName,
          category: 'bevande_fredde',
          units: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        };
        const prod = products.find(p => p.id === item.productId);
        if (prod) existing.category = prod.category;

        existing.units += item.unitsSold;
        existing.revenue += item.revenue;
        existing.cost += item.cost;
        existing.profit += item.profit;
        map.set(item.productId, existing);
      }
    }

    return Array.from(map.values()).sort((a, b) => b.units - a.units).slice(0, 8);
  }, [filteredSessions, products]);

  return (
    <div className="space-y-6">
      {/* Intestazione Statistiche & Filtro Periodo */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analisi Statistica &amp; Grafici Interattivi</span>
            </div>
            <h2 className="text-xl font-bold text-stone-900">
              Statistiche, Numeriche &amp; Grafici di Rendimento
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Visualizzazione analitica dei flussi di vendita, redditività per categoria, confronto distributori e metriche di rotazione.
            </p>
          </div>

          {/* Filtro Periodo */}
          <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 p-1.5 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPeriodFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                periodFilter === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tutto lo Storico
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('year')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                periodFilter === 'year' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              📅 Annuale
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('30days')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                periodFilter === '30days' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Ultimi 30 Giorni
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('7days')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                periodFilter === '7days' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Ultimi 7 Giorni
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('today')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                periodFilter === 'today' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Ultime 24 Ore
            </button>
          </div>
        </div>
      </div>

      {/* RIEPILOGO NUMERICO A 5 METRICHE CHIAVE */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <span className="text-3xs font-semibold uppercase text-stone-400 block tracking-wider">Fatturato Periodo</span>
          <span className="text-2xl font-bold font-mono text-stone-900 mt-1 block">
            {formatEuro(numericalSummary.totalRevenue)}
          </span>
          <span className="text-2xs text-stone-500 mt-1 block">
            Media giornaliera: <strong>{formatEuro(numericalSummary.dailyAvgRevenue)}</strong>
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <span className="text-3xs font-semibold uppercase text-stone-400 block tracking-wider">Pezzi Erogati</span>
          <span className="text-2xl font-bold font-mono text-blue-700 mt-1 block">
            {numericalSummary.totalUnits} <span className="text-xs font-normal text-stone-400">pz</span>
          </span>
          <span className="text-2xs text-stone-500 mt-1 block">
            Media: <strong>{Math.round(numericalSummary.dailyAvgUnits)} pz/giorno</strong>
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <span className="text-3xs font-semibold uppercase text-stone-400 block tracking-wider">Costo Merci (COGS)</span>
          <span className="text-2xl font-bold font-mono text-stone-600 mt-1 block">
            {formatEuro(numericalSummary.totalCost)}
          </span>
          <span className="text-2xs text-stone-500 mt-1 block">Base FIFO su lotti acquisto</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <span className="text-3xs font-semibold uppercase text-stone-400 block tracking-wider">Guadagno Lordo Merci</span>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className={`text-2xl font-bold font-mono ${numericalSummary.totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatEuro(numericalSummary.totalProfit)}
            </span>
            <span className="text-2xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              {formatPercent(numericalSummary.marginPct)}
            </span>
          </div>
          <span className="text-2xs text-stone-500 mt-1 block">Margine operativo sulle vendite</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs col-span-2 lg:col-span-1">
          <span className="text-3xs font-semibold uppercase text-stone-400 block tracking-wider">Scontrino Medio</span>
          <span className="text-2xl font-bold font-mono text-purple-700 mt-1 block">
            {formatEuro(numericalSummary.avgTicket)}
          </span>
          <span className="text-2xs text-stone-500 mt-1 block">
            Utile medio/pezzo: <strong>{formatEuro(numericalSummary.avgProfitPerUnit)}</strong>
          </span>
        </div>
      </div>

      {/* GRAFICO 1: TREND TEMPORALE FATTURATO & MARGINE (AreaChart) */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-base font-bold text-stone-900">
              Andamento Temporale Vendite e Guadagni
            </h3>
            <p className="text-xs text-stone-500">
              Curva cronologica del fatturato e del margine netto per ciascuna sessione di carico
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <button
              type="button"
              onClick={() => setActiveMetric('revenue')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeMetric === 'revenue' ? 'bg-blue-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Fatturato (€)
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('profit')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeMetric === 'profit' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Utile Netto (€)
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('units')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeMetric === 'units' ? 'bg-purple-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Pezzi Venduti (pz)
            </button>
          </div>
        </div>

        {timelineData.length === 0 ? (
          <div className="py-16 text-center text-stone-400 text-xs">
            Nessuna sessione di vendita registrata nel periodo selezionato.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop 
                      offset="5%" 
                      stopColor={activeMetric === 'revenue' ? '#2563eb' : activeMetric === 'profit' ? '#059669' : '#9333ea'} 
                      stopOpacity={0.3} 
                    />
                    <stop 
                      offset="95%" 
                      stopColor={activeMetric === 'revenue' ? '#2563eb' : activeMetric === 'profit' ? '#059669' : '#9333ea'} 
                      stopOpacity={0} 
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  tickLine={false} 
                  tickFormatter={(val) => activeMetric === 'units' ? `${val}pz` : `€${val}`}
                />
                <Tooltip 
                  formatter={(val: number) => [
                    activeMetric === 'units' ? `${val} pz` : formatEuro(val),
                    activeMetric === 'revenue' ? 'Fatturato' : activeMetric === 'profit' ? 'Guadagno Netto' : 'Pezzi Venduti'
                  ]}
                  labelFormatter={(label) => `Data: ${label}`}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey={activeMetric} 
                  stroke={activeMetric === 'revenue' ? '#2563eb' : activeMetric === 'profit' ? '#059669' : '#9333ea'} 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorMetric)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* DUE GRAFICI AFFIANCATI: Ripartizione Categorie & Confronto Distributori */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafico a Torta / Donut: Incassi per Categoria */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs">
          <div className="mb-4">
            <h3 className="text-base font-bold text-stone-900">
              Spaccato per Categoria Merceologica
            </h3>
            <p className="text-xs text-stone-500">
              Ripartizione del fatturato tra caffè, bevande, snack, freschi e utilities
            </p>
          </div>

          {categoryData.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-xs">
              Nessun dato di categoria presente.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="h-60 w-60 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {categoryData.map((entry) => (
                        <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: number) => [formatEuro(val), 'Fatturato']}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legenda Dettagliata */}
              <div className="space-y-2 w-full text-xs">
                {categoryData.map(cat => {
                  const pct = numericalSummary.totalRevenue > 0 ? (cat.value / numericalSummary.totalRevenue) * 100 : 0;
                  return (
                    <div key={cat.category} className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-100">
                      <div className="flex items-center space-x-2">
                        <span 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: CATEGORY_COLORS[cat.category] || '#64748b' }} 
                        />
                        <span className="font-semibold text-stone-800">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold font-mono text-stone-900 block">{formatEuro(cat.value)}</span>
                        <span className="text-3xs text-stone-500">{pct.toFixed(1)}% • {cat.units} pz</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Grafico a Barre: Confronto Performance tra Distributori */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs">
          <div className="mb-4">
            <h3 className="text-base font-bold text-stone-900">
              Confronto Distributori Negozio H24
            </h3>
            <p className="text-xs text-stone-500">
              Fatturato vs Costi Merci per ciascuna macchinetta automatica
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={machineComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} tickFormatter={(v) => `€${v}`} />
                <Tooltip 
                  formatter={(val: number, name: string) => [
                    formatEuro(val), 
                    name === 'revenue' ? 'Fatturato' : name === 'cost' ? 'Costo Merci' : 'Utile Netto'
                  ]}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Legend 
                  formatter={(value) => value === 'revenue' ? 'Fatturato' : value === 'cost' ? 'Costi Merci' : 'Guadagno'} 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CLASSIFICA TOP BESTSELLER */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-stone-900">
              Classifica Top Bestseller (Articoli Più Venduti)
            </h3>
          </div>
          <span className="text-xs text-stone-500">Ordinati per pezzi venduti</span>
        </div>

        {topProducts.length === 0 ? (
          <div className="py-8 text-center text-stone-400 text-xs">
            Nessuna vendita registrata.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {topProducts.map((prod, idx) => {
              const meta = CATEGORY_META[prod.category];
              return (
                <div key={prod.id} className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/90 relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-700 text-2xs font-black flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    {meta && (
                      <span className={`text-3xs px-2 py-0.5 rounded-full font-semibold border ${meta.bg} ${meta.color} ${meta.border}`}>
                        {meta.label}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-stone-900 truncate" title={prod.name}>
                    {prod.name}
                  </h4>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-200 text-xs">
                    <div>
                      <span className="text-3xs text-stone-400 block uppercase">Venduti</span>
                      <span className="font-bold font-mono text-stone-800">{prod.units} pz</span>
                    </div>
                    <div className="text-right">
                      <span className="text-3xs text-stone-400 block uppercase">Utile Netto</span>
                      <span className="font-bold font-mono text-emerald-600">{formatEuro(prod.profit)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
