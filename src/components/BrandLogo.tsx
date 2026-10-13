import React, { useState, useEffect } from 'react';
import { APP_VERSION } from '../constants/version';

interface BrandLogoProps {
  className?: string;
  showSubtitle?: boolean;
  width?: number | string;
  height?: number | string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  width = 300,
  height = 100
}) => {
  const [logoVersion, setLogoVersion] = useState(APP_VERSION);
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('portal_custom_logo') : null;
  });

  useEffect(() => {
    fetch('/api/portal-config')
      .then(res => res.json())
      .then(data => {
        if (data?.config?.logoUrl) {
          setCustomLogoUrl(data.config.logoUrl);
        }
      })
      .catch(() => {});

    const handleUpdate = () => {
      setLogoVersion(`${APP_VERSION}_${Date.now()}`);
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('portal_custom_logo');
        if (saved) setCustomLogoUrl(saved);
      }
      fetch('/api/portal-config')
        .then(res => res.json())
        .then(data => {
          if (data?.config?.logoUrl) setCustomLogoUrl(data.config.logoUrl);
        })
        .catch(() => {});
    };
    window.addEventListener('brand-media-updated', handleUpdate);
    return () => window.removeEventListener('brand-media-updated', handleUpdate);
  }, []);

  return (
    <img
      src={customLogoUrl || `/images/logo-oficial.png?v=${logoVersion}`}
      alt="Empresas en Carmen"
      width={width}
      height={height}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        minWidth: typeof width === 'number' ? `${width}px` : width,
        minHeight: typeof height === 'number' ? `${height}px` : height,
        maxWidth: typeof width === 'number' ? `${width}px` : width,
        maxHeight: typeof height === 'number' ? `${height}px` : height,
        objectFit: 'contain'
      }}
      className={`shrink-0 select-none cursor-pointer object-contain ${className}`}
      loading="eager"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.onerror = null;
        target.src = `/images/logo-empresasencarmen.png?v=${logoVersion}`;
      }}
    />
  );
};
