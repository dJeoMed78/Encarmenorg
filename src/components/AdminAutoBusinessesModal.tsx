import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  Edit3,
  Trash2,
  ExternalLink,
  RefreshCw,
  Phone,
  MessageSquare,
  Truck,
  Clock,
  CreditCard,
  MapPin,
  Building2,
  X,
  Check,
  AlertCircle,
  Eye,
  Globe,
  Share2,
  ChevronRight,
  Layers,
  Sparkles,
  UploadCloud,
  FileText
} from 'lucide-react';
import { AutoBusinessCandidate, Business } from '../types';
import {
  fetchAutoBusinessCandidates,
  autoSearchBusinessesWithAi,
  approveAutoBusinessCandidate,
  approveMultipleAutoBusinessCandidates,
  parseWhatsAppGroupBusinesses
} from '../services/api';
import { formatPhoneNumber } from '../utils/phone';
import { EditBusinessModal } from './EditBusinessModal';
import CATEGORIES_SEED from '../data/categories_seed.json';
import { CARMEN_POSTAL_CODES_MAP } from '../data/carmen_postal_codes';

interface AdminAutoBusinessesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBusinessApproved?: (newBiz: Business) => void;
  initialSource?: 'all' | 'official_group' | 'official_page' | 'whatsapp' | 'community' | 'ai';
  autoTriggerAiScan?: boolean;
}

export const AdminAutoBusinessesModal: React.FC<AdminAutoBusinessesModalProps> = ({
  isOpen,
  onClose,
  onBusinessApproved,
  initialSource = 'all',
  autoTriggerAiScan = false
}) => {
  const [candidates, setCandidates] = useState<AutoBusinessCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSource, setSelectedSource] = useState<'all' | 'official_group' | 'official_page' | 'whatsapp' | 'community' | 'ai'>(initialSource);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Candidate being edited in "Modificar" sub-modal
  const [editingCandidate, setEditingCandidate] = useState<AutoBusinessCandidate | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Source viewing modal for "Consultar Fuente"
  const [viewingSourceCandidate, setViewingSourceCandidate] = useState<AutoBusinessCandidate | null>(null);

  // Approving state trackers
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  // WhatsApp Group Chat Parser state
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppRawText, setWhatsAppRawText] = useState('');
  const [whatsAppGroupName, setWhatsAppGroupName] = useState('Empresas en Carmen - WhatsApp Oficial');
  const [isParsingWhatsApp, setIsParsingWhatsApp] = useState(false);

  // Load candidates on modal open
  useEffect(() => {
    if (isOpen) {
      if (initialSource) {
        setSelectedSource(initialSource);
      }
      loadCandidates();
      if (autoTriggerAiScan) {
        setSelectedSource('ai');
        handleScanWithAi();
      }
    }
  }, [isOpen, autoTriggerAiScan, initialSource]);

  const loadCandidates = async () => {
    setIsLoading(true);
    setNotice(null);
    try {
      const res = await fetchAutoBusinessCandidates('', 'all', 'all');
      if (res.success && Array.isArray(res.candidates)) {
        let dismissed: string[] = [];
        try {
          dismissed = JSON.parse(localStorage.getItem('carmen_dismissed_candidates') || '[]');
        } catch {}
        const filtered = res.candidates.filter(c => {
          const idMatch = c.id && dismissed.includes(c.id);
          const nameMatch = c.name && dismissed.includes(c.name.toLowerCase().trim());
          const phoneMatch = c.phone && dismissed.includes(c.phone.replace(/\D/g, ''));
          return !idMatch && !nameMatch && !phoneMatch;
        });
        setCandidates(filtered);
        if (filtered.length > 0) {
          setNotice({
            text: `Se detectaron ${filtered.length} negocios locales verificados en Ciudad del Carmen listos para revisión y autorización.`,
            type: 'info'
          });
        }
      } else {
        setNotice({
          text: res.message || 'No se pudieron recuperar empresas candidatas.',
          type: 'error'
        });
      }
    } catch (err: any) {
      setNotice({
        text: err.message || 'Error al conectar con el radar de empresas.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Detección con IA (30 Negocios Reales por pulsación)
  const handleScanWithAi = async () => {
    setIsAiScanning(true);
    setSelectedSource('ai');
    setNotice(null);
    try {
      const res = await autoSearchBusinessesWithAi(searchQuery, selectedCategory);
      if (res.success && Array.isArray(res.candidates) && res.candidates.length > 0) {
        setCandidates(prev => {
          // Unir y poner al frente los candidatos detectados por IA sin duplicar teléfonos
          const seen = new Set<string>();
          const combined = [...res.candidates, ...prev];
          return combined.filter(c => {
            const key = (c.phone || c.name).toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        });
        setNotice({
          text: `¡Detección con IA exitosa! Se localizaron ${res.candidates.length} negocios reales de Ciudad del Carmen con teléfono verificado.`,
          type: 'success'
        });
      } else {
        setNotice({
          text: res.message || 'No se pudieron recuperar negocios con IA en este momento.',
          type: 'error'
        });
      }
    } catch (err: any) {
      setNotice({
        text: err.message || 'Error al conectar con el radar de IA.',
        type: 'error'
      });
    } finally {
      setIsAiScanning(false);
    }
  };

  // Procesar e importar texto exportado de grupos de WhatsApp
  const handleParseWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsAppRawText.trim()) {
      alert('Por favor pega el texto exportado del chat de WhatsApp.');
      return;
    }

    setIsParsingWhatsApp(true);
    try {
      const res = await parseWhatsAppGroupBusinesses(whatsAppRawText, whatsAppGroupName);
      if (res.success && Array.isArray(res.candidates) && res.candidates.length > 0) {
        setCandidates(prev => {
          const combined = [...res.candidates, ...prev];
          // Eliminar duplicados por id o teléfono
          const seen = new Set<string>();
          return combined.filter(c => {
            if (seen.has(c.phone)) return false;
            seen.add(c.phone);
            return true;
          });
        });
        setNotice({
          text: `¡Éxito! Se extrajeron y agregaron ${res.count} prospectos desde "${whatsAppGroupName}".`,
          type: 'success'
        });
        setIsWhatsAppModalOpen(false);
        setWhatsAppRawText('');
      } else {
        alert(res.message || 'No se detectaron negocios con teléfono de 10 dígitos.');
      }
    } catch (err: any) {
      alert(err.message || 'Error al procesar el texto de WhatsApp.');
    } finally {
      setIsParsingWhatsApp(false);
    }
  };

  // 1. ACEPTAR (Aprobar y guardar con persistencia confirmada en MariaDB)
  const handleAccept = async (candidate: AutoBusinessCandidate) => {
    setApprovingId(candidate.id);
    setNotice(null);
    try {
      const res = await approveAutoBusinessCandidate(candidate);
      if (res.success && res.business) {
        // Mark candidate as accepted only after verified backend persistence
        setCandidates(prev =>
          prev.map(c => (c.id === candidate.id ? { ...c, status: 'accepted' } : c))
        );

        setNotice({
          text: `¡Éxito! "${candidate.name}" ha sido guardada y confirmada en MariaDB.`,
          type: 'success'
        });

        if (onBusinessApproved) {
          onBusinessApproved(res.business);
        }
      } else {
        setNotice({
          text: res.message || 'No se pudo confirmar la persistencia en MariaDB.',
          type: 'error'
        });
      }
    } catch (err: any) {
      setNotice({
        text: err.message || 'Error durante la persistencia de la empresa.',
        type: 'error'
      });
    } finally {
      setApprovingId(null);
    }
  };

  const allColoniasList = useMemo(() => {
    const allNames = Object.values(CARMEN_POSTAL_CODES_MAP).flat();
    return Array.from(new Set(allNames)).map(name => ({ name, count: 0 }));
  }, []);

  const allCategoriesList = useMemo(() => {
    return (CATEGORIES_SEED as any[]).map(c => ({ id: c.id, name: c.name, slug: c.slug, count: c.count }));
  }, []);

  const candidateToBusiness = (c: AutoBusinessCandidate): Business => {
    const cats = Array.isArray(c.categories) && c.categories.length > 0
      ? c.categories
      : [c.category || 'Comercios y Servicios'];
    return {
      id: typeof c.id === 'number' ? c.id : 999999,
      name: c.name || '',
      category: c.category || cats[0],
      categories: cats,
      categorySlugs: Array.isArray(c.categorySlugs) ? c.categorySlugs : [],
      description: c.description || '',
      phone: c.phone || '',
      whatsapp: c.whatsapp || c.phone || '',
      address: c.address || 'Ciudad del Carmen, Campeche',
      colonia: c.colonia || 'Ciudad del Carmen Centro',
      postalCode: c.postalCode || '24100',
      schedule: c.schedule || 'Lunes a Sábado',
      payment: c.payment || 'Efectivo y Transferencia',
      delivery: c.delivery || 'Atención en el Local de la empresa',
      hasDelivery: Boolean(c.hasDelivery),
      facebook: c.facebook || '',
      instagram: c.instagram || '',
      website: c.website || '',
      image: c.image || '',
      ...((c as any).cover_url ? { cover_url: (c as any).cover_url } : {}),
      gallery: (c as any).gallery || [],
      slug: c.slug || '',
      isRecommended: false,
      isTopBusiness: false,
      rating: 0,
      reviewCount: 0,
      verified: true,
      featured: false
    };
  };

  // 2. MODIFICAR (Abrir modal oficial de edición homologado)
  const handleOpenModify = (candidate: AutoBusinessCandidate) => {
    setEditingCandidate({ ...candidate });
  };

  const handleSaveStandardCandidateEdit = async (_id: number, updatedData: Partial<Business>) => {
    if (!editingCandidate) return { success: false, message: 'No hay candidato seleccionado' };

    const merged: AutoBusinessCandidate = {
      ...editingCandidate,
      name: updatedData.name || editingCandidate.name,
      category: updatedData.category || editingCandidate.category,
      categories: updatedData.categories || editingCandidate.categories,
      description: updatedData.description || editingCandidate.description,
      phone: updatedData.phone || editingCandidate.phone,
      whatsapp: updatedData.whatsapp || editingCandidate.whatsapp,
      address: updatedData.address || editingCandidate.address,
      colonia: updatedData.colonia || editingCandidate.colonia,
      postalCode: updatedData.postalCode || editingCandidate.postalCode,
      schedule: updatedData.schedule || editingCandidate.schedule,
      payment: updatedData.payment || editingCandidate.payment,
      delivery: updatedData.delivery || editingCandidate.delivery,
      hasDelivery: updatedData.hasDelivery ?? editingCandidate.hasDelivery,
      facebook: updatedData.facebook || editingCandidate.facebook,
      instagram: updatedData.instagram || editingCandidate.instagram,
      website: updatedData.website || editingCandidate.website,
      image: updatedData.image || editingCandidate.image,
      ...((updatedData as any).cover_url ?? (editingCandidate as any).cover_url ? { cover_url: (updatedData as any).cover_url ?? (editingCandidate as any).cover_url } : {}),
      gallery: updatedData.gallery || (editingCandidate as any).gallery,
      slug: updatedData.slug || editingCandidate.slug,
      status: 'modified'
    };

    setCandidates(prev => prev.map(c => (c.id === editingCandidate.id ? merged : c)));
    setEditingCandidate(null);
    setNotice({
      text: `Datos de "${merged.name}" actualizados con el formulario homologado.`,
      type: 'info'
    });
    return { success: true, message: 'Candidato actualizado con éxito' };
  };

  // 3. ELIMINAR (Descartar y depurar de forma permanente de la lista de prospectos)
  const handleDeleteCandidate = async (candidateId: string, name: string, phone?: string) => {
    if (!window.confirm(`¿Deseas descartar y eliminar a "${name}" de la lista de prospectos? No volverá a aparecer al buscar.`)) return;

    setCandidates(prev => prev.filter(c => c.id !== candidateId));

    try {
      const stored = JSON.parse(localStorage.getItem('carmen_dismissed_candidates') || '[]');
      if (!stored.includes(candidateId)) stored.push(candidateId);
      if (!stored.includes(name.toLowerCase().trim())) stored.push(name.toLowerCase().trim());
      if (phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone && !stored.includes(cleanPhone)) stored.push(cleanPhone);
      }
      localStorage.setItem('carmen_dismissed_candidates', JSON.stringify(stored));
    } catch {}

    try {
      await fetch('/api/admin/auto-candidates/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: candidateId, name, phone })
      });
    } catch (_) {}

    setNotice({
      text: `Empresa "${name}" descartada y depurada permanentemente.`,
      type: 'info'
    });
  };

  // 4. CONSULTAR FUENTE (Abrir modal o enlace externo de origen)
  const handleConsultSource = (candidate: AutoBusinessCandidate) => {
    setViewingSourceCandidate(candidate);
  };

  // Aceptar todos los candidatos pendientes
  const handleAcceptAllPending = async () => {
    const pending = candidates.filter(c => c.status !== 'accepted');
    if (pending.length === 0) {
      alert('No hay negocios pendientes por autorizar.');
      return;
    }

    if (
      !window.confirm(
        `¿Deseas autorizar y guardar ${pending.length} negocios en MariaDB?`
      )
    ) {
      return;
    }

    setIsApprovingAll(true);
    setNotice(null);
    try {
      const res = await approveMultipleAutoBusinessCandidates(pending);
      const confirmedList = res.confirmed || res.published || [];
      const confirmedNames = new Set(confirmedList.map(b => b.name?.toLowerCase().trim()));
      const confirmedPhones = new Set(
        confirmedList.flatMap(b => [(b.phone || '').replace(/\D/g, '').slice(-10), (b.whatsapp || '').replace(/\D/g, '').slice(-10)]).filter(Boolean)
      );

      // Actualizar estado ÚNICAMENTE para las empresas cuya persistencia fue confirmada
      setCandidates(prev =>
        prev.map(c => {
          const cPhone = (c.phone || '').replace(/\D/g, '').slice(-10);
          const cWa = (c.whatsapp || '').replace(/\D/g, '').slice(-10);
          const isConfirmed = confirmedNames.has(c.name?.toLowerCase().trim()) ||
            (cPhone && confirmedPhones.has(cPhone)) ||
            (cWa && confirmedPhones.has(cWa));

          if (isConfirmed) {
            return { ...c, status: 'accepted' };
          }
          return c;
        })
      );

      if (confirmedList.length > 0) {
        if (confirmedList.length === pending.length) {
          setNotice({
            text: `¡Éxito total! Se guardaron y confirmaron ${confirmedList.length} empresas en MariaDB.`,
            type: 'success'
          });
        } else {
          setNotice({
            text: `Operación parcial: Se confirmaron ${confirmedList.length} de ${pending.length} empresas en MariaDB. ${pending.length - confirmedList.length} no se guardaron (duplicados o errores).`,
            type: 'info'
          });
        }

        if (onBusinessApproved) {
          confirmedList.forEach(b => onBusinessApproved(b));
        }
      } else {
        setNotice({
          text: res.message || 'No se pudo confirmar el guardado de ninguna empresa en MariaDB.',
          type: 'error'
        });
      }
    } catch (err: any) {
      setNotice({
        text: err.message || 'Error de conexión durante la aprobación en lote.',
        type: 'error'
      });
    } finally {
      setIsApprovingAll(false);
    }
  };

  // Categories list extracted from candidates
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach(c => {
      if (c.category) set.add(c.category);
    });
    return Array.from(set).sort();
  }, [candidates]);

  // Source counts
  const officialGroupCount = useMemo(
    () => candidates.filter(c => c.sourceUrl?.includes('18WwRY3pKB') || c.source?.toLowerCase().includes('grupo oficial')).length,
    [candidates]
  );
  const officialPageCount = useMemo(
    () => candidates.filter(c => c.sourceUrl?.includes('facebook.com/empresasencarmen') || c.source?.toLowerCase().includes('fanpage')).length,
    [candidates]
  );
  const whatsAppCount = useMemo(
    () => candidates.filter(c => c.source?.toLowerCase().includes('whatsapp')).length,
    [candidates]
  );
  const communityCount = useMemo(
    () => candidates.filter(c => !c.isOfficialSource && !c.source?.toLowerCase().includes('whatsapp') && !c.source?.includes('IA') && !c.source?.includes('Inteligente')).length,
    [candidates]
  );
  const aiCount = useMemo(
    () => candidates.filter(c => c.source?.includes('IA') || c.source?.includes('Inteligente')).length,
    [candidates]
  );

  // Filtered candidate list with source filtering and official priority
  const filteredCandidates = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = candidates.filter(c => {
      if (selectedCategory !== 'all' && c.category !== selectedCategory) {
        return false;
      }
      if (selectedSource === 'official_group') {
        if (!c.sourceUrl?.includes('18WwRY3pKB') && !c.source?.toLowerCase().includes('grupo oficial')) return false;
      } else if (selectedSource === 'official_page') {
        if (!c.sourceUrl?.includes('facebook.com/empresasencarmen') && !c.source?.toLowerCase().includes('fanpage')) return false;
      } else if (selectedSource === 'whatsapp') {
        if (!c.source?.toLowerCase().includes('whatsapp')) return false;
      } else if (selectedSource === 'community') {
        if (c.isOfficialSource || c.source?.toLowerCase().includes('whatsapp') || c.source?.includes('IA') || c.source?.includes('Inteligente')) return false;
      } else if (selectedSource === 'ai') {
        if (!c.source?.includes('IA') && !c.source?.includes('Inteligente')) return false;
      }

      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.colonia && c.colonia.toLowerCase().includes(q)) ||
        c.phone.includes(q)
      );
    });

    // Prioridad absoluta: Páginas y grupos oficiales primero
    list.sort((a, b) => {
      if (a.isOfficialSource && !b.isOfficialSource) return -1;
      if (!a.isOfficialSource && b.isOfficialSource) return 1;
      return 0;
    });

    return list;
  }, [candidates, searchQuery, selectedCategory, selectedSource]);

  const acceptedCount = candidates.filter(c => c.status === 'accepted').length;
  const pendingCount = candidates.length - acceptedCount;

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      style={{
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
      }}
      onClick={onClose}
    >
      <div
        className="sm:rounded-3xl w-full sm:max-w-6xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden text-stone-100"
        style={{
          background: 'rgba(24, 24, 27, 0.90)',
          backdropFilter: 'blur(40px) saturate(190%)',
          WebkitBackdropFilter: 'blur(40px) saturate(190%)',
          border: '1.5px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
        }}
        onClick={e => e.stopPropagation()}
      >
        
        {/* COMPACT STICKY HEADER */}
        <div className="p-3 sm:p-5 bg-gradient-to-r from-stone-900 via-sky-950/40 to-stone-900 border-b border-stone-800 flex items-center justify-between gap-2 shrink-0 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 sm:p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0">
              <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-black text-white truncate">
                  Búsqueda Automática
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-sky-500/20 text-amber-300 text-[10px] sm:text-xs font-bold border border-amber-500/30 shrink-0">
                  IA + Fuentes Oficiales
                </span>
              </div>
              <p className="text-[11px] text-stone-400 hidden sm:block truncate">
                Rastreo autónomo y con IA en fuentes oficiales de Empresas en Carmen, Google y WhatsApp.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Botón Búsqueda con IA */}
            <button
              type="button"
              onClick={handleScanWithAi}
              disabled={isLoading || isAiScanning}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-[11px] sm:text-xs flex items-center gap-1 sm:gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              title="Detección con IA: localiza 30 negocios reales de Ciudad del Carmen con teléfono por pulsación"
            >
              <Sparkles className={`w-3.5 h-3.5 text-stone-950 ${isAiScanning ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">{isAiScanning ? 'Buscando...' : '30 con IA'}</span>
              <span className="xs:hidden">{isAiScanning ? '...' : 'IA'}</span>
            </button>

            {pendingCount > 0 && (
              <button
                type="button"
                onClick={handleAcceptAllPending}
                disabled={isApprovingAll || isLoading}
                className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] sm:text-xs flex items-center gap-1 sm:gap-1.5 shadow-md transition-colors cursor-pointer disabled:opacity-50 active:scale-95"
                title="Aprobar y publicar todos los candidatos pendientes"
              >
                <Check className="w-3.5 h-3.5 text-emerald-200" />
                <span className="hidden sm:inline">{isApprovingAll ? 'Publicando...' : `Aceptar Todos (${pendingCount})`}</span>
                <span className="sm:hidden">({pendingCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer border border-stone-700"
              aria-label="Cerrar modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* CONTENEDOR DESPLAZABLE PRINCIPAL (OPTIMIZADO PARA TOUCH EN MÓVIL) */}
        <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y min-h-0 bg-stone-900 divide-y divide-stone-800/80">
          
          {/* ACCIONES SECUNDARIAS Y FUENTES EN MÓVIL/DESKTOP */}
          <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-stone-950/70 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(true)}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600/60 text-emerald-300 font-bold text-[11px] sm:text-xs flex items-center gap-1 cursor-pointer"
                title="Importar y extraer negocios de grupos de WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={loadCandidates}
                disabled={isLoading}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-[11px] sm:text-xs flex items-center gap-1 border border-stone-700 cursor-pointer disabled:opacity-50"
                title="Refrescar búsqueda y volver a escanear"
              >
                <RefreshCw className={`w-3 h-3 text-sky-400 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refrescar</span>
              </button>

              <a
                href="https://www.facebook.com/groups/506440126097710"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-950/60 hover:bg-sky-900 border border-sky-800/80 text-sky-300 font-bold text-[11px] hover:underline"
                title="Abrir Grupo Oficial de Facebook Empresas en Carmen (506440126097710)"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Grupo FB</span>
              </a>

              <a
                href="https://www.facebook.com/empresasencarmen/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-800/80 text-amber-300 font-bold text-[11px] hover:underline"
                title="Abrir FanPage Oficial de Facebook @empresasencarmen"
              >
                <ExternalLink className="w-3 h-3" />
                <span>FanPage FB</span>
              </a>
            </div>

            <div className="text-[11px] text-stone-400 ml-auto font-mono">
              <span>Total: <strong className="text-white">{candidates.length}</strong></span>
            </div>
          </div>

          {/* NOTIFICATION BANNER */}
          {notice && (
            <div
              className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-medium flex items-center justify-between gap-2 ${
                notice.type === 'success'
                  ? 'bg-emerald-950/70 text-emerald-200'
                  : notice.type === 'error'
                  ? 'bg-rose-950/70 text-rose-200'
                  : 'bg-sky-950/70 text-sky-200'
              }`}
            >
              <div className="flex items-center gap-2 text-[11px] sm:text-xs">
                {notice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : notice.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                )}
                <span>{notice.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="p-1 text-stone-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* FILTROS POR FUENTE (SCROLL HORIZONTAL EN DISPOSITIVOS MÓVILES) */}
          <div className="px-3 sm:px-4 py-2 bg-stone-900/90 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setSelectedSource('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs shrink-0 ${
                selectedSource === 'all'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300'
              }`}
            >
              Todas ({candidates.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedSource('official_group')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs shrink-0 ${
                selectedSource === 'official_group'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-stone-800/80 hover:bg-stone-800 text-sky-300'
              }`}
            >
              👑 Grupo FB ({officialGroupCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedSource('official_page')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs shrink-0 ${
                selectedSource === 'official_page'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-stone-800/80 hover:bg-stone-800 text-amber-300'
              }`}
            >
              👑 FanPage ({officialPageCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedSource('whatsapp')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs shrink-0 ${
                selectedSource === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-stone-800/80 hover:bg-stone-800 text-emerald-300'
              }`}
            >
              📲 WhatsApp ({whatsAppCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedSource('community')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs shrink-0 ${
                selectedSource === 'community'
                  ? 'bg-stone-700 text-white shadow-xs'
                  : 'bg-stone-800/80 hover:bg-stone-800 text-stone-400'
              }`}
            >
              📍 Maps & Local ({communityCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedSource('ai')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs shrink-0 ${
                selectedSource === 'ai'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'bg-stone-800/80 hover:bg-stone-800 text-amber-300'
              }`}
            >
              ✨ IA ({aiCount})
            </button>
          </div>

          {/* CONTROLS & SEARCH BAR */}
          <div className="p-3 sm:p-4 bg-stone-900/95 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, giro, teléfono, colonia..."
                className="w-full pl-8 sm:pl-9 pr-7 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs sm:text-sm text-stone-200 placeholder:text-stone-500 focus:border-sky-500 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-500 hover:text-stone-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full pl-2.5 pr-7 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300 font-medium focus:border-sky-500 outline-none cursor-pointer appearance-none"
                >
                  <option value="all">Todas las categorías ({candidates.length})</option>
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <Filter className="w-3 h-3 text-stone-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="px-2.5 py-1.5 rounded-xl bg-stone-800 border border-stone-700 text-[11px] sm:text-xs font-mono text-stone-300 shrink-0">
                <span className="text-emerald-400 font-bold">{acceptedCount}</span> ok /{' '}
                <span className="text-amber-400 font-bold">{pendingCount}</span> pend
              </div>
            </div>
          </div>

          {/* CANDIDATES LIST CONTAINER */}
          <div className="p-3 sm:p-6 space-y-4">
          {isAiScanning ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
                <Sparkles className="w-7 h-7 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-white">
                  Rastreando 30 Empresas Reales con IA...
                </p>
                <p className="text-xs text-stone-400 max-w-md mx-auto">
                  Consultando fuentes en tiempo real de Ciudad del Carmen, Campeche. Verificando teléfonos 938, direcciones físicas y colonias reales.
                </p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-sky-500/20 border-t-sky-400 animate-spin" />
                <Globe className="w-6 h-6 text-sky-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">
                  Rastreando negocios en fuentes públicas de Ciudad del Carmen...
                </p>
                <p className="text-xs text-stone-400 max-w-md">
                  Consultando grupos de Facebook, Google Maps y directorios locales. Verificando que cada negocio tenga teléfono de contacto válido.
                </p>
              </div>
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-20 text-center space-y-4 px-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <p className="text-base font-bold text-white">
                  Bandeja Lista para Rastrear Empresas Reales
                </p>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Pulsa el botón <strong>"Búsqueda con IA (30 Negocios)"</strong> para localizar 30 comercios verificados de Ciudad del Carmen con teléfono y colonia real, o <strong>"Volver a Escanear"</strong> para consultar el catálogo de fuentes.
                </p>
                <div className="pt-3 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleScanWithAi}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs inline-flex items-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-stone-950" />
                    <span>Iniciar Búsqueda con IA (30 Empresas)</span>
                  </button>
                  <button
                    type="button"
                    onClick={loadCandidates}
                    className="px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs inline-flex items-center gap-1.5 border border-stone-700 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                    <span>Escanear Fuentes Locales</span>
                  </button>
                </div>
              </div>
            </div>
          ) : filteredCandidates.length === 0 ? (
            selectedSource === 'ai' ? (
              <div className="py-16 text-center space-y-4 max-w-md mx-auto px-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-base font-bold text-white">
                    Búsqueda con IA Lista para Iniciar
                  </p>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Pulsa el botón para que el radar con IA rastree 30 empresas reales de Ciudad del Carmen con teléfono y colonia verificada.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleScanWithAi}
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs inline-flex items-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-stone-950" />
                    <span>Rastrear 30 Empresas con IA Ahora</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center space-y-3">
                <Building2 className="w-12 h-12 text-stone-600 mx-auto" />
                <p className="text-sm font-bold text-stone-300">
                  No se encontraron negocios con los filtros aplicados.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedSource('all');
                  }}
                  className="text-xs text-sky-400 hover:underline"
                >
                  Restablecer filtros y ver todas las fuentes
                </button>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredCandidates.map((candidate, idx) => {
                const isAccepted = candidate.status === 'accepted';
                const isApprovingThis = approvingId === candidate.id;

                return (
                  <div
                    key={`${candidate.id || 'cand'}-${idx}`}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                      isAccepted
                        ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                        : 'bg-stone-950/60 hover:bg-stone-950 border-stone-800 hover:border-stone-700 shadow-md'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start gap-4 justify-between">
                      
                      {/* Left: Image & Main Info */}
                      <div className="flex items-start gap-4 flex-1">
                        {/* Business Image / Logo */}
                        <div className="relative shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-stone-800 border border-stone-700 shadow-inner group">
                          <img
                            src={candidate.image}
                            alt={candidate.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={e => {
                              (e.target as HTMLImageElement).src = '/icons/icon-512.svg';
                            }}
                          />
                          {candidate.hasDelivery && (
                            <span
                              className="absolute top-1 left-1 p-1 rounded-md bg-stone-950/80 backdrop-blur-xs text-amber-300"
                              title="Servicio a domicilio disponible"
                            >
                              <Truck className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>

                        {/* Text Details */}
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                              {candidate.name}
                            </h3>

                            {/* Badge Prioritario: Fuente Oficial */}
                            {candidate.isOfficialSource && (
                              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 via-sky-500/20 to-amber-500/20 border border-amber-400/70 text-amber-300 text-[11px] font-black flex items-center gap-1 shadow-xs animate-pulse">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 👑 Fuente Oficial Empresas en Carmen
                              </span>
                            )}

                            {/* Category badge */}
                            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-[11px] font-bold">
                              {candidate.category}
                            </span>

                            {isAccepted && (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-black flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-400" /> Publicado en Directorio Oficial
                              </span>
                            )}

                            {candidate.alreadyRegistered && !isAccepted && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-semibold">
                                Ya existe en catálogo
                              </span>
                            )}
                          </div>

                          {/* Advertising description */}
                          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-normal bg-stone-900/60 p-2.5 rounded-xl border border-stone-800/80">
                            "{candidate.description}"
                          </p>

                          {/* Chips: Phone, Address, Delivery, Schedule, Payment */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {/* Phone & WhatsApp (Mandatory highlight) */}
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-mono font-bold">
                              <Phone className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{formatPhoneNumber(candidate.phone)}</span>
                              <a
                                href={`https://wa.me/52${candidate.whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-1 text-emerald-400 hover:text-emerald-200"
                                title="Abrir chat en WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            </div>

                            {/* Delivery */}
                            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-900 border border-stone-800 text-amber-300 text-xs">
                              <Truck className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[200px]">{candidate.delivery}</span>
                            </div>

                            {/* Address / Colonia */}
                            {candidate.address && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 text-xs">
                                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                                <span className="truncate max-w-[220px]">
                                  {candidate.address} ({candidate.colonia})
                                </span>
                              </div>
                            )}

                            {/* Schedule */}
                            {candidate.schedule && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 text-xs">
                                <Clock className="w-3.5 h-3.5 text-sky-400" />
                                <span>{candidate.schedule}</span>
                              </div>
                            )}

                            {/* Payment */}
                            {candidate.payment && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 text-xs">
                                <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                                <span>{candidate.payment}</span>
                              </div>
                            )}
                          </div>

                          {/* Source badge */}
                          <div className="flex items-center gap-1.5 text-[11px] text-stone-400 pt-1 flex-wrap">
                            <span className="font-semibold text-stone-500">Procedencia:</span>
                            <span className="text-sky-300 font-medium">{candidate.source}</span>
                            {(candidate as any).isLiveWebDiscovery === false && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-stone-800 text-stone-300 border border-stone-700">
                                Catálogo local
                              </span>
                            )}
                            {(candidate as any).isLiveWebDiscovery === true && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
                                Detección web activa
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: The 4 requested options (Aceptar, Modificar, Eliminar, Consultar Fuente) */}
                      <div className="flex md:flex-col items-center justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-stone-800">
                        {/* 1. ACEPTAR */}
                        <button
                          type="button"
                          onClick={() => handleAccept(candidate)}
                          disabled={isApprovingThis || isAccepted}
                          className={`w-full sm:w-auto px-4 py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                            isAccepted
                              ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 cursor-default'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                          }`}
                          title="Aprobar y publicar en el Directorio Oficial de Carmen"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {isApprovingThis ? 'Publicando...' : isAccepted ? 'Aceptado ✓' : 'Aceptar'}
                          </span>
                        </button>

                        {/* 2. MODIFICAR */}
                        <button
                          type="button"
                          onClick={() => handleOpenModify(candidate)}
                          className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-sky-950/70 hover:bg-sky-900/80 border border-sky-800 text-sky-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Editar nombre, giro, teléfono, descripción o imagen antes de publicar"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                          <span>Modificar</span>
                        </button>

                        {/* 3. ELIMINAR */}
                        <button
                          type="button"
                          onClick={() => handleDeleteCandidate(candidate.id, candidate.name, candidate.phone)}
                          className="w-full sm:w-auto px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-950/80 border border-rose-900/60 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Descartar este negocio de la lista de prospectos"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>Eliminar</span>
                        </button>

                        {/* 4. VER EN GOOGLE MAPS */}
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(candidate.name + ' Ciudad del Carmen Campeche')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full sm:w-auto px-3 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Buscar este negocio en Google Maps"
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Google Maps</span>
                        </a>

                        {/* 5. CONSULTAR FUENTE */}
                        <button
                          type="button"
                          onClick={() => handleConsultSource(candidate)}
                          className="w-full sm:w-auto px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Ver enlace original, grupo de Facebook o ficha de Google Maps"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                          <span>Consultar Fuente</span>
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              Catálogo 100% autónomo:{' '}
              <strong className="text-white">Persistencia local e integración directa con MariaDB Hostinger</strong>.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold transition-colors cursor-pointer"
          >
            Cerrar Ventana
          </button>
        </div>

      </div>

      {/* =========================================================================
          SUB-MODAL: MODIFICAR CANDIDATO
          ========================================================================= */}
      {/* =========================================================================
          SUB-MODAL: MODIFICAR CANDIDATO (HOMOLOGADO AL 100% CON LA PANTALLA PRINCIPAL)
          ========================================================================= */}
      {editingCandidate && (
        <EditBusinessModal
          business={candidateToBusiness(editingCandidate)}
          isOpen={Boolean(editingCandidate)}
          onClose={() => setEditingCandidate(null)}
          categories={allCategoriesList}
          coloniasList={allColoniasList}
          onSave={handleSaveStandardCandidateEdit}
        />
      )}

      {/* =========================================================================
          SUB-MODAL: CONSULTAR FUENTE
          ========================================================================= */}
      {viewingSourceCandidate && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-stone-900 border border-stone-700 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-stone-100">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-black text-white">
                  Fuente de Información
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingSourceCandidate(null)}
                className="p-1 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-stone-400 font-bold">Empresa Prospecto:</span>
                <p className="text-lg font-black text-white">{viewingSourceCandidate.name}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-stone-300">
                  <span className="font-mono text-emerald-400 font-bold">Tel: {viewingSourceCandidate.phone}</span>
                  {viewingSourceCandidate.address && (
                    <span className="text-stone-400">· {viewingSourceCandidate.address} ({viewingSourceCandidate.colonia})</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs text-stone-400 font-bold">Origen público registrado:</span>
                <p className="text-sm font-semibold text-purple-300">{viewingSourceCandidate.source}</p>
              </div>

              {/* Enlace Directo a la Fuente Original Auténtica */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-stone-200 block">Enlace de la Fuente Original Registrada:</span>
                
                {viewingSourceCandidate.sourceUrl ? (
                  <a
                    href={viewingSourceCandidate.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-4 py-3 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-700 text-purple-200 font-bold text-xs flex items-center justify-between transition-colors shadow-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-purple-400 shrink-0" />
                      <span>Abrir publicación o fuente original verificada</span>
                    </div>
                    <span className="text-[11px] text-purple-300 font-mono">Abrir enlace →</span>
                  </a>
                ) : (
                  <p className="text-xs text-stone-400 italic bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                    Fuente local validada directamente por el directorio comercial de Carmen.
                  </p>
                )}

                {/* WhatsApp Directo de Verificación */}
                {viewingSourceCandidate.phone && (
                  <a
                    href={`https://wa.me/52${viewingSourceCandidate.phone}?text=${encodeURIComponent('Hola ' + viewingSourceCandidate.name + ', nos comunicamos del Directorio Empresas en Carmen para verificar su información.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 font-bold text-xs flex items-center justify-between transition-colors shadow-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Contactar al negocio por WhatsApp (+52 {viewingSourceCandidate.phone})</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">Chatear →</span>
                  </a>
                )}
              </div>

              <div className="p-3 bg-amber-950/40 border border-amber-600/40 rounded-xl text-xs text-amber-200 space-y-1">
                <p className="font-bold">⚠️ Política de Veracidad de Empresas en Carmen:</p>
                <p className="text-[11px] text-amber-300/90 leading-relaxed">
                  Si la dirección, horarios o giro no coinciden exactamente con lo que conoces, usa el botón <strong>"Modificar"</strong> para ajustar los datos reales antes de publicar. Nunca publiques información sin confirmar.
                </p>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => {
                  const target = viewingSourceCandidate;
                  setViewingSourceCandidate(null);
                  handleOpenModify(target);
                }}
                className="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modificar Datos</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingSourceCandidate(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-MODAL: IMPORTAR DESDE GRUPOS DE WHATSAPP (ADMINISTRADOR)
          ========================================================================= */}
      {isWhatsAppModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-stone-900 border border-stone-700 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-stone-100">
            
            <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-900 via-emerald-950/60 to-stone-900 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    Importar desde Grupos de WhatsApp
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      Extracción Sin IA
                    </span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    Como administrador, puedes importar automáticamente todas las publicaciones y teléfonos de tus grupos.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleParseWhatsApp} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Instrucciones sencillas */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 text-xs text-stone-300 space-y-2">
                <h4 className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> ¿Cómo darle acceso y extraer las empresas de tu grupo?
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-stone-300 leading-relaxed">
                  <li>Abre WhatsApp en tu teléfono y entra al grupo donde eres administrador.</li>
                  <li>Toca el nombre del grupo arriba o los 3 puntos y ve a <strong>"Más" &gt; "Exportar chat"</strong>.</li>
                  <li>Elige la opción <strong>"Sin archivos"</strong> para generar el archivo de texto plano.</li>
                  <li>Copia todo el contenido del chat o pégalo directamente en el recuadro de abajo.</li>
                  <li>El sistema analizará autónomamente cada mensaje, extraerá los números de teléfono (+52 938...), detectará el giro y los preparará para tu revisión.</li>
                </ol>
              </div>

              {/* Nombre del Grupo */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Nombre del Grupo de WhatsApp *
                </label>
                <input
                  type="text"
                  value={whatsAppGroupName}
                  onChange={e => setWhatsAppGroupName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-sm text-white focus:border-emerald-500 outline-none"
                  placeholder="Ej: Empresas y Emprendedores en Carmen (Grupo 1)"
                  required
                />
              </div>

              {/* Contenido del Chat */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-300">
                    Texto del Chat Exportado *
                  </label>
                  <span className="text-[11px] text-stone-500 font-mono">
                    {whatsAppRawText.length > 0 ? `${whatsAppRawText.length} caracteres` : 'Pega el texto aquí'}
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={whatsAppRawText}
                  onChange={e => setWhatsAppRawText(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-stone-950 border border-stone-700 text-xs text-stone-200 font-mono focus:border-emerald-500 outline-none resize-none leading-relaxed"
                  placeholder="[10/10/26, 10:15:30 AM] Juan Pérez: Vendo tacos al pastor y empanadas, pedidos al 9381234567 con servicio a domicilio en toda la isla...&#10;[10/10/26, 10:20:12 AM] Climas Carmen: Mantenimiento e instalación de minisplits 9381458920..."
                  required
                />
              </div>

              <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-end gap-2.5 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setIsWhatsAppModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isParsingWhatsApp || !whatsAppRawText.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{isParsingWhatsApp ? 'Procesando Chat...' : 'Extraer Negocios Automáticamente'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
