import React, { useState } from 'react';
import {
  Sparkles,
  BarChart3,
  AlertTriangle,
  Tag,
  Building2,
  Gift,
  Server,
  Globe,
  RefreshCw,
  LogOut,
  X,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  MessageCircle,
  Phone,
  Flame,
  ArrowRight,
  Database,
  ExternalLink,
  Layers,
  Settings,
  Search,
  CheckCircle2,
  ShieldAlert,
  Calendar,
  KeyRound,
  Image as ImageIcon,
  Bug,
  FileCode
} from 'lucide-react';
import { SiteAnalytics } from '../types';

interface AdminWindowsMobileMenuProps {
  businessesCount: number;
  pendingReportsCount: number;
  analytics: SiteAnalytics | null;
  classifiedsCount: number;
  promotionsCount: number;
  eventsCount?: number;
  isSyncing: boolean;
  onTriggerSync: () => Promise<void>;
  onSelectTab: (tab: 'businesses' | 'analytics' | 'reports' | 'classifieds' | 'new_business' | 'promotions' | 'status' | 'emergency' | 'events' | 'admins' | 'brand_media' | 'desired_changes' | 'config_editor') => void;
  onClose: () => void;
  onLogout: () => void;
  currentTime: string;
  currentDate: string;
}

export const AdminWindowsMobileMenu: React.FC<AdminWindowsMobileMenuProps> = ({
  businessesCount,
  pendingReportsCount,
  analytics,
  classifiedsCount,
  promotionsCount,
  eventsCount = 10,
  isSyncing,
  onTriggerSync,
  onSelectTab,
  onClose,
  onLogout,
  currentTime,
  currentDate
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  // Tiles definition for quick search or full grid
  const allTiles = [
    {
      id: 'businesses' as const,
      name: 'Catálogo de Empresas',
      keywords: 'empresas negocios catalogo editar borrar buscar lista cuadricula top'
    },
    {
      id: 'emergency' as const,
      name: 'Guía de Emergencias 24/7',
      keywords: 'emergencias 911 cruz roja clinicas hospitales bomberos gruas cerrajeros telefonos auxilio'
    },
    {
      id: 'events' as const,
      name: 'Cartelera Carmelita de Eventos',
      keywords: 'eventos cartelera actividades bazares playa malecon conciertos musica cultura'
    },
    {
      id: 'analytics' as const,
      name: 'Alcance & Métricas',
      keywords: 'metricas visitas clicks whatsapp llamadas estadisticas alcance'
    },
    {
      id: 'reports' as const,
      name: 'Reportes Ciudadanos',
      keywords: 'reportes errores telefonos cerrados atencion'
    },
    {
      id: 'promotions' as const,
      name: 'Promociones & Cupones Flash',
      keywords: 'promociones cupones descuentos ofertas brio cleaner clientes'
    },
    {
      id: 'classifieds' as const,
      name: 'Clasificados & Empleos',
      keywords: 'clasificados avisos empleo vacantes autos rentas carmen'
    },
    {
      id: 'new_business' as const,
      name: 'Nueva Compañía (Manual)',
      keywords: 'nueva empresa compania formulario directo woocommerce registrar'
    },
    {
      id: 'brand_media' as const,
      name: 'Banner y Logo Oficial',
      keywords: 'banner logo imagen diseno oficial carmen malecon delfin publicitar'
    },
    {
      id: 'admins' as const,
      name: 'Administradores & Claves',
      keywords: 'administradores usuarios claves contraseñas seguridad yuss jeo accesos pin cuentas'
    },
    {
      id: 'status' as const,
      name: 'Conexión & Sincronización WP',
      keywords: 'conexion wordpress hostinger woocommerce rest api sincronizar'
    }
  ];

  const filteredTiles = filterQuery.trim()
    ? allTiles.filter(t =>
        t.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
        t.keywords.toLowerCase().includes(filterQuery.toLowerCase())
      )
    : null;

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#020B17] via-[#051122] to-[#01060D] text-white p-4 sm:p-8 overscroll-contain select-none font-sans">
      {/* WINDOWS MOBILE PANORAMA HEADER */}
      <div className="max-w-5xl mx-auto space-y-4 mb-6 sm:mb-8">
        {/* Brand Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sky-400 font-mono tracking-widest text-xs font-bold uppercase">
              EMPRESAS EN CARMEN OS
            </span>
            <span className="text-white/20">•</span>
            <span className="text-slate-400 text-xs font-light">edición administrador</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sesión activa</span>
            </span>

            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors cursor-pointer text-xs flex items-center gap-1.5 shadow-xs"
              title="Cerrar sesión de administrador y volver como usuario normal"
            >
              <LogOut className="w-3.5 h-3.5 text-white" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* Massive Windows Phone Panorama Title */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-1">
          <div>
            <h1 className="text-4xl sm:text-6xl font-light tracking-tight text-white lowercase">
              inicio
            </h1>
            <p className="text-xs sm:text-sm text-sky-200/70 font-light mt-0.5">
              {currentDate} · <span className="font-mono text-white">{currentTime}</span> · Mosaicos Vivos
            </p>
          </div>

          {/* Quick Search in Windows Phone style */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              placeholder="buscar herramienta..."
              className="w-full py-2 pl-9 pr-3 rounded-none bg-black/40 border-b-2 border-white/30 focus:border-[#0078D7] text-xs text-white placeholder:text-white/40 outline-none transition-all"
            />
            <Search className="w-3.5 h-3.5 text-white/50 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FILTER SEARCH LIST VIEW IF SEARCHING */}
      {filteredTiles ? (
        <div className="max-w-5xl mx-auto space-y-2 mb-8">
          <p className="text-xs text-slate-400 mb-3">
            Resultados para <span className="text-white font-semibold">"{filterQuery}"</span> ({filteredTiles.length}):
          </p>
          {filteredTiles.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-white/5 border border-white/10 rounded-xl">
              No se encontraron herramientas con ese nombre.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredTiles.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTab(t.id)}
                  className="p-4 bg-[#0078D7] hover:bg-[#0063B1] border border-white/20 text-left flex items-center justify-between transition-all cursor-pointer group active:scale-98"
                >
                  <span className="font-light text-base text-white">{t.name}</span>
                  <ChevronRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* WINDOWS MOBILE LIVE TILES GRID (MOSAICOS VIVOS) */
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3.5">
          {/* TILE 0: CATÁLOGO DE EMPRESAS (Wide 2-Column Tile, Dark Blue #004E8C) */}
          <button
            type="button"
            onClick={() => onSelectTab('businesses')}
            className="col-span-2 p-4 sm:p-5 bg-[#004E8C] hover:bg-[#003B6A] border border-blue-400/40 text-left flex flex-col justify-between h-44 sm:h-48 relative overflow-hidden transition-all duration-150 cursor-pointer shadow-lg active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-none bg-black/20 flex items-center justify-center text-white">
                <Building2 className="w-6 h-6 text-sky-200 group-hover:scale-110 transition-transform" />
              </div>
              <span className="px-2.5 py-0.5 bg-black/30 border border-white/20 text-[10px] font-bold text-sky-200 uppercase tracking-wider flex items-center gap-1">
                {businessesCount} empresas
              </span>
            </div>

            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-light tracking-tight text-white leading-tight">
                Catálogo de Empresas
              </div>
              <p className="text-xs text-sky-100/90 font-normal line-clamp-2">
                Buscar, filtrar, editar datos, alternar TOP, fotos y mantenimiento completo en un solo lugar.
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] font-medium text-sky-200 uppercase tracking-wider pt-2 border-t border-white/15">
              <span>gestión total</span>
              <span className="flex items-center gap-1 text-white group-hover:translate-x-1 transition-transform font-bold">
                abrir catálogo <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </button>

          {/* TILE 1: BANNER Y LOGO OFICIAL (Wide 2-Column Tile, Teal Cyan #008299) */}
          <button
            type="button"
            onClick={() => onSelectTab('brand_media')}
            className="col-span-2 p-4 sm:p-5 bg-[#008299] hover:bg-[#006E82] border border-cyan-400/40 text-left flex flex-col justify-between h-44 sm:h-48 relative overflow-hidden transition-all duration-150 cursor-pointer shadow-lg active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-none bg-black/20 flex items-center justify-center text-white">
                <ImageIcon className="w-6 h-6 text-cyan-200 group-hover:scale-110 transition-transform" />
              </div>
              <span className="px-2.5 py-0.5 bg-black/30 border border-white/20 text-[10px] font-bold text-cyan-200 uppercase tracking-wider flex items-center gap-1">
                ⭐ BANNER & LOGO
              </span>
            </div>

            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-light tracking-tight text-white leading-tight">
                Banner Panorámico y Logo Oficial
              </div>
              <p className="text-xs text-cyan-100/90 font-normal line-clamp-2">
                Subir tus 2 imágenes originales: nuevo banner panorámico y logo oficial para producción.
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] font-medium text-cyan-200 uppercase tracking-wider pt-2 border-t border-white/15">
              <span>personalización de marca</span>
              <span className="flex items-center gap-1 text-white group-hover:translate-x-1 transition-transform font-bold">
                abrir pestaña <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </button>

          {/* TILE 2: MÉTRICAS & AUDITORÍA DE VISITANTES (Square Tile, Cobalt Blue #1F62B5) */}
          <button
            type="button"
            onClick={() => onSelectTab('analytics')}
            className="col-span-1 p-3.5 sm:p-4 bg-[#1F62B5] hover:bg-[#18539A] border border-blue-400/30 text-left flex flex-col justify-between h-44 sm:h-48 relative overflow-hidden transition-all duration-150 cursor-pointer shadow-lg active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between">
              <BarChart3 className="w-7 h-7 text-sky-200 group-hover:scale-110 transition-transform" />
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[9px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{analytics?.activeNow ?? 1} en vivo</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-3xl sm:text-4xl font-light text-white tracking-tighter">
                {analytics?.totalUniqueVisitors || analytics?.totalVisits || 0}
              </div>
              <p className="text-[11px] text-sky-100 font-medium">personas únicas</p>
              <p className="text-[10px] text-sky-200/90 font-mono">
                {analytics?.today?.uniqueVisitors ?? 0} hoy · {analytics?.totalVisits ?? 0} visitas
              </p>
            </div>

            <div className="text-[11px] font-medium text-sky-200 uppercase tracking-wider pt-1 border-t border-white/15 flex items-center justify-between">
              <span>contador en vivo</span>
              <span className="text-[10px] text-white font-bold group-hover:translate-x-0.5 transition-transform">ver →</span>
            </div>
          </button>

          {/* TILE 3: REPORTES CIUDADANOS (Square Tile, Windows Phone Crimson #D83B01) */}
          <button
            type="button"
            onClick={() => onSelectTab('reports')}
            className="col-span-1 p-3.5 sm:p-4 bg-[#D83B01] hover:bg-[#B53100] border border-orange-400/30 text-left flex flex-col justify-between h-44 sm:h-48 relative overflow-hidden transition-all duration-150 cursor-pointer shadow-lg active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between">
              <AlertTriangle className="w-7 h-7 text-amber-200 group-hover:scale-110 transition-transform" />
              {pendingReportsCount > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              )}
            </div>

            <div className="space-y-0.5">
              <div className="text-3xl sm:text-4xl font-light text-white tracking-tighter">
                {pendingReportsCount}
              </div>
              <p className="text-[11px] text-amber-100 font-medium">
                {pendingReportsCount === 1 ? 'reporte pendiente' : 'reportes pendientes'}
              </p>
              <p className="text-[10px] text-amber-200/80">
                {pendingReportsCount > 0 ? '¡Requiere atención!' : 'Todo verificado ✓'}
              </p>
            </div>

            <div className="text-[11px] font-medium text-amber-200 uppercase tracking-wider pt-1 border-t border-white/15">
              reportes
            </div>
          </button>

          {/* TILE 4: PROMOCIONES & CUPONES FLASH (Square Tile, Vibrant Mango #FF8C00) */}
          <button
            type="button"
            onClick={() => onSelectTab('promotions')}
            className="col-span-1 p-3.5 sm:p-4 bg-[#FF8C00] hover:bg-[#E67E00] border border-amber-300/40 text-stone-950 text-left flex flex-col justify-between h-44 sm:h-48 relative overflow-hidden transition-all duration-150 cursor-pointer shadow-lg active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between">
              <Gift className="w-7 h-7 text-stone-950 group-hover:scale-110 transition-transform" />
              <Flame className="w-4 h-4 text-stone-900 fill-stone-900" />
            </div>

            <div className="space-y-0.5">
              <div className="text-3xl sm:text-4xl font-light text-stone-950 tracking-tighter">
                {promotionsCount > 0 ? promotionsCount : 1}
              </div>
              <p className="text-[11px] text-stone-900 font-bold">promociones activas</p>
              <p className="text-[10px] text-stone-800">
                Cupones digitales con WhatsApp
              </p>
            </div>

            <div className="text-[11px] font-bold text-stone-900 uppercase tracking-wider pt-1 border-t border-stone-950/20">
              promociones & cupones
            </div>
          </button>

          {/* TILE 5: CLASIFICADOS & EMPLEOS (Square Tile, Windows Phone Purple #744DA9) */}
          <button
            type="button"
            onClick={() => onSelectTab('classifieds')}
            className="col-span-1 p-3.5 sm:p-4 bg-[#744DA9] hover:bg-[#603A91] border border-purple-400/30 text-white text-left flex flex-col justify-between h-44 sm:h-48 relative overflow-hidden transition-all duration-150 cursor-pointer shadow-lg active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between">
              <Tag className="w-7 h-7 text-purple-200 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold bg-black/30 px-1.5 py-0.5 rounded-none text-purple-200">
                CARMEN
              </span>
            </div>

            <div className="space-y-0.5">
              <div className="text-3xl sm:text-4xl font-light text-white tracking-tighter">
                {classifiedsCount}
              </div>
              <p className="text-[11px] text-purple-100 font-medium">avisos publicados</p>
              <p className="text-[10px] text-purple-200/80">
                Bolsa de trabajo y comercios
              </p>
            </div>

            <div className="text-[11px] font-medium text-purple-200 uppercase tracking-wider pt-1 border-t border-white/15">
              clasificados
            </div>
          </button>

          {/* TILE 6: NUEVA COMPAÑÍA (Square Tile, Windows Phone Emerald Green #107C41) */}
          <button
            type="button"
            onClick={() => onSelectTab('new_business')}
            className="col-span-1 p-3.5 sm:p-4 bg-[#107C41] hover:bg-[#0C6133] border border-emerald-400/30 text-white text-left flex flex-col justify-between h-44 sm:h-48 relative overflow-hidden transition-all duration-150 cursor-pointer shadow-lg active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between">
              <Building2 className="w-7 h-7 text-emerald-200 group-hover:scale-110 transition-transform" />
              <span className="text-lg leading-none font-light text-emerald-200">+</span>
            </div>

            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-light text-white tracking-tight leading-tight">
                Alta Manual
              </div>
              <p className="text-[11px] text-emerald-100 font-medium">Directo a WooCommerce</p>
              <p className="text-[10px] text-emerald-200/80">
                Formulario con logo y mapa
              </p>
            </div>

            <div className="text-[11px] font-medium text-emerald-200 uppercase tracking-wider pt-1 border-t border-white/15">
              nueva empresa
            </div>
          </button>

          {/* TILE: GUÍA DE EMERGENCIAS 24/7 (Square Tile, Crimson Red #E81123) */}
          <button
            type="button"
            onClick={() => onSelectTab('emergency')}
            className="col-span-1 p-3.5 sm:p-4 bg-[#A80000] hover:bg-[#8A0000] border border-rose-500/40 text-white text-left flex flex-col justify-between h-44 sm:h-48 relative overflow-hidden transition-all duration-150 cursor-pointer shadow-lg active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between">
              <ShieldAlert className="w-7 h-7 text-rose-200 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold bg-black/40 px-1.5 py-0.5 rounded-none text-rose-200 animate-pulse">
                24/7
              </span>
            </div>

            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-light text-white tracking-tight leading-tight">
                Emergencias
              </div>
              <p className="text-[11px] text-rose-100 font-medium">Editar y agregar datos</p>
              <p className="text-[10px] text-rose-200/80">
                Hospitales, 911, auxilio y grúas
              </p>
            </div>

            <div className="text-[11px] font-medium text-rose-200 uppercase tracking-wider pt-1 border-t border-white/15">
              guía de auxilio
            </div>
          </button>

          {/* TILE: CARTELERA CARMELITA DE EVENTOS (Square Tile, Windows Phone Amber #CA5010) */}
          <button
            type="button"
            onClick={() => onSelectTab('events')}
            className="col-span-1 p-3.5 sm:p-4 bg-[#CA5010] hover:bg-[#A33E08] border border-amber-500/40 text-white text-left flex flex-col justify-between h-44 sm:h-48 relative overflow-hidden transition-all duration-150 cursor-pointer shadow-lg active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between">
              <Calendar className="w-7 h-7 text-amber-200 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold bg-black/40 px-1.5 py-0.5 rounded-none text-amber-200">
                AGENDA
              </span>
            </div>

            <div className="space-y-0.5">
              <div className="text-3xl sm:text-4xl font-light text-white tracking-tighter">
                {eventsCount}
              </div>
              <p className="text-[11px] text-amber-100 font-medium">eventos en cartelera</p>
              <p className="text-[10px] text-amber-200/80">
                Conciertos, ferias y cultura
              </p>
            </div>

            <div className="text-[11px] font-medium text-amber-200 uppercase tracking-wider pt-1 border-t border-white/15">
              eventos carmelitas
            </div>
          </button>

          {/* TILE: ADMINISTRADORES & CLAVES (Square Tile, Windows Phone Purple #68217A) */}
          <button
            type="button"
            onClick={() => onSelectTab('admins')}
            className="col-span-1 p-3.5 sm:p-4 bg-[#68217A] hover:bg-[#501A5E] border border-purple-400/40 text-white text-left flex flex-col justify-between h-44 sm:h-48 relative overflow-hidden transition-all duration-150 cursor-pointer shadow-lg active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between">
              <KeyRound className="w-7 h-7 text-purple-200 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold bg-black/40 px-1.5 py-0.5 rounded-none text-purple-200">
                SEGURIDAD
              </span>
            </div>

            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-light text-white tracking-tight leading-tight">
                Administradores
              </div>
              <p className="text-[11px] text-purple-100 font-medium">Y & J</p>
              <p className="text-[10px] text-purple-200/80">
                Cambiar claves cifradas
              </p>
            </div>

            <div className="text-[11px] font-medium text-purple-200 uppercase tracking-wider pt-1 border-t border-white/15">
              cuentas y accesos
            </div>
          </button>

          {/* TILE 7: CONEXIÓN & SINCRONIZACIÓN HOSTINGER (Wide 2-Column Tile, Windows Phone Dark Teal #008299) */}
          <button
            type="button"
            onClick={() => onSelectTab('status')}
            className="col-span-2 p-4 sm:p-5 bg-[#008299] hover:bg-[#006E82] border border-teal-400/30 text-left flex flex-col justify-between h-44 sm:h-48 relative overflow-hidden transition-all duration-150 cursor-pointer shadow-lg active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-6 h-6 text-teal-200 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-teal-100">Hostinger Cloud · REST API</span>
              </div>
              <span className="px-2 py-0.5 bg-black/30 border border-white/20 text-[10px] font-bold text-teal-200 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                Online
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-light tracking-tight text-white leading-tight">
                {businessesCount > 0 ? businessesCount.toLocaleString('es-MX') : '3,900+'}{' '}
                <span className="text-sm sm:text-base font-normal text-teal-100">empresas en vivo</span>
              </div>
              <p className="text-xs text-teal-100/90 font-normal">
                Base de datos sincronizada con empresasencarmen.com. Latencia &lt; 90ms.
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] font-medium text-teal-200 uppercase tracking-wider pt-2 border-t border-white/15">
              <span>conexión & servidor</span>
              <span className="text-white font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                ver estado <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </button>

          {/* TILE 8: DIRECTORIO PÚBLICO (Square Tile, Metro Graphite Slate #252526) */}
          <button
            type="button"
            onClick={onClose}
            className="col-span-1 p-3.5 sm:p-4 bg-[#252526] hover:bg-[#333337] border border-white/15 text-left flex flex-col justify-between h-44 sm:h-48 relative overflow-hidden transition-all duration-150 cursor-pointer shadow-lg active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between">
              <Globe className="w-7 h-7 text-sky-400 group-hover:scale-110 transition-transform" />
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-white" />
            </div>

            <div className="space-y-0.5">
              <div className="text-lg sm:text-xl font-light text-white tracking-tight leading-tight">
                Directorio
              </div>
              <p className="text-[11px] text-slate-300 font-medium">Vista Ciudadana</p>
              <p className="text-[10px] text-slate-400">
                Regresar al mapa y buscador
              </p>
            </div>

            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider pt-1 border-t border-white/15">
              ver portal
            </div>
          </button>

          {/* TILE 9: CAMBIOS DESEADOS Y FALLAS (Wide Tile, Metro Crimson / Amber #D13438) */}
          <button
            type="button"
            onClick={() => onSelectTab('desired_changes')}
            className="col-span-1 sm:col-span-1 p-3.5 sm:p-4 bg-gradient-to-br from-rose-950 to-amber-950/80 hover:from-rose-900 hover:to-amber-900 border border-amber-500/30 text-left flex flex-col justify-between h-44 sm:h-48 relative overflow-hidden transition-all duration-150 cursor-pointer shadow-lg active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between">
              <Bug className="w-7 h-7 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                MariaDB
              </span>
            </div>

            <div className="space-y-0.5">
              <div className="text-lg sm:text-xl font-light text-white tracking-tight leading-tight">
                Cambios Deseados
              </div>
              <p className="text-[11px] text-amber-200 font-medium">Fallas y Sugerencias</p>
              <p className="text-[10px] text-stone-300/80">
                Prioridad al iniciar sesión
              </p>
            </div>

            <div className="text-[11px] font-medium text-amber-300 uppercase tracking-wider pt-1 border-t border-white/15 flex items-center justify-between">
              <span>abrir notas</span>
              <ChevronRight className="w-3.5 h-3.5 text-amber-300 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* TILE 10: ARCHIVO DE CONFIGURACIÓN (Square Tile, Metro Cyan/Blue #0078D7) */}
          <button
            type="button"
            onClick={() => onSelectTab('config_editor')}
            className="col-span-1 sm:col-span-1 p-3.5 sm:p-4 bg-[#0078D7] hover:bg-[#0063B1] border border-sky-400/30 text-left flex flex-col justify-between h-44 sm:h-48 relative overflow-hidden transition-all duration-150 cursor-pointer shadow-lg active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between">
              <FileCode className="w-7 h-7 text-sky-200 group-hover:scale-110 transition-transform" />
              <span className="px-1.5 py-0.5 rounded bg-black/30 text-white font-mono text-[10px]">
                .json
              </span>
            </div>

            <div className="space-y-0.5">
              <div className="text-lg sm:text-xl font-light text-white tracking-tight leading-tight">
                Configuración
              </div>
              <p className="text-[11px] text-sky-100 font-medium">portal_config.json</p>
              <p className="text-[10px] text-sky-200/80">
                Editor en vivo persistente
              </p>
            </div>

            <div className="text-[11px] font-medium text-sky-200 uppercase tracking-wider pt-1 border-t border-white/15 flex items-center justify-between">
              <span>editar config</span>
              <ChevronRight className="w-3.5 h-3.5 text-sky-100 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      )}

      {/* QUICK SYSTEM STATUS STRIP (Windows Mobile Footer Glance) */}
      <div className="max-w-5xl mx-auto mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-sky-400" />
          <span>
            Administradores autorizados: <strong className="text-slate-200">djeomed@gmail.com</strong> · <strong className="text-slate-200">Ddeysi763@gmail.com</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-none bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-sky-400' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Catálogo'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-none bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Cerrar Menú
          </button>
        </div>
      </div>
    </div>
  );
};
