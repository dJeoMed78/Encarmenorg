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
import { EventItem, parseEventStartDate } from '../services/eventsService';
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
      if (e.category) {
        map.set(e.categorySlug || 'varios', e.category);
      }
    });
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [events]);

  // Filter events based on search, category, and selected date
  const filteredEvents = useMemo(() => {
    return events.filter(evt => {
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
    <div className="min-h-screen bg-[#000a17] text-white pb-24 text-left">
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="bg-[#001026] border-b border-amber-500/20 px-4 sm:px-8 py-3 sticky top-0 z-30 backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackToDirectory}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-300 hover:text-white transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Volver al Directorio de Empresas</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-xs text-stone-400">
              Ciudad del Carmen, Campeche
            </span>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-emerald-400">Cartelera en Vivo</span>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#001533] via-[#000e24] to-[#000a17] py-10 px-4 sm:px-6 lg:px-8 border-b border-white/10">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Agenda Cultural, Deportiva y Social de Carmen</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Eventos, Conciertos, Ferias y Bazares
          </h1>

          <p className="text-sm sm:text-base text-stone-300 max-w-3xl leading-relaxed">
            Descubre la cartelera completa de Ciudad del Carmen. Consulta las fechas en el calendario
            interactivo, agrega los eventos a tu agenda y comparte con tu familia y amigos.
          </p>

          {/* Search bar inside hero */}
          <div className="pt-2 max-w-2xl relative">
            <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, malecón, playa, feria, bazar, concierto..."
              className="w-full pl-12 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-stone-400 text-sm focus:outline-none focus:border-amber-400 focus:bg-white/15 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* UPPER SECTION: INTERACTIVE CALENDAR */}
        <div>
          <EventsCalendar
            events={events}
            selectedDate={selectedDate}
            onSelectDate={d => setSelectedDate(d)}
            onSelectEvent={evt => setSelectedEventModal(evt)}
          />
        </div>

        {/* Categories Bar & Active Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-white/10">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10'
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
                      ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                      : 'bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-stone-950 text-white font-extrabold' : 'bg-white/10 text-stone-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Counter */}
          <div className="text-xs text-stone-400 shrink-0 font-medium">
            Mostrando <strong className="text-amber-300">{filteredEvents.length}</strong> de {events.length} eventos
          </div>
        </div>

        {/* EVENTS LIST GRID */}
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white/5 border border-white/10 space-y-4">
            <CalendarIcon className="w-12 h-12 text-amber-400/60 mx-auto" />
            <h3 className="text-lg font-bold text-white">No se encontraron eventos con estos filtros</h3>
            <p className="text-sm text-stone-400 max-w-md mx-auto">
              Intenta cambiar la fecha en el calendario superior, seleccionar otra categoría o borrar los términos de búsqueda.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSelectedDate(null);
                setSearchQuery('');
              }}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-all shadow-md cursor-pointer"
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
                  className="bg-[#051122] rounded-3xl border border-white/10 hover:border-amber-400/60 overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-amber-500/10 transition-all flex flex-col justify-between group"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-black/60">
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
                    <div className="absolute inset-0 bg-gradient-to-t from-[#051122] via-transparent to-black/30" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-stone-950 font-black text-[11px] uppercase tracking-wider shadow-md">
                        {evt.badge || evt.category}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-amber-300 font-extrabold text-[11px] border border-amber-400/30">
                        {evt.cost.toLowerCase().includes('libre') || evt.cost === '0'
                          ? '🎉 Entrada Libre'
                          : evt.cost.startsWith('$') ? evt.cost : `$${evt.cost}`}
                      </span>
                    </div>

                    {/* Category on photo bottom */}
                    <div className="absolute bottom-3 left-3">
                      <span className="text-[11px] font-bold text-amber-200/90 uppercase tracking-widest bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded">
                        {evt.category}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <h3 className="text-lg font-black text-white leading-snug group-hover:text-amber-300 transition-colors line-clamp-2">
                        {evt.title}
                      </h3>

                      <p className="text-xs text-stone-400 line-clamp-3 leading-relaxed">
                        {evt.description}
                      </p>

                      {/* Meta list */}
                      <div className="space-y-1.5 pt-2 text-xs text-stone-300">
                        <div className="flex items-center gap-2 text-amber-300 font-bold">
                          <CalendarIcon className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="truncate">{evt.date}</span>
                        </div>

                        {evt.time && evt.time !== 'Sin información' && (
                          <div className="flex items-center gap-2 text-stone-300">
                            <Clock className="w-4 h-4 text-stone-400 shrink-0" />
                            <span className="truncate">{evt.time}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-stone-300">
                          <MapPin className="w-4 h-4 text-stone-400 shrink-0" />
                          <span className="truncate">{evt.location}</span>
                        </div>

                        {evt.organizer && (
                          <div className="text-[11px] text-stone-400 pt-1 font-medium">
                            Organiza: <strong className="text-stone-200">{evt.organizer}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => shareEventWhatsApp(evt)}
                          className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-stone-950 border border-emerald-500/30 transition-all cursor-pointer"
                          title="Compartir por WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadIcsFile(evt)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-stone-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                          title="Descargar archivo para iCal / Outlook"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedEventModal(evt)}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10 cursor-pointer"
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

      {/* EVENT DETAIL MODAL */}
      {selectedEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#051122] rounded-3xl border border-amber-500/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl text-white relative">
            {/* Header Image */}
            <div className="relative aspect-video w-full overflow-hidden bg-black">
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
              <div className="absolute inset-0 bg-gradient-to-t from-[#051122] via-transparent to-black/40" />

              <button
                type="button"
                onClick={() => setSelectedEventModal(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition-colors cursor-pointer"
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
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white leading-tight">
                  {selectedEventModal.title}
                </h2>
                <div className="text-xs text-amber-300 font-bold uppercase tracking-wider">
                  {selectedEventModal.category}
                </div>
              </div>

              {/* Event Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-stone-300">
                <div className="flex items-center gap-2.5">
                  <CalendarIcon className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-stone-400 uppercase font-bold">Fecha</span>
                    <strong className="text-white text-sm">{selectedEventModal.date}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-sky-400 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-stone-400 uppercase font-bold">Horario</span>
                    <strong className="text-white text-sm">{selectedEventModal.time || 'Por confirmar'}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <MapPin className="w-5 h-5 text-rose-400 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-stone-400 uppercase font-bold">Lugar</span>
                    <strong className="text-white text-sm">{selectedEventModal.location}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Ticket className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-stone-400 uppercase font-bold">Costo de Entrada</span>
                    <strong className="text-white text-sm">{selectedEventModal.cost}</strong>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                  Descripción del Evento
                </h4>
                <p className="text-sm text-stone-300 leading-relaxed whitespace-pre-line">
                  {selectedEventModal.description}
                </p>
              </div>

              {selectedEventModal.organizer && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-stone-400">
                  Organizado por: <strong className="text-white">{selectedEventModal.organizer}</strong>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <a
                    href={getGoogleCalendarUrl(selectedEventModal)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    <span>Agregar a Google Calendar</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => downloadIcsFile(selectedEventModal)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
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
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Compartir en WhatsApp</span>
                  </button>

                  {selectedEventModal.sourceUrl && (
                    <a
                      href={selectedEventModal.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors"
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
