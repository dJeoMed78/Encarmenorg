import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Menu,
  X,
  PlusCircle,
  Phone,
  ChevronRight,
  ChevronDown,
  MapPin,
  LayoutGrid,
  Flame,
  Calendar,
  Sparkles,
  Clock
} from 'lucide-react';
import { Business } from '../types';
import { PromoItem, EventItem } from './Hero';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  businesses?: Business[];
  promosList?: PromoItem[];
  eventsList?: EventItem[];
  onContactClick?: () => void;
  onAdminClick?: () => void;
  onEmergencyClick?: () => void;
  onRegisterClick?: () => void;
  onOpenPromo?: (promoId?: string | number) => void;
  onOpenEvent?: (eventId?: string | number) => void;
  onOpenAllPromos?: () => void;
  onSelectFilter?: (type: 'category' | 'colonia', value: string) => void;
  onOpenAllCategories?: () => void;
  onOpenAllColonias?: () => void;
}

export function Navbar({
  activeTab,
  setActiveTab,
  businesses = [],
  promosList = [],
  eventsList = [],
  onEmergencyClick,
  onRegisterClick,
  onOpenPromo,
  onOpenEvent,
  onOpenAllPromos,
  onSelectFilter,
  onOpenAllCategories,
  onOpenAllColonias
}: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [isPromosPopoverOpen, setIsPromosPopoverOpen] = useState(false);
  const [isEventsPopoverOpen, setIsEventsPopoverOpen] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const promosPopoverRef = useRef<HTMLDivElement>(null);
  const promosButtonRef = useRef<HTMLDivElement>(null);
  const eventsPopoverRef = useRef<HTMLDivElement>(null);
  const eventsButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsFilterPopoverOpen(false);
      }
      if (
        promosPopoverRef.current &&
        !promosPopoverRef.current.contains(target) &&
        promosButtonRef.current &&
        !promosButtonRef.current.contains(target)
      ) {
        setIsPromosPopoverOpen(false);
      }
      if (
        eventsPopoverRef.current &&
        !eventsPopoverRef.current.contains(target) &&
        eventsButtonRef.current &&
        !eventsButtonRef.current.contains(target)
      ) {
        setIsEventsPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
      setIsPromosPopoverOpen(false);
      setIsEventsPopoverOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setActiveTab(id);
      setIsFilterPopoverOpen(false);
      setIsPromosPopoverOpen(false);
      setIsEventsPopoverOpen(false);
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

  const handleRegisterClick = () => {
    setIsFilterPopoverOpen(false);
    setIsPromosPopoverOpen(false);
    setIsEventsPopoverOpen(false);
    setIsMobileMenuOpen(false);
    if (onRegisterClick) {
      onRegisterClick();
    } else {
      setActiveTab('registro');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleEmergencyClick = () => {
    setIsFilterPopoverOpen(false);
    setIsPromosPopoverOpen(false);
    setIsEventsPopoverOpen(false);
    setIsMobileMenuOpen(false);
    if (onEmergencyClick) {
      onEmergencyClick();
    }
  };

  const activePromos = promosList.length > 0 ? promosList.slice(0, 4) : [
    { id: 'promo-1', titulo: '2x1 en Alitas', negocio: 'Alitas Carmen', img: '/images/promos/promo-alitas-1.png' },
    { id: 'promo-2', titulo: '15% off en estética', negocio: 'Estética Carmen', img: '/images/promos/promo-estetica-1.png' },
    { id: 'promo-3', titulo: '22% off en Alitas', negocio: 'Burger & Wings', img: '/images/promos/promo-burger.png' },
    { id: 'promo-4', titulo: '15% off en estética', negocio: 'Barber & Fitness', img: '/images/promos/promo-gym.png' }
  ];

  const activeEvents = eventsList.length > 0 ? eventsList.slice(0, 3) : [
    { id: 1, dia: '15', mes: 'OCT', titulo: 'Festival Gastronómico', lugar: 'Malecón Costero' },
    { id: 2, dia: '28', mes: 'OCT', titulo: 'Bazar de Emprendedores', lugar: 'Parque Zaragoza' },
    { id: 3, dia: '02', mes: 'NOV', titulo: 'Desfile de Día de Muertos', lugar: 'Centro Histórico' }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 pt-0 relative z-50">
      <header
        className="w-full rounded-b-2xl sm:rounded-b-3xl px-3 sm:px-6 py-2.5 sm:py-3.5 flex flex-col gap-2.5 transition-all duration-300 shadow-xl"
        style={{
          background: 'rgba(255, 255, 255, 0.50)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderBottom: '1.5px solid rgba(255, 255, 255, 0.75)',
          borderLeft: '1.5px solid rgba(255, 255, 255, 0.65)',
          borderRight: '1.5px solid rgba(255, 255, 255, 0.65)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
        }}
      >
        {/* FILA 1: LOGO A LA IZQUIERDA Y BOTONES DE ACCIÓN A LA DERECHA */}
        <div className="w-full flex items-center justify-between gap-2">
          {/* LOGO OFICIAL */}
          <div
            onClick={() => {
              setActiveTab('negocios');
              setIsFilterPopoverOpen(false);
              setIsPromosPopoverOpen(false);
              setIsEventsPopoverOpen(false);
            }}
            className="flex items-center cursor-pointer select-none py-0.5 shrink-0"
          >
            <img
              src="/logo.png"
              alt="Empresas en Carmen - Directorio Empresarial"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/logo-oficial.png';
              }}
              className="h-8 sm:h-10 lg:h-11 w-auto object-contain"
            />
          </div>

          {/* BOTONES DE ACCIÓN SUPERIORES (Subir Mi Negocio + Núm. Emergencia) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleRegisterClick}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-full bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] font-bold text-[11px] sm:text-xs md:text-sm shadow-2xs transition-all active:scale-95 flex items-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#B45309] shrink-0" />
              <span>Subir Mi Negocio</span>
            </button>

            <button
              type="button"
              onClick={handleEmergencyClick}
              className="px-2.5 sm:px-4 py-1.5 rounded-full bg-[#FF3B30] hover:bg-[#E02E24] active:scale-95 text-white font-extrabold text-[11px] sm:text-xs md:text-sm shadow-md shadow-red-500/30 flex items-center gap-1 sm:gap-1.5 cursor-pointer transition-all whitespace-nowrap"
            >
              <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white fill-white shrink-0" />
              <span>Núm. Emergencia</span>
            </button>

            {/* BOTÓN MÓVIL BURGER (< 768px) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-1.5 rounded-xl bg-white/50 text-stone-800 hover:bg-white/80 transition cursor-pointer"
              aria-label="Abrir menú"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* FILA 2: SUBBARRA DE NAVEGACIÓN COMPLETA (PILL PROMOCIONES + ENLACES + PILL EVENTOS) */}
        <div className="w-full flex items-center justify-between gap-1 sm:gap-2 pt-1 border-t border-white/40 overflow-x-auto no-scrollbar">
          
          {/* BOTÓN IZQUIERDO: 🔥 Promociones ▾ */}
          <div ref={promosButtonRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsPromosPopoverOpen((prev) => !prev);
                setIsFilterPopoverOpen(false);
                setIsEventsPopoverOpen(false);
              }}
              className="px-3 sm:px-4 py-1.5 rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FFA800] hover:from-[#E65F00] hover:to-[#E59700] text-white font-extrabold text-xs sm:text-sm shadow-sm flex items-center gap-1.5 active:scale-95 transition cursor-pointer whitespace-nowrap"
            >
              <Flame className="w-3.5 h-3.5 text-white fill-white shrink-0" />
              <span>Promociones</span>
              <ChevronDown className={`w-3.5 h-3.5 text-white transition-transform duration-200 ${isPromosPopoverOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* POPOVER FLOTANTE DE PROMOCIONES */}
            {isPromosPopoverOpen && (
              <div
                ref={promosPopoverRef}
                className="absolute top-full left-0 mt-3 z-[110] w-[300px] sm:w-[360px] rounded-[24px] p-4 text-left shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                style={{
                  background: 'rgba(255, 255, 255, 0.96)',
                  backdropFilter: 'blur(35px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(35px) saturate(180%)',
                  border: '1.5px solid rgba(255, 255, 255, 0.9)',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs sm:text-sm font-extrabold text-stone-900 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-orange-600 fill-orange-600" />
                    <span>Promociones del Día</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPromosPopoverOpen(false);
                      if (onOpenAllPromos) onOpenAllPromos();
                      else setActiveTab('promociones');
                    }}
                    className="text-[11px] font-bold text-orange-600 hover:text-orange-800 hover:underline cursor-pointer"
                  >
                    Ver todas →
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mb-3">
                  {activePromos.map((p, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setIsPromosPopoverOpen(false);
                        if (onOpenPromo) onOpenPromo(p.id);
                      }}
                      className="group cursor-pointer flex flex-col"
                    >
                      <div className="w-full aspect-[16/10] rounded-xl overflow-hidden bg-stone-100 border border-stone-200/60 shadow-2xs group-hover:scale-[1.03] transition">
                        <img
                          src={p.img}
                          alt={p.titulo}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/categories/cuidado-y-belleza-personal.jpg';
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-[11px] font-bold text-stone-900 mt-1 truncate group-hover:text-orange-600">
                        {p.titulo}
                      </p>
                      {p.negocio && (
                        <p className="text-[10px] text-stone-600 truncate">{p.negocio}</p>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsPromosPopoverOpen(false);
                    if (onOpenAllPromos) onOpenAllPromos();
                    else setActiveTab('promociones');
                  }}
                  className="w-full py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs text-center border border-orange-200 transition active:scale-98 cursor-pointer"
                >
                  Explorar todas las promociones
                </button>
              </div>
            )}
          </div>

          {/* ENLACES CENTRALES: Negocios, Clasificados, Eventos, Promociones */}
          <nav className="flex items-center gap-1 sm:gap-2 lg:gap-3 mx-auto px-1">
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
                      className={`text-xs sm:text-sm tracking-tight transition-all duration-200 cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                        isActive
                          ? 'bg-white text-stone-900 font-bold px-3 sm:px-4 py-1.5 rounded-full shadow-xs border border-white'
                          : 'text-stone-800 hover:text-stone-950 font-semibold px-2.5 sm:px-3 py-1.5 hover:bg-white/40 rounded-full'
                      }`}
                    >
                      <span>{item.label}</span>
                    </button>

                    {/* POPOVER TOP 6 CATEGORÍAS + TOP 6 COLONIAS */}
                    {isFilterPopoverOpen && (
                      <div
                        ref={popoverRef}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-[110] w-[330px] sm:w-[460px] md:w-[490px] rounded-[28px] p-4 sm:p-5 text-left shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                        style={{
                          background: 'rgba(248, 250, 252, 0.97)',
                          backdropFilter: 'blur(45px) saturate(200%)',
                          WebkitBackdropFilter: 'blur(45px) saturate(200%)',
                          border: '1.5px solid rgba(255, 255, 255, 0.98)',
                          boxShadow: '0 28px 60px -12px rgba(0, 0, 0, 0.38), 0 0 0 1px rgba(0, 0, 0, 0.06)',
                        }}
                      >
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
                                else handleFilterClick('category', 'Todos');
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
                                className="px-3 py-2 rounded-2xl text-xs font-bold text-stone-900 bg-white hover:bg-amber-50 border border-stone-200/80 shadow-2xs active:scale-95 transition-all flex items-center justify-between gap-2 cursor-pointer"
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
                            <h4 className="text-[13px] font-bold text-stone-700 tracking-tight flex items-center gap-1.5">
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
                              <span>Ver todas las colonias</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {top6Colonias.map((col) => (
                              <button
                                key={col.name}
                                type="button"
                                onClick={() => handleFilterClick('colonia', col.name)}
                                className="px-2.5 py-2 rounded-2xl text-xs font-bold text-stone-900 bg-white hover:bg-sky-50 border border-stone-200/80 shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center justify-between gap-1.5"
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
                  className={`text-xs sm:text-sm tracking-tight transition-all duration-200 cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-stone-900 font-bold px-3 sm:px-4 py-1.5 rounded-full shadow-xs border border-white'
                      : 'text-stone-800 hover:text-stone-950 font-semibold px-2 sm:px-3 py-1.5 hover:bg-white/40 rounded-full'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* BOTÓN DERECHO: 📅 Eventos ▾ */}
          <div ref={eventsButtonRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsEventsPopoverOpen((prev) => !prev);
                setIsFilterPopoverOpen(false);
                setIsPromosPopoverOpen(false);
              }}
              className="px-3 sm:px-4 py-1.5 rounded-full bg-gradient-to-r from-[#5B67EA] to-[#7B46F6] hover:from-[#4E59D4] hover:to-[#6C3CE0] text-white font-extrabold text-xs sm:text-sm shadow-sm flex items-center gap-1.5 active:scale-95 transition cursor-pointer whitespace-nowrap"
            >
              <Calendar className="w-3.5 h-3.5 text-white shrink-0" />
              <span>Eventos</span>
              <ChevronDown className={`w-3.5 h-3.5 text-white transition-transform duration-200 ${isEventsPopoverOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* POPOVER FLOTANTE DE EVENTOS */}
            {isEventsPopoverOpen && (
              <div
                ref={eventsPopoverRef}
                className="absolute top-full right-0 mt-3 z-[110] w-[300px] sm:w-[350px] rounded-[24px] p-4 text-left shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                style={{
                  background: 'rgba(255, 255, 255, 0.96)',
                  backdropFilter: 'blur(35px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(35px) saturate(180%)',
                  border: '1.5px solid rgba(255, 255, 255, 0.9)',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs sm:text-sm font-extrabold text-stone-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>Cartelera de Eventos</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEventsPopoverOpen(false);
                      setActiveTab('eventos');
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                  >
                    Ver cartelera →
                  </button>
                </div>

                <div className="space-y-2 mb-3">
                  {activeEvents.map((evt, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setIsEventsPopoverOpen(false);
                        if (onOpenEvent) onOpenEvent(evt.id);
                        else setActiveTab('eventos');
                      }}
                      className="group cursor-pointer flex items-center gap-2.5 p-2 rounded-xl transition hover:bg-stone-100 border border-stone-200/60"
                    >
                      <div className="w-[34px] h-[38px] rounded-lg overflow-hidden flex flex-col shrink-0 text-center shadow-2xs border border-stone-300">
                        <div className="h-[14px] bg-[#54736a] text-white text-[8px] font-bold uppercase flex items-center justify-center">
                          {evt.mes}
                        </div>
                        <div className="flex-1 bg-white text-xs font-black text-stone-900 flex items-center justify-center">
                          {evt.dia}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-stone-900 truncate leading-tight group-hover:text-indigo-600">
                          {evt.titulo}
                        </p>
                        <p className="text-[10px] text-stone-600 truncate mt-0.5">
                          {evt.lugar}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsEventsPopoverOpen(false);
                    setActiveTab('eventos');
                  }}
                  className="w-full py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs text-center border border-indigo-200 transition active:scale-98 cursor-pointer"
                >
                  Ver cartelera completa de eventos
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* MENÚ MÓVIL DESPLEGABLE (< 768px) */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden mt-2 p-3 rounded-2xl flex flex-col gap-2 transition-all animate-in fade-in slide-in-from-top-2 duration-150"
          style={{
            background: 'rgba(255, 255, 255, 0.97)',
            backdropFilter: 'blur(25px)',
            WebkitBackdropFilter: 'blur(25px)',
            border: '1.5px solid rgba(255, 255, 255, 0.85)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
          }}
        >
          <div className="flex flex-col gap-1">
            {navLinks.map((item) => {
              const isActive =
                activeTab === item.id ||
                (item.id === 'negocios' && (activeTab === 'inicio' || activeTab === ''));

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`text-left px-4 py-2.5 rounded-xl text-sm transition flex items-center justify-between ${
                    isActive
                      ? 'bg-stone-900 text-white font-bold'
                      : 'text-stone-800 font-semibold hover:bg-stone-100'
                  }`}
                >
                  <span>{item.label}</span>
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-stone-200/80 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleRegisterClick}
              className="w-full py-2.5 px-4 rounded-xl bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-[#B45309]" />
              <span>Subir Mi Negocio</span>
            </button>

            <button
              type="button"
              onClick={handleEmergencyClick}
              className="w-full py-2.5 px-4 rounded-xl bg-[#FF3B30] hover:bg-[#E02E24] active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-red-500/25 cursor-pointer"
            >
              <Phone className="w-4 h-4 text-white fill-white" />
              <span>Núm. Emergencia (Guía Oficial)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
