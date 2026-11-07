import React, { useEffect, useState } from 'react';

type PublicComment = { id: string; businessId: string; comment: string; createdAt: string };
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
          typeof x.createdAt === 'string' && x.businessId === id);
        setComments(safe);
        setStatus('ready');
      })
      .catch(() => { if (!controller.signal.aborted) setStatus('unavailable'); });
    return () => controller.abort();
  }, [id, page]);
  return <section className="bpd-comments mt-4 rounded-[24px] border border-white/80 bg-white/55 p-4 shadow-[0_10px_30px_rgba(30,41,59,0.07)] backdrop-blur-xl sm:p-5" aria-label="Comentarios aprobados">
    <h3 className="text-sm font-bold text-slate-900">Comentarios de la comunidad</h3>
    {status === 'loading' && <p>Consultando comentarios…</p>}
    {status === 'unavailable' && <p>Comentarios no disponibles por el momento. No se muestran comentarios sin aprobación.</p>}
    {status === 'ready' && <>
      {comments.length === 0 && <p>Aún no hay comentarios aprobados para mostrar.</p>}
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {comments.map(item => <li key={item.id} className="min-w-0 rounded-2xl border border-white/80 bg-white/65 p-3 shadow-sm">
          <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{item.comment}</p>
          {Number.isFinite(Date.parse(item.createdAt)) && <time className="text-xs text-stone-500" dateTime={item.createdAt}>
            {new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Merida', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(item.createdAt))}
          </time>}
        </li>)}
      </ul>
      <div className="mt-3 flex gap-3 text-xs">
        {page > 1 && <button type="button" onClick={() => setPage(n => n - 1)}>Anteriores</button>}
        {comments.length === 20 && <button type="button" onClick={() => setPage(n => n + 1)}>Siguientes</button>}
      </div>
    </>}
  </section>;
}
