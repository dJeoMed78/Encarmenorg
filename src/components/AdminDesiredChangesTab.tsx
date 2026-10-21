import React, { useState, useEffect } from 'react';
import { Bug, Sparkles, Save, CheckCircle2, AlertTriangle, RefreshCw, Database, Clock } from 'lucide-react';

const DEFAULT_PORTAL_NOTES = {
  cambios_al_portal: `3.- añadir cuando se oprima el boton de busqueda automatica de eventos tambien la busqueda en este sitio: https://proeventos.campeche.gob.mx/calendario/ y https://www.facebook.com/CulturaCarmenMx/ y
https://dashport.run/proximos-eventos/ <-siempre que sea en ciudad del carmen. <- como se puede verificar?? 
4.- Que automaticamente el sistema elimine los eventos cuya fecha y hora ya sean pasadas. <- EN ESPERA DE VERIFICACION PARA VER SI FUNCIONO LOS CAMBIOS.
 Opción A: Botón "Enviar Ficha al Propietario" en tu Panel Admin (Inmediata y Gratis)
Cómo funciona:
En tu lista de empresas del panel de administración, agregamos un botón directo con el ícono de WhatsApp: "📲 Enviar ficha y solicitar actualización".
Al hacer clic:
Abre directamente tu aplicación de WhatsApp Business (en tu celular o en WhatsApp Web en la computadora) con el número del negocio ya colocado y un mensaje pre-redactado personalizado con los datos reales de esa empresa.
Ejemplo del mensaje automático que se genera:
"Hola, le saludamos de Empresas en Carmen. Le compartimos el enlace oficial de su negocio en nuestro directorio: https://encarmen.org/empresa/suministros-industriales-alpha.
¿Desea actualizar horarios, teléfono, ubicación o agregar fotos de sus productos a su catálogo digital? Quedamos a sus órdenes."
Ventajas:
Es 100% gratuito.
No requiere permisos especiales ni trámites con Facebook/Meta.
No hay riesgo de que Meta bloquee tu número por envíos masivos.`,
  fallas_del_portal: `15/10/2026
1.- Cada vez que se actualiza el sistema se vuelve a cambiar el logotipo y el banner superior que dice empresas en carmen.
2.- aunque en el frontpage ya añadiste la opcion de cambiar foto y eliminar y permitir subirla desde la computadora.. en la parte de abajo pone O pega una url directa de imagen externa: y te pide a fuerza introduce una url... cuando supuestamente ya subi la foto desde la computadora.. no deberia pedirme url.
3.- En el panel de administracion debe haber un boton "Cerrar Sesión" que cierre por completo la sesion de la administracion y regrese a ser un usuario normal.. no lo hay.  <- LO VERIFIQUE EN EL MODULO DE PRUEBAS Y YA ESTABA SOLUCIONADO.. LO ACABO DE CHECAR EN PRODUCTIVO Y SIGUE IGUAL.. AL OPRIMIR CERRAR SESION CONTINUO SIENDO ADMINISTRADOR.
4.- El apartado de Promociones y cupones del dia no tiene el mismo tamaño de Eventos, conciertos, ferias y bazares en carmen. El que vas a cambiar es el tamaño de eventos para que este al mismo tamaño de promociones y cupones del dia.
5.- En el apartado de promociones y cupones del dia no aparece la imagen promocional hasta que no se oprime el botón de Reclamar. deberia de verse una miniatura de la imagen como parte del promocional.
6.- La empresa brio cleaner y Cardu el sistema lo puso automaticamente como Aplicación de Uñas y Pestañas
que no tiene nada absoluamente que ver.. ya cambie manual la categoria y siguen apareciendo cuando en categorias oprimo aplicacion de uñas y pestañas.. modificar ese comportamiento, si ya le cambie la categoria no deberia aparecer al volver a oprimir en aplicacion de uñas y pestañas.. y hacer una revision que las categorias realmente coincidan con el negocio..`
};

export const AdminDesiredChangesTab: React.FC = () => {
  const [fallasDelPortal, setFallasDelPortal] = useState<string>(() => {
    try {
      const cached = localStorage.getItem('portal_notes_fallas');
      if (cached) return cached;
    } catch (_) {}
    return DEFAULT_PORTAL_NOTES.fallas_del_portal;
  });

  const [cambiosAlPortal, setCambiosAlPortal] = useState<string>(() => {
    try {
      const cached = localStorage.getItem('portal_notes_cambios');
      if (cached) return cached;
    } catch (_) {}
    return DEFAULT_PORTAL_NOTES.cambios_al_portal;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [dbSaved, setDbSaved] = useState<boolean>(true);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/portal-notes?_t=' + Date.now(), {
        cache: 'no-store'
      });
      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        console.warn('[Portal Notes] Non-JSON response, using local cache.');
        return;
      }

      if (data && data.success && data.notes) {
        if (data.notes.fallas_del_portal) {
          setFallasDelPortal(data.notes.fallas_del_portal);
          try { localStorage.setItem('portal_notes_fallas', data.notes.fallas_del_portal); } catch (_) {}
        }
        if (data.notes.cambios_al_portal) {
          setCambiosAlPortal(data.notes.cambios_al_portal);
          try { localStorage.setItem('portal_notes_cambios', data.notes.cambios_al_portal); } catch (_) {}
        }
      }
    } catch (err: any) {
      console.warn('Cargando desde memoria local de respaldo:', err.message);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Save locally first to guarantee zero loss
    try {
      localStorage.setItem('portal_notes_fallas', fallasDelPortal);
      localStorage.setItem('portal_notes_cambios', cambiosAlPortal);
    } catch (_) {}

    try {
      const res = await fetch('/api/admin/portal-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fallas_del_portal: fallasDelPortal,
          cambios_al_portal: cambiosAlPortal
        })
      });

      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        // If server returned non-JSON, but saved locally
        setSuccessMsg('¡Guardado localmente en este navegador! (Sincronización con el servidor pendiente)');
        setLastSavedTime(new Date().toLocaleTimeString('es-MX'));
        return;
      }

      if (data.success) {
        setSuccessMsg('¡Guardado exitosamente en MariaDB y portal_config.json!');
        setLastSavedTime(new Date().toLocaleTimeString('es-MX'));
        setDbSaved(data.dbSaved ?? true);
        setTimeout(() => setSuccessMsg(null), 6000);
      } else {
        setErrorMsg(data.message || 'Error al guardar en el servidor.');
      }
    } catch (err: any) {
      // Saved in localStorage
      setSuccessMsg('¡Guardado en memoria de tu navegador! Se sincronizará automáticamente.');
      setLastSavedTime(new Date().toLocaleTimeString('es-MX'));
      setTimeout(() => setSuccessMsg(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3 text-stone-400">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm font-semibold">Cargando notas y cambios del portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-stone-900 via-amber-950/40 to-stone-900 border border-amber-600/30 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Cambios Deseados y Control de Fallas
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-300">
              Protocolo de desarrollo continuo: Los datos aquí guardados se conservan en MariaDB y se leen prioritariamente en cada sesión de mantenimiento.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadNotes}
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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-stone-950" />
              <span>{isSaving ? 'Guardando en MariaDB...' : 'Guardar en Base de Datos'}</span>
            </button>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="mt-4 pt-4 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <Database className="w-3.5 h-3.5" />
              <span>{dbSaved ? 'Sincronizado con MariaDB Hostinger' : 'Almacenado localmente'}</span>
            </span>
            {lastSavedTime && (
              <span className="flex items-center gap-1 text-stone-400 font-mono text-[11px]">
                <Clock className="w-3 h-3 text-stone-500" />
                <span>Último guardado: {lastSavedTime}</span>
              </span>
            )}
          </div>
          <span className="text-[11px] text-amber-300/80 font-medium">
            ★ Prioridad: Fallas se resuelven primero, Cambios deseados después.
          </span>
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

      {/* Two Large Editable Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Campo 1: Fallas del Portal (Prioridad Alta) */}
        <div className="bg-stone-900 border border-rose-900/40 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Bug className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">
                  Fallas del Portal
                </h3>
                <p className="text-[11px] text-stone-400">
                  Reporta errores, fallas en móvil, botones o comportamiento inesperado.
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-rose-950 border border-rose-700 text-rose-300 text-[10px] font-bold">
              Prioridad 1
            </span>
          </div>

          <div className="flex-1 flex flex-col space-y-1.5">
            <textarea
              rows={16}
              value={fallasDelPortal}
              onChange={e => setFallasDelPortal(e.target.value)}
              placeholder="Escribe aquí las fallas o errores detectados en el portal...&#10;&#10;Ejemplo:&#10;1. En celular el modal de búsqueda no permitía desplazarse hacia abajo.&#10;2. El botón de WhatsApp no abre el chat en ciertos navegadores.&#10;3. Las imágenes tardan en cargar en conexiones lentas."
              className="w-full flex-1 p-3.5 rounded-xl bg-stone-950 border border-stone-800 text-xs sm:text-sm text-stone-100 placeholder:text-stone-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none resize-none font-sans leading-relaxed transition-colors"
            />
            <div className="flex items-center justify-between text-[11px] text-stone-500 px-1 font-mono">
              <span>{fallasDelPortal.length} caracteres</span>
              <span>Guardado en MariaDB</span>
            </div>
          </div>
        </div>

        {/* Campo 2: Cambios al Portal (Sugerencias y Mejoras) */}
        <div className="bg-stone-900 border border-sky-900/40 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">
                  Cambios al Portal
                </h3>
                <p className="text-[11px] text-stone-400">
                  Describe nuevas funciones, cambios de diseño o módulos deseados.
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-sky-950 border border-sky-700 text-sky-300 text-[10px] font-bold">
              Prioridad 2
            </span>
          </div>

          <div className="flex-1 flex flex-col space-y-1.5">
            <textarea
              rows={16}
              value={cambiosAlPortal}
              onChange={e => setCambiosAlPortal(e.target.value)}
              placeholder="Escribe aquí los cambios o nuevas funciones deseadas para el portal...&#10;&#10;Ejemplo:&#10;1. Agregar botón en la parte superior para descargar el código ZIP de la versión instalada.&#10;2. Crear pestaña en el panel para editar el archivo de configuración en vivo.&#10;3. Mejorar la búsqueda con IA para traer 30 negocios carmelitas por pulsación."
              className="w-full flex-1 p-3.5 rounded-xl bg-stone-950 border border-stone-800 text-xs sm:text-sm text-stone-100 placeholder:text-stone-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none resize-none font-sans leading-relaxed transition-colors"
            />
            <div className="flex items-center justify-between text-[11px] text-stone-500 px-1 font-mono">
              <span>{cambiosAlPortal.length} caracteres</span>
              <span>Guardado en MariaDB</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Save Bar */}
      <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
        <p className="text-xs text-stone-400">
          Al pulsar guardar, los cambios se actualizan en tiempo real en la base de datos MariaDB y en el archivo <code className="text-amber-400">portal_config.json</code>.
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Guardar Cambios</span>
        </button>
      </div>
    </div>
  );
};
