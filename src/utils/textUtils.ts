/**
 * Utilidades para normalización y formato de textos de comercios
 */

/**
 * Convierte un texto a formato Título (Mayúsculas y minúsculas),
 * respetando preposiciones y conjunciones en minúscula en español salvo al inicio.
 */
export function formatTitleCase(text: string): string {
  if (!text) return '';

  const minorWords = new Set([
    'de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en', 'con', 'por', 'para', 'a', 'o', 'u', 'al'
  ]);

  const acronyms = new Set([
    'sa', 'cv', 's.a.', 'c.v.', 's.a.p.i.', 'sapi', 'dif', 'cfe', 'pemex', 'sat', 'imss', 'issste', 'mx', 'usa', 'tv'
  ]);

  return text
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase();

      // Mantener acrónimos en mayúsculas
      if (acronyms.has(lower)) {
        return lower.toUpperCase();
      }

      // Palabras conectoras en minúsculas salvo que sea la primera palabra
      if (index > 0 && minorWords.has(lower)) {
        return lower;
      }

      // Mayúscula inicial y resto en minúscula
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/**
 * Formatea el nombre de una empresa:
 * Si el cliente o el registro viene en MAYÚSCULAS COMPLETAS (o todo en minúsculas),
 * lo normaliza automáticamente a Mayúsculas y Minúsculas elegantes.
 */
export function formatBusinessName(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();

  // Detectar si contiene letras y está en mayúsculas completas
  const lettersOnly = trimmed.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g, '');
  if (!lettersOnly) return trimmed;

  const isAllCaps = lettersOnly === lettersOnly.toUpperCase();
  const isAllLower = lettersOnly === lettersOnly.toLowerCase();

  if (isAllCaps || isAllLower) {
    return formatTitleCase(trimmed);
  }

  return trimmed;
}

/**
 * Limpia y formatea direcciones que contengan segmentos completos en mayúsculas
 * (ejemplo: "Calle REFORMA AGRARIA 42" -> "Calle Reforma Agraria 42")
 */
export function formatAddressText(address: string): string {
  if (!address) return '';
  const trimmed = address.trim();

  const lettersOnly = trimmed.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g, '');
  if (!lettersOnly) return trimmed;

  if (lettersOnly === lettersOnly.toUpperCase()) {
    return formatTitleCase(trimmed);
  }

  // Normalizar palabras individuales que hayan sido escritas en mayúsculas sostenidas
  return trimmed
    .split(/\s+/)
    .map((word) => {
      const wordLetters = word.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g, '');
      if (wordLetters.length > 2 && wordLetters === wordLetters.toUpperCase()) {
        // Mantener puntuación final si la tiene (ej. "AGRARIA,")
        const lastChar = word.slice(-1);
        const hasPunctuation = /[,.:;]/.test(lastChar);
        const base = hasPunctuation ? word.slice(0, -1) : word;
        return formatTitleCase(base) + (hasPunctuation ? lastChar : '');
      }
      return word;
    })
    .join(' ');
}
