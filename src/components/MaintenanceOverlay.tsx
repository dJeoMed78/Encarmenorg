import React from 'react';
import { ShieldAlert, Clock, Phone, MessageSquare, Lock } from 'lucide-react';
import { MaintenanceModeConfig } from '../services/api';

interface MaintenanceOverlayProps {
  config: MaintenanceModeConfig;
  onAdminLoginClick: () => void;
}

export const MaintenanceOverlay: React.FC<MaintenanceOverlayProps> = ({
  config,
  onAdminLoginClick
}) => {
  return (
    <div className="min-h-screen bg-stone-950 text-white flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-4xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center font-black text-black text-lg">
            EC
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white leading-tight">
              Empresas en Carmen
            </h1>
            <p className="text-[11px] text-stone-400">Directorio Oficial de Ciudad del Carmen</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onAdminLoginClick}
          className="px-3 py-1.5 rounded-lg border border-stone-800 bg-stone-900/60 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Acceso Administrativo</span>
        </button>
      </div>

      {/* Main Content Card */}
      <main className="max-w-xl w-full mx-auto my-auto py-10 text-center space-y-6">
        {config.bannerUrl && (
          <div className="flex justify-center mb-2">
            <img
              src={config.bannerUrl}
              alt="Banner informativo"
              className="max-h-28 sm:max-h-36 object-contain rounded-2xl shadow-2xl border border-stone-800/80 bg-stone-900/50 p-2"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          </div>
        )}

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold tracking-wide">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          Mantenimiento Preventivo del Sistema
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
          {config.title || 'Portal Temporalmente en Mantenimiento'}
        </h2>

        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 sm:p-6 text-stone-300 text-sm sm:text-base leading-relaxed text-left whitespace-pre-wrap shadow-xl">
          {config.message || 'Estamos realizando tareas de mantenimiento técnico en nuestros servidores para ofrecerte una mejor experiencia. El portal volverá a estar disponible en unos momentos.'}
        </div>

        {config.estimatedReturn && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs sm:text-sm font-semibold">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Tiempo estimado de reactivación: <strong>{config.estimatedReturn}</strong></span>
          </div>
        )}

        {/* Support & Contact during maintenance */}
        <div className="pt-4 border-t border-stone-900 flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://wa.me/529381522623?text=Hola,%20vi%20el%20portal%20en%20mantenimiento%20y%20necesito%20información"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            Atención WhatsApp Directo
          </a>
          <a
            href="tel:9381522623"
            className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 font-bold text-xs flex items-center gap-2 border border-stone-800 transition-colors"
          >
            <Phone className="w-4 h-4" />
            Teléfono de Contacto
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-stone-500 max-w-md mx-auto pt-6">
        <p>© {new Date().getFullYear()} Empresas en Carmen • Ciudad del Carmen, Campeche.</p>
        <p className="mt-1 text-[11px] text-stone-600">
          Agradecemos tu paciencia mientras implementamos estas mejoras.
        </p>
      </footer>
    </div>
  );
};
