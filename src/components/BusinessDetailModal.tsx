import React, { useState } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  ExternalLink,
  Bookmark,
  Share2,
  AlertTriangle,
  QrCode,
  Edit2,
  Check,
  Copy,
  Building2,
  Truck,
  CreditCard,
  Star,
  CheckCircle,
  Tag,
  KeyRound,
  ShieldCheck,
  Facebook,
  Globe,
  Instagram
} from 'lucide-react';
import { BusinessGalleryGrid } from './BusinessGalleryGrid';
import { Business, Promotion } from '../types';
import {
  getBusinessPrimaryCategory,
  getBusinessImageUrl,
  getBusinessPublicUrl
} from '../utils/businessUrl';
import { getWhatsAppUrl, formatPhoneNumber } from '../utils/phone';
import { trackAnalyticsEvent, reportBusinessIssue, verifyBusinessEditPin, generateBusinessEditPin } from '../services/api';

interface BusinessDetailModalProps {
  business: Business | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: (b: Business) => void;
  isFavorite: boolean;
  onOpenDigitalCard?: (b: Business) => void;
  onOpenEditModal?: (b: Business, editPin: string) => void;
  onOpenReportModal?: (b: Business) => void;
  onOpenClaimCouponModal?: (p: Promotion) => void;
  activePromotion?: Promotion;
  isAdmin?: boolean;
  onEditBusiness?: (b: Business) => void;
  onOpenClientPage?: (b: Business) => void;
  onOpenPromotion?: (p: Promotion) => void;
  onToggleTop?: (b: Business) => void;
  onToggleRecommended?: (b: Business) => void;
  onDeleteBusiness?: (b: Business) => void;
}

export const BusinessDetailModal: React.FC<BusinessDetailModalProps> = ({
  business,
  isOpen,
  onClose,
  onToggleFavorite,
  isFavorite,
  onOpenDigitalCard,
  onOpenEditModal,
  activePromotion,
  onOpenClaimCouponModal,
  isAdmin = false,
  onEditBusiness,
  onOpenClientPage,
  onToggleTop,
  onToggleRecommended,
  onDeleteBusiness
}) => {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>('whatsapp_inactive');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSent, setReportSent] = useState(false);

  // 10-digit owner pin dialog
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [isGeneratingPin, setIsGeneratingPin] = useState(false);
  const [pinSuccessNotice, setPinSuccessNotice] = useState<string | null>(null);

  if (!isOpen || !business) return null;

  const handleAdminGeneratePin = async () => {
    setIsGeneratingPin(true);
    setPinError(null);
    setPinSuccessNotice(null);
    try {
      const res = await generateBusinessEditPin(business.id);
      if (res.success && res.pin) {
        setEnteredPin(res.pin);
        if (navigator.clipboard) {
          navigator.clipboard.writeText(res.pin).catch(() => {});
        }
        setPinSuccessNotice(`PIN ${res.pin} generado con éxito.`);
      } else {
        setPinError(res.message || 'No se pudo generar el PIN.');
      }
    } catch (err: any) {
      setPinError(err.message || 'Error al generar el PIN.');
    } finally {
      setIsGeneratingPin(false);
    }
  };

  const categoryName = getBusinessPrimaryCategory(business);
  const logoUrl = getBusinessImageUrl(business);
  const waUrl = getWhatsAppUrl(
    business.whatsapp || business.phone,
    `Hola, encontré su negocio "${business.name}" en el directorio Empresas en Carmen y deseo solicitar informes.`
  );

  const mapsUrl =
    business.mapsUrl ||
    (business.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${business.name}, ${business.address}, Ciudad del Carmen`
        )}`
      : null);

  const handleCopyAddress = () => {
    if (business.address) {
      navigator.clipboard.writeText(business.address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await reportBusinessIssue({
        businessId: business.id,
        businessName: business.name,
        reason: reportReason,
        details: reportDetails
      });
      setReportSent(true);
      setTimeout(() => {
        setIsReportOpen(false);
        setReportSent(false);
      }, 3000);
    } catch {
      setReportSent(true);
    }
  };

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
        setIsPinModalOpen(false);
        onClose();
        if (onOpenEditModal) {
          onOpenEditModal(business, cleanPin);
        } else if (onEditBusiness) {
          onEditBusiness(business);
        }
      } else {
        setPinError(res.message || 'Código incorrecto o expirado.');
      }
    } catch (err: any) {
      setPinError(err.message || 'Error de verificación');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-stone-200 shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Sticky Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-stone-100 bg-stone-50/80 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-xs uppercase tracking-wider">
              {categoryName}
            </span>
            {business.isTopBusiness && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-stone-950 font-black text-xs">
                ★ TOP
              </span>
            )}
            {business.isRecommended && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-xs">
                ✓ Recomendada
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onToggleFavorite(business)}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isFavorite
                  ? 'bg-amber-100 text-amber-600'
                  : 'hover:bg-stone-200 text-stone-400 hover:text-stone-700'
              }`}
              title={isFavorite ? 'Quitar de guardados' : 'Guardar negocio'}
            >
              <Bookmark className={`w-5 h-5 ${isFavorite ? 'fill-amber-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-stone-200 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-8 space-y-6 overflow-y-auto flex-1">
          {/* Main Top: Logo, Name, Subtitle */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            {logoUrl && (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border border-stone-200 p-2 bg-white shadow-sm overflow-hidden shrink-0 flex items-center justify-center">
                <img
                  src={logoUrl}
                  alt={business.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}
            <div className="space-y-1.5 flex-1 min-w-0">
              <h2 className="text-xl sm:text-3xl font-black text-stone-900 tracking-tight">
                {business.name}
              </h2>
              {Array.isArray(business.previousNames) && business.previousNames.length > 0 && (
                <p className="text-xs text-amber-700 font-medium">
                  Anteriormente conocido como: {business.previousNames.join(', ')}
                </p>
              )}
              <p className="text-xs sm:text-sm text-stone-500 flex items-center justify-center sm:justify-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>
                  {business.colonia
                    ? `Col. ${business.colonia}, Ciudad del Carmen`
                    : 'Ciudad del Carmen, Campeche'}
                </span>
              </p>
            </div>
          </div>

          {/* Action Row: QR Card, Owner Edit, Admin Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-stone-50 rounded-2xl border border-stone-200">
            {onOpenDigitalCard && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDigitalCard(business);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
              >
                <QrCode className="w-4 h-4" />
                <span>Tarjeta Digital con QR</span>
              </button>
            )}

            {onOpenClientPage && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenClientPage(business);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                title="Abrir la Landing Page oficial e independiente de este negocio"
              >
                <Globe className="w-4 h-4 text-amber-400" />
                <span>Abrir Landing Page</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsPinModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-stone-600" />
              <span>Soy el dueño (Editar con PIN)</span>
            </button>

            {isAdmin && (
              <div className="flex items-center gap-1.5 pt-2 sm:pt-0">
                {onToggleTop && (
                  <button
                    type="button"
                    onClick={() => onToggleTop(business)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      business.isTopBusiness
                        ? 'bg-amber-500 text-stone-950 shadow-xs'
                        : 'bg-white text-stone-700 hover:bg-amber-100 border border-stone-200'
                    }`}
                  >
                    <span>{business.isTopBusiness ? '★ TOP Activo' : 'Poner TOP'}</span>
                  </button>
                )}
                {onDeleteBusiness && (
                  <button
                    type="button"
                    onClick={() => onDeleteBusiness(business)}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs cursor-pointer"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Primary Action Buttons: WhatsApp & Call */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackAnalyticsEvent({
                    type: 'whatsapp',
                    businessId: business.id,
                    businessName: business.name
                  })
                }
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Enviar mensaje de WhatsApp</span>
              </a>
            )}

            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                onClick={() =>
                  trackAnalyticsEvent({
                    type: 'call',
                    businessId: business.id,
                    businessName: business.name
                  })
                }
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold shadow-md transition-all cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Llamar al {formatPhoneNumber(business.phone)}</span>
              </a>
            )}
          </div>

          {/* Active Promotion Banner */}
          {activePromotion && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 font-medium flex items-center justify-between shadow-md">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider bg-black/15 px-2 py-0.5 rounded-md">
                  Promoción Activa
                </span>
                <h4 className="font-extrabold text-sm sm:text-base text-stone-950">
                  {activePromotion.title}
                </h4>
                <p className="text-xs text-stone-900 line-clamp-1">{activePromotion.description}</p>
              </div>
              {onOpenClaimCouponModal && (
                <button
                  type="button"
                  onClick={() => onOpenClaimCouponModal(activePromotion)}
                  className="px-3.5 py-2 rounded-xl bg-stone-950 hover:bg-stone-900 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs"
                >
                  Obtener Cupón
                </button>
              )}
            </div>
          )}

          {/* Description */}
          {business.description && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Descripción y Servicios
              </h4>
              <p className="text-stone-700 text-sm sm:text-base leading-relaxed bg-stone-50/70 p-4 rounded-2xl border border-stone-100 whitespace-pre-line">
                {business.description}
              </p>
            </div>
          )}

          {/* Business Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(business.schedule || business.openingHours) && (
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/60 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Horario de Atención</span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-stone-900">
                  {business.schedule || business.openingHours}
                </p>
              </div>
            )}

            {(business.payment || (business.paymentMethods && business.paymentMethods.length > 0)) && (
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/60 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
                  <CreditCard className="w-4 h-4 text-indigo-500" />
                  <span>Métodos de Pago</span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-stone-900">
                  {business.payment || business.paymentMethods?.join(', ')}
                </p>
              </div>
            )}

            {(business.delivery || (business.deliveryOption && business.deliveryOption !== 'No Aplica')) && (
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/60 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
                  <Truck className="w-4 h-4 text-emerald-500" />
                  <span>Modalidad de Atención / Entrega</span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-stone-900">
                  {business.delivery || business.deliveryOption}
                </p>
              </div>
            )}

            {business.address && (
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/60 space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <span>Dirección Física</span>
                  </div>
                  <button
                    onClick={handleCopyAddress}
                    className="flex items-center gap-1 text-[11px] font-semibold text-stone-600 hover:text-stone-900 py-0.5 px-2 rounded-md hover:bg-stone-200/60 transition-colors cursor-pointer"
                  >
                    {copiedAddress ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">¡Copiada!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar dirección</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs sm:text-sm font-medium text-stone-800">{business.address}</p>
                {mapsUrl && (
                  <div className="pt-1">
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                    >
                      <span>Abrir esta dirección en Google Maps (Ruta GPS)</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Social Links */}
          {(business.website || business.facebook || business.instagram) && (
            <div className="flex flex-wrap gap-2 pt-2">
              {business.website && (
                <a
                  href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-700"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                  <span>Sitio Web Oficial</span>
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </a>
              )}
              {business.facebook && (
                <a
                  href={business.facebook.startsWith('http') ? business.facebook : `https://facebook.com/${business.facebook.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-semibold text-blue-800"
                >
                  <Facebook className="w-3.5 h-3.5 text-blue-600" />
                  <span>Facebook</span>
                  <ExternalLink className="w-3 h-3 text-blue-500" />
                </a>
              )}
              {business.instagram && (
                <a
                  href={business.instagram.startsWith('http') ? business.instagram : `https://instagram.com/${business.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-xs font-semibold text-pink-800"
                >
                  <Instagram className="w-3.5 h-3.5 text-pink-600" />
                  <span>Instagram</span>
                  <ExternalLink className="w-3 h-3 text-pink-500" />
                </a>
              )}
            </div>
          )}

          {/* Photo Gallery Grid (if photos are available) */}
          {business.gallery && business.gallery.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <BusinessGalleryGrid
                gallery={business.gallery}
                businessName={business.name}
                title="Galería de Productos, Menú e Instalaciones"
              />
            </div>
          )}

          {/* Citizen Report Section */}
          <div className="pt-4 border-t border-stone-100">
            {isReportOpen ? (
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Reportar problema con este negocio</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsReportOpen(false)}
                    className="text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>

                {reportSent ? (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>¡Gracias por el reporte! Se ha registrado para revisión.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSendReport} className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setReportReason('whatsapp_inactive')}
                        className={`py-1.5 px-2 rounded-lg border text-left font-medium transition-all cursor-pointer ${
                          reportReason === 'whatsapp_inactive'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        📵 WhatsApp dado de baja
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportReason('closed')}
                        className={`py-1.5 px-2 rounded-lg border text-left font-medium transition-all cursor-pointer ${
                          reportReason === 'closed'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        🔒 Negocio cerrado
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportReason('wrong_info')}
                        className={`py-1.5 px-2 rounded-lg border text-left font-medium transition-all cursor-pointer ${
                          reportReason === 'wrong_info'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        ✏️ Dirección / dato erróneo
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Detalle opcional (ej: ya no contestan en este número)..."
                      value={reportDetails}
                      onChange={e => setReportDetails(e.target.value)}
                      className="w-full text-xs py-2 px-3 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-stone-800"
                    />

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Enviar Reporte
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsReportOpen(true)}
                className="text-xs text-stone-400 hover:text-stone-600 font-medium flex items-center gap-1 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>¿Información incorrecta o teléfono dado de baja? Reportar aquí</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Owner PIN Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 border border-stone-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <h4 className="font-bold text-sm text-stone-900">Editar con Código de Propietario</h4>
              </div>
              <button
                onClick={() => setIsPinModalOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Ingresa el <strong>código de 10 dígitos</strong> otorgado por el administrador para modificar
              los datos de tu empresa.
            </p>

            <form onSubmit={handleVerifyPinSubmit} className="space-y-3">
              <input
                type="text"
                maxLength={10}
                placeholder="Ej. 8493029184"
                value={enteredPin}
                onChange={e => setEnteredPin(e.target.value)}
                className="w-full text-center tracking-widest font-mono font-bold text-lg py-2.5 px-3 rounded-xl border border-stone-200 bg-stone-50 outline-none focus:border-amber-500"
              />

              {pinError && (
                <p className="text-xs text-rose-600 font-medium text-center">{pinError}</p>
              )}

              {pinSuccessNotice && (
                <p className="text-xs text-emerald-600 font-medium text-center">{pinSuccessNotice}</p>
              )}

              <button
                type="submit"
                disabled={isVerifyingPin || enteredPin.length !== 10}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {isVerifyingPin ? 'Verificando...' : 'Verificar y Editar'}
              </button>
            </form>

            {/* Admin PIN quick generate */}
            {isAdmin && (
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                <span className="text-[11px] font-medium text-purple-900">Admin:</span>
                <button
                  type="button"
                  onClick={handleAdminGeneratePin}
                  disabled={isGeneratingPin}
                  className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-[11px] font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  <KeyRound className={`w-3.5 h-3.5 ${isGeneratingPin ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingPin ? 'Generando...' : 'Generar PIN Dueño'}</span>
                </button>
              </div>
            )}

            {/* Request PIN via WhatsApp for owner */}
            <div className="text-center pt-1 border-t border-stone-100">
              <a
                href={`https://wa.me/529381591557?text=${encodeURIComponent(`Hola, solicito el código PIN de 10 dígitos para actualizar los datos de mi negocio "${business.name}" en el directorio oficial encarmen.org`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-amber-600 hover:text-amber-800 underline font-medium inline-block"
              >
                ¿No tienes tu código PIN? Solicítalo por WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
