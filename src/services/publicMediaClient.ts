/**
 * ENC-STAGING-PUBLIC-MEDIA-001 — cliente de la carga pública de imágenes del registro.
 * Cada archivo se envía sin base64 ni data URI a /api/public/registration-media y solo se acepta la URL /uploads/pub-… confirmada por el servidor.
 */
export const MEDIA_MAX_GALLERY = 10;
export const MEDIA_MAX_BYTES = 3 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Reduce fotos de teléfono demasiado pesadas antes de subirlas; el servidor vuelve a validar y recodificar. */
export async function prepareImage(file: File): Promise<Blob> {
  if (!ACCEPTED_TYPES.includes(file.type)) throw new Error('Formato no permitido. Usa JPEG, PNG o WebP.');
  if (file.size <= MEDIA_MAX_BYTES) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo preparar la imagen.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob || blob.size > MEDIA_MAX_BYTES) throw new Error('La imagen es demasiado pesada (máximo 3 MB).');
  return blob;
}

export async function uploadRegistrationImage(file: File, role: 'logo' | 'cover' | 'gallery', attemptId: string): Promise<{ url: string }> {
  const blob = await prepareImage(file);
  let response: Response;
  try {
    response = await fetch('/api/public/registration-media', {
      method: 'POST',
      headers: { 'Content-Type': blob.type, 'X-Registration-Attempt': attemptId, 'X-Media-Role': role },
      body: blob,
    });
  } catch {
    throw new Error('Sin conexión con el servidor; la imagen no se subió.');
  }
  const result = await response.json().catch(() => null);
  if (!response.ok || !result || result.success !== true || typeof result.url !== 'string' || !/^\/uploads\/pub-[a-f0-9]{12}-[lcg]-[a-f0-9]{32}\.webp$/.test(result.url)) {
    throw new Error((result && result.message) || 'No se confirmó la subida (HTTP ' + response.status + ').');
  }
  return { url: result.url };
}
