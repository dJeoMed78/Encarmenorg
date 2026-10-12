import React from 'react';
import {
  UtensilsCrossed,
  Sparkles,
  ShoppingBag,
  Truck,
  Wrench,
  Rocket,
  Home,
  Printer,
  HeartPulse,
  Laptop,
  Car,
  Palette,
  Building,
  LayoutGrid,
  ChevronRight
} from 'lucide-react';
import { Category } from '../types';

interface ExtendedCategory extends Category {
  subcategories?: Array<{
    id: number | string;
    name: string;
    slug: string;
    count?: number;
  }>;
}

interface CategoryBarProps {
  categories: ExtendedCategory[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedSubcategory?: string;
  setSelectedSubcategory?: (sub: string) => void;
}

export const CategoryBar: React.FC<CategoryBarProps> = ({
  categories,
  selectedCategory,
  setSelectedCategory,
  selectedSubcategory = '',
  setSelectedSubcategory
}) => {
  const getCategoryIcon = (slug: string) => {
    switch (slug) {
      case 'alimentos-y-bebidas':
        return <UtensilsCrossed className="w-4 h-4" />;
      case 'cuidado-y-belleza':
      case 'cuidado-y-belleza-personal':
        return <Sparkles className="w-4 h-4" />;
      case 'venta-al-menudeo':
      case 'comercio-al-menudeo':
        return <ShoppingBag className="w-4 h-4" />;
      case 'servicios-logisticos':
      case 'servicios-logisticos-y-transporte':
        return <Truck className="w-4 h-4" />;
      case 'servicios':
      case 'servicios-del-hogar-y-oficios':
        return <Wrench className="w-4 h-4" />;
      case 'emprendedores':
        return <Rocket className="w-4 h-4" />;
      case 'para-el-hogar':
      case 'renta-de-inmuebles-espacios-y-mascotas':
        return <Home className="w-4 h-4" />;
      case 'imprentas-y-productos-promocionales':
        return <Printer className="w-4 h-4" />;
      case 'salud-y-bienestar':
      case 'salud-bienestar-y-educacion':
        return <HeartPulse className="w-4 h-4" />;
      case 'tecnologia-y-electronica':
      case 'tecnologia-imprentas-y-comercio-al-menudeo':
        return <Laptop className="w-4 h-4" />;
      case 'automotriz':
      case 'automotriz-y-motocicletas':
        return <Car className="w-4 h-4" />;
      case 'arte-y-cultura':
        return <Palette className="w-4 h-4" />;
      case 'renta-de-locales':
      case 'sector-industrial-petrolero-y-construccion':
        return <Building className="w-4 h-4" />;
      default:
        return <ShoppingBag className="w-4 h-4" />;
    }
  };

  const activeCat = categories.find(
    c => c.slug === selectedCategory || c.name.toLowerCase() === selectedCategory.toLowerCase()
  );

  return (
    <div className="bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 space-y-2.5 sm:space-y-3">
        {/* Horizontal Category Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pb-0.5 -mx-3 px-3 sm:mx-0 sm:px-0">
          <button
            onClick={() => {
              setSelectedCategory('all');
              if (setSelectedSubcategory) setSelectedSubcategory('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70 hover:text-stone-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Todos los Giros</span>
          </button>

          {categories.map(cat => {
            const isSelected =
              selectedCategory === cat.slug ||
              selectedCategory.toLowerCase() === cat.name.toLowerCase();

            return (
              <button
                key={cat.id || cat.slug}
                onClick={() => {
                  if (isSelected) {
                    setSelectedCategory('all');
                    if (setSelectedSubcategory) setSelectedSubcategory('');
                  } else {
                    setSelectedCategory(cat.slug);
                    if (setSelectedSubcategory) setSelectedSubcategory('');
                  }
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/25'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200/80 hover:text-stone-900'
                }`}
              >
                {getCategoryIcon(cat.slug)}
                <span>{cat.name}</span>
                <span
                  className={`text-[11px] font-normal px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-amber-600 text-white' : 'bg-stone-200/80 text-stone-600'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Subcategories (if selected category has any) */}
        {activeCat && activeCat.subcategories && activeCat.subcategories.length > 0 && (
          <div className="flex items-center gap-2 pt-1 border-t border-stone-100 overflow-x-auto no-scrollbar text-xs">
            <span className="text-stone-400 font-medium shrink-0 flex items-center gap-1">
              <span>Subcategorías de {activeCat.name}:</span>
              <ChevronRight className="w-3 h-3" />
            </span>

            <button
              onClick={() => setSelectedSubcategory && setSelectedSubcategory('')}
              className={`px-2.5 py-1 rounded-md transition-colors shrink-0 font-medium cursor-pointer ${
                selectedSubcategory
                  ? 'text-stone-600 hover:bg-stone-100'
                  : 'bg-stone-800 text-white'
              }`}
            >
              Todas ({activeCat.count})
            </button>

            {activeCat.subcategories.map(sub => {
              const isSubSelected = selectedSubcategory === sub.slug;
              return (
                <button
                  key={sub.id || sub.slug}
                  onClick={() =>
                    setSelectedSubcategory &&
                    setSelectedSubcategory(isSubSelected ? '' : sub.slug)
                  }
                  className={`px-2.5 py-1 rounded-md transition-colors shrink-0 font-medium cursor-pointer ${
                    isSubSelected
                      ? 'bg-amber-500 text-white'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {sub.name} {sub.count !== undefined && `(${sub.count})`}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
