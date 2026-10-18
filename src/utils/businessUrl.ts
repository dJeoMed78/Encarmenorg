import { Business } from '../types';

export const OFFICIAL_DOMAIN = 'https://encarmen.org';
export const SECONDARY_DOMAIN = 'https://ai.empresasencarmen.com';

/**
 * Gets the current active base domain dynamically or falls back to encarmen.org
 * Always prioritizes the official public brand domain encarmen.org for sharing, QR codes and clipboard.
 */
export function getActiveBaseDomain(): string {
  return OFFICIAL_DOMAIN;
}

/**
 * Returns the official public URL pointing to encarmen.org (or ai.empresasencarmen.com)
 * Never uses internal dev/preview run.app URLs for sharing or QR codes.
 */
export function getBusinessPublicUrl(business: Partial<Business> | { slug?: string; id?: number }): string {
  const cleanSlug = business?.slug || String(business?.id || '');
  const base = getActiveBaseDomain();
  return `${base}/${encodeURIComponent(cleanSlug)}`;
}

/**
 * Returns a clean readable display format (e.g. encarmen.org/brio-cleaner or encarmen.org/clean-topal)
 */
export function getBusinessDisplayUrl(business: Partial<Business> | { slug?: string; id?: number }): string {
  const cleanSlug = business?.slug || String(business?.id || '');
  return `encarmen.org/${cleanSlug}`;
}

/**
 * Returns the dedicated subdomain URL (e.g. https://brio-cleaner.encarmen.org)
 */
export function getBusinessSubdomainUrl(business: Partial<Business> | { slug?: string; id?: number }): string {
  const cleanSlug = (business?.slug || String(business?.id || ''))
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `https://${cleanSlug}.encarmen.org`;
}

/**
 * Ensures a business NEVER shows "Sin categoría" or "uncategorized".
 * If categories are empty or set to uncategorized, smartly categorizes based on name and description.
 */
export function getBusinessPrimaryCategory(business: Partial<Business>): string {
  if (!business) return 'Comercio Local';
  
  const rawList: any[] = (business.categories as any) || [];
  for (const cat of rawList) {
    const name = typeof cat === 'object' && cat ? (cat.name || '') : String(cat || '');
    const clean = name.trim();
    if (clean && !clean.toLowerCase().includes('sin categor') && !clean.toLowerCase().includes('uncategorized')) {
      return clean;
    }
  }

  // Infer from content
  const text = `${business.name || ''} ${business.description || ''}`.toLowerCase();
  
  if (text.includes('brio') || text.includes('cleaner') || text.includes('lavado') || text.includes('mueble') || text.includes('colch') || text.includes('limpieza')) {
    return 'Limpieza y Lavado de Muebles';
  }
  if (text.includes('gas') || text.includes('sonigas') || text.includes('combustible')) {
    return 'Gas y Combustibles';
  }
  if (text.includes('inglés') || text.includes('idioma') || text.includes('escuela') || text.includes('curso') || text.includes('bee-lingual')) {
    return 'Educación, Cursos y Escuelas';
  }
  if (text.includes('clima') || text.includes('aire') || text.includes('refriger') || text.includes('zetta')) {
    return 'Mantenimiento y Reparación de Climas';
  }
  if (text.includes('churro') || text.includes('buñuelo') || text.includes('antojito') || text.includes('comida') || text.includes('taquer') || text.includes('restaurante')) {
    return 'Restaurantes y Antojitos';
  }
  if (text.includes('cosmético') || text.includes('bioaqua') || text.includes('belleza') || text.includes('skincare') || text.includes('falistore')) {
    return 'Salud y Belleza';
  }
  if (text.includes('celular') || text.includes('cómputo') || text.includes('reparación de teléfono')) {
    return 'Venta y Reparación de Celulares y Cómputo';
  }

  return 'Comercio Local';
}

/**
 * Resolves reliable image URL for any image string (business logo, gallery, etc.).
 * Corrects legacy /media/ paths back to WordPress uploads and prepends the live domain
 * when previewing from development/preview environments.
 */
export function formatImageUrl(url?: string | null): string {
  if (!url) return '';
  let img = url.trim();

  // If already absolute http or https
  if (img.startsWith('http://') || img.startsWith('https://')) {
    // If it was wrongly set to /media/ on empresasencarmen.com, fix to /wp-content/uploads/
    if (img.includes('empresasencarmen.com/media/')) {
      img = img.replace('/media/', '/wp-content/uploads/');
    }
    return img;
  }

  // If legacy /media/ was passed, convert back to /wp-content/uploads/
  if (img.startsWith('/media/')) {
    img = img.replace('/media/', '/wp-content/uploads/');
  }

  // If WordPress upload path (/wp-content/uploads/...)
  if (img.startsWith('/wp-content/')) {
    // When viewed in dev, preview, or localhost, load directly from production domain
    if (typeof window !== 'undefined') {
      const isProdDomain = window.location.hostname.includes('empresasencarmen.com');
      if (!isProdDomain) {
        return `https://empresasencarmen.com${img}`;
      }
    }
    return img;
  }

  // Local uploads (/uploads/...)
  return img;
}

export function getOptimizedImageUrl(url?: string | null, width = 480, quality = 80): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('data:') || trimmed.endsWith('.svg')) {
    return trimmed;
  }
  const formatted = formatImageUrl(trimmed);
  if (!formatted) return '';
  return `/api/img?url=${encodeURIComponent(formatted)}&w=${width}&q=${quality}&format=webp`;
}

/**
 * Resolves reliable and optimized image URL for a business, using server-side WebP compression.
 */
export function getBusinessImageUrl(business: Partial<Business>, width = 480): string {
  if (!business || !business.image) return '';
  return getOptimizedImageUrl(business.image, width);
}
