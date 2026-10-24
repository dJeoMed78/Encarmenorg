import React from 'react';
import {
  Building2,
  Sparkles,
  Tag,
  Gift,
  ShieldAlert,
  Calendar,
  Database,
  RefreshCw,
  LogOut,
  X,
  LayoutGrid,
  Link2,
  Megaphone
} from 'lucide-react';
import { AdminDesktopTabId } from './AdminMacOSDesktop';

interface AdminMacOSDockProps {
  activeTab: AdminDesktopTabId;
  onSelectTab: (tab: AdminDesktopTabId) => void;
  isSyncing: boolean;
  onTriggerSync: () => void;
  onLogout: () => void;
  onClose: () => void;
  pendingReportsCount: number;
  businessesCount: number;
  classifiedsCount: number;
}

export const AdminMacOSDock: React.FC<AdminMacOSDockProps> = ({
  activeTab,
  onSelectTab,
  isSyncing,
  onTriggerSync,
  onLogout,
  onClose,
  businessesCount,
  classifiedsCount
}) => {
  const dockApps: {
    id: AdminDesktopTabId;
    label: string;
    icon: React.ReactNode;
    gradient: string;
    badge?: number | string;
  }[] = [
    {
      id: 'start',
      label: 'Escritorio',
      icon: <LayoutGrid className="w-5 h-5 text-white" />,
      gradient: 'from-sky-400 via-blue-500 to-indigo-600'
    },
    {
      id: 'businesses',
      label: 'Catálogo',
      icon: <Building2 className="w-5 h-5 text-white" />,
      gradient: 'from-amber-400 via-orange-500 to-rose-500',
      badge: businessesCount > 0 ? businessesCount : undefined
    },
    {
      id: 'ai_assistant',
      label: 'Asistente IA',
      icon: <Sparkles className="w-5 h-5 text-white" />,
      gradient: 'from-fuchsia-500 via-purple-500 to-indigo-600'
    },
    {
      id: 'classifieds',
      label: 'Clasificados',
      icon: <Tag className="w-5 h-5 text-white" />,
      gradient: 'from-violet-500 via-purple-600 to-indigo-700',
      badge: classifiedsCount > 0 ? classifiedsCount : undefined
    },
    {
      id: 'promotions',
      label: 'Promociones',
      icon: <Gift className="w-5 h-5 text-white" />,
      gradient: 'from-amber-400 via-orange-500 to-red-500'
    },
    {
      id: 'events',
      label: 'Eventos',
      icon: <Calendar className="w-5 h-5 text-white" />,
      gradient: 'from-pink-500 via-fuchsia-500 to-purple-600'
    },
    {
      id: 'links',
      label: 'Ligas',
      icon: <Link2 className="w-5 h-5 text-white" />,
      gradient: 'from-cyan-400 via-sky-500 to-blue-600'
    },
    {
      id: 'publicidad',
      label: 'Publicidad',
      icon: <Megaphone className="w-5 h-5 text-white" />,
      gradient: 'from-pink-500 via-rose-500 to-red-600'
    },
    {
      id: 'emergency',
      label: 'Urgencias',
      icon: <ShieldAlert className="w-5 h-5 text-white" />,
      gradient: 'from-red-500 via-rose-600 to-red-700'
    },
    {
      id: 'status',
      label: 'MariaDB',
      icon: <Database className="w-5 h-5 text-white" />,
      gradient: 'from-emerald-400 via-teal-500 to-cyan-600'
    },
    {
      id: 'maintenance',
      label: 'Mantenimiento',
      icon: <ShieldAlert className="w-5 h-5 text-white" />,
      gradient: 'from-slate-500 via-slate-600 to-slate-800'
    }
  ];

  return (
    <div className="fixed bottom-2.5 left-1/2 -translate-x-1/2 z-50 max-w-[98vw] pointer-events-auto select-none">
      <div className="px-3.5 py-2 rounded-[26px] bg-slate-950/75 backdrop-blur-3xl border border-white/25 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex items-end gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
        {dockApps.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className="group relative flex flex-col items-center gap-1 px-1.5 py-0.5 cursor-pointer transition-transform duration-200 hover:-translate-y-1.5 shrink-0"
            >
              <div
                className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-[13px] bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg border border-white/30 transition-all ${
                  isActive ? 'ring-2 ring-white scale-105' : 'opacity-90 group-hover:opacity-100'
                }`}
              >
                <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-[13px] bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
                {item.icon}
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 min-w-[18px] h-[18px] rounded-full bg-rose-600 text-white font-black text-[9px] flex items-center justify-center border border-white shadow">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Etiqueta visible debajo de cada icono del Dock */}
              <span
                className={`text-[10px] leading-tight font-semibold tracking-tight whitespace-nowrap ${
                  isActive ? 'text-amber-300 font-bold' : 'text-white/85 group-hover:text-white'
                }`}
              >
                {item.label}
              </span>

              <span
                className={`w-1 h-1 rounded-full transition-all ${
                  isActive ? 'bg-amber-400 scale-110' : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}

        {/* Separador Vertical */}
        <div className="w-px h-10 bg-white/20 mx-0.5 self-center shrink-0" />

        {/* Sincronizar */}
        <button
          type="button"
          onClick={onTriggerSync}
          disabled={isSyncing}
          className="group flex flex-col items-center gap-1 px-1.5 py-0.5 cursor-pointer transition-transform duration-200 hover:-translate-y-1.5 shrink-0"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[13px] bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shadow-lg border border-white/30">
            <RefreshCw className={`w-5 h-5 text-white ${isSyncing ? 'animate-spin' : ''}`} />
          </div>
          <span className="text-[10px] leading-tight font-semibold text-white/85">Sync</span>
          <span className="w-1 h-1 rounded-full bg-transparent" />
        </button>

        {/* Salir al Portal */}
        <button
          type="button"
          onClick={onClose}
          className="group flex flex-col items-center gap-1 px-1.5 py-0.5 cursor-pointer transition-transform duration-200 hover:-translate-y-1.5 shrink-0"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[13px] bg-gradient-to-br from-rose-500 to-red-700 flex items-center justify-center shadow-lg border border-white/30">
            <LogOut className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] leading-tight font-semibold text-rose-200">Salir</span>
          <span className="w-1 h-1 rounded-full bg-transparent" />
        </button>
      </div>
    </div>
  );
};
