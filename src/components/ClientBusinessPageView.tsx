import { contactDigits } from '../utils/businessContacts';
import React, { useState } from 'react';
import {
  ArrowLeft,
  Search,
  MessageSquare,
  Phone,
  MapPin,
  Clock,
  CreditCard,
  Truck,
  Globe,
  Share2,
  ExternalLink,
  Copy,
  Check,
  Star,
  CheckCircle,
  Building2,
  QrCode,
  Edit2,
  Trash2,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  Download,
  KeyRound,
  X
} from 'lucide-react';
import { Business, Promotion } from '../types';
import { trackAnalyticsEvent, verifyBusinessEditPin } from '../services/api';
import { getBrandConfig } from '../utils/brand';
import { BusinessGalleryGrid } from './BusinessGalleryGrid';
import { getWhatsAppUrl, formatMexicanPhone } from '../utils/phone';
import { formatBusinessName, formatAddressText } from '../utils/textUtils';
import {
  getBusinessPublicUrl,
  getBusinessDisplayUrl,
  getBusinessPrimaryCategory,
  getBusinessImageUrl
} from '../utils/businessUrl';
import { StarRatingWidget } from './StarRatingWidget';

interface ClientBusinessPageViewProps {
  business: Business;
  onBackToDirectory: () => void;
  onSearchFromPage: (query: string) => void;
  onOpenDigitalCard: (b: Business) => void;
  isAdmin?: boolean;
  onEditBusiness?: (b: Business) => void;
  onDeleteBusiness?: (b: Business) => void;
  onToggleRecommended?: (b: Business) => void;
  onToggleTop?: (b: Business) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (b: Business) => void;
  activePromotion?: Promotion | null;
  onOpenPromotion?: (promo: Promotion) => void;
}

export const ClientBusinessPageView: React.FC<ClientBusinessPageViewProps> = ({
  business,
  onBackToDirectory,
  onSearchFromPage,
  onOpenDigitalCard,
  isAdmin = false,
  onEditBusiness,
  onDeleteBusiness,
  onToggleRecommended,
  onToggleTop,
  isFavorite = false,
  onToggleFavorite,
  activePromotion,
  onOpenPromotion
}) => {
  const brand = getBrandConfig();
  const [searchInput, setSearchInput] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isOwnerPinModalOpen, setIsOwnerPinModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  const handleVerifyPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    const cleanPin = enteredPin.replace(/\D/g, '');
    if (cleanPin.length !== 10) {
      setPinError('El código debe tener exactamente 10 dígitos.');
      return;
    }

    setIsVerifyingPin(true);
    try {
      const res = await verifyBusinessEditPin(business.id, cleanPin);
      if (res.success && res.valid) {
        setIsOwnerPinModalOpen(false);
        if (onEditBusiness) onEditBusiness(business);
      } else {
        setPinError(res.message || 'Código incorrecto o expirado.');
      }
    } catch (err: any) {
      setPinError(err.message || 'Error de verificación');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const cleanSlug = business.slug || String(business.id);
  const directUrl = getBusinessPublicUrl(business);
  const displayUrl = getBusinessDisplayUrl(business);
  const displayImage = getBusinessImageUrl(business);
  const primaryCategory = getBusinessPrimaryCategory(business);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(directUrl)}`;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearchFromPage(searchInput.trim());
    } else {
      onBackToDirectory();
    }
  };

  const getWhatsAppLink = (b: Business): string => {
    return getWhatsAppUrl(
      contactDigits(b.whatsapp),
      `Hola, encontré su información en el directorio Empresas en Carmen y deseo solicitar informes sobre ${b.name}.`
    );
  };

  const waLink = getWhatsAppLink(business);

  const getGoogleMapsSearchUrl = (): string => {
    if (business.mapsUrl && business.mapsUrl.startsWith('http')) {
      return business.mapsUrl;
    }
    const query = encodeURIComponent(`${business.name}, ${business.address || ''}, Ciudad del Carmen, Campeche`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  const mapsUrl = getGoogleMapsSearchUrl();

  const handleCopyAddress = () => {
    if (!business.address) return;
    navigator.clipboard.writeText(business.address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(directUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `¡Hola! Te comparto la información y tarjeta de *${business.name}* en Ciudad del Carmen:\n\n📍 ${business.colonia || 'Ciudad del Carmen'}\n📞 ${business.phone || 'Ver contacto'}\n\n🌐 Ver perfil y tarjeta digital:\n${directUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen relative font-sans text-stone-900 flex flex-col bg-[#f0f4f8] overflow-x-hidden justify-between">
      {/* Ambient background light spheres for translucent glass refraction */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[18%] -left-32 w-[550px] h-[550px] bg-sky-200/50 rounded-full blur-[110px]" />
        <div className="absolute top-[45%] -right-32 w-[600px] h-[600px] bg-amber-200/45 rounded-full blur-[130px]" />
        <div className="absolute bottom-[10%] left-[20%] w-[550px] h-[550px] bg-teal-100/50 rounded-full blur-[120px]" />
      </div>

      {/* 1. TRANSLUCENT FROSTED GLASS HEADER */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(25px) saturate(190%)',
          WebkitBackdropFilter: 'blur(25px) saturate(190%)',
          borderBottom: '1.5px solid rgba(255, 255, 255, 0.85)',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Brand Logo & Back Button */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={onBackToDirectory}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/80 hover:bg-white text-stone-900 text-xs font-black transition-all shadow-xs border border-white/90 cursor-pointer active:scale-95"
              title="Volver a la portada principal del directorio"
            >
              <ArrowLeft className="w-4 h-4 text-amber-600" />
              <span>Directorio Completo</span>
            </button>

            <a
              href="/"
              onClick={e => {
                e.preventDefault();
                onBackToDirectory();
              }}
              className="flex items-center gap-2 text-stone-950 font-black text-sm hover:text-amber-600 transition-colors"
            >
              <img
                src={brand.logoUrl}
                alt={brand.name}
                className="h-7 w-auto object-contain"
                onError={e => {
                  (e.target as HTMLImageElement).src = brand.fallbackLogoUrl;
                }}
              />
              <span className="hidden md:inline text-xs font-black text-stone-800">
                | Ficha Comercial
              </span>
            </a>
          </div>

          {/* Discreet Search Engine Form */}
          <form
            onSubmit={handleSearchSubmit}
            className="w-full sm:w-auto flex-1 max-w-md relative flex items-center"
          >
            <Search className="w-4 h-4 text-stone-600 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Buscar otra empresa, servicio o comida en Carmen..."
              className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-white/90 bg-white/70 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-xs text-stone-900 font-semibold placeholder-stone-500 outline-none transition-all shadow-xs"
            />
            <button
              type="submit"
              className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-[11px] shadow-xs transition-colors cursor-pointer"
            >
              Buscar
            </button>
          </form>
        </div>

        {/* Admin Quick Action Banner (Visible only for authenticated admin) */}
        {isAdmin && (
          <div className="bg-stone-950 text-stone-100 border-t border-stone-800 px-4 py-2">
            <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold">
                <span className="px-2 py-0.5 rounded bg-amber-500 text-stone-950 font-black text-[10px] uppercase">
                  Admin
                </span>
                <span>Gestionar publicación: <strong className="text-white">{business.name}</strong></span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Toggle TOP */}
                {onToggleTop && (
                  <button
                    type="button"
                    onClick={() => onToggleTop(business)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer ${
                      business.isTopBusiness
                        ? 'bg-amber-500 text-stone-950 shadow-xs'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
                    }`}
                    title={business.isTopBusiness ? 'Quitar condición de Empresa TOP' : 'Marcar como Empresa TOP'}
                  >
                    <Star className={`w-3.5 h-3.5 ${business.isTopBusiness ? 'fill-stone-950' : ''}`} />
                    <span>{business.isTopBusiness ? '★ TOP Activo' : 'Poner TOP'}</span>
                  </button>
                )}

                {/* Toggle Recomendada */}
                {onToggleRecommended && (
                  <button
                    type="button"
                    onClick={() => onToggleRecommended(business)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer ${
                      business.isRecommended
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
                    }`}
                    title={business.isRecommended ? 'Quitar de Recomendadas' : 'Marcar como Recomendada (Etiqueta Verde)'}
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-200" />
                    <span>{business.isRecommended ? '✓ Recomendada (Verde)' : 'Poner Recomendada'}</span>
                  </button>
                )}

                {/* Edit */}
                {onEditBusiness && (
                  <button
                    type="button"
                    onClick={() => onEditBusiness(business)}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-stone-400" />
                    <span>Editar Ficha</span>
                  </button>
                )}

                {/* Delete */}
                {onDeleteBusiness && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-2.5 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Eliminar</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 2. MAIN CLIENT MINI PAGE CONTENT WITH GLASS SYSTEM */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8 flex-1 w-full relative z-10">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs text-stone-800 font-bold overflow-x-auto pb-1">
          <button
            onClick={onBackToDirectory}
            className="text-stone-900 hover:text-amber-700 hover:underline cursor-pointer"
          >
            Inicio
          </button>
          <span className="text-stone-400">/</span>
          <span className="text-amber-900 font-extrabold">{primaryCategory}</span>
          <span className="text-stone-400">/</span>
          <span className="text-stone-950 font-black truncate max-w-xs">{business.name}</span>
        </nav>

        {/* Hero Card Showcase (Frosted macOS Glass Container) */}
        <div
          className="rounded-3xl overflow-hidden transition-all duration-300 shadow-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(35px) saturate(190%)',
            WebkitBackdropFilter: 'blur(35px) saturate(190%)',
            border: '1.5px solid rgba(255, 255, 255, 0.90)',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.95)',
          }}
        >
          {/* Media Header Banner */}
          <div className="relative aspect-[16/8] sm:aspect-[21/9] w-full bg-stone-900 overflow-hidden">
            {displayImage ? (
              <img
                src={displayImage}
                alt={business.name}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={e => {
                  const target = e.target as HTMLImageElement;
                  if (!target.dataset.triedLive && target.src && target.src.includes('/uploads/')) {
                    target.dataset.triedLive = 'true';
                    const parts = target.src.split('/uploads/');
                    const filename = parts[parts.length - 1];
                    target.src = `/wp-content/uploads/2026/10/${filename}`;
                  } else {
                    target.onerror = null;
                    target.style.display = 'none';
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 text-stone-400 p-6 text-center">
                <Building2 className="w-16 h-16 sm:w-20 sm:h-20 stroke-[1] text-amber-400/60 mb-2" />
                <span className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                  {business.name}
                </span>
                <span className="text-xs text-stone-300 mt-1">
                  Empresa registrada en Ciudad del Carmen
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/25 to-transparent pointer-events-none" />

            {/* Badges Floating on Top Left */}
            <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
              {activePromotion && onOpenPromotion && (
                <button
                  type="button"
                  onClick={() => onOpenPromotion(activePromotion)}
                  className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-xl flex items-center gap-1.5 animate-bounce ring-2 ring-white/80 cursor-pointer hover:brightness-110 mb-1"
                >
                  <span className="text-sm">🔥</span>
                  <span>¡Promoción Activa! Oprima aquí</span>
                </button>
              )}
              {business.isTopBusiness && (
                <div className="px-3 py-1 rounded-full bg-[#f59e0b] text-stone-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-stone-950 text-stone-950" />
                  <span>★ TOP</span>
                </div>
              )}
              {business.isRecommended && (
                <div className="px-3 py-1 rounded-full bg-[#00875a] text-white font-extrabold text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                  <span>✓ Recomendada</span>
                </div>
              )}
              {business.isNewSubmission && !business.isRecommended && (
                <div className="px-3 py-1 rounded-full bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>Nuevo Registro</span>
                </div>
              )}
            </div>

            {/* Top Right Floating Actions (Favorite + Tarjeta Digital + Dueño) */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              {onToggleFavorite && (
                <button
                  type="button"
                  onClick={() => onToggleFavorite(business)}
                  className="p-2.5 rounded-full bg-white/85 hover:bg-white text-stone-900 shadow-md backdrop-blur-md transition-all cursor-pointer active:scale-95"
                  title={isFavorite ? 'Quitar de guardados' : 'Guardar negocio'}
                >
                  {isFavorite ? (
                    <BookmarkCheck className="w-4 h-4 text-amber-500 fill-amber-500" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenDigitalCard(business)}
                className="p-2.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5 text-xs px-3.5 active:scale-95"
                title="Abrir y compartir tarjeta digital de presentación"
              >
                <QrCode className="w-4 h-4 text-white" />
                <span className="hidden sm:inline">Tarjeta Digital con QR</span>
              </button>
              {onEditBusiness && (
                <button
                  type="button"
                  onClick={() => setIsOwnerPinModalOpen(true)}
                  className="p-2.5 rounded-xl bg-white/90 hover:bg-white text-stone-900 font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5 text-xs px-3.5 active:scale-95 border border-white"
                  title="Acceso para el propietario del negocio mediante código PIN de 10 dígitos"
                >
                  <KeyRound className="w-4 h-4 text-stone-700" />
                  <span className="hidden sm:inline">Soy el dueño</span>
                </button>
              )}
            </div>

            {/* Bottom Title on Image */}
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <span className="inline-block px-3 py-1 rounded-full bg-[#fef9c3] border border-[#fef08a] text-[#854d0e] font-black text-xs uppercase tracking-wider mb-2 shadow-xs">
                {primaryCategory}
              </span>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
                {formatBusinessName(business.name)}
              </h1>
              {Array.isArray(business.previousNames) && business.previousNames.length > 0 && (
                <p className="text-xs sm:text-sm text-amber-300 font-bold mt-0.5 drop-shadow-xs">
                  (Antes: {business.previousNames.join(', ')})
                </p>
              )}
              {business.colonia && (
                <p className="text-xs sm:text-sm text-white font-semibold flex items-center gap-1.5 mt-1 drop-shadow-xs">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span>Colonia {business.colonia}, Ciudad del Carmen, Campeche</span>
                </p>
              )}
            </div>
          </div>

          {/* Gallery Strip */}
          {business.gallery && business.gallery.length > 0 && (
            <div className="p-4 sm:p-5 bg-stone-950 border-b border-stone-800">
              <BusinessGalleryGrid
                gallery={business.gallery}
                businessName={business.name}
                title="Fotos de Productos o Servicios"
                dark={true}
              />
            </div>
          )}

          {/* Active Promotion Distinctive Banner */}
          {activePromotion && onOpenPromotion && (
            <div className="p-3 sm:p-5 bg-gradient-to-r from-stone-900 via-rose-950 to-stone-900 border-b border-rose-500/40">
              <button
                type="button"
                onClick={() => onOpenPromotion(activePromotion)}
                className="w-full p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-rose-600 hover:from-red-500 hover:to-amber-400 text-white font-black shadow-lg shadow-rose-600/30 flex items-center justify-between gap-3 transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer ring-4 ring-amber-400/50 animate-pulse text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 flex items-center justify-center text-xl sm:text-2xl shrink-0 backdrop-blur-xs">
                    🔥
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-black uppercase tracking-wider bg-white text-rose-700 px-2.5 py-0.5 rounded-lg shadow-xs">
                        ¡Promoción Activa! Oprima aquí
                      </span>
                      {activePromotion.discount && (
                        <span className="text-xs font-black bg-amber-400 text-stone-950 px-2 py-0.5 rounded-lg shadow-xs">
                          {activePromotion.discount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-white/95 truncate mt-1">
                      {activePromotion.title}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-rose-700 text-xs font-black uppercase tracking-wider whitespace-nowrap shrink-0 shadow-md">
                  <span>Reclamar Promoción</span>
                  <span>→</span>
                </div>
              </button>
            </div>
          )}

          {/* Quick Action Contact Bar */}
          <div
            className="p-4 sm:p-6 border-b"
            style={{
              background: 'rgba(255, 255, 255, 0.45)',
              borderColor: 'rgba(255, 255, 255, 0.80)',
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* WhatsApp Button */}
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    trackAnalyticsEvent({
                      type: 'whatsapp',
                      businessId: business.id,
                      businessName: business.name
                    });
                  }}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#00875a] hover:bg-[#00704a] active:scale-95 text-white font-black text-sm shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>Contactar por WhatsApp</span>
                </a>
              )}

              {/* Call Button */}
              {contactDigits(business.phone) && (
                <a
                  href={`tel:+52${contactDigits(business.phone)}`}
                  onClick={() => {
                    trackAnalyticsEvent({
                      type: 'call',
                      businessId: business.id,
                      businessName: business.name
                    });
                  }}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0062cc] active:scale-95 text-white font-black text-sm shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                >
                  <Phone className="w-5 h-5 text-white" />
                  <span>Llamar al {business.phone}</span>
                </a>
              )}

              {/* Google Maps Route */}
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  trackAnalyticsEvent({
                    type: 'maps',
                    businessId: business.id,
                    businessName: business.name
                  });
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-rose-300 bg-white/90 hover:bg-white text-rose-950 font-black text-sm shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <MapPin className="w-5 h-5 text-rose-600" />
                <span>Cómo Llegar (GPS)</span>
              </a>
            </div>
          </div>

          {/* Body Information */}
          <div className="p-5 sm:p-8 space-y-6 sm:space-y-8">
            {/* Description & Services */}
            <div className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-stone-950">
                Descripción y Servicios Ofrecidos
              </h2>
              <div
                className="p-5 sm:p-6 rounded-2xl text-stone-950 text-sm sm:text-base leading-relaxed space-y-3 font-semibold shadow-xs"
                style={{
                  background: 'rgba(255, 255, 255, 0.65)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  border: '1.5px solid rgba(255, 255, 255, 0.90)',
                }}
              >
                <p>
                  {business.description || 'Consulta directamente con la empresa para conocer el catálogo de productos y servicios disponibles en Ciudad del Carmen.'}
                </p>
                {business.categories && business.categories.length > 1 && (
                  <div className="pt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-stone-800">Giros relacionados:</span>
                    {business.categories.map((c, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 rounded-lg bg-white/90 border border-stone-200 text-stone-900 text-xs font-bold"
                      >
                        {typeof c === 'object' && c ? (c as any).name : String(c)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sistema de Calificación de 1 a 5 Estrellas */}
            <StarRatingWidget
              businessId={business.id}
              businessName={business.name}
              initialRating={business.rating}
              initialReviewCount={business.reviewCount}
            />

            {/* Operational Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {business.schedule && (
                <div
                  className="p-4 rounded-2xl space-y-1.5 shadow-xs"
                  style={{
                    background: 'rgba(255, 255, 255, 0.65)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1.5px solid rgba(255, 255, 255, 0.90)',
                  }}
                >
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-stone-900">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span>Horario de Atención</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-stone-950">
                    {business.schedule}
                  </p>
                </div>
              )}

              {business.payment && (
                <div
                  className="p-4 rounded-2xl space-y-1.5 shadow-xs"
                  style={{
                    background: 'rgba(255, 255, 255, 0.65)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1.5px solid rgba(255, 255, 255, 0.90)',
                  }}
                >
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-stone-900">
                    <CreditCard className="w-4 h-4 text-indigo-500" />
                    <span>Métodos de Pago</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-stone-950">
                    {business.payment}
                  </p>
                </div>
              )}

              {business.delivery && business.delivery !== 'No Aplica' && (
                <div
                  className="p-4 rounded-2xl space-y-1.5 shadow-xs"
                  style={{
                    background: 'rgba(255, 255, 255, 0.65)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1.5px solid rgba(255, 255, 255, 0.90)',
                  }}
                >
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-stone-900">
                    <Truck className="w-4 h-4 text-emerald-500" />
                    <span>Modalidad de Atención / Entrega</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-stone-950">
                    {business.delivery}
                  </p>
                </div>
              )}

              {/* Physical Address Card */}
              {business.address && (
                <div
                  className="p-4 rounded-2xl space-y-2 sm:col-span-2 lg:col-span-3 shadow-xs"
                  style={{
                    background: 'rgba(255, 255, 255, 0.65)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1.5px solid rgba(255, 255, 255, 0.90)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-stone-900">
                      <MapPin className="w-4 h-4 text-rose-500" />
                      <span>Ubicación y Dirección</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      className="flex items-center gap-1.5 text-xs font-black text-stone-900 bg-white/90 hover:bg-white border border-stone-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs active:scale-95"
                    >
                      {copiedAddress ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-black">¡Dirección Copiada!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Dirección</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-stone-950 leading-snug">
                    {business.address}
                  </p>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-black text-rose-700 hover:text-rose-900 hover:underline pt-1"
                  >
                    <span>Ver mapa en pantalla completa (Google Maps)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* OFFICIAL DIRECT LINK & SHARE BOX */}
            <div className="pt-2">
              <div
                className="p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs"
                style={{
                  background: 'rgba(254, 243, 199, 0.70)',
                  backdropFilter: 'blur(20px)',
                  border: '1.5px solid rgba(245, 158, 11, 0.40)',
                }}
              >
                <div className="flex items-center gap-3 text-stone-900 w-full sm:w-auto">
                  <div className="p-2.5 rounded-xl bg-amber-500 text-stone-950 font-black shrink-0 shadow-xs">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[11px] font-black text-amber-950 uppercase tracking-wider">
                      Enlace oficial del negocio:
                    </p>
                    <a
                      href={displayUrl.startsWith('http') ? displayUrl : `https://${displayUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs sm:text-sm font-black text-amber-950 hover:underline font-mono tracking-tight flex items-center gap-1.5 truncate cursor-pointer transition-colors"
                      title="Abrir enlace oficial en nueva pestaña"
                    >
                      <span className="truncate">{displayUrl}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                  <a
                    href={displayUrl.startsWith('http') ? displayUrl : `https://${displayUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-stone-950 font-black border border-amber-400 transition-colors shadow-xs cursor-pointer text-xs"
                    title="Abrir página oficial del negocio"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir Enlace</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-amber-100 active:scale-95 text-stone-900 font-black border border-amber-300 transition-colors shadow-xs cursor-pointer text-xs"
                    title="Copiar enlace oficial de esta empresa"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">¡Liga Copiada!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-stone-700" />
                        <span>Copiar Liga</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00875a] hover:bg-[#00704a] active:scale-95 text-white font-black transition-colors shadow-xs cursor-pointer text-xs"
                    title="Enviar enlace por WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Compartir</span>
                  </button>
                </div>
              </div>
            </div>

            {/* EMBEDDED DIGITAL BUSINESS CARD SHOWCASE */}
            <div className="pt-4 border-t border-stone-200/80">
              <div className="flex items-center justify-between pb-3 flex-wrap gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-stone-950 flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-amber-500" />
                    <span>Tarjeta Digital de Presentación Oficial</span>
                  </h3>
                  <p className="text-xs text-stone-800 font-semibold">
                    Código QR directo a esta ficha. Escanéalo o compártelo en redes sociales.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="px-3.5 py-2 rounded-xl bg-[#00875a] hover:bg-[#00704a] active:scale-95 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenDigitalCard(business)}
                    className="px-3.5 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] active:scale-95 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Compartir Tarjeta</span>
                  </button>
                </div>
              </div>

              {/* Card Container */}
              <div
                className="max-w-md mx-auto rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-stone-900"
                style={{
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(25px)',
                  border: '2px solid rgba(24, 24, 27, 0.90)',
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-3 border-b-2 border-stone-200 pb-3">
                  <div className="w-24 sm:w-28 h-12 rounded-lg bg-white flex items-center justify-start overflow-hidden">
                    {displayImage ? (
                      <img
                        src={displayImage}
                        alt={business.name}
                        className="w-full h-full object-contain object-left"
                        onError={e => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-xs font-black uppercase text-stone-900 leading-tight">
                        {business.name.slice(0, 14)}
                      </span>
                    )}
                  </div>
                  <div className="w-28 sm:w-32 flex items-center justify-end">
                    <img
                      src={brand.logoUrl}
                      alt={brand.name}
                      className="max-h-10 w-auto object-contain"
                      onError={e => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = brand.fallbackLogoUrl;
                      }}
                    />
                  </div>
                </div>

                {/* Company details */}
                <div className="space-y-1 text-left">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-[#fef9c3] border border-[#fef08a] text-[#854d0e] font-black text-[9px] uppercase tracking-wider">
                      {primaryCategory}
                    </span>
                    {business.isTopBusiness && (
                      <span className="px-2 py-0.5 rounded-full bg-[#f59e0b] text-stone-950 font-black text-[9px] uppercase tracking-wider">
                        ★ TOP
                      </span>
                    )}
                    {business.isRecommended && (
                      <span className="px-2 py-0.5 rounded-full bg-[#00875a] text-white font-extrabold text-[9px] uppercase tracking-wider">
                        ✓ Recomendada
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-black text-stone-950 uppercase tracking-tight leading-tight">
                    {business.name}
                  </h3>

                  <div className="text-xs font-bold text-stone-800 space-y-0.5">
                    {business.address && (
                      <p className="flex items-center gap-1 line-clamp-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>{business.address}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-1 text-stone-950 font-black">
                      <Phone className="w-3.5 h-3.5 text-stone-900 shrink-0" />
                      <span>Tel: {contactDigits(business.phone) ? formatMexicanPhone(business.phone) : 'No registrado'} · WhatsApp: {contactDigits(business.whatsapp) ? formatMexicanPhone(business.whatsapp) : 'No registrado'}</span>
                    </p>
                  </div>
                </div>

                {/* URL Directa Oficial */}
                <div className="w-full my-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-100 via-amber-200/90 to-amber-100 border-2 border-amber-400 text-center shadow-xs space-y-0.5">
                  <span className="text-[10px] font-black text-amber-950 uppercase tracking-wider block">
                    🌐 Página Web:
                  </span>
                  <span className="text-xs sm:text-sm font-black text-amber-950 font-mono tracking-tight break-all inline-block">
                    {directUrl}
                  </span>
                </div>

                {/* Services box */}
                <div className="rounded-xl border border-stone-300 p-3 bg-stone-50 text-left">
                  <p className="text-[9px] font-black uppercase text-stone-700 tracking-wider">
                    Servicios y Productos
                  </p>
                  <p className="text-xs text-stone-950 font-semibold line-clamp-3 leading-relaxed">
                    {business.description || 'Consulta los servicios que ofrecemos en Ciudad del Carmen.'}
                  </p>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center justify-center pt-1 text-center space-y-1">
                  <div className="p-2 bg-white rounded-xl border border-stone-300 shadow-sm inline-block">
                    <img
                      src={qrCodeUrl}
                      alt={`QR de ${business.name}`}
                      className="w-24 h-24 object-contain"
                    />
                  </div>
                  <p className="text-[10px] font-black text-stone-950 uppercase tracking-wider">
                    Escanea para ver perfil y contacto
                  </p>
                </div>

                <div className="border-t border-stone-200 pt-2 text-center text-[10px] text-stone-700 font-semibold">
                  Directorio Comercial Oficial: <strong className="text-stone-950 font-black">encarmen.org</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. FOOTER */}
      <footer
        className="mt-12 text-stone-900 border-t py-8 px-4 sm:px-6 relative z-10"
        style={{
          background: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(255, 255, 255, 0.85)',
        }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <img
              src={brand.logoUrl}
              alt={brand.name}
              className="h-8 w-auto object-contain"
              onError={e => {
                (e.target as HTMLImageElement).src = brand.fallbackLogoUrl;
              }}
            />
            <div>
              <p className="font-black text-stone-950">
                {brand.name}
              </p>
              <p className="text-[11px] text-stone-700 font-semibold">
                {brand.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <button
              onClick={onBackToDirectory}
              className="text-amber-800 hover:text-amber-950 hover:underline cursor-pointer"
            >
              Explorar todo el directorio
            </button>
            <span className="text-stone-400">·</span>
            <button
              onClick={() => onOpenDigitalCard(business)}
              className="text-stone-800 hover:text-black cursor-pointer"
            >
              Compartir Tarjeta Digital
            </button>
          </div>
        </div>
      </footer>

      {/* Owner PIN Verification Modal */}
      {isOwnerPinModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="relative w-full max-w-sm bg-white/95 backdrop-blur-2xl rounded-3xl p-6 border border-white/80 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <h4 className="font-black text-sm text-stone-950">Editar con Código de Dueño</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsOwnerPinModalOpen(false)}
                className="p-1 rounded-full text-stone-600 hover:text-stone-950 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-800 font-medium leading-relaxed">
              Ingresa el <strong>código de 10 dígitos</strong> otorgado por el administrador para modificar
              los datos, fotos y teléfonos de tu empresa.
            </p>

            <form onSubmit={handleVerifyPinSubmit} className="space-y-3">
              <input
                type="text"
                maxLength={10}
                placeholder="Ej. 8493029184"
                value={enteredPin}
                onChange={e => setEnteredPin(e.target.value)}
                className="w-full text-center tracking-widest font-mono font-black text-lg py-2.5 px-3 rounded-xl border border-stone-300 bg-white outline-none focus:border-amber-500 shadow-xs"
              />

              {pinError && (
                <p className="text-xs text-rose-600 font-bold text-center">{pinError}</p>
              )}

              <button
                type="submit"
                disabled={isVerifyingPin || enteredPin.length !== 10}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-stone-950 font-black text-xs cursor-pointer disabled:opacity-50 transition shadow-sm"
              >
                {isVerifyingPin ? 'Verificando...' : 'Verificar y Editar'}
              </button>
            </form>

            <div className="text-center pt-1 border-t border-stone-100">
              <a
                href={`https://wa.me/529381591557?text=${encodeURIComponent(`Hola, solicito el código PIN de 10 dígitos para actualizar mi negocio "${business.name}" en el directorio oficial encarmen.org`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-amber-700 hover:text-amber-900 underline font-bold inline-block"
              >
                ¿No tienes tu código PIN? Solicítalo por WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* DIÁLOGO EN APP PARA CONFIRMAR ELIMINACIÓN DE EMPRESA (SIN window.confirm) */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white border border-stone-200 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center text-2xl font-bold">
              <Trash2 className="w-7 h-7 text-rose-600" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xl font-black text-stone-950">¿Confirmas eliminar esta empresa?</h4>
              <p className="text-sm text-stone-700">
                Se dará de baja <strong className="text-rose-600">{business.name}</strong> definitivamente del directorio.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  if (onDeleteBusiness) onDeleteBusiness(business);
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

