import React from 'react';
import {
  Building2,
  Sparkles,
  Tag,
  Gift,
  ShieldAlert,
  Database,
  LogOut,
  Link2,
  Megaphone,
  Wrench
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
  onClose,
  businessesCount,
  classifiedsCount
}) => {
  const dockApps: {
    id: AdminDesktopTabId | 'salir';
    label: string;
    icon: React.ReactNode;
    gradient?: string;
    badge?: number | string;
    isCustomIcon?: boolean;
    onClick?: () => void;
  }[] = [
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
      isCustomIcon: true,
      icon: (
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[13px] bg-white flex flex-col overflow-hidden shadow-md border border-stone-200">
          <div className="bg-[#FF3B30] text-white text-[8px] font-black uppercase tracking-wider py-0.5 text-center leading-none">
            JUN
          </div>
          <div className="flex-1 flex items-center justify-center text-stone-900 font-extrabold text-sm sm:text-base leading-none">
            17
          </div>
        </div>
      )
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
      icon: <Wrench className="w-5 h-5 text-white" />,
      gradient: 'from-slate-500 via-slate-600 to-slate-800'
    },
    {
      id: 'salir',
      label: 'Salir',
      icon: <LogOut className="w-5 h-5 text-white" />,
      gradient: 'from-rose-500 via-red-600 to-red-700',
      onClick: onClose
    }
  ];

  return (
    <div className="fixed bottom-2.5 left-1/2 -translate-x-1/2 z-50 max-w-[98vw] pointer-events-auto select-none">
      <div
        className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-[26px] border border-white/85 shadow-[0_20px_50px_rgba(0,0,0,0.30)] flex items-end gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar"
        style={{
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)'
        }}
      >
        {dockApps.map((item, idx) => {
          const isActive = item.id !== 'salir' && activeTab === item.id;
          const isExit = item.id === 'salir';

          return (
            <React.Fragment key={item.id}>
              {/* Separador sutil antes de Salir */}
              {isExit && (
                <div className="w-px h-9 bg-stone-300/80 mx-0.5 self-center shrink-0" />
              )}

              <button
                type="button"
                onClick={() => {
                  if (item.onClick) {
                    item.onClick();
                  } else if (item.id !== 'salir') {
                    onSelectTab(item.id);
                  }
                }}
                className="group relative flex flex-col items-center gap-1 px-1 py-0.5 cursor-pointer transition-transform duration-200 hover:-translate-y-1.5 shrink-0"
              >
                {item.isCustomIcon ? (
                  <div
                    className={`relative transition-all ${
                      isActive ? 'ring-2 ring-sky-500 rounded-[13px] scale-105' : 'opacity-95 group-hover:opacity-100'
                    }`}
                  >
                    {item.icon}
                    {item.badge !== undefined && (
                      <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 min-w-[18px] h-[18px] rounded-full bg-rose-600 text-white font-black text-[9px] flex items-center justify-center border border-white shadow">
                        {item.badge}
                      </span>
                    )}
                  </div>
                ) : (
                  <div
                    className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-[13px] bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-md border border-white/40 transition-all ${
                      isActive ? 'ring-2 ring-sky-500 scale-105' : 'opacity-95 group-hover:opacity-100'
                    }`}
                  >
                    <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-[13px] bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />
                    {item.icon}
                    {item.badge !== undefined && (
                      <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 min-w-[18px] h-[18px] rounded-full bg-rose-600 text-white font-black text-[9px] flex items-center justify-center border border-white shadow">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}

                {/* Nombre claramente escrito debajo */}
                <span
                  className={`text-[10px] leading-tight font-semibold tracking-tight whitespace-nowrap ${
                    isActive
                      ? 'text-sky-700 font-bold'
                      : isExit
                      ? 'text-rose-600 group-hover:text-rose-700'
                      : 'text-stone-700 group-hover:text-stone-950'
                  }`}
                >
                  {item.label}
                </span>

                {/* Indicador de aplicación activa */}
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    isActive ? 'bg-sky-600 scale-100 shadow-[0_0_6px_rgba(2,132,199,0.8)]' : 'bg-transparent'
                  }`}
                />
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
