import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ExternalLink } from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  images: string[];
  initialIndex?: number;
  businessName?: string;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  images,
  initialIndex = 0,
  businessName = 'Trabajos y Servicios',
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  if (!isOpen || !images || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  const handlePrev = () => {
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 select-none animate-fadeIn"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div
        className="absolute top-0 inset-x-0 p-4 flex items-center justify-between text-white z-20 bg-gradient-to-b from-black/70 to-transparent"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm sm:text-base text-stone-200">
            {businessName}
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/15 text-amber-300">
            Foto {currentIndex + 1} de {images.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={currentImage}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir imagen original"
            className="p-2 rounded-full hover:bg-white/15 text-stone-300 hover:text-white transition-colors cursor-pointer"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/15 text-stone-300 hover:text-white transition-colors cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div
        className="relative max-w-5xl max-h-[82vh] w-full flex items-center justify-center px-2"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={currentImage}
          alt={`${businessName} - Foto ${currentIndex + 1}`}
          className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl transition-all"
        />

        {/* Previous Button */}
        {images.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-amber-500 hover:text-stone-950 text-white transition-all shadow-lg cursor-pointer group"
            title="Foto anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {images.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-2 sm:right-4 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-amber-500 hover:text-stone-950 text-white transition-all shadow-lg cursor-pointer group"
            title="Foto siguiente"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {images.length > 1 && (
        <div
          className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-2 px-4 overflow-x-auto py-2 z-20"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm p-1.5 rounded-2xl max-w-full overflow-x-auto">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 transition-all cursor-pointer border-2 ${
                  currentIndex === idx
                    ? 'border-amber-400 scale-105 shadow-md'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={img}
                  alt={`Miniatura ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
