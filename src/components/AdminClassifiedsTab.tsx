import React, { useState, useMemo, useEffect } from 'react';
import {
  Tag,
  PlusCircle,
  Search,
  MapPin,
  Phone,
  MessageSquare,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Radio,
  Sparkles,
  Loader2,
  Check,
  X,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckSquare,
  Square
} from 'lucide-react';
import { ClassifiedAd } from '../types';
import { CLASSIFIED_CATEGORIES } from './ClassifiedsView';
import { formatPhoneNumber, getWhatsAppUrl } from '../utils/phone';
import {
  searchClassifiedRadarCandidates,
  approveClassifiedCandidate,
  batchApproveClassifiedCandidates
} from '../services/api';

interface AdminClassifiedsTabProps {
  classifieds: ClassifiedAd[];
  onOpenCreate: () => void;
  onOpenEdit?: (ad: ClassifiedAd) => void;
  onDeleteAd: (id: string) => Promise<boolean>;
  onOpenDetail?: (ad: ClassifiedAd) => void;
  onRefresh?: () => void;
}

export const AdminClassifiedsTab: React.FC<AdminClassifiedsTabProps> = ({
  classifieds,
  onOpenCreate,
  onOpenEdit,
  onDeleteAd,
  onOpenDetail,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Radar State
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [radarQuery, setRadarQuery] = useState('');
  const [radarCat, setRadarCat] = useState('all');
  const [radarLoading, setRadarLoading] = useState(false);
  const [radarCandidates, setRadarCandidates] = useState<ClassifiedAd[]>([]);
  const [radarAiInfo, setRadarAiInfo] = useState<{ usedAi: boolean; quotaExhausted?: boolean; message?: string } | null>(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [isBatchApproving, setIsBatchApproving] = useState(false);

  const handleOpenRadar = () => {
    setIsRadarOpen(true);
    if (radarCandidates.length === 0) {
      handleSearchRadar(false);
    }
  };

  const handleSearchRadar = async (useAiMode: boolean) => {
    setRadarLoading(true);
    setRadarAiInfo(null);
    try {
      const res = await searchClassifiedRadarCandidates(radarQuery, radarCat, useAiMode);
      if (res.success && Array.isArray(res.candidates)) {
        setRadarCandidates(res.candidates);
        const unpub = res.candidates.filter(c => !c.alreadyPublished).map(c => c.id);
        setSelectedCandidateIds(new Set(unpub));
        if (res.aiInfo) {
          setRadarAiInfo(res.aiInfo);
        }
      } else {
        setNotification({ type: 'error', text: res.message || 'Error al buscar en el radar' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error de conexión con el radar' });
    } finally {
      setRadarLoading(false);
    }
  };

  const handleApprove = async (cand: ClassifiedAd) => {
    setApprovingId(cand.id);
    try {
      const res = await approveClassifiedCandidate(cand);
      if (res.success && res.classified) {
        setNotification({
          type: 'success',
          text: `¡Anuncio "${cand.title}" verificado y publicado con éxito!`
        });
        // Mark as published locally in the radar list
        setRadarCandidates(prev => prev.map(c => c.id === cand.id ? { ...c, alreadyPublished: true } : c));
        setSelectedCandidateIds(prev => {
          const next = new Set(prev);
          next.delete(cand.id);
          return next;
        });
        if (onRefresh) onRefresh();
      } else {
        setNotification({ type: 'error', text: res.message || 'Error al aprobar el anuncio' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error de conexión' });
    } finally {
      setApprovingId(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleBatchApprove = async () => {
    const toApprove = radarCandidates.filter(c => selectedCandidateIds.has(c.id) && !c.alreadyPublished);
    if (toApprove.length === 0) return;

    setIsBatchApproving(true);
    try {
      const res = await batchApproveClassifiedCandidates(toApprove);
      if (res.success) {
        setNotification({
          type: 'success',
          text: `¡${toApprove.length} anuncios verificados y publicados en Clasificados!`
        });
        const approvedIds = new Set(toApprove.map(c => c.id));
        setRadarCandidates(prev => prev.map(c => approvedIds.has(c.id) ? { ...c, alreadyPublished: true } : c));
        setSelectedCandidateIds(new Set());
        if (onRefresh) onRefresh();
      } else {
        setNotification({ type: 'error', text: res.message || 'Error al aprobar anuncios' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error de conexión' });
    } finally {
      setIsBatchApproving(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleDismissCandidate = (id: string) => {
    setRadarCandidates(prev => prev.filter(c => c.id !== id));
    setSelectedCandidateIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleSelectCandidate = (id: string) => {
    setSelectedCandidateIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const unpub = radarCandidates.filter(c => !c.alreadyPublished).map(c => c.id);
    if (selectedCandidateIds.size === unpub.length && unpub.length > 0) {
      setSelectedCandidateIds(new Set());
    } else {
      setSelectedCandidateIds(new Set(unpub));
    }
  };

  const filteredAds = useMemo(() => {
    return classifieds.filter(ad => {
      if (selectedCat !== 'all' && ad.category !== selectedCat) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = ad.title?.toLowerCase().includes(q);
        const matchDesc = ad.description?.toLowerCase().includes(q);
        const matchCol = ad.colonia?.toLowerCase().includes(q);
        const matchPhone = (ad.phone || '').includes(q) || (ad.whatsapp || '').includes(q);
        if (!matchTitle && !matchDesc && !matchCol && !matchPhone) return false;
      }
      return true;
    });
  }, [classifieds, selectedCat, searchQuery]);

  const handleDelete = async (ad: ClassifiedAd) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el anuncio "${ad.title}"?`)) {
      return;
    }
    setDeletingId(ad.id);
    try {
      const ok = await onDeleteAd(ad.id);
      if (ok) {
        setNotification({ type: 'success', text: 'Anuncio eliminado correctamente.' });
        if (onRefresh) onRefresh();
      } else {
        setNotification({ type: 'error', text: 'Error al eliminar el anuncio.' });
      }
    } catch {
      setNotification({ type: 'error', text: 'Error al eliminar el anuncio.' });
    } finally {
      setDeletingId(null);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500 text-stone-950 font-bold">
              <Tag className="w-4 h-4" />
            </span>
            <h3 className="font-extrabold text-stone-900 text-base">
              Gestión Integral de Anuncios Clasificados
            </h3>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Administra avisos clasificados o usa el radar para importar publicaciones del grupo oficial de Facebook con verificación previa.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleOpenRadar}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition-transform active:scale-95 cursor-pointer"
            title="Buscar anuncios en el grupo oficial de Facebook de Empresas en Carmen"
          >
            <Radio className="w-4 h-4 text-indigo-200 animate-pulse" />
            <span>📡 Radar Clasificados (Grupo FB)</span>
          </button>

          <button
            onClick={onOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Nuevo Anuncio</span>
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar clasificado por título, contacto o colonia..."
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none focus:border-amber-500"
          />
        </div>

        <div className="w-full sm:w-60">
          <select
            value={selectedCat}
            onChange={e => setSelectedCat(e.target.value)}
            className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 font-medium outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">Todas las categorías ({classifieds.length})</option>
            {CLASSIFIED_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-100 text-stone-600 font-bold uppercase tracking-wider text-[10px] border-b border-stone-200">
            <tr>
              <th className="py-3 px-3">Anuncio / Foto</th>
              <th className="py-3 px-3">Categoría</th>
              <th className="py-3 px-3">Precio</th>
              <th className="py-3 px-3">Ubicación</th>
              <th className="py-3 px-3">Contacto</th>
              <th className="py-3 px-3">Fecha</th>
              <th className="py-3 px-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 bg-white">
            {filteredAds.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-stone-400">
                  No hay clasificados que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              filteredAds.map(ad => {
                const cat = CLASSIFIED_CATEGORIES.find(c => c.id === ad.category);
                const firstImg = ad.image || (ad.images && ad.images[0]);

                return (
                  <tr key={ad.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-stone-100 overflow-hidden border border-stone-200 shrink-0 flex items-center justify-center">
                          {firstImg ? (
                            <img src={firstImg} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Tag className="w-5 h-5 text-stone-300" />
                          )}
                        </div>
                        <div className="min-w-0 max-w-xs">
                          <h4 className="font-extrabold text-stone-900 truncate leading-tight">
                            {ad.title}
                          </h4>
                          <p className="text-[11px] text-stone-400 truncate mt-0.5">
                            {ad.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-bold text-[10px]">
                        {cat?.name.replace(/^\d+\.\s*/, '') || ad.category}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-bold text-stone-900 whitespace-nowrap">
                      {ad.price !== undefined && ad.price !== null
                        ? `$${Number(ad.price).toLocaleString('es-MX')} ${ad.currency || 'MXN'}`
                        : 'A convenir'}
                    </td>

                    <td className="py-3 px-3 text-stone-600 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-stone-400" />
                        <span>{ad.colonia || 'Carmen'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-stone-700 whitespace-nowrap">
                      {formatPhoneNumber(ad.whatsapp || ad.phone || 'S/N')}
                    </td>

                    <td className="py-3 px-3 text-stone-400 text-[11px] whitespace-nowrap">
                      {ad.createdAt
                        ? new Date(ad.createdAt).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short'
                          })
                        : 'Reciente'}
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {onOpenDetail && (
                          <button
                            type="button"
                            onClick={() => onOpenDetail(ad)}
                            className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 cursor-pointer"
                            title="Ver detalle"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onOpenEdit && (
                          <button
                            type="button"
                            onClick={() => onOpenEdit(ad)}
                            className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(ad)}
                          disabled={deletingId === ad.id}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer disabled:opacity-50"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================= */}
      {/* MODAL: RADAR DE ANUNCIOS CLASIFICADOS (GRUPO FB / IA)     */}
      {/* ========================================================= */}
      {isRadarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-indigo-600 text-white font-bold shadow-xs">
                  <Radio className="w-5 h-5 animate-pulse" />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                    <span>📡 Radar de Anuncios Clasificados</span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      Grupo Facebook & IA
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5 max-w-2xl">
                    Rastreador de publicaciones del grupo oficial{' '}
                    <a
                      href="https://www.facebook.com/groups/506440126097710"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-bold inline-flex items-center gap-0.5"
                    >
                      Empresas en Carmen (506440126097710)
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    . El administrador verifica la autenticidad y aprueba cada anuncio antes de publicarlo en el portal.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsRadarOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
                title="Cerrar Radar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Actions Bar */}
            <div className="p-4 border-b border-stone-200 bg-white space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-5 relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={radarQuery}
                    onChange={e => setRadarQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSearchRadar(false);
                    }}
                    placeholder="Buscar empleo, departamento, auto, minisplit..."
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div className="sm:col-span-3">
                  <select
                    value={radarCat}
                    onChange={e => setRadarCat(e.target.value)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 font-medium outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="all">Todas las categorías</option>
                    {CLASSIFIED_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name.replace(/^\d+\.\s*/, '')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSearchRadar(false)}
                    disabled={radarLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Búsqueda directa en banco del grupo de Facebook sin costo de tokens ni IA"
                  >
                    {radarLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Buscar (Sin IA)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSearchRadar(true)}
                    disabled={radarLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Búsqueda avanzada con Google Search Grounding y Gemini 3.8 Flash (Free API)"
                  >
                    {radarLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Radar IA</span>
                  </button>
                </div>
              </div>

              {/* Status & Quota message banner */}
              {radarAiInfo && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    radarAiInfo.quotaExhausted
                      ? 'bg-amber-50 border border-amber-200 text-amber-900'
                      : radarAiInfo.usedAi
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                      : 'bg-indigo-50 border border-indigo-200 text-indigo-900'
                  }`}
                >
                  {radarAiInfo.quotaExhausted ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : radarAiInfo.usedAi ? (
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  )}
                  <span className="font-medium">{radarAiInfo.message}</span>
                </div>
              )}

              {/* Bulk approval toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-stone-700">
                    {radarCandidates.length} candidatos detectados
                  </span>
                  <span className="text-stone-300">•</span>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-indigo-600 hover:text-indigo-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    {selectedCandidateIds.size > 0 &&
                    selectedCandidateIds.size ===
                      radarCandidates.filter(c => !c.alreadyPublished).length ? (
                      <CheckSquare className="w-3.5 h-3.5" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                    <span>Seleccionar pendientes ({selectedCandidateIds.size})</span>
                  </button>
                </div>

                {selectedCandidateIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleBatchApprove}
                    disabled={isBatchApproving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer self-start sm:self-auto"
                  >
                    {isBatchApproving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Aprobar seleccionados ({selectedCandidateIds.size})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Candidates List Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-stone-100/50">
              {radarLoading ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-stone-600">
                    Rastreando publicaciones verificables en el grupo de Facebook de Empresas en Carmen...
                  </p>
                </div>
              ) : radarCandidates.length === 0 ? (
                <div className="py-16 text-center space-y-2 bg-white rounded-2xl border border-stone-200">
                  <Tag className="w-8 h-8 text-stone-300 mx-auto" />
                  <p className="text-xs font-bold text-stone-700">
                    No se encontraron candidatos para los criterios ingresados.
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Intenta buscar con palabras clave como "empleo", "renta", "terreno", "versa" o pulsa "Buscar (Sin IA)".
                  </p>
                </div>
              ) : (
                radarCandidates.map(cand => {
                  const catObj = CLASSIFIED_CATEGORIES.find(c => c.id === cand.category);
                  const isSelected = selectedCandidateIds.has(cand.id);
                  const isApproving = approvingId === cand.id;

                  return (
                    <div
                      key={cand.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        cand.alreadyPublished
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : isSelected
                          ? 'bg-white border-indigo-400 shadow-md ring-2 ring-indigo-400/20'
                          : 'bg-white border-stone-200 hover:border-stone-300 shadow-xs'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Checkbox */}
                          {!cand.alreadyPublished && (
                            <button
                              type="button"
                              onClick={() => toggleSelectCandidate(cand.id)}
                              className="mt-1 text-stone-400 hover:text-indigo-600 cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-indigo-600" />
                              ) : (
                                <Square className="w-4 h-4 text-stone-400" />
                              )}
                            </button>
                          )}

                          <div className="space-y-1.5 flex-1 min-w-0">
                            {/* Badges row */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-lg bg-stone-100 text-stone-700 font-bold text-[10px]">
                                {catObj?.name.replace(/^\d+\.\s*/, '') || cand.category}
                              </span>

                              {cand.alreadyPublished ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Publicado en Portal</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-extrabold text-[10px]">
                                  <span>🟡 Pendiente de Aprobación</span>
                                </span>
                              )}

                              {cand.sourceUrl && (
                                <a
                                  href={cand.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] transition-colors border border-blue-200"
                                  title="Abrir publicación o búsqueda en Facebook"
                                >
                                  <span>Ver en Grupo FB</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>

                            {/* Title & Price */}
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <h4 className="text-sm font-black text-stone-900 leading-snug">
                                {cand.title}
                              </h4>
                              <span className="text-xs font-black text-emerald-600">
                                {cand.price !== undefined && cand.price !== null && cand.price > 0
                                  ? `$${Number(cand.price).toLocaleString('es-MX')} ${cand.currency || 'MXN'}`
                                  : 'Consultar precio'}
                              </span>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-line">
                              {cand.description}
                            </p>

                            {/* Metadata & Contact */}
                            <div className="pt-2 flex items-center gap-4 text-xs text-stone-500 flex-wrap">
                              <div className="flex items-center gap-1 font-medium">
                                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                                <span>{cand.colonia || 'Ciudad del Carmen, Campeche'}</span>
                              </div>

                              {(cand.phone || cand.whatsapp) && (
                                <div className="flex items-center gap-2">
                                  <a
                                    href={`tel:${cand.phone || cand.whatsapp}`}
                                    className="flex items-center gap-1 text-stone-700 hover:text-amber-600 font-mono font-bold"
                                  >
                                    <Phone className="w-3 h-3 text-stone-400" />
                                    <span>{formatPhoneNumber(cand.phone || cand.whatsapp || '')}</span>
                                  </a>

                                  <a
                                    href={getWhatsAppUrl(
                                      cand.whatsapp || cand.phone,
                                      `Hola, vi su anuncio "${cand.title}" en el portal de Empresas en Carmen y me interesa información.`
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] hover:bg-emerald-200 transition-colors"
                                  >
                                    <MessageSquare className="w-2.5 h-2.5 text-emerald-600" />
                                    <span>WhatsApp</span>
                                  </a>
                                </div>
                              )}

                              {cand.contactName && (
                                <span className="text-stone-400 text-[11px]">
                                  Contacto: <strong className="text-stone-600">{cand.contactName}</strong>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Card Action Buttons */}
                        <div className="flex items-center sm:flex-col gap-2 shrink-0 pt-2 sm:pt-0">
                          {!cand.alreadyPublished ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(cand)}
                                disabled={isApproving}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-xs transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                                title="Aprobar anuncio para que aparezca en el portal"
                              >
                                {isApproving ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>Aprobar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDismissCandidate(cand.id)}
                                className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl border border-stone-200 text-stone-500 hover:text-rose-600 hover:border-rose-200 transition-colors text-xs font-bold cursor-pointer"
                                title="Descartar de la lista de candidatos"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Descartar</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-xl">
                              ✓ En Portal
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verificación obligatoria del administrador activa</span>
              </span>

              <button
                type="button"
                onClick={() => setIsRadarOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
