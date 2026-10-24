import React from 'react';
import { X, Tag, Calendar, Sparkles, Building2, ExternalLink } from 'lucide-react';
import { Promotion } from '../types';

interface AllPromotionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotions: Promotion[];
  onSelectPromo: (promo: Promotion) => void;
}

export const AllPromotionsModal: React.FC<AllPromotionsModalProps> = ({
  isOpen,
  onClose,
  promotions,
  onSelectPromo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-white/60 font-sans"
        style={{
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* ENCABEZADO */}
        <div className="px-6 py-4 border-b border-gray-200/70 flex items-center justify-between bg-white/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                Promociones del Día
              </h2>
              <p className="text-xs text-gray-600 font-medium">
                {promotions.length} promociones y cupones oficiales activos en Ciudad del Carmen
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-200/80 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition active:scale-95 cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO SCROLLEABLE: GRID DE TODAS LAS PROMOCIONES */}
        <div className="flex-1 overflow-y-auto p-6">
          {promotions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Sparkles className="w-10 h-10 mx-auto text-amber-500 mb-3 opacity-60" />
              <p className="text-base font-bold text-gray-700">No hay más promociones activas hoy</p>
              <p className="text-xs text-gray-500 mt-1">Pronto se publicarán nuevos cupones de comercios locales.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  onClick={() => {
                    onSelectPromo(promo);
                    onClose();
                  }}
                  className="group cursor-pointer rounded-2xl overflow-hidden border border-gray-200/80 bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] flex flex-col"
                >
                  {/* IMAGEN DE LA PROMOCIÓN */}
                  <div className="w-full h-44 relative bg-gray-100 overflow-hidden">
                    <img
                      src={promo.promoImage || promo.businessImage || '/images/categories/cuidado-y-belleza-personal.jpg'}
                      alt={promo.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/categories/cuidado-y-belleza-personal.jpg';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {promo.discount && (
                      <span className="absolute top-3 right-3 bg-rose-600 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-md tracking-wider">
                        {promo.discount}
                      </span>
                    )}

                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                      <Building2 className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[180px]">{promo.businessName}</span>
                    </div>
                  </div>

                  {/* DETALLES */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition leading-snug line-clamp-2">
                        {promo.title}
                      </h3>
                      {promo.description && (
                        <p className="text-xs text-gray-600 line-clamp-2 mt-1.5 leading-relaxed">
                          {promo.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between">
                      {promo.validUntil ? (
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {promo.validUntil}
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 font-semibold">Cupón Activo</span>
                      )}

                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Ver Cupón</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
