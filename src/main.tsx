import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      try {
        if ('caches' in window) {
          caches.keys().then((keys) => {
            Promise.all(keys.map((k) => caches.delete(k))).then(() => {
              window.location.reload();
            });
          });
          return;
        }
      } catch {}
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 text-center">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-xl space-y-4">
            <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black">
              !
            </div>
            <h2 className="text-xl font-bold text-stone-900">Actualización en curso</h2>
            <p className="text-sm text-stone-600">
              Hemos detectado una actualización en la plataforma. Por favor, pulsa el botón a continuación para cargar la última versión.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full py-3 px-6 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-2xl shadow-md transition-colors cursor-pointer"
            >
              ↻ Recargar Directorio
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </React.StrictMode>
  );
}
