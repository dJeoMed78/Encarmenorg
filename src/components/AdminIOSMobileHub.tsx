import React from 'react';
import {
  FolderKanban,
  Activity,
  Megaphone,
  Tag,
  Film,
  Link2,
  Tv,
  Siren,
  BarChart3,
  ClipboardList,
  Shield,
  Database,
  History,
  Settings,
  Wrench,
  Globe,
  User,
  Building2,
  Wifi,
  Battery,
  Signal
} from 'lucide-react';
import { SiteAnalytics } from '../types';

interface AdminIOSMobileHubProps {
  businessesCount: number;
  pendingReportsCount: number;
  analytics: SiteAnalytics | null;
  classifiedsCount: number;
  promotionsCount: number;
  eventsCount?: number;
  isSyncing: boolean;
  onTriggerSync: () => Promise<void> | void;
  onSelectTab: (tab: any) => void;
  onClose: () => void;
  onLogout: () => void;
  currentTime: string;
  currentDate: string;
  activeAdminName?: string;
  dbStatus?: any;
  onSwitchToDesktopMode?: () => void;
}

export const AdminIOSMobileHub: React.FC<AdminIOSMobileHubProps> = ({
  businessesCount,
  pendingReportsCount,
  onSelectTab,
  onClose,
  currentTime,
  activeAdminName = 'Jeo'
}) => {
  const iosApps: {
    id: string;
    label: string;
    icon: React.ReactNode;
    gradient: string;
    badge?: number | string;
    isWhiteMariaDB?: boolean;
  }[] = [
    // FILA 1
    {
      id: 'businesses',
      label: 'Catálogo',
      icon: <FolderKanban className="w-8 h-8 text-white drop-shadow" />,
      gradient: 'from-orange-400 via-red-500 to-rose-600',
      badge: businessesCount > 0 ? businessesCount : 205
    },
    {
      id: 'ai_assistant',
      label: 'Asistente IA',
      icon: <Activity className="w-8 h-8 text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.9)]" />,
      gradient: 'from-indigo-950 via-purple-900 to-slate-900'
    },
    {
      id: 'classifieds',
      label: 'Clasificados',
      icon: <Megaphone className="w-8 h-8 text-white drop-shadow" />,
      gradient: 'from-yellow-400 via-amber-500 to-orange-500'
    },
    {
      id: 'promotions',
      label: 'Promociones',
      icon: <Tag className="w-8 h-8 text-white drop-shadow" />,
      gradient: 'from-sky-400 via-blue-500 to-indigo-600'
    },
    // FILA 2
    {
      id: 'events',
      label: 'Cartelera',
      icon: <Film className="w-8 h-8 text-white drop-shadow" />,
      gradient: 'from-orange-400 via-red-500 to-rose-600'
    },
    {
      id: 'links',
      label: 'Ligas',
      icon: <Link2 className="w-8 h-8 text-white drop-shadow" />,
      gradient: 'from-emerald-400 via-teal-500 to-blue-600'
    },
    {
      id: 'publicidad',
      label: 'Publicidad',
      icon: <Tv className="w-8 h-8 text-white drop-shadow" />,
      gradient: 'from-indigo-400 via-purple-500 to-violet-700'
    },
    {
      id: 'emergency',
      label: 'Emergencias',
      icon: <Siren className="w-8 h-8 text-white drop-shadow" />,
      gradient: 'from-red-500 via-rose-600 to-red-800'
    },
    // FILA 3
    {
      id: 'analytics',
      label: 'Métricas',
      icon: <BarChart3 className="w-8 h-8 text-emerald-200 drop-shadow" />,
      gradient: 'from-sky-400 via-blue-600 to-indigo-800'
    },
    {
      id: 'reports',
      label: 'Reportes',
      icon: <ClipboardList className="w-8 h-8 text-amber-100 drop-shadow" />,
      gradient: 'from-stone-400 via-amber-600 to-stone-700',
      badge: pendingReportsCount > 0 ? pendingReportsCount : undefined
    },
    {
      id: 'admins',
      label: 'Seguridad',
      icon: <Shield className="w-8 h-8 text-sky-200 drop-shadow" />,
      gradient: 'from-slate-600 via-slate-800 to-slate-950'
    },
    {
      id: 'status',
      label: 'MariaDB',
      icon: <Database className="w-6 h-6 text-amber-700" />,
      gradient: 'from-white via-stone-50 to-stone-200',
      isWhiteMariaDB: true
    },
    // FILA 4
    {
      id: 'desired_changes',
      label: 'Cambios',
      icon: <History className="w-8 h-8 text-white drop-shadow" />,
      gradient: 'from-stone-400 via-stone-500 to-stone-700'
    },
    {
      id: 'config_editor',
      label: 'Configuración',
      icon: <Settings className="w-8 h-8 text-white drop-shadow" />,
      gradient: 'from-slate-400 via-slate-500 to-slate-700'
    },
    {
      id: 'maintenance',
      label: 'Mantenimiento',
      icon: <Wrench className="w-8 h-8 text-white drop-shadow" />,
      gradient: 'from-orange-400 via-orange-500 to-red-600'
    },
    {
      id: 'exit_portal',
      label: 'Portal',
      icon: <Globe className="w-8 h-8 text-white drop-shadow" />,
      gradient: 'from-sky-400 via-cyan-500 to-blue-600'
    }
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-y-auto select-none text-white pb-28">
      {/* Fondo luminoso de pantalla completa del Puente Zacatal al atardecer */}
      <div
        className="fixed inset-0 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: "url('/puente.jpg')" }}
      />
      <div className="fixed inset-0 bg-black/15 pointer-events-none" />

      {/* Barra de Estado Superior estilo iPhone iOS 18 con Dynamic Island */}
      <div className="sticky top-0 z-30 h-12 px-6 pt-2 flex items-center justify-between text-xs font-bold text-white drop-shadow">
        <span className="tracking-tight text-sm">{currentTime || '9:41'}</span>
        <div className="w-28 h-7 rounded-full bg-black shadow-lg border border-white/10 flex items-center justify-end pr-3">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-950 border border-indigo-400/30" />
        </div>
        <div className="flex items-center gap-1.5">
          <Signal className="w-3.5 h-3.5" />
          <Wifi className="w-3.5 h-3.5" />
          <Battery className="w-4 h-4" />
        </div>
      </div>

      {/* Contenido Principal de Pantalla de Inicio iPhone */}
      <div className="relative z-10 px-5 pt-3 pb-6 space-y-6 max-w-md mx-auto w-full">
        {/* Widget Superior en Cristal Esmerilado (3 filas + punto verde activo) */}
        <div
          className="p-4 sm:p-5 rounded-[26px] border border-white/40 shadow-[0_18px_40px_rgba(0,0,0,0.35)] flex items-end justify-between"
          style={{
            background: 'rgba(255, 255, 255, 0.28)',
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)'
          }}
        >
          <div className="space-y-1.5 text-white drop-shadow">
            <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold">
              <User className="w-4 h-4 text-white/90 shrink-0" />
              <span>Admin: {activeAdminName}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold">
              <Building2 className="w-4 h-4 text-white/90 shrink-0" />
              <span>{businessesCount} Empresas</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold">
              <Database className="w-4 h-4 text-white/90 shrink-0" />
              <span>MariaDB Online</span>
            </div>
          </div>

          <span className="w-3.5 h-3.5 rounded-full bg-[#22c55e] shadow-[0_0_12px_#22c55e] border border-white/60 mb-1" />
        </div>

        {/* Cuadrícula 4x4 de las 16 Aplicaciones estilo iOS 18 */}
        <div className="grid grid-cols-4 gap-x-3 gap-y-5 pt-1">
          {iosApps.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => {
                if (app.id === 'exit_portal') {
                  onClose();
                } else {
                  onSelectTab(app.id);
                }
              }}
              className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform cursor-pointer"
            >
              <div
                className={`relative w-[64px] h-[64px] rounded-[18px] bg-gradient-to-b ${app.gradient} flex flex-col items-center justify-center shadow-[0_10px_22px_rgba(0,0,0,0.42)] border border-white/45`}
              >
                <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-[18px] bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
                {app.icon}
                {app.isWhiteMariaDB && (
                  <span className="text-[9px] font-black text-slate-800 tracking-tighter leading-none mt-0.5">
                    MariaDB
                  </span>
                )}
                {app.badge !== undefined && (
                  <span className="absolute -top-2 -right-2 min-w-[24px] h-[22px] px-1.5 rounded-full bg-[#FF3B30] text-white font-extrabold text-[11px] flex items-center justify-center border border-white/80 shadow-md">
                    {app.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-semibold text-white text-center leading-tight line-clamp-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
                {app.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
