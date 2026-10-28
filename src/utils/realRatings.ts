import { useEffect, useRef, useState } from 'react';
import { BusinessRatingStats, fetchBusinessRating, RatingApiError, submitBusinessRating } from '../services/api';

export const RATINGS_UPDATED = 'real-ratings-updated';
export const emptyRatingSummary = (): BusinessRatingStats => ({ average: 0, count: 0, hasRated: false, userRating: null });
let sessionVisitorId: string | undefined;

// Auxiliary browser identifier only: it does not establish a person's identity.
export function getRatingVisitorId(): string {
  if (sessionVisitorId) return sessionVisitorId;
  try {
    const stored = localStorage.getItem('eec_visitor_id');
    if (stored && /^[A-Za-z0-9_-]{1,100}$/.test(stored)) sessionVisitorId = stored;
  } catch { /* Storage may be disabled; retain the ID for this session. */ }
  if (!sessionVisitorId) {
    sessionVisitorId = `vis_${globalThis.crypto.randomUUID()}`;
    try { localStorage.setItem('eec_visitor_id', sessionVisitorId); } catch { /* Session only. */ }
  }
  return sessionVisitorId;
}

export async function getRealBusinessRating(businessId: string | number): Promise<BusinessRatingStats> {
  return fetchBusinessRating(businessId, getRatingVisitorId());
}

export async function submitRealBusinessRating(businessId: string | number, stars: number, comment?: string): Promise<BusinessRatingStats> {
  const result = await submitBusinessRating({ businessId, rating: stars, visitorId: getRatingVisitorId(), ...(comment ? { comment } : {}) });
  window.dispatchEvent(new Event(RATINGS_UPDATED));
  return { ...result.stats, hasRated: true, userRating: stars };
}

// Every view reconciles with the server. No local vote or catalog average is authoritative.
export function useBusinessRatings(businessId: string | number | undefined, active = true) {
  const key = active && businessId !== undefined ? String(businessId) : undefined;
  const [state, setState] = useState<{ key?: string; summary: BusinessRatingStats; loading: boolean; available: boolean; submitting: boolean; error: string | null; saved: boolean }>(
    { summary: emptyRatingSummary(), loading: true, available: false, submitting: false, error: null, saved: false }
  );
  const generation = useRef(0);
  const busy = useRef(false);
  const currentKey = useRef(key);
  currentKey.current = key;
  const refresh = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    const version = ++generation.current;
    let request = 0;
    let alive = true;
    busy.current = false;
    setState({ key, summary: emptyRatingSummary(), loading: key !== undefined, available: false, submitting: false, error: null, saved: false });
    const load = async () => {
      if (key === undefined) return;
      const order = ++request;
      setState(prev => ({ ...prev, loading: true, available: false, error: null }));
      try {
        const summary = await getRealBusinessRating(key);
        if (alive && generation.current === version && order === request) {
          setState(prev => ({ ...prev, key, summary, loading: false, available: true }));
        }
      } catch {
        if (alive && generation.current === version && order === request) {
          setState(prev => ({ ...prev, key, summary: emptyRatingSummary(), loading: false, available: false, error: 'No fue posible consultar las calificaciones. Intenta de nuevo.' }));
        }
      }
    };
    refresh.current = load;
    void load();
    const reload = () => { void load(); };
    window.addEventListener(RATINGS_UPDATED, reload);
    window.addEventListener('focus', reload);
    return () => {
      alive = false;
      generation.current++;
      window.removeEventListener(RATINGS_UPDATED, reload);
      window.removeEventListener('focus', reload);
    };
  }, [key]);

  const rate = async (stars: number, comment?: string): Promise<BusinessRatingStats | null> => {
    if (key === undefined || state.key !== key || busy.current || state.loading || !state.available || Boolean(state.error) || state.summary.hasRated) return null;
    const version = generation.current;
    const valid = () => generation.current === version && currentKey.current === key;
    busy.current = true;
    setState(prev => ({ ...prev, submitting: true, error: null, saved: false }));
    try {
      const summary = await submitRealBusinessRating(key, stars, comment);
      if (!valid()) return null;
      setState(prev => ({ ...prev, summary, available: true, saved: true }));
      return summary;
    } catch (error) {
      if (!valid()) return null;
      const duplicate = error instanceof RatingApiError && error.status === 409;
      // Also reconcile ambiguous network/response failures: the write may have reached the server.
      await refresh.current();
      if (!valid()) return null;
      setState(prev => ({ ...prev, saved: false, error: duplicate
        ? 'Este identificador de visitante ya tiene una calificación. Se consultó el voto registrado; si la consulta falló, intenta de nuevo.'
        : error instanceof RatingApiError ? `${error.message} No se confirmó el envío.` : 'No se confirmó el envío. Revisa el estado consultado antes de volver a intentar.' }));
      return null;
    } finally {
      if (valid()) {
        busy.current = false;
        setState(prev => ({ ...prev, submitting: false }));
      }
    }
  };
  const visible = state.key === key ? state : { ...state, summary: emptyRatingSummary(), loading: true, available: false, saved: false, error: null };
  return { ...visible, rate, retry: () => { void refresh.current(); } };
}
