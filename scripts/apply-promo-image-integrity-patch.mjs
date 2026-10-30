#!/usr/bin/env node
// ENC-PROMO-IMAGE-INTEGRITY-001: verifica la corrección ya aplicada en código funcional.
// Antes Perplexity entregó un parche sin aplicar. Coordinación aplicó una versión corregida.
// Este script NO muta archivos para evitar sobrescribir correcciones posteriores.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export function verifyPromoImageSource(source) {
  const checks = {
    preview: source.includes("const [promoImagePreview, setPromoImagePreview] = useState('')"),
    sequence: source.includes('const uploadId = ++promoUploadSeq.current;'),
    latestOnly: source.includes('if (uploadId !== promoUploadSeq.current) return;'),
    staleReset: source.includes('promoUploadSeq.current += 1;'),
    confirmedUrl: source.includes('setPromoImage(confirmedUrl);'),
    failureNotice: source.includes('No se confirmó la carga de la imagen'),
    noFailedDataUri: !source.includes('setPromoImage(compressedDataUrl)'),
    noTempImageData: !source.includes('setPromoImageData(compressedDataUrl)'),
    clearHistoricalOnUpload: source.includes("setPromoImageData('');"),
    saveBlock: source.includes('if (isUploadingPromoImg) {'),
    previewVisible: source.includes('src={promoImagePreview || promoImage || promoImageData}'),
    savingImageData: source.includes('promoImageData: promoImageData || null,')
  };
  if(Object.values(checks).some(v=>!v)) throw new Error('Corrección incompleta: '+Object.entries(checks).filter(([,v])=>!v).map(([k])=>k).join(', '));
  return checks;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const checks=verifyPromoImageSource(readFileSync('src/components/AdminPromotionsTab.tsx','utf8'));
  console.log(JSON.stringify({mode:'check',mutated:false,checks},null,2));
}
