import React, { useEffect, useState } from 'react';
import { CheckCircle2, Star } from 'lucide-react';

type PublicComment = { id: string; businessId: string; comment: string; createdAt: string; rating?: number };
type CommentResponse = { success: boolean; comments?: PublicComment[] };
export function BusinessComments({ businessId }: { businessId: string | number }) {
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'loading'|'ready'|'unavailable'>('loading');
  const id = String(businessId);
  useEffect(() => { setPage(1); setComments([]); }, [id]);
  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    fetch('/api/ratings/' + encodeURIComponent(id) + '/comments?page=' + page, {
      cache: 'no-store', signal: controller.signal
    })
      .then(async r => {
        if (!r.ok) throw new Error('comments not available');
        return r.json() as Promise<CommentResponse>;
      })
      .then(data => {
        if (!data.success || !Array.isArray(data.comments)) throw new Error('invalid response');
        const safe = data.comments.filter(x =>
          typeof x.id === 'string' && typeof x.comment === 'string' &&
          typeof x.createdAt === 'string' && x.businessId === id &&
          (x.rating === undefined || (Number.isInteger(x.rating) && x.rating >= 1 && x.rating <= 5)));
        setComments(safe);
        setStatus('ready');
      })
      .catch(() => { if (!controller.signal.aborted) setStatus('unavailable'); });
    return () => controller.abort();
  }, [id, page]);
  return <section className="bpd-comments mt-4 rounded-[24px] border border-white/80 bg-white/55 p-4 shadow-[0_10px_30px_rgba(30,41,59,0.07)] backdrop-blur-xl sm:p-5" aria-label="Comentarios aprobados">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-bold text-slate-900">Comentarios de la comunidad</h3>
      {status === 'ready' && comments.length > 0 && <span className="text-xs text-slate-500">Opiniones verificadas por moderación</span>}
    </div>
    {status === 'loading' && <p className="mt-3 text-sm text-slate-500">Consultando comentarios…</p>}
    {status === 'unavailable' && <p className="mt-3 text-sm text-slate-500">Comentarios no disponibles por el momento. No se muestran comentarios sin aprobación.</p>}
    {status === 'ready' && <>
      {comments.length === 0 && <p className="mt-3 text-sm text-slate-500">Aún no hay comentarios aprobados para mostrar.</p>}
      <ul className="mt-3 grid grid-cols-1 items-start gap-3 md:grid-cols-2">
        {comments.map(item => {
          const rating = item.rating;
          const validRating = Number.isInteger(rating) && Number(rating) >= 1 && Number(rating) <= 5;
          return <li key={item.id} className="min-w-0 self-start rounded-2xl border border-white/85 bg-white/75 px-4 py-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.05)] backdrop-blur-md">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              {validRating ? <div className="flex items-center gap-1" role="img" aria-label={`${rating} de 5 estrellas`}>
                {[1,2,3,4,5].map(star => <Star key={star} aria-hidden="true" className={`h-4 w-4 ${star <= Number(rating) ? 'fill-amber-400 text-amber-500' : 'fill-none text-slate-300'}`} />)}
                <span className="ml-1 text-xs font-semibold text-slate-700">{rating}/5</span>
              </div> : <span className="text-xs text-slate-500">Calificación no disponible</span>}
              {Number.isFinite(Date.parse(item.createdAt)) && <time className="text-xs text-slate-500" dateTime={item.createdAt}>
                {new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Merida', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(item.createdAt))}
              </time>}
            </div>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">{item.comment}</p>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />Comentario aprobado</p>
          </li>;
        })}
      </ul>
      <div className="mt-3 flex gap-3 text-xs">
        {page > 1 && <button type="button" onClick={() => setPage(n => n - 1)}>Anteriores</button>}
        {comments.length === 20 && <button type="button" onClick={() => setPage(n => n + 1)}>Siguientes</button>}
      </div>
    </>}
  </section>;
}
