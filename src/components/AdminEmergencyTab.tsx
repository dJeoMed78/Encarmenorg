import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Plus,
  Edit2,
  Trash2,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Search,
  RotateCcw,
  Check,
  X,
  AlertTriangle,
  Building2,
  HeartPulse,
  Flame,
  Store,
  Truck,
  Zap,
  Droplets,
  Wrench,
  Key
} from 'lucide-react';
import {
  EmergencyServiceItem,
  getEmergencyServices,
  addEmergencyService,
  updateEmergencyService,
  deleteEmergencyService,
  resetEmergencyServicesToDefault
} from '../services/emergencyService';

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

export const AdminEmergencyTab: React.FC = () => {
  const [services, setServices] = useState<EmergencyServiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Form State for Add / Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const loadData = () => {
    setServices(getEmergencyServices());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('emergency-guide-updated', handleUpdate);
    return () => window.removeEventListener('emergency-guide-updated', handleUpdate);
  }, []);

  const categories = Array.from(new Set(services.map(s => s.category)));

  const filteredServices = services.filter(item => {
    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    if (!matchCat) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.phone.includes(q) ||
      item.address.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const handleOpenCreate = () => {
    setEditingId(null);
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
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: EmergencyServiceItem) => {
    setEditingId(item.id);
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
    setIsFormOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    setServiceToDelete({ id, name });
  };

  const confirmDeleteService = () => {
    if (!serviceToDelete) return;
    deleteEmergencyService(serviceToDelete.id);
    setMessage({ text: `"${serviceToDelete.name}" fue eliminado correctamente.`, type: 'success' });
    setServiceToDelete(null);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleResetDefaults = () => {
    setShowResetConfirm(true);
  };

  const confirmResetDefaults = () => {
    resetEmergencyServicesToDefault();
    setMessage({ text: 'Lista oficial de emergencias restaurada.', type: 'success' });
    setShowResetConfirm(false);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      setMessage({ text: 'El nombre y el teléfono son obligatorios.', type: 'error' });
      return;
    }

    if (editingId) {
      updateEmergencyService(editingId, formData);
      setMessage({ text: `Servicio "${formData.name}" actualizado correctamente.`, type: 'success' });
    } else {
      addEmergencyService(formData);
      setMessage({ text: `Nuevo servicio "${formData.name}" agregado a emergencias.`, type: 'success' });
    }

    setIsFormOpen(false);
    setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[80vh]">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs text-stone-900">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <h2 className="text-lg font-bold text-stone-900 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <span>Administrador de Guía de Emergencias 24/7</span>
            </h2>
          </div>
          <p className="text-xs text-stone-600 mt-1">
            Modifica teléfonos directos, agrega hospitales, grúas, mecánicos o farmacias, y elimina datos desactualizados en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 border border-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Restaurar lista original"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restaurar</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Servicio</span>
          </button>
        </div>
      </div>

      {/* Status Alert Message */}
      {message && (
        <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn ${
          message.type === 'success' ? 'bg-emerald-50 border border-emerald-300 text-emerald-800' : 'bg-rose-50 border border-rose-300 text-rose-800'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="p-1 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, teléfono, dirección o categoría..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-rose-500 shadow-2xs"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-rose-500 cursor-pointer shadow-2xs"
        >
          <option value="all">Todas las categorías ({services.length})</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Services Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredServices.length === 0 ? (
          <div className="col-span-full py-12 text-center text-stone-500 text-xs bg-white/80 rounded-2xl border border-stone-200 shadow-xs">
            No se encontraron servicios de emergencia con los criterios seleccionados.
          </div>
        ) : (
          filteredServices.map(item => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 bg-white shadow-xs text-stone-900 ${
                item.isUrgent
                  ? 'border-rose-300 hover:border-rose-400'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        item.isUrgent ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-stone-100 text-stone-700 border border-stone-200'
                      }`}>
                        {item.badge || item.category}
                      </span>
                      {item.isUrgent && (
                        <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Urgente
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-stone-900 mt-1">
                      {item.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-colors cursor-pointer"
                      title="Editar servicio"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.name)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                      title="Eliminar servicio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-stone-600 line-clamp-2">
                  {item.description}
                </p>

                <div className="space-y-1 text-xs text-stone-500 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="font-mono font-bold text-stone-900">{item.phone}</span>
                    {item.whatsapp && (
                      <span className="text-emerald-600 text-[11px] font-mono font-semibold">
                        (WhatsApp: {item.whatsapp})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate text-stone-600">{item.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-emerald-700 font-medium">{item.schedule}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Form for Add/Edit (iOS Liquid Glass Design) */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
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
                <span>{editingId ? 'Editar Servicio de Emergencia' : 'Nuevo Servicio de Emergencia'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-full text-stone-500 hover:text-stone-900 hover:bg-white/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
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
                    placeholder="ej. 24 Horas / Urgencias"
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
                  Dirección o Referencia
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="ej. Calle 47 entre 36 y 38, Col. Fátima, Cd. del Carmen"
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
                    placeholder="ej. 24 Horas / 365 días"
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
                  Descripción del servicio o recomendaciones
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="ej. Servicio de ambulancia de rescate, atención médica inmediata..."
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
                  id="isUrgent"
                  checked={formData.isUrgent}
                  onChange={e => setFormData({ ...formData, isUrgent: e.target.checked })}
                  className="w-4 h-4 rounded text-rose-600 bg-white/80 border-stone-300 cursor-pointer"
                />
                <label htmlFor="isUrgent" className="text-stone-900 font-bold cursor-pointer select-none">
                  Marcar como servicio crítico / de alta urgencia (Prioridad)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stone-200/60">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-stone-200/80 hover:bg-stone-300 text-stone-800 font-bold text-xs transition-colors cursor-pointer active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-[#FF3B30] hover:bg-[#E02E24] text-white font-black text-xs shadow-md shadow-red-500/30 transition-all cursor-pointer active:scale-95"
                >
                  {editingId ? 'Guardar Cambios' : 'Registrar Servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Service */}
      {serviceToDelete && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4"
          style={{
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(25px)',
            WebkitBackdropFilter: 'blur(25px)'
          }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(35px) saturate(190%)',
              WebkitBackdropFilter: 'blur(35px) saturate(190%)',
              border: '1.5px solid rgba(255, 255, 255, 0.95)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-base font-extrabold text-stone-900">
                ¿Eliminar número de emergencia?
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                ¿Seguro que deseas eliminar <strong className="text-stone-950 font-bold">{serviceToDelete.name}</strong> de la Guía de Emergencias?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setServiceToDelete(null)}
                className="py-2.5 px-3 rounded-2xl bg-stone-200/80 hover:bg-stone-300 active:scale-95 text-stone-800 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteService}
                className="py-2.5 px-3 rounded-2xl bg-[#e11d48] hover:bg-[#be123c] active:scale-95 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all cursor-pointer"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Resetting Defaults */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4"
          style={{
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(25px)',
            WebkitBackdropFilter: 'blur(25px)'
          }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(35px) saturate(190%)',
              WebkitBackdropFilter: 'blur(35px) saturate(190%)',
              border: '1.5px solid rgba(255, 255, 255, 0.95)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-base font-extrabold text-stone-900">
                ¿Restaurar guía oficial?
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                ¿Deseas restaurar la lista oficial predeterminada de emergencias de Ciudad del Carmen?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="py-2.5 px-3 rounded-2xl bg-stone-200/80 hover:bg-stone-300 active:scale-95 text-stone-800 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmResetDefaults}
                className="py-2.5 px-3 rounded-2xl bg-[#007AFF] hover:bg-[#0062cc] active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-500/30 transition-all cursor-pointer"
              >
                Restaurar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
