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
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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

  const handleDeleteItem = (id: string, name: string) => {
    if (!isSessionAdminAuthenticated()) {
      alert('Esta acción requiere privilegios de Administrador.');
      return;
    }
    if (!window.confirm(`¿Estás seguro de que deseas eliminar a "${name}" de la guía de emergencias?`)) return;
    deleteEmergencyService(id);
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 text-white shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                <ShieldAlert className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-white text-rose-700 font-black text-[10px] uppercase tracking-wider">
                    Servicio Comunitario 24/7
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {isAdmin && (
                    <span className="px-2 py-0.5 rounded-full bg-black/40 text-amber-300 font-mono text-[10px] border border-amber-300/40">
                      Modo Admin Activo
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 text-white">
                  Guía de Emergencias y Servicios Públicos
                </h2>
                <p className="text-xs text-rose-100 mt-0.5">
                  Teléfonos directos, clínicas, farmacias de turno, auxilio vial y seguridad en Ciudad del Carmen.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenAddNew}
                className="px-3 py-1.5 rounded-xl bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold flex items-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer"
                title="Agregar nuevo número o servicio"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nuevo Servicio</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer"
                title="Cerrar guía"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick 911 Call Banner */}
          <div className="mt-4 p-3 rounded-2xl bg-black/30 border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
              <span>¿Riesgo vital o delito en curso? Llama de inmediato al <strong>911</strong></span>
            </div>
            <a
              href="tel:911"
              className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-white text-rose-700 hover:bg-rose-50 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <Phone className="w-3.5 h-3.5 fill-current" />
              <span>Marcar al 911</span>
            </a>
          </div>
        </div>

        {/* Search & Categories Bar */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 space-y-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar hospital, farmacia de turno, bomberos, grúa, CFE..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={handleOpenAddNew}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  selectedCategory === cat
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                {cat === 'all' ? `Todos (${services.length})` : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Services List Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {filteredServices.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-xs">
              No se encontraron servicios de emergencia con ese término de búsqueda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredServices.map(service => (
                <div
                  key={service.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 bg-white ${
                    service.isUrgent
                      ? 'border-rose-200 hover:border-rose-400 shadow-xs'
                      : 'border-stone-200 hover:border-amber-300 shadow-xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          service.isUrgent ? 'bg-rose-50 border border-rose-100' : 'bg-stone-50 border border-stone-100'
                        }`}>
                          {renderIcon(service.icon)}
                        </div>
                        <div>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            service.isUrgent
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-stone-100 text-stone-700'
                          }`}>
                            {service.badge}
                          </span>
                          <h4 className="font-bold text-sm text-stone-900 leading-tight mt-1">
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
                            className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors"
                            title="Modificar datos del servicio"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(service.id, service.name)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                            title="Eliminar de la guía"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-stone-600 line-clamp-2">
                      {service.description}
                    </p>

                    <div className="space-y-1 text-[11px] text-stone-500 pt-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{service.address}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-emerald-800">{service.schedule}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-stone-100 flex items-center gap-2">
                    <a
                      href={`tel:${service.phone}`}
                      className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5 fill-current" />
                      <span>Llamar {service.phone}</span>
                    </a>

                    {service.whatsapp && (
                      <a
                        href={`https://wa.me/52${service.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, consulto información de emergencia de ${service.name}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1 transition-colors border border-emerald-200"
                        title="Enviar WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleShare(service)}
                      className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                      title="Compartir número por WhatsApp"
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
        <div className="p-3.5 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-stone-500 shrink-0">
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

      {/* Direct Edit / Add Modal */}
      {isEditingModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 text-stone-900 border border-stone-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>{editingItem ? 'Editar Datos de Emergencia' : 'Nuevo Contacto de Emergencia'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Nombre del Organismo / Servicio *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ej. Cruz Roja Mexicana Delegación Carmen"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Categoría *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    placeholder="ej. Ambulancias y Urgencias"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Insignia / Badge
                  </label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={e => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="ej. Urgencias 24h"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Teléfono directo *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="ej. 9383821520 o 911"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-mono outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    WhatsApp (Opcional)
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsapp || ''}
                    onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="ej. 9383821520"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-mono outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Dirección o Referencia en Carmen
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="ej. Calle 47 entre 36 y 38, Col. Fátima"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Horario de Atención
                  </label>
                  <input
                    type="text"
                    value={formData.schedule}
                    onChange={e => setFormData({ ...formData, schedule: e.target.value })}
                    placeholder="ej. 24 Horas Urgencias"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Icono Representativo
                  </label>
                  <select
                    value={formData.icon}
                    onChange={e => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 outline-none focus:border-rose-500 cursor-pointer"
                  >
                    {AVAILABLE_ICONS.map(i => (
                      <option key={i.name} value={i.name}>{i.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Descripción o Recomendación
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="ej. Servicio de ambulancias y primeros auxilios..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modalIsUrgent"
                  checked={formData.isUrgent}
                  onChange={e => setFormData({ ...formData, isUrgent: e.target.checked })}
                  className="w-4 h-4 rounded text-rose-600 bg-stone-100 border-stone-300 cursor-pointer"
                />
                <label htmlFor="modalIsUrgent" className="text-stone-700 font-semibold cursor-pointer select-none">
                  Marcar como servicio crítico / de alta urgencia
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsEditingModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-600/30 transition-all cursor-pointer"
                >
                  Guardar Datos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
