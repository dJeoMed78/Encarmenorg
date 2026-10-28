import DEFAULT_EVENTS_DATA from '../data/events_carmen.json';
import { getEventRepresentativeImage } from '../utils/eventImages';

export interface EventItem {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  date: string;
  time: string;
  location: string;
  cost: string;
  description: string;
  organizer: string;
  badge: string;
  icon: string;
  image?: string;
  sourceUrl?: string;
  aiDetected?: boolean;
  updatedAt?: string;
}

const STORAGE_KEY = 'carmen_events_billboard_v5';

export function parseEventStartDate(dateStr?: string, timeStr?: string): number {
  if (!dateStr || typeof dateStr !== 'string') return new Date(2099, 0, 1).getTime();
  const clean = dateStr.normalize('NFKD').toLowerCase().trim();

  const months: Record<string, number> = {
    enero: 0, feb: 1, febrero: 1, mar: 2, marzo: 2, abr: 3, abril: 3,
    mayo: 4, jun: 5, junio: 5, jul: 6, julio: 6, ago: 7, agosto: 7,
    sep: 8, sept: 8, septiembre: 8, oct: 9, octubre: 9,
    nov: 10, noviembre: 10, dic: 11, diciembre: 11
  };

  let foundMonth: number | null = null;
  for (const [mName, mIdx] of Object.entries(months)) {
    const regex = new RegExp(`\\b${mName}\\b`, 'i');
    if (regex.test(clean)) {
      foundMonth = mIdx;
      break;
    }
  }

  const yearMatch = clean.match(/\b(202\d)\b/);
  const currentYear = new Date().getFullYear();
  const year = yearMatch ? parseInt(yearMatch[1], 10) : currentYear;

  const dayMatches = clean.match(/\b([1-3]?\d)\b/g);
  let day: number | null = null;
  if (dayMatches && dayMatches.length > 0) {
    const validDays = dayMatches
      .map(d => parseInt(d, 10))
      .filter(d => d >= 1 && d <= 31 && d !== year);
    if (validDays.length > 0) {
      day = validDays[0];
    }
  }

  if (foundMonth !== null && day !== null) {
    let hour = 12;
    let min = 0;
    if (timeStr) {
      const cleanTime = timeStr.normalize('NFKD').toLowerCase();
      const showMatch = cleanTime.match(/show\s*(\d{1,2})(?::(\d{2}))?\s*(pm|am)?/i);
      const standardMatch = cleanTime.match(/(\d{1,2})(?::(\d{2}))?\s*(pm|am|p\.?m\.?|a\.?m\.?|hrs)?/i);
      const chosen = showMatch || standardMatch;
      if (chosen) {
        let h = parseInt(chosen[1], 10);
        const m = chosen[2] ? parseInt(chosen[2], 10) : 0;
        const period = (chosen[3] || '').replace(/\./g, '');
        if ((period.includes('pm') || period.includes('p')) && h < 12) h += 12;
        if ((period.includes('am') || period.includes('a')) && h === 12) h = 0;
        hour = h;
        min = m;
      }
    }
    return new Date(year, foundMonth, day, hour, min).getTime();
  }

  // Handle recurring like "Jueves y Domingos" or "Sábado y Domingo"
  const now = new Date();
  if (clean.includes('jueves')) {
    return new Date(year, now.getMonth(), now.getDate(), 18, 0).getTime();
  }
  if (clean.includes('sabado') || clean.includes('sábado')) {
    const d = new Date(now);
    const dayOfWeek = d.getDay();
    const diff = (6 - dayOfWeek + 7) % 7;
    d.setDate(d.getDate() + diff);
    return d.getTime();
  }
  if (clean.includes('domingo')) {
    const d = new Date(now);
    const dayOfWeek = d.getDay();
    const diff = (7 - dayOfWeek) % 7;
    d.setDate(d.getDate() + (diff === 0 ? 0 : diff));
    return d.getTime();
  }

  return new Date(2099, 0, 1).getTime();
}

export function isEventExpired(dateStr?: string, timeStr?: string): boolean {
  if (!dateStr) return false;
  const clean = dateStr.normalize('NFKD').toLowerCase().trim();

  // Eventos recurrentes permanentes nunca caducan
  if (
    clean.includes('todos los') ||
    clean.includes('cada ') ||
    clean.includes('permanente') ||
    clean.includes('semanal')
  ) {
    return false;
  }

  const startTs = parseEventStartDate(dateStr, timeStr);
  if (startTs >= new Date(2098, 0, 1).getTime()) return false;

  // Un evento expira formalmente al concluir el día de su realización (23:59:59 hrs)
  const eventDate = new Date(startTs);
  eventDate.setHours(23, 59, 59, 999);

  return eventDate.getTime() < Date.now();
}

export function filterActiveUpcomingEvents<T extends { date?: string; time?: string }>(events: T[]): T[] {
  return events.filter(e => !isEventExpired(e.date, e.time));
}

export function sortEventsChronologically<T extends { date?: string; time?: string }>(events: T[]): T[] {
  return [...events].sort((a, b) => parseEventStartDate(a.date, a.time) - parseEventStartDate(b.date, b.time));
}

// In-memory cache
let inMemoryEvents: EventItem[] = [];

// Ensure every event item has its representative image resolved
export const ensureEventRepresentativeImage = (item: EventItem): EventItem => {
  const resolvedImg = getEventRepresentativeImage(item);
  return {
    ...item,
    image: resolvedImg
  };
};

// Helper to load cached data from localStorage or fallback to DEFAULT_EVENTS_DATA
const loadLocalInitial = (): EventItem[] => {
  const sanitize = (evts: EventItem[]) =>
    sortEventsChronologically(filterActiveUpcomingEvents(evts.map(ensureEventRepresentativeImage)));

  if (typeof window === 'undefined') {
    return sanitize(DEFAULT_EVENTS_DATA as EventItem[]);
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return sanitize(parsed);
      }
    }
  } catch (e) {
    console.error('Error reading events from localStorage:', e);
  }
  return sanitize(DEFAULT_EVENTS_DATA as EventItem[]);
};

inMemoryEvents = loadLocalInitial();

// Synchronous getter for immediate render
export const getEventsData = (): EventItem[] => {
  if (!inMemoryEvents || inMemoryEvents.length === 0) {
    inMemoryEvents = filterActiveUpcomingEvents(
      sortEventsChronologically((DEFAULT_EVENTS_DATA as EventItem[]).map(ensureEventRepresentativeImage))
    );
  }
  return filterActiveUpcomingEvents(
    sortEventsChronologically(inMemoryEvents.map(ensureEventRepresentativeImage))
  );
};

// Dispatch change event and persist locally
const notifyAndPersist = (events: EventItem[]) => {
  const sanitized = filterActiveUpcomingEvents(
    sortEventsChronologically(events.map(ensureEventRepresentativeImage))
  );
  inMemoryEvents = sanitized;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      window.dispatchEvent(new CustomEvent('events-billboard-updated'));
    } catch (e) {
      console.error('Error saving events to localStorage:', e);
    }
  }
};

export const saveEventsData = (events: EventItem[]): void => {
  notifyAndPersist(events);
};

// Fetch from backend API /api/events
export const fetchEventsFromAPI = async (): Promise<EventItem[]> => {
  try {
    const res = await fetch('/api/events');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.events) && data.events.length > 0) {
        notifyAndPersist(data.events);
        return data.events;
      }
    }
  } catch (err) {
    console.warn('Could not fetch events from /api/events:', err);
  }
  if (!inMemoryEvents || inMemoryEvents.length === 0) {
    const fallback = sortEventsChronologically((DEFAULT_EVENTS_DATA as EventItem[]).map(ensureEventRepresentativeImage));
    notifyAndPersist(fallback);
    return fallback;
  }
  return inMemoryEvents;
};

// Start real-time sync with MariaDB backend
let isListenerActive = false;
export const initEventsRealtimeSync = (): (() => void) => {
  if (typeof window === 'undefined' || isListenerActive) {
    return () => {};
  }
  isListenerActive = true;

  // Initial fetch from /api/events
  fetchEventsFromAPI().catch(() => {});

  // Periodic polling from /api/events (MariaDB backend) every 30 seconds
  const pollInterval = setInterval(() => {
    fetchEventsFromAPI().catch(() => {});
  }, 30000);

  return () => {
    isListenerActive = false;
    clearInterval(pollInterval);
  };
};

// Auto-run on client mount
if (typeof window !== 'undefined') {
  setTimeout(() => {
    initEventsRealtimeSync();
  }, 100);
}

// Add event: saves to backend /api/events (MariaDB) AND local cache
export const addEventItem = async (item: Omit<EventItem, 'id'>): Promise<EventItem> => {
  const newId = 'evt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const newItem: EventItem = {
    ...item,
    id: newId,
    updatedAt: new Date().toISOString()
  };

  const updated = [newItem, ...inMemoryEvents.filter(e => e.id !== newId)];
  notifyAndPersist(updated);

  // Sync with MariaDB backend API
  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    });
  } catch (err) {
    console.warn('Error POST /api/events:', err);
  }

  return newItem;
};

// Update event
export const updateEventItem = async (id: string, updates: Partial<EventItem>): Promise<boolean> => {
  const idx = inMemoryEvents.findIndex(e => e.id === id);
  if (idx === -1) return false;

  const updatedItem: EventItem = {
    ...inMemoryEvents[idx],
    ...updates,
    id,
    updatedAt: new Date().toISOString()
  };

  inMemoryEvents[idx] = updatedItem;
  notifyAndPersist([...inMemoryEvents]);

  // Sync with MariaDB backend API
  try {
    await fetch(`/api/events/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  } catch (err) {
    console.warn('Error PUT /api/events:', err);
  }

  return true;
};

// Delete event
export const deleteEventItem = async (id: string): Promise<boolean> => {
  const filtered = inMemoryEvents.filter(e => e.id !== id);
  if (filtered.length === inMemoryEvents.length) return false;

  notifyAndPersist(filtered);

  // Delete from MariaDB backend API
  try {
    await fetch(`/api/events/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.warn('Error DELETE /api/events:', err);
  }

  return true;
};

// Reset events to default
export const resetEventsDataToDefault = async (): Promise<EventItem[]> => {
  const defaults = DEFAULT_EVENTS_DATA as EventItem[];
  notifyAndPersist(defaults);

  // Reset MariaDB backend API
  try {
    await fetch('/api/events/reset', { method: 'POST' });
  } catch (err) {
    console.warn('Error POST /api/events/reset:', err);
  }

  return defaults;
};

// ==========================================
// RADAR IA DE EVENTOS (Auto-Detección y Publicación)
// ==========================================

export interface AIRadarCandidate {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  date: string;
  time: string;
  location: string;
  cost?: string;
  description: string;
  organizer?: string;
  badge?: string;
  icon?: string;
  image?: string;
  sourceUrl: string;
  alreadyPublished?: boolean;
  publishedEventId?: string;
  aiDetected?: boolean;
}

export interface AIRadarSearchResponse {
  success: boolean;
  message?: string;
  query?: string;
  totalFound: number;
  aiInfo?: {
    usedAi: boolean;
    quotaExhausted?: boolean;
    message?: string;
  };
  candidates: AIRadarCandidate[];
}

export interface AIRadarPublishResponse {
  success: boolean;
  message: string;
  count: number;
  published: EventItem[];
  events: EventItem[];
}

export const searchAIRadarCandidates = async (query?: string, useAi?: boolean): Promise<AIRadarSearchResponse> => {
  const res = await fetch('/api/events/radar-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: query || '', useAi: Boolean(useAi), timestamp: Date.now() })
  });
  if (!res.ok) throw new Error(`Error HTTP ${res.status} al buscar eventos. No se obtuvieron resultados verificados.`);
  const data: AIRadarSearchResponse = await res.json();
  if (!data?.success || !Array.isArray(data.candidates)) {
    throw new Error(data?.message || 'El servidor no confirmó resultados del Radar.');
  }
  return data;
};

export const publishAIRadarCandidates = async (events: AIRadarCandidate[]): Promise<AIRadarPublishResponse> => {
  const res = await fetch('/api/events/publish-candidates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events })
  });
  if (!res.ok) throw new Error(`Error HTTP ${res.status} al publicar eventos.`);
  const data: AIRadarPublishResponse = await res.json();
  if (!data?.success || !Array.isArray(data.events) || !Number.isInteger(data.count)) {
    throw new Error(data?.message || 'El servidor no confirmó la publicación.');
  }
  if (data.count !== events.length) throw new Error('Publicación parcial: revisa la cartelera antes de reintentar.');
  notifyAndPersist(data.events);
  return data;
};

export interface AIRadarScanResult {
  success: boolean;
  message: string;
  scannedAt?: string;
  foundCount?: number;
  newEventsAdded: number;
  totalEvents: number;
  newEvents?: EventItem[];
  allEvents?: EventItem[];
}

export interface AIRadarStatus {
  success: boolean;
  lastScan: string | null;
  lastAddedCount: number;
  totalEvents: number;
  aiDetectedCount: number;
}

export const triggerAIRadarScan = async (): Promise<AIRadarScanResult> => {
  const res = await fetch('/api/events/radar-scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timestamp: Date.now() })
  });
  if (!res.ok) throw new Error(`Error HTTP ${res.status} al ejecutar el Radar de eventos.`);
  const data: AIRadarScanResult = await res.json();
  if (!data?.success) throw new Error(data?.message || 'El servidor no confirmó el escaneo de eventos.');
  if (Array.isArray(data.allEvents)) notifyAndPersist(data.allEvents);
  return data;
};

export const getAIRadarStatus = async (): Promise<AIRadarStatus> => {
  try {
    const res = await fetch('/api/events/radar-status');
    if (!res.ok) throw new Error('Error al obtener estado');
    return await res.json();
  } catch {
    return {
      success: false,
      lastScan: null,
      lastAddedCount: 0,
      totalEvents: inMemoryEvents.length,
      aiDetectedCount: inMemoryEvents.filter(e => e.aiDetected).length
    };
  }
};
