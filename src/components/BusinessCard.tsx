import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Phone,
  MessageSquare,
  Clock,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Building2,
  Truck,
  CreditCard,
  ChevronRight,
  Star,
  CheckCircle,
  Share2,
  Edit2,
  Trash2,
  Award
} from 'lucide-react';
import { Business, Promotion } from '../types';
import { trackAnalyticsEvent } from '../services/api';
import { getBusinessPrimaryCategory, getBusinessImageUrl, formatImageUrl } from '../utils/businessUrl';
import { getWhatsAppUrl } from '../utils/phone';

interface BusinessCardProps {
  business: Business;
  isFavorite: boolean;
  onToggleFavorite: (b: Business) => void;
  onSelectBusiness: (b: Business) => void;
  isAdmin?: boolean;
  onEditBusiness?: (b: Business) => void;
  onDeleteBusiness?: (b: Business) => void;
  onToggleRecommended?: (b: Business) => void;
  onToggleTop?: (b: Business) => void;
  onOpenDigitalCard?: (b: Business) => void;
  activePromotion?: Promotion | null;
  onOpenPromotion?: (promo: Promotion) => void;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({
  business,
  isFavorite,
  onToggleFavorite,
  onSelectBusiness,
  isAdmin = false,
  onEditBusiness,
  onDeleteBusiness,
  onToggleRecommended,
  onToggleTop,
  onOpenDigitalCard,
  activePromotion,
  onOpenPromotion
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  // Direct WhatsApp URL construction if phone exists
  const getWhatsAppLink = (b: Business): string => {
    return getWhatsAppUrl(
      b.whatsapp || b.phone,
      `Hola, encontré su información en el directorio Empresas en Carmen y deseo solicitar informes.`
    );
  };

  const waLink = getWhatsAppLink(business);
  const displayCategory = getBusinessPrimaryCategory(business);
  const displayImage = getBusinessImageUrl(business);

  useEffect(() => {
    setImgFailed(false);
  }, [displayImage]);

  return (
    <article className="group bg-white rounded-2xl border border-stone-200/80 hover:border-amber-400/80 hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden">
      {/* Top Media / Header */}
      <div>
        <div
          onClick={() => onSelectBusiness(business)}
          className="relative aspect-[16/9] w-full bg-stone-100 overflow-hidden border-b border-stone-100 cursor-pointer"
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectBusiness(business);
            }
          }}
          title={`Ver detalles de ${business.name}`}
        >
          {displayImage && !imgFailed ? (
            <img
              src={displayImage}
              alt={business.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={e => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                if (displayImage.startsWith('/uploads/')) {
                  const filename = displayImage.replace('/uploads/', '');
                  target.onerror = () => {
                    target.onerror = null;
                    if (business.gallery && business.gallery.length > 0 && business.gallery[0] !== displayImage) {
                      target.src = formatImageUrl(business.gallery[0]);
                      target.onerror = () => setImgFailed(true);
                    } else {
                      setImgFailed(true);
                    }
                  };
                  target.src = `https://empresasencarmen.com/wp-content/uploads/2026/10/${filename}`;
                  return;
                }
                if (business.gallery && business.gallery.length > 0 && business.gallery[0] !== displayImage) {
                  target.src = formatImageUrl(business.gallery[0]);
                  target.onerror = () => setImgFailed(true);
                  return;
                }
                setImgFailed(true);
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 text-stone-300">
              <Building2 className="w-12 h-12 stroke-[1.25]" />
              <span className="text-[11px] font-medium text-stone-400 mt-1">
                {business.name || 'Empresa en Carmen'}
              </span>
            </div>
          )}

          {/* Favorite button (Floating top-right) */}
          <button
            onClick={e => {
              e.stopPropagation();
              onToggleFavorite(business);
            }}
            title={isFavorite ? 'Quitar de guardados' : 'Guardar negocio'}
            aria-label={isFavorite ? 'Quitar de guardados' : 'Guardar negocio'}
            className="absolute top-2.5 right-2.5 p-2 rounded-xl bg-white/90 backdrop-blur-md text-stone-700 hover:text-amber-600 hover:bg-white transition-colors shadow-sm z-10"
          >
            {isFavorite ? (
              <BookmarkCheck className="w-4 h-4 text-amber-500 fill-amber-500" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </button>

          {/* Highlight badges in top left (Promoción Activa, TOP, Recomendada, Nuevo) */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
            {activePromotion && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  if (onOpenPromotion) onOpenPromotion(activePromotion);
                  else onSelectBusiness(business);
                }}
                className="px-2.5 py-1 rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1 animate-bounce ring-2 ring-white/90 cursor-pointer hover:brightness-110 mb-0.5 text-left"
                title="¡Promoción Activa! Oprima aquí"
              >
                <span>🔥</span>
                <span>¡Promoción Activa!</span>
              </button>
            )}
            {business.isTopBusiness && (
              <div className="px-2.5 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                <Star className="w-3 h-3 fill-stone-950 text-stone-950" />
                <span>TOP</span>
              </div>
            )}
            {business.isRecommended && (
              <div className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-200" />
                <span>Recomendada</span>
              </div>
            )}
            {business.isNewSubmission && !business.isRecommended && (
              <div className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>Nuevo</span>
              </div>
            )}
          </div>

          {/* Quick status kicker: unboxed clean label in bottom left of photo */}
          {business.delivery && !business.delivery.toLowerCase().includes('no') && (
            <div
              translate="no"
              className="notranslate absolute bottom-2 left-2 px-2 py-0.5 rounded bg-stone-900/85 backdrop-blur-xs text-white text-[11px] font-medium flex items-center gap-1 shadow-xs"
            >
              <Truck className="w-3 h-3 text-amber-400" />
              <span>A domicilio</span>
            </div>
          )}
        </div>

        {/* Card Body */}
        <div className="p-4 sm:p-5 space-y-3">
          {/* Metadata: zero-pill discipline (unboxed clean text with separators) */}
          <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium truncate">
            <span className="text-amber-800 font-semibold">{displayCategory}</span>
            {business.colonia && (
              <>
                <span aria-hidden="true" className="text-stone-300">·</span>
                <span className="text-stone-600 truncate">{business.colonia}</span>
              </>
            )}
          </div>

          {/* Distinctive Active Promotion Banner Button */}
          {activePromotion && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                if (onOpenPromotion) onOpenPromotion(activePromotion);
                else onSelectBusiness(business);
              }}
              className="w-full py-2 px-2.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-500 to-rose-600 hover:from-red-500 hover:to-amber-400 text-white font-black text-xs shadow-md shadow-rose-600/30 flex items-center justify-between gap-1.5 transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer ring-2 ring-amber-400/60 animate-pulse text-left"
            >
              <span className="flex items-center gap-1.5 truncate">
                <span>🔥</span>
                <span className="uppercase tracking-wider text-[11px]">¡Promoción Activa! Oprima aquí</span>
              </span>
              {activePromotion.discount && (
                <span className="bg-white text-rose-700 font-extrabold px-1.5 py-0.5 rounded text-[10px] shrink-0 shadow-xs">
                  {activePromotion.discount}
                </span>
              )}
            </button>
          )}

          {/* Business Name */}
          <div className="space-y-0.5">
            <h3
              translate="no"
              onClick={() => onSelectBusiness(business)}
              className="notranslate text-base sm:text-lg font-bold text-stone-900 leading-snug group-hover:text-amber-600 transition-colors cursor-pointer line-clamp-2"
            >
              {business.name}
            </h3>
            {Array.isArray(business.previousNames) && business.previousNames.length > 0 && (
              <p className="text-[11px] text-amber-700 font-medium truncate">
                (Antes: {business.previousNames.join(', ')})
              </p>
            )}
          </div>

          {/* Short Excerpt */}
          <p className="text-xs sm:text-sm text-stone-600 line-clamp-2 leading-relaxed">
            {business.description || 'Consulta los productos y servicios ofrecidos por esta empresa de Ciudad del Carmen.'}
          </p>

          {/* Information List (Clean icons & text) */}
          <div className="space-y-1.5 pt-1 text-xs text-stone-600 border-t border-stone-100">
            {business.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                <span className="line-clamp-1">{business.address}</span>
              </div>
            )}
            {business.schedule && (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className="line-clamp-1 text-stone-700">{business.schedule}</span>
              </div>
            )}
            {business.payment && (
              <div className="flex items-center gap-2 text-[11px] text-stone-500">
                <CreditCard className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className="line-clamp-1">Pagos: {business.payment}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer: Action Buttons */}
      <div className="p-4 sm:p-5 pt-0 mt-auto border-t border-stone-100 bg-stone-50/50">
        <div className="flex items-center gap-2 pt-3">
          {/* Primary Action: WhatsApp if available */}
          {waLink ? (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-xs min-h-[42px]"
              onClick={e => {
                e.stopPropagation();
                trackAnalyticsEvent({
                  type: 'whatsapp',
                  businessId: business.id,
                  businessName: business.name
                });
              }}
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>
          ) : business.phone ? (
            <a
              href={`tel:${business.phone}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 active:bg-stone-950 text-white text-xs font-semibold transition-colors shadow-xs min-h-[42px]"
              onClick={e => {
                e.stopPropagation();
                trackAnalyticsEvent({
                  type: 'call',
                  businessId: business.id,
                  businessName: business.name
                });
              }}
            >
              <Phone className="w-4 h-4" />
              <span>Llamar</span>
            </a>
          ) : (
            <button
              onClick={() => onSelectBusiness(business)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-semibold transition-colors shadow-xs min-h-[42px]"
            >
              <span>Ver ficha</span>
            </button>
          )}

          {/* Phone call button if both phone and whatsapp exist */}
          {waLink && business.phone && (
            <a
              href={`tel:${business.phone}`}
              title={`Llamar a ${business.phone}`}
              className="p-2.5 sm:p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 active:bg-stone-200 text-stone-700 transition-colors min-h-[42px] min-w-[42px] flex items-center justify-center"
              onClick={e => {
                e.stopPropagation();
                trackAnalyticsEvent({
                  type: 'call',
                  businessId: business.id,
                  businessName: business.name
                });
              }}
            >
              <Phone className="w-4 h-4" />
            </a>
          )}

          {/* Digital Card Share Button */}
          {onOpenDigitalCard && (
            <button
              onClick={e => {
                e.stopPropagation();
                onOpenDigitalCard(business);
              }}
              title="Generar y compartir Tarjeta Digital con QR"
              className="p-2.5 sm:p-2 rounded-xl border border-stone-200 bg-white hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800 active:bg-amber-100 text-stone-700 transition-colors min-h-[42px] min-w-[42px] flex items-center justify-center"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          {/* Details Button */}
          <button
            onClick={() => onSelectBusiness(business)}
            title="Ver detalles completos"
            className="p-2.5 sm:p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 active:bg-stone-200 text-stone-700 transition-colors min-h-[42px] min-w-[42px] flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Admin Quick Management Bar (Visible only when logged in as admin) */}
        {isAdmin && (
          <div className="mt-3 pt-2.5 border-t border-dashed border-stone-300/80 flex items-center justify-between gap-1.5 bg-stone-100/80 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-2.5 sm:px-4 text-[11px] font-bold">
            <span className="text-stone-500 uppercase tracking-wider text-[9px] font-black">
              Admin
            </span>

            <div className="flex items-center gap-1">
              {/* Toggle TOP */}
              {onToggleTop && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onToggleTop(business);
                  }}
                  className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                    business.isTopBusiness
                      ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                      : 'bg-white text-stone-700 hover:bg-amber-100 border border-stone-200'
                  }`}
                  title={business.isTopBusiness ? 'Quitar condición de Empresa TOP' : 'Marcar como Empresa TOP (aparecerá primero en búsquedas)'}
                >
                  <Star className={`w-3 h-3 ${business.isTopBusiness ? 'fill-stone-950' : ''}`} />
                  <span>TOP</span>
                </button>
              )}

              {/* Toggle Recomendada */}
              {onToggleRecommended && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onToggleRecommended(business);
                  }}
                  className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                    business.isRecommended
                      ? 'bg-emerald-600 text-white font-extrabold shadow-xs'
                      : 'bg-white text-stone-700 hover:bg-emerald-100 border border-stone-200'
                  }`}
                  title={business.isRecommended ? 'Quitar distintivo de Recomendada' : 'Marcar como Recomendada (muestra distintivo verde)'}
                >
                  <CheckCircle className="w-3 h-3" />
                  <span>Recomendada</span>
                </button>
              )}

              {/* Edit */}
              {onEditBusiness && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onEditBusiness(business);
                  }}
                  className="p-1 px-2 rounded-lg bg-white text-stone-700 hover:bg-stone-200 border border-stone-200 flex items-center gap-1 cursor-pointer"
                  title="Editar datos del negocio"
                >
                  <Edit2 className="w-3 h-3 text-stone-600" />
                  <span>Editar</span>
                </button>
              )}

              {/* Delete */}
              {onDeleteBusiness && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onDeleteBusiness(business);
                  }}
                  className="p-1 px-1.5 rounded-lg bg-white text-rose-700 hover:bg-rose-100 border border-rose-200 flex items-center gap-0.5 cursor-pointer"
                  title="Dar de baja y eliminar definitivamente"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
};
