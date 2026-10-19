import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Tag,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  Music,
  ShoppingBag,
  PartyPopper,
  Flame,
  Info,
  X,
  Minimize2,
  Maximize2,
  PlusCircle,
  Edit2,
  Trash2,
  ShieldCheck,
  Building2,
  Phone,
  Radio,
  Bot,
  Loader2,
  Search,
  AlertCircle,
  CheckCircle2,
  Check,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import {
  EventItem,
  getEventsData,
  fetchEventsFromAPI,
  initEventsRealtimeSync,
  addEventItem,
  updateEventItem,
  deleteEventItem,
  searchAIRadarCandidates,
  triggerAIRadarScan,
  publishAIRadarCandidates,
  sortEventsChronologically,
  AIRadarCandidate
} from '../services/eventsService';
import { isSessionAdminAuthenticated } from '../utils/adminAuth';
import { getEventRepresentativeImage, getFallbackThematicImage } from '../utils/eventImages';

interface EventsBillboardBannerProps {
  onOpenEmergencyGuide?: () => void;
}

export const EventsBillboardBanner: React.FC<EventsBillboardBannerProps> = ({
  onOpenEmergencyGuide
}) => {
  const [events, setEvents] = useState<EventItem[]>(() => getEventsData());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [isFullModalOpen, setIsFullModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(() => isSessionAdminAuthenticated());
  const [isHovered, setIsHovered] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [isScanningRadar, setIsScanningRadar] = useState(false);
  const [aiSearchNotification, setAiSearchNotification] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);

  // AI Interactive Candidate Search Modal
  const [isAiSearchModalOpen, setIsAiSearchModalOpen] = useState(false);
  const [aiModalQuery, setAiModalQuery] = useState('');
  const [aiModalLoading, setAiModalLoading] = useState(false);
  const [aiCandidates, setAiCandidates] = useState<AIRadarCandidate[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [isPublishingCandidates, setIsPublishingCandidates] = useState(false);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem('carmelita_cartelera_collapsed');
      return stored !== null ? stored === 'true' : false; // Por default abierto y visible
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('carmelita_cartelera_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      alert('La imagen no debe exceder los 6MB.');
      return;
    }
    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch('/api/upload-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, filename: file.name })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            setEventForm(prev => ({ ...prev, image: data.url }));
            setIsUploadingImage(false);
            return;
          }
        }
      } catch {}
      setEventForm(prev => ({ ...prev, image: base64 }));
      setIsUploadingImage(false);
    };
    reader.onerror = () => {
      setIsUploadingImage(false);
      alert('Error al leer el archivo.');
    };
    reader.readAsDataURL(file);
  };

  const isAiStudioEnv = typeof window !== 'undefined' && (
    window.location.hostname.includes('run.app') || 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
  );

  const handleDeleteEvent = async (evtId: string, title: string) => {
    if (window.confirm(`¿Estás seguro de eliminar "${title}" de la cartelera?`)) {
      await deleteEventItem(evtId);
      if (selectedEvent?.id === evtId) {
        setSelectedEvent(null);
      }
    }
  };

  const handleOpenEditEvent = (evt: EventItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingEvent(evt);
    setEventForm({
      title: evt.title || '',
      category: evt.category || 'Música',
      categorySlug: evt.categorySlug || 'cultura',
      date: evt.date || '',
      time: evt.time || '',
      location: evt.location || '',
      cost: evt.cost || 'Entrada Libre',
      description: evt.description || '',
      organizer: evt.organizer || '',
      badge: evt.badge || 'Radar IA',
      icon: evt.icon || 'Calendar',
      image: evt.image || '',
      sourceUrl: evt.sourceUrl || ''
    });
    setIsEditorOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    await updateEventItem(editingEvent.id, eventForm);
    setIsEditorOpen(false);
    if (selectedEvent && selectedEvent.id === editingEvent.id) {
      setSelectedEvent({ ...editingEvent, ...eventForm });
    }
    setEditingEvent(null);
  };

  const [eventForm, setEventForm] = useState({
    title: '',
    category: 'Música',
    categorySlug: 'cultura',
    date: '',
    time: '',
    location: '',
    cost: 'Entrada Libre',
    description: '',
    organizer: '',
    badge: 'Ambiente Familiar',
    icon: 'Music',
    image: '',
    sourceUrl: ''
  });

  useEffect(() => {
    const unsub = initEventsRealtimeSync();

    // Ensure immediate sync from backend API or local cache
    fetchEventsFromAPI().then(evts => {
      if (Array.isArray(evts) && evts.length > 0) {
        setEvents(evts);
      }
    }).catch(() => {});

    const handleUpdate = () => {
      const data = getEventsData();
      if (data && data.length > 0) {
        setEvents([...data]);
      }
      setIsAdmin(isSessionAdminAuthenticated());
    };
    window.addEventListener('events-billboard-updated', handleUpdate);
    window.addEventListener('admin-auth-changed', handleUpdate);

    return () => {
      unsub();
      window.removeEventListener('events-billboard-updated', handleUpdate);
      window.removeEventListener('admin-auth-changed', handleUpdate);
    };
  }, []);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    map.set('all', 'Todos los Eventos');
    events.forEach(e => {
      if (e.categorySlug && e.category) {
        map.set(e.categorySlug, e.category);
      }
    });
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [events]);

  const filteredEvents = useMemo(() => {
    let list = events;
    if (selectedCategory !== 'all') {
      list = list.filter(e => e.categorySlug === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(e =>
        e.title.toLowerCase().includes(q) ||
        (e.location && e.location.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.category && e.category.toLowerCase().includes(q)) ||
        (e.organizer && e.organizer.toLowerCase().includes(q))
      );
    }
    return sortEventsChronologically(list);
  }, [events, selectedCategory, searchQuery]);

  const handleAutoRadarScan = async () => {
    setIsScanningRadar(true);
    setAiSearchNotification(null);
    try {
      const res = await triggerAIRadarScan();
      if (res.success) {
        setEvents([...getEventsData()]);
        setAiSearchNotification({
          text: res.message || `🛰️ Radar Automático: ¡Se detectaron y sincronizaron ${res.newEventsAdded} nuevos eventos en Carmen!`,
          type: 'success'
        });
      } else {
        setEvents([...getEventsData()]);
        setAiSearchNotification({
          text: res.message || 'El radar completó la revisión de eventos locales.',
          type: 'success'
        });
      }
    } catch (err: any) {
      setAiSearchNotification({
        text: err.message || 'Error de conexión con el radar.',
        type: 'error'
      });
    } finally {
      setIsScanningRadar(false);
      setTimeout(() => setAiSearchNotification(null), 8000);
    }
  };

  const handleOpenAiSearchModal = () => {
    setIsAiSearchModalOpen(true);
    const initialQuery = searchQuery.trim() || 'eventos carmelitas';
    setAiModalQuery(initialQuery);
    if (aiCandidates.length === 0) {
      handleExecuteAiModalSearch(initialQuery);
    }
  };

  const handleExecuteAiModalSearch = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : aiModalQuery).trim();
    setAiModalLoading(true);
    try {
      const res = await searchAIRadarCandidates(q || 'eventos carmelitas', true);
      if (res.success && Array.isArray(res.candidates)) {
        setAiCandidates(res.candidates);
        const unpub = res.candidates.filter(c => !c.alreadyPublished).map(c => c.id);
        setSelectedCandidateIds(new Set(unpub));
      }
    } catch (err: any) {
      console.error('Error buscando candidatos con IA:', err);
    } finally {
      setAiModalLoading(false);
    }
  };

  const handleToggleCandidate = (id: string) => {
    setSelectedCandidateIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePublishCandidates = async () => {
    const toPublish = aiCandidates.filter(c => selectedCandidateIds.has(c.id) && !c.alreadyPublished);
    if (toPublish.length === 0) return;
    setIsPublishingCandidates(true);
    try {
      const res = await publishAIRadarCandidates(toPublish);
      if (res.success) {
        setEvents([...getEventsData()]);
        setIsAiSearchModalOpen(false);
        setAiSearchNotification({
          text: `¡Éxito! Se publicaron ${res.count} nuevos eventos en la cartelera carmelita.`,
          type: 'success'
        });
        setTimeout(() => setAiSearchNotification(null), 8000);
      }
    } catch (err: any) {
      alert(err.message || 'Error al publicar eventos.');
    } finally {
      setIsPublishingCandidates(false);
    }
  };

  const handleAiSearch = async () => {
    handleOpenAiSearchModal();
  };

  // Detect mobile viewport (< 768px) to show 1 event at a time rotating
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Touch swipe support for mobile
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) handleNextPage();
      else handlePrevPage();
    }
    setTouchStartX(null);
  };

  // PAGINATION & AUTO-SLIDE LOGIC
  // On mobile phones: show 1 event at a time rotating. On desktop/tablet: show 4 items per page
  const itemsPerPage = isMobile ? 1 : 4;
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);

  // Reset page when category changes or event count changes or viewport changes
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedCategory, filteredEvents.length, isMobile]);

  // Auto-slide only if more than 4 items (totalPages > 1) and not paused
  useEffect(() => {
    if (totalPages <= 1 || isHovered || isFullModalOpen || isEditorOpen || Boolean(selectedEvent)) return;

    const interval = setInterval(() => {
      setCurrentPage(prev => (prev + 1 >= totalPages ? 0 : prev + 1));
    }, 6000);

    return () => clearInterval(interval);
  }, [totalPages, isHovered, isFullModalOpen, isEditorOpen, selectedEvent]);

  const handlePrevPage = () => {
    setCurrentPage(prev => (prev - 1 < 0 ? Math.max(0, totalPages - 1) : prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => (prev + 1 >= totalPages ? 0 : prev + 1));
  };

  if (events.length === 0 && !isAdmin) {
    return null;
  }

  const renderEventCard = (evt: EventItem) => {
    const cardImg = getEventRepresentativeImage(evt);
    return (
      <div
        key={evt.id}
        onClick={() => setSelectedEvent(evt)}
        className="bg-stone-850/90 border border-stone-800 hover:border-amber-400/70 rounded-2xl p-4 flex flex-col justify-between transition-all hover:bg-stone-800 group shadow-md hover:shadow-xl cursor-pointer text-left h-full"
      >
        <div className="space-y-3">
          <div
            onClick={e => {
              e.stopPropagation();
              setLightboxImage({ url: cardImg, title: evt.title });
            }}
            className="relative h-36 w-full rounded-xl overflow-hidden cursor-pointer group/img border border-stone-700/60 bg-stone-900"
          >
            <img
              src={cardImg}
              alt={evt.title}
              referrerPolicy="no-referrer"
              onError={(e) => {
                const imgEl = e.currentTarget as HTMLImageElement;
                imgEl.style.display = 'none';
                const placeholder = imgEl.parentElement?.querySelector('.event-fallback-placeholder') as HTMLElement;
                if (placeholder) {
                  placeholder.classList.remove('hidden');
                  placeholder.style.display = 'flex';
                }
              }}
              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
            />
            <div className="event-fallback-placeholder absolute inset-0 hidden flex-col items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-stone-900 text-amber-400 p-3 text-center pointer-events-none border border-amber-500/20">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-2 shadow-lg">
                <Calendar className="w-6 h-6 text-amber-400" />
              </div>
              <span className="text-[11px] font-bold text-amber-300 line-clamp-1">{evt.category}</span>
              <span className="text-[10px] text-stone-300 line-clamp-1 mt-0.5">{evt.title}</span>
            </div>
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
              <span className="px-2.5 py-1 rounded-lg bg-black/70 text-white text-[10px] font-bold flex items-center gap-1">
                <Maximize2 className="w-3 h-3" /> Ampliar
              </span>
            </div>
            {evt.badge && (
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 font-bold text-[10px] shadow-sm">
                {evt.badge}
              </span>
            )}
            {evt.aiDetected && (
              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-indigo-600 text-white font-black text-[9px] shadow-sm flex items-center gap-1">
                <Bot className="w-2.5 h-2.5" /> Radar IA
              </span>
            )}
          </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-semibold">
            <span>{evt.category}</span>
            {evt.cost && (
              <>
                <span className="text-stone-600">•</span>
                <span className="text-stone-300">${evt.cost}</span>
              </>
            )}
          </div>
          <h4 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors line-clamp-2">
            {evt.title}
          </h4>
        </div>

        <div className="space-y-1 text-xs text-stone-400 pt-1 border-t border-stone-800">
          <div className="flex items-center gap-1.5 truncate">
            <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">{evt.date}</span>
          </div>
          {evt.time && (
            <div className="flex items-center gap-1.5 truncate">
              <Clock className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              <span className="truncate">{evt.time}</span>
            </div>
          )}
          {evt.location && (
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              <span className="truncate">{evt.location}</span>
            </div>
          )}
        </div>
      </div>

      <div className="pt-3 mt-2 border-t border-stone-800/80 flex items-center justify-between text-xs">
        <span className="text-[11px] text-amber-500/90 font-medium group-hover:underline">
          Ver detalles
        </span>
        {evt.sourceUrl ? (
          <a
            href={evt.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-[10px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 hover:underline"
            title="Ver fuente oficial de este evento"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            <span>Fuente oficial</span>
          </a>
        ) : evt.organizer ? (
          <span className="text-[10px] text-stone-500 truncate max-w-[120px]">
            {evt.organizer}
          </span>
        ) : null}
      </div>

      {isAdmin && (
        <div className="pt-2 mt-1 border-t border-stone-800/80 flex items-center justify-between gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => handleOpenEditEvent(evt, e)}
            className="flex-1 py-1 px-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/40 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
            title="Modificar evento"
          >
            <Edit2 className="w-3 h-3" />
            <span>Modificar</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteEvent(evt.id, evt.title);
            }}
            className="flex-1 py-1 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
            title="Eliminar evento"
          >
            <Trash2 className="w-3 h-3" />
            <span>Eliminar</span>
          </button>
        </div>
      )}
    </div>
  );
};

  return (
    <section className="w-full max-w-[1560px] mx-auto px-3 sm:px-6 lg:px-8 my-5 text-left">
      <div
        className="bg-gradient-to-r from-stone-900 via-[#14120e] to-stone-900 border border-stone-800/90 rounded-3xl p-4 sm:p-6 text-white shadow-xl relative overflow-hidden space-y-4"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-stone-950 font-black text-[10px] tracking-wider uppercase">
                  Cartelera Carmelita
                </span>
                <span className="text-xs text-stone-400">
                  {events.length} evento{events.length === 1 ? '' : 's'} activo{events.length === 1 ? '' : 's'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
                Eventos, Conciertos, Ferias y Bazares en Carmen
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            {totalPages > 1 && !isCollapsed && (
              <div className="flex items-center gap-1.5 bg-stone-800/80 p-1 rounded-xl border border-stone-700">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  className="p-1.5 rounded-lg hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono px-2 text-stone-300">
                  {currentPage + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={handleNextPage}
                  className="p-1.5 rounded-lg hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
                  title="Página siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={toggleCollapse}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-xs active:scale-95"
              title={isCollapsed ? 'Ver Eventos' : 'Minimizar'}
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="w-4 h-4 text-amber-400" />
                  <span>Ver Eventos</span>
                </>
              ) : (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Minimizar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <>

        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, malecón, playa, feria, bazar..."
            className="w-full pl-10 pr-8 py-2.5 bg-stone-900/90 border border-stone-800 rounded-2xl text-xs sm:text-sm text-white placeholder-stone-400 outline-none focus:border-amber-500/70 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* AI Notification Banner */}
        {aiSearchNotification && (
          <div
            className={`p-3 rounded-2xl border text-xs flex items-center gap-2 ${
              aiSearchNotification.type === 'warning'
                ? 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                : aiSearchNotification.type === 'error'
                ? 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
            }`}
          >
            {aiSearchNotification.type === 'warning' ? (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : aiSearchNotification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="flex-1">{aiSearchNotification.text}</span>
            <button
              type="button"
              onClick={() => setAiSearchNotification(null)}
              className="text-stone-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Category Pills */}
        {categories.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat.slug}
                type="button"
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.slug
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'bg-stone-850/80 hover:bg-stone-800 text-stone-300 border border-stone-800'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Carousel / Page Grid */}
        {filteredEvents.length === 0 ? (
          <div className="py-10 text-center text-stone-400 text-xs">
            No hay eventos en esta categoría por el momento.
          </div>
        ) : (
          <div
            className="relative overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Si es escritorio y son 4 o menos eventos, mostrar en cuadrícula estática sin rotación */}
            {!isMobile && filteredEvents.length <= 4 ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {filteredEvents.map(evt => renderEventCard(evt))}
              </div>
            ) : (
              /* En teléfono móvil: muestra exactamente 1 evento a la vez de forma rotatoria. En escritorio: 4 por página */
              <div
                className="flex transition-transform duration-700 ease-out"
                style={{ transform: `translateX(-${currentPage * 100}%)` }}
              >
                {Array.from({ length: totalPages }).map((_, pageIdx) => {
                  const pageItems = filteredEvents.slice(
                    pageIdx * itemsPerPage,
                    (pageIdx + 1) * itemsPerPage
                  );
                  return (
                    <div
                      key={pageIdx}
                      className={`w-full shrink-0 ${
                        isMobile
                          ? 'flex justify-center px-1'
                          : 'grid grid-cols-4 gap-4'
                      }`}
                    >
                      {pageItems.map(evt => (
                        <div
                          key={evt.id}
                          className={isMobile ? 'w-full max-w-sm sm:max-w-md' : 'h-full'}
                        >
                          {renderEventCard(evt)}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Discrete Side Arrows on the Carousel for easy navigation */}
            {totalPages > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevPage}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-stone-900/85 hover:bg-amber-500 hover:text-stone-950 text-stone-200 border border-stone-700/80 shadow-lg backdrop-blur-xs transition-all cursor-pointer flex items-center justify-center active:scale-90"
                  title="Página anterior de eventos"
                  aria-label="Página anterior de eventos"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextPage}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-stone-900/85 hover:bg-amber-500 hover:text-stone-950 text-stone-200 border border-stone-700/80 shadow-lg backdrop-blur-xs transition-all cursor-pointer flex items-center justify-center active:scale-90"
                  title="Página siguiente de eventos"
                  aria-label="Página siguiente de eventos"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </>
            )}

            {/* Indicadores de puntos por página flanqueados por flechas discretas */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  className="p-1 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition-colors cursor-pointer flex items-center justify-center"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        currentPage === idx
                          ? 'w-6 bg-amber-500'
                          : 'w-1.5 bg-stone-700 hover:bg-stone-500'
                      }`}
                      title={`Ir a la página ${idx + 1}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleNextPage}
                  className="p-1 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition-colors cursor-pointer flex items-center justify-center"
                  title="Página siguiente"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
        </>
      )}
      </div>

      {/* Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 text-white space-y-4 shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-stone-950 font-bold text-xs">
                {selectedEvent.category}
              </span>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedEvent && (
              <div
                onClick={() => {
                  const mImg = getEventRepresentativeImage(selectedEvent);
                  setLightboxImage({ url: mImg, title: selectedEvent.title });
                }}
                className="h-56 w-full rounded-2xl overflow-hidden border border-stone-800 cursor-pointer group"
              >
                <img
                  src={getEventRepresentativeImage(selectedEvent)}
                  alt={selectedEvent.title}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const imgEl = e.currentTarget as HTMLImageElement;
                    imgEl.onerror = null;
                    imgEl.src = getFallbackThematicImage(selectedEvent);
                  }}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                />
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">{selectedEvent.title}</h3>
              <p className="text-xs text-stone-300 leading-relaxed whitespace-pre-line">
                {selectedEvent.description}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-800/80 border border-stone-700/60 space-y-2 text-xs text-stone-300">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Fecha: {selectedEvent.date}</span>
              </div>
              {selectedEvent.time && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Horario: {selectedEvent.time}</span>
                </div>
              )}
              {selectedEvent.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Lugar: {selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.cost && (
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Costo: ${selectedEvent.cost}</span>
                </div>
              )}
              {selectedEvent.organizer && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Organizador: {selectedEvent.organizer}</span>
                </div>
              )}
              {selectedEvent.sourceUrl && (
                <div className="pt-2 mt-1 border-t border-stone-700 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-stone-400">
                    <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                    <span>Fuente / Enlace oficial:</span>
                  </span>
                  <a
                    href={selectedEvent.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1"
                  >
                    <span>Ver sitio o fuente</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] text-stone-400 font-bold flex items-center gap-1.5">
                  {selectedEvent.aiDetected ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 flex items-center gap-1">
                      <Bot className="w-3 h-3 text-indigo-300" />
                      Radar IA (Publicado Automático)
                    </span>
                  ) : (
                    <span>Evento de cartelera</span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const evtToEdit = selectedEvent;
                      handleOpenEditEvent(evtToEdit);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Modificar este evento"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Modificar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteEvent(selectedEvent.id, selectedEvent.title);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Eliminar este evento de la cartelera"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Edit Modal for Admins */}
      {isEditorOpen && editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-stone-900 border border-stone-700 rounded-3xl max-w-lg w-full p-5 sm:p-6 text-white shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Edit2 className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Modificar Evento de Cartelera
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Cambios guardados en vivo para todos los visitantes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditorOpen(false);
                  setEditingEvent(null);
                }}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Título del Evento *
                </label>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={e => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
                  placeholder="ej. Gran Concierto Tropical"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Categoría (Datacombo)
                  </label>
                  <select
                    value={eventForm.category}
                    onChange={e => {
                      const val = e.target.value;
                      let slug = 'cultura';
                      if (val.includes('Bazar') || val.includes('Emprend')) slug = 'bazares';
                      else if (val.includes('Mús') || val.includes('Conc')) slug = 'cultura';
                      else if (val.includes('Depor') || val.includes('Rod')) slug = 'deportes';
                      else if (val.includes('Gastro')) slug = 'gastronomia';
                      else if (val.includes('Feria') || val.includes('Expo')) slug = 'ferias';
                      setEventForm(prev => ({ ...prev, category: val, categorySlug: slug }));
                    }}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Cultura & Música">Cultura & Música</option>
                    <option value="Ferias, Exposiciones y Tradición">Ferias, Exposiciones y Tradición</option>
                    <option value="Deportes & Rodadas">Deportes & Rodadas</option>
                    <option value="Bazares y Emprendedores">Bazares y Emprendedores</option>
                    <option value="Gastronomía & Sabores">Gastronomía & Sabores</option>
                    <option value="Entretenimiento & Familia">Entretenimiento & Familia</option>
                    <option value="Infantil & Comunitario">Infantil & Comunitario</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-stone-300 font-semibold">
                      Insignia / Badge
                    </label>
                    <span className="text-[10px] text-amber-400">Ver opciones</span>
                  </div>
                  <select
                    value={[
                      'GRATUITO', 'FAMILIAR', 'DESTACADO', 'IMPERDIBLE',
                      'TRADICIÓN', 'CULTURA', 'RADAR IA', 'PROMOCIONADO',
                      'ProEventos', 'Dashport'
                    ].includes(eventForm.badge || '') ? (eventForm.badge || '') : (eventForm.badge ? '__custom__' : '')}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '__custom__') {
                        setEventForm(prev => ({ ...prev, badge: '' }));
                      } else {
                        setEventForm(prev => ({ ...prev, badge: val }));
                      }
                    }}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-500 cursor-pointer text-xs"
                  >
                    <option value="">▼ Selecciona una insignia oficial...</option>
                    <option value="GRATUITO">GRATUITO</option>
                    <option value="FAMILIAR">FAMILIAR</option>
                    <option value="DESTACADO">DESTACADO</option>
                    <option value="IMPERDIBLE">IMPERDIBLE</option>
                    <option value="TRADICIÓN">TRADICIÓN</option>
                    <option value="CULTURA">CULTURA</option>
                    <option value="RADAR IA">RADAR IA</option>
                    <option value="PROMOCIONADO">PROMOCIONADO</option>
                    <option value="ProEventos">ProEventos</option>
                    <option value="Dashport">Dashport</option>
                    <option value="__custom__">➕ Escribir insignia personalizada...</option>
                  </select>
                  {(![
                    'GRATUITO', 'FAMILIAR', 'DESTACADO', 'IMPERDIBLE',
                    'TRADICIÓN', 'CULTURA', 'RADAR IA', 'PROMOCIONADO',
                    'ProEventos', 'Dashport'
                  ].includes(eventForm.badge || '') || eventForm.badge === '') && (
                    <input
                      type="text"
                      value={eventForm.badge || ''}
                      onChange={e => setEventForm(prev => ({ ...prev, badge: e.target.value }))}
                      placeholder="Escribe insignia personalizada..."
                      className="w-full mt-1.5 px-3 py-1.5 bg-stone-850 border border-amber-500/50 rounded-xl text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Costo de Entrada
                  </label>
                  <input
                    type="text"
                    value={eventForm.cost}
                    onChange={e => setEventForm(prev => ({ ...prev, cost: e.target.value }))}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
                    placeholder="ej. Entrada Libre o $100 MXN"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Fecha
                  </label>
                  <input
                    type="text"
                    value={eventForm.date}
                    onChange={e => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
                    placeholder="ej. Sábado 25 de Octubre"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Horario
                  </label>
                  <input
                    type="text"
                    value={eventForm.time}
                    onChange={e => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
                    placeholder="ej. 6:00 PM a 11:00 PM"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Lugar o Recinto *
                </label>
                <input
                  type="text"
                  required
                  value={eventForm.location}
                  onChange={e => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
                  placeholder="ej. Playa Norte, Ciudad del Carmen"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Organizador / Patrocinador
                </label>
                <input
                  type="text"
                  value={eventForm.organizer}
                  onChange={e => setEventForm(prev => ({ ...prev, organizer: e.target.value }))}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
                  placeholder="ej. DIF Carmen / Colectivo Local"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  value={eventForm.description}
                  onChange={e => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-500 resize-none"
                  placeholder="Detalles sobre las actividades, artistas o programa..."
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Imagen o Cartel del Evento
                </label>
                
                {/* Upload or Preview Box */}
                <div className="space-y-2">
                  {eventForm.image ? (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden border border-stone-700 bg-stone-900 group">
                      <img
                        src={eventForm.image}
                        alt="Previsualización"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 flex items-center gap-1.5">
                        <label
                          className="px-2 py-1 rounded-lg bg-stone-900/90 hover:bg-stone-800 text-amber-300 hover:text-white text-[11px] font-bold border border-amber-500/40 flex items-center gap-1 cursor-pointer shadow-md transition-colors"
                          title="Cambiar foto o flyer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Cambiar foto</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageFileUpload}
                            className="hidden"
                            disabled={isUploadingImage}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setEventForm(prev => ({ ...prev, image: '' }))}
                          className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-colors cursor-pointer"
                          title="Eliminar imagen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-stone-700 hover:border-amber-500 rounded-xl bg-stone-900/60 transition-colors">
                      <ImageIcon className="w-8 h-8 text-stone-500 mb-1" />
                      <p className="text-xs text-stone-400 text-center mb-2">
                        Sube una foto o flyer del evento desde tu equipo (hasta 6MB)
                      </p>
                      <label className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm">
                        {isUploadingImage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        <span>{isUploadingImage ? 'Subiendo imagen...' : 'Seleccionar Archivo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileUpload}
                          className="hidden"
                          disabled={isUploadingImage}
                        />
                      </label>
                    </div>
                  )}

                  <div className="pt-1">
                    <label className="block text-[11px] text-stone-400 mb-0.5">
                      O pega una URL directa de imagen externa:
                    </label>
                    <input
                      type="url"
                      value={eventForm.image}
                      onChange={e => setEventForm(prev => ({ ...prev, image: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-stone-800 border border-stone-700 rounded-xl text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
                      placeholder="https://ejemplo.com/flyer.jpg"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Enlace de Fuente Oficial / Referencia Web (opcional)
                </label>
                <input
                  type="url"
                  value={eventForm.sourceUrl || ''}
                  onChange={e => setEventForm(prev => ({ ...prev, sourceUrl: e.target.value }))}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditorOpen(false);
                    setEditingEvent(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black transition-all shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Búsqueda Avanzada de Eventos con IA (Gemini) */}
      {isAiSearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
          <div className="bg-stone-900 border border-purple-500/40 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl text-left">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-purple-500/20 bg-gradient-to-r from-purple-950/60 via-stone-900 to-indigo-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Búsqueda Avanzada de Eventos con IA
                  </h3>
                  <p className="text-xs text-stone-400">
                    Detecta eventos, ferias, conciertos y bazares en Ciudad del Carmen usando Google Gemini
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAiSearchModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="p-4 border-b border-stone-800 bg-stone-950/50 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={aiModalQuery}
                  onChange={e => setAiModalQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleExecuteAiModalSearch();
                    }
                  }}
                  placeholder="Ej: conciertos en Casa Revo, bazares playa norte, carreras 5k, día de muertos..."
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs sm:text-sm text-white placeholder-stone-500 outline-none focus:border-purple-500"
                />
              </div>
              <button
                type="button"
                onClick={() => handleExecuteAiModalSearch()}
                disabled={aiModalLoading}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50 shrink-0"
              >
                {aiModalLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Rastreando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Buscar con IA</span>
                  </>
                )}
              </button>
            </div>

            {/* Candidates List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {aiModalLoading ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                  <p className="text-sm font-medium text-stone-300">
                    Consultando el radar de eventos y analizando fuentes en Carmen...
                  </p>
                </div>
              ) : aiCandidates.length === 0 ? (
                <div className="py-16 text-center text-stone-500 text-xs">
                  No se encontraron candidatos nuevos para esta búsqueda. Prueba con otro término.
                </div>
              ) : (
                aiCandidates.map(cand => {
                  const isSelected = selectedCandidateIds.has(cand.id);
                  const isPublished = Boolean(cand.alreadyPublished);
                  return (
                    <div
                      key={cand.id}
                      onClick={() => {
                        if (!isPublished) handleToggleCandidate(cand.id);
                      }}
                      className={`p-3 rounded-2xl border transition-all flex items-start gap-3 text-left ${
                        isPublished
                          ? 'bg-stone-950/40 border-stone-800 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'bg-purple-950/40 border-purple-500/70 shadow-md cursor-pointer'
                          : 'bg-stone-850/80 border-stone-800 hover:border-stone-700 cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isPublished}
                        onChange={() => handleToggleCandidate(cand.id)}
                        onClick={e => e.stopPropagation()}
                        className="mt-1 w-4 h-4 rounded text-purple-600 accent-purple-500 cursor-pointer"
                      />
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-stone-900 border border-stone-800">
                        <img
                          src={cand.image || getFallbackThematicImage(cand)}
                          alt={cand.title}
                          className="w-full h-full object-cover"
                          onError={e => {
                            (e.currentTarget as HTMLImageElement).src = getFallbackThematicImage(cand);
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            {cand.category}
                          </span>
                          {isPublished && (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                              ✓ Ya en Cartelera
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-white line-clamp-1">
                          {cand.title}
                        </h4>
                        <div className="text-[11px] text-stone-300 flex items-center gap-2 truncate">
                          <Calendar className="w-3 h-3 text-purple-400 shrink-0" />
                          <span className="truncate">{cand.date}</span>
                          {cand.time && <span>• {cand.time}</span>}
                        </div>
                        {cand.location && (
                          <div className="text-[11px] text-stone-400 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-stone-500 shrink-0" />
                            <span className="truncate">{cand.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-stone-800 bg-stone-950 flex items-center justify-between gap-3">
              <span className="text-xs text-stone-400">
                {selectedCandidateIds.size} evento{selectedCandidateIds.size === 1 ? '' : 's'} seleccionado{selectedCandidateIds.size === 1 ? '' : 's'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAiSearchModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  disabled={selectedCandidateIds.size === 0 || isPublishingCandidates}
                  onClick={handlePublishCandidates}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isPublishingCandidates ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Publicando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Publicar en Cartelera</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for Event Image */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl">
            <img
              src={lightboxImage.url}
              alt={lightboxImage.title}
              className="max-h-[85vh] w-auto object-contain rounded-2xl"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
