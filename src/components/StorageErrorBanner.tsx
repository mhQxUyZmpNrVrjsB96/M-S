import React from 'react';
import { AlertTriangle, Download } from 'lucide-react';
import { useVending } from '../context/VendingContext';

export const StorageErrorBanner: React.FC = () => {
  const { storageSaveError, exportBackupJSON } = useVending();

  if (!storageSaveError) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-[100] bg-rose-700 border-b border-rose-500 text-white px-4 py-2.5 shadow-2xl"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center sm:justify-between gap-3 text-xs sm:text-sm font-semibold">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 shrink-0" />
          <span>Salvataggio non riuscito: memoria del browser piena. Esporta subito il backup.</span>
        </div>
        <button
          type="button"
          onClick={exportBackupJSON}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-800 font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Esporta Backup (.JSON)</span>
        </button>
      </div>
    </div>
  );
};
