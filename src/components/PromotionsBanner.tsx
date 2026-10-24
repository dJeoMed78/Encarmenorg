import React, { useState, useEffect } from 'react';
import {
  Tag,
  Sparkles,
  Clock,
  ArrowRight,
  ShieldCheck,
  Flame,
  Gift,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Search,
  X
} from 'lucide-react';
import { Promotion } from '../types';

interface PromotionsBannerProps {
  promotions: Promotion[];
  onSelectPromotion: (promo: Promotion) => void;
  onSelectBusiness?: (businessId: number) => void;
}

export const PromotionsBanner: React.FC<PromotionsBannerProps> = ({
  promotions,
  onSelectPromotion,
  onSelectBusiness
}) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem('carmelita_promotions_collapsed');
      return stored !== null ? stored === 'true' : false; // Por default visible y abierto
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('carmelita_promotions_collapsed', String(next));
      } catch {}
      return next;
    });
  };
  const [currentPage, setCurrentPage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isAllPromosModalOpen, setIsAllPromosModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');

  if (!promotions || !Array.isArray(promotions) || promotions.length === 0) return null;

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // PAGINATION & AUTO-SLIDE LOGIC
  const itemsPerPage = isMobile ? 1 : 4;
  const totalPages = Math.ceil(promotions.length / itemsPerPage);

  // Reset page when viewport changes
  useEffect(() => {
    setCurrentPage(0);
  }, [isMobile]);

  // Auto-slide only if more than totalPages > 1 and not paused
  useEffect(() => {
    if (isHovered || isCollapsed || totalPages <= 1 || isAllPromosModalOpen) {
      return;
    }
    const timer = setInterval(() => {
      setCurrentPage(prev => (prev + 1 >= totalPages ? 0 : prev + 1));
    }, 5500);

    return () => clearInterval(timer);
  }, [isHovered, isCollapsed, totalPages, isAllPromosModalOpen]);

  const handlePrevPage = () => {
    setCurrentPage(prev => (prev - 1 < 0 ? Math.max(0, totalPages - 1) : prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => (prev + 1 >= totalPages ? 0 : prev + 1));
  };

  // Filtrado para la hoja modal completa
  const filteredModalPromos = promotions.filter(p => {
    if (!modalSearch.trim()) return true;
    const q = modalSearch.toLowerCase();
    return (
      p.businessName.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.discount.toLowerCase().includes(q)
    );
  });

  const renderPromoCard = (promo: Promotion) => {
    const remaining = Math.max(0, (promo.totalCoupons || 5) - (promo.claimedCount || 0));
    const isSoldOut = remaining <= 0;

    return (
      <article
        key={promo.id}
        className="rounded-3xl p-4.5 transition-all duration-300 flex flex-col justify-between space-y-3 group text-left h-full hover:-translate-y-1"
        style={{
          background: 'rgba(255, 255, 255, 0.82)',
          backdropFilter: 'blur(25px) saturate(190%)',
          WebkitBackdropFilter: 'blur(25px) saturate(190%)',
          border: '1.5px solid rgba(255, 255, 255, 0.95)',
          boxShadow: '0 12px 30px -8px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.95)'
        }}
      >
        <div>
          {/* Top badges */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="px-3 py-1 rounded-xl bg-[#007AFF] text-white font-extrabold text-xs tracking-wider shadow-sm shadow-blue-500/20">
              {promo.discount}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                isSoldOut
                  ? 'bg-stone-200 text-stone-600'
                  : remaining <= 2
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isSoldOut ? '¡Agotado!' : `Quedan ${remaining} de ${promo.totalCoupons}`}
            </span>
          </div>

          {/* Business Name & Promotion Title */}
          <h3 className="text-xs font-black text-amber-700 uppercase tracking-wider mb-0.5">
            {promo.businessName}
          </h3>
          <h4 className="text-sm font-black text-stone-950 leading-snug line-clamp-2">
            {promo.title}
          </h4>
          <p className="text-xs text-stone-600 line-clamp-2 mt-1.5 leading-relaxed font-medium">
            {promo.description}
          </p>
        </div>

        <div className="pt-2.5 border-t border-stone-200/60 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span>Hasta: {promo.validUntil}</span>
          </span>

          <button
            type="button"
            onClick={() => {
              if (isAllPromosModalOpen) setIsAllPromosModalOpen(false);
              onSelectPromotion(promo);
            }}
            disabled={isSoldOut}
            className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
              isSoldOut
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                : 'bg-[#007AFF] hover:bg-[#0062cc] text-white shadow-md shadow-blue-500/25'
            }`}
          >
            <span>{isSoldOut ? 'Agotado' : 'Reclamar'}</span>
            {!isSoldOut && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </article>
    );
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 my-4 text-left">
      <div
        className="rounded-3xl p-4 sm:p-6 relative overflow-hidden transition-all duration-300"
        style={{
          background: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(35px) saturate(190%)',
          WebkitBackdropFilter: 'blur(35px) saturate(190%)',
          border: '1.5px solid rgba(255, 255, 255, 0.85)',
          boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.95)'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${!isCollapsed ? 'pb-4 border-b border-amber-200/70' : ''}`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-stone-950 font-black shadow-md shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                  Promociones y Cupones del Día
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider animate-pulse">
                  {promotions.length} {promotions.length === 1 ? 'Oferta' : 'Ofertas'}
                </span>
              </div>
              <p className="text-xs text-stone-600 font-medium">
                Descuentos exclusivos por tiempo limitado en comercios locales de Ciudad del Carmen.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <div className="hidden md:flex items-center gap-1.5 text-[11px] font-bold text-amber-900 bg-amber-200/60 px-3 py-1.5 rounded-xl">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Códigos verificados</span>
            </div>

            {/* BOTÓN SOLICITADO: Abrir hoja donde esté todo el listado de promociones */}
            <button
              type="button"
              onClick={() => setIsAllPromosModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-colors cursor-pointer shadow-xs"
              title="Ver todas las ofertas en un listado completo"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Ver todos ({promotions.length})</span>
            </button>

            {/* Toggle Collapse/Expand Button (Homologado con Cartelera) */}
            <button
              type="button"
              onClick={toggleCollapse}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 border border-amber-400/40 text-xs font-bold transition-colors cursor-pointer"
            >
              <span>{isCollapsed ? 'Ver Ofertas' : 'Minimizar'}</span>
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Promotions Carousel Content */}
        {!isCollapsed && (
          <div className="pt-4 space-y-4">
            {/* Carousel Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 pb-1">
                <span className="text-[11px] font-bold text-stone-600">
                  Página {currentPage + 1} de {totalPages} • Ofertas y Cupones en Carmen
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevPage}
                    className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors cursor-pointer"
                    title="Página anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono font-bold px-2 text-stone-700">
                    {currentPage + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextPage}
                    className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors cursor-pointer"
                    title="Página siguiente"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* CARRUSEL O CUADRÍCULA ESTÁTICA */}
            <div className="relative overflow-hidden">
              {/* Si hay 4 o menos, se muestra fijo sin desplazamiento para no dejar huecos */}
              {promotions.length <= itemsPerPage ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {promotions.map(promo => renderPromoCard(promo))}
                </div>
              ) : (
                /* Si hay más de itemsPerPage, se desplaza una página completa */
                <div
                  className="flex transition-transform duration-700 ease-out"
                  style={{ transform: `translateX(-${currentPage * 100}%)` }}
                >
                  {Array.from({ length: totalPages }).map((_, pageIdx) => {
                    const pageItems = promotions.slice(
                      pageIdx * itemsPerPage,
                      (pageIdx + 1) * itemsPerPage
                    );
                    return (
                      <div
                        key={pageIdx}
                        className="w-full shrink-0 grid grid-cols-1 md:grid-cols-4 gap-4"
                      >
                        {pageItems.map(promo => renderPromoCard(promo))}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Indicadores de puntos por página */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 pt-3">
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        currentPage === idx
                          ? 'w-6 bg-amber-600'
                          : 'w-1.5 bg-amber-300 hover:bg-amber-400'
                      }`}
                      title={`Ir a la página ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* HOJA COMPLETA / MODAL CON TODO EL LISTADO DE PROMOCIONES */}
      {/* ============================================================== */}
      {isAllPromosModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 text-left"
          style={{
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(25px)',
            WebkitBackdropFilter: 'blur(25px)'
          }}
        >
          <div
            className="rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(40px) saturate(190%)',
              WebkitBackdropFilter: 'blur(40px) saturate(190%)',
              border: '1.5px solid rgba(255, 255, 255, 0.95)',
              boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.95)'
            }}
          >
            {/* Header */}
            <div
              className="p-4 sm:p-6 flex items-center justify-between gap-4 sticky top-0 z-10"
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1.5px solid rgba(255, 255, 255, 0.8)'
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-stone-950 font-black shadow-md shrink-0">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
                    Todas las Promociones y Cupones del Día
                  </h3>
                  <p className="text-xs text-stone-600 font-medium">
                    Catálogo completo de cupones con descuento en Ciudad del Carmen ({promotions.length} ofertas activas)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAllPromosModalOpen(false)}
                className="p-2 rounded-full hover:bg-white/80 text-stone-600 hover:text-stone-950 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search filter in modal */}
            <div
              className="p-4 border-b border-stone-200/50"
              style={{ background: 'rgba(255, 255, 255, 0.5)' }}
            >
              <div className="relative max-w-md">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={e => setModalSearch(e.target.value)}
                  placeholder="Buscar promociones por comercio o descuento..."
                  className="w-full pl-10 pr-4 py-2 bg-white/80 border border-stone-200/80 rounded-2xl text-xs text-stone-900 placeholder:text-stone-400 outline-none focus:border-blue-500 shadow-xs"
                />
              </div>
            </div>

            {/* Modal Body: Grid of all promotions */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {filteredModalPromos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredModalPromos.map(promo => renderPromoCard(promo))}
                </div>
              ) : (
                <div className="text-center py-12 text-stone-500 text-sm font-medium">
                  No se encontraron promociones con los términos de búsqueda.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              className="p-4 flex items-center justify-between text-xs text-stone-600 font-medium"
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
                borderTop: '1.5px solid rgba(255, 255, 255, 0.8)'
              }}
            >
              <span>Cupones verificados • Empresas en Carmen</span>
              <button
                type="button"
                onClick={() => setIsAllPromosModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-200/80 hover:bg-stone-300 text-stone-900 font-bold cursor-pointer transition-all active:scale-95"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
