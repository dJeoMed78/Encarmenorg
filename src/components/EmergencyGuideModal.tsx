import React, { useState, useMemo, useEffect } from 'react';
import {
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Search,
  X,
  ShieldAlert,
  HeartPulse,
  Building2,
  Flame,
  Store,
  Truck,
  Zap,
  Droplets,
  AlertTriangle,
  ExternalLink,
  Share2,
  Wrench,
  Key,
  Edit2,
  Trash2,
  Plus,
  Settings,
  Check
} from 'lucide-react';
import {
  EmergencyServiceItem,
  getEmergencyServices,
  addEmergencyService,
  updateEmergencyService,
  deleteEmergencyService
} from '../services/emergencyService';
import { isSessionAdminAuthenticated } from '../utils/adminAuth';

interface EmergencyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdminPanel?: () => void;
}

const AVAILABLE_ICONS = [
  { name: 'ShieldAlert', label: 'Seguridad / 911' },
  { name: 'HeartPulse', label: 'Cruz Roja / Urgencias' },
  { name: 'Building2', label: 'Hospital / Clínica' },
  { name: 'Flame', label: 'Bomberos / Protección Civil' },
  { name: 'Store', label: 'Farmacia / Comercio' },
  { name: 'Truck', label: 'Grúas / Remolque' },
  { name: 'Zap', label: 'CFE / Electricidad' },
  { name: 'Droplets', label: 'SMAPAC / Agua' },
  { name: 'Wrench', label: 'Mecánico / Taller' },
  { name: 'Key', label: 'Cerrajería 24h' }
];

export const EmergencyGuideModal: React.FC<EmergencyGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenAdminPanel
}) => {
  const [services, setServices] = useState<EmergencyServiceItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAdmin, setIsAdmin] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<EmergencyServiceItem | null>(null);

  // Direct editing modal state
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EmergencyServiceItem | null>(null);
  const [formData, setFormData] = useState<Omit<EmergencyServiceItem, 'id'>>({
    name: '',
    category: 'Seguridad y Urgencias',
    phone: '',
    whatsapp: '',
    address: '',
    schedule: '24 Horas / 365 días',
    description: '',
    icon: 'ShieldAlert',
    badge: 'Urgencias 24h',
    isUrgent: false
  });

  const loadServices = () => {
    setServices(getEmergencyServices());
    setIsAdmin(isSessionAdminAuthenticated());
  };

  useEffect(() => {
    if (isOpen) {
      loadServices();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => loadServices();
    const handleAuthChange = () => setIsAdmin(isSessionAdminAuthenticated());
    window.addEventListener('emergency-guide-updated', handleUpdate);
    window.addEventListener('admin-auth-changed', handleAuthChange);
    return () => {
      window.removeEventListener('emergency-guide-updated', handleUpdate);
      window.removeEventListener('admin-auth-changed', handleAuthChange);
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach(s => set.add(s.category));
    return ['all', ...Array.from(set)];
  }, [services]);

  const filteredServices = useMemo(() => {
    const q = search.toLowerCase().trim();
    return services.filter(item => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q)
      );
    });
  }, [services, search, selectedCategory]);

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShieldAlert':
        return <ShieldAlert className="w-5 h-5 text-rose-600" />;
      case 'HeartPulse':
        return <HeartPulse className="w-5 h-5 text-red-600" />;
      case 'Building2':
        return <Building2 className="w-5 h-5 text-blue-600" />;
      case 'Flame':
        return <Flame className="w-5 h-5 text-amber-600" />;
      case 'Store':
        return <Store className="w-5 h-5 text-emerald-600" />;
      case 'Truck':
        return <Truck className="w-5 h-5 text-sky-600" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-yellow-600" />;
      case 'Droplets':
        return <Droplets className="w-5 h-5 text-cyan-600" />;
      case 'Wrench':
        return <Wrench className="w-5 h-5 text-slate-700" />;
      case 'Key':
        return <Key className="w-5 h-5 text-indigo-600" />;
      default:
        return <Phone className="w-5 h-5 text-amber-600" />;
    }
  };

  const handleShare = (item: EmergencyServiceItem) => {
    const text = `🚨 Número de Emergencia en Ciudad del Carmen:\n\n*${item.name}*\n📞 Teléfono: ${item.phone}\n📍 Ubicación: ${item.address}\n⏱️ Horario: ${item.schedule}\n\nEncuentra más teléfonos de auxilio 24/7 en https://encarmen.org`;
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    const a = document.createElement('a');
    a.href = shareUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenAddNew = () => {
    if (!isSessionAdminAuthenticated()) {
      alert('Esta acción requiere privilegios de Administrador.');
      return;
    }
    setEditingItem(null);
    setFormData({
      name: '',
      category: 'Seguridad y Urgencias',
      phone: '',
      whatsapp: '',
      address: 'Ciudad del Carmen, Campeche',
      schedule: '24 Horas / 365 días',
      description: '',
      icon: 'ShieldAlert',
      badge: 'Servicio 24h',
      isUrgent: false
    });
    setIsEditingModalOpen(true);
  };

  const handleOpenEdit = (item: EmergencyServiceItem) => {
    if (!isSessionAdminAuthenticated()) {
      alert('Esta acción requiere privilegios de Administrador.');
      return;
    }
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      phone: item.phone,
      whatsapp: item.whatsapp || '',
      address: item.address,
      schedule: item.schedule,
      description: item.description,
      icon: item.icon,
      badge: item.badge,
      isUrgent: Boolean(item.isUrgent)
    });
    setIsEditingModalOpen(true);
  };

  const handleDeleteItem = (item: EmergencyServiceItem) => {
    if (!isSessionAdminAuthenticated()) {
      return;
    }
    setServiceToDelete(item);
  };

  const executeConfirmedDelete = () => {
    if (!serviceToDelete) return;
    deleteEmergencyService(serviceToDelete.id);
    setServiceToDelete(null);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSessionAdminAuthenticated()) {
      alert('Esta acción requiere privilegios de Administrador.');
      return;
    }
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('El nombre y el teléfono son requeridos.');
      return;
    }

    if (editingItem) {
      updateEmergencyService(editingItem.id, formData);
    } else {
      addEmergencyService(formData);
    }
    setIsEditingModalOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{
          border: '1.5px solid rgba(255, 255, 255, 0.90)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.95)',
        }}
      >
        {/* Header Superior Fijo con botón de cerrar */}
        <div className="px-5 py-4 bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 text-white shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                <ShieldAlert className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-white text-rose-700 font-black text-[10px] uppercase tracking-wider shadow-xs">
                    Servicio 24/7
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  {isAdmin && (
                    <span className="px-2 py-0.5 rounded-full bg-black/40 text-amber-300 font-mono text-[10px] border border-amber-300/40">
                      Modo Admin
                    </span>
                  )}
                </div>
                <h2 className="text-base sm:text-xl font-black tracking-tight text-white truncate mt-0.5">
                  Guía de Emergencias 24/7
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleOpenAddNew}
                  className="px-3 py-1.5 rounded-xl bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold flex items-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer"
                  title="Agregar nuevo servicio"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Nuevo</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer select-none"
                title="Cerrar guía"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Zona deslizable única con inercia táctil nativa para iOS y Safari */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:p-6 space-y-4 [-webkit-overflow-scrolling:touch]"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Quick 911 Call Banner */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-black/40 border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-md">
            <div className="flex items-center gap-2 text-xs text-white">
              <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
              <span>¿Riesgo vital o delito en curso? Llama de inmediato al <strong className="text-amber-300 font-black">911</strong></span>
            </div>
            <a
              href="tel:911"
              className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-[#007AFF] hover:bg-[#0062cc] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/30 transition-all active:scale-95 cursor-pointer select-none"
            >
              <Phone className="w-3.5 h-3.5 fill-current" />
              <span>Marcar al 911 (Gratis)</span>
            </a>
          </div>

          {/* Search & Categories Bar */}
          <div className="space-y-3">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar hospital, farmacia de turno, bomberos, grúa, CFE..."
                className="w-full pl-10 pr-4 py-2.5 bg-stone-100 dark:bg-slate-800/80 border border-stone-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-stone-950 dark:text-white font-semibold placeholder:text-stone-500 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#007AFF] focus:ring-2 focus:ring-blue-500/20 transition-all shadow-xs"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-all select-none ${
                    selectedCategory === cat
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-slate-700'
                  }`}
                >
                  {cat === 'all' ? `Todos (${services.length})` : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de tarjetas en flujo vertical único sin scroll anidado */}
          {filteredServices.length === 0 ? (
            <div className="text-center py-10 text-stone-500 font-semibold text-xs">
              No se encontraron servicios de emergencia con ese término de búsqueda.
            </div>
          ) : (
            <div className="flex flex-col gap-3.5 w-full">
              {filteredServices.map(service => (
                <div
                  key={service.id}
                  className={`p-4 rounded-2xl transition-all flex flex-col justify-between space-y-3 ${
                    service.isUrgent
                      ? 'bg-rose-50/90 dark:bg-rose-950/20 border-2 border-rose-300 dark:border-rose-800 shadow-sm'
                      : 'bg-stone-50 dark:bg-slate-800/80 border border-stone-200 dark:border-slate-700 shadow-xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                          service.isUrgent ? 'bg-rose-100 dark:bg-rose-900/40 border border-rose-200' : 'bg-white dark:bg-slate-700 border border-stone-200 dark:border-slate-600'
                        }`}>
                          {renderIcon(service.icon)}
                        </div>
                        <div>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            service.isUrgent
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                              : 'bg-stone-200/70 text-stone-800 dark:bg-slate-700 dark:text-stone-300'
                          }`}>
                            {service.badge}
                          </span>
                          <h4 className="font-black text-sm text-stone-950 dark:text-white leading-tight mt-1">
                            {service.name}
                          </h4>
                        </div>
                      </div>

                      {/* Admin inline edit actions */}
                      {isAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(service)}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-stone-100 text-stone-800 dark:text-stone-200 transition-colors shadow-xs"
                            title="Modificar datos del servicio"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(service)}
                            className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 text-rose-600 dark:text-rose-300 transition-colors shadow-xs"
                            title="Eliminar de la guía"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-stone-700 dark:text-stone-300 font-medium line-clamp-2">
                      {service.description}
                    </p>

                    <div className="space-y-1 text-[11px] text-stone-600 dark:text-stone-400 font-semibold pt-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{service.address}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">{service.schedule}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-stone-200 dark:border-slate-700 flex items-center gap-2">
                    {/* Botón de Llamar estilo iPhone Blue */}
                    <a
                      href={`tel:${service.phone}`}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#007AFF] hover:bg-[#0062cc] active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer select-none"
                    >
                      <Phone className="w-3.5 h-3.5 fill-current" />
                      <span>Llamar {service.phone}</span>
                    </a>

                    {/* Botón de WhatsApp estilo Apple Green */}
                    {service.whatsapp && (
                      <a
                        href={`https://wa.me/52${service.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, consulto información de emergencia de ${service.name}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 rounded-xl bg-[#34C759] hover:bg-[#28a745] active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1 transition-all shadow-md shadow-green-500/20 select-none cursor-pointer"
                        title="Enviar WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleShare(service)}
                      className="p-2 rounded-xl bg-white dark:bg-slate-700 hover:bg-stone-100 text-stone-700 dark:text-stone-300 transition-colors shadow-xs cursor-pointer select-none"
                      title="Compartir datos por WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3.5 bg-stone-50 dark:bg-slate-900 border-t border-stone-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-stone-500 shrink-0">
          <span>Directorio de auxilio permanente de Ciudad del Carmen, Campeche</span>
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenAddNew}
              className="text-rose-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Agregar servicio no listado</span>
            </button>
          )}
        </div>
      </div>

      {/* Direct Edit / Add Modal (iOS Liquid Glass Design) */}
      {isEditingModalOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fadeIn"
          style={{
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(25px)',
            WebkitBackdropFilter: 'blur(25px)'
          }}
        >
          <div
            className="rounded-3xl max-w-lg w-full p-6 text-stone-900 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-scaleUp"
            style={{
              background: 'rgba(255, 255, 255, 0.86)',
              backdropFilter: 'blur(40px) saturate(190%)',
              WebkitBackdropFilter: 'blur(40px) saturate(190%)',
              border: '1.5px solid rgba(255, 255, 255, 0.95)',
              boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.95)'
            }}
          >
            <div className="flex items-center justify-between border-b border-stone-200/60 pb-3">
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>{editingItem ? 'Editar Datos de Emergencia' : 'Nuevo Contacto de Emergencia'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingModalOpen(false)}
                className="p-1.5 rounded-full text-stone-500 hover:text-stone-900 hover:bg-white/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-stone-900 font-extrabold mb-1">
                  Nombre del Organismo / Servicio *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ej. Cruz Roja Mexicana Delegación Carmen"
                  className="w-full px-3.5 py-2.5 rounded-2xl text-stone-900 text-xs font-semibold placeholder:text-stone-400 outline-none transition-all focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  style={{
                    background: 'rgba(255, 255, 255, 0.70)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1.5px solid rgba(255, 255, 255, 0.90)',
                    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)'
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-900 font-extrabold mb-1">
                    Categoría *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    placeholder="ej. Ambulancias y Urgencias"
                    className="w-full px-3.5 py-2.5 rounded-2xl text-stone-900 text-xs font-semibold placeholder:text-stone-400 outline-none transition-all focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                    style={{
                      background: 'rgba(255, 255, 255, 0.70)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1.5px solid rgba(255, 255, 255, 0.90)',
                      boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-stone-900 font-extrabold mb-1">
                    Insignia / Badge
                  </label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={e => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="ej. Urgencias 24h"
                    className="w-full px-3.5 py-2.5 rounded-2xl text-stone-900 text-xs font-semibold placeholder:text-stone-400 outline-none transition-all focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                    style={{
                      background: 'rgba(255, 255, 255, 0.70)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1.5px solid rgba(255, 255, 255, 0.90)',
                      boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)'
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-900 font-extrabold mb-1">
                    Teléfono directo *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="ej. 9383821520 o 911"
                    className="w-full px-3.5 py-2.5 rounded-2xl text-stone-900 font-mono text-xs font-bold placeholder:text-stone-400 outline-none transition-all focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                    style={{
                      background: 'rgba(255, 255, 255, 0.70)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1.5px solid rgba(255, 255, 255, 0.90)',
                      boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-stone-900 font-extrabold mb-1">
                    WhatsApp (Opcional)
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsapp || ''}
                    onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="ej. 9383821520"
                    className="w-full px-3.5 py-2.5 rounded-2xl text-stone-900 font-mono text-xs font-bold placeholder:text-stone-400 outline-none transition-all focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                    style={{
                      background: 'rgba(255, 255, 255, 0.70)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1.5px solid rgba(255, 255, 255, 0.90)',
                      boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)'
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-900 font-extrabold mb-1">
                  Dirección o Referencia en Carmen
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="ej. Calle 47 entre 36 y 38, Col. Fátima"
                  className="w-full px-3.5 py-2.5 rounded-2xl text-stone-900 text-xs font-semibold placeholder:text-stone-400 outline-none transition-all focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  style={{
                    background: 'rgba(255, 255, 255, 0.70)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1.5px solid rgba(255, 255, 255, 0.90)',
                    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)'
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-900 font-extrabold mb-1">
                    Horario de Atención
                  </label>
                  <input
                    type="text"
                    value={formData.schedule}
                    onChange={e => setFormData({ ...formData, schedule: e.target.value })}
                    placeholder="ej. 24 Horas Urgencias"
                    className="w-full px-3.5 py-2.5 rounded-2xl text-stone-900 text-xs font-semibold placeholder:text-stone-400 outline-none transition-all focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                    style={{
                      background: 'rgba(255, 255, 255, 0.70)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1.5px solid rgba(255, 255, 255, 0.90)',
                      boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-stone-900 font-extrabold mb-1">
                    Icono Representativo
                  </label>
                  <select
                    value={formData.icon}
                    onChange={e => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl text-stone-900 text-xs font-semibold outline-none transition-all focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                    style={{
                      background: 'rgba(255, 255, 255, 0.70)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1.5px solid rgba(255, 255, 255, 0.90)',
                      boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    {AVAILABLE_ICONS.map(i => (
                      <option key={i.name} value={i.name}>{i.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-900 font-extrabold mb-1">
                  Descripción o Recomendación
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="ej. Servicio de ambulancias y primeros auxilios..."
                  className="w-full px-3.5 py-2.5 rounded-2xl text-stone-900 text-xs font-semibold placeholder:text-stone-400 outline-none transition-all focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 resize-none"
                  style={{
                    background: 'rgba(255, 255, 255, 0.70)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1.5px solid rgba(255, 255, 255, 0.90)',
                    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)'
                  }}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modalIsUrgent"
                  checked={formData.isUrgent}
                  onChange={e => setFormData({ ...formData, isUrgent: e.target.checked })}
                  className="w-4 h-4 rounded text-rose-600 bg-white/80 border-stone-300 cursor-pointer"
                />
                <label htmlFor="modalIsUrgent" className="text-stone-900 font-bold cursor-pointer select-none">
                  Marcar como servicio crítico / de alta urgencia (Prioridad)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stone-200/60">
                <button
                  type="button"
                  onClick={() => setIsEditingModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-stone-200/80 hover:bg-stone-300 text-stone-800 font-bold text-xs transition-colors cursor-pointer active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-[#FF3B30] hover:bg-[#E02E24] text-white font-black text-xs shadow-md shadow-red-500/30 transition-all cursor-pointer active:scale-95"
                >
                  {editingItem ? 'Guardar Cambios' : 'Registrar Contacto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIÁLOGO EN APP PARA CONFIRMAR ELIMINACIÓN DE SERVICIO (iOS Liquid Glass) */}
      {serviceToDelete && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in"
          style={{
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(25px)',
            WebkitBackdropFilter: 'blur(25px)'
          }}
        >
          <div
            className="w-full max-w-sm p-6 rounded-3xl shadow-2xl text-center space-y-4 animate-scaleUp"
            style={{
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(40px) saturate(190%)',
              WebkitBackdropFilter: 'blur(40px) saturate(190%)',
              border: '1.5px solid rgba(255, 255, 255, 0.95)',
              boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.95)'
            }}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center shadow-xs">
              <Trash2 className="w-6 h-6 text-rose-600" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-base font-extrabold text-stone-900">¿Eliminar contacto de emergencia?</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Se dará de baja permanentemente a <strong className="text-stone-950 font-bold">{serviceToDelete.name}</strong> de la guía de emergencias.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setServiceToDelete(null)}
                className="py-2.5 px-3 rounded-2xl bg-stone-200/80 hover:bg-stone-300 text-stone-800 font-bold text-xs transition cursor-pointer active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeConfirmedDelete}
                className="py-2.5 px-3 rounded-2xl bg-[#FF3B30] hover:bg-[#E02E24] text-white font-extrabold text-xs transition shadow-md shadow-red-500/30 cursor-pointer active:scale-95"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
