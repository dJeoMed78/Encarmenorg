import React, { useState, useMemo } from 'react';
import {
  Tag,
  PlusCircle,
  Search,
  MapPin,
  Phone,
  MessageSquare,
  Home,
  Car,
  Briefcase,
  ShoppingBag,
  Heart,
  Calendar,
  X,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Clock,
  ExternalLink,
  RotateCcw,
  AlertCircle,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { ClassifiedAd } from '../types';
import { getWhatsAppUrl } from '../utils/phone';

export const CLASSIFIED_CATEGORIES = [
  {
    id: 'empleos',
    name: '1. Empleos y Bolsa de Trabajo',
    shortName: 'Empleos',
    icon: Briefcase,
    color: 'text-amber-600',
    subcategories: [
      { id: 'empleos-ofertas', name: 'Ofertas de empleo (Vacantes)', description: 'Puestos de trabajo activos en Carmen.' },
      { id: 'empleos-busqueda', name: 'Se busca trabajo (CVs)', description: 'Personas ofreciendo sus servicios profesionales.' }
    ]
  },
  {
    id: 'inmuebles',
    name: '2. Inmuebles (Bienes Raíces)',
    shortName: 'Inmuebles',
    icon: Home,
    color: 'text-indigo-600',
    subcategories: [
      { id: 'inmuebles-venta', name: 'Venta', description: 'Casas, departamentos, terrenos y locales.' },
      { id: 'inmuebles-renta', name: 'Renta / Alquiler', description: 'Casas, departamentos y cuartos.' },
      { id: 'inmuebles-traspasos', name: 'Traspasos y otros', description: 'Oportunidades inmobiliarias especiales.' }
    ]
  },
  {
    id: 'vehiculos',
    name: '3. Vehículos',
    shortName: 'Vehículos',
    icon: Car,
    color: 'text-blue-600',
    subcategories: [
      { id: 'vehiculos-autos', name: 'Autos y camionetas', description: 'Usados, seminuevos y de agencia.' },
      { id: 'vehiculos-motos', name: 'Motos y motonetas', description: 'De diferentes cilindradas y estilos.' },
      { id: 'vehiculos-pesados', name: 'Vehículos pesados', description: 'Camiones y remolques.' }
    ]
  },
  {
    id: 'compra-venta',
    name: '4. Compra - Venta (Bazar)',
    shortName: 'Compra - Venta',
    icon: ShoppingBag,
    color: 'text-emerald-600',
    subcategories: [
      { id: 'bazar-hogar', name: 'Hogar y Muebles', description: 'Salas, comedores, refrigeradores, estufas.' },
      { id: 'bazar-electronica', name: 'Electrónica y Celulares', description: 'Teléfonos, computadoras, pantallas.' },
      { id: 'bazar-herramientas', name: 'Herramientas y Maquinaria', description: 'Herramientas industriales y de taller.' }
    ]
  },
  {
    id: 'mascotas',
    name: '5. Mascotas y Animales',
    shortName: 'Mascotas',
    icon: Heart,
    color: 'text-rose-600',
    subcategories: [
      { id: 'mascotas-adopcion', name: 'Adopción responsable', description: 'Perritos y gatitos en busca de hogar.' }
    ]
  },
  {
    id: 'eventos',
    name: '6. Servicios y Oficios',
    shortName: 'Servicios',
    icon: Calendar,
    color: 'text-purple-600',
    subcategories: [
      { id: 'servicios-oficios', name: 'Oficios y reparaciones', description: 'Albañilería, plomería, pintura y clima.' }
    ]
  }
];

interface ClassifiedsViewProps {
  classifieds: ClassifiedAd[];
  coloniasList?: Array<{ name: string; count: number }>;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onOpenCreateModal: () => void;
  onOpenDetailModal: (ad: ClassifiedAd) => void;
}

export const ClassifiedsView: React.FC<ClassifiedsViewProps> = ({
  classifieds,
  coloniasList,
  loading = false,
  error = null,
  onRetry,
  onOpenCreateModal,
  onOpenDetailModal
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedColonia, setSelectedColonia] = useState<string>('todas');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedModality, setSelectedModality] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [onlyLast3Days, setOnlyLast3Days] = useState<boolean>(false);
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);
  const [savedAds, setSavedAds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('carmelita_saved_classifieds');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleSaveAd = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedAds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem('carmelita_saved_classifieds', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // REGLAS ESTRICTAS DE CLASIFICADOS:
  // 1. No mostrar anuncios en 'trash', 'sold' o 'expired'.
  // 2. No mostrar anuncios en 'pendingApproval'.
  // 3. Máximo 7 días (1 semana) de permanencia en el sistema antes de depuración.
  // 4. Mostrar tanto anuncios aprobados por admin como anuncios activos de ciudadanos.
  const validActiveAds = useMemo(() => {
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    return classifieds.filter(ad => {
      if (!ad || !ad.id) return false;
      if (ad.status === 'trash' || ad.status === 'sold' || ad.status === 'expired') {
        return false;
      }
      if (ad.pendingApproval === true) {
        return false;
      }
      if (ad.createdAt) {
        const createdTs = new Date(ad.createdAt).getTime();
        if (!isNaN(createdTs) && now - createdTs > SEVEN_DAYS_MS) {
          return false;
        }
      }
      return true;
    });
  }, [classifieds]);

  // Distinct sources list
  const sourceOptions = useMemo(() => {
    const set = new Set<string>();
    validActiveAds.forEach(a => {
      if (a.source) set.add(a.source);
    });
    return Array.from(set);
  }, [validActiveAds]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: validActiveAds.length };
    CLASSIFIED_CATEGORIES.forEach(c => {
      counts[c.id] = 0;
    });
    validActiveAds.forEach(ad => {
      if (ad.category && counts[ad.category] !== undefined) {
        counts[ad.category]++;
      }
    });
    return counts;
  }, [validActiveAds]);

  // Filtered ads
  const filteredAds = useMemo(() => {
    return validActiveAds.filter(ad => {
      // Category
      if (selectedCategory !== 'all' && ad.category !== selectedCategory) {
        return false;
      }

      // Colonia / Location
      if (
        selectedColonia !== 'todas' &&
        (!ad.colonia || !ad.colonia.toLowerCase().includes(selectedColonia.toLowerCase()))
      ) {
        return false;
      }

      // Modality
      if (selectedModality !== 'all') {
        const text = `${ad.modality || ''} ${ad.description || ''} ${ad.title || ''}`.toLowerCase();
        if (!text.includes(selectedModality.toLowerCase())) {
          return false;
        }
      }

      // Source
      if (selectedSource !== 'all' && ad.source !== selectedSource) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = ad.title?.toLowerCase().includes(q);
        const matchDesc = ad.description?.toLowerCase().includes(q);
        const matchCol = ad.colonia?.toLowerCase().includes(q);
        const matchComp = ad.companyName?.toLowerCase().includes(q) || ad.contactName?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCol && !matchComp) return false;
      }

      // Only last 3 days filter
      if (onlyLast3Days && ad.createdAt) {
        const diffMs = Date.now() - new Date(ad.createdAt).getTime();
        if (diffMs > 3 * 24 * 60 * 60 * 1000) {
          return false;
        }
      }

      return true;
    });
  }, [validActiveAds, selectedCategory, selectedColonia, selectedModality, selectedSource, searchQuery, onlyLast3Days]);

  // Format relative publish date
  const formatPublishedBadge = (createdAtStr?: string) => {
    if (!createdAtStr) return 'Publicado recientemente';
    const parsed = new Date(createdAtStr).getTime();
    if (isNaN(parsed)) return 'Publicado recientemente';
    const diffHours = Math.max(0, Math.round((Date.now() - parsed) / (1000 * 60 * 60)));
    if (diffHours < 1) return 'Publicado hace unos momentos';
    if (diffHours < 24) return `Publicado hoy (${diffHours}h)`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Publicado ayer';
    if (diffDays <= 3) return `Publicado hace ${diffDays} días`;
    return `Publicado el ${new Date(createdAtStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`;
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedColonia('todas');
    setSelectedCategory('all');
    setSelectedModality('all');
    setSelectedSource('all');
    setOnlyLast3Days(false);
  };

  const activeSecondaryFilterCount =
    (selectedColonia !== 'todas' ? 1 : 0) +
    (selectedModality !== 'all' ? 1 : 0) +
    (selectedSource !== 'all' ? 1 : 0) +
    (onlyLast3Days ? 1 : 0);

  const hasActiveFilters =
    !!searchQuery ||
    selectedCategory !== 'all' ||
    activeSecondaryFilterCount > 0;

  return (
    <div className="w-full text-stone-900 pb-20 text-left space-y-6">
      {/* 1. Glass Top Banner / Hero */}
      <div
        className="rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm border"
        style={{
          background: 'rgba(255, 255, 255, 0.82)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderColor: 'rgba(255, 255, 255, 0.9)'
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 text-amber-900 border border-amber-500/30 text-xs font-black uppercase tracking-wider">
              <Tag className="w-3.5 h-3.5 text-amber-700" />
              <span>Bolsa de Trabajo y Clasificados de Ciudad del Carmen</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 tracking-tight">
              Vacantes y Anuncios Recientes
            </h1>
            <p className="text-xs sm:text-sm text-stone-600">
              Conectando el empleo, los bienes raíces y el comercio local con la comunidad carmelita.
              <span className="ml-1 text-amber-800 font-bold block sm:inline">
                (Vigencia máxima de 7 días · Depuración automática)
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-sm shadow-md shadow-amber-500/25 active:scale-[0.98] transition-all cursor-pointer shrink-0"
          >
            <PlusCircle className="w-5 h-5 text-stone-950" />
            <span>+ Publicar Vacante o Anuncio</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por puesto, producto, colonia o palabra clave..."
            className="w-full pl-12 pr-10 py-3.5 bg-white/90 rounded-2xl text-stone-900 text-sm sm:text-base border border-stone-200/90 focus:border-amber-500 focus:bg-white focus:outline-none shadow-xs transition-all placeholder-stone-400 font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer p-1"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Quick Pills */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-stone-600">
            <span>Categorías populares</span>
            <span className="text-stone-400 font-normal">{validActiveAds.length} total</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-stone-950 shadow-xs ring-2 ring-amber-500/30'
                  : 'bg-white/80 hover:bg-white text-stone-700 border border-stone-200/80'
              }`}
            >
              <span>Todos</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                selectedCategory === 'all' ? 'bg-amber-600 text-stone-950 font-black' : 'bg-stone-100 text-stone-600'
              }`}>
                {categoryCounts.all || 0}
              </span>
            </button>

            {CLASSIFIED_CATEGORIES.map(cat => {
              const IconComp = cat.icon;
              const isSelected = selectedCategory === cat.id;
              const count = categoryCounts[cat.id] || 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500 text-stone-950 shadow-xs ring-2 ring-amber-500/30'
                      : 'bg-white/80 hover:bg-white text-stone-700 border border-stone-200/80'
                  }`}
                >
                  <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-stone-950' : cat.color}`} />
                  <span>{cat.shortName}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-amber-600 text-stone-950 font-black' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Filter Toggle Button */}
        <div className="md:hidden pt-1">
          <button
            type="button"
            onClick={() => setShowMobileFilters(prev => !prev)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/90 border border-stone-200 text-stone-800 text-xs font-bold cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-600" />
              <span>Filtros avanzados (Ubicación, Modalidad, Fuente)</span>
            </div>
            <div className="flex items-center gap-1.5">
              {activeSecondaryFilterCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-black">
                  {activeSecondaryFilterCount} activos
                </span>
              )}
              <ChevronRight
                className={`w-4 h-4 text-stone-400 transition-transform ${showMobileFilters ? 'rotate-90' : ''}`}
              />
            </div>
          </button>
        </div>

        {/* 4 Dropdown Filters (Collapsible on Mobile, Grid on Desktop) */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 ${
            showMobileFilters ? 'block' : 'hidden md:grid'
          }`}
        >
          {/* 1. Ubicación */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Ubicación en Carmen
            </label>
            <select
              value={selectedColonia}
              onChange={e => setSelectedColonia(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white/90 border border-stone-300 rounded-xl text-xs sm:text-sm font-semibold text-stone-800 outline-none focus:border-amber-500 transition-colors"
            >
              <option value="todas">Todas las colonias de Carmen</option>
              <option value="Centro">Centro Histórico</option>
              <option value="Playa Norte">Playa Norte</option>
              <option value="Justo Sierra">Justo Sierra</option>
              <option value="Santa Rita">Santa Rita</option>
              <option value="Renovación">Renovación I y II</option>
              <option value="Miami">Colonia Miami</option>
              <option value="San Nicolás">San Nicolás</option>
              <option value="Morelos">Colonia Morelos</option>
              <option value="Fátima">Colonia Fátima</option>
              {coloniasList &&
                coloniasList.map(c => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          {/* 2. Categoría / Tipo de puesto */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Categoría
            </label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white/90 border border-stone-300 rounded-xl text-xs sm:text-sm font-semibold text-stone-800 outline-none focus:border-amber-500 transition-colors"
            >
              <option value="all">Todas las categorías</option>
              <option value="empleos">Bolsa de Trabajo y Empleos</option>
              <option value="inmuebles">Inmuebles (Renta y Venta)</option>
              <option value="vehiculos">Vehículos (Autos y Motos)</option>
              <option value="compra-venta">Compra - Venta (Bazar)</option>
              <option value="mascotas">Mascotas y Animales</option>
              <option value="eventos">Servicios y Oficios</option>
            </select>
          </div>

          {/* 3. Modalidad / Condición */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Modalidad / Condición
            </label>
            <select
              value={selectedModality}
              onChange={e => setSelectedModality(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white/90 border border-stone-300 rounded-xl text-xs sm:text-sm font-semibold text-stone-800 outline-none focus:border-amber-500 transition-colors"
            >
              <option value="all">Todas las modalidades</option>
              <option value="Tiempo completo">Tiempo Completo</option>
              <option value="Medio tiempo">Medio Tiempo</option>
              <option value="Presencial">Presencial en Carmen</option>
              <option value="Rotación">Rotación / Offshore</option>
              <option value="Renta">En Renta</option>
              <option value="Venta">En Venta</option>
            </select>
          </div>

          {/* 4. Fuente / Portal */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Fuente / Verificación
            </label>
            <select
              value={selectedSource}
              onChange={e => setSelectedSource(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white/90 border border-stone-300 rounded-xl text-xs sm:text-sm font-semibold text-stone-800 outline-none focus:border-amber-500 transition-colors"
            >
              <option value="all">Todas las fuentes</option>
              <option value="Portal Oficial Empresas en Carmen">Portal Oficial Directo</option>
              <option value="Locanto Ciudad del Carmen">Locanto Carmen</option>
              <option value="CompuTrabajo Carmen">CompuTrabajo Carmen</option>
              <option value="Indeed Carmen">Indeed Carmen</option>
              <option value="Isla del Carmen">Isla del Carmen (IDC)</option>
              <option value="Facebook Grupo Empresas en Carmen">Facebook Grupo Oficial</option>
              {sourceOptions.map(src => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Metrics Highlight Card */}
        <div
          className="rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border"
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            borderColor: 'rgba(245, 158, 11, 0.25)'
          }}
        >
          <div className="flex items-center gap-5 flex-wrap text-xs sm:text-sm font-bold text-stone-800">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-800 font-black">
                <Briefcase className="w-4 h-4 text-amber-700" />
              </span>
              <span>
                <strong className="text-stone-950 font-black text-base">{validActiveAds.length}</strong>{' '}
                {validActiveAds.length === 1 ? 'anuncio y vacante activa' : 'anuncios y vacantes activas'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-stone-600 font-medium">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Vigencia máxima de 7 días · Depuración continua</span>
            </div>
          </div>

          <div className="text-xs text-stone-500 font-medium">
            Fuentes: <strong className="text-stone-700">Locanto · CompuTrabajo · Indeed · Isla del Carmen · Comunidad</strong>
          </div>
        </div>
      </div>

      {/* 2. Error Banner */}
      {error && (
        <div
          className="rounded-2xl p-4 sm:p-5 border flex items-center justify-between gap-4 shadow-sm"
          style={{
            background: 'rgba(254, 242, 242, 0.9)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(239, 68, 68, 0.3)'
          }}
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="text-xs sm:text-sm text-rose-900 font-medium">
              <strong className="font-bold">No se pudieron cargar algunos clasificados:</strong> {error}
            </div>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </button>
          )}
        </div>
      )}

      {/* 3. Count Bar & Quick Filter Toggles */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="text-sm font-bold text-stone-800">
          {filteredAds.length} {filteredAds.length === 1 ? 'anuncio activo' : 'anuncios activos'}
          {hasActiveFilters && (
            <span className="ml-2 text-xs text-stone-500 font-normal">
              (filtrados de un total de {validActiveAds.length})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setOnlyLast3Days(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              onlyLast3Days
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'bg-white/80 hover:bg-white text-stone-700 border border-stone-300'
            }`}
            title="Filtrar clasificados y vacantes publicadas en los últimos 3 días"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Solo últimos 3 días</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer bg-white/70 px-2.5 py-1.5 rounded-xl border border-stone-200"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Skeleton Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(idx => (
            <div
              key={idx}
              className="rounded-2xl p-5 border space-y-4 animate-pulse"
              style={{
                background: 'rgba(255, 255, 255, 0.75)',
                borderColor: 'rgba(255, 255, 255, 0.8)'
              }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-stone-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-stone-200 rounded-md w-3/4" />
                  <div className="h-3 bg-stone-200 rounded-md w-1/2" />
                  <div className="h-3 bg-stone-100 rounded-md w-full" />
                </div>
              </div>
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <div className="h-3 bg-stone-200 rounded-md w-24" />
                <div className="h-8 bg-stone-200 rounded-xl w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAds.length === 0 ? (
        /* Empty State */
        <div
          className="rounded-3xl border p-10 sm:p-14 text-center space-y-4 shadow-xs"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(255, 255, 255, 0.9)'
          }}
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto text-amber-700">
            <Briefcase className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-stone-900">
            No se encontraron clasificados o vacantes con los filtros seleccionados
          </h3>
          <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
            Intenta cambiar la ubicación, seleccionar otra categoría o restablecer la búsqueda para explorar todos los anuncios.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-all shadow-xs cursor-pointer"
          >
            Ver todos los anuncios
          </button>
        </div>
      ) : (
        /* Cards Grid with Glassmorphism */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredAds.map(ad => {
            const isSaved = savedAds.has(ad.id);
            const companyDisplayName = ad.companyName || ad.contactName || 'Empresa en Carmen';
            const publishBadgeText = formatPublishedBadge(ad.createdAt);

            // Thumbnail image if present
            const thumbnailImage = (ad.images && ad.images.length > 0 ? ad.images[0] : null) || ad.image || null;

            // Monogram initial: e.g. "idc." or first two letters
            const monogram =
              ad.source?.toLowerCase().includes('isla') || ad.source?.toLowerCase().includes('idc')
                ? 'idc.'
                : companyDisplayName.slice(0, 2).toLowerCase();

            return (
              <div
                key={ad.id}
                data-testid="classified-card"
                data-ad-id={ad.id}
                onClick={() => onOpenDetailModal(ad)}
                className="rounded-2xl border hover:border-amber-400/90 p-4 sm:p-5 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between gap-4 cursor-pointer group relative text-left"
                style={{
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderColor: 'rgba(255, 255, 255, 0.95)'
                }}
              >
                <div className="flex items-start gap-3.5">
                  {/* Left Avatar / Image / Monogram Box */}
                  {thumbnailImage ? (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-stone-100 border border-stone-200/90 shrink-0 shadow-2xs">
                      <img
                        src={thumbnailImage}
                        alt={ad.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          // Fallback to monogram if image fails
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#001026] text-amber-400 flex items-center justify-center font-black text-sm tracking-wider shrink-0 shadow-xs group-hover:bg-[#CA5010] group-hover:text-white transition-colors">
                      {monogram}
                    </div>
                  )}

                  {/* Main Information (pr-10 guarantees no collision with heart button) */}
                  <div className="flex-1 min-w-0 pr-10">
                    <h3 className="text-base font-extrabold text-stone-900 group-hover:text-amber-800 transition-colors leading-snug line-clamp-2">
                      {ad.title}
                    </h3>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs font-semibold text-stone-600 truncate max-w-[200px]">
                        {companyDisplayName}
                      </span>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200/80">
                        <ShieldCheck className="w-3 h-3 text-amber-600" />
                        <span>{ad.category === 'empleos' ? 'Vacante Verificada' : 'Anuncio Verificado'}</span>
                      </span>
                    </div>

                    {/* Description excerpt */}
                    {ad.description && (
                      <p className="text-xs text-stone-500 line-clamp-2 mt-2 leading-relaxed">
                        {ad.description}
                      </p>
                    )}

                    {/* Metadata Row: Location, Modality, Price, Date */}
                    <div className="flex items-center gap-x-3.5 gap-y-1.5 mt-3 text-xs text-stone-500 flex-wrap">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate max-w-[150px]">{ad.colonia || ad.location || 'Cd. del Carmen'}</span>
                      </div>

                      {ad.modality && (
                        <div className="flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{ad.modality}</span>
                        </div>
                      )}

                      {ad.price !== null && ad.price !== undefined && Number(ad.price) > 0 && (
                        <div className="flex items-center gap-1 font-bold text-emerald-700">
                          <span>${Number(ad.price).toLocaleString('es-MX')} {ad.currency || 'MXN'}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-stone-400">
                        <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>{publishBadgeText}</span>
                      </div>
                    </div>

                    {/* Source tag if from external portal */}
                    {ad.source && (
                      <div className="mt-2 text-[11px] text-stone-400 flex items-center gap-1">
                        <span>Fuente:</span>
                        <strong className="text-stone-600">{ad.source}</strong>
                      </div>
                    )}
                  </div>

                  {/* Bookmark / Save Heart Button (Top Right, safe position) */}
                  <button
                    type="button"
                    onClick={e => toggleSaveAd(ad.id, e)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer shrink-0 absolute top-3.5 right-3.5 ${
                      isSaved
                        ? 'text-rose-500 bg-rose-50 hover:bg-rose-100'
                        : 'text-stone-300 hover:text-stone-500 hover:bg-stone-100/80'
                    }`}
                    title={isSaved ? 'Guardado en tus favoritos' : 'Guardar vacante'}
                  >
                    <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Bottom Quick Contact Buttons */}
                <div className="pt-3 border-t border-stone-200/60 flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1">
                    <span>Ver detalles completos</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>

                  <div className="flex items-center gap-2">
                    {ad.whatsapp && (
                      <a
                        href={getWhatsAppUrl(ad.whatsapp, `Hola, vi su anuncio "${ad.title}" en Empresas en Carmen.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors min-h-[36px]"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    {ad.phone && !ad.whatsapp && (
                      <a
                        href={`tel:${ad.phone}`}
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors min-h-[36px]"
                      >
                        <Phone className="w-3.5 h-3.5 text-stone-600" />
                        <span>Llamar</span>
                      </a>
                    )}

                    {ad.sourceUrl && (
                      <a
                        href={ad.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="Abrir enlace original"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
