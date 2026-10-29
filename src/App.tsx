import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Hero, PromoItem, EventItem } from './components/Hero';
import { BusinessCard } from './components/BusinessCard';
import { Footer } from './components/Footer';
import { EmergencyGuideModal } from './components/EmergencyGuideModal';
import { BusinessDetailModal } from './components/BusinessDetailModal';
import { ClaimCouponModal } from './components/ClaimCouponModal';
import { AllPromotionsModal } from './components/AllPromotionsModal';
import { ClientBusinessPageView } from './components/ClientBusinessPageView';
import { DirectBusinessView } from './components/DirectBusinessView';
import { DigitalCardModal } from './components/DigitalCardModal';
import { EditBusinessModal } from './components/EditBusinessModal';
import { WordPressSyncModal } from './components/WordPressSyncModal';
import { MessageSquare, RefreshCw, Lock, X, Globe, ChevronDown } from 'lucide-react';
import seedPromotions from './data/promotions_seed.json';
import seedEvents from './data/events_carmen.json';
import ALL_COLONIAS_CARMEN from './data/colonias_carmen.json';
import { RATINGS_UPDATED } from './utils/realRatings';
import { BusinessRatingStats, fetchAllBusinessRatings } from './services/api';
import { EventsPage } from './components/EventsPage';
import { ClassifiedsView } from './components/ClassifiedsView';
import { RegisterBusinessView } from './components/RegisterBusinessView';
import { ClassifiedCreateModal } from './components/ClassifiedCreateModal';
import { ClassifiedDetailModal } from './components/ClassifiedDetailModal';
import { Promotion, ClassifiedAd, Business } from './types';
import { isSessionAdminAuthenticated, verifyAdminSession } from './utils/adminAuth';
import { adminDeleteBusiness, adminUpdateBusiness, getAdminPromotions } from './services/api';
import { sortEventsChronologically, parseEventStartDate, isEventExpired, filterActiveUpcomingEvents } from './services/eventsService';
import { getSavedPortalLinks } from './components/AdminLinksAndAdsManager';
function getBusinessSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
  const urlParams = new URLSearchParams(window.location.search);
  const slugFromQuery = urlParams.get('empresa') || urlParams.get('negocio') || urlParams.get('slug');

  if (slugFromQuery) {
    return slugFromQuery.toLowerCase().trim();
  }

  // Check if window.__INITIAL_BUSINESS_SLUG__ was injected by server
  const injectedSlug = (window as any).__INITIAL_BUSINESS_SLUG__;
  if (injectedSlug && typeof injectedSlug === 'string' && injectedSlug.trim()) {
    const cleanInjected = injectedSlug.toLowerCase().trim();
    if (!['negocios', 'promociones', 'eventos', 'clasificados', 'registro', 'contacto', 'admin', 'index.html'].includes(cleanInjected)) {
      return cleanInjected;
    }
  }

  if (!path) return null;

  // Clean prefix like empresa/ or negocio/ or producto/
  const cleanPath = path.replace(/^(empresa|negocio|producto)\//i, '').toLowerCase().trim();

  const reservedRoutes = new Set([
    'negocios',
    'promociones',
    'eventos',
    'clasificados',
    'registro',
    'contacto',
    'admin',
    'aviso-de-privacidad',
    'terminos',
    'api',
    'index.html'
  ]);

  if (reservedRoutes.has(cleanPath)) {
    return null;
  }

  return cleanPath;
}

function findBusinessInList(list: Business[], candidateSlug: string): Business | null {
  if (!candidateSlug || !Array.isArray(list)) return null;
  const clean = candidateSlug.toLowerCase().trim();
  return list.find(b =>
    (b.slug && b.slug.toLowerCase() === clean) ||
    String(b.id) === clean ||
    ((b as any).oldId != null && String((b as any).oldId).toLowerCase() === clean) ||
    (Array.isArray((b as any).previousSlugs) && (b as any).previousSlugs.some((ps: string) => ps.toLowerCase() === clean)) ||
    (Array.isArray((b as any).previousNames) && (b as any).previousNames.some((pn: string) => pn.toLowerCase().replace(/[^a-z0-9]+/g, '-') === clean || pn.toLowerCase().trim() === clean)) ||
    (b.name && b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === clean) ||
    (b.name && b.name.toLowerCase().trim() === clean)
  ) || null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('negocios');
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedColonia, setSelectedColonia] = useState('Todas');

  // Modales interactivos y vistas dedicadas
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [landingBusiness, setLandingBusiness] = useState<Business | null>(null);
  const [digitalCardBusiness, setDigitalCardBusiness] = useState<Business | null>(null);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [activePromoModal, setActivePromoModal] = useState<Promotion | null>(null);
  const [isAllPromotionsModalOpen, setIsAllPromotionsModalOpen] = useState(false);
  const [isChannelsAccordionOpen, setIsChannelsAccordionOpen] = useState(false);
  const [promotionsList, setPromotionsList] = useState<Promotion[]>(() => (seedPromotions as unknown as Promotion[]) || []);

  useEffect(() => {
    getAdminPromotions().then((data) => {
      if (data && Array.isArray(data.promotions) && data.promotions.length > 0) {
        setPromotionsList(data.promotions);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/version?t=' + Date.now(), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.version) {
          try {
            localStorage.setItem('encarmen_active_version', data.version);
          } catch (_) {}
        }
      })
      .catch(() => {});
  }, []);

  const heroPromos: PromoItem[] = useMemo(() => {
    const active = promotionsList.filter((p) => p.isActive !== false);
    return active.map((p) => ({
      id: p.id,
      titulo: p.discount ? `${p.discount} en ${p.businessName || 'Promoción'}` : p.title,
      negocio: p.businessName,
      descuento: p.discount,
      detalle: p.description,
      img: p.promoImage || p.businessImage || '/images/categories/cuidado-y-belleza-personal.jpg',
    }));
  }, [promotionsList]);

  // Los eventos para la Cartelera de Eventos en el Hero ordenados cronológicamente del más próximo al más distante
  const heroEvents: EventItem[] = useMemo(() => {
    const raw = (seedEvents as any[]) || [];
    // 1. Eliminar automáticamente eventos cuya fecha ya haya pasado
    const active = filterActiveUpcomingEvents(raw);
    // 2. Ordenar cronológicamente del más próximo al más distante
    const sorted = sortEventsChronologically(active);

    return sorted.slice(0, 3).map((e) => {
      const normDate = (e.date || '').normalize('NFKD').toLowerCase();
      const months: Record<string, string> = {
        enero: 'ENE',
        feb: 'FEB',
        febrero: 'FEB',
        marzo: 'MAR',
        abril: 'ABR',
        mayo: 'MAY',
        junio: 'JUN',
        julio: 'JUL',
        agosto: 'AGO',
        sep: 'SEP',
        sept: 'SEP',
        septiembre: 'SEP',
        oct: 'OCT',
        octubre: 'OCT',
        nov: 'NOV',
        noviembre: 'NOV',
        dic: 'DIC',
        diciembre: 'DIC',
      };

      let mes = 'OCT';
      for (const [k, v] of Object.entries(months)) {
        if (normDate.includes(k)) {
          mes = v;
          break;
        }
      }

      const dayMatch = normDate.match(/\b([1-3]?\d)\b/);
      const dia = dayMatch ? dayMatch[1].padStart(2, '0') : '15';

      let timeStr = '';
      if (e.time) {
        const rawTime = (e.time as string).normalize('NFKD');
        const showMatch = rawTime.match(/show\s*(\d{1,2}(?::\d{2})?\s*(?:pm|am)?)/i);
        const standardMatch = rawTime.match(/(\d{1,2}:\d{2}\s*(?:p\.?\s*m\.?|a\.?\s*m\.?)?|\d{1,2}\s*(?:pm|am|hrs))/i);
        if (showMatch) {
          timeStr = showMatch[1].trim();
        } else if (standardMatch) {
          timeStr = standardMatch[1].trim();
        }
      }

      const cleanTitle = (e.title || 'Evento en Carmen').trim();
      const titulo = timeStr ? `${cleanTitle} - ${timeStr}` : cleanTitle;
      const rawLugar = (e.location || 'Ciudad del Carmen').trim();
      const lugar = rawLugar.split(/[,•]/)[0].trim() || 'Ciudad del Carmen';

      return {
        id: e.id,
        dia,
        mes,
        titulo,
        lugar,
      };
    });
  }, []);

  // Lista completa de eventos vigentes (eliminando automáticamente los pasados) ordenada cronológicamente
  const sortedEventsList = useMemo(() => {
    const raw = (seedEvents as any[]) || [];
    return sortEventsChronologically(filterActiveUpcomingEvents(raw));
  }, []);

  // Anuncios Clasificados y Bolsa de Trabajo (Moderación estricta: solo aprobados por el administrador)
  const [classifiedsList, setClassifiedsList] = useState<ClassifiedAd[]>(() => {
    try {
      const saved = localStorage.getItem('encarmen_approved_classifieds_v1');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed.filter((ad: any) => ad && ad.approvedByAdmin === true)
        : [];
    } catch {
      return [];
    }
  });
  const [isCreateClassifiedOpen, setIsCreateClassifiedOpen] = useState(false);
  const [selectedClassified, setSelectedClassified] = useState<ClassifiedAd | null>(null);

  const handleCreateClassified = async (adData: Partial<ClassifiedAd>) => {
    const newAd: ClassifiedAd = {
      id: `ad-${Date.now()}`,
      title: adData.title || '',
      category: adData.category || 'compra-venta',
      subcategory: adData.subcategory || '',
      description: adData.description || '',
      price: adData.price || 0,
      priceType: adData.priceType || 'fixed',
      currency: 'MXN',
      phone: adData.phone || '',
      whatsapp: adData.whatsapp || adData.phone || '',
      colonia: adData.colonia || 'Centro',
      location: adData.location || 'Ciudad del Carmen, Campeche',
      contactName: adData.contactName || 'Anunciante',
      image: adData.image || '',
      source: 'Publicación Ciudadana',
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    setClassifiedsList((prev) => {
      const updated = [newAd, ...prev];
      try {
        localStorage.setItem('encarmen_approved_classifieds_v1', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
    return { success: true, message: 'Anuncio publicado con éxito en la bolsa de trabajo y clasificados.' };
  };

  // Overrides dinámicos de administración (TOP, Recomendadas, Eliminadas, Ediciones)
  const [businessOverrides, setBusinessOverrides] = useState<Record<string, Partial<Business>>>({});
  const [deletedBusinessIds, setDeletedBusinessIds] = useState<number[]>([]);

  // Búsqueda y Paginación
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(30);

  // Autenticación de Administración
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => isSessionAdminAuthenticated());
  useEffect(() => {
    let alive=true;
    const reflect=()=>{if(alive)setIsAdminLoggedIn(isSessionAdminAuthenticated());};
    const refresh=async()=>{await verifyAdminSession();reflect();};
    void refresh();
    window.addEventListener('admin-auth-changed',reflect);
    window.addEventListener('focus',refresh);
    const timer=setInterval(refresh,25000);
    return ()=>{alive=false;clearInterval(timer);window.removeEventListener('admin-auth-changed',reflect);window.removeEventListener('focus',refresh);};
  },[]);

  const [ratingStats, setRatingStats] = useState<Record<string, BusinessRatingStats>>({});
  const [ratingsStatus, setRatingsStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    let alive = true;
    let request = 0;
    const load = async () => {
      const order = ++request;
      setRatingsStatus('loading');
      try {
        const stats = await fetchAllBusinessRatings();
        if (alive && order === request) { setRatingStats(stats); setRatingsStatus('ready'); }
      } catch {
        if (alive && order === request) { setRatingStats({}); setRatingsStatus('error'); }
      }
    };
    const reload = () => { void load(); };
    reload();
    window.addEventListener(RATINGS_UPDATED, reload);
    window.addEventListener('focus', reload);
    return () => { alive = false; window.removeEventListener(RATINGS_UPDATED, reload); window.removeEventListener('focus', reload); };
  }, []);

  const [businessesList, setBusinessesList] = useState<Business[]>([]);
  const [businessesStatus, setBusinessesStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [businessesReload, setBusinessesReload] = useState(0);
  const businessRequestVersion = useRef(0);
  const businessRequestController = useRef<AbortController | null>(null);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    businessRequestController.current = controller;
    const version = ++businessRequestVersion.current;
    setBusinessesStatus('loading');
    fetch('/api/businesses', { cache: 'no-store', signal: controller.signal })
      .then(async r => {
        if (!r.ok) throw new Error('Business source unavailable');
        const data = await r.json();
        if (!Array.isArray(data.businesses)) throw new Error('Invalid business response');
        if (!alive || version !== businessRequestVersion.current) return;
        setBusinessesList(data.businesses);
        setBusinessOverrides({});
        setBusinessesStatus('ready');
        const slug = getBusinessSlugFromUrl();
        if (slug) setLandingBusiness(findBusinessInList(data.businesses, slug));
        setSelectedBusiness(previous => previous ? data.businesses.find((b: Business) => String(b.id) === String(previous.id)) || null : null);
      }).catch(() => { if (alive && version === businessRequestVersion.current) { setBusinessesStatus('error'); setBusinessesList([]); setSelectedBusiness(null); setLandingBusiness(null); } });
    return () => { alive = false; controller.abort(); };
  }, [businessesReload]);

  useEffect(() => {
    const refresh = () => setBusinessesReload(previous => previous + 1);
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  useEffect(() => {
    const cleanPath = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase().trim();
    if (['promociones', 'eventos', 'clasificados', 'registro'].includes(cleanPath)) setActiveTab(cleanPath);
  }, []);

  // Listen to browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const slug = getBusinessSlugFromUrl();
      if (slug) {
        const match = findBusinessInList(businessesList, slug);
        if (match) {
          setLandingBusiness(match);
        } else {
          fetch(`/api/businesses/${encodeURIComponent(slug)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((resData) => {
              if (resData && resData.business) {
                setLandingBusiness(resData.business);
              }
            })
            .catch(() => {});
        }
      } else {
        setLandingBusiness(null);
        const cleanPath = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase().trim();
        if (['promociones', 'eventos', 'clasificados', 'registro', 'negocios'].includes(cleanPath)) {
          setActiveTab(cleanPath);
        } else {
          setActiveTab('negocios');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [businessesList]);

  // Synchronize document title with active landing page
  useEffect(() => {
    if (landingBusiness) {
      document.title = `${landingBusiness.name} | Empresas en Carmen`;
    } else {
      document.title = 'Directorio Empresas en Carmen | Ciudad del Carmen, Campeche';
    }
  }, [landingBusiness]);

  const openBusinessLanding = (b: Business) => {
    setSelectedBusiness(null);
    setDigitalCardBusiness(null);
    setLandingBusiness(b);
    const targetUrl = b.slug ? `/${b.slug}` : `/empresa/${b.id}`;
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({}, '', targetUrl);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Negocios con calificaciones reales integradas (si count === 0, rating es 0 y se muestra 'Sin calificar aún')
  // En pantalla principal: Empresas TOP van SIEMPRE en los primeros lugares de la lista.
  const businesses: Business[] = useMemo(() => {
    const raw = Array.isArray(businessesList) ? businessesList : [];

    return raw
      .filter((b): b is Business => Boolean(b && typeof b === 'object' && b.id !== undefined && !deletedBusinessIds.includes(Number(b.id))))
      .map((b) => {
        const realStat = ratingsStatus === 'ready' ? ratingStats[String(b.id)] : undefined;
        const override = businessOverrides[String(b.id)] || {};
        return {
          ...b,
          ...override,
          rating: realStat?.average ?? 0,
          reviewCount: realStat?.count ?? 0,
        };
      })
      .sort((a, b) => {
        // 1. EMPRESAS TOP SIEMPRE PRIMERO EN LA PÁGINA PRINCIPAL
        const isTopA = Boolean(a?.isTopBusiness);
        const isTopB = Boolean(b?.isTopBusiness);
        if (isTopA !== isTopB) return isTopA ? -1 : 1;

        // 2. EMPRESAS RECOMENDADAS DESPUÉS DE LAS TOP
        const isRecA = Boolean(a?.isRecommended);
        const isRecB = Boolean(b?.isRecommended);
        if (isRecA !== isRecB) return isRecA ? -1 : 1;

        // 3. Orden cronológico / más recientes
        const timeA = new Date((a as any)?.createdAt || 0).getTime() || 0;
        const timeB = new Date((b as any)?.createdAt || 0).getTime() || 0;
        if (timeB !== timeA) return timeB - timeA;
        return (Number(b?.id) || 0) - (Number(a?.id) || 0);
      });
  }, [businessesList, businessOverrides, deletedBusinessIds, ratingStats, ratingsStatus]);

  const categoriasList = useMemo(() => {
    const set = new Set<string>();
    businesses.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set).sort();
  }, [businesses]);

  const portalLinks = useMemo(() => getSavedPortalLinks(), []);

  const filteredBusinesses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matches = businesses.filter((b) => {
      // 1. FILTRADO ESTRICTO POR CATEGORÍA
      let matchCategoria = true;
      if (selectedCategory && selectedCategory !== 'Todos') {
        const cat = (b.category || '').toLowerCase();
        const sel = selectedCategory.toLowerCase();

        if (sel === 'talleres mecánicos' || sel === 'talleres mecanicos') {
          // Filtrado estricto: solo talleres mecánicos y automotrices reales
          matchCategoria = cat.includes('talleres mecánicos') || cat.includes('talleres mecanicos');
        } else if (sel === 'automotriz y motocicletas') {
          matchCategoria = cat.includes('automotriz') || cat.includes('talleres mecánicos') || cat.includes('agencias, lotes');
        } else if (sel === 'alimentos y bebidas' || sel === 'gastronomía' || sel === 'gastronomia') {
          matchCategoria = cat.includes('alimento') || cat.includes('restauran') || cat.includes('antojito') || cat.includes('cafeter') || cat.includes('distribución de alimentos');
        } else if (sel === 'salud, bienestar y educación' || sel === 'salud') {
          matchCategoria = cat.includes('salud') || cat.includes('clínic') || cat.includes('farmacia') || cat.includes('psicolog') || cat.includes('educaci');
        } else if (sel === 'tecnología, imprentas y comercio al menudeo' || sel === 'tecnología y comercio' || sel === 'compras') {
          matchCategoria = cat.includes('tecnolog') || cat.includes('regalo') || cat.includes('imprenta') || cat.includes('celular') || cat.includes('boutique') || cat.includes('ropa') || cat.includes('calzado');
        } else if (sel === 'cuidado y belleza personal') {
          matchCategoria = cat.includes('belleza') || cat.includes('uñas') || cat.includes('barber') || cat.includes('cosm') || cat.includes('estét') || cat.includes('masaje');
        } else if (sel === 'servicios del hogar y oficios') {
          matchCategoria = cat.includes('hogar') || cat.includes('clima') || cat.includes('aluminio') || cat.includes('plomer') || cat.includes('lavander');
        } else if (sel === 'sector industrial, petrolero y construcción' || sel === 'sector industrial, petrolero y obras') {
          matchCategoria = cat.includes('industrial') || cat.includes('ingenier') || cat.includes('ferreter') || cat.includes('marítim') || cat.includes('seguridad industrial');
        } else if (sel === 'servicios logísticos y transporte') {
          matchCategoria = cat.includes('logístic') || cat.includes('mandadito') || cat.includes('flete') || cat.includes('chofer') || cat.includes('taxi');
        } else if (sel === 'servicios profesionales, legales y financieros') {
          matchCategoria = cat.includes('profesional') || cat.includes('consultor') || cat.includes('despacho') || cat.includes('notar');
        } else if (sel === 'renta de inmuebles, espacios y mascotas') {
          matchCategoria = cat.includes('inmueble') || cat.includes('palapa') || cat.includes('veterinar') || cat.includes('mascota');
        } else if (sel === 'servicios 24h') {
          matchCategoria = /24h|24 horas|24\/7|urgencia/i.test((b.schedule || '') + ' ' + (b.delivery || '') + ' ' + (b.description || ''));
        } else {
          matchCategoria = cat === sel || cat.includes(sel);
        }
      }

      // 2. FILTRADO POR COLONIA
      let matchColonia = true;
      if (selectedColonia && selectedColonia !== 'Todas') {
        const colText = `${b.colonia || ''} ${b.address || ''}`.toLowerCase();
        const selCol = selectedColonia.toLowerCase();

        if (selCol === 'centro') {
          matchColonia = colText.includes('centro');
        } else if (selCol === 'renovación' || selCol === 'renovacion') {
          matchColonia = colText.includes('renovaci');
        } else if (selCol === 'miguel de la madrid') {
          matchColonia = colText.includes('madrid');
        } else if (selCol === 'aviación' || selCol === 'aviacion') {
          matchColonia = colText.includes('aviaci');
        } else if (selCol === 'morelos') {
          matchColonia = colText.includes('morelos');
        } else if (selCol === 'tecolutla') {
          matchColonia = colText.includes('tecolutla');
        } else if (selCol === 'playa norte') {
          matchColonia = colText.includes('playa norte');
        } else if (selCol === 'justo sierra') {
          matchColonia = colText.includes('justo sierra');
        } else if (selCol === 'manigua') {
          matchColonia = colText.includes('manigua');
        } else if (selCol === 'tila') {
          matchColonia = colText.includes('tila');
        } else if (selCol === 'guanal') {
          matchColonia = colText.includes('guanal');
        } else if (selCol === 'concordia') {
          matchColonia = colText.includes('concordia');
        } else {
          matchColonia = colText.includes(selCol);
        }
      }

      // 3. BÚSQUEDA POR TEXTO LIBRE (si el usuario escribe en el input de búsqueda)
      let matchQuery = true;
      if (q) {
        matchQuery = Boolean(
          b.name.toLowerCase().includes(q) ||
          (b.description && b.description.toLowerCase().includes(q)) ||
          (b.shortDescription && b.shortDescription.toLowerCase().includes(q)) ||
          (b.category && b.category.toLowerCase().includes(q)) ||
          (b.colonia && b.colonia.toLowerCase().includes(q)) ||
          (b.address && b.address.toLowerCase().includes(q))
        );
      }

      return matchCategoria && matchColonia && matchQuery;
    });

    return matches.sort((a, b) => {
      if (q) {
        // EN BÚSQUEDA (ej. "hamburguesas"): Las empresas recomendadas deben aparecer hasta arriba como primer resultado
        const isRecA = Boolean(a.isRecommended);
        const isRecB = Boolean(b.isRecommended);
        if (isRecA !== isRecB) return isRecA ? -1 : 1;

        // Si ambas son recomendadas o ninguna lo es, desempatar por Empresa TOP
        const isTopA = Boolean(a.isTopBusiness);
        const isTopB = Boolean(b.isTopBusiness);
        if (isTopA !== isTopB) return isTopA ? -1 : 1;
      } else {
        // EN LA PANTALLA PRINCIPAL / NAVEGACIÓN GENERAL:
        // Si hay empresas marcadas como TOP, esas deben aparecer siempre entre las primeras antes que todos los demás negocios
        const isTopA = Boolean(a.isTopBusiness);
        const isTopB = Boolean(b.isTopBusiness);
        if (isTopA !== isTopB) return isTopA ? -1 : 1;

        const isRecA = Boolean(a.isRecommended);
        const isRecB = Boolean(b.isRecommended);
        if (isRecA !== isRecB) return isRecA ? -1 : 1;
      }

      const timeA = new Date((a as any).createdAt || 0).getTime();
      const timeB = new Date((b as any).createdAt || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return Number(b.id) - Number(a.id);
    });
  }, [businesses, searchQuery, selectedCategory]);

  const handleOpenPromo = (promoId?: string | number) => {
    const found = promotionsList.find((p) => p.id === promoId) || promotionsList[0] || null;
    setActivePromoModal(found);
  };

  const handleOpenEvent = (eventId?: string | number) => {
    setActiveTab('eventos');
  };

  const activePromoBusinessIds = useMemo(() => {
    const promos = (seedPromotions as unknown as Promotion[]) || [];
    const set = new Set<string>();
    promos.forEach((p) => {
      if (p.isActive !== false) {
        if (p.businessId) set.add(String(p.businessId));
        if (p.businessSlug) set.add(p.businessSlug.toLowerCase());
      }
    });
    return set;
  }, []);

  const toggleFavorite = (b: Business) => {
    const bId = Number(b.id);
    setFavorites((prev) =>
      prev.includes(bId) ? prev.filter((id) => id !== bId) : [...prev, bId]
    );
  };

  const handleToggleTop = (b: Business) => {
    const bId = String(b.id);
    const currentTop = businessOverrides[bId]?.isTopBusiness ?? b.isTopBusiness ?? false;
    setBusinessOverrides((prev) => ({
      ...prev,
      [bId]: { ...prev[bId], isTopBusiness: !currentTop }
    }));
    if (selectedBusiness && String(selectedBusiness.id) === bId) {
      setSelectedBusiness((prev) => prev ? { ...prev, isTopBusiness: !currentTop } : null);
    }
    if (landingBusiness && String(landingBusiness.id) === bId) {
      setLandingBusiness((prev) => prev ? { ...prev, isTopBusiness: !currentTop } : null);
    }
  };

  const handleToggleRecommended = (b: Business) => {
    const bId = String(b.id);
    const currentRec = businessOverrides[bId]?.isRecommended ?? b.isRecommended ?? false;
    setBusinessOverrides((prev) => ({
      ...prev,
      [bId]: { ...prev[bId], isRecommended: !currentRec }
    }));
    if (selectedBusiness && String(selectedBusiness.id) === bId) {
      setSelectedBusiness((prev) => prev ? { ...prev, isRecommended: !currentRec } : null);
    }
    if (landingBusiness && String(landingBusiness.id) === bId) {
      setLandingBusiness((prev) => prev ? { ...prev, isRecommended: !currentRec } : null);
    }
  };

  const handleDeleteBusiness = async (b: Business) => {
    try {
      await adminDeleteBusiness(Number(b.id));
    } catch (_) {}
    setDeletedBusinessIds((prev) => [...prev, Number(b.id)]);
    setBusinessesList((prev) => prev.filter((item) => String(item.id) !== String(b.id)));
    if (selectedBusiness && String(selectedBusiness.id) === String(b.id)) {
      setSelectedBusiness(null);
    }
    if (landingBusiness && String(landingBusiness.id) === String(b.id)) {
      setLandingBusiness(null);
    }
  };

  const handleSaveBusiness = async (id: number, updatedData: Partial<Business>) => {
    try {
      // 1. Enviar cambios al servidor (persiste en MariaDB, businessesCache y businesses_seed.json)
      const res = await adminUpdateBusiness(id, updatedData);
      if (!res.success) return { success: false, message: res.message || 'No se pudieron guardar los cambios en el servidor.' };
      // A pending older catalog response must not overwrite a confirmed save.
      businessRequestVersion.current += 1;
      businessRequestController.current?.abort();
      setBusinessesStatus('ready');
      const serverUpdated = res.business;
      const finalData: Partial<Business> = serverUpdated ? { ...updatedData, ...serverUpdated } : updatedData;

      // 2. Actualizar lista de negocios en memoria
      setBusinessesList((prev) =>
        prev.map((b) => (Number(b.id) === id ? { ...b, ...finalData } : b))
      );

      // 3. Registrar overrides locales
      setBusinessOverrides((prev) => ({
        ...prev,
        [String(id)]: { ...prev[String(id)], ...finalData }
      }));

      // 4. Actualizar negocio modal si está abierto
      if (selectedBusiness && Number(selectedBusiness.id) === id) {
        setSelectedBusiness((prev) => (prev ? { ...prev, ...finalData } : null));
      }

      // 5. Actualizar landingBusiness si estamos en su página, y actualizar la URL en la barra de direcciones
      if (landingBusiness && Number(landingBusiness.id) === id) {
        const nextLanding = { ...landingBusiness, ...finalData };
        setLandingBusiness(nextLanding);
        if (finalData.slug && typeof window !== 'undefined') {
          const newUrl = `/${finalData.slug}`;
          if (window.location.pathname !== newUrl) {
            window.history.replaceState({}, '', newUrl);
          }
        }
      }

      return {
        success: true,
        message: res.message || 'Empresa actualizada correctamente'
      };
    } catch (err: any) {
      console.error('Error saving business to API:', err);
      return { success: false, message: err instanceof Error ? err.message : 'Error de conexión. Los cambios no se guardaron.' };
    }
  };

  const handleSelectNavbarFilter = (type: 'category' | 'colonia', value: string) => {
    setActiveTab('negocios');
    if (type === 'category') {
      setSelectedCategory(value);
      setSelectedColonia('Todas');
      setSearchQuery('');
    } else {
      setSelectedColonia(value);
      setSelectedCategory('Todos');
      setSearchQuery('');
    }
    setVisibleCount(30);

    // Desplazamiento suave al catálogo de negocios para ver los resultados inmediatamente
    setTimeout(() => {
      const el = document.getElementById('catalogo') || document.getElementById('directorio') || document.querySelector('main');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 520, behavior: 'smooth' });
      }
    }, 120);
  };

  const displayedBusinesses = filteredBusinesses.slice(0, visibleCount);

  // If a business standalone landing page is active
  if (landingBusiness) {
    return (
      <>
        <DirectBusinessView
          business={landingBusiness as any}
          onBack={() => {
            setLandingBusiness(null);
            if (window.location.pathname !== '/') window.history.pushState({}, '', '/');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onBackToDirectory={() => {
            setLandingBusiness(null);
            if (window.location.pathname !== '/') window.history.pushState({}, '', '/');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onSearchFromPage={(query) => {
            setSearchQuery(query);
            setLandingBusiness(null);
            if (window.location.pathname !== '/') window.history.pushState({}, '', '/');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenDigitalCard={(b) => setDigitalCardBusiness(b)}
          isAdmin={isAdminLoggedIn}
          onEdit={(b) => setEditingBusiness(b)}
          onEditBusiness={(b) => setEditingBusiness(b)}
          onDelete={(id) => handleDeleteBusiness(landingBusiness)}
          onDeleteBusiness={handleDeleteBusiness}
          onToggleRecommended={(id) => handleToggleRecommended(landingBusiness)}
          onToggleTop={(id) => handleToggleTop(landingBusiness)}
          isFavorite={favorites.includes(Number(landingBusiness.id))}
          onToggleFavorite={toggleFavorite as any}
          activePromotion={
            ((seedPromotions as unknown as Promotion[]) || []).find(
              (p) =>
                p.isActive !== false &&
                (String(p.businessId) === String(landingBusiness.id) ||
                  (landingBusiness.slug && p.businessSlug === landingBusiness.slug))
            )
          }
          onOpenPromotion={(p) => setActivePromoModal(p)}
          onAdminClick={() => setIsAdminModalOpen(true)}
        />
        <DigitalCardModal
          business={digitalCardBusiness as any}
          isOpen={!!digitalCardBusiness}
          onClose={() => setDigitalCardBusiness(null)}
          onOpenClientPage={(b) => openBusinessLanding(b)}
        />
        {editingBusiness && (
          <EditBusinessModal
            business={editingBusiness as any}
            isOpen={!!editingBusiness}
            onClose={() => setEditingBusiness(null)}
            categories={categoriasList.map((c) => ({ id: c, name: c })) as any}
            coloniasList={ALL_COLONIAS_CARMEN.map((name) => ({ name, count: 0 }))}
            onSave={handleSaveBusiness}
            isAdmin={isAdminLoggedIn}
          />
        )}
        <ClaimCouponModal
          promotion={activePromoModal}
          isOpen={!!activePromoModal}
          onClose={() => setActivePromoModal(null)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen relative font-sans text-stone-900 flex flex-col bg-[#f0f4f8] overflow-x-hidden">
      {/* Luces y esferas ambientales para refracción translúcida tipo glass */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[25%] -left-32 w-[550px] h-[550px] bg-sky-200/50 rounded-full blur-[110px]" />
        <div className="absolute top-[48%] -right-32 w-[600px] h-[600px] bg-amber-200/45 rounded-full blur-[130px]" />
        <div className="absolute bottom-[10%] left-[20%] w-[550px] h-[550px] bg-teal-100/50 rounded-full blur-[120px]" />
      </div>

      {ratingsStatus !== 'ready' && <p role={ratingsStatus === 'error' ? 'alert' : 'status'} className="relative z-30 p-2 text-center text-xs">
        {ratingsStatus === 'loading' ? 'Consultando calificaciones…' : 'No fue posible consultar las calificaciones. Los promedios no están disponibles.'}
        {ratingsStatus === 'error' && <button type="button" className="ml-2 underline" onClick={() => window.dispatchEvent(new Event(RATINGS_UPDATED))}>Reintentar</button>}
      </p>}

      {/* 1. SECCIÓN SUPERIOR UNIFICADA CON LA FOTOGRAFÍA DEL ATARDECER Y CRISTAL TRANSLÚCIDO */}
      <div className="relative w-full overflow-visible select-none z-20">
        <img
          src="/puente.jpg"
          alt="Puente de Ciudad del Carmen al Atardecer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/BANNER-NUEVO-EMPRESAS-EN-CARMEN.png';
          }}
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30 pointer-events-none" />

        <div className="relative z-30">
          <Navbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            businesses={businesses}
            onEmergencyClick={() => setIsEmergencyModalOpen(true)}
            onRegisterClick={() => {
              setActiveTab('registro');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onAdminClick={() => setIsAdminModalOpen(true)}
            onSelectFilter={handleSelectNavbarFilter}
          />
        </div>

        <div className="relative z-20">
          <Hero
            onSearch={(q) => {
              setSearchQuery(q);
              setVisibleCount(30);
            }}
            onOpenPromo={handleOpenPromo}
            onOpenEvent={handleOpenEvent}
            onOpenAllPromos={() => {
              setActiveTab('promociones');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenAllEvents={() => {
              setActiveTab('eventos');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            promosList={heroPromos}
            eventsList={heroEvents}
          />
        </div>
      </div>

      {/* 3. CONTENIDO PRINCIPAL: CARTELERA DE EVENTOS, CLASIFICADOS, REGISTRO, PROMOCIONES O DIRECTORIO */}
      {activeTab === 'eventos' ? (
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
          <EventsPage
            events={sortedEventsList as any}
            onBackToDirectory={() => {
              setActiveTab('negocios');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      ) : activeTab === 'clasificados' ? (
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
          <ClassifiedsView
            classifieds={classifiedsList}
            coloniasList={[]}
            onOpenCreateModal={() => setIsCreateClassifiedOpen(true)}
            onOpenDetailModal={(ad) => setSelectedClassified(ad)}
          />
        </div>
      ) : activeTab === 'registro' ? (
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
          <RegisterBusinessView
            categories={categoriasList.map((c) => ({ id: c, name: c })) as any}
            coloniasList={[]}
            onSuccessReturn={() => {
              setActiveTab('negocios');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onBusinessAdded={(newBiz) => {
              setBusinessesList((prev) => [newBiz, ...prev.filter((b) => String(b.id) !== String(newBiz.id))]);
              setBusinessOverrides((prev) => ({ ...prev, [newBiz.id]: newBiz }));
            }}
          />
        </div>
      ) : activeTab === 'promociones' ? (
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-900 text-xs font-bold mb-2">
                <span>🏷️</span>
                <span>Cuponera Oficial Carmelita</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                Promociones y Descuentos Exclusivos
              </h1>
              <p className="text-sm text-stone-600 mt-1">
                Aprovecha ofertas directas en comercios locales de Ciudad del Carmen. Canjea tu cupón por WhatsApp.
              </p>
            </div>
            <button
              onClick={() => {
                setActiveTab('negocios');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/80 hover:bg-white text-stone-800 text-xs font-bold border border-white/60 shadow-sm backdrop-blur-xl transition cursor-pointer self-start sm:self-auto"
            >
              <span>← Volver al Directorio</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {promotionsList.filter(p => p.isActive !== false).map(promo => (
              <div
                key={promo.id}
                className="group relative rounded-3xl overflow-hidden bg-white/70 backdrop-blur-2xl border border-white/80 shadow-lg shadow-sky-950/5 hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                <div className="relative h-48 w-full bg-stone-100 overflow-hidden">
                  <img
                    src={promo.promoImage || promo.businessImage || '/puente.jpg'}
                    alt={promo.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/puente.jpg';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  {promo.discount && (
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-rose-600 text-white font-black text-xs shadow-md tracking-wider">
                      {promo.discount}
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      {promo.businessName || 'Comercio Local'}
                    </span>
                    <h3 className="text-base font-bold text-white line-clamp-1 drop-shadow-sm">
                      {promo.title}
                    </h3>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
                    {promo.description}
                  </p>

                  {promo.validUntil && (
                    <div className="text-[11px] text-stone-500 font-medium flex items-center gap-1.5">
                      <span>Válido hasta:</span>
                      <strong className="text-stone-700">{promo.validUntil}</strong>
                    </div>
                  )}

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActivePromoModal(promo)}
                      className="flex-1 py-2.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs text-center shadow-md shadow-amber-500/20 active:scale-98 transition cursor-pointer"
                    >
                      Obtener Cupón
                    </button>
                    {promo.businessWhatsapp && (
                      <a
                        href={`https://wa.me/${promo.businessWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, vi en ${typeof window !== 'undefined' ? window.location.host.replace(/^www\./, '') : 'empresasencarmen.com'} la promoción "${promo.title}" y deseo hacerla válida.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 active:scale-98 transition cursor-pointer"
                        title="Contactar por WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
          {/* BARRA SUPERIOR iOS LIQUID GLASS: CANALES OFICIALES Y COMUNIDADES WHATSAPP (SOLO ESCRITORIO XL) */}
          <div
            className="hidden xl:block w-full rounded-[22px] sm:rounded-[26px] px-4 sm:px-6 py-3 mb-6 sm:mb-8 border border-white/90 shadow-[0_12px_32px_rgba(14,116,144,0.12)] transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(224, 242, 254, 0.85) 0%, rgba(240, 249, 255, 0.78) 100%)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            }}
          >
            <button
              type="button"
              onClick={() => setIsChannelsAccordionOpen(!isChannelsAccordionOpen)}
              className="w-full flex items-center justify-between gap-2 cursor-pointer select-none text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-sky-800 shrink-0" />
                <span className="text-xs sm:text-sm font-extrabold text-stone-900 tracking-tight truncate">
                  Canales Oficiales y Comunidades WhatsApp
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-stone-700 transition-transform duration-200 shrink-0 ${
                    isChannelsAccordionOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
              <span className="text-xs font-bold text-stone-700 hover:text-stone-950 shrink-0">
                {isChannelsAccordionOpen ? 'Ocultar' : 'Desplegar'}
              </span>
            </button>

            {isChannelsAccordionOpen && (
              <div className="pt-3.5 mt-3 border-t border-sky-200/60 grid grid-cols-1 xl:grid-cols-2 gap-4 items-center animate-in fade-in duration-200">
                {/* LADO IZQUIERDO: CANALES OFICIALES */}
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-stone-900 tracking-tight mb-2">
                    Canales Oficiales
                  </h3>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
                    {getSavedPortalLinks()
                      .filter((l) => l.group === 'canales')
                      .map((item) => {
                        const isTikTok =
                          item.id.toLowerCase().includes('tiktok') ||
                          item.label.toLowerCase().includes('tiktok');
                        return (
                          <a
                            key={item.id}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold text-white whitespace-nowrap shadow-sm transition-transform active:scale-95 shrink-0 ${
                              isTikTok
                                ? 'bg-black hover:bg-stone-900 border border-white/20'
                                : 'bg-[#1877F2] hover:bg-[#166FE5] border border-white/25'
                            }`}
                          >
                            {isTikTok ? (
                              <span className="w-4 h-4 rounded-full bg-white/15 flex items-center justify-center text-[10px] font-black">
                                ♪
                              </span>
                            ) : (
                              <span className="w-4 h-4 rounded-full bg-white text-[#1877F2] flex items-center justify-center text-[11px] font-black leading-none">
                                f
                              </span>
                            )}
                            <span>{item.label}</span>
                          </a>
                        );
                      })}
                  </div>
                </div>

                {/* LADO DERECHO: COMUNIDADES WHATSAPP */}
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-stone-900 tracking-tight mb-2">
                    Comunidades WhatsApp
                  </h3>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
                    {getSavedPortalLinks()
                      .filter((l) => l.group === 'whatsapp')
                      .map((item) => (
                        <a
                          key={item.id}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold text-white bg-[#075E54] hover:bg-[#128C7E] border border-emerald-400/30 whitespace-nowrap shadow-sm transition-transform active:scale-95 shrink-0"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-[#25D366] shadow-[0_0_6px_#25D366] shrink-0" />
                          <span>{item.label}</span>
                        </a>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BADGE DE FILTROS ACTIVOS CON BOTÓN PARA LIMPIAR */}
          {(selectedCategory !== 'Todos' || selectedColonia !== 'Todas' || searchQuery) && (
            <div
              className="mb-6 p-3 sm:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs"
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(15px)',
                WebkitBackdropFilter: 'blur(15px)',
                border: '1.5px solid rgba(255, 255, 255, 0.95)',
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Filtro aplicado:</span>
                {selectedCategory !== 'Todos' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-stone-900 border border-amber-500/40 text-xs font-extrabold shadow-2xs">
                    <span>Categoría: {selectedCategory}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('Todos')}
                      className="hover:text-amber-800 text-stone-700 cursor-pointer text-sm font-black leading-none ml-0.5"
                      title="Quitar filtro de categoría"
                    >
                      ×
                    </button>
                  </span>
                )}
                {selectedColonia !== 'Todas' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 text-stone-900 border border-sky-500/40 text-xs font-extrabold shadow-2xs">
                    <span>Colonia: {selectedColonia}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedColonia('Todas')}
                      className="hover:text-sky-800 text-stone-700 cursor-pointer text-sm font-black leading-none ml-0.5"
                      title="Quitar filtro de colonia"
                    >
                      ×
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-200 text-stone-900 border border-stone-300 text-xs font-bold shadow-2xs">
                    <span>Búsqueda: "{searchQuery}"</span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="hover:text-stone-700 text-stone-700 cursor-pointer text-sm font-black leading-none ml-0.5"
                      title="Quitar búsqueda"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('Todos');
                  setSelectedColonia('Todas');
                  setSearchQuery('');
                  setVisibleCount(30);
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
              >
                Limpiar filtros
              </button>
            </div>
          )}

          <div id="directorio" className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Directorio de Empresas
            </h2>
            <span className="text-xs sm:text-sm font-semibold text-stone-500">
              Mostrando {displayedBusinesses.length} de {filteredBusinesses.length} empresas
            </span>
          </div>

          {displayedBusinesses.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {displayedBusinesses.map((b) => (
                  <BusinessCard
                    key={b.id}
                    business={b}
                    onClick={() => setSelectedBusiness(b)}
                    hasActivePromo={
                      activePromoBusinessIds.has(String(b.id)) ||
                      (b.slug ? activePromoBusinessIds.has(b.slug.toLowerCase()) : false)
                    }
                    isFavorite={favorites.includes(Number(b.id))}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>

              {/* BOTÓN CARGAR MÁS (30 EN 30) */}
              {visibleCount < filteredBusinesses.length && (
                <div className="flex justify-center mt-12 mb-8">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 30)}
                    className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-stone-900 hover:bg-cyan-800 text-white font-bold text-sm shadow-xl hover:shadow-cyan-900/30 transition-all duration-300 active:scale-95 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                    <span>
                      Cargar más negocios ({filteredBusinesses.length - visibleCount} restantes)
                    </span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-8 shadow-sm">
              <p className="text-stone-500 font-medium">No se encontraron empresas con los filtros seleccionados.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('Todos');
                  setVisibleCount(30);
                }}
                className="mt-4 px-5 py-2.5 rounded-full bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold transition shadow"
              >
                Restablecer filtros
              </button>
            </div>
          )}
        </main>
      )}

      {/* 4. FOOTER RESTAURADO ESTILO APPLE CON BOTÓN π DE ADMINISTRACIÓN */}
      <Footer
        onAdminClick={() => setIsAdminModalOpen(true)}
        onEmergencyClick={() => setIsEmergencyModalOpen(true)}
        onRegisterClick={() => {
          setActiveTab('registro');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onEventsClick={() => {
          setActiveTab('eventos');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* 5. BOTÓN FLOTANTE TRASLÚCIDO "AYUDA EN LÍNEA" ESTILO APPLE */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => window.open('https://api.whatsapp.com/send/?phone=%2B5219383895009&text&type=phone_number&app_absent=0', '_blank')}
          className="flex items-center gap-2 px-5 py-3 rounded-full font-bold text-xs text-stone-900 shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.9)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
          }}
        >
          <MessageSquare className="w-4 h-4 text-cyan-700" />
          <span>Ayuda en línea</span>
        </button>
      </div>

      {/* MODAL DE URGENCIAS */}
      <EmergencyGuideModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
      />

      {/* MODAL DE DETALLE DE EMPRESA */}
      <BusinessDetailModal
        business={selectedBusiness as any}
        isOpen={!!selectedBusiness}
        onClose={() => setSelectedBusiness(null)}
        onToggleFavorite={toggleFavorite as any}
        isFavorite={selectedBusiness ? favorites.includes(Number(selectedBusiness.id)) : false}
        activePromotion={
          selectedBusiness
            ? ((seedPromotions as unknown as Promotion[]) || []).find(
                (p) =>
                  p.isActive !== false &&
                  (String(p.businessId) === String(selectedBusiness.id) ||
                    (selectedBusiness.slug && p.businessSlug === selectedBusiness.slug))
              )
            : undefined
        }
        onOpenClaimCouponModal={(p) => setActivePromoModal(p)}
        isAdmin={isAdminLoggedIn}
        onOpenDigitalCard={(b) => {
          setSelectedBusiness(null);
          setDigitalCardBusiness(b);
        }}
        onOpenClientPage={(b) => openBusinessLanding(b)}
        onEditBusiness={(b) => {
          setSelectedBusiness(null);
          setEditingBusiness(b);
        }}
        onToggleTop={handleToggleTop}
        onToggleRecommended={handleToggleRecommended}
        onDeleteBusiness={handleDeleteBusiness}
      />

      {/* MODAL DE TARJETA DIGITAL CON QR */}
      <DigitalCardModal
        business={digitalCardBusiness as any}
        isOpen={!!digitalCardBusiness}
        onClose={() => setDigitalCardBusiness(null)}
        onOpenClientPage={(b) => openBusinessLanding(b)}
      />

      {/* MODAL DE EDICIÓN DE EMPRESA */}
      {editingBusiness && (
        <EditBusinessModal
          business={editingBusiness as any}
          isOpen={!!editingBusiness}
          onClose={() => setEditingBusiness(null)}
          categories={categoriasList.map((c) => ({ id: c, name: c })) as any}
          coloniasList={ALL_COLONIAS_CARMEN.map((name) => ({ name, count: 0 }))}
          onSave={handleSaveBusiness}
          isAdmin={isAdminLoggedIn}
        />
      )}

      {/* MODAL DE CUPONES Y PROMOCIONES */}
      <ClaimCouponModal
        promotion={activePromoModal}
        isOpen={!!activePromoModal}
        onClose={() => setActivePromoModal(null)}
      />

      {/* MODAL DE TODAS LAS PROMOCIONES DEL DÍA */}
      <AllPromotionsModal
        isOpen={isAllPromotionsModalOpen}
        onClose={() => setIsAllPromotionsModalOpen(false)}
        promotions={promotionsList.filter((p) => p.isActive !== false)}
        onSelectPromo={(promo) => {
          setActivePromoModal(promo);
        }}
      />

      {/* MODAL CREAR ANUNCIO CLASIFICADO */}
      <ClassifiedCreateModal
        isOpen={isCreateClassifiedOpen}
        onClose={() => setIsCreateClassifiedOpen(false)}
        onSubmitAd={handleCreateClassified}
        coloniasList={[]}
      />

      {/* MODAL DETALLE DE ANUNCIO CLASIFICADO */}
      <ClassifiedDetailModal
        ad={selectedClassified}
        isOpen={!!selectedClassified}
        onClose={() => setSelectedClassified(null)}
        isAdmin={isAdminLoggedIn}
      />

      {businessesStatus !== 'ready' && <div role="status" className="fixed bottom-4 left-4 right-4 z-[110] rounded-2xl bg-white/95 border border-amber-300 p-3 text-sm shadow-lg">
        {businessesStatus === 'error' ? 'No se pudieron consultar los negocios vigentes. No se muestran contactos de respaldo.' : 'Consultando negocios vigentes…'}
        {businessesStatus === 'error' && <button type="button" aria-label="Reintentar carga de negocios" className="ml-3 underline font-bold" onClick={() => setBusinessesReload(n => n + 1)}>Reintentar</button>}
      </div>}

      {/* MODAL / SISTEMA OPERATIVO DE ADMINISTRACIÓN (VINCULADO AL BOTÓN π) */}
      <WordPressSyncModal
        isOpen={isAdminModalOpen}
        onClose={() => {
          setIsAdminModalOpen(false);
          setIsAdminLoggedIn(isSessionAdminAuthenticated());
        }}
        stats={null}
        health={null}
        businesses={businesses as any}
        onTriggerSync={async () => {}}
        isSyncing={false}
        syncResultMsg={null}
        onBusinessUpdated={async () => { setBusinessesReload(n => n + 1); }}
        categories={categoriasList.map((c) => ({ id: c, name: c })) as any}
        coloniasList={[]}
        onSelectBusiness={(b) => {
          setIsAdminModalOpen(false);
          setSelectedBusiness(b);
        }}
        onEditBusiness={(b) => {
          setIsAdminModalOpen(false);
          setEditingBusiness(b);
        }}
        onToggleTop={handleToggleTop}
        onToggleRecommended={handleToggleRecommended}
        onDeleteBusiness={handleDeleteBusiness}
      />
    </div>
  );
}

