import React, { useState } from 'react';
import { useVending } from '../../context/VendingContext';
import { CoffeeDosagePreset } from '../../types';
import { 
  Scale, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  RotateCcw, 
  Sparkles,
  Coffee,
  AlertCircle
} from 'lucide-react';

interface ManageDosagePresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset?: (preset: CoffeeDosagePreset) => void;
}

export const ManageDosagePresetsModal: React.FC<ManageDosagePresetsModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset
}) => {
  const { 
    dosagePresets, 
    addDosagePreset, 
    updateDosagePreset, 
    deleteDosagePreset, 
    resetDosagePresets 
  } = useVending();

  // State per l'aggiunta di un nuovo preset
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGrams, setNewGrams] = useState<number>(7.0);
  const [newPackageGrams, setNewPackageGrams] = useState<number>(1000);
  const [newIcon, setNewIcon] = useState('☕');
  const [newNotes, setNewNotes] = useState('');

  // State per la modifica di un preset esistente
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editGrams, setEditGrams] = useState<number>(7.0);
  const [editPackageGrams, setEditPackageGrams] = useState<number>(1000);
  const [editIcon, setEditIcon] = useState('☕');
  const [editNotes, setEditNotes] = useState('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 2500);
  };

  const handleStartEdit = (preset: CoffeeDosagePreset) => {
    setEditingId(preset.id);
    setEditName(preset.name);
    setEditGrams(preset.gramsPerDose);
    setEditPackageGrams(preset.packageGrams || 1000);
    setEditIcon(preset.icon || '☕');
    setEditNotes(preset.notes || '');
    setIsAddingNew(false);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) {
      showNotification('error', 'Il nome del preset è obbligatorio.');
      return;
    }
    if (editGrams <= 0) {
      showNotification('error', 'I grammi per erogazione devono essere maggiori di 0.');
      return;
    }

    updateDosagePreset({
      id: editingId,
      name: editName.trim(),
      gramsPerDose: editGrams,
      packageGrams: editPackageGrams,
      icon: editIcon,
      notes: editNotes.trim(),
    });

    setEditingId(null);
    showNotification('success', `Preset "${editName.trim()}" aggiornato con successo!`);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showNotification('error', 'Il nome della bevanda / preset è obbligatorio.');
      return;
    }
    if (newGrams <= 0) {
      showNotification('error', 'I grammi per dose devono essere superiori a zero.');
      return;
    }

    const created = addDosagePreset({
      name: newName.trim(),
      gramsPerDose: newGrams,
      packageGrams: newPackageGrams,
      icon: newIcon,
      notes: newNotes.trim(),
      isCustom: true
    });

    setIsAddingNew(false);
    setNewName('');
    setNewGrams(7.0);
    setNewPackageGrams(1000);
    setNewIcon('☕');
    setNewNotes('');

    showNotification('success', `Nuovo preset "${created.name}" aggiunto con successo!`);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Sei sicuro di voler eliminare il preset "${name}"?`)) {
      deleteDosagePreset(id);
      showNotification('success', `Preset "${name}" rimosso.`);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Vuoi ripristinare la lista dei preset di fabbrica (Espresso 7g, Ginseng 14g, The 12g, Cioccolata 20g, ecc.)?')) {
      resetDosagePresets();
      showNotification('success', 'Preset predefiniti ripristinati.');
    }
  };

  const availableIcons = ['☕', '🌿', '🍋', '🍫', '🌾', '🥛', '🥤', '🍵', '🧃', '✨'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-stone-900 border border-stone-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Preset Grammature &amp; Tazzine</h2>
              <p className="text-xs text-stone-400">Modifica dosaggi predefiniti, aggiungi nuove bevande o rimuovine</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifica Flash */}
        {notification && (
          <div className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 ${
            notification.type === 'success' 
              ? 'bg-emerald-950/90 text-emerald-300 border-b border-emerald-800' 
              : 'bg-rose-950/90 text-rose-300 border-b border-rose-800'
          }`}>
            {notification.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-stone-200 text-xs">
          {/* Barra azioni principali: Aggiungi Nuovo & Ripristina */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-800">
            <div className="text-xs text-stone-300 font-semibold">
              Preset configurati: <strong className="text-amber-400 font-bold">{dosagePresets.length}</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 text-2xs font-semibold flex items-center gap-1.5 border border-stone-700 transition-colors cursor-pointer"
                title="Ripristina i preset di dosaggio iniziali"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Ripristina Predefiniti</span>
              </button>

              {!isAddingNew && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(true);
                    setEditingId(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Aggiungi Preset</span>
                </button>
              )}
            </div>
          </div>

          {/* Form Aggiungi Nuovo Preset */}
          {isAddingNew && (
            <form onSubmit={handleSaveNew} className="p-4 rounded-xl bg-stone-950 border border-amber-500/50 space-y-3 animate-in fade-in duration-100">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                  <Plus className="w-4 h-4" />
                  Nuovo Preset Bevanda / Grammatura
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-stone-400 hover:text-white text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-3xs font-semibold text-stone-400 mb-1">Icona</label>
                  <select
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value)}
                    className="w-full text-center text-sm py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-white"
                  >
                    {availableIcons.map(ic => (
                      <option key={ic} value={ic}>{ic}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-3xs font-semibold text-stone-400 mb-1">Nome Bevanda / Miscela *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="es. Decaffeinato, Cappuccino, Tisana..."
                    className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-white text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-3xs font-semibold text-stone-400 mb-1">Grammi / Tazza (g) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={newGrams}
                    onChange={(e) => setNewGrams(parseFloat(e.target.value) || 7)}
                    className="w-full px-2 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-amber-300 font-bold text-xs"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-3xs font-semibold text-stone-400 mb-1">Busta Rif. (g)</label>
                  <input
                    type="number"
                    step="50"
                    min="50"
                    value={newPackageGrams}
                    onChange={(e) => setNewPackageGrams(parseInt(e.target.value, 10) || 1000)}
                    className="w-full px-2 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-white text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-2xs text-stone-400">
                  Resa stimata per busta: <strong className="text-amber-300 font-bold">~{Math.max(1, Math.floor(newPackageGrams / Math.max(0.1, newGrams)))} erogazioni</strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Salva Preset</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Elenco Preset Esistenti */}
          <div className="space-y-2.5">
            {dosagePresets.map((preset) => {
              const isEditing = editingId === preset.id;
              const packageGrams = preset.packageGrams || 1000;
              const estimatedCups = Math.max(1, Math.floor(packageGrams / Math.max(0.1, preset.gramsPerDose)));

              if (isEditing) {
                return (
                  <div key={preset.id} className="p-3.5 rounded-xl bg-stone-950 border border-amber-500 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300 text-xs">Modifica Preset: {preset.name}</span>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-stone-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="block text-3xs text-stone-400 mb-1">Icona</label>
                        <select
                          value={editIcon}
                          onChange={(e) => setEditIcon(e.target.value)}
                          className="w-full text-center text-sm py-1 bg-stone-900 border border-stone-700 rounded-lg text-white"
                        >
                          {availableIcons.map(ic => (
                            <option key={ic} value={ic}>{ic}</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-5">
                        <label className="block text-3xs text-stone-400 mb-1">Nome Bevanda</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1 bg-stone-900 border border-stone-700 rounded-lg text-white text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-3xs text-stone-400 mb-1">Grammi / Tazza (g)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          value={editGrams}
                          onChange={(e) => setEditGrams(parseFloat(e.target.value) || 7)}
                          className="w-full px-2 py-1 bg-stone-900 border border-stone-700 rounded-lg text-amber-300 font-bold text-xs"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-3xs text-stone-400 mb-1">Busta Rif. (g)</label>
                        <input
                          type="number"
                          step="50"
                          value={editPackageGrams}
                          onChange={(e) => setEditPackageGrams(parseInt(e.target.value, 10) || 1000)}
                          className="w-full px-2 py-1 bg-stone-900 border border-stone-700 rounded-lg text-white text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs"
                      >
                        Annulla
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Salva Modifiche</span>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={preset.id}
                  className="p-3 rounded-xl bg-stone-950/70 border border-stone-800 hover:border-stone-700 flex items-center justify-between gap-3 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0 p-1.5 bg-stone-900 rounded-lg border border-stone-800">
                      {preset.icon || '☕'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs truncate">{preset.name}</span>
                        {preset.isCustom && (
                          <span className="px-1.5 py-0.2 rounded text-3xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                            Personalizzato
                          </span>
                        )}
                      </div>
                      <p className="text-2xs text-stone-400 mt-0.5">
                        Dose: <strong className="text-amber-300 font-mono font-bold">{preset.gramsPerDose}g</strong> a tazza
                        {' '}• Confezione: <span className="text-stone-300">{packageGrams}g</span>
                        {' '}• Resa stimata: <span className="text-emerald-400 font-semibold">~{estimatedCups} tazze</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {onSelectPreset && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectPreset(preset);
                          onClose();
                        }}
                        className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-2xs font-semibold transition-colors cursor-pointer"
                        title="Applica questo preset"
                      >
                        Applica
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleStartEdit(preset)}
                      className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="Modifica preset"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(preset.id, preset.name)}
                      className="p-1.5 bg-stone-800 hover:bg-rose-950 text-stone-400 hover:text-rose-300 rounded-lg transition-colors cursor-pointer"
                      title="Elimina preset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-950 flex justify-between items-center">
          <span className="text-3xs text-stone-500">
            Le modifiche ai preset si applicano istantaneamente alle nuove erogazioni e carichi.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            Fatto
          </button>
        </div>
      </div>
    </div>
  );
};
