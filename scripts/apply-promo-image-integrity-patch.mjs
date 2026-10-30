#!/usr/bin/env node
// ENC-PROMO-IMAGE-INTEGRITY-001 — separa previsualización local de imagen remota confirmada
// en el panel administrativo de promociones. Parche exacto e idempotente para
// src/components/AdminPromotionsTab.tsx. Uso: node scripts/apply-promo-image-integrity-patch.mjs [--check]
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const IMPORT_ANCHOR = "import React, { useState, useEffect } from 'react';";
const IMPORT_REPLACE = "import React, { useState, useEffect, useRef } from 'react';";

const STATE_ANCHOR = "  const [isSaving, setIsSaving] = useState(false);";
const STATE_ADD = "\n\n  // ENC-PROMO-IMAGE-INTEGRITY-001: previsualización local separada de la imagen remota confirmada.\n  const [promoImagePreview, setPromoImagePreview] = useState('');\n  const promoUploadSeq = useRef(0);";

const UPLOAD_ANCHOR = `  const handlePromoImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPromoImg(true);
    try {
      const compressedDataUrl = await compressFlyerImage(file);
      if (!compressedDataUrl) {
        setIsUploadingPromoImg(false);
        return;
      }
      setPromoImageData(compressedDataUrl);
      try {
        const res = await uploadBusinessLogo(compressedDataUrl, file.name);
        if (res.success && res.url) {
          setPromoImage(res.url);
        } else {
          setPromoImage(compressedDataUrl);
        }
      } catch {
        setPromoImage(compressedDataUrl);
      }
    } catch (err) {
      console.error('Error uploading promo image:', err);
    } finally {
      setIsUploadingPromoImg(false);
    }
  };`;

const UPLOAD_REPLACE = `  const handlePromoImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploadId = ++promoUploadSeq.current;
    setIsUploadingPromoImg(true);
    setErrorMsg(null);
    try {
      const compressedDataUrl = await compressFlyerImage(file);
      if (!compressedDataUrl) {
        setErrorMsg('No se pudo procesar la imagen seleccionada.');
        return;
      }
      // ENC-PROMO-IMAGE-INTEGRITY-001: previsualización local; NO sustituye la imagen remota confirmada.
      setPromoImagePreview(compressedDataUrl);
      try {
        const res = await uploadBusinessLogo(compressedDataUrl, file.name);
        if (uploadId !== promoUploadSeq.current) return; // una subida más reciente tomó el control.
        if (res.success && res.url && !res.url.startsWith('data:')) {
          setPromoImage(res.url);
          setPromoImagePreview('');
        } else {
          setErrorMsg(res.error || 'No se pudo confirmar la subida de la imagen. Se conserva la imagen anterior.');
        }
      } catch (err: any) {
        if (uploadId !== promoUploadSeq.current) return;
        setErrorMsg(err?.message || 'No se pudo subir la imagen. Se conserva la imagen anterior.');
      }
    } catch (err) {
      console.error('Error uploading promo image:', err);
      if (uploadId === promoUploadSeq.current) setErrorMsg('No se pudo procesar la imagen seleccionada.');
    } finally {
      if (uploadId === promoUploadSeq.current) setIsUploadingPromoImg(false);
    }
  };`;

const EDIT_ANCHOR = "    setPromoImageData(promo.promoImageData || (promo.promoImage?.startsWith('data:') ? promo.promoImage : ''));";
const EDIT_ADD = "\n    setPromoImagePreview('');";

const RESET_ANCHOR = "    setPromoImageData('');\n    setPromoTerms(";
const RESET_REPLACE = "    setPromoImageData('');\n    setPromoImagePreview('');\n    setPromoTerms(";

const SAVE_ANCHOR = "    const biz = businesses.find(b => b.id === Number(selectedBizId));\n    setIsSaving(true);";
const SAVE_REPLACE = "    if (isUploadingPromoImg) {\n      setErrorMsg('Espera a que termine la subida de la imagen antes de guardar.');\n      return;\n    }\n\n    const biz = businesses.find(b => b.id === Number(selectedBizId));\n    setIsSaving(true);";

const IMAGE_ANCHOR = "        promoImage: promoImage.trim() || promoImageData || null,\n        promoImageData: promoImageData || (promoImage.startsWith('data:') ? promoImage : null),";
const IMAGE_REPLACE = "        // ENC-PROMO-IMAGE-INTEGRITY-001: solo una URL remota confirmada se envía como promoImage;\n        // el dataURI local de previsualización nunca se presenta como imagen remota.\n        promoImage: promoImage.trim() && !promoImage.startsWith('data:') ? promoImage.trim() : null,\n        promoImageData: promoImageData || (promoImage.startsWith('data:') ? promoImage : null),";

export const STEPS = [
  { name: 'useRef para subidas', find: IMPORT_ANCHOR, replace: IMPORT_REPLACE },
  { name: 'estado de previsualización y secuencia', find: STATE_ANCHOR, replace: STATE_ANCHOR + STATE_ADD },
  { name: 'subida honesta de imagen', find: UPLOAD_ANCHOR, replace: UPLOAD_REPLACE },
  { name: 'editar promoción limpia previsualización', find: EDIT_ANCHOR, replace: EDIT_ANCHOR + EDIT_ADD },
  { name: 'reset limpia previsualización', find: RESET_ANCHOR, replace: RESET_REPLACE },
  { name: 'guardar espera subida en curso', find: SAVE_ANCHOR, replace: SAVE_REPLACE },
  { name: 'solo URL remota confirmada como promoImage', find: IMAGE_ANCHOR, replace: IMAGE_REPLACE },
];

const count = (s, part) => (part ? s.split(part).length - 1 : 0);

export function applyPatch(source) {
  let next = source;
  const applied = [];
  const skipped = [];
  for (const step of STEPS) {
    if (count(next, step.replace) === 1) { skipped.push(step.name); continue; }
    const found = count(next, step.find);
    if (found !== 1) throw new Error(`Ancla no válida para "${step.name}": aparece ${found} veces (se esperaba 1). No se modificó nada.`);
    next = next.replace(step.find, () => step.replace);
    applied.push(step.name);
  }
  return { source: next, applied, skipped };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const check = process.argv.includes('--check');
  try {
    const file = 'src/components/AdminPromotionsTab.tsx';
    const result = applyPatch(readFileSync(file, 'utf8'));
    if (!check) writeFileSync(file, result.source);
    console.log(JSON.stringify({ file, mode: check ? 'check' : 'write', applied: result.applied, skipped: result.skipped }, null, 2));
  } catch (error) { console.error(error.message); process.exit(1); }
}
