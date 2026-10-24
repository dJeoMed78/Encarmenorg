import React, { useState } from 'react';
import {
  Building2,
  Sparkles,
  Tag,
  Gift,
  Calendar,
  Search,
  Home,
  BarChart3,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { SiteAnalytics, Business } from '../types';

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
}

export const AdminMacOSDesktop: React.FC<AdminMacOSDesktopProps> = ({
  businessesCount,
  businesses = [],
  pendingReportsCount,
  classifiedsCount,
  promotionsCount,
  onTriggerSync,
  onSelectTab,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [linksEnabled, setLinksEnabled] = useState(true);
  const [bannerEnabled, setBannerEnabled] = useState(true);
  const [bannerEmphasis, setBannerEmphasis] = useState(true);
  const [mainLinkUrl, setMainLinkUrl] = useState('https://encarmen.org/');

  const sampleOrRealBusinesses = businesses.length > 0
    ? businesses
    : [
        { id: 1, name: 'Empresa G.', category: 'Categoría', phone: 'contacto@encarmen.org', colonia: 'Centro' } as any,
        { id: 2, name: 'Empresa Uno', category: 'Categoría', phone: '(938) 381-5679', colonia: 'Centro' } as any,
        { id: 3, name: 'Empresa de Carmen', category: 'Categoría', phone: '(938) 932-8990', colonia: 'Centro' } as any,
        { id: 4, name: 'Empresa LS', category: 'Categoría', phone: '(938) 223-9833', colonia: 'Centro' } as any
      ];

  const filteredBusinesses = sampleOrRealBusinesses
    .filter((b: any) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (b.name || '').toLowerCase().includes(q) ||
        (b.category || '').toLowerCase().includes(q) ||
        (b.phone || '').toLowerCase().includes(q)
      );
    })
    .slice(0, 5);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative overflow-hidden select-none p-4 sm:p-6 pb-24">
      {/* Fondo luminoso de pantalla completa del Puente Zacatal al atardecer */}
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: "url('/puente.jpg')" }}
      />

      {/* Ventana Flotante Central macOS en Cristal Blanco Translúcido */}
      <div
        className="relative z-10 w-full max-w-5xl rounded-[24px] border border-white/85 shadow-[0_28px_80px_rgba(0,0,0,0.42)] overflow-hidden flex flex-col max-h-[80vh] text-stone-800"
        style={{
          background: 'rgba(245, 247, 250, 0.78)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
        }}
      >
        {/* Barra de Título Superior macOS con Semáforo y Título Centrado */}
        <div className="h-10 px-4 bg-white/60 border-b border-stone-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              title="Cerrar"
              className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] hover:opacity-80 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => onTriggerSync()}
              title="Sincronizar"
              className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] hover:opacity-80 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => onSelectTab('businesses')}
              title="Expandir Catálogo"
              className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] hover:opacity-80 cursor-pointer"
            />
          </div>

          <div className="text-xs sm:text-[13px] font-bold text-stone-700 tracking-tight">
            Empresas en Carmen OS - Panel de Administración
          </div>

          <div className="w-14" />
        </div>

        {/* Cuerpo de la Ventana: Barra Lateral Izquierda + Panel Ejecutivo */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Barra Lateral Izquierda en Cristal Claro */}
          <aside className="w-36 sm:w-44 bg-white/45 border-r border-stone-200/70 p-3 flex flex-col gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onSelectTab('businesses')}
              className="w-full px-3 py-2 rounded-xl bg-sky-500/15 border border-sky-400/40 text-sky-700 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <Home className="w-4 h-4 text-sky-600" />
              <span>Empresas</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('ai_assistant')}
              className="w-full px-3 py-2 rounded-xl hover:bg-white/70 text-stone-600 hover:text-stone-900 text-xs font-medium flex items-center gap-2 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-stone-500" />
              <span className="truncate">Asistente IA</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('classifieds')}
              className="w-full px-3 py-2 rounded-xl hover:bg-white/70 text-stone-600 hover:text-stone-900 text-xs font-medium flex items-center gap-2 transition cursor-pointer"
            >
              <Tag className="w-4 h-4 text-stone-500" />
              <span className="truncate">Clasificados</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('promotions')}
              className="w-full px-3 py-2 rounded-xl hover:bg-white/70 text-stone-600 hover:text-stone-900 text-xs font-medium flex items-center gap-2 transition cursor-pointer"
            >
              <Gift className="w-4 h-4 text-stone-500" />
              <span className="truncate">Promociones</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('events')}
              className="w-full px-3 py-2 rounded-xl hover:bg-white/70 text-stone-600 hover:text-stone-900 text-xs font-medium flex items-center gap-2 transition cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-stone-500" />
              <span className="truncate">Eventos</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('analytics')}
              className="w-full px-3 py-2 rounded-xl hover:bg-white/70 text-stone-600 hover:text-stone-900 text-xs font-medium flex items-center gap-2 transition cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 text-stone-500" />
              <span className="truncate">Métricas</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('reports')}
              className="w-full px-3 py-2 rounded-xl hover:bg-white/70 text-stone-600 hover:text-stone-900 text-xs font-medium flex items-center justify-between transition cursor-pointer"
            >
              <span className="flex items-center gap-2 truncate">
                <AlertTriangle className="w-4 h-4 text-stone-500" />
                <span className="truncate">Reportes</span>
              </span>
              {pendingReportsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {pendingReportsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('config_editor')}
              className="w-full px-3 py-2 rounded-xl hover:bg-white/70 text-stone-600 hover:text-stone-900 text-xs font-medium flex items-center gap-2 transition cursor-pointer"
            >
              <Settings className="w-4 h-4 text-stone-500" />
              <span className="truncate">Ajustes</span>
            </button>
          </aside>

          {/* Contenido Principal del Panel Ejecutivo */}
          <div className="flex-1 overflow-y-auto pt-5 px-5 pb-24 space-y-4">
            <h2 className="text-base sm:text-lg font-extrabold text-stone-800 tracking-tight">
              Executive dashboard
            </h2>

            {/* 4 Tarjetas KPI Blancas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* KPI 1: Empresas Activas */}
              <div
                onClick={() => onSelectTab('businesses')}
                className="p-4 pt-4 rounded-2xl bg-white/90 hover:bg-white border border-white shadow-xs cursor-pointer transition flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <span className="text-2xl sm:text-3xl font-extrabold text-stone-900 leading-snug">
                    {businessesCount}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                    ↗ +7 Trend
                  </span>
                </div>
                <span className="text-xs font-semibold text-stone-600 mt-2">
                  Empresas Activas
                </span>
              </div>

              {/* KPI 2: Promociones Vigentes */}
              <div
                onClick={() => onSelectTab('promotions')}
                className="p-4 pt-4 rounded-2xl bg-white/90 hover:bg-white border border-white shadow-xs cursor-pointer transition flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <span className="text-2xl sm:text-3xl font-extrabold text-stone-900 leading-snug">
                    {promotionsCount || 42}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                    Vigentes
                  </span>
                </div>
                <span className="text-xs font-semibold text-stone-600 mt-2">
                  Promociones Vigentes
                </span>
              </div>

              {/* KPI 3: Clasificados por Aprobar */}
              <div
                onClick={() => onSelectTab('classifieds')}
                className="p-4 pt-4 rounded-2xl bg-white/90 hover:bg-white border border-white shadow-xs cursor-pointer transition flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <span className="text-2xl sm:text-3xl font-extrabold text-stone-900 leading-snug">
                    {classifiedsCount || 15}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Pending
                  </span>
                </div>
                <span className="text-xs font-semibold text-stone-600 mt-2">
                  Clasificados por Aprobar
                </span>
              </div>

              {/* KPI 4: Estado MariaDB Online */}
              <div
                onClick={() => onSelectTab('status')}
                className="p-4 pt-4 rounded-2xl bg-white/90 hover:bg-white border border-white shadow-xs cursor-pointer transition flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-600">
                    Estado MariaDB:
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 leading-snug mt-1">
                  Online
                </div>
              </div>
            </div>

            {/* Bloque Central: Gestión de Ligas y Banner Publicitario */}
            <div className="p-4 rounded-2xl bg-white/90 border border-white shadow-xs space-y-3">
              <h3 className="text-xs sm:text-sm font-extrabold text-stone-800">
                Gestión de Ligas y Banner Publicitario
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Columna Izquierda: Links */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-stone-500">Links</div>
                  <input
                    type="text"
                    value={mainLinkUrl}
                    onChange={(e) => setMainLinkUrl(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-stone-100 border border-stone-200 text-xs text-stone-800 focus:outline-none focus:border-sky-400"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <div className="text-[11px] font-semibold text-stone-600">Banner de Énfasis</div>
                      <button
                        type="button"
                        onClick={() => onSelectTab('brand_media')}
                        className="mt-1 px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 border border-stone-300 text-[11px] font-semibold text-stone-700 cursor-pointer"
                      >
                        Manage Links
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBannerEmphasis(!bannerEmphasis)}
                      className={`w-10 h-5 rounded-full transition-colors p-0.5 cursor-pointer ${
                        bannerEmphasis ? 'bg-sky-500' : 'bg-stone-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          bannerEmphasis ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Columna Derecha: Banner Publicitario */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-stone-500">
                      Links y Banner Publicitario
                    </span>
                    <button
                      type="button"
                      onClick={() => setLinksEnabled(!linksEnabled)}
                      className={`w-10 h-5 rounded-full transition-colors p-0.5 cursor-pointer ${
                        linksEnabled ? 'bg-sky-500' : 'bg-stone-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          linksEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value="Banner Footer Publicitario..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-stone-100 border border-stone-200 text-xs text-stone-600"
                    />
                    <button
                      type="button"
                      onClick={() => onSelectTab('brand_media')}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200 text-[11px] font-semibold text-stone-600 cursor-pointer"
                    >
                      Cambiar...
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-stone-600">
                        Activar Banner Publicitario
                      </span>
                      <button
                        type="button"
                        onClick={() => setBannerEnabled(!bannerEnabled)}
                        className={`w-9 h-5 rounded-full transition-colors p-0.5 cursor-pointer ${
                          bannerEnabled ? 'bg-sky-500' : 'bg-stone-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            bannerEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectTab('brand_media')}
                        className="px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 border border-stone-300 text-[11px] font-semibold text-stone-700 cursor-pointer"
                      >
                        Manage Links
                      </button>
                      <button
                        type="button"
                        onClick={() => setBannerEnabled(false)}
                        className="px-2.5 py-1 rounded-md bg-stone-100 hover:bg-rose-50 border border-stone-300 text-[11px] font-semibold text-stone-700 cursor-pointer"
                      >
                        Suspender
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloque Inferior: Control de Empresas */}
            <div className="p-4 rounded-2xl bg-white/90 border border-white shadow-xs space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs sm:text-sm font-extrabold text-stone-800">
                  Control de Empresas
                </h3>
                <div className="relative w-44 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search"
                    className="w-full pl-8 pr-3 py-1 rounded-lg bg-stone-100 border border-stone-200 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500 text-[11px] font-semibold">
                      <th className="py-1.5 px-2">Empresa</th>
                      <th className="py-1.5 px-2">Categoría</th>
                      <th className="py-1.5 px-2">Contacto</th>
                      <th className="py-1.5 px-2">Estado</th>
                      <th className="py-1.5 px-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/70">
                    {filteredBusinesses.map((biz: any, idx: number) => (
                      <tr key={biz.id || idx} className="hover:bg-stone-100/70 transition-colors">
                        <td className="py-2 px-2 font-semibold text-stone-800 flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{biz.name}</span>
                        </td>
                        <td className="py-2 px-2 text-stone-600 truncate max-w-[140px]">
                          {biz.category || 'Comercio'}
                        </td>
                        <td className="py-2 px-2 text-stone-600">
                          {biz.phone || biz.whatsapp || '938 389 5009'}
                        </td>
                        <td className="py-2 px-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                            Online
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onSelectTab('businesses')}
                            className="px-2.5 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 font-semibold text-[11px] cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectTab('businesses')}
                            className="px-2.5 py-0.5 rounded-md bg-rose-100 hover:bg-rose-200 border border-rose-200 text-rose-700 font-semibold text-[11px] cursor-pointer"
                          >
                            Suspender
                          </button>
                        </td>
                      </tr>
                    ))}
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
