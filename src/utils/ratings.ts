/**
 * Visitor identification and rating management for Empresas en Carmen.
 * Guarantees that each visitor can only rate a business once (1 to 5 stars).
 */

const VISITOR_ID_KEY = 'eec_visitor_id';
const RATED_BUSINESSES_KEY = 'eec_rated_businesses_v1';

/**
 * Gets or creates a unique persistent visitor ID in localStorage.
 */
export function getVisitorId(): string {
  if (typeof window === 'undefined') return 'srv-ssr-client';
  
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    const randPart = Math.random().toString(36).substring(2, 10);
    const timePart = Date.now().toString(36);
    visitorId = `vis_${timePart}_${randPart}`;
    try {
      localStorage.setItem(VISITOR_ID_KEY, visitorId);
    } catch (_) {}
  }
  return visitorId;
}

/**
 * Returns map of businesses previously rated by this visitor: { [businessId]: rating }
 */
export function getLocalRatingsMap(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(RATED_BUSINESSES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

/**
 * Checks if the current visitor has already rated the given business.
 */
export function hasVisitorRatedBusiness(businessId: number | string): boolean {
  const map = getLocalRatingsMap();
  return Boolean(map[String(businessId)]);
}

/**
 * Gets the rating (1-5) given by this visitor to a business, or null if not yet rated.
 */
export function getVisitorRating(businessId: number | string): number | null {
  const map = getLocalRatingsMap();
  const val = map[String(businessId)];
  return typeof val === 'number' ? val : null;
}

/**
 * Saves a local rating record in the visitor's browser.
 */
export function saveLocalRating(businessId: number | string, rating: number): void {
  if (typeof window === 'undefined') return;
  try {
    const map = getLocalRatingsMap();
    map[String(businessId)] = rating;
    localStorage.setItem(RATED_BUSINESSES_KEY, JSON.stringify(map));
  } catch (_) {}
}
