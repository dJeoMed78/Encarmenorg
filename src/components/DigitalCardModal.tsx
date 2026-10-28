import React, { useState, useEffect } from 'react';
import { X, Share2, Copy, Check, Download, ExternalLink, QrCode, MapPin, Phone, Globe } from 'lucide-react';
import { Business } from '../types';
import { getBusinessPublicUrl, getBusinessPrimaryCategory, getBusinessImageUrl } from '../utils/businessUrl';
import { formatPhoneNumber } from '../utils/phone';
import { formatBusinessName, formatAddressText } from '../utils/textUtils';

interface DigitalCardModalProps {
  business: Business | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenClientPage?: (b: Business) => void;
}

export const DigitalCardModal: React.FC<DigitalCardModalProps> = ({
  business,
  isOpen,
  onClose,
  onOpenClientPage
}) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [logoImg, setLogoImg] = useState<string | null>(null);

  useEffect(() => {
    if (business) {
      setLogoImg(getBusinessImageUrl(business) || null);
    }
  }, [business]);

  if (!isOpen || !business) return null;

  // Dirección web completa sin recortar
  const fullWebUrl = getBusinessPublicUrl(business);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(fullWebUrl)}`;
  const categoryName = getBusinessPrimaryCategory(business);
  const phoneDisplay = formatPhoneNumber(business.phone || business.whatsapp) || 'Teléfono no registrado';
  const addressDisplay = business.address
    ? formatAddressText(business.address)
    : business.colonia
    ? `Col. ${formatAddressText(business.colonia)}, Ciudad del Carmen`
    : 'Ubicación no registrada';

  const handleCopyLink = async () => {
    setCopied(false);
    setCopyError('');
    try {
      await navigator.clipboard.writeText(fullWebUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { setCopyError('No se pudo copiar el enlace. Copia la dirección visible.'); }
  };

  const handleShare = async () => {
    setCopyError('');
    if (!navigator.share) { await handleCopyLink(); return; }
    try { await navigator.share({ title: business.name, url: fullWebUrl }); }
    catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        setCopyError('No se pudo compartir. Puedes copiar el enlace.');
    }
  };

  // Generador de Tarjeta PNG en formato horizontal 1050 x 600 px
  const handleDownloadImage = async () => {
    setIsGenerating(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas no disponible');

      canvas.width = 1050;
      canvas.height = 600;

      // Fondo blanco con sutil gradiente cálido
      const bgGrad = ctx.createLinearGradient(0, 0, 1050, 600);
      bgGrad.addColorStop(0, '#ffffff');
      bgGrad.addColorStop(1, '#fefce8');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1050, 600);

      // Marco elegante exterior
      ctx.lineWidth = 12;
      ctx.strokeStyle = '#0f172a';
      ctx.strokeRect(6, 6, 1038, 588);

      // Marco fino dorado interior
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#f59e0b';
      ctx.strokeRect(20, 20, 1010, 560);

      // Encabezado marca oficial
      ctx.fillStyle = '#0f6874';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('EMPRESAS EN CARMEN', 45, 60);

      ctx.fillStyle = '#f97316';
      ctx.font = 'italic bold 21px Impact, system-ui, sans-serif';
      ctx.fillText('.ORG', 280, 60);

      ctx.fillStyle = '#64748b';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText('DIRECTORIO EMPRESARIAL OFICIAL DE CIUDAD DEL CARMEN', 45, 80);

      // Badge Categoría
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(45, 105, 340, 32);
      ctx.fillStyle = '#92400e';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText(categoryName.toUpperCase().slice(0, 40), 55, 126);

      // Nombre del Negocio
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      const formattedBizName = formatBusinessName(business.name);
      const nameText = formattedBizName.length > 30 ? formattedBizName.slice(0, 28) + '...' : formattedBizName;
      ctx.fillText(nameText, 45, 185);

      // Dirección
      ctx.fillStyle = '#475569';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText(`📍 ${addressDisplay.slice(0, 55)}`, 45, 230);

      // Teléfono / WhatsApp
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(`📞 Tel / WhatsApp: ${phoneDisplay}`, 45, 275);

      // Caja Web Oficial Completa
      ctx.fillStyle = '#fffbeb';
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 2;
      ctx.fillRect(45, 315, 590, 80);
      ctx.strokeRect(45, 315, 590, 80);

      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText('🌐 DIRECCIÓN WEB OFICIAL (ENLACE DIRECTO):', 60, 342);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(fullWebUrl, 60, 375);

      // Pie de tarjeta
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText('Escanea el código QR de la derecha para abrir la ficha interactiva', 45, 435);

      // Separador vertical
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(680, 50);
      ctx.lineTo(680, 550);
      ctx.stroke();

      // Cargar y pintar QR en el lado derecho
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.onload = () => {
        // Marco blanco del QR
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.fillRect(725, 110, 270, 270);
        ctx.strokeRect(725, 110, 270, 270);

        ctx.drawImage(qrImg, 735, 120, 250, 250);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Apunta tu cámara aquí', 860, 420);

        ctx.fillStyle = '#64748b';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText('encarmen.org', 860, 445);
        ctx.textAlign = 'left';

        // Descargar el archivo PNG generado
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `tarjeta-${(business.slug || business.name).replace(/\s+/g, '-').toLowerCase()}.png`;
        link.href = dataUrl;
        link.click();
        setIsGenerating(false);
      };
      qrImg.onerror = () => {
        setIsGenerating(false);
        alert('No se pudo renderizar el QR para la descarga. Por favor copia el enlace.');
      };
      qrImg.src = qrUrl;

    } catch (err) {
      setIsGenerating(false);
      alert('Error al generar la tarjeta en imagen.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      style={{
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
      }}
      onClick={onClose}
    >
      {/* CONTENEDOR HORIZONTAL ESTILO TARJETA DE PRESENTACIÓN EJECUTIVA */}
      <div
        className="relative w-full max-w-3xl rounded-[32px] overflow-hidden my-auto shadow-2xl border border-white/90"
        style={{
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra superior */}
        <div className="px-6 py-4 border-b border-stone-200/80 flex items-center justify-between bg-white/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
              <QrCode className="w-4 h-4" />
            </div>
            <h3 className="font-black text-base text-stone-900">Tarjeta de Presentación Comercial con QR</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-stone-200/70 text-stone-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CUERPO HORIZONTAL DE LA TARJETA DE PRESENTACIÓN (2 COLUMNAS EN ESCRITORIO) */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-gradient-to-br from-white via-stone-50 to-amber-50/40">
          
          {/* LADO IZQUIERDO (7 COLUMNAS): IDENTIDAD, DIRECCIÓN, TELÉFONO Y WEB COMPLETA */}
          <div className="md:col-span-7 space-y-4 text-left border-b md:border-b-0 md:border-r border-stone-200/80 pb-6 md:pb-0 md:pr-6">
            <div className="flex items-center gap-4">
              {logoImg && (
                <div className="w-20 h-20 rounded-2xl border border-stone-200 p-2 bg-white shadow-sm shrink-0 flex items-center justify-center overflow-hidden">
                  <img src={logoImg} alt={business.name} className="max-h-full max-w-full object-contain" />
                </div>
              )}
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black uppercase tracking-wider">
                  {categoryName}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-stone-950 tracking-tight leading-tight mt-1">
                  {formatBusinessName(business.name)}
                </h2>
              </div>
            </div>

            {/* Dirección y Teléfono bien visibles */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-start gap-2.5 text-sm text-stone-700 font-medium">
                <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{addressDisplay}</span>
              </div>

              <div className="flex items-center gap-2.5 text-base font-black text-stone-900">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Tel / WhatsApp: {phoneDisplay}</span>
              </div>

              {/* Dirección Web Completa SIN truncar */}
              <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-800">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Dirección Web Oficial Completa:</span>
                </div>
                <p className="text-xs sm:text-sm font-mono font-bold text-stone-900 break-all select-all">
                  {fullWebUrl}
                  {copyError && <span role="alert">{copyError}</span>}
                </p>
              </div>
            </div>

            {/* Botones rápidos en la tarjeta */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Enlace copiado!' : 'Copiar Liga'}</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Compartir</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isGenerating}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isGenerating ? 'Generando PNG...' : 'Descargar Tarjeta (PNG)'}</span>
              </button>

              {onOpenClientPage && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenClientPage(business);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Landing Page</span>
                </button>
              )}
            </div>
          </div>

          {/* LADO DERECHO (5 COLUMNAS): CÓDIGO QR GRANDE */}
          <div className="md:col-span-5 flex flex-col items-center justify-center text-center">
            <div className="p-3.5 bg-white rounded-3xl border-2 border-stone-200 shadow-md">
              <img
                src={qrUrl}
                alt={`Código QR de ${business.name}`}
                className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-xl"
              />
            </div>
            <p className="text-xs font-bold text-stone-700 mt-3">
              Apunta la cámara del celular para abrir la ficha
            </p>
            <span className="text-[10px] font-semibold text-stone-400">
              Directorio Oficial · encarmen.org
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};

