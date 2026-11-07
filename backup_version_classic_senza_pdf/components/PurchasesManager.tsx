import React, { useState, useMemo } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Package, 
  Truck, 
  Receipt, 
  TrendingUp, 
  Trash2, 
  CheckCircle2, 
  Layers, 
  Search,
  Sparkles,
  Info,
  DollarSign,
  Percent,
  Warehouse,
  PackagePlus,
  Calendar
} from 'lucide-react';
import { useVending } from '../context/VendingContext';
import { formatEuro, formatPercent, CATEGORY_META } from '../utils/vendingUtils';
import { Product, PurchaseBatch } from '../types';
import { parseExpiryFromText } from '../utils/expiryUtils';

export const PurchasesManager: React.FC = () => {
  const { 
    products, 
    purchases, 
    addPurchase, 
    deletePurchase, 
    clearAllPurchases, 
    updateBatchUnits, 
    openRestockModal 
  } = useVending();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClearPurchasesModalOpen, setIsClearPurchasesModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSupplier, setFilterSupplier] = useState<string>('all');

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [supplier, setSupplier] = useState('Ingrosso Bevande & Snack');
  const [purchaseDate, setPurchaseDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [packageCount, setPackageCount] = useState<number>(2);
  const [unitsPerPackage, setUnitsPerPackage] = useState<number>(24);
  const [priceInputType, setPriceInputType] = useState<'per_confezione' | 'totale'>('per_confezione');
  const [inputPrice, setInputPrice] = useState<number>(12.00); // es. 12€ a confezione
  const [vatRate, setVatRate] = useState<number>(22);
  const [costBasisUsed, setCostBasisUsed] = useState<'netto' | 'ivato'>('netto');
  const [batchNumber, setBatchNumber] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('FT-');
  const [notes, setNotes] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Rilevamento automatico scadenza dal testo delle note
  const detectedExpiryFromNotes = useMemo(() => {
    return parseExpiryFromText(notes, expiryDate);
  }, [notes, expiryDate]);

  // Selected product object
  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || products[0];
  }, [products, selectedProductId]);

  // Real-time calculations for the form
  const totalUnits = Math.max(1, (packageCount || 0) * (unitsPerPackage || 0));
  const totalTaxable = priceInputType === 'per_confezione' 
    ? (inputPrice || 0) * (packageCount || 0) 
    : (inputPrice || 0);
  const totalVat = totalTaxable * ((vatRate || 0) / 100);
  const totalGross = totalTaxable + totalVat;
  const unitCostNet = totalTaxable / totalUnits;
  const unitCostWithVat = totalGross / totalUnits;
  const appliedUnitCost = costBasisUsed === 'ivato' ? unitCostWithVat : unitCostNet;

  // Stima margine con prezzo vendita attuale
  const estimatedSellingPrice = selectedProduct?.defaultPrice || 1.50;
  const estimatedProfit = estimatedSellingPrice - appliedUnitCost;
  const estimatedMarginPct = estimatedSellingPrice > 0 ? (estimatedProfit / estimatedSellingPrice) * 100 : 0;

  // Pre-compila scenario rapido dell'utente
  const loadExampleCocaCola = () => {
    const coca = products.find(p => p.name.toLowerCase().includes('coca') || p.category === 'bevande_fredde');
    if (coca) setSelectedProductId(coca.id);
    setSupplier('Coca-Cola HBC Italia');
    setPackageCount(2);
    setUnitsPerPackage(24);
    setPriceInputType('per_confezione');
    setInputPrice(12.00);
    setVatRate(22);
    setCostBasisUsed('netto');
    setInvoiceRef('DDT-2026/04');
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setNotes('2 confezioni da 24 lattine a 12€ + IVA');
    setBatchNumber(`LOT-CC-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleOpenAddModal = (prodId?: string) => {
    if (prodId) {
      setSelectedProductId(prodId);
      const prod = products.find(p => p.id === prodId);
      if (prod?.category === 'caffe_calde') {
        setPackageCount(5);
        setUnitsPerPackage(140);
        setInputPrice(16.50);
        setVatRate(10);
      } else {
        setPackageCount(2);
        setUnitsPerPackage(24);
        setInputPrice(12.00);
        setVatRate(22);
      }
    }
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setBatchNumber(`LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setExpiryDate('');
    setIsModalOpen(true);
  };

  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || totalUnits <= 0) return;

    addPurchase({
      productId: selectedProductId,
      productName: selectedProduct?.name,
      supplier,
      packageCount,
      unitsPerPackage,
      priceInputType,
      inputPrice,
      vatRate,
      costBasisUsed,
      batchNumber,
      invoiceRef,
      notes,
      date: purchaseDate,
      expiryDate: detectedExpiryFromNotes || expiryDate || undefined,
    });

    setIsModalOpen(false);
  };

  // KPIs
  const totalPurchasesAmount = useMemo(() => {
    return purchases.reduce((acc, p) => acc + p.totalTaxable, 0);
  }, [purchases]);

  const totalUnitsAcquired = useMemo(() => {
    return purchases.reduce((acc, p) => acc + p.totalUnits, 0);
  }, [purchases]);

  const totalUnitsRemainingInWarehouse = useMemo(() => {
    return purchases.reduce((acc, p) => acc + p.remainingUnits, 0);
  }, [purchases]);

  const uniqueSuppliers = useMemo(() => {
    const s = new Set(purchases.map(p => p.supplier));
    return Array.from(s);
  }, [purchases]);

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      const matchSearch = p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.invoiceRef && p.invoiceRef.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchSupplier = filterSupplier === 'all' || p.supplier === filterSupplier;
      return matchSearch && matchSupplier;
    });
  }, [purchases, searchQuery, filterSupplier]);

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
            Acquisti Fornitori & Gestione Lotti
          </h2>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl">
            Registra le forniture per confezione o a importo totale + IVA. All'arrivo del lotto il costo unitario si aggiorna automaticamente e le vendite calcolano il margine esatto.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {purchases.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearPurchasesModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors cursor-pointer"
              title="Azzera tutti i lotti registrati"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Svuota Lotti</span>
            </button>
          )}

          <button
            id="btn-new-purchase"
            onClick={() => handleOpenAddModal()}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs sm:text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registra Acquisto</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold text-stone-400 uppercase tracking-wider">Spesa Acquisti (Netto)</span>
            <Receipt className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-black text-stone-900 mt-2 font-mono">
            {formatEuro(totalPurchasesAmount)}
          </div>
          <p className="text-2xs text-stone-500 mt-1 font-medium">
            Imponibile fatturato fornitori
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold text-stone-400 uppercase tracking-wider">Unità Totali Acquistate</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-stone-900 mt-2 font-mono">
            {totalUnitsAcquired} <span className="text-xs font-normal text-stone-500">pz / dosi</span>
          </div>
          <p className="text-2xs text-stone-500 mt-1 font-medium">
            Tra lattine, bottiglie, snack e caffè
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold text-stone-400 uppercase tracking-wider">Giacenza Magazzino Deposito</span>
            <Warehouse className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2 font-mono">
            {totalUnitsRemainingInWarehouse} <span className="text-xs font-normal text-stone-500">pz pronti</span>
          </div>
          <p className="text-2xs text-stone-500 mt-1 font-medium">
            Disponibili da caricare sui distributori
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold text-stone-400 uppercase tracking-wider">Lotti Registrati</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-stone-900 mt-2 font-mono">
            {purchases.length} <span className="text-xs font-normal text-stone-500">forniture</span>
          </div>
          <p className="text-2xs text-stone-500 mt-1 font-medium">
            {uniqueSuppliers.length} fornitori attivi
          </p>
        </div>
      </div>

      {/* Warehouse Status by Product (Giacenze a Magazzino Centrale) */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-stone-100">
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
              <Warehouse className="w-4 h-4 text-emerald-600" />
              Giacenze a Magazzino Centrale & Costo d'Acquisto Attivo
            </h3>
            <p className="text-2xs text-stone-500 mt-0.5">
              Quando rifornisci un distributore, i pezzi vengono prelevati da questo stock e calcolati con il costo del lotto corrispondente.
            </p>
          </div>

          <button
            onClick={() => openRestockModal()}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Avvia Carico Distributore</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.slice(0, 9).map((product) => {
            const batch = purchases.find(p => p.id === product.activeBatchId || (p.productId === product.id && p.remainingUnits > 0));
            const availableWarehouse = product.warehouseStock ?? purchases
              .filter(p => p.productId === product.id)
              .reduce((s, p) => s + p.remainingUnits, 0);

            const unitProfit = product.defaultPrice - product.unitCost;
            const marginPct = product.defaultPrice > 0 ? (unitProfit / product.defaultPrice) * 100 : 0;
            const meta = CATEGORY_META[product.category];

            return (
              <div 
                key={product.id}
                className="p-3.5 rounded-lg border border-stone-200 bg-stone-50/40 hover:bg-white hover:border-stone-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-stone-900 text-xs line-clamp-1">{product.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-3xs font-semibold ${meta.bg} ${meta.color} border ${meta.border} shrink-0`}>
                      {meta.label}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-baseline justify-between text-2xs">
                    <span className="text-stone-500">Giacenza Magazzino:</span>
                    <span className={`font-mono font-bold ${availableWarehouse > 0 ? 'text-emerald-700' : 'text-amber-600'}`}>
                      {availableWarehouse} {product.unit}
                    </span>
                  </div>

                  <div className="mt-1 flex items-baseline justify-between text-2xs">
                    <span className="text-stone-500">Costo Acquisto Lotto:</span>
                    <span className="font-mono font-bold text-stone-800">
                      {formatEuro(product.unitCost)} / {product.unit}
                    </span>
                  </div>

                  <div className="mt-1 flex items-baseline justify-between text-2xs">
                    <span className="text-stone-500">Prezzo Vendita:</span>
                    <span className="font-mono font-bold text-stone-900">
                      {formatEuro(product.defaultPrice)}
                    </span>
                  </div>

                  <div className="mt-1 flex items-baseline justify-between text-2xs border-t border-stone-200/60 pt-1">
                    <span className="text-stone-500">Margine Utile:</span>
                    <span className="font-bold text-emerald-600">
                      +{formatEuro(unitProfit)} ({formatPercent(marginPct)})
                    </span>
                  </div>

                  {batch && (
                    <div className="mt-2 text-3xs text-stone-400 flex items-center justify-between">
                      <span>Lotto: {batch.batchNumber}</span>
                      <span>Residui lotto: {batch.remainingUnits} pz</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-stone-100 flex justify-end">
                  <button
                    onClick={() => handleOpenAddModal(product.id)}
                    className="text-2xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Registra Nuovo Arrivo
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Purchases Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-stone-100 bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cerca fornitore, prodotto, lotto o fattura..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-hidden"
              />
            </div>

            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="px-2.5 py-1.5 text-xs sm:text-sm bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-hidden"
            >
              <option value="all">Tutti i Fornitori ({uniqueSuppliers.length})</option>
              {uniqueSuppliers.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="text-2xs text-stone-500 font-medium">
            Mostrati {filteredPurchases.length} lotti registrati
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 font-semibold uppercase text-2xs bg-stone-50/40">
                <th className="py-3 px-4">Data & Lotto</th>
                <th className="py-3 px-4">Articolo Acquistato</th>
                <th className="py-3 px-4">Fornitore & Rif.</th>
                <th className="py-3 px-4 text-center">Quantità (Conf × Pz)</th>
                <th className="py-3 px-4 text-right">Prezzo Acquisto</th>
                <th className="py-3 px-4 text-right">IVA</th>
                <th className="py-3 px-4 text-right">Costo Unitario Netto</th>
                <th className="py-3 px-4 text-right">Costo Ivato</th>
                <th className="py-3 px-4 text-center">Disponibilità Magazzino</th>
                <th className="py-3 px-4 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredPurchases.map((purchase) => {
                const usedUnits = purchase.totalUnits - purchase.remainingUnits;
                const usagePct = purchase.totalUnits > 0 ? (usedUnits / purchase.totalUnits) * 100 : 100;
                const isExhausted = purchase.remainingUnits <= 0;

                // Calcolo ordine FIFO per questo prodotto
                const productActiveBatches = purchases
                  .filter(p => p.productId === purchase.productId && p.remainingUnits > 0)
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                const isFirstInQueue = productActiveBatches[0]?.id === purchase.id;
                const isInQueue = !isFirstInQueue && purchase.remainingUnits > 0;

                return (
                  <tr key={purchase.id} className={`hover:bg-stone-50/70 transition-colors ${isFirstInQueue ? 'bg-emerald-50/20' : ''}`}>
                    {/* Date & Batch */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-stone-900 text-xs">
                          {purchase.batchNumber}
                        </span>
                        {isFirstInQueue && (
                          <span className="px-1.5 py-0.5 rounded text-3xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            1° Prelievo
                          </span>
                        )}
                        {isInQueue && (
                          <span className="px-1.5 py-0.5 rounded text-3xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                            In coda
                          </span>
                        )}
                        {isExhausted && (
                          <span className="px-1.5 py-0.5 rounded text-3xs font-medium bg-stone-100 text-stone-500">
                            Esaurito
                          </span>
                        )}
                      </div>
                      <div className="text-2xs text-stone-500 mt-0.5">
                        {new Date(purchase.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>

                    {/* Product */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900">{purchase.productName}</div>
                      {purchase.notes && (
                        <div className="text-2xs text-stone-400 italic">{purchase.notes}</div>
                      )}
                      {purchase.expiryDate && (
                        <div className="mt-1">
                          <span className="inline-flex items-center space-x-1 text-3xs font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            <Calendar className="w-2.5 h-2.5 text-amber-600" />
                            <span>Scad: {new Date(purchase.expiryDate).toLocaleDateString('it-IT')}</span>
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Supplier */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-stone-800">{purchase.supplier}</div>
                      {purchase.invoiceRef && (
                        <div className="text-2xs text-stone-500 font-mono">{purchase.invoiceRef}</div>
                      )}
                    </td>

                    {/* Quantity calculation */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="font-bold text-stone-900">
                        {purchase.totalUnits} <span className="text-2xs font-normal text-stone-500">pz</span>
                      </div>
                      <div className="text-2xs text-stone-400">
                        {purchase.packageCount} conf × {purchase.unitsPerPackage} pz
                      </div>
                    </td>

                    {/* Price Input */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="font-mono font-bold text-stone-900">
                        {formatEuro(purchase.totalTaxable)}
                      </div>
                      <div className="text-2xs text-stone-500">
                        {purchase.priceInputType === 'per_confezione' 
                          ? `${formatEuro(purchase.inputPrice)} / conf` 
                          : 'totale fattura'}
                      </div>
                    </td>

                    {/* VAT */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="text-xs font-semibold text-stone-700">
                        {purchase.vatRate}%
                      </div>
                      <div className="text-2xs text-stone-400 font-mono">
                        +{formatEuro(purchase.totalVat)}
                      </div>
                    </td>

                    {/* Unit Cost Net */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {formatEuro(purchase.unitCostNet)}
                      </span>
                    </td>

                    {/* Unit Cost With VAT */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-stone-600 text-xs">
                      {formatEuro(purchase.unitCostWithVat)}
                    </td>

                    {/* Warehouse remaining */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center space-x-1.5 text-xs font-mono">
                          <button
                            type="button"
                            onClick={() => updateBatchUnits(purchase.id, Math.max(0, purchase.remainingUnits - 1))}
                            disabled={purchase.remainingUnits <= 0}
                            title="Scala 1 pezzo"
                            className="w-5 h-5 flex items-center justify-center rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            -
                          </button>
                          <span className={`font-bold min-w-[28px] text-center ${isExhausted ? 'text-stone-400' : 'text-stone-900'}`}>
                            {purchase.remainingUnits}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateBatchUnits(purchase.id, Math.min(purchase.totalUnits, purchase.remainingUnits + 1))}
                            disabled={purchase.remainingUnits >= purchase.totalUnits}
                            title="Aggiungi 1 pezzo"
                            className="w-5 h-5 flex items-center justify-center rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            +
                          </button>
                          <span className="text-stone-400 text-2xs">/ {purchase.totalUnits} pz</span>
                        </div>
                        <div className="w-24 bg-stone-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                          <div 
                            className={`h-full ${isExhausted ? 'bg-stone-300' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, usagePct)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => {
                          if (confirm(`Sei sicuro di voler eliminare il lotto ${purchase.batchNumber}?`)) {
                            deletePurchase(purchase.id);
                          }
                        }}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Elimina lotto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <PackagePlus className="w-8 h-8 text-stone-300" />
                      <p className="font-semibold text-stone-700 text-sm">Nessun lotto fornitore registrato</p>
                      <p className="text-2xs text-stone-400 max-w-sm">
                        Inizia da zero registrando la prima fattura o DDT con il pulsante in alto "+ Registra Acquisto Fornitore".
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Registra Nuovo Acquisto & Calcolo Lotti */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-600" />
                  Registra Fornitura / Acquisto Merce
                </h3>
                <p className="text-2xs text-stone-500 mt-0.5">
                  Calcolo automatico costo pezzo netto/ivato e carico istantaneo a magazzino
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="p-6 space-y-4">
              {/* Product Selection */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Articolo / Prodotto Acquistato *
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  required
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — Attuale Costo: {formatEuro(p.unitCost)} | Prezzo Vendita: {formatEuro(p.defaultPrice)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier, Invoice & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-stone-700 mb-1">Fornitore *</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Es. Coca-Cola HBC, Metro"
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg text-stone-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Fattura / DDT N°</label>
                  <input
                    type="text"
                    value={invoiceRef}
                    onChange={(e) => setInvoiceRef(e.target.value)}
                    placeholder="Es. FT-123 o DDT 456"
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Data Acquisto *</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg text-stone-900 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Quantity Configuration (Confezioni x Pezzi per confezione) */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-blue-600" />
                    Quantità Acquistata
                  </span>
                  <span className="text-xs font-bold text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Totale: {totalUnits} {selectedProduct?.unit || 'pz'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-2xs font-semibold text-stone-600 mb-1">
                      N° Confezioni / Casse / Box
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={packageCount}
                      onChange={(e) => setPackageCount(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 text-sm font-bold border border-stone-300 rounded-lg text-stone-900 text-center"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-semibold text-stone-600 mb-1">
                      Pezzi per singola confezione
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={unitsPerPackage}
                      onChange={(e) => setUnitsPerPackage(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 text-sm font-bold border border-stone-300 rounded-lg text-stone-900 text-center"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Pricing & VAT Configuration */}
              <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    Prezzo d'Acquisto & Aliquota IVA
                  </span>

                  {/* Mode toggle */}
                  <div className="inline-flex rounded-lg border border-emerald-200 bg-white p-0.5 text-2xs">
                    <button
                      type="button"
                      onClick={() => setPriceInputType('per_confezione')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                        priceInputType === 'per_confezione' 
                          ? 'bg-emerald-600 text-white shadow-2xs' 
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      A Confezione
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriceInputType('totale')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                        priceInputType === 'totale' 
                          ? 'bg-emerald-600 text-white shadow-2xs' 
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Totale Imponibile
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-2xs font-semibold text-stone-700 mb-1">
                      {priceInputType === 'per_confezione' ? 'Prezzo per Confezione (€)' : 'Prezzo Totale Fattura (€)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs">€</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.05"
                        value={inputPrice}
                        onChange={(e) => setInputPrice(parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-3 py-1.5 text-sm font-black border border-emerald-300 rounded-lg text-stone-900 bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-2xs font-semibold text-stone-700 mb-1">
                      Aliquota IVA
                    </label>
                    <select
                      value={vatRate}
                      onChange={(e) => setVatRate(parseFloat(e.target.value))}
                      className="w-full px-3 py-1.5 text-sm font-semibold border border-emerald-300 rounded-lg text-stone-900 bg-white"
                    >
                      <option value={22}>22% (Bevande, snack confezionati)</option>
                      <option value={10}>10% (Caffè, preparati alimentari)</option>
                      <option value={4}>4% (Beni prima necessità)</option>
                      <option value={0}>0% (Esente / Reverse charge)</option>
                    </select>
                  </div>
                </div>

                {/* Calculation Summary Box */}
                <div className="bg-white p-3 rounded-lg border border-emerald-200 text-xs space-y-1.5">
                  <div className="flex justify-between text-stone-600 text-2xs">
                    <span>Totale Imponibile:</span>
                    <span className="font-mono font-semibold">{formatEuro(totalTaxable)}</span>
                  </div>
                  <div className="flex justify-between text-stone-600 text-2xs">
                    <span>Imposta IVA ({vatRate}%):</span>
                    <span className="font-mono font-semibold">{formatEuro(totalVat)}</span>
                  </div>
                  <div className="flex justify-between text-stone-800 text-2xs font-semibold border-b border-stone-100 pb-1">
                    <span>Totale Lordo Fornitore:</span>
                    <span className="font-mono font-bold">{formatEuro(totalGross)}</span>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <div>
                      <span className="block font-bold text-emerald-800 text-xs">Costo Unitario Netto per Pezzo:</span>
                      <span className="text-3xs text-stone-400">({formatEuro(totalTaxable)} ÷ {totalUnits} pz)</span>
                    </div>
                    <span className="text-base font-black font-mono text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                      {formatEuro(unitCostNet)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-2xs text-stone-500 pt-0.5">
                    <span>Costo Unitario Ivato (IVA inclusa):</span>
                    <span className="font-mono font-bold text-stone-700">{formatEuro(unitCostWithVat)}</span>
                  </div>

                  {/* Estimated Profit with current selling price */}
                  <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between bg-stone-50/80 -mx-3 -mb-3 p-2.5 rounded-b-lg text-2xs">
                    <div>
                      <span className="font-semibold text-stone-700">Prezzo Vendita Attuale:</span>
                      <span className="font-mono font-bold text-stone-900 ml-1">{formatEuro(estimatedSellingPrice)}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-700">Margine: +{formatEuro(estimatedProfit)}</span>
                      <span className="text-stone-400 ml-1">({formatPercent(estimatedMarginPct)})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Batch Code & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-stone-600 mb-1">Codice Lotto Generato</label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-stone-300 rounded-lg text-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-stone-600 mb-1">
                    Note Fornitura &amp; Scadenza Lotto
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Es. Promozione fornitore, Scadenza: 15/10/2026..."
                    className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg text-stone-900"
                  />
                  {detectedExpiryFromNotes ? (
                    <div className="mt-1 flex items-center space-x-1.5 text-2xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>✓ Scadenza rilevata dalle note: {new Date(detectedExpiryFromNotes).toLocaleDateString('it-IT')} (Allert a 14 giorni)</span>
                    </div>
                  ) : (
                    <p className="text-3xs text-stone-500 mt-1">
                      💡 <strong>Rilevamento automatico:</strong> Scrivi la data nelle note (es. <span className="font-mono font-bold text-stone-700">15/10/2026</span> o <span className="font-mono font-bold text-stone-700">Scad. 10/2026</span>), verrà salvata direttamente nelle Scadenze.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-stone-600 mb-1">
                    Data Scadenza Selettore (opzionale)
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg text-stone-900 font-mono"
                  />
                </div>
              </div>

              {/* Submit / Actions */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-800 text-xs font-semibold"
                >
                  Annulla
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Registra & Aggiorna Costo Merce</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Conferma Svuota Tutti i Lotti */}
      {isClearPurchasesModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-sm w-full p-5 text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-stone-900 text-base">Svuotare tutti i lotti registrati?</h3>
            <p className="text-xs text-stone-500 mt-1.5">
              Verranno rimossi tutti i <strong>{purchases.length} lotti</strong> di acquisto fornitore registrati. Lo storico acquisti tornerà a zero.
            </p>
            <div className="mt-5 flex items-center justify-center space-x-2">
              <button
                type="button"
                onClick={() => setIsClearPurchasesModalOpen(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAllPurchases();
                  setIsClearPurchasesModalOpen(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Sì, Svuota Lotti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
