import React, { useState, useMemo } from 'react';
import { Menu, X, PlusCircle, Phone, ChevronRight, MapPin, LayoutGrid } from 'lucide-react';
import { Business } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  businesses?: Business[];
  onEmergencyClick?: () => void;
  onRegisterClick?: () => void;
  onAdminClick?: () => void;
  onSelectFilter?: (type: 'category' | 'colonia', value: string) => void;
  onOpenAllCategories?: () => void;
  onOpenAllColonias?: () => void;
}

export function Navbar({
  activeTab,
  setActiveTab,
  businesses = [],
  onEmergencyClick,
  onRegisterClick,
  onAdminClick,
  onSelectFilter,
  onOpenAllCategories,
  onOpenAllColonias
}: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsFilterPopoverOpen(false);
      }
    }
    if (isFilterPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterPopoverOpen]);

  // Calcular dinámicamente las 6 CATEGORÍAS con más empresas registradas
  const top6Categories = useMemo(() => {
    const counts: Record<string, number> = {};
    businesses.forEach((b) => {
      const cat = (b.category || '').trim();
      if (cat && !cat.toLowerCase().includes('sin categor')) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    const sorted = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    if (sorted.length > 0) return sorted;
    return [
      { name: 'Alimentos y Bebidas', count: 48 },
      { name: 'Salud, Bienestar y Educación', count: 32 },
      { name: 'Servicios del Hogar y Oficios', count: 29 },
      { name: 'Tecnología y Comercio', count: 25 },
      { name: 'Talleres Mecánicos', count: 21 },
      { name: 'Cuidado y Belleza Personal', count: 19 }
    ];
  }, [businesses]);

  // Calcular dinámicamente las 6 COLONIAS con más negocios registrados
  const top6Colonias = useMemo(() => {
    const counts: Record<string, number> = {};
    businesses.forEach((b) => {
      const col = (b.colonia || '').trim();
      if (col) {
        counts[col] = (counts[col] || 0) + 1;
      }
    });
    const sorted = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    if (sorted.length > 0) return sorted;
    return [
      { name: 'Centro', count: 119 },
      { name: 'Renovación', count: 6 },
      { name: 'Miguel de la Madrid', count: 6 },
      { name: 'Aviación', count: 4 },
      { name: 'Morelos', count: 4 },
      { name: 'Playa Norte', count: 3 }
    ];
  }, [businesses]);

  const navLinks = [
    { id: 'negocios', label: 'Negocios' },
    { id: 'clasificados', label: 'Clasificados' },
    { id: 'eventos', label: 'Eventos' },
    { id: 'promociones', label: 'Promociones' },
  ];

  const handleNavClick = (id: string) => {
    if (id === 'negocios') {
      setActiveTab('negocios');
      setIsFilterPopoverOpen((prev) => !prev);
    } else {
      setActiveTab(id);
      setIsFilterPopoverOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  const handleFilterClick = (type: 'category' | 'colonia', value: string) => {
    setIsFilterPopoverOpen(false);
    setIsMobileMenuOpen(false);
    if (onSelectFilter) {
      onSelectFilter(type, value);
    } else {
      setActiveTab('negocios');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 pt-0 relative z-50">
      <header
        className="w-full rounded-b-2xl px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between transition-all duration-300"
        style={{
          background: 'rgba(255, 255, 255, 0.48)',
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
          borderBottom: '1.5px solid rgba(255, 255, 255, 0.75)',
          borderLeft: '1.5px solid rgba(255, 255, 255, 0.65)',
          borderRight: '1.5px solid rgba(255, 255, 255, 0.65)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
        }}
      >
        <div
          onClick={() => {
            setActiveTab('negocios');
            setIsFilterPopoverOpen(false);
          }}
          className="flex items-center cursor-pointer select-none py-0.5 shrink-0"
        >
          <img
            src="/logo.png"
            alt="Empresas en Carmen - Directorio Empresarial"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/logo-oficial.png';
            }}
            className="h-9 sm:h-11 md:h-12 w-auto object-contain"
          />
        </div>

        <nav className="hidden lg:flex items-center gap-1 sm:gap-1.5 xl:gap-2">
          {navLinks.map((item) => {
            const isActive =
              activeTab === item.id ||
              (item.id === 'negocios' && (activeTab === 'inicio' || activeTab === ''));

            if (item.id === 'negocios') {
              return (
                <div key={item.id} ref={buttonRef} className="relative">
                  <button
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`text-sm tracking-tight transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-white text-stone-900 font-bold px-4 py-1.5 rounded-full shadow-xs border border-white'
                        : 'text-stone-800 hover:text-stone-950 font-medium px-3.5 py-1.5 hover:bg-white/30 rounded-full'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>

                  {/* MODAL DESPLEGABLE COMPLETO SIN CORTARSE: TOP 6 CATEGORÍAS + TOP 6 COLONIAS */}
                  {isFilterPopoverOpen && (
                    <div
                      ref={popoverRef}
                      className="absolute top-full left-0 mt-3.5 z-[100] w-[350px] sm:w-[460px] md:w-[520px] rounded-[28px] p-5 text-left shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                      style={{
                        background: 'rgba(248, 250, 252, 0.96)',
                        backdropFilter: 'blur(45px) saturate(200%)',
                        WebkitBackdropFilter: 'blur(45px) saturate(200%)',
                        border: '1.5px solid rgba(255, 255, 255, 0.98)',
                        boxShadow: '0 28px 60px -12px rgba(0, 0, 0, 0.38), 0 0 0 1px rgba(0, 0, 0, 0.06)',
                      }}
                    >
                      {/* 1. SECCIÓN: 6 CATEGORÍAS CON MÁS EMPRESAS */}
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[13px] font-bold text-stone-700 tracking-tight flex items-center gap-1.5">
                            <LayoutGrid className="w-3.5 h-3.5 text-amber-600" />
                            <span>Buscar por Categoría (Top 6)</span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setIsFilterPopoverOpen(false);
                              if (onOpenAllCategories) onOpenAllCategories();
                              else {
                                onSelectFilter?.('category', 'Todos');
                                setActiveTab('negocios');
                              }
                            }}
                            className="text-xs font-extrabold text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Todas las categorías</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {top6Categories.map((cat) => (
                            <button
                              key={cat.name}
                              type="button"
                              onClick={() => handleFilterClick('category', cat.name)}
                              className="px-3.5 py-2 rounded-2xl text-xs font-bold text-stone-900 bg-white hover:bg-amber-50 border border-stone-200/80 shadow-2xs active:scale-95 transition-all flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <span className="truncate">{cat.name}</span>
                              <span className="text-[10px] text-amber-800 font-extrabold px-2 py-0.5 rounded-full bg-amber-100 shrink-0">
                                {cat.count}
                              </span>
                            </button>
                          ))}
                        </div>

                        <div className="my-4 border-t border-stone-300/70" />

                        {/* 2. SECCIÓN: 6 COLONIAS CON MÁS NEGOCIOS REGISTRADOS */}
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[13px] font-bold text-stone-700 tracking-tight flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-sky-600" />
                            <span>Buscar por Colonia (Top 6)</span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setIsFilterPopoverOpen(false);
                              if (onOpenAllColonias) onOpenAllColonias();
                              else {
                                onSelectFilter?.('colonia', 'Todas');
                                setActiveTab('negocios');
                              }
                            }}
                            className="text-xs font-extrabold text-sky-700 hover:text-sky-900 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Ver todas las colonias disponibles</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {top6Colonias.map((col) => (
                            <button
                              key={col.name}
                              type="button"
                              onClick={() => handleFilterClick('colonia', col.name)}
                              className="px-3 py-2 rounded-2xl text-xs font-bold text-stone-900 bg-white hover:bg-sky-50 border border-stone-200/80 shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center justify-between gap-1.5"
                            >
                              <span className="truncate">{col.name}</span>
                              <span className="text-[10px] text-sky-800 font-extrabold px-1.5 py-0.5 rounded-full bg-sky-100 shrink-0">
                                {col.count}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`text-sm tracking-tight transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white text-stone-900 font-bold px-4 py-1.5 rounded-full shadow-xs border border-white'
                    : 'text-stone-800 hover:text-stone-950 font-medium px-3.5 py-1.5 hover:bg-white/30 rounded-full'
                }`}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="hidden sm:flex items-center gap-2 lg:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsFilterPopoverOpen(false);
              if (onRegisterClick) onRegisterClick();
              else setActiveTab('registro');
            }}
            className="px-3.5 py-1.5 rounded-full bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] font-bold text-xs sm:text-sm shadow-2xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#B45309]" />
            <span>Subir Mi Negocio</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsFilterPopoverOpen(false);
              onEmergencyClick?.();
            }}
            className="px-4 py-1.5 rounded-full bg-[#FF3B30] hover:bg-[#E02E24] active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-red-500/30 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Phone className="w-4 h-4 text-white fill-white" />
            <span>Núm. Emergencia</span>
          </button>

          {/* BOTÓN PI DE ADMINISTRACIÓN */}
          <button
            type="button"
            onClick={() => {
              setIsFilterPopoverOpen(false);
              onAdminClick?.();
            }}
            className="w-9 h-9 rounded-full bg-white/70 hover:bg-amber-400 hover:text-stone-950 text-stone-800 border border-white/80 shadow-xs flex items-center justify-center font-serif text-base font-bold transition-all active:scale-95 cursor-pointer"
            title="Panel de Administración (π)"
          >
            π
          </button>
        </div>

        <div className="sm:hidden flex items-center gap-1.5">
          <button
            type="button"
            onClick={onEmergencyClick}
            className="px-2.5 py-1 rounded-full bg-[#FF3B30] text-white font-extrabold text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Phone className="w-3.5 h-3.5 text-white fill-white" />
            <span>Núm. Emergencia</span>
          </button>

          {/* BOTÓN PI DE ADMINISTRACIÓN MÓVIL */}
          <button
            type="button"
            onClick={onAdminClick}
            className="w-7 h-7 rounded-full bg-white/70 hover:bg-amber-400 text-stone-800 font-serif text-sm font-bold flex items-center justify-center border border-white/80 cursor-pointer shadow-xs"
            title="Panel de Administración (π)"
          >
            π
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-white/50 text-stone-800 hover:bg-white/80 transition cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Menú móvil desplegable */}
      {isMobileMenuOpen && (
        <div className="sm:hidden mt-2 p-4 rounded-2xl bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {navLinks.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`p-2.5 rounded-xl text-xs font-bold text-center ${
                  activeTab === item.id ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              if (onRegisterClick) onRegisterClick();
              else setActiveTab('registro');
            }}
            className="w-full py-2.5 rounded-xl bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Subir Mi Negocio</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              onAdminClick?.();
            }}
            className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
          >
            <span className="font-serif text-base font-bold text-amber-600">π</span>
            <span>Panel de Administración</span>
          </button>
        </div>
      )}
    </div>
  );
}
