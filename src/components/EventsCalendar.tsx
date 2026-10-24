import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
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
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export const EventsCalendar: React.FC<EventsCalendarProps> = ({
  events,
  selectedDate,
  onSelectDate
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentViewDate, setCurrentViewDate] = useState<Date>(() => new Date(2026, 9, 1));

  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    events.forEach((evt) => {
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

  const calendarCells = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let startOffset = firstDay.getDay() - 1;
    if (startOffset === -1) startOffset = 6;

    const cells: Array<{ date: Date | null; dayNumber: number | null; dateKey: string; count: number }> = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ date: null, dayNumber: null, dateKey: `empty-${i}`, count: 0 });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        date: dateObj,
        dayNumber: d,
        dateKey: key,
        count: (eventsByDate.get(key) || []).length
      });
    }
    return cells;
  }, [year, month, eventsByDate]);

  const selectedKey = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : null;

  return (
    <div
      className="w-full rounded-2xl p-3.5 sm:p-4 transition-all duration-300 shadow-md border border-stone-200/70 bg-white/95"
    >
      {/* CABECERA COMPACTA */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-2xs shrink-0">
            <CalendarIcon className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-stone-900 leading-tight">
              {MONTH_NAMES[month]} {year}
            </h3>
            <p className="text-[10px] text-stone-500 font-medium">
              {events.length} actividades en cartelera
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {selectedDate && (
            <button
              type="button"
              onClick={() => onSelectDate(null)}
              className="px-2 py-1 rounded-lg bg-amber-100 text-amber-900 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Todos</span>
            </button>
          )}

          {!isCollapsed && (
            <div className="flex items-center bg-stone-100/80 rounded-lg border border-stone-200/80 p-0.5">
              <button
                type="button"
                onClick={() => setCurrentViewDate(new Date(year, month - 1, 1))}
                className="p-1 rounded-md hover:bg-white text-stone-600 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentViewDate(new Date(year, month + 1, 1))}
                className="p-1 rounded-md hover:bg-white text-stone-600 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="px-2.5 py-1 rounded-lg bg-stone-100/80 hover:bg-stone-200/70 text-stone-700 border border-stone-200/80 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>{isCollapsed ? 'Mostrar' : 'Ocultar'}</span>
            {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* CUADRÍCULA COMPACTA */}
      {!isCollapsed && (
        <div className="mt-3 pt-2.5 border-t border-stone-100">
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAYS.map((w, i) => (
              <div key={i} className="text-[9px] font-bold text-stone-400 uppercase">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell) => {
              if (!cell.date || !cell.dayNumber) {
                return <div key={cell.dateKey} className="h-7" />;
              }
              const isSelected = selectedKey === cell.dateKey;
              const hasEvt = cell.count > 0;

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() => onSelectDate(isSelected ? null : cell.date)}
                  className={`h-7 sm:h-8 rounded-lg flex flex-col items-center justify-center text-[11px] font-bold transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-stone-900 text-white shadow-sm scale-105'
                      : hasEvt
                      ? 'bg-amber-100/90 hover:bg-amber-200/80 text-stone-900 border border-amber-300/60'
                      : 'hover:bg-stone-100 text-stone-700'
                  }`}
                >
                  <span className="leading-none">{cell.dayNumber}</span>
                  {hasEvt && (
                    <span
                      className={`w-1 h-1 rounded-full mt-0.5 ${
                        isSelected ? 'bg-amber-400' : 'bg-amber-600'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
