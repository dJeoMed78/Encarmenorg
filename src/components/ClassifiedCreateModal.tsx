import React, { useState, useEffect } from 'react';
import {
  X,
  Tag,
  DollarSign,
  MapPin,
  Camera,
  Video,
  User,
  Phone,
  MessageSquare,
  Mail,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Upload,
  Info,
  Loader2
} from 'lucide-react';
import { ClassifiedAd } from '../types';
import { CLASSIFIED_CATEGORIES } from '../data/classifiedCategories';
import { cleanPhoneNumber } from '../utils/phone';

interface ClassifiedCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitAd: (adData: Partial<ClassifiedAd>) => Promise<{ success: boolean; message: string }>;
  coloniasList: { name: string; count: number }[];
  editingAd?: ClassifiedAd | null;
}

export const ClassifiedCreateModal: React.FC<ClassifiedCreateModalProps> = ({
  isOpen,
  onClose,
  onSubmitAd,
  coloniasList,
  editingAd
}) => {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('compra-venta');
  const [subcategory, setSubcategory] = useState('articulos-electronica');
  const [price, setPrice] = useState<string>('');
  const [priceType, setPriceType] = useState<'fixed' | 'negotiable' | 'consult'>('fixed');
  const [currency] = useState('MXN');

  // Location & logistics
  const [location, setLocation] = useState('Ciudad del Carmen, Campeche');
  const [colonia, setColonia] = useState('Centro');
  const [noLocation, setNoLocation] = useState(false);
  const [deliveryCondition, setDeliveryCondition] = useState<'direct' | 'delivery' | 'shipping'>('direct');

  // Multimedia
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');

  // Contact
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState(true);
  const [contactPhone, setContactPhone] = useState(true);
  const [contactEmail, setContactEmail] = useState(false);

  // Status & validation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  // Sync when editingAd changes
  useEffect(() => {
    if (editingAd) {
      setTitle(editingAd.title || '');
      setDescription(editingAd.description || '');
      setCategory(editingAd.category || 'compra-venta');
      setSubcategory(editingAd.subcategory || '');
      setPrice(editingAd.price !== undefined && editingAd.price !== null ? String(editingAd.price) : '');
      setPriceType((editingAd.priceType as any) || 'fixed');
      setLocation(editingAd.location || 'Ciudad del Carmen, Campeche');
      setColonia(editingAd.colonia || 'Centro');
      setNoLocation(Boolean(editingAd.noLocation));
      setDeliveryCondition((editingAd.deliveryCondition as any) || 'direct');
      setImages(editingAd.images && editingAd.images.length > 0 ? editingAd.images : (editingAd.image ? [editingAd.image] : []));
      setVideoUrl(editingAd.videoUrl || '');
      setContactName(editingAd.contactName || '');
      setPhone(cleanPhoneNumber(editingAd.phone) || '');
      setWhatsapp(cleanPhoneNumber(editingAd.whatsapp) || cleanPhoneNumber(editingAd.phone) || '');
      setEmail(editingAd.email || '');
      setContactWhatsapp(editingAd.contactMethods?.includes('whatsapp') ?? true);
      setContactPhone(editingAd.contactMethods?.includes('phone') ?? true);
      setContactEmail(editingAd.contactMethods?.includes('email') ?? false);
    } else {
      resetForm();
    }
  }, [editingAd, isOpen]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('compra-venta');
    setSubcategory('articulos-electronica');
    setPrice('');
    setPriceType('fixed');
    setLocation('Ciudad del Carmen, Campeche');
    setColonia('Centro');
    setNoLocation(false);
    setDeliveryCondition('direct');
    setImages([]);
    setVideoUrl('');
    setContactName('');
    setPhone('');
    setWhatsapp('');
    setEmail('');
    setContactWhatsapp(true);
    setContactPhone(true);
    setContactEmail(false);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  if (!isOpen) return null;

  const currentCategoryDef = CLASSIFIED_CATEGORIES.find(c => c.id === category);
  const currentSubcategoryDef = currentCategoryDef?.subcategories.find(s => s.id === subcategory);
  const isJobCategory = currentSubcategoryDef?.isJobCategory;

  const handleCategoryChange = (newCatId: string) => {
    setCategory(newCatId);
    const cat = CLASSIFIED_CATEGORIES.find(c => c.id === newCatId);
    if (cat && cat.subcategories.length > 0) {
      setSubcategory(cat.subcategories[0].id);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMsg(null);
    const maxFiles = 6;
    if (images.length + files.length > maxFiles) {
      setErrorMsg(`Puedes subir hasta un máximo de ${maxFiles} fotografías.`);
      return;
    }

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Solo se permiten archivos de imagen (JPG, PNG, WebP).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Cada fotografía debe pesar menos de 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImages(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Por favor escribe un título descriptivo para tu anuncio.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Por favor incluye una descripción detallada.');
      return;
    }
    if (!contactName.trim()) {
      setErrorMsg('Indica el nombre de la persona o negocio de contacto.');
      return;
    }
    if (!phone.trim() && !whatsapp.trim() && !email.trim()) {
      setErrorMsg('Debes proporcionar al menos un medio de contacto (WhatsApp, teléfono o correo).');
      return;
    }

    const contactMethods: ('whatsapp' | 'phone' | 'email')[] = [];
    if (contactWhatsapp && (whatsapp || phone)) contactMethods.push('whatsapp');
    if (contactPhone && phone) contactMethods.push('phone');
    if (contactEmail && email) contactMethods.push('email');

    // Retrieve or generate persistent userToken
    let userToken = localStorage.getItem('classified_user_token');
    if (!userToken) {
      userToken = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('classified_user_token', userToken);
    }

    const payload: Partial<ClassifiedAd> = {
      title: title.trim(),
      description: description.trim(),
      category,
      subcategory,
      price: isJobCategory || priceType === 'consult' || !price ? null : Number(price),
      priceType: isJobCategory ? 'consult' : priceType,
      currency: 'MXN',
      location: noLocation ? '' : location,
      colonia: noLocation ? '' : colonia,
      noLocation,
      deliveryCondition,
      images,
      image: images.length > 0 ? images[0] : '',
      videoUrl: videoUrl.trim(),
      contactName: contactName.trim(),
      phone: cleanPhoneNumber(phone),
      whatsapp: cleanPhoneNumber(whatsapp) || cleanPhoneNumber(phone),
      email: email.trim(),
      contactMethods,
      userToken,
      status: 'active'
    };

    setIsSubmitting(true);
    try {
      const res = await onSubmitAd(payload);
      if (res && res.success) {
        setSuccessMsg(res.message || '¡Anuncio guardado exitosamente en el servidor!');
        // Save token to owner tokens list
        try {
          const myTokens: string[] = JSON.parse(localStorage.getItem('my_classified_tokens') || '[]');
          if (!myTokens.includes(userToken)) {
            myTokens.push(userToken);
            localStorage.setItem('my_classified_tokens', JSON.stringify(myTokens));
          }
        } catch {}

        setTimeout(() => {
          onClose();
          resetForm();
        }, 1200);
      } else {
        setErrorMsg(res?.message || 'Error al guardar el anuncio en el servidor. Inténtalo nuevamente.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error de conexión con el servidor. No se pudo guardar.');
    } finally {
      setIsSubmitting(false);
    }
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
        className="relative w-full max-w-3xl rounded-3xl overflow-hidden my-auto max-h-[92vh] flex flex-col shadow-2xl border"
        style={{
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(40px) saturate(190%)',
          WebkitBackdropFilter: 'blur(40px) saturate(190%)',
          borderColor: 'rgba(255, 255, 255, 0.95)',
          boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.95)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-20 border-b"
          style={{
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderColor: 'rgba(226, 232, 240, 0.8)'
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-xs shrink-0">
              <Tag className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-stone-900 leading-tight">
                {editingAd ? 'Editar Anuncio Clasificado' : 'Publicar Nuevo Anuncio Clasificado'}
              </h2>
              <p className="text-xs text-stone-500 font-semibold">
                Ciudad del Carmen · Publicación directa en servidor
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] p-2 rounded-xl hover:bg-stone-200/70 text-stone-500 hover:text-stone-900 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm text-left">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center gap-2.5 shadow-2xs">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <p className="font-semibold text-xs leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2.5 shadow-2xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="font-semibold text-xs leading-relaxed">{successMsg}</p>
            </div>
          )}

          {/* SECTION 1: Datos Principales */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-stone-900 font-extrabold pb-2 border-b border-stone-200">
              <span className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center text-xs">1</span>
              <span className="text-sm uppercase tracking-wider">Datos Principales</span>
            </div>

            {/* Categoría y Subcategoría */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-stone-700 text-xs mb-1">
                  Categoría General *
                </label>
                <select
                  value={category}
                  onChange={e => handleCategoryChange(e.target.value)}
                  className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-stone-800 font-medium outline-none focus:border-amber-500"
                >
                  {CLASSIFIED_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 text-xs mb-1">
                  Subcategoría *
                </label>
                <select
                  value={subcategory}
                  onChange={e => setSubcategory(e.target.value)}
                  className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-stone-800 font-medium outline-none focus:border-amber-500"
                >
                  {currentCategoryDef?.subcategories.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {currentSubcategoryDef?.description && (
                  <p className="text-[11px] text-stone-500 mt-1 italic">
                    {currentSubcategoryDef.description}
                  </p>
                )}
              </div>
            </div>

            {/* Título */}
            <div>
              <label className="block font-bold text-stone-700 text-xs mb-1">
                Título del anuncio o vacante *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ej. Técnico en mantenimiento industrial o Chevrolet Aveo 2018"
                className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 font-medium outline-none focus:border-amber-500 shadow-2xs"
                required
              />
              <p className="text-[11px] text-stone-400 mt-1">
                Breve y descriptivo. Aparecerá en el encabezado de las tarjetas y búsquedas.
              </p>
            </div>

            {/* Descripción */}
            <div>
              <label className="block font-bold text-stone-700 text-xs mb-1">
                Descripción detallada *
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                placeholder="Explica las características completas, especificaciones, requisitos, ubicación o condiciones. Puedes incluir enlaces web que se convertirán en botones interactivos..."
                className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 font-medium outline-none focus:border-amber-500 resize-y shadow-2xs"
                required
              />
            </div>
          </div>

          {/* SECTION 2: Información Comercial */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-stone-900 font-extrabold pb-2 border-b border-stone-200">
              <span className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center text-xs">2</span>
              <span className="text-sm uppercase tracking-wider">Información Comercial</span>
            </div>

            {isJobCategory ? (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Para categorías de empleo o bolsa de trabajo no aplica precio fijo; se clasifica automáticamente con salario a convenir.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                {/* Tipo de precio */}
                <div className="sm:col-span-6">
                  <label className="block font-bold text-stone-700 text-xs mb-1">
                    Tipo de precio *
                  </label>
                  <select
                    value={priceType}
                    onChange={e => setPriceType(e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-stone-800 font-medium outline-none focus:border-amber-500"
                  >
                    <option value="fixed">Precio Fijo</option>
                    <option value="negotiable">A tratar / Negociable</option>
                    <option value="consult">A consultar</option>
                  </select>
                </div>

                {/* Precio */}
                <div className="sm:col-span-6">
                  <label className="block font-bold text-stone-700 text-xs mb-1">
                    Precio ({currency})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-stone-400">$</span>
                    <input
                      type="number"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      placeholder={priceType === 'consult' ? 'A consultar' : '0.00'}
                      disabled={priceType === 'consult'}
                      className="w-full pl-8 pr-12 p-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 font-bold outline-none focus:border-amber-500 disabled:opacity-50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-stone-400 text-xs">
                      MXN
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Ubicación y Logística */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-stone-900 font-extrabold pb-2 border-b border-stone-200">
              <span className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center text-xs">3</span>
              <span className="text-sm uppercase tracking-wider">Ubicación y Logística en Carmen</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="noLocationCheck"
                checked={noLocation}
                onChange={e => setNoLocation(e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded border-stone-300 focus:ring-amber-400 cursor-pointer"
              />
              <label htmlFor="noLocationCheck" className="text-xs font-semibold text-stone-700 cursor-pointer">
                Prefiero mantener mi ubicación geográfica reservada (no mostrar colonia ni dirección)
              </label>
            </div>

            {!noLocation && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 text-xs mb-1">
                    Colonia en Ciudad del Carmen
                  </label>
                  <select
                    value={colonia}
                    onChange={e => setColonia(e.target.value)}
                    className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-stone-800 font-medium outline-none focus:border-amber-500"
                  >
                    {coloniasList && coloniasList.length > 0 ? (
                      coloniasList.map(c => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Centro">Centro Histórico</option>
                        <option value="Playa Norte">Playa Norte</option>
                        <option value="Justo Sierra">Justo Sierra</option>
                        <option value="Santa Rita">Santa Rita</option>
                        <option value="Renovación">Renovación I y II</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 text-xs mb-1">
                    Ciudad / Referencia adicional
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Ciudad del Carmen, Campeche"
                    className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-stone-800 font-medium outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-bold text-stone-700 text-xs mb-1">
                Condición de entrega *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'direct', label: 'Trato directo en persona' },
                  { id: 'delivery', label: 'Entrega a domicilio' },
                  { id: 'shipping', label: 'Envíos disponibles' }
                ].map(cond => (
                  <button
                    key={cond.id}
                    type="button"
                    onClick={() => setDeliveryCondition(cond.id as any)}
                    className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                      deliveryCondition === cond.id
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs'
                        : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-600'
                    }`}
                  >
                    {cond.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 4: Multimedia */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-stone-900 font-extrabold pb-2 border-b border-stone-200">
              <span className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center text-xs">4</span>
              <span className="text-sm uppercase tracking-wider">Fotografías y Video</span>
            </div>

            {/* Subir fotos */}
            <div>
              <label className="block font-bold text-stone-700 text-xs mb-1">
                Fotografías (máximo 6 fotos de hasta 5MB cada una)
              </label>

              {/* Upload controls */}
              <div className="mb-3">
                <label className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl cursor-pointer text-stone-700 font-bold text-xs transition-colors w-full">
                  <Upload className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Subir fotos desde tu dispositivo</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Image Previews */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 p-3 bg-stone-50 rounded-2xl border border-stone-200">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500 text-stone-950 font-black text-[9px] uppercase shadow-xs">
                          Portada
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 p-1 rounded-md bg-stone-950/80 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                        title="Eliminar foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Video opcional */}
            <div>
              <label className="block font-bold text-stone-700 text-xs mb-1">
                Video explicativo (Opcional - YouTube o Vimeo)
              </label>
              <div className="relative">
                <Video className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full pl-9 pr-3 p-2.5 bg-white border border-stone-300 rounded-xl text-stone-800 font-medium outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: Contacto */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-stone-900 font-extrabold pb-2 border-b border-stone-200">
              <span className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center text-xs">5</span>
              <span className="text-sm uppercase tracking-wider">Datos de Contacto Directo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-stone-700 text-xs mb-1">
                  Nombre del anunciante o empresa *
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="Ej. Juan Pérez / Taller El Carmen"
                  className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 font-medium outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 text-xs mb-1">
                  WhatsApp (10 dígitos)
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.includes('http') || val.includes('whatsapp') || val.includes('wa.me')) {
                      setWhatsapp(cleanPhoneNumber(val));
                    } else {
                      setWhatsapp(val.replace(/[^\d\s\+\-]/g, ''));
                    }
                  }}
                  onBlur={() => {
                    if (whatsapp) setWhatsapp(cleanPhoneNumber(whatsapp));
                  }}
                  placeholder="9381234567"
                  className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 font-mono font-bold outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 text-xs mb-1">
                  Teléfono de llamadas (10 dígitos)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.includes('tel:') || val.includes('http')) {
                      setPhone(cleanPhoneNumber(val));
                    } else {
                      setPhone(val.replace(/[^\d\s\+\-]/g, ''));
                    }
                  }}
                  onBlur={() => {
                    if (phone) setPhone(cleanPhoneNumber(phone));
                  }}
                  placeholder="9381234567"
                  className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 font-mono font-bold outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 text-xs mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 font-medium outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Medios de contacto permitidos */}
            <div>
              <span className="block font-bold text-stone-700 text-xs mb-1.5">
                Canales de contacto habilitados:
              </span>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contactWhatsapp}
                    onChange={e => setContactWhatsapp(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>WhatsApp</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contactPhone}
                    onChange={e => setContactPhone(e.target.checked)}
                    className="w-4 h-4 text-stone-800 rounded"
                  />
                  <span>Llamada directa</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contactEmail}
                    onChange={e => setContactEmail(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Correo electrónico</span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer Submit Button */}
          <div className="pt-4 border-t border-stone-200/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px] px-4 py-2.5 rounded-2xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-md shadow-amber-500/25 flex items-center gap-2 disabled:opacity-50 cursor-pointer transition-all active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                  <span>Guardando en el servidor...</span>
                </>
              ) : (
                <span>{editingAd ? 'Guardar Cambios' : 'Publicar Anuncio Ahora'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
