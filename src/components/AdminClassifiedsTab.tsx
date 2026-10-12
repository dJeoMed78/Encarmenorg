import React, { useState, useMemo } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { ClassifiedAd } from '../types';
import { CLASSIFIED_CATEGORIES } from './ClassifiedsView';
import { formatPhoneNumber } from '../utils/phone';

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
            Administra, añade, edita o elimina avisos clasificados publicados en el portal.
          </p>
        </div>

        <button
          onClick={onOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-xs transition-transform active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Nuevo Anuncio</span>
        </button>
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
    </div>
  );
};
