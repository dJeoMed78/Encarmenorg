import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  ExternalLink,
  QrCode,
  MapPin,
  Phone,
  Sparkles,
  Award
} from 'lucide-react';
import { Business } from '../types';
import {
  getBusinessPublicUrl,
  getBusinessDisplayUrl,
  getBusinessPrimaryCategory,
  getBusinessImageUrl
} from '../utils/businessUrl';
import { formatPhoneNumber } from '../utils/phone';

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
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [logoImg, setLogoImg] = useState<string | null>(null);

  useEffect(() => {
    if (business) {
      setLogoImg(getBusinessImageUrl(business) || null);
    }
  }, [business]);

  if (!isOpen || !business) return null;

  const publicUrl = getBusinessPublicUrl(business);
  const displayUrl = getBusinessDisplayUrl(business);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(
    publicUrl
  )}`;
  const categoryName = getBusinessPrimaryCategory(business);

  const getFullAddress = () => {
    if (business.address && business.address.trim().length > 3) {
      return business.address.trim();
    }
    return business.colonia
      ? `Col. ${business.colonia}, Ciudad del Carmen`
      : 'Ciudad del Carmen, Campeche';
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleShare = async () => {
    const title = `${business.name} | Empresas en Carmen`;
    const text = `Consulta la ficha y tarjeta comercial de ${business.name} en el Directorio Oficial de Empresas en Carmen:\n${publicUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: publicUrl });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadImage = async () => {
    setIsGenerating(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      canvas.width = 800;
      canvas.height = 1120;

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Border
      ctx.lineWidth = 14;
      ctx.strokeStyle = '#1c1917';
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

      // Top line
      ctx.strokeStyle = '#e7e5e4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(40, 140);
      ctx.lineTo(canvas.width - 40, 140);
      ctx.stroke();

      // Brand
      ctx.fillStyle = '#0f6874';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('EMPRESAS EN CARMEN', canvas.width - 340, 75);

      ctx.fillStyle = '#ff5700';
      ctx.font = 'italic bold 23px Impact, system-ui, sans-serif';
      ctx.fillText('.ORG', canvas.width - 95, 75);

      ctx.fillStyle = '#78716c';
      ctx.font = '13px system-ui, -apple-system, sans-serif';
      ctx.fillText('DIRECTORIO EMPRESARIAL', canvas.width - 340, 98);

      // Category badge
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(40, 165, 270, 32);
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText(categoryName.toUpperCase(), 50, 187);

      let offsetBadge = 325;
      if (business.isTopBusiness) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(offsetBadge, 165, 80, 32);
        ctx.fillStyle = '#0c0a09';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillText('★ TOP', offsetBadge + 12, 187);
        offsetBadge += 90;
      }

      // Name
      ctx.fillStyle = '#0c0a09';
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
      const nameText =
        business.name.length > 32 ? business.name.slice(0, 30) + '...' : business.name;
      ctx.fillText(nameText.toUpperCase(), 40, 245);

      // Address & phone
      ctx.fillStyle = '#44403c';
      ctx.font = '17px system-ui, sans-serif';
      const addr = getFullAddress();
      ctx.fillText(`📍 ${addr.slice(0, 68)}`, 40, 285);

      ctx.fillStyle = '#0c0a09';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(
        `📞 Tel / WhatsApp: ${formatPhoneNumber(business.phone || business.whatsapp) || 'Disponible en web'}`,
        40,
        315
      );

      // URL bar
      ctx.fillStyle = '#fef3c7';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.fillRect(40, 332, canvas.width - 80, 48);
      ctx.strokeRect(40, 332, canvas.width - 80, 48);
      ctx.fillStyle = '#92400e';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🌐 PÁGINA WEB:', canvas.width / 2, 349);
      ctx.font = 'bold 18px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(displayUrl, canvas.width / 2, 370);
      ctx.textAlign = 'left';

      // Description box
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 3;
      ctx.fillStyle = '#fafaf9';
      ctx.fillRect(40, 400, canvas.width - 80, 195);
      ctx.strokeRect(40, 400, canvas.width - 80, 195);
      ctx.fillStyle = '#78716c';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText('DESCRIPCIÓN DE PRODUCTOS Y SERVICIOS', 60, 432);

      ctx.fillStyle = '#292524';
      ctx.font = '16px system-ui, sans-serif';
      const words = (
        business.description || 'Consulta nuestros servicios y productos en Ciudad del Carmen.'
      ).split(' ');
      let line = '';
      let y = 465;
      for (const w of words) {
        const testLine = line + w + ' ';
        if (ctx.measureText(testLine).width > canvas.width - 130 && line.length > 0) {
          ctx.fillText(line, 60, y);
          line = w + ' ';
          y += 28;
          if (y > 575) break;
        } else {
          line = testLine;
        }
      }
      if (line && y <= 575) ctx.fillText(line, 60, y);

      // Load QR code image onto canvas
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      await new Promise(res => {
        qrImg.onload = res;
        qrImg.onerror = res;
        qrImg.src = qrUrl;
      });
      ctx.drawImage(qrImg, canvas.width / 2 - 120, 620, 240, 240);

      // QR label
      ctx.fillStyle = '#0c0a09';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ESCANEA EL CÓDIGO QR PARA ABRIR EL PERFIL DIRECTO', canvas.width / 2, 895);

      // Bottom footer
      ctx.strokeStyle = '#e7e5e4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, 930);
      ctx.lineTo(canvas.width - 40, 930);
      ctx.stroke();

      ctx.fillStyle = '#78716c';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText('EMPRESASENCARMEN.COM · ENCARMEN.ORG · CIUDAD DEL CARMEN, CAMPECHE', canvas.width / 2, 960);

      // Download
      const link = document.createElement('a');
      link.download = `tarjeta-digital-${business.slug || business.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error generating card image:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-stone-200 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-stone-100 bg-stone-50/80">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-base text-stone-900">Tarjeta Comercial con QR</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-200 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Body */}
        <div ref={cardRef} className="p-5 sm:p-6 space-y-5 text-center">
          {/* Logo & Category */}
          <div className="space-y-2">
            {logoImg && (
              <div className="w-20 h-20 mx-auto rounded-2xl border border-stone-200 p-2 bg-white shadow-sm overflow-hidden flex items-center justify-center">
                <img
                  src={logoImg}
                  alt={business.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}
            <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider">
              {categoryName}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              {business.name}
            </h2>
            <p className="text-xs text-stone-500 max-w-sm mx-auto line-clamp-2">
              {getFullAddress()}
            </p>
          </div>

          {/* QR Code Container */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 inline-block shadow-inner">
            <img
              src={qrUrl}
              alt={`Código QR de ${business.name}`}
              className="w-48 h-48 sm:w-56 sm:h-56 mx-auto rounded-xl bg-white p-2 shadow-xs"
            />
            <p className="text-[11px] text-stone-500 mt-2 font-medium">
              Apunta la cámara del celular para abrir la ficha
            </p>
          </div>

          {/* Web link */}
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-mono text-amber-900 flex items-center justify-between gap-2 max-w-md mx-auto">
            <a
              href={displayUrl.startsWith('http') ? displayUrl : `https://${displayUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate hover:underline text-amber-950 font-bold flex items-center gap-1 cursor-pointer"
              title="Abrir enlace en nueva pestaña"
            >
              <span className="truncate">{displayUrl}</span>
              <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
            </a>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 font-sans font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
              {onOpenClientPage && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenClientPage(business);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 font-sans font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                  title="Abrir Landing Page oficial"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Landing Page</span>
                </button>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-bold shadow-md transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartir</span>
            </button>

            <button
              onClick={handleDownloadImage}
              disabled={isGenerating}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? 'Generando...' : 'Descargar Tarjeta'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
