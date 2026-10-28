/** Version 1. Conservative deterministic filters; never a guarantee of moderation. No network calls. */
export const COMMENT_MIN = 10;
export const COMMENT_MAX = 200; // Existing ratings schema/contract; no migration.
export type CommentValidation =
  { ok: true; text: string } | { ok: false; message: string };
export function validateBusinessComment(value: unknown): CommentValidation {
  const reject = (message: string): CommentValidation => ({
    ok: false,
    message,
  });
  if (value === undefined || value === "") return { ok: true, text: "" };
  if (typeof value !== "string" || new TextEncoder().encode(value).length > 800)
    return reject("El comentario excede el tamaño permitido.");
  if (/[\p{Cc}\p{Cf}\p{Cs}]/u.test(value))
    return reject("Usa texto sin controles ni caracteres invisibles.");
  const text = value.normalize("NFKC").replace(/\s+/gu, " ").trim();
  if (!text) return { ok: true, text: "" };
  if ([...text].length < COMMENT_MIN || text.length > COMMENT_MAX)
    return reject(
      "Escribe entre 10 y 200 caracteres o deja el comentario vacío.",
    );
  if (
    /[<>`{}\\]|\[.*\]\s*\(/u.test(text) ||
    /(?:javascript|data)\s*:/iu.test(text)
  )
    return reject("Usa solo texto, sin HTML, código ni enlaces.");
  if (
    /[\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Arabic}\p{Script=Han}]/u.test(
      text,
    )
  )
    return reject("Escribe el comentario en español con caracteres legibles.");
  const folded = text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const disguised = folded
    .replace(/\b(?:punto|dot)\b|\[\.\]|\(\.\)/g, ".")
    .replace(/\b(?:arroba|at)\b/g, "@");
  const unspaced = disguised.replace(/\b(?:[a-z]\s+){2,}[a-z]\b/g, (s) =>
    s.replace(/\s+/g, ""),
  );
  const compact = disguised.replace(/\s+/g, "");
  // Also test spaced letters, fullwidth punctuation, naked domains and common shorteners.
  if (
    /(?:https?:|hxxps?:|www\.|@|:\/\/)/i.test(compact) ||
    /[a-z0-9-]+\s*[.。]\s*(?:com|org|net|mx|io|co|me|ly|app|es|info|biz|online|site|xyz|link|tv|pro|gg|edu|gob)(?:\b|\/)/i.test(
      unspaced,
    ) ||
    /[a-z0-9-]+\.(?:com|org|net|mx|io|co|me|ly|app|es|info|biz|online|site|xyz|link|tv|pro|gg|edu|gob)(?:\b|\/)/i.test(
      compact,
    )
  )
    return reject(
      "No publiques enlaces, dominios, correos ni usuarios de contacto.",
    );
  if (
    /(?:\d[\s()+.\-]*){7,}/.test(folded) ||
    /\b(?:cero|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)(?:[\s,.-]+(?:cero|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)){5,}\b/.test(
      folded,
    )
  )
    return reject("No publiques teléfonos ni números de contacto.");
  if (
    /\b(?:calle|avenida|av\.?|domicilio|direccion|colonia|fraccionamiento|privada|carretera|boulevard|blvd)\s+[^.!?]{0,45}(?:\d|numero|esquina|entre calles)\b/.test(
      folded,
    ) ||
    /\b(?:vivo|vive|encuentran|encuentras)\s+en\s+(?:la\s+)?(?:calle|avenida|colonia)\b/.test(
      folded,
    )
  )
    return reject("No publiques direcciones identificables.");
  const leet = folded.replace(
    /[013457@$]/g,
    (c) =>
      ({
        "0": "o",
        "1": "i",
        "3": "e",
        "4": "a",
        "5": "s",
        "7": "t",
        "@": "a",
        $: "s",
      })[c]!,
  );
  const words = leet.replace(/[^a-zñ]+/g, " ");
  const joined = leet.replace(/[^a-zñ]/g, "");
  const insults = [
    "chingatumadre",
    "hijodeputa",
    "putamadre",
    "pincheputa",
    "pendejo",
    "pendeja",
    "cabron",
    "cabrona",
    "maricon",
  ];
  if (
    insults.some((w) => joined.includes(w)) ||
    /\b(?:puta|puto|mierda|joder)\b/.test(words) ||
    /\b(?:te|los|las|le)\s+(?:voy a\s+)?(?:matar|violar|golpear)|\b(?:muerte a|hay que matar|bomba|exterminar)\b/.test(
      folded,
    )
  )
    return reject(
      "No se permiten insultos fuertes, amenazas ni contenido abusivo.",
    );
  if (
    /\b(?:compra ahora|oferta exclusiva|gana dinero|contactame|contactanos|escribeme|sigueme|visita mi|visita nuestra|vendo|venta de|promo(?:cion)? especial|descuento del)\b/.test(
      folded,
    )
  )
    return reject("No se permite publicidad ni solicitudes de contacto.");
  if (
    /(.)\1{5,}/u.test(folded) ||
    /\b(\p{L}+)\b(?:\s+\1\b){3,}/iu.test(folded) ||
    (text.match(/\p{L}/gu) || []).length < 5
  )
    return reject("Evita contenido repetitivo o sin una experiencia legible.");
  const foreign =
    /\b(?:the|this|that|was|were|very|really|great|terrible|service|food|place|would|recommend|never|again|with|and|is|are|not|bad|good|excellent|bonjour|merci|tres|cette|nicht|und)\b/g;
  const spanish =
    /\b(?:el|la|los|las|un|una|de|del|que|en|y|muy|pero|fue|es|bueno|buena|malo|mala|servicio|comida|atencion|excelente|regresare|volveria|recomiendo|agradable)\b/g;
  const f = (folded.match(foreign) || []).length,
    s = (folded.match(spanish) || []).length;
  if (f >= 3 && f > s) return reject("El comentario debe estar en español.");
  return { ok: true, text };
}
