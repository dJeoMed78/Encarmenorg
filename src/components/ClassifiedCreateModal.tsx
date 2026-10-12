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
  Info
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
  const [colonia, setColonia] = useState('Ciudad del Carmen Centro');
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
      setColonia(editingAd.colonia || 'Ciudad del Carmen Centro');
      setNoLocation(Boolean(editingAd.noLocation));
      setDeliveryCondition((editingAd.deliveryCondition as any) || 'direct');
      setImages(editingAd.images || []);
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
    setColonia('Ciudad del Carmen Centro');
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

    Array.from(files).forEach(file => {
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
      videoUrl: videoUrl.trim(),
      contactName: contactName.trim(),
      phone: cleanPhoneNumber(phone),
      whatsapp: cleanPhoneNumber(whatsapp) || cleanPhoneNumber(phone),
      email: email.trim(),
      contactMethods,
      userToken
    };

    setIsSubmitting(true);
    try {
      const res = await onSubmitAd(payload);
      if (res.success) {
        setSuccessMsg(res.message || '¡Anuncio guardado con éxito!');
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
        }, 1500);
      } else {
        setErrorMsg(res.message || 'Error al guardar el anuncio.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
              <Tag className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                {editingAd ? 'Editar Anuncio Clasificado' : 'Publicar Nuevo Anuncio Clasificado'}
              </h2>
              <p className="text-xs text-stone-400">
                Ciudad del Carmen · Gratis e interactivo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-rose-600 text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <p className="font-semibold text-xs">{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="font-semibold text-xs">{successMsg}</p>
            </div>
          )}

          {/* SECTION 1: Datos Principales */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-stone-900 font-extrabold pb-2 border-b border-stone-200">
              <span className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center text-xs">1</span>
              <span className="text-sm uppercase tracking-wider">Datos Principales (Encabezado y Detalle)</span>
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
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-medium outline-none focus:border-amber-500 focus:bg-white"
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
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-medium outline-none focus:border-amber-500 focus:bg-white"
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
                Título del anuncio *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ej. Suzuki Ertiga 2020 en excelente estado"
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-medium outline-none focus:border-amber-500 focus:bg-white"
                required
              />
              <p className="text-[11px] text-stone-400 mt-0.5">
                Breve, llamativo y descriptivo. Es lo primero que ve el comprador.
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
                placeholder="Explica las características a fondo, el estado actual, especificaciones, motivo de venta o detalles de interés..."
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-medium outline-none focus:border-amber-500 focus:bg-white resize-y"
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
                  Para categorías de empleo o bolsa de trabajo no aplica precio fijo obligatorio; se cataloga como vacante / salario a convenir.
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
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-medium outline-none focus:border-amber-500"
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
                      className="w-full pl-8 pr-12 p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-bold outline-none focus:border-amber-500 disabled:opacity-50"
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
              <span className="text-sm uppercase tracking-wider">Ubicación y Logística</span>
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
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-medium outline-none focus:border-amber-500"
                  >
                    {coloniasList.map(c => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 text-xs mb-1">
                    Ciudad / Referencia
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Ciudad del Carmen, Campeche"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-medium outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-bold text-stone-700 text-xs mb-1">
                Condición de entrega *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'direct', label: 'Trato directo (en persona)' },
                  { id: 'delivery', label: 'Entrega a domicilio' },
                  { id: 'shipping', label: 'Envíos disponibles' }
                ].map(cond => (
                  <button
                    key={cond.id}
                    type="button"
                    onClick={() => setDeliveryCondition(cond.id as any)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                      deliveryCondition === cond.id
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs'
                        : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-600'
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
              <span className="text-sm uppercase tracking-wider">Multimedia (Galería y Video)</span>
            </div>

            {/* Subir fotos */}
            <div>
              <label className="block font-bold text-stone-700 text-xs mb-1">
                Fotografías reales del producto o servicio
              </label>

              {/* Upload controls */}
              <div className="mb-3">
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl cursor-pointer text-stone-700 font-bold text-xs transition-colors w-full sm:w-auto">
                  <Upload className="w-4 h-4 text-amber-600" />
                  <span>Subir fotos desde tu celular o computadora</span>
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
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 p-3 bg-stone-50 rounded-2xl border border-stone-200">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500 text-stone-950 font-black text-[9px] uppercase shadow-xs">
                          Principal
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 p-1 rounded-md bg-stone-950/80 hover:bg-rose-600 text-white transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Video opcional */}
            <div>
              <label className="block font-bold text-stone-700 text-xs mb-1">
                Video explicativo (Opcional - YouTube / Vimeo)
              </label>
              <div className="relative">
                <Video className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full pl-9 pr-3 p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-medium outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: Datos de Contacto y Publicación */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-stone-900 font-extrabold pb-2 border-b border-stone-200">
              <span className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center text-xs">5</span>
              <span className="text-sm uppercase tracking-wider">Datos de Contacto y Publicación</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-stone-700 text-xs mb-1">
                  Nombre del vendedor o persona de contacto *
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="Ej. Juan Pérez / Taller El Carmen"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-medium outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 text-xs mb-1">
                  WhatsApp (Solo 10 dígitos)
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
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-mono font-bold outline-none focus:border-amber-500"
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
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-mono font-bold outline-none focus:border-amber-500"
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
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-medium outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Medios de contacto permitidos */}
            <div>
              <span className="block font-bold text-stone-700 text-xs mb-1.5">
                Medios de contacto permitidos:
              </span>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contactWhatsapp}
                    onChange={e => setContactWhatsapp(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>WhatsApp directo</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contactPhone}
                    onChange={e => setContactPhone(e.target.checked)}
                    className="w-4 h-4 text-stone-800 rounded"
                  />
                  <span>Llamada telefónica</span>
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
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 font-bold text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-extrabold text-xs shadow-md shadow-amber-500/25 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Guardando...</span>
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
