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
  Trash2
} from 'lucide-react';
import { useVending } from '../context/VendingContext';
import { formatEuro, formatPercent, CATEGORY_META } from '../utils/vendingUtils';
import { Product, ProductCategory } from '../types';

export const ProductCatalog: React.FC = () => {
  const { products, purchases, updateProduct, addProduct, deleteProduct } = useVending();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Edit fields
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editCost, setEditCost] = useState<number>(0);
  const [editName, setEditName] = useState<string>('');

  // New product modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ProductCategory>('bevande_fredde');
  const [newCost, setNewCost] = useState(0.40);
  const [newPrice, setNewPrice] = useState(1.20);
  const [newUnit, setNewUnit] = useState('pz');
  const [newDescription, setNewDescription] = useState('');

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

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

    addProduct({
      name: newName.trim(),
      category: newCategory,
      unitCost: newCost,
      defaultPrice: newPrice,
      unit: newUnit,
      description: newDescription,
    });

    setIsAddOpen(false);
    setNewName('');
    setNewDescription('');
    setNewCost(0.40);
    setNewPrice(1.20);
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
            <option value="all">Tutte le Categorie ({products.length})</option>
            <option value="caffe_calde">Caffè & Bevande Calde</option>
            <option value="bevande_fredde">Bevande Fredde</option>
            <option value="snack_dolci">Snack Dolci</option>
            <option value="snack_salati">Snack Salati</option>
            <option value="freschi_healthy">Freschi & Healthy</option>
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
                <th className="py-3 px-4 text-right">Costo Fornitore</th>
                <th className="py-3 px-4 text-right">Prezzo Vendita</th>
                <th className="py-3 px-4 text-right">Margine Unitario</th>
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
                          <span className="font-semibold text-stone-900">{product.name}</span>
                          {activeBatch && (
                            <div className="text-2xs text-emerald-700 font-mono mt-0.5">
                              Lotto attivo: {activeBatch.batchNumber}
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
                      {product.unit}
                    </td>

                    {/* Warehouse stock */}
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold ${
                        warehouseStock > 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-stone-100 text-stone-500'
                      }`}>
                        {warehouseStock} {product.unit}
                      </span>
                    </td>

                    {/* Unit Cost */}
                    <td className="py-3 px-4 text-right">
                      {isEditing ? (
                        <div className="inline-flex items-center">
                          <span className="text-xs text-stone-400 mr-1">€</span>
                          <input
                            type="number"
                            step="0.05"
                            min="0.01"
                            value={editCost}
                            onChange={(e) => setEditCost(parseFloat(e.target.value) || 0)}
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
                          <input
                            type="number"
                            step="0.10"
                            min="0.10"
                            value={editPrice}
                            onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
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
                            onClick={() => {
                              if (window.confirm(`Eliminare definitivamente "${product.name}"?`)) {
                                deleteProduct(product.id);
                              }
                            }}
                            className="p-1.5 rounded-md text-stone-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Elimina articolo"
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
                  onChange={(e) => setNewCategory(e.target.value as ProductCategory)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-stone-900"
                >
                  <option value="caffe_calde">Caffè & Calde</option>
                  <option value="bevande_fredde">Bevande Fredde</option>
                  <option value="snack_dolci">Snack Dolci</option>
                  <option value="snack_salati">Snack Salati</option>
                  <option value="freschi_healthy">Freschi & Healthy</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Costo Acquisto (€)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.01"
                    required
                    value={newCost}
                    onChange={(e) => setNewCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Prezzo Vendita (€)</label>
                  <input
                    type="number"
                    step="0.10"
                    min="0.10"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-stone-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Unità di Misura</label>
                <input
                  type="text"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="pz, lattine, bottiglie, erogazioni..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-stone-900"
                />
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
