import React, { useState, useEffect } from 'react';
import { Star, CheckCircle, Award, Sparkles, Loader2 } from 'lucide-react';
import { useBusinessRatings } from '../utils/realRatings';

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
  onRatingUpdated,
  compact = false
}) => {
  // Catalog initialRating/initialReviewCount are intentionally not authoritative.
  const { summary: stats, loading, available, submitting: isSubmitting, error: errorMessage, saved, rate, retry } = useBusinessRatings(businessId);
  const hasRated = stats.hasRated === true;
  const userRating = stats.userRating;
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [comment, setComment] = useState('');
  useEffect(() => { setHoverRating(0); setSelectedRating(0); setComment(''); }, [businessId]);
  const successMessage = saved ? 'Gracias. El servidor confirmó tu calificación.' : null;
  const summaryLabel = loading ? 'Consultando calificaciones…' : !available ? 'Calificaciones no disponibles' :
    stats.count === 0 ? 'Sin calificaciones' : stats.average.toFixed(1);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedRating < 1 || selectedRating > 5 || hasRated || isSubmitting) return;
    const result = await rate(selectedRating, comment.trim());
    if (result) {
      setComment('');
      setSelectedRating(0);
      onRatingUpdated?.(result.average, result.count);
    }
  };

  // Compact variant (e.g. for small headers or cards)
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs" role="status">
        <div className="flex items-center text-amber-500">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
          <span className="ml-1 font-bold text-stone-800">
            {summaryLabel}
          </span>
        </div>
        {errorMessage && <button type="button" onClick={retry}>Reintentar consulta</button>}
        <span className="text-stone-400 font-normal">
          {available && !loading ? `(${stats.count})` : ''}
        </span>
      </div>
    );
  }

  return (
    <section className="w-full min-w-0" aria-label={`Calificaciones y opinión sobre ${businessName}`}>
      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-stretch lg:gap-5">
        {/* Two independent glass panes avoid stretching the rating bars across the page. */}
        <div className="min-w-0 rounded-[26px] border border-white/75 bg-white/55 p-4 shadow-[0_12px_35px_rgba(30,41,59,0.08)] backdrop-blur-2xl sm:p-5"
          style={{ WebkitBackdropFilter: 'blur(22px) saturate(160%)', backdropFilter: 'blur(22px) saturate(160%)' }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Award className="h-[18px] w-[18px] text-amber-600" aria-hidden="true" />
                Resumen de calificaciones
              </h3>
              <p className="text-xs text-slate-500">Opiniones registradas de este negocio</p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/90 bg-white/75 px-3 py-2 shadow-sm">
              <Star className="h-5 w-5 shrink-0 fill-amber-400 text-amber-500" aria-hidden="true" />
              <div className="flex flex-col">
                <strong className="text-base leading-tight text-slate-900">{summaryLabel}</strong>
                <span className="text-[11px] text-slate-500">
                  {available && !loading ? `${stats.count} ${stats.count === 1 ? 'voto' : 'votos'}` : 'Sin datos confirmados'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/65 bg-white/35 p-3 sm:p-4">
            <p className="mb-3 text-xs font-semibold text-slate-700">Distribución por estrellas</p>
            {available && !loading && stats.distribution ? (
              <div aria-label="Distribución de calificaciones" className="space-y-3">
                {[5, 4, 3, 2, 1].map(star => (
                  <div key={star} className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)_24px] items-center gap-2 text-xs">
                    <span className="whitespace-nowrap font-medium text-slate-600">{star} estrellas</span>
                    <progress
                      className="h-2.5 w-full max-w-[240px] overflow-hidden rounded-full bg-slate-200/80 accent-amber-500
                        [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-slate-200/80
                        [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-amber-400
                        [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-amber-400"
                      max={Math.max(stats.count, 1)}
                      value={stats.distribution?.[star] || 0}
                      aria-label={`${star} estrellas: ${stats.distribution?.[star] || 0} votos`}
                    />
                    <span className="text-right tabular-nums text-slate-500">{stats.distribution?.[star] || 0}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-5 text-center text-xs text-slate-500">
                {loading ? 'Consultando distribución…' : 'Distribución temporalmente no disponible'}
              </p>
            )}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            Los resultados reflejan exclusivamente las calificaciones confirmadas por el servidor.
          </p>
        </div>

        <div className="min-w-0 rounded-[26px] border border-white/80 bg-white/65 p-4 shadow-[0_12px_35px_rgba(30,41,59,0.08)] backdrop-blur-2xl sm:p-5"
          style={{ WebkitBackdropFilter: 'blur(22px) saturate(160%)', backdropFilter: 'blur(22px) saturate(160%)' }}>
          <div className="flex items-center gap-2">
            <Star className="h-[18px] w-[18px] text-amber-500" aria-hidden="true" />
            <h3 className="text-sm font-bold text-slate-900">Comparte tu experiencia</h3>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            ¿Conoces este negocio? Tu opinión ayuda a la comunidad.
          </p>

          <div className="mt-5 space-y-4">
            {hasRated ? (
              <div className="flex items-start gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-3 text-xs font-semibold text-emerald-900">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>
                  Ya calificaste este negocio con <strong>{userRating} estrella{Number(userRating) === 1 ? '' : 's'}</strong>.
                  Voto registrado para este identificador de visitante.
                </span>
              </div>
            ) : (
              <form onSubmit={event => { void handleSubmit(event); }} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700" htmlFor="rating-review-comment">
                    Comentario <span className="font-normal text-slate-500">(opcional, máximo 200 caracteres)</span>
                  </label>
                  <textarea id="rating-review-comment" rows={4} maxLength={200} value={comment}
                    disabled={isSubmitting || loading || !available}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Cuéntanos cómo fue tu experiencia…"
                    className="block min-h-[108px] w-full min-w-0 resize-y rounded-2xl border border-white/95 bg-white/70 px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200/40 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:opacity-60"
                    aria-describedby="rating-comment-moderation" />
                  <div className="flex flex-wrap justify-between gap-2 text-[11px] text-slate-500">
                    <span id="rating-comment-moderation">Los comentarios se revisan antes de publicarse.</span>
                    <span className="tabular-nums">{comment.length}/200</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/90 bg-white/65 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">Tu calificación</span>
                    <span aria-live="polite" className="text-xs font-semibold text-amber-700">
                      {isSubmitting ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…</span>
                        : (hoverRating || selectedRating) > 0 ? RATING_LABELS[hoverRating || selectedRating] : 'Selecciona de 1 a 5 estrellas'}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1" role="group" aria-label="Calificar negocio de una a cinco estrellas">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} type="button"
                        aria-label={`Calificar con ${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
                        disabled={isSubmitting || loading || !available || Boolean(errorMessage)}
                        onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)}
                        onFocus={() => setHoverRating(star)} onBlur={() => setHoverRating(0)}
                        aria-pressed={selectedRating === star}
                        onClick={() => setSelectedRating(star)}
                        className="rounded-xl p-1.5 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                        title={`${star} ${star === 1 ? 'estrella' : 'estrellas'} · ${RATING_LABELS[star]}`}>
                        <Star className={`h-7 w-7 sm:h-8 sm:w-8 transition-colors ${star <= (hoverRating || selectedRating) ? 'fill-amber-400 text-amber-500' : 'fill-white/50 text-slate-300 hover:text-amber-400'}`} />
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">Selecciona tus estrellas y pulsa «Publicar mi opinión» para enviar todo junto.</p>
                </div>
                <button type="submit" disabled={selectedRating === 0 || isSubmitting || loading || !available || Boolean(errorMessage)}
                  className="w-full rounded-2xl border border-amber-300/80 bg-amber-400 px-4 py-3 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50">
                  {isSubmitting ? 'Publicando…' : 'Publicar mi opinión'}
                </button>
              </form>
            )}
            {saved && (
              <div role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50/85 p-3 text-xs font-semibold text-emerald-800">
                <Sparkles className="h-4 w-4" aria-hidden="true" /> El servidor confirmó tu calificación.
              </div>
            )}
            {errorMessage && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50/85 p-3 text-xs text-rose-700">
                {errorMessage}
                <button type="button" disabled={isSubmitting || loading} onClick={retry}
                  className="ml-2 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600">Reintentar consulta</button>
              </div>
            )}
          </div>
          <p className="mt-4 border-t border-white/65 pt-3 text-[11px] leading-relaxed text-slate-500">
            El identificador del navegador ayuda a detectar duplicados; no confirma la identidad de una persona.
          </p>
        </div>
      </div>
    </section>
  );
};
