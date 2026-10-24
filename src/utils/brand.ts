import React from 'react';

export interface BrandConfig {
  id: 'empresasencarmen' | 'encarmen';
  name: string;
  domain: string;
  logoUrl: string;
  fallbackLogoUrl: string;
  altText: string;
  tagline: string;
}

export const BRAND_CONFIGS: Record<'empresasencarmen' | 'encarmen', BrandConfig> = {
  empresasencarmen: {
    id: 'empresasencarmen',
    name: 'Empresas en Carmen',
    domain: 'empresasencarmen.com',
    logoUrl: '/images/logo-oficial.png',
    fallbackLogoUrl: '/images/logo-empresasencarmen.png',
    altText: 'Empresas en Carmen - Directorio Comercial',
    tagline: 'Directorio empresarial interactivo de Ciudad del Carmen, Campeche.'
  },
  encarmen: {
    id: 'encarmen',
    name: 'En Carmen',
    domain: 'encarmen.org',
    logoUrl: '/images/logo-oficial.png',
    fallbackLogoUrl: '/images/logo-empresasencarmen.png',
    altText: 'En Carmen - Directorio Comercial',
    tagline: 'Directorio comercial y comunitario de Ciudad del Carmen, Campeche.'
  }
};

export function getBrandConfig(): BrandConfig {
  if (typeof window === 'undefined') return BRAND_CONFIGS.empresasencarmen;
  try {
    const host = window.location.host.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const brandParam = params.get('brand') || params.get('portal') || params.get('site');
    
    if (brandParam === 'encarmen' || (!brandParam && host.includes('encarmen.org'))) {
      return BRAND_CONFIGS.encarmen;
    }
    if (brandParam === 'empresasencarmen' || (!brandParam && host.includes('empresasencarmen.com'))) {
      return BRAND_CONFIGS.empresasencarmen;
    }
    
    const saved = localStorage.getItem('portal_brand_pref');
    if (saved === 'encarmen') return BRAND_CONFIGS.encarmen;
    if (saved === 'empresasencarmen') return BRAND_CONFIGS.empresasencarmen;

    return host.includes('encarmen.org') ? BRAND_CONFIGS.encarmen : BRAND_CONFIGS.empresasencarmen;
  } catch (e) {
    console.error('Error detecting brand:', e);
    return BRAND_CONFIGS.empresasencarmen;
  }
}

export function setBrandPreference(brandId: 'empresasencarmen' | 'encarmen'): void {
  try {
    localStorage.setItem('portal_brand_pref', brandId);
    window.dispatchEvent(new Event('brand_changed'));
  } catch {}
}

export function useBrandConfig() {
  const [brand, setBrandState] = React.useState<BrandConfig>(getBrandConfig);

  React.useEffect(() => {
    const handler = () => {
      setBrandState(getBrandConfig());
    };
    window.addEventListener('brand_changed', handler);
    return () => {
      window.removeEventListener('brand_changed', handler);
    };
  }, []);

  return {
    brand,
    setBrand: (id: 'empresasencarmen' | 'encarmen') => {
      setBrandPreference(id);
      setBrandState(BRAND_CONFIGS[id]);
    }
  };
}
