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
  return <section className="bpd-comments" aria-label="Comentarios aprobados">
    <strong>Comentarios de la comunidad</strong>
    {status === 'loading' && <p>Consultando comentarios…</p>}
    {status === 'unavailable' && <p>Comentarios no disponibles por el momento. No se muestran comentarios sin aprobación.</p>}
    {status === 'ready' && <>
      {comments.length === 0 && <p>Aún no hay comentarios aprobados para mostrar.</p>}
      <ul className="space-y-3">
        {comments.map(item => <li key={item.id} className="rounded-xl border border-stone-200 p-3">
          <p className="whitespace-pre-wrap break-words text-sm">{item.comment}</p>
          {Number.isFinite(Date.parse(item.createdAt)) && <time className="text-xs text-stone-500" dateTime={item.createdAt}>
            {new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Merida', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(item.createdAt))}
          </time>}
        </li>)}
      </ul>
      <div className="flex gap-2">
        {page > 1 && <button type="button" onClick={() => setPage(n => n - 1)}>Anteriores</button>}
        {comments.length === 20 && <button type="button" onClick={() => setPage(n => n + 1)}>Siguientes</button>}
      </div>
    </>}
  </section>;
}
