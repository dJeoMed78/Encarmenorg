import React, { useEffect, useState } from 'react';
import { getSavedPortalLinks, getSavedFooterAd } from './AdminLinksAndAdsManager';
import { APP_COMMIT_SHA, APP_BUILD_TIMESTAMP } from '../constants/version';

interface FooterProps {
  onAdminClick: () => void;
  onEmergencyClick?: () => void;
  onRegisterClick?: () => void;
  onEventsClick?: () => void;
}

export function Footer({ onAdminClick }: FooterProps) {
  // Staging reads the active release identity, not the tracked source version.ts.
  // The deployment publishes this manifest atomically with the compiled bundle.
  const [release, setRelease] = useState<{sha: string; updatedAt: string} | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined' || window.location.hostname !== 'staging.encarmen.org') return;
    const controller = new AbortController();
    fetch('/encarmen-release.json', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Release manifest unavailable');
        return response.json();
      })
      .then(data => {
        if (typeof data?.sha !== 'string' || !/^[a-f0-9]{40}$/.test(data.sha) ||
            typeof data?.updatedAt !== 'string' || Number.isNaN(Date.parse(data.updatedAt))) return;
        setRelease({ sha: data.sha, updatedAt: data.updatedAt });
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const sha = release?.sha || APP_COMMIT_SHA;
  const stamp = release?.updatedAt || APP_BUILD_TIMESTAMP;
  const footerCommit = typeof sha === 'string' && /^[a-f0-9]{40}$/.test(sha)
    ? sha.slice(0, 12) : null;
  const buildDate = stamp ? new Date(stamp) : null;
  const footerUpdatedAt = buildDate && !Number.isNaN(buildDate.getTime())
    ? new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Merida', day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
      }).format(buildDate)
    : null;

  const footerLinks = getSavedPortalLinks().filter((l) => l.group === 'footer');
  const footerAd = getSavedFooterAd();

  return (
    <footer className="w-full bg-slate-950 text-stone-300 pt-14 pb-10 border-t border-white/10 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-white/10 items-center">
          {/* Columna Izquierda: Logotipo + Descripción + Redes */}
          <div className="md:col-span-6 space-y-5">
            <div className="inline-block bg-white/95 p-3 rounded-2xl shadow-md">
              <img
                src="/logo.png"
                alt="Empresas en Carmen"
                className="h-14 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <p className="text-xs sm:text-sm text-stone-400 max-w-lg leading-relaxed">
              Directorio empresarial interactivo de Ciudad del Carmen, Campeche.
              Conectando a ciudadanos y visitantes con comercios, talleres, servicios
              profesionales y restaurantes locales.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {footerLinks.map((pill) => (
                <a
                  key={pill.id}
                  href={pill.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-full text-xs font-bold text-white bg-white/15 hover:bg-amber-500 hover:text-stone-950 border border-white/20 transition-all shadow-sm active:scale-95"
                >
                  {pill.label}
                </a>
              ))}
            </div>
          </div>

          {/* Columna Derecha: Banner Publicitario */}
          <div className="md:col-span-6">
            {footerAd.enabled && footerAd.imageUrl ? (
              <a
                href={footerAd.targetUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-3xl overflow-hidden border border-white/15 shadow-xl hover:scale-[1.01] transition-transform bg-slate-900"
              >
                <img
                  src={footerAd.imageUrl}
                  alt={footerAd.altText || 'Publicidad Oficial'}
                  className="w-full h-48 sm:h-56 object-cover"
                />
              </a>
            ) : (
              <div className="w-full h-48 rounded-3xl border border-dashed border-white/20 flex items-center justify-center text-xs text-stone-500">
                Espacio publicitario disponible
              </div>
            )}
          </div>
        </div>

        {/* Barra Inferior: UN SOLO botón de acceso a Administración justo en el símbolo © + Fecha y Hora de actualización */}
        <div className="pt-6 flex items-center justify-center text-xs text-stone-400">
          <div className="flex items-center flex-wrap justify-center gap-1.5">
            <button
              type="button"
              onClick={onAdminClick}
              title="Acceso Administración"
              className="text-stone-400 hover:text-amber-400 transition-colors cursor-pointer font-normal px-0.5"
            >
              ©
            </button>
            <span>2026 encarmen.org · Ciudad del Carmen, Campeche · Commit: {footerCommit || 'no verificado'} · Actualización: {footerUpdatedAt || 'no verificada'}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
