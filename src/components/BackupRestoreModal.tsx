import React, { useState, useRef } from 'react';
import { useVending, validateBackupPayload } from '../context/VendingContext';
import { 
  Upload, 
  Database, 
  FileJson, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  History, 
  Clock, 
  RotateCcw,
  Check,
  AlertCircle,
  Save,
  Download,
  Trash2,
  Zap,
  Tag,
  ShieldCheck
} from 'lucide-react';
import { SaveCheckpoint } from '../types';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'save' | 'restore';
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({ 
  isOpen, 
  onClose,
  initialTab = 'save'
}) => {
  const { 
    machines,
    products,
    purchases,
    restockHistory,
    exportBackupJSON,
    importBackupJSON, 
    getLastLocalBackupInfo, 
    restoreLastLocalBackup, 
    saveAllDataNow,
    lastSavedAt,
    lastAutoRestockSavedAt,
    checkpoints,
    restoreCheckpoint,
    deleteCheckpoint,
    canUndo, 
    undoLastAction,
    lastActionName 
  } = useVending();

  const [activeTab, setActiveTab] = useState<'save' | 'restore'>(initialTab);
  const [saveNote, setSaveNote] = useState('');
  const [confirmRestoreCheckpointId, setConfirmRestoreCheckpointId] = useState<string | null>(null);
  const [confirmRestoreFile, setConfirmRestoreFile] = useState(false);
  const [confirmRestoreLocal, setConfirmRestoreLocal] = useState(false);

  // Sincronizza il tab attivo quando il modal viene aperto con initialTab specifico
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setConfirmRestoreFile(false);
      setConfirmRestoreLocal(false);
    }
  }, [isOpen, initialTab]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    exportDate?: string;
    machinesCount: number;
    productsCount: number;
    purchasesCount: number;
    historyCount: number;
    storeName?: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  const localBackupInfo = getLastLocalBackupInfo();

  const handleManualSave = () => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = saveAllDataNow(saveNote.trim() ? saveNote.trim() : undefined);
      setIsProcessing(false);
      if (res.success) {
        setSuccessMsg(res.message);
        setSaveNote('');
        setTimeout(() => {
          setSuccessMsg(null);
        }, 3500);
      } else {
        setErrorMsg(res.message);
      }
    } catch (e: any) {
      setIsProcessing(false);
      setErrorMsg(e?.message || 'Errore durante il salvataggio dei dati');
    }
  };

  const handleExecuteRestoreCheckpoint = (checkpointId: string) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setTimeout(() => {
      const res = restoreCheckpoint(checkpointId);
      setIsProcessing(false);
      setConfirmRestoreCheckpointId(null);
      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setErrorMsg(res.message);
      }
    }, 150);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setConfirmRestoreFile(false);
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const data = parsed?.backupData || parsed;

        const validation = validateBackupPayload(data);
        if (!validation.valid) {
          setErrorMsg(validation.error || 'Il file selezionato non contiene una struttura di backup valida.');
          setFileContent(null);
          setPreviewData(null);
          return;
        }

        setFileContent(text);
        setPreviewData({
          exportDate: data.exportDate,
          machinesCount: data.machines.length,
          productsCount: data.products.length,
          purchasesCount: data.purchases.length,
          historyCount: data.restockHistory.length,
          storeName: data.storeName || 'M&S Negozio H24'
        });
      } catch (err: any) {
        setErrorMsg('Impossibile leggere il file JSON: ' + (err?.message || 'formato non valido'));
        setFileContent(null);
        setPreviewData(null);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Errore durante la lettura del file dal disco.');
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = () => {
    if (!fileContent) return;
    setIsProcessing(true);
    setErrorMsg(null);

    setTimeout(() => {
      const res = importBackupJSON(fileContent);
      setIsProcessing(false);
      setConfirmRestoreFile(false);
      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setErrorMsg(res.message);
      }
    }, 150);
  };

  const handleRestoreLocal = () => {
    setIsProcessing(true);
    setErrorMsg(null);
    setTimeout(() => {
      const res = restoreLastLocalBackup();
      setIsProcessing(false);
      setConfirmRestoreLocal(false);
      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setErrorMsg(res.message);
      }
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-stone-900 border border-stone-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Centro Salvataggio &amp; Punti di Ripristino</h2>
              <p className="text-2xs sm:text-xs text-stone-400">Salva tutti i valori quando vuoi o ripristina qualsiasi punto salvato</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 sm:px-6 pt-3 pb-0 border-b border-stone-800 bg-stone-950/60 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('save')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'save'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Salva Dati &amp; Checkpoint ({checkpoints.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('restore')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'restore'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Carica File (.JSON) &amp; Locale</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-stone-200 text-xs">
          {/* Success Banner */}
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-600/60 text-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-300 text-xs sm:text-sm">Operazione Completata!</p>
                <p className="text-2xs text-emerald-200/90 mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700/60 text-rose-200 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-300">Attenzione</p>
                <p className="text-xs text-rose-200/90 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* TAB 1: SALVATAGGIO MANUALE E CRONOLOGIA CHECKPOINTS */}
          {activeTab === 'save' && (
            <div className="space-y-5">
              {/* Card 1: Salva Tutto Adesso */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-stone-950 via-stone-900 to-emerald-950/40 border border-emerald-500/40 shadow-xl space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-2xs uppercase tracking-wider border border-emerald-500/30">
                      <Save className="w-3 h-3" />
                      Salvataggio Immediato
                    </span>
                    <h3 className="text-sm sm:text-base font-extrabold text-white mt-1">
                      Salva Tutti i Dati &amp; Valori Quando Vuoi
                    </h3>
                    <p className="text-2xs text-stone-400 mt-0.5 leading-relaxed">
                      Crea un punto di salvataggio istantaneo con tutti i distributori, scorte magazzino, lotti FIFO, prezzi di vendita e incassi.
                    </p>
                  </div>

                  <div className="hidden sm:block text-right shrink-0">
                    <span className="text-3xs text-stone-400 block">Stato Protezione:</span>
                    <span className="text-2xs font-bold text-emerald-400 flex items-center gap-1 justify-end">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Dati al Sicuro
                    </span>
                  </div>
                </div>

                {/* Info strip su ultimi salvataggi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs bg-stone-950/80 p-3 rounded-xl border border-stone-800">
                  <div>
                    <span className="text-stone-400 block text-3xs">Ultimo Salvataggio Generale:</span>
                    <span className="font-semibold text-stone-200">
                      {lastSavedAt ? new Date(lastSavedAt).toLocaleString('it-IT') : 'Recente'}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-3xs">Ultimo Auto-Salvataggio Carica Rapida:</span>
                    <span className="font-semibold text-emerald-300">
                      {lastAutoRestockSavedAt ? new Date(lastAutoRestockSavedAt).toLocaleString('it-IT') : 'In attesa di prima carica'}
                    </span>
                  </div>
                </div>

                {/* Campo nota opzionale */}
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-stone-300 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-amber-400" />
                    Etichetta / Nota Salvataggio (opzionale):
                  </label>
                  <input
                    type="text"
                    value={saveNote}
                    onChange={(e) => setSaveNote(e.target.value)}
                    placeholder="Es. Fine giornata, Controllo cassa, Prima di aggiornare spirali..."
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                {/* Pulsante Azione Gigante Salva Tutto */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleManualSave}
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isProcessing ? 'Salvataggio in corso...' : 'SALVA TUTTI I DATI E VALORI ADESSO'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={exportBackupJSON}
                    className="w-full sm:w-auto py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 border border-stone-700 transition-colors cursor-pointer"
                    title="Scarica anche il file .JSON sul tuo computer o smartphone"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Scarica File .JSON</span>
                  </button>
                </div>
              </div>

              {/* Sezione Cronologia Salvataggi (Checkpoints) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-400" />
                      Punti di Salvataggio Recenti ({checkpoints.length}/15)
                    </h4>
                    <p className="text-3xs text-stone-400">
                      Include sia i tuoi salvataggi manuali che gli auto-salvataggi automatici ad ogni Carica Rapida.
                    </p>
                  </div>
                </div>

                {checkpoints.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-stone-950/60 border border-stone-800 text-stone-500 space-y-1">
                    <Database className="w-6 h-6 mx-auto text-stone-600 mb-1" />
                    <p className="text-xs font-semibold">Nessun punto di salvataggio ancora registrato.</p>
                    <p className="text-2xs">Premi il pulsante &quot;Salva Tutti i Dati Adesso&quot; o conferma una Carica Rapida.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {checkpoints.map((cp) => {
                      const isAutoRestock = cp.type === 'auto_restock';
                      const isConfirming = confirmRestoreCheckpointId === cp.id;

                      return (
                        <div
                          key={cp.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isAutoRestock 
                              ? 'bg-stone-950/80 border-emerald-900/40 hover:border-emerald-600/50' 
                              : 'bg-stone-950/80 border-stone-800 hover:border-amber-500/40'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {cp.type === 'pre_confirm_backup' ? (
                                  <span className="px-1.5 py-0.5 rounded text-3xs font-black bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3 text-blue-400" />
                                    Copia Pre-Conferma
                                  </span>
                                ) : isAutoRestock ? (
                                  <span className="px-1.5 py-0.5 rounded text-3xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                    <Zap className="w-3 h-3 text-emerald-400" />
                                    Auto-Carica Rapida
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-3xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                    <Save className="w-3 h-3 text-amber-400" />
                                    Manuale
                                  </span>
                                )}
                                <span className="font-bold text-xs text-white truncate max-w-xs">
                                  {cp.label}
                                </span>
                              </div>

                              <div className="text-3xs text-stone-400 flex items-center gap-2">
                                <span className="font-mono text-stone-300">
                                  {new Date(cp.timestamp).toLocaleString('it-IT')}
                                </span>
                                <span>•</span>
                                <span>{cp.details?.machinesCount ?? machines.length} distributori</span>
                                <span>•</span>
                                <span>{cp.details?.productsCount ?? products.length} articoli</span>
                                <span>•</span>
                                <span>{cp.details?.purchasesCount ?? purchases.length} lotti</span>
                              </div>
                            </div>

                            {/* Azioni Checkpoint */}
                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              {isConfirming ? (
                                <div className="flex items-center gap-1.5 bg-rose-950/80 p-1 rounded-lg border border-rose-600">
                                  <span className="text-3xs text-rose-300 font-bold px-1">Confermi?</span>
                                  <button
                                    type="button"
                                    onClick={() => handleExecuteRestoreCheckpoint(cp.id)}
                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-3xs cursor-pointer"
                                  >
                                    Sì, Ripristina
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmRestoreCheckpointId(null)}
                                    className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-3xs cursor-pointer"
                                  >
                                    Annulla
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmRestoreCheckpointId(cp.id)}
                                    className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-emerald-950/70 text-emerald-300 hover:text-emerald-200 border border-stone-700 hover:border-emerald-600 font-bold text-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                                    title="Ripristina i dati a questo punto esatto"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Ripristina</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => deleteCheckpoint(cp.id)}
                                    className="p-1.5 rounded-lg text-stone-500 hover:text-rose-400 hover:bg-stone-800 transition-colors cursor-pointer"
                                    title="Elimina questo checkpoint"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CARICA FILE JSON & MEMORIA LOCALE */}
          {activeTab === 'restore' && (
            <div className="space-y-4">
              {/* Opzione 1: File dal computer/telefono */}
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-200 flex items-center gap-1.5 text-xs">
                    <FileJson className="w-4 h-4 text-amber-400" />
                    Opzione 1: Carica il file scaricato (.JSON)
                  </span>
                  <span className="text-3xs text-stone-500 font-mono">Cartella Download</span>
                </div>

                <p className="text-2xs text-stone-400 leading-relaxed">
                  Se hai scaricato il backup in precedenza, cerca il file 
                  <strong className="text-amber-300 font-mono"> backup_ms_take_a_managment_*.json</strong> nella cartella <strong>Download</strong> del tuo dispositivo.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!selectedFile ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 border-2 border-dashed border-stone-700 hover:border-amber-500/80 rounded-xl bg-stone-900/60 hover:bg-stone-900 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
                  >
                    <Upload className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-amber-300 text-xs">Clicca qui per selezionare il file .JSON</span>
                    <span className="text-3xs text-stone-500">oppure trascina il file direttamente qui</span>
                  </button>
                ) : (
                  <div className="p-3 bg-stone-900 rounded-lg border border-stone-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileJson className="w-5 h-5 text-emerald-400" />
                        <div>
                          <p className="font-bold text-white text-xs truncate max-w-xs">{selectedFile.name}</p>
                          <p className="text-3xs text-stone-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setFileContent(null);
                          setPreviewData(null);
                          setConfirmRestoreFile(false);
                          setErrorMsg(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-stone-400 hover:text-stone-200 text-xs underline cursor-pointer"
                      >
                        Cambia file
                      </button>
                    </div>

                    {/* Dettagli anteprima */}
                    {previewData && (
                      <div className="p-3 bg-stone-950/80 rounded-lg border border-stone-800 text-2xs space-y-1.5">
                        <div className="flex justify-between text-stone-400">
                          <span>Data di Creazione Backup:</span>
                          <span className="text-amber-300 font-semibold">
                            {previewData.exportDate ? new Date(previewData.exportDate).toLocaleString('it-IT') : 'Non specificata'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-800/80">
                          <span className="text-stone-400">Distributori: <strong className="text-white">{previewData.machinesCount}</strong></span>
                          <span className="text-stone-400">Catalogo Articoli: <strong className="text-white">{previewData.productsCount}</strong></span>
                          <span className="text-stone-400">Lotti d&apos;acquisto: <strong className="text-white">{previewData.purchasesCount}</strong></span>
                          <span className="text-stone-400">Storico Ricariche: <strong className="text-white">{previewData.historyCount}</strong></span>
                        </div>
                      </div>
                    )}

                    {confirmRestoreFile && previewData ? (
                      <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-600 space-y-2">
                        <div className="flex items-start gap-2 text-rose-200 text-2xs">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-rose-300">Confermi il ripristino del backup da file?</p>
                            <p className="mt-0.5">
                              Data backup: <strong className="text-white">{previewData.exportDate ? new Date(previewData.exportDate).toLocaleString('it-IT') : 'Non specificata'}</strong> •{' '}
                              <strong className="text-white">{previewData.machinesCount}</strong> distributori •{' '}
                              <strong className="text-white">{previewData.productsCount}</strong> prodotti •{' '}
                              <strong className="text-white">{previewData.purchasesCount}</strong> lotti.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => setConfirmRestoreFile(false)}
                            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-2xs font-semibold cursor-pointer"
                          >
                            Annulla
                          </button>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={handleConfirmRestore}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-2xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isProcessing ? 'Ripristino in corso...' : 'Sì, Conferma Ripristino'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!fileContent || !previewData || isProcessing}
                        onClick={() => setConfirmRestoreFile(true)}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>Ripristina Questo Backup</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Opzione 2: Ultimo backup locale del browser */}
              {localBackupInfo && (
                <div className="p-4 rounded-xl bg-stone-950 border border-amber-900/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                      <Clock className="w-4 h-4 text-amber-400" />
                      Opzione 2: Ultimo salvataggio rilevato in questo browser
                    </span>
                    <span className="text-3xs px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
                      Memoria Locale
                    </span>
                  </div>

                  <p className="text-2xs text-stone-400">
                    Data salvataggio: <strong className="text-stone-200">{(localBackupInfo.exportDate || localBackupInfo.timestamp) ? new Date(localBackupInfo.exportDate || localBackupInfo.timestamp).toLocaleString('it-IT') : 'Non specificata'}</strong>
                    {' '}• {localBackupInfo.machinesCount} distributori • {localBackupInfo.productsCount} prodotti • {localBackupInfo.purchasesCount} lotti.
                  </p>

                  {confirmRestoreLocal ? (
                    <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-600 space-y-2">
                      <div className="flex items-start gap-2 text-rose-200 text-2xs">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-rose-300">Confermi il ripristino dalla memoria locale?</p>
                          <p className="mt-0.5">
                            Data backup: <strong className="text-white">{(localBackupInfo.exportDate || localBackupInfo.timestamp) ? new Date(localBackupInfo.exportDate || localBackupInfo.timestamp).toLocaleString('it-IT') : 'Non specificata'}</strong> •{' '}
                            <strong className="text-white">{localBackupInfo.machinesCount}</strong> distributori •{' '}
                            <strong className="text-white">{localBackupInfo.productsCount}</strong> prodotti •{' '}
                            <strong className="text-white">{localBackupInfo.purchasesCount}</strong> lotti.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => setConfirmRestoreLocal(false)}
                          className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-2xs font-semibold cursor-pointer"
                        >
                          Annulla
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={handleRestoreLocal}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-2xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{isProcessing ? 'Ripristino in corso...' : 'Sì, Conferma Ripristino'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setConfirmRestoreLocal(true)}
                      className="w-full py-2 px-3 bg-stone-800 hover:bg-stone-700 text-amber-200 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ripristina da Memoria Locale Browser</span>
                    </button>
                  )}
                </div>
              )}

              {/* Opzione 3: Undo ultima azione */}
              {canUndo && (
                <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-stone-400 text-2xs">
                    <History className="w-3.5 h-3.5 text-stone-500" />
                    <span>Hai appena fatto una modifica per sbaglio?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      undoLastAction();
                      onClose();
                    }}
                    className="px-2.5 py-1 text-2xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-md border border-stone-700 transition-colors cursor-pointer"
                  >
                    Annulla: {lastActionName ? `"${lastActionName.slice(0, 20)}..."` : 'Ultima operazione'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-stone-800 bg-stone-950 flex justify-between items-center shrink-0">
          <span className="text-3xs text-stone-500">
            M&amp;S Take a Managment H24 • Salvataggio persistente attivo
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
