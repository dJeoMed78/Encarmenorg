import React, { useState } from 'react';
import {
  LayoutGrid,
  Search,
  ChevronRight,
  Utensils,
  Pizza,
  Coffee,
  ShoppingBag,
  Car,
  Sparkles,
  Wrench,
  Scissors,
  Gem,
  HeartPulse,
  Building,
  Dog,
  PartyPopper,
  Stethoscope,
  GraduationCap,
  HardHat,
  Hammer,
  Anchor,
  ShieldAlert,
  Compass,
  Home,
  Key,
  Wind,
  Zap,
  Truck,
  Briefcase,
  Building2,
  Scale,
  Laptop,
  Printer,
  Gift,
  Smartphone
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

interface CategoriesFullViewProps {
  categories: ExtendedCategory[];
  allCategories?: ExtendedCategory[];
  onSelectCategory: (slug: string, subcategory?: string) => void;
}

export const CategoriesFullView: React.FC<CategoriesFullViewProps> = ({
  categories,
  onSelectCategory
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const renderIcon = (iconName?: string, className = 'w-5 h-5') => {
    switch (iconName) {
      case 'Utensils':
        return <Utensils className={className} />;
      case 'Pizza':
        return <Pizza className={className} />;
      case 'Coffee':
        return <Coffee className={className} />;
      case 'ShoppingBag':
        return <ShoppingBag className={className} />;
      case 'Car':
        return <Car className={className} />;
      case 'Sparkles':
        return <Sparkles className={className} />;
      case 'Wrench':
        return <Wrench className={className} />;
      case 'Scissors':
        return <Scissors className={className} />;
      case 'Gem':
        return <Gem className={className} />;
      case 'HeartPulse':
        return <HeartPulse className={className} />;
      case 'Building':
        return <Building className={className} />;
      case 'Dog':
        return <Dog className={className} />;
      case 'PartyPopper':
        return <PartyPopper className={className} />;
      case 'Stethoscope':
        return <Stethoscope className={className} />;
      case 'GraduationCap':
        return <GraduationCap className={className} />;
      case 'HardHat':
        return <HardHat className={className} />;
      case 'Hammer':
        return <Hammer className={className} />;
      case 'Anchor':
        return <Anchor className={className} />;
      case 'ShieldAlert':
        return <ShieldAlert className={className} />;
      case 'Compass':
        return <Compass className={className} />;
      case 'Home':
        return <Home className={className} />;
      case 'Key':
        return <Key className={className} />;
      case 'Wind':
        return <Wind className={className} />;
      case 'Zap':
        return <Zap className={className} />;
      case 'Truck':
        return <Truck className={className} />;
      case 'Briefcase':
        return <Briefcase className={className} />;
      case 'Building2':
        return <Building2 className={className} />;
      case 'Scale':
        return <Scale className={className} />;
      case 'Laptop':
        return <Laptop className={className} />;
      case 'Printer':
        return <Printer className={className} />;
      case 'Gift':
        return <Gift className={className} />;
      case 'Smartphone':
        return <Smartphone className={className} />;
      default:
        return <ShoppingBag className={className} />;
    }
  };

  const validCategories = categories.filter(c => {
    if (c.id === 15 || c.slug === 'uncategorized' || c.name.toLowerCase().includes('sin categor')) {
      return false;
    }
    const q = searchQuery.toLowerCase();
    const matchName = c.name.toLowerCase().includes(q);
    const matchSub = c.subcategories?.some(s => s.name.toLowerCase().includes(q));
    return matchName || matchSub;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-10 shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2 sm:space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Catálogo Completo por Giros Comerciales</span>
          </div>
          <h1 className="text-xl sm:text-4xl font-extrabold tracking-tight">
            Explora Todas las Categorías
          </h1>
          <p className="text-stone-300 text-xs sm:text-base leading-relaxed">
            Encuentra exactamente el producto o servicio que necesitas en Ciudad del Carmen
            organizado por giros comerciales y especialidades.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md mx-auto">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar categorías o especialidades..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm outline-none focus:border-amber-500 shadow-xs"
        />
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {validCategories.map(cat => (
          <div
            key={cat.id || cat.slug}
            className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => onSelectCategory(cat.slug)}
                  className="flex items-center gap-3 text-left group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors shrink-0">
                    {renderIcon(cat.icon)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-stone-900 group-hover:text-amber-600 transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-stone-400">{cat.count} negocios activos</p>
                  </div>
                </button>
              </div>

              {cat.subcategories && cat.subcategories.length > 0 && (
                <div className="pt-2 border-t border-stone-100 flex flex-wrap gap-1.5">
                  {cat.subcategories.map(sub => (
                    <button
                      key={sub.id || sub.slug}
                      onClick={() => onSelectCategory(cat.slug, sub.slug)}
                      className="px-2 py-1 rounded-lg bg-stone-50 hover:bg-amber-50 text-stone-600 hover:text-amber-700 text-[11px] font-medium border border-stone-100 transition-colors cursor-pointer"
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 mt-3 border-t border-stone-100 flex justify-end">
              <button
                onClick={() => onSelectCategory(cat.slug)}
                className="flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
              >
                <span>Ver empresas del giro</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
