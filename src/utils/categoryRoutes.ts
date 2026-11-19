export interface CategoryRouteRecord {
  name?: string | null;
  slug?: string | null;
  parent?: number | string | null;
}

/** Resolve only published top-level category URLs to the exact directory filter label. */
export function getCategoryRouteName(pathname?: string | null, categories: CategoryRouteRecord[] = []): string | null {
  if (typeof pathname !== 'string') return null;
  const match = pathname.split(/[?#]/, 1)[0].match(/^\/categoria\/([^/]+)\/?$/i);
  if (!match) return null;
  let slug = match[1].toLowerCase();
  try { slug = decodeURIComponent(slug).toLowerCase(); } catch { return null; }
  const category = categories.find(item => Number(item.parent) === 0 && String(item.slug || '').toLowerCase() === slug);
  return category?.name ? String(category.name) : null;
}
