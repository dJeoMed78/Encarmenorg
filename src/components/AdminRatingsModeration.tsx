import React, { useEffect, useState } from 'react';
import { Star, MapPin, CalendarClock, Building2 } from 'lucide-react';
import { adminFetch } from '../utils/adminAuth';

type Review = { id: string; businessId: string; comment: string; createdAt: string; rating?: number; businessName?: string; category?: string; address?: string; colonia?: string };
const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};
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
    <div className="space-y-3">{pending.map(item => {
      const rating = Number.isInteger(item.rating) && Number(item.rating) >= 1 && Number(item.rating) <= 5 ? Number(item.rating) : 0;
      const businessName = item.businessName?.trim() || `Empresa sin nombre (ID ${item.businessId})`;
      const location = [item.address, item.colonia].filter(value => value?.trim()).join(' · ');
      return <article key={item.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h4 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Building2 className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="break-words">{businessName}</span>
            </h4>
            <p className="text-xs text-slate-600">{item.category?.trim() || 'Giro no disponible'} · ID de empresa {item.businessId}</p>
            {location && <p className="flex items-start gap-1.5 text-xs text-slate-600"><MapPin className="h-3.5 w-3.5 shrink-0" />{location}</p>}
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-amber-50 px-2.5 py-1.5 text-amber-700" aria-label={rating ? `${rating} de 5 estrellas` : 'Calificación no disponible'}>
            {Array.from({length:5},(_,index)=><Star key={index} className={`h-4 w-4 ${index < rating ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}`} />)}
            <span className="ml-1 text-xs font-bold">{rating ? `${rating}/5` : 'Sin dato'}</span>
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Comentario recibido</p>
          <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap break-words">{item.comment}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs text-slate-500"><CalendarClock className="h-3.5 w-3.5" />Recibido: {formatDate(item.createdAt)} · Reseña #{item.id}</p>
          <div className="flex gap-2">
            <button type="button" disabled={Boolean(busy)} onClick={() => { void decide(item.id,'approved'); }}
              className="rounded-lg bg-emerald-700 text-white px-3 py-2 text-xs font-semibold disabled:opacity-50">Aprobar</button>
            <button type="button" disabled={Boolean(busy)} onClick={() => { void decide(item.id,'rejected'); }}
              className="rounded-lg bg-rose-700 text-white px-3 py-2 text-xs font-semibold disabled:opacity-50">Rechazar</button>
          </div>
        </div>
      </article>;
    })}</div>
    <div className="flex gap-2">
      {page > 1 && <button type="button" onClick={() => setPage(p => p - 1)}>Anterior</button>}
      {pending.length === 20 && <button type="button" onClick={() => setPage(p => p + 1)}>Siguiente</button>}
      <button type="button" onClick={() => setReload(n => n + 1)}>Actualizar</button>
    </div>
  </section>;
}
