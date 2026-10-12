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
    if (!window.confirm(`¿Seguro que deseas eliminar "${name}" de la Guía de Emergencias?`)) return;
    deleteEmergencyService(id);
    setMessage({ text: `"${name}" fue eliminado correctamente.`, type: 'success' });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleResetDefaults = () => {
    if (!window.confirm('¿Deseas restaurar la lista oficial predeterminada de emergencias de Ciudad del Carmen?')) return;
    resetEmergencyServicesToDefault();
    setMessage({ text: 'Lista oficial de emergencias restaurada.', type: 'success' });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a192f] p-4 rounded-2xl border border-sky-500/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <span>Administrador de Guía de Emergencias 24/7</span>
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Modifica teléfonos directos, agrega hospitales, grúas, mecánicos o farmacias, y elimina datos desactualizados en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
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
          message.type === 'success' ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200' : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
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
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, teléfono, dirección o categoría..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
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
          <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
            No se encontraron servicios de emergencia con los criterios seleccionados.
          </div>
        ) : (
          filteredServices.map(item => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 bg-slate-900/90 ${
                item.isUrgent
                  ? 'border-rose-500/50 hover:border-rose-400'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        item.isUrgent ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {item.badge || item.category}
                      </span>
                      {item.isUrgent && (
                        <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Urgente
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-white mt-1">
                      {item.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/40 text-sky-300 border border-sky-500/30 transition-colors cursor-pointer"
                      title="Editar servicio"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.name)}
                      className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                      title="Eliminar servicio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2">
                  {item.description}
                </p>

                <div className="space-y-1 text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="font-mono font-bold text-white">{item.phone}</span>
                    {item.whatsapp && (
                      <span className="text-emerald-400 text-[11px] font-mono">
                        (WhatsApp: {item.whatsapp})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{item.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-emerald-300">{item.schedule}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Form for Add/Edit */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <span>{editingId ? 'Editar Servicio de Emergencia' : 'Nuevo Servicio de Emergencia'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nombre del Organismo / Servicio *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ej. Cruz Roja Mexicana Delegación Carmen"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Categoría *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    placeholder="ej. Ambulancias y Urgencias"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Insignia / Badge
                  </label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={e => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="ej. 24 Horas / Urgencias"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Teléfono directo *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="ej. 9383821520 o 911"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    WhatsApp (Opcional)
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsapp || ''}
                    onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="ej. 9383821520"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Dirección o Referencia
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="ej. Calle 47 entre 36 y 38, Col. Fátima, Cd. del Carmen"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Horario de Atención
                  </label>
                  <input
                    type="text"
                    value={formData.schedule}
                    onChange={e => setFormData({ ...formData, schedule: e.target.value })}
                    placeholder="ej. 24 Horas / 365 días"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Icono Representativo
                  </label>
                  <select
                    value={formData.icon}
                    onChange={e => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-rose-500 cursor-pointer"
                  >
                    {AVAILABLE_ICONS.map(i => (
                      <option key={i.name} value={i.name}>{i.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Descripción del servicio o recomendaciones
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="ej. Servicio de ambulancia de rescate, atención médica inmediata..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isUrgent"
                  checked={formData.isUrgent}
                  onChange={e => setFormData({ ...formData, isUrgent: e.target.checked })}
                  className="w-4 h-4 rounded text-rose-600 bg-slate-800 border-slate-700 cursor-pointer"
                />
                <label htmlFor="isUrgent" className="text-slate-300 font-semibold cursor-pointer select-none">
                  Marcar como servicio crítico / de alta urgencia (Borde rojo y prioridad)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all cursor-pointer"
                >
                  {editingId ? 'Guardar Cambios' : 'Registrar Servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
