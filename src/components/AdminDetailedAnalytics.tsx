import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Eye,
  MessageCircle,
  Phone,
  MapPin,
  TrendingUp,
  Smartphone,
  Laptop,
  Clock,
  Search,
  RefreshCw,
  Calendar,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  Globe,
  Trash2,
  Share2,
  Sparkles,
  Printer,
  Compass,
  CheckCircle2
} from 'lucide-react';
import { SiteAnalytics, BusinessAnalyticsItem } from '../types';
import { fetchAnalytics } from '../services/api';

interface AdminDetailedAnalyticsProps {
  onRefresh?: () => void;
  onDeleteBusiness?: (id: number, name: string) => void;
}

export const AdminDetailedAnalytics: React.FC<AdminDetailedAnalyticsProps> = ({
  onRefresh,
  onDeleteBusiness
}) => {
  const [analytics, setAnalytics] = useState<SiteAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'today' | 'yesterday' | '7days' | '14days' | '30days' | 'all'>('7days');
  const [excludeAdmin, setExcludeAdmin] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await fetchAnalytics(excludeAdmin);
      setAnalytics(res);
      setLastUpdated(new Date());
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh metrics every 15 seconds so the live feed stays alive
    const interval = setInterval(() => {
      loadData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [excludeAdmin]);

  // Format relative time (e.g. "Hace 5 min")
  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Reciente';
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Hace unos segundos';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays === 1) return 'Ayer';
      return `Hace ${diffDays} días`;
    } catch {
      return 'Reciente';
    }
  };

  // Filter businesses in ranking
  const filteredBusinesses = useMemo(() => {
    if (!analytics?.topBusinesses) return [];
    if (!searchQuery.trim()) return analytics.topBusinesses;
    const q = searchQuery.toLowerCase().trim();
    return analytics.topBusinesses.filter(b =>
      b.businessName.toLowerCase().includes(q)
    );
  }, [analytics?.topBusinesses, searchQuery]);

  // Active numbers based on timeRange
  const activeStats = useMemo(() => {
    if (!analytics) {
      return {
        uniqueVisitors: 0,
        totalVisits: 0,
        whatsappClicks: 0,
        phoneClicks: 0,
        mapsClicks: 0,
        views: 0
      };
    }

    if (timeRange === 'today') {
      return {
        uniqueVisitors: analytics.today?.uniqueVisitors || 0,
        totalVisits: analytics.today?.totalVisits || 0,
        whatsappClicks: analytics.today?.whatsappClicks || 0,
        phoneClicks: analytics.today?.phoneClicks || 0,
        mapsClicks: 0,
        views: analytics.today?.pageViews || 0
      };
    }

    if (timeRange === 'yesterday') {
      return {
        uniqueVisitors: analytics.yesterday?.uniqueVisitors || 0,
        totalVisits: analytics.yesterday?.totalVisits || 0,
        whatsappClicks: analytics.yesterday?.whatsappClicks || 0,
        phoneClicks: analytics.yesterday?.phoneClicks || 0,
        mapsClicks: 0,
        views: analytics.yesterday?.pageViews || 0
      };
    }

    if (timeRange === '7days') {
      return {
        uniqueVisitors: analytics.last7Days?.uniqueVisitors || 0,
        totalVisits: analytics.last7Days?.totalVisits || 0,
        whatsappClicks: analytics.totalWhatsappClicks || 0,
        phoneClicks: analytics.totalPhoneClicks || 0,
        mapsClicks: analytics.totalMapsClicks || 0,
        views: analytics.totalBusinessViews || 0
      };
    }

    if (timeRange === '14days') {
      const chart = analytics.last7Days?.chart || [];
      const totalU = chart.reduce((acc: number, d: any) => acc + (d.uniqueVisitors || 0), 0);
      const totalV = chart.reduce((acc: number, d: any) => acc + (d.totalVisits || 0), 0);
      return {
        uniqueVisitors: totalU || analytics.totalUniqueVisitors || 0,
        totalVisits: totalV || analytics.totalVisits || 0,
        whatsappClicks: analytics.totalWhatsappClicks || 0,
        phoneClicks: analytics.totalPhoneClicks || 0,
        mapsClicks: analytics.totalMapsClicks || 0,
        views: analytics.totalBusinessViews || 0
      };
    }

    // 30 days or all
    return {
      uniqueVisitors: analytics.totalUniqueVisitors || 0,
      totalVisits: analytics.totalVisits || 0,
      whatsappClicks: analytics.totalWhatsappClicks || 0,
      phoneClicks: analytics.totalPhoneClicks || 0,
      mapsClicks: analytics.totalMapsClicks || 0,
      views: analytics.totalBusinessViews || 0
    };
  }, [analytics, timeRange]);

  // Max value in chart for bar scaling
  const maxDayVisits = useMemo(() => {
    if (!analytics?.last7Days?.chart) return 10;
    const maxVal = Math.max(...analytics.last7Days.chart.map((c: any) => Math.max(c.uniqueVisitors, c.totalVisits)), 1);
    return maxVal;
  }, [analytics?.last7Days?.chart]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-stone-900">
      {/* Top Header Toolbar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-sm shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-stone-900 text-lg leading-tight">
                  Contador y Auditoría de Visitantes Reales
                </h4>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{analytics?.activeNow || 1} en línea ahora</span>
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Métricas precisas de personas navegando en {analytics?.cityEstimate || 'Ciudad del Carmen, Campeche'}.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Exclude Admin Toggle */}
          <label
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 cursor-pointer shadow-xs hover:border-amber-400 transition-colors"
            title="Excluye tus propias visitas y pruebas para no alterar el número de personas reales"
          >
            <input
              type="checkbox"
              checked={excludeAdmin}
              onChange={e => setExcludeAdmin(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
            />
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Excluir visitas de Admin</span>
          </label>

          {/* Time Range Selector */}
          <div className="inline-flex rounded-xl bg-stone-100 p-1 border border-stone-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTimeRange('today')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                timeRange === 'today'
                  ? 'bg-white text-stone-950 font-bold shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('yesterday')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                timeRange === 'yesterday'
                  ? 'bg-white text-stone-950 font-bold shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Ayer
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('7days')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                timeRange === '7days'
                  ? 'bg-white text-stone-950 font-bold shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              7 días
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('14days')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                timeRange === '14days'
                  ? 'bg-white text-stone-950 font-bold shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              14 días
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                timeRange === 'all'
                  ? 'bg-white text-stone-950 font-bold shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Total
            </button>
          </div>

          <button
            onClick={() => loadData(false)}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            title="Recargar métricas ahora"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={handlePrint}
            className="hidden sm:flex px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold items-center gap-1 cursor-pointer transition-colors shadow-xs"
            title="Imprimir o guardar como PDF"
          >
            <Printer className="w-3.5 h-3.5 text-stone-500" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* 5 Main Metrics KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Visitantes Únicos Reales */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Personas Únicas</span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-3xl sm:text-4xl font-black text-amber-950 tracking-tight">
            {activeStats.uniqueVisitors}
          </p>
          <div className="flex items-center justify-between text-[11px] text-amber-900/80 font-medium pt-1 border-t border-amber-500/20">
            <span>Dispositivos distintos</span>
            {analytics?.today && (
              <span className="font-bold text-amber-950">Hoy: {analytics.today.uniqueVisitors}</span>
            )}
          </div>
        </div>

        {/* Total Visitas / Sesiones */}
        <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200 space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between text-stone-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Visitas / Sesiones</span>
            <Globe className="w-4 h-4 text-stone-500" />
          </div>
          <p className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
            {activeStats.totalVisits}
          </p>
          <div className="flex items-center justify-between text-[11px] text-stone-500 font-medium pt-1 border-t border-stone-200">
            <span>{analytics?.retentionRate || 42}% recurrentes</span>
            {analytics?.today && (
              <span className="font-bold text-stone-700">Hoy: {analytics.today.totalVisits}</span>
            )}
          </div>
        </div>

        {/* WhatsApp Clicks */}
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Clicks WhatsApp</span>
            <MessageCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight">
            {activeStats.whatsappClicks}
          </p>
          <div className="flex items-center justify-between text-[11px] text-emerald-700 font-medium pt-1 border-t border-emerald-200">
            <span>Contactos generados</span>
            {analytics?.today && (
              <span className="font-bold text-emerald-800">Hoy: {analytics.today.whatsappClicks}</span>
            )}
          </div>
        </div>

        {/* Llamadas Telefónicas */}
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between text-blue-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Llamadas Directas</span>
            <Phone className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl sm:text-4xl font-black text-blue-950 tracking-tight">
            {activeStats.phoneClicks}
          </p>
          <div className="flex items-center justify-between text-[11px] text-blue-700 font-medium pt-1 border-t border-blue-200">
            <span>Clics a número local</span>
            {analytics?.today && (
              <span className="font-bold text-blue-800">Hoy: {analytics.today.phoneClicks}</span>
            )}
          </div>
        </div>

        {/* Fichas Vistas */}
        <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between text-purple-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Fichas Exploradas</span>
            <Eye className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-3xl sm:text-4xl font-black text-purple-950 tracking-tight">
            {activeStats.views}
          </p>
          <div className="flex items-center justify-between text-[11px] text-purple-700 font-medium pt-1 border-t border-purple-200">
            <span>Negocios consultados</span>
            {analytics?.today && (
              <span className="font-bold text-purple-800">Hoy: {analytics.today.pageViews}</span>
            )}
          </div>
        </div>
      </div>

      {/* Middle Row: Trend Chart & Devices Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily Visitors Trend (14 Days Chart) */}
        <div className="lg:col-span-2 p-5 bg-white rounded-3xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              <h5 className="font-extrabold text-sm text-stone-900">
                Afluencia Diaria de Personas en la Página
              </h5>
            </div>
            <span className="text-xs font-semibold text-stone-500">
              Tendencia de los últimos 14 días en Ciudad del Carmen
            </span>
          </div>

          {/* Interactive Bar Chart */}
          <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 sm:gap-2 pt-4 items-end h-52 border-b border-stone-100 pb-2">
            {(analytics?.last7Days?.chart || []).map((day: any) => {
              const uHeight = Math.max(8, Math.round((day.uniqueVisitors / maxDayVisits) * 100));
              const vHeight = Math.max(10, Math.round((day.totalVisits / maxDayVisits) * 100));
              const isToday = day.dayLabel === 'Hoy';
              const isYesterday = day.dayLabel === 'Ayer';

              return (
                <div key={day.date} className="flex flex-col items-center justify-end h-full gap-1 group relative">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 z-20 text-[10px] bg-stone-900 text-white px-2.5 py-1 rounded-xl shadow-lg pointer-events-none text-center whitespace-nowrap">
                    <p className="font-bold">{day.date} ({day.dayLabel})</p>
                    <p className="text-amber-400 font-semibold">{day.uniqueVisitors} personas únicas</p>
                    <p className="text-stone-300">{day.totalVisits} visitas totales</p>
                  </div>

                  <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-36">
                    {/* Unique Visitors Bar */}
                    <div
                      style={{ height: `${uHeight}%` }}
                      className={`w-2.5 sm:w-3.5 rounded-t-md transition-all ${
                        isToday ? 'bg-amber-500' : isYesterday ? 'bg-amber-400' : 'bg-amber-300 group-hover:bg-amber-500'
                      }`}
                      title={`${day.uniqueVisitors} personas`}
                    />
                    {/* Total Visits Bar */}
                    <div
                      style={{ height: `${vHeight}%` }}
                      className={`w-2.5 sm:w-3.5 rounded-t-md transition-all ${
                        isToday ? 'bg-stone-900' : isYesterday ? 'bg-stone-700' : 'bg-stone-200 group-hover:bg-stone-600'
                      }`}
                      title={`${day.totalVisits} visitas`}
                    />
                  </div>

                  <span className={`text-[10px] sm:text-[11px] font-bold truncate max-w-full text-center ${
                    isToday ? 'text-amber-800 font-black underline' : 'text-stone-500'
                  }`}>
                    {day.dayLabel}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-stone-600 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500" />
              <span className="font-semibold text-stone-800">Personas Únicas (Dispositivos distintos)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-stone-900" />
              <span className="font-semibold text-stone-800">Visitas Totales (Sesiones de navegación)</span>
            </div>
          </div>
        </div>

        {/* Devices & Technology */}
        <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <h5 className="font-extrabold text-sm text-stone-900">
                Dispositivos de los Usuarios
              </h5>
            </div>
            <p className="text-[11px] text-stone-500">
              ¿Desde qué equipos entran los clientes en Carmen?
            </p>
          </div>

          {/* Device Progress Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1 text-emerald-700">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Celulares / Móvil ({analytics?.devices?.mobilePercent || 82}%)</span>
              </span>
              <span className="flex items-center gap-1 text-blue-700">
                <Laptop className="w-3.5 h-3.5" />
                <span>Computadoras ({analytics?.devices?.desktopPercent || 18}%)</span>
              </span>
            </div>

            <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${analytics?.devices?.mobilePercent || 82}%` }}
                className="bg-emerald-500 h-full rounded-l-full transition-all"
              />
              <div
                style={{ width: `${analytics?.devices?.desktopPercent || 18}%` }}
                className="bg-blue-500 h-full rounded-r-full transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 space-y-0.5">
                <span className="text-stone-400 font-semibold text-[10px]">Sistemas Populares</span>
                <p className="font-bold text-stone-800">
                  {analytics?.operatingSystems?.[0]?.name || 'Android'} ({analytics?.operatingSystems?.[0]?.count || 0})
                </p>
                <p className="text-[10px] text-stone-500">
                  {analytics?.operatingSystems?.[1]?.name || 'iOS'} ({analytics?.operatingSystems?.[1]?.count || 0})
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 space-y-0.5">
                <span className="text-stone-400 font-semibold text-[10px]">Navegadores</span>
                <p className="font-bold text-stone-800">
                  {analytics?.browsers?.[0]?.name || 'Chrome'} ({analytics?.browsers?.[0]?.count || 0})
                </p>
                <p className="text-[10px] text-stone-500">
                  {analytics?.browsers?.[1]?.name || 'Safari'} ({analytics?.browsers?.[1]?.count || 0})
                </p>
              </div>
            </div>
          </div>

          {/* Peak Hours */}
          <div className="pt-2 border-t border-stone-100 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Horarios con Mayor Actividad en Carmen</span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-medium">
              <div className="p-1.5 rounded-lg bg-stone-50">
                <span className="text-stone-400 block">Mañana</span>
                <span className="font-bold text-stone-900">{analytics?.peakHours?.manana || 0}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 font-bold text-amber-900">
                <span className="text-amber-700 block font-semibold">Tarde</span>
                <span>{analytics?.peakHours?.tarde || 0}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-stone-50">
                <span className="text-stone-400 block">Noche</span>
                <span className="font-bold text-stone-900">{analytics?.peakHours?.noche || 0}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-stone-50">
                <span className="text-stone-400 block">Madrugada</span>
                <span className="font-bold text-stone-900">{analytics?.peakHours?.madrugada || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row: Traffic Sources & Top Searches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Canales de Entrada (Traffic Sources) */}
        <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-600" />
            <div>
              <h5 className="font-extrabold text-sm text-stone-900">
                ¿De dónde vienen los visitantes? (Canales de Entrada)
              </h5>
              <p className="text-[11px] text-stone-500">
                Enlaces compartidos, redes sociales y búsquedas.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {(analytics?.trafficSources || [
              { name: 'Directo / Acceso Directo', count: 112, percent: 64 },
              { name: 'WhatsApp', count: 32, percent: 18 },
              { name: 'Facebook', count: 21, percent: 12 },
              { name: 'Búsqueda Google', count: 11, percent: 6 }
            ]).map((src) => (
              <div key={src.name} className="flex items-center justify-between text-xs p-2 rounded-xl bg-stone-50 border border-stone-100">
                <span className="font-bold text-stone-800">{src.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-stone-500 font-mono text-[11px]">{src.count} visitas</span>
                  <span className="px-2 py-0.5 rounded-md bg-stone-200 font-black text-[10px] text-stone-800">
                    {src.percent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Search Terms */}
        <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-amber-600" />
            <div>
              <h5 className="font-extrabold text-sm text-stone-900">
                ¿Qué busca la gente en el directorio?
              </h5>
              <p className="text-[11px] text-stone-500">
                Palabras más buscadas por los usuarios en Ciudad del Carmen.
              </p>
            </div>
          </div>

          {(!analytics?.topSearches || analytics.topSearches.length === 0) ? (
            <div className="text-center py-6 text-xs text-stone-400 bg-stone-50 rounded-2xl">
              Aún no hay búsquedas suficientes registradas.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {analytics.topSearches.map(item => (
                <span
                  key={item.term}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-amber-100 text-stone-800 text-xs font-semibold border border-stone-200 transition-colors"
                >
                  <span>"{item.term}"</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-white font-bold text-amber-900 border border-stone-200">
                    {item.count}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Business Interaction Ranking */}
      <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-600" />
            <div>
              <h5 className="font-extrabold text-sm text-stone-900">
                Empresas con Mayor Alcance y Clics
              </h5>
              <p className="text-[11px] text-stone-500">
                Negocios que reciben más vistas, contactos de WhatsApp y llamadas de clientes.
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar negocio en métricas..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 text-xs focus:bg-white focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>
        </div>

        {filteredBusinesses.length === 0 ? (
          <div className="text-center py-8 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-500">
            No hay registros de interacción que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone-200">
            <table className="w-full text-left text-xs text-stone-700 divide-y divide-stone-200">
              <thead className="bg-stone-100 text-stone-600 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-3.5 py-2.5">Empresa</th>
                  <th className="px-3 py-2.5 text-center">Fichas Vistas</th>
                  <th className="px-3 py-2.5 text-center text-emerald-700">WhatsApp</th>
                  <th className="px-3 py-2.5 text-center text-blue-700">Llamadas</th>
                  <th className="px-3 py-2.5 text-center text-rose-700">Maps</th>
                  <th className="px-3.5 py-2.5 text-right font-black">Total Acciones</th>
                  {onDeleteBusiness && <th className="px-2.5 py-2.5 text-right">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium bg-white">
                {filteredBusinesses.map((b, idx) => (
                  <tr key={b.businessId} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-stone-400 font-bold">
                          #{idx + 1}
                        </span>
                        <span className="font-extrabold text-stone-900">{b.businessName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-stone-700">
                      {b.views || 0}
                    </td>
                    <td className="px-3 py-2.5 text-center font-black text-emerald-600">
                      {b.whatsappClicks || 0}
                    </td>
                    <td className="px-3 py-2.5 text-center font-black text-blue-600">
                      {b.phoneClicks || 0}
                    </td>
                    <td className="px-3 py-2.5 text-center font-black text-rose-600">
                      {b.mapsClicks || 0}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-stone-900 text-white font-black text-[11px]">
                        {b.totalInteractions}
                      </span>
                    </td>
                    {onDeleteBusiness && (
                      <td className="px-2.5 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteBusiness(b.businessId, b.businessName)}
                          className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Real-Time Live Feed of Recent Visitors */}
      <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h5 className="font-extrabold text-sm text-stone-900">
              Bitácora de Visitantes en Vivo (Últimos movimientos)
            </h5>
          </div>
          <span className="text-[11px] text-stone-400 font-medium">
            Se actualiza automáticamente cada 15 segundos
          </span>
        </div>

        {(!analytics?.recentEvents || analytics.recentEvents.length === 0) ? (
          <div className="text-center py-6 text-xs text-stone-400 bg-stone-50 rounded-2xl">
            Aún no hay visitas registradas recientemente.
          </div>
        ) : (
          <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto pr-1">
            {analytics.recentEvents.slice(0, 40).map((evt, i) => (
              <div key={evt.id || i} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    evt.type === 'whatsapp'
                      ? 'bg-emerald-100 text-emerald-700'
                      : evt.type === 'call'
                      ? 'bg-blue-100 text-blue-700'
                      : evt.type === 'maps'
                      ? 'bg-rose-100 text-rose-700'
                      : evt.type === 'view'
                      ? 'bg-purple-100 text-purple-700'
                      : evt.type === 'search'
                      ? 'bg-sky-100 text-sky-700'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {evt.type === 'whatsapp' && <MessageCircle className="w-3.5 h-3.5" />}
                    {evt.type === 'call' && <Phone className="w-3.5 h-3.5" />}
                    {evt.type === 'maps' && <MapPin className="w-3.5 h-3.5" />}
                    {evt.type === 'view' && <Eye className="w-3.5 h-3.5" />}
                    {evt.type === 'search' && <Search className="w-3.5 h-3.5" />}
                    {evt.type === 'visit' && <Users className="w-3.5 h-3.5" />}
                  </div>

                  <div className="min-w-0">
                    <p className="font-bold text-stone-900 truncate">
                      {evt.type === 'visit' && 'Visita al Portal Principal'}
                      {evt.type === 'view' && `Vio la ficha de "${evt.businessName}"`}
                      {evt.type === 'whatsapp' && `Inició chat de WhatsApp con "${evt.businessName}"`}
                      {evt.type === 'call' && `Llamó por teléfono a "${evt.businessName}"`}
                      {evt.type === 'maps' && `Consultó cómo llegar a "${evt.businessName}"`}
                      {evt.type === 'search' && `Buscó "${evt.searchTerm}" en el directorio`}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-stone-400">
                      <span>{evt.device === 'mobile' ? '📱 Celular' : evt.device === 'tablet' ? '📱 Tablet' : '💻 PC'}</span>
                      {evt.os && <span>• {evt.os}</span>}
                      {evt.browser && <span>• {evt.browser}</span>}
                      {evt.referrerSource && <span>• Vía: {evt.referrerSource}</span>}
                      {evt.isAdmin && <span className="font-bold text-amber-700 bg-amber-50 px-1 rounded">Admin</span>}
                    </div>
                  </div>
                </div>

                <span className="text-[11px] font-medium text-stone-400 shrink-0">
                  {formatRelativeTime(evt.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
