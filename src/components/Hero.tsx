import React, { useState, useEffect } from 'react';
import { Search, Mic, MicOff, Flame, Calendar, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import seedEvents from '../data/events_carmen.json';
import { sortEventsChronologically, filterActiveUpcomingEvents } from '../services/eventsService';

export interface PromoItem {
  id?: string | number;
  titulo: string;
  negocio?: string;
  descuento?: string;
  detalle?: string;
  img: string;
}

export interface EventItem {
  id?: string | number;
  dia: string;
  mes: string;
  titulo: string;
  lugar: string;
}

interface HeroChannelLink {
  id: string;
  label: string;
  sublabel?: string;
  url: string;
  group: 'canales' | 'whatsapp' | 'footer';
  badge?: string;
}

const DEFAULT_HERO_CHANNEL_LINKS: HeroChannelLink[] = [
  {
    id: 'canal-fb-page',
    label: 'Empresas en Carmen',
    sublabel: 'facebook.com/empresasencarmen',
    badge: 'PÁGINA',
    url: 'https://' + 'www.facebook.com/empresasencarmen',
    group: 'canales',
  },
  {
    id: 'canal-fb-group',
    label: 'Grupo de Ventas',
    sublabel: 'Empresas en Carmen (Ventas)',
    badge: 'GRUPO FB',
    url: 'https://' + 'www.facebook.com/groups/506440126097710',
    group: 'canales',
  },
  {
    id: 'canal-tiktok',
    label: 'TikTok Oficial',
    sublabel: '@empresasencarmen',
    badge: 'TIKTOK',
    url: 'https://' + 'www.tiktok.com/@empresasencarmen',
    group: 'canales',
  },
  {
    id: 'wa-grupo-1',
    label: 'Empresas en Carmen',
    sublabel: 'Unirme a la comunidad',
    badge: 'GRUPO 1',
    url: 'https://' + 'api.whatsapp.com/send/?phone=%2B5219383895009',
    group: 'whatsapp',
  },
  {
    id: 'wa-grupo-2',
    label: 'Empresas en Carmen 2',
    sublabel: 'Unirme a la comunidad',
    badge: 'GRUPO 2',
    url: 'https://' + 'api.whatsapp.com/send/?phone=%2B5219383895009',
    group: 'whatsapp',
  },
  {
    id: 'wa-comidas',
    label: 'Comidas en Carmen',
    sublabel: 'Restaurantes y antojitos',
    badge: 'GASTRONOMÍA',
    url: 'https://' + 'api.whatsapp.com/send/?phone=%2B5219383895009',
    group: 'whatsapp',
  },
];

function loadHeroChannelLinks(): HeroChannelLink[] {
  try {
    const rawV1 = localStorage.getItem('encarmen_portal_links_v1');
    if (rawV1) {
      const parsed = JSON.parse(rawV1);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    const rawConfig = localStorage.getItem('encarmen_portal_links_config');
    if (rawConfig) {
      const parsedObj = JSON.parse(rawConfig);
      const merged: HeroChannelLink[] = [];
      if (Array.isArray(parsedObj?.officialChannels)) {
        parsedObj.officialChannels.forEach((c: any) =>
          merged.push({ ...c, group: 'canales' })
        );
      }
      if (Array.isArray(parsedObj?.whatsappCommunities)) {
        parsedObj.whatsappCommunities.forEach((w: any) =>
          merged.push({ ...w, group: 'whatsapp' })
        );
      }
      if (merged.length > 0) return merged;
    }
  } catch {}
  return DEFAULT_HERO_CHANNEL_LINKS;
}

interface HeroProps {
  onSearch: (query: string) => void;
  onOpenPromo: (promoId?: string | number) => void;
  onOpenEvent: (eventId?: string | number) => void;
  onOpenAllPromos?: () => void;
  promosList?: PromoItem[];
  eventsList?: EventItem[];
}

export function Hero({
  onSearch,
  onOpenPromo,
  onOpenEvent,
  onOpenAllPromos,
  promosList,
  eventsList,
}: HeroProps) {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  // Estados interactivos para desplegar/comprimir Promociones, Eventos y Canales en Celular e iPad
  const [activeTopTab, setActiveTopTab] = useState<'none' | 'promos' | 'eventos'>('none');
  const [isChannelsOpen, setIsChannelsOpen] = useState(false);
  const [channelLinks, setChannelLinks] = useState<HeroChannelLink[]>(() => loadHeroChannelLinks());

  const [isMobileOrTablet, setIsMobileOrTablet] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isIpadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    const isTouchUA = /iPad|iPhone|iPod|Android|Tablet/i.test(navigator.userAgent);
    return window.innerWidth < 1280 || isIpadOS || isTouchUA;
  });

  useEffect(() => {
    const checkViewport = () => {
      const isIpadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
      const isTouchUA = /iPad|iPhone|iPod|Android|Tablet/i.test(navigator.userAgent);
      setIsMobileOrTablet(window.innerWidth < 1280 || isIpadOS || isTouchUA);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  useEffect(() => {
    const handleStorage = () => setChannelLinks(loadHeroChannelLinks());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleVoiceSearch = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta búsqueda por voz. Te recomendamos usar Safari o Chrome.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-MX';
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || '';
      if (transcript) {
        setQuery(transcript);
        onSearch(transcript);
      }
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const promos: PromoItem[] = (promosList && promosList.length > 0)
    ? promosList
    : [
        {
          id: 'promo-1',
          titulo: '2x1 en Alitas',
          negocio: 'Alitas & Boneless Carmen',
          img: '/images/promos/promo-alitas-1.png',
        },
        {
          id: 'promo-2',
          titulo: '15% off en estética',
          negocio: 'Estética & Spa Carmen',
          img: '/images/promos/promo-estetica-1.png',
        },
        {
          id: 'promo-3',
          titulo: '22% off en Alitas',
          negocio: 'Burger & Wings House',
          img: '/images/promos/promo-burger.png',
        },
        {
          id: 'promo-4',
          titulo: '15% off en estética',
          negocio: 'Barber & Fitness Carmen',
          img: '/images/promos/promo-gym.png',
        },
      ];

  const parseEventItem = (e: any): EventItem => {
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
  };

  const events: EventItem[] = (eventsList && eventsList.length > 0)
    ? eventsList.slice(0, 3)
    : (() => {
        const active = filterActiveUpcomingEvents(seedEvents as any[]);
        const sorted = sortEventsChronologically(active);
        return sorted.slice(0, 3).map(parseEventItem);
      })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const promoCount = promos.length;
  const displayedPromos = promoCount > 4 ? promos.slice(-4) : promos;

  const renderPromoItems = (isCompact = false) => {
    if (promoCount === 1) {
      const item = promos[0];
      return (
        <div
          onClick={() => onOpenPromo(item.id)}
          className="group cursor-pointer flex flex-col"
        >
          <div className={`w-full ${isCompact ? 'h-36 sm:h-40' : 'h-40'} rounded-2xl overflow-hidden shadow-xs border border-white/40 bg-white/30 transition-transform duration-200 group-hover:scale-[1.02]`}>
            <img
              src={item.img}
              alt={item.titulo}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/categories/cuidado-y-belleza-personal.jpg';
              }}
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-xs sm:text-[13px] font-bold text-[#111827] mt-2 leading-tight tracking-tight truncate group-hover:text-emerald-700">
            {item.titulo}
          </p>
          {item.negocio && (
            <p className="text-[11px] text-gray-700 font-medium truncate mt-0.5">
              {item.negocio}
            </p>
          )}
        </div>
      );
    }

    if (promoCount === 2) {
      return (
        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          {promos.map((item, idx) => (
            <div
              key={idx}
              onClick={() => onOpenPromo(item.id)}
              className="group cursor-pointer flex flex-col"
            >
              <div className="w-full aspect-[16/10] rounded-[13px] overflow-hidden shadow-xs border border-white/40 bg-white/30 transition-transform duration-200 group-hover:scale-[1.03]">
                <img
                  src={item.img}
                  alt={item.titulo}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/categories/cuidado-y-belleza-personal.jpg';
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-[11px] sm:text-xs font-medium text-[#111827] mt-1.5 leading-tight tracking-tight truncate group-hover:text-emerald-700">
                {item.titulo}
              </p>
            </div>
          ))}
        </div>
      );
    }

    if (promoCount === 3) {
      return (
        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          {promos.slice(0, 2).map((item, idx) => (
            <div
              key={idx}
              onClick={() => onOpenPromo(item.id)}
              className="group cursor-pointer flex flex-col"
            >
              <div className="w-full aspect-[16/10] rounded-[13px] overflow-hidden shadow-xs border border-white/40 bg-white/30 transition-transform duration-200 group-hover:scale-[1.03]">
                <img
                  src={item.img}
                  alt={item.titulo}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/categories/cuidado-y-belleza-personal.jpg';
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-[11px] sm:text-xs font-medium text-[#111827] mt-1.5 leading-tight tracking-tight truncate group-hover:text-emerald-700">
                {item.titulo}
              </p>
            </div>
          ))}
          <div
            onClick={() => onOpenPromo(promos[2].id)}
            className="group cursor-pointer flex flex-col col-span-2"
          >
            <div className="w-full aspect-[21/9] rounded-[13px] overflow-hidden shadow-xs border border-white/40 bg-white/30 transition-transform duration-200 group-hover:scale-[1.02]">
              <img
                src={promos[2].img}
                alt={promos[2].titulo}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/categories/cuidado-y-belleza-personal.jpg';
                }}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-[11px] sm:text-xs font-medium text-[#111827] mt-1.5 leading-tight tracking-tight truncate group-hover:text-emerald-700">
              {promos[2].titulo}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
        {displayedPromos.map((item, idx) => (
          <div
            key={idx}
            onClick={() => onOpenPromo(item.id)}
            className="group cursor-pointer flex flex-col"
          >
            <div className="w-full aspect-[16/10] rounded-[13px] overflow-hidden shadow-xs border border-white/40 bg-white/30 transition-transform duration-200 group-hover:scale-[1.03]">
              <img
                src={item.img}
                alt={item.titulo}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/categories/cuidado-y-belleza-personal.jpg';
                }}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-[11px] sm:text-xs font-medium text-[#111827] mt-1.5 leading-tight tracking-tight truncate group-hover:text-emerald-700">
              {item.titulo}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const canalesOficiales = channelLinks.filter((l) => l.group === 'canales');
  const comunidadesWhatsapp = channelLinks.filter((l) => l.group === 'whatsapp');

  return (
    <div
      className={`relative w-full flex flex-col justify-between select-none font-sans ${
        isMobileOrTablet ? 'pt-0 pb-0' : 'pt-4 pb-10'
      }`}
    >
      <div className="relative z-10 max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 w-full">
        {!isMobileOrTablet ? (
          /* ============================================================ */
          /* 1. VISTA ESCRITORIO (COMPUTADORA): 3 COLUMNAS ABIERTAS       */
          /* ============================================================ */
          <div className="flex items-center justify-between gap-8">
            {/* COLUMNA IZQUIERDA: "Promociones del Día" */}
            <div className="w-[300px] shrink-0">
              <div
                className="rounded-3xl p-4 transition-all duration-300"
                style={{
                  background: 'rgba(255, 255, 255, 0.42)',
                  backdropFilter: 'blur(25px)',
                  WebkitBackdropFilter: 'blur(25px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.65)',
                  boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.22), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[18px] font-bold text-[#111827] tracking-tight">
                    Promociones del Día
                  </h2>
                  {promoCount > 4 && (
                    <button
                      type="button"
                      onClick={onOpenAllPromos}
                      className="text-[10px] font-bold bg-white/60 hover:bg-white text-gray-800 px-2 py-0.5 rounded-full border border-white/60 transition cursor-pointer"
                    >
                      +{promoCount - 4} más
                    </button>
                  )}
                </div>

                {renderPromoItems(false)}

                {promoCount > 4 && (
                  <button
                    type="button"
                    onClick={onOpenAllPromos}
                    className="w-full mt-3 py-1.5 px-3 rounded-xl bg-white/45 hover:bg-white/70 border border-white/60 text-[11px] font-bold text-[#111827] flex items-center justify-between transition active:scale-98 shadow-xs cursor-pointer"
                  >
                    <span>Ver todas las promociones del día</span>
                    <span className="text-emerald-700 font-extrabold text-xs">({promoCount}) →</span>
                  </button>
                )}
              </div>
            </div>

            {/* COLUMNA CENTRAL: TITULAR + BARRA DE BÚSQUEDA CON MICRÓFONO */}
            <div className="flex-1 max-w-xl text-center space-y-4 px-2">
              <h1 className="text-[44px] font-extrabold text-white tracking-tight leading-[1.12] drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]">
                Encuentra lo mejor de <br />
                <span>Ciudad del Carmen</span>
              </h1>

              <form
                onSubmit={handleSubmit}
                className="w-full max-w-lg mx-auto rounded-full py-1.5 pl-5 pr-1.5 flex items-center justify-between gap-2 transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.38)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.60)',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
                }}
              >
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar empresas, productos o servicios..."
                  className="flex-1 min-w-0 bg-transparent text-base text-gray-900 placeholder-white/85 focus:outline-none font-medium"
                />

                <button
                  type="button"
                  onClick={handleVoiceSearch}
                  title="Buscar con la voz"
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse shadow-md'
                      : 'bg-white/45 hover:bg-white/75 text-stone-900'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  type="submit"
                  aria-label="Buscar"
                  className="w-9 h-9 rounded-full bg-[#16a34a] hover:bg-[#15803d] text-white flex items-center justify-center shrink-0 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Search className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>
            </div>

            {/* COLUMNA DERECHA: "Cartelera de Eventos" */}
            <div className="w-[300px] shrink-0">
              <div
                className="rounded-3xl p-4 transition-all duration-300"
                style={{
                  background: 'rgba(255, 255, 255, 0.42)',
                  backdropFilter: 'blur(25px)',
                  WebkitBackdropFilter: 'blur(25px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.65)',
                  boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.22), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
                }}
              >
                <h2 className="text-[18px] font-bold text-[#111827] tracking-tight mb-3">
                  Cartelera de Eventos
                </h2>

                <div className="space-y-2.5">
                  {events.map((evt, idx) => (
                    <div
                      key={idx}
                      onClick={() => onOpenEvent(evt.id)}
                      className="group cursor-pointer flex items-center gap-2.5 p-2 rounded-xl transition-all duration-200 hover:bg-white/40"
                      style={{
                        background: 'rgba(255, 255, 255, 0.28)',
                        border: '1px solid rgba(255, 255, 255, 0.45)',
                      }}
                    >
                      <div className="w-[38px] h-[44px] rounded-[9px] overflow-hidden flex flex-col shrink-0 shadow-xs border border-black/10">
                        <div className="h-[16px] bg-[#54736a] text-white flex items-center justify-center text-[9px] font-bold uppercase tracking-wider">
                          {evt.mes}
                        </div>
                        <div className="flex-1 bg-white flex items-center justify-center text-sm font-bold text-[#111827] leading-none">
                          {evt.dia}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-bold text-[#111827] truncate leading-tight group-hover:text-emerald-700">
                          {evt.titulo}
                        </p>
                        <p className="text-[11px] text-gray-700 font-medium truncate mt-0.5">
                          {evt.lugar}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* 2. VISTA CELULAR, IPAD Y TABLET:                             */
          /*    - PESTAÑAS COLGANTES DEBAJO DEL MENÚ (PROMOS / EVENTOS)   */
          /*    - BUSCADOR LIMPIO AL CENTRO DEL FONDO PUENTE              */
          /*    - PESTAÑA DE CANALES Y WHATSAPP EN LA BASE DE LA FOTO     */
          /* ============================================================ */
          <div className="flex flex-col justify-between min-h-[260px] sm:min-h-[310px]">
            {/* A. DOS PESTAÑAS TIPO CARPETA COLGANDO DEL BORDE INFERIOR DEL MENÚ */}
            <div className="w-full relative z-30">
              <div className="flex items-start justify-between gap-2 px-2 sm:px-6 -mt-[1px]">
                {/* Pestaña Izquierda: Promociones */}
                <button
                  type="button"
                  onClick={() =>
                    setActiveTopTab((prev) => (prev === 'promos' ? 'none' : 'promos'))
                  }
                  className="px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-t-none rounded-b-2xl text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg border-x border-b border-white/60 transition-all active:scale-95 cursor-pointer"
                  style={{
                    background:
                      activeTopTab === 'promos'
                        ? 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)'
                        : 'linear-gradient(135deg, rgba(245, 158, 11, 0.95) 0%, rgba(234, 88, 12, 0.95) 100%)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                  }}
                >
                  <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-200 text-amber-100 shrink-0" />
                  <span>Promociones ({promoCount})</span>
                  {activeTopTab === 'promos' ? (
                    <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />
                  )}
                </button>

                {/* Pestaña Derecha: Eventos */}
                <button
                  type="button"
                  onClick={() =>
                    setActiveTopTab((prev) => (prev === 'eventos' ? 'none' : 'eventos'))
                  }
                  className="px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-t-none rounded-b-2xl text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg border-x border-b border-white/60 transition-all active:scale-95 cursor-pointer"
                  style={{
                    background:
                      activeTopTab === 'eventos'
                        ? 'linear-gradient(135deg, #1D4ED8 0%, #1E3A8A 100%)'
                        : 'linear-gradient(135deg, rgba(37, 99, 235, 0.95) 0%, rgba(29, 78, 216, 0.95) 100%)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                  }}
                >
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-100 shrink-0" />
                  <span>Eventos ({events.length})</span>
                  {activeTopTab === 'eventos' ? (
                    <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />
                  )}
                </button>
              </div>

              {/* Panel Desplegable de Promociones */}
              {activeTopTab === 'promos' && (
                <div
                  className="mt-2 mx-1 sm:mx-4 rounded-3xl p-4 shadow-2xl animate-in fade-in duration-150"
                  style={{
                    background: 'rgba(255, 255, 255, 0.94)',
                    backdropFilter: 'blur(28px) saturate(190%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(190%)',
                    border: '1.5px solid rgba(255, 255, 255, 0.96)',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm sm:text-base font-extrabold text-stone-900 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-600 fill-orange-500" />
                      <span>Promociones del Día</span>
                    </h3>
                    <div className="flex items-center gap-2">
                      {onOpenAllPromos && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTopTab('none');
                            onOpenAllPromos();
                          }}
                          className="text-xs font-extrabold text-amber-800 underline cursor-pointer"
                        >
                          Ver todas ({promoCount})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveTopTab('none')}
                        className="px-2.5 py-1 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-800 text-[11px] font-bold cursor-pointer"
                      >
                        Cerrar ▲
                      </button>
                    </div>
                  </div>
                  {renderPromoItems(true)}
                </div>
              )}

              {/* Panel Desplegable de Eventos */}
              {activeTopTab === 'eventos' && (
                <div
                  className="mt-2 mx-1 sm:mx-4 rounded-3xl p-4 shadow-2xl animate-in fade-in duration-150"
                  style={{
                    background: 'rgba(255, 255, 255, 0.94)',
                    backdropFilter: 'blur(28px) saturate(190%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(190%)',
                    border: '1.5px solid rgba(255, 255, 255, 0.96)',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm sm:text-base font-extrabold text-stone-900 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>Cartelera de Eventos</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTopTab('none')}
                      className="px-2.5 py-1 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-800 text-[11px] font-bold cursor-pointer"
                    >
                      Cerrar ▲
                    </button>
                  </div>

                  <div className="space-y-2">
                    {events.map((evt, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setActiveTopTab('none');
                          onOpenEvent(evt.id);
                        }}
                        className="cursor-pointer flex items-center gap-2.5 p-2 rounded-xl bg-white hover:bg-sky-50 border border-stone-200/80 transition"
                      >
                        <div className="w-[36px] h-[42px] rounded-[9px] overflow-hidden flex flex-col shrink-0 text-center shadow-2xs border border-black/10">
                          <div className="h-[15px] bg-[#54736a] text-white text-[9px] font-bold uppercase leading-none flex items-center justify-center">
                            {evt.mes}
                          </div>
                          <div className="flex-1 bg-white text-sm font-bold text-[#111827] leading-none flex items-center justify-center">
                            {evt.dia}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-[13px] font-bold text-[#111827] truncate leading-tight">
                            {evt.titulo}
                          </p>
                          <p className="text-[11px] text-gray-700 font-medium truncate mt-0.5">
                            {evt.lugar}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* B. TITULAR CENTRAL Y BUSCADOR CON VOZ SOBRE LA FOTO DEL PUENTE */}
            <div className="text-center space-y-3 max-w-xl mx-auto px-2 py-5 sm:py-7 w-full">
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.75)]">
                Encuentra lo mejor de <br />
                <span>Ciudad del Carmen</span>
              </h1>

              <form
                onSubmit={handleSubmit}
                className="w-full max-w-lg mx-auto rounded-full py-1.5 pl-4 sm:pl-5 pr-1.5 flex items-center justify-between gap-2"
                style={{
                  background: 'rgba(255, 255, 255, 0.42)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.70)',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.28)',
                }}
              >
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar empresas, productos o servicios..."
                  className="flex-1 min-w-0 bg-transparent text-sm sm:text-base text-gray-900 placeholder-white/95 focus:outline-none font-medium"
                />

                <button
                  type="button"
                  onClick={handleVoiceSearch}
                  title="Buscar con la voz"
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse shadow-md'
                      : 'bg-white/50 hover:bg-white/80 text-stone-900'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  type="submit"
                  aria-label="Buscar"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#16a34a] hover:bg-[#15803d] text-white flex items-center justify-center shrink-0 shadow-sm active:scale-95 cursor-pointer"
                >
                  <Search className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>
            </div>

            {/* C. BOTÓN COLAPSABLE DE CANALES OFICIALES Y COMUNIDADES WHATSAPP EN LA PARTE BAJA DE LA FOTO */}
            <div className="w-full flex flex-col items-center relative z-30">
              {isChannelsOpen && (
                <div
                  className="w-full max-w-2xl mb-2 rounded-3xl p-3.5 sm:p-4 shadow-2xl animate-in fade-in duration-150"
                  style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(28px) saturate(190%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(190%)',
                    border: '1.5px solid rgba(255, 255, 255, 0.98)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-stone-200/80">
                    <span className="text-xs font-black text-stone-800">
                      Redes Oficiales y Comunidades en Vivo
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsChannelsOpen(false)}
                      className="px-2.5 py-0.5 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-800 text-[11px] font-bold cursor-pointer"
                    >
                      Cerrar ▼
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-blue-900 px-1 block">
                        🌐 Canales Oficiales (FB & TikTok)
                      </span>
                      <div className="grid grid-cols-1 gap-1.5">
                        {canalesOficiales.map((item) => {
                          const isTikTok =
                            item.id.toLowerCase().includes('tiktok') ||
                            item.label.toLowerCase().includes('tiktok');
                          return (
                            <a
                              key={item.id}
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl shadow-sm text-xs font-extrabold transition-all active:scale-98 ${
                                isTikTok
                                  ? 'bg-black hover:bg-neutral-900 text-white border border-neutral-700'
                                  : 'bg-[#1877F2] hover:bg-[#166FE5] text-white border border-blue-400/40'
                              }`}
                            >
                              <span className="truncate flex items-center gap-2">
                                {isTikTok ? (
                                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black text-white shrink-0">
                                    ♪
                                  </span>
                                ) : (
                                  <span className="w-4 h-4 rounded-full bg-white text-[#1877F2] flex items-center justify-center text-[11px] font-black leading-none shrink-0">
                                    f
                                  </span>
                                )}
                                <span className="text-white font-extrabold">{item.label}</span>
                              </span>
                              {item.badge && (
                                <span
                                  className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                                    isTikTok
                                      ? 'bg-white/20 text-white'
                                      : 'bg-white text-[#1877F2]'
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900 px-1 block">
                        💬 Comunidades WhatsApp
                      </span>
                      <div className="grid grid-cols-1 gap-1.5">
                        {comunidadesWhatsapp.map((item) => (
                          <a
                            key={item.id}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#075E54] hover:bg-[#128C7E] text-white border border-emerald-400/30 shadow-sm text-xs font-extrabold transition-all active:scale-98"
                          >
                            <span className="truncate flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#25D366] shadow-[0_0_6px_#25D366] shrink-0" />
                              <span className="text-white font-extrabold">{item.label}</span>
                            </span>
                            {item.badge && (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#25D366] text-[#075E54] shrink-0">
                                {item.badge}
                              </span>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsChannelsOpen((prev) => !prev)}
                className="px-4 sm:px-6 py-2 rounded-t-2xl rounded-b-none text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl border-t border-x border-white/60 transition-all active:scale-95 cursor-pointer"
                style={{
                  background: isChannelsOpen
                    ? 'linear-gradient(135deg, rgba(13, 148, 136, 0.96) 0%, rgba(15, 118, 110, 0.96) 100%)'
                    : 'linear-gradient(135deg, rgba(15, 23, 42, 0.82) 0%, rgba(15, 118, 110, 0.88) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
              >
                <Globe className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Canales Oficiales y Comunidades WhatsApp</span>
                {isChannelsOpen ? (
                  <ChevronUp className="w-4 h-4 text-emerald-200 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-emerald-200 shrink-0" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
