import { getBrandConfig } from './utils/brand';
import { BrandLogo } from './components/BrandLogo';
import { APP_VERSION } from './constants/version';
import COLONIAS_CARMEN_LIST from './data/colonias_carmen.json';
import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { InstallPwaBanner } from './components/InstallPwaBanner';
import { HeroSearch } from './components/HeroSearch';
import { CategoryBar } from './components/CategoryBar';
import { BusinessCard } from './components/BusinessCard';
import { BusinessDetailModal } from './components/BusinessDetailModal';
import { CityZoneExplorer } from './components/CityZoneExplorer';
import { WordPressSyncModal } from './components/WordPressSyncModal';
import { FavoritesView } from './components/FavoritesView';
import { RegisterBusinessView } from './components/RegisterBusinessView';
import { NewestBusinessesBanner } from './components/NewestBusinessesBanner';
import { ClassifiedsView } from './components/ClassifiedsView';
import { ClassifiedDetailModal } from './components/ClassifiedDetailModal';
import { ClassifiedCreateModal } from './components/ClassifiedCreateModal';
import { DigitalCardModal } from './components/DigitalCardModal';
import { EditBusinessModal } from './components/EditBusinessModal';
import { ClientBusinessPageView } from './components/ClientBusinessPageView';
import { PromotionsBanner } from './components/PromotionsBanner';
import { ClaimCouponModal } from './components/ClaimCouponModal';
import { CategoriesFullView } from './components/CategoriesFullView';
import { EmergencyGuideModal } from './components/EmergencyGuideModal';
import { EventsBillboardBanner } from './components/EventsBillboardBanner';
import {
  fetchNewestBusinesses,
  fetchClassifieds,
  createClassified,
  updateClassified,
  deleteClassified,
  adminUpdateBusiness,
  adminDeleteBusiness,
  getPromotions
} from './services/api';
import { isSessionAdminAuthenticated, clearAdminAuth } from './utils/adminAuth';
import { ClassifiedAd, Promotion } from './types';
import {
  fetchBusinesses,
  fetchCategories,
  fetchStats,
  checkWpHealth,
  syncWordPress,
  trackAnalyticsEvent
} from './services/api';
import seedBusinesses from './data/businesses_seed.json';
import { Business, Category, DirectoryStats, WpHealth } from './types';
import {
  Building2,
  Phone,
  MessageSquare,
  Globe,
  ExternalLink,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ChevronDown,
  MessageCircle,
  Shield,
  Download,
  X
} from 'lucide-react';

// Helper to extract business from either ?empresa=slug, /negocio/slug, direct slug (/:slug) or subdomain (empresa.encarmen.org)
function findBusinessFromUrl(bizList: Business[]): Business | null {
  if (!bizList || bizList.length === 0) return null;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    let empresaParam = urlParams.get('empresa');

    // 1. Check dedicated subdomain: e.g. brio-cleaner.encarmen.org
    if (!empresaParam && typeof window !== 'undefined') {
      const host = window.location.hostname.toLowerCase();
      if (host.endsWith('encarmen.org') && host !== 'encarmen.org' && !host.startsWith('www.')) {
        const sub = host.replace('.encarmen.org', '').trim();
        if (sub && sub !== 'ai' && sub !== 'admin' && sub !== 'api') {
          empresaParam = sub;
        }
      }
    }

    // 2. Check path /negocio/slug or /empresa/slug
    if (!empresaParam && typeof window !== 'undefined') {
      const path = window.location.pathname;
      const match = path.match(/\/(?:negocio|empresa)\/([^/?#]+)/i);
      if (match && match[1]) {
        empresaParam = decodeURIComponent(match[1]);
      }
    }

    // 3. Check direct clean path /:slug (e.g. /clean-topal or /uniformescddelcarmen)
    if (!empresaParam && typeof window !== 'undefined') {
      const rawPath = window.location.pathname.replace(/^\/+|\/+$/g, '');
      const reservedPaths = ['admin', 'api', 'login', 'register', 'registro', 'subir-negocio', 'alta', 'alta-empresa', 'zonas', 'colonias', 'categorias', 'promociones', 'clasificados', 'guardados', 'favoritos', 'uploads', 'assets', 'images', 'icons'];
      if (rawPath && !reservedPaths.includes(rawPath.toLowerCase()) && !rawPath.includes('/')) {
        empresaParam = decodeURIComponent(rawPath);
      }
    }

    if (empresaParam) {
      const cleanParam = empresaParam.toLowerCase().trim();
      const found = bizList.find(
        b => b.slug.toLowerCase() === cleanParam ||
             String(b.id) === cleanParam ||
             (Array.isArray(b.previousSlugs) && b.previousSlugs.some(ps => ps.toLowerCase() === cleanParam)) ||
             (Array.isArray(b.previousNames) && b.previousNames.some(pn => pn.toLowerCase().replace(/[^a-z0-9]+/g, '-') === cleanParam || pn.toLowerCase().trim() === cleanParam)) ||
             b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === cleanParam
      );
      if (found) {
        try {
          if (found.slug && found.slug.toLowerCase() !== cleanParam && typeof window !== 'undefined' && window.history?.replaceState) {
            const currentPath = window.location.pathname;
            if (currentPath.includes('/empresa/') || currentPath.includes('/negocio/')) {
              window.history.replaceState(null, '', `/empresa/${found.slug}`);
            } else {
              window.history.replaceState(null, '', `/${found.slug}`);
            }
          }
        } catch {}
        return found;
      }
      return null;
    }
  } catch {}
  return null;
}

function getInitialActiveTab(): 'directory' | 'classifieds' | 'categories' | 'zones' | 'favorites' | 'register' {
  if (typeof window === 'undefined') return 'directory';
  try {
    const rawPath = window.location.pathname.toLowerCase().replace(/^\/+|\/+$/g, '');
    const hash = window.location.hash.toLowerCase().replace(/^#+/, '');
    const params = new URLSearchParams(window.location.search);
    const tabParam = (params.get('tab') || '').toLowerCase();

    if (
      rawPath === 'register' || rawPath === 'registro' || rawPath === 'subir-negocio' || rawPath === 'alta' || rawPath === 'alta-empresa' ||
      hash === 'register' || hash === 'registro' || hash === 'subir-negocio' ||
      tabParam === 'register' || tabParam === 'registro'
    ) {
      return 'register';
    }
    if (rawPath === 'clasificados' || hash === 'clasificados' || tabParam === 'classifieds' || tabParam === 'clasificados') {
      return 'classifieds';
    }
    if (rawPath === 'categorias' || hash === 'categorias' || tabParam === 'categories') {
      return 'categories';
    }
    if (rawPath === 'zonas' || rawPath === 'colonias' || hash === 'zonas' || hash === 'colonias' || tabParam === 'zones') {
      return 'zones';
    }
    if (rawPath === 'favoritos' || rawPath === 'guardados' || hash === 'favoritos' || hash === 'guardados' || tabParam === 'favorites') {
      return 'favorites';
    }
  } catch {}
  return 'directory';
}

export default function App() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<(Category & { subcategories?: Category[] })[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<DirectoryStats | null>(null);
  const [health, setHealth] = useState<WpHealth | null>(null);

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<'directory' | 'classifieds' | 'categories' | 'zones' | 'favorites' | 'register'>(getInitialActiveTab);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncModalInitialTab, setSyncModalInitialTab] = useState<'start' | 'brand_media' | 'businesses' | undefined>('start');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResultMsg, setSyncResultMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedColonia, setSelectedColonia] = useState('todas');
  const [hasWhatsapp, setHasWhatsapp] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [hasAddress, setHasAddress] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);

  // Pagination for display
  const [displayLimit, setDisplayLimit] = useState(24);

  // Newest 15 Businesses banner state
  const [newestBusinesses, setNewestBusinesses] = useState<any[]>([]);

  // Classifieds state
  const [classifieds, setClassifieds] = useState<ClassifiedAd[]>([]);
  const [selectedClassified, setSelectedClassified] = useState<ClassifiedAd | null>(null);
  const [editingClassified, setEditingClassified] = useState<ClassifiedAd | null>(null);
  const [isClassifiedCreateOpen, setIsClassifiedCreateOpen] = useState(false);
  const [digitalCardBusiness, setDigitalCardBusiness] = useState<Business | null>(null);
  const [editingAdminBusiness, setEditingAdminBusiness] = useState<Business | null>(null);
  const [directBusinessView, setDirectBusinessView] = useState<Business | null>(() => {
    try {
      return findBusinessFromUrl(seedBusinesses as unknown as Business[]);
    } catch {
      return null;
    }
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return isSessionAdminAuthenticated();
  });

  // Promotions & Flash Coupons state
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedPromotionForClaim, setSelectedPromotionForClaim] = useState<Promotion | null>(null);

  // 24/7 Emergency Guide state
  const [isEmergencyGuideOpen, setIsEmergencyGuideOpen] = useState(false);

  // Private ZIP download for Creator / Admin (Only visible in AI Studio dev environment or if Admin is authenticated)
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [liveVersion, setLiveVersion] = useState(APP_VERSION);
  const [isZipBannerDismissed, setIsZipBannerDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('dismiss_zip_banner') === 'true';
    } catch {
      return false;
    }
  });
  const isAiStudioEnv = typeof window !== 'undefined' && (
    window.location.hostname.includes('ais-dev-') || 
    window.location.hostname.includes('ais-pre-') || 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
  );

  // Sync version dynamically with server
  useEffect(() => {
    fetch('/api/version')
      .then(r => r.json())
      .then(data => {
        if (data?.version) setLiveVersion(data.version);
      })
      .catch(() => {});
  }, []);

  // Listen to browser navigation (back/forward, hash changes)
  useEffect(() => {
    const handleUrlChange = () => {
      const tab = getInitialActiveTab();
      setActiveTab(tab);
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Sync browser URL bar when user switches between main tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const current = window.location.pathname.toLowerCase().replace(/^\/+|\/+$/g, '');
    try {
      if (activeTab === 'register' && current !== 'registro' && current !== 'register' && current !== 'subir-negocio') {
        window.history.pushState({ tab: 'register' }, '', '/registro');
      } else if (activeTab === 'directory' && (current === 'registro' || current === 'register' || current === 'subir-negocio')) {
        window.history.pushState({ tab: 'directory' }, '', '/');
      }
    } catch {}
  }, [activeTab]);

  const handleDownloadZip = async () => {
    try {
      setIsDownloadingZip(true);
      const res = await fetch('/api/download-backup');
      if (!res.ok) throw new Error('No se pudo obtener el archivo del servidor.');
      
      let filename = `codigo-fuente-empresasencarmen-${liveVersion.replace(/[:/]/g, '-')}.zip`;
      const disp = res.headers.get('content-disposition');
      if (disp && disp.includes('filename=')) {
        const match = disp.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        a.remove();
      }, 500);
    } catch (e: any) {
      alert('Error descargando el archivo: ' + e.message);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  useEffect(() => {
    const handleAuthChange = () => {
      setIsAdminAuthenticated(isSessionAdminAuthenticated());
    };
    handleAuthChange();
    window.addEventListener('admin-auth-changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    const interval = setInterval(handleAuthChange, 2000);
    return () => {
      window.removeEventListener('admin-auth-changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handlePromosUpdated = () => {
      getPromotions().then(res => {
        if (res.success && res.promotions) setPromotions(res.promotions);
      }).catch(() => {});
    };
    window.addEventListener('promotions-updated', handlePromosUpdated);
    return () => window.removeEventListener('promotions-updated', handlePromosUpdated);
  }, []);

  // Listen to browser navigation (back/forward) for ?empresa= parameter
  useEffect(() => {
    const handlePopState = () => {
      const target = findBusinessFromUrl(businesses);
      setDirectBusinessView(target);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [businesses]);

  // Favorites (localStorage)
  const [favorites, setFavorites] = useState<Business[]>(() => {
    try {
      const stored = localStorage.getItem('empresas_carmen_favs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveFavorites = (newFavs: Business[]) => {
    setFavorites(newFavs);
    try {
      localStorage.setItem('empresas_carmen_favs', JSON.stringify(newFavs));
    } catch {}
  };

  const loadClassifieds = async () => {
    try {
      const res = await fetchClassifieds();
      if (res.classifieds) setClassifieds(res.classifieds);
    } catch {}
  };

  const handleCreateOrUpdateClassified = async (adData: Partial<ClassifiedAd>) => {
    try {
      let res;
      if (editingClassified) {
        res = await updateClassified(editingClassified.id, adData);
      } else {
        res = await createClassified(adData);
      }
      if (res.success) {
        await loadClassifieds();
      }
      return res;
    } catch (err: any) {
      return { success: false, message: err.message || 'Error de guardado' };
    }
  };

  const handleDeleteClassified = async (id: string) => {
    try {
      const res = await deleteClassified(id);
      if (res.success) {
        await loadClassifieds();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const toggleFavorite = (business: Business) => {
    const exists = favorites.some(b => b.id === business.id);
    if (exists) {
      saveFavorites(favorites.filter(b => b.id !== business.id));
    } else {
      saveFavorites([...favorites, business]);
    }
  };

  // Admin Quick Action Handlers
  const handleToggleRecommended = async (b: Business) => {
    const nextVal = !b.isRecommended;
    // Optimistic UI update
    setBusinesses(prev => prev.map(item => item.id === b.id ? { ...item, isRecommended: nextVal } : item));
    if (selectedBusiness && selectedBusiness.id === b.id) {
      setSelectedBusiness(prev => prev ? { ...prev, isRecommended: nextVal } : null);
    }
    if (directBusinessView && directBusinessView.id === b.id) {
      setDirectBusinessView(prev => prev ? { ...prev, isRecommended: nextVal } : null);
    }
    try {
      const res = await adminUpdateBusiness(b.id, { isRecommended: nextVal });
      if (!res.success) {
        throw new Error(res.message);
      }
    } catch (err: any) {
      console.error('Error toggling recommended:', err);
      // Revert optimistic update
      setBusinesses(prev => prev.map(item => item.id === b.id ? { ...item, isRecommended: b.isRecommended } : item));
      if (selectedBusiness && selectedBusiness.id === b.id) {
        setSelectedBusiness(prev => prev ? { ...prev, isRecommended: b.isRecommended } : null);
      }
      if (directBusinessView && directBusinessView.id === b.id) {
        setDirectBusinessView(prev => prev ? { ...prev, isRecommended: b.isRecommended } : null);
      }
    }
  };

  const handleToggleTop = async (b: Business) => {
    const nextVal = !b.isTopBusiness;
    // Optimistic UI update
    setBusinesses(prev => prev.map(item => item.id === b.id ? { ...item, isTopBusiness: nextVal } : item));
    if (selectedBusiness && selectedBusiness.id === b.id) {
      setSelectedBusiness(prev => prev ? { ...prev, isTopBusiness: nextVal } : null);
    }
    if (directBusinessView && directBusinessView.id === b.id) {
      setDirectBusinessView(prev => prev ? { ...prev, isTopBusiness: nextVal } : null);
    }
    try {
      const res = await adminUpdateBusiness(b.id, { isTopBusiness: nextVal });
      if (!res.success) {
        throw new Error(res.message);
      }
    } catch (err: any) {
      console.error('Error toggling top:', err);
      // Revert optimistic update
      setBusinesses(prev => prev.map(item => item.id === b.id ? { ...item, isTopBusiness: b.isTopBusiness } : item));
      if (selectedBusiness && selectedBusiness.id === b.id) {
        setSelectedBusiness(prev => prev ? { ...prev, isTopBusiness: b.isTopBusiness } : null);
      }
      if (directBusinessView && directBusinessView.id === b.id) {
        setDirectBusinessView(prev => prev ? { ...prev, isTopBusiness: b.isTopBusiness } : null);
      }
    }
  };

  const handleDeleteBusinessFromHome = async (b: Business) => {
    const confirmMsg = `¿Estás seguro de que deseas eliminar permanentemente a "${b.name}" del directorio y de WordPress?`;
    if (!window.confirm(confirmMsg)) return;

    // Optimistic remove
    setBusinesses(prev => prev.filter(item => item.id !== b.id));
    if (selectedBusiness && selectedBusiness.id === b.id) {
      setSelectedBusiness(null);
    }
    if (directBusinessView && directBusinessView.id === b.id) {
      setDirectBusinessView(null);
      window.history.pushState({}, '', '/');
    }
    try {
      await adminDeleteBusiness(b.id);
      await loadData();
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
      await loadData();
    }
  };

  const handleSaveEditedBusiness = async (id: number, data: Partial<Business>) => {
    const isTarget = (b: Business | null | undefined) => Boolean(b && (String(b.id) === String(id) || Number(b.id) === Number(id)));

    // Immediate state update for instant UI feedback on logos, photos and all fields
    setBusinesses(prev => prev.map(b => isTarget(b) ? { ...b, ...data } : b));
    if (isTarget(selectedBusiness)) {
      setSelectedBusiness(prev => prev ? { ...prev, ...data } : null);
    }
    if (isTarget(directBusinessView)) {
      setDirectBusinessView(prev => prev ? { ...prev, ...data } : null);
    }

    const res = await adminUpdateBusiness(id, data);
    if (res.success) {
      if (res.business) {
        const finalBiz = res.business;
        setBusinesses(prev => prev.map(b => isTarget(b) ? { ...b, ...finalBiz } : b));
        if (isTarget(selectedBusiness)) setSelectedBusiness(finalBiz);
        if (isTarget(directBusinessView)) setDirectBusinessView(finalBiz);
        if (isTarget(editingAdminBusiness)) setEditingAdminBusiness(finalBiz);
      }
      await loadData();
    }
    return res;
  };

  // Initial Data Fetch
  useEffect(() => {
    loadData();
    // Track site visit for analytics
    trackAnalyticsEvent({ type: 'visit' });

    const handlePromosUpdated = () => {
      getPromotions().then(res => {
        if (res.success && res.promotions) setPromotions(res.promotions);
      }).catch(() => {});
    };
    window.addEventListener('promotions-updated', handlePromosUpdated);
    return () => {
      window.removeEventListener('promotions-updated', handlePromosUpdated);
    };
  }, []);

  // Track business detail view
  const handleSelectBusiness = (b: Business | null) => {
    setSelectedBusiness(b);
    if (b) {
      trackAnalyticsEvent({
        type: 'view',
        businessId: b.id,
        businessName: b.name
      });
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bizRes, catRes, statsRes, healthRes, promoRes] = await Promise.all([
        fetchBusinesses({}),
        fetchCategories(),
        fetchStats(),
        checkWpHealth(),
        getPromotions().catch(() => ({ success: false, promotions: [] }))
      ]);

      setBusinesses(bizRes.businesses || []);
      setCategories(catRes.topCategories || []);
      setAllCategories(catRes.allCategories || catRes.topCategories || []);
      setStats(statsRes);
      if (promoRes.success && Array.isArray(promoRes.promotions)) {
        setPromotions(promoRes.promotions);
      } else {
        setPromotions([]);
      }

      fetchNewestBusinesses().then(res => {
        if (res.success && res.businesses) setNewestBusinesses(res.businesses);
      }).catch(() => {});

      fetchClassifieds().then(res => {
        if (res.classifieds) setClassifieds(res.classifieds);
      }).catch(() => {});

      setHealth(healthRes);

      // Deep link support: If URL has ?empresa=slug or /negocio/slug, open the business directly!
      const target = findBusinessFromUrl(bizRes.businesses);
      if (target) {
        setDirectBusinessView(target);
      } else {
        setDirectBusinessView(prev => {
          if (!prev) return null;
          const updatedDirect = (bizRes.businesses || []).find((b: Business) => String(b.id) === String(prev.id) || b.slug === prev.slug);
          return updatedDirect || prev;
        });
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync WordPress handler
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncResultMsg(null);
    try {
      const res = await syncWordPress();
      if (res.success) {
        setSyncResultMsg(res.message);
        await loadData();
      } else {
        setSyncResultMsg(`Error al sincronizar: ${res.message}`);
      }
    } catch (err: any) {
      setSyncResultMsg(`Error de red al sincronizar: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Unique Colonias & Fraccionamientos list with counts
  const coloniasList = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of businesses) {
      if (b.colonia) {
        map[b.colonia] = (map[b.colonia] || 0) + 1;
      }
    }
    // Include all official colonias and fraccionamientos of Ciudad del Carmen
    for (const c of COLONIAS_CARMEN_LIST) {
      if (!(c in map)) {
        map[c] = 0;
      }
    }
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name, 'es');
      });
  }, [businesses]);

  // Client-side Filtered Businesses
  const filteredBusinesses = useMemo(() => {
    let list = [...businesses];

    const normalizeStr = (s?: string) =>
      (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    // Search query
    if (query.trim()) {
      const q = normalizeStr(query);
      const qDigits = query.replace(/\D/g, '');
      list = list.filter(b => {
        const matchName = normalizeStr(b.name).includes(q);
        const matchPrevNames = Array.isArray(b.previousNames) && b.previousNames.some(pn => normalizeStr(pn).includes(q));
        const matchSlug = normalizeStr(b.slug).includes(q);
        const matchPrevSlugs = Array.isArray(b.previousSlugs) && b.previousSlugs.some(ps => normalizeStr(ps).includes(q));
        const matchDesc = normalizeStr(b.description).includes(q);
        const matchAddr = normalizeStr(b.address).includes(q);
        const matchCat = b.categories && b.categories.some(c => normalizeStr(c).includes(q));
        const matchCol = b.colonia && normalizeStr(b.colonia).includes(q);
        const matchPhone = qDigits.length >= 4 && (
          (b.phone && b.phone.includes(qDigits)) ||
          (b.whatsapp && b.whatsapp.includes(qDigits))
        );
        return matchName || matchPrevNames || matchSlug || matchPrevSlugs || matchDesc || matchAddr || matchCat || matchCol || matchPhone;
      });
    }

    // Subcategory if selected
    if (selectedSubcategory) {
      const sub = selectedSubcategory.toLowerCase();
      list = list.filter(b =>
        b.categorySlugs.some(s => s.toLowerCase() === sub) ||
        b.categories.some(c => c.toLowerCase() === sub)
      );
    } else if (selectedCategory !== 'all') {
      // Parent category
      const cat = selectedCategory.toLowerCase();
      list = list.filter(b =>
        b.categorySlugs.some(s => s.toLowerCase() === cat) ||
        b.categories.some(c => c.toLowerCase() === cat)
      );
    }

    // Colonia
    if (selectedColonia !== 'todas') {
      const col = selectedColonia.toLowerCase();
      list = list.filter(b => b.colonia && b.colonia.toLowerCase().includes(col));
    }

    // Toggles
    if (hasWhatsapp) {
      list = list.filter(b => Boolean(b.whatsapp));
    }
    if (hasDelivery) {
      list = list.filter(b => Boolean(b.delivery && !b.delivery.toLowerCase().includes('no')));
    }
    if (hasAddress) {
      list = list.filter(b => Boolean(b.address && b.address.length > 5));
    }
    if (hasPhone) {
      list = list.filter(b => Boolean(b.phone));
    }

    // Sort: TOP businesses appear first whenever matching search/filters, then Recomendada, then newest by ID
    list.sort((a, b) => {
      const aTop = Boolean(a.isTopBusiness) ? 1 : 0;
      const bTop = Boolean(b.isTopBusiness) ? 1 : 0;
      if (aTop !== bTop) return bTop - aTop;
      const aRec = Boolean(a.isRecommended) ? 1 : 0;
      const bRec = Boolean(b.isRecommended) ? 1 : 0;
      if (aRec !== bRec) return bRec - aRec;
      return (Number(b.id) || 0) - (Number(a.id) || 0); // Newest registrations first
    });

    return list;
  }, [
    businesses,
    query,
    selectedCategory,
    selectedSubcategory,
    selectedColonia,
    hasWhatsapp,
    hasDelivery,
    hasAddress,
    hasPhone
  ]);

  const handleResetFilters = () => {
    setQuery('');
    setSelectedCategory('all');
    setSelectedSubcategory('');
    setSelectedColonia('todas');
    setHasWhatsapp(false);
    setHasDelivery(false);
    setHasAddress(false);
    setHasPhone(false);
    setDisplayLimit(24);
  };

  const handleSelectCategoryFromView = (slug: string) => {
    setSelectedCategory(slug);
    setSelectedSubcategory('');
    setActiveTab('directory');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFilterByColoniaFromView = (colonia: string) => {
    setSelectedColonia(colonia);
    setActiveTab('directory');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const displayedBusinesses = filteredBusinesses.slice(0, displayLimit);

  const getActivePromoForBusiness = (biz?: Business | null): Promotion | null => {
    if (!biz) return null;
    return (
      promotions.find(
        p =>
          p.isActive !== false &&
          (Number(p.businessId) === Number(biz.id) ||
           (p.businessSlug && biz.slug && p.businessSlug.toLowerCase() === biz.slug.toLowerCase()) ||
           (p.businessName && biz.name && p.businessName.trim().toLowerCase() === biz.name.trim().toLowerCase()))
      ) || null
    );
  };

  // Standalone Client Mini-Page View (e.g. from QR scan, shared link ?empresa=slug, or direct view)
  if (directBusinessView) {
    const handleBackToMainDirectory = () => {
      setDirectBusinessView(null);
      if (typeof window !== 'undefined') {
        const host = window.location.hostname.toLowerCase();
        // If accessed via a dedicated subdomain (e.g. brio-cleaner.encarmen.org), navigate to root encarmen.org
        if (host.endsWith('encarmen.org') && host !== 'encarmen.org' && !host.startsWith('www.') && host !== 'ai.encarmen.org') {
          window.location.href = 'https://encarmen.org/';
          return;
        }
        // Relative path '/' preserves the EXACT active domain (ai.empresasencarmen.com, encarmen.org, etc.)
        window.history.pushState({}, '', '/');
      }
    };

    const handleSearchFromBusinessPage = (queryText: string) => {
      setDirectBusinessView(null);
      setQuery(queryText);
      setActiveTab('directory');
      if (typeof window !== 'undefined') {
        const host = window.location.hostname.toLowerCase();
        if (host.endsWith('encarmen.org') && host !== 'encarmen.org' && !host.startsWith('www.') && host !== 'ai.encarmen.org') {
          window.location.href = `https://encarmen.org/?q=${encodeURIComponent(queryText)}`;
          return;
        }
        window.history.pushState({}, '', '/');
      }
    };

    return (
      <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 font-sans selection:bg-amber-500 selection:text-white">
        <ClientBusinessPageView
          business={directBusinessView}
          onBackToDirectory={handleBackToMainDirectory}
          onSearchFromPage={handleSearchFromBusinessPage}
          onOpenDigitalCard={(b) => setDigitalCardBusiness(b)}
          isAdmin={isAdminAuthenticated}
          onEditBusiness={(b) => setEditingAdminBusiness(b)}
          onDeleteBusiness={handleDeleteBusinessFromHome}
          onToggleRecommended={handleToggleRecommended}
          onToggleTop={handleToggleTop}
          isFavorite={Boolean(favorites.some(f => f.id === directBusinessView.id))}
          onToggleFavorite={toggleFavorite}
          activePromotion={getActivePromoForBusiness(directBusinessView)}
          onOpenPromotion={(promo) => setSelectedPromotionForClaim(promo)}
        />

        {/* Digital Business Card Modal */}
        {digitalCardBusiness && (
          <DigitalCardModal
            business={digitalCardBusiness}
            isOpen={Boolean(digitalCardBusiness)}
            onClose={() => setDigitalCardBusiness(null)}
            onOpenClientPage={(b) => {
              setDigitalCardBusiness(null);
              setDirectBusinessView(b);
              const cleanSlug = b.slug || String(b.id);
              window.history.pushState({}, '', `/${encodeURIComponent(cleanSlug)}`);
            }}
          />
        )}

        {/* Admin Edit Business Modal */}
        {editingAdminBusiness && (
          <EditBusinessModal
            business={editingAdminBusiness}
            isOpen={Boolean(editingAdminBusiness)}
            onClose={() => setEditingAdminBusiness(null)}
            categories={(allCategories?.length ?? 0) > 0 ? allCategories : categories}
            coloniasList={coloniasList}
            onSave={handleSaveEditedBusiness}
          />
        )}

        {/* Claim Coupon Modal */}
        <ClaimCouponModal
          promotion={selectedPromotionForClaim}
          isOpen={Boolean(selectedPromotionForClaim)}
          onClose={() => setSelectedPromotionForClaim(null)}
          onCouponClaimed={() => {
            getPromotions().then(res => {
              if (res.success && res.promotions) setPromotions(res.promotions);
            }).catch(() => {});
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 font-sans selection:bg-amber-500 selection:text-white">

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab: any) => setActiveTab(tab)}
        favoritesCount={favorites.length}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenEmergencyGuide={() => setIsEmergencyGuideOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'directory' && (
          <div className="space-y-6">
            {/* Hero & Search Header */}
            <HeroSearch
              query={query}
              setQuery={setQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedColonia={selectedColonia}
              setSelectedColonia={setSelectedColonia}
              coloniasList={coloniasList}
              hasWhatsapp={hasWhatsapp}
              setHasWhatsapp={setHasWhatsapp}
              hasDelivery={hasDelivery}
              setHasDelivery={setHasDelivery}
              hasAddress={hasAddress}
              setHasAddress={setHasAddress}
              hasPhone={hasPhone}
              setHasPhone={setHasPhone}
              totalResults={filteredBusinesses.length}
              totalAll={businesses.length}
              onResetFilters={handleResetFilters}
              onGoToRegister={() => {
                setActiveTab('register');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSearchSubmit={() => {
                const target = document.getElementById('resultados-directorio');
                if (target) {
                  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
            />

            {/* Flash Promotions and Coupons Banner (Only visible when not searching) */}
            {!query.trim() && promotions && promotions.length > 0 && (
              <PromotionsBanner
                promotions={promotions}
                onSelectPromotion={(promo) => setSelectedPromotionForClaim(promo)}
                onSelectBusiness={(bizId) => {
                  const b = businesses.find(x => x.id === bizId);
                  if (b) setSelectedBusiness(b);
                }}
              />
            )}

            {/* Cartelera de Eventos y Actividades (Only visible when not searching) */}
            {!query.trim() && (
              <EventsBillboardBanner
                onOpenEmergencyGuide={() => setIsEmergencyGuideOpen(true)}
              />
            )}

            {/* Horizontal Category Bar */}
            <CategoryBar
              categories={categories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedSubcategory={selectedSubcategory}
              setSelectedSubcategory={setSelectedSubcategory}
            />

            {/* Active search filter notification bar */}
            {query.trim() && (
              <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-2">
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-stone-800">
                    <Search className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Mostrando resultados exclusivos para: <strong className="text-stone-950">"{query}"</strong> ({filteredBusinesses.length} {filteredBusinesses.length === 1 ? 'resultado' : 'resultados'})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    ✕ Limpiar búsqueda y ver cartelera y cupones
                  </button>
                </div>
              </div>
            )}

            {/* Business Listings Grid Container */}
            <div id="resultados-directorio" className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 space-y-5 sm:space-y-6 scroll-mt-20">
              {isLoading ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
                  <p className="text-sm font-medium text-stone-500">
                    Cargando negocios de empresasencarmen.com...
                  </p>
                </div>
              ) : filteredBusinesses.length === 0 ? (
                <div className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 text-center space-y-5 max-w-lg mx-auto my-8 sm:my-12 shadow-sm animate-fadeIn">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                    <Search className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/80">
                      Sin coincidencias
                    </span>
                    <h3 className="text-xl font-extrabold text-stone-900 tracking-tight">
                      {query.trim()
                        ? `No se encontró ningún negocio para "${query}"`
                        : 'No hay negocios con los filtros seleccionados'}
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
                      Intenta buscar con un término más corto (ej. "taller", "comida", "clima"), revisa la ortografía o limpia los filtros para explorar todo el directorio.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                    <button
                      onClick={handleResetFilters}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold transition-colors shadow-sm shadow-amber-500/20 cursor-pointer"
                    >
                      Limpiar filtros y ver todos
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('register');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      ¿No está tu negocio? Regístralo gratis
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {displayedBusinesses.map(business => (
                      <BusinessCard
                        key={business.id}
                        business={business}
                        isFavorite={favorites.some(f => f.id === business.id)}
                        onToggleFavorite={toggleFavorite}
                        onSelectBusiness={handleSelectBusiness}
                        isAdmin={isAdminAuthenticated}
                        onEditBusiness={(b) => setEditingAdminBusiness(b)}
                        onDeleteBusiness={handleDeleteBusinessFromHome}
                        onToggleRecommended={handleToggleRecommended}
                        onToggleTop={handleToggleTop}
                        onOpenDigitalCard={(b) => setDigitalCardBusiness(b)}
                        activePromotion={getActivePromoForBusiness(business)}
                        onOpenPromotion={(promo) => setSelectedPromotionForClaim(promo)}
                      />
                    ))}
                  </div>

                  {/* Load More Button if results exceed display limit */}
                  {displayLimit < filteredBusinesses.length && (
                    <div className="text-center pt-8 pb-4">
                      <button
                        onClick={() => setDisplayLimit(prev => prev + 24)}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-sm font-bold shadow-xs hover:border-amber-400 transition-all cursor-pointer"
                      >
                        <span>Cargar más negocios</span>
                        <ChevronDown className="w-4 h-4" />
                        <span className="text-xs text-stone-400 font-normal">
                          ({filteredBusinesses.length - displayLimit} restantes)
                        </span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'classifieds' && (
          <ClassifiedsView
            classifieds={classifieds}
            coloniasList={coloniasList}
            onOpenCreateModal={() => {
              setEditingClassified(null);
              setIsClassifiedCreateOpen(true);
            }}
            onOpenDetailModal={(ad) => setSelectedClassified(ad)}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesFullView
            categories={categories}
            allCategories={categories}
            onSelectCategory={handleSelectCategoryFromView}
          />
        )}

        {activeTab === 'zones' && (
          <CityZoneExplorer
            businesses={businesses}
            onSelectBusiness={handleSelectBusiness}
            onFilterByColonia={handleFilterByColoniaFromView}
          />
        )}

        {activeTab === 'favorites' && (
          <FavoritesView
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onSelectBusiness={handleSelectBusiness}
            onClearFavorites={() => saveFavorites([])}
            onGoBack={() => setActiveTab('directory')}
            onOpenPromotion={(promo) => setSelectedPromotionForClaim(promo)}
            getActivePromoForBusiness={(bizId: number) => {
              const b = businesses.find(x => x.id === bizId);
              return getActivePromoForBusiness(b) || undefined;
            }}
          />
        )}

        {activeTab === 'register' && (
          <RegisterBusinessView
            categories={categories}
            coloniasList={coloniasList}
            onSuccessReturn={() => {
              setActiveTab('directory');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onBusinessAdded={(newBiz) => {
              // Prepend to businesses state so it appears immediately at the very top of the directory
              setBusinesses(prev => [newBiz, ...prev.filter(b => b.id !== newBiz.id && b.name.toLowerCase() !== newBiz.name.toLowerCase())]);
              // Reset filters so the new business is visible right away
              setQuery(newBiz.name);
              setSelectedCategory('all');
              setSelectedSubcategory('');
              setSelectedColonia('todas');
              setHasWhatsapp(false);
              setHasDelivery(false);
              setHasAddress(false);
              setHasPhone(false);
            }}
          />
        )}
      </main>

      {/* Newest 15 Businesses Banner Before Footer (Only shown when not actively searching) */}
      {!query.trim() && (
        <NewestBusinessesBanner
          items={newestBusinesses}
          onSelectBusiness={handleSelectBusiness}
          allBusinesses={businesses}
        />
      )}

      {/* Business Details Modal */}
      <BusinessDetailModal
        business={selectedBusiness}
        isOpen={Boolean(selectedBusiness)}
        onClose={() => setSelectedBusiness(null)}
        isFavorite={Boolean(selectedBusiness && favorites.some(f => f.id === selectedBusiness.id))}
        onToggleFavorite={toggleFavorite}
        isAdmin={isAdminAuthenticated}
        onEditBusiness={(b: Business) => setEditingAdminBusiness(b)}
        onOpenEditModal={(b: Business, _pin: string) => {
          setSelectedBusiness(null);
          setEditingAdminBusiness(b);
        }}
        onDeleteBusiness={handleDeleteBusinessFromHome}
        onToggleRecommended={handleToggleRecommended}
        onToggleTop={handleToggleTop}
        onOpenDigitalCard={(b: Business) => setDigitalCardBusiness(b)}
        onOpenClientPage={(b: Business) => {
          setSelectedBusiness(null);
          setDirectBusinessView(b);
          const cleanSlug = b.slug || String(b.id);
          window.history.pushState({}, '', `/${encodeURIComponent(cleanSlug)}`);
        }}
        activePromotion={getActivePromoForBusiness(selectedBusiness) || undefined}
        onOpenPromotion={(promo: Promotion) => {
          setSelectedPromotionForClaim(promo);
        }}
      />

      {/* Digital Business Card Modal */}
      {digitalCardBusiness && (
        <DigitalCardModal
          business={digitalCardBusiness}
          isOpen={Boolean(digitalCardBusiness)}
          onClose={() => setDigitalCardBusiness(null)}
          onOpenClientPage={(b) => {
            setDigitalCardBusiness(null);
            setSelectedBusiness(null);
            setDirectBusinessView(b);
            const cleanSlug = b.slug || String(b.id);
            window.history.pushState({}, '', `/${encodeURIComponent(cleanSlug)}`);
          }}
        />
      )}

      {/* WordPress & Hostinger Connection Modal */}
      <WordPressSyncModal
        isOpen={isSyncModalOpen}
        initialTab={syncModalInitialTab}
        onClose={() => {
          setIsSyncModalOpen(false);
          setSyncModalInitialTab('start');
        }}
        stats={stats}
        health={health}
        businesses={businesses}
        categories={(allCategories?.length ?? 0) > 0 ? allCategories : categories}
        coloniasList={coloniasList}
        onTriggerSync={handleTriggerSync}
        isSyncing={isSyncing}
        syncResultMsg={syncResultMsg}
        onBusinessUpdated={loadData}
        onSelectBusiness={(biz) => {
          setSelectedBusiness(biz);
          setIsSyncModalOpen(false);
        }}
        onEditBusiness={(biz) => setEditingAdminBusiness(biz)}
        onToggleTop={handleToggleTop}
        onToggleRecommended={handleToggleRecommended}
        onDeleteBusiness={handleDeleteBusinessFromHome}
        onBusinessAdded={(newBiz) => {
          setBusinesses(prev => [newBiz, ...prev]);
          loadData();
        }}
        classifieds={classifieds}
        onOpenCreateClassified={() => {
          setEditingClassified(null);
          setIsClassifiedCreateOpen(true);
        }}
        onOpenEditClassified={(ad) => {
          setEditingClassified(ad);
          setIsClassifiedCreateOpen(true);
        }}
        onDeleteClassified={handleDeleteClassified}
        onOpenDetailClassified={(ad) => setSelectedClassified(ad)}
        onRefreshClassifieds={loadClassifieds}
      />

      {/* Admin Edit Business Modal */}
      {editingAdminBusiness && (
        <EditBusinessModal
          business={editingAdminBusiness}
          isOpen={Boolean(editingAdminBusiness)}
          onClose={() => setEditingAdminBusiness(null)}
          categories={(allCategories?.length ?? 0) > 0 ? allCategories : categories}
          coloniasList={coloniasList}
          onSave={handleSaveEditedBusiness}
        />
      )}

      {/* Classifieds Detail Modal */}
      <ClassifiedDetailModal
        ad={selectedClassified}
        isOpen={Boolean(selectedClassified)}
        onClose={() => setSelectedClassified(null)}
        onEdit={(ad) => {
          setEditingClassified(ad);
          setIsClassifiedCreateOpen(true);
        }}
        onDelete={handleDeleteClassified}
        isAdmin={isAdminAuthenticated}
      />

      {/* Classifieds Create/Edit Modal */}
      <ClassifiedCreateModal
        isOpen={isClassifiedCreateOpen}
        onClose={() => {
          setIsClassifiedCreateOpen(false);
          setEditingClassified(null);
        }}
        onSubmitAd={handleCreateOrUpdateClassified}
        coloniasList={coloniasList}
        editingAd={editingClassified}
      />

      {/* Claim Coupon Modal */}
      <ClaimCouponModal
        promotion={selectedPromotionForClaim}
        isOpen={Boolean(selectedPromotionForClaim)}
        onClose={() => setSelectedPromotionForClaim(null)}
        onCouponClaimed={() => {
          getPromotions().then(res => {
            if (res.success && res.promotions) setPromotions(res.promotions);
          }).catch(() => {});
        }}
      />

      {/* 24/7 Emergency & Public Utility Guide Modal */}
      <EmergencyGuideModal
        isOpen={isEmergencyGuideOpen}
        onClose={() => setIsEmergencyGuideOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 border-t border-stone-800 text-xs mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 pb-8 border-b border-stone-800">
            {/* Brand column */}
            <div className="space-y-3 md:col-span-2">
              <div className="inline-flex items-center px-4 py-3 rounded-2xl bg-white shadow-sm">
                <BrandLogo />
              </div>
              <p className="text-stone-400 text-xs leading-relaxed max-w-sm">
                Directorio empresarial interactivo de Ciudad del Carmen, Campeche. Conectando a ciudadanos y visitantes con comercios, talleres, servicios profesionales y restaurantes locales.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <a
                  href="https://facebook.com/empresasencarmen"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-[#1877F2]/15 text-[#1877F2] hover:bg-[#1877F2] hover:text-white border border-[#1877F2]/30 text-[11px] font-semibold transition-colors"
                >
                  Facebook
                </a>
                <a
                  href="https://www.facebook.com/groups/506440126097710"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-blue-600/15 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 text-[11px] font-semibold transition-colors"
                >
                  Grupo Ventas
                </a>
                <a
                  href="https://www.tiktok.com/@empresasencarmen"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-stone-800 text-stone-200 hover:bg-black hover:text-white border border-stone-700 text-[11px] font-semibold transition-colors"
                >
                  TikTok
                </a>
                <a
                  href="https://chat.whatsapp.com/LYO8hYfeeNa1REtDj0Ztpx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366] hover:text-white border border-[#25D366]/30 text-[11px] font-semibold transition-colors"
                >
                  WhatsApp 1
                </a>
                <a
                  href="https://chat.whatsapp.com/JnYo6VTh54RHehkNAVykby"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366] hover:text-white border border-[#25D366]/30 text-[11px] font-semibold transition-colors"
                >
                  WhatsApp 2
                </a>
                <a
                  href="https://chat.whatsapp.com/JAKoiEtTdXS9lEOm0tLTor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500 hover:text-stone-950 border border-amber-500/30 text-[11px] font-semibold transition-colors"
                >
                  Comidas WhatsApp
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-2">
              <p className="font-semibold text-white text-xs uppercase tracking-wider">
                Secciones
              </p>
              <ul className="space-y-1.5">
                <li>
                  <button
                    onClick={() => { setActiveTab('directory'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="hover:text-white transition-colors"
                  >
                    Directorio Completo
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => { setActiveTab('categories'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="hover:text-white transition-colors"
                  >
                    Categorías y Giros
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => { setActiveTab('zones'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="hover:text-white transition-colors"
                  >
                    Negocios por Colonia
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => { setActiveTab('favorites'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="hover:text-white transition-colors"
                  >
                    Guardados / Favoritos
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => { setActiveTab('register'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
                  >
                    + Registrar Mi Empresa
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setIsEmergencyGuideOpen(true)}
                    className="text-rose-400 hover:text-rose-300 font-bold transition-colors flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping inline-block" />
                    <span>🚨 Auxilio y Urgencias 24/7</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-stone-500">
            <p>
              © {new Date().getFullYear()} Directorio Empresas en Carmen · Ciudad del Carmen, Campeche, México.
            </p>
            <p>
              Datos obtenidos en tiempo real de <span className="font-mono text-stone-400">empresasencarmen.com</span>
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-800/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-stone-500 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(true)}
                title="Administración (π)"
                aria-label="Administración (π)"
                className="text-stone-400 hover:text-amber-400 font-serif text-sm px-1 cursor-pointer transition-colors select-none leading-none"
              >
                π
              </button>
              <span className="text-stone-300 font-bold">
                Versión del portal instalado: <span className="text-amber-400 font-mono">{liveVersion || APP_VERSION}</span>
              </span>
            </div>
            <span className="text-[10px] text-stone-500">Plataforma PWA Oficial · Ciudad del Carmen, Campeche</span>
          </div>
        </div>
      </footer>

      {/* Botón flotante de ayuda en línea por WhatsApp (elevado para no tapar el footer) */}
      <aside aria-label="Ayuda en línea" className="fixed bottom-20 right-5 z-40 flex items-center group">
        <a
          href="https://wa.me/+5219383895009?text=Hola%2C%20necesito%20ayuda%20con%20el%20directorio%20de%20Empresas%20en%20Carmen"
          target="_blank"
          rel="noopener noreferrer"
          title="Ayuda en línea por WhatsApp"
          className="flex items-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-full shadow-lg shadow-emerald-500/35 hover:shadow-xl hover:shadow-emerald-500/45 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5 fill-white/20" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white" />
          </div>
          <span className="text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap">
            Ayuda en línea
          </span>
        </a>
      </aside>
    </div>
  );
}
