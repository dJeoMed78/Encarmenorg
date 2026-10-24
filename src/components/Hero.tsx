import React, { useState } from 'react';
import { Search, Mic, MicOff } from 'lucide-react';
import seedEvents from '../data/events_carmen.json';
import { sortEventsChronologically, parseEventStartDate, filterActiveUpcomingEvents } from '../services/eventsService';

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

  const handleVoiceSearch = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta búsqueda por voz. Te recomendamos usar Google Chrome o Safari.');
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-MX';
      recognition.interimResults = false;
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        onSearch(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Promociones dadas de alta (dinámicas según la cantidad real)
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

  // Helper para convertir eventos registrados en items con badge de fecha para la cartelera
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

  // Eventos de la cartelera: los primeros 3 eventos ordenados del más próximo/reciente al más distante (sin pasados)
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
  // Si hay más de 4, mostramos las 4 últimas (más recientes)
  const displayedPromos = promoCount > 4 ? promos.slice(-4) : promos;

  // Renderizador dinámico de promociones para Escritorio y Móvil
  const renderPromoItems = (isMobile = false) => {
    // CASO 1: SOLO 1 PROMOCIÓN DADA DE ALTA -> Muestra SOLO 1 imagen
    if (promoCount === 1) {
      const item = promos[0];
      return (
        <div
          onClick={() => onOpenPromo(item.id)}
          className="group cursor-pointer flex flex-col"
        >
          <div className={`w-full ${isMobile ? 'h-32' : 'h-36 sm:h-40'} rounded-2xl overflow-hidden shadow-xs border border-white/40 bg-white/30 transition-transform duration-200 group-hover:scale-[1.02]`}>
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

    // CASO 2: 2 PROMOCIONES DADAS DE ALTA -> Muestra 2 imágenes en fila
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

    // CASO 3: 3 PROMOCIONES DADAS DE ALTA -> Muestra 3 imágenes
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

    // CASO 4 Y 5: 4 O MÁS PROMOCIONES -> Muestra 4 imágenes en cuadrícula 2x2 exacta
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

  return (
    <div className="relative w-full flex items-center justify-center select-none pt-2 pb-6 sm:pb-8 lg:pb-10 font-sans">
      {/* CONTENIDO PRINCIPAL */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        
        {/* ============================================================ */}
        {/* VISTA ESCRITORIO / MAC: 3 COLUMNAS SIMÉTRICAS DE CRISTAL */}
        {/* ============================================================ */}
        <div className="hidden md:flex items-center justify-between gap-6 lg:gap-8">
          
          {/* COLUMNA IZQUIERDA: "Promociones del Día" */}
          <div className="w-[285px] lg:w-[310px] shrink-0">
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
                <h2 className="text-[17px] sm:text-[18px] font-bold text-[#111827] tracking-tight">
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

              {/* RENDERIZADO DINÁMICO SEGÚN NÚMERO DE PROMOCIONES (1, 2, 3, 4 O MÁS) */}
              {renderPromoItems(false)}

              {/* SI HAY MÁS DE 4: BOTÓN / OPCIÓN PARA DESPLEGAR PANTALLA INDIVIDUAL */}
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

          {/* COLUMNA CENTRAL: TITULAR + BARRA DE BÚSQUEDA */}
          <div className="flex-1 max-w-xl text-center space-y-4 px-2">
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-white tracking-tight leading-[1.12] drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]">
              Encuentra lo mejor de <br />
              <span>Ciudad del Carmen</span>
            </h1>

            {/* BARRA DE BÚSQUEDA CAPSULAR TRANSLÚCIDA CON BOTÓN DE VOZ Y VERDE */}
            <form
              onSubmit={handleSubmit}
              className="w-full max-w-md mx-auto rounded-full py-1.5 pl-5 pr-1.5 flex items-center justify-between gap-2 transition-all"
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
                className="flex-1 bg-transparent text-sm sm:text-base text-gray-900 placeholder-white/85 focus:outline-none font-medium"
              />

              {/* BOTÓN DE BÚSQUEDA POR VOZ */}
              <button
                type="button"
                onClick={handleVoiceSearch}
                title="Buscar con la voz"
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse shadow-md'
                    : 'bg-white/40 hover:bg-white/70 text-stone-900'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* BOTÓN LUPA VERDE */}
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
          <div className="w-[285px] lg:w-[310px] shrink-0">
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
              <h2 className="text-[17px] sm:text-[18px] font-bold text-[#111827] tracking-tight mb-3">
                Cartelera de Eventos
              </h2>

              {/* 3 FILAS DE EVENTOS CON BADGE CALENDARIO VERDE SAGE */}
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
                    {/* BADGE DE FECHA */}
                    <div className="w-[38px] h-[44px] rounded-[9px] overflow-hidden flex flex-col shrink-0 shadow-xs border border-black/10">
                      <div className="h-[16px] bg-[#54736a] text-white flex items-center justify-center text-[9px] font-bold uppercase tracking-wider">
                        {evt.mes}
                      </div>
                      <div className="flex-1 bg-white flex items-center justify-center text-sm font-bold text-[#111827] leading-none">
                        {evt.dia}
                      </div>
                    </div>

                    {/* TEXTO DEL EVENTO */}
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

        {/* ============================================================ */}
        {/* VISTA MÓVIL: MISMA IDENTIDAD EXACTA EN DISEÑO RESPONSIVO */}
        {/* ============================================================ */}
        <div className="md:hidden space-y-4 pt-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white text-center tracking-tight leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]">
            Encuentra lo mejor de <br />
            <span>Ciudad del Carmen</span>
          </h1>

          <form
            onSubmit={handleSubmit}
            className="w-full rounded-full py-1.5 pl-4 pr-1.5 flex items-center justify-between gap-2"
            style={{
              background: 'rgba(255, 255, 255, 0.38)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1.5px solid rgba(255, 255, 255, 0.60)',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
            }}
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar empresas, servicios..."
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-white/85 focus:outline-none font-medium"
            />
            {/* BOTÓN DE BÚSQUEDA POR VOZ */}
            <button
              type="button"
              onClick={handleVoiceSearch}
              title="Buscar con la voz"
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse shadow-md'
                  : 'bg-white/40 hover:bg-white/70 text-stone-900'
              }`}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
            <button
              type="submit"
              className="w-8 h-8 rounded-full bg-[#16a34a] hover:bg-[#15803d] text-white flex items-center justify-center shrink-0 shadow-sm active:scale-95 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </form>

          {/* TARJETAS MÓVILES EN GRID O ACORDEÓN COMPACTO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Promociones en Móvil */}
            <div
              className="rounded-2xl p-3"
              style={{
                background: 'rgba(255, 255, 255, 0.45)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.65)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-[#111827]">Promociones del Día</h3>
                {promoCount > 4 && (
                  <button
                    type="button"
                    onClick={onOpenAllPromos}
                    className="text-[9px] font-bold text-emerald-800 underline"
                  >
                    Ver todas ({promoCount})
                  </button>
                )}
              </div>

              {renderPromoItems(true)}

              {promoCount > 4 && (
                <button
                  type="button"
                  onClick={onOpenAllPromos}
                  className="w-full mt-2 py-1 px-2 rounded-lg bg-white/50 text-[10px] font-bold text-[#111827] text-center"
                >
                  Ver todas las promociones ({promoCount}) →
                </button>
              )}
            </div>

            {/* Eventos en Móvil */}
            <div
              className="rounded-2xl p-3"
              style={{
                background: 'rgba(255, 255, 255, 0.45)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.65)',
              }}
            >
              <h3 className="text-xs font-bold text-[#111827] mb-2">Cartelera de Eventos</h3>
              <div className="space-y-1.5">
                {events.map((evt, idx) => (
                  <div
                    key={idx}
                    onClick={() => onOpenEvent(evt.id)}
                    className="flex items-center gap-2 p-1.5 rounded-lg active:scale-95 transition"
                    style={{
                      background: 'rgba(255, 255, 255, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                    }}
                  >
                    <div className="w-7 h-8 rounded overflow-hidden flex flex-col shrink-0 text-center">
                      <div className="h-3 bg-[#54736a] text-white text-[8px] font-bold uppercase leading-none flex items-center justify-center">
                        {evt.mes}
                      </div>
                      <div className="flex-1 bg-white text-[11px] font-bold text-[#111827] leading-none flex items-center justify-center">
                        {evt.dia}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-[#111827] truncate leading-tight">
                        {evt.titulo}
                      </p>
                      <p className="text-[9px] text-gray-700 truncate">{evt.lugar}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
