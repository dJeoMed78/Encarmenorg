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

  handleDismiss = () => {
    this.setState({ hasError: false, error: null });
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
              Hemos detectado una actualización o recarga en la plataforma. Por favor, pulsa el botón a continuación para continuar o recargar el directorio.
            </p>
            {this.state.error && (
              <details className="text-left text-[11px] text-stone-500 bg-stone-100 p-2.5 rounded-xl max-h-36 overflow-y-auto cursor-pointer">
                <summary className="font-semibold text-stone-700 select-none">Detalles del reporte</summary>
                <pre className="mt-1.5 whitespace-pre-wrap font-mono text-[10px] text-rose-700">{this.state.error.message || String(this.state.error)}</pre>
              </details>
            )}
            <div className="space-y-2 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-3 px-6 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-2xl shadow-md transition-colors cursor-pointer"
              >
                ↻ Recargar Directorio
              </button>
              <button
                type="button"
                onClick={this.handleDismiss}
                className="w-full py-2.5 px-6 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl transition-colors cursor-pointer text-xs"
              >
                Continuar en el Directorio
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Detect deployments without interrupting users who are editing a form.
function startVersionWatcher() {
  let currentVersion: string | null = null;
  let updatePending = false;
  let checking = false;
  const notice = document.createElement('div');
  notice.id = 'encarmen-update-notice';
  notice.setAttribute('role', 'status');
  notice.style.cssText = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:2147483647;background:rgba(245,250,255,.97);backdrop-filter:blur(18px);color:#183153;padding:12px 16px;border:1px solid #bdd4f6;border-radius:16px;box-shadow:0 12px 35px #102a4a33;font:600 14px system-ui;display:none;max-width:calc(100vw - 28px);';
  notice.textContent = 'Hay una nueva versión de Encarmen disponible. Guarda tus cambios antes de actualizar. ';
  const reloadButton = document.createElement('button');
  reloadButton.textContent = 'Actualizar ahora';
  reloadButton.style.cssText = 'margin-left:10px;padding:8px 12px;border:0;border-radius:10px;background:#2563eb;color:white;font-weight:700;cursor:pointer;';
  reloadButton.addEventListener('click', () => window.location.reload());
  notice.appendChild(reloadButton);
  document.body.appendChild(notice);

  const hasActiveEditor = () => Boolean(document.querySelector('[role="dialog"], input:focus, textarea:focus, select:focus, [contenteditable="true"]:focus'));
  async function check() {
    if (checking || document.hidden) return;
    checking = true;
    try {
      const response = await fetch('/api/version?t=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (!data?.version || data.version === 'latest') return;
      if (currentVersion === null) currentVersion = data.version;
      else if (data.version !== currentVersion) updatePending = true;
      if (updatePending) {
        if (!hasActiveEditor()) window.location.reload();
        else notice.style.display = 'block';
      }
    } catch (_) {
      // A temporary network error must never interrupt editing.
    } finally {
      checking = false;
    }
  }
  void check();
  window.setInterval(() => void check(), 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void check(); });
}
startVersionWatcher();

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
