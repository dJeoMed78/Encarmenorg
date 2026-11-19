import React, { useState, useMemo, useRef } from 'react';
import {
  Building2,
  CheckCircle,
  AlertCircle,
  Upload,
  X,
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  CreditCard,
  Truck,
  Facebook,
  Globe,
  ExternalLink,
  Info,
  Images,
  RefreshCw,
  Search,
  Check
} from 'lucide-react';
import { Category, Business } from '../types';
import {
  getPostalCodeForColonia,
  getColoniasForPostalCode,
  ALL_POSTAL_CODES
} from '../data/carmen_postal_codes';
import ALL_COLONIAS_CARMEN from '../data/colonias_carmen.json';
import {
  submitBusinessRegistration,
  checkBusinessDuplicate
} from '../services/api';
import { cleanPhoneNumber } from '../utils/phone';
import { uploadRegistrationImage, MEDIA_MAX_GALLERY } from '../services/publicMediaClient';
import { contactDigits } from '../utils/businessContacts';
import { formatBusinessName, formatAddressText } from '../utils/textUtils';
import { DELIVERY_OPTIONS, normalizeDeliveryOption } from '../constants/delivery';
import {
  STANDARDIZED_DELIVERY_OPTIONS,
  STANDARDIZED_PAYMENT_OPTIONS
} from '../constants/businessOptions';

interface RegisterBusinessViewProps {
  categories: Category[];
  coloniasList?: Array<{ name: string; count: number }>;
  onSuccessReturn: () => void;
  onBusinessAdded?: (biz: Business) => void;
}

export const RegisterBusinessView: React.FC<RegisterBusinessViewProps> = ({
  categories,
  coloniasList,
  onSuccessReturn,
  onBusinessAdded
}) => {
  const [coloniaQuery, setColoniaQuery] = useState('');
  const [selectedCp, setSelectedCp] = useState('');
  const [showColoniaDropdown, setShowColoniaDropdown] = useState(false);

  const [selectedDeliveryOptions, setSelectedDeliveryOptions] = useState<string[]>([
    'Atención en el Local de la empresa'
  ]);
  const [selectedPaymentOptions, setSelectedPaymentOptions] = useState<string[]>([
    'Efectivo'
  ]);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    phone: '',
    whatsapp: '',
    address: '',
    colonia: '',
    postalCode: '',
    schedule: '',
    payment: 'Efectivo',
    delivery: 'Atención en el Local de la empresa',
    facebook: '',
    website: '',
    image: '',
    ownerName: '',
    ownerEmail: ''
  });

  const fullColonias = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of coloniasList || []) {
      map.set(c.name, c.count);
    }
    for (const name of ALL_COLONIAS_CARMEN) {
      if (!map.has(name)) map.set(name, 0);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [coloniasList]);

  const filteredColonias = useMemo(() => {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    let list = fullColonias;
    if (selectedCp) {
      const allowed = getColoniasForPostalCode(selectedCp);
      if (allowed.length > 0) {
        const allowedSet = new Set(allowed.map(normalize));
        list = fullColonias.filter(c => allowedSet.has(normalize(c.name)));
      }
    }
    const q = normalize(coloniaQuery);
    return q ? list.filter(c => normalize(c.name).includes(q)) : list;
  }, [coloniaQuery, fullColonias, selectedCp]);

  const handleSelectColonia = (name: string) => {
    const cp = getPostalCodeForColonia(name);
    setFormData(prev => ({ ...prev, colonia: name, postalCode: cp }));
    setSelectedCp(cp);
    setColoniaQuery(name);
    setShowColoniaDropdown(false);
  };

  const handleSelectCp = (cp: string) => {
    setSelectedCp(cp);
    const cols = getColoniasForPostalCode(cp);
    setFormData(prev => ({
      ...prev,
      postalCode: cp,
      colonia: cols.length > 0 && (!prev.colonia || !cols.includes(prev.colonia)) ? cols[0] : prev.colonia
    }));
    if (cols.length > 0 && (!formData.colonia || !cols.includes(formData.colonia))) {
      setColoniaQuery(cols[0]);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const registrationRequestId = useRef<string | null>(null);
  const registrationBusy = useRef(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredBusiness, setRegisteredBusiness] = useState<Business | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploadedSuccess, setLogoUploadedSuccess] = useState(false);

  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const coverPending = useRef(0);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);

  // ENC-STAGING-PUBLIC-MEDIA-001: carga pública real del logotipo y hasta 10 fotografías.
  // Cada archivo se confirma en MariaDB (servidor) antes de mostrarse; el envío se bloquea mientras haya cargas pendientes.
  const mediaAttemptId = useRef<string | null>(null);
  const logoPending = useRef(0);
  const galleryPending = useRef(0);
  const galleryReserved = useRef(0);
  const ensureMediaAttempt = () => {
    if (!mediaAttemptId.current) mediaAttemptId.current = crypto.randomUUID();
    return mediaAttemptId.current;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErrorMessage(null);
    logoPending.current += 1;
    setIsUploadingLogo(true);
    setLogoUploadedSuccess(false);
    try {
      const uploaded = await uploadRegistrationImage(file, 'logo', ensureMediaAttempt());
      setFormData(prev => ({ ...prev, image: uploaded.url }));
      setLogoPreview(uploaded.url);
      setLogoUploadedSuccess(true);
    } catch (err: any) {
      setErrorMessage('Logotipo: ' + (err?.message || 'no se pudo subir.'));
    } finally {
      logoPending.current -= 1;
      setIsUploadingLogo(logoPending.current > 0);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErrorMessage(null);
    coverPending.current += 1;
    setIsUploadingCover(true);
    try {
      const uploaded = await uploadRegistrationImage(file, 'cover', ensureMediaAttempt());
      setCoverPreview(uploaded.url);
    } catch (err: any) {
      setErrorMessage('Fotografía de fachada: ' + (err?.message || 'no se pudo subir.'));
    } finally {
      coverPending.current -= 1;
      setIsUploadingCover(coverPending.current > 0);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    setErrorMessage(null);
    const room = MEDIA_MAX_GALLERY - galleryImages.length - galleryReserved.current;
    if (room <= 0) {
      setErrorMessage('Máximo ' + MEDIA_MAX_GALLERY + ' fotografías por empresa.');
      return;
    }
    const batch = files.slice(0, room);
    if (files.length > room) setErrorMessage('Solo caben ' + room + ' fotografías más; se subirán las primeras ' + room + '.');
    galleryReserved.current += batch.length;
    galleryPending.current += 1;
    setIsUploadingGallery(true);
    try {
      for (const file of batch) {
        try {
          const uploaded = await uploadRegistrationImage(file, 'gallery', ensureMediaAttempt());
          setGalleryImages(prev => (prev.length < MEDIA_MAX_GALLERY && !prev.includes(uploaded.url) ? [...prev, uploaded.url] : prev));
        } catch (err: any) {
          setErrorMessage(file.name + ': ' + (err?.message || 'no se pudo subir.'));
        } finally {
          galleryReserved.current -= 1;
        }
      }
    } finally {
      galleryPending.current -= 1;
      setIsUploadingGallery(galleryPending.current > 0);
    }
  };
  const handleRemoveGalleryImage = (index: number) => setGalleryImages(prev=>prev.filter((_,i)=>i!==index));

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoUploadedSuccess(false);
    setFormData(prev => ({ ...prev, image: '' }));
  };

  const paymentOptions = ['Efectivo', 'Transferencia SPEI', 'Tarjeta de Débito/Crédito', 'Cobro con terminal'];

  const togglePaymentMethod = (method: string) => {
    const current = formData.payment ? formData.payment.split(', ').filter(Boolean) : [];
    const next = current.includes(method) ? current.filter(m => m !== method) : [...current, method];
    setFormData({ ...formData, payment: next.join(', ') });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if(registrationBusy.current) return;
    if (logoPending.current > 0 || coverPending.current > 0 || galleryPending.current > 0 || isUploadingLogo || isUploadingCover || isUploadingGallery) {
      setErrorMessage('Espera a que terminen de subir las imágenes antes de enviar el registro.');
      return;
    }
    setErrorMessage(null);

    if (!formData.name.trim()) {
      setErrorMessage('Por favor ingresa el nombre de tu empresa o negocio.');
      return;
    }
    if (!formData.category) {
      setErrorMessage('Por favor selecciona una categoría o giro comercial.');
      return;
    }
    if (!contactDigits(formData.phone) && !contactDigits(formData.whatsapp)) {
      setErrorMessage('Por favor ingresa al menos un número telefónico o WhatsApp de contacto.');
      return;
    }

    if ((formData.phone.trim()&&!contactDigits(formData.phone))||(formData.whatsapp.trim()&&!contactDigits(formData.whatsapp))) {setErrorMessage('El contacto debe tener diez dígitos mexicanos válidos.');return;}
    registrationBusy.current = true;
    setIsSubmitting(true);
    try {
    if (!registrationRequestId.current) {
      const dup = await checkBusinessDuplicate(formData.name.trim(), formData.phone.trim());
      if (dup.isDuplicate && dup.existingBusiness) {
        setDuplicateWarning({
          detected: true,
          reason: dup.reason,
          existingBusiness: dup.existingBusiness
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

      const phoneClean = contactDigits(formData.phone);
      const waClean = contactDigits(formData.whatsapp);
      registrationRequestId.current ||= crypto.randomUUID();
      const deliveryStr = selectedDeliveryOptions.join(', ') || 'Atención en el Local de la empresa';
      const paymentStr = selectedPaymentOptions.join(', ') || 'Efectivo';
      let site = (formData.website || '').trim();
      if (site && !site.startsWith('http://') && !site.startsWith('https://')) {
        site = `https://${site}`;
      }

      const mediaPayload: Record<string, unknown> = {
        ...(formData.image ? { logo_url: formData.image, image: formData.image } : {}),
        ...(coverPreview ? { cover_url: coverPreview } : {}),
        ...(galleryImages.length ? { gallery: galleryImages } : {}),
        ...((formData.image || coverPreview || galleryImages.length) && mediaAttemptId.current ? { mediaAttempt: mediaAttemptId.current } : {})
      };
      const formattedBizName = formatBusinessName(formData.name.trim());
      const res = await submitBusinessRegistration({
        name: formattedBizName, category: formData.category,
        description: formData.description, address: formatAddressText(formData.address),
        colonia: formData.colonia, postalCode: formData.postalCode,
        schedule: formData.schedule, payment: paymentStr, delivery: deliveryStr,
        facebook: formData.facebook, website: site, phone: phoneClean, whatsapp: waClean,
        ...mediaPayload
      }, registrationRequestId.current);

      if (res.success && res.directoryVisible === true && res.business) {
        setDuplicateWarning(null);
        setIsSuccess(true);
        if (res.business) {
          setRegisteredBusiness(res.business);
          if (onBusinessAdded) onBusinessAdded(res.business);
        }
      } else if (res.isDuplicate) {
        setDuplicateWarning({
          detected: true,
          existingBusiness: res.existingBusiness
        });
        setErrorMessage(res.message || 'Ya existe un negocio registrado con este nombre o teléfono.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMessage(res.message || 'No fue posible confirmar el registro en MariaDB. Inténtalo de nuevo.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión con el servidor MariaDB.');
    } finally {
      registrationBusy.current = false;
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 animate-in fade-in duration-300">
        <div
          className="rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl"
          style={{
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(40px) saturate(190%)',
            WebkitBackdropFilter: 'blur(40px) saturate(190%)',
            border: '1.5px solid rgba(255, 255, 255, 0.95)',
            boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.95)',
          }}
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black text-emerald-900 bg-emerald-100/90 border border-emerald-300 shadow-2xs">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Guardado y Publicado en MariaDB</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              ¡Tu negocio ya está publicado en el directorio!
            </h2>
            <p className="text-stone-600 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
              La empresa <strong className="text-stone-900 font-bold">{formData.name}</strong> ha sido
              guardada y confirmada en la base de datos MariaDB. Ya se encuentra activa de forma inmediata en el catálogo público de{' '}
              <span className="font-bold text-amber-600">Empresas en Carmen</span> sin requerir aprobaciones intermedias.
            </p>
          </div>

          <div
            className="rounded-2xl p-5 border text-left text-xs sm:text-sm space-y-3 text-stone-800 max-w-md mx-auto"
            style={{
              background: 'rgba(255, 255, 255, 0.70)',
              backdropFilter: 'blur(10px)',
              border: '1.5px solid rgba(255, 255, 255, 0.90)',
            }}
          >
            <div className="flex items-center gap-3">
              {(logoPreview || formData.image) && (
                <div className="w-14 h-14 rounded-2xl border border-white/80 bg-white p-1 shrink-0 overflow-hidden shadow-xs">
                  <img
                    src={logoPreview || formData.image}
                    alt={formData.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1.5">
                  <p className="font-extrabold text-stone-900 truncate text-base">{formData.name}</p>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                    {registeredBusiness?.id ? `ID #${registeredBusiness.id}` : 'Publicado'}
                  </span>
                </div>
                <p className="text-amber-600 font-bold text-xs">{formData.category}</p>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-stone-200/60 font-semibold text-xs">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span><strong>Teléfono Local:</strong> {formData.phone || 'No registrado'}</span>
              </div>
              {formData.whatsapp && (
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span><strong>WhatsApp:</strong> {formData.whatsapp}</span>
                </div>
              )}
              {formData.colonia && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span><strong>Zona:</strong> {formData.colonia} {formData.postalCode ? `(CP ${formData.postalCode})` : ''}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onSuccessReturn}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-sm shadow-md transition-all cursor-pointer"
            >
              Ver en el Directorio
            </button>
            <button
              onClick={() => {
                setIsSuccess(false);
                registrationRequestId.current = null;
                mediaAttemptId.current = null;
                setRegisteredBusiness(null);
                setFormData({
                  name: '',
                  category: '',
                  description: '',
                  phone: '',
                  whatsapp: '',
                  address: '',
                  colonia: '',
                  postalCode: '',
                  schedule: '',
                  payment: 'Efectivo',
                  delivery: 'Atención en el Local de la empresa',
                  facebook: '',
                  website: '',
                  image: '',
                  ownerName: '',
                  ownerEmail: ''
                });
                setLogoPreview(null);
                setGalleryImages([]);
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-stone-300/80 hover:bg-white/80 active:scale-95 text-stone-800 font-bold text-sm transition-all cursor-pointer"
            >
              Registrar Otro Negocio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black text-amber-900 shadow-2xs"
          style={{
            background: 'rgba(255, 251, 235, 0.85)',
            backdropFilter: 'blur(15px)',
            border: '1.5px solid rgba(253, 230, 138, 0.85)',
          }}
        >
          <Building2 className="w-3.5 h-3.5 text-amber-700" />
          <span>Alta Gratuita en el Directorio Carmelita</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
          Registra tu Empresa o Comercio Local
        </h1>
        <p className="text-stone-600 text-xs sm:text-sm font-medium">
          Aparece ante miles de clientes en Ciudad del Carmen que buscan servicios, comida a domicilio,
          talleres y proveedores diariamente.
        </p>
      </div>

      {duplicateWarning && (
        <div
          className="p-5 rounded-3xl space-y-3"
          style={{
            background: 'rgba(254, 243, 199, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1.5px solid rgba(251, 191, 36, 0.85)',
            boxShadow: '0 10px 25px -5px rgba(217, 119, 6, 0.15)',
          }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs sm:text-sm">
              <p className="font-extrabold text-amber-950">
                Posible negocio duplicado detectado
              </p>
              <p className="text-amber-900 font-medium">
                Encontramos una empresa con nombre o teléfono similar:{' '}
                <strong>{duplicateWarning.existingBusiness?.name}</strong>.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {setDuplicateWarning(null);setErrorMessage('Revisa los datos o edita el negocio existente. Los duplicados no se registran.');}}
              className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs cursor-pointer shadow-md transition-all"
            >
              Revisar datos del negocio
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          className="p-4 sm:p-5 rounded-2xl text-rose-950 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
          style={{
            background: 'rgba(255, 241, 242, 0.90)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1.5px solid rgba(254, 205, 211, 0.90)',
          }}
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-extrabold text-rose-900">No se pudo confirmar la publicación</p>
              <p className="font-medium text-rose-800">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => handleSubmit(e as any)}
            disabled={isSubmitting}
            className="self-end sm:self-auto px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs cursor-pointer shadow-xs transition-all disabled:opacity-50 shrink-0 flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>Reintentar Guardado</span>
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 p-5 sm:p-8 rounded-3xl"
        style={{
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(40px) saturate(190%)',
          WebkitBackdropFilter: 'blur(40px) saturate(190%)',
          border: '1.5px solid rgba(255, 255, 255, 0.95)',
          boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.95)',
        }}
      >
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="font-black text-base text-stone-900 border-b border-stone-200/70 pb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center text-xs font-black shadow-xs">1</span>
            <span>Información del Negocio</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-stone-800">
                Nombre de la Empresa o Negocio *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                onBlur={() => setFormData(prev => ({ ...prev, name: formatBusinessName(prev.name) }))}
                placeholder="Ej. Antojitos La Manigua, Brio Cleaner, Taller El Carmen"
                className="w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-stone-900 placeholder:text-stone-400 outline-none transition-all focus:ring-2 focus:ring-amber-500/50 shadow-inner"
                style={{
                  background: 'rgba(255, 255, 255, 0.70)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.90)',
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-800">Categoría o Giro *</label>
              <select
                required
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-stone-900 outline-none transition-all focus:ring-2 focus:ring-amber-500/50 shadow-inner cursor-pointer"
                style={{
                  background: 'rgba(255, 255, 255, 0.75)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.90)',
                }}
              >
                <option value="">Selecciona una categoría...</option>
                {categories.map(c => (
                  <option key={c.id || c.slug} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-800">Servicio a Domicilio</label>
              <select
                value={formData.delivery}
                onChange={e => { setFormData({ ...formData, delivery: e.target.value }); setSelectedDeliveryOptions([e.target.value]); }}
                className="w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-stone-900 outline-none transition-all focus:ring-2 focus:ring-amber-500/50 shadow-inner cursor-pointer"
                style={{
                  background: 'rgba(255, 255, 255, 0.75)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.90)',
                }}
              >
                {DELIVERY_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-stone-800">Descripción o Especialidad</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe tus productos estrella, experiencia, servicios y lo que hace único a tu negocio..."
                className="w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-stone-900 placeholder:text-stone-400 outline-none transition-all focus:ring-2 focus:ring-amber-500/50 shadow-inner resize-none"
                style={{
                  background: 'rgba(255, 255, 255, 0.70)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.90)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Location & Contact */}
        <div className="space-y-4 pt-4 border-t border-stone-200/70">
          <h3 className="font-black text-base text-stone-900 border-b border-stone-200/70 pb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center text-xs font-black shadow-xs">2</span>
            <span>Contacto y Ubicación en Carmen</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-600" />
                  <span>Teléfono Local de Atención (o WhatsApp)</span>
                </label>
                {formData.phone.trim() ? (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    contactDigits(formData.phone)
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {contactDigits(formData.phone) ? '✓ 10 dígitos válidos' : 'Requiere 10 dígitos'}
                  </span>
                ) : null}
              </div>
              <input
                type="tel"
                required={!formData.whatsapp.trim()}
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ej. 938 123 4567"
                className="w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-stone-900 placeholder:text-stone-400 outline-none transition-all focus:ring-2 focus:ring-amber-500/50 shadow-inner"
                style={{
                  background: 'rgba(255, 255, 255, 0.70)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.90)',
                }}
              />
              <p className="text-[10px] text-stone-500">Llamadas directas para clientes en Ciudad del Carmen.</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp para Pedidos</span>
                </label>
                {formData.whatsapp.trim() ? (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    contactDigits(formData.whatsapp)
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {contactDigits(formData.whatsapp) ? '✓ 10 dígitos válidos' : 'Requiere 10 dígitos'}
                  </span>
                ) : null}
              </div>
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="Ej. 938 987 6543"
                className="w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-stone-900 placeholder:text-stone-400 outline-none transition-all focus:ring-2 focus:ring-amber-500/50 shadow-inner"
                style={{
                  background: 'rgba(255, 255, 255, 0.70)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.90)',
                }}
              />
              <p className="text-[10px] text-stone-500">Canal independiente de mensajería (no se infiere de teléfono).</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-800">Código Postal (CP)</label>
              <select
                value={selectedCp}
                onChange={e => handleSelectCp(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-stone-900 outline-none transition-all focus:ring-2 focus:ring-amber-500/50 shadow-inner cursor-pointer"
                style={{
                  background: 'rgba(255, 255, 255, 0.75)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.90)',
                }}
              >
                <option value="">Selecciona CP de Carmen...</option>
                {ALL_POSTAL_CODES.map(cp => (
                  <option key={cp} value={cp}>
                    CP {cp}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 relative">
              <label className="text-xs font-bold text-stone-800">Colonia o Sector *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={coloniaQuery}
                  onChange={e => {
                    setColoniaQuery(e.target.value);
                    setFormData(prev => ({ ...prev, colonia: e.target.value }));
                    setShowColoniaDropdown(true);
                  }}
                  onFocus={() => setShowColoniaDropdown(true)}
                  placeholder="Buscar colonia..."
                  className="w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-stone-900 placeholder:text-stone-400 outline-none transition-all focus:ring-2 focus:ring-amber-500/50 shadow-inner"
                  style={{
                    background: 'rgba(255, 255, 255, 0.70)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1.5px solid rgba(255, 255, 255, 0.90)',
                  }}
                />
              </div>

              {showColoniaDropdown && filteredColonias.length > 0 && (
                <div
                  className="absolute z-20 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-2xl shadow-xl p-1"
                  style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(25px)',
                    border: '1.5px solid rgba(255, 255, 255, 0.90)',
                  }}
                >
                  {filteredColonias.map(c => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => handleSelectColonia(c.name)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-amber-100/70 rounded-xl flex items-center justify-between cursor-pointer font-semibold text-stone-900 transition-colors"
                    >
                      <span>{c.name}</span>
                      <span className="text-[10px] text-stone-500 font-bold">
                        CP {getPostalCodeForColonia(c.name)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-stone-800">
                Dirección exacta (Calle, número y referencias)
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="Ej. Calle 31 #145 entre 36 y 38"
                className="w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-stone-900 placeholder:text-stone-400 outline-none transition-all focus:ring-2 focus:ring-amber-500/50 shadow-inner"
                style={{
                  background: 'rgba(255, 255, 255, 0.70)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.90)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Schedule, Delivery & Payment */}
        <div className="space-y-4 pt-4 border-t border-white/60">
          <h3 className="font-bold text-base text-stone-900 border-b border-white/60 pb-2">
            3. Modalidad de Entrega, Métodos de Pago y Horarios
          </h3>

          {/* Modalidad de Atención y Entrega (Multiselección) */}
          <div
            className="space-y-2 p-4 rounded-2xl shadow-xs"
            style={{
              background: 'rgba(255, 255, 255, 0.60)',
              backdropFilter: 'blur(15px)',
              WebkitBackdropFilter: 'blur(15px)',
              border: '1.5px solid rgba(255, 255, 255, 0.85)',
            }}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-amber-600" />
                <span>Modalidad de Atención y Entrega (Selecciona 1 o más) *</span>
              </label>
              <span className="text-[11px] text-stone-600 font-bold px-2 py-0.5 rounded-full bg-white/70 border border-white">
                {selectedDeliveryOptions.length} seleccionada(s)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {STANDARDIZED_DELIVERY_OPTIONS.map(opt => {
                const isChecked = selectedDeliveryOptions.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      const next = isChecked
                        ? selectedDeliveryOptions.filter(o => o !== opt)
                        : [...selectedDeliveryOptions, opt];
                      setSelectedDeliveryOptions(next);
                      setFormData(prev => ({
                        ...prev,
                        delivery: next.join(', ') || 'Atención en el Local de la empresa'
                      }));
                    }}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all text-left cursor-pointer active:scale-[0.98] ${
                      isChecked
                        ? 'bg-amber-500/20 border-amber-500/60 text-stone-950 shadow-xs font-bold'
                        : 'bg-white/75 hover:bg-white border-white/80 text-stone-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      isChecked ? 'bg-amber-500 border-amber-600 text-stone-950 font-bold' : 'border-stone-300 bg-white/90'
                    }`}>
                      {isChecked && <Check className="w-3 h-3 text-stone-950 stroke-[3]" />}
                    </div>
                    <span className="leading-tight">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Métodos de Pago Aceptados (Multiselección) */}
          <div
            className="space-y-2 p-4 rounded-2xl shadow-xs"
            style={{
              background: 'rgba(255, 255, 255, 0.60)',
              backdropFilter: 'blur(15px)',
              WebkitBackdropFilter: 'blur(15px)',
              border: '1.5px solid rgba(255, 255, 255, 0.85)',
            }}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                <span>Métodos de Pago Aceptados (Selecciona 1 o más) *</span>
              </label>
              <span className="text-[11px] text-stone-600 font-bold px-2 py-0.5 rounded-full bg-white/70 border border-white">
                {selectedPaymentOptions.length} seleccionado(s)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {STANDARDIZED_PAYMENT_OPTIONS.map(opt => {
                const isChecked = selectedPaymentOptions.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      const next = isChecked
                        ? selectedPaymentOptions.filter(o => o !== opt)
                        : [...selectedPaymentOptions, opt];
                      setSelectedPaymentOptions(next);
                      setFormData(prev => ({
                        ...prev,
                        payment: next.join(', ') || 'Efectivo'
                      }));
                    }}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all text-left cursor-pointer active:scale-[0.98] ${
                      isChecked
                        ? 'bg-purple-500/20 border-purple-500/60 text-stone-950 shadow-xs font-bold'
                        : 'bg-white/75 hover:bg-white border-white/80 text-stone-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      isChecked ? 'bg-purple-600 border-purple-700 text-white font-bold' : 'border-stone-300 bg-white/90'
                    }`}>
                      {isChecked && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    </div>
                    <span className="leading-tight">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Horario de Atención */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              <span>Horario de Atención</span>
            </label>
            <input
              type="text"
              value={formData.schedule}
              onChange={e => setFormData({ ...formData, schedule: e.target.value })}
              placeholder="Ej. Lunes a Sábado de 8:00 AM a 8:00 PM, Domingos de 9:00 AM a 2:00 PM"
              className="w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-stone-900 placeholder:text-stone-400 outline-none transition-all focus:ring-2 focus:ring-amber-500/50 shadow-inner"
              style={{
                background: 'rgba(255, 255, 255, 0.70)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1.5px solid rgba(255, 255, 255, 0.90)',
              }}
            />
          </div>
        </div>

        {/* Photos & Logo */}
        <div className="space-y-4 pt-4 border-t border-white/60">
          <h3 className="font-bold text-base text-stone-900 border-b border-white/60 pb-2">
            4. Logotipo e Imágenes
          </h3>

          <div className="space-y-3">
            <label className="text-xs font-bold text-stone-800">Logotipo de la empresa</label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div
                  className="relative w-20 h-20 rounded-2xl overflow-hidden p-1 shadow-sm"
                  style={{
                    background: 'rgba(255, 255, 255, 0.90)',
                    border: '1.5px solid rgba(255, 255, 255, 0.95)',
                  }}
                >
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-full h-full object-contain rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white text-xs cursor-pointer shadow-md hover:bg-rose-700 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label
                  className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center text-stone-500 hover:text-amber-600 cursor-pointer transition-all active:scale-95 shadow-xs"
                  style={{
                    background: 'rgba(255, 255, 255, 0.65)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '2px dashed rgba(217, 119, 6, 0.45)',
                  }}
                >
                  <Upload className="w-5 h-5 text-amber-600" />
                  <span className="text-[10px] mt-1 font-bold text-stone-700">Subir</span>
                  <input
                    type="file"
                    disabled={isUploadingLogo || isUploadingGallery || isSubmitting}
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              )}
              <div className="text-xs text-stone-600 leading-relaxed">
                <p className="font-bold text-stone-800">Formato JPG, PNG o WebP (máx. 3 MB por archivo; se comprimen fotografías grandes).</p>
                <p>El logotipo se guardará en MariaDB antes de publicar el negocio.</p>
                {isUploadingLogo && (
                  <span className="text-amber-700 font-bold flex items-center gap-1 mt-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Subiendo logo...
                  </span>
                )}
                {logoUploadedSuccess && (
                  <span className="text-emerald-700 font-bold mt-1 block">
                    ✓ Logo subido y enlazado correctamente
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Fotografía de fachada: independiente del logotipo y de las 10 fotos comerciales. */}
          <div className="space-y-3 pt-5 border-t border-white/60">
            <label className="text-xs font-bold text-stone-800">Fotografía de fachada / Imagen de portada</label>
            <p className="text-xs text-stone-600">Una fotografía exterior del establecimiento. No ocupa espacio en la galería de productos.</p>
            {coverPreview ? (
              <div className="relative w-36 h-24 rounded-xl overflow-hidden border border-stone-200">
                <img src={coverPreview} alt="Vista previa de fachada" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setCoverPreview(null)} className="absolute top-1 right-1 rounded-full bg-rose-600 text-white p-1" aria-label="Quitar fotografía de fachada"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-amber-400 px-4 py-3 text-xs font-bold text-stone-800">
                <Upload className="w-4 h-4" /> Subir fotografía de fachada
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverUpload} disabled={isUploadingCover || isUploadingLogo || isUploadingGallery || isSubmitting} className="hidden" />
              </label>
            )}
            {isUploadingCover && <p role="status" className="text-xs text-amber-700">Subiendo fotografía de fachada…</p>}
          </div>

          {/* Galería de Fotos de Productos o Servicios (Hasta 10 archivos) */}
          <div className="space-y-3 pt-5 border-t border-white/60">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
              <div>
                <label className="text-xs sm:text-sm font-bold text-stone-800 flex items-center gap-2">
                  <Images className="w-4 h-4 text-amber-600" />
                  <span>Fotos de Productos, Servicios o Menú (Hasta 10 fotos)</span>
                </label>
                <p className="text-[11px] sm:text-xs text-stone-600 mt-0.5">
                  Puedes añadir hasta 10 fotografías JPG, PNG o WebP; se guardarán en MariaDB.
                </p>
              </div>
              <span
                className="self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full text-stone-800 shrink-0 shadow-xs"
                style={{
                  background: 'rgba(255, 255, 255, 0.75)',
                  border: '1.5px solid rgba(255, 255, 255, 0.90)',
                }}
              >
                {galleryImages.length} de 10 fotos
              </span>
            </div>

            {/* Grid de Fotos y Botón de Subida */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
              {galleryImages.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-2xl overflow-hidden shadow-xs group"
                  style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1.5px solid rgba(255, 255, 255, 0.90)',
                  }}
                >
                  <img
                    src={imgUrl}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveGalleryImage(idx)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white shadow-md transition-colors cursor-pointer"
                    title="Eliminar foto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs">
                    #{idx + 1}
                  </span>
                </div>
              ))}

              {/* Botón para Subir Más Fotos */}
              {galleryImages.length < 10 && (
                <label
                  className="relative aspect-square rounded-2xl flex flex-col items-center justify-center text-stone-500 hover:text-amber-700 cursor-pointer transition-all p-3 text-center active:scale-95 shadow-xs"
                  style={{
                    background: 'rgba(255, 255, 255, 0.60)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '2px dashed rgba(217, 119, 6, 0.45)',
                  }}
                >
                  <Upload className="w-6 h-6 mb-1 text-amber-600" />
                  <span className="text-xs font-bold text-stone-800">+ Subir Fotos</span>
                  <span className="text-[10px] text-stone-500 leading-tight mt-0.5">
                    Selecciona hasta {10 - galleryImages.length} foto(s)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleGalleryUpload}
                    disabled={isUploadingLogo || isUploadingGallery || isSubmitting}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {isUploadingGallery && (
              <div
                className="p-3.5 rounded-2xl flex items-center gap-2 text-xs font-semibold text-amber-900 animate-pulse shadow-xs"
                style={{
                  background: 'rgba(254, 243, 199, 0.85)',
                  backdropFilter: 'blur(15px)',
                  WebkitBackdropFilter: 'blur(15px)',
                  border: '1.5px solid rgba(251, 191, 36, 0.70)',
                }}
              >
                <RefreshCw className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                <span>Subiendo y optimizando fotos de productos... Por favor espera un momento.</span>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-6 border-t border-white/60 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-10 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-sm shadow-lg shadow-amber-500/25 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-amber-300/60"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Guardando y confirmando en MariaDB...</span>
              </>
            ) : (
              <span>Registrar y Publicar Negocio en Carmen</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

