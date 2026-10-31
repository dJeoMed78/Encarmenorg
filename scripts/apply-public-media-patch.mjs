#!/usr/bin/env node
// ENC-STAGING-PUBLIC-MEDIA-001 — parche exacto, idempotente y atómico para los dos archivos grandes que no pueden
// reescribirse por completo con seguridad: server.ts (lista permitida de Staging) y src/components/RegisterBusinessView.tsx.
// Uso: node scripts/apply-public-media-patch.mjs [--check]
// IMPORTANTE: NO ejecutar automáticamente. server.ts contiene la corrección posterior del Issue #12 que debe conservarse.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const MARKER = 'ENC-STAGING-PUBLIC-MEDIA-001';
const count = (s, part) => (part ? s.split(part).length - 1 : 0);

export function applyServerPatch(source) {
  if (source.includes('publicMediaMutation')) return { source, applied: [], skipped: ['server.ts'] };
  const re = /^([ \t]*)if \(businessMutation && isBusinessWritePermitted\(\)\) return next\(\);/m;
  if (!re.test(source)) throw new Error('Ancla no encontrada en server.ts: "if (businessMutation && isBusinessWritePermitted()) return next();". No se modificó nada.');
  const next = source.replace(re, (_m, indent) =>
    indent + '// ' + MARKER + ': la carga pública de imágenes comparte el mismo control de escritura empresarial de Staging.\n' +
    indent + "const publicMediaMutation = req.method === 'POST' && req.path === '/api/public/registration-media';\n" +
    indent + 'if ((businessMutation || publicMediaMutation) && isBusinessWritePermitted()) return next();');
  return { source: next, applied: ['server.ts'], skipped: [] };
}

const STUB = `  // La carga anónima no dispone de contrato seguro: no usar el uploader heredado ni dataURI.
  const handleGalleryUpload = (_e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('La carga pública de imágenes todavía no está habilitada. El registro de texto sí está disponible.');
  };
  const handleRemoveGalleryImage = (index: number) => setGalleryImages(prev=>prev.filter((_,i)=>i!==index));
  const handleLogoUpload = handleGalleryUpload;

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setFormData(prev => ({ ...prev, image: '' }));
  };`;

const LIVE = [
  '  // ' + MARKER + ': carga pública real del logotipo y hasta 10 fotografías.',
  '  // Cada archivo se confirma en MariaDB (servidor) antes de mostrarse; el envío se bloquea mientras haya cargas pendientes.',
  '  const mediaAttemptId = useRef<string | null>(null);',
  '  const logoPending = useRef(0);',
  '  const galleryPending = useRef(0);',
  '  const galleryReserved = useRef(0);',
  '  const ensureMediaAttempt = () => {',
  '    if (!mediaAttemptId.current) mediaAttemptId.current = crypto.randomUUID();',
  '    return mediaAttemptId.current;',
  '  };',
  '',
  '  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {',
  '    const file = e.target.files?.[0];',
  "    e.target.value = '';",
  '    if (!file) return;',
  '    setErrorMessage(null);',
  '    logoPending.current += 1;',
  '    setIsUploadingLogo(true);',
  '    setLogoUploadedSuccess(false);',
  '    try {',
  "      const uploaded = await uploadRegistrationImage(file, 'logo', ensureMediaAttempt());",
  '      setFormData(prev => ({ ...prev, image: uploaded.url }));',
  '      setLogoPreview(uploaded.url);',
  '      setLogoUploadedSuccess(true);',
  '    } catch (err: any) {',
  "      setErrorMessage('Logotipo: ' + (err?.message || 'no se pudo subir.'));",
  '    } finally {',
  '      logoPending.current -= 1;',
  '      setIsUploadingLogo(logoPending.current > 0);',
  '    }',
  '  };',
  '',
  '  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {',
  '    const files = Array.from(e.target.files || []);',
  "    e.target.value = '';",
  '    if (files.length === 0) return;',
  '    setErrorMessage(null);',
  '    const room = MEDIA_MAX_GALLERY - galleryImages.length - galleryReserved.current;',
  '    if (room <= 0) {',
  "      setErrorMessage('Máximo ' + MEDIA_MAX_GALLERY + ' fotografías por empresa.');",
  '      return;',
  '    }',
  '    const batch = files.slice(0, room);',
  "    if (files.length > room) setErrorMessage('Solo caben ' + room + ' fotografías más; se subirán las primeras ' + room + '.');",
  '    galleryReserved.current += batch.length;',
  '    galleryPending.current += 1;',
  '    setIsUploadingGallery(true);',
  '    try {',
  '      for (const file of batch) {',
  '        try {',
  "          const uploaded = await uploadRegistrationImage(file, 'gallery', ensureMediaAttempt());",
  '          setGalleryImages(prev => (prev.length < MEDIA_MAX_GALLERY && !prev.includes(uploaded.url) ? [...prev, uploaded.url] : prev));',
  '        } catch (err: any) {',
  "          setErrorMessage(file.name + ': ' + (err?.message || 'no se pudo subir.'));",
  '        } finally {',
  '          galleryReserved.current -= 1;',
  '        }',
  '      }',
  '    } finally {',
  '      galleryPending.current -= 1;',
  '      setIsUploadingGallery(galleryPending.current > 0);',
  '    }',
  '  };',
  '  const handleRemoveGalleryImage = (index: number) => setGalleryImages(prev=>prev.filter((_,i)=>i!==index));',
  '',
  '  const handleRemoveLogo = () => {',
  '    setLogoPreview(null);',
  '    setLogoUploadedSuccess(false);',
  "    setFormData(prev => ({ ...prev, image: '' }));",
  '  };',
].join('\n');

const IMPORT_ANCHOR = "import { cleanPhoneNumber } from '../utils/phone';";
const IMPORT_ADD = "\nimport { uploadRegistrationImage, MEDIA_MAX_GALLERY } from '../services/publicMediaClient';";
const GUARD_ANCHOR = '    if(registrationBusy.current) return;\n    setErrorMessage(null);';
const GUARD_REPLACE = "    if(registrationBusy.current) return;\n    if (logoPending.current > 0 || galleryPending.current > 0 || isUploadingLogo || isUploadingGallery) {\n      setErrorMessage('Espera a que terminen de subir las imágenes antes de enviar el registro.');\n      return;\n    }\n    setErrorMessage(null);";
const NAME_ANCHOR = '      const formattedBizName = formatBusinessName(formData.name.trim());\n';
const NAME_REPLACE = "      const mediaPayload: Record<string, unknown> = {\n        ...(formData.image ? { logo_url: formData.image, image: formData.image } : {}),\n        ...(galleryImages.length ? { gallery: galleryImages } : {}),\n        ...((formData.image || galleryImages.length) && mediaAttemptId.current ? { mediaAttempt: mediaAttemptId.current } : {})\n      };\n" + NAME_ANCHOR;
const SUBMIT_ANCHOR = 'phone: phoneClean, whatsapp: waClean\n      }, registrationRequestId.current);';
const SUBMIT_REPLACE = 'phone: phoneClean, whatsapp: waClean,\n        ...mediaPayload\n      }, registrationRequestId.current);';
const RESET_RE = /registrationRequestId\.current = null;(\s*)setRegisteredBusiness\(null\);/;

export function applyViewPatch(source) {
  if (source.includes(MARKER)) return { source, applied: [], skipped: ['RegisterBusinessView.tsx'] };
  const checks = [['bloque de carga deshabilitada', STUB], ['importación de phone', IMPORT_ANCHOR], ['protección de doble envío', GUARD_ANCHOR], ['nombre formateado', NAME_ANCHOR], ['envío del registro', SUBMIT_ANCHOR]];
  for (const [name, anchor] of checks) {
    const found = count(source, anchor);
    if (found !== 1) throw new Error('Ancla no válida en RegisterBusinessView.tsx para "' + name + '": aparece ' + found + ' veces (se esperaba 1). No se modificó nada.');
  }
  if (!RESET_RE.test(source)) throw new Error('Ancla no encontrada en RegisterBusinessView.tsx para el reinicio del formulario. No se modificó nada.');
  let next = source;
  next = next.replace(STUB, () => LIVE);
  next = next.replace(IMPORT_ANCHOR, () => IMPORT_ANCHOR + IMPORT_ADD);
  next = next.replace(GUARD_ANCHOR, () => GUARD_REPLACE);
  next = next.replace(NAME_ANCHOR, () => NAME_REPLACE);
  next = next.replace(SUBMIT_ANCHOR, () => SUBMIT_REPLACE);
  next = next.replace(RESET_RE, (_m, gap) => 'registrationRequestId.current = null;' + gap + 'mediaAttemptId.current = null;' + gap + 'setRegisteredBusiness(null);');
  return { source: next, applied: ['RegisterBusinessView.tsx'], skipped: [] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const check = process.argv.includes('--check');
  try {
    const server = readFileSync('server.ts', 'utf8');
    const view = readFileSync('src/components/RegisterBusinessView.tsx', 'utf8');
    const a = applyServerPatch(server);
    const b = applyViewPatch(view);
    if (!check) {
      if (a.applied.length) writeFileSync('server.ts', a.source);
      if (b.applied.length) writeFileSync('src/components/RegisterBusinessView.tsx', b.source);
    }
    console.log(JSON.stringify({ mode: check ? 'check' : 'write', applied: [...a.applied, ...b.applied], skipped: [...a.skipped, ...b.skipped] }, null, 2));
  } catch (error) { console.error(error.message); process.exit(1); }
}
