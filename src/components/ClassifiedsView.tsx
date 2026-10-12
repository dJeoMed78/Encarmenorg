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
  Sparkles
} from 'lucide-react';
import { ClassifiedAd } from '../types';
import { getWhatsAppUrl } from '../utils/phone';

export const CLASSIFIED_CATEGORIES = [
  {
    id: 'inmuebles',
    name: '1. Inmuebles (Bienes Raíces)',
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
    name: '2. Vehículos',
    icon: Car,
    color: 'text-blue-500',
    subcategories: [
      { id: 'vehiculos-autos', name: 'Autos y camionetas', description: 'Usados, seminuevos y de agencia.' },
      { id: 'vehiculos-motos', name: 'Motos y motonetas', description: 'De diferentes cilindradas y estilos.' },
      { id: 'vehiculos-pesados', name: 'Vehículos pesados', description: 'Camiones y remolques.' },
      { id: 'vehiculos-accesorios', name: 'Accesorios y refacciones', description: 'Llantas y refacciones.' }
    ]
  },
  {
    id: 'empleos',
    name: '3. Empleos y Bolsa de Trabajo',
    icon: Briefcase,
    color: 'text-amber-500',
    subcategories: [
      { id: 'empleos-ofertas', name: 'Ofertas de empleo (Vacantes)', description: 'Puestos de trabajo activos en Carmen.' },
      { id: 'empleos-busqueda', name: 'Se busca trabajo (CVs)', description: 'Personas ofreciendo sus servicios profesionales.' }
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
      { id: 'bazar-ropa', name: 'Ropa, Calzado y Accesorios', description: 'Prendas y calzado.' },
      { id: 'bazar-herramientas', name: 'Herramientas y Maquinaria', description: 'Herramientas industriales y de taller.' },
      { id: 'bazar-otros', name: 'Otros artículos', description: 'Todo lo demás para comprar o vender.' }
    ]
  },
  {
    id: 'mascotas',
    name: '5. Mascotas y Animales',
    icon: Heart,
    color: 'text-rose-500',
    subcategories: [
      { id: 'mascotas-adopcion', name: 'Adopción responsable', description: 'Perritos y gatitos en busca de hogar.' },
      { id: 'mascotas-perdidas', name: 'Extraviadas / Encontradas', description: 'Ayuda para localizar mascotas perdidas.' },
      { id: 'mascotas-accesorios', name: 'Accesorios y alimentos', description: 'Casitas, jaulas y alimento.' }
    ]
  },
  {
    id: 'eventos',
    name: '6. Servicios y Eventos',
    icon: Calendar,
    color: 'text-purple-500',
    subcategories: [
      { id: 'servicios-fiestas', name: 'Fiestas y banquetes', description: 'Música, inflables, mesas y banquetes.' },
      { id: 'servicios-oficios', name: 'Oficios y reparaciones', description: 'Albañilería, plomería, pintura y clima.' },
      { id: 'servicios-cursos', name: 'Cursos y clases particulares', description: 'Idiomas, regularización y deportes.' }
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [selectedColonia, setSelectedColonia] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeCatInfo = useMemo(
    () => CLASSIFIED_CATEGORIES.find(c => c.id === selectedCategory),
    [selectedCategory]
  );

  const filteredAds = useMemo(() => {
    return classifieds.filter(ad => {
      if (selectedCategory !== 'all' && ad.category !== selectedCategory) return false;
      if (
        selectedColonia !== 'todas' &&
        (!ad.colonia || !ad.colonia.toLowerCase().includes(selectedColonia.toLowerCase()))
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = ad.title?.toLowerCase().includes(q);
        const matchDesc = ad.description?.toLowerCase().includes(q);
        const matchCol = ad.colonia?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCol) return false;
      }
      return true;
    });
  }, [classifieds, selectedCategory, selectedColonia, searchQuery]);

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedSubcategory('all');
    setSelectedColonia('todas');
    setSearchQuery('');
  };

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedSubcategory !== 'all' ||
    selectedColonia !== 'todas' ||
    !!searchQuery;

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white py-10 px-4 sm:px-6 lg:px-8 border-b border-stone-800 relative overflow-hidden">
        <div className="max-w-[1560px] mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
              <Tag className="w-3.5 h-3.5" />
              <span>Anuncios Clasificados de Ciudad del Carmen</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Compra, renta, vende o encuentra empleo local
            </h1>
            <p className="text-sm sm:text-base text-stone-300 leading-relaxed">
              Publica gratis tu clasificado con fotos reales, ubicación, precio en MXN y contacto
              directo por WhatsApp o teléfono sin intermediarios.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={onOpenCreateModal}
              className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Publicar Anuncio Gratis</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedSubcategory('all');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
            }`}
          >
            Todos ({classifieds.length})
          </button>

          {CLASSIFIED_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const count = classifieds.filter(a => a.category === cat.id).length;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(isSelected ? 'all' : cat.id);
                  setSelectedSubcategory('all');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-stone-950' : cat.color}`} />
                <span>{cat.name.replace(/^\d+\.\s*/, '')}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Colonia input */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-3 rounded-2xl border border-stone-200 shadow-xs">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar en clasificados por título, descripción o colonia..."
              className="w-full pl-10 pr-4 py-2 bg-stone-50 rounded-xl text-xs sm:text-sm border border-stone-200 outline-none focus:border-amber-500"
            />
          </div>

          <div className="sm:col-span-4 relative">
            <select
              value={selectedColonia}
              onChange={e => setSelectedColonia(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 rounded-xl text-xs sm:text-sm border border-stone-200 outline-none focus:border-amber-500 text-stone-700 font-medium"
            >
              <option value="todas">Todas las colonias de Carmen</option>
              {coloniasList &&
                coloniasList.map(c => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
            <span>
              Mostrando <strong>{filteredAds.length}</strong> avisos clasificados
            </span>
            <button
              onClick={handleResetFilters}
              className="text-amber-600 hover:text-amber-700 font-semibold cursor-pointer"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Ads Grid */}
        {filteredAds.length === 0 ? (
          <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-4 max-w-md mx-auto my-8">
            <Tag className="w-12 h-12 text-stone-400 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-stone-900">
                No encontramos avisos clasificados
              </h3>
              <p className="text-xs text-stone-500">
                Prueba buscando con otros términos o sé el primero en publicar en esta sección.
              </p>
            </div>
            <button
              onClick={onOpenCreateModal}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              Publicar Primer Anuncio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredAds.map(ad => {
              const catInfo = CLASSIFIED_CATEGORIES.find(c => c.id === ad.category);
              const waUrl = getWhatsAppUrl(
                ad.whatsapp || ad.phone,
                `Hola, vi tu anuncio "${ad.title}" en Clasificados Carmelitas y deseo más informes.`
              );

              return (
                <div
                  key={ad.id}
                  onClick={() => onOpenDetailModal(ad)}
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg hover:border-amber-300 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    {/* Image */}
                    <div className="aspect-4/3 w-full bg-stone-100 relative overflow-hidden">
                      {ad.image || (ad.images && ad.images[0]) ? (
                        <img
                          src={ad.image || (ad.images && ad.images[0])}
                          alt={ad.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 bg-stone-100">
                          <Tag className="w-8 h-8 opacity-40" />
                          <span className="text-[10px] mt-1">Sin fotografía</span>
                        </div>
                      )}
                      {ad.price !== undefined && ad.price !== null && (
                        <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-stone-900/90 text-white font-black text-xs shadow-md">
                          ${ad.price.toLocaleString('es-MX')} {ad.currency || 'MXN'}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                        <span className="font-semibold text-amber-600 truncate">
                          {catInfo?.name.replace(/^\d+\.\s*/, '') || ad.category}
                        </span>
                        {ad.colonia && (
                          <>
                            <span>•</span>
                            <span className="truncate">{ad.colonia}</span>
                          </>
                        )}
                      </div>

                      <h3 className="font-bold text-sm text-stone-900 line-clamp-2 group-hover:text-amber-600 transition-colors">
                        {ad.title}
                      </h3>

                      <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                        {ad.description}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-3 pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-stone-400">
                      {ad.createdAt
                        ? new Date(ad.createdAt).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short'
                          })
                        : 'Reciente'}
                    </span>

                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1 font-bold text-[11px]"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>
                    )}
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
