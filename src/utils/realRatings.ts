const STORAGE_KEY = 'encarmen_real_ratings_v3';

export interface BusinessRatingSummary {
  average: number;
  count: number;
  scores: number[];
}

function loadAllRealRatings(): Record<string, number[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getRealBusinessRating(businessId: string | number): BusinessRatingSummary {
  const all = loadAllRealRatings();
  const key = String(businessId);
  const scores = Array.isArray(all[key])
    ? all[key].map(Number).filter((n) => n >= 1 && n <= 5)
    : [];

  if (scores.length === 0) {
    return { average: 0, count: 0, scores: [] };
  }

  const sum = scores.reduce((acc, val) => acc + val, 0);
  const average = Number((sum / scores.length).toFixed(1));
  return {
    average,
    count: scores.length,
    scores
  };
}

export function submitRealBusinessRating(businessId: string | number, stars: number): BusinessRatingSummary {
  const validStars = Math.max(1, Math.min(5, Math.round(Number(stars))));
  const all = loadAllRealRatings();
  const key = String(businessId);
  const current = Array.isArray(all[key])
    ? all[key].map(Number).filter((n) => n >= 1 && n <= 5)
    : [];

  const updated = [...current, validStars];
  all[key] = updated;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event('real-ratings-updated'));
  } catch (_) {}

  // Enviar también al backend de forma asíncrona si está disponible
  fetch('/api/ratings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessId: key, rating: validStars })
  }).catch(() => {});

  const sum = updated.reduce((acc, val) => acc + val, 0);
  return {
    average: Number((sum / updated.length).toFixed(1)),
    count: updated.length,
    scores: updated
  };
}
