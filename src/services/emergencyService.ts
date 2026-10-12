import DEFAULT_EMERGENCY_SERVICES from '../data/emergency_guide_carmen.json';

export interface EmergencyServiceItem {
  id: string;
  name: string;
  category: string;
  phone: string;
  whatsapp?: string;
  address: string;
  schedule: string;
  description: string;
  icon: string;
  badge: string;
  isUrgent?: boolean;
}

const STORAGE_KEY = 'carmen_emergency_services_v2';

let inMemoryServices: EmergencyServiceItem[] = [];

export const getEmergencyServices = (): EmergencyServiceItem[] => {
  if (inMemoryServices.length > 0) return inMemoryServices;
  if (typeof window === 'undefined') return DEFAULT_EMERGENCY_SERVICES as EmergencyServiceItem[];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      inMemoryServices = DEFAULT_EMERGENCY_SERVICES as EmergencyServiceItem[];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_EMERGENCY_SERVICES));
      return inMemoryServices;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      inMemoryServices = parsed;
      return parsed;
    }
    inMemoryServices = DEFAULT_EMERGENCY_SERVICES as EmergencyServiceItem[];
    return inMemoryServices;
  } catch (e) {
    console.error('Error reading emergency services from localStorage:', e);
    return DEFAULT_EMERGENCY_SERVICES as EmergencyServiceItem[];
  }
};

export const fetchEmergencyServicesFromAPI = async (): Promise<EmergencyServiceItem[]> => {
  try {
    const res = await fetch('/api/emergency');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.services) && data.services.length > 0) {
        inMemoryServices = data.services;
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.services));
          window.dispatchEvent(new CustomEvent('emergency-guide-updated'));
        }
        return data.services;
      }
    }
  } catch (err) {
    console.warn('Could not fetch emergency services from API:', err);
  }
  return getEmergencyServices();
};

// Initial sync on startup
if (typeof window !== 'undefined') {
  setTimeout(() => {
    fetchEmergencyServicesFromAPI().catch(() => {});
  }, 200);
}

export const saveEmergencyServices = (services: EmergencyServiceItem[], syncBackend = true): void => {
  inMemoryServices = services;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
    window.dispatchEvent(new CustomEvent('emergency-guide-updated'));
  } catch (e) {
    console.error('Error saving emergency services to localStorage:', e);
  }
};

export const addEmergencyService = (item: Omit<EmergencyServiceItem, 'id'>): EmergencyServiceItem => {
  const current = getEmergencyServices();
  const newItem: EmergencyServiceItem = {
    ...item,
    id: 'em-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)
  };
  const updated = [newItem, ...current];
  saveEmergencyServices(updated);

  // Sync to database
  fetch('/api/emergency', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newItem)
  }).catch(e => console.warn('Error syncing emergency service to API:', e));

  return newItem;
};

export const updateEmergencyService = (id: string, updates: Partial<EmergencyServiceItem>): boolean => {
  const current = getEmergencyServices();
  const idx = current.findIndex(s => s.id === id);
  if (idx === -1) return false;
  const updatedItem = { ...current[idx], ...updates };
  current[idx] = updatedItem;
  saveEmergencyServices([...current]);

  // Sync to database
  fetch('/api/emergency', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedItem)
  }).catch(e => console.warn('Error updating emergency service in API:', e));

  return true;
};

export const deleteEmergencyService = (id: string): boolean => {
  const current = getEmergencyServices();
  const filtered = current.filter(s => s.id !== id);
  if (filtered.length === current.length) return false;
  saveEmergencyServices(filtered);

  // Sync to database
  fetch(`/api/emergency/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  }).catch(e => console.warn('Error deleting emergency service in API:', e));

  return true;
};

export const resetEmergencyServicesToDefault = (): EmergencyServiceItem[] => {
  if (typeof window !== 'undefined') {
    inMemoryServices = DEFAULT_EMERGENCY_SERVICES as EmergencyServiceItem[];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_EMERGENCY_SERVICES));
    window.dispatchEvent(new CustomEvent('emergency-guide-updated'));
  }
  return DEFAULT_EMERGENCY_SERVICES as EmergencyServiceItem[];
};
