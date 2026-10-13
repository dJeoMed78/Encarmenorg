import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  PlusCircle,
  Download,
  Filter,
  CheckCircle,
  Star,
  Edit2,
  Trash2,
  KeyRound,
  ExternalLink,
  Copy,
  Check,
  MessageSquare,
  Building2,
  X,
  RefreshCw,
  Globe,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { Business, Category } from '../types';
import {
  fetchBusinessEditPins,
  generateBusinessEditPin,
  syncWordPress,
  syncSingleBusinessToWordPress,
  BusinessEditPinInfo
} from '../services/api';
import { formatPhoneNumber } from '../utils/phone';
import { AdminAutoBusinessesModal } from './AdminAutoBusinessesModal';

interface AdminBusinessesTabProps {
  businesses: Business[];
  categories?: Category[];
  coloniasList?: Array<{ name: string; count: number }>;
  onEditBusiness?: (b: Business) => void;
  onToggleTop?: (b: Business) => void;
  onToggleRecommended?: (b: Business) => void;
  onDeleteBusiness?: (b: Business) => void;
  onOpenBusiness?: (b: Business) => void;
  onAddNewBusiness?: () => void;
  onBusinessApproved?: (b: Business) => void;
}

export const AdminBusinessesTab: React.FC<AdminBusinessesTabProps> = ({
  businesses,
  categories = [],
  coloniasList = [],
  onEditBusiness,
  onToggleTop,
  onToggleRecommended,
  onDeleteBusiness,
  onOpenBusiness,
  onAddNewBusiness,
  onBusinessApproved
}) => {
  const [isAutoSearchModalOpen, setIsAutoSearchModalOpen] = useState(false);
  const [autoModalSource, setAutoModalSource] = useState<'all' | 'official_group' | 'official_page' | 'whatsapp' | 'community' | 'ai'>('all');
  const [autoModalTriggerAi, setAutoModalTriggerAi] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedCol, setSelectedCol] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin_business_sort_by');
      if (saved) return saved;
    }
    return 'date-desc';
  });

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('admin_business_sort_by', newSort);
      } catch (_) {}
    }
  };
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [pinsMap, setPinsMap] = useState<Record<number, BusinessEditPinInfo>>({});
  const [generatingPinId, setGeneratingPinId] = useState<number | null>(null);
  const [copiedPinId, setCopiedPinId] = useState<number | null>(null);

  const [isSyncingWp, setIsSyncingWp] = useState(false);
  const [syncingSingleId, setSyncingSingleId] = useState<number | null>(null);
  const [syncNotice, setSyncNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSyncAllWordPress = async () => {
    setIsSyncingWp(true);
    setSyncNotice(null);
    try {
      const res = await syncWordPress();
      if (res.success) {
        setSyncNotice({ text: res.message || 'Sincronización con WordPress completada con éxito.', type: 'success' });
      } else {
        setSyncNotice({ text: res.message || 'Error en sincronización con WordPress.', type: 'error' });
      }
    } catch (err: any) {
      setSyncNotice({ text: err.message || 'Error al conectar con el servidor', type: 'error' });
    } finally {
      setIsSyncingWp(false);
    }
  };

  const handleSyncSingle = async (biz: Business) => {
    setSyncingSingleId(biz.id);
    setSyncNotice(null);
    try {
      const res = await syncSingleBusinessToWordPress(biz.id);
      if (res.success) {
        setSyncNotice({ text: res.message || `Empresa "${biz.name}" actualizada en WordPress con categorías y botones de contacto.`, type: 'success' });
      } else {
        setSyncNotice({ text: res.message || 'Error al sincronizar empresa con WordPress.', type: 'error' });
      }
    } catch (err: any) {
      setSyncNotice({ text: err.message || 'Error de comunicación', type: 'error' });
    } finally {
      setSyncingSingleId(null);
    }
  };

  useEffect(() => {
    let active = true;
    fetchBusinessEditPins()
      .then(res => {
        if (active && res.success && res.pins) {
          setPinsMap(res.pins);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleGeneratePin = async (bizId: number) => {
    setGeneratingPinId(bizId);
    setSyncNotice(null);
    try {
      const res = await generateBusinessEditPin(bizId);
      if (res.success && res.pin) {
        setPinsMap(prev => ({
          ...prev,
          [bizId]: {
            pin: res.pin!,
            expiresAt: res.expiresAt || Date.now() + 12 * 60 * 60 * 1000,
            remainingMinutes: res.remainingMinutes || 720
          }
        }));
        const biz = businesses.find(b => b.id === bizId);
        setSyncNotice({
          text: `🔑 PIN generado con éxito para "${biz?.name || 'negocio'}": ${res.pin} (Válido 12h)`,
          type: 'success'
        });
      } else {
        setSyncNotice({
          text: res.message || 'No se pudo generar el código PIN para el dueño.',
          type: 'error'
        });
      }
    } catch (err: any) {
      setSyncNotice({
        text: err.message || 'Error de conexión al generar el PIN.',
        type: 'error'
      });
    } finally {
      setGeneratingPinId(null);
    }
  };

  const handleCopyPin = (bizId: number, pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedPinId(bizId);
    setTimeout(() => setCopiedPinId(null), 2000);
  };

  const getWaPinUrl = (biz: Business, pin: string) => {
    const rawNum = (biz.whatsapp || biz.phone || '').replace(/\D/g, '');
    const num = rawNum.startsWith('52') ? rawNum : `52${rawNum}`;
    const msg = `Hola, este es tu código de edición temporal de 10 dígitos para tu negocio "${biz.name}" en el directorio oficial Empresas en Carmen:\n\n🔑 CÓDIGO: ${pin}\n\n⏱️ Validez: 12 horas.\n\nPuedes ingresar a https://encarmen.org, buscar tu empresa y tocar "Editar mi negocio" para actualizar tus datos, fotos, horarios y teléfonos.`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  };

  const normalizeStr = (s?: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const filteredBusinesses = useMemo(() => {
    const q = normalizeStr(searchQuery);
    return businesses.filter(b => {
      if (q) {
        const matchName = normalizeStr(b.name).includes(q);
        const matchPrevNames = Array.isArray(b.previousNames) && b.previousNames.some(pn => normalizeStr(pn).includes(q));
        const matchSlug = normalizeStr(b.slug).includes(q);
        const matchPrevSlugs = Array.isArray(b.previousSlugs) && b.previousSlugs.some(ps => normalizeStr(ps).includes(q));
        const matchCat =
          normalizeStr(b.categories?.[0]).includes(q) ||
          (b.categories && b.categories.some(c => normalizeStr(c).includes(q)));
        const matchCol = normalizeStr(b.colonia).includes(q);
        const matchPhone = (b.phone || '').includes(q) || (b.whatsapp || '').includes(q);
        if (!matchName && !matchPrevNames && !matchSlug && !matchPrevSlugs && !matchCat && !matchCol && !matchPhone) return false;
      }
      if (selectedCat !== 'all') {
        const hasCat =
          b.categorySlugs?.includes(selectedCat) ||
          b.categories?.some(c => normalizeStr(c) === normalizeStr(selectedCat));
        if (!hasCat) return false;
      }
      if (selectedCol !== 'all' && normalizeStr(b.colonia) !== normalizeStr(selectedCol)) {
        return false;
      }
      if (filterType === 'top' && !b.isTopBusiness) return false;
      if (filterType === 'recommended' && !b.isRecommended) return false;
      if (filterType === 'whatsapp' && !b.whatsapp) return false;
      if (filterType === 'delivery' && !b.hasDelivery) return false;
      return true;
    });
  }, [businesses, searchQuery, selectedCat, selectedCol, filterType]);

  const sortedBusinesses = useMemo(() => {
    const list = [...filteredBusinesses];
    switch (sortBy) {
      case 'date-desc':
        return list.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (timeA && timeB && timeA !== timeB) return timeB - timeA;
          return (Number(b.id) || 0) - (Number(a.id) || 0);
        });
      case 'date-asc':
        return list.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (timeA && timeB && timeA !== timeB) return timeA - timeB;
          return (Number(a.id) || 0) - (Number(b.id) || 0);
        });
      case 'name-asc':
        return list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));
      case 'name-desc':
        return list.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'es'));
      case 'colonia-asc':
        return list.sort((a, b) => (a.colonia || '').localeCompare(b.colonia || '', 'es'));
      default:
        return list;
    }
  }, [filteredBusinesses, sortBy]);

  const handleDelete = (biz: Business) => {
    if (
      window.confirm(
        `¿Estás seguro de que deseas eliminar permanentemente a "${biz.name}" del directorio?`
      )
    ) {
      if (onDeleteBusiness) {
        setDeletingId(biz.id);
        onDeleteBusiness(biz);
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Filter and Controls */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, teléfono, categoría, colonia..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-800 placeholder:text-stone-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
                title="Vista Cuadrícula"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Cuadrícula</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
                title="Vista Listado"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Listado</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleSyncAllWordPress}
              disabled={isSyncingWp}
              className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Sincronizar catálogo con WordPress WooCommerce (empresasencarmen.com)"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-purple-200 ${isSyncingWp ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncingWp ? 'Sincronizando WP...' : 'Sincronizar WordPress'}</span>
              <span className="sm:hidden">WP</span>
            </button>

            <a
              href="/api/download-backup"
              download="codigo-fuente-empresasencarmen.zip"
              className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Descargar código fuente completo y datos en archivo ZIP"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Descargar Proyecto (.ZIP)</span>
              <span className="sm:hidden">ZIP</span>
            </a>

            <button
              type="button"
              onClick={() => {
                setAutoModalSource('all');
                setAutoModalTriggerAi(false);
                setIsAutoSearchModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Búsqueda Automática en Fuentes Públicas de Ciudad del Carmen (FB y Google)"
            >
              <Globe className="w-4 h-4 text-sky-200" />
              <span>Búsqueda Automática</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAutoModalSource('ai');
                setAutoModalTriggerAi(true);
                setIsAutoSearchModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/25 transition-all cursor-pointer"
              title="Búsqueda Automática con IA (Trae 30 empresas reales de Carmen por pulsación)"
            >
              <Sparkles className="w-4 h-4 text-stone-950" />
              <span>Búsqueda con IA (30 Negocios)</span>
            </button>

            {onAddNewBusiness && (
              <button
                type="button"
                onClick={onAddNewBusiness}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Nueva Empresa</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter selects */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-100 text-xs">
          <div className="flex items-center gap-1 text-stone-500 font-bold mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </div>

          <select
            value={selectedCat}
            onChange={e => setSelectedCat(e.target.value)}
            className="p-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs outline-none"
          >
            <option value="all">Todas las Categorías</option>
            {categories.map(c => (
              <option key={c.id || c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCol}
            onChange={e => setSelectedCol(e.target.value)}
            className="p-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs outline-none"
          >
            <option value="all">Todas las Colonias</option>
            {coloniasList.map(c => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="p-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs outline-none"
          >
            <option value="all">Todos los Estados</option>
            <option value="top">★ Solo Empresas TOP</option>
            <option value="recommended">✓ Solo Recomendadas</option>
            <option value="whatsapp">Con WhatsApp</option>
            <option value="delivery">Con Servicio a Domicilio</option>
          </select>

          {/* Ordenamiento persistente */}
          <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-300 rounded-lg px-2 py-1 text-xs shadow-2xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-800 shrink-0" />
            <span className="font-bold text-amber-950 hidden sm:inline">Ordenar:</span>
            <select
              value={sortBy}
              onChange={e => handleSortChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-stone-900 outline-none cursor-pointer"
              title="Criterio de ordenamiento persistente (permanece guardado)"
            >
              <option value="date-desc">🕒 Más recientes (Fecha de captura ↓)</option>
              <option value="date-asc">🕒 Más antiguos (Fecha de captura ↑)</option>
              <option value="name-asc">🔤 Alfabético (A - Z)</option>
              <option value="name-desc">🔤 Alfabético (Z - A)</option>
              <option value="colonia-asc">📍 Colonia (A - Z)</option>
            </select>
          </div>

          <span className="ml-auto text-xs text-stone-500">
            Total: <strong>{sortedBusinesses.length}</strong> empresas
          </span>
        </div>
      </div>

      {syncNotice && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-xs transition-all ${
            syncNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{syncNotice.text}</span>
          <button
            type="button"
            onClick={() => setSyncNotice(null)}
            className="p-1 rounded-md hover:bg-black/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid or List of Businesses */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedBusinesses.map(biz => {
            const pinInfo = pinsMap[biz.id];

            return (
              <div
                key={biz.id}
                className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold text-amber-600 truncate block">
                        {biz.categories?.[0] || 'Comercio'}
                      </span>
                      <h4 className="font-bold text-sm text-stone-900 truncate">{biz.name}</h4>
                      {Array.isArray(biz.previousNames) && biz.previousNames.length > 0 && (
                        <p className="text-[10px] text-amber-700/80 truncate">
                          Antes: {biz.previousNames.join(', ')}
                        </p>
                      )}
                    </div>
                    {biz.image && (
                      <div className="w-10 h-10 rounded-lg border border-stone-200 bg-stone-50 p-0.5 shrink-0 overflow-hidden">
                        <img
                          src={biz.image}
                          alt={biz.name}
                          className="w-full h-full object-contain"
                          onError={e => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-stone-500 line-clamp-2">
                    {biz.address || biz.colonia || biz.description}
                  </p>

                  <div className="text-xs text-stone-600 space-y-0.5 pt-1 border-t border-stone-100">
                    {biz.phone && <p>📞 {formatPhoneNumber(biz.phone)}</p>}
                    {biz.whatsapp && <p>💬 {formatPhoneNumber(biz.whatsapp)}</p>}
                  </div>
                </div>

                {/* PIN Info & Controls */}
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <div className="flex items-center justify-between text-xs">
                    {pinInfo ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded">
                          {pinInfo.pin}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyPin(biz.id, pinInfo.pin)}
                          className="p-1 text-stone-500 hover:text-stone-800 cursor-pointer"
                          title="Copiar código PIN"
                        >
                          {copiedPinId === biz.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={getWaPinUrl(biz, pinInfo.pin)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-emerald-600 hover:text-emerald-700"
                          title="Enviar código al dueño por WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleGeneratePin(biz.id)}
                          disabled={generatingPinId === biz.id}
                          className="p-1 text-stone-400 hover:text-purple-600 cursor-pointer"
                          title="Generar nuevo PIN (Renovar)"
                        >
                          <RefreshCw className={`w-3 h-3 ${generatingPinId === biz.id ? 'animate-spin text-purple-600' : ''}`} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleGeneratePin(biz.id)}
                        disabled={generatingPinId === biz.id}
                        className="text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-60 transition-colors shadow-2xs"
                        title="Generar código de 10 dígitos para enviar al dueño"
                      >
                        <KeyRound className={`w-3.5 h-3.5 ${generatingPinId === biz.id ? 'animate-spin' : ''}`} />
                        <span>{generatingPinId === biz.id ? 'Generando...' : 'Generar PIN Dueño'}</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1">
                      {onToggleTop && (
                        <button
                          type="button"
                          onClick={() => onToggleTop(biz)}
                          className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                            biz.isTopBusiness
                              ? 'bg-amber-500 border-amber-500 text-stone-950 font-bold'
                              : 'bg-white border-stone-200 text-stone-400 hover:text-amber-600'
                          }`}
                          title={biz.isTopBusiness ? 'Quitar TOP' : 'Hacer TOP'}
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onToggleRecommended && (
                        <button
                          type="button"
                          onClick={() => onToggleRecommended(biz)}
                          className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                            biz.isRecommended
                              ? 'bg-emerald-600 border-emerald-600 text-white font-bold'
                              : 'bg-white border-stone-200 text-stone-400 hover:text-emerald-600'
                          }`}
                          title={biz.isRecommended ? 'Quitar recomendada' : 'Recomendar'}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSyncSingle(biz)}
                        disabled={syncingSingleId === biz.id}
                        className="p-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 cursor-pointer disabled:opacity-50"
                        title="Sincronizar y actualizar con WordPress WooCommerce"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingSingleId === biz.id ? 'animate-spin' : ''}`} />
                      </button>
                      {onEditBusiness && (
                        <button
                          type="button"
                          onClick={() => onEditBusiness(biz)}
                          className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteBusiness && (
                        <button
                          type="button"
                          onClick={() => handleDelete(biz)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List Mode Table */
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3">Empresa</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Colonia</th>
                <th className="p-3">Teléfono / WA</th>
                <th className="p-3">PIN Propietario</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {sortedBusinesses.map(biz => {
                const pinInfo = pinsMap[biz.id];

                return (
                  <tr key={biz.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="p-3 font-bold text-stone-900">
                      <div className="flex items-center gap-2">
                        {biz.image && (
                          <img
                            src={biz.image}
                            alt=""
                            className="w-7 h-7 rounded object-contain border border-stone-200 bg-white"
                            onError={e => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        )}
                        <span>{biz.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-stone-600">{biz.categories?.[0] || 'Comercio'}</td>
                    <td className="p-3 text-stone-500">{biz.colonia || 'Carmen'}</td>
                    <td className="p-3 text-stone-600 font-mono">
                      {formatPhoneNumber(biz.whatsapp || biz.phone)}
                    </td>
                    <td className="p-3">
                      {pinInfo ? (
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="font-bold text-stone-900 bg-stone-100 px-1.5 py-0.5 rounded">
                            {pinInfo.pin}
                          </span>
                          <button
                            onClick={() => handleCopyPin(biz.id, pinInfo.pin)}
                            className="text-stone-400 hover:text-stone-700 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleGeneratePin(biz.id)}
                          className="text-[11px] font-bold text-purple-700 hover:text-purple-800"
                        >
                          + Generar
                        </button>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleSyncSingle(biz)}
                          disabled={syncingSingleId === biz.id}
                          className="p-1 rounded text-purple-600 hover:text-purple-800 disabled:opacity-40"
                          title="Sincronizar y actualizar con WordPress WooCommerce"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingSingleId === biz.id ? 'animate-spin' : ''}`} />
                        </button>
                        {onEditBusiness && (
                          <button
                            onClick={() => onEditBusiness(biz)}
                            className="p-1 rounded text-stone-500 hover:text-stone-800"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteBusiness && (
                          <button
                            onClick={() => handleDelete(biz)}
                            className="p-1 rounded text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Búsqueda Automática de Empresas Carmelitas */}
      <AdminAutoBusinessesModal
        isOpen={isAutoSearchModalOpen}
        onClose={() => {
          setIsAutoSearchModalOpen(false);
          setAutoModalTriggerAi(false);
        }}
        initialSource={autoModalSource}
        autoTriggerAiScan={autoModalTriggerAi}
        onBusinessApproved={(newBiz) => {
          if (onBusinessApproved) {
            onBusinessApproved(newBiz);
          }
        }}
      />
    </div>
  );
};
