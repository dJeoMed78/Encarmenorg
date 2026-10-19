import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Sparkles,
  RotateCcw,
  Clock,
  MapPin,
  Tag
} from 'lucide-react';
import { EventItem, parseEventStartDate } from '../services/eventsService';

interface EventsCalendarProps {
  events: EventItem[];
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
  onSelectEvent?: (event: EventItem) => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const EventsCalendar: React.FC<EventsCalendarProps> = ({
  events,
  selectedDate,
  onSelectDate,
  onSelectEvent
}) => {
  // Current view month & year (default to October 2026 or current active event month)
  const [currentViewDate, setCurrentViewDate] = useState<Date>(() => {
    // If there's an event this month, show that
    if (events && events.length > 0) {
      const firstTs = parseEventStartDate(events[0].date);
      if (firstTs < 3000000000000) {
        return new Date(firstTs);
      }
    }
    return new Date(2026, 9, 1); // Oct 2026 default
  });

  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToday = () => {
    const today = new Date();
    setCurrentViewDate(today);
    onSelectDate(today);
  };

  // Map events to date keys: 'YYYY-MM-DD'
  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();

    events.forEach(evt => {
      const ts = parseEventStartDate(evt.date, evt.time);
      if (ts < 3000000000000) {
        const d = new Date(ts);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const existing = map.get(key) || [];
        existing.push(evt);
        map.set(key, existing);
      }
    });

    return map;
  }, [events]);

  // Generate calendar grid
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday is 0, Sunday is 6
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();

    // Previous month filler days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const cells: Array<{
      date: Date;
      dayNumber: number;
      isCurrentMonth: boolean;
      dateKey: string;
      events: EventItem[];
    }> = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(year, month - 1, dayNum);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      cells.push({
        date: d,
        dayNumber: dayNum,
        isCurrentMonth: false,
        dateKey: key,
        events: eventsByDate.get(key) || []
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      cells.push({
        date: d,
        dayNumber: i,
        isCurrentMonth: true,
        dateKey: key,
        events: eventsByDate.get(key) || []
      });
    }

    // Next month filler days to complete grid (multiples of 7)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      cells.push({
        date: d,
        dayNumber: i,
        isCurrentMonth: false,
        dateKey: key,
        events: eventsByDate.get(key) || []
      });
    }

    return cells;
  }, [year, month, eventsByDate]);

  const selectedKey = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : null;

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const selectedEvents = selectedKey ? eventsByDate.get(selectedKey) || [] : [];

  return (
    <div className="bg-[#051122] rounded-3xl border border-amber-500/25 p-4 sm:p-6 shadow-2xl text-white relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Calendario Interactivo Carmelita</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 tracking-tight">
            <span>{MONTH_NAMES[month]} {year}</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-stone-300">
              {events.length} actividades programadas
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
            Haz clic en los días marcados con punto dorado para ver los eventos exactos de esa fecha.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {selectedDate && (
            <button
              type="button"
              onClick={() => onSelectDate(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-amber-300 border border-amber-400/40 transition-all cursor-pointer"
              title="Quitar filtro de fecha y mostrar todos los eventos"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ver todos</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleGoToday}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
          >
            Hoy
          </button>

          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="relative z-10 grid grid-cols-7 gap-1 sm:gap-2 mt-4 text-center">
        {WEEKDAYS.map((w, idx) => (
          <div
            key={w}
            className={`py-1 text-[11px] sm:text-xs font-bold uppercase tracking-wider ${
              idx >= 5 ? 'text-amber-400/90' : 'text-stone-400'
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="relative z-10 grid grid-cols-7 gap-1 sm:gap-2 mt-2">
        {calendarCells.map((cell, idx) => {
          const hasEvents = cell.events.length > 0;
          const isSelected = selectedKey === cell.dateKey;
          const isToday = todayKey === cell.dateKey;

          return (
            <button
              key={`${cell.dateKey}-${idx}`}
              type="button"
              onClick={() => {
                if (isSelected) {
                  onSelectDate(null);
                } else {
                  onSelectDate(cell.date);
                }
              }}
              className={`min-h-[58px] sm:min-h-[72px] p-1.5 sm:p-2 rounded-2xl border text-left flex flex-col justify-between transition-all relative group cursor-pointer ${
                isSelected
                  ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-lg shadow-amber-500/30 font-bold scale-[1.02] z-20'
                  : hasEvents
                  ? 'bg-[#001838] hover:bg-[#00224f] border-amber-500/40 hover:border-amber-400/80 text-white'
                  : cell.isCurrentMonth
                  ? 'bg-white/[0.02] hover:bg-white/[0.06] border-white/5 text-stone-300'
                  : 'bg-transparent border-transparent text-stone-600 opacity-40'
              } ${isToday && !isSelected ? 'ring-2 ring-sky-400/60 ring-offset-1 ring-offset-[#051122]' : ''}`}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-xs sm:text-sm font-extrabold ${
                    isSelected ? 'text-stone-950' : cell.isCurrentMonth ? 'text-white' : 'text-stone-600'
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {isToday && (
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                      isSelected ? 'bg-stone-950 text-white' : 'bg-sky-500 text-white'
                    }`}
                  >
                    Hoy
                  </span>
                )}
              </div>

              {/* Event indicators */}
              {hasEvents && (
                <div className="w-full mt-1">
                  <div className="flex items-center gap-1">
                    <span
                      className={`w-2 h-2 rounded-full animate-ping ${
                        isSelected ? 'bg-stone-950' : 'bg-amber-400'
                      }`}
                    />
                    <span
                      className={`text-[10px] sm:text-[11px] font-bold line-clamp-1 truncate ${
                        isSelected ? 'text-stone-950' : 'text-amber-300'
                      }`}
                    >
                      {cell.events.length === 1 ? cell.events[0].title : `${cell.events.length} eventos`}
                    </span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Info Banner */}
      {selectedDate && (
        <div className="relative z-10 mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-amber-500 text-stone-950 font-black">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <div className="text-xs uppercase font-extrabold text-amber-300 tracking-wider">
                Filtrando por fecha seleccionada
              </div>
              <div className="text-base font-black text-white">
                {selectedDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div className="text-xs text-stone-400">
                {selectedEvents.length === 0
                  ? 'No hay eventos agendados para este día específico.'
                  : `${selectedEvents.length} evento(s) encontrado(s) en cartelera:`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedEvents.length > 0 && onSelectEvent && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedEvents.map(evt => (
                  <button
                    key={evt.id}
                    type="button"
                    onClick={() => onSelectEvent(evt)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all cursor-pointer shadow-xs truncate max-w-xs"
                  >
                    Ver "{evt.title.slice(0, 24)}..."
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => onSelectDate(null)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              ✕ Limpiar fecha
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
