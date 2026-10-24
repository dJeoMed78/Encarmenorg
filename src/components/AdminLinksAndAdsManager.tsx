import React, { useState } from 'react';
import { Link2, Megaphone, Save, Plus, Trash2, RotateCcw, ExternalLink, CheckCircle2 } from 'lucide-react';

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
  title?: string;
  imageUrl: string;
  targetUrl: string;
  altText: string;
}

export const DEFAULT_PORTAL_LINKS: PortalLinkButton[] = [
  {
    id: 'canal-fb-page',
    label: 'Página Oficial Facebook',
    sublabel: 'facebook.com/empresasencarmen',
    badge: 'PÁGINA',
    url: 'https://www.facebook.com/empresasencarmen',
    group: 'canales',
    color: 'blue'
  },
  {
    id: 'canal-fb-group',
    label: 'Grupo de Ventas Facebook',
    sublabel: 'Empresas en Carmen (Ventas)',
    badge: 'GRUPO FB',
    url: 'https://www.facebook.com/groups/506440126097710',
    group: 'canales',
    color: 'blue'
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
  {
    id: 'wa-grupo-1',
    label: 'Empresas en Carmen',
    sublabel: 'Comunidad WhatsApp 1',
    badge: 'GRUPO 1',
    url: 'https://api.whatsapp.com/send/?phone=%2B5219383895009',
    group: 'whatsapp',
    color: 'emerald'
  },
  {
    id: 'wa-grupo-2',
    label: 'Empresas en Carmen 2',
    sublabel: 'Comunidad WhatsApp 2',
    badge: 'GRUPO 2',
    url: 'https://api.whatsapp.com/send/?phone=%2B5219383895009',
    group: 'whatsapp',
    color: 'emerald'
  },
  {
    id: 'wa-comidas',
    label: 'Comidas en Carmen',
    sublabel: 'Restaurantes y antojitos',
    badge: 'COMIDAS',
    url: 'https://api.whatsapp.com/send/?phone=%2B5219383895009',
    group: 'whatsapp',
    color: 'emerald'
  },
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
  title: 'Espacio Publicitario Oficial - Anúnciate en encarmen.org',
  imageUrl: '/images/BANNER-NUEVO-EMPRESAS-EN-CARMEN.png',
  targetUrl: 'https://wa.me/529383895009?text=Hola,%20me%20interesa%20anunciarme%20en%20encarmen.org',
  altText: 'Espacio Publicitario Oficial - Anúnciate en encarmen.org'
};

export function getSavedPortalLinks(): PortalLinkButton[] {
  try {
    const raw = localStorage.getItem('encarmen_portal_links_v1');
    return raw ? JSON.parse(raw) : DEFAULT_PORTAL_LINKS;
  } catch {
    return DEFAULT_PORTAL_LINKS;
  }
}

export function getSavedFooterAd(): FooterAdConfig {
  try {
    const raw = localStorage.getItem('encarmen_footer_ad_v1');
    return raw ? JSON.parse(raw) : DEFAULT_FOOTER_AD;
  } catch {
    return DEFAULT_FOOTER_AD;
  }
}

export function getPortalLinksConfig() {
  const all = getSavedPortalLinks();
  return {
    officialChannels: all.filter((l) => l.group === 'canales'),
    whatsappCommunities: all.filter((l) => l.group === 'whatsapp'),
    footerLinks: all.filter((l) => l.group === 'footer')
  };
}

export function getPortalAdConfig(): FooterAdConfig {
  return getSavedFooterAd();
}

export const AdminLinksTab: React.FC = () => {
  const [links, setLinks] = useState<PortalLinkButton[]>(() => getSavedPortalLinks());
  const [savedMsg, setSavedMsg] = useState(false);

  const handleUpdate = (id: string, field: keyof PortalLinkButton, value: string) => {
    setLinks((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleSave = () => {
    localStorage.setItem('encarmen_portal_links_v1', JSON.stringify(links));
    window.dispatchEvent(new Event('storage'));
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  const handleReset = () => {
    setLinks(DEFAULT_PORTAL_LINKS);
    localStorage.setItem('encarmen_portal_links_v1', JSON.stringify(DEFAULT_PORTAL_LINKS));
    window.dispatchEvent(new Event('storage'));
  };

  const handleAdd = (group: 'canales' | 'whatsapp' | 'footer') => {
    const newItem: PortalLinkButton = {
      id: `${group}-${Date.now()}`,
      label: 'Nuevo Botón',
      sublabel: 'Subtítulo opcional',
      badge: 'NUEVO',
      url: 'https://encarmen.org',
      group,
      color: group === 'whatsapp' ? 'emerald' : 'blue'
    };
    setLinks((prev) => [...prev, newItem]);
  };

  const handleDelete = (id: string) => {
    setLinks((prev) => prev.filter((item) => item.id !== id));
  };

  const renderGroup = (title: string, groupKey: 'canales' | 'whatsapp' | 'footer') => {
    const groupItems = links.filter((l) => l.group === groupKey);
    return (
      <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-stone-800">
            {title}
          </h4>
          <button
            type="button"
            onClick={() => handleAdd(groupKey)}
            className="px-3 py-1.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Agregar Enlace</span>
          </button>
        </div>

        <div className="space-y-3">
          {groupItems.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/90 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
            >
              <div className="md:col-span-3">
                <label className="block text-[10px] font-extrabold uppercase text-stone-500 mb-1">
                  Etiqueta del Botón
                </label>
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => handleUpdate(item.id, 'label', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-stone-300 text-xs font-bold text-stone-900 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[10px] font-extrabold uppercase text-stone-500 mb-1">
                  Subtítulo / Info
                </label>
                <input
                  type="text"
                  value={item.sublabel || ''}
                  onChange={(e) => handleUpdate(item.id, 'sublabel', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-stone-300 text-xs text-stone-700 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-[10px] font-extrabold uppercase text-stone-500 mb-1">
                  URL de Destino
                </label>
                <input
                  type="text"
                  value={item.url}
                  onChange={(e) => handleUpdate(item.id, 'url', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-stone-300 text-xs font-mono text-stone-800 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-end gap-1.5">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Probar enlace"
                  className="p-2 rounded-lg bg-white hover:bg-stone-100 border border-stone-300 text-stone-700"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  title="Eliminar enlace"
                  className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 text-stone-800 pb-20">
      <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-sky-100 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-stone-900">
              Gestor de Ligas Oficiales y Comunidades
            </h3>
            <p className="text-xs text-stone-600">
              Edita los nombres y URLs de la barra superior iOS (Canales Oficiales y WhatsApp) y del pie de página.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Guardar Cambios</span>
          </button>
        </div>
      </div>

      {savedMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>¡Ligas guardadas y actualizadas en el portal!</span>
        </div>
      )}

      {renderGroup('Canales Oficiales (Barra Home: Facebook & TikTok)', 'canales')}
      {renderGroup('Comunidades WhatsApp (Barra Home)', 'whatsapp')}
      {renderGroup('Botones de Redes en el Pie de Página (Footer)', 'footer')}
    </div>
  );
};

export const AdminPublicidadTab: React.FC = () => {
  const [adConfig, setAdConfig] = useState<FooterAdConfig>(() => getSavedFooterAd());
  const [savedMsg, setSavedMsg] = useState(false);

  const handleSave = () => {
    localStorage.setItem('encarmen_footer_ad_v1', JSON.stringify(adConfig));
    window.dispatchEvent(new Event('storage'));
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  return (
    <div className="space-y-5 text-stone-800 pb-20">
      <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-pink-100 border border-pink-200 text-pink-700 flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-stone-900">
              Banner Publicitario del Footer
            </h3>
            <p className="text-xs text-stone-600">
              Reemplaza el antiguo bloque estático de "SECCIONES" en el pie de página.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Guardar Publicidad</span>
        </button>
      </div>

      {savedMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>¡Configuración de publicidad actualizada correctamente!</span>
        </div>
      )}

      <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs space-y-4">
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-extrabold text-stone-900">Estado de la Publicidad en Footer</h4>
            <p className="text-xs text-stone-600">Muestra u oculta el banner publicitario a todos los visitantes</p>
          </div>
          <button
            type="button"
            onClick={() => setAdConfig({ ...adConfig, enabled: !adConfig.enabled })}
            className={`px-4 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition ${
              adConfig.enabled
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-200 text-stone-700'
            }`}
          >
            {adConfig.enabled ? '✓ Activo' : 'Pausado'}
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-extrabold uppercase text-stone-700 mb-1">
              URL de la Imagen del Banner
            </label>
            <input
              type="text"
              value={adConfig.imageUrl}
              onChange={(e) => setAdConfig({ ...adConfig, imageUrl: e.target.value })}
              placeholder="/images/BANNER-NUEVO-EMPRESAS-EN-CARMEN.png"
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-xs sm:text-sm font-mono text-stone-900 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-stone-700 mb-1">
              Enlace de Destino al hacer Clic (WhatsApp o Sitio Web)
            </label>
            <input
              type="text"
              value={adConfig.targetUrl}
              onChange={(e) => setAdConfig({ ...adConfig, targetUrl: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-xs sm:text-sm font-mono text-stone-900 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-stone-700 mb-1">
              Título o Texto Alternativo
            </label>
            <input
              type="text"
              value={adConfig.altText}
              onChange={(e) => setAdConfig({ ...adConfig, altText: e.target.value, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-pink-500"
            />
          </div>
        </div>

        {adConfig.imageUrl && (
          <div className="pt-2">
            <div className="text-xs font-bold text-stone-600 mb-2">Vista Previa del Banner:</div>
            <img
              src={adConfig.imageUrl}
              alt={adConfig.altText}
              className="w-full max-w-xl h-44 object-cover rounded-2xl border border-stone-300 shadow-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
};
