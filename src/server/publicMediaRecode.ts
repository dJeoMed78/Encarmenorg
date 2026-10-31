/**
 * ENC-STAGING-PUBLIC-MEDIA-001 — recodificación obligatoria con sharp: descarta metadatos y cualquier contenido
 * anexo (polyglots), limita dimensiones y produce siempre WebP. sharp ya es dependencia del proyecto.
 */
export async function recodePublicImage(input: any): Promise<any> {
  const mod: any = await import('sharp');
  const sharp = mod.default || mod;
  return sharp(input, {limitInputPixels: 40000000, failOn: 'error'})
    .rotate()
    .resize({width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true})
    .webp({quality: 82})
    .toBuffer();
}
