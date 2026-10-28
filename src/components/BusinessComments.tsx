import React, { useEffect, useRef, useState } from "react";
import { fetchBusinessComments, PublicBusinessComment } from "../services/api";
import { RATINGS_UPDATED } from "../utils/realRatings";
import "./BusinessComments.css";
export function BusinessComments({
  businessId,
  onAvailabilityChange,
}: {
  businessId: string | number;
  onAvailabilityChange: (available: boolean) => void;
}) {
  const [items, setItems] = useState<PublicBusinessComment[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const generation = useRef(0),
    busy = useRef(false),
    request = useRef<AbortController | null>(null),
    load = useRef<(more?: boolean) => void>(() => {}),
    availability = useRef(onAvailabilityChange);
  availability.current = onAvailabilityChange;
  useEffect(() => {
    let active = true;
    const version = ++generation.current;
    setItems([]);
    setCursor(null);
    setError("");
    availability.current(false);
    let next: string | null = null;
    const fetchPage = async (more = false) => {
      if (more && (!next || busy.current)) return;
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      busy.current = true;
      setLoading(true);
      setError("");
      try {
        const page = await fetchBusinessComments(
          businessId,
          more ? next! : "",
          controller.signal,
        );
        if (
          !active ||
          version !== generation.current ||
          controller.signal.aborted
        )
          return;
        setItems((prev) =>
          more
            ? [
                ...prev,
                ...page.comments.filter(
                  (c) => !prev.some((p) => p.id === c.id),
                ),
              ]
            : page.comments,
        );
        next = page.nextCursor;
        setCursor(next);
        availability.current(true);
      } catch (e) {
        if (!active || controller.signal.aborted) return;
        if (!more) {
          setItems([]);
          setCursor(null);
        }
        setError("Comentarios no disponibles. Puedes reintentar la consulta.");
        availability.current(false);
      } finally {
        if (active && request.current === controller) {
          busy.current = false;
          setLoading(false);
        }
      }
    };
    load.current = fetchPage;
    fetchPage();
    const refresh = () => fetchPage();
    window.addEventListener(RATINGS_UPDATED, refresh);
    return () => {
      active = false;
      generation.current++;
      request.current?.abort();
      busy.current = false;
      window.removeEventListener(RATINGS_UPDATED, refresh);
    };
  }, [businessId]);
  return (
    <section className="business-comments" aria-label="Comentarios públicos">
      <h4>Comentarios de la comunidad</h4>
      <p className="business-comments-note">
        Texto de visitantes, sin identidad verificada. La moderación
        administrativa aún no está habilitada.
      </p>
      <div aria-live="polite">
        {loading && <p>Consultando comentarios…</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p>No hay comentarios visibles en esta página.</p>
        )}
      </div>
      {items.map((c) => (
        <article key={c.id}>
          <span aria-label={`${c.rating} de 5 estrellas`}>
            {"★".repeat(c.rating)}
            {"☆".repeat(5 - c.rating)}
          </span>
          <p>{c.comment}</p>
        </article>
      ))}
      {error && (
        <button
          type="button"
          disabled={loading}
          onClick={() => load.current(false)}
        >
          Reintentar comentarios
        </button>
      )}
      {cursor && !error && (
        <button
          type="button"
          disabled={loading}
          onClick={() => load.current(true)}
        >
          Ver más comentarios
        </button>
      )}
    </section>
  );
}
