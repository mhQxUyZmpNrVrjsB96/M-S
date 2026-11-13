import React, { useState } from 'react';
import { 
  Cloud, 
  CloudCheck, 
  CloudAlert, 
  RefreshCw, 
  X, 
  Database, 
  Key, 
  Link as LinkIcon, 
  Check, 
  AlertCircle, 
  ExternalLink,
  Laptop,
  Smartphone,
  Tablet
} from 'lucide-react';
import { useVending } from '../../context/VendingContext';
import { getActiveSupabaseUrl } from '../../lib/supabase';
import { PUBLIC_SUPABASE_CONFIG } from '../../config/supabaseConfig';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({ isOpen, onClose }) => {
  const {
    supabaseStatus,
    lastCloudSync,
    isCloudSyncing,
    cloudSyncError,
    forceCloudSync,
    loadFromSupabaseCloud,
    saveSupabaseCredentials,
    supabaseProjectUrl,
    machines,
    products,
    purchases,
    restockHistory
  } = useVending();

  const [inputUrl, setInputUrl] = useState(() => getActiveSupabaseUrl() || supabaseProjectUrl || PUBLIC_SUPABASE_CONFIG.url || '');
  const [inputAnonKey, setInputAnonKey] = useState(() => {
    try {
      return localStorage.getItem('supabase_custom_anon_key') || 
             ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || 
             PUBLIC_SUPABASE_CONFIG.anonKey || '';
    } catch {
      return PUBLIC_SUPABASE_CONFIG.anonKey || '';
    }
  });

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingCreds, setIsSavingCreds] = useState(false);

  if (!isOpen) return null;

  const handleManualSync = async () => {
    setFeedbackMsg(null);
    const res = await forceCloudSync();
    if (res.success) {
      setFeedbackMsg({ type: 'success', text: res.message });
    } else {
      setFeedbackMsg({ type: 'error', text: res.message });
    }
  };

  const handleManualPull = async () => {
    setFeedbackMsg(null);
    const ok = await loadFromSupabaseCloud();
    if (ok) {
      setFeedbackMsg({ type: 'success', text: 'Dati scaricati e aggiornati dal cloud Supabase!' });
    } else {
      setFeedbackMsg({ type: 'error', text: cloudSyncError || 'Impossibile scaricare i dati da Supabase.' });
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCreds(true);
    setFeedbackMsg(null);
    try {
      const res = await saveSupabaseCredentials(inputUrl.trim(), inputAnonKey.trim());
      setFeedbackMsg({
        type: res.success ? 'success' : 'error',
        text: res.message
      });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Errore salvataggio credenziali' });
    } finally {
      setIsSavingCreds(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl text-stone-100 space-y-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center space-x-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs ${
              supabaseStatus === 'connected' 
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : supabaseStatus === 'connecting'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                : supabaseStatus === 'error'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}>
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Sincronizzazione Cloud Supabase
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                  supabaseStatus === 'connected'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : supabaseStatus === 'connecting'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                    : supabaseStatus === 'error'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-stone-800 text-stone-400 border border-stone-700'
                }`}>
                  {supabaseStatus === 'connected' ? 'Attivo & Connesso' : supabaseStatus === 'connecting' ? 'Connessione...' : supabaseStatus === 'error' ? 'Errore' : 'In attesa credenziali'}
                </span>
              </h3>
              <p className="text-2xs text-stone-400">Database PostgreSQL centralizzato e Realtime multidispositivo</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback messaggi */}
        {feedbackMsg && (
          <div className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
            feedbackMsg.type === 'success' 
              ? 'bg-emerald-950/70 border-emerald-600/70 text-emerald-200' 
              : 'bg-rose-950/70 border-rose-600/70 text-rose-200'
          }`}>
            {feedbackMsg.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span className="flex-1">{feedbackMsg.text}</span>
          </div>
        )}

        {cloudSyncError && !feedbackMsg && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Stato connessione Supabase:</span>
              <span>{cloudSyncError}</span>
            </div>
          </div>
        )}

        {/* Info Multidispositivo */}
        <div className="p-3.5 rounded-2xl bg-stone-950/80 border border-stone-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3 text-stone-300">
            <div className="flex items-center space-x-1.5 text-amber-400 font-mono text-2xs font-bold">
              <Laptop className="w-4 h-4" />
              <span>PC</span>
              <span className="text-stone-600">•</span>
              <Tablet className="w-4 h-4" />
              <span>Tablet</span>
              <span className="text-stone-600">•</span>
              <Smartphone className="w-4 h-4" />
              <span>Telefono</span>
            </div>
          </div>
          <span className="text-2xs text-stone-400">
            {lastCloudSync ? `Ultimo sync: ${new Date(lastCloudSync).toLocaleTimeString('it-IT')}` : 'Nessuna sincronizzazione recente'}
          </span>
        </div>

        {/* Riepilogo Dati Sincronizzati */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-stone-800/50 border border-stone-700/50">
            <span className="text-2xs text-stone-400 block">Distributori</span>
            <span className="font-bold text-white text-sm">{machines.length}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-stone-800/50 border border-stone-700/50">
            <span className="text-2xs text-stone-400 block">Prodotti</span>
            <span className="font-bold text-white text-sm">{products.length}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-stone-800/50 border border-stone-700/50">
            <span className="text-2xs text-stone-400 block">Lotti Acquisto</span>
            <span className="font-bold text-white text-sm">{purchases.length}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-stone-800/50 border border-stone-700/50">
            <span className="text-2xs text-stone-400 block">Ricariche</span>
            <span className="font-bold text-white text-sm">{restockHistory.length}</span>
          </div>
        </div>

        {/* Tasti Sincronizzazione Immediata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleManualPull}
            disabled={isCloudSyncing}
            className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-emerald-300 border border-emerald-500/40 font-bold text-xs transition-colors cursor-pointer shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isCloudSyncing ? 'animate-spin' : ''}`} />
            <span>{isCloudSyncing ? 'Aggiornamento...' : 'Scarica Dati dal Cloud'}</span>
          </button>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isCloudSyncing}
            className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors cursor-pointer shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isCloudSyncing ? 'animate-spin' : ''}`} />
            <span>{isCloudSyncing ? 'Sincronizzazione...' : 'Invia Questo Dispositivo su Supabase'}</span>
          </button>
        </div>

        {/* Configurazione Parametri Supabase */}
        <form onSubmit={handleSaveCredentials} className="space-y-3 pt-3 border-t border-stone-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              Configurazione Connessione Supabase
            </span>
            <span className="text-3xs text-stone-500 font-mono">VITE_SUPABASE_URL</span>
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-2xs text-stone-400 mb-1 font-medium">Supabase Project URL</label>
              <div className="relative">
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-2xs text-stone-400 mb-1 font-medium">Supabase Anon Key (chiave pubblica sicura)</label>
              <div className="relative">
                <input
                  type="password"
                  value={inputAnonKey}
                  onChange={(e) => setInputAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-3xs text-stone-500">
              Le credenziali vengono salvate in modo persistente e sicuro.
            </span>
            <button
              type="submit"
              disabled={isSavingCreds}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Salva e Connetti</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
