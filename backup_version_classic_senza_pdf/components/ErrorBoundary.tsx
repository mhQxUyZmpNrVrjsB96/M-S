import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Monitor, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onSwitchToDesktop?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleResetToDesktop = () => {
    try {
      localStorage.setItem('vending_view_mode', 'desktop');
    } catch (e) {
      console.error(e);
    }
    if (this.props.onSwitchToDesktop) {
      this.props.onSwitchToDesktop();
    }
    window.location.reload();
  };

  private handleResetStorage = () => {
    if (window.confirm('Vuoi ripristinare i dati di default per risolvere il problema?')) {
      try {
        localStorage.clear();
      } catch (e) {
        console.error(e);
      }
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-white">
                {this.props.fallbackTitle || 'Si è verificato un problema'}
              </h2>
              <p className="text-xs text-stone-400 leading-relaxed">
                Abbiamo intercettato un errore di caricamento. Puoi passare direttamente alla modalità Desktop o riavviare la visualizzazione.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-stone-950/80 rounded-xl p-3 text-left border border-stone-800 text-3xs font-mono text-rose-300 max-h-24 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={this.handleResetToDesktop}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg transition-all cursor-pointer"
              >
                <Monitor className="w-4 h-4" />
                <span>Passa alla Modalità Desktop</span>
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs border border-stone-700 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Ricarica Pagina</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetStorage}
                className="w-full flex items-center justify-center space-x-1.5 py-2 text-stone-500 hover:text-rose-400 text-3xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Cancella cache locale &amp; ripristina</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
