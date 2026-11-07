import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  Plus, 
  Trash2, 
  Edit3, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  Zap, 
  Wifi, 
  ShieldCheck, 
  CreditCard, 
  FileText, 
  Sparkles, 
  Check, 
  X, 
  Calendar, 
  AlertCircle,
  HelpCircle,
  PiggyBank,
  CheckCircle2
} from 'lucide-react';
import { useVending } from '../context/VendingContext';
import { formatEuro, formatPercent } from '../utils/vendingUtils';
import { FixedCost, FixedCostCategory } from '../types';

const CATEGORY_ICONS: Record<FixedCostCategory, React.ReactNode> = {
  affitto: <Building2 className="w-4 h-4 text-rose-600" />,
  bollette: <Zap className="w-4 h-4 text-amber-600" />,
  telefonia_sim: <Wifi className="w-4 h-4 text-sky-600" />,
  assicurazione: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
  canoni_pos: <CreditCard className="w-4 h-4 text-purple-600" />,
  commercialista_tasse: <FileText className="w-4 h-4 text-indigo-600" />,
  accessorie: <Sparkles className="w-4 h-4 text-teal-600" />,
};

const CATEGORY_NAMES: Record<FixedCostCategory, string> = {
  affitto: 'Affitto Fondo Commerciale',
  bollette: 'Bollette & Utenze Elettriche',
  telefonia_sim: 'SIM Dati & Telemetria',
  assicurazione: 'Polizza & Assicurazione',
  canoni_pos: 'Canone POS & Cashless',
  commercialista_tasse: 'Commercialista & Spese Fiscali',
  accessorie: 'Accessorie, Pulizie & Sacchetti',
};

export const FixedCostsManager: React.FC = () => {
  const { 
    fixedCosts, 
    addFixedCost, 
    updateFixedCost, 
    deleteFixedCost,
    restockHistory,
    maintenances
  } = useVending();

  // Periodo per il calcolo del conto economico e del guadagno reale
  const [calculationPeriod, setCalculationPeriod] = useState<'month' | 'year' | '30days' | 'all'>('month');

  // Stato Modale / Form Aggiunta & Modifica
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<FixedCost | null>(null);

  // Campi Form
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FixedCostCategory>('affitto');
  const [amount, setAmount] = useState<number | ''>('');
  const [recurrence, setRecurrence] = useState<'mensile' | 'bimestrale' | 'trimestrale' | 'annuale' | 'una_tantum'>('mensile');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [autoDeduction, setAutoDeduction] = useState(true);

  const openAddModal = () => {
    setEditingCost(null);
    setName('');
    setCategory('affitto');
    setAmount('');
    setRecurrence('mensile');
    setDueDate('');
    setNotes('');
    setAutoDeduction(true);
    setIsModalOpen(true);
  };

  const openEditModal = (cost: FixedCost) => {
    setEditingCost(cost);
    setName(cost.name);
    setCategory(cost.category);
    setAmount(cost.amount);
    setRecurrence(cost.recurrence);
    setDueDate(cost.dueDate || '');
    setNotes(cost.notes || '');
    setAutoDeduction(cost.autoDeduction ?? true);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || amount === '' || Number(amount) <= 0) return;

    if (editingCost) {
      updateFixedCost({
        ...editingCost,
        name: name.trim(),
        category,
        amount: Number(amount),
        recurrence,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        autoDeduction,
      });
    } else {
      addFixedCost({
        name: name.trim(),
        category,
        amount: Number(amount),
        recurrence,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        autoDeduction,
      });
    }

    setIsModalOpen(false);
  };

  // Calcolo delle sessioni filtrate in base al periodo scelto
  const filteredRestockSessions = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return restockHistory.filter(session => {
      const d = new Date(session.timestamp);
      if (calculationPeriod === 'month') {
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }
      if (calculationPeriod === 'year') {
        return d.getFullYear() === currentYear;
      }
      if (calculationPeriod === '30days') {
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 30;
      }
      return true; // 'all'
    });
  }, [restockHistory, calculationPeriod]);

  // Calcolo Costi Manutenzione nel periodo
  const periodMaintenanceCost = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return maintenances.reduce((acc, m) => {
      const d = new Date(m.date || m.createdAt);
      let match = true;
      if (calculationPeriod === 'month') {
        match = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      } else if (calculationPeriod === 'year') {
        match = d.getFullYear() === currentYear;
      } else if (calculationPeriod === '30days') {
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        match = diffDays <= 30;
      }
      return match ? acc + (m.cost || 0) : acc;
    }, 0);
  }, [maintenances, calculationPeriod]);

  // Normalizzazione Costi Fissi in base al periodo (es. Se annuale moltiplica i mensili per 12)
  const periodFixedCostsTotal = useMemo(() => {
    return fixedCosts.reduce((acc, c) => {
      if (c.autoDeduction === false) return acc;

      let monthlyMultiplier = 1;
      if (c.recurrence === 'mensile') monthlyMultiplier = 1;
      else if (c.recurrence === 'bimestrale') monthlyMultiplier = 0.5;
      else if (c.recurrence === 'trimestrale') monthlyMultiplier = 1 / 3;
      else if (c.recurrence === 'annuale') monthlyMultiplier = 1 / 12;
      else if (c.recurrence === 'una_tantum') monthlyMultiplier = 1; // considerata nel periodo

      if (calculationPeriod === 'year') {
        // Su base annuale: mensile * 12, annuale * 1, ecc.
        const yearlyAmount = c.recurrence === 'annuale' ? c.amount : monthlyMultiplier * c.amount * 12;
        return acc + yearlyAmount;
      } else {
        // Su base mensile (o 30gg o mese corrente)
        const monthlyAmount = monthlyMultiplier * c.amount;
        return acc + monthlyAmount;
      }
    }, 0);
  }, [fixedCosts, calculationPeriod]);

  // Conto Economico Dettagliato del Negozio H24
  const financialStatement = useMemo(() => {
    // 1. Incassi Lordi dalle vendite
    const totalRevenue = filteredRestockSessions.reduce((sum, s) => sum + (s.totalRevenue || 0), 0);
    // 2. Costo Merci Vendute (COGS su lotti FIFO)
    const totalCogs = filteredRestockSessions.reduce((sum, s) => sum + (s.totalCost || 0), 0);
    // 3. Margine Commerciale Lordo
    const grossCommercialProfit = totalRevenue - totalCogs;
    // 4. Manutenzioni e ricambi
    const maintenanceExpenses = periodMaintenanceCost;
    // 5. Spese Fisse
    const fixedExpenses = periodFixedCostsTotal;

    // 6. GUADAGNO TOTALE REALE (UTILE NETTO EFFETTIVO)
    // Formula: Incasso - Spese Merci - Costi Fissi (- Manutenzioni)
    const realTotalProfit = totalRevenue - totalCogs - fixedExpenses - maintenanceExpenses;
    const realMarginPct = totalRevenue > 0 ? (realTotalProfit / totalRevenue) * 100 : 0;

    // Percentuali di incidenza su Fatturato
    const cogsShare = totalRevenue > 0 ? (totalCogs / totalRevenue) * 100 : 0;
    const fixedShare = totalRevenue > 0 ? (fixedExpenses / totalRevenue) * 100 : 0;
    const maintShare = totalRevenue > 0 ? (maintenanceExpenses / totalRevenue) * 100 : 0;
    const profitShare = totalRevenue > 0 ? (realTotalProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCogs,
      grossCommercialProfit,
      maintenanceExpenses,
      fixedExpenses,
      realTotalProfit,
      realMarginPct,
      cogsShare,
      fixedShare,
      maintShare,
      profitShare,
    };
  }, [filteredRestockSessions, periodMaintenanceCost, periodFixedCostsTotal]);

  return (
    <div className="space-y-6">
      {/* Header Sezione */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2">
              <PiggyBank className="w-3.5 h-3.5" />
              <span>Conto Economico Reale &amp; Redditività Negozio</span>
            </div>
            <h2 className="text-xl font-bold text-stone-900">
              Costi Fissi &amp; Calcolo Guadagno Totale Reale
            </h2>
            <p className="text-xs text-stone-500 mt-1 max-w-2xl">
              Calcolo esatto del guadagno reale dell&apos;attività: <strong>Incasso Lordo - Spese Merci Vendute (COGS) - Costi Fissi (Affitto, Bollette, SIM, POS) - Spese Operative</strong>.
            </p>
          </div>

          {/* Filtro Periodo di Calcolo */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-500 whitespace-nowrap">Periodo Calcolo:</span>
            <div className="flex items-center bg-stone-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setCalculationPeriod('month')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  calculationPeriod === 'month' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Mese Corrente
              </button>
              <button
                type="button"
                onClick={() => setCalculationPeriod('30days')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  calculationPeriod === '30days' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Ultimi 30 Giorni
              </button>
              <button
                type="button"
                onClick={() => setCalculationPeriod('year')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  calculationPeriod === 'year' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                📅 Annuale
              </button>
              <button
                type="button"
                onClick={() => setCalculationPeriod('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  calculationPeriod === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Tutto lo Storico
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BOX AD ALTO IMPATTO: GUADAGNO TOTALE REALE (CONTO ECONOMICO) */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 border border-stone-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-stone-800/80">
            <div>
              <span className="text-2xs font-mono uppercase tracking-widest text-emerald-400 block font-semibold">
                Risultato Economico Netto Effettivo
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                Guadagno Totale Reale: {formatEuro(financialStatement.realTotalProfit)}
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                Calcolato detraendo dal fatturato sia le merci vendute che tutti i costi fissi e di gestione.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-right">
                <span className="text-3xs text-emerald-300 block uppercase font-medium">Margine Netto Reale</span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {formatPercent(financialStatement.realMarginPct)}
                </span>
              </div>
            </div>
          </div>

          {/* Scomposizione Matematica del Conto Economico */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* 1. Incasso / Ricavi Lordi */}
            <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
              <div className="flex items-center justify-between text-stone-400 mb-1">
                <span className="text-3xs uppercase font-bold tracking-wider">1. Incasso Lordo</span>
                <span className="text-xs font-bold text-emerald-400">(+)</span>
              </div>
              <span className="text-xl font-bold font-mono text-white block">
                {formatEuro(financialStatement.totalRevenue)}
              </span>
              <span className="text-3xs text-stone-400 mt-1 block">Fatturato totale erogato</span>
            </div>

            {/* 2. Spese Merci (COGS) */}
            <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
              <div className="flex items-center justify-between text-stone-400 mb-1">
                <span className="text-3xs uppercase font-bold tracking-wider">2. Costo Merci</span>
                <span className="text-xs font-bold text-rose-400">(-)</span>
              </div>
              <span className="text-xl font-bold font-mono text-rose-300 block">
                {formatEuro(financialStatement.totalCogs)}
              </span>
              <span className="text-3xs text-stone-400 mt-1 block">Acquisti su lotti FIFO</span>
            </div>

            {/* 3. Costi Fissi Periodo */}
            <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
              <div className="flex items-center justify-between text-stone-400 mb-1">
                <span className="text-3xs uppercase font-bold tracking-wider">3. Costi Fissi</span>
                <span className="text-xs font-bold text-amber-400">(-)</span>
              </div>
              <span className="text-xl font-bold font-mono text-amber-300 block">
                {formatEuro(financialStatement.fixedExpenses)}
              </span>
              <span className="text-3xs text-stone-400 mt-1 block">Affitto, bollette, POS, SIM</span>
            </div>

            {/* 4. Manutenzioni & Ricambi */}
            <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
              <div className="flex items-center justify-between text-stone-400 mb-1">
                <span className="text-3xs uppercase font-bold tracking-wider">4. Manutenzioni</span>
                <span className="text-xs font-bold text-orange-400">(-)</span>
              </div>
              <span className="text-xl font-bold font-mono text-orange-300 block">
                {formatEuro(financialStatement.maintenanceExpenses)}
              </span>
              <span className="text-3xs text-stone-400 mt-1 block">Interventi tecnici e ricambi</span>
            </div>

            {/* 5. Guadagno Reale Netto */}
            <div className={`p-4 rounded-xl border col-span-2 sm:col-span-4 lg:col-span-1 ${
              financialStatement.realTotalProfit >= 0 
                ? 'bg-emerald-950/70 border-emerald-500/50' 
                : 'bg-rose-950/70 border-rose-500/50'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-3xs uppercase font-bold tracking-wider text-emerald-300">5. Utile Reale</span>
                <span className="text-xs font-bold text-emerald-400">(=)</span>
              </div>
              <span className={`text-xl font-black font-mono block ${financialStatement.realTotalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatEuro(financialStatement.realTotalProfit)}
              </span>
              <span className="text-3xs text-emerald-300/80 mt-1 block">Guadagno effettivo netto</span>
            </div>
          </div>

          {/* Barra visiva di ripartizione del fatturato */}
          {financialStatement.totalRevenue > 0 && (
            <div className="mt-6 pt-5 border-t border-stone-800/80">
              <span className="text-3xs text-stone-400 uppercase font-semibold block mb-2">
                Composizione del Fatturato (% Spese vs Utile Netto):
              </span>
              <div className="h-4 w-full rounded-full bg-stone-800 overflow-hidden flex">
                <div 
                  style={{ width: `${Math.min(100, Math.max(0, financialStatement.cogsShare))}%` }} 
                  className="bg-rose-500 h-full" 
                  title={`Merci: ${financialStatement.cogsShare.toFixed(1)}%`}
                />
                <div 
                  style={{ width: `${Math.min(100, Math.max(0, financialStatement.fixedShare))}%` }} 
                  className="bg-amber-500 h-full" 
                  title={`Costi Fissi: ${financialStatement.fixedShare.toFixed(1)}%`}
                />
                <div 
                  style={{ width: `${Math.min(100, Math.max(0, financialStatement.maintShare))}%` }} 
                  className="bg-orange-500 h-full" 
                  title={`Manutenzioni: ${financialStatement.maintShare.toFixed(1)}%`}
                />
                <div 
                  style={{ width: `${Math.min(100, Math.max(0, financialStatement.profitShare))}%` }} 
                  className="bg-emerald-500 h-full" 
                  title={`Utile Netto Reale: ${financialStatement.profitShare.toFixed(1)}%`}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between text-2xs text-stone-400 mt-2 gap-2">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Merci: {financialStatement.cogsShare.toFixed(1)}%</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Costi Fissi: {financialStatement.fixedShare.toFixed(1)}%</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span>Manutenzioni: {financialStatement.maintShare.toFixed(1)}%</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-bold text-emerald-400">Utile Reale: {financialStatement.profitShare.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GESTIONE ELENCO COSTI FISSI (AFFITTO, BOLLETTE, SIM, ECC.) */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-stone-900">
              Voci di Spesa Fissa del Negozio H24
            </h3>
            <p className="text-xs text-stone-500">
              Configura canoni di locazione, energia, SIM telemetria e abbonamenti bancari
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Aggiungi Spesa Fissa</span>
          </button>
        </div>

        {/* Elenco Voci */}
        <div className="divide-y divide-stone-100">
          {fixedCosts.map(cost => {
            const icon = CATEGORY_ICONS[cost.category] || <Wallet className="w-4 h-4 text-stone-500" />;
            const catName = CATEGORY_NAMES[cost.category] || 'Altra spesa';

            return (
              <div 
                key={cost.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/70 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="p-2.5 rounded-xl bg-stone-100 border border-stone-200 shrink-0 mt-0.5">
                    {icon}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-stone-900">{cost.name}</h4>
                      <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200">
                        {catName}
                      </span>
                      {cost.autoDeduction === false && (
                        <span className="text-3xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                          Escluso dal calcolo
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 text-2xs text-stone-500 mt-1">
                      <span>Ricorrenza: <strong className="capitalize">{cost.recurrence}</strong></span>
                      {cost.dueDate && (
                        <span>Prossima scadenza: <strong>{new Date(cost.dueDate).toLocaleDateString('it-IT')}</strong></span>
                      )}
                      {cost.notes && <span className="italic text-stone-400 truncate max-w-xs">{cost.notes}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-4 pl-12 sm:pl-0">
                  <div className="text-right">
                    <span className="text-base font-bold font-mono text-stone-900 block">
                      {formatEuro(cost.amount)}
                    </span>
                    <span className="text-3xs text-stone-400 capitalize">
                      {cost.recurrence}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(cost)}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200/80 transition-colors cursor-pointer"
                      title="Modifica"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Eliminare la spesa fissa "${cost.name}"?`)) {
                          deleteFixedCost(cost.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Elimina"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODALE AGGIUNTA / MODIFICA SPESA FISSA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <h3 className="text-base font-bold text-stone-900">
                {editingCost ? 'Modifica Spesa Fissa' : 'Nuova Spesa Fissa'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nome Voce di Spesa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="es. Canone Affitto Locale H24, Bolletta Enel..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as FixedCostCategory)}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
                  >
                    <option value="affitto">🏢 Affitto Locale</option>
                    <option value="bollette">⚡ Energia &amp; Utenze</option>
                    <option value="telefonia_sim">📶 SIM Dati &amp; Modem</option>
                    <option value="canoni_pos">💳 Canoni POS &amp; Carte</option>
                    <option value="assicurazione">🛡️ Assicurazione &amp; Furto</option>
                    <option value="commercialista_tasse">📑 Commercialista &amp; Tasse</option>
                    <option value="accessorie">✨ Accessorie &amp; Pulizie</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Importo Costo (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Ricorrenza
                  </label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
                  >
                    <option value="mensile">Mensile</option>
                    <option value="bimestrale">Bimestrale</option>
                    <option value="trimestrale">Trimestrale</option>
                    <option value="annuale">Annuale</option>
                    <option value="una_tantum">Una Tantum</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Prossima Scadenza (opzionale)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Note aggiuntive
                </label>
                <textarea
                  rows={2}
                  placeholder="Dettagli contratto, estremi IBAN o coordinate..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="auto-deduction-check"
                  checked={autoDeduction}
                  onChange={(e) => setAutoDeduction(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
                />
                <label htmlFor="auto-deduction-check" className="text-xs font-medium text-stone-700 cursor-pointer">
                  Includi automaticamente nel calcolo del Guadagno Totale Reale
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
                >
                  {editingCost ? 'Salva Modifiche' : 'Aggiungi Spesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
