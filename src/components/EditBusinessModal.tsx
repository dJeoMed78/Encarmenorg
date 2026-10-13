import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  Truck,
  CreditCard,
  Globe,
  Facebook,
  Instagram,
  Check,
  Upload,
  AlertCircle
} from 'lucide-react';
import { Business, Category } from '../types';
import { uploadBusinessLogo } from '../services/api';
import { cleanPhoneNumber } from '../utils/phone';
import { DELIVERY_OPTIONS, normalizeDeliveryOption } from '../constants/delivery';
import {
  ALL_POSTAL_CODES,
  getPostalCodeForColonia,
  getColoniasForPostalCode,
  CARMEN_POSTAL_CODES_MAP
} from '../data/carmen_postal_codes';

import {
  STANDARDIZED_DELIVERY_OPTIONS,
  STANDARDIZED_PAYMENT_OPTIONS
} from '../constants/businessOptions';

export { STANDARDIZED_DELIVERY_OPTIONS, STANDARDIZED_PAYMENT_OPTIONS };

interface EditBusinessModalProps {
  business: Business | null;
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  coloniasList: { name: string; count: number }[];
  onSave: (id: number, updatedData: Partial<Business>) => Promise<{ success: boolean; message: string }>;
}

export const EditBusinessModal: React.FC<EditBusinessModalProps> = ({
  business,
  isOpen,
  onClose,
  categories,
  coloniasList,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<Business>>({});
  const [postalCode, setPostalCode] = useState<string>('');
  const [selectedDeliveryOptions, setSelectedDeliveryOptions] = useState<string[]>([]);
  const [selectedPaymentOptions, setSelectedPaymentOptions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    if (business) {
      const initialCol = business.colonia || 'Ciudad del Carmen Centro';
      const initialCp = business.postalCode || getPostalCodeForColonia(initialCol);
      setPostalCode(initialCp);

      // Parse existing delivery into multi-select
      const rawDel = (business.delivery || '').toLowerCase();
      const initialDel = STANDARDIZED_DELIVERY_OPTIONS.filter(opt => {
        const oLow = opt.toLowerCase();
        if (oLow.includes('local') && rawDel.includes('local')) return true;
        if (oLow.includes('gratis') && rawDel.includes('gratis')) return true;
        if (oLow.includes('costo') && (rawDel.includes('costo') || rawDel.includes('domicilio'))) return true;
        if (oLow.includes('cliente') && (rawDel.includes('cliente') || rawDel.includes('lugar'))) return true;
        if (oLow.includes('envío') && rawDel.includes('envío')) return true;
        return false;
      });
      const parsedDel = initialDel.length > 0 ? initialDel : ['Atención en el Local de la empresa', 'Servicio a domicilio con costo'];
      setSelectedDeliveryOptions(parsedDel);

      // Parse existing payments into multi-select
      const rawPay = (business.payment || '').toLowerCase();
      const initialPay = STANDARDIZED_PAYMENT_OPTIONS.filter(opt => {
        const oLow = opt.toLowerCase();
        if (oLow.includes('efectivo') && rawPay.includes('efectivo')) return true;
        if (oLow.includes('tarjeta') && rawPay.includes('tarjeta')) return true;
        if (oLow.includes('transferencia') && (rawPay.includes('transferencia') || rawPay.includes('spei'))) return true;
        if (oLow.includes('codi') && rawPay.includes('codi')) return true;
        if (oLow.includes('contra entrega') && rawPay.includes('contra entrega')) return true;
        return false;
      });
      const parsedPay = initialPay.length > 0 ? initialPay : ['Efectivo', 'Transferencia Bancaria (SPEI)'];
      setSelectedPaymentOptions(parsedPay);

      setFormData({
        name: business.name || '',
        category: business.categories?.[0] || 'Servicios',
        categories: business.categories || [],
        description: business.description || '',
        phone: cleanPhoneNumber(business.phone) || '',
        whatsapp: cleanPhoneNumber(business.whatsapp) || cleanPhoneNumber(business.phone) || '',
        address: business.address || '',
        colonia: initialCol,
        postalCode: initialCp,
        schedule: business.schedule || 'Lunes a Sábado',
        payment: parsedPay.join(', '),
        delivery: parsedDel.join(', '),
        hasDelivery: parsedDel.some(d => d.toLowerCase().includes('domicilio') || d.toLowerCase().includes('envío')),
        facebook: business.facebook || '',
        instagram: business.instagram || '',
        website: business.website || '',
        image: business.image || '',
        gallery: business.gallery || [],
        slug: business.slug || '',
        previousSlugs: business.previousSlugs || [],
        previousNames: business.previousNames || [],
        isRecommended: Boolean(business.isRecommended),
        isTopBusiness: Boolean(business.isTopBusiness)
      });
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [business, isOpen]);

  if (!isOpen || !business) return null;

  const [isUploadingGallery, setIsUploadingGallery] = useState(false);

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentGallery = (formData.gallery || []) as string[];
    const available = 10 - currentGallery.length;
    if (available <= 0) {
      setErrorMsg('Límite de 10 fotos alcanzado.');
      return;
    }

    setIsUploadingGallery(true);
    setErrorMsg(null);

    try {
      const newUrls: string[] = [];
      for (const file of files.slice(0, available)) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        try {
          const res = await uploadBusinessLogo(base64, file.name);
          if (res.success && res.url) {
            newUrls.push(res.url);
          } else {
            newUrls.push(base64);
          }
        } catch {
          newUrls.push(base64);
        }
      }

      setFormData(prev => ({
        ...prev,
        gallery: [...(prev.gallery || []), ...newUrls].slice(0, 10)
      }));
    } catch (err) {
      console.error('Error uploading gallery:', err);
    } finally {
      setIsUploadingGallery(false);
      e.target.value = '';
    }
  };

  const handleRemoveGalleryPhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      gallery: (prev.gallery || []).filter((_, i) => i !== index)
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('La imagen no debe superar los 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setIsUploadingPhoto(true);
      try {
        const uploadRes = await uploadBusinessLogo(base64Data, file.name);
        if (uploadRes.success && uploadRes.url) {
          setFormData(prev => ({ ...prev, image: uploadRes.url! }));
        } else {
          setFormData(prev => ({ ...prev, image: base64Data }));
        }
      } catch {
        setFormData(prev => ({ ...prev, image: base64Data }));
      } finally {
        setIsUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setErrorMsg('El nombre de la empresa es obligatorio.');
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const cleanPhone = cleanPhoneNumber(formData.phone);
      const cleanWa = cleanPhoneNumber(formData.whatsapp) || cleanPhone;
      const cleanDelivery = normalizeDeliveryOption(formData.delivery);
      const res = await onSave(business.id, {
        ...formData,
        phone: cleanPhone,
        whatsapp: cleanWa,
        delivery: cleanDelivery
      });
      if (res.success) {
        setSuccessMsg('¡Negocio actualizado correctamente!');
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.message || 'Error al guardar los cambios.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col my-auto max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/80 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-stone-900 leading-tight">
                Editar Datos de la Empresa
              </h3>
              <p className="text-xs text-stone-500">
                ID: {business.id} • {business.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-200/60 text-stone-400 hover:text-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Badges Toggles */}
          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-800 select-none">
              <input
                type="checkbox"
                checked={Boolean(formData.isTopBusiness)}
                onChange={e => setFormData(prev => ({ ...prev, isTopBusiness: e.target.checked }))}
                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
              />
              <span>★ Empresa TOP (Primeros lugares en búsquedas relacionadas)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-800 select-none">
              <input
                type="checkbox"
                checked={Boolean(formData.isRecommended)}
                onChange={e => setFormData(prev => ({ ...prev, isRecommended: e.target.checked }))}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <span>✓ Empresa Recomendada (Distintivo verde)</span>
            </label>
          </div>

          {/* Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Nombre de la Empresa *</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm font-bold text-stone-900 focus:border-amber-500 outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Giro / Categoría *</label>
              <input
                type="text"
                list="category-suggestions"
                value={formData.category || (formData.categories?.[0] || '')}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  category: e.target.value,
                  categories: [e.target.value]
                }))}
                placeholder="Escribe o selecciona categoría..."
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm font-semibold text-stone-800 focus:border-amber-500 outline-none"
              />
              <datalist id="category-suggestions">
                {categories.map(c => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Enlace Personalizado (Slug URL) */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-600" />
                <span>Enlace Web Personalizado (Slug URL)</span>
              </label>
              <span className="text-[10px] text-amber-700 font-semibold">
                Ej: hairpalace, unitamp, lavanderia
              </span>
            </div>
            <div className="flex items-center gap-1 bg-white rounded-xl border border-amber-300 px-3 py-1.5 focus-within:border-amber-500 shadow-xs">
              <span className="text-xs text-stone-400 font-mono select-none">
                encarmen.org/
              </span>
              <input
                type="text"
                value={formData.slug || ''}
                onChange={e => {
                  const clean = e.target.value
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9-_]/g, '');
                  setFormData(prev => ({ ...prev, slug: clean }));
                }}
                placeholder="slug-personalizado"
                className="w-full text-xs sm:text-sm font-bold text-amber-950 outline-none font-mono"
              />
            </div>
            <p className="text-[11px] text-stone-600">
              Liga final de acceso: <span className="font-mono font-bold text-amber-900">https://encarmen.org/{formData.slug || 'enlace'}</span>
            </p>
            {business.previousSlugs && business.previousSlugs.length > 0 && (
              <p className="text-[10px] text-amber-700/80">
                Enlaces anteriores activos: {business.previousSlugs.map(s => `encarmen.org/${s}`).join(', ')} (redirigen automáticamente a este perfil)
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Descripción Comercial</label>
            <textarea
              rows={3}
              value={formData.description || ''}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-800 focus:border-amber-500 outline-none leading-relaxed"
            />
          </div>

          {/* Phone & WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Teléfono (10 dígitos)</label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={e => {
                  const val = e.target.value;
                  if (val.includes('http') || val.includes('tel:')) {
                    setFormData(prev => ({ ...prev, phone: cleanPhoneNumber(val) }));
                  } else {
                    setFormData(prev => ({ ...prev, phone: val.replace(/[^\d\s\+\-]/g, '') }));
                  }
                }}
                onBlur={() => {
                  if (formData.phone) {
                    setFormData(prev => ({ ...prev, phone: cleanPhoneNumber(formData.phone) }));
                  }
                }}
                placeholder="Ej. 9381458462"
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-800 focus:border-amber-500 outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">WhatsApp (Solo 10 dígitos)</label>
              <input
                type="text"
                value={formData.whatsapp || ''}
                onChange={e => {
                  const val = e.target.value;
                  if (val.includes('http') || val.includes('whatsapp') || val.includes('wa.me')) {
                    setFormData(prev => ({ ...prev, whatsapp: cleanPhoneNumber(val) }));
                  } else {
                    setFormData(prev => ({ ...prev, whatsapp: val.replace(/[^\d\s\+\-]/g, '') }));
                  }
                }}
                onBlur={() => {
                  if (formData.whatsapp) {
                    setFormData(prev => ({ ...prev, whatsapp: cleanPhoneNumber(formData.whatsapp) }));
                  }
                }}
                placeholder="Ej. 9381458462"
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-800 focus:border-amber-500 outline-none font-mono font-bold"
              />
            </div>
          </div>

          {/* Address, Postal Code & Colonia */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Dirección Física Exacta</label>
            <input
              type="text"
              value={formData.address || ''}
              onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Calle, número, cruzamientos..."
              className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-800 focus:border-amber-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700">Código Postal (C.P.)</label>
                <span className="text-[10px] text-stone-400">filtra colonias</span>
              </div>
              <select
                value={postalCode || formData.postalCode || ''}
                onChange={e => {
                  const newCp = e.target.value;
                  setPostalCode(newCp);
                  const cols = getColoniasForPostalCode(newCp);
                  setFormData(prev => ({
                    ...prev,
                    postalCode: newCp,
                    colonia: cols.length > 0 && (!prev.colonia || !cols.includes(prev.colonia)) ? cols[0] : prev.colonia
                  }));
                }}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm font-bold text-stone-800 focus:border-amber-500 outline-none bg-white"
              >
                <option value="">Selecciona C.P. de Carmen...</option>
                {ALL_POSTAL_CODES.map(cp => (
                  <option key={cp} value={cp}>
                    C.P. {cp} ({CARMEN_POSTAL_CODES_MAP[cp]?.length || 0} colonias)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700">Colonia o Fraccionamiento</label>
                <span className="text-[10px] text-amber-700 font-semibold">llena C.P. automático</span>
              </div>
              <select
                value={formData.colonia || ''}
                onChange={e => {
                  const colName = e.target.value;
                  const autoCp = getPostalCodeForColonia(colName);
                  setPostalCode(autoCp);
                  setFormData(prev => ({
                    ...prev,
                    colonia: colName,
                    postalCode: autoCp
                  }));
                }}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-800 focus:border-amber-500 outline-none bg-white font-medium"
              >
                <option value="">Selecciona Colonia...</option>
                {(postalCode && getColoniasForPostalCode(postalCode).length > 0
                  ? getColoniasForPostalCode(postalCode)
                  : (coloniasList.map(c => c.name))
                ).map((cName, i) => (
                  <option key={i} value={cName}>
                    {cName}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
                        delivery: next.join(', ') || 'No especificado',
                        hasDelivery: next.some(o => o.toLowerCase().includes('domicilio') || o.toLowerCase().includes('envío'))
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

          {/* Horario Comercial */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              <span>Horario de Atención</span>
            </label>
            <input
              type="text"
              value={formData.schedule || ''}
              onChange={e => setFormData(prev => ({ ...prev, schedule: e.target.value }))}
              placeholder="Ej. Lunes a Sábado 8:00 AM - 8:00 PM, Domingos 9:00 AM - 3:00 PM"
              className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-800 focus:border-amber-500 outline-none bg-white"
            />
          </div>

          {/* Redes Sociales y Sitio Web */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <span className="text-blue-600 font-extrabold text-sm leading-none">f</span>
                <span>Página de Facebook</span>
              </label>
              <input
                type="text"
                value={formData.facebook || ''}
                onChange={e => setFormData(prev => ({ ...prev, facebook: e.target.value }))}
                placeholder="https://facebook.com/tunegocio"
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-800 focus:border-amber-500 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5 text-pink-600" />
                <span>Perfil de Instagram</span>
              </label>
              <input
                type="text"
                value={formData.instagram || ''}
                onChange={e => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                placeholder="https://instagram.com/tunegocio o @usuario"
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-800 focus:border-amber-500 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-stone-500" />
                <span>Sitio Web / Catálogo</span>
              </label>
              <input
                type="text"
                value={formData.website || ''}
                onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://minegocio.com"
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-800 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Image Upload / URL */}
          <div className="space-y-1 pt-1">
            <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
              <span>Fotografía / Logotipo</span>
              {isUploadingPhoto && <span className="text-[10px] text-amber-600 animate-pulse">Subiendo...</span>}
            </label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-14 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center">
                {formData.image ? (
                  <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-6 h-6 text-stone-300" />
                )}
              </div>
              <div className="grow space-y-1.5">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-stone-600" />
                  <span>{formData.image ? 'Cambiar foto desde tu dispositivo' : 'Subir foto desde tu dispositivo'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
                {formData.image && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                    className="ml-2 text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
                  >
                    Quitar foto
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Works & Services Gallery (Max 10 Photos) */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700">
                Fotos de Trabajos o Servicios (Hasta 10 fotos)
              </label>
              <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                {(formData.gallery || []).length} de 10
              </span>
            </div>

            {/* Upload button */}
            {((formData.gallery || []).length < 10) && (
              <div>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100/80 text-amber-950 text-xs font-bold cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isUploadingGallery ? 'Subiendo fotos...' : '+ Agregar fotos de trabajos (múltiples)'}</span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleGalleryUpload} disabled={isUploadingGallery} />
                </label>
              </div>
            )}

            {/* Gallery Thumbnails: Renders ONLY existing photos, NO empty placeholders */}
            {(formData.gallery && formData.gallery.length > 0) && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pt-1">
                {formData.gallery.map((photo, idx) => (
                  <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shadow-xs">
                    <img src={photo} alt={`Trabajo ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryPhoto(idx)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-rose-600/90 text-white shadow-md hover:bg-rose-700 transition-colors"
                      title="Eliminar esta foto"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 px-1 rounded bg-black/60 text-white text-[8px] font-bold">
                      {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Toolbar */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-extrabold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
