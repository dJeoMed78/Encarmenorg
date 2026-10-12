import React, { useState, useEffect, useRef } from 'react';
import { Upload, CheckCircle2, Image as ImageIcon, Sparkles, RefreshCw, AlertCircle, ArrowUpRight } from 'lucide-react';

export const AdminBrandMediaTab: React.FC = () => {
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [currentBannerUrl, setCurrentBannerUrl] = useState<string>('/images/banner-empresas-en-carmen.png');
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string>('/images/logo-oficial.png');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now());

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/admin/banner-and-logo')
      .then(res => res.json())
      .then(data => {
        if (data.bannerUrl) setCurrentBannerUrl(data.bannerUrl);
        if (data.logoUrl) setCurrentLogoUrl(data.logoUrl);
      })
      .catch(() => {});
  }, [cacheBuster]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor selecciona un archivo de imagen válido (PNG, JPG o WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      if (type === 'banner') {
        setBannerPreview(b64);
      } else {
        setLogoPreview(b64);
      }
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAndDeploy = async () => {
    if (!bannerPreview && !logoPreview) {
      setErrorMsg('Selecciona al menos una imagen (banner o logo) para actualizar.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/banner-and-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bannerBase64: bannerPreview,
          logoBase64: logoPreview,
          commitAndPush: true
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg('¡Imágenes actualizadas y desplegadas en producción (encarmen.org) con éxito!');
        setBannerPreview(null);
        setLogoPreview(null);
        setCacheBuster(Date.now());
        window.dispatchEvent(new Event('brand-media-updated'));
        setTimeout(() => setSuccessMsg(null), 8000);
      } else {
        setErrorMsg(data.message || 'Error al guardar imágenes');
      }
    } catch (err: any) {
      setErrorMsg('Error de red o servidor: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Info Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-900 to-indigo-950 text-white border border-sky-700/50 shadow-md">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-sky-500/20 border border-sky-400/30 text-sky-300 shrink-0">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-base sm:text-lg tracking-tight flex items-center gap-2">
              <span>Gestión de Banner Panorámico y Logo Oficial</span>
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Producción en vivo
              </span>
            </h3>
            <p className="text-xs sm:text-sm text-sky-200/90 leading-relaxed">
              Sube tus imágenes originales directamente desde tu dispositivo. Al guardar, se actualizan al instante en la vista previa y se publican automáticamente en el servidor de producción (<strong>encarmen.org</strong>).
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-semibold flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-sm font-semibold flex items-center gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Banner Section */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-sky-600" />
                <span>1. Banner Panorámico del Buscador</span>
              </h4>
              <span className="text-[10px] text-stone-400 font-mono">100% responsivo</span>
            </div>

            <p className="text-xs text-stone-600">
              Ajustado automáticamente al ancho de la pantalla para que todo el texto y el delfín sean completamente legibles.
            </p>

            {/* Current vs New Preview */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                {bannerPreview ? 'Nueva imagen seleccionada (Previa):' : 'Banner actual activo:'}
              </span>
              <div className="w-full bg-[#07111e] rounded-xl overflow-hidden border border-stone-300 p-2 flex items-center justify-center min-h-[120px]">
                <img
                  src={bannerPreview || `${currentBannerUrl}?v=${cacheBuster}`}
                  alt="Banner"
                  className="w-full h-auto max-h-[140px] object-contain block rounded-lg shadow-xs"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <input
              type="file"
              ref={bannerInputRef}
              onChange={(e) => handleFileChange(e, 'banner')}
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-xl border border-sky-600/40 hover:border-sky-600 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Upload className="w-4 h-4 text-sky-600" />
              <span>{bannerPreview ? 'Cambiar archivo de Banner' : 'Seleccionar Nuevo Banner Panorámico'}</span>
            </button>
          </div>
        </div>

        {/* Logo Section */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>2. Logo Oficial Original</span>
              </h4>
              <span className="text-[10px] text-stone-400 font-mono">Barra de navegación</span>
            </div>

            <p className="text-xs text-stone-600">
              Logo auténtico de Empresas en Carmen con el emblema circular del delfín y tipografía oficial.
            </p>

            {/* Current vs New Preview */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                {logoPreview ? 'Nuevo logo seleccionado (Previa):' : 'Logo actual activo:'}
              </span>
              <div className="w-full bg-stone-50 rounded-xl overflow-hidden border border-stone-300 p-4 flex items-center justify-center min-h-[120px]">
                <img
                  src={logoPreview || `${currentLogoUrl}?v=${cacheBuster}`}
                  alt="Logo"
                  className="h-14 sm:h-16 w-auto object-contain block drop-shadow-xs"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <input
              type="file"
              ref={logoInputRef}
              onChange={(e) => handleFileChange(e, 'logo')}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-xl border border-amber-600/40 hover:border-amber-600 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Upload className="w-4 h-4 text-amber-700" />
              <span>{logoPreview ? 'Cambiar archivo de Logo' : 'Seleccionar Logo Original'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Save & Publish Action Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-stone-600 text-center sm:text-left">
          <p className="font-semibold text-stone-900">
            {bannerPreview || logoPreview
              ? 'Archivos listos para guardar y publicar.'
              : 'Selecciona una imagen arriba para habilitar la publicación.'}
          </p>
          <p className="text-stone-500 text-[11px] mt-0.5">
            Se actualizarán los archivos locales en <code className="bg-stone-100 px-1 py-0.5 rounded font-mono text-stone-700">public/images/</code> y se sincronizarán con GitHub.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAndDeploy}
          disabled={isSaving || (!bannerPreview && !logoPreview)}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>Publicando en Producción...</span>
            </>
          ) : (
            <>
              <ArrowUpRight className="w-4 h-4 text-white" />
              <span>Guardar y Publicar en Producción</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
