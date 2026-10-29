import React, { useState, useMemo, useEffect } from 'react';
import { PlusCircle, Phone, ChevronRight, ChevronDown, ChevronUp, MapPin, LayoutGrid } from 'lucide-react';
import { Business } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  businesses?: Business[];
  onContactClick?: () => void;
  onAdminClick?: () => void;
  onEmergencyClick?: () => void;
  onRegisterClick?: () => void;
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
  onSelectFilter,
  onOpenAllCategories,
  onOpenAllColonias
}: NavbarProps) {
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isIpadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    const isTouchUA = /iPad|iPhone|iPod|Android|Tablet/i.test(navigator.userAgent);
    return window.innerWidth < 1280 || isIpadOS || isTouchUA;
  });

  useEffect(() => {
    const checkViewport = () => {
      const isIpadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
      const isTouchUA = /iPad|iPhone|iPod|Android|Tablet/i.test(navigator.userAgent);
      setIsMobileOrTablet(window.innerWidth < 1280 || isIpadOS || isTouchUA);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

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
      { name: 'Tecnología, Imprentas y Comercio al Menudeo', count: 25 },
      { name: 'Talleres Mecánicos', count: 21 },
      { name: 'Cuidado y Belleza Personal', count: 19 }
    ];
  }, [businesses]);

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
  };

  const handleFilterClick = (type: 'category' | 'colonia', value: string) => {
    setIsFilterPopoverOpen(false);
    if (onSelectFilter) {
      onSelectFilter(type, value);
    } else {
      setActiveTab('negocios');
    }
  };

  const handleRegisterClick = () => {
    setIsFilterPopoverOpen(false);
    if (onRegisterClick) {
      onRegisterClick();
    } else {
      setActiveTab('registro');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleEmergencyClick = () => {
    setIsFilterPopoverOpen(false);
    if (onEmergencyClick) {
      onEmergencyClick();
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 pt-0 relative z-50">
      <header
        className="w-full rounded-b-2xl px-3 sm:px-5 lg:px-8 py-2.5 sm:py-3 transition-all duration-300 relative"
        style={{
          background: 'rgba(255, 255, 255, 0.52)',
          backdropFilter: 'blur(26px) saturate(180%)',
          WebkitBackdropFilter: 'blur(26px) saturate(180%)',
          borderBottom: '1.5px solid rgba(255, 255, 255, 0.82)',
          borderLeft: '1.5px solid rgba(255, 255, 255, 0.70)',
          borderRight: '1.5px solid rgba(255, 255, 255, 0.70)',
          boxShadow: '0 6px 24px rgba(0, 0, 0, 0.10), inset 0 1px 1px rgba(255, 255, 255, 0.92)',
        }}
      >
        {!isMobileOrTablet ? (
          /* ========================================================== */
          /* 1. VISTA ESCRITORIO (COMPUTADORA): 1 RENGLÓN               */
          /* ========================================================== */
          <div className="flex items-center justify-between gap-4">
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
                className="h-11 w-auto object-contain"
              />
            </div>

            <nav className="flex items-center gap-2">
              {navLinks.map((item) => {
                const isActive =
                  activeTab === item.id ||
                  (item.id === 'negocios' && (activeTab === 'inicio' || activeTab === ''));

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`text-sm tracking-tight transition-all duration-200 cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-stone-900 font-bold px-4 py-1.5 rounded-full shadow-xs border border-white'
                        : 'text-stone-800 hover:text-stone-950 font-semibold px-3.5 py-1.5 hover:bg-white/35 rounded-full'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.id === 'negocios' && (
                      isFilterPopoverOpen ? (
                        <ChevronUp className="w-3.5 h-3.5 text-stone-600" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-stone-600" />
                      )
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleRegisterClick}
                className="px-3.5 py-1.5 rounded-full bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] font-bold text-sm shadow-2xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <PlusCircle className="w-4 h-4 text-[#B45309] shrink-0" />
                <span>Subir Mi Negocio</span>
              </button>

              <button
                type="button"
                onClick={handleEmergencyClick}
                className="px-4 py-1.5 rounded-full bg-[#FF3B30] hover:bg-[#E02E24] active:scale-95 text-white font-extrabold text-sm shadow-md shadow-red-500/30 flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
              >
                <Phone className="w-4 h-4 text-white fill-white shrink-0" />
                <span>Núm. Emergencia</span>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================== */
          /* 2. VISTA CELULAR, IPAD Y TABLET: 2 RENGLONES               */
          /*    RENGLÓN 1: LOGO + SUBIR MI NEGOCIO + NÚM. EMERGENCIA    */
          /*    RENGLÓN 2: NEGOCIOS · CLASIFICADOS · EVENTOS · PROMOS   */
          /* ========================================================== */
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-1.5 sm:gap-3 w-full pb-2 border-b border-white/60 max-[350px]:flex-wrap">
              <div
                onClick={() => {
                  setActiveTab('negocios');
                  setIsFilterPopoverOpen(false);
                }}
                className="flex items-center cursor-pointer select-none shrink-0 max-[350px]:w-full"
              >
                <img
                  src="/logo.png"
                  alt="Empresas en Carmen"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/logo-oficial.png';
                  }}
                  className="h-8 sm:h-10 w-auto object-contain"
                />
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 max-[350px]:w-full max-[350px]:justify-between">
                <button
                  type="button"
                  onClick={handleRegisterClick}
                  className="shrink-0 px-2.5 sm:px-4 py-1.5 rounded-full bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] font-bold text-xs sm:text-sm shadow-2xs transition-all active:scale-95 flex items-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#B45309] shrink-0" />
                  <span>Subir Mi Negocio</span>
                </button>

                <button
                  type="button"
                  onClick={handleEmergencyClick}
                  className="shrink-0 px-2.5 sm:px-4 py-1.5 rounded-full bg-[#FF3B30] hover:bg-[#E02E24] active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-red-500/30 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer transition-all select-none"
                  title="Guía de Teléfonos de Emergencia 24/7 de Ciudad del Carmen"
                  aria-label="Números de Emergencia 911"
                >
                  <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white fill-white shrink-0" />
                  <span className="inline sm:hidden font-black tracking-wide">SOS</span>
                  <span className="hidden sm:inline whitespace-nowrap">Núm. Emergencia</span>
                </button>
              </div>
            </div>

            <nav className="pt-2 flex items-center justify-center sm:justify-around gap-1 sm:gap-2 flex-wrap">
              {navLinks.map((item) => {
                const isActive =
                  activeTab === item.id ||
                  (item.id === 'negocios' && (activeTab === 'inicio' || activeTab === ''));

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`text-xs sm:text-sm tracking-tight transition-all duration-200 cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-stone-900 font-extrabold px-3.5 sm:px-4 py-1 rounded-full shadow-xs border border-white'
                        : 'text-stone-900 hover:text-black font-bold px-2.5 sm:px-3.5 py-1 hover:bg-white/40 rounded-full'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.id === 'negocios' && (
                      isFilterPopoverOpen ? (
                        <ChevronUp className="w-3.5 h-3.5 text-stone-700" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-stone-700" />
                      )
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* PANEL DESPLEGABLE DE NEGOCIOS (TOP 6 CATEGORÍAS + TOP 6 COLONIAS) */}
        {isFilterPopoverOpen && (
          <div
            className="mt-3 pt-3 border-t border-white/70 rounded-3xl p-4 sm:p-5 text-left shadow-2xl animate-in fade-in duration-150"
            style={{
              background: 'rgba(248, 250, 252, 0.96)',
              backdropFilter: 'blur(40px) saturate(200%)',
              WebkitBackdropFilter: 'blur(40px) saturate(200%)',
              border: '1.5px solid rgba(255, 255, 255, 0.98)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs sm:text-[13px] font-bold text-stone-700 tracking-tight flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-amber-600" />
                <span>Buscar por Categoría (Top 6)</span>
              </h4>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsFilterPopoverOpen(false);
                    if (onOpenAllCategories) onOpenAllCategories();
                    else handleFilterClick('category', 'Todos');
                  }}
                  className="text-xs font-extrabold text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Todas las categorías</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterPopoverOpen(false)}
                  className="px-2.5 py-0.5 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 text-[11px] font-bold cursor-pointer"
                >
                  Cerrar ▲
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
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

            <div className="my-3.5 border-t border-stone-300/70" />

            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs sm:text-[13px] font-bold text-stone-700 tracking-tight flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                <span>Buscar por Colonia (Top 6)</span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  setIsFilterPopoverOpen(false);
                  if (onOpenAllColonias) onOpenAllColonias();
                  else handleFilterClick('colonia', 'Todas');
                }}
                className="text-xs font-extrabold text-sky-700 hover:text-sky-900 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Ver todas las colonias disponibles</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
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
        )}
      </header>
    </div>
  );
}
