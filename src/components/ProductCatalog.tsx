import React, { useState, useMemo } from 'react';
import { 
  Store, 
  Search, 
  Plus, 
  Edit3, 
  Check, 
  X, 
  DollarSign, 
  Coffee, 
  Package, 
  Percent,
  Sparkles,
  Layers,
  Trash2,
  Scale
} from 'lucide-react';
import { useVending } from '../context/VendingContext';
import { formatEuro, formatPercent, CATEGORY_META } from '../utils/vendingUtils';
import { Product, ProductCategory } from '../types';
import { SmartNumberInput } from './common/SmartNumberInput';

export const ProductCatalog: React.FC = () => {
  const { products, purchases, updateProduct, addProduct, deleteProduct } = useVending();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Edit fields
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editCost, setEditCost] = useState<number>(0);
  const [editName, setEditName] = useState<string>('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [catalogNotice, setCatalogNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // New product modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ProductCategory>('caffe_calde');
  const [newCost, setNewCost] = useState(0.40);
  const [newPrice, setNewPrice] = useState(1.00);
  const [newUnit, setNewUnit] = useState('g');
  const [newDescription, setNewDescription] = useState('');
  const [newAlertThreshold, setNewAlertThreshold] = useState(500);
  const [newGramsPerDose, setNewGramsPerDose] = useState<number>(7.0);
  const [newPackageGrams, setNewPackageGrams] = useState<number>(1000);

  const activeProducts = useMemo(() => products.filter(p => !p.archived), [products]);

  const filteredProducts = useMemo(() => {
    return activeProducts.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [activeProducts, searchQuery, selectedCategory]);

  const startEdit = (p: Product) => {
    setEditingProductId(p.id);
    setEditPrice(p.defaultPrice);
    setEditCost(p.unitCost);
    setEditName(p.name);
  };

  const cancelEdit = () => {
    setEditingProductId(null);
  };

  const saveEdit = (original: Product) => {
    updateProduct({
      ...original,
      name: editName.trim() || original.name,
      defaultPrice: editPrice,
      unitCost: editCost,
    });
    setEditingProductId(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const isCoffeeOrGrams = newCategory === 'caffe_calde' || 
      newUnit.toLowerCase().includes('g') || 
      newUnit.toLowerCase().includes('gramm');

    const coffeeConfig = isCoffeeOrGrams ? {
      gramsPerDose: newGramsPerDose > 0 ? newGramsPerDose : 7.0,
      packageGrams: newPackageGrams > 0 ? newPackageGrams : 1000,
      dosesPerPackage: Math.max(1, Math.floor((newPackageGrams > 0 ? newPackageGrams : 1000) / (newGramsPerDose > 0 ? newGramsPerDose : 7.0))),
      averageCupPrice: newPrice,
    } : undefined;

    addProduct({
      name: newName.trim(),
      category: newCategory,
      unitCost: newCost,
      defaultPrice: newPrice,
      unit: newUnit.trim() || 'pz',
      description: newDescription.trim(),
      warehouseAlertThreshold: newAlertThreshold,
      coffeeConfig,
    });

    setIsAddOpen(false);
    setNewName('');
    setNewDescription('');
    setNewCost(0.40);
    setNewPrice(1.00);
    setNewUnit(newCategory === 'caffe_calde' ? 'g' : 'pz');
    setNewAlertThreshold(newCategory === 'caffe_calde' ? 500 : 8);
    setNewGramsPerDose(7.0);
    setNewPackageGrams(1000);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cerca prodotti per nome o ingrediente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg text-stone-700 focus:bg-white focus:outline-hidden"
          >
            <option value="all">Tutte le Categorie ({activeProducts.length})</option>
            <option value="caffe_calde">Caffè & Bevande Calde</option>
            <option value="bevande_fredde">Bevande Fredde</option>
            <option value="snack_dolci">Snack Dolci</option>
            <option value="snack_salati">Snack Salati</option>
            <option value="freschi_healthy">Freschi & Healthy</option>
            <option value="utilities">Utilities & Varie</option>
          </select>
        </div>

        <button
          id="btn-add-product"
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-lg transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Nuovo Prodotto</span>
        </button>
      </div>

      {catalogNotice && (
        <div
          className={`px-4 py-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${
            catalogNotice.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}
        >
          <span>{catalogNotice.text}</span>
          <button
            type="button"
            onClick={() => setCatalogNotice(null)}
            className="text-stone-500 hover:text-stone-800 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Products Table Card */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
          <h3 className="font-bold text-stone-900 text-sm">
            Anagrafica Articoli, Prezzi di Vendita & Costi di Fornitura
          </h3>
          <span className="text-2xs text-stone-500">
            I prezzi aggiornati si propagano automaticamente alle macchine
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 font-semibold uppercase text-2xs bg-stone-50/40">
                <th className="py-3 px-4">Prodotto</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4 text-center">Unità</th>
                <th className="py-3 px-4 text-center">Giacenza Magazzino</th>
                <th className="py-3 px-4 text-right">Costo Fornitore (Ivato)</th>
                <th className="py-3 px-4 text-right">Prezzo Vendita (Ivato)</th>
                <th className="py-3 px-4 text-right">Margine Ivato</th>
                <th className="py-3 px-4 text-right">Margine %</th>
                <th className="py-3 px-4 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredProducts.map((product) => {
                const isEditing = editingProductId === product.id;
                const unitProfit = (isEditing ? editPrice : product.defaultPrice) - (isEditing ? editCost : product.unitCost);
                const marginPct = (isEditing ? editPrice : product.defaultPrice) > 0 
                  ? (unitProfit / (isEditing ? editPrice : product.defaultPrice)) * 100 
                  : 0;
                const meta = CATEGORY_META[product.category];
                const activeBatch = purchases.find(p => p.id === product.activeBatchId || (p.productId === product.id && p.remainingUnits > 0));
                const warehouseStock = product.warehouseStock ?? purchases.filter(p => p.productId === product.id).reduce((s, p) => s + p.remainingUnits, 0);

                return (
                  <tr key={product.id} className="hover:bg-stone-50/60 transition-colors">
                    {/* Name */}
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-2 py-1 text-sm font-semibold border border-stone-300 rounded w-full max-w-xs"
                        />
                      ) : (
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-stone-900">{product.name}</span>
                            {(product.category === 'caffe_calde' || product.unit === 'g' || product.coffeeConfig) && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-3xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                                <Coffee className="w-2.5 h-2.5 text-amber-700" />
                                {product.coffeeConfig?.gramsPerDose || 7}g/dose
                              </span>
                            )}
                          </div>
                          {activeBatch && (
                            <div className="text-2xs text-emerald-700 font-mono mt-0.5">
                              Lotto attivo: {activeBatch.batchNumber}
                            </div>
                          )}
                          {(product.category === 'caffe_calde' || product.coffeeConfig) && (
                            <div className="text-3xs text-amber-800 mt-0.5">
                              Resa stimata: ~{Math.floor((product.coffeeConfig?.packageGrams || 1000) / (product.coffeeConfig?.gramsPerDose || 7))} tazzine a confezione ({product.coffeeConfig?.packageGrams || 1000}g)
                            </div>
                          )}
                          {product.description && (
                            <p className="text-2xs text-stone-400 mt-0.5">{product.description}</p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-2xs font-semibold ${meta.bg} ${meta.color} border ${meta.border}`}>
                        {meta.label}
                      </span>
                    </td>

                    {/* Unit */}
                    <td className="py-3 px-4 text-center text-stone-500 font-mono text-2xs">
                      <span className="font-semibold text-stone-700">{product.unit}</span>
                      {(product.unit === 'g' || product.unit === 'grammi') && (
                        <span className="block text-3xs text-amber-700 font-sans">in grammi</span>
                      )}
                    </td>

                    {/* Warehouse stock */}
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex flex-col items-center px-2 py-0.5 rounded text-xs font-mono font-bold ${
                        warehouseStock > 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-stone-100 text-stone-500'
                      }`}>
                        <span>{warehouseStock.toLocaleString()} {product.unit}</span>
                        {(product.unit === 'g' || product.unit === 'grammi') && warehouseStock > 0 && (
                          <span className="text-3xs font-normal text-stone-500 font-sans">
                            ~{(warehouseStock / (product.coffeeConfig?.packageGrams || 1000)).toFixed(1)} buste
                          </span>
                        )}
                      </span>
                    </td>

                    {/* Unit Cost */}
                    <td className="py-3 px-4 text-right">
                      {isEditing ? (
                        <div className="inline-flex items-center">
                          <span className="text-xs text-stone-400 mr-1">€</span>
                          <SmartNumberInput
                            allowDecimals={true}
                            min={0.01}
                            defaultValueIfEmpty={0.01}
                            value={editCost}
                            onChange={(val) => setEditCost(Number(val))}
                            className="w-16 px-1.5 py-1 text-right text-xs font-semibold border border-stone-300 rounded"
                          />
                        </div>
                      ) : (
                        <span className="font-mono text-stone-600 font-medium">
                          {formatEuro(product.unitCost)}
                        </span>
                      )}
                    </td>

                    {/* Sale Price */}
                    <td className="py-3 px-4 text-right">
                      {isEditing ? (
                        <div className="inline-flex items-center">
                          <span className="text-xs text-stone-400 mr-1">€</span>
                          <SmartNumberInput
                            allowDecimals={true}
                            min={0.1}
                            defaultValueIfEmpty={0.1}
                            value={editPrice}
                            onChange={(val) => setEditPrice(Number(val))}
                            className="w-16 px-1.5 py-1 text-right text-xs font-bold text-stone-900 border border-emerald-400 rounded focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      ) : (
                        <span className="font-mono font-bold text-stone-900">
                          {formatEuro(product.defaultPrice)}
                        </span>
                      )}
                    </td>

                    {/* Margin Euro */}
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">
                      +{formatEuro(unitProfit)}
                    </td>

                    {/* Margin % */}
                    <td className="py-3 px-4 text-right font-semibold text-stone-800">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-2xs ${
                        marginPct >= 60 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-stone-100 text-stone-700'
                      }`}>
                        {formatPercent(marginPct)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => saveEdit(product)}
                            className="p-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                            title="Salva modifiche"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 rounded-md bg-stone-200 text-stone-600 hover:bg-stone-300"
                            title="Annulla"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : confirmingDeleteId === product.id ? (
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteId(null)}
                            className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-2xs font-semibold cursor-pointer"
                          >
                            Annulla
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const res = deleteProduct(product.id);
                              setConfirmingDeleteId(null);
                              setCatalogNotice({
                                type: res.success ? 'success' : 'error',
                                text: res.message || (res.success ? 'Articolo archiviato.' : 'Impossibile eliminare.'),
                              });
                            }}
                            className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-2xs font-bold cursor-pointer"
                          >
                            Archivia
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => startEdit(product)}
                            className="p-1.5 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                            title="Modifica prezzo e costi"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmingDeleteId(product.id)}
                            className="p-1.5 rounded-md text-stone-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Archivia articolo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-stone-500">
                    <Package className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-stone-700">Nessun prodotto trovato</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Il catalogo è vuoto. Clicca su "+ Nuovo Prodotto" per iniziare ad inserire i tuoi articoli.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add New Product */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-bold text-base text-stone-900">Nuovo Articolo nel Catalogo</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-stone-400 hover:text-stone-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nome Prodotto</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Es. Coca-Cola 330ml o Baiocchi"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Categoria Merceologica</label>
                <select
                  value={newCategory}
                  onChange={(e) => {
                    const cat = e.target.value as ProductCategory;
                    setNewCategory(cat);
                    if (cat === 'caffe_calde') {
                      setNewUnit('g');
                      setNewAlertThreshold(500);
                      setNewPrice(1.00);
                      setNewCost(0.08);
                    } else if (newUnit === 'g') {
                      setNewUnit('pz');
                      setNewAlertThreshold(8);
                      setNewPrice(1.20);
                      setNewCost(0.40);
                    }
                  }}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-stone-900"
                >
                  <option value="caffe_calde">☕ Caffè & Bevande Calde</option>
                  <option value="bevande_fredde">🥤 Bevande Fredde</option>
                  <option value="snack_dolci">🍫 Snack Dolci</option>
                  <option value="snack_salati">🍿 Snack Salati</option>
                  <option value="freschi_healthy">🥪 Freschi & Healthy</option>
                  <option value="utilities">⚡ Utilities & Varie</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Unità di Misura</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="g, pz, busta, lattine..."
                    className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-stone-900 text-xs font-semibold"
                    required
                  />
                  {(newUnit === 'g' || newUnit === 'grammi') && (
                    <span className="px-2.5 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-amber-700" />
                      In Grammi
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {newCategory === 'caffe_calde' ? (
                    [
                      { label: 'g (grammi)', val: 'g' },
                      { label: 'kg', val: 'kg' },
                      { label: 'busta 1kg (1.000g)', val: 'g' },
                      { label: 'busta 500g', val: 'g' },
                      { label: 'pz / cialda', val: 'pz' }
                    ].map(u => (
                      <button
                        key={u.label}
                        type="button"
                        onClick={() => {
                          setNewUnit(u.val);
                          if (u.label.includes('500g')) setNewPackageGrams(500);
                          if (u.label.includes('1kg') || u.label.includes('1.000g')) setNewPackageGrams(1000);
                        }}
                        className={`px-2 py-0.5 rounded text-3xs font-medium border cursor-pointer ${
                          newUnit === u.val && !u.label.includes('500g')
                            ? 'bg-amber-100 text-amber-900 border-amber-400 font-bold'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {u.label}
                      </button>
                    ))
                  ) : (
                    ['pz', 'lattine', 'bottiglie', 'snack', 'g'].map(u => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setNewUnit(u)}
                        className={`px-2 py-0.5 rounded text-3xs font-medium border cursor-pointer ${
                          newUnit === u
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

              {/* Riquadro Dosaggio & Resa Erogazioni per Caffè/Calde */}
              {(newCategory === 'caffe_calde' || newUnit.toLowerCase().includes('g') || newUnit.toLowerCase().includes('gramm')) && (
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-amber-700" />
                      Dosaggio & Calcolo Resa Erogazioni
                    </span>
                    <span className="text-3xs font-semibold px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-md">
                      Formula a Grammi
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-3xs font-bold text-amber-900 mb-1">
                        Grammi a Tazzina / Erogazione (g) *
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={newGramsPerDose}
                        onChange={(e) => setNewGramsPerDose(parseFloat(e.target.value) || 7.0)}
                        className="w-full px-2.5 py-1.5 text-xs font-bold border border-amber-300 rounded-lg text-stone-900 bg-white"
                        required
                      />
                      <div className="flex flex-wrap gap-1 mt-1">
                        {[
                          { label: '7g espresso', val: 7 },
                          { label: '8g carico', val: 8 },
                          { label: '14g solubile', val: 14 },
                          { label: '20g ciocc.', val: 20 }
                        ].map((d) => (
                          <button
                            key={d.label}
                            type="button"
                            onClick={() => setNewGramsPerDose(d.val)}
                            className={`px-1.5 py-0.5 rounded text-3xs font-medium border ${
                              newGramsPerDose === d.val
                                ? 'bg-amber-600 text-white font-bold border-amber-700'
                                : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100'
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-3xs font-bold text-amber-900 mb-1">
                        Peso Confezione di Riferimento (g)
                      </label>
                      <input
                        type="number"
                        step="50"
                        min="50"
                        value={newPackageGrams}
                        onChange={(e) => setNewPackageGrams(parseInt(e.target.value, 10) || 1000)}
                        className="w-full px-2.5 py-1.5 text-xs font-bold border border-amber-300 rounded-lg text-stone-900 bg-white"
                        required
                      />
                      <div className="flex gap-1 mt-1">
                        {[500, 1000].map((pg) => (
                          <button
                            key={pg}
                            type="button"
                            onClick={() => setNewPackageGrams(pg)}
                            className={`px-1.5 py-0.5 rounded text-3xs font-medium border ${
                              newPackageGrams === pg
                                ? 'bg-amber-600 text-white font-bold border-amber-700'
                                : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100'
                            }`}
                          >
                            {pg}g
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Resa Calcolata */}
                  <div className="p-2.5 bg-white rounded-lg border border-amber-200/90 text-2xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-amber-900 font-semibold">Resa stimata per confezione:</span>
                      <span className="font-mono font-black text-amber-950 text-xs">
                        ~{Math.max(1, Math.floor(newPackageGrams / Math.max(0.1, newGramsPerDose)))} tazzine ({newPackageGrams}g @ {newGramsPerDose}g)
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-3xs pt-1 border-t border-amber-100">
                      <span className="text-stone-600">Costo stimato a tazzina:</span>
                      <span className="font-bold text-stone-900">
                        {formatEuro((newCost <= 0.20 && (newUnit === 'g' || newUnit === 'grammi')) ? newCost * newGramsPerDose : newCost / Math.max(1, Math.floor(newPackageGrams / Math.max(0.1, newGramsPerDose))))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {newUnit === 'g' || newUnit === 'grammi' ? 'Costo Acquisto / g (€ Ivato)' : 'Costo Acquisto (€ Ivato)'}
                  </label>
                  <SmartNumberInput
                    allowDecimals={true}
                    min={0.001}
                    defaultValueIfEmpty={0.01}
                    required
                    value={newCost}
                    onChange={(val) => setNewCost(Number(val))}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-stone-900"
                  />
                  <span className="text-3xs text-stone-400 mt-0.5 block">
                    {newUnit === 'g' || newUnit === 'grammi' ? 'Costo per grammo IVA compresa' : 'Costo unitario pezzo IVA inclusa'}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Prezzo Vendita (€ IVA compresa)</label>
                  <SmartNumberInput
                    allowDecimals={true}
                    min={0.1}
                    defaultValueIfEmpty={0.1}
                    required
                    value={newPrice}
                    onChange={(val) => setNewPrice(Number(val))}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-stone-900 font-bold"
                  />
                  <span className="text-3xs text-stone-400 mt-0.5 block">Prezzo erogato al cliente (IVA compresa)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  Soglia Allerta Scorta Magazzino ({newUnit || 'Pezzi'})
                </label>
                <input
                  type="number"
                  min="0"
                  value={newAlertThreshold}
                  onChange={(e) => setNewAlertThreshold(parseInt(e.target.value) || 0)}
                  placeholder="Es. 500 per grammi, 8 per pezzi"
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg text-stone-900 font-bold bg-amber-50/50"
                />
                <span className="text-2xs text-stone-500 mt-1 block">
                  Mostra allerta in magazzino quando la giacenza è ≤ {newAlertThreshold.toLocaleString()} {newUnit}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Descrizione / Note</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Descrizione opzionale ingrediente o formato"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-stone-900"
                />
              </div>

              <div className="pt-4 border-t border-stone-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-800 text-sm font-medium"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-semibold shadow-xs"
                >
                  Salva nel Catalogo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
