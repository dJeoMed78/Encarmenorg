import React, { useState, useEffect } from 'react';
import {
  X,
  Tag,
  Sparkles,
  CheckCircle,
  Copy,
  Check,
  MessageSquare,
  Building2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  Maximize2,
  ChevronLeft,
  Flame,
  ZoomIn
} from 'lucide-react';
import { Promotion, ClaimedCoupon } from '../types';
import { claimPromotionCoupon } from '../services/api';
import { cleanPhoneNumber } from '../utils/phone';

interface ClaimCouponModalProps {
  promotion: Promotion | null;
  isOpen: boolean;
  onClose: () => void;
  onCouponClaimed?: (coupon: ClaimedCoupon) => void;
}

export const ClaimCouponModal: React.FC<ClaimCouponModalProps> = ({
  promotion,
  isOpen,
  onClose,
  onCouponClaimed
}) => {
  const [step, setStep] = useState<'preview' | 'form'>('preview');
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [claimedCoupon, setClaimedCoupon] = useState<ClaimedCoupon | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset state when opened or promotion changes
  useEffect(() => {
    if (isOpen) {
      setStep('preview');
      setErrorMessage(null);
      setIsImageZoomed(false);
      setImageError(false);
      setClaimedCoupon(null);
      setCustomerName('');
      setCustomerPhone('');
    }
  }, [isOpen, promotion?.id]);

  // Handle ESC key to close zoom or modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (isImageZoomed) {
          setIsImageZoomed(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isImageZoomed, onClose]);

  if (!isOpen || !promotion) return null;

  // Determine the best image to show, prioritizing the uploaded promo flyer
  const displayImage = promotion.promoImageData || promotion.promoImage || (!imageError ? promotion.businessImage : '') || '';

  const remaining = Math.max(0, (promotion.totalCoupons || 5) - (promotion.claimedCount || 0));
  const isSoldOut = remaining <= 0 && !claimedCoupon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMessage('Por favor ingresa tu nombre y número de WhatsApp.');
      return;
    }

    const clean = customerPhone.replace(/[^0-9]/g, '');
    if (clean.length < 10) {
      setErrorMessage('Por favor ingresa un número de WhatsApp válido (10 dígitos).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await claimPromotionCoupon(promotion.id, customerName.trim(), clean);
      if (res.success && res.coupon) {
        setClaimedCoupon(res.coupon);
        if (onCouponClaimed) {
          onCouponClaimed(res.coupon);
        }
      } else {
        setErrorMessage(res.message || 'No fue posible reclamar el cupón.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (!claimedCoupon) return;
    navigator.clipboard.writeText(claimedCoupon.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendToBusinessWhatsApp = () => {
    if (!claimedCoupon) return;
    const cleanNumber = cleanPhoneNumber(
      claimedCoupon.businessWhatsapp || promotion.businessWhatsapp || promotion.businessPhone
    );
    const finalNumber = cleanNumber.length === 10 ? `52${cleanNumber}` : cleanNumber;

    const message = encodeURIComponent(
      `¡Hola! Reclamé mi cupón oficial de descuento en el Directorio Empresas en Carmen.\n\n` +
      `🎟️ Código Oficial: *${claimedCoupon.code}*\n` +
      `🎁 Promoción: *${claimedCoupon.discount}* - ${claimedCoupon.promotionTitle}\n` +
      `👤 Cliente: *${claimedCoupon.customerName}*\n` +
      `📞 Teléfono: *${claimedCoupon.customerPhone}*\n\n` +
      `Por favor indíqueme cómo coordinar o hacer válido mi descuento. ¡Muchas gracias!`
    );

    if (finalNumber) {
      window.open(`https://wa.me/${finalNumber}?text=${message}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${message}`, '_blank');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl lg:max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200/90 my-auto text-stone-900"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button Top-Right on all viewports */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal"
          className="absolute top-3.5 right-3.5 z-30 p-2.5 rounded-full bg-stone-900/60 hover:bg-stone-900 text-white transition-colors cursor-pointer shadow-md backdrop-blur-xs"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 2-Column Responsive Layout: Left = Image, Right = Details/Form */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
          
          {/* ==================================================== */}
          {/* COLUMNA IZQUIERDA: IMAGEN PROMOCIONAL CON PANTALLA COMPLETA */}
          {/* ==================================================== */}
          <div className="md:col-span-5 lg:col-span-5 bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 relative flex flex-col justify-between overflow-hidden group min-h-[260px] md:min-h-full">
            
            {/* Background / Image Container */}
            <div
              className="relative w-full h-full flex items-center justify-center cursor-pointer overflow-hidden p-2 sm:p-4"
              onClick={() => {
                if (displayImage) setIsImageZoomed(true);
              }}
              title="Oprime para ver a pantalla completa"
            >
              {displayImage ? (
                <div className="relative w-full h-full min-h-[240px] md:min-h-[400px] flex items-center justify-center">
                  <img
                    src={displayImage}
                    alt={promotion.title}
                    onError={() => setImageError(true)}
                    className="max-h-[360px] md:max-h-[480px] w-auto max-w-full object-contain rounded-2xl shadow-xl transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>
              ) : (
                /* Fallback stylized badge if image is not available */
                <div className="w-full h-full min-h-[260px] flex flex-col items-center justify-center text-center p-6 text-white space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                    <Flame className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-2xl font-black text-amber-400 block">{promotion.discount || 'OFERTA'}</span>
                    <span className="text-sm font-bold text-stone-200">{promotion.businessName}</span>
                  </div>
                  <p className="text-xs text-stone-400 max-w-xs">{promotion.title}</p>
                </div>
              )}
            </div>

            {/* Bottom Bar on Left Column */}
            {displayImage && (
              <div className="p-3 bg-stone-950/80 border-t border-stone-800/80 backdrop-blur-xs flex items-center justify-between text-stone-300 text-xs">
                <span className="text-[11px] text-stone-400 truncate max-w-[190px]">
                  📷 Cartel / Foto Promocional
                </span>
                <button
                  type="button"
                  onClick={() => setIsImageZoomed(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-[11px] transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Pantalla Completa</span>
                </button>
              </div>
            )}
          </div>

          {/* ==================================================== */}
          {/* COLUMNA DERECHA: DATOS DEL DESCUENTO Y FORMULARIO */}
          {/* ==================================================== */}
          <div className="md:col-span-7 lg:col-span-7 flex flex-col justify-between p-5 sm:p-7 lg:p-8 bg-white text-left">
            
            <div>
              {/* Badges Ribbon */}
              <div className="flex items-center gap-2 mb-2.5 pr-8 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 fill-stone-950" />
                  <span>Cupón Oficial Exclusivo</span>
                </span>
                {promotion.discount && (
                  <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-black uppercase tracking-wider shadow-xs">
                    {promotion.discount}
                  </span>
                )}
              </div>

              {/* Business Name & Promotion Title */}
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-stone-950 leading-tight">
                {promotion.businessName}
              </h2>
              <p className="text-sm sm:text-base font-bold text-amber-700 mt-1">
                {promotion.title}
              </p>

              {/* Main Content by Step */}
              <div className="mt-4">
                {!claimedCoupon ? (
                  step === 'preview' ? (
                    /* STEP 1: PREVIEW DETALLES Y CONDICIONES */
                    <div className="space-y-4">
                      {/* Description & Terms Card */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 rounded-xl bg-amber-500 text-stone-950 font-bold shrink-0 mt-0.5">
                            <Tag className="w-4 h-4" />
                          </div>
                          <div className="space-y-1.5">
                            <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                              Descripción del Beneficio
                            </h4>
                            <p className="text-xs sm:text-sm font-semibold text-stone-800 leading-relaxed">
                              {promotion.description || promotion.title}
                            </p>
                          </div>
                        </div>

                        {promotion.terms && (
                          <div className="pt-2 border-t border-amber-200/60 text-[11px] text-stone-600">
                            <strong>Condiciones:</strong> {promotion.terms}
                          </div>
                        )}

                        <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs font-semibold flex-wrap gap-2 text-stone-600">
                          <span className="flex items-center gap-1.5 text-amber-900 font-extrabold">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Válido hasta: {promotion.validUntil}</span>
                          </span>
                          <span className="bg-white/80 px-2 py-0.5 rounded-lg border border-amber-200 text-stone-700 font-bold text-[11px]">
                            Disponibles: <strong className="text-amber-700 font-black">{remaining} de {promotion.totalCoupons} cupones</strong>
                          </span>
                        </div>
                      </div>

                      {/* Prompt / Call to Action */}
                      {isSoldOut ? (
                        <div className="p-5 text-center space-y-2 bg-stone-50 rounded-2xl border border-stone-200">
                          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                          <h4 className="text-base font-black text-stone-900">¡Cupones Agotados!</h4>
                          <p className="text-xs text-stone-600">
                            Los {promotion.totalCoupons} cupones asignados a esta promoción ya han sido reclamados.
                          </p>
                          <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-2.5 px-4 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition-colors cursor-pointer mt-2"
                          >
                            Entendido
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3 pt-1">
                          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 border border-amber-200/80 text-stone-800">
                            <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>¿Deseas este descuento en {promotion.businessName}?</span>
                            </div>
                            <p className="text-[11px] text-stone-600 mt-0.5">
                              Aparta tu código oficial único para presentarlo o enviarlo directamente por WhatsApp.
                            </p>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => setStep('form')}
                              className="w-full sm:flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer transform hover:scale-[1.01] active:scale-[0.99]"
                            >
                              <Sparkles className="w-4 h-4 fill-stone-950 text-stone-950" />
                              <span>Sí, quiero este descuento</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={onClose}
                              className="w-full sm:w-auto py-3.5 px-5 rounded-2xl border border-stone-200 hover:bg-stone-100 text-stone-600 text-xs font-bold transition-colors cursor-pointer"
                            >
                              Solo estaba mirando
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* STEP 2: FORMULARIO DE NOMBRE Y WHATSAPP */
                    <form onSubmit={handleSubmit} className="space-y-4 animate-fadeIn">
                      <button
                        type="button"
                        onClick={() => setStep('preview')}
                        className="text-xs font-bold text-amber-800 hover:text-amber-900 hover:underline flex items-center gap-1 cursor-pointer mb-2"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Volver a ver detalles de la oferta</span>
                      </button>

                      <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-0.5">
                        <p className="font-extrabold">Aparta tu código con tu nombre y teléfono:</p>
                        <p className="text-[11px] text-stone-600">
                          Quedan <strong>{remaining} cupones disponibles</strong>. Máximo 1 por persona.
                        </p>
                      </div>

                      {errorMessage && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                          <span>{errorMessage}</span>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1">
                            Tu Nombre Completo *
                          </label>
                          <input
                            type="text"
                            required
                            autoFocus
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                            placeholder="Ej. Juana Ruiz"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50 focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1">
                            Tu Teléfono / WhatsApp (10 dígitos) *
                          </label>
                          <input
                            type="tel"
                            required
                            value={customerPhone}
                            onChange={e => setCustomerPhone(e.target.value)}
                            placeholder="Ej. 9381234567"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50 focus:bg-white font-mono"
                          />
                          <p className="text-[10px] text-stone-400 mt-1">
                            Se emitirá tu código único y se registrará para que {promotion.businessName} lo valide.
                          </p>
                        </div>
                      </div>

                      <div className="pt-1">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-3.5 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <span>Generando tu código de descuento...</span>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>Emitir y Ver Mi Código de Descuento</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )
                ) : (
                  /* STEP 3: TICKET DIGITAL CON CÓDIGO GENERADO */
                  <div className="space-y-4 animate-fadeIn">
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2.5">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-black">¡Felicidades, {claimedCoupon.customerName}!</h4>
                        <p className="text-[11px] text-emerald-800">
                          Tu código de promoción ha sido reservado exitosamente.
                        </p>
                      </div>
                    </div>

                    {/* Ticket visual */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-stone-950 text-white space-y-3 border-2 border-amber-500 shadow-xl relative overflow-hidden">
                      <div className="flex items-center justify-between pb-2 border-b border-stone-800 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-black tracking-widest text-amber-400 block">
                            Cupón Oficial
                          </span>
                          <span className="text-sm font-bold text-white">
                            {claimedCoupon.businessName}
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-amber-500 text-stone-950 text-xs font-black">
                          {claimedCoupon.discount}
                        </span>
                      </div>

                      <div className="text-center py-2 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                          Código Oficial:
                        </span>
                        <div className="text-2xl sm:text-3xl font-mono font-black text-amber-400 tracking-widest select-all">
                          {claimedCoupon.code}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
                        <span>Cliente: <strong className="text-stone-200">{claimedCoupon.customerName}</strong></span>
                        <span>Tel: <strong className="text-stone-200">{claimedCoupon.customerPhone}</strong></span>
                      </div>
                    </div>

                    {/* Botones de acción del cupón */}
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleSendToBusinessWhatsApp}
                        className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Enviar Código por WhatsApp al Negocio</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-stone-200"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">¡Código Copiado al Portapapeles!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-stone-500" />
                            <span>Copiar Código: {claimedCoupon.code}</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-[10px] text-stone-400 text-center">
                      Presenta o envía este código a {claimedCoupon.businessName} para hacer válida tu oferta.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Security Footnote */}
            <div className="pt-4 border-t border-stone-100 flex items-center justify-center gap-1.5 text-[11px] text-stone-400 text-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Sin costo ni registro con tarjetas. Cupón 100% oficial y gratuito.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* PANTALLA COMPLETA / FULLSCREEN LIGHTBOX              */}
      {/* ==================================================== */}
      {isImageZoomed && displayImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6 cursor-zoom-out animate-fadeIn"
          onClick={() => setIsImageZoomed(false)}
        >
          {/* Top Bar Fullscreen */}
          <div
            className="w-full max-w-5xl flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-stone-900/90 border border-stone-800 text-white backdrop-blur-xs shadow-xl shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-stone-950 font-black text-[10px] uppercase">
                {promotion.discount || 'OFERTA'}
              </span>
              <span className="text-xs sm:text-sm font-extrabold truncate">
                {promotion.businessName} · {promotion.title}
              </span>
            </div>
            
            <button
              type="button"
              onClick={() => setIsImageZoomed(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar Pantalla Completa</span>
            </button>
          </div>

          {/* Fullscreen Image Container */}
          <div
            className="flex-1 w-full max-w-5xl flex items-center justify-center p-2 sm:p-4 overflow-hidden"
            onClick={() => setIsImageZoomed(false)}
          >
            <img
              src={displayImage}
              alt={promotion.title}
              className="max-h-[80vh] sm:max-h-[85vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl transition-all"
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* Bottom Hint */}
          <div className="text-[11px] text-stone-400 text-center pb-1">
            Haz clic en la 'X' o fuera de la imagen (o presiona Escape) para volver
          </div>
        </div>
      )}
    </div>
  );
};
