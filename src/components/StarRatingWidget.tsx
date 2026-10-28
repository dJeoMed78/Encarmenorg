import React from 'react';
import { Star } from 'lucide-react';
import { useBusinessRatings } from '../utils/realRatings';

interface StarRatingWidgetProps {
  businessId: number | string;
  businessName: string;
  initialRating?: number;
  initialReviewCount?: number;
  onRatingUpdated?: (newAverage: number, newCount: number) => void;
  compact?: boolean;
}

export const StarRatingWidget: React.FC<StarRatingWidgetProps> = ({ businessId, businessName, onRatingUpdated, compact = false }) => {
  // Ignore historical catalog aggregates, including initialRating/initialReviewCount.
  const { summary, loading, available, submitting, error, saved, rate, retry } = useBusinessRatings(businessId);
  const [hover, setHover] = React.useState(0);
  React.useEffect(() => { setHover(0); }, [businessId]);
  const handleRate = async (star: number) => {
    const result = await rate(star);
    if (result) onRatingUpdated?.(result.average, result.count);
  };
  const label = loading ? 'Consultando calificaciones…' : !available ? 'Calificaciones no disponibles' :
    summary.count === 0 ? 'Sin calificaciones' : `${summary.average.toFixed(1)} / 5 · ${summary.count} votos`;
  if (compact) return <div className="text-xs" role="status">{label}{error && <button type="button" onClick={retry}> Reintentar</button>}</div>;
  return (
    <section className="p-4 rounded-2xl bg-white/70 border border-white space-y-3" aria-label={`Calificaciones de ${businessName}`}>
      <h4 className="text-sm font-bold">Calificación de la Comunidad</h4>
      <p className="text-xs text-stone-600" role="status">{label}</p>
      {!loading && summary.hasRated && <p className="text-xs">Voto registrado para este identificador de visitante: {summary.userRating} estrellas.</p>}
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map(star => (
          <button key={star} type="button" disabled={loading || submitting || summary.hasRated === true || Boolean(error)}
            onClick={() => { void handleRate(star); }} onMouseEnter={() => setHover(star)}
            onFocus={() => setHover(star)} onBlur={() => setHover(0)}
            aria-label={`Calificar con ${star} estrellas`} className="p-1 disabled:opacity-40">
            <Star className={`w-6 h-6 ${star <= (hover || summary.userRating || 0) ? 'fill-amber-400 text-amber-500' : 'text-stone-400'}`} />
          </button>
        ))}
      </div>
      {submitting && <p role="status" className="text-xs">Guardando calificación…</p>}
      {saved && <p role="status" className="text-xs text-emerald-700">Gracias. El servidor confirmó tu calificación.</p>}
      {error && <div role="alert" className="text-xs text-rose-700">{error} <button type="button" disabled={submitting || loading} onClick={retry} className="underline">Reintentar consulta</button></div>}
      <p className="text-[11px] text-stone-500">El identificador de este navegador ayuda a detectar duplicados; no verifica la identidad de una persona.</p>
    </section>
  );
};
