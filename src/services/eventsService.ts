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

// Helper to load cached data from localStorage or empty
const loadLocalInitial = (): EventItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(ensureEventRepresentativeImage);
      }
    }
  } catch (e) {
    console.error('Error reading events from localStorage:', e);
  }
  return [];
};

inMemoryEvents = loadLocalInitial();

// Synchronous getter for immediate render
export const getEventsData = (): EventItem[] => {
  return inMemoryEvents.map(ensureEventRepresentativeImage);
};

// Dispatch change event and persist locally
const notifyAndPersist = (events: EventItem[]) => {
  const sanitized = events.map(ensureEventRepresentativeImage);
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
      if (data.success && Array.isArray(data.events)) {
        notifyAndPersist(data.events);
        return data.events;
      }
    }
  } catch (err) {
    console.warn('Could not fetch events from /api/events:', err);
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
    body: JSON.stringify({ query: query || '', useAi: Boolean(useAi) })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error de servidor' }));
    throw new Error(err.message || 'Error al buscar eventos con Radar IA');
  }
  return await res.json();
};

export const publishAIRadarCandidates = async (events: AIRadarCandidate[]): Promise<AIRadarPublishResponse> => {
  const res = await fetch('/api/events/publish-candidates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error al publicar eventos' }));
    throw new Error(err.message || 'Error al publicar eventos');
  }
  const data: AIRadarPublishResponse = await res.json();
  if (data.success && Array.isArray(data.events)) {
    notifyAndPersist(data.events);
  }
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
    headers: { 'Content-Type': 'application/json' }
  });
  const data: AIRadarScanResult = await res.json();
  if (data.success && Array.isArray(data.allEvents)) {
    notifyAndPersist(data.allEvents);
  }
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
