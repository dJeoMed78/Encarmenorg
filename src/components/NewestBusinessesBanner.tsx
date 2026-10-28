import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Building2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Business } from '../types';
import { getOptimizedImageUrl } from '../utils/businessUrl';

interface NewestItem {
  id: number;
  name: string;
  slug?: string;
  date_created?: string;
  image: string;
  categories?: string[];
}

interface NewestBusinessesBannerProps {
  items: NewestItem[];
  onSelectBusiness?: (business: Business) => void;
  allBusinesses?: Business[];
}

export const NewestBusinessesBanner: React.FC<NewestBusinessesBannerProps> = ({
  items,
  onSelectBusiness,
  allBusinesses = []
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = direction === 'left' ? -380 : 380;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const handleClickItem = (item: NewestItem) => {
    if (!onSelectBusiness) return;
    // Find matching business in allBusinesses or construct one
    const found = allBusinesses.find(b => b.id === item.id || b.name.toLowerCase() === item.name.toLowerCase());
    if (found) {
      onSelectBusiness(found);
    } else {
      onSelectBusiness({
        id: item.id,
        name: item.name,
        slug: item.slug || '',
        description: `Empresa recientemente registrada en el portal Empresas en Carmen.`,
        phone: '',
        whatsapp: '',
        facebook: '',
        website: '',
        address: 'Ciudad del Carmen, Campeche',
        mapsUrl: '',
        schedule: '',
        payment: '',
        delivery: '',
        image: item.image,
        categories: item.categories || ['Comercio Local'],
        categorySlugs: [],
        rating: 0,
        reviewCount: 0,
        permalink: `https://empresasencarmen.com/empresa/${item.slug || ''}/`
      });
    }
  };

  return (
    <section className="bg-white border-y border-stone-200 py-8 px-4 sm:px-6 lg:px-8 relative shadow-sm my-10">
      <div className="max-w-[1560px] mx-auto">
        {/* Header with Title and Scroll Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                  Empresas nuevas en el portal
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-bold uppercase rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Últimas 15
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                Los negocios y marcas más recientes registradas y activas en el directorio de Ciudad del Carmen
              </p>
            </div>
          </div>

          {/* Controls: Left & Right navigation buttons + Ocultar/Ver */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 hover:border-amber-400 bg-stone-50 hover:bg-white text-stone-700 text-xs font-bold transition-all shadow-xs cursor-pointer mr-1"
            >
              <span>{isCollapsed ? 'Ver Nuevas Empresas' : 'Ocultar'}</span>
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>

            {!isCollapsed && (
              <>
                <span className="text-xs font-semibold text-stone-400 mr-1 hidden md:inline">
                  Desliza →
                </span>
                <button
                  onClick={() => scroll('left')}
                  aria-label="Desplazar hacia la izquierda"
                  className="w-9 h-9 rounded-xl border border-stone-300 hover:border-amber-500 bg-white hover:bg-amber-50 text-stone-700 hover:text-amber-700 flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scroll('right')}
                  aria-label="Desplazar hacia la derecha"
                  className="w-9 h-9 rounded-xl border border-stone-300 hover:border-amber-500 bg-white hover:bg-amber-50 text-stone-700 hover:text-amber-700 flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Carousel Container */}
        {!isCollapsed && (
          <div
            ref={scrollRef}
            className="flex items-stretch gap-4 sm:gap-6 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth no-scrollbar animate-fadeIn"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {items.map((item, index) => {
            const categoryName = item.categories && item.categories.length > 0 ? item.categories[0] : 'Comercio Local';
            return (
              <div
                key={item.id || index}
                onClick={() => handleClickItem(item)}
                className="group relative flex-none w-[200px] sm:w-[240px] md:w-[260px] bg-white rounded-2xl border border-stone-200/90 hover:border-amber-400 shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col snap-start hover:-translate-y-1"
              >
                {/* Image Container with 1:1 Aspect Ratio like the original portal */}
                <div className="relative aspect-square w-full bg-stone-100 overflow-hidden flex items-center justify-center border-b border-stone-100">
                  {item.image ? (
                    <img
                      src={getOptimizedImageUrl(item.image, 320)}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src !== item.image) {
                          target.src = item.image;
                        } else {
                          target.style.display = 'none';
                        }
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-stone-400 p-4 text-center">
                      <Building2 className="w-12 h-12 stroke-[1.5] text-stone-300 mb-2" />
                      <span className="text-xs font-medium">Empresas en Carmen</span>
                    </div>
                  )}

                  {/* Badge: Green New Distinctive Pill */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-emerald-600 text-white shadow-md flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span>Nueva</span>
                    </span>
                  </div>

                  {/* Hover Quick Action */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                      <span>Ver ficha completa</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                {/* Info Container */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded mb-1.5 truncate max-w-full">
                      {categoryName}
                    </span>
                    <h3 className="font-extrabold text-stone-900 text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-amber-600 transition-colors uppercase">
                      {item.name}
                    </h3>
                  </div>

                  <div className="pt-2 mt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                    <span className="truncate">Cd. del Carmen</span>
                    <span className="font-semibold text-amber-600 group-hover:underline">Contactar →</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </section>
  );
};
