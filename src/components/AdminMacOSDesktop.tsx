import React, { useState } from 'react';
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
  RefreshCw,
  Search,
  Activity,
  CheckCircle2,
  ExternalLink,
  Link2,
  Megaphone,
  Edit2,
  Trash2,
  Star,
  Sliders,
  Download,
  FileCode
} from 'lucide-react';
import { SiteAnalytics, Business } from '../types';
import { getPortalLinksConfig, getPortalAdConfig } from './AdminLinksAndAdsManager';

export type AdminDesktopTabId =
  | 'start'
  | 'businesses'
  | 'ai_assistant'
  | 'analytics'
  | 'reports'
  | 'classifieds'
  | 'new_business'
  | 'promotions'
  | 'status'
  | 'emergency'
  | 'events'
  | 'admins'
  | 'brand_media'
  | 'links'
  | 'publicidad'
  | 'desired_changes'
  | 'config_editor'
  | 'maintenance';

interface AdminMacOSDesktopProps {
  businessesCount: number;
  businesses?: Business[];
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
}

export const AdminMacOSDesktop: React.FC<AdminMacOSDesktopProps> = ({
  businessesCount,
  businesses = [],
  pendingReportsCount,
  analytics,
  classifiedsCount,
  promotionsCount,
  eventsCount,
  isSyncing,
  onTriggerSync,
  onSelectTab,
  onClose,
  onLogout,
  activeAdminName,
  dbStatus
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const linksConfig = getPortalLinksConfig();
  const adConfig = getPortalAdConfig();

  const filteredBusinesses = businesses
    .filter((b) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        b.name.toLowerCase().includes(q) ||
        (b.category || '').toLowerCase().includes(q) ||
        (b.colonia || '').toLowerCase().includes(q)
      );
    })
    .slice(0, 6);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden select-none p-3 sm:p-5 pb-24">
      {/* Fondo Atardecer Puente Zacatal con Desenfoque macOS Sequoia */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-105 pointer-events-none"
        style={{ backgroundImage: "url('/puente.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#061329]/85 via-[#0a1e3c]/80 to-[#1a1025]/85 backdrop-blur-2xl pointer-events-none" />

      {/* Ventana Principal de Consola Ejecutiva macOS Glass (Sin duplicar iconos en el escritorio) */}
      <div className="relative z-10 flex-1 flex flex-col min-h-0 w-full max-w-7xl mx-auto rounded-3xl bg-slate-900/65 backdrop-blur-3xl border border-white/20 shadow-[0_30px_90px_rgba(0,0,0,0.65)] overflow-hidden">
        
        {/* Barra de Título de Ventana macOS con Semáforo y Buscador */}
        <div className="h-12 bg-slate-950/75 border-b border-white/15 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                title="Salir al Directorio Público"
                className="w-3.5 h-3.5 rounded-full bg-[#FF5F56] border border-[#E0443E] hover:opacity-80 cursor-pointer"
              />
              <button
                type="button"
                onClick={onTriggerSync}
                title="Sincronizar"
                className="w-3.5 h-3.5 rounded-full bg-[#FFBD2E] border border-[#DEA123] hover:opacity-80 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => onSelectTab('businesses')}
                title="Abrir Catálogo Completo"
                className="w-3.5 h-3.5 rounded-full bg-[#27C93F] border border-[#1AAB29] hover:opacity-80 cursor-pointer"
              />
            </div>
            <div className="h-4 w-px bg-white/15 mx-1" />
            <span className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>Consola Ejecutiva — encarmen.org</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Admin: {activeAdminName}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative hidden md:block w-64">
              <Search className="w-3.5 h-3.5 text-sky-300/70 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar empresa o colonia..."
                className="w-full pl-8 pr-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-white placeholder:text-white/45 focus:outline-none focus:border-sky-400"
              />
            </div>
            <button
              type="button"
              onClick={onTriggerSync}
              disabled={isSyncing}
              className="px-3 py-1 rounded-full bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/30 text-xs font-semibold text-sky-200 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-sky-300' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>
          </div>
        </div>

        {/* Cuerpo de la Consola: Barra Lateral Izquierda + Panel Principal */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          
          {/* Barra Lateral macOS Finder-Style */}
          <aside className="w-56 bg-slate-950/55 border-r border-white/10 p-3 flex flex-col justify-between overflow-y-auto shrink-0">
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-200/45 px-2.5 mb-1.5">
                  Panel de Control
                </div>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => onSelectTab('start')}
                    className="w-full px-3 py-2 rounded-xl bg-sky-500/25 border border-sky-400/30 text-white text-xs font-bold flex items-center gap-2.5 cursor-pointer"
                  >
                    <Activity className="w-4 h-4 text-sky-400" />
                    <span>Resumen General</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTab('businesses')}
                    className="w-full px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center justify-between transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Building2 className="w-4 h-4 text-amber-400" />
                      <span>Catálogo Empresas</span>
                    </span>
                    <span className="text-[10px] font-bold bg-white/15 px-1.5 py-0.5 rounded-full">{businessesCount}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTab('links')}
                    className="w-full px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center justify-between transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Link2 className="w-4 h-4 text-cyan-400" />
                      <span>Ligas y Botones iOS</span>
                    </span>
                    <span className="text-[9px] font-bold bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-full">NUEVO</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTab('publicidad')}
                    className="w-full px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center justify-between transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Megaphone className="w-4 h-4 text-pink-400" />
                      <span>Publicidad Footer</span>
                    </span>
                    <span className="text-[9px] font-bold bg-pink-500/20 text-pink-300 px-1.5 py-0.5 rounded-full">NUEVO</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTab('classifieds')}
                    className="w-full px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center justify-between transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Tag className="w-4 h-4 text-violet-400" />
                      <span>Clasificados</span>
                    </span>
                    <span className="text-[10px] font-bold bg-white/15 px-1.5 py-0.5 rounded-full">{classifiedsCount}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTab('promotions')}
                    className="w-full px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center justify-between transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Gift className="w-4 h-4 text-orange-400" />
                      <span>Promociones</span>
                    </span>
                    <span className="text-[10px] font-bold bg-white/15 px-1.5 py-0.5 rounded-full">{promotionsCount}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTab('events')}
                    className="w-full px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center justify-between transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-fuchsia-400" />
                      <span>Eventos y Cartelera</span>
                    </span>
                    <span className="text-[10px] font-bold bg-white/15 px-1.5 py-0.5 rounded-full">{eventsCount}</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-200/45 px-2.5 mb-1.5">
                  Sistema y Seguridad
                </div>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => onSelectTab('reports')}
                    className="w-full px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center justify-between transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>Reportes</span>
                    </span>
                    {pendingReportsCount > 0 && (
                      <span className="text-[10px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-full">
                        {pendingReportsCount}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTab('admins')}
                    className="w-full px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center gap-2.5 transition-all cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-indigo-400" />
                    <span>Cuentas Admin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTab('status')}
                    className="w-full px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center gap-2.5 transition-all cursor-pointer"
                  >
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>Estado MariaDB</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-sky-200/70 px-2">
              <span>Hostinger SQL</span>
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>
          </aside>

          {/* Área Principal de la Consola */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            
            {/* 4 Tarjetas KPI Superiores en Cristal iOS / macOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                onClick={() => onSelectTab('businesses')}
                className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-xl transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <span className="text-[11px] text-sky-200/70 font-medium">Empresas Activas</span>
                  <div className="text-3xl font-extrabold text-white mt-0.5">{businessesCount}</div>
                  <span className="text-[11px] text-emerald-300 font-medium">Catálogo sincronizado</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center shadow-lg">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              </div>

              <div
                onClick={() => onSelectTab('promotions')}
                className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-xl transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <span className="text-[11px] text-sky-200/70 font-medium">Promociones Vigentes</span>
                  <div className="text-3xl font-extrabold text-white mt-0.5">{promotionsCount}</div>
                  <span className="text-[11px] text-amber-300 font-medium">En página iOS Glass</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg">
                  <Gift className="w-6 h-6 text-white" />
                </div>
              </div>

              <div
                onClick={() => onSelectTab('classifieds')}
                className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-xl transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <span className="text-[11px] text-sky-200/70 font-medium">Clasificados por Aprobar</span>
                  <div className="text-3xl font-extrabold text-white mt-0.5">{classifiedsCount}</div>
                  <span className="text-[11px] text-violet-300 font-medium">Con verificación de fuente</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg">
                  <Tag className="w-6 h-6 text-white" />
                </div>
              </div>

              <div
                onClick={() => onSelectTab('status')}
                className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-xl transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <span className="text-[11px] text-sky-200/70 font-medium">Estado MariaDB</span>
                  <div className="text-2xl font-extrabold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Online</span>
                  </div>
                  <span className="text-[11px] text-sky-200/70 font-medium">
                    {dbStatus?.mariadb?.connected ? 'Hostinger Remoto OK' : 'Sincronización Activa'}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg">
                  <Database className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>



            {/* Fila Central: Editor Rápido de Ligas iOS + Estado del Banner Publicitario del Footer */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Tarjeta 1: Gestión de Ligas y Botones iOS */}
              <div className="p-5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/25 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                      <Link2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Gestión de Ligas (Barra iOS y Footer)</h4>
                      <p className="text-[11px] text-sky-200/70">Canales Oficiales, Grupos de WhatsApp y Redes del Pie de Página</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectTab('links')}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md"
                  >
                    Editar Ligas
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {[...linksConfig.officialChannels.slice(0, 2), ...linksConfig.whatsappCommunities.slice(0, 2)].map((item) => (
                    <div key={item.id} className="p-2.5 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between text-xs">
                      <div className="truncate pr-2">
                        <div className="font-bold text-white truncate">{item.label}</div>
                        <div className="text-[10px] text-sky-300/70 truncate">{item.url}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-white/10 text-[9px] font-bold text-white/80 shrink-0">
                        {item.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tarjeta 2: Espacio Publicitario del Footer */}
              <div className="p-5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xl flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-pink-500/25 border border-pink-400/40 flex items-center justify-center text-pink-300">
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Banner Publicitario en Footer</h4>
                      <p className="text-[11px] text-sky-200/70">Reemplaza al bloque "SECCIONES" en el pie de página</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectTab('publicidad')}
                    className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-bold text-xs transition-all cursor-pointer shadow-md"
                  >
                    Configurar Banner
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={adConfig.imageUrl || '/puente.jpg'}
                      alt={adConfig.title}
                      className="w-16 h-12 rounded-lg object-cover border border-white/20 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{adConfig.title}</div>
                      <div className="text-[11px] text-sky-300/80 truncate">{adConfig.targetUrl}</div>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                    adConfig.enabled ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/30' : 'bg-white/10 text-white/60'
                  }`}>
                    {adConfig.enabled ? 'Activo en Footer' : 'Pausado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabla Rápida de Control de Empresas */}
            <div className="p-5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-white">Control Rápido de Empresas Registradas</h4>
                  <p className="text-[11px] text-sky-200/70">
                    Calificación real comunitaria (sin 5.0 falso por defecto) y acceso directo al catálogo
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectTab('new_business')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Nueva Empresa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTab('businesses')}
                    className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs cursor-pointer"
                  >
                    Ver las {businessesCount} empresas →
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/15 text-sky-200/70 text-[11px] uppercase">
                      <th className="py-2 px-3">Empresa</th>
                      <th className="py-2 px-3">Categoría</th>
                      <th className="py-2 px-3">Colonia</th>
                      <th className="py-2 px-3">Calificación Real</th>
                      <th className="py-2 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredBusinesses.map((biz) => {
                      const hasVotes = (biz.reviewCount || 0) > 0 && (biz.rating || 0) > 0;
                      return (
                        <tr key={biz.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-white">{biz.name}</td>
                          <td className="py-2.5 px-3 text-sky-200/80">{biz.category}</td>
                          <td className="py-2.5 px-3 text-sky-200/80">{biz.colonia || 'Centro'}</td>
                          <td className="py-2.5 px-3">
                            {hasVotes ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold text-[11px]">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {Number(biz.rating).toFixed(1)} ({biz.reviewCount})
                              </span>
                            ) : (
                              <span className="text-[11px] text-white/45 italic">Sin votos aún</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => onSelectTab('businesses')}
                              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold cursor-pointer"
                            >
                              Administrar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
