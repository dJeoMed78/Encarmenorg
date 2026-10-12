import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Check, EyeOff } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPwaBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);
  const [installedSuccessfully, setInstalledSuccessfully] = useState(false);

  useEffect(() => {
    // 1. Check if user opted out permanently
    const neverAskAgain = localStorage.getItem('carmen_pwa_never_ask') === 'true';
    if (neverAskAgain) return;

    // 2. Check if running in standalone mode (already installed & running as app)
    const isAppMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    if (isAppMode) {
      setIsStandalone(true);
      return;
    }

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIos(isIosDevice);

    const tempDismissed = sessionStorage.getItem('carmen_pwa_temp_dismiss') === 'true';
    if (!tempDismissed) {
      setIsDismissed(false);
    }

    // 4. Capture native Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!neverAskAgain && !tempDismissed) {
        setIsDismissed(false);
      }
    };

    const handleAppInstalled = () => {
      setInstalledSuccessfully(true);
      setDeferredPrompt(null);
      setTimeout(() => {
        setIsDismissed(true);
      }, 3500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosModal(true);
      return;
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstalledSuccessfully(true);
        setTimeout(() => setIsDismissed(true), 3000);
      }
      setDeferredPrompt(null);
    } else {
      alert('Para instalar la App: abre el menú de opciones de tu navegador (tres puntos o compartir) y presiona "Instalar aplicación" o "Agregar a la pantalla de inicio".');
    }
  };

  const handleTemporaryDismiss = () => {
    sessionStorage.setItem('carmen_pwa_temp_dismiss', 'true');
    setIsDismissed(true);
  };

  const handleNeverAskAgain = () => {
    localStorage.setItem('carmen_pwa_never_ask', 'true');
    setIsDismissed(true);
    setShowIosModal(false);
  };

  if (isStandalone || isDismissed) {
    return null;
  }

  return (
    <>
      <aside aria-label="Instalar aplicación" className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40 bg-stone-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-amber-500/30 animate-in fade-in slide-in-from-bottom-5 duration-300">
        {installedSuccessfully ? (
          <div className="flex items-center gap-3 py-1">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">¡App instalada con éxito!</p>
              <p className="text-xs text-stone-300">Ya puedes abrirla desde la pantalla de inicio de tu celular.</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shrink-0 shadow-md border border-white/20 p-2">
                <img src="/icons/icon-192.svg" alt="Empresas en Carmen" className="w-full h-full object-contain" />
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {isIos ? '📱 iPhone / iPad' : '⚡ Android App'}
                  </span>
                </div>
                <h4 className="font-bold text-white text-sm sm:text-base leading-snug mt-1">
                  Instalar App en tu Celular
                </h4>
                <p className="text-xs text-stone-300 line-clamp-2 mt-0.5">
                  Acceso directo, más rápida, sin gastar memoria y siempre al día.
                </p>
              </div>

              <button
                onClick={handleTemporaryDismiss}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors shrink-0"
                title="Cerrar por ahora"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-stone-800 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={handleNeverAskAgain}
                className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-rose-400 transition-colors px-2 py-1 rounded hover:bg-white/5 cursor-pointer"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>No volver a preguntar</span>
              </button>

              <button
                onClick={handleInstallClick}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-lg shadow-amber-500/20 transition-all transform active:scale-95 cursor-pointer ml-auto"
              >
                <Download className="w-4 h-4" />
                <span>{isIos ? 'Ver cómo instalar' : 'Instalar ahora'}</span>
              </button>
            </div>
          </div>
        )}
      </aside>

      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-stone-900 border border-amber-500/30 text-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowIosModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white p-1 rounded-full bg-stone-800/80 hover:bg-stone-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 mx-auto flex items-center justify-center p-3 shadow-lg border border-amber-300/30 mb-3">
                <img src="/icons/icon-192.svg" alt="Empresas en Carmen" className="w-full h-full object-contain" />
              </div>
              <h3 className="text-lg font-bold text-white">Instalar en tu iPhone</h3>
              <p className="text-xs text-stone-300 mt-1">Sigue estos 2 sencillos pasos en Safari:</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3.5 bg-stone-800/70 p-3.5 rounded-2xl border border-stone-700">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-amber-500/40">
                  1
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-white flex items-center gap-1.5 flex-wrap">
                    Toca el botón <span className="inline-flex items-center gap-1 bg-stone-700 px-2 py-0.5 rounded text-amber-300 font-bold text-xs"><Share className="w-3.5 h-3.5" /> Compartir</span>
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    En la barra inferior de Safari (el cuadrito con la flecha hacia arriba).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 bg-stone-800/70 p-3.5 rounded-2xl border border-stone-700">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-amber-500/40">
                  2
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-white flex items-center gap-1.5 flex-wrap">
                    Elige <span className="inline-flex items-center gap-1 bg-stone-700 px-2 py-0.5 rounded text-amber-300 font-bold text-xs"><PlusSquare className="w-3.5 h-3.5" /> Agregar al inicio</span>
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    Baja en las opciones del menú y presiona &quot;Agregar a pantalla de inicio&quot;.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setShowIosModal(false)}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-sm transition-all cursor-pointer"
              >
                ¡Entendido!
              </button>

              <button
                onClick={handleNeverAskAgain}
                className="w-full py-2 text-xs text-stone-400 hover:text-rose-400 text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>No volver a mostrar esta sugerencia</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
