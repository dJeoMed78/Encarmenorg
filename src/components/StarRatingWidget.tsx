import React, { useState, useEffect } from 'react';
import { Star, CheckCircle, Award, Sparkles, Loader2 } from 'lucide-react';
import { getVisitorId, hasVisitorRatedBusiness, getVisitorRating, saveLocalRating } from '../utils/ratings';
import { submitBusinessRating, fetchBusinessRating, BusinessRatingStats } from '../services/api';

interface StarRatingWidgetProps {
  businessId: number | string;
  businessName: string;
  initialRating?: number;
  initialReviewCount?: number;
  onRatingUpdated?: (newAverage: number, newCount: number) => void;
  compact?: boolean;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Malo',
  2: 'Regular',
  3: 'Bueno',
  4: 'Muy Bueno',
  5: 'Excelente'
};

export const StarRatingWidget: React.FC<StarRatingWidgetProps> = ({
  businessId,
  businessName,
  initialRating = 5.0,
  initialReviewCount = 0,
  onRatingUpdated,
  compact = false
}) => {
  const [visitorId] = useState<string>(() => getVisitorId());
  const [hasRated, setHasRated] = useState<boolean>(() => hasVisitorRatedBusiness(businessId));
  const [userRating, setUserRating] = useState<number | null>(() => getVisitorRating(businessId));
  
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [stats, setStats] = useState<BusinessRatingStats>({
    average: Number(initialRating) || 5.0,
    count: Number(initialReviewCount) || 0
  });

  // Sync latest stats from server
  useEffect(() => {
    let isMounted = true;
    fetchBusinessRating(businessId, visitorId).then(res => {
      if (!isMounted) return;
      setStats(prev => ({
        ...prev,
        average: res.average || prev.average,
        count: res.count !== undefined ? res.count : prev.count,
        distribution: res.distribution
      }));
      if (res.hasRated) {
        setHasRated(true);
        if (res.userRating) {
          setUserRating(res.userRating);
          saveLocalRating(businessId, res.userRating);
        }
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [businessId, visitorId]);

  const handleRate = async (star: number) => {
    if (hasRated || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await submitBusinessRating({
        businessId,
        rating: star,
        visitorId
      });

      if (res.success) {
        saveLocalRating(businessId, star);
        setHasRated(true);
        setUserRating(star);
        const newAvg = res.rating !== undefined ? res.rating : star;
        const newCount = res.reviewCount !== undefined ? res.reviewCount : stats.count + 1;
        setStats({
          average: newAvg,
          count: newCount,
          distribution: res.stats?.distribution
        });
        setSuccessMessage(`¡Gracias! Calificaste con ${star} estrella${star > 1 ? 's' : ''}.`);
        if (onRatingUpdated) {
          onRatingUpdated(newAvg, newCount);
        }
      } else {
        if (res.message && res.message.includes('anteriormente')) {
          saveLocalRating(businessId, star);
          setHasRated(true);
        }
        setErrorMessage(res.message || 'No se pudo guardar la calificación.');
      }
    } catch {
      setErrorMessage('Error al registrar la calificación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compact variant (e.g. for small headers or cards)
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <div className="flex items-center text-amber-500">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
          <span className="ml-1 font-bold text-stone-800">
            {stats.average ? stats.average.toFixed(1) : '5.0'}
          </span>
        </div>
        <span className="text-stone-400 font-normal">
          ({stats.count || 0})
        </span>
      </div>
    );
  }

  return (
    <div
      className="p-4 sm:p-5 rounded-2xl space-y-4 shadow-xs"
      style={{
        background: 'rgba(255, 255, 255, 0.55)',
        backdropFilter: 'blur(25px) saturate(180%)',
        WebkitBackdropFilter: 'blur(25px) saturate(180%)',
        border: '1.5px solid rgba(255, 255, 255, 0.85)',
      }}
    >
      {/* Header with Average & Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/50 pb-3">
        <div>
          <h4 className="text-sm font-black text-stone-900 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-600" />
            <span>Calificación de la Comunidad</span>
          </h4>
          <p className="text-xs text-stone-500">
            Opiniones de visitantes y clientes de Ciudad del Carmen
          </p>
        </div>

        <div
          className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-xl shadow-xs"
          style={{
            background: 'rgba(255, 255, 255, 0.80)',
            border: '1px solid rgba(255, 255, 255, 0.95)',
          }}
        >
          <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-stone-900">
              {stats.average ? stats.average.toFixed(1) : '5.0'}
            </span>
            <span className="text-xs text-stone-500 font-medium">/ 5</span>
          </div>
          <span className="text-[11px] text-stone-400 ml-1 border-l border-stone-200 pl-2">
            {stats.count === 1 ? '1 voto' : `${stats.count} votos`}
          </span>
        </div>
      </div>

      {/* Interactive Rating Area */}
      <div className="space-y-2">
        {hasRated ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-900 text-xs font-semibold">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span>Ya calificaste este negocio con </span>
              <strong className="text-emerald-700 font-bold">
                {userRating || '5'} estrella{Number(userRating) === 1 ? '' : 's'}
              </strong>
              <span>. ¡Solo se permite un voto por persona para garantizar transparencia!</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">
                ¿Conoces este negocio? Selecciona tu calificación:
              </span>
              {(hoverRating > 0 || isSubmitting) && (
                <span className="text-xs font-bold text-amber-700 flex items-center gap-1 animate-pulse">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{RATING_LABELS[hoverRating] || ''}</span>
                  )}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map(star => {
                const isLit = hoverRating ? star <= hoverRating : false;
                return (
                  <button
                    key={star}
                    type="button"
                    disabled={isSubmitting}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => handleRate(star)}
                    className="p-1 rounded-lg hover:scale-110 active:scale-95 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 group"
                    title={`Calificar con ${star} estrella${star > 1 ? 's' : ''} (${RATING_LABELS[star]})`}
                  >
                    <Star
                      className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                        isLit
                          ? 'fill-amber-400 text-amber-500 drop-shadow-xs'
                          : 'fill-stone-100 text-stone-300 group-hover:text-amber-400'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/60 p-2 rounded-lg">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="text-xs font-medium text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
};
