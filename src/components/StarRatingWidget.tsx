import React, { useState, useEffect } from "react";
import { Star, CheckCircle, Award, Sparkles, Loader2 } from "lucide-react";
import { useBusinessRatings } from "../utils/realRatings";
import { BusinessComments } from "./BusinessComments";
import { validateBusinessComment } from "./BusinessCommentsPolicy";
import "./BusinessComments.css";

interface StarRatingWidgetProps {
  businessId: number | string;
  businessName: string;
  initialRating?: number;
  initialReviewCount?: number;
  onRatingUpdated?: (newAverage: number, newCount: number) => void;
  compact?: boolean;
}

const RATING_LABELS: Record<number, string> = {
  1: "Malo",
  2: "Regular",
  3: "Bueno",
  4: "Muy Bueno",
  5: "Excelente",
};

export const StarRatingWidget: React.FC<StarRatingWidgetProps> = ({
  businessId,
  businessName,
  onRatingUpdated,
  compact = false,
}) => {
  // Catalog initialRating/initialReviewCount are intentionally not authoritative.
  const {
    summary: stats,
    loading,
    available,
    submitting: isSubmitting,
    error: errorMessage,
    saved,
    rate,
    retry,
  } = useBusinessRatings(businessId);
  const hasRated = stats.hasRated === true;
  const userRating = stats.userRating;
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0),
    [comment, setComment] = useState(""),
    [commentsAvailable, setCommentsAvailable] = useState(false),
    [draftError, setDraftError] = useState("");
  useEffect(() => {
    setSelectedRating(0);
    setComment("");
    setDraftError("");
    setCommentsAvailable(false);
  }, [businessId]);
  useEffect(() => {
    setHoverRating(0);
  }, [businessId]);
  const successMessage = saved
    ? "Gracias. El servidor confirmó tu calificación."
    : null;
  const summaryLabel = loading
    ? "Consultando calificaciones…"
    : !available
      ? "Calificaciones no disponibles"
      : stats.count === 0
        ? "Sin calificaciones"
        : stats.average.toFixed(1);

  const handleRate = async (star: number) => {
    const validated = validateBusinessComment(comment);
    if (!validated.ok) {
      setDraftError(validated.message);
      return;
    }
    if (validated.text && !commentsAvailable) {
      setDraftError(
        "Quita el comentario o reintenta su consulta antes de confirmar.",
      );
      return;
    }
    setDraftError("");
    const result = await rate(star, validated.text || undefined);
    if (result) {
      setComment("");
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
          <span className="ml-1 font-bold text-stone-800">{summaryLabel}</span>
        </div>
        {errorMessage && (
          <button type="button" onClick={retry}>
            Reintentar consulta
          </button>
        )}
        <span className="text-stone-400 font-normal">
          {available && !loading ? `(${stats.count})` : ""}
        </span>
      </div>
    );
  }

  return (
    <div
      className="p-4 sm:p-5 rounded-2xl space-y-4 shadow-xs"
      style={{
        background: "rgba(255, 255, 255, 0.55)",
        backdropFilter: "blur(25px) saturate(180%)",
        WebkitBackdropFilter: "blur(25px) saturate(180%)",
        border: "1.5px solid rgba(255, 255, 255, 0.85)",
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
            Calificaciones registradas para este negocio
          </p>
        </div>

        <div
          className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-xl shadow-xs"
          style={{
            background: "rgba(255, 255, 255, 0.80)",
            border: "1px solid rgba(255, 255, 255, 0.95)",
          }}
        >
          <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-stone-900">
              {summaryLabel}
            </span>
            {available && !loading && stats.count > 0 && (
              <span className="text-xs text-stone-500 font-medium">/ 5</span>
            )}
          </div>
          <span className="text-[11px] text-stone-400 ml-1 border-l border-stone-200 pl-2">
            {available && !loading
              ? stats.count === 1
                ? "1 voto"
                : `${stats.count} votos`
              : ""}
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
                {userRating} estrella{Number(userRating) === 1 ? "" : "s"}
              </strong>
              <span>
                . Voto registrado para este identificador de visitante.
              </span>
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
                    <span>{RATING_LABELS[hoverRating] || ""}</span>
                  )}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const isLit = star <= (hoverRating || selectedRating);
                return (
                  <button
                    key={star}
                    aria-label={`Calificar con ${star} estrellas`}
                    aria-pressed={selectedRating === star}
                    type="button"
                    disabled={isSubmitting || loading || Boolean(errorMessage)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => {
                      setSelectedRating(star);
                      setDraftError("");
                    }}
                    className="p-1 rounded-lg hover:scale-110 active:scale-95 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 group"
                    title={`Calificar con ${star} estrella${star > 1 ? "s" : ""} (${RATING_LABELS[star]})`}
                  >
                    <Star
                      className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                        isLit
                          ? "fill-amber-400 text-amber-500 drop-shadow-xs"
                          : "fill-stone-100 text-stone-300 group-hover:text-amber-400"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!hasRated && (
          <div className="business-comments-form">
            <p>
              {selectedRating
                ? `Seleccionaste ${selectedRating} de 5 estrellas. Confirma para enviar.`
                : "Selecciona estrellas y confirma tu calificación."}
            </p>
            <label htmlFor={`business-comment-${businessId}`}>
              Comentario opcional (10–200 caracteres)
            </label>
            <textarea
              id={`business-comment-${businessId}`}
              value={comment}
              disabled={!commentsAvailable || isSubmitting || loading}
              maxLength={200}
              onChange={(e) => {
                setComment(e.target.value);
                setDraftError("");
              }}
              placeholder={
                commentsAvailable
                  ? "Cuenta tu experiencia en español, sin datos personales ni enlaces."
                  : "Comentarios no habilitados; puedes confirmar solo estrellas."
              }
              aria-describedby={`comment-help-${businessId}`}
            />
            {comment && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setComment("");
                  setDraftError("");
                }}
              >
                Quitar comentario
              </button>
            )}
            <p id={`comment-help-${businessId}`}>
              {comment.length}/200 · Texto puro en español. Se publica
              automáticamente si pasa los filtros; no incluyas datos personales.
            </p>
            {comment && (
              <div className="business-comments-preview">
                <strong>Vista previa</strong>
                <p>{comment}</p>
              </div>
            )}
            {draftError && <p role="alert">{draftError}</p>}
            <button
              type="button"
              disabled={
                !selectedRating ||
                isSubmitting ||
                loading ||
                !available ||
                Boolean(errorMessage)
              }
              onClick={() => handleRate(selectedRating)}
            >
              {isSubmitting ? "Guardando…" : "Confirmar calificación"}
            </button>
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
          <div
            role="alert"
            className="text-xs font-medium text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200"
          >
            {errorMessage}
            <button
              type="button"
              disabled={isSubmitting || loading}
              onClick={retry}
              className="ml-2 underline"
            >
              Reintentar consulta
            </button>
          </div>
        )}
      </div>
      <BusinessComments
        key={businessId}
        businessId={businessId}
        onAvailabilityChange={setCommentsAvailable}
      />
      <p className="text-[11px] text-stone-500">
        El identificador de este navegador ayuda a detectar duplicados; no
        verifica la identidad de una persona.
      </p>
    </div>
  );
};
