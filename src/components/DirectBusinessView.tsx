import React, { useState } from 'react';
import { 
  ArrowLeft, Share2, MapPin, Phone, MessageSquare, Navigation, 
  Copy, Star, Clock, CreditCard, Truck, ShieldCheck, Award, 
  Edit3, Trash2, X, Key, ChevronDown, ChevronUp 
} from 'lucide-react';
import { Business } from './BusinessCard';
import { formatBusinessName, formatAddressText } from '../utils/textUtils';
import { verifyBusinessEditPin } from '../services/api';
import { getRealBusinessRating, submitRealBusinessRating } from '../utils/realRatings';
import { getWhatsAppUrl } from '../utils/phone';

interface DirectBusinessViewProps {
  business: Business;
  onBack: () => void;
  isAdmin?: boolean;
  onEdit?: (business: Business) => void;
  onDelete?: (id: string | number) => void;
  onToggleTop?: (id: string | number) => void;
  onToggleRecommended?: (id: string | number) => void;
  onBackToDirectory?: () => void;
  onSearchFromPage?: (q: string) => void;
  onOpenDigitalCard?: (b: Business) => void;
  onEditBusiness?: (b: Business) => void;
  onDeleteBusiness?: (b: Business) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (b: Business) => void;
  activePromotion?: any;
  onOpenPromotion?: (p: any) => void;
  onAdminClick?: () => void;
}

const appleGlassStyle = {
  background: 'rgba(255, 255, 255, 0.88)',
  backdropFilter: 'blur(30px) saturate(180%)',
  WebkitBackdropFilter: 'blur(30px) saturate(180%)',
  border: '1.5px solid rgba(255, 255, 255, 0.75)',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
};

const innerGlassCard = {
  background: 'rgba(255, 255, 255, 0.82)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1.5px solid rgba(255, 255, 255, 0.80)',
};

export function DirectBusinessView({
  business,
  onBack,
  isAdmin = false,
  onEdit,
  onDelete,
  onToggleTop,
  onToggleRecommended,
  onBackToDirectory,
  onSearchFromPage,
  onOpenDigitalCard,
  onEditBusiness,
  onDeleteBusiness,
  isFavorite,
  onToggleFavorite,
  activePromotion,
  onOpenPromotion,
  onAdminClick,
}: DirectBusinessViewProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [hoverStar, setHoverStar] = useState<number>(0);
  const [ratingSummary, setRatingSummary] = useState(() =>
    getRealBusinessRating(business.id)
  );
  const [justRated, setJustRated] = useState(false);

  React.useEffect(() => {
    setRatingSummary(getRealBusinessRating(business.id));
    setJustRated(false);
  }, [business.id]);

  const handleRateClick = (stars: number) => {
    const updated = submitRealBusinessRating(business.id, stars);
    setRatingSummary(updated);
    setJustRated(true);
  };

  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showOwnerSection, setShowOwnerSection] = useState(false);
  const [ownerPin, setOwnerPin] = useState('');
  const [ownerPinError, setOwnerPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  const cleanPhone = business.phone ? business.phone.replace(/\D/g, '') : '';
  const cleanWhatsApp = (business.whatsapp || business.phone || '').replace(/\D/g, '');
  const businessUrl = `https://encarmen.org/${business.slug || business.id}`;
  
  const logoUrl = (business as any).logo_url || business.image || (business as any).imageUrl || '';
  const isTop = Boolean((business as any).is_top ?? business.isTopBusiness);
  const isRecommended = Boolean((business as any).is_recommended ?? business.isRecommended);
  const formattedName = formatBusinessName(business.name);
  const displayAddress = formatAddressText(business.address || (business.colonia ? `Col. ${business.colonia}, Cd. del Carmen` : 'Ciudad del Carmen, Campeche'));
  const primaryCategory = business.category || (Array.isArray(business.categories) && business.categories[0]) || 'Comercio Local';

  const handleBack = () => {
    if (onBack) onBack();
    else if (onBackToDirectory) onBackToDirectory();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(businessUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: formattedName,
        text: `Visita ${formattedName} en encarmen.org`,
        url: businessUrl,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  const handleEdit = () => {
    if (onEdit) onEdit(business);
    else if (onEditBusiness) onEditBusiness(business);
  };

  const handleDelete = () => {
    if (window.confirm(`¿Eliminar permanentemente "${formattedName}"?`)) {
      if (onDelete) onDelete(business.id);
      else if (onDeleteBusiness) onDeleteBusiness(business);
      handleBack();
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

  // Solo fotos reales registradas en la galería de productos y servicios (hasta 10 fotos)
  // Si no hay fotos adicionales, NO se inventan imágenes ni se llena con placeholders
  const galleryPhotos = Array.isArray(business.gallery)
    ? business.gallery.filter((img): img is string => typeof img === 'string' && img.trim().length > 0)
    : [];

  const topCoverImage = (business as any).cover_url || logoUrl || '/images/BANNER-NUEVO-EMPRESAS-EN-CARMEN.png';

  return (
    <div className="min-h-screen bg-stone-900 font-sans text-stone-900 relative pb-16">
      <div className="fixed inset-0 z-0">
        <img
          src="/puente.jpg"
          alt="Atardecer en Ciudad del Carmen"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&auto=format&fit=crop&q=85';
          }}
          className="w-full h-full object-cover filter brightness-75 blur-xs"
        />
        <div className="absolute inset-0 bg-stone-950/40 pointer-events-none" />
      </div>

      <header
        className="sticky top-0 z-40 w-full transition-all duration-300"
        style={{
          background: 'rgba(255, 255, 255, 0.70)',
          backdropFilter: 'blur(25px) saturate(180%)',
          WebkitBackdropFilter: 'blur(25px) saturate(180%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.40)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 hover:bg-white text-stone-900 font-bold text-xs transition shadow-2xs active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Directorio</span>
          </button>

          <div className="flex items-center gap-2 cursor-pointer" onClick={handleBack}>
            <img src="/logo.png" alt="encarmen.org" className="h-8 w-auto object-contain" />
            <span className="hidden sm:inline text-xs font-black tracking-tight text-stone-800">
              FICHA OFICIAL
            </span>
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-full bg-white/80 hover:bg-white text-stone-800 transition shadow-2xs cursor-pointer active:scale-95"
            title="Compartir"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {isAdmin && (
        <div className="relative z-30 max-w-5xl mx-auto px-4 mt-3">
          <div className="bg-stone-950/85 backdrop-blur-md text-white rounded-2xl px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs border border-white/20 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="bg-amber-500 text-stone-950 font-black px-2 py-0.5 rounded-md text-[10px]">
                ADMIN
              </span>
              <span className="font-bold truncate">Gestionar publicación: {formattedName}</span>
            </div>

            <div className="flex items-center gap-2">
              {onToggleTop && (
                <button
                  type="button"
                  onClick={handleToggleTopAction}
                  className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold cursor-pointer active:scale-95 transition"
                >
                  ★ {isTop ? 'Quitar TOP' : 'Poner TOP'}
                </button>
              )}
              {onToggleRecommended && (
                <button
                  type="button"
                  onClick={handleToggleRecommendedAction}
                  className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer active:scale-95 transition"
                >
                  ✔ {isRecommended ? 'Quitar Recomendada' : 'Recomendada'}
                </button>
              )}
              {(onEdit || onEditBusiness) && (
                <button
                  type="button"
                  onClick={handleEdit}
                  className="px-3 py-1 rounded-lg bg-sky-700 hover:bg-sky-600 text-white font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
              )}
              {(onDelete || onDeleteBusiness) && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        <section className="rounded-[36px] overflow-hidden" style={appleGlassStyle}>
          <div className="relative w-full h-64 sm:h-80 md:h-96 overflow-hidden bg-stone-950 flex items-center justify-center">
            <img
              src={topCoverImage}
              alt={formattedName}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/BANNER-NUEVO-EMPRESAS-EN-CARMEN.png';
              }}
              className="w-full h-full object-cover object-center filter brightness-95"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/20 to-transparent pointer-events-none" />

            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2">
                {isRecommended && (
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-600 text-white shadow-md flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> Recomendada
                  </span>
                )}
                {isTop && (
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-500 text-white shadow-md flex items-center gap-1">
                    <Star className="w-4 h-4 fill-white" /> TOP
                  </span>
                )}
              </div>
            </div>

            <div className="absolute bottom-6 left-6 right-6 text-white pointer-events-none">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-500 text-stone-950 inline-block mb-2 shadow-xs font-bold">
                {primaryCategory}
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight drop-shadow-md">
                {formattedName}
              </h1>
              <div className="flex items-center gap-2 text-stone-200 text-xs sm:text-sm font-medium mt-1.5 drop-shadow">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{displayAddress}</span>
              </div>
            </div>
          </div>

          {/* FOTOS DE PRODUCTOS Y SERVICIOS (ÚNICAMENTE SI HAY FOTOS REALES REGISTRADAS) */}
          {galleryPhotos.length > 0 && (
            <div className="p-5 sm:p-7 border-b border-stone-200/60">
              <h3 className="text-xs font-black uppercase text-stone-500 tracking-wider mb-3">
                Fotos de Productos y Servicios ({galleryPhotos.length} {galleryPhotos.length === 1 ? 'foto' : 'fotos'})
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {galleryPhotos.slice(0, 10).map((photo, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedPhoto(photo)}
                    className="aspect-4/3 rounded-2xl overflow-hidden bg-stone-100 shadow-sm border border-white hover:scale-105 transition-transform duration-300 cursor-pointer"
                  >
                    <img 
                      src={photo} 
                      alt={`Foto ${index + 1} de ${formattedName}`} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).parentElement!.style.display = 'none';
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-5 sm:p-7 bg-white/60 backdrop-blur-md">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {cleanWhatsApp && (
                <a
                  href={getWhatsAppUrl(business.whatsapp || business.phone, 'Hola, vi su negocio en encarmen.org')}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3.5 px-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 shadow-lg hover:brightness-105 transition active:scale-98"
                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                >
                  <MessageSquare className="w-4 h-4 fill-white" />
                  <span>Contactar por WhatsApp</span>
                </a>
              )}

              {cleanPhone && (
                <a
                  href={`tel:${cleanPhone}`}
                  className="py-3.5 px-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 shadow-lg hover:brightness-105 transition active:scale-98"
                  style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}
                >
                  <Phone className="w-4 h-4 fill-white" />
                  <span>Llamar al {business.phone || business.whatsapp}</span>
                </a>
              )}

              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(`${business.name} Ciudad del Carmen`)}`}
                target="_blank"
                rel="noreferrer"
                className="py-3.5 px-4 rounded-2xl font-black text-sm text-stone-800 bg-white hover:bg-stone-50 border border-stone-200/80 flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
              >
                <Navigation className="w-4 h-4 text-rose-500" />
                <span>Cómo Llegar (GPS)</span>
              </a>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 rounded-[32px] p-6 sm:p-7 space-y-4" style={innerGlassCard}>
            <h2 className="text-sm font-black uppercase text-stone-500 tracking-wider">
              Descripción y Servicios Ofrecidos
            </h2>
            <p className="text-base text-stone-700 leading-relaxed font-normal whitespace-pre-line">
              {business.description?.replace(/https?:\/\/[^\s]+/gi, '').trim() ||
                'Empresa local comprometida con ofrecer productos y servicios de alta calidad en Ciudad del Carmen.'}
            </p>

            <div className="pt-4 border-t border-stone-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center font-bold shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-stone-900 uppercase tracking-wide">
                    Calificación de la Comunidad
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    {justRated
                      ? '¡Gracias! Tu calificación ya forma parte del promedio.'
                      : ratingSummary.count > 0
                      ? `Promedio de ${ratingSummary.count} ${ratingSummary.count === 1 ? 'opinión verificada' : 'opiniones verificadas'} · Toca para calificar`
                      : 'Sin calificar aún · Toca una estrella para calificar'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-stone-200/80 shadow-2xs self-start sm:self-auto">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const activeLevel = hoverStar || Math.round(ratingSummary.average);
                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverStar(star)}
                        onMouseLeave={() => setHoverStar(0)}
                        onClick={() => handleRateClick(star)}
                        title={`Calificar con ${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
                        className="p-0.5 hover:scale-125 active:scale-95 transition-transform cursor-pointer"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            star <= activeLevel
                              ? 'fill-amber-500 text-amber-500'
                              : 'fill-stone-100 text-stone-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {ratingSummary.count > 0 ? (
                  <div className="flex items-baseline gap-0.5 pl-1 border-l border-stone-200">
                    <span className="text-base font-black text-stone-900">
                      {ratingSummary.average.toFixed(1)}
                    </span>
                    <span className="text-xs text-stone-400">/ 5</span>
                  </div>
                ) : (
                  <span className="text-[11px] font-bold text-amber-700 pl-1 border-l border-stone-200">
                    Calificar
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[32px] p-6 flex flex-col items-center justify-center text-center space-y-4" style={innerGlassCard}>
            <div className="p-3 rounded-2xl bg-white shadow-md border border-stone-100">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(businessUrl)}`}
                alt="Código QR del negocio"
                className="w-36 h-36 object-contain"
              />
            </div>
            <div>
              <h3 className="text-sm font-black text-stone-900 leading-tight">
                Tarjeta Digital con QR
              </h3>
              <p className="text-[11px] text-stone-500 mt-1">
                Escanéala o compártela para acceder a la ficha directa
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedLink ? '¡Liga Copiada!' : 'Copiar Enlace'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-3xl p-5 space-y-2" style={innerGlassCard}>
            <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wide">
              <Clock className="w-4 h-4" /> Horario de Atención
            </div>
            <p className="text-sm font-black text-stone-900">
              {business.schedule || business.openingHours || 'Lunes a Sábado'}
            </p>
          </div>

          <div className="rounded-3xl p-5 space-y-2" style={innerGlassCard}>
            <div className="flex items-center gap-2 text-sky-700 font-bold text-xs uppercase tracking-wide">
              <CreditCard className="w-4 h-4" /> Métodos de Pago
            </div>
            <p className="text-xs font-bold text-stone-800 leading-snug">
              {business.payment || (business.paymentMethods && business.paymentMethods.length > 0 ? business.paymentMethods.join(', ') : 'Efectivo, Tarjetas y Transferencia SPEI.')}
            </p>
          </div>

          <div className="rounded-3xl p-5 space-y-2" style={innerGlassCard}>
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wide">
              <Truck className="w-4 h-4" /> Modalidad de Entrega
            </div>
            <p className="text-xs font-bold text-stone-800 leading-snug">
              {business.delivery || business.deliveryOption || 'Servicio a domicilio disponible y consumo en el local comercial.'}
            </p>
          </div>
        </div>

        {/* PANEL PARA EL PROPIETARIO (VISIBLE CUANDO EL ADMINISTRADOR NO ESTÁ LOGUEADO) */}
        {!isAdmin && (
          <div className="rounded-3xl overflow-hidden shadow-lg border border-white/40" style={appleGlassStyle}>
            <button
              type="button"
              onClick={() => setShowOwnerSection(!showOwnerSection)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-extrabold text-stone-800 hover:text-stone-950 transition cursor-pointer"
            >
              <div className="flex items-center gap-2 text-stone-900">
                <Key className="w-4 h-4 text-amber-600" />
                <span className="text-sm">¿Eres el propietario? Cambia los datos aquí</span>
              </div>
              {showOwnerSection ? <ChevronUp className="w-4 h-4 text-stone-600" /> : <ChevronDown className="w-4 h-4 text-stone-600" />}
            </button>

            {showOwnerSection && (
              <div className="p-5 pt-2 border-t border-stone-200/60 space-y-3.5">
                <p className="text-xs text-stone-700 font-medium leading-relaxed">
                  Para actualizar la información, teléfonos, fotos y descripción de tu empresa en encarmen.org, ingresa tu <strong>código de edición de 10 dígitos</strong> o solicítalo a la administración.
                </p>

                <form onSubmit={handleVerifyOwnerPin} className="space-y-2.5 max-w-md">
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
                      className="w-full text-center tracking-widest font-mono font-bold text-sm py-2.5 px-3 rounded-2xl border border-stone-300 bg-white text-stone-900 outline-none focus:border-amber-500 shadow-2xs"
                    />
                  </div>

                  {ownerPinError && (
                    <p className="text-xs font-bold text-rose-600 text-center">
                      {ownerPinError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isVerifyingPin || ownerPin.length !== 10}
                    className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs active:scale-98"
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

                <div className="pt-2 border-t border-stone-200/70">
                  <a
                    href={`https://api.whatsapp.com/send/?phone=%2B5219383895009&text=${encodeURIComponent(`Hola, soy el propietario de "${business.name}" y solicito mi código de edición de 10 dígitos para actualizar mi información en encarmen.org`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition active:scale-98 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-white" />
                    <span>Solicitar código de edición de la empresa</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        <footer className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-400 border-t border-white/20">
          <p>© 2026 encarmen.org · Directorio Comercial de Ciudad del Carmen</p>
          <button
            type="button"
            onClick={onAdminClick}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-amber-400 hover:text-stone-950 text-stone-300 border border-white/20 transition-all font-semibold cursor-pointer shadow-xs active:scale-95 group"
            title="Panel de Administración (π)"
          >
            <span className="font-serif text-sm font-bold text-amber-400 group-hover:text-stone-950">π</span>
            <span>Administración</span>
          </button>
        </footer>
      </main>

      {/* MODAL LIGHTBOX PARA AMPLIAR FOTO DE LA GALERÍA */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-pointer"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-black border border-white/20 shadow-2xl" onClick={e => e.stopPropagation()}>
            <img src={selectedPhoto} alt="Foto ampliada" className="w-full h-full max-h-[85vh] object-contain" />
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-black/70 hover:bg-black text-white transition shadow-md cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
