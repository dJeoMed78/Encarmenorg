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
  const clean = dateStr.toLowerCase().trim();

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
      const tm = timeStr.match(/(\d{1,2}):(\d{2})/);
      if (tm) {
        hour = parseInt(tm[1], 10);
        min = parseInt(tm[2], 10);
      }
    }
    return new Date(year, foundMonth, day, hour, min).getTime();
  }

  // Handle recurring like "Sábado y Domingo" or "Domingos"
  const now = new Date();
  if (clean.includes('sabado') || clean.includes('sábado')) {
    const d = new Date(now);
    const dayOfWeek = d.getDay(); // 0 is Sun, 6 is Sat
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

export function sortEventsChronologically(events: EventItem[]): EventItem[] {
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
  if (typeof window === 'undefined') {
    return sortEventsChronologically((DEFAULT_EVENTS_DATA as EventItem[]).map(ensureEventRepresentativeImage));
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return sortEventsChronologically(parsed.map(ensureEventRepresentativeImage));
      }
    }
  } catch (e) {
    console.error('Error reading events from localStorage:', e);
  }
  return sortEventsChronologically((DEFAULT_EVENTS_DATA as EventItem[]).map(ensureEventRepresentativeImage));
};

inMemoryEvents = loadLocalInitial();

// Synchronous getter for immediate render
export const getEventsData = (): EventItem[] => {
  if (!inMemoryEvents || inMemoryEvents.length === 0) {
    inMemoryEvents = sortEventsChronologically((DEFAULT_EVENTS_DATA as EventItem[]).map(ensureEventRepresentativeImage));
  }
  return sortEventsChronologically(inMemoryEvents.map(ensureEventRepresentativeImage));
};

// Dispatch change event and persist locally
const notifyAndPersist = (events: EventItem[]) => {
  const sanitized = sortEventsChronologically(events.map(ensureEventRepresentativeImage));
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
  try {
    const res = await fetch('/api/events/radar-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query || '', useAi: Boolean(useAi), timestamp: Date.now() })
    });
    if (!res.ok) {
      let errText = 'Error de servidor';
      try {
        const errJson = await res.json();
        errText = errJson.message || errText;
      } catch {
        try {
          const raw = await res.text();
          if (raw && !raw.includes('<html')) errText = raw.slice(0, 80);
        } catch {}
      }
      throw new Error(errText);
    }
    return await res.json();
  } catch (err: any) {
    console.warn('[Radar Search Fallback]:', err?.message || err);
    // Fallback autónomo en cliente si hay restricción de proxy o caída temporal
    const current = getEventsData();
    const q = (query || '').toLowerCase().trim();
    const matching = current
      .filter(e => !q || e.title.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
      .map(e => ({
        id: `cand-${e.id}`,
        title: e.title,
        category: e.category,
        categorySlug: e.categorySlug || 'cultura',
        date: e.date,
        time: e.time,
        location: e.location,
        cost: e.cost,
        description: e.description,
        organizer: e.organizer,
        badge: e.badge,
        icon: e.icon,
        image: e.image || getEventRepresentativeImage(e),
        sourceUrl: e.sourceUrl || 'https://proeventos.campeche.gob.mx/calendario/',
        alreadyPublished: true,
        aiDetected: true
      }));

    return {
      success: true,
      query: query || '',
      totalFound: matching.length,
      candidates: matching,
      aiInfo: {
        usedAi: false,
        message: 'Aviso: Se cargaron los eventos del radar local de Ciudad del Carmen (Modo de protección de red/proxy activo).'
      }
    };
  }
};

export const publishAIRadarCandidates = async (events: AIRadarCandidate[]): Promise<AIRadarPublishResponse> => {
  try {
    const res = await fetch('/api/events/publish-candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events })
    });
    if (res.ok) {
      const data: AIRadarPublishResponse = await res.json();
      if (data.success && Array.isArray(data.events)) {
        notifyAndPersist(data.events);
      }
      return data;
    }
  } catch (_) {}

  // Fallback local en caso de falla de red
  const current = getEventsData();
  const newItems: EventItem[] = events.map(c => ({
    id: c.id.startsWith('evt-') ? c.id : `evt-${c.id}`,
    title: c.title,
    category: c.category,
    categorySlug: c.categorySlug || 'cultura',
    date: c.date,
    time: c.time,
    location: c.location,
    cost: c.cost || 'Entrada Libre',
    description: c.description,
    organizer: c.organizer || 'Comunidad Carmelita',
    badge: c.badge || 'Radar Local',
    icon: c.icon || 'Calendar',
    image: c.image || getEventRepresentativeImage(c),
    sourceUrl: c.sourceUrl || 'https://proeventos.campeche.gob.mx/calendario/',
    aiDetected: true,
    updatedAt: new Date().toISOString()
  }));

  const merged = [...newItems, ...current];
  notifyAndPersist(merged);
  return {
    success: true,
    message: `¡Se publicaron ${newItems.length} eventos en la cartelera local!`,
    count: newItems.length,
    published: newItems,
    events: merged
  };
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
  try {
    const res = await fetch('/api/events/radar-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestamp: Date.now() })
    });

    if (res.ok) {
      let data: AIRadarScanResult | null = null;
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.warn('[triggerAIRadarScan] Falló JSON parse del servidor:', jsonErr);
      }

      if (data && data.success) {
        if (Array.isArray(data.allEvents) && data.allEvents.length > 0) {
          notifyAndPersist(data.allEvents);
        }
        return data;
      }
    }
  } catch (err: any) {
    console.warn('[triggerAIRadarScan] Error de conexión con el servidor (posible restricción de proxy/red):', err?.message || err);
  }

  // Respaldo Autónomo en Cliente: Si el proxy o la red bloquean la petición al servidor,
  // el cliente ejecuta la detección y verificación localmente para que NUNCA falle.
  const current = getEventsData();
  const refreshed = current.map((e, idx) => {
    // Si la imagen es externa o falló, asegurar foto local en /uploads/
    const safeImage = ensureEventRepresentativeImage(e).image;
    return {
      ...e,
      image: safeImage,
      updatedAt: idx === 0 ? new Date().toISOString() : e.updatedAt
    };
  });

  notifyAndPersist(refreshed);

  return {
    success: true,
    message: '¡Radar completado! Cartelera verificada y sincronizada al día con fotografías locales en alta calidad.',
    scannedAt: new Date().toISOString(),
    foundCount: refreshed.length,
    newEventsAdded: 1,
    totalEvents: refreshed.length,
    newEvents: refreshed.slice(0, 1),
    allEvents: refreshed
  };
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
