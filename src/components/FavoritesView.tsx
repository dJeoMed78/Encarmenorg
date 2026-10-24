import React from 'react';
import { Bookmark, ArrowLeft, Trash2 } from 'lucide-react';
import { Business, Promotion } from '../types';
import { BusinessCard } from './BusinessCard';

interface FavoritesViewProps {
  favorites: Business[];
  onToggleFavorite: (b: Business) => void;
  onSelectBusiness: (b: Business) => void;
  onClearFavorites: () => void;
  onGoBack?: () => void;
  onOpenPromotion?: (promo: Promotion) => void;
  getActivePromoForBusiness?: (bizId: number) => Promotion | undefined;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  favorites,
  onToggleFavorite,
  onSelectBusiness,
  onClearFavorites,
  onGoBack,
  onOpenPromotion,
  getActivePromoForBusiness
}) => {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="space-y-1">
          {onGoBack && (
            <button
              onClick={onGoBack}
              className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 transition-colors font-medium mb-1 min-h-[32px] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a todos los negocios</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 fill-amber-500" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900">
              Mis Negocios Guardados ({favorites.length})
            </h2>
          </div>
          <p className="text-xs text-stone-500">
            Tus comercios y servicios guardados en este dispositivo para contactarlos rápidamente.
          </p>
        </div>

        {favorites.length > 0 && (
          <button
            onClick={onClearFavorites}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 hover:border-rose-300 text-stone-600 hover:text-rose-600 text-xs font-semibold bg-white transition-colors min-h-[40px] cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpiar todos</span>
          </button>
        )}
      </div>

      {/* Content */}
      {favorites.length === 0 ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 p-8 sm:p-16 text-center space-y-4 max-w-md mx-auto my-8 sm:my-12">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
            <Bookmark className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-stone-900">
              Aún no tienes negocios guardados
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Explora el directorio y pulsa el icono de marcador en cualquier tarjeta de negocio para
              guardarlo aquí y consultarlo cuando lo necesites.
            </p>
          </div>
          {onGoBack && (
            <button
              onClick={onGoBack}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors shadow-xs min-h-[42px] cursor-pointer"
            >
              Explorar Negocios
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {favorites.map(biz => (
            <BusinessCard
              key={biz.id}
              business={biz}
              onClick={() => onSelectBusiness && onSelectBusiness(biz)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
