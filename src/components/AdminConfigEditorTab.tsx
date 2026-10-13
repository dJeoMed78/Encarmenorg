import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, CheckCircle2, AlertTriangle, FileCode, Check, Eye } from 'lucide-react';

export const AdminConfigEditorTab: React.FC = () => {
  const [rawJson, setRawJson] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFormatted, setIsFormatted] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/portal-config/raw');
      const data = await res.json();
      if (data.success && data.raw) {
        setRawJson(data.raw);
      } else {
        // Fallback to /api/portal-config
        const res2 = await fetch('/api/portal-config');
        const data2 = await res2.json();
        if (data2.success && data2.config) {
          setRawJson(JSON.stringify(data2.config, null, 2));
        }
      }
    } catch (err: any) {
      setErrorMsg('Error al cargar archivo de configuración: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(rawJson);
      setRawJson(JSON.stringify(parsed, null, 2));
      setErrorMsg(null);
      setIsFormatted(true);
    } catch (err: any) {
      setErrorMsg('JSON inválido: ' + err.message);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      // Validate JSON first
      JSON.parse(rawJson);

      const res = await fetch('/api/admin/portal-config/raw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: rawJson })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('¡Archivo portal_config.json guardado y respaldado en MariaDB con éxito!');
        window.dispatchEvent(new Event('brand-media-updated'));
        setTimeout(() => setSuccessMsg(null), 6000);
      } else {
        setErrorMsg(data.message || 'Error al guardar configuración');
      }
    } catch (err: any) {
      setErrorMsg('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3 text-stone-400">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-500" />
        <p className="text-sm font-semibold">Cargando archivo de configuración...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-stone-900 via-sky-950/40 to-stone-900 border border-sky-600/30 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <FileCode className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Archivo de Configuración en Vivo (<code className="text-sky-300 font-mono text-sm sm:text-base">portal_config.json</code>)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-300">
              Personalizaciones protegidas: Los cambios realizados aquí se sincronizan con MariaDB y nunca se perderán cuando se actualice el sistema.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleFormat}
              className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold border border-stone-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Formatear e indentar JSON"
            >
              <Check className="w-3.5 h-3.5 text-stone-400" />
              <span>Formatear JSON</span>
            </button>
            <button
              type="button"
              onClick={loadConfig}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold border border-stone-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-stone-400" />
              <span>Recargar</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-sky-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-white" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Archivo'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs sm:text-sm flex items-center gap-2.5 shadow-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs sm:text-sm flex items-center gap-2.5 shadow-md">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Code Editor Container */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs text-stone-400 pb-2 border-b border-stone-800">
          <span className="font-mono flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            Ruta física: /app/applet/portal_config.json
          </span>
          <span>Sintaxis: JSON válido con llaves y comillas</span>
        </div>

        <textarea
          rows={22}
          value={rawJson}
          onChange={e => {
            setRawJson(e.target.value);
            setIsFormatted(false);
          }}
          className="w-full p-4 rounded-xl bg-stone-950 border border-stone-800 text-xs sm:text-sm font-mono text-emerald-300 placeholder:text-stone-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none resize-none leading-relaxed selection:bg-sky-900"
          spellCheck={false}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-stone-400">
          <p>
            Puedes modificar directamente URLs de logo, banner, textos, números de contacto y datos sin que una actualización de código los sobreescriba.
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Configuración</span>
          </button>
        </div>
      </div>
    </div>
  );
};
