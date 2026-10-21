import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Power,
  AlertTriangle,
  Clock,
  Image as ImageIcon,
  CheckCircle2,
  Save,
  RefreshCw,
  Eye,
  MessageSquare
} from 'lucide-react';
import { getMaintenanceMode, updateMaintenanceMode, MaintenanceModeConfig } from '../services/api';

export const AdminMaintenanceTab: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState('Portal Temporalmente en Mantenimiento');
  const [message, setMessage] = useState('Estamos realizando tareas de mantenimiento técnico y mejoras en el sistema. El directorio volverá a estar disponible en unos momentos.');
  const [bannerUrl, setBannerUrl] = useState('/images/banner-empresas-en-carmen.png');
  const [estimatedReturn, setEstimatedReturn] = useState('Unos momentos');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await getMaintenanceMode();
      if (res && res.maintenance) {
        setEnabled(Boolean(res.maintenance.enabled));
        if (res.maintenance.title) setTitle(res.maintenance.title);
        if (res.maintenance.message) setMessage(res.maintenance.message);
        if (res.maintenance.bannerUrl) setBannerUrl(res.maintenance.bannerUrl);
        if (res.maintenance.estimatedReturn) setEstimatedReturn(res.maintenance.estimatedReturn);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: 'Error al consultar estado: ' + err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (forceEnabled?: boolean) => {
    setIsSaving(true);
    setFeedback(null);
    const targetEnabled = typeof forceEnabled === 'boolean' ? forceEnabled : enabled;

    try {
      const payload: Partial<MaintenanceModeConfig> = {
        enabled: targetEnabled,
        title: title.trim(),
        message: message.trim(),
        bannerUrl: bannerUrl.trim(),
        estimatedReturn: estimatedReturn.trim()
      };

      const res = await updateMaintenanceMode(payload);
      if (res.success) {
        setEnabled(targetEnabled);
        setFeedback({
          type: 'success',
          text: targetEnabled
            ? '¡Portal desactivado al público! El Modo Mantenimiento está ACTIVO. Solo tú como administrador puedes ver el sitio.'
            : '¡Portal reactivado con éxito! El directorio está en línea nuevamente para todos los usuarios.'
        });
      } else {
        setFeedback({ type: 'error', text: res.message || 'Error al guardar configuración.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error de red.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3 text-stone-400">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm font-semibold">Cargando estado de mantenimiento del portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner Alert */}
      <div className={`p-5 rounded-2xl border transition-all ${
        enabled
          ? 'bg-rose-50 border-rose-300 text-rose-950 shadow-md'
          : 'bg-emerald-50 border-emerald-200 text-emerald-950'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-inner ${
              enabled ? 'bg-rose-600' : 'bg-emerald-600'
            }`}>
              <Power className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${enabled ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                <h3 className="font-extrabold text-base sm:text-lg">
                  Estado Actual: {enabled ? '🔴 PORTAL DESACTIVADO (Mantenimiento Activo)' : '🟢 PORTAL EN LÍNEA (Activo para todo público)'}
                </h3>
              </div>
              <p className="text-xs sm:text-sm mt-0.5 opacity-90">
                {enabled
                  ? 'Los visitantes ven la pantalla de advertencia y mantenimiento con tu justificación. Tú puedes seguir navegando como administrador.'
                  : 'Todos los visitantes pueden navegar y buscar normalmente en encarmen.org.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSave(!enabled)}
            disabled={isSaving}
            className={`px-5 py-3 rounded-xl font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              enabled
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                : 'bg-rose-600 hover:bg-rose-500 text-white active:scale-95'
            }`}
          >
            <Power className="w-4 h-4" />
            {isSaving ? 'Actualizando...' : enabled ? 'Reactivar Portal Ahora' : 'Desactivar Portal al Público'}
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold animate-in fade-in duration-200 ${
          feedback.type === 'success'
            ? 'bg-emerald-100/90 border-emerald-300 text-emerald-900'
            : 'bg-rose-100/90 border-rose-300 text-rose-900'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-5">
        <div className="border-b border-stone-100 pb-3">
          <h4 className="font-extrabold text-stone-900 text-base flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            Configuración del Mensaje de Mantenimiento y Advertencia
          </h4>
          <p className="text-xs text-stone-500 mt-1">
            Personaliza el texto, justificación y banner que verán los usuarios mientras el portal se encuentre desactivado.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Título Principal de la Advertencia
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Portal Temporalmente en Mantenimiento Preventivo"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
              <span>Justificación y Explicación para los Usuarios</span>
              <span className="text-stone-400 font-normal">{message.length} caracteres</span>
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Explica a los visitantes el motivo del mantenimiento... Ej: Estamos realizando actualizaciones correctivas en el servidor y optimización de bases de datos. Estaremos de vuelta muy pronto."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Tiempo Estimado de Reapertura
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={estimatedReturn}
                  onChange={e => setEstimatedReturn(e.target.value)}
                  placeholder="Ej: 30 minutos, 2 horas, Hoy 2:00 PM"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Imagen o Banner de Advertencia (URL)
              </label>
              <div className="relative">
                <ImageIcon className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={bannerUrl}
                  onChange={e => setBannerUrl(e.target.value)}
                  placeholder="/images/banner-empresas-en-carmen.png"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Guardando...' : 'Guardar Mensaje de Mantenimiento'}
          </button>
        </div>
      </div>

      {/* Live Preview Box */}
      <div className="bg-stone-900 text-white p-5 sm:p-6 rounded-2xl border border-stone-800 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-400" />
            <h5 className="font-bold text-xs uppercase tracking-wider text-amber-300">
              Vista Previa en Vivo (Lo que verá el visitante común)
            </h5>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 font-mono">
            {enabled ? '🔴 En vivo ahora' : '⚪ Vista de prueba (inactivo)'}
          </span>
        </div>

        <div className="bg-stone-950 rounded-xl p-6 text-center space-y-3 border border-stone-800 max-w-lg mx-auto">
          {bannerUrl && (
            <img
              src={bannerUrl}
              alt="Banner de advertencia"
              className="max-h-24 mx-auto rounded-lg object-contain"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            Mantenimiento Técnico en Curso
          </span>
          <h4 className="text-base sm:text-lg font-black text-white">{title || 'Portal en Mantenimiento'}</h4>
          <p className="text-xs text-stone-300 leading-relaxed max-w-md mx-auto whitespace-pre-wrap">{message}</p>
          {estimatedReturn && (
            <p className="text-xs text-amber-400 font-semibold flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Tiempo estimado: {estimatedReturn}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
