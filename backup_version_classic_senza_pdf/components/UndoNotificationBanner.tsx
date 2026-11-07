import React from 'react';
import { Undo2, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { useVending } from '../context/VendingContext';

export const UndoNotificationBanner: React.FC = () => {
  const { undoToast, undoLastAction, dismissUndoToast, canUndo } = useVending();

  if (!undoToast?.visible) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 max-w-md w-[calc(100vw-2.5rem)] sm:w-auto animate-in fade-in slide-in-from-bottom-5 duration-200"
    >
      <div className={`p-4 rounded-2xl shadow-2xl border flex items-center justify-between gap-3 text-sm ${
        undoToast.isUndoConfirmation
          ? 'bg-emerald-950 text-emerald-50 border-emerald-800'
          : 'bg-stone-950 text-stone-100 border-stone-800'
      }`}>
        <div className="flex items-center space-x-3 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            undoToast.isUndoConfirmation ? 'bg-emerald-800 text-emerald-200' : 'bg-amber-500 text-stone-950'
          }`}>
            {undoToast.isUndoConfirmation ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Undo2 className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-xs sm:text-sm truncate">
              {undoToast.isUndoConfirmation ? 'Operazione ripristinata' : 'Operazione completata'}
            </p>
            <p className="text-2xs text-stone-300 truncate font-mono">
              {undoToast.actionName}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {!undoToast.isUndoConfirmation && canUndo && (
            <button
              id="undo-toast-btn"
              onClick={undoLastAction}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-xs transition-transform active:scale-95 flex items-center space-x-1 cursor-pointer"
              title="Annulla e ripristina la situazione precedente"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Annulla</span>
            </button>
          )}

          <button
            onClick={dismissUndoToast}
            className="w-7 h-7 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Chiudi notifica"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
