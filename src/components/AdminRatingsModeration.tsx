import React, { useEffect, useState } from 'react';
import { adminFetch } from '../utils/adminAuth';

type Review = { id: string; businessId: string; comment: string; createdAt: string };
export function AdminRatingsModeration() {
  const [pending, setPending] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    adminFetch('/api/reviews/moderation/pending?page=' + page, {
      cache: 'no-store', signal: controller.signal
    }).then(async r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(data => {
      if (!data.success || !Array.isArray(data.comments)) throw new Error('Respuesta de moderación inválida');
      setPending(data.comments.filter((r: any) => typeof r.id === 'string' && typeof r.comment === 'string'));
    }).catch(e => { if (!controller.signal.aborted) setError('No se pudo consultar la cola de moderación: ' + String(e.message || e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, reload]);
  const decide = async (id: string, status: 'approved'|'rejected') => {
    if (busy) return;
    setBusy(id); setError(null);
    try {
      const res = await adminFetch('/api/reviews/moderation/' + encodeURIComponent(id), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const result = await res.json();
      if (!result.success) throw new Error('El servidor no confirmó la moderación');
      setPending(list => list.filter(item => item.id !== id));
      setReload(n => n + 1);
    } catch(e: any) {
      setError('No se confirmó el cambio. No se actualizaron los datos visualmente: ' + String(e.message || e));
    } finally { setBusy(null); }
  };
  return <section className="rounded-2xl border border-stone-200 bg-white/90 p-4 space-y-3" aria-label="Moderación de comentarios">
    <h3 className="font-bold text-stone-800">Moderación de comentarios</h3>
    <p className="text-xs text-stone-600">Solo se publican comentarios expresamente aprobados. El sistema puede permanecer deshabilitado hasta validar el esquema y la escritura segura en Staging.</p>
    {loading && <p>Consultando cola de revisión…</p>}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {!loading && !error && pending.length === 0 && <p className="text-sm">No hay comentarios pendientes en esta página.</p>}
    <div className="space-y-3">{pending.map(item => <article key={item.id} className="rounded-xl border p-3 space-y-2">
      <p className="text-xs font-semibold">Empresa {item.businessId}</p>
      <p className="text-sm whitespace-pre-wrap break-words">{item.comment}</p>
      <div className="flex gap-2">
        <button type="button" disabled={Boolean(busy)} onClick={() => { void decide(item.id,'approved'); }}
          className="rounded-lg bg-emerald-700 text-white px-3 py-1.5 text-xs disabled:opacity-50">Aprobar</button>
        <button type="button" disabled={Boolean(busy)} onClick={() => { void decide(item.id,'rejected'); }}
          className="rounded-lg bg-rose-700 text-white px-3 py-1.5 text-xs disabled:opacity-50">Rechazar</button>
      </div>
    </article>)}</div>
    <div className="flex gap-2">
      {page > 1 && <button type="button" onClick={() => setPage(p => p - 1)}>Anterior</button>}
      {pending.length === 20 && <button type="button" onClick={() => setPage(p => p + 1)}>Siguiente</button>}
      <button type="button" onClick={() => setReload(n => n + 1)}>Actualizar</button>
    </div>
  </section>;
}
