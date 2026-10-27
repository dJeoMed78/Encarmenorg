import React from 'react';
import { Phone, Star, CheckCircle2, Bookmark, MapPin } from 'lucide-react';
import { CATEGORY_VISUALS } from '../data/categoryVisuals';
import { Business } from '../types';
import { formatBusinessName, formatAddressText } from '../utils/textUtils';

export type { Business };

interface BusinessCardProps {
  business: Business;
  onClick: () => void;
  hasActivePromo?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (b: Business) => void;
}

export function BusinessCard({
  business,
  onClick,
  hasActivePromo = false,
  isFavorite = false,
  onToggleFavorite,
}: BusinessCardProps) {
  const phoneClean = business.phone ? business.phone.replace(/\D/g, '') : '';
  const waClean = business.whatsapp ? business.whatsapp.replace(/\D/g, '') : '';
  const targetCall = phoneClean || waClean;
  const rawWhatsApp = waClean || phoneClean;
  const targetWa = /^521\d{10}$/.test(rawWhatsApp) ? `52${rawWhatsApp.slice(3)}` : /^52\d{10}$/.test(rawWhatsApp) ? rawWhatsApp : /^\d{10}$/.test(rawWhatsApp) ? `52${rawWhatsApp}` : '';

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!targetWa) return;
    window.open(`https://wa.me/${targetWa}?text=Hola,%20vi%20su%20negocio%20en%20encarmen.org`, '_blank', 'noopener,noreferrer');
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!targetCall) return;
    window.open(`tel:${targetCall}`, '_self');
  };

  // Nombre formateado automáticamente en mayúsculas y minúsculas (Title Case)
  const formattedName = formatBusinessName(business.name);

  // Obtener la categoría del negocio para la fotografía de respaldo
  const categorySlug = Array.isArray(business.categorySlugs) && business.categorySlugs[0]
    ? business.categorySlugs[0]
    : business.category ? business.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';

  const categoryFallbackImage =
    (categorySlug && CATEGORY_VISUALS[categorySlug]?.image) ||
    '/uploads/wc-marisqueria-padrino.jpg';

  // 1 LOGO POR EMPRESA
  const displayLogo =
    business.image ||
    business.imageUrl ||
    (business as any).logo ||
    categoryFallbackImage;

  // Dirección o colonia formateada para la fila de ubicación
  const displayAddress = formatAddressText(
    business.address ||
    (business.colonia ? `${formattedName}, ${business.colonia}, Cd. del Carmen` : 'Ciudad del Carmen, Camp.')
  );

  // Calificación numérica y cálculo de estrellas reales (sin 5.0 falso si no tiene votos)
  const reviewCount = Number(business.reviewCount) || 0;
  const ratingValue = reviewCount > 0 ? Number(business.rating) || 0 : 0;
  const hasRealRating = reviewCount > 0 && ratingValue > 0;
  const ratingScore = hasRealRating ? ratingValue.toFixed(1) : null;
  const roundedStars = hasRealRating ? Math.round(ratingValue) : 0;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-2xl p-3.5 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 hover:shadow-[0_20px_45px_-6px_rgba(15,23,42,0.16)]"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.76) 0%, rgba(255, 255, 255, 0.42) 100%)',
        backdropFilter: 'blur(24px) saturate(190%) brightness(104%)',
        WebkitBackdropFilter: 'blur(24px) saturate(190%) brightness(104%)',
        border: '1.5px solid rgba(255, 255, 255, 0.85)',
        boxShadow:
          '0 12px 32px -4px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04), inset 0 1.5px 2px 0 rgba(255, 255, 255, 1), inset 0 -1px 2px 0 rgba(255, 255, 255, 0.45)',
      }}
    >
      <div>
        {/* CONTENEDOR DEL LOGO PRINCIPAL (1 LOGO ÚNICO POR EMPRESA) */}
        <div className="relative w-full aspect-[16/10] bg-white/70 backdrop-blur-xs rounded-xl overflow-hidden border border-white/60 shadow-inner">
          <img
            src={displayLogo}
            alt={`Logo de ${business.name}`}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.dataset.fallbackApplied) {
                target.dataset.fallbackApplied = 'true';
                target.src = categoryFallbackImage;
              }
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />

          {/* ETIQUETAS PRESERVADAS: PROMOCIÓN ACTIVA, TOP, RECOMENDADA */}
          <div className="absolute top-2 left-2 flex flex-col items-start gap-1 z-10 pointer-events-none">
            {hasActivePromo && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white bg-gradient-to-r from-rose-600 to-red-500 shadow-md border border-white/30 backdrop-blur-xs">
                <span>🔥</span>
                <span>Promoción Activa</span>
              </span>
            )}
            {business.isTopBusiness && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-slate-950 bg-amber-400 shadow-md border border-amber-300">
                <span>★</span>
                <span>TOP</span>
              </span>
            )}
            {business.isRecommended && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white bg-[#00875a] shadow-md border border-emerald-400/30">
                <CheckCircle2 className="w-3 h-3 text-white" />
                <span>Recomendada</span>
              </span>
            )}
          </div>

          {/* BOTÓN DE GUARDAR EN FAVORITOS EN ESQUINA SUPERIOR DERECHA */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleFavorite) onToggleFavorite(business);
            }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-600 hover:text-amber-500 shadow-xs backdrop-blur-xs transition border border-white/80 z-10 cursor-pointer active:scale-90"
            title={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
          </button>
        </div>

        {/* 1. TÍTULO DEL NEGOCIO: Roboto Bold 700, 18px, tracking ajustado */}
        <h3 
          className="text-[18px] font-bold text-[#111827] leading-snug truncate mt-3"
          style={{ fontFamily: "'Roboto', 'Inter', sans-serif", letterSpacing: '-0.015em' }}
          title={formattedName}
        >
          {formattedName}
        </h3>

        {/* 2. FILA DE ESTRELLAS ESTILO iOS (SOLO SI YA TIENE CALIFICACIONES REALES) */}
        {hasRealRating && (
          <div className="flex items-center gap-1 mt-1">
            <div className="flex items-center text-[#F59E0B]">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3.5 h-3.5 ${
                    star <= roundedStars ? 'fill-[#F59E0B] text-[#F59E0B]' : 'fill-stone-200 text-stone-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-[13px] font-bold text-[#111827] ml-1">
              {ratingScore}
            </span>
            <span className="text-[11px] text-[#6B7280]">
              ({reviewCount})
            </span>
          </div>
        )}

        {/* 3. DIRECCIÓN CON PIN NEGRO SÓLIDO EN 1 SOLA LÍNEA */}
        <div className="flex items-center gap-1.5 mt-1.5 text-[#374151]">
          <MapPin className="w-4 h-4 fill-[#1F2937] text-white shrink-0" />
          <span 
            className="text-[13px] font-normal text-[#1F2937] truncate"
            style={{ fontFamily: "'Roboto', sans-serif" }}
            title={displayAddress}
          >
            {displayAddress}
          </span>
        </div>
      </div>

      {/* BOTONES DE ACCIÓN: WHATSAPP (VERDE) Y LLAMAR (AZUL) EXACTOS A LA IMAGEN */}
      <div className="grid grid-cols-2 gap-2 mt-3.5">
        <button
          type="button"
          onClick={handleWhatsApp}
          disabled={!targetWa}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-full font-semibold text-xs sm:text-[13px] text-white bg-[#25D366] hover:bg-[#20ba59] active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm.01 18.06c-1.49 0-2.94-.4-4.22-1.16l-.3-.18-3.13.82.83-3.05-.2-.31a8.13 8.13 0 0 1-1.25-4.27c0-4.52 3.68-8.2 8.2-8.2 2.19 0 4.25.85 5.8 2.4 1.55 1.55 2.4 3.61 2.4 5.8 0 4.52-3.68 8.2-8.13 8.2zm4.49-6.14c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.08 0 1.23.89 2.42 1.02 2.59.12.17 1.76 2.69 4.27 3.77.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.12-.22-.19-.47-.31z" />
          </svg>
          <span>WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={handleCall}
          disabled={!targetCall}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-full font-semibold text-xs sm:text-[13px] text-white bg-[#1E88E5] hover:bg-[#1976D2] active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Phone className="w-3.5 h-3.5 shrink-0" />
          <span>Llamar</span>
        </button>
      </div>
    </div>
  );
}
