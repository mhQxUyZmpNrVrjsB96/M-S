import React from 'react';
import { AlertTriangle, AlertCircle, X, LogOut, Check } from 'lucide-react';

interface ConfirmUnsavedModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirmLeave: () => void;
  onCancelStay: () => void;
}

export const ConfirmUnsavedModal: React.FC<ConfirmUnsavedModalProps> = ({
  isOpen,
  title = 'Modifiche non salvate!',
  message = 'Ci sono modifiche in sospeso che non sono state ancora salvate. Se esci adesso, tutte le modifiche apportate andranno perse.',
  confirmText = 'Esci senza salvare',
  cancelText = 'Rimani e continua a modificare',
  onConfirmLeave,
  onCancelStay,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div 
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-unsaved-title"
        className="bg-white rounded-2xl border-2 border-amber-400 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 id="confirm-unsaved-title" className="text-base sm:text-lg font-black text-stone-900 leading-snug">
                {title}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
                {message}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancelStay}
              className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg -mr-1 -mt-1 cursor-pointer"
              title="Chiudi avviso e rimani"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2.5">
            <button
              type="button"
              onClick={onConfirmLeave}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{confirmText}</span>
            </button>
            <button
              type="button"
              onClick={onCancelStay}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs sm:text-sm shadow-md flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{cancelText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
