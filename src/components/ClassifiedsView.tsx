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
  Building2,
  Clock,
  ExternalLink,
  Users,
  Eye,
  CheckCircle2,
  Bookmark
} from 'lucide-react';
import { ClassifiedAd } from '../types';
import { getWhatsAppUrl } from '../utils/phone';

export const CLASSIFIED_CATEGORIES = [
  {
    id: 'empleos',
    name: '1. Empleos y Bolsa de Trabajo',
    icon: Briefcase,
    color: 'text-amber-500',
    subcategories: [
      { id: 'empleos-ofertas', name: 'Ofertas de empleo (Vacantes)', description: 'Puestos de trabajo activos en Carmen.' },
      { id: 'empleos-busqueda', name: 'Se busca trabajo (CVs)', description: 'Personas ofreciendo sus servicios profesionales.' }
    ]
  },
  {
    id: 'inmuebles',
    name: '2. Inmuebles (Bienes Raíces)',
    icon: Home,
    color: 'text-indigo-500',
    subcategories: [
      { id: 'inmuebles-venta', name: 'Venta', description: 'Casas, departamentos, terrenos y locales.' },
      { id: 'inmuebles-renta', name: 'Renta / Alquiler', description: 'Casas, departamentos y cuartos.' },
      { id: 'inmuebles-traspasos', name: 'Traspasos y otros', description: 'Oportunidades inmobiliarias especiales.' }
    ]
  },
  {
    id: 'vehiculos',
    name: '3. Vehículos',
    icon: Car,
    color: 'text-blue-500',
    subcategories: [
      { id: 'vehiculos-autos', name: 'Autos y camionetas', description: 'Usados, seminuevos y de agencia.' },
      { id: 'vehiculos-motos', name: 'Motos y motonetas', description: 'De diferentes cilindradas y estilos.' },
      { id: 'vehiculos-pesados', name: 'Vehículos pesados', description: 'Camiones y remolques.' }
    ]
  },
  {
    id: 'compra-venta',
    name: '4. Compra - Venta (Bazar)',
    icon: ShoppingBag,
    color: 'text-emerald-500',
    subcategories: [
      { id: 'bazar-hogar', name: 'Hogar y Muebles', description: 'Salas, comedores, refrigeradores, estufas.' },
      { id: 'bazar-electronica', name: 'Electrónica y Celulares', description: 'Teléfonos, computadoras, pantallas.' },
      { id: 'bazar-herramientas', name: 'Herramientas y Maquinaria', description: 'Herramientas industriales y de taller.' }
    ]
  },
  {
    id: 'mascotas',
    name: '5. Mascotas y Animales',
    icon: Heart,
    color: 'text-rose-500',
    subcategories: [
      { id: 'mascotas-adopcion', name: 'Adopción responsable', description: 'Perritos y gatitos en busca de hogar.' }
    ]
  },
  {
    id: 'eventos',
    name: '6. Servicios y Oficios',
    icon: Calendar,
    color: 'text-purple-500',
    subcategories: [
      { id: 'servicios-oficios', name: 'Oficios y reparaciones', description: 'Albañilería, plomería, pintura y clima.' }
    ]
  }
];

interface ClassifiedsViewProps {
  classifieds: ClassifiedAd[];
  coloniasList?: Array<{ name: string; count: number }>;
  onOpenCreateModal: () => void;
  onOpenDetailModal: (ad: ClassifiedAd) => void;
}

export const ClassifiedsView: React.FC<ClassifiedsViewProps> = ({
  classifieds,
  coloniasList,
  onOpenCreateModal,
  onOpenDetailModal
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedColonia, setSelectedColonia] = useState<string>('todas');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedModality, setSelectedModality] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [onlyLast3Days, setOnlyLast3Days] = useState<boolean>(false);
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
  // 1. No mostrar anuncios en 'trash' o inactivos.
  // 2. Máximo 7 días (1 semana) de permanencia en el sistema antes de papelera.
  // 3. Destacar / filtrar publicaciones recientes (máximo 3 días).
  const validActiveAds = useMemo(() => {
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    return classifieds.filter(ad => {
      if (ad.status === 'trash' || ad.status === 'sold' || ad.status === 'expired') {
        return false;
      }
      // REGLA ESTRICTA: Solo anuncios explícitamente autorizados por administración
      if (ad.approvedByAdmin !== true) {
        return false;
      }
      if (ad.createdAt) {
        const createdTs = new Date(ad.createdAt).getTime();
        // Skip older than 7 days
        if (now - createdTs > SEVEN_DAYS_MS) {
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

      // Only last 3 days filter (Regla estricta solicitada)
      if (onlyLast3Days && ad.createdAt) {
        const diffMs = Date.now() - new Date(ad.createdAt).getTime();
        if (diffMs > 3 * 24 * 60 * 60 * 1000) {
          return false;
        }
      }

      return true;
    });
  }, [validActiveAds, selectedCategory, selectedColonia, selectedModality, selectedSource, searchQuery, onlyLast3Days]);

  // Format relative publish date (max 3 days formatted nicely)
  const formatPublishedBadge = (createdAtStr?: string) => {
    if (!createdAtStr) return 'Publicado recientemente';
    const diffHours = Math.max(0, Math.round((Date.now() - new Date(createdAtStr).getTime()) / (1000 * 60 * 60)));
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

  const hasActiveFilters =
    !!searchQuery ||
    selectedColonia !== 'todas' ||
    selectedCategory !== 'all' ||
    selectedModality !== 'all' ||
    selectedSource !== 'all' ||
    onlyLast3Days;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-stone-900 pb-24 text-left">
      {/* Top Banner / Hero inspired by user's reference */}
      <div className="bg-white border-b border-stone-200 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black uppercase tracking-wider mb-2">
                <Tag className="w-3.5 h-3.5 text-amber-700" />
                <span>Bolsa de Trabajo y Clasificados de Ciudad del Carmen</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
                Vacantes y Anuncios Recientes
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                Conectando el talento, los bienes raíces y el comercio con las empresas que mueven a Carmen.
                <span className="ml-1 text-amber-700 font-bold">
                  (Vigencia máxima de 1 semana · Actualización continua)
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenCreateModal}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm shadow-md shadow-amber-500/20 transition-all cursor-pointer shrink-0"
            >
              <PlusCircle className="w-5 h-5" />
              <span>+ Publicar Vacante o Anuncio</span>
            </button>
          </div>

          {/* Unified Big Search Bar */}
          <div className="relative">
            <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Puesto, palabra clave, inmueble, vehículo o ubicación en Carmen..."
              className="w-full pl-12 pr-10 py-3.5 bg-stone-50 rounded-2xl text-stone-900 text-sm sm:text-base border border-stone-300 focus:border-amber-500 focus:bg-white focus:outline-none shadow-xs transition-all placeholder-stone-400 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 4 Dropdown Filters in a Row (Matching the reference layout) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Ubicación */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                Ubicación
              </label>
              <select
                value={selectedColonia}
                onChange={e => setSelectedColonia(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm font-semibold text-stone-800 outline-none focus:border-amber-500 transition-colors"
              >
                <option value="todas">Todas las zonas de Carmen</option>
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
                Categoría / Tipo de Puesto
              </label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm font-semibold text-stone-800 outline-none focus:border-amber-500 transition-colors"
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

            {/* 3. Modalidad / Experiencia */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                Modalidad / Condición
              </label>
              <select
                value={selectedModality}
                onChange={e => setSelectedModality(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm font-semibold text-stone-800 outline-none focus:border-amber-500 transition-colors"
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

            {/* 4. Empresa / Fuente Verificada */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                Fuente / Portal
              </label>
              <select
                value={selectedSource}
                onChange={e => setSelectedSource(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm font-semibold text-stone-800 outline-none focus:border-amber-500 transition-colors"
              >
                <option value="all">Todas las fuentes verificadas</option>
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

          {/* Real Metrics Highlight Card Banner (No fake numbers) */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-stone-100 rounded-2xl border border-amber-500/20 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-6 flex-wrap text-xs sm:text-sm font-bold text-stone-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-800 font-black">
                  <Briefcase className="w-4 h-4 text-amber-700" />
                </span>
                <span>
                  <strong className="text-stone-950 font-black text-base">{validActiveAds.length}</strong> {validActiveAds.length === 1 ? 'anuncio y vacante activa' : 'anuncios y vacantes activas'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-stone-600 font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Vigencia máxima de 7 días · Depuración automática</span>
              </div>
            </div>

            <div className="text-xs text-stone-500 font-medium">
              Fuentes oficiales: <strong className="text-stone-700">Locanto · CompuTrabajo · Indeed · Isla del Carmen</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area: Cards Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Count Bar & Reset Filters */}
        <div className="flex items-center justify-between gap-4">
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
                  : 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-300'
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
                className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpiar filtros</span>
              </button>
            )}
          </div>
        </div>

        {/* Empty State */}
        {filteredAds.length === 0 ? (
          <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-4 shadow-xs">
            <Briefcase className="w-12 h-12 text-stone-300 mx-auto" />
            <h3 className="text-lg font-bold text-stone-900">
              No se encontraron clasificados o vacantes con los filtros seleccionados
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
              Intenta cambiar la ubicación, seleccionar otra categoría o restablecer la búsqueda.
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
          /* Clean 2-column card grid (Matching user's attached design) */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredAds.map(ad => {
              const isSaved = savedAds.has(ad.id);
              const companyDisplayName = ad.companyName || ad.contactName || 'Empresa en Carmen';
              const publishBadgeText = formatPublishedBadge(ad.createdAt);

              // Monogram initial: e.g. "idc." or first two letters
              const monogram = (ad.source?.toLowerCase().includes('isla') || ad.source?.toLowerCase().includes('idc'))
                ? 'idc.'
                : companyDisplayName.slice(0, 2).toLowerCase();

              return (
                <div
                  key={ad.id}
                  onClick={() => onOpenDetailModal(ad)}
                  className="bg-white rounded-2xl border border-stone-200 hover:border-amber-400/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4 cursor-pointer group relative text-left"
                >
                  <div className="flex items-start gap-4">
                    {/* Left Avatar / Monogram Box (Dark Navy / Amber characteristic style) */}
                    <div className="w-12 h-12 rounded-xl bg-[#001026] text-amber-400 flex items-center justify-center font-black text-sm tracking-wider shrink-0 shadow-xs group-hover:bg-[#CA5010] group-hover:text-white transition-colors">
                      {monogram}
                    </div>

                    {/* Main Information */}
                    <div className="flex-1 min-w-0 pr-6">
                      <h3 className="text-base font-extrabold text-stone-900 group-hover:text-amber-800 transition-colors leading-snug line-clamp-2">
                        {ad.title}
                      </h3>

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs font-semibold text-stone-600 truncate">
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

                      {/* Metadata Row: Location, Modality, Date (Exact reference match) */}
                      <div className="flex items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-stone-500 flex-wrap">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{ad.colonia || ad.location || 'Cd. del Carmen, Camp.'}</span>
                        </div>

                        {ad.modality && (
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span>{ad.modality}</span>
                          </div>
                        )}

                        {ad.price !== null && ad.price !== undefined && ad.price > 0 && (
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

                    {/* Bookmark / Save Heart Button (Top Right) */}
                    <button
                      type="button"
                      onClick={e => toggleSaveAd(ad.id, e)}
                      className={`p-2 rounded-xl transition-colors cursor-pointer shrink-0 absolute top-4 right-4 ${
                        isSaved
                          ? 'text-rose-500 bg-rose-50 hover:bg-rose-100'
                          : 'text-stone-300 hover:text-stone-500 hover:bg-stone-50'
                      }`}
                      title={isSaved ? 'Guardado en tus favoritos' : 'Guardar vacante'}
                    >
                      <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {/* Bottom Quick Contact Buttons */}
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
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
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </a>
                      )}

                      {ad.phone && !ad.whatsapp && (
                        <a
                          href={`tel:${ad.phone}`}
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors"
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
                          className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
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
    </div>
  );
};
