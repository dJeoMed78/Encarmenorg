import React, { useState, useMemo } from 'react';
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
  checkBusinessDuplicate,
  uploadImage
} from '../services/api';
import { cleanPhoneNumber } from '../utils/phone';
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
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredBusiness, setRegisteredBusiness] = useState<Business | null>(null);
  const [wpPermalink, setWpPermalink] = useState<string | null>(null);
  const [isWpPublished, setIsWpPublished] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploadedSuccess, setLogoUploadedSuccess] = useState(false);

  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const remaining = 10 - galleryImages.length;
    if (remaining <= 0) {
      setErrorMessage('Ya alcanzaste el límite máximo de 10 fotos para la galería.');
      return;
    }
    const selected = files.slice(0, remaining);
    setIsUploadingGallery(true);
    setErrorMessage(null);

    try {
      const urls: string[] = [];
      for (const file of selected) {
        if (file.size > 8 * 1024 * 1024) continue;
        const b64 = await new Promise<string>(res => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result as string);
          reader.readAsDataURL(file);
        });
        try {
          const uploadRes = await uploadImage(b64, file.name);
          if (uploadRes.success && uploadRes.url) {
            urls.push(uploadRes.url);
          } else {
            urls.push(b64);
          }
        } catch {
          urls.push(b64);
        }
      }
      setGalleryImages(prev => [...prev, ...urls].slice(0, 10));
    } catch (err) {
      console.error('Error uploading gallery photos:', err);
    } finally {
      setIsUploadingGallery(false);
      e.target.value = '';
    }
  };

  const handleRemoveGalleryImage = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('La imagen seleccionada supera los 5MB. Por favor elige un archivo más liviano.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      setLogoPreview(result);
      setIsUploadingLogo(true);
      setErrorMessage(null);

      try {
        const uploadRes = await uploadImage(result, file.name);
        if (uploadRes.success && uploadRes.url) {
          setFormData(prev => ({ ...prev, image: uploadRes.url || result }));
          setLogoUploadedSuccess(true);
          setTimeout(() => setLogoUploadedSuccess(false), 3000);
        } else {
          setFormData(prev => ({ ...prev, image: result }));
        }
      } catch {
        setFormData(prev => ({ ...prev, image: result }));
      } finally {
        setIsUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setFormData(prev => ({ ...prev, image: '' }));
  };

  const paymentOptions = ['Efectivo', 'Transferencia SPEI', 'Tarjeta de Débito/Crédito', 'Cobro con terminal'];

  const togglePaymentMethod = (method: string) => {
    const current = formData.payment ? formData.payment.split(', ').filter(Boolean) : [];
    const next = current.includes(method) ? current.filter(m => m !== method) : [...current, method];
    setFormData({ ...formData, payment: next.join(', ') });
  };

  const handleSubmit = async (e: React.FormEvent, allowDuplicate = false) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!formData.name.trim()) {
      setErrorMessage('Por favor ingresa el nombre de tu empresa o negocio.');
      return;
    }
    if (!formData.category) {
      setErrorMessage('Por favor selecciona una categoría o giro comercial.');
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMessage('Por favor ingresa al menos un número telefónico o WhatsApp de contacto.');
      return;
    }

    if (!allowDuplicate) {
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

    setIsSubmitting(true);
    try {
      const phoneClean = cleanPhoneNumber(formData.phone);
      const waClean = cleanPhoneNumber(formData.whatsapp) || phoneClean;
      const deliveryStr = selectedDeliveryOptions.join(', ') || 'Atención en el Local de la empresa';
      const paymentStr = selectedPaymentOptions.join(', ') || 'Efectivo';
      const hasDel = selectedDeliveryOptions.some(o => o.toLowerCase().includes('domicilio') || o.toLowerCase().includes('envío'));
      let site = (formData.website || '').trim();
      if (site && !site.startsWith('http://') && !site.startsWith('https://')) {
        site = `https://${site}`;
      }

      const res = await submitBusinessRegistration({
        ...formData,
        delivery: deliveryStr,
        hasDelivery: hasDel,
        payment: paymentStr,
        website: site,
        phone: phoneClean,
        whatsapp: waClean,
        deliveryOption: deliveryStr,
        image: formData.image || logoPreview || '',
        gallery: galleryImages
      });

      if (res.success) {
        setDuplicateWarning(null);
        setIsSuccess(true);
        if (res.publishedToWordPress) {
          setIsWpPublished(true);
          setWpPermalink(res.wpPermalink || null);
        }
        if (res.business) {
          setRegisteredBusiness(res.business);
          if (onBusinessAdded) onBusinessAdded(res.business);
        }
      } else if (res.isDuplicate) {
        setDuplicateWarning({
          detected: true,
          existingBusiness: res.existingBusiness
        });
        setErrorMessage(res.message);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMessage(res.message || 'No fue posible registrar la empresa. Inténtalo de nuevo.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Solicitud Recibida con Éxito
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              ¡Tu negocio ya está publicado en el directorio!
            </h2>
            <p className="text-stone-600 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
              La empresa <strong className="text-stone-900 font-bold">{formData.name}</strong> ha sido
              agregada con éxito y ya aparece activa para todos los usuarios en el catálogo de{' '}
              <span className="font-semibold text-amber-600">Empresas en Carmen</span>.
            </p>
          </div>

          <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 text-left text-xs sm:text-sm space-y-3 text-stone-700 max-w-md mx-auto">
            <div className="flex items-center gap-3">
              {(logoPreview || formData.image) && (
                <div className="w-14 h-14 rounded-xl border border-stone-200 bg-white p-1 shrink-0 overflow-hidden shadow-xs">
                  <img
                    src={logoPreview || formData.image}
                    alt={formData.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-stone-900 truncate text-base">{formData.name}</p>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Activo
                  </span>
                </div>
                <p className="text-amber-600 font-medium text-xs">{formData.category}</p>
              </div>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-stone-200">
              <p>
                <strong>Contacto:</strong> {formData.phone}
              </p>
              {formData.whatsapp && (
                <p>
                  <strong>WhatsApp:</strong> {formData.whatsapp}
                </p>
              )}
              {formData.colonia && (
                <p>
                  <strong>Zona:</strong> {formData.colonia}
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onSuccessReturn}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-colors cursor-pointer"
            >
              Ver en el Directorio
            </button>
            <button
              onClick={() => {
                setIsSuccess(false);
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
                  payment: '',
                  delivery: '',
                  facebook: '',
                  website: '',
                  image: '',
                  ownerName: '',
                  ownerEmail: ''
                });
                setLogoPreview(null);
                setGalleryImages([]);
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-sm transition-colors cursor-pointer"
            >
              Registrar Otro Negocio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
          <Building2 className="w-3.5 h-3.5" />
          <span>Alta Gratuita en el Directorio Carmelita</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
          Registra tu Empresa o Comercio Local
        </h1>
        <p className="text-stone-600 text-xs sm:text-sm">
          Aparece ante miles de clientes en Ciudad del Carmen que buscan servicios, comida a domicilio,
          talleres y proveedores diariamente.
        </p>
      </div>

      {duplicateWarning && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs sm:text-sm">
              <p className="font-bold text-amber-900">
                Posible negocio duplicado detectado
              </p>
              <p className="text-amber-800">
                Encontramos una empresa con nombre o teléfono similar:{' '}
                <strong>{duplicateWarning.existingBusiness?.name}</strong>.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={e => handleSubmit(e, true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer"
            >
              Continuar y registrar de todas formas
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-5 sm:p-8 rounded-3xl border border-stone-200 shadow-sm">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="font-bold text-base text-stone-900 border-b border-stone-100 pb-2">
            1. Información del Negocio
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-stone-700">
                Nombre de la Empresa o Negocio *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Antojitos La Manigua, Brio Cleaner, Taller El Carmen"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-stone-50 focus:bg-white focus:border-amber-500 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Categoría o Giro *</label>
              <select
                required
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-stone-50 focus:bg-white focus:border-amber-500 outline-none"
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
              <label className="text-xs font-bold text-stone-700">Servicio a Domicilio</label>
              <select
                value={formData.delivery}
                onChange={e => setFormData({ ...formData, delivery: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-stone-50 focus:bg-white focus:border-amber-500 outline-none"
              >
                {DELIVERY_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-stone-700">Descripción o Especialidad</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe tus productos estrella, experiencia, servicios y lo que hace único a tu negocio..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-stone-50 focus:bg-white focus:border-amber-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Location & Contact */}
        <div className="space-y-4 pt-4 border-t border-stone-100">
          <h3 className="font-bold text-base text-stone-900 border-b border-stone-100 pb-2">
            2. Contacto y Ubicación en Carmen
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Teléfono Local *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ej. 938 123 4567"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-stone-50 focus:bg-white focus:border-amber-500 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">WhatsApp (para pedidos)</label>
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="Ej. 938 987 6543"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-stone-50 focus:bg-white focus:border-amber-500 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Código Postal (CP)</label>
              <select
                value={selectedCp}
                onChange={e => handleSelectCp(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-stone-50 focus:bg-white focus:border-amber-500 outline-none"
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
              <label className="text-xs font-bold text-stone-700">Colonia o Sector *</label>
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-stone-50 focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>

              {showColoniaDropdown && filteredColonias.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-stone-200 rounded-xl shadow-lg">
                  {filteredColonias.map(c => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => handleSelectColonia(c.name)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center justify-between cursor-pointer"
                    >
                      <span>{c.name}</span>
                      <span className="text-[10px] text-stone-400">
                        CP {getPostalCodeForColonia(c.name)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-stone-700">
                Dirección exacta (Calle, número y referencias)
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="Ej. Calle 31 #145 entre 36 y 38"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-stone-50 focus:bg-white focus:border-amber-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Schedule, Delivery & Payment */}
        <div className="space-y-4 pt-4 border-t border-stone-100">
          <h3 className="font-bold text-base text-stone-900 border-b border-stone-100 pb-2">
            3. Modalidad de Entrega, Métodos de Pago y Horarios
          </h3>

          {/* Modalidad de Atención y Entrega (Multiselección) */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-amber-600" />
                <span>Modalidad de Atención y Entrega (Selecciona 1 o más) *</span>
              </label>
              <span className="text-[11px] text-stone-500 font-medium">
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
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all text-left cursor-pointer ${
                      isChecked
                        ? 'bg-amber-500/15 border-amber-500 text-stone-900 shadow-xs'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      isChecked ? 'bg-amber-500 border-amber-600 text-stone-950 font-bold' : 'border-stone-300 bg-white'
                    }`}>
                      {isChecked && <Check className="w-3 h-3 text-stone-950" />}
                    </div>
                    <span className="leading-tight">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Métodos de Pago Aceptados (Multiselección) */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                <span>Métodos de Pago Aceptados (Selecciona 1 o más) *</span>
              </label>
              <span className="text-[11px] text-stone-500 font-medium">
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
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all text-left cursor-pointer ${
                      isChecked
                        ? 'bg-purple-500/15 border-purple-500 text-stone-900 shadow-xs'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      isChecked ? 'bg-purple-600 border-purple-700 text-white font-bold' : 'border-stone-300 bg-white'
                    }`}>
                      {isChecked && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="leading-tight">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Horario de Atención */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              <span>Horario de Atención</span>
            </label>
            <input
              type="text"
              value={formData.schedule}
              onChange={e => setFormData({ ...formData, schedule: e.target.value })}
              placeholder="Ej. Lunes a Sábado de 8:00 AM a 8:00 PM, Domingos de 9:00 AM a 2:00 PM"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-stone-50 focus:bg-white focus:border-amber-500 outline-none"
            />
          </div>
        </div>

        {/* Photos & Logo */}
        <div className="space-y-4 pt-4 border-t border-stone-100">
          <h3 className="font-bold text-base text-stone-900 border-b border-stone-100 pb-2">
            4. Logotipo e Imágenes
          </h3>

          <div className="space-y-3">
            <label className="text-xs font-bold text-stone-700">Logotipo o Foto de Fachada</label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative w-20 h-20 rounded-2xl border border-stone-200 overflow-hidden bg-white p-1">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white text-xs cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-stone-300 hover:border-amber-500 flex flex-col items-center justify-center text-stone-400 hover:text-amber-600 cursor-pointer transition-colors bg-stone-50">
                  <Upload className="w-5 h-5" />
                  <span className="text-[10px] mt-1 font-bold">Subir</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              )}
              <div className="text-xs text-stone-500 leading-relaxed">
                <p className="font-semibold text-stone-700">Formato JPG, PNG o WebP (máx. 5MB).</p>
                <p>Tu logotipo se optimizará automáticamente para verse nítido en móviles.</p>
                {isUploadingLogo && (
                  <span className="text-amber-600 font-bold flex items-center gap-1 mt-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Subiendo logo...
                  </span>
                )}
                {logoUploadedSuccess && (
                  <span className="text-emerald-600 font-bold mt-1 block">
                    ✓ Logo subido y enlazado correctamente
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Galería de Fotos de Productos o Servicios (Hasta 10 archivos) */}
          <div className="space-y-3 pt-5 border-t border-stone-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
              <div>
                <label className="text-xs sm:text-sm font-bold text-stone-800 flex items-center gap-2">
                  <Images className="w-4 h-4 text-amber-500" />
                  <span>Fotos de Productos, Servicios o Menú (Hasta 10 fotos)</span>
                </label>
                <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">
                  Sube fotos de tus platillos, trabajos realizados, productos estrella o instalaciones para tu catálogo digital.
                </p>
              </div>
              <span className="self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200 shrink-0">
                {galleryImages.length} de 10 fotos
              </span>
            </div>

            {/* Grid de Fotos y Botón de Subida */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
              {galleryImages.map((imgUrl, idx) => (
                <div key={idx} className="relative aspect-square rounded-2xl border border-stone-200 overflow-hidden bg-stone-100 shadow-xs group">
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
                  <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold">
                    #{idx + 1}
                  </span>
                </div>
              ))}

              {/* Botón para Subir Más Fotos */}
              {galleryImages.length < 10 && (
                <label className="relative aspect-square rounded-2xl border-2 border-dashed border-stone-300 hover:border-amber-500 hover:bg-amber-50/50 flex flex-col items-center justify-center text-stone-400 hover:text-amber-600 cursor-pointer transition-all bg-stone-50/60 p-3 text-center">
                  <Upload className="w-6 h-6 mb-1 text-amber-500" />
                  <span className="text-xs font-bold text-stone-700">+ Subir Fotos</span>
                  <span className="text-[10px] text-stone-400 leading-tight mt-0.5">
                    Selecciona hasta {10 - galleryImages.length} foto(s)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleGalleryUpload}
                    disabled={isUploadingGallery}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {isUploadingGallery && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs font-semibold text-amber-800 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                <span>Subiendo y optimizando fotos de productos... Por favor espera un momento.</span>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-6 border-t border-stone-200 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Registrando Empresa...</span>
              </>
            ) : (
              <span>Registrar Negocio en Carmen</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
