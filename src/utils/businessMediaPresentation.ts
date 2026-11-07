export interface BusinessMediaInput {
  logo_url?: unknown;
  cover_url?: unknown;
  image?: unknown;
  imageUrl?: unknown;
  gallery?: unknown;
}

export interface BusinessMediaPresentation {
  logo?: string;
  cover?: string;
  hero?: string;
  gallery: string[];
}

function resolveImageUrl(value: unknown, origin: string): string | undefined {
  if (typeof value !== "string" || !value.trim() || value.length > 2048) return undefined;
  try {
    const url = new URL(value.trim(), origin);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

/**
 * Keeps the three business media roles independent:
 * - logo_url/image/imageUrl identify the business;
 * - cover_url is the hero cover and takes priority over the logo;
 * - gallery contains product/service photographs only.
 */
export function resolveBusinessMedia(input: BusinessMediaInput, origin: string): BusinessMediaPresentation {
  const logo = resolveImageUrl(input.logo_url, origin) ||
    resolveImageUrl(input.image, origin) ||
    resolveImageUrl(input.imageUrl, origin);
  const cover = resolveImageUrl(input.cover_url, origin);
  const gallery: string[] = [];
  if (Array.isArray(input.gallery)) {
    for (const value of input.gallery) {
      const url = resolveImageUrl(value, origin);
      if (url && !gallery.includes(url)) gallery.push(url);
      if (gallery.length === 10) break;
    }
  }
  return { logo, cover, hero: cover || logo, gallery };
}
