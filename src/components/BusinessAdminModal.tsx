import {adminFetch} from '../utils/adminAuth';
import { contactDigits } from '../utils/businessContacts';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Globe,
  Database,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  Clock,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Building2,
  ArrowUpRight,
  ArrowRight,
  Phone,
  MessageCircle,
  Sparkles,
  MapPin,
  Trash2,
  Edit2,
  Check,
  Ban,
  BarChart3,
  MousePointerClick,
  TrendingUp,
  Activity,
  Users,
  PlusCircle,
  Upload,
  AlertCircle,
  Tag,
  LogOut,
  Gift,
  Minus,
  Square,
  LayoutGrid,
  ChevronRight,
  HardDrive,
  UserCheck,
  Shield,
  Calendar,
  ShieldAlert,
  Download,
  Image as ImageIcon,
  Bug,
  FileCode,
  Wifi,
  Battery,
  Sliders,
  Monitor,
  ChevronLeft
} from 'lucide-react';
import {
  isSessionAdminAuthenticated,
  verifyAdminSession,
  saveAdminAuth,
  clearAdminAuth,
  getAdminSessionTimeRemaining,
  fetchAdminAccounts,
  loginAdminUser,
  getLoggedInAdminName,
  DEFAULT_ADMIN_ACCOUNTS,
  AdminAccountInfo
} from '../utils/adminAuth';
import { DirectoryStats, WpHealth, Business, BusinessReport, SiteAnalytics, BusinessSubmission, ClassifiedAd } from '../types';
import { AdminClassifiedsTab } from './AdminClassifiedsTab';
import { AdminPromotionsTab } from './AdminPromotionsTab';
import { AdminBusinessesTab } from './AdminBusinessesTab';
import { AdminMacOSDesktop } from './AdminMacOSDesktop';
import { AdminMacOSDock } from './AdminMacOSDock';
import { AdminIOSMobileHub } from './AdminIOSMobileHub';
import { AdminIOSBottomBar } from './AdminIOSBottomBar';
import { AdminDetailedAnalytics } from './AdminDetailedAnalytics';
import { AdminEmergencyTab } from './AdminEmergencyTab';
import { AdminEventsTab } from './AdminEventsTab';
import { AdminAccountsManagerTab } from './AdminAccountsManagerTab';
import { AdminBrandMediaTab } from './AdminBrandMediaTab';
import { AdminDesiredChangesTab } from './AdminDesiredChangesTab';
import { AdminConfigEditorTab } from './AdminConfigEditorTab';
import { AdminMaintenanceTab } from './AdminMaintenanceTab';
import { AdminLinksTab, AdminPublicidadTab } from './AdminLinksAndAdsManager';
import ALL_COLONIAS_CARMEN from '../data/colonias_carmen.json';
import { cleanPhoneNumber } from '../utils/phone';
import { DELIVERY_OPTIONS, normalizeDeliveryOption } from '../constants/delivery';
import {
  fetchReports,
  updateReportStatus,
  deleteReport,
  adminUpdateBusiness,
  adminDeleteBusiness,
  fetchAnalytics,
  submitAdministrativeBusinessRegistration,
  checkBusinessDuplicate,
  getPromotions
} from '../services/api';
import { getEventsData, fetchEventsFromAPI } from '../services/eventsService';
import { uploadRegistrationImage, MEDIA_MAX_GALLERY } from '../services/publicMediaClient';

interface BusinessAdminModalProps {
  classifieds?: ClassifiedAd[];
  onOpenCreateClassified?: () => void;
  onOpenEditClassified?: (ad: ClassifiedAd) => void;
  onDeleteClassified?: (adId: string) => Promise<boolean>;
  onOpenDetailClassified?: (ad: ClassifiedAd) => void;
  onRefreshClassifieds?: () => void;
  isOpen: boolean;
  onClose: () => void;
  stats: DirectoryStats | null;
  health: WpHealth | null;
  businesses?: Business[];
  onTriggerSync: () => Promise<void>;
  isSyncing: boolean;
  syncResultMsg: string | null;
  onBusinessUpdated?: () => Promise<void>;
  onNavigateToRegister?: () => void;
  categories?: (import('../types').Category & { subcategories?: import('../types').Category[] })[];
  coloniasList?: { name: string; count: number }[];
  onBusinessAdded?: (newBiz: Business) => void;
  onSelectBusiness?: (biz: Business) => void;
  onEditBusiness?: (biz: Business) => void;
  onToggleTop?: (biz: Business) => void;
  onToggleRecommended?: (biz: Business) => void;
  onDeleteBusiness?: (biz: Business) => void;
  initialTab?: 'start' | 'businesses' | 'ai_assistant' | 'analytics' | 'reports' | 'classifieds' | 'new_business' | 'promotions' | 'status' | 'emergency' | 'events' | 'admins' | 'brand_media' | 'links' | 'publicidad';
}

export const BusinessAdminModal: React.FC<BusinessAdminModalProps> = ({
  isOpen,
  onClose,
  stats,
  health,
  businesses = [],
  onTriggerSync,
  isSyncing,
  syncResultMsg,
  onBusinessUpdated,
  onNavigateToRegister,
  categories = [],
  coloniasList = [],
  onBusinessAdded,
  classifieds = [],
  onOpenCreateClassified,
  onOpenEditClassified,
  onDeleteClassified,
  onOpenDetailClassified,
  onRefreshClassifieds,
  onSelectBusiness,
  onEditBusiness,
  onToggleTop,
  onToggleRecommended,
  onDeleteBusiness,
  initialTab
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => isSessionAdminAuthenticated());
  const [adminAccounts, setAdminAccounts] = useState<AdminAccountInfo[]>(DEFAULT_ADMIN_ACCOUNTS);
  const [adminUsernameInput,setAdminUsernameInput]=useState('');
  const [selectedAdminUser, setSelectedAdminUser] = useState<AdminAccountInfo | null>(null);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'start' | 'businesses' | 'ai_assistant' | 'analytics' | 'reports' | 'classifieds' | 'new_business' | 'promotions' | 'status' | 'emergency' | 'events' | 'admins' | 'brand_media' | 'desired_changes' | 'config_editor' | 'maintenance' | 'links' | 'publicidad'>('start');
  const [currentTime, setCurrentTime] = useState(() => {
    const d = new Date();
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  });
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  });
  const [isWindowMaximized, setIsWindowMaximized] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openMenuDropdown, setOpenMenuDropdown] = useState<string | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    return isMobileUA || window.innerWidth < 768;
  });

  useEffect(() => {
    const handleResize = () => {
      const ua = navigator.userAgent || '';
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      setIsMobileDevice(isMobileUA || window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      setIsAuthenticated(isSessionAdminAuthenticated());
      void verifyAdminSession().then(valid=>{
        setIsAuthenticated(valid);
        if(valid)void fetchAdminAccounts().then(accs=>{if(accs.length)setAdminAccounts(accs);});
      });
    }
  }, [isOpen, initialTab]);
  useEffect(()=>{
    const refresh=()=>setIsAuthenticated(isSessionAdminAuthenticated());
    window.addEventListener('admin-auth-changed',refresh);
    return ()=>window.removeEventListener('admin-auth-changed',refresh);
  },[]);

  const fullColoniasList = useMemo(() => {
    const set = new Set<string>();
    for (const c of coloniasList) {
      if (c.name) set.add(c.name);
    }
    for (const name of ALL_COLONIAS_CARMEN) {
      set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [coloniasList]);

  // Analytics state
  const [analytics, setAnalytics] = useState<SiteAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsSearchQuery, setAnalyticsSearchQuery] = useState('');

  // Reports state
  const [reports, setReports] = useState<BusinessReport[]>([]);
  const [directBizSearch, setDirectBizSearch] = useState('');
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const reportsRequestVersion = useRef(0);

  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [businessToDelete, setBusinessToDelete] = useState<{ id: number; name: string; reportId?: string } | null>(null);

  // Promotions and Events count state
  const [promotionsCount, setPromotionsCount] = useState<number>(0);
  const [eventsCount, setEventsCount] = useState<number>(() => getEventsData().length);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      getPromotions().then(res => {
        if (res && res.success) {
          setPromotionsCount(res.count || res.promotions?.length || 0);
        }
      }).catch(() => {});

      fetchEventsFromAPI().then(evts => {
        if (Array.isArray(evts)) {
          setEventsCount(evts.length);
        }
      }).catch(() => {});
    }
  }, [isOpen, isAuthenticated]);

  // MariaDB & Persistence Status State
  const [dbStatus, setDbStatus] = useState<{
    activeEngine?: string;
    mariadb?: { connected: boolean; configured: boolean; host: string | null; database: string | null; user: string | null; lastError?: string | null };
    firestore?: { connected: boolean };
    businessesCount?: number;
  } | null>(null);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbTestMessage, setDbTestMessage] = useState<string | null>(null);

  const loadDbStatus = async () => {
    try {
      const res = await adminFetch('/api/database-status');
      const data = await res.json();
      if (data.success) {
        setDbStatus(data);
      }
    } catch (_) {}
  };

  const [isSyncingDbCatalog, setIsSyncingDbCatalog] = useState(false);

  const [aiStatus, setAiStatus] = useState<any>(null);
  const [aiInputText, setAiInputText] = useState('');
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  const loadAiStatus = async () => {
    try {
      const res = await adminFetch('/api/ai/status');
      const data = await res.json();
      setAiStatus(data);
    } catch (_) {}
  };

  const handleReconnectDb = async () => {
    setIsTestingDb(true);
    setDbTestMessage(null);
    try {
      const res = await adminFetch('/api/mariadb/reconnect', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setDbTestMessage('¡Conexión exitosa y activa a Hostinger MariaDB!');
      } else {
        setDbTestMessage(data.error || data.message || 'No se pudo conectar.');
      }
      loadDbStatus();
    } catch (e: any) {
      setDbTestMessage('Error de red: ' + e.message);
    } finally {
      setIsTestingDb(false);
    }
  };

  const handleSyncCatalogToMariaDb = async () => {
    setIsSyncingDbCatalog(true);
    setDbTestMessage(null);
    try {
      const res = await adminFetch('/api/mariadb/sync-catalog', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setDbTestMessage(data.message || '¡Catálogo de empresas sincronizado con éxito en Hostinger MariaDB!');
      } else {
        setDbTestMessage(data.error || data.message || 'Error sincronizando.');
      }
      loadDbStatus();
    } catch (e: any) {
      setDbTestMessage('Error de red: ' + e.message);
    } finally {
      setIsSyncingDbCatalog(false);
    }
  };

  const handleAnalyzeWithAi = async () => {
    if (!aiInputText.trim()) {
      setAiError('Por favor pega el texto o publicación del comercio que deseas analizar.');
      return;
    }
    setIsAnalyzingAi(true);
    setAiError(null);
    setAiSuccessMsg(null);
    try {
      const res = await adminFetch('/api/ai/parse-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiInputText })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.quotaExhausted || res.status === 429) {
          setAiError('⚠️ Las llamadas gratuitas de la API de Gemini se han agotado por hoy (límite de cuota diaria alcanzado). El servicio gratuito de Google se restablecerá automáticamente mañana.');
        } else {
          setAiError(data.message || 'Error al procesar el texto con Gemini.');
        }
        return;
      }

      if (data.success && data.business) {
        const b = data.business;
        setNewBizForm(prev => ({
          ...prev,
          name: b.name || prev.name,
          description: b.description || prev.description,
          phone: b.phone || prev.phone,
          whatsapp: b.whatsapp || prev.whatsapp || b.phone || '',
          address: b.address || prev.address,
          colonia: b.colonia || prev.colonia,
          schedule: b.schedule || prev.schedule,
          category: b.category || prev.category,
          delivery: b.deliveryOption || prev.delivery,
          payment: b.payment || prev.payment
        }));
        setAiSuccessMsg('¡Datos analizados con éxito! Transfiriendo la información estructurada al formulario de alta...');
        setTimeout(() => {
          setActiveTab('new_business');
        }, 1200);
      }
    } catch (e: any) {
      setAiError('Error de red al consultar el asistente: ' + e.message);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDbStatus();
      loadAiStatus();
    }
  }, [isOpen, activeTab]);

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'ai_assistant': return 'Asistente IA (Alta Rápida)';
      case 'analytics': return 'Alcance & Métricas';
      case 'reports': return 'Reportes Ciudadanos';
      case 'classifieds': return 'Clasificados & Empleos';
      case 'new_business': return 'Nueva Compañía';
      case 'promotions': return 'Promociones & Cupones';
      case 'emergency': return 'Guía de Emergencias 24/7';
      case 'events': return 'Cartelera Carmelita de Eventos';
      case 'brand_media': return 'Banner Panorámico y Logo Oficial';
      case 'admins': return 'Administradores & Claves de Acceso';
      case 'desired_changes': return 'Cambios Deseados y Fallas del Portal';
      case 'config_editor': return 'Archivo de Configuración en Vivo';
      case 'maintenance': return 'Modo Mantenimiento y Desactivación del Portal';
      case 'links': return 'Canales Oficiales y WhatsApp';
      case 'publicidad': return 'Publicidad y Banners';
      case 'status': return 'Conexión & Sincronización';
      default: return 'Inicio';
    }
  };

  // Editing state for a specific business triggered from a report
  const [editingBizId, setEditingBizId] = useState<number | null>(null);
  const [editWaInput, setEditWaInput] = useState('');
  const [editAddressInput, setEditAddressInput] = useState('');
  const [editPhoneInput, setEditPhoneInput] = useState('');
  const [isSavingBiz, setIsSavingBiz] = useState(false);

  // New Company (Admin Quick Add) state
  const [newBizForm, setNewBizForm] = useState<BusinessSubmission>({
    name: '',
    category: '',
    description: '',
    phone: '',
    whatsapp: '',
    address: '',
    colonia: '',
    schedule: '',
    payment: '',
    delivery: '',
    facebook: '',
    website: '',
    image: '',
    cover_url: '',
    ownerName: 'Administrador',
    ownerEmail: 'admin@empresasencarmen.com'
  });
  const [isSubmittingNewBiz, setIsSubmittingNewBiz] = useState(false);
  const createRequestId = useRef<string | null>(null);
  const createBusy = useRef(false);
  const inlineContactStart = useRef({phone:'',whatsapp:'',address:''});
  const [newBizSuccessMsg, setNewBizSuccessMsg] = useState<string | null>(null);
  const [newBizErrorMsg, setNewBizErrorMsg] = useState<string | null>(null);
  const [newBizLogoPreview, setNewBizLogoPreview] = useState<string | null>(null);
  const [isUploadingNewBizLogo, setIsUploadingNewBizLogo] = useState(false);
  const [newBizCoverPreview, setNewBizCoverPreview] = useState<string | null>(null);
  const [isUploadingNewBizCover, setIsUploadingNewBizCover] = useState(false);
  const newBizMediaAttempt = useRef<string | null>(null);
  const newBizPendingUploads = useRef(0);
  const newBizReservedGallery = useRef(0);
  const ensureNewBizMediaAttempt = () => (newBizMediaAttempt.current ||= crypto.randomUUID());
  const [newBizDuplicateWarning, setNewBizDuplicateWarning] = useState<any>(null);
  const [newBizGallery, setNewBizGallery] = useState<string[]>([]);
  const [isUploadingNewBizGallery, setIsUploadingNewBizGallery] = useState(false);

  // Latest 10 registered businesses sorted reverse-chronologically (newest first)
  const latest10Businesses = useMemo(() => {
    return [...businesses]
      .sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          const tA = new Date(a.createdAt).getTime();
          const tB = new Date(b.createdAt).getTime();
          if (!isNaN(tA) && !isNaN(tB) && tB !== tA) {
            return tB - tA;
          }
        }
        const idA = Number(a.id) || 0;
        const idB = Number(b.id) || 0;
        if (idA !== idB) return idB - idA;
        return 0;
      })
      .slice(0, 10);
  }, [businesses]);

  // Each upload is acknowledged only after the server verifies its MariaDB BLOB.
  // Keep the same registration attempt across logo, cover and up to ten gallery images.
  const handleAdminGalleryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    const remaining = MEDIA_MAX_GALLERY - newBizGallery.length - newBizReservedGallery.current;
    if (remaining <= 0) { setNewBizErrorMsg('Máximo 10 fotografías por empresa.'); return; }
    const selected = files.slice(0, remaining);
    newBizReservedGallery.current += selected.length;
    newBizPendingUploads.current++;
    setIsUploadingNewBizGallery(true);
    setNewBizErrorMsg(null);
    try {
      for (const file of selected) {
        try {
          const uploaded = await uploadRegistrationImage(file, 'gallery', ensureNewBizMediaAttempt());
          setNewBizGallery(prev => prev.length < MEDIA_MAX_GALLERY && !prev.includes(uploaded.url) ? [...prev, uploaded.url] : prev);
        } catch (error) {
          setNewBizErrorMsg(error instanceof Error ? error.message : 'No se confirmó la foto de producto.');
        } finally { newBizReservedGallery.current--; }
      }
    } finally {
      newBizPendingUploads.current--;
      setIsUploadingNewBizGallery(newBizPendingUploads.current > 0);
    }
  };

  const handleAdminRemoveGalleryPhoto = (index: number) => {
    if (newBizPendingUploads.current) return;
    setNewBizGallery(prev => prev.filter((_, i) => i !== index));
  };

  const handleAdminLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    newBizPendingUploads.current++;
    setIsUploadingNewBizLogo(true);
    setNewBizErrorMsg(null);
    try {
      const uploaded = await uploadRegistrationImage(file, 'logo', ensureNewBizMediaAttempt());
      setNewBizLogoPreview(uploaded.url);
      setNewBizForm(prev => ({...prev, image: uploaded.url, logo_url: uploaded.url}));
    } catch (error) {
      setNewBizErrorMsg(error instanceof Error ? error.message : 'No se confirmó el logotipo.');
    } finally {
      newBizPendingUploads.current--;
      setIsUploadingNewBizLogo(false);
    }
  };

  const handleAdminCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    newBizPendingUploads.current++;
    setIsUploadingNewBizCover(true);
    setNewBizErrorMsg(null);
    try {
      const uploaded = await uploadRegistrationImage(file, 'cover', ensureNewBizMediaAttempt());
      setNewBizCoverPreview(uploaded.url);
      setNewBizForm(prev => ({...prev, cover_url: uploaded.url}));
    } catch (error) {
      setNewBizErrorMsg(error instanceof Error ? error.message : 'No se confirmó la fachada.');
    } finally {
      newBizPendingUploads.current--;
      setIsUploadingNewBizCover(false);
    }
  };

  const handleAdminCreateBusiness = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if(createBusy.current) return;
    if (newBizPendingUploads.current > 0 || isUploadingNewBizLogo || isUploadingNewBizCover || isUploadingNewBizGallery) {
      setNewBizErrorMsg('Espera a que terminen de guardarse las imágenes antes de registrar la empresa.');
      return;
    }
    setNewBizErrorMsg(null);
    setNewBizSuccessMsg(null);

    if (!newBizForm.name.trim()) {
      setNewBizErrorMsg('Por favor ingresa el nombre de la empresa.');
      return;
    }
    if (!newBizForm.category) {
      setNewBizErrorMsg('Por favor selecciona una categoría.');
      return;
    }
    if (!contactDigits(newBizForm.phone) && !contactDigits(newBizForm.whatsapp)) {
      setNewBizErrorMsg('Por favor ingresa un teléfono o WhatsApp.');
      return;
    }

    createBusy.current = true;
    setIsSubmittingNewBiz(true);
    try {
    {
      const dupCheck = await checkBusinessDuplicate(newBizForm.name.trim(), newBizForm.phone.trim());
      if (dupCheck.isDuplicate && dupCheck.existingBusiness) {
        setNewBizDuplicateWarning({
          detected: true,
          reason: dupCheck.reason,
          existingBusiness: dupCheck.existingBusiness
        });
        return;
      }
    }

      const cleanP = contactDigits(newBizForm.phone);
      const cleanW = contactDigits(newBizForm.whatsapp);
      if((newBizForm.phone.trim()&&!cleanP)||(newBizForm.whatsapp.trim()&&!cleanW))throw new Error('Contacto mexicano inválido.');
      createRequestId.current ||= crypto.randomUUID();
      const {ownerName,ownerEmail,...businessData} = newBizForm;
      const cleanDelivery = normalizeDeliveryOption(newBizForm.delivery);
      const res = await submitAdministrativeBusinessRegistration({
        ...businessData,
        phone: cleanP,
        whatsapp: cleanW,
        delivery: cleanDelivery,
        gallery: newBizGallery
      }, createRequestId.current);

      if (res.success) {
        setNewBizDuplicateWarning(null);
        setNewBizSuccessMsg(`¡Empresa "${newBizForm.name}" dada de alta exitosamente! Ya está activa en el directorio.`);
        if (res.business && onBusinessAdded) {
          onBusinessAdded(res.business);
        }
        if (onBusinessUpdated) {
          await onBusinessUpdated();
        }
        // Reset form
        setNewBizForm({
          name: '',
          category: '',
          description: '',
          phone: '',
          whatsapp: '',
          address: '',
          colonia: '',
          schedule: '',
          payment: '',
          delivery: '',
          facebook: '',
          website: '',
          image: '',
          cover_url: '',
          ownerName: 'Administrador',
          ownerEmail: 'admin@empresasencarmen.com'
        });
        setNewBizLogoPreview(null);
        setNewBizCoverPreview(null);
        setNewBizGallery([]);
        newBizMediaAttempt.current = null;
        newBizReservedGallery.current = 0;
        createRequestId.current = null;
      } else if (res.isDuplicate) {
        setNewBizDuplicateWarning({
          detected: true,
          existingBusiness: res.existingBusiness
        });
        setNewBizErrorMsg(res.message);
      } else {
        setNewBizErrorMsg(res.message || 'Error al dar de alta la empresa.');
      }
    } catch (err: any) {
      setNewBizErrorMsg(err.message || 'Error de conexión.');
    } finally {
      createBusy.current = false;
      setIsSubmittingNewBiz(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isOpen) {
      loadReportsData();
      loadAnalyticsData();
    }
  }, [isAuthenticated,isOpen]);

  const loadAnalyticsData = async () => {
    setLoadingAnalytics(true);
    try {
      const data = await fetchAnalytics();
      setAnalytics(data);
    } catch {
      // Ignore
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const loadReportsData = async () => {
    const version=++reportsRequestVersion.current;
    setLoadingReports(true);setReports([]);setReportsError(null);
    try {
      const res = await fetchReports();
      if(version!==reportsRequestVersion.current)return;
      if(res.status==='ready')setReports(res.reports);
      else setReportsError(res.message);
    } catch {
      if(version===reportsRequestVersion.current)setReportsError('No se pudieron consultar los reportes del servidor.');
    } finally {
      if(version===reportsRequestVersion.current)setLoadingReports(false);
    }
  };

  useEffect(()=>{
    if(!isAuthenticated || !isOpen){reportsRequestVersion.current++;setReports([]);setLoadingReports(false);setReportsError(null);}
    return ()=>{reportsRequestVersion.current++;};
  },[isAuthenticated,isOpen]);

  if (!isOpen) return null;

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const username=adminUsernameInput.trim() || selectedAdminUser?.username;
    if (!username) {setAdminLoginError('Ingresa el usuario configurado en el servidor.');return;}
    if (!adminPasswordInput.trim()) {
      setAdminLoginError('Ingresa la contraseña');
      return;
    }

    try {
      setIsLoggingIn(true);
      setAdminLoginError(null);
      const res = await loginAdminUser(username, adminPasswordInput);
      if (res.success) {
        setIsAuthenticated(true);
        setAdminPasswordInput('');
        setAdminLoginError(null);
        setSelectedAdminUser(null);
      } else {
        setAdminLoginError(res.error || 'Contraseña incorrecta. Intenta de nuevo.');
      }
    } catch (err: any) {
      setAdminLoginError(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleModalClose = () => {
    setAdminPasswordInput('');
    setAdminLoginError(null);
    setSelectedAdminUser(null);
    setEditingBizId(null);
    onClose();
  };

  const handleLogout = () => {
    clearAdminAuth();
    setIsAuthenticated(false);
    setAdminPasswordInput('');
    setAdminLoginError(null);
    setSelectedAdminUser(null);
    setEditingBizId(null);
    onClose();
  };

  // Acción 1: Cambiar WhatsApp o Dirección de un negocio directamente
  const handleStartEdit = (report: BusinessReport) => {
    const biz = businesses.find(b => b.id === report.businessId);
    setEditingBizId(report.businessId !== undefined ? report.businessId : null);
    const initial={whatsapp:contactDigits(biz?.whatsapp),phone:contactDigits(biz?.phone),address:biz?.address || ''};
    inlineContactStart.current = initial;
    setEditWaInput(initial.whatsapp);
    setEditPhoneInput(initial.phone);
    setEditAddressInput(initial.address);
  };

  const handleSaveBusinessEdits = async (bizId: number, reportId?: string) => {
    setIsSavingBiz(true);
    try {
      const patch: Partial<Business> = {};
      if(editWaInput!==inlineContactStart.current.whatsapp)patch.whatsapp=editWaInput;
      if(editPhoneInput!==inlineContactStart.current.phone)patch.phone=editPhoneInput;
      if(editAddressInput!==inlineContactStart.current.address)patch.address=editAddressInput;
      const res = await adminUpdateBusiness(bizId, patch);

      if (res.success) {
        setActionSuccessMsg('¡Datos del negocio actualizados con éxito en el directorio!');
        if (reportId) {
          await updateReportStatus(reportId, 'resolved');
          await loadReportsData();
        }
        if (onBusinessUpdated) await onBusinessUpdated();
        setTimeout(() => setActionSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      alert('Error al actualizar negocio: ' + err.message);
    } finally {
      setIsSavingBiz(false);
      setEditingBizId(null);
    }
  };

  // Acción 2: Dar de baja el negocio directamente
  const handleDeleteBusiness = async (bizId: number, bizName: string, reportId?: string) => {
    setBusinessToDelete({ id: bizId, name: bizName, reportId });
  };

  const executeConfirmedDeleteBusiness = async () => {
    if (!businessToDelete) return;
    const { id: bizId, name: bizName, reportId } = businessToDelete;
    setBusinessToDelete(null);

    try {
      const res = await adminDeleteBusiness(bizId);
      if (res.success) {
        setActionSuccessMsg(`Negocio "${bizName}" eliminado de MariaDB y del directorio.`);
        if (reportId) {
          await updateReportStatus(reportId, 'resolved');
          await loadReportsData();
        }
        if (onBusinessUpdated) await onBusinessUpdated();
        if (onDeleteBusiness) {
          const found = businesses.find(b => b.id === bizId);
          if (found) onDeleteBusiness(found);
        }
        setTimeout(() => setActionSuccessMsg(null), 3000);
      } else {
        setActionSuccessMsg('No se confirmó la eliminación: ' + (res.message || 'El servidor rechazó la operación.'));
      }
    } catch (err: any) {
      setActionSuccessMsg('Error al dar de baja el negocio: ' + (err.message || 'Error'));
    }
  };

  // Acción 3: Descartar o eliminar un reporte
  const handleDismissReport = async (reportId: string) => {
    const confirmed = await updateReportStatus(reportId, 'dismissed');
    if (!confirmed) {
      window.alert('No se confirmó el cambio de estado del reporte en el servidor.');
      return;
    }
    await loadReportsData();
  };

  const handleDeleteReport = async (reportId: string) => {
    const confirmed = await deleteReport(reportId);
    if (!confirmed) {
      window.alert('No se confirmó la eliminación del reporte en el servidor.');
      return;
    }
    await loadReportsData();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 w-screen h-screen flex flex-col bg-[#001026] text-white select-none overflow-hidden font-sans"
      onClick={e => e.stopPropagation()}
    >
      {!isAuthenticated ? (
        <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 relative overflow-hidden select-none">
          {/* Fondo luminoso del Puente Zacatal al atardecer sin capa negra */}
          <div
            className="absolute inset-0 bg-cover bg-center pointer-events-none"
            style={{ backgroundImage: "url('/puente.jpg')" }}
          />
          <div className="absolute inset-0 bg-black/10 pointer-events-none" />

          {/* Contenedor central: Reloj arriba + Tarjeta Frosted Light Glass */}
          <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center text-center space-y-5">
            {/* Reloj grande blanco estilo macOS Lock Screen */}
            <div className="space-y-0.5">
              <div className="text-6xl sm:text-7xl font-bold text-white tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.35)]">
                {currentTime}
              </div>
              <div className="text-sm sm:text-base font-medium text-white/95 capitalize drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
                {currentDate}
              </div>
            </div>

            {/* Tarjeta Central en Cristal Blanco Translúcido */}
            <div
              className="w-full rounded-[2rem] p-6 sm:p-8 space-y-5 border border-white/80 shadow-[0_25px_60px_rgba(0,0,0,0.32)]"
              style={{
                background: 'rgba(255, 255, 255, 0.68)',
                backdropFilter: 'blur(28px) saturate(180%)',
                WebkitBackdropFilter: 'blur(28px) saturate(180%)',
              }}
            >
              <div className="space-y-1">
                <div className="text-xs font-semibold text-stone-600 flex items-center justify-center gap-1">
                  <span></span>
                  <span>Empresas en Carmen OS</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-stone-800 tracking-tight">
                  Iniciar Sesión · Administración
                </h3>
              </div>

              {/* Avatares Y (Yuss · Admin) y J (Jeo · Admin) siempre visibles */}
              <div className="flex items-center justify-center gap-8 sm:gap-10 py-1">
                {adminAccounts.map((account) => {
                  const activeUser = selectedAdminUser || adminAccounts[1] || adminAccounts[0];
                  const isSelected = activeUser?.username === account.username;
                  const isY = account.initial.toUpperCase() === 'Y';
                  return (
                    <button
                      key={account.username}
                      type="button"
                      onClick={() => {
                        setSelectedAdminUser(account);
                        setAdminUsernameInput(account.username);
                        setAdminLoginError(null);
                      }}
                      className="group flex flex-col items-center gap-2 cursor-pointer transition-transform duration-200 hover:scale-105"
                    >
                      <div
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-semibold text-white transition-all ${
                          isY
                            ? 'bg-gradient-to-b from-purple-400 to-violet-600'
                            : 'bg-gradient-to-b from-sky-300 to-blue-600'
                        } ${
                          isSelected
                            ? 'ring-4 ring-sky-300 shadow-[0_0_25px_rgba(56,189,248,0.9)] scale-105'
                            : 'opacity-85 hover:opacity-100 ring-2 ring-white/70 shadow-md'
                        }`}
                      >
                        {account.initial}
                      </div>
                      <span className="text-xs font-bold text-stone-800">
                        {isY ? 'Yuss · Admin' : 'Jeo · Admin'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Barra de Contraseña en Cápsula Clara */}
              <form
                onSubmit={(e) => {
                  if (!selectedAdminUser) {
                    setSelectedAdminUser(adminAccounts[1] || adminAccounts[0]);
                  }
                  handleAdminLoginSubmit(e);
                }}
                className="space-y-2.5"
              >
                <input
                  type="text"
                  autoComplete="username"
                  aria-label="Usuario administrativo"
                  placeholder="Usuario configurado"
                  value={adminUsernameInput}
                  onChange={e => {
                    setAdminUsernameInput(e.target.value);
                    if (adminLoginError) setAdminLoginError(null);
                  }}
                  className="block w-full max-w-xs mx-auto py-2.5 px-4 rounded-full bg-white/95 border border-stone-300 text-sm font-medium text-stone-900 placeholder:text-stone-500 caret-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  style={{ color: '#1c1917', WebkitTextFillColor: '#1c1917' }}
                />
                <div className="relative flex items-center max-w-xs mx-auto">
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    aria-label="Contraseña de administrador"
                    autoComplete="current-password"
                    minLength={10}
                    maxLength={200}
                    autoFocus
                    placeholder="Contraseña de administrador..."
                    value={adminPasswordInput}
                    onChange={(e) => {
                      if (!selectedAdminUser) {
                        setSelectedAdminUser(adminAccounts[1] || adminAccounts[0]);
                      }
                      setAdminPasswordInput(e.target.value);
                      if (adminLoginError) setAdminLoginError(null);
                    }}
                    className="w-full py-2.5 pl-4 pr-20 rounded-full bg-white/95 border border-stone-300/90 text-xs sm:text-sm text-stone-900 placeholder:text-stone-500 caret-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(current => !current)}
                    aria-label={showAdminPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showAdminPassword}
                    title={showAdminPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-10 w-7 h-7 rounded-full text-stone-700 hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-sky-500 flex items-center justify-center"
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    title="Iniciar sesión"
                    className="absolute right-1.5 w-7 h-7 rounded-full bg-white hover:bg-sky-50 border border-stone-300 text-stone-700 flex items-center justify-center shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {adminLoginError && (
                  <p className="text-xs text-rose-600 font-bold flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{adminLoginError}</span>
                  </p>
                )}
              </form>

              {/* Botón Volver al directorio público */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-1.5 rounded-full bg-white/75 hover:bg-white border border-stone-300/90 text-[11px] font-semibold text-stone-700 shadow-2xs transition cursor-pointer"
                >
                  Volver al directorio público
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* macOS 27 Golden Gate Authenticated Admin Workspace */
        <div
          className="flex-1 flex flex-col min-h-0 bg-stone-100 text-stone-800 relative overflow-hidden font-sans select-none"
          onClick={() => setOpenMenuDropdown(null)}
        >
          {/* macOS 27 Golden Gate Top Menu Bar (Desktop Only) */}
          {!isMobileDevice && (
            <div className="h-8 bg-white/75 backdrop-blur-2xl border-b border-stone-200/80 px-3.5 flex items-center justify-between text-xs font-semibold text-stone-800 select-none z-40 shrink-0 shadow-2xs">
              {/* Left:  Apple Menu & App Title */}
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Apple Logo Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuDropdown(openMenuDropdown === 'apple' ? null : 'apple');
                    }}
                    className={`px-2 py-0.5 rounded hover:bg-stone-200/60 text-stone-800 transition-colors cursor-pointer text-base leading-none ${
                      openMenuDropdown === 'apple' ? 'bg-stone-200/70' : ''
                    }`}
                    title="Menú Apple"
                  >
                    
                  </button>
                  {openMenuDropdown === 'apple' && (
                    <div
                      className="absolute top-full left-0 mt-1 w-64 rounded-2xl bg-white/95 backdrop-blur-3xl border border-stone-200 shadow-2xl py-1 text-xs text-stone-800 z-50 animate-in fade-in zoom-in-95 duration-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-3.5 py-2 font-semibold text-stone-900 border-b border-stone-200">
                        Empresas en Carmen OS 27.2
                        <div className="text-[10px] text-amber-600 font-medium">Golden Gate Edition</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setOpenMenuDropdown(null); setActiveTab('config_editor'); }}
                        className="w-full text-left px-3.5 py-1.5 hover:bg-sky-50 text-stone-700 hover:text-sky-900 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span>Ajustes del Sistema...</span>
                        <span className="text-stone-400 text-[10px]">⌘,</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setOpenMenuDropdown(null); onTriggerSync(); }}
                        className="w-full text-left px-3.5 py-1.5 hover:bg-sky-50 text-stone-700 hover:text-sky-900 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span>Actualizar Catálogo Local</span>
                        <span className="text-stone-400 text-[10px]">⌘R</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setOpenMenuDropdown(null); setActiveTab('status'); }}
                        className="w-full text-left px-3.5 py-1.5 hover:bg-sky-50 text-stone-700 hover:text-sky-900 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span>Estado de MariaDB & Servidor</span>
                      </button>
                      <div className="my-1 border-t border-stone-200" />
                      <button
                        type="button"
                        onClick={() => { setOpenMenuDropdown(null); setActiveTab('start'); }}
                        className="w-full text-left px-3.5 py-1.5 hover:bg-sky-50 text-stone-700 hover:text-sky-900 transition-colors cursor-pointer"
                      >
                        Mostrar Escritorio
                      </button>
                      <button
                        type="button"
                        onClick={() => { setOpenMenuDropdown(null); handleLogout(); }}
                        className="w-full text-left px-3.5 py-1.5 hover:bg-rose-50 text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                      >
                        Cerrar Sesión de Administrador
                      </button>
                      <div className="my-1 border-t border-stone-200" />
                      <button
                        type="button"
                        onClick={() => { setOpenMenuDropdown(null); handleModalClose(); }}
                        className="w-full text-left px-3.5 py-1.5 hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                      >
                        Salir al Directorio Público
                      </button>
                    </div>
                  )}
                </div>

                {/* Bold Current App Name */}
                <span className="font-bold text-stone-900 tracking-tight">
                  {activeTab === 'start' ? 'Empresas en Carmen OS' : getTabTitle(activeTab)}
                </span>

                {/* Quick Navigation Dropdowns/Buttons */}
                <div className="hidden lg:flex items-center gap-1 text-stone-700">
                  <button
                    type="button"
                    onClick={() => setActiveTab('businesses')}
                    className="px-2 py-0.5 rounded hover:bg-stone-200/60 hover:text-stone-950 transition-colors cursor-pointer"
                  >
                    Catálogo
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('new_business')}
                    className="px-2 py-0.5 rounded hover:bg-stone-200/60 hover:text-stone-950 transition-colors cursor-pointer"
                  >
                    Nueva Empresa
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ai_assistant')}
                    className="px-2 py-0.5 rounded hover:bg-stone-200/60 hover:text-purple-700 text-purple-700 font-semibold transition-colors cursor-pointer"
                  >
                    Asistente IA
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('analytics')}
                    className="px-2 py-0.5 rounded hover:bg-stone-200/60 hover:text-stone-950 transition-colors cursor-pointer"
                  >
                    Métricas
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('reports')}
                    className="px-2 py-0.5 rounded hover:bg-stone-200/60 hover:text-amber-800 text-amber-700 font-semibold transition-colors cursor-pointer"
                  >
                    Reportes
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('classifieds')}
                    className="px-2 py-0.5 rounded hover:bg-stone-200/60 hover:text-stone-950 transition-colors cursor-pointer"
                  >
                    Clasificados
                  </button>
                </div>
              </div>

              {/* Right: Status Indicators & Clock */}
              <div className="flex items-center gap-3 text-xs">

                {/* MariaDB Live Ping */}
                <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{reportsError ? 'Reportes sin confirmar' : 'Panel administrativo'}</span>
                </div>

                {/* Quick Refresh Button */}
                <button
                  type="button"
                  onClick={onTriggerSync}
                  disabled={isSyncing}
                  className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-stone-200/60 text-stone-700 hover:text-stone-950 transition-colors cursor-pointer disabled:opacity-50"
                  title="Actualizar Catálogo"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-sky-600' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando' : 'Sincronizar'}</span>
                </button>

                {/* Battery 100% */}
                <div className="hidden md:flex items-center gap-1 text-stone-600">
                  <Battery className="w-4 h-4" />
                  <span className="text-[10px]">100%</span>
                </div>

                {/* WiFi */}
                <Wifi className="w-3.5 h-3.5 text-stone-600 hidden sm:block" />

                {/* Live Clock & Date */}
                <span className="font-medium text-stone-800">
                  {currentDate.split(',')[0]} {currentTime}
                </span>

                {/* Admin Avatar Pill */}
                <div className="flex items-center gap-1.5 pl-1.5 border-l border-stone-300">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 text-[11px] font-bold text-white flex items-center justify-center shadow-xs">
                    {getLoggedInAdminName().charAt(0).toUpperCase()}
                  </div>
                  <span className="text-stone-800 hidden xl:inline font-semibold">
                    {getLoggedInAdminName()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Desktop (macOS) or Mobile (iOS) Hub */}
          {activeTab === 'start' ? (
            isMobileDevice ? (
              <AdminIOSMobileHub
                businessesCount={businesses.length}
                pendingReportsCount={reports.filter(r => r.status === 'pending').length}
                analytics={analytics}
                classifiedsCount={classifieds.length}
                promotionsCount={promotionsCount}
                eventsCount={eventsCount}
                isSyncing={isSyncing}
                onTriggerSync={onTriggerSync}
                onSelectTab={(tab) => setActiveTab(tab as any)}
                onClose={handleModalClose}
                onLogout={handleLogout}
                currentTime={currentTime}
                currentDate={currentDate}
                activeAdminName={getLoggedInAdminName()}
                dbStatus={dbStatus}
                onSwitchToDesktopMode={() => setIsMobileDevice(false)}
              />
            ) : (
              <AdminMacOSDesktop
                businesses={businesses}
                businessesCount={businesses.length}
                pendingReportsCount={reports.filter(r => r.status === 'pending').length}
                analytics={analytics}
                classifiedsCount={classifieds.length}
                promotionsCount={promotionsCount}
                eventsCount={eventsCount}
                isSyncing={isSyncing}
                onTriggerSync={onTriggerSync}
                onSelectTab={(tab) => setActiveTab(tab as any)}
                onClose={handleModalClose}
                onLogout={handleLogout}
                currentTime={currentTime}
                currentDate={currentDate}
                activeAdminName={getLoggedInAdminName()}
                dbStatus={dbStatus}
              />
            )
          ) : (
            /* macOS 27 Golden Gate or iOS Window Container */
            <div className={`flex-1 flex flex-col min-h-0 relative ${
              isMobileDevice
                ? 'p-0 w-full h-full'
                : isWindowMaximized ? 'p-0' : 'p-2 sm:p-4 pb-20 sm:pb-22'
            }`}>
              {/* Fondo luminoso del Puente Zacatal al atardecer */}
              {!isMobileDevice && !isWindowMaximized && (
                <div
                  className="absolute inset-0 bg-cover bg-center pointer-events-none"
                  style={{ backgroundImage: "url('/puente.jpg')" }}
                />
              )}

              {/* The Window Frame */}
              <div className={`relative flex-1 flex flex-col min-h-0 ${
                isMobileDevice
                  ? 'w-full h-full rounded-none border-none bg-stone-100 text-stone-800'
                  : isWindowMaximized
                    ? 'w-full h-full rounded-none border-b border-stone-200/80 bg-white/90 backdrop-blur-3xl text-stone-800'
                    : 'w-full max-w-7xl mx-auto rounded-2xl sm:rounded-3xl border border-white/90 shadow-[0_28px_80px_rgba(0,0,0,0.38)] overflow-hidden bg-white/82 backdrop-blur-3xl text-stone-800'
              }`}>

                {/* Header: iOS Nav Bar on Mobile VS macOS Traffic Lights Titlebar on Desktop */}
                {isMobileDevice ? (
                  <div className="sticky top-0 h-13 bg-white/95 backdrop-blur-xl border-b border-stone-200 px-3 flex items-center justify-between shrink-0 select-none z-40 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setActiveTab('start')}
                      className="px-3 py-1.5 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold text-xs flex items-center gap-1 active:scale-95 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 -ml-0.5" />
                      <span>Menú Principal</span>
                    </button>

                    <div className="text-center truncate px-2">
                      <div className="text-xs font-extrabold text-stone-900 tracking-tight truncate max-w-[150px]">
                        {getTabTitle(activeTab)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleModalClose}
                      className="px-3 py-1.5 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs flex items-center gap-1 active:scale-95 cursor-pointer"
                      title="Cerrar panel y volver al portal"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Salir</span>
                    </button>
                  </div>
                ) : (
                  /* macOS Window Titlebar with Traffic Lights */
                  <div className="h-11 sm:h-12 bg-white/70 border-b border-stone-200/80 px-3 sm:px-4 flex items-center justify-between shrink-0 select-none z-20 text-stone-800">
                    {/* Traffic Lights: Red (Close), Yellow (Minimize), Green (Zoom/Maximize) */}
                    <div className="flex items-center gap-2 group">
                      <button
                        type="button"
                        onClick={() => setActiveTab('start')}
                        title="Cerrar ventana (volver al escritorio)"
                        className="w-3.5 h-3.5 rounded-full bg-[#FF5F56] border border-[#E0443E] hover:opacity-85 flex items-center justify-center text-[8px] font-bold text-black/60 opacity-90 transition-opacity cursor-pointer shadow-xs"
                      >
                        <span className="opacity-0 group-hover:opacity-100">✕</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('start')}
                        title="Minimizar al Dock"
                        className="w-3.5 h-3.5 rounded-full bg-[#FFBD2E] border border-[#DEA123] hover:opacity-85 flex items-center justify-center text-[9px] font-bold text-black/60 opacity-90 transition-opacity cursor-pointer shadow-xs"
                      >
                        <span className="opacity-0 group-hover:opacity-100">−</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsWindowMaximized(!isWindowMaximized)}
                        title={isWindowMaximized ? "Restaurar tamaño de ventana" : "Maximizar ventana"}
                        className="w-3.5 h-3.5 rounded-full bg-[#27C93F] border border-[#1AAB29] hover:opacity-85 flex items-center justify-center text-[7px] font-bold text-black/60 opacity-90 transition-opacity cursor-pointer shadow-xs"
                      >
                        <span className="opacity-0 group-hover:opacity-100">+</span>
                      </button>
                    </div>

                    {/* Centered Window Title & Breadcrumb */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-stone-800 tracking-tight truncate max-w-[240px] sm:max-w-md">
                      <span className="text-stone-400 hidden sm:inline"></span>
                      <span className="truncate">{getTabTitle(activeTab)}</span>
                      <span className="text-stone-300 hidden sm:inline">·</span>
                      <span className="text-stone-500 text-[11px] font-normal hidden sm:inline">macOS 27 Golden Gate</span>
                    </div>

                    {/* Right Window Toolbar Controls */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`p-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 transition-colors cursor-pointer hidden md:flex items-center gap-1 ${
                          isSidebarOpen ? 'bg-stone-100 ring-1 ring-stone-300' : ''
                        }`}
                        title={isSidebarOpen ? "Ocultar barra lateral" : "Mostrar barra lateral"}
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span className="text-[10px] hidden lg:inline">Barra Lateral</span>
                      </button>

                      <button
                        type="button"
                        onClick={onTriggerSync}
                        disabled={isSyncing}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-100 border border-stone-300 text-xs font-semibold text-stone-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        title="Sincronizar datos"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-sky-600' : ''}`} />
                        <span className="hidden sm:inline">{isSyncing ? 'Sincronizando' : 'Sync'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('start')}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-100 border border-stone-300 text-xs font-semibold text-stone-700 transition-colors cursor-pointer"
                        title="Ver Escritorio"
                      >
                        Escritorio
                      </button>
                    </div>
                  </div>
                )}

                {/* Window Main Layout: On Mobile NO sidebar, On Desktop two-column */}
                <div className="flex-1 flex min-h-0 overflow-hidden">
                  {/* macOS Sidebar Navigation (Desktop Only) */}
                  {!isMobileDevice && isSidebarOpen && (
                    <aside className="w-56 sm:w-64 bg-white/55 backdrop-blur-2xl border-r border-stone-200/80 flex flex-col p-2.5 sm:p-3 overflow-y-auto shrink-0 select-none space-y-4">
                      {/* Section 1: Favoritos */}
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-extrabold text-stone-400 tracking-wider uppercase px-2 mb-1">
                          Favoritos
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('businesses')}
                          className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                            activeTab === 'businesses'
                              ? 'bg-sky-500/15 border border-sky-400/40 text-sky-800 font-bold shadow-2xs'
                              : 'text-stone-700 hover:text-stone-950 hover:bg-white/80 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="truncate">Catálogo Empresas</span>
                          </div>
                          {businesses.length > 0 && (
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                              activeTab === 'businesses' ? 'bg-sky-500 text-white' : 'bg-stone-200/80 text-stone-700'
                            }`}>
                              {businesses.length}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('ai_assistant')}
                          className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                            activeTab === 'ai_assistant'
                              ? 'bg-sky-500/15 border border-sky-400/40 text-sky-800 font-bold shadow-2xs'
                              : 'text-stone-700 hover:text-stone-950 hover:bg-white/80 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                            <span className="truncate">Asistente IA</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('analytics')}
                          className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                            activeTab === 'analytics'
                              ? 'bg-sky-500/15 border border-sky-400/40 text-sky-800 font-bold shadow-2xs'
                              : 'text-stone-700 hover:text-stone-950 hover:bg-white/80 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <BarChart3 className="w-4 h-4 text-cyan-600 shrink-0" />
                            <span className="truncate">Alcance & Métricas</span>
                          </div>
                          {analytics && (analytics.totalVisits ?? 0) > 0 && (
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                              activeTab === 'analytics' ? 'bg-sky-500 text-white' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {analytics.totalVisits}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('reports')}
                          className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                            activeTab === 'reports'
                              ? 'bg-sky-500/15 border border-sky-400/40 text-sky-800 font-bold shadow-2xs'
                              : 'text-stone-700 hover:text-stone-950 hover:bg-white/80 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                            <span className="truncate">Reportes</span>
                          </div>
                          {reports.filter(r => r.status === 'pending').length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-xs">
                              {reports.filter(r => r.status === 'pending').length}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('classifieds')}
                          className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                            activeTab === 'classifieds'
                              ? 'bg-sky-500/15 border border-sky-400/40 text-sky-800 font-bold shadow-2xs'
                              : 'text-stone-700 hover:text-stone-950 hover:bg-white/80 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Tag className="w-4 h-4 text-violet-500 shrink-0" />
                            <span className="truncate">Clasificados</span>
                          </div>
                          {classifieds.length > 0 && (
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                              activeTab === 'classifieds' ? 'bg-sky-500 text-white' : 'bg-stone-200/80 text-stone-700'
                            }`}>
                              {classifieds.length}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Section 2: Comercio & Ciudad */}
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-extrabold text-stone-400 tracking-wider uppercase px-2 mb-1">
                          Comercio y Ciudad
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('new_business')}
                          className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                            activeTab === 'new_business'
                              ? 'bg-sky-500/15 border border-sky-400/40 text-sky-800 font-bold shadow-2xs'
                              : 'text-stone-700 hover:text-stone-950 hover:bg-white/80 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <PlusCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="truncate">Nueva Empresa</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('promotions')}
                          className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                            activeTab === 'promotions'
                              ? 'bg-sky-500/15 border border-sky-400/40 text-sky-800 font-bold shadow-2xs'
                              : 'text-stone-700 hover:text-stone-950 hover:bg-white/80 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Gift className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="truncate">Promociones</span>
                          </div>
                          {promotionsCount > 0 && (
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                              activeTab === 'promotions' ? 'bg-sky-500 text-white' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {promotionsCount}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('emergency')}
                          className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                            activeTab === 'emergency'
                              ? 'bg-sky-500/15 border border-sky-400/40 text-sky-800 font-bold shadow-2xs'
                              : 'text-stone-700 hover:text-stone-950 hover:bg-white/80 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                            <span className="truncate">Emergencias 24/7</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('events')}
                          className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                            activeTab === 'events'
                              ? 'bg-sky-500/15 border border-sky-400/40 text-sky-800 font-bold shadow-2xs'
                              : 'text-stone-700 hover:text-stone-950 hover:bg-white/80 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Calendar className="w-4 h-4 text-fuchsia-500 shrink-0" />
                            <span className="truncate">Cartelera Eventos</span>
                          </div>
                          {eventsCount > 0 && (
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                              activeTab === 'events' ? 'bg-sky-500 text-white' : 'bg-stone-200/80 text-stone-700'
                            }`}>
                              {eventsCount}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Section 3: Sistema & Ajustes */}
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-extrabold text-stone-400 tracking-wider uppercase px-2 mb-1">
                          Sistema y Ajustes
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('links')}
                          className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                            activeTab === 'links'
                              ? 'bg-sky-500/15 border border-sky-400/40 text-sky-800 font-bold shadow-2xs'
                              : 'text-stone-700 hover:text-stone-950 hover:bg-white/80 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="truncate">Canales & Grupos</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('publicidad')}
                          className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                            activeTab === 'publicidad'
                              ? 'bg-sky-500/15 border border-sky-400/40 text-sky-800 font-bold shadow-2xs'
                              : 'text-stone-700 hover:text-stone-950 hover:bg-white/80 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="truncate">Publicidad & Banners</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('brand_media')}
                          className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                            activeTab === 'brand_media'
                              ? 'bg-sky-500/15 border border-sky-400/40 text-sky-800 font-bold shadow-2xs'
                              : 'text-stone-700 hover:text-stone-950 hover:bg-white/80 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <ImageIcon className="w-4 h-4 text-teal-600 shrink-0" />
                            <span className="truncate">Banner y Logo</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('admins')}
                          className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                            activeTab === 'admins'
                              ? 'bg-sky-500/15 border border-sky-400/40 text-sky-800 font-bold shadow-2xs'
                              : 'text-stone-700 hover:text-stone-950 hover:bg-white/80 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <KeyRound className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span className="truncate">Administradores</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('status')}
                          className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                            activeTab === 'status'
                              ? 'bg-sky-500/15 border border-sky-400/40 text-sky-800 font-bold shadow-2xs'
                              : 'text-stone-700 hover:text-stone-950 hover:bg-white/80 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Database className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="truncate">MariaDB & Sync</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('desired_changes')}
                          className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                            activeTab === 'desired_changes'
                              ? 'bg-sky-500/15 border border-sky-400/40 text-sky-800 font-bold shadow-2xs'
                              : 'text-stone-700 hover:text-stone-950 hover:bg-white/80 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Bug className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="truncate">Cambios Deseados</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('config_editor')}
                          className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                            activeTab === 'config_editor'
                              ? 'bg-sky-500/15 border border-sky-400/40 text-sky-800 font-bold shadow-2xs'
                              : 'text-stone-700 hover:text-stone-950 hover:bg-white/80 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileCode className="w-4 h-4 text-sky-600 shrink-0" />
                            <span className="truncate">Editor Configuración</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('maintenance')}
                          className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                            activeTab === 'maintenance'
                              ? 'bg-rose-500/15 border border-rose-400/40 text-rose-800 font-bold shadow-2xs'
                              : 'text-rose-600 hover:text-rose-700 hover:bg-white/80 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                            <span className="truncate">Modo Mantenimiento</span>
                          </div>
                        </button>
                      </div>
                    </aside>
                  )}

                  {/* Subtab Body Container (Full-width on mobile, no sidebar squish) */}
                  <div className={`w-full overflow-y-auto flex-1 overscroll-contain bg-white/75 text-stone-800 pb-28 ${
                    isMobileDevice ? 'p-3 sm:p-5 space-y-4' : 'p-4 sm:p-8 space-y-5 sm:space-y-6'
                  }`}>
          {actionSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {activeTab === 'businesses' ? (
            <AdminBusinessesTab
              onContactsUpdated={onBusinessUpdated}
              businesses={businesses}
              categories={categories}
              coloniasList={coloniasList}
              onEditBusiness={(biz) => {
                if (onEditBusiness) {
                  onEditBusiness(biz);
                }
              }}
              onToggleTop={onToggleTop}
              onToggleRecommended={onToggleRecommended}
              onDeleteBusiness={onDeleteBusiness}
              onOpenBusiness={(biz) => {
                if (onSelectBusiness) {
                  onSelectBusiness(biz);
                  onClose();
                }
              }}
              onAddNewBusiness={() => setActiveTab('new_business')}
              onBusinessApproved={(newBiz) => {
                if (onBusinessAdded) {
                  onBusinessAdded(newBiz);
                }
                if (onBusinessUpdated) {
                  onBusinessUpdated();
                }
                setActionSuccessMsg(`¡Empresa "${newBiz.name}" autorizada y publicada tanto en encarmen.org como en empresasencarmen.com!`);
                setTimeout(() => setActionSuccessMsg(null), 7000);
              }}
            />
          ) : activeTab === 'analytics' ? (
            <AdminDetailedAnalytics
              onDeleteBusiness={handleDeleteBusiness}
              onRefresh={loadAnalyticsData}
            />
          ) : activeTab === "classifieds" ? (
            <AdminClassifiedsTab
              classifieds={classifieds}
              onOpenCreate={() => {
                if (onOpenCreateClassified) onOpenCreateClassified();
              }}
              onOpenEdit={(ad) => {
                if (onOpenEditClassified) onOpenEditClassified(ad);
              }}
              onDeleteAd={async (id) => {
                if (onDeleteClassified) return await onDeleteClassified(id);
                return false;
              }}
              onOpenDetail={(ad) => {
                if (onOpenDetailClassified) onOpenDetailClassified(ad);
              }}
              onRefresh={() => {
                if (onRefreshClassifieds) onRefreshClassifieds();
              }}
            />
          ) : activeTab === "reports" ? (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Reportes recibidos y solicitudes de baja</span>
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Modifica datos de empresas o retira clasificados reportados por la comunidad en 1 clic.
                  </p>
                </div>
                <button
                  onClick={loadReportsData}
                  disabled={loadingReports}
                  className="px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingReports ? "animate-spin" : ""}`} />
                  <span>Actualizar lista</span>
                </button>
              </div>

              {loadingReports ? <p role="status">Consultando reportes del servidor…</p> : reportsError ? (
                <div role="alert" className="text-sm text-amber-800 bg-amber-50 rounded-xl p-3">
                  {reportsError} El número de reportes pendientes no está disponible. Los históricos locales no se muestran ni se eliminaron.
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="font-bold text-stone-800 text-sm">¡Bandeja al día!</p>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    No hay solicitudes pendientes de usuarios. Cuando alguien solicite dar de baja un negocio o anuncio clasificado aparecerá aquí.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((rep) => {
                    const isEditing = editingBizId === rep.businessId;
                    const isClassifiedRep = rep.type === "classified" || Boolean(rep.classifiedId);
                    const reasonBadge = () => {
                      if (isClassifiedRep) {
                        switch (rep.reason) {
                          case "owner_lost_access":
                            return (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                <span>📱 Solicitud del autor (cambió de equipo)</span>
                              </span>
                            );
                          case "sold":
                            return (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <span>🏷️ Ya se vendió / no disponible</span>
                              </span>
                            );
                          default:
                            return (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                                <span>⚠️ Solicitud de baja de clasificado</span>
                              </span>
                            );
                        }
                      }
                      switch (rep.reason) {
                        case "whatsapp_inactive":
                          return (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                              <span>📵 WhatsApp dado de baja</span>
                            </span>
                          );
                        case "closed":
                          return (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-stone-200 text-stone-800 border border-stone-300 flex items-center gap-1">
                              <span>🔒 Negocio cerrado</span>
                            </span>
                          );
                        default:
                          return (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <span>✏️ Dirección o dato erróneo</span>
                            </span>
                          );
                      }
                    };

                    return (
                      <div
                        key={rep.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          rep.status === "resolved"
                            ? "bg-stone-50/60 border-stone-200 opacity-60"
                            : "bg-white border-stone-200/90 shadow-xs hover:border-stone-300"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-stone-900 text-sm">
                              {rep.classifiedTitle || rep.businessName}
                            </span>
                            {reasonBadge()}
                            {rep.status === "resolved" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Resuelto
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-stone-400 font-medium">
                            {new Date(rep.date || rep.createdAt || Date.now()).toLocaleDateString("es-MX", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>

                        {rep.comment && (
                          <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/60 text-xs text-stone-700 italic mb-3">
                            "{rep.comment}"
                          </div>
                        )}

                        {/* Inline Form to Edit WhatsApp or Address directly for businesses */}
                        {isEditing && !isClassifiedRep && (
                          <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 space-y-3 mb-3">
                            <p className="text-xs font-bold text-amber-900">
                              Modificar datos de "{rep.businessName}":
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                                  Nuevo WhatsApp (o enlace):
                                </label>
                                <input
                                  type="text"
                                  value={editWaInput}
                                  onChange={e => setEditWaInput(e.target.value)}
                                  placeholder="Ej. 9381234567"
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                                  Nueva Dirección:
                                </label>
                                <input
                                  type="text"
                                  value={editAddressInput}
                                  onChange={e => setEditAddressInput(e.target.value)}
                                  placeholder="Ej. Calle 31 #124"
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleSaveBusinessEdits(rep.businessId || 0, rep.id)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                              >
                                Guardar y resolver reporte
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingBizId(null)}
                                className="px-3 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold text-xs cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Actions Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isClassifiedRep ? (
                              <>
                                {rep.classifiedId && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (window.confirm(`¿Eliminar definitivamente el anuncio clasificado "${rep.classifiedTitle || rep.businessName}"?`)) {
                                        if (onDeleteClassified && rep.classifiedId) {
                                          await onDeleteClassified(rep.classifiedId);
                                          handleDismissReport(rep.id);
                                        }
                                      }
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors cursor-pointer shadow-xs text-xs"
                                    title="Dar de baja y eliminar de inmediato este anuncio clasificado"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Dar de baja y eliminar clasificado</span>
                                  </button>
                                )}
                                {rep.requesterContact && (
                                  <span className="text-[11px] text-stone-600 font-medium bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200">
                                    Solicitante: <strong className="text-stone-900">{rep.requesterName || "Usuario"}</strong> ({rep.requesterContact})
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(rep)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold border border-amber-200/80 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>Corregir datos de este negocio</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBusiness(rep.businessId || 0, rep.businessName || 'Empresa', rep.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold border border-rose-200/80 transition-colors cursor-pointer"
                                  title="Elimina el negocio del directorio porque cerró permanentemente"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Dar de baja negocio</span>
                                </button>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {rep.status !== "resolved" && (
                              <button
                                type="button"
                                onClick={() => handleDismissReport(rep.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-stone-500 hover:text-stone-800 hover:bg-stone-100 text-xs"
                                title="Marcar como atendido / descartar reporte"
                              >
                                <Check className="w-3.5 h-3.5 text-stone-400" />
                                <span>Descartar reporte</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteReport(rep.id)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                              title="Borrar de la lista"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Direct Business Search & Removal Section */}
              <div className="pt-6 border-t border-stone-200 space-y-3">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                    <Ban className="w-4 h-4 text-rose-600" />
                    <span>Búsqueda directa de empresas para dar de baja permanente</span>
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Busca cualquier comercio por nombre para administrarlo en ENCARMEN.
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={directBizSearch}
                    onChange={e => setDirectBizSearch(e.target.value)}
                    placeholder="Escribe el nombre de la empresa a dar de baja..."
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none focus:bg-white focus:border-rose-500"
                  />
                </div>

                {directBizSearch.trim().length >= 2 && (
                  <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-xs max-h-72 overflow-y-auto">
                    {businesses.filter(b => b.name.toLowerCase().includes(directBizSearch.toLowerCase().trim())).length === 0 ? (
                      <p className="p-4 text-xs text-stone-400 text-center">
                        No se encontró ningún negocio con ese nombre.
                      </p>
                    ) : (
                      <div className="divide-y divide-stone-100">
                        {businesses
                          .filter(b => b.name.toLowerCase().includes(directBizSearch.toLowerCase().trim()))
                          .map(b => (
                            <div key={b.id} className="p-3 flex items-center justify-between gap-3 hover:bg-stone-50 transition-colors">
                              <div className="min-w-0">
                                <p className="font-bold text-stone-900 text-xs truncate">{b.name}</p>
                                <p className="text-[11px] text-stone-400 truncate">
                                  {b.categories?.[0] || 'Comercio'} • {b.colonia || 'Cd. Carmen'} • Tel: {b.phone || 'S/N'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteBusiness(b.id, b.name)}
                                className="shrink-0 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                                title="Eliminar de ENCARMEN"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Dar de baja definitiva</span>
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'promotions' ? (
            <AdminPromotionsTab businesses={businesses} />
          ) : activeTab === 'ai_assistant' ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="border-b border-stone-200 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-600" />
                    <span>Asistente de IA (Herramienta Opcional para el Administrador)</span>
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Utiliza la inteligencia de Google Gemini para estructurar rápidamente negocios a partir de anuncios de WhatsApp o publicaciones de redes sociales.
                  </p>
                </div>
              </div>

              {/* Status Banner */}
              {aiStatus?.status === 'active' && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>API de Gemini activa y funcional:</strong> El servidor está conectado y listo para procesar solicitudes ({aiStatus.model || 'gemini-2.5-flash'}).
                  </span>
                </div>
              )}

              {aiStatus?.status === 'quota_exhausted' && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Aviso de Cuota Diaria:</strong> Las llamadas gratuitas de la API de Gemini se han agotado por hoy (límite diario alcanzado). El servicio gratuito de Google se restablecerá automáticamente mañana.
                  </span>
                </div>
              )}

              {aiStatus?.status === 'error' && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>Clave de Gemini no válida o expirada:</strong> {aiStatus.message || 'La clave actual no tiene acceso a Generative Language API en Google Cloud.'}
                  </span>
                </div>
              )}

              {aiStatus?.status === 'not_configured' && (
                <div className="p-3.5 rounded-xl bg-stone-100 border border-stone-200 text-stone-700 text-xs flex items-center gap-2.5">
                  <HelpCircle className="w-4 h-4 text-stone-500 shrink-0" />
                  <span>
                    <strong>Uso Opcional:</strong> Si deseas habilitar este asistente con inteligencia artificial, agrega la variable <code>GEMINI_API_KEY</code> en tu panel de Render. Si no la configuras, puedes dar de alta negocios manualmente en la pestaña "Nueva Compañía".
                  </span>
                </div>
              )}

              {/* Form Input */}
              <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Pega aquí la publicación, mensaje de WhatsApp o texto de volante:
                </label>
                <textarea
                  rows={6}
                  value={aiInputText}
                  onChange={(e) => setAiInputText(e.target.value)}
                  placeholder="Ejemplo: '¡Hola Carmen! Los invitamos a probar las mejores hamburguesas al carbón en Burger Queen. Estamos en Calle 35 x 42 Col. Centro. Horario de 6pm a 12am de miércoles a domingo. Aceptamos efectivo y transferencias. Pedidos al 9381234567...'"
                  className="w-full text-xs p-3.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-stone-50/50"
                />

                {aiError && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{aiError}</span>
                  </div>
                )}

                {aiSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{aiSuccessMsg}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleAnalyzeWithAi}
                    disabled={isAnalyzingAi}
                    className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-stone-200 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isAnalyzingAi ? 'animate-spin' : ''}`} />
                    <span>{isAnalyzingAi ? 'Analizando con Gemini...' : 'Estructurar y Cargar en Alta de Negocio'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === 'emergency' ? (
            <AdminEmergencyTab />
          ) : activeTab === 'events' ? (
            <AdminEventsTab />
          ) : activeTab === 'admins' ? (
            <div className="p-4 sm:p-6">
              <AdminAccountsManagerTab />
            </div>
          ) : activeTab === 'brand_media' ? (
            <div className="p-4 sm:p-6">
              <AdminBrandMediaTab />
            </div>
          ) : activeTab === 'desired_changes' ? (
            <div className="p-4 sm:p-6">
              <AdminDesiredChangesTab />
            </div>
          ) : activeTab === 'config_editor' ? (
            <div className="p-4 sm:p-6">
              <AdminConfigEditorTab />
            </div>
          ) : activeTab === 'maintenance' ? (
            <div className="p-4 sm:p-6">
              <AdminMaintenanceTab />
            </div>
          ) : activeTab === 'links' ? (
            <div className="p-4 sm:p-6 overflow-y-auto">
              <AdminLinksTab />
            </div>
          ) : activeTab === 'publicidad' ? (
            <div className="p-4 sm:p-6 overflow-y-auto">
              <AdminPublicidadTab />
            </div>
          ) : activeTab === 'status' ? (
            <div className="space-y-6">
              {/* Status Alert */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs sm:text-sm">
                  <p className="font-bold text-emerald-900">
                    Conexión directa REST API activa
                  </p>
                  <p className="text-emerald-700 leading-relaxed">
                    Los negocios se administran en ENCARMEN mediante MariaDB.
                    No requieres exponer contraseñas del panel: cada vez que añades un negocio en tu tienda, se sincroniza automáticamente.
                  </p>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-1">
                  <p className="text-[11px] font-semibold text-stone-500">Negocios Sincronizados</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-stone-900">
                    {stats?.totalBusinesses || 183}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-1">
                  <p className="text-[11px] font-semibold text-stone-500">Categorías y Giros</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-stone-900">
                    {stats?.totalCategories || 124}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-1">
                  <p className="text-[11px] font-semibold text-stone-500">Con WhatsApp</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-emerald-600">
                    {stats?.withWhatsapp || 120}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-1">
                  <p className="text-[11px] font-semibold text-stone-500">Con Ubicación Maps</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-blue-600">
                    {stats?.withAddress || 98}
                  </p>
                </div>
              </div>

              {/* Endpoint Details */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Detalles del Servidor
                </h4>
                <div className="bg-stone-50 rounded-2xl border border-stone-200 p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">URL del Sitio:</span>
                    <a
                      href="https://empresasencarmen.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-stone-900 hover:text-amber-600 flex items-center gap-1 font-semibold"
                    >
                      <span>https://empresasencarmen.com</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">API Endpoint:</span>
                    <span className="font-mono text-stone-700">/wp-json/wc/v3/products</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Estado de integración externa:</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Conectado (Lectura / Escritura)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Hosting:</span>
                    <span className="text-stone-800 font-medium">Hostinger Cloud (LiteSpeed Server)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Última actualización:</span>
                    <span className="text-stone-700 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-400" />
                      {stats?.lastSyncTimestamp
                        ? new Date(stats.lastSyncTimestamp).toLocaleString('es-MX')
                        : 'Recién cargado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Base de Datos Hostinger MariaDB / phpMyAdmin */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-amber-700 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-950">
                        Base de Datos MariaDB de Hostinger
                      </h4>
                      <p className="text-xs text-amber-800">
                        Persistencia directa en tu hosting Hostinger (phpMyAdmin)
                      </p>
                    </div>
                  </div>
                  <div>
                    {dbStatus?.mariadb?.connected ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                        Conectado a MariaDB Hostinger
                      </span>
                    ) : dbStatus?.mariadb?.configured ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                        Falta habilitar MySQL Remoto (%)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700">
                        No configurado
                      </span>
                    )}
                  </div>
                </div>

                {/* Connection Parameters */}
                <div className="bg-white/90 rounded-xl p-3 border border-amber-200/60 text-xs space-y-1.5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                    <div className="bg-stone-50 p-2 rounded-lg border border-stone-200">
                      <span className="block text-stone-400 font-sans text-[10px] uppercase font-bold">Host</span>
                      <span className="text-stone-800 truncate block font-semibold">{dbStatus?.mariadb?.host || 'srv1356.hstgr.io'}</span>
                    </div>
                    <div className="bg-stone-50 p-2 rounded-lg border border-stone-200">
                      <span className="block text-stone-400 font-sans text-[10px] uppercase font-bold">Base de Datos</span>
                      <span className="text-stone-800 truncate block font-semibold">{dbStatus?.mariadb?.database || 'u293982346_encarmenapp'}</span>
                    </div>
                    <div className="bg-stone-50 p-2 rounded-lg border border-stone-200">
                      <span className="block text-stone-400 font-sans text-[10px] uppercase font-bold">Usuario</span>
                      <span className="text-stone-800 truncate block font-semibold">{dbStatus?.mariadb?.user || 'u293982346_appuser'}</span>
                    </div>
                    <div className="bg-stone-50 p-2 rounded-lg border border-stone-200">
                      <span className="block text-stone-400 font-sans text-[10px] uppercase font-bold">Motor Activo</span>
                      <span className="text-amber-800 truncate block font-semibold">
                        {dbStatus?.activeEngine === 'mariadb_hostinger'
                          ? 'MariaDB Hostinger (Producción)'
                          : dbStatus?.activeEngine === 'google_firestore'
                          ? 'Google Firestore'
                          : 'Almacenamiento Local JSON (Servidor)'}
                      </span>
                    </div>
                  </div>

                  {dbStatus?.mariadb?.connected && (
                    <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-100/70 border border-emerald-300 text-emerald-950 text-[11.5px] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>
                          <strong>Base de datos activa en Hostinger:</strong> Tu aplicación ya guarda todas las altas, cambios y consultas directamente en MariaDB (<code>u293982346_encarmenapp</code>).
                        </span>
                      </div>
                    </div>
                  )}

                  {!dbStatus?.mariadb?.connected && (
                    <div className="mt-2.5 p-2.5 rounded-lg bg-amber-100/70 border border-amber-300 text-amber-900 text-[11.5px] space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-950">
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>Paso requerido en Hostinger hPanel:</span>
                      </div>
                      <p>
                        Hostinger bloquea por defecto conexiones externas. Para desbloquear la conexión:
                      </p>
                      <ol className="list-decimal pl-4 space-y-0.5 text-stone-700">
                        <li>Entra a tu <strong>hPanel de Hostinger</strong> &rarr; <em>Bases de Datos</em> &rarr; <strong>MySQL Remoto</strong>.</li>
                        <li>En el campo <strong>IP</strong> escribe <code>%</code> (comodín para cualquier IP remota).</li>
                        <li>En <strong>Base de datos</strong> selecciona <code>u293982346_encarmenapp</code> y haz clic en <strong>Crear</strong>.</li>
                      </ol>
                    </div>
                  )}

                  {dbTestMessage && (
                    <div className={`p-2 rounded-lg text-xs font-semibold ${
                      dbTestMessage.includes('exitosa') || dbTestMessage.includes('éxito')
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                      {dbTestMessage}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={handleSyncCatalogToMariaDb}
                    disabled={isSyncingDbCatalog || !dbStatus?.mariadb?.connected}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDbCatalog ? 'animate-spin' : ''}`} />
                    {isSyncingDbCatalog ? 'Sincronizando comercios...' : 'Sincronizar Catálogo a MariaDB (205 comercios)'}
                  </button>

                  <button
                    onClick={handleReconnectDb}
                    disabled={isTestingDb}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingDb ? 'animate-spin' : ''}`} />
                    {isTestingDb ? 'Verificando...' : 'Re-verificar Conexión'}
                  </button>

                  <a
                    href="/hostinger_mariadb_setup.sql"
                    download="hostinger_mariadb_setup.sql"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar Backup SQL (.sql)
                  </a>
                </div>
              </div>

              {/* Últimos 10 Negocios Dados de Alta */}
              <div className="space-y-3 pt-2 border-t border-stone-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                      Resumen: Últimos 10 Negocios Registrados
                    </h4>
                  </div>
                  <span className="text-[11px] text-stone-500 font-medium">
                    Mostrando {latest10Businesses.length} de {stats?.totalBusinesses || businesses.length}
                  </span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {latest10Businesses.map((biz, idx) => (
                    <div
                      key={biz.id || idx}
                      className="p-3 bg-stone-50 hover:bg-stone-100/80 rounded-xl border border-stone-200 flex items-center justify-between gap-3 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-stone-200 text-stone-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {idx + 1}
                        </span>
                        {biz.image ? (
                          <img
                            src={biz.image}
                            alt=""
                            className="w-8 h-8 rounded-lg object-contain bg-white border border-stone-200 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold text-xs">
                            {biz.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-stone-900 truncate">
                            {biz.name}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-stone-500 truncate">
                            <span className="text-amber-700 font-medium">
                              {biz.categories?.[0] || 'Comercio'}
                            </span>
                            {biz.colonia && (
                              <>
                                <span>•</span>
                                <span>{biz.colonia}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {biz.phone && (
                          <span className="hidden sm:inline text-[11px] text-stone-600 font-mono bg-white px-2 py-0.5 rounded-md border border-stone-200">
                            {biz.phone}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectBusiness) {
                              onSelectBusiness(biz);
                              onClose();
                            }
                          }}
                          title="Abrir ficha del negocio en la aplicación Google AI"
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Ver Ficha</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {businesses.length === 0 && (
                    <div className="p-4 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                      No hay negocios registrados para mostrar.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
                Los negocios se administran directamente en ENCARMEN con persistencia en MariaDB.
              </div>
            </div>
          ) : (
            /* Tab: Nueva Compañía - Alta directa por el Administrador */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-600" />
                    <span>Dar de Alta Nueva Compañía</span>
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Como administrador, registra cualquier negocio de Ciudad del Carmen directamente.
                  </p>
                </div>
                {onNavigateToRegister && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToRegister();
                    }}
                    className="text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Abrir en pantalla completa</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {newBizSuccessMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{newBizSuccessMsg}</span>
                </div>
              )}

              {newBizErrorMsg && !newBizDuplicateWarning && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{newBizErrorMsg}</span>
                </div>
              )}

              {newBizDuplicateWarning && newBizDuplicateWarning.existingBusiness && (
                <div className="p-4 bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl text-stone-900 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-extrabold text-sm text-stone-900">
                        Candado: Se detectó una empresa similar ya registrada
                      </h5>
                      <p className="text-xs text-stone-600 mt-0.5">
                        El negocio <strong>{newBizDuplicateWarning.existingBusiness.name}</strong> ({newBizDuplicateWarning.existingBusiness.category}) con teléfono {newBizDuplicateWarning.existingBusiness.phone || 'S/N'} ya existe en el directorio.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
                    <button
                      type="button"
                      onClick={() => setNewBizDuplicateWarning(null)}
                      className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingNewBiz}
                      onClick={() => setNewBizDuplicateWarning(null)}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
                    >
                      Revisar datos del negocio
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleAdminCreateBusiness} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700">Nombre de la Empresa *</label>
                    <input
                      type="text"
                      required
                      value={newBizForm.name}
                      onChange={e => setNewBizForm({ ...newBizForm, name: e.target.value })}
                      placeholder="Ej. Taller Mecánico El Carmen"
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm bg-stone-50 focus:bg-white focus:border-amber-500 outline-none"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700">Categoría o Giro Comercial *</label>
                    <select
                      required
                      value={newBizForm.category}
                      onChange={e => setNewBizForm({ ...newBizForm, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm bg-stone-50 focus:bg-white focus:border-amber-500 outline-none"
                    >
                      <option value="">-- Selecciona categoría --</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                      {categories.length === 0 && (
                        <>
                          <option value="Alimentos y Bebidas">Alimentos y Bebidas</option>
                          <option value="Automotriz">Automotriz</option>
                          <option value="Salud y Médicos">Salud y Médicos</option>
                          <option value="Servicios Profesionales">Servicios Profesionales</option>
                          <option value="Hogar y Mantenimiento">Hogar y Mantenimiento</option>
                          <option value="Comercios y Tiendas">Comercios y Tiendas</option>
                          <option value="Belleza y Cuidado Personal">Belleza y Cuidado Personal</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700">Teléfono Directo *</label>
                    <input
                      type="tel"
                      required={!newBizForm.whatsapp.trim()}
                      value={newBizForm.phone}
                      onChange={e => {
                        const val = e.target.value;
                        if (val.includes('tel:') || val.includes('http')) {
                          setNewBizForm({ ...newBizForm, phone: cleanPhoneNumber(val) });
                        } else {
                          setNewBizForm({ ...newBizForm, phone: val.replace(/[^\d\s\+\-]/g, '') });
                        }
                      }}
                      onBlur={() => {
                        if (newBizForm.phone) setNewBizForm({ ...newBizForm, phone: cleanPhoneNumber(newBizForm.phone) });
                      }}
                      placeholder="Ej. 9381234567"
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm bg-stone-50 focus:bg-white focus:border-amber-500 outline-none font-mono"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700">WhatsApp (10 dígitos, opcional)</label>
                    <input
                      type="tel"
                      value={newBizForm.whatsapp}
                      onChange={e => {
                        const val = e.target.value;
                        if (val.includes('http') || val.includes('whatsapp') || val.includes('wa.me')) {
                          setNewBizForm({ ...newBizForm, whatsapp: cleanPhoneNumber(val) });
                        } else {
                          setNewBizForm({ ...newBizForm, whatsapp: val.replace(/[^\d\s\+\-]/g, '') });
                        }
                      }}
                      onBlur={() => {
                        if (newBizForm.whatsapp) setNewBizForm({ ...newBizForm, whatsapp: cleanPhoneNumber(newBizForm.whatsapp) });
                      }}
                      placeholder="Ej. 9381234567"
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm bg-stone-50 focus:bg-white focus:border-amber-500 outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Address */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700">Dirección o Calle</label>
                    <input
                      type="text"
                      value={newBizForm.address}
                      onChange={e => setNewBizForm({ ...newBizForm, address: e.target.value })}
                      placeholder="Calle 31 #124 x 42"
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm bg-stone-50 focus:bg-white focus:border-amber-500 outline-none"
                    />
                  </div>

                  {/* Colonia */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700">Colonia de Ciudad del Carmen</label>
                    <select
                      value={newBizForm.colonia}
                      onChange={e => setNewBizForm({ ...newBizForm, colonia: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm bg-stone-50 focus:bg-white focus:border-amber-500 outline-none"
                    >
                      <option value="">-- Selecciona colonia (opcional) --</option>
                      {fullColoniasList.map((name: string) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Descripción o Servicios</label>
                  <textarea
                    rows={2}
                    value={newBizForm.description}
                    onChange={e => setNewBizForm({ ...newBizForm, description: e.target.value })}
                    placeholder="Mantenimiento preventivo, afinaciones, frenos y refacciones..."
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm bg-stone-50 focus:bg-white focus:border-amber-500 outline-none resize-none"
                  />
                </div>

                {/* Horario y Entrega */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700">Horario de Atención</label>
                    <input
                      type="text"
                      value={newBizForm.schedule}
                      onChange={e => setNewBizForm({ ...newBizForm, schedule: e.target.value })}
                      placeholder="Lunes a Sábado de 8:00 AM a 7:00 PM"
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm bg-stone-50 focus:bg-white focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700">¿Cuenta con Servicio a Domicilio?</label>
                    <select
                      value={normalizeDeliveryOption(newBizForm.delivery)}
                      onChange={e => setNewBizForm({ ...newBizForm, delivery: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm bg-stone-50 focus:bg-white focus:border-amber-500 outline-none font-medium"
                    >
                      {DELIVERY_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subir Logotipo */}
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-bold text-stone-700">Logotipo de la empresa</label>
                  <div className="flex items-center gap-3">
                    {newBizLogoPreview && (
                      <div className="w-12 h-12 rounded-xl border border-stone-200 overflow-hidden shrink-0 bg-white p-1">
                        <img src={newBizLogoPreview} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <label className="cursor-pointer px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-700 flex items-center gap-1.5 transition-colors">
                      <Upload className={`w-3.5 h-3.5 ${isUploadingNewBizLogo ? 'animate-bounce' : ''}`} />
                      <span>{isUploadingNewBizLogo ? 'Subiendo...' : newBizLogoPreview ? 'Cambiar imagen' : 'Seleccionar archivo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAdminLogoUpload}
                        className="hidden"
                      />
                    </label>
                    {newBizLogoPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewBizLogoPreview(null);
                          setNewBizForm(f => ({ ...f, image: '', logo_url: '' }));
                        }}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </div>

                {/* La fachada se almacena independientemente del logotipo y de la galería. */}
                <div className="space-y-2 pt-2 border-t border-stone-200">
                  <label className="text-xs font-bold text-stone-700">Fotografía de fachada / portada</label>
                  <div className="flex items-center gap-3">
                    {newBizCoverPreview && (
                      <div className="w-20 h-14 rounded-xl border border-stone-200 overflow-hidden shrink-0 bg-white">
                        <img src={newBizCoverPreview} alt="Fachada de la empresa" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <label className="cursor-pointer px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-700">
                      <span>{isUploadingNewBizCover ? 'Subiendo fachada...' : newBizCoverPreview ? 'Cambiar fachada' : 'Subir fachada'}</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                        onChange={handleAdminCoverUpload}
                        disabled={isSubmittingNewBiz || isUploadingNewBizLogo || isUploadingNewBizCover || isUploadingNewBizGallery} />
                    </label>
                    {newBizCoverPreview && (
                      <button type="button" onClick={() => {
                        if (newBizPendingUploads.current) return;
                        setNewBizCoverPreview(null);
                        setNewBizForm(prev => ({...prev, cover_url: ''}));
                      }} className="text-xs text-rose-600 hover:underline" disabled={isSubmittingNewBiz}>Quitar</button>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500">Una fachada independiente. No cuenta entre las 10 fotos de productos o servicios.</p>
                </div>

                {/* Galería de Trabajos, Productos y Servicios (Hasta 10 Fotos) */}
                <div className="space-y-2 pt-2 border-t border-stone-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                        <span>Fotos de Trabajos, Productos o Servicios (Hasta 10 fotos)</span>
                      </label>
                      <p className="text-[11px] text-stone-500">
                        Sube hasta 10 fotos adicionales de instalaciones, menú, catálogo o productos.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200 shrink-0">
                      {newBizGallery.length} de 10
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {newBizGallery.length < 10 && (
                      <label className="cursor-pointer px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-700 flex items-center gap-1.5 transition-colors">
                        <Upload className={`w-3.5 h-3.5 ${isUploadingNewBizGallery ? 'animate-bounce text-amber-600' : ''}`} />
                        <span>{isUploadingNewBizGallery ? 'Subiendo fotos...' : '+ Agregar fotos de productos/servicios'}</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleAdminGalleryUpload}
                          disabled={isUploadingNewBizGallery}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Grid de fotos subidas */}
                  {newBizGallery.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-1">
                      {newBizGallery.map((photo, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 bg-stone-100 group shadow-xs">
                          <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleAdminRemoveGalleryPhoto(idx)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-90 hover:opacity-100 cursor-pointer shadow-sm text-xs font-bold"
                            title="Quitar foto"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingNewBiz || isUploadingNewBizLogo || isUploadingNewBizCover || isUploadingNewBizGallery}
                    className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-stone-950 font-extrabold text-sm shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmittingNewBiz ? (
                      <span>Guardando empresa...</span>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4" />
                        <span>Publicar y Guardar Nueva Compañía</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Desktop macOS Dock VS Mobile iOS Bottom Bar */}
          {isMobileDevice ? (
            <AdminIOSBottomBar
              activeTab={activeTab}
              onSelectTab={(tab) => setActiveTab(tab)}
              pendingReportsCount={reports.filter(r => r.status === 'pending').length}
              businessesCount={businesses.length}
              classifiedsCount={classifieds.length}
              onLogout={handleLogout}
              onClose={handleModalClose}
            />
          ) : (
            <AdminMacOSDock
              activeTab={activeTab}
              onSelectTab={(tab) => setActiveTab(tab)}
              isSyncing={isSyncing}
              onTriggerSync={onTriggerSync}
              onLogout={handleLogout}
              onClose={handleModalClose}
              pendingReportsCount={reports.filter(r => r.status === 'pending').length}
              businessesCount={businesses.length}
              classifiedsCount={classifieds.length}
            />
          )}
        </div>
      )}

      {/* DIÁLOGO EN APP PARA CONFIRMAR ELIMINACIÓN (SIN window.confirm) */}
      {businessToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900/95 border border-white/20 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center text-2xl font-bold">
              ⚠️
            </div>
            <div className="space-y-1">
              <h4 className="text-xl font-bold text-white">¿Confirmas eliminar esta empresa?</h4>
              <p className="text-sm text-stone-300">
                Se dará de baja definitivamente a <strong className="text-rose-400">{businessToDelete.name}</strong> del directorio y de la sincronización.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBusinessToDelete(null)}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeConfirmedDeleteBusiness}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Sí, eliminar permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


