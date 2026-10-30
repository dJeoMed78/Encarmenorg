import React, { useState, useEffect, useRef } from 'react';
import {
  Tag,
  Gift,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  Search,
  Mail,
  User,
  Check,
  ShieldCheck,
  Sparkles,
  Phone,
  Building2,
  Upload,
  ImageIcon
} from 'lucide-react';
import { Promotion, ClaimedCoupon, Business } from '../types';
import { cleanPhoneNumber } from '../utils/phone';
import {
  getAdminPromotions,
  saveAdminPromotion,
  deleteAdminPromotion,
  getAdminCoupons,
  updateCouponStatus,
  uploadBusinessLogo
} from '../services/api';
import seedPromotions from '../data/promotions_seed.json';

interface AdminPromotionsTabProps {
  businesses: Business[];
}

export const AdminPromotionsTab: React.FC<AdminPromotionsTabProps> = ({ businesses }) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [coupons, setCoupons] = useState<ClaimedCoupon[]>([]);
  const [alertEmails, setAlertEmails] = useState<string[]>(['djeomed@gmail.com', 'Ddeysi763@gmail.com']);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'coupons' | 'promos' | 'create'>('promos');
  const [searchTerm, setSearchTerm] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [promoToDelete, setPromoToDelete] = useState<string | null>(null);

  // Form state
  const [formId, setFormId] = useState<string | null>(null);
  const [selectedBizId, setSelectedBizId] = useState<number>(businesses[0]?.id || 0);
  const [bizSearchQuery, setBizSearchQuery] = useState('');
  const [promoTitle, setPromoTitle] = useState('');
  const [promoDiscount, setPromoDiscount] = useState('20% OFF');
  const [promoDescription, setPromoDescription] = useState('');
  const [promoTotal, setPromoTotal] = useState<number>(5);
  const [promoValidUntil, setPromoValidUntil] = useState('31 de Octubre, 2026');
  const [promoOwnerEmail, setPromoOwnerEmail] = useState('');
  const [promoOwnerWhatsapp, setPromoOwnerWhatsapp] = useState('');
  const [promoImage, setPromoImage] = useState('');
  const [promoImageData, setPromoImageData] = useState('');
  const [isUploadingPromoImg, setIsUploadingPromoImg] = useState(false);
  const [promoTerms, setPromoTerms] = useState('Válido para las primeras personas en presentar su código oficial.');
  const [isSaving, setIsSaving] = useState(false);
  const [promoImagePreview, setPromoImagePreview] = useState('');
  const promoUploadSeq = useRef(0);

  const compressFlyerImage = (file: File, maxDim = 1200, quality = 0.85): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(e.target?.result as string);
          ctx.drawImage(img, 0, 0, width, height);
          let dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(dataUrl);
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handlePromoImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploadId = ++promoUploadSeq.current;
    setIsUploadingPromoImg(true);
    setErrorMsg(null);
    try {
      const compressedDataUrl = await compressFlyerImage(file);
      if (uploadId !== promoUploadSeq.current) return;
      if (!compressedDataUrl || !compressedDataUrl.startsWith('data:image/')) {
        setErrorMsg('No se pudo procesar la imagen seleccionada.');
        return;
      }
      setPromoImagePreview(compressedDataUrl);
      const res = await uploadBusinessLogo(compressedDataUrl, file.name);
      if (uploadId !== promoUploadSeq.current) return;
      const confirmedUrl = typeof res.url === 'string' ? res.url.trim() : '';
      if (res.success && /^(https?:\\/\\/[^\\s]+|\\/[^\\/\\s][^\\s]*)$/i.test(confirmedUrl)) {
        setPromoImage(confirmedUrl);
        setPromoImageData('');
      } else {
        setErrorMsg(res.error || 'No se confirmó la carga de la imagen. Se conserva el cartel anterior.');
      }
    } catch (err: any) {
      if (uploadId === promoUploadSeq.current) {
        setErrorMsg(err?.message || 'No se pudo subir la imagen. Se conserva el cartel anterior.');
      }
    } finally {
      if (uploadId === promoUploadSeq.current) {
        setPromoImagePreview('');
        setIsUploadingPromoImg(false);
      }
    }
  };

  // Helper to extract a clean 10-digit WhatsApp number from a business
  const extractCleanPhone = (biz?: Business | null): string => {
    if (!biz) return '';
    return cleanPhoneNumber(biz.phone) || cleanPhoneNumber(biz.whatsapp);
  };

  // Handler to select business and automatically extract its phone
  const handleSelectBusiness = (bizId: number) => {
    setSelectedBizId(bizId);
    const biz = businesses.find(b => b.id === bizId);
    if (biz) {
      const detected = extractCleanPhone(biz);
      setPromoOwnerWhatsapp(detected);
    }
  };

  // Ensure default business phone is set on mount
  useEffect(() => {
    if (businesses.length > 0 && (!selectedBizId || selectedBizId === 0)) {
      const firstBiz = businesses[0];
      setSelectedBizId(firstBiz.id);
      if (!promoOwnerWhatsapp) {
        setPromoOwnerWhatsapp(extractCleanPhone(firstBiz));
      }
    }
  }, [businesses]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [promosRes, couponsRes] = await Promise.all([
        getAdminPromotions(),
        getAdminCoupons()
      ]);
      if (promosRes.success && Array.isArray(promosRes.promotions) && promosRes.promotions.length > 0) {
        setPromotions(promosRes.promotions);
        if (promosRes.adminAlertEmails) setAlertEmails(promosRes.adminAlertEmails);
      } else {
        setPromotions(seedPromotions as any);
      }
      if (couponsRes.success && Array.isArray(couponsRes.coupons)) {
        setCoupons(couponsRes.coupons);
      } else {
        setCoupons([]);
      }
    } catch (err) {
      console.error('Error loading admin promo data:', err);
      setPromotions(seedPromotions as any);
      setCoupons([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEditPromo = (promo: Promotion) => {
    promoUploadSeq.current += 1;
    setIsUploadingPromoImg(false);
    setPromoImagePreview('');
    setFormId(promo.id);
    setSelectedBizId(promo.businessId);
    setPromoTitle(promo.title);
    setPromoDiscount(promo.discount);
    setPromoDescription(promo.description);
    setPromoTotal(promo.totalCoupons || 10);
    setPromoValidUntil(promo.validUntil || '');
    setPromoOwnerEmail(promo.ownerEmail || '');
    setPromoOwnerWhatsapp(cleanPhoneNumber(promo.businessWhatsapp || promo.businessPhone || ''));
    setPromoImage(promo.promoImage && !promo.promoImage.startsWith('data:') ? promo.promoImage : '');
    setPromoImageData(promo.promoImageData || (promo.promoImage?.startsWith('data:') ? promo.promoImage : ''));
    setPromoTerms(promo.terms || '');
    setActiveSubTab('create');
  };

  const handleResetForm = () => {
    promoUploadSeq.current += 1;
    setIsUploadingPromoImg(false);
    setPromoImagePreview('');
    setFormId(null);
    const firstBiz = businesses[0];
    setSelectedBizId(firstBiz?.id || 0);
    setPromoTitle('');
    setPromoDiscount('20% OFF');
    setPromoDescription('');
    setPromoTotal(5);
    setPromoValidUntil('31 de Octubre, 2026');
    setPromoOwnerEmail('');
    setPromoOwnerWhatsapp(extractCleanPhone(firstBiz));
    setPromoImage('');
    setPromoImageData('');
    setPromoTerms('Válido para las primeras personas en presentar su código oficial.');
    setBizSearchQuery('');
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBizId || !promoTitle.trim() || !promoDiscount.trim()) {
      setErrorMsg('Por favor completa el negocio, título y descuento.');
      return;
    }

    if (isUploadingPromoImg) {
      setErrorMsg('Espera a que termine la subida del cartel.');
      return;
    }
    const biz = businesses.find(b => b.id === Number(selectedBizId));
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanWa = cleanPhoneNumber(promoOwnerWhatsapp) || extractCleanPhone(biz);

    try {
      const res = await saveAdminPromotion({
        id: formId,
        businessId: Number(selectedBizId),
        businessName: biz?.name || 'Comercio Local',
        title: promoTitle.trim(),
        discount: promoDiscount.trim(),
        description: promoDescription.trim(),
        totalCoupons: Number(promoTotal) || 5,
        validUntil: promoValidUntil.trim(),
        ownerEmail: promoOwnerEmail.trim(),
        ownerWhatsapp: cleanWa,
        promoImage: /^(https?:\/\/[^\\s]+|\/[^\/\\s][^\\s]*)$/i.test(promoImage.trim()) ? promoImage.trim() : null,
        promoImageData: promoImageData || null,
        terms: promoTerms.trim(),
        isActive: true
      });

      if (res.success) {
        setSuccessMsg(res.message || 'Promoción guardada con éxito.');
        handleResetForm();
        loadData();
        setActiveSubTab('promos');
        window.dispatchEvent(new Event('promotions-updated'));
      } else {
        setErrorMsg(res.error || 'Error al guardar la promoción.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePromo = (promoId: string) => {
    setPromoToDelete(promoId);
  };

  const confirmDeletePromo = async () => {
    if (!promoToDelete) return;
    try {
      await deleteAdminPromotion(promoToDelete);
      setPromoToDelete(null);
      loadData();
      window.dispatchEvent(new Event('promotions-updated'));
    } catch {
      setPromoToDelete(null);
    }
  };

  const handleToggleCouponStatus = async (coupon: ClaimedCoupon) => {
    const nextStatus = coupon.status === 'redeemed' ? 'active' : 'redeemed';
    try {
      await updateCouponStatus(coupon.id, nextStatus);
      setCoupons(prev =>
        prev.map(c => (c.id === coupon.id ? { ...c, status: nextStatus } : c))
      );
    } catch {}
  };

  const filteredCoupons = coupons.filter(c => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.code.toLowerCase().includes(term) ||
      (c.customerName || '').toLowerCase().includes(term) ||
      (c.customerPhone || '').includes(term) ||
      (c.businessName || '').toLowerCase().includes(term)
    );
  });

  const currentSelectedBiz = businesses.find(b => b.id === Number(selectedBizId));
  const detectedBizPhone = extractCleanPhone(currentSelectedBiz);

  const filteredBizList = bizSearchQuery.trim()
    ? businesses.filter(b =>
        b.name.toLowerCase().includes(bizSearchQuery.toLowerCase()) ||
        (b.colonia && b.colonia.toLowerCase().includes(bizSearchQuery.toLowerCase())) ||
        (b.whatsapp && b.whatsapp.includes(bizSearchQuery)) ||
        (b.phone && b.phone.includes(bizSearchQuery))
      )
    : businesses;

  return (
    <div className="space-y-6 text-left">
      {/* Top Notification Badge */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-stone-800">
          <div className="p-2 rounded-xl bg-amber-500 text-stone-950 font-bold shrink-0">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-stone-900 block">
              Notificaciones Automáticas por Correo Activadas
            </span>
            <span className="text-stone-600">
              Cada reclamo se notifica al instante a: <strong>djeomed@gmail.com</strong>, <strong>Ddeysi763@gmail.com</strong> y al negocio.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-200 font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-end sm:self-auto shrink-0 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Sub-tabs header */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveSubTab('coupons')}
          className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'coupons'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
        >
          <Gift className="w-4 h-4 text-amber-400" />
          <span>Cupones Reclamados ({(coupons || []).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('promos')}
          className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'promos'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
        >
          <Tag className="w-4 h-4 text-amber-500" />
          <span>Promociones Activas ({(promotions || []).length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            handleResetForm();
            setActiveSubTab('create');
          }}
          className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'create'
              ? 'bg-amber-500 text-stone-950 shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>{formId ? 'Editar Promoción' : 'Nueva Promoción'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SUBTAB 1: CLAIMED COUPONS TABLE */}
      {activeSubTab === 'coupons' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-col sm:flex-row">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por código, cliente o teléfono..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="text-xs text-stone-500 font-bold self-end sm:self-auto">
              Total emitidos: {(coupons || []).length} cupones
            </div>
          </div>

          {filteredCoupons.length === 0 ? (
            <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-500 text-xs space-y-1">
              <Gift className="w-8 h-8 text-stone-400 mx-auto" />
              <p className="font-bold text-stone-700">Aún no hay cupones reclamados con este criterio</p>
              <p>Cuando los usuarios de Carmen soliciten descuentos, aparecerán aquí con su código único.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-100/80 text-stone-600 font-black uppercase text-[10px] tracking-wider border-b border-stone-200">
                    <th className="py-3 px-4">Código Único</th>
                    <th className="py-3 px-4">Empresa & Descuento</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Teléfono / WhatsApp</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredCoupons.map(coupon => {
                    const isRedeemed = coupon.status === 'redeemed';
                    return (
                      <tr key={coupon.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-black text-amber-900 select-all">
                          {coupon.code}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-extrabold text-stone-900 block truncate max-w-[150px]">
                            {coupon.businessName}
                          </span>
                          <span className="text-[10px] text-amber-700 font-bold">
                            {coupon.discount}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-stone-800">
                          {coupon.customerName}
                        </td>
                        <td className="py-3 px-4">
                          <a
                            href={`https://wa.me/52${(coupon.customerPhone || '').replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>{coupon.customerPhone}</span>
                          </a>
                        </td>
                        <td className="py-3 px-4 text-stone-400 text-[11px]">
                          {new Date(coupon.claimedAt).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isRedeemed
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {isRedeemed ? 'Canjeado ✓' : 'Activo'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleCouponStatus(coupon)}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                              isRedeemed
                                ? 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                            }`}
                          >
                            {isRedeemed ? 'Reactivar' : 'Marcar Canjeado'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: LIST PROMOTIONS */}
      {activeSubTab === 'promos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-sm font-extrabold text-stone-900">
              Promociones Registradas ({(promotions || []).length})
            </h3>
            <button
              type="button"
              onClick={() => {
                handleResetForm();
                setActiveSubTab('create');
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear Nueva</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(promotions || []).map(promo => {
              const remaining = Math.max(0, (promo.totalCoupons || 5) - (promo.claimedCount || 0));
              return (
                <div
                  key={promo.id}
                  className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between space-y-4 text-left"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-stone-950 font-black text-xs">
                        {promo.discount}
                      </span>
                      <span className="text-xs font-bold text-stone-500">
                        {promo.claimedCount} de {promo.totalCoupons} cupones reclamados
                      </span>
                    </div>

                    {promo.promoImage && (
                      <div className="w-full h-36 rounded-xl overflow-hidden border border-stone-200 bg-stone-100 relative">
                        <img
                          src={promo.promoImage}
                          alt="Flyer promocional"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-bold flex items-center gap-1">
                          <ImageIcon className="w-3 h-3 text-amber-400" />
                          <span>Cartel oficial</span>
                        </span>
                      </div>
                    )}

                    <h4 className="text-sm font-black text-stone-900">
                      {promo.businessName}
                    </h4>
                    <p className="text-xs font-bold text-stone-700">
                      {promo.title}
                    </p>
                    <p className="text-xs text-stone-500 line-clamp-2">
                      {promo.description}
                    </p>

                    <div className="text-[11px] text-stone-400 font-semibold space-y-0.5 pt-1">
                      <p>Válido hasta: <strong className="text-stone-600">{promo.validUntil}</strong></p>
                      {promo.ownerEmail && (
                        <p>Aviso al negocio: <strong className="text-stone-600">{promo.ownerEmail}</strong></p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-emerald-700">
                      Disponibles: {remaining}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditPromo(promo)}
                        className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePromo(promo.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 3: CREATE / EDIT PROMOTION FORM */}
      {activeSubTab === 'create' && (
        <form onSubmit={handleSavePromo} className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <h3 className="text-base font-black text-stone-900">
              {formId ? 'Editar Promoción / Oferta' : 'Crear Nueva Oferta con Cupones'}
            </h3>
            {formId && (
              <button
                type="button"
                onClick={handleResetForm}
                className="text-xs text-stone-500 hover:text-stone-800 underline font-bold"
              >
                Cancelar edición
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5 p-3 rounded-xl bg-stone-50 border border-stone-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <label className="block text-xs font-bold text-stone-800">
                  Empresa del Directorio *
                </label>
                <div className="relative w-full sm:w-80">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={bizSearchQuery}
                    onChange={e => setBizSearchQuery(e.target.value)}
                    placeholder="Filtrar por nombre, colonia o teléfono..."
                    className="w-full pl-8 pr-6 py-1.5 text-xs rounded-lg border border-stone-300 bg-white placeholder:text-stone-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                  {bizSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setBizSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <select
                value={selectedBizId}
                onChange={e => handleSelectBusiness(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white font-medium focus:ring-2 focus:ring-amber-500"
              >
                {filteredBizList.slice(0, 300).map(b => {
                  const phoneDisp = extractCleanPhone(b);
                  return (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.colonia || 'Carmen'}) {phoneDisp ? `· 📞 ${phoneDisp}` : '· (Sin tel)'}
                    </option>
                  );
                })}
              </select>

              {bizSearchQuery && filteredBizList.length > 300 && (
                <p className="text-[10px] text-stone-500">
                  Mostrando los primeros 300 de {filteredBizList.length} negocios coincidentes. Sé más específico para afinar.
                </p>
              )}

              {currentSelectedBiz && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 text-[11px] text-stone-600 border-t border-stone-200/80 mt-1">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Colonia: <strong>{currentSelectedBiz.colonia || 'Ciudad del Carmen'}</strong></span>
                  </div>
                  {detectedBizPhone ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Teléfono detectado en la ficha: {detectedBizPhone}
                    </span>
                  ) : (
                    <span className="text-stone-400 italic">
                      Sin teléfono registrado en la ficha
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Etiqueta de Descuento *
              </label>
              <input
                type="text"
                required
                value={promoDiscount}
                onChange={e => setPromoDiscount(e.target.value)}
                placeholder="Ej. 20% OFF, $150 MXN OFF, 2x1"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Título de la Promoción *
              </label>
              <input
                type="text"
                required
                value={promoTitle}
                onChange={e => setPromoTitle(e.target.value)}
                placeholder="Ej. 20% de Descuento en Lavado de Salas y Colchones"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500 font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Descripción de lo que incluye la oferta
              </label>
              <textarea
                rows={2}
                value={promoDescription}
                onChange={e => setPromoDescription(e.target.value)}
                placeholder="Explica qué incluye la promoción, en qué aplica y qué beneficios tiene el cliente..."
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Límite de Cupones Disponibles *
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                required
                value={promoTotal}
                onChange={e => setPromoTotal(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500 font-black text-amber-900"
              />
              <p className="text-[10px] text-stone-400 mt-1">
                Ej. 5, 10 o 15 cupones. Al llegar a este cupo se marcará como agotado.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Vigencia de la Promoción *
              </label>
              <input
                type="text"
                required
                value={promoValidUntil}
                onChange={e => setPromoValidUntil(e.target.value)}
                placeholder="Ej. 31 de Octubre, 2026"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Correo del Dueño del Negocio (Opcional)
              </label>
              <input
                type="email"
                value={promoOwnerEmail}
                onChange={e => setPromoOwnerEmail(e.target.value)}
                placeholder="dueño@empresa.com"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[10px] text-stone-400 mt-1">
                A los administradores (djeomed@gmail.com, Ddeysi763@gmail.com) siempre les llega copia.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                WhatsApp del Negocio para Canjear (Solo número a 10 dígitos)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={promoOwnerWhatsapp}
                  onChange={e => {
                    const val = e.target.value;
                    // If user pastes or types a WhatsApp URL, wa.me link, or full text, extract clean 10-digit number immediately
                    if (val.includes('http') || val.includes('whatsapp') || val.includes('wa.me')) {
                      setPromoOwnerWhatsapp(cleanPhoneNumber(val));
                    } else {
                      setPromoOwnerWhatsapp(val.replace(/[^\d\s\+\-]/g, ''));
                    }
                  }}
                  onBlur={() => {
                    if (promoOwnerWhatsapp) {
                      setPromoOwnerWhatsapp(cleanPhoneNumber(promoOwnerWhatsapp));
                    }
                  }}
                  placeholder="Ej. 9381458462"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500 font-mono font-bold text-stone-900"
                />
              </div>

              {detectedBizPhone ? (
                <div className="mt-1.5 p-2 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                  <span className="flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Tomado de la ficha: <strong className="font-mono text-emerald-950 font-bold">{detectedBizPhone}</strong>
                  </span>
                  {promoOwnerWhatsapp !== detectedBizPhone && (
                    <button
                      type="button"
                      onClick={() => setPromoOwnerWhatsapp(detectedBizPhone)}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                      title="Restablecer el número detectado en el directorio"
                    >
                      ↺ Restaurar {detectedBizPhone}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-stone-400 mt-1">
                  Escribe el número de WhatsApp a 10 dígitos al que los clientes escribirán para hacer válido su descuento.
                </p>
              )}
            </div>

            {/* Cartel / Imagen Publicitaria de la Promoción (Flyer) */}
            <div className="sm:col-span-2 space-y-2 p-4 rounded-2xl bg-amber-500/10 border border-amber-300">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-700" />
                    <span>Cartel / Volante Publicitario de la Oferta (Flyer)</span>
                  </label>
                  <p className="text-[11px] text-stone-600 mt-0.5">
                    Sube la imagen publicitaria que te entregó el negocio (ej. estética, taller, restaurante). El usuario verá este cartel en grande para conocer todos los detalles antes de solicitar su cupón.
                  </p>
                </div>
                {promoImage && (
                  <button
                    type="button"
                    onClick={() => {
                      promoUploadSeq.current += 1;
                      setIsUploadingPromoImg(false);
                      setPromoImagePreview('');
                      setPromoImage('');
                      setPromoImageData('');
                    }}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                  >
                    Quitar cartel
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1">
                {promoImagePreview || promoImage || promoImageData ? (
                  <div className="relative w-32 h-44 rounded-xl border-2 border-amber-400 overflow-hidden bg-black/5 shrink-0 shadow-md group">
                    <img
                      src={promoImagePreview || promoImage || promoImageData}
                      alt="Cartel promocional"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        if (!promoImagePreview && promoImageData && e.currentTarget.src !== promoImageData) {
                          e.currentTarget.src = promoImageData;
                        }
                      }}
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-black/75 text-white text-[9px] text-center py-0.5 font-bold">
                      Vista previa
                    </div>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-xl border-2 border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-400 bg-white shrink-0 text-center p-2">
                    <ImageIcon className="w-7 h-7 mb-1 text-stone-300" />
                    <span className="text-[10px] leading-tight font-medium">Sin cartel adjunto</span>
                  </div>
                )}

                <div className="flex-1 space-y-2 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition-colors">
                      <Upload className={`w-3.5 h-3.5 ${isUploadingPromoImg ? 'animate-bounce' : ''}`} />
                      <span>{isUploadingPromoImg ? 'Subiendo cartel...' : promoImage || promoImageData || promoImagePreview ? 'Cambiar cartel por otro' : 'Subir imagen desde mi equipo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePromoImageUpload}
                        className="hidden"
                      />
                    </label>

                    {(promoImage || promoImageData || promoImagePreview) && (
                      <button
                        type="button"
                        onClick={() => {
                          promoUploadSeq.current += 1;
                          setIsUploadingPromoImg(false);
                          setPromoImage('');
                          setPromoImageData('');
                          setPromoImagePreview('');
                        }}
                        className="px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-rose-50 hover:text-rose-600 text-stone-600 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Quitar cartel
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Sube un cartel publicitario atractivo para captar más clientes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('promos')}
              className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : formId ? 'Guardar Cambios' : 'Publicar Promoción'}
            </button>
          </div>
        </form>
      )}

      {/* Confirmation Modal for Deleting Promotion */}
      {promoToDelete && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4"
          style={{
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(25px)',
            WebkitBackdropFilter: 'blur(25px)'
          }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(35px) saturate(190%)',
              WebkitBackdropFilter: 'blur(35px) saturate(190%)',
              border: '1.5px solid rgba(255, 255, 255, 0.95)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-base font-extrabold text-stone-900">
                ¿Eliminar promoción?
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                ¿Estás seguro de que deseas eliminar esta oferta del catálogo activo? Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPromoToDelete(null)}
                className="py-2.5 px-3 rounded-2xl bg-stone-200/80 hover:bg-stone-300 active:scale-95 text-stone-800 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeletePromo}
                className="py-2.5 px-3 rounded-2xl bg-[#e11d48] hover:bg-[#be123c] active:scale-95 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all cursor-pointer"
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
