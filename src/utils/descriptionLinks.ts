/**
 * ENC-BUSINESS-UI-FIX-001
 * Convierte el texto libre de una descripción en partes seguras (texto o enlace).
 * Solo presentación: no modifica ni persiste la descripción original.
 */
export type DescriptionLinkKind = 'video' | 'audio' | 'image' | 'social' | 'maps' | 'whatsapp' | 'web';
export type DescriptionPart =
  | { type: 'text'; text: string }
  | { type: 'link'; href: string; label: string; kind: DescriptionLinkKind };

const HTML_TAGS = 'p|br|div|span|a|img|iframe|video|audio|source|embed|ul|ol|li|strong|b|em|i|u|h[1-6]|figure|figcaption|center|font|table|thead|tbody|tr|td|th';
const MAX_URL_LENGTH = 2048;

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

/** Quita marcado WordPress/HTML heredado conservando el texto comercial y las URL que contenía. */
export function normalizeDescriptionText(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let text = raw.replace(/\r\n?/g, '\n');
  text = text.replace(/\[embed[^\]]*\]\s*([^\s\[\]]+)\s*\[\/embed\]/gi, ' $1 ');
  text = text.replace(/\[(?:video|audio)\b[^\]]*?\b(?:src|mp4|webm|mp3|m4a|ogg)\s*=\s*["']([^"']+)["'][^\]]*\](?:\s*\[\/(?:video|audio)\])?/gi, ' $1 ');
  text = text.replace(new RegExp('<a\\b[^>]*?\\bhref\\s*=\\s*["\']([^"\']*)["\'][^>]*>([\\s\\S]*?)</a>', 'gi'), (_m, href, inner) => {
    const label = String(inner).replace(new RegExp('</?(?:' + HTML_TAGS + ')\\b[^>]*>', 'gi'), '').trim();
    const target = /^(?:https?:\/\/|www\.)/i.test(String(href).trim()) ? String(href).trim() : '';
    if (!target) return label;
    return label && !/^(?:https?:\/\/|www\.)/i.test(label) ? label + ' ' + target : target;
  });
  text = text.replace(new RegExp('<(?:img|iframe|video|audio|source|embed)\\b[^>]*?\\bsrc\\s*=\\s*["\']([^"\']*)["\'][^>]*>(?:\\s*</(?:iframe|video|audio)>)?', 'gi'), (_m, src) => {
    return /^(?:https?:\/\/|www\.)/i.test(String(src).trim()) ? ' ' + String(src).trim() + ' ' : ' ';
  });
  text = text.replace(/<\s*br\s*\/?>|<\/(?:p|div|li|h[1-6]|tr|figure)>/gi, '\n');
  text = text.replace(new RegExp('</?(?:' + HTML_TAGS + ')\\b[^>]*>', 'gi'), '');
  text = decodeEntities(text);
  text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function trimUrlTail(candidate: string): string {
  let url = candidate;
  for (;;) {
    const last = url.slice(-1);
    if (/[.,;:!?'"]/.test(last)) { url = url.slice(0, -1); continue; }
    if (last === ')' && (url.match(/\(/g) || []).length < (url.match(/\)/g) || []).length) { url = url.slice(0, -1); continue; }
    if (last === ']' && (url.match(/\[/g) || []).length < (url.match(/\]/g) || []).length) { url = url.slice(0, -1); continue; }
    break;
  }
  return url;
}

function safeHttpUrl(candidate: string): URL | undefined {
  if (!candidate || candidate.length > MAX_URL_LENGTH) return undefined;
  try {
    const parsed = new URL(/^www\./i.test(candidate) ? 'https://' + candidate : candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
    if (parsed.username || parsed.password) return undefined;
    if (!parsed.hostname.includes('.')) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

/** Etiqueta legible y tipo de enlace; no se incrusta ningún contenido externo. */
export function describeLink(url: URL): { label: string; kind: DescriptionLinkKind } {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const path = url.pathname.toLowerCase();
  if (/(^|\.)youtube(-nocookie)?\.com$/.test(host) || host === 'youtu.be') return { label: 'Ver video en YouTube', kind: 'video' };
  if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) return { label: 'Ver video en Vimeo', kind: 'video' };
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return { label: 'Ver video en TikTok', kind: 'video' };
  if (host === 'fb.watch' || ((host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.com') && /\/(videos?|reel|watch)\b/.test(path))) return { label: 'Ver video en Facebook', kind: 'video' };
  if (host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.com') return { label: 'Ver en Facebook', kind: 'social' };
  if (host === 'instagram.com' || host.endsWith('.instagram.com')) return { label: 'Ver en Instagram', kind: 'social' };
  if (host === 'maps.app.goo.gl' || host === 'goo.gl' && path.startsWith('/maps') || ((host === 'google.com' || host === 'maps.google.com') && (path.startsWith('/maps') || host === 'maps.google.com'))) return { label: 'Ver ubicación en Google Maps', kind: 'maps' };
  if (host === 'wa.me' || host === 'wa.link' || host === 'api.whatsapp.com' || host === 'chat.whatsapp.com') return { label: 'Abrir WhatsApp', kind: 'whatsapp' };
  if (/\.(mp4|webm|mov|m4v|ogv)$/.test(path)) return { label: 'Ver video', kind: 'video' };
  if (/\.(mp3|wav|m4a|oga|ogg)$/.test(path)) return { label: 'Escuchar audio', kind: 'audio' };
  if (/\.(jpe?g|png|webp|gif|avif|bmp|svg)$/.test(path)) return { label: 'Ver imagen', kind: 'image' };
  return { label: host, kind: 'web' };
}

/** Divide la descripción en texto y enlaces http(s) válidos. Las URL no válidas se conservan como texto. */
export function parseDescription(raw: unknown): DescriptionPart[] {
  const text = normalizeDescriptionText(raw);
  if (!text) return [];
  const parts: DescriptionPart[] = [];
  const pattern = /(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;
  let cursor = 0;
  let match: RegExpExecArray | null;
  const pushText = (value: string) => {
    if (!value) return;
    const last = parts[parts.length - 1];
    if (last && last.type === 'text') last.text += value;
    else parts.push({ type: 'text', text: value });
  };
  while ((match = pattern.exec(text)) !== null) {
    const candidate = trimUrlTail(match[0]);
    const parsed = safeHttpUrl(candidate);
    const start = match.index;
    if (!parsed) { continue; }
    pushText(text.slice(cursor, start));
    const { label, kind } = describeLink(parsed);
    parts.push({ type: 'link', href: parsed.href, label, kind });
    cursor = start + candidate.length;
    pattern.lastIndex = cursor;
  }
  pushText(text.slice(cursor));
  // Evita sangrías o líneas vacías sobrantes alrededor de enlaces.
  return parts
    .map((part) => (part.type === 'text' ? { type: 'text' as const, text: part.text.replace(/[ \t]{2,}/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n') } : part))
    .filter((part) => part.type === 'link' || part.text !== '');
}
