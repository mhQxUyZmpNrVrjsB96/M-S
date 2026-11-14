import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Coins, 
  CreditCard, 
  Package, 
  ArrowUpRight, 
  Download, 
  Calendar, 
  Filter, 
  BarChart2, 
  PieChart, 
  Coffee,
  CheckCircle2,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';
import { useVending } from '../context/VendingContext';
import { 
  formatEuro, 
  formatPercent, 
  CATEGORY_META, 
  exportSalesCSV,
  formatBatchConsumptionSummary,
  oggiLocale
} from '../utils/vendingUtils';
import { ProductCategory, RestockSession } from '../types';

export const ProfitsDashboard: React.FC = () => {
  const { restockHistory, machines, products, openRestockModal } = useVending();

  const [dateFilter, setDateFilter] = useState<'all' | 'year' | '30days' | '7days' | 'today' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [selectedMachineFilter, setSelectedMachineFilter] = useState<string>('all');
  const [activeChartPoint, setActiveChartPoint] = useState<number | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Rilevamento della prima immissione di prodotto (Richiesta utente: visualizzare quando è stata fatta la prima carica)
  const firstLoadInfo = useMemo(() => {
    if (!restockHistory || restockHistory.length === 0) return null;
    const sorted = [...restockHistory].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const first = sorted[0];
    return {
      timestamp: first.timestamp,
      machineName: first.machineName,
      machineCode: first.machineCode,
      dateStr: new Date(first.timestamp).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      timeStr: new Date(first.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      itemsCount: first.items?.length || 0,
      totalSold: first.totalSold || 0,
    };
  }, [restockHistory]);

  // Filtra sessioni storiche in base al periodo (include Annuale e Calendario Manuale) e distributore
  const filteredSessions = useMemo(() => {
    const now = new Date();
    const nowTime = now.getTime();

    return restockHistory.filter(session => {
      // Filtro per macchina
      if (selectedMachineFilter !== 'all' && session.machineId !== selectedMachineFilter) {
        return false;
      }

      const sessionDate = new Date(session.timestamp);
      const sessionTime = sessionDate.getTime();
      const diffHours = (nowTime - sessionTime) / (1000 * 3600);

      if (dateFilter === 'today') {
        return diffHours <= 24;
      }
      if (dateFilter === '7days') {
        return diffHours <= 24 * 7;
      }
      if (dateFilter === '30days') {
        return diffHours <= 24 * 30;
      }
      if (dateFilter === 'year') {
        // Vista annuale solare corrente
        return sessionDate.getFullYear() === now.getFullYear();
      }
      if (dateFilter === 'custom') {
        if (customStartDate) {
          const start = new Date(customStartDate + 'T00:00:00').getTime();
          if (sessionTime < start) return false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate + 'T23:59:59').getTime();
          if (sessionTime > end) return false;
        }
        return true;
      }
      // 'all': parte dalla prima immissione del prodotto
      return true;
    });
  }, [restockHistory, dateFilter, customStartDate, customEndDate, selectedMachineFilter]);

  // Aggregazione KPI principali (Partono dalla prima immissione)
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalRemovedLoss = 0;
    let totalSold = 0;
    let totalCashCollected = 0;

    for (const session of filteredSessions) {
      totalRevenue += session.totalRevenue;
      totalCost += session.totalCost;
      totalRemovedLoss += (session.totalRemovedLoss || 0);
      totalSold += session.totalSold;
      totalCashCollected += (session.cashCollected || 0);
    }

    const totalProfit = totalRevenue - totalCost - totalRemovedLoss;
    const marginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const avgPerRestock = filteredSessions.length > 0 ? totalRevenue / filteredSessions.length : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      marginPct,
      totalSold,
      totalCashCollected,
      avgPerRestock,
      sessionsCount: filteredSessions.length,
    };
  }, [filteredSessions]);

  // Aggregazione vendite per Categoria di Prodotto (inclusa voce 'utilities' richiesta dall'utente)
  const categoryStats = useMemo(() => {
    const stats: Record<ProductCategory, { category: ProductCategory; revenue: number; cost: number; units: number }> = {
      caffe_calde: { category: 'caffe_calde', revenue: 0, cost: 0, units: 0 },
      bevande_fredde: { category: 'bevande_fredde', revenue: 0, cost: 0, units: 0 },
      snack_dolci: { category: 'snack_dolci', revenue: 0, cost: 0, units: 0 },
      snack_salati: { category: 'snack_salati', revenue: 0, cost: 0, units: 0 },
      freschi_healthy: { category: 'freschi_healthy', revenue: 0, cost: 0, units: 0 },
      utilities: { category: 'utilities', revenue: 0, cost: 0, units: 0 },
    };

    for (const session of filteredSessions) {
      for (const item of session.items) {
        const prod = products.find(p => p.id === item.productId);
        const cat = (prod?.category || 'bevande_fredde') as ProductCategory;
        if (stats[cat]) {
          stats[cat].revenue += item.revenue;
          stats[cat].cost += item.cost;
          stats[cat].units += item.unitsSold;
        }
      }
    }

    return Object.values(stats)
      .map(s => {
        const profit = s.revenue - s.cost;
        const marginPct = s.revenue > 0 ? (profit / s.revenue) * 100 : 0;
        const sharePct = metrics.totalRevenue > 0 ? (s.revenue / metrics.totalRevenue) * 100 : 0;
        return {
          ...s,
          profit,
          marginPct,
          sharePct,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredSessions, products, metrics.totalRevenue]);

  // Ranking Top Prodotti per Redditività
  const topProducts = useMemo(() => {
    const map = new Map<string, { id: string; name: string; category: ProductCategory; units: number; revenue: number; cost: number }>();

    for (const session of filteredSessions) {
      for (const item of session.items) {
        const existing = map.get(item.productId) || {
          id: item.productId,
          name: item.productName,
          category: 'bevande_fredde',
          units: 0,
          revenue: 0,
          cost: 0,
        };
        const prod = products.find(p => p.id === item.productId);
        if (prod) existing.category = prod.category;

        existing.units += item.unitsSold;
        existing.revenue += item.revenue;
        existing.cost += item.cost;
        map.set(item.productId, existing);
      }
    }

    return Array.from(map.values())
      .map(p => {
        const profit = p.revenue - p.cost;
        const marginPct = p.revenue > 0 ? (profit / p.revenue) * 100 : 0;
        return { ...p, profit, marginPct };
      })
      .sort((a, b) => b.profit - a.profit);
  }, [filteredSessions, products]);

  // Aggregazione andamento per data per il grafico giornaliero
  const dailyTimeline = useMemo(() => {
    const daysMap = new Map<string, { date: string; revenue: number; cost: number; profit: number; units: number }>();

    // Raccogli dalle sessioni
    for (const s of filteredSessions) {
      const dateKey = new Date(s.timestamp).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const current = daysMap.get(dateKey) || { date: dateKey, revenue: 0, cost: 0, profit: 0, units: 0 };
      current.revenue += s.totalRevenue;
      current.cost += s.totalCost;
      current.profit += s.totalProfit;
      current.units += s.totalSold;
      daysMap.set(dateKey, current);
    }

    // Se ci sono poche date, creiamo una serie temporale continuativa
    const result = Array.from(daysMap.values());
    if (result.length === 0) {
      return [
        { date: 'Oggi', revenue: 0, cost: 0, profit: 0, units: 0 },
      ];
    }
    return result;
  }, [filteredSessions]);

  // Calcolo altezze e coordinate per il grafico SVG
  const maxChartRevenue = useMemo(() => {
    return Math.max(50, ...dailyTimeline.map(d => d.revenue * 1.2));
  }, [dailyTimeline]);

  // Esportazione CSV
  const handleExportCSV = () => {
    const rows = filteredSessions.flatMap(session => 
      session.items.map(item => ({
        DataRilevazione: new Date(session.timestamp).toLocaleDateString('it-IT'),
        Ora: new Date(session.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        CodiceDistributore: session.machineCode,
        NomeDistributore: session.machineName,
        SlotSpirale: item.slotLabel,
        Prodotto: item.productName,
        ScortaPrecedente: item.previousStock,
        RimanenzaContata: item.countedRemaining,
        QuantitaVenduta: item.unitsSold,
        PrezzoVendita: item.salePrice.toFixed(2),
        CostoUnitario: item.unitCost.toFixed(2),
        IncassoLordo: item.revenue.toFixed(2),
        CostoTotale: item.cost.toFixed(2),
        ProfittoNetto: item.profit.toFixed(2),
        CaricaAggiunta: item.addedStock,
        NuovaScorta: item.newStock,
      }))
    );

    if (rows.length === 0) {
      alert('Nessun dato da esportare per i filtri selezionati.');
      return;
    }

    exportSalesCSV(`Report_Profitti_Vending_${dateFilter}_${oggiLocale()}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Export Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center space-x-1.5 text-xs text-stone-500 font-semibold uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-stone-400" />
              <span>Periodo:</span>
            </div>

            <div className="flex flex-wrap items-center rounded-lg border border-stone-200 bg-stone-100 p-1 text-xs gap-1">
              <button
                onClick={() => { setDateFilter('all'); setShowDatePicker(false); }}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  dateFilter === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Tutto (Dalla 1ª Carica)
              </button>
              <button
                onClick={() => { setDateFilter('year'); setShowDatePicker(false); }}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  dateFilter === 'year' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                📅 Annuale
              </button>
              <button
                onClick={() => { setDateFilter('30days'); setShowDatePicker(false); }}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  dateFilter === '30days' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Ultimi 30 Giorni
              </button>
              <button
                onClick={() => { setDateFilter('7days'); setShowDatePicker(false); }}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  dateFilter === '7days' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Ultimi 7 Giorni
              </button>
              <button
                onClick={() => { setDateFilter('today'); setShowDatePicker(false); }}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  dateFilter === 'today' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Ultime 24 Ore
              </button>
              <button
                onClick={() => {
                  setDateFilter('custom');
                  setShowDatePicker(!showDatePicker);
                }}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  dateFilter === 'custom' ? 'bg-purple-600 text-white shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Scegli Periodo (Calendario)</span>
              </button>
            </div>

            {/* Machine Filter Dropdown */}
            <select
              value={selectedMachineFilter}
              onChange={(e) => setSelectedMachineFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-700 focus:bg-white focus:outline-hidden"
            >
              <option value="all">Tutti i Distributori</option>
              {machines.map(m => (
                <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
              ))}
            </select>
          </div>

          {/* Export CSV Button */}
          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg border border-stone-200 transition-colors shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Esporta Report CSV</span>
          </button>
        </div>

        {/* Date Picker Range (Calendario Manuale) */}
        {(dateFilter === 'custom' || showDatePicker) && (
          <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center gap-3 bg-purple-50/50 p-3 rounded-lg">
            <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-600" />
              Intervallo Date Personalizzato:
            </span>
            <div className="flex items-center gap-2">
              <label className="text-2xs font-medium text-stone-600">Da:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setDateFilter('custom');
                }}
                className="px-2.5 py-1 text-xs border border-stone-300 rounded-md bg-white font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-2xs font-medium text-stone-600">A:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setDateFilter('custom');
                }}
                className="px-2.5 py-1 text-xs border border-stone-300 rounded-md bg-white font-mono"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                  setDateFilter('all');
                }}
                className="text-xs text-stone-500 hover:text-stone-800 underline ml-2"
              >
                Azzera Filtro Date
              </button>
            )}
          </div>
        )}
      </div>

      {/* Banner Prima Immissione Prodotto (Richiesta Utente) */}
      <div className="bg-gradient-to-r from-purple-50 via-stone-50 to-blue-50 border border-purple-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-purple-950 uppercase tracking-wide">
                Origine Dati Finanziari:
              </span>
              {firstLoadInfo ? (
                <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  Prima Carica: {firstLoadInfo.dateStr} alle {firstLoadInfo.timeStr}
                </span>
              ) : (
                <span className="text-2xs font-medium px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                  In attesa della prima immissione merce
                </span>
              )}
            </div>
            <p className="text-xs text-stone-600 mt-0.5">
              {firstLoadInfo 
                ? `Il fatturato lordo e le altre 3 voci finanziarie partono dalla prima immissione del ${firstLoadInfo.dateStr} sul distributore ${firstLoadInfo.machineName} (${firstLoadInfo.machineCode}).`
                : 'Tutti i conteggi di fatturato, costi merci, utile e pezzi venduti calcoleranno a partire dal primo carico merce effettuato.'}
            </p>
          </div>
        </div>

        {firstLoadInfo && (
          <div className="text-right shrink-0">
            <span className="text-3xs text-stone-400 uppercase font-semibold block">Primo Intervento</span>
            <span className="text-xs font-mono font-bold text-purple-900">{firstLoadInfo.machineCode} • {firstLoadInfo.itemsCount} slot</span>
          </div>
        )}
      </div>

      {/* Primary KPI Metrics: Le 4 voci che partono dalla prima immissione */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Fatturato Lordo */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-stone-500 tracking-wider">
              1. Fatturato (IVA Inclusa)
            </span>
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-stone-900">
              {formatEuro(metrics.totalRevenue)}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-2">
            Calcolato su {metrics.totalSold} erogazioni/snack (prezzi IVA compresa)
          </p>
        </div>

        {/* 2. Costo Merci Vendute (COGS) */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-stone-500 tracking-wider">
              2. Costo Merci (Ivato)
            </span>
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-stone-600">
              {formatEuro(metrics.totalCost)}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-2">
            Costo fornitura materie prime e snack (IVA compresa)
          </p>
        </div>

        {/* 3. Profitto Netto & Margine */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-stone-500 tracking-wider">
              3. Profitto Netto (Ivato)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-600">
              {formatEuro(metrics.totalProfit)}
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              {formatPercent(metrics.marginPct)}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-2">
            Margine operativo lordo/ivato
          </p>
        </div>

        {/* 4. Totale Pezzi Venduti (Sostituisce Monete Ritirate eliminato) */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-stone-500 tracking-wider">
              4. Totale Pezzi Venduti
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-blue-700 font-mono">
              {metrics.totalSold} <span className="text-xs font-normal text-stone-400">pz</span>
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-2">
            Scontrino medio: <strong>{formatEuro(metrics.totalSold > 0 ? metrics.totalRevenue / metrics.totalSold : 0)}</strong> / pz (IVA compresa)
          </p>
        </div>
      </div>

      {/* Interactive Chart Section: Andamento Giornaliero Ricavi & Utile */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="font-bold text-stone-900 text-base flex items-center space-x-2">
              <BarChart2 className="w-4 h-4 text-emerald-600" />
              <span>Andamento Vendite e Marginalità per Sessione</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Confronto visivo tra ricavi generati (verde), costi fornitore (grigio) e profitto netto
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-medium">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-stone-700">Fatturato</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm bg-stone-300" />
              <span className="text-stone-700">Costo Merci</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-800" />
              <span className="text-stone-700">Utile Netto</span>
            </div>
          </div>
        </div>

        {/* SVG Bar & Height Chart */}
        <div className="h-64 w-full relative flex items-end pt-8 pb-6 px-4">
          {dailyTimeline.length === 0 ? (
            <div className="w-full text-center text-stone-400 text-xs my-auto">
              Nessuna vendita registrata nel periodo selezionato.
            </div>
          ) : (
            <div className="w-full h-full flex items-end justify-around gap-2 sm:gap-6 border-b border-stone-200">
              {dailyTimeline.map((item, idx) => {
                const revHeightPct = Math.min(100, Math.max(10, (item.revenue / maxChartRevenue) * 100));
                const costHeightPct = Math.min(100, Math.max(5, (item.cost / maxChartRevenue) * 100));
                const isHovered = activeChartPoint === idx;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setActiveChartPoint(idx)}
                    onMouseLeave={() => setActiveChartPoint(null)}
                    className="flex-1 max-w-[60px] flex flex-col items-center h-full justify-end group relative cursor-pointer"
                  >
                    {/* Tooltip on Hover */}
                    {isHovered && (
                      <div className="absolute -top-16 bg-stone-900 text-white text-2xs p-2 rounded-lg shadow-xl whitespace-nowrap z-20 pointer-events-none">
                        <div className="font-bold text-amber-300">{item.date}</div>
                        <div>Fatturato: {formatEuro(item.revenue)}</div>
                        <div className="text-stone-300">Costo: {formatEuro(item.cost)}</div>
                        <div className="text-emerald-400 font-bold">Utile: {formatEuro(item.profit)}</div>
                      </div>
                    )}

                    {/* Dual Bars: Revenue & Cost */}
                    <div className="w-full flex items-end justify-center space-x-1 h-full pb-1">
                      {/* Cost bar */}
                      <div 
                        className="w-1/2 bg-stone-300 rounded-t-sm transition-all group-hover:bg-stone-400"
                        style={{ height: `${costHeightPct}%` }}
                      />
                      {/* Revenue bar */}
                      <div 
                        className="w-1/2 bg-emerald-500 rounded-t-sm transition-all group-hover:bg-emerald-600"
                        style={{ height: `${revHeightPct}%` }}
                      />
                    </div>

                    {/* Bottom Date Label */}
                    <span className="text-2xs font-semibold text-stone-500 truncate w-full text-center mt-2">
                      {item.date}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Grid: Category Breakdown & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Category Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-stone-200 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-stone-900 text-sm flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-stone-500" />
              <span>Spaccato Categorie Merceologiche</span>
            </h3>
          </div>

          <div className="space-y-4 flex-1">
            {categoryStats.map((cat) => {
              const meta = CATEGORY_META[cat.category];

              return (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-800 flex items-center space-x-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${meta.bg} border ${meta.border}`} />
                      <span>{meta.label}</span>
                    </span>
                    <div className="space-x-2">
                      <span className="font-bold text-stone-900">{formatEuro(cat.revenue)}</span>
                      <span className="text-2xs text-stone-400">({cat.sharePct.toFixed(1)}%)</span>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        cat.category === 'caffe_calde' ? 'bg-amber-600' :
                        cat.category === 'bevande_fredde' ? 'bg-sky-500' :
                        cat.category === 'snack_dolci' ? 'bg-rose-500' :
                        cat.category === 'snack_salati' ? 'bg-orange-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, cat.sharePct)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-2xs text-stone-500">
                    <span>{cat.units} erogazioni/pezzi</span>
                    <span className="font-medium text-emerald-700">Utile: {formatEuro(cat.profit)} (Margine {formatPercent(cat.marginPct)})</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Top Selling & Most Profitable Products (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-stone-200 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-stone-900 text-sm flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Classifica Prodotti Più Redditizi</span>
            </h3>
            <span className="text-2xs text-stone-400">Ordinati per profitto netto generato</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-semibold uppercase text-2xs">
                  <th className="py-2">Prodotto</th>
                  <th className="py-2 text-center">Quantità</th>
                  <th className="py-2 text-right">Fatturato</th>
                  <th className="py-2 text-right">Costi</th>
                  <th className="py-2 text-right">Utile Netto</th>
                  <th className="py-2 text-right">Margine %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {topProducts.slice(0, 6).map((prod, idx) => (
                  <tr key={prod.id} className="hover:bg-stone-50/60">
                    <td className="py-2.5">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center font-bold text-2xs text-stone-600">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-stone-900">{prod.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-center font-mono font-medium text-stone-700">
                      {prod.units}
                    </td>
                    <td className="py-2.5 text-right font-medium text-stone-900">
                      {formatEuro(prod.revenue)}
                    </td>
                    <td className="py-2.5 text-right text-stone-500">
                      {formatEuro(prod.cost)}
                    </td>
                    <td className="py-2.5 text-right font-bold text-emerald-600">
                      {formatEuro(prod.profit)}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-stone-700">
                      {formatPercent(prod.marginPct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Restock History Log (Cronologia Ricariche e Rilevazione Cassa) */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 bg-stone-50/60 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-stone-900 text-sm">
              Registro Riconciliazioni e Carichi ({filteredSessions.length} registrazioni)
            </h3>
            <p className="text-2xs text-stone-500 mt-0.5">
              Dettaglio di ogni intervento con scorte caricate, pezzi venduti, incassi e margini reali
            </p>
          </div>

          <button
            onClick={() => openRestockModal()}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
          >
            + Registra Nuovo Carico
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 font-semibold uppercase text-2xs bg-stone-50/40">
                <th className="py-3 px-4">Data & Ora</th>
                <th className="py-3 px-4">Distributore</th>
                <th className="py-3 px-4 text-center">Pezzi Venduti</th>
                <th className="py-3 px-4 text-right">Incasso Lordo</th>
                <th className="py-3 px-4 text-right">Costo Merci</th>
                <th className="py-3 px-4 text-right">Profitto Netto</th>
                <th className="py-3 px-4">Note Operatore</th>
                <th className="py-3 px-4 text-center">Dettagli</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredSessions.map((session) => {
                const isExpanded = expandedSessionId === session.id;
                return (
                  <React.Fragment key={session.id}>
                    <tr 
                      onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                      className="hover:bg-stone-50/70 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 whitespace-nowrap text-stone-600 font-mono">
                        {new Date(session.timestamp).toLocaleDateString('it-IT')} {new Date(session.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-stone-700 mr-1.5">{session.machineCode}</span>
                        <span className="text-stone-900 font-medium">{session.machineName}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-stone-800">
                        {session.totalSold} pz
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-stone-900">
                        {formatEuro(session.totalRevenue)}
                      </td>
                      <td className="py-3 px-4 text-right text-stone-500">
                        {formatEuro(session.totalCost)}
                        {(session.totalRemovedLoss || 0) > 0 && (
                          <span className="block text-3xs text-rose-600 font-semibold">
                            scarti -{formatEuro(session.totalRemovedLoss)}
                          </span>
                        )}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${session.totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatEuro(session.totalProfit)}
                      </td>
                      <td className="py-3 px-4 text-stone-500 italic truncate max-w-xs">
                        {session.operatorNotes || '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center text-xs font-semibold text-stone-500 hover:text-stone-800">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-stone-50/70">
                        <td colSpan={8} className="p-4">
                          <div className="bg-white rounded-lg border border-stone-200 p-3 shadow-2xs">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                                Dettaglio Slot Intervento ({session.items.length} slot gestiti)
                              </h4>
                              <span className="text-2xs text-stone-500">
                                Calcolo costi con metodo FIFO sui lotti di acquisto
                              </span>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-xs text-left">
                                <thead>
                                  <tr className="border-b border-stone-200 text-2xs uppercase text-stone-400 font-semibold">
                                    <th className="py-1.5 px-2">Slot</th>
                                    <th className="py-1.5 px-2">Prodotto</th>
                                    <th className="py-1.5 px-2 text-center">Venduto</th>
                                    <th className="py-1.5 px-2 text-right">Prezzo</th>
                                    <th className="py-1.5 px-2 text-right">Incasso</th>
                                    <th className="py-1.5 px-2 text-right">Costo Reale</th>
                                    <th className="py-1.5 px-2 text-right">Utile Netto</th>
                                    <th className="py-1.5 px-2 text-center">Caricati</th>
                                    <th className="py-1.5 px-2">Ripartizione Lotti (FIFO)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                  {session.items.map((item, itemIdx) => {
                                    const hasMultiBatch = item.batchConsumptions && item.batchConsumptions.length > 1;
                                    const hasMultiLoad = item.loadedAllocations && item.loadedAllocations.length > 1;

                                    return (
                                      <tr key={itemIdx} className="hover:bg-stone-50">
                                        <td className="py-2 px-2 font-mono font-bold text-stone-700">
                                          {item.slotLabel}
                                        </td>
                                        <td className="py-2 px-2 font-medium text-stone-900">
                                          {item.productName}
                                        </td>
                                        <td className="py-2 px-2 text-center font-bold text-stone-800">
                                          {item.unitsSold} pz
                                        </td>
                                        <td className="py-2 px-2 text-right font-mono text-stone-600">
                                          {formatEuro(item.salePrice)}
                                        </td>
                                        <td className="py-2 px-2 text-right font-bold text-stone-900">
                                          {formatEuro(item.revenue)}
                                        </td>
                                        <td className="py-2 px-2 text-right font-mono text-stone-600">
                                          {formatEuro(item.cost)}
                                        </td>
                                        <td className={`py-2 px-2 text-right font-bold ${item.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                          {formatEuro(item.profit)}
                                        </td>
                                        <td className="py-2 px-2 text-center font-bold text-blue-700">
                                          +{item.addedStock} pz
                                        </td>
                                        <td className="py-2 px-2">
                                          <div className="space-y-0.5">
                                            {hasMultiBatch ? (
                                              <div className="text-2xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                                                Venduti: {formatBatchConsumptionSummary(item.batchConsumptions!)}
                                              </div>
                                            ) : item.unitsSold > 0 ? (
                                              <span className="text-2xs text-stone-500">
                                                Costo unitario: {formatEuro(item.unitCost)}
                                              </span>
                                            ) : null}

                                            {hasMultiLoad && (
                                              <div className="text-2xs text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block ml-1">
                                                Caricati: {item.loadedAllocations!.map(a => `${a.quantity}pz (${formatEuro(a.unitCost)})`).join(' + ')}
                                              </div>
                                            )}

                                            {(item.removedLoss || 0) > 0 && (
                                              <div className="text-2xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block ml-1 font-semibold">
                                                Scaduti/scarti ({item.unitsRemoved} pz): perdita -{formatEuro(item.removedLoss)}
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
