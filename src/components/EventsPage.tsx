import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Search,
  MapPin,
  Clock,
  Ticket,
  Share2,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  MessageCircle,
  Download,
  Check,
  X,
  Info,
  Layers,
  Heart,
  SlidersHorizontal,
  Plus
} from 'lucide-react';
import { EventItem, parseEventStartDate, sortEventsChronologically, isEventExpired } from '../services/eventsService';
import { EventsCalendar } from './EventsCalendar';
import { getEventRepresentativeImage } from '../utils/eventImages';

interface EventsPageProps {
  events: EventItem[];
  onBackToDirectory: () => void;
  onOpenCreateEvent?: () => void;
}

export const EventsPage: React.FC<EventsPageProps> = ({
  events,
  onBackToDirectory,
  onOpenCreateEvent
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEventModal, setSelectedEventModal] = useState<EventItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Categories list
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    events.forEach(e => {
      if (e.category && !isEventExpired(e.date, e.time)) {
        map.set(e.categorySlug || 'varios', e.category);
      }
    });
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [events]);

  // Filter and sort events chronologically from closest upcoming to most distant
  const filteredEvents = useMemo(() => {
    const list = events.filter(evt => {
      // Regla obligatoria: Eliminar automáticamente los eventos cuya fecha y hora ya pasaron
      if (isEventExpired(evt.date, evt.time)) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all') {
        const matchesCategory =
          evt.categorySlug === selectedCategory ||
          evt.category.toLowerCase().includes(selectedCategory.toLowerCase());
        if (!matchesCategory) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = evt.title?.toLowerCase().includes(q);
        const inDesc = evt.description?.toLowerCase().includes(q);
        const inLoc = evt.location?.toLowerCase().includes(q);
        const inOrg = evt.organizer?.toLowerCase().includes(q);
        const inCat = evt.category?.toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inLoc && !inOrg && !inCat) return false;
      }

      // Calendar Date filter
      if (selectedDate) {
        const ts = parseEventStartDate(evt.date, evt.time);
        if (ts < 3000000000000) {
          const d = new Date(ts);
          const isSameDay =
            d.getFullYear() === selectedDate.getFullYear() &&
            d.getMonth() === selectedDate.getMonth() &&
            d.getDate() === selectedDate.getDate();
          if (!isSameDay) return false;
        }
      }

      return true;
    });

    return sortEventsChronologically(list);
  }, [events, selectedCategory, searchQuery, selectedDate]);

  // Helper to generate Google Calendar URL
  const getGoogleCalendarUrl = (evt: EventItem) => {
    const title = encodeURIComponent(evt.title);
    const details = encodeURIComponent(`${evt.description}\n\nOrganizador: ${evt.organizer}\nCosto: ${evt.cost}\nMás información: ${evt.sourceUrl || 'https://empresasencarmen.com'}`);
    const location = encodeURIComponent(evt.location);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`;
  };

  // Helper to generate and download .ics iCal file
  const downloadIcsFile = (evt: EventItem) => {
    const icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Empresas en Carmen//Cartelera Oficial//ES',
      'BEGIN:VEVENT',
      `SUMMARY:${evt.title}`,
      `DESCRIPTION:${evt.description.replace(/\n/g, '\\n')}`,
      `LOCATION:${evt.location}`,
      `STATUS:CONFIRMED`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${evt.title.slice(0, 30).replace(/[^a-z0-9]/gi, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Share event on WhatsApp
  const shareEventWhatsApp = (evt: EventItem) => {
    const text = encodeURIComponent(
      `🎉 ¡Mira este evento en Ciudad del Carmen!\n\n*${evt.title}*\n📅 Fecha: ${evt.date}\n⏰ Horario: ${evt.time}\n📍 Lugar: ${evt.location}\n🎟️ Costo: ${evt.cost}\n\nDescubre más en la Cartelera Oficial de Carmen:\nhttps://empresasencarmen.com/eventos`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen relative font-sans text-stone-900 pb-24 text-left bg-transparent">
      {/* Top Breadcrumb & Navigation Bar with Frosted Glass */}
      <div
        className="px-4 sm:px-8 py-3 rounded-2xl mb-4 transition-all duration-300"
        style={{
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(25px) saturate(190%)',
          WebkitBackdropFilter: 'blur(25px) saturate(190%)',
          border: '1.5px solid rgba(255, 255, 255, 0.88)',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackToDirectory}
            className="flex items-center gap-2 text-xs sm:text-sm font-black text-stone-900 hover:text-amber-700 transition-colors cursor-pointer group px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white border border-stone-200/70 shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-amber-600" />
            <span>Volver al Directorio de Empresas</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-xs text-stone-600 font-semibold">
              Ciudad del Carmen, Campeche
            </span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black text-emerald-700">Cartelera en Vivo</span>
          </div>
        </div>
      </div>

      {/* Hero Header con Título a la Izquierda y Calendario Compacto a la Derecha */}
      <div className="relative z-10 max-w-7xl mx-auto pt-2 pb-2">
        <div
          className="rounded-3xl p-6 sm:p-8 lg:p-10 transition-all duration-300 relative overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.78)',
            backdropFilter: 'blur(35px) saturate(190%)',
            WebkitBackdropFilter: 'blur(35px) saturate(190%)',
            border: '1.5px solid rgba(255, 255, 255, 0.92)',
            boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.95)',
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* COLUMNA IZQUIERDA (7 COLUMNAS): TÍTULO, DESCRIPCIÓN Y BUSCADOR */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-900 border border-amber-400/40 text-xs font-black uppercase tracking-wider shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Agenda Cultural, Deportiva y Social de Carmen</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-stone-950 tracking-tight leading-tight">
                Eventos, Conciertos, Ferias y Bazares
              </h1>

              <p className="text-sm sm:text-base text-stone-800 font-medium leading-relaxed">
                Descubre la cartelera completa de Ciudad del Carmen. Consulta las fechas en el calendario
                interactivo, agrega los eventos a tu agenda y comparte con tu familia y amigos.
              </p>

              {/* Buscador dentro del bloque izquierdo */}
              <div className="pt-2 max-w-xl relative">
                <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, malecón, playa, feria, bazar, concierto..."
                  className="w-full pl-12 pr-10 py-3.5 bg-white/95 border border-stone-200/80 rounded-2xl text-stone-950 font-semibold placeholder-stone-400 text-sm focus:outline-none focus:bg-white focus:border-[#007AFF] focus:ring-2 focus:ring-blue-500/20 transition-all shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-900 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* COLUMNA DERECHA (5 COLUMNAS): CALENDARIO COMPACTO INTEGRADO */}
            <div className="lg:col-span-5 w-full">
              <EventsCalendar
                events={events}
                selectedDate={selectedDate}
                onSelectDate={d => setSelectedDate(d)}
                onSelectEvent={evt => setSelectedEventModal(evt)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area (Sin repetir el calendario abajo) */}
      <div className="max-w-7xl mx-auto py-4 space-y-8 relative z-10">

        {/* Categories Bar & Active Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-stone-200/80">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-stone-900 text-white shadow-md'
                  : 'bg-white/70 hover:bg-white text-stone-800 border border-white/80'
              }`}
            >
              Todos ({events.length})
            </button>

            {categories.map(cat => {
              const count = events.filter(
                e => e.categorySlug === cat.slug || e.category === cat.name
              ).length;
              const isSelected = selectedCategory === cat.slug;

              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setSelectedCategory(isSelected ? 'all' : cat.slug)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-stone-900 text-white shadow-md'
                      : 'bg-white/70 hover:bg-white text-stone-800 border border-white/80'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-white/20 text-white font-extrabold' : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Counter */}
          <div className="text-xs text-stone-600 shrink-0 font-bold">
            Mostrando <strong className="text-amber-300">{filteredEvents.length}</strong> de {events.length} eventos
          </div>
        </div>

        {/* EVENTS LIST GRID */}
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 space-y-4 shadow-sm">
            <CalendarIcon className="w-12 h-12 text-amber-600 mx-auto" />
            <h3 className="text-lg font-black text-stone-950">No se encontraron eventos con estos filtros</h3>
            <p className="text-sm text-stone-700 font-medium max-w-md mx-auto">
              Intenta cambiar la fecha en el calendario superior, seleccionar otra categoría o borrar los términos de búsqueda.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSelectedDate(null);
                setSearchQuery('');
              }}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-all shadow-md cursor-pointer active:scale-95"
            >
              Restablecer todos los filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(evt => {
              const representativeImage = evt.image || getEventRepresentativeImage(evt);

              return (
                <article
                  key={evt.id}
                  className="bg-white/75 hover:bg-white/95 rounded-3xl border border-white/80 hover:border-amber-400/80 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group backdrop-blur-2xl"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-stone-900">
                    <img
                      src={representativeImage}
                      alt={evt.title}
                      loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        if (!img.src.includes('/uploads/kiosco-parque-zaragoza.jpg')) {
                          img.src = '/uploads/kiosco-parque-zaragoza.jpg';
                        }
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-black/30 pointer-events-none" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-stone-950 font-black text-[11px] uppercase tracking-wider shadow-md">
                        {evt.badge || evt.category}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-amber-300 font-black text-[11px] border border-amber-400/40 shadow-xs">
                        {evt.cost.toLowerCase().includes('libre') || evt.cost === '0'
                          ? '🎉 Entrada Libre'
                          : evt.cost.startsWith('$') ? evt.cost : `$${evt.cost}`}
                      </span>
                    </div>

                    {/* Category on photo bottom */}
                    <div className="absolute bottom-3 left-3 z-10">
                      <span className="text-[11px] font-black text-amber-200 uppercase tracking-widest bg-black/70 backdrop-blur-xs px-2.5 py-0.5 rounded-md shadow-xs">
                        {evt.category}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4 text-left">
                    <div className="space-y-2.5">
                      <h3 className="text-lg font-black text-stone-950 leading-snug group-hover:text-amber-800 transition-colors line-clamp-2">
                        {evt.title}
                      </h3>

                      <p className="text-xs text-stone-700 font-medium line-clamp-3 leading-relaxed">
                        {evt.description}
                      </p>

                      {/* Meta list */}
                      <div className="space-y-1.5 pt-2 text-xs text-stone-800 font-semibold">
                        <div className="flex items-center gap-2 text-amber-800 font-black">
                          <CalendarIcon className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="truncate">{evt.date}</span>
                        </div>

                        {evt.time && evt.time !== 'Sin información' && (
                          <div className="flex items-center gap-2 text-stone-800">
                            <Clock className="w-4 h-4 text-stone-500 shrink-0" />
                            <span className="truncate">{evt.time}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-stone-800">
                          <MapPin className="w-4 h-4 text-stone-500 shrink-0" />
                          <span className="truncate">{evt.location}</span>
                        </div>

                        {evt.organizer && (
                          <div className="text-[11px] text-stone-600 pt-1 font-medium">
                            Organiza: <strong className="text-stone-900">{evt.organizer}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="pt-4 border-t border-stone-200/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => shareEventWhatsApp(evt)}
                          className="p-2 rounded-xl bg-[#34C759] hover:bg-[#28a745] text-white transition-all shadow-xs cursor-pointer active:scale-95"
                          title="Compartir por WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadIcsFile(evt)}
                          className="p-2 rounded-xl bg-white/80 hover:bg-white text-stone-800 border border-white/90 shadow-2xs transition-all cursor-pointer active:scale-95"
                          title="Descargar archivo para iCal / Outlook"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedEventModal(evt)}
                        className="px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 cursor-pointer active:scale-95"
                      >
                        <span>Ver Detalles</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* EVENT DETAIL MODAL (iMac / iOS Frosted Glass) */}
      {selectedEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
          <div
            className="rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative text-stone-900 transition-all duration-300"
            style={{
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(35px) saturate(190%)',
              WebkitBackdropFilter: 'blur(35px) saturate(190%)',
              border: '1.5px solid rgba(255, 255, 255, 0.95)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.95)',
            }}
          >
            {/* Header Image */}
            <div className="relative aspect-video w-full overflow-hidden bg-stone-900">
              <img
                src={selectedEventModal.image || getEventRepresentativeImage(selectedEventModal)}
                alt={selectedEventModal.title}
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  if (!img.src.includes('/uploads/kiosco-parque-zaragoza.jpg')) {
                    img.src = '/uploads/kiosco-parque-zaragoza.jpg';
                  }
                }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-black/30 pointer-events-none" />

              <button
                type="button"
                onClick={() => setSelectedEventModal(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black text-white transition-colors cursor-pointer shadow-md"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-lg bg-amber-500 text-stone-950 font-black text-xs uppercase tracking-wider shadow-md">
                  {selectedEventModal.badge || selectedEventModal.category}
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 text-left">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-black text-stone-950 leading-tight">
                  {selectedEventModal.title}
                </h2>
                <div className="text-xs text-amber-800 font-extrabold uppercase tracking-wider">
                  {selectedEventModal.category}
                </div>
              </div>

              {/* Event Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-white/70 border border-stone-200/80 text-xs text-stone-800 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <CalendarIcon className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-stone-500 uppercase font-bold">Fecha</span>
                    <strong className="text-stone-950 text-sm font-black">{selectedEventModal.date}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-stone-500 uppercase font-bold">Horario</span>
                    <strong className="text-stone-950 text-sm font-black">{selectedEventModal.time || 'Por confirmar'}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <MapPin className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-stone-500 uppercase font-bold">Lugar</span>
                    <strong className="text-stone-950 text-sm font-black">{selectedEventModal.location}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Ticket className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-stone-500 uppercase font-bold">Costo de Entrada</span>
                    <strong className="text-stone-950 text-sm font-black">{selectedEventModal.cost}</strong>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                  Descripción del Evento
                </h4>
                <p className="text-sm text-stone-800 font-medium leading-relaxed whitespace-pre-line">
                  {selectedEventModal.description}
                </p>
              </div>

              {selectedEventModal.organizer && (
                <div className="p-3 rounded-xl bg-white/70 border border-stone-200/80 text-xs text-stone-700">
                  Organizado por: <strong className="text-stone-950">{selectedEventModal.organizer}</strong>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-stone-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <a
                    href={getGoogleCalendarUrl(selectedEventModal)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold text-xs transition-all shadow-md shadow-blue-500/20 active:scale-95"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    <span>Agregar a Google Calendar</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => downloadIcsFile(selectedEventModal)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/80 hover:bg-white text-stone-800 font-bold text-xs border border-white/90 shadow-2xs transition-all active:scale-95"
                    title="Descargar iCal .ics"
                  >
                    <Download className="w-4 h-4" />
                    <span>.ICS</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => shareEventWhatsApp(selectedEventModal)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#34C759] hover:bg-[#28a745] text-white font-bold text-xs transition-all shadow-md shadow-green-500/20 active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Compartir en WhatsApp</span>
                  </button>

                  {selectedEventModal.sourceUrl && (
                    <a
                      href={selectedEventModal.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold transition-all shadow-xs active:scale-95"
                      title="Abrir enlace oficial del evento"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
