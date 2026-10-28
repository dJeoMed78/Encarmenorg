import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Building2,
  PencilLine,
  Phone,
  MessageSquare,
  Store,
  Utensils,
  Bike,
  Users,
  Package,
  Banknote,
  Landmark,
  MoreHorizontal,
  MapPin,
  Clock,
  Truck,
  CreditCard,
  Globe,
  Facebook,
  Instagram,
  Check,
  Upload,
  Trash2,
  Save,
  AlertCircle
} from 'lucide-react';
import { Business, Category } from '../types';
import { uploadBusinessLogo } from '../services/api';
import { cleanPhoneNumber } from '../utils/phone';
import { formatBusinessName, formatAddressText } from '../utils/textUtils';
import { DELIVERY_OPTIONS, normalizeDeliveryOption } from '../constants/delivery';
import {
  ALL_POSTAL_CODES,
  getPostalCodeForColonia,
  getColoniasForPostalCode,
  CARMEN_POSTAL_CODES_MAP
} from '../data/carmen_postal_codes';
import ALL_COLONIAS_CARMEN from '../data/colonias_carmen.json';

import {
  STANDARDIZED_DELIVERY_OPTIONS,
  STANDARDIZED_PAYMENT_OPTIONS
} from '../constants/businessOptions';

export { STANDARDIZED_DELIVERY_OPTIONS, STANDARDIZED_PAYMENT_OPTIONS };

function ensureArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(v => (typeof v === 'string' ? v : String(v || ''))).filter(Boolean);
  if (typeof val === 'string' && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map(v => (typeof v === 'string' ? v : String(v || ''))).filter(Boolean);
    } catch {}
    return [val.trim()];
  }
  return [];
}

function ensureString(val: any, fallback = ''): string {
  if (typeof val === 'string') return val;
  if (val === null || val === undefined) return fallback;
  return String(val);
}

class ModalErrorBoundary extends React.Component<
  { children: React.ReactNode; onClose: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ModalErrorBoundary caught error in EditBusinessModal:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto text-xl font-black">
            !
          </div>
          <h4 className="text-base font-bold text-stone-900">
            No se pudo cargar la edición de este registro
          </h4>
          <p className="text-xs text-stone-600 max-w-sm mx-auto">
            Los datos de esta empresa tienen un formato que no pudo procesarse correctamente.
          </p>
          <button
            type="button"
            onClick={this.props.onClose}
            className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black shadow-md cursor-pointer"
          >
            Cerrar Ventana
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function safeCompanyLogo(value:unknown):string|undefined{if(value==='')return '';if(typeof value!=='string'||!value||value.length>2048||(!value.startsWith('/')&&!/^https?:\/\//i.test(value)))return;try{const u=new URL(value,window.location.origin);if(['http:','https:'].includes(u.protocol)&&!u.username&&!u.password)return value;}catch{}}
async function serverAllowsCompanyLogo(signal?:AbortSignal):Promise<boolean>{
  const controller=new AbortController(),abort=()=>controller.abort();if(signal?.aborted)controller.abort();signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,5000);
  try{const token=sessionStorage.getItem('encarmen_admin_session_token')||'';if(!/^[0-9a-f]{64}$/.test(token))return false;const response=await fetch('/api/admin/session',{cache:'no-store',headers:{'X-Encarmen-Admin-Token':token},signal:controller.signal});const data=await response.json();return response.ok&&data.success===true&&Number.isFinite(data.expiresAt)&&data.expiresAt>Date.now()&&Array.isArray(data.permissions)&&data.permissions.includes('business:manage');}catch{return false;}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
interface EditBusinessModalProps {
  business: Business | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  categories?: Category[];
  coloniasList?: { name: string; count: number }[];
  onSave: (id: number, updatedData: Partial<Business>) => Promise<{ success: boolean; message: string }>;
}

export const EditBusinessModal: React.FC<EditBusinessModalProps> = ({
  business,
  isOpen,
  onClose,
  isAdmin = false,
  categories,
  coloniasList,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<Business>>({});
  const [postalCode, setPostalCode] = useState<string>('');
  const [selectedDeliveryOptions, setSelectedDeliveryOptions] = useState<string[]>([]);
  const [selectedPaymentOptions, setSelectedPaymentOptions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [weeklyDays,setWeeklyDays]=useState([true,true,true,true,true,true,false]);
  const [openingTime,setOpeningTime]=useState('08:00');
  const [closingTime,setClosingTime]=useState('18:00');
  const [weeklyEdited,setWeeklyEdited]=useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);

  const [logoAllowed,setLogoAllowed]=useState(false),[logoDirty,setLogoDirty]=useState(false),[logoUploading,setLogoUploading]=useState(false),[logoPreviewFailed,setLogoPreviewFailed]=useState(false);
  const logoEpoch=useRef(0),logoBusy=useRef(false),logoDraftId=useRef<number|null>(null);
  useEffect(()=>{const version=++logoEpoch.current,controller=new AbortController();setLogoAllowed(false);setLogoDirty(false);logoDraftId.current=null;setLogoUploading(false);logoBusy.current=false;if(isOpen&&business)void serverAllowsCompanyLogo(controller.signal).then(ok=>{if(version===logoEpoch.current&&!controller.signal.aborted)setLogoAllowed(ok)});return()=>{logoEpoch.current++;controller.abort();};},[isOpen,business?.id]);
  useEffect(()=>setLogoPreviewFailed(false),[formData.logo_url]);
  // Lista plana y exhaustiva de todas las categorías y subcategorías disponibles en el sistema (Falla 13)
  const allAvailableCategories = useMemo(() => {
    const list: { name: string; id?: number | string }[] = [];
    const seen = new Set<string>();

    const safeCats = Array.isArray(categories) ? categories : [];
    safeCats.forEach(c => {
      if (c && typeof c.name === 'string' && !seen.has(c.name.toLowerCase().trim())) {
        seen.add(c.name.toLowerCase().trim());
        list.push({ name: c.name.trim(), id: c.id || c.slug });
      }
      if (c && (c as any).subcategories && Array.isArray((c as any).subcategories)) {
        (c as any).subcategories.forEach((sub: any) => {
          if (sub && typeof sub.name === 'string' && !seen.has(sub.name.toLowerCase().trim())) {
            seen.add(sub.name.toLowerCase().trim());
            list.push({ name: sub.name.trim(), id: sub.id || sub.slug });
          }
        });
      }
    });

    list.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    return list;
  }, [categories]);

  const availableColonias = useMemo(() => {
    if (postalCode) {
      const byCp = getColoniasForPostalCode(postalCode);
      if (Array.isArray(byCp) && byCp.length > 0) return byCp;
    }
    if (Array.isArray(coloniasList) && coloniasList.length > 0) {
      const mapped = coloniasList
        .map(c => (typeof c === 'string' ? c : c?.name || ''))
        .filter(Boolean);
      if (mapped.length > 0) return mapped;
    }
    return ALL_COLONIAS_CARMEN;
  }, [postalCode, coloniasList]);

  const safePreviousSlugs = useMemo(() => {
    return ensureArray(business?.previousSlugs);
  }, [business?.previousSlugs]);

  useEffect(() => {
    if (business) {
      try {
        const initialCol = (typeof business.colonia === 'string' && business.colonia) || 'Ciudad del Carmen Centro';
        const initialCp = (typeof business.postalCode === 'string' && business.postalCode) || getPostalCodeForColonia(initialCol);
        setPostalCode(initialCp);

        // Parse existing delivery into multi-select
        const rawDel = ensureString(business.delivery).trim();
        const rawDelLow = rawDel.toLowerCase();
        const existingParts = rawDel ? rawDel.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
        const initialDel = STANDARDIZED_DELIVERY_OPTIONS.filter(opt => {
          const oLow = opt.toLowerCase();
          // Exact match with whole string or part
          if (existingParts.some(p => p === oLow || p.includes(oLow)) || rawDelLow.includes(oLow)) return true;
          // Specific semantic match per option
          if (opt === 'Atención en el Local de la empresa') {
            return existingParts.some(p => (p.includes('local') && !p.includes('paqueter')) || p.includes('mostrador') || p.includes('sucursal') || p.includes('tienda'));
          }
          if (opt === 'Servicio a domicilio gratis') {
            return existingParts.some(p => p.includes('gratis') || p.includes('sin costo'));
          }
          if (opt === 'Servicio a domicilio con costo') {
            return existingParts.some(p => p.includes('con costo') || p.includes('costo') || p.includes('mandadito') || (p.includes('domicilio') && !p.includes('gratis') && !p.includes('cliente')));
          }
          if (opt === 'Servicio a domicilio en el lugar del cliente') {
            return existingParts.some(p => p.includes('lugar del cliente') || p.includes('en sitio') || p.includes('a domicilio en el lugar'));
          }
          if (opt === 'Envíos por paquetería local y foránea') {
            return existingParts.some(p => p.includes('paqueter') || p.includes('foráneo') || p.includes('foranea') || (p.includes('envío') && !p.includes('domicilio')));
          }
          return false;
        });
        const parsedDel = initialDel.length > 0 ? initialDel : ['Atención en el Local de la empresa'];
        setSelectedDeliveryOptions(parsedDel);

        // Parse existing payments into multi-select
        const rawPay = ensureString(business.payment).toLowerCase();
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

        const safeCats = ensureArray(business.categories);
        const safePrevSlugs = ensureArray(business.previousSlugs);
        const safePrevNames = ensureArray(business.previousNames);
        const safeGallery = ensureArray(business.gallery);

        setFormData({
          name: ensureString(business.name),
          category: safeCats[0] || ensureString(business.category, 'Servicios'),
          categories: safeCats.length > 0 ? safeCats : [ensureString(business.category, 'Servicios')],
          description: ensureString(business.description),
          phone: cleanPhoneNumber(ensureString(business.phone)) || '',
          whatsapp: cleanPhoneNumber(ensureString(business.whatsapp)) || cleanPhoneNumber(ensureString(business.phone)) || '',
          address: ensureString(business.address),
          colonia: initialCol,
          postalCode: initialCp,
          schedule: ensureString(business.schedule, 'Lunes a Sábado'),
          payment: parsedPay.join(', '),
          delivery: parsedDel.join(', '),
          hasDelivery: parsedDel.some(d => d.toLowerCase().includes('domicilio') || d.toLowerCase().includes('envío')),
          facebook: ensureString(business.facebook),
          instagram: ensureString(business.instagram),
          website: ensureString(business.website),
          image: ensureString(business.image),
          logo_url: logoDraftId.current===business.id&&(logoDirty||logoBusy.current)?formData.logo_url:ensureString(business.logo_url),
          gallery: safeGallery,
          slug: ensureString(business.slug),
          previousSlugs: safePrevSlugs,
          previousNames: safePrevNames,
          isRecommended: Boolean(business.isRecommended),
          isTopBusiness: Boolean(business.isTopBusiness)
        });
        const schedule = ensureString(business.schedule,'Lunes a Sábado');
        const normalized = schedule.toLowerCase();
        const days=['lun','mar','mié','jue','vie','sáb','dom'];
        const times=schedule.match(/\\d{1,2}:\\d{2}/g);
        setWeeklyDays(/lunes a s[aá]bado/i.test(schedule)?[true,true,true,true,true,true,false]:/lunes a viernes/i.test(schedule)?[true,true,true,true,true,false,false]:days.some(d=>normalized.includes(d))?days.map(d=>normalized.includes(d)):[true,true,true,true,true,true,false]);
        setOpeningTime(times?.[0] || '08:00');
        setClosingTime(times?.[1] || '18:00');
        setWeeklyEdited(false);
        setErrorMsg(null);
        setSuccessMsg(null);
      } catch (err: any) {
        console.error('Error initializing EditBusinessModal:', err);
      }
    }
  }, [business, isOpen]);

  if (!isOpen || !business) return null;

  const handleCompanyLogoUpload = async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];e.target.value='';if(!file||logoBusy.current)return;
    if(!logoAllowed){setErrorMsg('El logotipo requiere sesión administrativa verificada.');return;}
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){setErrorMsg('Usa logotipo JPEG, PNG o WebP de hasta 5 MB.');return;}
    logoBusy.current=true;logoDraftId.current=business.id;setLogoUploading(true);const version=logoEpoch.current;setErrorMsg(null);
    try{if(!await serverAllowsCompanyLogo())throw new Error('La sesión no permite cambiar el logotipo.');
      const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('No se pudo leer el logotipo.'));reader.readAsDataURL(file);});
      if(version!==logoEpoch.current)return;
      const response=await uploadBusinessLogo(data,file.name);const url=safeCompanyLogo(response.url);
      if(!response.success||!url)throw new Error('El servidor no confirmó una URL de logotipo. No se guardó la imagen.');
      if(version!==logoEpoch.current)return;setFormData(prev=>({...prev,logo_url:url}));setLogoDirty(true);
    }catch(error){if(version===logoEpoch.current)setErrorMsg(error instanceof Error?error.message:'No se pudo cargar el logotipo.');}
    finally{if(version===logoEpoch.current){logoBusy.current=false;setLogoUploading(false);}}
  };

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
      if(logoBusy.current)throw new Error('Espera a que termine la carga del logotipo.');
      if(logoDirty&&!await serverAllowsCompanyLogo()){setLogoAllowed(false);throw new Error('La sesión venció o no permite guardar el logotipo.');}
      const logo=safeCompanyLogo(formData.logo_url);
      if(logoDirty&&logo===undefined)throw new Error('El logotipo debe tener una URL válida confirmada por el servidor.');
      const {logo_url:_unchangedLogo,...businessFields}=formData;
      const cleanName = formatBusinessName(formData.name.trim());
      const cleanAddress = formatAddressText(formData.address || '');
      const cleanPhone = cleanPhoneNumber(formData.phone);
      const cleanWa = cleanPhoneNumber(formData.whatsapp) || cleanPhone;
      const cleanDelivery = selectedDeliveryOptions.length > 0
        ? selectedDeliveryOptions.join(', ')
        : (normalizeDeliveryOption(formData.delivery) || 'Atención en el Local de la empresa');
      const cleanSlug = (formData.slug || '')
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9-_]/g, '');

      const res = await onSave(business.id, {
        ...businessFields,
        ...(logoDirty?{logo_url:logo}:{}),
        schedule: weeklyEdited ? ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].filter((_,i)=>weeklyDays[i]).join(', ') + ' ' + openingTime + ' - ' + closingTime : formData.schedule,
        ...(isAdmin ? { slug: cleanSlug || undefined, isTopBusiness: formData.isTopBusiness, isRecommended: formData.isRecommended } : { slug: business.slug, isTopBusiness: business.isTopBusiness, isRecommended: business.isRecommended }),
        name: cleanName,
        address: cleanAddress,
        phone: cleanPhone,
        whatsapp: cleanWa,
        delivery: cleanDelivery,
        hasDelivery: selectedDeliveryOptions.some(d => d.toLowerCase().includes('domicilio') || d.toLowerCase().includes('envío'))
      });
      if (res.success) {
        setSuccessMsg('¡Negocio actualizado correctamente!');
        onClose();
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-3 animate-in fade-in duration-200"
      style={{
        background: 'radial-gradient(at 12% 20%,rgba(65,150,235,.34),transparent 55%),radial-gradient(at 85% 80%,rgba(240,160,190,.33),transparent 55%),rgba(30,60,90,.24)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
      }}
      // Backdrop clicks must not dismiss the editor during text selection.
    >
      <div
        className="encarmen-glass-editor relative w-full max-w-[568px] rounded-[22px] overflow-hidden flex flex-col my-auto max-h-[98dvh]"
        style={{
          background: 'radial-gradient(at 5% 10%,rgba(100,173,238,.3),transparent 55%),radial-gradient(at 90% 75%,rgba(255,185,193,.28),transparent 55%),linear-gradient(125deg,rgba(229,242,255,.68),rgba(255,255,255,.50),rgba(221,239,254,.65))',
          backdropFilter: 'blur(38px) saturate(160%)',
          WebkitBackdropFilter: 'blur(38px) saturate(160%)',
          border: '1.5px solid rgba(255, 255, 255, 0.95)',
          boxShadow: '0 30px 90px rgba(19, 37, 60, 0.24), inset 0 1px 1px rgba(255, 255, 255, 0.90)',
        }}
        onClick={e => e.stopPropagation()}
      >

        <style>{`
          .encarmen-glass-editor { isolation:isolate; }
          .encarmen-glass-form { scrollbar-color:rgba(255,255,255,.4) transparent; }
          .encarmen-glass-editor .encarmen-glass-card {
            padding:10px 14px 11px; margin:0 0 6px;
            border-radius:18px; border:1.5px solid rgba(255,255,255,.77);
            background:linear-gradient(122deg,rgba(240,248,255,.25),rgba(255,255,255,.38) 55%,rgba(246,248,253,.24));
            backdrop-filter:blur(28px) saturate(150%); -webkit-backdrop-filter:blur(28px) saturate(150%);
            box-shadow:inset 0 1px 1px rgba(255,255,255,.68),0 8px 26px rgba(30,60,98,.045);
          }
          .encarmen-glass-editor .encarmen-section-heading {display:flex;align-items:center;gap:9px;margin:0 0 7px;padding:0;background:none;border:0;box-shadow:none}
          .encarmen-glass-editor .encarmen-section-heading strong {display:block;color:#101c2b;font-size:12px;font-weight:800;line-height:1.35}
          .encarmen-glass-editor .encarmen-section-heading small {display:block;color:#475569;font-size:9px;margin-top:1px}
          .encarmen-glass-editor .encarmen-section-icon {display:flex;align-items:center;justify-content:center;width:29px;height:29px;border-radius:9px;flex-shrink:0;color:#fff;box-shadow:0 6px 13px rgba(31,51,85,.14)}
          .encarmen-glass-editor .encarmen-amber {background:linear-gradient(145deg,#ffcf57,#ffad19)}
          .encarmen-glass-editor .encarmen-blue {background:linear-gradient(145deg,#4e99ff,#1d5fe6)}
          .encarmen-glass-editor .encarmen-green {background:linear-gradient(145deg,#4cb4ff,#1464c8)}
          .encarmen-glass-editor .encarmen-red {background:linear-gradient(145deg,#ff6d7e,#dc254c)}
          .encarmen-glass-editor .encarmen-purple {background:linear-gradient(145deg,#ad7afa,#7c36ce)}
          .encarmen-glass-editor .encarmen-emerald {background:linear-gradient(145deg,#36c89b,#079b70)}
          .encarmen-glass-editor .encarmen-violet {background:linear-gradient(145deg,#b46cf1,#783bc3)}
          .encarmen-glass-editor .encarmen-glass-card > div:not(.encarmen-section-heading) {margin-top:5px}
          .encarmen-glass-editor input:not([type="checkbox"]):not([type="file"]),.encarmen-glass-editor textarea,.encarmen-glass-editor select {
            background:rgba(255,255,255,.93)!important;color:#1a2b43;border:1px solid rgba(210,221,237,.85);
            border-radius:14px;min-height:32px;font-size:11px;transition:border-color .18s,box-shadow .18s;
          }
          .encarmen-glass-editor textarea {min-height:65px}
          .encarmen-glass-editor input:focus,.encarmen-glass-editor textarea:focus,.encarmen-glass-editor select:focus {border-color:#3485ff!important;box-shadow:0 0 0 2px rgba(59,130,246,.23);outline:none}
          .encarmen-glass-editor label {color:#1c293c}
          .encarmen-glass-editor .encarmen-glass-card button[type="button"] {border-color:rgba(210,220,236,.8);transition:background .18s,border-color .18s,transform .18s}
          .encarmen-glass-editor .encarmen-glass-card button[type="button"]:has(.text-stone-950),.encarmen-glass-editor .encarmen-glass-card button[type="button"]:has(.text-white) {border-color:#448eff;background:rgba(228,239,255,.64);color:#0754c8}
          .encarmen-glass-editor .encarmen-glass-card button[type="button"]:active {transform:scale(.99)}
          .encarmen-glass-editor .encarmen-extra-card {margin-top:8px}
          .encarmen-glass-editor .encarmen-glass-card .grid {gap:7px}
          .encarmen-glass-editor .encarmen-glass-card label {font-size:10px}
          .encarmen-glass-editor .encarmen-glass-card .rounded-2xl.bg-stone-50 {background:transparent;border:0;padding:0}
          .encarmen-glass-editor .encarmen-glass-card button[type="button"] {padding:5px 7px;font-size:10px;border-radius:8px}
          .encarmen-glass-editor .encarmen-glass-card input:not([type="checkbox"]):not([type="file"]),.encarmen-glass-editor .encarmen-glass-card select {padding-top:5px;padding-bottom:5px}
          .encarmen-glass-editor .encarmen-glass-footer {position:relative;z-index:15;padding:8px 12px;background:rgba(235,245,255,.48);backdrop-filter:blur(28px) saturate(150%);border-top:1px solid rgba(255,255,255,.85)}
          @media(max-height:900px) {.encarmen-glass-editor .encarmen-glass-card {padding:8px 12px}.encarmen-glass-editor .encarmen-section-heading{margin-bottom:5px}}
          @media(max-width:640px) {.encarmen-glass-editor .encarmen-glass-card {padding:14px 13px;border-radius:22px}.encarmen-glass-editor .encarmen-section-heading strong{font-size:14px}.encarmen-glass-editor .encarmen-section-icon{width:38px;height:38px}}
        `}</style>
        <ModalErrorBoundary onClose={onClose}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-3 shrink-0 z-10"
          style={{
            background: 'rgba(233, 241, 250, 0.25)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1.5px solid rgba(255, 255, 255, 0.85)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-[15px] bg-white/35 border-2 border-white/80 text-blue-600 flex items-center justify-center font-bold shadow-lg">
              <PencilLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-[16px] text-slate-950 leading-tight">
                Editar Negocio
              </h3>
              <p className="text-[10px] text-slate-700 font-normal">
                Actualiza la información de tu negocio en el directorio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-200/60 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="encarmen-glass-form flex flex-col min-h-0 flex-1">
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

          {/* Approved glass basic-information card */}
          <div className="encarmen-glass-scroll px-2 py-1 min-h-0 flex-1 overflow-y-auto space-y-[6px]">
          <section className="encarmen-glass-card">
          <div className="encarmen-section-heading"><span className="encarmen-section-icon encarmen-amber"><Building2 size={19}/></span><span><strong>Información Básica</strong><small>Datos principales de tu negocio</small></span></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Nombre de la Empresa *</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                onBlur={() => setFormData(prev => ({ ...prev, name: formatBusinessName(prev.name || '') }))}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm font-bold text-stone-900 focus:border-amber-500 outline-none bg-white"
                required
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700">Giro / Categoría *</label>
                <span className="text-[10px] text-stone-400">Ver todas las categorías</span>
              </div>
              <div className="relative"><Utensils size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500 pointer-events-none z-10" />
              <select
                value={
                  allAvailableCategories.some(c => c.name.toLowerCase() === (formData.category || '').toLowerCase())
                    ? allAvailableCategories.find(c => c.name.toLowerCase() === (formData.category || '').toLowerCase())?.name
                    : (formData.category ? '__custom__' : '')
                }
                onChange={e => {
                  const val = e.target.value;
                  if (val === '__custom__') {
                    setFormData(prev => ({ ...prev, category: '' }));
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      category: val,
                      categories: [val]
                    }));
                  }
                }}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm font-semibold text-stone-800 bg-white focus:border-amber-500 outline-none cursor-pointer"
              >
                <option value="" disabled>-- Selecciona del listado completo de categorías ({allAvailableCategories.length}) --</option>
                {allAvailableCategories.map(c => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
                <option value="__custom__">➕ Escribir otra categoría personalizada...</option>
              </select></div>

              {(!allAvailableCategories.some(c => c.name.toLowerCase() === (formData.category || '').toLowerCase()) || formData.category === '') && (
                <div className="mt-1.5">
                  <input
                    type="text"
                    value={formData.category === '__custom__' ? '' : (formData.category || '')}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      category: e.target.value,
                      categories: [e.target.value]
                    }))}
                    placeholder="Escribe el nombre de la categoría personalizada..."
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 text-xs sm:text-sm font-semibold text-stone-800 focus:border-amber-500 outline-none bg-white"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Descripción Comercial</label>
            <textarea
              rows={3}
              value={formData.description || ''}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-800 focus:border-amber-500 outline-none leading-relaxed bg-white"
            />
          </div>

          </section>
          <section className="encarmen-glass-card">
          {/* Phone & WhatsApp */}
          <div className="encarmen-section-heading"><span className="encarmen-section-icon encarmen-green"><Phone size={19}/></span><span><strong>Contacto</strong><small>Al menos un medio de contacto es obligatorio</small></span></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Teléfono (10 dígitos)</label>
              <div className="relative"><Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
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
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-800 focus:border-amber-500 outline-none font-mono bg-white pl-9"
              /></div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">WhatsApp (Solo 10 dígitos)</label>
              <div className="relative"><MessageSquare size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none" />
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
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-800 focus:border-amber-500 outline-none font-mono font-bold bg-white pl-9"
              /></div>
            </div>
          </div>

          </section>
          <section className="encarmen-glass-card">
          {/* Address, Postal Code & Colonia */}
          <div className="encarmen-section-heading"><span className="encarmen-section-icon encarmen-red"><MapPin size={19}/></span><span><strong>Ubicación</strong><small>Indica la dirección de tu negocio</small></span></div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Dirección Física Exacta</label>
            <input
              type="text"
              value={formData.address || ''}
              onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Calle, número, cruzamientos..."
              className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-800 focus:border-amber-500 outline-none bg-white"
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
                {availableColonias.map((cName, i) => (
                  <option key={i} value={cName}>
                    {cName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          </section>
          <section className="encarmen-glass-card">
          {/* Modalidad de Atención y Entrega (Multiselección) */}
          <div className="encarmen-section-heading"><span className="encarmen-section-icon encarmen-purple"><Truck size={19}/></span><span><strong>Modalidad de Atención y Entrega</strong><small>Selecciona una o más opciones</small></span></div>
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
            <div className="grid grid-cols-2 gap-2">
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
                        ? 'bg-blue-100/80 border-blue-400 text-blue-700 shadow-xs'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      isChecked ? 'bg-blue-600 border-blue-600 text-white font-bold' : 'border-stone-300 bg-white'
                    }`}>
                      {isChecked && <Check className="w-3 h-3 text-white" />}
                    </div>
                    {(() => {const Icon = opt.includes('Local') ? Store : opt.includes('domicilio') ? Bike : opt.includes('cliente') ? Users : Package; return <Icon size={13} className="shrink-0" />;})()}
                    {(() => {const Icon = opt.includes('Efectivo') ? Banknote : opt.includes('Tarjeta') ? CreditCard : opt.includes('Transferencia') ? Landmark : MoreHorizontal; return <Icon size={13} className="shrink-0" />;})()}
                    <span className="leading-tight">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          </section>
          <section className="encarmen-glass-card">
          {/* Métodos de Pago Aceptados (Multiselección) */}
          <div className="encarmen-section-heading"><span className="encarmen-section-icon encarmen-emerald"><CreditCard size={19}/></span><span><strong>Métodos de Pago</strong><small>Selecciona las formas de pago que aceptas</small></span></div>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                        ? 'bg-blue-100/80 border-blue-400 text-blue-700 shadow-xs'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      isChecked ? 'bg-blue-600 border-blue-600 text-white font-bold' : 'border-stone-300 bg-white'
                    }`}>
                      {isChecked && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="leading-tight">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          </section>
          <section className="encarmen-glass-card">
          {/* Horario Comercial */}
          <div className="encarmen-section-heading"><span className="encarmen-section-icon encarmen-violet"><Clock size={19}/></span><span><strong>Horarios de Atención</strong><small>Indica los días y horarios de tu negocio</small></span></div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_100px] gap-2 items-end">
            <div className="grid grid-cols-7 gap-1">
              {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((day,i)=><button key={day} type="button" aria-pressed={weeklyDays[i]} onClick={()=>{setWeeklyDays(prev=>prev.map((v,j)=>j===i?!v:v));setWeeklyEdited(true);}} className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-1 text-[9px] ${weeklyDays[i]?'bg-blue-100 border-blue-400 text-blue-700':'bg-white/80 border-white text-slate-600'}`}><span className={`w-4 h-4 rounded border flex items-center justify-center ${weeklyDays[i]?'bg-blue-600 border-blue-600 text-white':'bg-white border-slate-300'}`}>{weeklyDays[i]&&<Check size={11}/>}</span>{day}</button>)}
            </div>
            <label className="text-[9px] font-bold">Hora de Apertura<input type="time" value={openingTime} onChange={e=>{setOpeningTime(e.target.value);setWeeklyEdited(true);}} className="w-full px-1 py-1"/></label>
            <label className="text-[9px] font-bold">Hora de Cierre<input type="time" value={closingTime} onChange={e=>{setClosingTime(e.target.value);setWeeklyEdited(true);}} className="w-full px-1 py-1"/></label>
          </div>
          {!weeklyEdited&&formData.schedule&&!/lunes a (viernes|s[aá]bado)/i.test(formData.schedule)&&<p className="text-[9px] text-slate-600">Horario guardado: {formData.schedule}. Se conservará hasta editarlo.</p>}

          </section>
          <details className="encarmen-advanced-details"><summary className="cursor-pointer text-[11px] font-semibold text-blue-700 px-3 py-2 rounded-xl bg-white/40 border border-white/70">Opciones adicionales, redes sociales y fotografías</summary>
          {isAdmin && <section className="encarmen-glass-card encarmen-extra-card encarmen-privileged-glass">
            <div className="encarmen-section-heading"><span className="encarmen-section-icon encarmen-blue"><Globe size={19}/></span><span><strong>Enlaces y opciones adicionales</strong><small>Dirección web personalizada y distintivos del negocio</small></span></div>
          {/* Enlace Personalizado (Slug URL) */}
          <div className="encarmen-privileged-panel space-y-1.5 p-3 rounded-2xl border border-white/75 bg-white/30 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,.8),0_4px_18px_rgba(70,110,165,.09)]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-600" />
                <span>Enlace Web Personalizado (Slug URL)</span>
              </label>
              <span className="text-[10px] text-amber-700 font-semibold">
                Ej: hairpalace, unitamp, lavanderia
              </span>
            </div>
            <div className="flex items-center gap-1 bg-white/75 rounded-xl border border-white/90 px-3 py-1.5 focus-within:border-blue-400 shadow-[inset_0_1px_0_rgba(255,255,255,.9)]">
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
                className="w-full text-xs sm:text-sm font-bold text-amber-950 outline-none font-mono bg-white"
              />
            </div>
            <p className="text-[11px] text-stone-600">
              Liga final de acceso: <span className="font-mono font-bold text-amber-900">https://encarmen.org/{formData.slug || 'enlace'}</span>
            </p>
            {safePreviousSlugs.length > 0 && (
              <p className="text-[10px] text-amber-700/80">
                Enlaces anteriores activos: {safePreviousSlugs.map(s => `encarmen.org/${s}`).join(', ')} (redirigen automáticamente a este perfil)
              </p>
            )}
          </div>

          {/* Badges Toggles */}
          <div className="encarmen-privileged-panel p-3 rounded-2xl bg-white/30 backdrop-blur-xl border border-white/75 flex flex-wrap items-center gap-4 shadow-[inset_0_1px_0_rgba(255,255,255,.75)]">
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

          </section>}
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
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-800 focus:border-amber-500 outline-none bg-white"
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
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-800 focus:border-amber-500 outline-none bg-white"
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
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-800 focus:border-amber-500 outline-none bg-white"
              />
            </div>
          </div>

          {/* Image Upload / URL */}
          <section className="encarmen-photo-glass rounded-[18px] border border-white/75 bg-white/25 backdrop-blur-xl p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.85),0_8px_22px_rgba(80,112,155,.10)]">
          <div className="encarmen-section-heading"><span className="encarmen-section-icon encarmen-blue"><Upload size={19}/></span><span><strong>Fotografías de tu Negocio</strong><small>Personaliza tu imagen y galería</small></span></div>
          <div className="space-y-2 py-3 border-b border-white/70" aria-label="Logotipo independiente">
            <strong className="text-xs text-stone-700">Logotipo de la empresa</strong>
            <p role="status" className="text-[11px] text-stone-600">{!logoAllowed?'Edición no disponible: requiere una sesión verificada por el servidor.':logoUploading?'Cargando logotipo…':logoDirty?'Logotipo en borrador. Guarda cambios para conservarlo.':'El logotipo es independiente de la portada y la galería.'}</p>
            <div className="flex items-center gap-3"><div className="w-16 h-16 border border-white/80 rounded-xl bg-white/60 overflow-hidden flex items-center justify-center">{safeCompanyLogo(formData.logo_url)&&!logoPreviewFailed?<img src={safeCompanyLogo(formData.logo_url)} alt="Logotipo de la empresa" className="w-full h-full object-contain" onError={()=>setLogoPreviewFailed(true)}/>:<Building2 aria-label="Sin vista previa de logotipo" className="w-7 h-7 text-stone-400"/>}</div>
              <div className="space-y-2"><label className="inline-flex gap-2 items-center px-3 py-2 rounded-xl bg-white/50 border border-white/80 text-xs font-bold"><Upload size={14}/>{formData.logo_url?'Cambiar logotipo':'Subir logotipo'}<input aria-label="Archivo de logotipo" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={!logoAllowed||logoUploading||isSaving} onChange={handleCompanyLogoUpload}/></label>
              <button type="button" className="block px-3 py-2 rounded-xl bg-white/50 border border-white/80 text-rose-700 text-xs disabled:opacity-50" disabled={!logoAllowed||logoUploading||isSaving||!formData.logo_url} onClick={()=>{logoDraftId.current=business.id;setFormData(prev=>({...prev,logo_url:''}));setLogoDirty(true);}}>Quitar logotipo</button></div>
            </div>
          </div>
          <div className="space-y-1 pt-1">
            <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
              <span>Fotografía de portada</span>
              {isUploadingPhoto && <span className="text-[10px] text-amber-600 animate-pulse">Subiendo...</span>}
            </label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-14 rounded-xl bg-white/45 border border-white/80 overflow-hidden shrink-0 flex items-center justify-center shadow-[0_4px_12px_rgba(35,85,145,.14)]">
                {formData.image ? (
                  <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-6 h-6 text-stone-300" />
                )}
              </div>
              <div className="grow space-y-1.5">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/45 border border-white/80 hover:bg-white/75 text-slate-800 text-xs font-bold cursor-pointer backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,.8)] transition-colors">
                  <Upload className="w-3.5 h-3.5 text-stone-600" />
                  <span>{formData.image ? 'Cambiar foto desde tu dispositivo' : 'Subir foto desde tu dispositivo'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
                {formData.image && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                    disabled={isUploadingPhoto}
                    aria-label="Quitar fotografía de portada"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/45 border border-rose-200/80 hover:bg-rose-50/80 text-rose-700 text-xs font-bold cursor-pointer backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,.8)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
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
              <span className="text-[10px] font-bold text-blue-700 bg-white/55 border border-white/75 px-2 py-0.5 rounded-full backdrop-blur-lg">
                {(Array.isArray(formData.gallery) ? formData.gallery : []).length} de 10
              </span>
            </div>

            {/* Upload button */}
            {((Array.isArray(formData.gallery) ? formData.gallery : []).length < 10) && (
              <div>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/85 bg-white/40 hover:bg-white/70 text-blue-700 text-xs font-bold cursor-pointer backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,.8)] transition-colors">
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isUploadingGallery ? 'Subiendo fotos...' : '+ Agregar fotos de trabajos (múltiples)'}</span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleGalleryUpload} disabled={isUploadingGallery} />
                </label>
              </div>
            )}

            {/* Gallery Thumbnails: Renders ONLY existing photos, NO empty placeholders */}
            {Array.isArray(formData.gallery) && formData.gallery.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pt-1">
                {formData.gallery.map((photo, idx) => (
                  <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden bg-white/35 border border-white/80 shadow-[0_5px_15px_rgba(35,75,130,.15)]">
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
          </section>

          </details>
          </div>
          {/* Submit Toolbar */}
          {errorMsg && (
            <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}
          <div className="encarmen-glass-footer shrink-0 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/65 bg-white/35 hover:bg-white/60 active:scale-95 text-slate-800 text-[11px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,.65)] backdrop-blur-xl transition-all cursor-pointer"
            >
              <X size={13} className="inline-block mr-1.5 align-[-2px]" />Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl border border-blue-400/60 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 active:scale-95 text-white font-bold text-[11px] shadow-[0_5px_15px_rgba(27,106,234,.28),inset_0_1px_0_rgba(255,255,255,.3)] transition-all cursor-pointer disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-1.5"><Save size={14} />{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
        </ModalErrorBoundary>
      </div>
    </div>
  );
};

