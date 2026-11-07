import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Check, 
  Plus, 
  Edit3, 
  PackageCheck, 
  RotateCcw, 
  ArrowUpDown, 
  Sparkles,
  Info,
  CalendarDays,
  ShieldAlert,
  Archive,
  ShoppingBag
} from 'lucide-react';
import { useVending } from '../context/VendingContext';
import { getBatchExpiryInfo, getExpirySummary } from '../utils/expiryUtils';
import { formatEuro } from '../utils/vendingUtils';

interface ExpirationsManagerProps {
  onNavigateToPurchases?: () => void;
}

type ExpiryFilter = 'all' | 'warning' | 'expired' | 'ok' | 'finished' | 'no_date';

export const ExpirationsManager: React.FC<ExpirationsManagerProps> = ({ onNavigateToPurchases }) => {
  const { purchases, products, updateBatchExpiry, toggleBatchFinished } = useVending();
  const [filter, setFilter] = useState<ExpiryFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'urgency' | 'product' | 'remaining'>('urgency');

  // Stato per modale modifica rapida scadenza
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Calcolo riepilogo con allarmi a 2 settimane (14 giorni)
  const summary = useMemo(() => getExpirySummary(purchases), [purchases]);

  // Lista elaborata dei lotti
  const processedBatches = useMemo(() => {
    return purchases.map(b => {
      const info = getBatchExpiryInfo(b);
      const product = products.find(p => p.id === b.productId);
      return {
        ...info,
        batch: b,
        product,
      };
    });
  }, [purchases, products]);

  // Filtraggio
  const filteredBatches = useMemo(() => {
    return processedBatches.filter(item => {
      // Filtro per stato
      if (filter === 'warning' && (item.status !== 'warning' || item.isFinished)) return false;
      if (filter === 'expired' && (item.status !== 'expired' || item.isFinished)) return false;
      if (filter === 'ok' && (item.status !== 'ok' || item.isFinished)) return false;
      if (filter === 'finished' && !item.isFinished) return false;
      if (filter === 'no_date' && (item.status !== 'no_date' || item.isFinished)) return false;

      // Filtro ricerca testo
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchProduct = item.productName.toLowerCase().includes(q);
        const matchBatch = item.batchNumber.toLowerCase().includes(q);
        const matchSupplier = item.supplier.toLowerCase().includes(q);
        const matchNotes = (item.notes || '').toLowerCase().includes(q);
        return matchProduct || matchBatch || matchSupplier || matchNotes;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'urgency') {
        // Priorità:
        // 1. Scaduti con rimanenze (daysLeft < 0)
        // 2. In scadenza entro 14 gg (0 <= daysLeft <= 14)
        // 3. Regolari (daysLeft > 14)
        // 4. Senza data
        // 5. Finiti / Esauriti (in fondo)
        if (a.isFinished !== b.isFinished) return a.isFinished ? 1 : -1;
        if (a.daysLeft === null && b.daysLeft === null) return 0;
        if (a.daysLeft === null) return 1;
        if (b.daysLeft === null) return -1;
        return a.daysLeft - b.daysLeft;
      }
      if (sortBy === 'product') {
        return a.productName.localeCompare(b.productName);
      }
      if (sortBy === 'remaining') {
        return b.remainingUnits - a.remainingUnits;
      }
      return 0;
    });
  }, [processedBatches, filter, searchTerm, sortBy]);

  const handleOpenEdit = (batchId: string, currentExpiry: string | null, currentNotes?: string) => {
    setEditingBatchId(batchId);
    setEditExpiryDate(currentExpiry || '');
    setEditNotes(currentNotes || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatchId) return;

    // Se l'utente ha inserito una data ma le note non contengono il testo, possiamo aggiornare o integrare
    let updatedNotes = editNotes;
    if (editExpiryDate && !editNotes.toLowerCase().includes('scad')) {
      const [y, m, d] = editExpiryDate.split('-');
      const itDate = `${d}/${m}/${y}`;
      updatedNotes = editNotes ? `${editNotes} (Scadenza: ${itDate})` : `Scadenza: ${itDate}`;
    }

    updateBatchExpiry(editingBatchId, editExpiryDate, updatedNotes);
    setEditingBatchId(null);
  };

  return (
    <div className="space-y-5">
      {/* 1. HERO HEADER & INDICATORI STATO SCADENZE */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <CalendarDays className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center space-x-2">
                  <span>Controllo Scadenze Prodotti &amp; Lotti</span>
                  {summary.hasAlerts && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-950/50">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{summary.activeAlertsCount} ALLERT</span>
                    </span>
                  )}
                </h1>
                <p className="text-xs text-stone-400 mt-0.5">
                  Monitoraggio date di scadenza estratte automaticamente dalle note del lotto d'acquisto.
                </p>
              </div>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex items-center space-x-2">
            {onNavigateToPurchases && (
              <button
                type="button"
                onClick={onNavigateToPurchases}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Nuovo Acquisto / Lotto</span>
              </button>
            )}
          </div>
        </div>

        {/* STATS TILES */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
          {/* Card 1: In Scadenza (<= 14 giorni) */}
          <button
            type="button"
            onClick={() => setFilter('warning')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              filter === 'warning'
                ? 'bg-amber-500/20 border-amber-400 shadow-md shadow-amber-950/30'
                : 'bg-stone-950/60 border-stone-800/80 hover:border-stone-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-3xs uppercase font-bold text-amber-400 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>In Scadenza (≤ 14 gg)</span>
              </span>
              {summary.warningCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </div>
            <div className="text-2xl font-black text-white mt-1 font-mono">
              {summary.warningCount}
            </div>
            <span className="text-3xs text-stone-400 block mt-0.5">
              Da consumare entro 2 settimane
            </span>
          </button>

          {/* Card 2: Già Scaduti */}
          <button
            type="button"
            onClick={() => setFilter('expired')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              filter === 'expired'
                ? 'bg-rose-500/20 border-rose-400 shadow-md shadow-rose-950/30'
                : 'bg-stone-950/60 border-stone-800/80 hover:border-stone-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-3xs uppercase font-bold text-rose-400 flex items-center space-x-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Scaduti</span>
              </span>
              {summary.expiredCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>
            <div className="text-2xl font-black text-rose-300 mt-1 font-mono">
              {summary.expiredCount}
            </div>
            <span className="text-3xs text-stone-400 block mt-0.5">
              Data superata con giacenza
            </span>
          </button>

          {/* Card 3: Regolari */}
          <button
            type="button"
            onClick={() => setFilter('ok')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              filter === 'ok'
                ? 'bg-emerald-500/20 border-emerald-400 shadow-md shadow-emerald-950/30'
                : 'bg-stone-950/60 border-stone-800/80 hover:border-stone-700'
            }`}
          >
            <span className="text-3xs uppercase font-bold text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Regolari (&gt; 14 gg)</span>
            </span>
            <div className="text-2xl font-black text-emerald-300 mt-1 font-mono">
              {summary.okCount}
            </div>
            <span className="text-3xs text-stone-400 block mt-0.5">
              Scadenza sicura a lungo termine
            </span>
          </button>

          {/* Card 4: Finiti / Esauriti */}
          <button
            type="button"
            onClick={() => setFilter('finished')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              filter === 'finished'
                ? 'bg-stone-800 border-stone-500 shadow-md'
                : 'bg-stone-950/60 border-stone-800/80 hover:border-stone-700'
            }`}
          >
            <span className="text-3xs uppercase font-bold text-stone-400 flex items-center space-x-1">
              <Archive className="w-3.5 h-3.5" />
              <span>Finiti (Tutto Venduto)</span>
            </span>
            <div className="text-2xl font-black text-stone-300 mt-1 font-mono">
              {summary.finishedCount}
            </div>
            <span className="text-3xs text-stone-400 block mt-0.5">
              Non calcolati negli allarmi
            </span>
          </button>
        </div>

        {/* NOTA AUTOMATIZZAZIONE ESPLICITA RICHIESTA DALL'UTENTE */}
        <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 flex items-start space-x-3">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-amber-300">Come funziona l'automazione scadenze:</span>
            {' '}Quando acquisti un lotto, scrivi la data nelle note (es. <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300 font-mono text-2xs">Scadenza: 15/10/2026</code> o <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300 font-mono text-2xs">Scad. 11/2026</code>). 
            Il sistema la rileva e fa scattare l'<strong>ALLERT quando mancano 2 settimane</strong> (14 giorni). 
            Se carichi il lotto e viene completamente venduto, viene contrassegnato automaticamente come <strong>Finito</strong> e non genererà più allarmi, conservando comunque la tracciabilità.
          </div>
        </div>
      </div>

      {/* 2. FILTRI & BARRA DI RICERCA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/80 border border-stone-800 p-3 rounded-2xl">
        {/* Pills filtro */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'all'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            Tutti ({purchases.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('warning')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'warning'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>In Scadenza ({summary.warningCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('expired')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'expired'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-rose-400 hover:bg-rose-500/20'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Scaduti ({summary.expiredCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('ok')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'ok'
                ? 'bg-emerald-500 text-stone-950 shadow-sm'
                : 'text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            Regolari ({summary.okCount})
          </button>

          <button
            type="button"
            onClick={() => setFilter('finished')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'finished'
                ? 'bg-stone-700 text-white shadow-sm'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            Finiti ({summary.finishedCount})
          </button>
        </div>

        {/* Ricerca & ordinamento */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca per prodotto, lotto, note..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="urgency">Ordina per: Urgenza scadenza</option>
            <option value="product">Ordina per: Nome prodotto</option>
            <option value="remaining">Ordina per: Pezzi rimanenti</option>
          </select>
        </div>
      </div>

      {/* 3. LISTA DEI LOTTI CON SCADENZE DETTAGLIATE */}
      {filteredBatches.length === 0 ? (
        <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-10 text-center space-y-3">
          <Calendar className="w-12 h-12 text-stone-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Nessun lotto trovato</h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            {searchTerm 
              ? `Nessun risultato corrispondente a "${searchTerm}". Prova a modificare i criteri di ricerca.`
              : filter !== 'all'
                ? `Nessun lotto con il filtro "${filter}" selezionato.`
                : 'Nessun lotto di acquisto registrato. Registra il primo lotto fornitore specificando la data di scadenza nelle note!'}
          </p>
          {onNavigateToPurchases && (
            <button
              type="button"
              onClick={onNavigateToPurchases}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registra Nuovo Lotto Fornitore</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredBatches.map(item => {
            const isAlert = item.isAlertActive;
            const isFinished = item.isFinished;

            return (
              <div
                key={item.batchId}
                className={`rounded-2xl border p-4 transition-all relative overflow-hidden flex flex-col justify-between ${
                  isFinished
                    ? 'bg-stone-950/40 border-stone-800/60 opacity-80'
                    : item.status === 'expired'
                      ? 'bg-rose-950/20 border-rose-500/60 shadow-lg shadow-rose-950/40'
                      : item.status === 'warning'
                        ? 'bg-amber-950/20 border-amber-500/60 shadow-lg shadow-amber-950/30'
                        : 'bg-stone-900/90 border-stone-800 hover:border-stone-700'
                }`}
              >
                {/* Ribbon per allarme attivo */}
                {isAlert && (
                  <div className="absolute top-0 right-0">
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-bl-xl text-3xs font-black bg-gradient-to-r from-amber-500 to-rose-500 text-stone-950 shadow-md">
                      <AlertTriangle className="w-3 h-3 text-stone-950" />
                      <span>ALLERT SCADENZA</span>
                    </span>
                  </div>
                )}

                <div>
                  {/* Riga superiore: Prodotto & Codice Lotto */}
                  <div className="flex items-start justify-between gap-2 pr-14">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-2xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          {item.batchNumber}
                        </span>
                        {item.invoiceRef && (
                          <span className="text-3xs text-stone-400 font-mono">
                            Rif: {item.invoiceRef}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-black text-white mt-1">
                        {item.productName}
                      </h3>
                      <p className="text-2xs text-stone-400">
                        Fornitore: <strong className="text-stone-300">{item.supplier}</strong>
                      </p>
                    </div>
                  </div>

                  {/* BOX SCADENZA PROMINENTE */}
                  <div className={`mt-3 p-3 rounded-xl border flex items-center justify-between ${
                    isFinished
                      ? 'bg-stone-900/60 border-stone-800 text-stone-400'
                      : item.status === 'expired'
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                        : item.status === 'warning'
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                          : 'bg-stone-950 border-stone-800 text-stone-300'
                  }`}>
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2 rounded-lg ${
                        isFinished
                          ? 'bg-stone-800 text-stone-400'
                          : item.status === 'expired'
                            ? 'bg-rose-500/30 text-rose-300'
                            : item.status === 'warning'
                              ? 'bg-amber-500/30 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-3xs uppercase font-bold text-stone-400 block tracking-wider">
                          Data di Scadenza
                        </span>
                        <span className="text-sm font-black text-white font-mono">
                          {item.expiryDateFormatted}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-2xs font-bold border ${item.statusBadgeClass}`}>
                        {item.status === 'warning' && <AlertTriangle className="w-3 h-3" />}
                        {item.status === 'expired' && <ShieldAlert className="w-3 h-3" />}
                        {item.status === 'ok' && <CheckCircle2 className="w-3 h-3" />}
                        {isFinished && <Check className="w-3 h-3" />}
                        <span>{item.statusLabel}</span>
                      </span>
                    </div>
                  </div>

                  {/* GIACENZA E CONSUMO DEL LOTTO */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-2xs">
                      <span className="text-stone-400">Giacenza magazzino / carico:</span>
                      <span className="font-bold text-white">
                        {isFinished ? (
                          <span className="text-stone-400 font-mono">0 pz (Tutto venduto / caricato)</span>
                        ) : (
                          <span className="text-emerald-400 font-mono">
                            {item.remainingUnits} pz rimanenti <span className="text-stone-500 font-normal">/ {item.totalUnits} iniziali</span>
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Progress bar avanzamento consumo */}
                    <div className="w-full bg-stone-950 h-2 rounded-full overflow-hidden border border-stone-800">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isFinished 
                            ? 'bg-stone-600' 
                            : item.usagePct > 80 
                              ? 'bg-emerald-500' 
                              : 'bg-amber-500'
                        }`}
                        style={{ width: `${item.usagePct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-3xs text-stone-500">
                      <span>Caricati/Venduti: {item.usedUnits} pz ({Math.round(item.usagePct)}%)</span>
                      <span>{isFinished ? 'Lotto Esaurito' : 'In rotazione'}</span>
                    </div>
                  </div>

                  {/* NOTE LOTTO E ORIGINE SCADENZA */}
                  {item.notes && (
                    <div className="mt-2.5 p-2 rounded-xl bg-stone-950/70 border border-stone-800 text-2xs text-stone-400 italic">
                      <strong className="text-stone-300 not-italic font-semibold mr-1">Note fornitura:</strong>
                      {item.notes}
                    </div>
                  )}
                </div>

                {/* AZIONI RAPIDE DEL LOTTO */}
                <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(item.batchId, item.expiryDate, item.notes)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-2xs font-bold transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Modifica Scadenza / Note</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleBatchFinished(item.batchId)}
                    title={isFinished ? "Riapri lotto per calcolare rimanenze" : "Segna come finito: non genera allarmi ma resta in elenco"}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-2xs font-bold border transition-colors cursor-pointer ${
                      isFinished
                        ? 'bg-stone-900 border-stone-700 text-stone-300 hover:text-white'
                        : 'bg-stone-950 hover:bg-stone-850 border-stone-800 text-stone-400 hover:text-amber-300'
                    }`}
                  >
                    {isFinished ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        <span>Riapri Lotto</span>
                      </>
                    ) : (
                      <>
                        <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Segna come Finito</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. MODALE MODIFICA SCADENZA / NOTE */}
      {editingBatchId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-white">Aggiorna Scadenza Lotto</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingBatchId(null)}
                className="text-stone-400 hover:text-white p-1 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-2xs font-semibold text-stone-400 mb-1">
                  Data di Scadenza Effettiva
                </label>
                <input
                  type="date"
                  value={editExpiryDate}
                  onChange={(e) => setEditExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-amber-500 font-mono"
                  required
                />
                <span className="text-3xs text-stone-500 block mt-1">
                  Puoi impostare o modificare la data di scadenza precisa per questo lotto.
                </span>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-stone-400 mb-1">
                  Note del Lotto
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Es. Scadenza: 15/10/2026, fornitore promo..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingBatchId(null)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-semibold hover:bg-stone-700 cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-md cursor-pointer"
                >
                  Salva Scadenza
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
