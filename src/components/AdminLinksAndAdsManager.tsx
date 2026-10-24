import React, { useState, useEffect } from 'react';
import { Link2, Image as ImageIcon, Save, Plus, Trash2, CheckCircle2, ExternalLink, RotateCcw } from 'lucide-react';

export interface PortalLinkButton {
  id: string;
  label: string;
  sublabel?: string;
  url: string;
  group: 'canales' | 'whatsapp' | 'footer';
  badge?: string;
  color: string;
}

export interface FooterAdConfig {
  enabled: boolean;
  imageUrl: string;
  targetUrl: string;
  altText: string;
}

export const DEFAULT_PORTAL_LINKS: PortalLinkButton[] = [
  // Canales Oficiales (Horizontal Home)
  {
    id: 'canal-fb-page',
    label: 'Empresas en Carmen',
    sublabel: 'facebook.com/empresasencarmen',
    badge: 'PÁGINA',
    url: 'https://www.facebook.com/empresasencarmen',
    group: 'canales',
    color: 'blue'
  },
  {
    id: 'canal-fb-group',
    label: 'Grupo de Ventas',
    sublabel: 'Empresas en Carmen (Ventas)',
    badge: 'GRUPO FB',
    url: 'https://www.facebook.com/groups/506440126097710',
    group: 'canales',
    color: 'indigo'
  },
  {
    id: 'canal-tiktok',
    label: 'TikTok Oficial',
    sublabel: '@empresasencarmen',
    badge: 'TIKTOK',
    url: 'https://www.tiktok.com/@empresasencarmen',
    group: 'canales',
    color: 'slate'
  },
  // Comunidades WhatsApp (Horizontal Home)
  {
    id: 'wa-grupo-1',
    label: 'Empresas en Carmen',
    sublabel: 'Unirme a la comunidad',
    badge: 'GRUPO 1',
    url: 'https://api.whatsapp.com/send/?phone=%2B5219383895009',
    group: 'whatsapp',
    color: 'emerald'
  },
  {
    id: 'wa-grupo-2',
    label: 'Empresas en Carmen 2',
    sublabel: 'Unirme a la comunidad',
    badge: 'GRUPO 2',
    url: 'https://api.whatsapp.com/send/?phone=%2B5219383895009',
    group: 'whatsapp',
    color: 'teal'
  },
  {
    id: 'wa-comidas',
    label: 'Comidas en Carmen',
    sublabel: 'Restaurantes y antojitos',
    badge: 'GASTRONOMÍA',
    url: 'https://api.whatsapp.com/send/?phone=%2B5219383895009',
    group: 'whatsapp',
    color: 'amber'
  },
  // Botones del Footer
  {
    id: 'footer-fb',
    label: 'Facebook',
    url: 'https://www.facebook.com/empresasencarmen',
    group: 'footer',
    color: 'blue'
  },
  {
    id: 'footer-ventas',
    label: 'Grupo Ventas',
    url: 'https://www.facebook.com/groups/506440126097710',
    group: 'footer',
    color: 'indigo'
  },
  {
    id: 'footer-wa',
    label: 'WhatsApp',
    url: 'https://api.whatsapp.com/send/?phone=%2B5219383895009',
    group: 'footer',
    color: 'emerald'
  }
];

export const DEFAULT_FOOTER_AD: FooterAdConfig = {
  enabled: true,
  imageUrl: '/images/BANNER-NUEVO-EMPRESAS-EN-CARMEN.png',
  targetUrl: 'https://wa.me/529383895009?text=Hola,%20me%20interesa%20anunciarme%20en%20encarmen.org',
  altText: 'Espacio Publicitario Oficial - Anúnciate en encarmen.org'
};

export function getSavedPortalLinks(): PortalLinkButton[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('encarmen_portal_links_v1') : null;
    return raw ? JSON.parse(raw) : DEFAULT_PORTAL_LINKS;
  } catch {
    return DEFAULT_PORTAL_LINKS;
  }
}

export function savePortalLinks(links: PortalLinkButton[]): void {
  try {
    localStorage.setItem('encarmen_portal_links_v1', JSON.stringify(links));
    window.dispatchEvent(new Event('encarmen_links_updated'));
  } catch {}
}

export function getSavedFooterAd(): FooterAdConfig {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('encarmen_footer_ad_v1') : null;
    return raw ? JSON.parse(raw) : DEFAULT_FOOTER_AD;
  } catch {
    return DEFAULT_FOOTER_AD;
  }
}

export function saveFooterAd(ad: FooterAdConfig): void {
  try {
    localStorage.setItem('encarmen_footer_ad_v1', JSON.stringify(ad));
    window.dispatchEvent(new Event('encarmen_footer_ad_updated'));
  } catch {}
}

export function getPortalLinksConfig() {
  const links = getSavedPortalLinks();
  return {
    officialChannels: links.filter(l => l.group === 'canales'),
    whatsappCommunities: links.filter(l => l.group === 'whatsapp'),
    footerLinks: links.filter(l => l.group === 'footer')
  };
}

export function getPortalAdConfig() {
  const ad = getSavedFooterAd();
  return {
    enabled: ad.enabled,
    imageUrl: ad.imageUrl,
    targetUrl: ad.targetUrl,
    title: ad.altText || 'Publicidad Oficial'
  };
}

// COMPONENTE: Pestaña "LIGAS" en Administración
export const AdminLinksTab: React.FC = () => {
  const [links, setLinks] = useState<PortalLinkButton[]>(() => getSavedPortalLinks());
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleUpdate = (id: string, field: keyof PortalLinkButton, val: string) => {
    setLinks(prev => prev.map(l => l.id === id ? { ...l, [field]: val } : l));
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar este enlace?')) {
      setLinks(prev => prev.filter(l => l.id !== id));
    }
  };

  const handleAdd = (group: 'canales' | 'whatsapp' | 'footer') => {
    const newLink: PortalLinkButton = {
      id: `link-${Date.now()}`,
      label: 'Nuevo Enlace',
      sublabel: 'Descripción breve',
      url: 'https://',
      group,
      badge: group === 'canales' ? 'RED' : group === 'whatsapp' ? 'GRUPO' : undefined,
      color: group === 'whatsapp' ? 'emerald' : 'blue'
    };
    setLinks(prev => [...prev, newLink]);
  };

  const handleSave = () => {
    savePortalLinks(links);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleReset = () => {
    if (confirm('¿Restablecer los enlaces oficiales a los valores por defecto?')) {
      setLinks(DEFAULT_PORTAL_LINKS);
      savePortalLinks(DEFAULT_PORTAL_LINKS);
    }
  };

  return (
    <div className="space-y-6 text-white max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/25 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Gestor de Ligas Oficiales y Comunidades</h3>
            <p className="text-xs text-sky-200/70">Edita los nombres y URLs de la barra superior iOS y del pie de página</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Cambios</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>¡Ligas actualizadas y guardadas con éxito en el portal!</span>
        </div>
      )}

      {/* GRUPOS */}
      {(['canales', 'whatsapp', 'footer'] as const).map(group => {
        const groupLinks = links.filter(l => l.group === group);
        const groupTitle = group === 'canales' 
          ? 'Canales Oficiales (Barra Home: Facebook & TikTok)' 
          : group === 'whatsapp' 
          ? 'Comunidades WhatsApp (Barra Home: Grupos 1, 2 y Gastronomía)' 
          : 'Botones Sociales del Footer';

        return (
          <div key={group} className="p-5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider text-amber-300">
                {groupTitle}
              </h4>
              <button
                type="button"
                onClick={() => handleAdd(group)}
                className="px-2.5 py-1 rounded-lg bg-sky-500/25 hover:bg-sky-500/40 text-sky-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Enlace</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {groupLinks.map(link => (
                <div key={link.id} className="p-3 rounded-xl bg-black/40 border border-white/10 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                  <div className="sm:col-span-3">
                    <label className="text-[10px] uppercase font-bold text-sky-200/60 block mb-0.5">Etiqueta</label>
                    <input
                      type="text"
                      value={link.label}
                      onChange={e => handleUpdate(link.id, 'label', e.target.value)}
                      className="w-full px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-xs text-white focus:outline-none focus:border-amber-300"
                    />
                  </div>

                  {group !== 'footer' && (
                    <div className="sm:col-span-3">
                      <label className="text-[10px] uppercase font-bold text-sky-200/60 block mb-0.5">Subtítulo / Info</label>
                      <input
                        type="text"
                        value={link.sublabel || ''}
                        onChange={e => handleUpdate(link.id, 'sublabel', e.target.value)}
                        className="w-full px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-xs text-white focus:outline-none focus:border-amber-300"
                      />
                    </div>
                  )}

                  <div className={group === 'footer' ? 'sm:col-span-7' : 'sm:col-span-4'}>
                    <label className="text-[10px] uppercase font-bold text-sky-200/60 block mb-0.5">URL de Destino</label>
                    <input
                      type="text"
                      value={link.url}
                      onChange={e => handleUpdate(link.id, 'url', e.target.value)}
                      className="w-full px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-xs text-white font-mono focus:outline-none focus:border-amber-300"
                    />
                  </div>

                  {group !== 'footer' && (
                    <div className="sm:col-span-1">
                      <label className="text-[10px] uppercase font-bold text-sky-200/60 block mb-0.5">Badge</label>
                      <input
                        type="text"
                        value={link.badge || ''}
                        onChange={e => handleUpdate(link.id, 'badge', e.target.value)}
                        className="w-full px-1.5 py-1 rounded-lg bg-white/10 border border-white/20 text-[10px] text-center font-bold text-amber-300 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="sm:col-span-1 flex items-center justify-end gap-1 pt-3 sm:pt-0">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                      title="Probar enlace"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(link.id)}
                      className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// COMPONENTE: Pestaña "PUBLICIDAD" en Administración
export const AdminPublicidadTab: React.FC = () => {
  const [ad, setAd] = useState<FooterAdConfig>(() => getSavedFooterAd());
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    saveFooterAd(ad);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 text-white max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/25 border border-pink-400/40 flex items-center justify-center text-pink-300">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Banner Publicitario del Footer</h3>
            <p className="text-xs text-sky-200/70">Reemplaza el antiguo bloque estático de "SECCIONES" en el pie de página</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Guardar Publicidad</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>¡Banner publicitario guardado con éxito! Se refleja en el footer.</span>
        </div>
      )}

      <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 space-y-4">
        {/* Interruptor Activar / Desactivar */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/40 border border-white/10">
          <div>
            <div className="font-bold text-white text-sm">Estado de la Publicidad en Footer</div>
            <p className="text-xs text-sky-200/70">Muestra u oculta el banner publicitario a todos los visitantes</p>
          </div>
          <button
            type="button"
            onClick={() => setAd(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`px-4 py-2 rounded-xl font-bold text-xs cursor-pointer transition ${
              ad.enabled ? 'bg-emerald-500 text-slate-950' : 'bg-stone-700 text-stone-300'
            }`}
          >
            {ad.enabled ? '✓ Activo' : 'Pausado'}
          </button>
        </div>

        {/* URL de Imagen */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-sky-200/70 block mb-1">
            URL de la Imagen del Banner
          </label>
          <input
            type="text"
            value={ad.imageUrl}
            onChange={e => setAd(prev => ({ ...prev, imageUrl: e.target.value }))}
            placeholder="/images/BANNER-NUEVO-EMPRESAS-EN-CARMEN.png o URL externa"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-xs text-white focus:outline-none focus:border-pink-400 font-mono"
          />
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-sky-200/60">Presets rápidos:</span>
            <button
              type="button"
              onClick={() => setAd(prev => ({ ...prev, imageUrl: '/images/BANNER-NUEVO-EMPRESAS-EN-CARMEN.png' }))}
              className="text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              Banner Oficial
            </button>
            <button
              type="button"
              onClick={() => setAd(prev => ({ ...prev, imageUrl: '/puente.jpg' }))}
              className="text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              Puente Zacatal
            </button>
          </div>
        </div>

        {/* URL de Destino al dar clic */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-sky-200/70 block mb-1">
            Enlace de Destino al hacer clic en el banner
          </label>
          <input
            type="text"
            value={ad.targetUrl}
            onChange={e => setAd(prev => ({ ...prev, targetUrl: e.target.value }))}
            placeholder="https://wa.me/... o URL web"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-xs text-white focus:outline-none focus:border-pink-400 font-mono"
          />
        </div>

        {/* Texto Alternativo / Título */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-sky-200/70 block mb-1">
            Texto Alternativo / Título Descriptivo
          </label>
          <input
            type="text"
            value={ad.altText}
            onChange={e => setAd(prev => ({ ...prev, altText: e.target.value }))}
            placeholder="Espacio Publicitario Oficial - Anúnciate aquí"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-xs text-white focus:outline-none focus:border-pink-400"
          />
        </div>

        {/* Vista Previa del Banner */}
        <div className="pt-2">
          <label className="text-xs font-bold uppercase tracking-wider text-sky-200/70 block mb-2">
            Vista Previa en Tiempo Real:
          </label>
          <div className="rounded-2xl overflow-hidden border border-white/20 bg-slate-950 p-2 shadow-inner">
            {ad.imageUrl ? (
              <img
                src={ad.imageUrl}
                alt={ad.altText}
                className="w-full h-44 sm:h-52 object-cover rounded-xl"
                onError={e => {
                  (e.target as HTMLImageElement).src = '/images/BANNER-NUEVO-EMPRESAS-EN-CARMEN.png';
                }}
              />
            ) : (
              <div className="w-full h-44 flex items-center justify-center text-xs text-stone-500">
                Sin imagen seleccionada
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
