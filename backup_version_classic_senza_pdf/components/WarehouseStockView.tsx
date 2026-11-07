import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Plus, 
  Minus, 
  ShoppingCart, 
  Warehouse, 
  Coins, 
  Sparkles, 
  Layers, 
  Tag, 
  Clock, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Calendar,
  DollarSign,
  ArrowRight,
  Trash2,
  Edit3,
  X,
  PackagePlus,
  Info,
  Check,
  TrendingUp,
  Percent,
  Bell,
  BellRing
} from 'lucide-react';
import { useVending } from '../context/VendingContext';
import { formatEuro, formatPercent, CATEGORY_META } from '../utils/vendingUtils';
import { Product, ProductCategory, PurchaseBatch } from '../types';

interface WarehouseStockViewProps {
  onNavigateToPurchases?: () => void;
}

export const WarehouseStockView: React.FC<WarehouseStockViewProps> = ({ onNavigateToPurchases }) => {
  const { 
    products, 
    purchases, 
    machines, 
    updateWarehouseStock, 
    updateBatchUnits, 
    addPurchase,
    addProduct,
    deleteProduct,
    clearAllProducts,
    updateProduct
  } = useVending();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'critical' | 'low' | 'good'>('all');
  const [expandedLotti, setExpandedLotti] = useState<Record<string, boolean>>({});

  // Add Product Modal State
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [pName, setPName] = useState('');
  const [pCategory, setPCategory] = useState<ProductCategory>('bevande_fredde');
  const [pUnit, setPUnit] = useState('lattine');
  const [pDefaultPrice, setPDefaultPrice] = useState<number>(1.30);
  const [pUnitCost, setPUnitCost] = useState<number>(0.48);
  const [pWarehouseStock, setPWarehouseStock] = useState<number>(0);
  const [pWarehouseAlertThreshold, setPWarehouseAlertThreshold] = useState<number>(8);
  const [pDescription, setPDescription] = useState('');

  // Initial lot creation inside Add Product modal
  const [hasInitialBatch, setHasInitialBatch] = useState(false);
  const [bSupplier, setBSupplier] = useState('Grossista Bevande & Snack');
  const [bInvoiceRef, setBInvoiceRef] = useState('FT-2026/01');
  const [bDate, setBDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [bPackageCount, setBPackageCount] = useState<number>(2);
  const [bUnitsPerPackage, setBUnitsPerPackage] = useState<number>(24);
  const [bPriceType, setBPriceType] = useState<'per_confezione' | 'totale'>('per_confezione');
  const [bInputPrice, setBInputPrice] = useState<number>(11.50);
  const [bVatRate, setBVatRate] = useState<number>(22);
  const [bExpiryDate, setBExpiryDate] = useState('');
  const [bNotes, setBNotes] = useState('');

  // Quick Lot Modal State (for adding a batch to an existing product)
  const [quickLotProduct, setQuickLotProduct] = useState<Product | null>(null);
  const [lotSupplier, setLotSupplier] = useState('Ingrosso Bevande & Snack');
  const [lotInvoiceRef, setLotInvoiceRef] = useState('FT-');
  const [lotDate, setLotDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [lotPackageCount, setLotPackageCount] = useState<number>(2);
  const [lotUnitsPerPackage, setLotUnitsPerPackage] = useState<number>(24);
  const [lotPriceInputType, setLotPriceInputType] = useState<'per_confezione' | 'totale'>('per_confezione');
  const [lotInputPrice, setLotInputPrice] = useState<number>(12.00);
  const [lotVatRate, setLotVatRate] = useState<number>(22);
  const [lotExpiryDate, setLotExpiryDate] = useState('');
  const [lotNotes, setLotNotes] = useState('');

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<ProductCategory>('bevande_fredde');
  const [editUnit, setEditUnit] = useState('pz');
  const [editPrice, setEditPrice] = useState(1.20);
  const [editCost, setEditCost] = useState(0.40);
  const [editAlertThreshold, setEditAlertThreshold] = useState<number>(8);
  const [editDescription, setEditDescription] = useState('');

  // Confirm delete modals
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);

  // Mappa di quanti pezzi di ciascun prodotto sono attualmente nei distributori
  const machineStockByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    machines.forEach(m => {
      m.slots.forEach(s => {
        map[s.productId] = (map[s.productId] || 0) + s.currentStock;
      });
    });
    return map;
  }, [machines]);

  // Calcolo KPI del magazzino
  const totalWarehouseUnits = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.warehouseStock || 0), 0);
  }, [products]);

  const totalWarehouseValue = useMemo(() => {
    return purchases.reduce((acc, b) => acc + (b.remainingUnits * b.unitCostNet), 0);
  }, [purchases]);

  const lowStockProductsCount = useMemo(() => {
    return products.filter(p => {
      const threshold = p.warehouseAlertThreshold ?? 8;
      return (p.warehouseStock || 0) <= threshold;
    }).length;
  }, [products]);

  const totalInMachinesUnits = useMemo(() => {
    return machines.reduce((acc, m) => acc + m.slots.reduce((s, slot) => s + slot.currentStock, 0), 0);
  }, [machines]);

  // Prodotti filtrati
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;

      const stock = p.warehouseStock || 0;
      const threshold = p.warehouseAlertThreshold ?? 8;
      let matchStatus = true;
      if (stockStatusFilter === 'critical') matchStatus = stock === 0;
      if (stockStatusFilter === 'low') matchStatus = stock > 0 && stock <= threshold;
      if (stockStatusFilter === 'good') matchStatus = stock > threshold;

      return matchSearch && matchCat && matchStatus;
    });
  }, [products, searchQuery, selectedCategory, stockStatusFilter]);

  const handleStockChange = (productId: string, newStock: number) => {
    updateWarehouseStock(productId, newStock);
  };

  const toggleExpandLotti = (productId: string) => {
    setExpandedLotti(prev => ({
      ...prev,
      [productId]: prev[productId] === undefined ? false : !prev[productId]
    }));
  };

  // Open Add Product Modal with reset fields
  const handleOpenAddProduct = () => {
    setPName('');
    setPCategory('bevande_fredde');
    setPUnit('lattine');
    setPDefaultPrice(1.30);
    setPUnitCost(0.48);
    setPWarehouseStock(0);
    setPWarehouseAlertThreshold(8);
    setPDescription('');
    setHasInitialBatch(false);
    setBSupplier('Grossista Bevande & Snack');
    setBInvoiceRef(`FT-${new Date().getFullYear()}/${Math.floor(10 + Math.random() * 90)}`);
    setBDate(new Date().toISOString().slice(0, 10));
    setBPackageCount(2);
    setBUnitsPerPackage(24);
    setBPriceType('per_confezione');
    setBInputPrice(11.50);
    setBVatRate(22);
    setBExpiryDate('');
    setBNotes('');
    setIsAddProductModalOpen(true);
  };

  // Open Edit Product Modal
  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditCategory(p.category);
    setEditUnit(p.unit);
    setEditPrice(p.defaultPrice);
    setEditCost(p.unitCost);
    setEditAlertThreshold(p.warehouseAlertThreshold ?? 8);
    setEditDescription(p.description || '');
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    updateProduct({
      ...editingProduct,
      name: editName.trim(),
      category: editCategory,
      unit: editUnit.trim() || 'pz',
      defaultPrice: editPrice,
      unitCost: editCost,
      warehouseAlertThreshold: editAlertThreshold >= 0 ? editAlertThreshold : 8,
      description: editDescription.trim(),
    });
    setEditingProduct(null);
  };

  // Calculations for Add Product Modal (Initial Batch)
  const calcBatchTotalUnits = Math.max(1, (bPackageCount || 0) * (bUnitsPerPackage || 0));
  const calcBatchTotalTaxable = bPriceType === 'per_confezione' 
    ? (bInputPrice || 0) * (bPackageCount || 0) 
    : (bInputPrice || 0);
  const calcBatchTotalVat = calcBatchTotalTaxable * ((bVatRate || 0) / 100);
  const calcBatchTotalGross = calcBatchTotalTaxable + calcBatchTotalVat;
  const calcBatchUnitCostNet = Number((calcBatchTotalTaxable / calcBatchTotalUnits).toFixed(3));
  const calcBatchUnitCostWithVat = Number((calcBatchTotalGross / calcBatchTotalUnits).toFixed(3));

  // Dynamic profit preview in Add Modal
  const effectiveCostInAdd = hasInitialBatch ? calcBatchUnitCostNet : pUnitCost;
  const effectiveMarginInAdd = pDefaultPrice - effectiveCostInAdd;
  const effectiveMarginPctInAdd = pDefaultPrice > 0 ? (effectiveMarginInAdd / pDefaultPrice) * 100 : 0;

  // Handle Add Product Submit
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) return;

    const initialStock = hasInitialBatch ? calcBatchTotalUnits : pWarehouseStock;

    addProduct(
      {
        name: pName.trim(),
        category: pCategory,
        unit: pUnit.trim() || 'pz',
        defaultPrice: pDefaultPrice,
        unitCost: hasInitialBatch ? calcBatchUnitCostNet : pUnitCost,
        warehouseStock: initialStock,
        warehouseAlertThreshold: pWarehouseAlertThreshold >= 0 ? pWarehouseAlertThreshold : 8,
        description: pDescription.trim(),
      },
      hasInitialBatch ? {
        supplier: bSupplier.trim() || 'Fornitore Principale',
        packageCount: bPackageCount,
        unitsPerPackage: bUnitsPerPackage,
        priceInputType: bPriceType,
        inputPrice: bInputPrice,
        vatRate: bVatRate,
        invoiceRef: bInvoiceRef.trim(),
        date: bDate,
        expiryDate: bExpiryDate,
        notes: bNotes.trim(),
      } : undefined
    );

    setIsAddProductModalOpen(false);
  };

  // Open Quick Lot Modal for existing product
  const openQuickLotModal = (product: Product) => {
    setQuickLotProduct(product);
    setLotSupplier('Fornitore Principale');
    setLotInvoiceRef(`FT-${Math.floor(100 + Math.random() * 900)}`);
    setLotDate(new Date().toISOString().slice(0, 10));
    if (product.category === 'caffe_calde') {
      setLotPackageCount(5);
      setLotUnitsPerPackage(140);
      setLotInputPrice(16.50);
      setLotVatRate(10);
    } else {
      setLotPackageCount(2);
      setLotUnitsPerPackage(24);
      setLotInputPrice(12.00);
      setLotVatRate(22);
    }
    setLotPriceInputType('per_confezione');
    setLotExpiryDate('');
    setLotNotes('');
  };

  const handleSaveQuickLot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickLotProduct) return;

    addPurchase({
      productId: quickLotProduct.id,
      productName: quickLotProduct.name,
      supplier: lotSupplier,
      packageCount: lotPackageCount,
      unitsPerPackage: lotUnitsPerPackage,
      priceInputType: lotPriceInputType,
      inputPrice: lotInputPrice,
      vatRate: lotVatRate,
      invoiceRef: lotInvoiceRef,
      notes: lotNotes,
      expiryDate: lotExpiryDate,
      date: lotDate,
    });

    setQuickLotProduct(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card con pulsanti primari */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-stone-900 tracking-tight">
                  Scorte Magazzino & Gestione Prodotti
                </h1>
                <span className="text-3xs font-mono font-bold px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full border border-stone-200">
                  {products.length} articoli
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1 max-w-2xl">
                Controlla la merce disponibile in deposito centrale, registra nuovi carichi da fornitore con tracciamento lotti e definisci anagrafica e prezzi di vendita.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* PULSANTE PRIMARIO: AGGIUNGI QUALSIASI PRODOTTO */}
            <button
              type="button"
              onClick={handleOpenAddProduct}
              className="inline-flex items-center space-x-2 px-4 py-2.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              <span>+ Aggiungi Nuovo Prodotto</span>
            </button>

            {/* PULSANTE SVUOTA MAGAZZINO */}
            {products.length > 0 && (
              <button
                type="button"
                onClick={() => setIsClearAllConfirmOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                title="Elimina tutti gli articoli e le scorte registrate"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Svuota Magazzino</span>
              </button>
            )}

            {onNavigateToPurchases && (
              <button
                type="button"
                onClick={onNavigateToPurchases}
                className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-colors border border-stone-200 cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-stone-600" />
                <span>Fatture & Lotti</span>
              </button>
            )}
          </div>
        </div>

        {/* Barometro KPI Magazzino */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-stone-100">
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70">
            <span className="text-2xs font-bold text-stone-500 uppercase tracking-wide block">
              Merce a Magazzino
            </span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-extrabold text-stone-900 font-mono">
                {totalWarehouseUnits}
              </span>
              <span className="text-xs text-stone-500 font-medium">pezzi</span>
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70">
            <span className="text-2xs font-bold text-stone-500 uppercase tracking-wide block">
              Valore Scorte a Costo
            </span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-extrabold text-emerald-700 font-mono">
                {formatEuro(totalWarehouseValue)}
              </span>
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70">
            <span className="text-2xs font-bold text-stone-500 uppercase tracking-wide block">
              Nei Distributori H24
            </span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-extrabold text-blue-700 font-mono">
                {totalInMachinesUnits}
              </span>
              <span className="text-xs text-stone-500 font-medium">pezzi</span>
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70">
            <span className="text-2xs font-bold text-stone-500 uppercase tracking-wide block">
              Articoli a Magazzino
            </span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-extrabold text-stone-900 font-mono">
                {products.length}
              </span>
              <span className="text-xs text-stone-500 font-medium">
                {lowStockProductsCount > 0 ? `(${lowStockProductsCount} sotto scorta)` : 'totali'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SEZIONE VUOTA: ZERO PRODOTTI A MAGAZZINO */}
      {products.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-stone-300 p-8 sm:p-14 text-center max-w-3xl mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4 border border-emerald-200/70 shadow-2xs">
            <Warehouse className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
            Il Tuo Magazzino è Attualmente Vuoto
          </h2>
          <p className="text-sm text-stone-600 mt-2 max-w-xl mx-auto leading-relaxed">
            Tutti i prodotti di prova e le scorte sono stati azzerati. Ora puoi configurare i tuoi veri articoli (bevande, snack, caffè, tramezzini...) impostando nome, categoria, confezione, prezzo di vendita al distributore, costo di acquisto fornitore e giacenza iniziale.
          </p>
          
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleOpenAddProduct}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-md transition-all inline-flex items-center justify-center space-x-2 cursor-pointer"
            >
              <PackagePlus className="w-5 h-5" />
              <span>+ Inserisci il Tuo Primo Prodotto</span>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Anagrafica Completa
              </span>
              <p className="text-3xs text-stone-500 mt-1">
                Nome, categoria, unità di misura personalizzata e descrizione del prodotto.
              </p>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Controllo Margini
              </span>
              <p className="text-3xs text-stone-500 mt-1">
                Calcolo istantaneo del ricarico % e dell'utile netto per singola erogazione o pezzo.
              </p>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                Lotto & Scadenza
              </span>
              <p className="text-3xs text-stone-500 mt-1">
                Registra contestualmente DDT fornitore, confezioni, aliquota IVA e data di scadenza.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Barra Filtri & Ricerca */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
              {/* Cerca Articolo */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Cerca prodotto per nome o categoria..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Filtro Categoria */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl text-stone-700 focus:bg-white focus:outline-hidden"
              >
                <option value="all">Tutte le categorie</option>
                <option value="bevande_fredde">🥤 Bevande Fredde</option>
                <option value="snack_dolci">🍫 Snack Dolci</option>
                <option value="snack_salati">🍿 Snack Salati</option>
                <option value="caffe_calde">☕ Caffè & Calde</option>
                <option value="freschi_healthy">🥪 Freschi & Alimenti</option>
              </select>

              {/* Filtro Livello Scorta */}
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value as any)}
                className="px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl text-stone-700 focus:bg-white focus:outline-hidden"
              >
                <option value="all">Tutti i livelli di scorta</option>
                <option value="critical">🚨 Esauriti a magazzino (0 pz)</option>
                <option value="low">⚠️ Sotto scorta (≤ soglia impostata)</option>
                <option value="good">✅ Disponibilità buona (&gt; soglia)</option>
              </select>
            </div>

            <div className="text-2xs text-stone-500 font-medium px-2 py-1 bg-stone-50 rounded-lg border border-stone-200 self-start sm:self-auto">
              Mostrati <strong>{filteredProducts.length}</strong> su {products.length} articoli
            </div>
          </div>

          {/* Griglia Scorte Magazzino con Gestione Lotti e Azioni */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredProducts.map((product) => {
              const stock = product.warehouseStock || 0;
              const inMachines = machineStockByProduct[product.id] || 0;

              // Tutti i lotti di questo prodotto ordinati cronologicamente FIFO (data più vecchia prima)
              const productBatches = purchases
                .filter(b => b.productId === product.id)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

              const activeBatches = productBatches.filter(b => b.remainingUnits > 0);
              const activeFifoBatch = activeBatches[0];
              const activeUnitCost = activeFifoBatch ? activeFifoBatch.unitCostNet : product.unitCost;
              const productStockValue = productBatches.reduce((sum, b) => sum + (b.remainingUnits * b.unitCostNet), 0);

              const profit = product.defaultPrice - activeUnitCost;
              const marginPct = product.defaultPrice > 0 ? (profit / product.defaultPrice) * 100 : 0;

              const alertThreshold = product.warehouseAlertThreshold ?? 8;
              const isCritical = stock === 0;
              const isLow = stock > 0 && stock <= alertThreshold;
              const isLottiExpanded = expandedLotti[product.id] !== false;

              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-2xl border transition-all p-5 shadow-2xs flex flex-col justify-between ${
                    isCritical 
                      ? 'border-rose-300 bg-rose-50/15' 
                      : isLow 
                      ? 'border-amber-300 bg-amber-50/10' 
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div>
                    {/* Intestazione Scheda Prodotto */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xs font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200 uppercase tracking-wide">
                            {CATEGORY_META[product.category]?.label || product.category}
                          </span>
                          <span className="text-2xs text-stone-500 font-medium">
                            Unità: {product.unit}
                          </span>
                        </div>
                        <h3 className="font-bold text-stone-900 text-lg leading-snug">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="text-2xs text-stone-500">
                            {product.description}
                          </p>
                        )}
                      </div>

                      {/* Badge Stato Scorta Totale */}
                      {isCritical ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-2xs font-bold bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                          <span>Esaurito</span>
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-2xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0" title={`Allerta attiva: sotto ${alertThreshold} ${product.unit}`}>
                          <BellRing className="w-3 h-3 text-amber-600" />
                          <span>Sotto Scorta (≤{alertThreshold})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                          <span>Disponibile</span>
                        </span>
                      )}
                    </div>

                    {/* Prezzi & Economia dell'articolo */}
                    <div className="grid grid-cols-3 gap-2 my-3 p-3 bg-stone-50/80 rounded-xl border border-stone-200 text-xs">
                      <div>
                        <span className="text-3xs font-semibold text-stone-500 block">Prezzo Vendita</span>
                        <span className="font-bold text-stone-900 font-mono text-sm">
                          {formatEuro(product.defaultPrice)}
                        </span>
                      </div>
                      <div>
                        <span className="text-3xs font-semibold text-stone-500 block">Costo Netto</span>
                        <span className="font-bold text-stone-700 font-mono text-sm">
                          {formatEuro(activeUnitCost)}
                        </span>
                      </div>
                      <div>
                        <span className="text-3xs font-semibold text-stone-500 block">Margine Utile</span>
                        <span className="font-bold text-emerald-700 font-mono text-sm">
                          {formatEuro(profit)} <span className="text-3xs font-normal">({formatPercent(marginPct)})</span>
                        </span>
                      </div>
                    </div>

                    {/* Blocco Giacenza Complessiva Magazzino */}
                    <div className="my-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-2xs font-bold text-stone-500 uppercase tracking-wider block">
                            Giacenza a Magazzino
                          </span>
                          <span className="text-3xs text-stone-400 bg-white px-1.5 py-0.2 rounded border border-stone-200 font-mono">
                            {activeBatches.length} lotti attivi
                          </span>
                          <span className="text-3xs text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-medium flex items-center gap-1" title="Soglia minima di allerta magazzino configurata per questo articolo">
                            <Bell className="w-2.5 h-2.5" />
                            Allerta: ≤{alertThreshold} {product.unit}
                          </span>
                        </div>
                        <div className="flex items-baseline space-x-2 mt-0.5">
                          <span className={`text-3xl font-black font-mono ${
                            isCritical ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-stone-900'
                          }`}>
                            {stock}
                          </span>
                          <span className="text-xs font-semibold text-stone-500">
                            {product.unit} totali
                          </span>
                        </div>
                        <p className="text-2xs text-stone-500 mt-0.5">
                          Valore scorta: <strong className="text-emerald-700">{formatEuro(productStockValue)}</strong> • Nei distributori: <strong className="text-blue-700">{inMachines} pz</strong>
                        </p>
                      </div>

                      {/* Regolatore rapido scorta complessiva (+/-) */}
                      <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-stone-200 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleStockChange(product.id, Math.max(0, stock - 1))}
                          className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 font-bold transition-colors cursor-pointer"
                          title="Riduci totale di 1 pezzo"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={stock}
                          onChange={(e) => handleStockChange(product.id, parseInt(e.target.value) || 0)}
                          className="w-12 text-center font-extrabold text-sm text-stone-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleStockChange(product.id, stock + 1)}
                          className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 font-bold transition-colors cursor-pointer"
                          title="Aggiungi totale 1 pezzo"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Blocco Lotti Indipendenti & Ordine FIFO */}
                    <div className="mt-3 border border-stone-200 rounded-xl overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() => toggleExpandLotti(product.id)}
                        className="w-full px-3.5 py-2.5 bg-stone-50/70 hover:bg-stone-100/70 border-b border-stone-200 flex items-center justify-between text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center space-x-2">
                          <Tag className="w-3.5 h-3.5 text-stone-500" />
                          <span className="text-xs font-bold text-stone-800">
                            Lotti Fornitori & Scadenze ({productBatches.length})
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-3xs text-stone-400 font-mono">
                            {isLottiExpanded ? 'Nascondi' : 'Mostra dettagli'}
                          </span>
                          {isLottiExpanded ? (
                            <ChevronUp className="w-4 h-4 text-stone-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-stone-500" />
                          )}
                        </div>
                      </button>

                      {isLottiExpanded && (
                        <div className="p-3 space-y-2 bg-stone-50/30">
                          {productBatches.length === 0 ? (
                            <div className="text-center py-3 text-stone-400 text-xs">
                              Nessun lotto fornitore registrato per questo prodotto.
                            </div>
                          ) : (
                            productBatches.map((batch, index) => {
                              const isFirstActive = activeBatches[0]?.id === batch.id;
                              const isQueued = !isFirstActive && batch.remainingUnits > 0;
                              const isExhausted = batch.remainingUnits === 0;

                              return (
                                <div
                                  key={batch.id}
                                  className={`p-2.5 rounded-lg border text-xs transition-colors ${
                                    isFirstActive 
                                      ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs' 
                                      : isExhausted 
                                      ? 'bg-stone-100/50 border-stone-200 opacity-60' 
                                      : 'bg-white border-stone-200'
                                  }`}
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                    <div className="space-y-0.5 min-w-0">
                                      <div className="flex items-center space-x-2 flex-wrap">
                                        <span className="font-mono font-bold text-stone-900 text-xs">
                                          {batch.invoiceRef || 'DDT'}
                                        </span>
                                        <span className="text-3xs px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 font-mono">
                                          Lotto: {batch.batchNumber}
                                        </span>
                                        <span className="text-3xs text-stone-400">
                                          {new Date(batch.date).toLocaleDateString('it-IT')}
                                        </span>
                                        {batch.expiryDate && (
                                          <span className="text-3xs px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                                            Scad: {batch.expiryDate}
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center space-x-2 text-2xs text-stone-600">
                                        <span>
                                          Costo: <strong className="text-stone-900 font-bold">{formatEuro(batch.unitCostNet)}</strong>
                                        </span>
                                        <span className="text-stone-300">•</span>
                                        <span>Fornitore: <strong>{batch.supplier}</strong></span>
                                      </div>
                                    </div>

                                    {/* Controllore Rimanenza Lotto Singolo */}
                                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                                      {isFirstActive && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-3xs font-bold bg-emerald-600 text-white">
                                          1° in uscita
                                        </span>
                                      )}
                                      {isExhausted && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-3xs font-medium bg-stone-200 text-stone-600">
                                          Esaurito
                                        </span>
                                      )}

                                      <div className="flex items-center space-x-1 bg-white p-0.5 rounded-lg border border-stone-200">
                                        <button
                                          type="button"
                                          onClick={() => updateBatchUnits(batch.id, Math.max(0, batch.remainingUnits - 1))}
                                          className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 font-bold cursor-pointer text-xs"
                                          title="Riduci rimanenza"
                                        >
                                          -
                                        </button>
                                        <span className="w-10 text-center font-mono font-bold text-xs text-stone-900">
                                          {batch.remainingUnits}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => updateBatchUnits(batch.id, batch.remainingUnits + 1)}
                                          className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 font-bold cursor-pointer text-xs"
                                          title="Aumenta rimanenza"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Azioni Scheda Prodotto */}
                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openQuickLotModal(product)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Carica Lotto</span>
                    </button>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditProduct(product)}
                        className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                        title="Modifica informazioni articolo"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setProductToDelete(product)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Elimina questo prodotto dal magazzino"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
              <Warehouse className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h3 className="font-bold text-stone-800 text-base">Nessun prodotto corrisponde ai filtri</h3>
              <p className="text-xs text-stone-500 mt-1">
                Modifica i criteri di ricerca o clicca su "+ Aggiungi Nuovo Prodotto" per inserirne uno nuovo.
              </p>
            </div>
          )}
        </>
      )}

      {/* MODALE 1: AGGIUNGI QUALSIASI PRODOTTO A MAGAZZINO (COMPLETA) */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-xl w-full my-6 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <PackagePlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-stone-900">
                    Aggiungi Nuovo Prodotto a Magazzino
                  </h3>
                  <p className="text-3xs text-stone-500">
                    Inserisci tutte le informazioni dell'articolo e registra le scorte iniziali
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProductModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-md cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Sezione 1: Anagrafica Articolo */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-stone-100 pb-1">
                  <span className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-stone-500" />
                    1. Informazioni Generali Articolo
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Nome Prodotto *
                  </label>
                  <input
                    type="text"
                    required
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    placeholder="Es. Coca-Cola 330ml, Acqua Minerale 500ml, Fonzies 40g, Caffè Arabica..."
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl text-stone-900 focus:bg-white focus:outline-hidden focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-2xs font-bold text-stone-700 mb-1">
                      Categoria Articolo *
                    </label>
                    <select
                      value={pCategory}
                      onChange={(e) => setPCategory(e.target.value as ProductCategory)}
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl text-stone-900 bg-white"
                    >
                      <option value="bevande_fredde">🥤 Bevande Fredde</option>
                      <option value="snack_dolci">🍫 Snack Dolci</option>
                      <option value="snack_salati">🍿 Snack Salati</option>
                      <option value="caffe_calde">☕ Caffè & Bevande Calde</option>
                      <option value="freschi_healthy">🥪 Freschi & Alimenti</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-stone-700 mb-1">
                      Unità di Misura / Confezione *
                    </label>
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={pUnit}
                        onChange={(e) => setPUnit(e.target.value)}
                        placeholder="es. lattine, bottiglie, pz..."
                        className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-xl text-stone-900"
                        required
                      />
                      <div className="flex flex-wrap gap-1">
                        {['lattine', 'bottiglie', 'pz', 'buste', 'brik', 'erogazioni'].map(unitChoice => (
                          <button
                            key={unitChoice}
                            type="button"
                            onClick={() => setPUnit(unitChoice)}
                            className={`px-1.5 py-0.5 rounded text-3xs font-medium border ${
                              pUnit === unitChoice 
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                            }`}
                          >
                            {unitChoice}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-stone-600 mb-1">
                    Descrizione Breve / Note (opzionale)
                  </label>
                  <input
                    type="text"
                    value={pDescription}
                    onChange={(e) => setPDescription(e.target.value)}
                    placeholder="Es. Lattina alluminio slim refrigerata, formato bar..."
                    className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-xl text-stone-900"
                  />
                </div>
              </div>

              {/* Sezione 2: Economia e Listino Prezzi */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-stone-100 pb-1">
                  <span className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    2. Listino & Margine di Vendita
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-2xs font-bold text-stone-700 mb-1">
                      Prezzo al Pubblico (€) *
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.10"
                      value={pDefaultPrice}
                      onChange={(e) => setPDefaultPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm font-bold border border-stone-300 rounded-xl text-stone-900"
                      required
                    />
                    <span className="text-3xs text-stone-400 mt-0.5 block">Prezzo erogato al distributore</span>
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-stone-700 mb-1">
                      Costo Acquisto Unitario Netto (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      disabled={hasInitialBatch}
                      value={hasInitialBatch ? calcBatchUnitCostNet : pUnitCost}
                      onChange={(e) => setPUnitCost(parseFloat(e.target.value) || 0)}
                      className={`w-full px-3 py-2 text-sm font-bold border rounded-xl text-stone-900 ${
                        hasInitialBatch ? 'bg-stone-100 border-stone-200 text-stone-500' : 'border-stone-300'
                      }`}
                      required
                    />
                    <span className="text-3xs text-stone-400 mt-0.5 block">
                      {hasInitialBatch ? 'Calcolato in automatico dal lotto' : 'Costo unitario stimato'}
                    </span>
                  </div>
                </div>

                {/* Simulazione Utile in Tempo Reale */}
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-emerald-950 block">Margine Unitario Stimato:</span>
                    <span className="text-3xs text-emerald-800">
                      Prezzo {formatEuro(pDefaultPrice)} - Costo {formatEuro(effectiveCostInAdd)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-emerald-800 text-sm block">
                      +{formatEuro(effectiveMarginInAdd)}
                    </span>
                    <span className="text-3xs font-bold text-emerald-700">
                      {formatPercent(effectiveMarginPctInAdd)} ricarico
                    </span>
                  </div>
                </div>
              </div>

              {/* Sezione 3: Giacenza Iniziale & Opzione Lotto Fornitore */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-stone-100 pb-1">
                  <span className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Warehouse className="w-3.5 h-3.5 text-amber-600" />
                    3. Scorte a Magazzino
                  </span>
                </div>

                {!hasInitialBatch && (
                  <div>
                    <label className="block text-2xs font-bold text-stone-700 mb-1">
                      Giacenza Iniziale Magazzino (Pezzi fisici)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={pWarehouseStock}
                      onChange={(e) => setPWarehouseStock(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm font-bold border border-stone-300 rounded-xl text-stone-900"
                    />
                    <span className="text-3xs text-stone-400 mt-0.5 block">
                      Inserisci 0 se è solo anagrafica, oppure la quantità di pezzi che hai già in deposito
                    </span>
                  </div>
                )}

                {/* Soglia Allerta Scorta Magazzino Personalizzata */}
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/90">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-2xs font-bold text-amber-950 flex items-center gap-1.5">
                      <BellRing className="w-3.5 h-3.5 text-amber-600" />
                      Soglia Allerta Rimanenze Magazzino (Pezzi)
                    </label>
                    <span className="text-3xs font-semibold px-2 py-0.5 bg-white text-amber-800 rounded-md border border-amber-200">
                      Allerta quando rimangono ≤ {pWarehouseAlertThreshold} {pUnit || 'pz'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                    <div>
                      <input
                        type="number"
                        min="0"
                        value={pWarehouseAlertThreshold}
                        onChange={(e) => setPWarehouseAlertThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-1.5 text-sm font-bold border border-amber-300 rounded-lg text-stone-900 bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                        placeholder="Es. 8"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[3, 5, 8, 12, 24].map((quickVal) => (
                        <button
                          key={quickVal}
                          type="button"
                          onClick={() => setPWarehouseAlertThreshold(quickVal)}
                          className={`px-2 py-1 text-3xs font-semibold rounded-md transition-colors cursor-pointer ${
                            pWarehouseAlertThreshold === quickVal
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-white text-amber-900 border border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {quickVal} {pUnit || 'pz'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-3xs text-amber-800/80 mt-1.5 leading-snug">
                    Quando la scorta complessiva in deposito scende a questa quantità o meno, l'articolo verrà evidenziato come "Sotto Scorta" con allerta visiva e conteggiato nei promemoria di riordino.
                  </p>
                </div>

                {/* Toggle per registrare anche il lotto fornitore / DDT */}
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasInitialBatch}
                      onChange={(e) => setHasInitialBatch(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-stone-900 block">
                        Registra contestualmente anche il lotto fornitore (Fattura, IVA, Scadenza)
                      </span>
                      <span className="text-3xs text-stone-500">
                        Permette di tracciare la fattura, le confezioni acquistate, il calcolo IVA e la data di scadenza.
                      </span>
                    </div>
                  </label>

                  {/* Campi Dettagliati del Lotto Iniziale */}
                  {hasInitialBatch && (
                    <div className="mt-4 pt-3 border-t border-stone-200 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-3xs font-bold text-stone-700 mb-1">
                            Fattura / DDT N° *
                          </label>
                          <input
                            type="text"
                            value={bInvoiceRef}
                            onChange={(e) => setBInvoiceRef(e.target.value)}
                            placeholder="Es. FT-2026/01"
                            className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg text-stone-900"
                            required={hasInitialBatch}
                          />
                        </div>

                        <div>
                          <label className="block text-3xs font-bold text-stone-700 mb-1">
                            Data Acquisto *
                          </label>
                          <input
                            type="date"
                            value={bDate}
                            onChange={(e) => setBDate(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg text-stone-900 font-mono"
                            required={hasInitialBatch}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-3xs font-bold text-stone-700 mb-1">
                          Fornitore *
                        </label>
                        <input
                          type="text"
                          value={bSupplier}
                          onChange={(e) => setBSupplier(e.target.value)}
                          placeholder="Es. Grossista Bevande, Metro, Coca-Cola HBC..."
                          className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg text-stone-900"
                          required={hasInitialBatch}
                        />
                      </div>

                      {/* Confezioni e Pezzi */}
                      <div className="bg-white p-3 rounded-lg border border-stone-200">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-3xs font-bold text-stone-700">Quantità Acquistata</span>
                          <span className="text-xs font-bold text-blue-700 font-mono">
                            Totale: {calcBatchTotalUnits} {pUnit}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-3xs text-stone-600 mb-0.5">N° Confezioni</label>
                            <input
                              type="number"
                              min="1"
                              value={bPackageCount}
                              onChange={(e) => setBPackageCount(parseInt(e.target.value) || 1)}
                              className="w-full px-2 py-1 text-xs font-bold border border-stone-300 rounded text-center"
                              required={hasInitialBatch}
                            />
                          </div>
                          <div>
                            <label className="block text-3xs text-stone-600 mb-0.5">Pezzi per Confezione</label>
                            <input
                              type="number"
                              min="1"
                              value={bUnitsPerPackage}
                              onChange={(e) => setBUnitsPerPackage(parseInt(e.target.value) || 1)}
                              className="w-full px-2 py-1 text-xs font-bold border border-stone-300 rounded text-center"
                              required={hasInitialBatch}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Prezzo e IVA */}
                      <div className="bg-white p-3 rounded-lg border border-stone-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-3xs font-bold text-stone-700">Prezzo di Acquisto Fornitore</span>
                          <div className="inline-flex rounded border border-stone-300 bg-stone-50 p-0.5 text-3xs">
                            <button
                              type="button"
                              onClick={() => setBPriceType('per_confezione')}
                              className={`px-2 py-0.5 rounded font-semibold ${
                                bPriceType === 'per_confezione' ? 'bg-emerald-600 text-white' : 'text-stone-600'
                              }`}
                            >
                              A Confezione
                            </button>
                            <button
                              type="button"
                              onClick={() => setBPriceType('totale')}
                              className={`px-2 py-0.5 rounded font-semibold ${
                                bPriceType === 'totale' ? 'bg-emerald-600 text-white' : 'text-stone-600'
                              }`}
                            >
                              Totale
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-3xs text-stone-600 mb-0.5">
                              {bPriceType === 'per_confezione' ? 'Prezzo per Conf. (€)' : 'Prezzo Totale Imponibile (€)'}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={bInputPrice}
                              onChange={(e) => setBInputPrice(parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-xs font-black border border-stone-300 rounded text-stone-900"
                              required={hasInitialBatch}
                            />
                          </div>
                          <div>
                            <label className="block text-3xs text-stone-600 mb-0.5">Aliquota IVA</label>
                            <select
                              value={bVatRate}
                              onChange={(e) => setBVatRate(parseFloat(e.target.value))}
                              className="w-full px-2 py-1 text-xs border border-stone-300 rounded text-stone-900 bg-white"
                            >
                              <option value={22}>22%</option>
                              <option value={10}>10%</option>
                              <option value={4}>4%</option>
                              <option value={0}>0%</option>
                            </select>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-2xs">
                          <span className="text-stone-600">Costo Netto Risultante:</span>
                          <span className="font-mono font-bold text-emerald-700">
                            {formatEuro(calcBatchUnitCostNet)} / {pUnit} (con IVA: {formatEuro(calcBatchUnitCostWithVat)})
                          </span>
                        </div>
                      </div>

                      {/* Scadenza */}
                      <div>
                        <label className="block text-3xs font-bold text-stone-700 mb-1">
                          Data di Scadenza Lotto (opzionale)
                        </label>
                        <input
                          type="date"
                          value={bExpiryDate}
                          onChange={(e) => setBExpiryDate(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg text-stone-900 font-mono"
                        />
                        <span className="text-3xs text-stone-400 mt-0.5 block">
                          Se impostata, apparirà automaticamente nella sezione Scadenze e nelle notifiche di allerta.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pulsanti di Azione Modale */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-800 text-xs font-semibold cursor-pointer"
                >
                  Annulla
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center space-x-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salva Prodotto nel Magazzino</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE 2: MODIFICA ANAGRAFICA PRODOTTO */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-stone-600" />
                Modifica Articolo
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-2xs font-bold text-stone-700 mb-1">Nome Prodotto</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-stone-900 text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-stone-700 mb-1">Categoria</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as ProductCategory)}
                    className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg text-stone-900 bg-white text-xs"
                  >
                    <option value="bevande_fredde">🥤 Bevande Fredde</option>
                    <option value="snack_dolci">🍫 Snack Dolci</option>
                    <option value="snack_salati">🍿 Snack Salati</option>
                    <option value="caffe_calde">☕ Caffè & Calde</option>
                    <option value="freschi_healthy">🥪 Freschi & Alimenti</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 mb-1">Unità di Misura</label>
                  <input
                    type="text"
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-stone-900 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-stone-700 mb-1">Prezzo Vendita (€)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.10"
                    value={editPrice}
                    onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-stone-900 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 mb-1">Costo Unitario Netto (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editCost}
                    onChange={(e) => setEditCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-stone-900 font-bold"
                    required
                  />
                </div>
              </div>

              {/* Soglia Allerta Magazzino */}
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/90">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-2xs font-bold text-amber-950 flex items-center gap-1.5">
                    <BellRing className="w-3.5 h-3.5 text-amber-600" />
                    Soglia Minima Allerta Magazzino ({editUnit || 'pz'})
                  </label>
                  <span className="text-3xs font-semibold px-2 py-0.5 bg-white text-amber-800 rounded-md border border-amber-200">
                    Allerta sotto i ≤ {editAlertThreshold} {editUnit || 'pz'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                  <div>
                    <input
                      type="number"
                      min="0"
                      value={editAlertThreshold}
                      onChange={(e) => setEditAlertThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 text-sm font-bold border border-amber-300 rounded-lg text-stone-900 bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[3, 5, 8, 12, 24].map((quickVal) => (
                      <button
                        key={quickVal}
                        type="button"
                        onClick={() => setEditAlertThreshold(quickVal)}
                        className={`px-2 py-1 text-3xs font-semibold rounded-md transition-colors cursor-pointer ${
                          editAlertThreshold === quickVal
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-white text-amber-900 border border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {quickVal} {editUnit || 'pz'}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-3xs text-amber-800/80 mt-1 block">
                  Imposta il numero specifico di pezzi sotto il quale desideri ricevere l'avviso di scorta minima per questo prodotto.
                </span>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-stone-600 mb-1">Descrizione</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-stone-900 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-800 text-xs font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Salva Modifiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE 3: INSERIMENTO NUOVO LOTTO PER PRODOTTO ESISTENTE */}
      {quickLotProduct && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full my-8 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  Carica Nuovo Lotto Fornitore
                </h3>
                <p className="text-2xs text-stone-500">
                  Prodotto: <strong className="text-stone-800">{quickLotProduct.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickLotProduct(null)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuickLot} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-stone-700 mb-1">Fattura / DDT N°</label>
                  <input
                    type="text"
                    value={lotInvoiceRef}
                    onChange={(e) => setLotInvoiceRef(e.target.value)}
                    placeholder="Es. FT-123 o DDT 456"
                    className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg text-stone-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 mb-1">Data Acquisto</label>
                  <input
                    type="date"
                    value={lotDate}
                    onChange={(e) => setLotDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg text-stone-900 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-stone-700 mb-1">Fornitore</label>
                <input
                  type="text"
                  value={lotSupplier}
                  onChange={(e) => setLotSupplier(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg text-stone-900"
                  required
                />
              </div>

              {/* Quantità Confezioni x Pezzi */}
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-stone-800">Quantità Caricata nel Lotto</span>
                  <span className="text-xs font-bold text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Totale: {lotPackageCount * lotUnitsPerPackage} {quickLotProduct.unit}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-3xs font-semibold text-stone-600 mb-1">N° Confezioni</label>
                    <input
                      type="number"
                      min="1"
                      value={lotPackageCount}
                      onChange={(e) => setLotPackageCount(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 text-xs font-bold border border-stone-300 rounded-lg text-stone-900 text-center"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-3xs font-semibold text-stone-600 mb-1">Pezzi per Confezione</label>
                    <input
                      type="number"
                      min="1"
                      value={lotUnitsPerPackage}
                      onChange={(e) => setLotUnitsPerPackage(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 text-xs font-bold border border-stone-300 rounded-lg text-stone-900 text-center"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Prezzo e IVA */}
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950">Prezzo di Acquisto</span>
                  <div className="inline-flex rounded border border-emerald-300 bg-white p-0.5 text-3xs">
                    <button
                      type="button"
                      onClick={() => setLotPriceInputType('per_confezione')}
                      className={`px-2 py-0.5 rounded font-semibold ${
                        lotPriceInputType === 'per_confezione' ? 'bg-emerald-600 text-white' : 'text-stone-600'
                      }`}
                    >
                      A Confezione
                    </button>
                    <button
                      type="button"
                      onClick={() => setLotPriceInputType('totale')}
                      className={`px-2 py-0.5 rounded font-semibold ${
                        lotPriceInputType === 'totale' ? 'bg-emerald-600 text-white' : 'text-stone-600'
                      }`}
                    >
                      Totale
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-3xs font-semibold text-stone-700 mb-1">
                      {lotPriceInputType === 'per_confezione' ? 'Prezzo per Confezione (€)' : 'Prezzo Totale (€)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={lotInputPrice}
                      onChange={(e) => setLotInputPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-xs font-black border border-emerald-300 rounded-lg text-stone-900 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-3xs font-semibold text-stone-700 mb-1">Aliquota IVA</label>
                    <select
                      value={lotVatRate}
                      onChange={(e) => setLotVatRate(parseFloat(e.target.value))}
                      className="w-full px-2 py-1.5 text-xs font-semibold border border-emerald-300 rounded-lg text-stone-900 bg-white"
                    >
                      <option value={22}>22%</option>
                      <option value={10}>10%</option>
                      <option value={4}>4%</option>
                      <option value={0}>0%</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-900">Costo Unitario Netto:</span>
                  <span className="font-mono font-black text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {formatEuro(
                      (lotPriceInputType === 'per_confezione' 
                        ? (lotInputPrice * lotPackageCount) 
                        : lotInputPrice) / Math.max(1, lotPackageCount * lotUnitsPerPackage)
                    )} / pezzo
                  </span>
                </div>
              </div>

              {/* Data di Scadenza */}
              <div>
                <label className="block text-2xs font-bold text-stone-700 mb-1">
                  Data di Scadenza (opzionale)
                </label>
                <input
                  type="date"
                  value={lotExpiryDate}
                  onChange={(e) => setLotExpiryDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg text-stone-900 font-mono"
                />
              </div>

              {/* Azioni */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setQuickLotProduct(null)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-800 text-xs font-semibold"
                >
                  Annulla
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salva Lotto & Aggiungi a Magazzino</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE CONFERMA ELIMINAZIONE SINGOLO PRODOTTO */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-sm w-full p-5 text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-stone-900 text-base">Eliminare questo articolo?</h3>
            <p className="text-xs text-stone-500 mt-1.5">
              Stai per rimuovere <strong>"{productToDelete.name}"</strong> e tutti i suoi lotti registrati dal magazzino. L'azione può essere annullata tramite la barra di notifica in basso.
            </p>
            <div className="mt-5 flex items-center justify-center space-x-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Sì, Elimina Articolo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE CONFERMA SVUOTA TUTTO IL MAGAZZINO */}
      {isClearAllConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-sm w-full p-5 text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-stone-900 text-base">Svuotare tutto il magazzino?</h3>
            <p className="text-xs text-stone-500 mt-1.5">
              Verranno eliminati tutti i <strong>{products.length} articoli</strong> e tutti i relativi lotti fornitore. Il magazzino tornerà completamente pulito a zero.
            </p>
            <div className="mt-5 flex items-center justify-center space-x-2">
              <button
                type="button"
                onClick={() => setIsClearAllConfirmOpen(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAllProducts();
                  setIsClearAllConfirmOpen(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Sì, Svuota Tutto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
