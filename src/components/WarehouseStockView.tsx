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
  BellRing,
  Coffee,
  Scale,
  Undo2,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';
import { useVending } from '../context/VendingContext';
import { InteractiveDatePicker } from './common/InteractiveDatePicker';
import { formatEuro, formatPercent, CATEGORY_META } from '../utils/vendingUtils';
import { Product, ProductCategory, PurchaseBatch } from '../types';
import { ManageDosagePresetsModal } from './coffee/ManageDosagePresetsModal';
import { SmartNumberInput } from './common/SmartNumberInput';
import { ConfirmUnsavedModal } from './common/ConfirmUnsavedModal';
import { WarehouseConfirmModal } from './common/WarehouseConfirmModal';

interface WarehouseStockViewProps {
  onNavigateToPurchases?: () => void;
}

export const WarehouseStockView: React.FC<WarehouseStockViewProps> = ({ onNavigateToPurchases }) => {
  const { 
    products, 
    purchases, 
    machines, 
    dosagePresets,
    updateWarehouseStock, 
    updateBatchUnits, 
    addPurchase,
    addProduct,
    deleteProduct,
    clearAllProducts,
    updateProduct,
    appVersionMode,
    savePreviousStateBackup,
    restoreLastPreConfirmBackup,
    lastPreConfirmBackup
  } = useVending();

  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    type: 'stock' | 'batch' | 'product_delete' | 'product_edit';
    productName: string;
    unit: string;
    oldValue: number;
    newValue: number;
    unitCost?: number;
    batchNumber?: string;
    invoiceRef?: string;
    onConfirmAction: () => void;
  } | null>(null);

  const [warehouseToast, setWarehouseToast] = useState<{
    message: string;
    showUndo: boolean;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'critical' | 'low' | 'good'>('all');
  const [expandedLotti, setExpandedLotti] = useState<Record<string, boolean>>({});
  const [isDosageModalOpen, setIsDosageModalOpen] = useState(false);

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

  // Coffee dosage and packaging fields (Grammatura e porzioni)
  const [pGramsPerDose, setPGramsPerDose] = useState<number>(7.0); // es. 7g caffè espresso, 14g ginseng
  const [pPackageGrams, setPPackageGrams] = useState<number>(1000); // 1000g per 1kg, 500g

  // Initial lot creation inside Add Product modal
  const [hasInitialBatch, setHasInitialBatch] = useState(false);
  const [bSupplier, setBSupplier] = useState('');
  const [bInvoiceRef, setBInvoiceRef] = useState('');
  const [bDate, setBDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [bPackageCount, setBPackageCount] = useState<number | ''>('');
  const [bUnitsPerPackage, setBUnitsPerPackage] = useState<number | ''>('');
  const [bPriceType, setBPriceType] = useState<'per_pezzo' | 'per_confezione' | 'totale'>('per_pezzo');
  const [bIsWithoutVat, setBIsWithoutVat] = useState<boolean>(true);
  const [bInputPrice, setBInputPrice] = useState<number | ''>('');
  const [bVatRate, setBVatRate] = useState<number>(22);
  const [bExpiryDate, setBExpiryDate] = useState('');
  const [bNotes, setBNotes] = useState('');

  // Quick Lot Modal State (for adding a batch to an existing product)
  const [quickLotProduct, setQuickLotProduct] = useState<Product | null>(null);
  const [lotSupplier, setLotSupplier] = useState('');
  const [lotInvoiceRef, setLotInvoiceRef] = useState('');
  const [lotDate, setLotDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [lotPackageCount, setLotPackageCount] = useState<number | ''>('');
  const [lotUnitsPerPackage, setLotUnitsPerPackage] = useState<number | ''>('');
  const [lotPriceInputType, setLotPriceInputType] = useState<'per_pezzo' | 'per_confezione' | 'totale'>('per_pezzo');
  const [lotIsWithoutVat, setLotIsWithoutVat] = useState<boolean>(true);
  const [lotInputPrice, setLotInputPrice] = useState<number | ''>('');
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
  const [editGramsPerDose, setEditGramsPerDose] = useState<number>(7.0);
  const [editPackageGrams, setEditPackageGrams] = useState<number>(1000);

  // Unsaved changes confirmation state
  const [showUnsavedEditConfirm, setShowUnsavedEditConfirm] = useState(false);
  const [showUnsavedAddConfirm, setShowUnsavedAddConfirm] = useState(false);
  const [showUnsavedLotConfirm, setShowUnsavedLotConfirm] = useState(false);

  // Check if edit modal has unsaved changes
  const isEditDirty = useMemo(() => {
    if (!editingProduct) return false;
    return (
      editName.trim() !== (editingProduct.name || '').trim() ||
      editCategory !== editingProduct.category ||
      editUnit.trim() !== (editingProduct.unit || 'pz').trim() ||
      editPrice !== editingProduct.defaultPrice ||
      editCost !== editingProduct.unitCost ||
      editAlertThreshold !== (editingProduct.warehouseAlertThreshold ?? 8) ||
      editDescription.trim() !== (editingProduct.description || '').trim() ||
      (editingProduct.coffeeConfig && editGramsPerDose !== editingProduct.coffeeConfig.gramsPerDose) ||
      (editingProduct.coffeeConfig && editPackageGrams !== editingProduct.coffeeConfig.packageGrams)
    );
  }, [editingProduct, editName, editCategory, editUnit, editPrice, editCost, editAlertThreshold, editDescription, editGramsPerDose, editPackageGrams]);

  // Check if add product modal has unsaved changes
  const isAddDirty = useMemo(() => {
    if (!isAddProductModalOpen) return false;
    return pName.trim() !== '' || pWarehouseStock > 0 || hasInitialBatch;
  }, [isAddProductModalOpen, pName, pWarehouseStock, hasInitialBatch]);

  // Check if quick lot modal has unsaved changes
  const isLotDirty = useMemo(() => {
    if (!quickLotProduct) return false;
    return lotInvoiceRef.trim() !== 'FT-' && lotInvoiceRef.trim() !== '';
  }, [quickLotProduct, lotInvoiceRef]);

  const handleAttemptCloseEdit = () => {
    if (isEditDirty) {
      setShowUnsavedEditConfirm(true);
    } else {
      setEditingProduct(null);
    }
  };

  const handleAttemptCloseAdd = () => {
    if (isAddDirty) {
      setShowUnsavedAddConfirm(true);
    } else {
      setIsAddProductModalOpen(false);
    }
  };

  const handleAttemptCloseLot = () => {
    if (isLotDirty) {
      setShowUnsavedLotConfirm(true);
    } else {
      setQuickLotProduct(null);
    }
  };

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
    return purchases.reduce((acc, b) => acc + (b.remainingUnits * (b.unitCostWithVat || b.unitCostNet)), 0);
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

  const requestStockChange = (product: Product, newStock: number) => {
    const clampedNewStock = Math.max(0, newStock);
    if (product.warehouseStock === clampedNewStock) return;
    setConfirmModalData({
      isOpen: true,
      type: 'stock',
      productName: product.name,
      unit: product.unit,
      oldValue: product.warehouseStock,
      newValue: clampedNewStock,
      unitCost: product.unitCost,
      onConfirmAction: () => {
        savePreviousStateBackup(`Modifica scorta magazzino ${product.name}`);
        updateWarehouseStock(product.id, clampedNewStock);
        setWarehouseToast({
          message: `Giacenza di "${product.name}" aggiornata a ${clampedNewStock} ${product.unit}. Salvata copia di backup precedente.`,
          showUndo: true
        });
        setConfirmModalData(null);
      }
    });
  };

  const requestBatchUnitsChange = (product: Product, batch: PurchaseBatch, newUnits: number) => {
    const clampedNewUnits = Math.max(0, newUnits);
    if (batch.remainingUnits === clampedNewUnits) return;
    setConfirmModalData({
      isOpen: true,
      type: 'batch',
      productName: product.name,
      unit: product.unit,
      oldValue: batch.remainingUnits,
      newValue: clampedNewUnits,
      unitCost: batch.unitCostWithVat,
      batchNumber: batch.batchNumber,
      invoiceRef: batch.invoiceRef,
      onConfirmAction: () => {
        savePreviousStateBackup(`Modifica rimanenza lotto ${batch.batchNumber} (${product.name})`);
        updateBatchUnits(batch.id, clampedNewUnits);
        setWarehouseToast({
          message: `Lotto ${batch.batchNumber} (${product.name}) aggiornato a ${clampedNewUnits} ${product.unit}. Salvata copia di backup precedente.`,
          showUndo: true
        });
        setConfirmModalData(null);
      }
    });
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
    setPGramsPerDose(7.0);
    setPPackageGrams(1000);
    setHasInitialBatch(false);
    setBSupplier('');
    setBInvoiceRef('');
    setBDate(new Date().toISOString().slice(0, 10));
    setBPackageCount('');
    setBUnitsPerPackage('');
    setBPriceType('per_pezzo');
    setBIsWithoutVat(true);
    setBInputPrice('');
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
    setEditGramsPerDose(p.coffeeConfig?.gramsPerDose || 7.0);
    setEditPackageGrams(p.coffeeConfig?.packageGrams || 1000);
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const isCoffeeOrGrams = editCategory === 'caffe_calde' || editUnit.toLowerCase().includes('g') || editUnit.toLowerCase().includes('gramm');
    const coffeeConfig = isCoffeeOrGrams ? {
      gramsPerDose: editGramsPerDose > 0 ? editGramsPerDose : 7.0,
      packageGrams: editPackageGrams > 0 ? editPackageGrams : 1000,
      dosesPerPackage: Math.max(1, Math.floor((editPackageGrams > 0 ? editPackageGrams : 1000) / (editGramsPerDose > 0 ? editGramsPerDose : 7.0))),
      averageCupPrice: editPrice,
    } : editingProduct.coffeeConfig;

    updateProduct({
      ...editingProduct,
      name: editName.trim(),
      category: editCategory,
      unit: editUnit.trim() || 'pz',
      defaultPrice: editPrice,
      unitCost: editCost,
      warehouseAlertThreshold: editAlertThreshold >= 0 ? editAlertThreshold : 8,
      description: editDescription.trim(),
      coffeeConfig,
    });
    setEditingProduct(null);
  };

  // Calculations for Add Product Modal (Initial Batch)
  const calcBatchTotalUnits = (Number(bPackageCount) || 0) * (Number(bUnitsPerPackage) || 0);
  const numBPrice = Number(bInputPrice) || 0;
  let calcBatchTotalTaxable = 0;
  let calcBatchTotalGross = 0;

  if (bPriceType === 'per_pezzo') {
    if (bIsWithoutVat) {
      calcBatchTotalTaxable = numBPrice * calcBatchTotalUnits;
      calcBatchTotalGross = calcBatchTotalTaxable * (1 + (bVatRate || 0) / 100);
    } else {
      calcBatchTotalGross = numBPrice * calcBatchTotalUnits;
      calcBatchTotalTaxable = calcBatchTotalGross / (1 + (bVatRate || 0) / 100);
    }
  } else if (bPriceType === 'per_confezione') {
    if (bIsWithoutVat) {
      calcBatchTotalTaxable = numBPrice * (Number(bPackageCount) || 0);
      calcBatchTotalGross = calcBatchTotalTaxable * (1 + (bVatRate || 0) / 100);
    } else {
      calcBatchTotalGross = numBPrice * (Number(bPackageCount) || 0);
      calcBatchTotalTaxable = calcBatchTotalGross / (1 + (bVatRate || 0) / 100);
    }
  } else {
    // totale
    if (bIsWithoutVat) {
      calcBatchTotalTaxable = numBPrice;
      calcBatchTotalGross = calcBatchTotalTaxable * (1 + (bVatRate || 0) / 100);
    } else {
      calcBatchTotalGross = numBPrice;
      calcBatchTotalTaxable = calcBatchTotalGross / (1 + (bVatRate || 0) / 100);
    }
  }

  const calcBatchTotalVat = Math.max(0, calcBatchTotalGross - calcBatchTotalTaxable);
  // Arrotondamento ai centesimi (es. 0.537 -> 0.54)
  const calcBatchUnitCostNet = calcBatchTotalUnits > 0 ? Math.round((calcBatchTotalTaxable / calcBatchTotalUnits) * 100) / 100 : 0;
  const calcBatchUnitCostWithVat = calcBatchTotalUnits > 0 ? Math.round((calcBatchTotalGross / calcBatchTotalUnits) * 100) / 100 : 0;

  // Dynamic profit preview in Add Modal (utilizzando costo ivato come richiesto per mostrare i prezzi IVA compresa)
  const effectiveCostInAdd = hasInitialBatch ? calcBatchUnitCostWithVat : pUnitCost;
  const effectiveMarginInAdd = pDefaultPrice - effectiveCostInAdd;
  const effectiveMarginPctInAdd = pDefaultPrice > 0 ? (effectiveMarginInAdd / pDefaultPrice) * 100 : 0;

  // Handle Add Product Submit
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) return;

    const initialStock = hasInitialBatch ? calcBatchTotalUnits : pWarehouseStock;
    const isCoffeeOrGrams = pCategory === 'caffe_calde' || pUnit.toLowerCase().includes('g') || pUnit.toLowerCase().includes('gramm');
    const coffeeConfig = isCoffeeOrGrams ? {
      gramsPerDose: pGramsPerDose > 0 ? pGramsPerDose : 7.0,
      packageGrams: pPackageGrams > 0 ? pPackageGrams : 1000,
      dosesPerPackage: Math.max(1, Math.floor((pPackageGrams > 0 ? pPackageGrams : 1000) / (pGramsPerDose > 0 ? pGramsPerDose : 7.0))),
      averageCupPrice: pDefaultPrice,
    } : undefined;

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
        coffeeConfig,
      },
      hasInitialBatch ? {
        supplier: bSupplier.trim() || 'Fornitore Principale',
        packageCount: Number(bPackageCount) || 1,
        unitsPerPackage: Number(bUnitsPerPackage) || 1,
        priceInputType: bPriceType,
        isPriceWithoutVat: bIsWithoutVat,
        inputPrice: Number(bInputPrice) || 0,
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
    setLotSupplier('');
    setLotInvoiceRef('');
    setLotDate(new Date().toISOString().slice(0, 10));
    setLotPriceInputType('per_pezzo');
    setLotIsWithoutVat(true);
    setLotPackageCount('');
    setLotUnitsPerPackage('');
    setLotInputPrice('');
    setLotVatRate(product.category === 'caffe_calde' ? 10 : 22);
    setLotExpiryDate('');
    setLotNotes('');
  };

  const handleSaveQuickLot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickLotProduct) return;

    addPurchase({
      productId: quickLotProduct.id,
      productName: quickLotProduct.name,
      supplier: lotSupplier.trim() || 'Fornitore Generico',
      packageCount: Number(lotPackageCount) || 1,
      unitsPerPackage: Number(lotUnitsPerPackage) || 1,
      priceInputType: lotPriceInputType,
      isPriceWithoutVat: lotIsWithoutVat,
      inputPrice: Number(lotInputPrice) || 0,
      vatRate: lotVatRate,
      invoiceRef: lotInvoiceRef.trim(),
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

            {/* PULSANTE GESTIONE PRESET GRAMMATURE CAFFÈ */}
            <button
              type="button"
              onClick={() => setIsDosageModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl transition-colors border border-amber-200 cursor-pointer"
              title="Personalizza le grammature per tazza, i dosaggi e i formati buste per il caffè e le bevande calde"
            >
              <Scale className="w-3.5 h-3.5 text-amber-700" />
              <span>Preset Grammature Caffè</span>
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
              Valore Scorte Ivato (IVA Inclusa)
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
              {lowStockProductsCount > 0 ? (
                <span className="text-xs text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  {lowStockProductsCount} sotto scorta
                </span>
              ) : (
                <span className="text-xs text-stone-500 font-medium">
                  prodotti totali
                </span>
              )}
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
                <option value="utilities">⚡ Utilities & Varie</option>
              </select>

              {/* Filtro Livello Scorta */}
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value as any)}
                className="px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl text-stone-700 focus:bg-white focus:outline-hidden"
              >
                <option value="all">Tutti i livelli di scorta</option>
                <option value="low">⚠️ Sotto scorta (in allerta)</option>
                <option value="critical">🚨 Esauriti (0 pz)</option>
                <option value="good">✅ Disponibili regolari</option>
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
              const activeUnitCostNet = activeFifoBatch ? activeFifoBatch.unitCostNet : product.unitCost;
              const activeUnitCostWithVat = activeFifoBatch ? activeFifoBatch.unitCostWithVat : (product.unitCost * 1.22);
              const productStockValue = productBatches.reduce((sum, b) => sum + (b.remainingUnits * (b.unitCostWithVat || b.unitCostNet)), 0);

              const profit = product.defaultPrice - activeUnitCostWithVat;
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
                      ? 'border-amber-300 bg-amber-50/15 ring-1 ring-amber-300/50'
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
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-2xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0 shadow-2xs">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Sotto Scorta</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                          <span>Disponibile</span>
                        </span>
                      )}
                    </div>

                    {/* Prezzi & Economia dell'articolo (Tutti IVA compresa) */}
                    <div className="grid grid-cols-3 gap-2 my-3 p-3 bg-stone-50/80 rounded-xl border border-stone-200 text-xs">
                      <div>
                        <span className="text-3xs font-semibold text-stone-500 block">Prezzo Vendita (Ivato)</span>
                        <span className="font-bold text-stone-900 font-mono text-sm">
                          {formatEuro(product.defaultPrice)}
                        </span>
                      </div>
                      <div>
                        <span className="text-3xs font-semibold text-stone-500 block">
                          {(product.unit === 'g' || product.unit === 'grammi') ? 'Costo Ivato / g' : 'Costo Ivato'}
                        </span>
                        <span className="font-bold text-stone-800 font-mono text-sm">
                          {(product.unit === 'g' || product.unit === 'grammi')
                            ? `${activeUnitCostWithVat.toFixed(3)} €/g`
                            : formatEuro(activeUnitCostWithVat)}
                        </span>
                        <span className="text-3xs text-stone-400 block font-mono">
                          netto: {formatEuro(activeUnitCostNet)}
                        </span>
                      </div>
                      <div>
                        <span className="text-3xs font-semibold text-stone-500 block">
                          {(product.unit === 'g' || product.unit === 'grammi') ? 'Utile Ivato / g' : 'Margine Ivato'}
                        </span>
                        <span className="font-bold text-emerald-700 font-mono text-sm">
                          +{formatEuro(profit)} <span className="text-3xs font-normal">({formatPercent(marginPct)})</span>
                        </span>
                      </div>
                    </div>

                    {/* Badge aggiuntivo per caffè / solubili in grammi */}
                    {(product.category === 'caffe_calde' || product.unit === 'g' || product.coffeeConfig) && (
                      <div className="mb-2 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-3xs text-amber-900">
                        <span className="flex items-center gap-1 font-semibold">
                          <Scale className="w-3 h-3 text-amber-700" />
                          Dosaggio: {product.coffeeConfig?.gramsPerDose || 7}g a tazza
                        </span>
                        <span className="font-bold text-amber-950">
                          Resa stock: ~{Math.floor(stock / (product.coffeeConfig?.gramsPerDose || 7))} erogazioni
                        </span>
                      </div>
                    )}

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
                        </div>
                        <div className="flex items-baseline space-x-2 mt-0.5">
                          <span className={`text-3xl font-black font-mono ${
                            isCritical ? 'text-rose-600' : isLow ? 'text-amber-600 font-extrabold' : 'text-stone-900'
                          }`}>
                            {stock.toLocaleString()}
                          </span>
                          <span className="text-xs font-semibold text-stone-500">
                            {product.unit} totali
                            {(product.unit === 'g' || product.unit === 'grammi') && (
                              <span className="text-stone-400 block text-3xs font-normal">
                                (~{(stock / (product.coffeeConfig?.packageGrams || 1000)).toFixed(1)} buste da {product.coffeeConfig?.packageGrams || 1000}g)
                              </span>
                            )}
                          </span>
                        </div>
                        <p className="text-2xs text-stone-500 mt-0.5">
                          Valore scorta: <strong className="text-emerald-700">{formatEuro(productStockValue)}</strong> • Nei distributori: <strong className="text-blue-700">{inMachines.toLocaleString()} {product.unit}</strong>
                        </p>
                      </div>

                      {/* Regolatore rapido scorta complessiva (+/-) */}
                      <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-stone-200 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => {
                            const step = (product.unit === 'g' || product.unit === 'grammi') ? 500 : 1;
                            requestStockChange(product, Math.max(0, stock - step));
                          }}
                          className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-stone-100 hover:bg-stone-200 active:scale-95 flex items-center justify-center text-stone-700 font-bold transition-transform cursor-pointer"
                          title={(product.unit === 'g' || product.unit === 'grammi') ? "Riduci di 500g" : "Riduci totale di 1 pezzo"}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <SmartNumberInput
                          min={0}
                          value={stock}
                          defaultValueIfEmpty={0}
                          onChange={(val) => requestStockChange(product, val)}
                          className={`${(product.unit === 'g' || product.unit === 'grammi') ? 'w-16' : 'w-12'} text-center font-extrabold text-sm text-stone-900 focus:outline-none`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const step = (product.unit === 'g' || product.unit === 'grammi') ? 500 : 1;
                            requestStockChange(product, stock + step);
                          }}
                          className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-stone-100 hover:bg-stone-200 active:scale-95 flex items-center justify-center text-stone-700 font-bold transition-transform cursor-pointer"
                          title={(product.unit === 'g' || product.unit === 'grammi') ? "Aggiungi 500g" : "Aggiungi totale 1 pezzo"}
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
                                          Costo Ivato: <strong className="text-emerald-800 font-bold">{formatEuro(batch.unitCostWithVat)}</strong>
                                          <span className="text-3xs text-stone-400 font-mono ml-1">({formatEuro(batch.unitCostNet)} + {batch.vatRate}% IVA)</span>
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
                                          onClick={() => requestBatchUnitsChange(product, batch, Math.max(0, batch.remainingUnits - 1))}
                                          className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 font-bold cursor-pointer text-xs"
                                          title="Riduci rimanenza lotto"
                                        >
                                          -
                                        </button>
                                        <span className="w-10 text-center font-mono font-bold text-xs text-stone-900">
                                          {batch.remainingUnits}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => requestBatchUnitsChange(product, batch, batch.remainingUnits + 1)}
                                          className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 font-bold cursor-pointer text-xs"
                                          title="Aumenta rimanenza lotto"
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
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <form 
            onSubmit={handleAddProductSubmit}
            className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-xl w-full max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 my-auto"
          >
            {/* Header fisso */}
            <div className="shrink-0 px-4 sm:px-5 py-3 sm:py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <PackagePlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-stone-900">
                    Aggiungi Nuovo Prodotto a Magazzino
                  </h3>
                  <p className="text-3xs text-stone-500">
                    Inserisci tutte le informazioni dell'articolo e registra le scorte iniziali
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAttemptCloseAdd}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
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
                      onChange={(e) => {
                        const newCat = e.target.value as ProductCategory;
                        setPCategory(newCat);
                        if (newCat === 'caffe_calde') {
                          if (pUnit === 'lattine' || pUnit === 'bottiglie') {
                            setPUnit('g');
                          }
                          if (pDefaultPrice === 1.30) {
                            setPDefaultPrice(0.50);
                          }
                          if (pUnitCost === 0.48) {
                            setPUnitCost(0.012); // ~12€ al kg
                          }
                        }
                      }}
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl text-stone-900 bg-white"
                    >
                      <option value="bevande_fredde">🥤 Bevande Fredde</option>
                      <option value="snack_dolci">🍫 Snack Dolci</option>
                      <option value="snack_salati">🍿 Snack Salati</option>
                      <option value="caffe_calde">☕ Caffè & Bevande Calde</option>
                      <option value="freschi_healthy">🥪 Freschi & Alimenti</option>
                      <option value="utilities">⚡ Utilities & Varie</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-stone-700 mb-1">
                      Unità di Misura / Formato *
                    </label>
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={pUnit}
                        onChange={(e) => setPUnit(e.target.value)}
                        placeholder="es. g, kg, busta 1kg, pz, lattine..."
                        className="w-full px-3 py-1.5 text-xs font-semibold border border-stone-300 rounded-xl text-stone-900"
                        required
                      />
                      <div className="flex flex-wrap gap-1">
                        {pCategory === 'caffe_calde' ? (
                          <>
                            {[
                              { label: 'g (grammi)', val: 'g' },
                              { label: 'kg', val: 'kg' },
                              { label: 'busta 1kg (1000g)', val: 'busta 1kg' },
                              { label: 'busta 500g', val: 'busta 500g' },
                              { label: 'stecca 100pz', val: 'stecca 100pz' },
                              { label: 'pz', val: 'pz' },
                            ].map(u => (
                              <button
                                key={u.val}
                                type="button"
                                onClick={() => {
                                  setPUnit(u.val);
                                  if (u.val === 'g') {
                                    setPUnitCost(0.012); // ~12€/kg -> 0.012€/g
                                    setBUnitsPerPackage(1000);
                                  } else if (u.val === 'busta 1kg') {
                                    setPPackageGrams(1000);
                                    setPUnitCost(12.00);
                                  } else if (u.val === 'busta 500g') {
                                    setPPackageGrams(500);
                                    setPUnitCost(6.50);
                                  }
                                }}
                                className={`px-2 py-0.5 rounded-lg text-3xs font-medium border transition-colors ${
                                  pUnit === u.val 
                                    ? 'bg-amber-100 text-amber-900 border-amber-400 font-bold' 
                                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                                }`}
                              >
                                {u.label}
                              </button>
                            ))}
                          </>
                        ) : (
                          ['lattine', 'bottiglie', 'pz', 'buste', 'pacchetti', 'g'].map(unitChoice => (
                            <button
                              key={unitChoice}
                              type="button"
                              onClick={() => setPUnit(unitChoice)}
                              className={`px-1.5 py-0.5 rounded text-3xs font-medium border ${
                                pUnit === unitChoice 
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' 
                                  : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                              }`}
                            >
                              {unitChoice}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Box dedicato per Calcolo Grammi e Resa Tazzine Caffè / Solubili */}
                {(pCategory === 'caffe_calde' || pUnit.toLowerCase().includes('g') || pUnit.toLowerCase().includes('gramm')) && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-amber-700" />
                        Dosaggio & Calcolo Resa Erogazioni
                      </span>
                      <span className="text-3xs bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-semibold">
                        Gestione a Grammi (g)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-3xs font-bold text-amber-950">
                            Grammi per Singola Erogazione / Tazzina (g) *
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsDosageModalOpen(true)}
                            className="text-3xs text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                            title="Personalizza, aggiungi o rimuovi preset"
                          >
                            ⚙️ Gestisci preset
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <SmartNumberInput
                            step="0.5"
                            min={0.5}
                            allowDecimals={true}
                            value={pGramsPerDose}
                            defaultValueIfEmpty={7.0}
                            onChange={(val) => setPGramsPerDose(val)}
                            className="w-24 px-2.5 py-1 text-xs font-bold border border-amber-300 rounded-lg text-amber-950 bg-white text-center"
                          />
                          <span className="text-2xs font-medium text-amber-800">g / tazza</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {dosagePresets.map(preset => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setPGramsPerDose(preset.gramsPerDose);
                                if (preset.packageGrams) setPPackageGrams(preset.packageGrams);
                              }}
                              className={`px-1.5 py-0.5 text-3xs rounded border transition-colors ${
                                pGramsPerDose === preset.gramsPerDose
                                  ? 'bg-amber-600 text-white border-amber-700 font-bold'
                                  : 'bg-white/80 text-amber-900 border-amber-300 hover:bg-amber-100'
                              }`}
                            >
                              {preset.icon || '☕'} {preset.name} ({preset.gramsPerDose}g)
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-3xs font-bold text-amber-950 mb-1">
                          Peso Busta / Confezione di Riferimento (g)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <SmartNumberInput
                            step="50"
                            min={50}
                            value={pPackageGrams}
                            defaultValueIfEmpty={1000}
                            onChange={(val) => setPPackageGrams(val)}
                            className="w-24 px-2.5 py-1 text-xs font-bold border border-amber-300 rounded-lg text-amber-950 bg-white text-center"
                          />
                          <span className="text-2xs font-medium text-amber-800">g / confezione</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {[
                            { label: '1.000g (1 kg)', val: 1000 },
                            { label: '500g', val: 500 },
                            { label: '250g', val: 250 },
                          ].map(pkgPreset => (
                            <button
                              key={pkgPreset.val}
                              type="button"
                              onClick={() => setPPackageGrams(pkgPreset.val)}
                              className={`px-1.5 py-0.5 text-3xs rounded border transition-colors ${
                                pPackageGrams === pkgPreset.val
                                  ? 'bg-amber-600 text-white border-amber-700 font-bold'
                                  : 'bg-white/80 text-amber-900 border-amber-300 hover:bg-amber-100'
                              }`}
                            >
                              {pkgPreset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Resa stimata e Margine a Tazza */}
                    <div className="p-2 bg-amber-100/70 border border-amber-300/80 rounded-lg flex flex-wrap items-center justify-between gap-2 text-2xs">
                      <div>
                        <span className="text-amber-900 font-semibold">Resa stimata per confezione:</span>
                        <span className="ml-1 font-bold text-amber-950">
                          ~{Math.max(1, Math.floor(pPackageGrams / Math.max(0.1, pGramsPerDose)))} tazzine
                        </span>
                        <span className="text-3xs text-amber-700 ml-1">
                          ({pPackageGrams}g ÷ {pGramsPerDose}g)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-stone-600">Costo dose:</span>
                        <span className="font-bold text-stone-900">
                          {pUnit === 'g' || pUnit === 'grammi'
                            ? formatEuro((hasInitialBatch ? calcBatchUnitCostNet : pUnitCost) * pGramsPerDose)
                            : formatEuro((hasInitialBatch ? calcBatchUnitCostNet : pUnitCost) / Math.max(1, Math.floor(pPackageGrams / Math.max(0.1, pGramsPerDose))))}
                        </span>
                        <span className="text-emerald-700 font-bold">
                          | Utile tazza: +{formatEuro(
                            pDefaultPrice - (
                              pUnit === 'g' || pUnit === 'grammi'
                                ? ((hasInitialBatch ? calcBatchUnitCostNet : pUnitCost) * pGramsPerDose)
                                : ((hasInitialBatch ? calcBatchUnitCostNet : pUnitCost) / Math.max(1, Math.floor(pPackageGrams / Math.max(0.1, pGramsPerDose))))
                            )
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-2xs font-semibold text-stone-600 mb-1">
                    Descrizione Breve / Note (opzionale)
                  </label>
                  <input
                    type="text"
                    value={pDescription}
                    onChange={(e) => setPDescription(e.target.value)}
                    placeholder="Es. Miscela Arabica chicchi, busta ginseng solubile..."
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
                      Prezzo al Pubblico (€ IVA compresa) *
                    </label>
                    <SmartNumberInput
                      step="0.05"
                      min={0.10}
                      allowDecimals={true}
                      value={pDefaultPrice}
                      defaultValueIfEmpty={0.10}
                      onChange={(val) => setPDefaultPrice(val)}
                      className="w-full px-3 py-2 text-sm font-bold border border-stone-300 rounded-xl text-stone-900 text-center"
                      required
                    />
                    <span className="text-3xs text-stone-400 mt-0.5 block">Prezzo erogato al distributore (IVA compresa)</span>
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-stone-700 mb-1">
                      Costo Acquisto Unitario (€) *
                    </label>
                    <SmartNumberInput
                      step="0.01"
                      min={0.01}
                      allowDecimals={true}
                      disabled={hasInitialBatch}
                      value={hasInitialBatch ? calcBatchUnitCostWithVat : pUnitCost}
                      defaultValueIfEmpty={0.01}
                      onChange={(val) => setPUnitCost(val)}
                      className={`w-full px-3 py-2 text-sm font-bold border rounded-xl text-stone-900 text-center ${
                        hasInitialBatch ? 'bg-stone-100 border-stone-200 text-stone-500' : 'border-stone-300'
                      }`}
                      required
                    />
                    <span className="text-3xs text-stone-400 mt-0.5 block">
                      {hasInitialBatch ? 'Costo Ivato dal lotto (IVA inclusa)' : 'Costo unitario stimato'}
                    </span>
                  </div>
                </div>

                {/* Simulazione Utile in Tempo Reale */}
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-emerald-950 block">Margine Unitario (IVA compresa):</span>
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
                      {pUnit === 'g' || pUnit === 'grammi' 
                        ? 'Giacenza Iniziale Magazzino (in Grammi)' 
                        : `Giacenza Iniziale Magazzino (${pUnit || 'Pezzi fisici'})`}
                    </label>
                    <SmartNumberInput
                      min={0}
                      value={pWarehouseStock}
                      defaultValueIfEmpty={0}
                      onChange={(val) => setPWarehouseStock(val)}
                      className="w-full px-3 py-2 text-sm font-bold border border-stone-300 rounded-xl text-stone-900 text-center"
                      placeholder={pUnit === 'g' || pUnit === 'grammi' ? 'Es. 1000 per 1kg, 5000 per 5kg...' : '0'}
                    />
                    <span className="text-3xs text-stone-500 mt-0.5 block">
                      {pUnit === 'g' || pUnit === 'grammi' ? (
                        pWarehouseStock > 0 ? (
                          <span className="font-semibold text-amber-900">
                            Equivalente a: ~{(pWarehouseStock / pPackageGrams).toFixed(1)} buste da {pPackageGrams}g | ~{Math.floor(pWarehouseStock / Math.max(0.1, pGramsPerDose))} erogazioni stimate @ {pGramsPerDose}g
                          </span>
                        ) : 'Quantità iniziale in grammi presente a magazzino (es. 1.000g = 1 busta)'
                      ) : (
                        'Inserisci 0 se è solo anagrafica, oppure la quantità che hai già in deposito'
                      )}
                    </span>
                  </div>
                )}

                {/* Soglia Allerta Scorta Magazzino Personalizzata */}
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/90">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-2xs font-bold text-amber-950 flex items-center gap-1.5">
                      <BellRing className="w-3.5 h-3.5 text-amber-600" />
                      Soglia Allerta Rimanenze Magazzino ({pUnit || 'Pezzi'})
                    </label>
                    <span className="text-3xs font-semibold px-2 py-0.5 bg-white text-amber-800 rounded-md border border-amber-200">
                      Allerta quando rimangono ≤ {pWarehouseAlertThreshold.toLocaleString()} {pUnit || 'pz'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                    <div>
                      <SmartNumberInput
                        min={0}
                        value={pWarehouseAlertThreshold}
                        defaultValueIfEmpty={0}
                        onChange={(val) => setPWarehouseAlertThreshold(Math.max(0, val))}
                        className="w-full px-3 py-1.5 text-sm font-bold border border-amber-300 rounded-lg text-stone-900 bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none text-center"
                        placeholder={pUnit === 'g' || pUnit === 'grammi' ? 'Es. 500' : 'Es. 8'}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(pUnit === 'g' || pUnit === 'grammi' 
                        ? [250, 500, 1000, 2000] 
                        : [3, 5, 8, 12, 24]
                      ).map((quickVal) => (
                        <button
                          key={quickVal}
                          type="button"
                          onClick={() => setPWarehouseAlertThreshold(quickVal)}
                          className={`px-2 py-1 text-3xs font-semibold rounded-md transition-colors cursor-pointer ${
                            pWarehouseAlertThreshold === quickVal
                              ? 'bg-amber-600 text-white shadow-xs font-bold'
                              : 'bg-white text-amber-900 border border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {quickVal.toLocaleString()} {pUnit || 'pz'}
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
                            placeholder=""
                            className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg text-stone-900"
                            required={hasInitialBatch}
                          />
                        </div>

                        <div>
                          <InteractiveDatePicker
                            id="batch-date-input"
                            label="Data Acquisto"
                            value={bDate}
                            onChange={(newDate) => setBDate(newDate)}
                            required={hasInitialBatch}
                            showShortcuts={true}
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
                          placeholder=""
                          className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg text-stone-900"
                          required={hasInitialBatch}
                        />
                      </div>

                      {/* Confezioni e Pezzi/Grammi */}
                      <div className="bg-white p-3 rounded-lg border border-stone-200">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-3xs font-bold text-stone-700">Quantità Acquistata</span>
                          <span className="text-xs font-bold text-blue-700 font-mono">
                            Totale: {calcBatchTotalUnits.toLocaleString()} {pUnit}
                            {(pUnit === 'g' || pUnit === 'grammi') && (
                              <span className="text-3xs text-blue-600 ml-1 font-normal">
                                (~{Math.floor(calcBatchTotalUnits / Math.max(0.1, pGramsPerDose))} erogazioni @ {pGramsPerDose}g)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-3xs text-stone-600 mb-0.5">
                              {pUnit === 'g' || pUnit === 'grammi' ? 'N° Buste / Confezioni' : 'N° Confezioni'}
                            </label>
                            <SmartNumberInput
                              min={1}
                              value={bPackageCount}
                              defaultValueIfEmpty=""
                              allowEmpty={true}
                              onChange={(val) => setBPackageCount(val)}
                              className="w-full px-2 py-1 text-xs font-bold border border-stone-300 rounded text-center"
                              required={hasInitialBatch}
                            />
                          </div>
                          <div>
                            <label className="block text-3xs text-stone-600 mb-0.5">
                              {pUnit === 'g' || pUnit === 'grammi' ? 'Grammi (g) per Busta' : 'Pezzi per Confezione'}
                            </label>
                            <SmartNumberInput
                              min={1}
                              value={bUnitsPerPackage}
                              defaultValueIfEmpty=""
                              allowEmpty={true}
                              onChange={(val) => setBUnitsPerPackage(val)}
                              className="w-full px-2 py-1 text-xs font-bold border border-stone-300 rounded text-center"
                              required={hasInitialBatch}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Prezzo e IVA */}
                      <div className="bg-white p-3 rounded-lg border border-stone-200 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <span className="text-3xs font-bold text-stone-700">Prezzo di Acquisto Fornitore</span>
                          <div className="inline-flex rounded border border-stone-300 bg-stone-50 p-0.5 text-3xs">
                            <button
                              type="button"
                              onClick={() => setBPriceType('per_pezzo')}
                              className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                                bPriceType === 'per_pezzo' ? 'bg-emerald-600 text-white font-bold' : 'text-stone-600'
                              }`}
                            >
                              Al Pezzo
                            </button>
                            <button
                              type="button"
                              onClick={() => setBPriceType('per_confezione')}
                              className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                                bPriceType === 'per_confezione' ? 'bg-emerald-600 text-white font-bold' : 'text-stone-600'
                              }`}
                            >
                              A Confezione
                            </button>
                            <button
                              type="button"
                              onClick={() => setBPriceType('totale')}
                              className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                                bPriceType === 'totale' ? 'bg-emerald-600 text-white font-bold' : 'text-stone-600'
                              }`}
                            >
                              Totale
                            </button>
                          </div>
                        </div>

                        {/* Switch Netto (senza IVA) vs Ivato */}
                        <div className="flex items-center justify-between bg-stone-50 px-2 py-1 rounded border border-stone-200 text-3xs">
                          <span className="font-semibold text-stone-600">Base Prezzo:</span>
                          <div className="inline-flex rounded bg-white p-0.5 border border-stone-200">
                            <button
                              type="button"
                              onClick={() => setBIsWithoutVat(true)}
                              className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                                bIsWithoutVat ? 'bg-emerald-700 text-white' : 'text-stone-500 hover:text-stone-800'
                              }`}
                            >
                              Senza IVA (Netto)
                            </button>
                            <button
                              type="button"
                              onClick={() => setBIsWithoutVat(false)}
                              className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                                !bIsWithoutVat ? 'bg-emerald-700 text-white' : 'text-stone-500 hover:text-stone-800'
                              }`}
                            >
                              Con IVA (Ivato)
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-3xs text-stone-600 mb-0.5">
                              {bPriceType === 'per_pezzo'
                                ? `Prezzo al Pezzo (${bIsWithoutVat ? 'senza IVA' : 'con IVA'}) (€)`
                                : bPriceType === 'per_confezione'
                                ? `Prezzo per Conf. (${bIsWithoutVat ? 'senza IVA' : 'con IVA'}) (€)`
                                : `Prezzo Totale (${bIsWithoutVat ? 'senza IVA' : 'con IVA'}) (€)`}
                            </label>
                            <SmartNumberInput
                              step="0.001"
                              min={0.001}
                              allowDecimals={true}
                              value={bInputPrice}
                              defaultValueIfEmpty=""
                              allowEmpty={true}
                              onChange={(val) => setBInputPrice(val)}
                              className="w-full px-2 py-1 text-xs font-black border border-stone-300 rounded text-stone-900 text-center"
                              required={hasInitialBatch}
                            />
                            {bPriceType === 'per_pezzo' ? (
                              <div className="mt-1 space-y-0.5 text-3xs">
                                <span className="font-semibold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-300 block">
                                  Arrotondato ai centesimi: <strong>€{(Math.round((bInputPrice || 0) * 100) / 100).toFixed(2)}</strong> {bIsWithoutVat ? '(senza IVA)' : '(con IVA)'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-3xs text-stone-400 mt-0.5 block">
                                Accetta anche decimali.
                              </span>
                            )}
                          </div>
                          <div>
                            <label className="block text-3xs text-stone-600 mb-0.5">Aliquota IVA</label>
                            <select
                              value={bVatRate}
                              onChange={(e) => setBVatRate(parseFloat(e.target.value))}
                              className="w-full px-2 py-1 text-xs border border-stone-300 rounded text-stone-900 bg-white"
                            >
                              <option value={22}>22% (Bevande, snack)</option>
                              <option value={10}>10% (Caffè)</option>
                              <option value={4}>4% (Beni prima nec.)</option>
                              <option value={0}>0% (Esente)</option>
                            </select>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-2xs bg-emerald-100/90 p-2.5 rounded-lg border border-emerald-300 shadow-2xs">
                          <div>
                            <span className="text-emerald-950 font-extrabold block">Totale Fornitura IVA Compresa:</span>
                            <span className="text-3xs text-emerald-800 font-mono">Imponibile: {formatEuro(calcBatchTotalTaxable)} + IVA: {formatEuro(calcBatchTotalVat)}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-black text-emerald-900 text-sm block">
                              {formatEuro(calcBatchTotalGross)}
                            </span>
                            <span className="text-3xs font-bold text-emerald-800">
                              Costo Ivato per {pUnit}: {formatEuro(calcBatchUnitCostWithVat)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Scadenza */}
                      <div>
                        <InteractiveDatePicker
                          id="batch-expiry-date-input"
                          label="Data di Scadenza Lotto (opzionale)"
                          value={bExpiryDate}
                          onChange={(newDate) => setBExpiryDate(newDate)}
                          required={false}
                          showShortcuts={false}
                        />
                        <span className="text-3xs text-stone-400 mt-0.5 block">
                          Se impostata, apparirà automaticamente nella sezione Scadenze e nelle notifiche di allerta.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Pulsanti di Azione Modale fissi in basso */}
            <div className="shrink-0 px-4 sm:px-6 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleAttemptCloseAdd}
                className="px-4 py-2 text-stone-600 hover:text-stone-800 text-xs font-semibold cursor-pointer"
              >
                Annulla
              </button>

              <button
                type="submit"
                className="px-5 sm:px-6 py-2 sm:py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center space-x-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salva Prodotto nel Magazzino</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODALE 2: MODIFICA ANAGRAFICA PRODOTTO */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <form 
            onSubmit={handleSaveEditProduct}
            className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 my-auto"
          >
            <div className="shrink-0 px-5 py-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-stone-600" />
                Modifica Articolo
              </h3>
              <button
                type="button"
                onClick={handleAttemptCloseEdit}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-3.5 text-xs">
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
                    <option value="utilities">⚡ Utilities & Varie</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 mb-1">Unità di Misura / Formato</label>
                  <input
                    type="text"
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-stone-900 text-xs font-semibold"
                    required
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {editCategory === 'caffe_calde' ? (
                      ['g', 'kg', 'busta 1kg', 'busta 500g', 'pz'].map(u => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setEditUnit(u)}
                          className={`px-1.5 py-0.5 rounded text-3xs font-medium border ${
                            editUnit === u 
                              ? 'bg-amber-100 text-amber-900 border-amber-400 font-bold' 
                              : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {u}
                        </button>
                      ))
                    ) : (
                      ['lattine', 'bottiglie', 'pz', 'buste', 'g'].map(u => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setEditUnit(u)}
                          className={`px-1.5 py-0.5 rounded text-3xs font-medium border ${
                            editUnit === u 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' 
                              : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {u}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Sezione dosaggio caffè per modifica prodotto */}
              {(editCategory === 'caffe_calde' || editUnit.toLowerCase().includes('g') || editUnit.toLowerCase().includes('gramm')) && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-amber-700" />
                      Dosaggio & Grammatura Tazzina
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsDosageModalOpen(true)}
                      className="text-3xs text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                      title="Personalizza, aggiungi o rimuovi preset"
                    >
                      ⚙️ Gestisci preset
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-3xs font-bold text-amber-950 mb-0.5">Grammi / Tazza (g)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={editGramsPerDose}
                        onChange={(e) => setEditGramsPerDose(parseFloat(e.target.value) || 7.0)}
                        className="w-full px-2 py-1 text-xs font-bold border border-amber-300 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-3xs font-bold text-amber-950 mb-0.5">Grammi / Busta (g)</label>
                      <input
                        type="number"
                        step="50"
                        min="50"
                        value={editPackageGrams}
                        onChange={(e) => setEditPackageGrams(parseInt(e.target.value, 10) || 1000)}
                        className="w-full px-2 py-1 text-xs font-bold border border-amber-300 rounded bg-white"
                      />
                    </div>
                  </div>
                  {/* Preset rapidi per modifica */}
                  <div className="flex flex-wrap gap-1">
                    {dosagePresets.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setEditGramsPerDose(preset.gramsPerDose);
                          if (preset.packageGrams) setEditPackageGrams(preset.packageGrams);
                        }}
                        className={`px-1.5 py-0.5 text-3xs rounded border transition-colors ${
                          editGramsPerDose === preset.gramsPerDose
                            ? 'bg-amber-600 text-white border-amber-700 font-bold'
                            : 'bg-white/80 text-amber-900 border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        {preset.icon || '☕'} {preset.name} ({preset.gramsPerDose}g)
                      </button>
                    ))}
                  </div>
                  <div className="text-3xs text-amber-800 flex justify-between">
                    <span>Resa: ~{Math.max(1, Math.floor(editPackageGrams / Math.max(0.1, editGramsPerDose)))} tazzine a busta</span>
                    <span className="font-bold text-emerald-800">
                      Costo dose: {editUnit === 'g' || editUnit === 'grammi' ? formatEuro(editCost * editGramsPerDose) : formatEuro(editCost / Math.max(1, Math.floor(editPackageGrams / Math.max(0.1, editGramsPerDose))))}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-stone-700 mb-1">Prezzo Vendita (€ IVA compresa)</label>
                  <SmartNumberInput
                    step="0.05"
                    min={0.10}
                    allowDecimals={true}
                    value={editPrice}
                    defaultValueIfEmpty={0.10}
                    onChange={(val) => setEditPrice(val)}
                    className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-stone-900 font-bold text-center"
                    required
                  />
                  <span className="text-3xs text-stone-400 mt-0.5 block">Prezzo cliente IVA inclusa</span>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 mb-1">Costo Acquisto Unitario (€)</label>
                  <SmartNumberInput
                    step="0.01"
                    min={0.01}
                    allowDecimals={true}
                    value={editCost}
                    defaultValueIfEmpty={0.01}
                    onChange={(val) => setEditCost(val)}
                    className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-stone-900 font-bold text-center"
                    required
                  />
                  <span className="text-3xs text-stone-400 mt-0.5 block">Costo unitario fornitore</span>
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
                    <SmartNumberInput
                      min={0}
                      value={editAlertThreshold}
                      defaultValueIfEmpty={0}
                      onChange={(val) => setEditAlertThreshold(Math.max(0, val))}
                      className="w-full px-3 py-1.5 text-sm font-bold border border-amber-300 rounded-lg text-stone-900 bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none text-center"
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
                            ? 'bg-amber-600 text-white shadow-xs font-bold'
                            : 'bg-white text-amber-900 border border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        ≤ {quickVal}
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

            </div>

            <div className="shrink-0 px-5 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
              <button
                type="button"
                onClick={handleAttemptCloseEdit}
                className="px-4 py-2 text-stone-600 hover:text-stone-800 text-xs font-semibold cursor-pointer"
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
      )}

      {/* MODALE 3: INSERIMENTO NUOVO LOTTO PER PRODOTTO ESISTENTE */}
      {quickLotProduct && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <form 
            onSubmit={handleSaveQuickLot}
            className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 my-auto"
          >
            {/* Header fisso in alto */}
            <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-stone-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
                  Carica Nuovo Lotto Fornitore
                </h3>
                <p className="text-3xs sm:text-2xs text-stone-500">
                  Prodotto: <strong className="text-stone-800">{quickLotProduct.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={handleAttemptCloseLot}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Corpo scorrevole */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-stone-700 mb-1">Fattura / DDT N°</label>
                  <input
                    type="text"
                    value={lotInvoiceRef}
                    onChange={(e) => setLotInvoiceRef(e.target.value)}
                    placeholder=""
                    className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg text-stone-900"
                    required
                  />
                </div>

                <div>
                  <InteractiveDatePicker
                    id="quick-lot-date-input"
                    label="Data Acquisto"
                    value={lotDate}
                    onChange={(newDate) => setLotDate(newDate)}
                    required
                    showShortcuts={true}
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-stone-700 mb-1">Fornitore</label>
                <input
                  type="text"
                  value={lotSupplier}
                  onChange={(e) => setLotSupplier(e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg text-stone-900"
                  required
                />
              </div>

              {/* Quantità Confezioni x Pezzi */}
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-stone-800">Quantità Caricata nel Lotto</span>
                  <span className="text-xs font-bold text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Totale: {(Number(lotPackageCount) || 0) * (Number(lotUnitsPerPackage) || 0)} {quickLotProduct.unit}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-3xs font-semibold text-stone-600 mb-1">N° Confezioni</label>
                    <SmartNumberInput
                      min={1}
                      value={lotPackageCount}
                      defaultValueIfEmpty=""
                      allowEmpty={true}
                      placeholder=""
                      onChange={(val) => setLotPackageCount(val)}
                      className="w-full px-3 py-1.5 text-xs font-bold border border-stone-300 rounded-lg text-stone-900 text-center"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-3xs font-semibold text-stone-600 mb-1">Pezzi per Confezione</label>
                    <SmartNumberInput
                      min={1}
                      value={lotUnitsPerPackage}
                      defaultValueIfEmpty=""
                      allowEmpty={true}
                      placeholder=""
                      onChange={(val) => setLotUnitsPerPackage(val)}
                      className="w-full px-3 py-1.5 text-xs font-bold border border-stone-300 rounded-lg text-stone-900 text-center"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Prezzo e IVA */}
              <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <span className="text-xs font-bold text-emerald-950">Prezzo di Acquisto Fornitore</span>
                  <div className="inline-flex rounded border border-emerald-300 bg-white p-0.5 text-3xs shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setLotPriceInputType('per_pezzo')}
                      className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                        lotPriceInputType === 'per_pezzo' ? 'bg-emerald-600 text-white font-bold' : 'text-stone-600'
                      }`}
                    >
                      Al Pezzo
                    </button>
                    <button
                      type="button"
                      onClick={() => setLotPriceInputType('per_confezione')}
                      className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                        lotPriceInputType === 'per_confezione' ? 'bg-emerald-600 text-white font-bold' : 'text-stone-600'
                      }`}
                    >
                      A Confezione
                    </button>
                    <button
                      type="button"
                      onClick={() => setLotPriceInputType('totale')}
                      className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                        lotPriceInputType === 'totale' ? 'bg-emerald-600 text-white font-bold' : 'text-stone-600'
                      }`}
                    >
                      Totale
                    </button>
                  </div>
                </div>

                {/* Switch Senza IVA vs Con IVA */}
                <div className="flex items-center justify-between bg-white/90 px-2.5 py-1.5 rounded-lg border border-emerald-200 text-3xs">
                  <span className="font-bold text-stone-700">Base Prezzo:</span>
                  <div className="inline-flex rounded bg-stone-100 p-0.5 border border-stone-200">
                    <button
                      type="button"
                      onClick={() => setLotIsWithoutVat(true)}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                        lotIsWithoutVat ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Senza IVA (Netto)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLotIsWithoutVat(false)}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                        !lotIsWithoutVat ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Con IVA (Ivato)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-3xs font-semibold text-stone-700 mb-1">
                      {lotPriceInputType === 'per_pezzo'
                        ? `Prezzo al Pezzo (${lotIsWithoutVat ? 'senza IVA' : 'con IVA'}) (€)`
                        : lotPriceInputType === 'per_confezione'
                        ? `Prezzo a Conf. (${lotIsWithoutVat ? 'senza IVA' : 'con IVA'}) (€)`
                        : `Prezzo Totale (${lotIsWithoutVat ? 'senza IVA' : 'con IVA'}) (€)`}
                    </label>
                    <SmartNumberInput
                      step="0.001"
                      min={0.001}
                      allowDecimals={true}
                      value={lotInputPrice}
                      defaultValueIfEmpty=""
                      allowEmpty={true}
                      placeholder=""
                      onChange={(val) => setLotInputPrice(val)}
                      className="w-full px-3 py-1.5 text-xs font-black border border-emerald-300 rounded-lg text-stone-900 bg-white text-center"
                      required
                    />
                    {lotPriceInputType === 'per_pezzo' ? (
                      <div className="mt-1 space-y-0.5 text-3xs">
                        <span className="font-semibold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-300 block">
                          Arrotondato ai centesimi: <strong>€{(Math.round((Number(lotInputPrice) || 0) * 100) / 100).toFixed(2)}</strong> {lotIsWithoutVat ? '(senza IVA)' : '(con IVA)'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-3xs text-stone-500 mt-0.5 block">
                        Accetta anche decimali.
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-3xs font-semibold text-stone-700 mb-1">Aliquota IVA</label>
                    <select
                      value={lotVatRate}
                      onChange={(e) => setLotVatRate(parseFloat(e.target.value))}
                      className="w-full px-2 py-1.5 text-xs font-semibold border border-emerald-300 rounded-lg text-stone-900 bg-white"
                    >
                      <option value={22}>22% (Bevande, snack)</option>
                      <option value={10}>10% (Caffè)</option>
                      <option value={4}>4% (Beni prima nec.)</option>
                      <option value={0}>0% (Esente)</option>
                    </select>
                  </div>
                </div>

                {/* Calculation summary */}
                {(() => {
                  const qPackages = Number(lotPackageCount) || 0;
                  const qUnitsPerPkg = Number(lotUnitsPerPackage) || 0;
                  const qTotalUnits = qPackages * qUnitsPerPkg;
                  const qPrice = Number(lotInputPrice) || 0;
                  let qTaxable = 0;
                  let qGross = 0;
                  if (lotPriceInputType === 'per_pezzo') {
                    if (lotIsWithoutVat) {
                      qTaxable = qPrice * qTotalUnits;
                      qGross = qTaxable * (1 + lotVatRate / 100);
                    } else {
                      qGross = qPrice * qTotalUnits;
                      qTaxable = qGross / (1 + lotVatRate / 100);
                    }
                  } else if (lotPriceInputType === 'per_confezione') {
                    if (lotIsWithoutVat) {
                      qTaxable = qPrice * qPackages;
                      qGross = qTaxable * (1 + lotVatRate / 100);
                    } else {
                      qGross = qPrice * qPackages;
                      qTaxable = qGross / (1 + lotVatRate / 100);
                    }
                  } else {
                    if (lotIsWithoutVat) {
                      qTaxable = qPrice;
                      qGross = qTaxable * (1 + lotVatRate / 100);
                    } else {
                      qGross = qPrice;
                      qTaxable = qGross / (1 + lotVatRate / 100);
                    }
                  }
                  const qUnitNet = qTotalUnits > 0 ? Math.round((qTaxable / qTotalUnits) * 100) / 100 : 0;
                  const qUnitGross = qTotalUnits > 0 ? Math.round((qGross / qTotalUnits) * 100) / 100 : 0;

                  return (
                    <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs bg-emerald-100/90 p-2.5 rounded-lg border border-emerald-300 shadow-2xs">
                      <div>
                        <span className="font-extrabold text-emerald-950 block">Totale Fornitura IVA Compresa:</span>
                        <span className="text-3xs text-emerald-800 font-mono">Imponibile: {formatEuro(qTaxable)} + IVA: {formatEuro(qGross - qTaxable)}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-emerald-900 text-base block">
                          {formatEuro(qGross)}
                        </span>
                        <span className="text-3xs font-bold text-emerald-800">
                          Costo Ivato: {formatEuro(qUnitGross)} / {quickLotProduct.unit} (netto: {formatEuro(qUnitNet)})
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Data di Scadenza */}
              <div>
                <InteractiveDatePicker
                  id="quick-lot-expiry-date-input"
                  label="Data di Scadenza (opzionale)"
                  value={lotExpiryDate}
                  onChange={(newDate) => setLotExpiryDate(newDate)}
                  required={false}
                  showShortcuts={false}
                />
              </div>
            </div>

            {/* Azioni fisse in basso */}
            <div className="shrink-0 px-4 sm:px-6 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleAttemptCloseLot}
                className="px-4 py-2 text-stone-600 hover:text-stone-800 text-xs font-semibold cursor-pointer"
              >
                Annulla
              </button>

              <button
                type="submit"
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salva Lotto & Aggiungi a Magazzino</span>
              </button>
            </div>
          </form>
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

      {/* Modale Gestione Preset Grammature & Tazzine Caffè */}
      <ManageDosagePresetsModal
        isOpen={isDosageModalOpen}
        onClose={() => setIsDosageModalOpen(false)}
      />

      {/* Conferma Uscita con Modifiche Non Salvate: Modifica Articolo */}
      <ConfirmUnsavedModal
        isOpen={showUnsavedEditConfirm}
        title="Modifiche Articolo non salvate"
        message="Hai apportato delle modifiche all'anagrafica o ai prezzi di questo articolo. Se esci adesso, le modifiche andranno perse."
        confirmText="Esci e scarta modifiche"
        cancelText="Continua a modificare"
        onConfirmLeave={() => {
          setShowUnsavedEditConfirm(false);
          setEditingProduct(null);
        }}
        onCancelStay={() => setShowUnsavedEditConfirm(false)}
      />

      {/* Conferma Uscita con Dati Inseriti: Aggiungi Articolo */}
      <ConfirmUnsavedModal
        isOpen={showUnsavedAddConfirm}
        title="Nuovo Articolo non salvato"
        message="Hai compilato dei dati per il nuovo prodotto. Se chiudi la finestra senza salvare, i dati inseriti andranno persi."
        confirmText="Esci e scarta modifiche"
        cancelText="Continua a compilare"
        onConfirmLeave={() => {
          setShowUnsavedAddConfirm(false);
          setIsAddProductModalOpen(false);
        }}
        onCancelStay={() => setShowUnsavedAddConfirm(false)}
      />

      {/* Conferma Uscita con Dati Inseriti: Carica Lotto */}
      <ConfirmUnsavedModal
        isOpen={showUnsavedLotConfirm}
        title="Dati del Lotto non salvati"
        message="Hai compilato i dati del lotto fornitore. Se esci adesso, le informazioni inserite andranno perse e il lotto non verrà aggiunto."
        confirmText="Esci e scarta lotto"
        cancelText="Continua a compilare"
        onConfirmLeave={() => {
          setShowUnsavedLotConfirm(false);
          setQuickLotProduct(null);
        }}
        onCancelStay={() => setShowUnsavedLotConfirm(false)}
      />

      {/* Modale di Conferma Modifica Magazzino */}
      {confirmModalData && (
        <WarehouseConfirmModal
          isOpen={confirmModalData.isOpen}
          onClose={() => setConfirmModalData(null)}
          onConfirm={confirmModalData.onConfirmAction}
          type={confirmModalData.type}
          productName={confirmModalData.productName}
          unit={confirmModalData.unit}
          oldValue={confirmModalData.oldValue}
          newValue={confirmModalData.newValue}
          unitCost={confirmModalData.unitCost}
          batchNumber={confirmModalData.batchNumber}
          invoiceRef={confirmModalData.invoiceRef}
        />
      )}

      {/* Banner Notifica Operazione Magazzino con Ripristino Copia Precedente */}
      {warehouseToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-stone-900 border border-stone-700 text-white p-4 rounded-2xl shadow-2xl flex items-start space-x-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-stone-100">{warehouseToast.message}</p>
            {warehouseToast.showUndo && (
              <button
                type="button"
                onClick={() => {
                  const res = restoreLastPreConfirmBackup();
                  if (res.success) {
                    setWarehouseToast({
                      message: '↩ Copia precedente ripristinata con successo!',
                      showUndo: false
                    });
                  } else {
                    alert(res.message);
                  }
                }}
                className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>↩ Annulla & Ripristina Copia Precedente</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setWarehouseToast(null)}
            className="text-stone-400 hover:text-stone-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
