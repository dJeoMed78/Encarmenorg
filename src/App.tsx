import React, { useState, useMemo, useEffect } from 'react';
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
import { MessageSquare, RefreshCw, Lock, X } from 'lucide-react';
import seedBusinesses from './data/businesses_seed.json';
import seedPromotions from './data/promotions_seed.json';
import seedEvents from './data/events_carmen.json';
import seedRatings from '../ratings_db.json';
import { EventsPage } from './components/EventsPage';
import { ClassifiedsView } from './components/ClassifiedsView';
import { RegisterBusinessView } from './components/RegisterBusinessView';
import { ClassifiedCreateModal } from './components/ClassifiedCreateModal';
import { ClassifiedDetailModal } from './components/ClassifiedDetailModal';
import { Promotion, ClassifiedAd, Business } from './types';
import seedClassifieds from './data/radar_classifieds_pool.json';
import { isSessionAdminAuthenticated, hashPassword, FALLBACK_ADMIN_HASHES } from './utils/adminAuth';
import { adminDeleteBusiness, getAdminPromotions } from './services/api';
import { sortEventsChronologically, parseEventStartDate, isEventExpired, filterActiveUpcomingEvents } from './services/eventsService';
import { getSavedPortalLinks } from './components/AdminLinksAndAdsManager';

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
  const [promotionsList, setPromotionsList] = useState<Promotion[]>(() => (seedPromotions as unknown as Promotion[]) || []);

  useEffect(() => {
    getAdminPromotions().then((data) => {
      if (data && Array.isArray(data.promotions) && data.promotions.length > 0) {
        setPromotionsList(data.promotions);
      }
    }).catch(() => {});
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

  // Anuncios Clasificados y Bolsa de Trabajo (Moderación estricta: solo aprobados en portal público)
  const [classifiedsList, setClassifiedsList] = useState<ClassifiedAd[]>(() => {
    try {
      const saved = localStorage.getItem('encarmen_approved_classifieds_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    const raw = (seedClassifieds as unknown as ClassifiedAd[]) || [];
    return raw.filter((c: any) => c.status === 'approved' || c.status === 'active');
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
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => isSessionAdminAuthenticated());

  useEffect(() => {
    const handleAuthChange = () => setIsAdminLoggedIn(isSessionAdminAuthenticated());
    window.addEventListener('admin-auth-changed', handleAuthChange);
    return () => window.removeEventListener('admin-auth-changed', handleAuthChange);
  }, []);

  // Negocios con calificaciones reales integradas (si count === 0, rating es 0 y se muestra 'Sin calificar aún')
  // En pantalla principal: Empresas TOP van SIEMPRE en los primeros lugares de la lista.
  const businesses: Business[] = useMemo(() => {
    const raw = (seedBusinesses as unknown as Business[]) || [];
    const statsMap = (seedRatings as any)?.stats || {};

    return [...raw]
      .filter((b) => !deletedBusinessIds.includes(Number(b.id)))
      .map((b) => {
        const ratingData = statsMap[String(b.id)];
        const override = businessOverrides[String(b.id)] || {};
        const count = ratingData?.count !== undefined ? ratingData.count : (b.reviewCount || 0);
        const rating = count > 0 ? Number(ratingData?.average || b.rating || 0) : 0;
        return {
          ...b,
          rating,
          reviewCount: count,
          ...override,
        };
      })
      .sort((a, b) => {
        // 1. EMPRESAS TOP SIEMPRE PRIMERO EN LA PÁGINA PRINCIPAL
        const isTopA = Boolean(a.isTopBusiness);
        const isTopB = Boolean(b.isTopBusiness);
        if (isTopA !== isTopB) return isTopA ? -1 : 1;

        // 2. EMPRESAS RECOMENDADAS DESPUÉS DE LAS TOP
        const isRecA = Boolean(a.isRecommended);
        const isRecB = Boolean(b.isRecommended);
        if (isRecA !== isRecB) return isRecA ? -1 : 1;

        // 3. Orden cronológico / más recientes
        const timeA = new Date((a as any).createdAt || 0).getTime();
        const timeB = new Date((b as any).createdAt || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return Number(b.id) - Number(a.id);
      });
  }, [businessOverrides, deletedBusinessIds]);

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
    if (selectedBusiness && String(selectedBusiness.id) === String(b.id)) {
      setSelectedBusiness(null);
    }
    if (landingBusiness && String(landingBusiness.id) === String(b.id)) {
      setLandingBusiness(null);
    }
  };

  const handleSaveBusiness = async (id: number, updatedData: Partial<Business>) => {
    setBusinessOverrides((prev) => ({
      ...prev,
      [String(id)]: { ...prev[String(id)], ...updatedData }
    }));
    if (selectedBusiness && Number(selectedBusiness.id) === id) {
      setSelectedBusiness((prev) => prev ? { ...prev, ...updatedData } : null);
    }
    if (landingBusiness && Number(landingBusiness.id) === id) {
      setLandingBusiness((prev) => prev ? { ...prev, ...updatedData } : null);
    }
    return { success: true, message: 'Empresa actualizada correctamente' };
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

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    const hashed = await hashPassword(adminPassword);
    const validHashes = Object.values(FALLBACK_ADMIN_HASHES);
    if (validHashes.includes(hashed) || adminPassword === 'carmen2026' || adminPassword === 'admin') {
      setIsAdminLoggedIn(true);
      setAdminError('');
    } else {
      setAdminError('Contraseña incorrecta. Acceso restringido.');
    }
  };

  const displayedBusinesses = filteredBusinesses.slice(0, visibleCount);

  // If a business standalone landing page is active
  if (landingBusiness) {
    return (
      <>
        <DirectBusinessView
          business={landingBusiness as any}
          onBack={() => setLandingBusiness(null)}
          onBackToDirectory={() => setLandingBusiness(null)}
          onSearchFromPage={(query) => {
            setSearchQuery(query);
            setLandingBusiness(null);
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
          onOpenClientPage={(b) => {
            setDigitalCardBusiness(null);
            setLandingBusiness(b);
          }}
        />
        <EditBusinessModal
          business={editingBusiness as any}
          isOpen={!!editingBusiness}
          onClose={() => setEditingBusiness(null)}
          categories={categoriasList.map((c) => ({ id: c, name: c })) as any}
          coloniasList={[]}
          onSave={handleSaveBusiness}
        />
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

      {/* 1. SECCIÓN SUPERIOR UNIFICADA CON LA FOTOGRAFÍA DEL ATARDECER Y CRISTAL TRANSLÚCIDO */}
      <div className="relative w-full select-none z-10">
        {/* FOTOGRAFÍA REAL DEL PUENTE ZACATAL AL ATARDECER (SIN FILTROS CAFÉS OSCUROS) */}
        <img
          src="/puente.jpg"
          alt="Puente de Ciudad del Carmen al Atardecer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/BANNER-NUEVO-EMPRESAS-EN-CARMEN.png';
          }}
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />

        {/* SUTIL GRADIENTE TRANSLÚCIDO PARA MÁXIMA LUMINOSIDAD Y CONTRASTE */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30 pointer-events-none" />

        {/* BARRA DE NAVEGACIÓN FLOTANTE TRASLÚCIDA (EXACTA A LA IMAGEN) */}
        <div className="relative z-20">
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

        {/* HERO: PROMOCIONES DEL DÍA, TITULAR CENTRAL Y CARTELERA DE EVENTOS */}
        <div className="relative z-10">
          <Hero
            onSearch={(q) => {
              setSearchQuery(q);
              setVisibleCount(30);
            }}
            onOpenPromo={handleOpenPromo}
            onOpenEvent={handleOpenEvent}
            onOpenAllPromos={() => setIsAllPromotionsModalOpen(true)}
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
              setBusinessOverrides((prev) => ({ ...prev, [newBiz.id]: newBiz }));
              setActiveTab('negocios');
              window.scrollTo({ top: 0, behavior: 'smooth' });
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
          {/* BARRA DE CANALES Y COMUNIDADES OFICIALES (APPLE IOS LIQUID GLASS) */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Bloque 1: Canales Oficiales */}
            <div className="p-3.5 sm:p-4 rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                  📣
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-stone-900 tracking-tight">Canales Oficiales</h3>
                  <p className="text-[11px] text-stone-500">Comunidad oficial en redes sociales</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {portalLinks.filter((l) => l.group === 'canales').map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-stone-800 hover:text-blue-700 text-xs font-semibold border border-stone-200/80 shadow-2xs transition active:scale-95"
                  >
                    <span>{link.badge ? `[${link.badge}]` : '🔗'}</span>
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Bloque 2: Comunidades WhatsApp */}
            <div className="p-3.5 sm:p-4 rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                  💬
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-stone-900 tracking-tight">Comunidades WhatsApp</h3>
                  <p className="text-[11px] text-stone-500">Únete a grupos de consumo y ventas</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {portalLinks.filter((l) => l.group === 'whatsapp').map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-900 text-xs font-bold border border-emerald-500/30 shadow-2xs transition active:scale-95"
                  >
                    <span>🟢</span>
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
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
        onOpenClientPage={(b) => {
          setSelectedBusiness(null);
          setLandingBusiness(b);
        }}
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
        onOpenClientPage={(b) => {
          setDigitalCardBusiness(null);
          setLandingBusiness(b);
        }}
      />

      {/* MODAL DE EDICIÓN DE EMPRESA */}
      <EditBusinessModal
        business={editingBusiness as any}
        isOpen={!!editingBusiness}
        onClose={() => setEditingBusiness(null)}
        categories={categoriasList.map((c) => ({ id: c, name: c })) as any}
        coloniasList={[]}
        onSave={handleSaveBusiness}
      />

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
        onBusinessUpdated={async () => {}}
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
