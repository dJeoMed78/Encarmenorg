import React, { useState, useEffect } from 'react';
import { getSavedPortalLinks, getSavedFooterAd, PortalLinkButton, FooterAdConfig } from './AdminLinksAndAdsManager';

interface FooterProps {
  onAdminClick: () => void;
  onEmergencyClick?: () => void;
  onRegisterClick?: () => void;
  onEventsClick?: () => void;
}

export function Footer({ onAdminClick }: FooterProps) {
  const portalVersion = '231026:1000:PRO:V';
  const [footerLinks, setFooterLinks] = useState<PortalLinkButton[]>(() => 
    getSavedPortalLinks().filter((l) => l.group === 'footer')
  );
  const [footerAd, setFooterAd] = useState<FooterAdConfig>(() => getSavedFooterAd());

  useEffect(() => {
    const handleLinksUpdate = () => {
      setFooterLinks(getSavedPortalLinks().filter((l) => l.group === 'footer'));
    };
    const handleAdUpdate = () => {
      setFooterAd(getSavedFooterAd());
    };
    window.addEventListener('encarmen_links_updated', handleLinksUpdate);
    window.addEventListener('encarmen_footer_ad_updated', handleAdUpdate);
    return () => {
      window.removeEventListener('encarmen_links_updated', handleLinksUpdate);
      window.removeEventListener('encarmen_footer_ad_updated', handleAdUpdate);
    };
  }, []);

  return (
    <footer className="w-full bg-slate-950 text-stone-300 pt-14 pb-10 border-t border-white/10 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-white/10 items-center">
          {/* COLUMNA IZQUIERDA: LOGOTIPO + DESCRIPCIÓN + BOTONES CONFIGURABLES EN ADMIN > LIGAS */}
          <div className="md:col-span-6 space-y-5">
            <div className="inline-block bg-white/95 p-3 rounded-2xl shadow-md">
              <img src="/logo.png" alt="Empresas en Carmen" className="h-14 w-auto object-contain" />
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

          {/* COLUMNA DERECHA: ESPACIO PARA IMAGEN PUBLICITARIA (CONTROLADO EN ADMIN > PUBLICIDAD) */}
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
                Espacio publicitario disponible (Configurar en Administración &gt; Publicidad)
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
          <span>© 2026 encarmen.org · Ciudad del Carmen, Campeche · {portalVersion}</span>
          <button
            type="button"
            onClick={onAdminClick}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-amber-400 hover:text-stone-950 text-stone-200 border border-white/20 transition-all font-semibold cursor-pointer shadow-sm active:scale-95 group"
            title="Panel de Administración (π)"
          >
            <span className="font-serif text-base font-bold text-amber-400 group-hover:text-stone-950">π</span>
            <span>Administración</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
