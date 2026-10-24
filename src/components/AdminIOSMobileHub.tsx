import React from 'react';
import {
  Building2,
  Sparkles,
  BarChart3,
  AlertTriangle,
  Tag,
  PlusCircle,
  Gift,
  ShieldAlert,
  Calendar,
  Image as ImageIcon,
  KeyRound,
  Database,
  Bug,
  FileCode,
  RefreshCw,
  Wifi,
  Battery,
  ExternalLink,
  Link2,
  Megaphone,
  Download
} from 'lucide-react';
import { SiteAnalytics } from '../types';
import { AdminDesktopTabId } from './AdminMacOSDesktop';

interface AdminIOSMobileHubProps {
  businessesCount: number;
  pendingReportsCount: number;
  analytics: SiteAnalytics | null;
  classifiedsCount: number;
  promotionsCount: number;
  eventsCount: number;
  isSyncing: boolean;
  onTriggerSync: () => void;
  onSelectTab: (tab: AdminDesktopTabId) => void;
  onClose: () => void;
  onLogout: () => void;
  currentTime: string;
  currentDate: string;
  activeAdminName: string;
  dbStatus?: any;
  onSwitchToDesktopMode?: () => void;
}

export const AdminIOSMobileHub: React.FC<AdminIOSMobileHubProps> = ({
  businessesCount,
  pendingReportsCount,
  classifiedsCount,
  promotionsCount,
  eventsCount,
  isSyncing,
  onTriggerSync,
  onSelectTab,
  onClose,
  currentTime,
  activeAdminName,
  dbStatus
}) => {
  const iosApps: {
    id: AdminDesktopTabId | 'exit_portal';
    label: string;
    icon: React.ReactNode;
    gradient: string;
    badge?: number | string;
  }[] = [
    {
      id: 'businesses',
      label: 'Catálogo',
      icon: <Building2 className="w-7 h-7 text-white" />,
      gradient: 'from-amber-400 via-orange-500 to-rose-500',
      badge: businessesCount > 0 ? businessesCount : undefined
    },
    {
      id: 'ai_assistant',
      label: 'Asistente IA',
      icon: <Sparkles className="w-7 h-7 text-white" />,
      gradient: 'from-fuchsia-500 via-purple-500 to-indigo-600'
    },
    {
      id: 'classifieds',
      label: 'Clasificados',
      icon: <Tag className="w-7 h-7 text-white" />,
      gradient: 'from-violet-500 via-purple-600 to-indigo-700',
      badge: classifiedsCount > 0 ? classifiedsCount : undefined
    },
    {
      id: 'promotions',
      label: 'Promociones',
      icon: <Gift className="w-7 h-7 text-white" />,
      gradient: 'from-amber-400 via-orange-500 to-red-500',
      badge: promotionsCount > 0 ? promotionsCount : undefined
    },
    {
      id: 'events',
      label: 'Cartelera',
      icon: <Calendar className="w-7 h-7 text-white" />,
      gradient: 'from-pink-500 via-fuchsia-500 to-purple-600',
      badge: eventsCount > 0 ? eventsCount : undefined
    },
    {
      id: 'links',
      label: 'Ligas',
      icon: <Link2 className="w-7 h-7 text-white" />,
      gradient: 'from-cyan-400 via-sky-500 to-blue-600'
    },
    {
      id: 'publicidad',
      label: 'Publicidad',
      icon: <Megaphone className="w-7 h-7 text-white" />,
      gradient: 'from-pink-500 via-rose-500 to-red-600'
    },
    {
      id: 'emergency',
      label: 'Emergencias',
      icon: <ShieldAlert className="w-7 h-7 text-white" />,
      gradient: 'from-red-500 via-rose-600 to-red-700'
    },
    {
      id: 'analytics',
      label: 'Métricas',
      icon: <BarChart3 className="w-7 h-7 text-white" />,
      gradient: 'from-sky-400 via-blue-500 to-blue-700'
    },
    {
      id: 'reports',
      label: 'Reportes',
      icon: <AlertTriangle className="w-7 h-7 text-white" />,
      gradient: 'from-orange-500 via-red-500 to-rose-700',
      badge: pendingReportsCount > 0 ? pendingReportsCount : undefined
    },
    {
      id: 'admins',
      label: 'Seguridad',
      icon: <KeyRound className="w-7 h-7 text-white" />,
      gradient: 'from-slate-500 via-slate-600 to-slate-800'
    },
    {
      id: 'status',
      label: 'MariaDB',
      icon: <Database className="w-7 h-7 text-white" />,
      gradient: 'from-indigo-500 via-blue-600 to-violet-700'
    },
    {
      id: 'new_business',
      label: 'Alta Empresa',
      icon: <PlusCircle className="w-7 h-7 text-white" />,
      gradient: 'from-emerald-400 via-teal-500 to-teal-700'
    },
    {
      id: 'config_editor',
      label: 'Configuración',
      icon: <FileCode className="w-7 h-7 text-white" />,
      gradient: 'from-sky-500 via-cyan-600 to-blue-700'
    },
    {
      id: 'maintenance',
      label: 'Mantenimiento',
      icon: <Bug className="w-7 h-7 text-white" />,
      gradient: 'from-rose-600 via-red-600 to-red-900'
    },
    {
      id: 'exit_portal',
      label: 'Portal',
      icon: <ExternalLink className="w-7 h-7 text-white" />,
      gradient: 'from-slate-600 via-slate-700 to-slate-900'
    }
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-y-auto select-none text-white pb-28">
      {/* Wallpaper Atardecer Puente Zacatal con Desenfoque iOS 18 */}
      <div
        className="fixed inset-0 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: "url('/puente.jpg')" }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-[#06152d]/80 via-[#0b1f40]/75 to-[#050d1a]/90 backdrop-blur-2xl pointer-events-none" />

      {/* Barra de Estado Superior iPhone iOS 18 */}
      <div className="sticky top-0 z-30 h-11 px-5 flex items-center justify-between text-xs font-bold text-white/95 backdrop-blur-md">
        <span>{currentTime}</span>
        <div className="w-24 h-5 rounded-full bg-black/85 border border-white/10 flex items-center justify-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] text-white/80 font-mono">iOS Admin</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3.5 h-3.5" />
          <Battery className="w-4 h-4" />
        </div>
      </div>

      {/* Contenido Principal de Pantalla de Inicio iOS */}
      <div className="relative z-10 px-4 pt-2 pb-6 space-y-6">
        
        {/* Widget Superior de Cristal iOS 18 */}
        <div className="p-4 rounded-[28px] bg-white/15 backdrop-blur-3xl border border-white/25 shadow-2xl flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                encarmen.org OS
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/25 text-emerald-200 border border-emerald-400/30">
                {dbStatus?.mariadb?.connected ? 'MariaDB Online' : 'Sync Activo'}
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-white">
              Admin: {activeAdminName} · {businessesCount} Empresas
            </h2>
            <p className="text-[11px] text-sky-100/80">
              Toca cualquier aplicación para administrar el portal
            </p>
          </div>
          <button
            type="button"
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="w-11 h-11 rounded-2xl bg-white/20 hover:bg-white/30 border border-white/30 flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer shrink-0"
            title="Sincronizar"
          >
            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin text-amber-300' : ''}`} />
          </button>
        </div>

        {/* Cuadrícula 4x4 de Aplicaciones iOS con Nombre Claro Debajo */}
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
                className={`relative w-[62px] h-[62px] rounded-[18px] bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.45)] border border-white/35`}
              >
                <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-[18px] bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />
                {app.icon}
                {app.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-rose-600 text-white font-black text-[10px] flex items-center justify-center border-2 border-white shadow-md">
                    {app.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-semibold text-white text-center leading-tight line-clamp-1 drop-shadow">
                {app.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
