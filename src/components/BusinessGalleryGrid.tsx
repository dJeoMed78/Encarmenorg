import React, { useState } from 'react';
import { Images, Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageLightboxModal } from './ImageLightboxModal';
import { formatImageUrl } from '../utils/businessUrl';

interface BusinessGalleryGridProps {
  gallery: string[];
  businessName: string;
  title?: string;
  dark?: boolean;
  onImageClick?: (index: number) => void;
}

export const BusinessGalleryGrid: React.FC<BusinessGalleryGridProps> = ({
  gallery,
  businessName,
  title = 'Galería de Fotos',
  dark = false,
  onImageClick
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  if (!gallery || gallery.length === 0) return null;

  const handleOpenImage = (idx: number) => {
    if (onImageClick) {
      onImageClick(idx);
    } else {
      setSelectedImageIndex(idx);
    }
  };

  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Images className={`w-4 h-4 ${dark ? 'text-amber-400' : 'text-amber-600'}`} />
            <h4
              className={`text-xs font-bold uppercase tracking-wider ${
                dark ? 'text-stone-300' : 'text-stone-700'
              }`}
            >
              {title}
            </h4>
          </div>
          <span className={`text-[11px] ${dark ? 'text-stone-400' : 'text-stone-500'}`}>
            {gallery.length} foto{gallery.length === 1 ? '' : 's'}
          </span>
        </div>
      )}

      {/* Thumbnails Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
        {gallery.map((imgUrl, index) => {
          const resolvedSrc = formatImageUrl(imgUrl);
          return (
            <div
              key={index}
              onClick={() => handleOpenImage(index)}
              className={`group relative aspect-square rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 ${
                dark
                  ? 'border-stone-800 bg-stone-900 hover:border-amber-400/80 shadow-md'
                  : 'border-stone-200 bg-stone-100 hover:border-amber-400 hover:shadow-md'
              }`}
            >
              <img
                src={resolvedSrc}
                alt={`${businessName} foto ${index + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="p-1.5 rounded-lg bg-black/60 text-white">
                  <Maximize2 className="w-4 h-4" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {selectedImageIndex !== null && (
        <ImageLightboxModal
          isOpen={true}
          images={gallery}
          initialIndex={selectedImageIndex}
          businessName={businessName}
          onClose={() => setSelectedImageIndex(null)}
        />
      )}
    </div>
  );
};
