import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Flag,
  HelpCircle,
  Send,
  MapPin,
  Phone,
  MessageSquare,
  Mail,
  Calendar,
  DollarSign,
  Share2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Truck,
  Play,
  User,
  Clock,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Video,
  Globe
} from 'lucide-react';
import { ClassifiedAd } from '../types';
import { CLASSIFIED_CATEGORIES } from '../data/classifiedCategories';
import { cleanPhoneNumber, formatMexicanPhone, getWhatsAppUrl } from '../utils/phone';
import { sendClassifiedReport,classifiedOwnerToken } from '../services/api';
import { parseDescription, DescriptionPart } from '../utils/descriptionLinks';

interface ClassifiedDetailModalProps {
  ad: ClassifiedAd | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (ad: ClassifiedAd) => void;
  onDelete?: (adId: string) => void;
  isAdmin?: boolean;
}

export const ClassifiedDetailModal: React.FC<ClassifiedDetailModalProps> = ({
  ad,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  isAdmin = false
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<"owner_lost_access" | "sold" | "spam_inappropriate" | "wrong_info">("owner_lost_access");
  const [reportRequesterName, setReportRequesterName] = useState("");
  const [reportRequesterContact, setReportRequesterContact] = useState("");
  const [reportComment, setReportComment] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportStatus, setReportStatus] = useState<"idle" | "success" | "error">("idle");
  const [reportMessage, setReportMessage] = useState("");

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen || !ad) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showReportModal) {
          setShowReportModal(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, ad, showReportModal, onClose]);

  // Reset active image index when ad changes
  useEffect(() => {
    setActiveImageIndex(0);
    setConfirmDelete(false);
    setShowReportModal(false);
  }, [ad?.id]);

  const descriptionParts = useMemo(() => {
    if (!ad?.description) return [];
    return parseDescription(ad.description);
  }, [ad?.description]);

  if (!isOpen || !ad) return null;

  const categoryDef = CLASSIFIED_CATEGORIES.find(c => c.id === ad.category);
  const subcategoryDef = categoryDef?.subcategories.find(s => s.id === ad.subcategory);
  const isJob = subcategoryDef?.isJobCategory;
  const images = (ad.images && ad.images.length > 0) ? ad.images : (ad.image ? [ad.image] : []);
  const currentImage = images[activeImageIndex] || null;

  // Clean WhatsApp number and build URL
  const waUrl = getWhatsAppUrl(
    ad.whatsapp,
    `Hola ${ad.contactName || 'anunciante'}, vi tu anuncio "${ad.title}" en Empresas en Carmen (https://empresasencarmen.com) y me interesa más información.`
  );

  // UI hint only; the backend checks the opaque credential for every mutation.
  const isOwner=Boolean(classifiedOwnerToken(ad.id));
  const canManage=isOwner;

  const handleCopyShare = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(window.location.href);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportComment.trim()) {
      setReportStatus("error");
      setReportMessage("Por favor explica el motivo de tu solicitud.");
      return;
    }
    setIsSubmittingReport(true);
    setReportStatus("idle");
    try {
      const res = await sendClassifiedReport({
        classifiedId: ad.id,
        classifiedTitle: ad.title,
        reason: reportReason,
        requesterName: reportRequesterName,
        requesterContact: reportRequesterContact,
        comment: reportComment
      });
      if (res.success) {
        setReportStatus("success");
        setReportMessage(res.message || "Tu solicitud ha sido enviada al administrador. Se verificará para dar de baja la publicación.");
        setTimeout(() => {
          setShowReportModal(false);
          setReportStatus("idle");
          setReportComment("");
        }, 3500);
      } else {
        setReportStatus("error");
        setReportMessage(res.message || "Hubo un error al enviar el reporte. Inténtalo de nuevo.");
      }
    } catch {
      setReportStatus("error");
      setReportMessage("Error de conexión. Inténtalo nuevamente.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const nextImage = () => {
    if (images.length <= 1) return;
    setActiveImageIndex(prev => (prev + 1) % images.length);
  };

  const prevImage = () => {
    if (images.length <= 1) return;
    setActiveImageIndex(prev => (prev - 1 + images.length) % images.length);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      style={{
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
      }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-3xl overflow-hidden my-auto max-h-[92vh] flex flex-col shadow-2xl border"
        style={{
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(40px) saturate(190%)',
          WebkitBackdropFilter: 'blur(40px) saturate(190%)',
          borderColor: 'rgba(255, 255, 255, 0.95)',
          boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.95)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          className="px-5 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 border-b"
          style={{
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderColor: 'rgba(226, 232, 240, 0.8)'
          }}
        >
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="px-3 py-1 rounded-full bg-amber-500 text-stone-950 text-xs font-black uppercase tracking-wider shrink-0 shadow-xs">
              {categoryDef ? categoryDef.name.replace(/^\d+\.\s*/, '') : 'Clasificado'}
            </span>
            {subcategoryDef?.name && (
              <span className="text-stone-600 font-bold text-xs truncate hidden sm:inline">
                › {subcategoryDef.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canManage && (
              <div className="flex items-center gap-1.5 mr-1 sm:mr-2">
                {onEdit && (
                  <button
                    onClick={() => {
                      onEdit(ad);
                      onClose();
                    }}
                    className="min-h-[40px] px-3 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-800 transition-colors text-xs flex items-center gap-1.5 font-bold cursor-pointer"
                    title="Editar anuncio"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Editar</span>
                  </button>
                )}
                {onDelete && !confirmDelete && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="min-h-[40px] px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 transition-colors text-xs flex items-center gap-1.5 font-bold cursor-pointer"
                    title="Borrar anuncio"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Eliminar</span>
                  </button>
                )}
                {confirmDelete && (
                  <div className="flex items-center gap-1 bg-rose-100 border border-rose-300 p-1 rounded-xl">
                    <button
                      onClick={() => {
                        if (onDelete) onDelete(ad.id);
                        onClose();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-black hover:bg-rose-700 cursor-pointer min-h-[36px]"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1.5 text-stone-700 hover:text-stone-900 text-xs font-semibold cursor-pointer min-h-[36px]"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleCopyShare}
              className="min-h-[40px] min-w-[40px] p-2 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
              title="Compartir enlace"
              aria-label="Compartir enlace"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] p-2 rounded-xl hover:bg-stone-200/70 text-stone-500 hover:text-stone-900 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-left">
          {/* Top row: Gallery and Main Info */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Gallery Column (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="relative aspect-[4/3] bg-stone-100 rounded-2xl overflow-hidden border border-stone-200 flex items-center justify-center shadow-xs">
                {currentImage ? (
                  <img
                    src={currentImage}
                    alt={ad.title}
                    className="w-full h-full object-contain bg-stone-950"
                  />
                ) : (
                  <div className="text-center p-6 text-stone-400">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-2 text-stone-300" />
                    <p className="text-sm font-semibold">Sin imagen adjunta</p>
                    <p className="text-xs text-stone-400 mt-1">Anuncio verificado en Carmen</p>
                  </div>
                )}

                {/* Left/Right Buttons */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-stone-950/70 hover:bg-stone-950 text-white flex items-center justify-center backdrop-blur-xs transition-transform active:scale-95 cursor-pointer shadow-md"
                      aria-label="Imagen anterior"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={nextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-stone-950/70 hover:bg-stone-950 text-white flex items-center justify-center backdrop-blur-xs transition-transform active:scale-95 cursor-pointer shadow-md"
                      aria-label="Imagen siguiente"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-stone-950/80 text-white text-[11px] font-bold">
                      {activeImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails row */}
              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        activeImageIndex === idx ? 'border-amber-500 scale-105' : 'border-stone-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Optional Video link */}
              {ad.videoUrl && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-red-900 font-semibold">
                    <Play className="w-4 h-4 text-red-600 fill-current shrink-0" />
                    <span>Este anuncio incluye video demostrativo</span>
                  </div>
                  <a
                    href={ad.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-red-700 hover:text-red-900 underline flex items-center gap-1 shrink-0"
                  >
                    <span>Ver Video</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Price & Commercial Info Column (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 mb-2">
                  {subcategoryDef?.name || 'Clasificado Local'}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-stone-900 leading-snug">
                  {ad.title}
                </h1>
              </div>

              {/* Price display block */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  {isJob ? 'Compensación / Salario' : 'Precio del producto o servicio'}
                </span>
                <div className="flex items-baseline gap-2 flex-wrap">
                  {isJob || ad.priceType === 'consult' || ad.price === null || ad.price === undefined || Number(ad.price) <= 0 ? (
                    <span className="text-2xl font-black text-amber-600">
                      {isJob ? 'Salario a convenir' : 'A consultar / A tratar'}
                    </span>
                  ) : (
                    <>
                      <span className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                        ${Number(ad.price).toLocaleString('es-MX')}
                      </span>
                      <span className="text-sm font-bold text-stone-500">
                        {ad.currency || 'MXN'}
                      </span>
                    </>
                  )}
                </div>
                <div className="text-xs text-stone-500 font-medium pt-1">
                  Condición: <strong className="text-stone-800 capitalize">
                    {ad.priceType === 'negotiable' ? 'A tratar / Negociable' : ad.priceType === 'consult' ? 'A consultar' : 'Precio Fijo'}
                  </strong>
                </div>
              </div>

              {/* Delivery and logistics */}
              <div className="space-y-2 text-xs">
                {ad.deliveryCondition && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-700">
                    <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Condición de entrega:{' '}
                      <strong>
                        {ad.deliveryCondition === 'direct'
                          ? 'Trato directo en persona'
                          : ad.deliveryCondition === 'delivery'
                          ? 'Entrega a domicilio'
                          : 'Envíos disponibles'}
                      </strong>
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-700">
                  <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Ubicación:{' '}
                    <strong>
                      {ad.noLocation
                        ? 'Ubicación reservada por el anunciante'
                        : [ad.colonia ? `Col. ${ad.colonia}` : '', ad.location || 'Ciudad del Carmen, Campeche'].filter(Boolean).join(', ')}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-700">
                  <Clock className="w-4 h-4 text-stone-400 shrink-0" />
                  <span>
                    Publicado:{' '}
                    <strong>
                      {new Date(ad.createdAt).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Contact Seller CTA Block */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-amber-900">Contacto / Anunciante</span>
                    <h4 className="font-extrabold text-stone-900 text-sm leading-tight truncate">
                      {ad.contactName || 'Anunciante'}
                    </h4>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  {ad.whatsapp && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-sm shadow-sm transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 fill-current shrink-0" />
                      <span>Contactar por WhatsApp</span>
                    </a>
                  )}

                  {ad.phone && (
                    <a
                      href={`tel:${cleanPhoneNumber(ad.phone)}`}
                      className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-xs transition-all"
                    >
                      <Phone className="w-4 h-4 shrink-0" />
                      <span>Llamar al {formatMexicanPhone(ad.phone)}</span>
                    </a>
                  )}

                  {ad.email && (!ad.contactMethods || ad.contactMethods.includes("email")) && (
                    <a
                      href={`mailto:${ad.email}?subject=${encodeURIComponent(`Interés en tu anuncio: ${ad.title}`)}&body=${encodeURIComponent(`Hola ${ad.contactName || ''},\n\nVi tu anuncio clasificado "${ad.title}" en Empresas en Carmen (https://empresasencarmen.com) y quisiera más información.\n\nQuedo a la espera de tu respuesta.\nGracias.`)}`}
                      className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 hover:text-stone-900 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Mail className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Enviar correo al anunciante</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Solicitar baja al administrador */}
          <div className="border-t border-stone-200 pt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-stone-50/80 p-4 rounded-2xl border border-stone-200/80">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>¿Eres el anunciante o este aviso ya no está disponible?</span>
              </span>
              <p className="text-[11px] text-stone-500 leading-normal">
                Si no tienes acceso para retirarlo tú mismo, o si el anuncio ya concluyó, puedes solicitar al administrador su baja inmediata.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowReportModal(true);
                setReportStatus("idle");
                setReportMessage("");
              }}
              className="shrink-0 min-h-[40px] px-3.5 py-2 rounded-xl border border-stone-300 hover:border-amber-500 bg-white hover:bg-amber-50/50 text-stone-700 hover:text-amber-900 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5 text-amber-600" />
              <span>Solicitar baja al Administrador</span>
            </button>
          </div>

          {/* Description Section with Interactive Link Parsing */}
          <div className="border-t border-stone-200 pt-6 space-y-3">
            <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
              <span>Descripción detallada</span>
            </h3>
            <div className="bg-stone-50/90 p-4 sm:p-5 rounded-2xl border border-stone-200 text-stone-800 text-sm sm:text-base leading-relaxed whitespace-pre-line break-words">
              {descriptionParts.length > 0 ? (
                descriptionParts.map((part: DescriptionPart, idx: number) => {
                  if (part.type === 'link') {
                    return (
                      <a
                        key={idx}
                        href={part.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 font-semibold underline underline-offset-2 break-all mx-1 bg-amber-50/80 hover:bg-amber-100/80 px-1.5 py-0.5 rounded-md transition-colors"
                      >
                        <Globe className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>{part.label}</span>
                        <ExternalLink className="w-3 h-3 text-amber-600 shrink-0" />
                      </a>
                    );
                  }
                  return <span key={idx}>{part.text}</span>;
                })
              ) : (
                ad.description || 'Sin descripción adicional proporcionada.'
              )}
            </div>
          </div>
        </div>

        {/* Modal de Solicitud de Baja al Administrador */}
        {showReportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-fadeIn">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden p-6 space-y-4">
              <div className="flex items-start justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                    <Flag className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-stone-900 leading-tight">Solicitar baja de anuncio</h4>
                    <p className="text-[11px] text-stone-500 truncate max-w-[220px]">
                      {ad.title}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="min-h-[36px] min-w-[36px] p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center cursor-pointer"
                  aria-label="Cerrar reporte"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {reportStatus === "success" ? (
                <div className="py-6 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h5 className="font-extrabold text-stone-900 text-sm">¡Solicitud recibida!</h5>
                  <p className="text-xs text-stone-600 max-w-xs mx-auto leading-relaxed">
                    {reportMessage}
                  </p>
                  <p className="text-[11px] text-stone-400 pt-2">
                    Aparecerá en la bandeja del panel del administrador para su atención inmediata.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSendReport} className="space-y-3.5 text-left">
                  {reportStatus === "error" && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{reportMessage}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700">Motivo de la solicitud</label>
                    <select
                      value={reportReason}
                      onChange={e => setReportReason(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:bg-white focus:border-amber-500 outline-none text-stone-800 font-medium"
                    >
                      <option value="owner_lost_access">Soy el creador del anuncio pero cambié de equipo y no puedo borrarlo</option>
                      <option value="sold">El artículo o servicio ya se vendió / ya no está disponible</option>
                      <option value="spam_inappropriate">Información incorrecta o no deseada</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700">Tu nombre</label>
                      <input
                        type="text"
                        placeholder="Ej. Roberto Zavala"
                        value={reportRequesterName}
                        onChange={e => setReportRequesterName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:bg-white focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700">Teléfono o WhatsApp</label>
                      <input
                        type="text"
                        placeholder="Ej. 938 123 4567"
                        value={reportRequesterContact}
                        onChange={e => setReportRequesterContact(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:bg-white focus:border-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700">Mensaje para el administrador *</label>
                    <textarea
                      required
                      rows={3}
                      value={reportComment}
                      onChange={e => setReportComment(e.target.value)}
                      placeholder="Explica brevemente por qué solicitas retirar esta publicación..."
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:bg-white focus:border-amber-500 outline-none resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReport}
                      className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmittingReport ? "Enviando..." : "Enviar solicitud"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Footer notification */}
        {copiedLink && (
          <div className="bg-emerald-600 text-white text-xs font-bold py-2 px-4 text-center animate-fadeIn">
            ¡Enlace copiado al portapapeles!
          </div>
        )}
      </div>
    </div>
  );
};
