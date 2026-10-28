import React, { useState, useEffect } from 'react';
import { 
  X, Bookmark, Share2, MapPin, Phone, MessageSquare, 
  QrCode, ExternalLink, Star, ShieldCheck, Award, 
  Edit3, Trash2, Key, CheckCircle2, ChevronDown, ChevronUp,
  Ticket, KeyRound, ShieldAlert
} from 'lucide-react';
import { Business } from './BusinessCard';
import { formatBusinessName, formatAddressText } from '../utils/textUtils';
import { verifyBusinessEditPin } from '../services/api';
import { useBusinessRatings } from '../utils/realRatings';
import { StarRatingWidget } from './StarRatingWidget';

interface BusinessDetailModalProps {
  business: Business | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (() => void) | ((b: Business) => void);
  onDelete?: () => void;
  onDeleteBusiness?: (b: Business) => void;
  onEdit?: (business: Business) => void;
  onEditBusiness?: (b: Business) => void;
  onToggleTop?: ((id: string | number) => void) | ((b: Business) => void);
  onToggleRecommended?: ((id: string | number) => void) | ((b: Business) => void);
  isAdmin?: boolean;
  activePromotion?: any;
  onOpenClaimCouponModal?: (p: any) => void;
  onOpenDigitalCard?: (b: Business) => void;
  onOpenClientPage?: (b: Business) => void;
}

const appleGlassStyle = {
  background: 'rgba(255, 255, 255, 0.88)',
  backdropFilter: 'blur(30px) saturate(180%)',
  WebkitBackdropFilter: 'blur(30px) saturate(180%)',
  border: '1.5px solid rgba(255, 255, 255, 0.75)',
  boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.95)',
};

const innerGlassCard = {
  background: 'rgba(255, 255, 255, 0.65)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.85)',
};

export function BusinessDetailModal({
  business,
  isOpen,
  onClose,
  isFavorite = false,
  onToggleFavorite,
  onDelete,
  onDeleteBusiness,
  onEdit,
  onEditBusiness,
  onToggleTop,
  onToggleRecommended,
  isAdmin = false,
  activePromotion,
  onOpenClaimCouponModal,
  onOpenDigitalCard,
  onOpenClientPage
}: BusinessDetailModalProps) {
  const [imgError, setImgError] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(true);
  const [showOwnerSection, setShowOwnerSection] = useState(false);
  const [ownerPin, setOwnerPin] = useState('');
  const [ownerPinError, setOwnerPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const { summary: ratingSummary, loading: ratingsLoading, error: ratingsError } = useBusinessRatings(business?.id, isOpen);

  useEffect(() => {
    setImgError(false);
    setShowAdminPanel(true);
    setShowOwnerSection(false);
    setOwnerPin('');
    setOwnerPinError(null);
  }, [business?.id]);

  if (!isOpen || !business) return null;

  const cleanDescription = (text?: string) => {
    if (!text) return 'Consulta los productos y servicios comunicándote directamente con esta empresa.';
    return text
      .replace(/https?:\/\/[^\s]+?\.(mp4|webm|mov|m4v|jpg|png|webp|gif)(\?[^\s]*)?/gi, '')
      .replace(/https?:\/\/[^\s]+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const handleShare = () => {
    const url = typeof window !== 'undefined' ? window.location.href : 'https://encarmen.org';
    if (navigator.share) {
      navigator.share({
        title: business.name,
        text: `Conoce ${business.name} en encarmen.org`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      alert('¡Enlace copiado al portapapeles!');
    }
  };

  const cleanPhone = business.phone ? business.phone.replace(/\D/g, '') : '';
  const cleanWhatsApp = (business.whatsapp || business.phone || '').replace(/\D/g, '');
  
  const logoUrl = (business as any).logo_url || business.image || (business as any).imageUrl;
  const isTop = Boolean((business as any).is_top ?? business.isTopBusiness);
  const isRecommended = Boolean((business as any).is_recommended ?? business.isRecommended);
  const prevName = (business as any).previous_name || (Array.isArray(business.previousNames) && business.previousNames.length > 0 ? business.previousNames.join(', ') : '');
  const primaryCategory = business.category || (Array.isArray(business.categories) && business.categories[0]) || 'Directorio Comercial';
  const displayAddress = formatAddressText(business.address || (business.colonia ? `Col. ${business.colonia}, Cd. del Carmen` : 'Ciudad del Carmen, Campeche'));
  const formattedName = formatBusinessName(business.name);

  const handleEdit = () => {
    if (onEdit) onEdit(business);
    else if (onEditBusiness) onEditBusiness(business);
  };

  const handleDelete = () => {
    if (window.confirm(`¿Estás seguro de eliminar permanentemente "${business.name}"?`)) {
      if (onDelete) onDelete();
      else if (onDeleteBusiness) onDeleteBusiness(business);
      onClose();
    }
  };

  const handleToggleTopAction = () => {
    if (onToggleTop) {
      (onToggleTop as any)(business.id);
    }
  };

  const handleToggleRecommendedAction = () => {
    if (onToggleRecommended) {
      (onToggleRecommended as any)(business.id);
    }
  };

  const handleToggleFav = () => {
    if (onToggleFavorite) {
      (onToggleFavorite as any)(business);
    }
  };

  const handleVerifyOwnerPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerPinError(null);
    const cleanPin = ownerPin.replace(/\D/g, '').trim();
    if (cleanPin.length !== 10) {
      setOwnerPinError('El código debe tener exactamente 10 dígitos.');
      return;
    }

    setIsVerifyingPin(true);
    try {
      const res = await verifyBusinessEditPin(Number(business.id), cleanPin);
      if (res && res.success && res.valid) {
        setOwnerPin('');
        setOwnerPinError(null);
        handleEdit();
      } else {
        setOwnerPinError(res?.message || 'Código incorrecto o no generado. Solicítalo por WhatsApp.');
      }
    } catch (err: any) {
      setOwnerPinError(err?.message || 'Error de conexión al verificar el código.');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-y-auto">
      <div 
        className="fixed inset-0 transition-opacity duration-300"
        style={{
          background: 'rgba(15, 23, 42, 0.50)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
        onClick={onClose}
      />

      <div 
        className="relative w-full max-w-xl md:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto rounded-t-[36px] sm:rounded-[36px] text-stone-900 transition-all duration-300 flex flex-col scrollbar-none z-10"
        style={appleGlassStyle}
      >
        <div className="sm:hidden w-12 h-1.5 bg-stone-300/80 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        <div className="p-5 sm:p-7 md:p-8 md:grid md:grid-cols-12 md:gap-8 items-start">
          <div className="md:col-span-5 space-y-4">
            <div className="relative w-full aspect-4/3 rounded-3xl bg-white p-4 border border-white/80 shadow-md flex items-center justify-center overflow-hidden">
              {logoUrl && !imgError ? (
                <img
                  src={logoUrl}
                  alt={formattedName}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-50 to-orange-100 text-amber-800 rounded-2xl flex items-center justify-center font-black text-4xl">
                  {formattedName.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                {isTop && (
                  <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase bg-amber-500 text-white shadow-md flex items-center gap-1">
                    <Star className="w-3 h-3 fill-white text-white" /> TOP
                  </span>
                )}
                {isRecommended && (
                  <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase bg-emerald-600 text-white shadow-md flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-white" /> Recomendada
                  </span>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/70 border border-white/80 flex items-start gap-2.5 shadow-2xs">
              <MapPin className="w-4 h-4 text-stone-800 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide block">Ubicación</span>
                <p className="text-xs font-bold text-stone-800 leading-snug">
                  {displayAddress}
                </p>
              </div>
            </div>

            {/* Banner de Promoción Activa si existe */}
            {activePromotion && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 text-white font-bold flex items-center justify-between shadow-md">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full inline-block">
                    🔥 Promoción Activa
                  </span>
                  <p className="text-xs font-extrabold truncate mt-0.5">{activePromotion.title}</p>
                </div>
                {onOpenClaimCouponModal && (
                  <button
                    type="button"
                    onClick={() => onOpenClaimCouponModal(activePromotion)}
                    className="px-3 py-1.5 rounded-xl bg-white text-stone-900 font-black text-[11px] shrink-0 shadow-xs hover:bg-stone-100 transition active:scale-95 cursor-pointer"
                  >
                    Obtener Cupón
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2 pt-1">
              {cleanWhatsApp && (
                <a
                  href={`https://wa.me/52${cleanWhatsApp}?text=Hola,%20vi%20su%20negocio%20en%20encarmen.org`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3.5 px-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 shadow-lg hover:brightness-105 transition active:scale-98"
                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                >
                  <MessageSquare className="w-4 h-4 fill-white" />
                  <span>Enviar WhatsApp</span>
                </a>
              )}

              {cleanPhone && (
                <a
                  href={`tel:${cleanPhone}`}
                  className="w-full py-3.5 px-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 shadow-lg hover:brightness-105 transition active:scale-98"
                  style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}
                >
                  <Phone className="w-4 h-4 fill-white" />
                  <span>Llamar al {business.phone}</span>
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (onOpenDigitalCard) onOpenDigitalCard(business);
                  else alert(`Tarjeta Digital QR de ${formattedName}`);
                }}
                className="py-2.5 px-3 rounded-2xl bg-white/80 hover:bg-white text-stone-800 border border-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
              >
                <QrCode className="w-4 h-4 text-amber-600" />
                <span>Tarjeta QR</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenClientPage) {
                    onOpenClientPage(business);
                  } else {
                    window.open(`/negocio/${business.slug || business.id}`, '_blank');
                  }
                }}
                className="py-2.5 px-3 rounded-2xl bg-white/80 hover:bg-white text-stone-800 border border-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
              >
                <ExternalLink className="w-4 h-4 text-sky-600" />
                <span>Landing Page</span>
              </button>
              <p className="col-span-full text-center text-[11px] text-slate-600 break-all" aria-label="Dirección pública de la página del negocio">
                https://encarmen.org/negocio/{business.slug || business.id}
              </p>
            </div>
          </div>

          <div className="md:col-span-7 space-y-4 mt-6 md:mt-0">
            <div className="flex items-center justify-between pb-1">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide bg-amber-500/15 text-amber-900 border border-amber-500/25">
                {primaryCategory}
              </span>

              <div className="flex items-center gap-1.5">
                {onToggleFavorite && (
                  <button
                    onClick={handleToggleFav}
                    className="w-9 h-9 rounded-full bg-white hover:bg-stone-100 text-stone-700 flex items-center justify-center transition shadow-xs active:scale-90 cursor-pointer"
                    title="Favoritos"
                  >
                    <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
                  </button>
                )}
                <button
                  onClick={handleShare}
                  className="w-9 h-9 rounded-full bg-white hover:bg-stone-100 text-stone-700 flex items-center justify-center transition shadow-xs active:scale-90 cursor-pointer"
                  title="Compartir"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-stone-200/80 hover:bg-stone-300 text-stone-800 flex items-center justify-center transition shadow-xs active:scale-90 ml-1 cursor-pointer"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight leading-tight">
                {formattedName}
              </h2>
              {prevName && (
                <p className="text-xs text-stone-500 font-semibold mt-1">
                  Anteriormente: {prevName}
                </p>
              )}
              {!ratingsLoading && !ratingsError && ratingSummary.count > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="flex text-amber-500">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i <= Math.round(ratingSummary.average)
                            ? 'fill-amber-500 text-amber-500'
                            : 'fill-stone-200 text-stone-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-black text-stone-800 ml-1">
                    {ratingSummary.average.toFixed(1)}
                  </span>
                  <span className="text-xs text-stone-500 font-medium">
                    · {ratingSummary.count} {ratingSummary.count === 1 ? 'calificación recibida' : 'calificaciones recibidas'}
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-3xl p-5 space-y-3" style={innerGlassCard}>
              <h3 className="text-xs font-black uppercase text-stone-500 tracking-wider">
                Descripción del negocio
              </h3>
              <p className="text-sm text-stone-700 leading-relaxed font-normal whitespace-pre-line">
                {cleanDescription(business.description)}
              </p>

              <div className="pt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-stone-800 text-xs font-semibold border border-stone-200/80 shadow-2xs">
                  💳 {business.payment || (business.paymentMethods && business.paymentMethods.length > 0 ? business.paymentMethods.join(', ') : 'Efectivo y Transferencia')}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-stone-800 text-xs font-semibold border border-stone-200/80 shadow-2xs">
                  🚚 {business.delivery || business.deliveryOption || 'Envío a Domicilio'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-stone-800 text-xs font-semibold border border-stone-200/80 shadow-2xs">
                  🏪 {business.schedule || business.openingHours || 'Atención en Local'}
                </span>
              </div>
            </div>

            <StarRatingWidget businessId={business.id} businessName={business.name} />

            {/* 1. GESTIÓN DEL ADMINISTRADOR (VISIBLE ÚNICAMENTE PARA ADMINISTRADOR LOGUEADO) */}
            {isAdmin && (
              <div className="rounded-3xl overflow-hidden border border-amber-300/80 shadow-xs" style={{ background: 'rgba(254, 252, 232, 0.90)' }}>
                <button
                  type="button"
                  onClick={() => setShowAdminPanel(!showAdminPanel)}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-extrabold text-stone-900 hover:bg-amber-100/60 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-500 text-stone-950 font-black px-1.5 py-0.5 rounded text-[10px] tracking-wide shadow-2xs">
                      ADMIN
                    </span>
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>Gestión del administrador</span>
                  </div>
                  {showAdminPanel ? <ChevronUp className="w-4 h-4 text-stone-600" /> : <ChevronDown className="w-4 h-4 text-stone-600" />}
                </button>

                {showAdminPanel && (
                  <div className="p-4 pt-1 border-t border-amber-200/80 space-y-2.5">
                    {(onEdit || onEditBusiness) && (
                      <button
                        type="button"
                        onClick={handleEdit}
                        className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-stone-50 text-stone-900 font-bold text-xs flex items-center justify-center gap-2 border border-stone-200 shadow-2xs transition cursor-pointer active:scale-98"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Editar Datos del Negocio</span>
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      {onToggleRecommended && (
                        <button
                          type="button"
                          onClick={handleToggleRecommendedAction}
                          className="py-2 px-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 font-semibold text-[11px] flex items-center justify-center gap-1.5 border border-stone-200 cursor-pointer active:scale-95 shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{isRecommended ? 'Quitar Recomendada' : 'Hacer Recomendada'}</span>
                        </button>
                      )}
                      {onToggleTop && (
                        <button
                          type="button"
                          onClick={handleToggleTopAction}
                          className="py-2 px-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 font-semibold text-[11px] flex items-center justify-center gap-1.5 border border-stone-200 cursor-pointer active:scale-95 shadow-2xs"
                        >
                          <Star className="w-3.5 h-3.5 text-amber-500" />
                          <span>{isTop ? 'Quitar TOP' : 'Marcar TOP'}</span>
                        </button>
                      )}
                    </div>

                    {(onDelete || onDeleteBusiness) && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 border border-rose-200/80 transition cursor-pointer active:scale-98 shadow-2xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Eliminar Empresa del Directorio</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. PANEL PARA EL PROPIETARIO (VISIBLE CUANDO EL ADMINISTRADOR NO ESTÁ LOGUEADO) */}
            {!isAdmin && (
              <div className="rounded-3xl overflow-hidden border border-stone-200/80 shadow-xs" style={{ background: 'rgba(245, 245, 244, 0.85)' }}>
                <button
                  type="button"
                  onClick={() => setShowOwnerSection(!showOwnerSection)}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-extrabold text-stone-700 hover:text-stone-900 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-stone-800">
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span>¿Eres el propietario? Cambia los datos aquí</span>
                  </div>
                  {showOwnerSection ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
                </button>

                {showOwnerSection && (
                  <div className="p-4 pt-1 border-t border-stone-200/60 space-y-3">
                    <p className="text-[11px] text-stone-600 font-medium leading-relaxed">
                      Para proteger tu ficha, ingresa tu <strong>código de edición de 10 dígitos</strong> o solicítalo directamente al equipo de administración por WhatsApp.
                    </p>

                    <form onSubmit={handleVerifyOwnerPin} className="space-y-2">
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={10}
                          placeholder="Código de 10 dígitos"
                          value={ownerPin}
                          onChange={(e) => {
                            setOwnerPin(e.target.value.replace(/\D/g, ''));
                            setOwnerPinError(null);
                          }}
                          className="w-full text-center tracking-widest font-mono font-bold text-sm py-2 px-3 rounded-xl border border-stone-300 bg-white text-stone-900 outline-none focus:border-amber-500 shadow-2xs"
                        />
                      </div>

                      {ownerPinError && (
                        <p className="text-[11px] font-bold text-rose-600 text-center">
                          {ownerPinError}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={isVerifyingPin || ownerPin.length !== 10}
                        className="w-full py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs active:scale-98"
                      >
                        {isVerifyingPin ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                            <span>Verificando código...</span>
                          </>
                        ) : (
                          <>
                            <Key className="w-3.5 h-3.5 text-amber-400" />
                            <span>Verificar código y editar</span>
                          </>
                        )}
                      </button>
                    </form>

                    {/* Botón para solicitar código de edición de la empresa por WhatsApp */}
                    <div className="pt-2 border-t border-stone-200/70 text-center">
                      <a
                        href={`https://api.whatsapp.com/send/?phone=%2B5219383895009&text=${encodeURIComponent(`Hola, soy el propietario de "${business.name}" y solicito mi código de edición de 10 dígitos para actualizar mi información en encarmen.org`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition active:scale-98 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-white" />
                        <span>Solicitar código de edición de la empresa</span>
                      </a>
                      <p className="text-[10px] text-stone-400 mt-1">
                        Atención directa para propietarios en Ciudad del Carmen
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
