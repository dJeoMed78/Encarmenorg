import seedBusinesses from '../data/businesses_seed.json';
import { Business, Category, DirectoryStats, WpHealth, AutoBusinessCandidate } from '../types';
import seedCategories from '../data/categories_seed.json';

const API_BASE = '/api';

export async function parseJsonResponse<T>(res: Response, fallbackErrorMsg: string): Promise<T> {
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    return data as T;
  } catch (_parseErr) {
    if (!res.ok) {
      throw new Error(`El servidor respondió con código HTTP ${res.status}.`);
    }
    const cleanSnippet = text.replace(/<[^>]*>?/gm, '').trim().slice(0, 120);
    throw new Error(cleanSnippet ? `Respuesta no válida del servidor: "${cleanSnippet}"` : fallbackErrorMsg);
  }
}

export async function fetchBusinesses(params: {
  q?: string;
  category?: string;
  subcategory?: string;
  colonia?: string;
  hasWhatsapp?: boolean;
  hasDelivery?: boolean;
  hasPhone?: boolean;
  hasAddress?: boolean;
}): Promise<{ total: number; businesses: Business[] }> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.category && params.category !== 'all') query.set('category', params.category);
  if (params.subcategory) query.set('subcategory', params.subcategory);
  if (params.colonia && params.colonia !== 'todas') query.set('colonia', params.colonia);
  if (params.hasWhatsapp) query.set('hasWhatsapp', 'true');
  if (params.hasDelivery) query.set('hasDelivery', 'true');
  if (params.hasPhone) query.set('hasPhone', 'true');
  if (params.hasAddress) query.set('hasAddress', 'true');
  query.set('_t', String(Date.now()));

  try {
    const res = await fetch(`${API_BASE}/businesses?${query.toString()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      total: data.total,
      businesses: data.businesses
    };
  } catch (err) {
    // Never substitute historical contacts for the current database response.
    throw err;
  }
}

export async function fetchCategories(): Promise<{
  total: number;
  topCategories: (Category & { subcategories?: Category[] })[];
  allCategories: Category[];
}> {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Categories API fetch failed, fallback to local seed:', err);
    const all = seedCategories as Category[];
    const parents = all.filter(c => c.parent === 0);
    const top = parents.map(p => ({
      ...p,
      subcategories: all.filter(c => c.parent === p.id)
    }));
    return {
      total: all.length,
      topCategories: top,
      allCategories: all
    };
  }
}

export async function fetchStats(): Promise<DirectoryStats> {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    const list = seedBusinesses as unknown as Business[];
    return {
      totalBusinesses: list.length,
      totalCategories: (seedCategories as Category[]).length,
      withWhatsapp: list.filter(b => Boolean(b.whatsapp)).length,
      withPhone: list.filter(b => Boolean(b.phone)).length,
      withAddress: list.filter(b => Boolean(b.address && b.address.length > 5)).length,
      withDelivery: list.filter(b => Boolean(b.delivery && !b.delivery.toLowerCase().includes('no'))).length,
      lastSyncTimestamp: new Date().toISOString(),
      lastSyncStatus: 'success',
      wpSiteUrl: typeof window !== 'undefined' ? window.location.origin : 'https://empresasencarmen.com'
    };
  }
}

export async function syncWordPress(): Promise<{
  success: boolean;
  message: string;
  count?: number;
  newCount?: number;
  pushedToWpCount?: number;
  categoriesCount?: number;
  timestamp?: string;
}> {
  const res = await fetch(`${API_BASE}/sync`, {
    method: 'POST'
  });
  return await res.json();
}

export async function syncSingleBusinessToWordPress(id: number): Promise<{
  success: boolean;
  message: string;
  permalink?: string;
  wpId?: number;
}> {
  try {
    const res = await fetch(`${API_BASE}/businesses/${id}/sync-wp`, {
      method: 'POST'
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function checkWpHealth(): Promise<WpHealth> {
  try {
    const res = await fetch(`${API_BASE}/health-wp`);
    return await res.json();
  } catch (err: any) {
    return {
      connected: false,
      status: 'unreachable',
      error: err.message,
      siteUrl: typeof window !== 'undefined' ? window.location.origin : 'https://empresasencarmen.com'
    };
  }
}

export async function uploadBusinessLogo(imageBase64: string, filename?: string): Promise<{
  success: boolean;
  url?: string;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/upload-logo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imageBase64, filename })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Error del servidor HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    // If backend endpoint is unavailable, return dataURI as client-side image so user never gets blocked
    return {
      success: true,
      url: imageBase64,
      message: 'Imagen cargada en el navegador'
    };
  }
}

export const uploadImage = uploadBusinessLogo;

export async function checkBusinessDuplicate(name: string, phone?: string): Promise<{
  isDuplicate: boolean;
  reason?: 'name' | 'phone' | 'match';
  existingBusiness?: {
    id: number;
    name: string;
    category: string;
    phone: string;
    whatsapp: string;
    address: string;
    colonia: string;
    image: string | null;
    permalink: string;
  };
}> {
  try {
    const params = new URLSearchParams();
    if (name) params.append('name', name);
    if (phone) params.append('phone', phone);
    const res = await fetch(`${API_BASE}/check-duplicate?${params.toString()}`);
    if (!res.ok) return { isDuplicate: false };
    return await res.json();
  } catch {
    return { isDuplicate: false };
  }
}

export async function submitBusinessRegistration(data: import('../types').BusinessSubmission): Promise<{
  success: boolean;
  message: string;
  isDuplicate?: boolean;
  existingBusiness?: import('../types').Business;
  submission?: import('../types').BusinessSubmission;
  business?: import('../types').Business;
  publishedToWordPress?: boolean;
  wpPermalink?: string | null;
  wpProductId?: number | null;
}> {
  try {
    const res = await fetch(`${API_BASE}/submit-business`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const resData = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 409 && resData.isDuplicate) {
        return {
          success: false,
          isDuplicate: true,
          existingBusiness: resData.existingBusiness,
          message: resData.message || 'Ya existe un negocio registrado con este nombre o teléfono.'
        };
      }
      throw new Error(resData.message || `Error del servidor HTTP ${res.status}`);
    }
    return resData;
  } catch (err: any) {
    if (err.message && err.message.includes('Ya existe un negocio')) {
      return {
        success: false,
        message: err.message
      };
    }
    // Local fallback persistence in localStorage
    try {
      const stored = localStorage.getItem('empresas_local_submissions') || '[]';
      const parsed = JSON.parse(stored);
      const newSubmission = {
        ...data,
        id: `local-${Date.now()}`,
        createdAt: new Date().toISOString(),
        status: 'pending' as const
      };
      parsed.unshift(newSubmission);
      localStorage.setItem('empresas_local_submissions', JSON.stringify(parsed));
      return {
        success: true,
        message: '¡Registro recibido con éxito! Tus datos se han guardado para revisión.',
        submission: newSubmission
      };
    } catch (saveErr) {
      return {
        success: false,
        message: err.message || 'Error al enviar registro'
      };
    }
  }
}

// Reports & Admin Management Functions
export async function sendClassifiedReport(data: {
  classifiedId: string;
  classifiedTitle: string;
  requesterName?: string;
  requesterContact?: string;
  reason: "owner_lost_access" | "sold" | "spam_inappropriate" | "wrong_info";
  comment?: string;
}): Promise<{ success: boolean; message: string; report?: import("../types").BusinessReport }> {
  try {
    const res = await fetch(`${API_BASE}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "classified",
        ...data
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    try {
      const stored = localStorage.getItem("business_reports") || "[]";
      const parsed = JSON.parse(stored);
      const newRep: import("../types").BusinessReport = {
        id: `rep-${Date.now()}`,
        type: "classified",
        classifiedId: data.classifiedId,
        classifiedTitle: data.classifiedTitle,
        businessName: data.classifiedTitle,
        requesterName: data.requesterName,
        requesterContact: data.requesterContact,
        reason: data.reason,
        comment: data.comment,
        date: new Date().toISOString(),
        status: "pending"
      };
      parsed.unshift(newRep);
      localStorage.setItem("business_reports", JSON.stringify(parsed));
      return { success: true, message: "Solicitud enviada al administrador", report: newRep };
    } catch {
      return { success: false, message: "No se pudo enviar la solicitud" };
    }
  }
}

export async function sendBusinessReport(data: {
  businessId?: number;
  businessName?: string;
  businessPhone?: string;
  businessWhatsapp?: string;
  reason: string;
  details?: string;
  comment?: string;
}): Promise<{ success: boolean; message: string; report?: import('../types').BusinessReport }> {
  try {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    // Fallback local storage
    try {
      const stored = localStorage.getItem('business_reports') || '[]';
      const parsed = JSON.parse(stored);
      const newRep: import('../types').BusinessReport = {
        id: `rep-${Date.now()}`,
        businessId: data.businessId,
        businessName: data.businessName,
        reason: data.reason,
        details: data.details || data.comment,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };
      parsed.unshift(newRep);
      localStorage.setItem('business_reports', JSON.stringify(parsed));
      return { success: true, message: 'Reporte guardado', report: newRep };
    } catch {
      return { success: false, message: 'No se pudo guardar el reporte' };
    }
  }
}

export const reportBusinessIssue = sendBusinessReport;

export async function fetchReports(): Promise<{ total: number; reports: import('../types').BusinessReport[] }> {
  try {
    const res = await fetch(`${API_BASE}/reports`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    const stored = localStorage.getItem('business_reports') || '[]';
    try {
      const parsed = JSON.parse(stored);
      return { total: parsed.length, reports: parsed };
    } catch {
      return { total: 0, reports: [] };
    }
  }
}

export async function updateReportStatus(id: string, status: 'resolved' | 'dismissed'): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteReport(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/reports/${id}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function adminUpdateBusiness(id: number, data: Partial<import('../types').Business> & { clearContacts?: ('phone' | 'whatsapp')[] }): Promise<{ success: boolean; message: string; business?: import('../types').Business }> {
  try {
    const res = await fetch(`${API_BASE}/businesses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(sessionStorage.getItem('encarmen_admin_session_token') ? { 'X-Encarmen-Admin-Token': sessionStorage.getItem('encarmen_admin_session_token')! } : {}) },
      body: JSON.stringify(data)
    });
    const parsed = await parseJsonResponse<{success:boolean;message:string;business?:Business}>(res, 'Error al actualizar negocio');
    if (!res.ok) return {success:false, message:parsed.message || `HTTP ${res.status}`};
    return parsed;
  } catch (err: any) {
    return { success: false, message: err.message || 'Error al actualizar negocio' };
  }
}

export async function adminDeleteBusiness(id: number): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/businesses/${id}`, {
      method: 'DELETE'
    });
    return await parseJsonResponse(res, 'Error al dar de baja el negocio');
  } catch (err: any) {
    return { success: false, message: err.message || 'Error al dar de baja el negocio' };
  }
}

let lastVisitTrackTime = 0;

export async function trackAnalyticsEvent(params: {
  type: 'visit' | 'view' | 'whatsapp' | 'call' | 'maps' | 'search';
  businessId?: number;
  businessName?: string;
  searchTerm?: string;
  isAdmin?: boolean;
}): Promise<void> {
  try {
    // Avoid double counting same-session immediate re-renders for 'visit'
    if (params.type === 'visit') {
      const now = Date.now();
      if (now - lastVisitTrackTime < 10000) {
        return;
      }
      lastVisitTrackTime = now;
    }

    const { getVisitorInfo } = await import('../utils/visitorTracker');
    const info = getVisitorInfo();
    const isAdmin = Boolean(localStorage.getItem('encarmen_admin_auth') || params.isAdmin);

    await fetch(`${API_BASE}/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        visitorId: info.visitorId,
        sessionId: info.sessionId,
        device: info.device,
        browser: info.browser,
        os: info.os,
        referrerSource: info.referrerSource,
        isNewVisitor: info.isNewVisitor,
        isAdmin
      }),
      keepalive: true
    });
  } catch {
    // Non-blocking
  }
}

export async function fetchAnalytics(excludeAdmin = false): Promise<import('../types').SiteAnalytics> {
  try {
    const url = `${API_BASE}/analytics${excludeAdmin ? '?excludeAdmin=true' : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      pageViews: 0,
      whatsappClicks: 0,
      callClicks: 0,
      uniqueVisitors: 0,
      totalVisits: 0,
      totalUniqueVisitors: 0,
      totalBusinessViews: 0,
      totalWhatsappClicks: 0,
      totalPhoneClicks: 0,
      totalMapsClicks: 0,
      totalInteractions: 0,
      today: { uniqueVisitors: 0, totalVisits: 0, pageViews: 0, whatsappClicks: 0, phoneClicks: 0 },
      yesterday: { uniqueVisitors: 0, totalVisits: 0, pageViews: 0, whatsappClicks: 0, phoneClicks: 0 },
      last7Days: { uniqueVisitors: 0, totalVisits: 0, chart: [] },
      last30Days: { uniqueVisitors: 0, totalVisits: 0 },
      devices: { mobile: 0, desktop: 0, tablet: 0, mobilePercent: 0, desktopPercent: 0 },
      operatingSystems: [],
      browsers: [],
      peakHours: { madrugada: 0, manana: 0, tarde: 0, noche: 0 },
      topSearches: [],
      topBusinesses: [],
      recentEvents: []
    };
  }
}


// ==========================================


// ==========================================
// CLASSIFIEDS API CLIENT SERVICES
// ==========================================
export async function fetchNewestBusinesses(): Promise<{
  success: boolean;
  count: number;
  businesses: {
    id: number;
    name: string;
    slug?: string;
    date_created?: string;
    image: string;
    categories?: string[];
  }[];
}> {
  try {
    const res = await fetch(API_BASE + '/newest-businesses');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (err) {
    return { success: false, count: 0, businesses: [] };
  }
}

export async function fetchClassifieds(params: {
  category?: string;
  subcategory?: string;
  q?: string;
  colonia?: string;
  status?: string;
  priceType?: string;
  allStatus?: boolean;
} = {}): Promise<{ total: number; classifieds: import('../types').ClassifiedAd[] }> {
  try {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'all') query.set('category', params.category);
    if (params.subcategory) query.set('subcategory', params.subcategory);
    if (params.q) query.set('q', params.q);
    if (params.colonia && params.colonia !== 'todas') query.set('colonia', params.colonia);
    if (params.status) query.set('status', params.status);
    if (params.priceType) query.set('priceType', params.priceType);
    if (params.allStatus) query.set('allStatus', 'true');

    const res = await fetch(API_BASE + '/classifieds?' + query.toString());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (err) {
    return { total: 0, classifieds: [] };
  }
}

export async function createClassified(ad: Partial<import('../types').ClassifiedAd>): Promise<{
  success: boolean;
  message: string;
  classified?: import('../types').ClassifiedAd;
}> {
  const res = await fetch(API_BASE + '/classifieds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ad)
  });
  return await res.json();
}

export async function updateClassified(id: string, updates: Partial<import('../types').ClassifiedAd>): Promise<{
  success: boolean;
  message: string;
  classified?: import('../types').ClassifiedAd;
}> {
  const res = await fetch(API_BASE + '/classifieds/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return await res.json();
}

export async function deleteClassified(id: string): Promise<{
  success: boolean;
  message: string;
}> {
  const res = await fetch(API_BASE + '/classifieds/' + id, {
    method: 'DELETE'
  });
  return await res.json();
}

export async function searchClassifiedRadarCandidates(
  query: string = '',
  category: string = 'all',
  useAi: boolean = true
): Promise<{
  success: boolean;
  candidates: import('../types').ClassifiedAd[];
  aiInfo?: {
    usedAi: boolean;
    quotaExhausted?: boolean;
    message?: string;
  };
  message?: string;
}> {
  try {
    const res = await fetch(API_BASE + '/classifieds/radar-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, category, useAi: true, timestamp: Date.now() })
    });
    if (res.ok) {
      return await res.json();
    }
    return {
      success: false,
      candidates: [],
      message: 'Error al consultar el radar en vivo.'
    };
  } catch (err: any) {
    return {
      success: false,
      candidates: [],
      message: err?.message || 'Error de conexión con el radar.'
    };
  }
}

export async function approveClassifiedCandidate(candidate: Partial<import('../types').ClassifiedAd>): Promise<{
  success: boolean;
  message: string;
  classified?: import('../types').ClassifiedAd;
}> {
  try {
    const res = await fetch(API_BASE + '/classifieds/approve-candidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate })
    });
    return await parseJsonResponse(res, 'Error al aprobar anuncio');
  } catch (err: any) {
    return { success: false, message: err.message || 'Error al aprobar anuncio' };
  }
}

export async function batchApproveClassifiedCandidates(candidates: Partial<import('../types').ClassifiedAd>[]): Promise<{
  success: boolean;
  message: string;
  count?: number;
}> {
  try {
    const res = await fetch(API_BASE + '/classifieds/batch-approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidates })
    });
    return await parseJsonResponse(res, 'Error al aprobar anuncios por lote');
  } catch (err: any) {
    return { success: false, message: err.message || 'Error al aprobar anuncios por lote' };
  }
}

// ==========================================
// MODO MANTENIMIENTO / DESACTIVACIÓN DEL PORTAL
// ==========================================
export interface MaintenanceModeConfig {
  enabled: boolean;
  title: string;
  message: string;
  bannerUrl?: string;
  estimatedReturn?: string;
  updatedAt?: string;
}

export async function getMaintenanceMode(): Promise<{
  success: boolean;
  maintenance: MaintenanceModeConfig;
}> {
  try {
    const res = await fetch(`${API_BASE}/maintenance?_t=${Date.now()}`, {
      cache: 'no-store'
    });
    return await parseJsonResponse(res, 'No se pudo obtener el estado de mantenimiento.');
  } catch (_err: any) {
    return {
      success: true,
      maintenance: {
        enabled: false,
        title: 'Portal Temporalmente en Mantenimiento',
        message: 'Estamos realizando mejoras técnicas en el portal.',
        bannerUrl: '/images/banner-empresas-en-carmen.png'
      }
    };
  }
}

export async function updateMaintenanceMode(config: Partial<MaintenanceModeConfig>): Promise<{
  success: boolean;
  message: string;
  maintenance?: MaintenanceModeConfig;
}> {
  try {
    const res = await fetch(`${API_BASE}/admin/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return await parseJsonResponse(res, 'Error al actualizar estado de mantenimiento');
  } catch (err: any) {
    return { success: false, message: err.message || 'Error de conexión con el servidor.' };
  }
}



export interface ExtractedBusinessAI {
  name: string;
  category: string;
  description: string;
  phone: string;
  whatsapp: string;
  address: string;
  colonia: string;
  schedule: string;
  payment: string;
  delivery: string;
  facebook: string;
  website: string;
  image?: string;
  hasUploadedOriginal?: boolean;
  imageAlternatives?: { label: string; url: string }[];
  detectedPromotions?: string[];
  confidence?: string;
}

export async function fetchImageUrlAsBase64(url: string): Promise<{
  success: boolean;
  imageBase64?: string;
  mimeType?: string;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/ai/fetch-image-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Error al descargar la imagen arrastrada'
    };
  }
}

export function getSafeImageUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  // If it was already encoded as an image-proxy, decode the original URL
  if (trimmed.includes('/api/image-proxy?url=')) {
    try {
      const match = trimmed.match(/url=([^&]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {
      // fallback
    }
  }
  return trimmed;
}

// ==========================================
// PROMOTIONS & FLASH COUPONS API
// ==========================================

import seedPromotions from '../data/promotions_seed.json';

export async function getPromotions(): Promise<{ success: boolean; count: number; promotions: import('../types').Promotion[] }> {
  try {
    const res = await fetch(`${API_BASE}/promotions`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.promotions) && data.promotions.length > 0) {
        return data;
      }
    }
  } catch (err: any) {
    console.warn('Error fetching promotions from /api/promotions:', err);
  }
  return { success: true, count: seedPromotions.length, promotions: seedPromotions as any };
}

export async function getBusinessPromotion(businessId: number): Promise<{ success: boolean; promotion: import('../types').Promotion | null }> {
  try {
    const res = await fetch(`${API_BASE}/promotions/business/${businessId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    console.error('Error fetching business promotion:', err);
    return { success: false, promotion: null };
  }
}

export async function claimPromotionCoupon(
  promotionId: string,
  customerName: string,
  customerPhone: string
): Promise<{
  success: boolean;
  message: string;
  coupon?: import('../types').ClaimedCoupon;
  remainingCoupons?: number;
  error?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/promotions/${encodeURIComponent(promotionId)}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName, customerPhone })
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        message: data.error || data.message || 'No fue posible reclamar el cupón.',
        error: data.error
      };
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Error de conexión al reclamar el cupón.'
    };
  }
}

export async function getAdminPromotions(): Promise<{
  success: boolean;
  count: number;
  promotions: import('../types').Promotion[];
  adminAlertEmails: string[];
}> {
  try {
    const res = await fetch(`${API_BASE}/admin/promotions`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.promotions) && data.promotions.length > 0) {
        return data;
      }
    }
  } catch (err: any) {
    console.warn('Error fetching admin promotions:', err);
  }
  return { success: true, count: seedPromotions.length, promotions: seedPromotions as any, adminAlertEmails: [] };
}

export async function saveAdminPromotion(promoData: any): Promise<{
  success: boolean;
  message: string;
  promotion?: import('../types').Promotion;
  error?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/admin/promotions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(promoData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al guardar promoción');
    return data;
  } catch (err: any) {
    return { success: false, message: err.message, error: err.message };
  }
}

export async function deleteAdminPromotion(promoId: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/promotions/${encodeURIComponent(promoId)}`, {
      method: 'DELETE'
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function getAdminCoupons(): Promise<{
  success: boolean;
  count: number;
  coupons: import('../types').ClaimedCoupon[];
  notifications: any[];
  adminAlertEmails: string[];
}> {
  try {
    const res = await fetch(`${API_BASE}/admin/coupons`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    return { success: false, count: 0, coupons: [], notifications: [], adminAlertEmails: [] };
  }
}

export async function updateCouponStatus(couponId: string, status: 'active' | 'redeemed' | 'cancelled'): Promise<{
  success: boolean;
  message: string;
  coupon?: import('../types').ClaimedCoupon;
}> {
  try {
    const res = await fetch(`${API_BASE}/admin/coupons/${encodeURIComponent(couponId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

// ==========================================
// BUSINESS OWNER 10-DIGIT TEMPORARY EDIT PINS
// ==========================================

export interface BusinessEditPinInfo {
  pin: string;
  expiresAt: number;
  remainingMinutes: number;
}

export async function fetchBusinessEditPins(): Promise<{
  success: boolean;
  pins: Record<number, BusinessEditPinInfo>;
}> {
  try {
    const res = await fetch(`${API_BASE}/admin/businesses-edit-pins`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    return { success: false, pins: {} };
  }
}

export async function generateBusinessEditPin(bizId: number): Promise<{
  success: boolean;
  pin?: string;
  expiresAt?: number;
  remainingMinutes?: number;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/admin/businesses/${bizId}/generate-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, message: data.message || `Error ${res.status}: No se pudo generar el PIN` };
    }
    return data;
  } catch (err: any) {
    return { success: false, message: err.message || 'Error de conexión al generar código' };
  }
}

export async function verifyBusinessEditPin(bizId: number, pin: string): Promise<{
  success: boolean;
  valid?: boolean;
  expiresAt?: number;
  remainingMinutes?: number;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/businesses/${bizId}/verify-edit-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || 'Error al verificar código' };
  }
}

export async function ownerUpdateBusiness(
  id: number,
  data: Partial<import('../types').Business>,
  editPin: string
): Promise<{ success: boolean; message: string; business?: import('../types').Business }> {
  try {
    const res = await fetch(`${API_BASE}/businesses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, editPin })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || 'Error al guardar cambios' };
  }
}

// =========================================================================
// BÚSQUEDA AUTOMÁTICA DE EMPRESAS (SIN IA)
// =========================================================================

export async function fetchAutoBusinessCandidates(
  query?: string,
  category?: string,
  source?: string
): Promise<{ success: boolean; candidates: AutoBusinessCandidate[]; totalFound: number; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/businesses/auto-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query || '', category: category || 'all', source: source || 'all' })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Error del servidor' }));
      throw new Error(err.message || 'Error al buscar empresas');
    }
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      candidates: [],
      totalFound: 0,
      message: err.message || 'Error de conexión con el radar de empresas'
    };
  }
}

export async function autoSearchBusinessesWithAi(
  query?: string,
  category?: string
): Promise<{ success: boolean; candidates: AutoBusinessCandidate[]; totalFound: number; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/businesses/auto-search-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query || '', category: category || 'all', count: 30 })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Error del servidor' }));
      throw new Error(err.message || 'Error al buscar empresas con IA');
    }
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      candidates: [],
      totalFound: 0,
      message: err.message || 'Error al conectar con la búsqueda por IA'
    };
  }
}

export async function parseWhatsAppGroupBusinesses(
  rawText: string,
  groupName?: string,
  sourceUrl?: string
): Promise<{ success: boolean; count: number; candidates: AutoBusinessCandidate[]; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/businesses/parse-whatsapp-group`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText, groupName, sourceUrl })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Error al procesar texto de WhatsApp');
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      candidates: [],
      message: err.message || 'Error de comunicación al extraer mensajes de WhatsApp'
    };
  }
}

export async function approveAutoBusinessCandidate(
  candidate: AutoBusinessCandidate
): Promise<{ success: boolean; message: string; business?: Business; wpSynced?: boolean; wpPermalink?: string }> {
  try {
    const res = await fetch(`${API_BASE}/businesses/approve-candidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Error al aprobar negocio');
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Error al aprobar la empresa'
    };
  }
}

export async function approveMultipleAutoBusinessCandidates(
  candidates: AutoBusinessCandidate[]
): Promise<{ success: boolean; message: string; count?: number; published?: Business[] }> {
  try {
    const res = await fetch(`${API_BASE}/businesses/approve-multiple-candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidates })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Error al aprobar los negocios');
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Error en publicación por lotes'
    };
  }
}

export interface BusinessRatingStats {
  average: number;
  count: number;
  distribution?: Record<number, number>;
  hasRated?: boolean;
  userRating?: number | null;
}

export class RatingApiError extends Error {
  constructor(message: string, public status: number = 0) {
    super(message);
    this.name = 'RatingApiError';
  }
}

// Reject malformed responses rather than turning missing data into invented votes.
export function parseRatingStats(value: unknown): BusinessRatingStats {
  const data = value as BusinessRatingStats | null;
  if (!data || typeof data.average !== 'number' || !Number.isFinite(data.average) ||
      !Number.isSafeInteger(data.count) || data.count < 0 ||
      (data.count === 0 ? data.average !== 0 : data.average < 1 || data.average > 5)) {
    throw new RatingApiError('Respuesta de calificaciones inválida.');
  }
  return { average: data.average, count: data.count, distribution: data.distribution };
}

async function ratingResponse(res: Response): Promise<any> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new RatingApiError(
      typeof data?.message === 'string' ? data.message : `No fue posible consultar o guardar la calificación (HTTP ${res.status}).`,
      res.status
    );
  }
  if (!data || typeof data !== 'object') throw new RatingApiError('Respuesta de calificaciones inválida.');
  return data;
}

export async function fetchAllBusinessRatings(): Promise<Record<string, BusinessRatingStats>> {
  const data = await ratingResponse(await fetch(`${API_BASE}/ratings`, { cache: 'no-store' }));
  if (!data.stats || typeof data.stats !== 'object' || Array.isArray(data.stats)) {
    throw new RatingApiError('Respuesta de calificaciones inválida.');
  }
  const stats: Record<string, BusinessRatingStats> = Object.create(null);
  for (const [id, value] of Object.entries(data.stats)) stats[id] = parseRatingStats(value);
  return stats;
}

export async function fetchBusinessRating(
  businessId: number | string,
  visitorId?: string
): Promise<BusinessRatingStats> {
  const q = visitorId ? `?visitorId=${encodeURIComponent(visitorId)}` : '';
  const data = await ratingResponse(await fetch(`${API_BASE}/ratings/${encodeURIComponent(String(businessId))}${q}`, { cache: 'no-store' }));
  const stats = parseRatingStats(data);
  if (typeof data.hasRated !== 'boolean' ||
      (data.hasRated ? stats.count < 1 || !Number.isInteger(data.userRating) || data.userRating < 1 || data.userRating > 5 : data.userRating !== null)) {
    throw new RatingApiError('Respuesta de voto personal inválida.');
  }
  return { ...stats, hasRated: data.hasRated, userRating: data.userRating };
}

export async function submitBusinessRating(params: {
  businessId: number | string;
  rating: number;
  visitorId: string;
  comment?: string;
}): Promise<{ success: boolean; message: string; rating: number; reviewCount: number; stats: BusinessRatingStats }> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(String(params.businessId)) ||
      !Number.isInteger(params.rating) || params.rating < 1 || params.rating > 5 ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(params.visitorId)) {
    throw new RatingApiError('Datos de calificación inválidos.', 400);
  }
  const data = await ratingResponse(await fetch(`${API_BASE}/ratings`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params)
  }));
  if (data.success !== true) throw new RatingApiError('El servidor no confirmó la calificación.');
  const stats = parseRatingStats(data.stats);
  if (stats.count < 1 || data.rating !== stats.average || data.reviewCount !== stats.count) {
    throw new RatingApiError('El servidor devolvió agregados de calificación inconsistentes.');
  }
  return { success: true, message: 'Calificación guardada.', rating: stats.average, reviewCount: stats.count, stats };
}

