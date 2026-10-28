import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Clock,
  Ticket,
  Search,
  RotateCcw,
  Check,
  X,
  Sparkles,
  Music,
  ShoppingBag,
  Bike,
  UtensilsCrossed,
  Upload,
  Loader2,
  Image as ImageIcon,
  Radio,
  Bot,
  ExternalLink,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  EventItem,
  getEventsData,
  addEventItem,
  updateEventItem,
  deleteEventItem,
  resetEventsDataToDefault,
  AIRadarStatus,
  fetchEventsFromAPI,
  AIRadarCandidate,
} from "../services/eventsService";
import {
  getEventRepresentativeImage,
  getFallbackThematicImage,
} from "../utils/eventImages";

function resolveSourceSiteName(
  sourceUrl?: string,
  sourceField?: string,
): string {
  const url = (sourceUrl || "").toLowerCase();
  if (url.includes("facebook.com/groups/506440126097710"))
    return "Grupo FB Empresas en Carmen";
  if (url.includes("facebook.com/culturacarmenmx")) return "FB Cultura Carmen";
  if (url.includes("facebook.com/groups/")) return "Grupo de Facebook";
  if (url.includes("facebook.com/marketplace")) return "FB Marketplace";
  if (url.includes("facebook.com") || url.includes("fb.com")) return "Facebook";
  if (url.includes("computrabajo")) return "Computrabajo";
  if (url.includes("occ.com.mx")) return "OCC Mundial";
  if (url.includes("indeed.com")) return "Indeed Empleos";
  if (url.includes("inmuebles24")) return "Inmuebles24";
  if (url.includes("vivanuncios")) return "Vivanuncios";
  if (url.includes("segundamano")) return "Segundamano";
  if (url.includes("mercadolibre")) return "MercadoLibre";
  if (url.includes("lamudi")) return "Lamudi";
  if (url.includes("propiedades.com")) return "Propiedades.com";
  if (url.includes("trovit")) return "Trovit";
  if (url.includes("proeventos.campeche.gob.mx")) return "ProEventos Campeche";
  if (url.includes("dashport.run")) return "Dashport Run";
  try {
    if (sourceUrl) return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {}
  return sourceField || "Sitio Web";
}

const AVAILABLE_ICONS = [
  { name: "Calendar", label: "Calendario General" },
  { name: "ShoppingBag", label: "Bazar / Emprendedores" },
  { name: "Music", label: "Música / Concierto" },
  { name: "Bike", label: "Deporte / Rodada" },
  { name: "UtensilsCrossed", label: "Gastronomía / Mariscos" },
  { name: "Sparkles", label: "Feria / Festival" },
];

// These endpoints do not currently guarantee authorization + durable DB commit.
const RADAR_WRITE_BLOCKED = true;
const RADAR_BLOCK_REASON =
  "Publicación bloqueada: el backend no garantiza autorización y persistencia. Los candidatos se conservan para revisión.";
async function readRadarResponse(
  url: string,
  body: object,
  controller: AbortController,
) {
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error(
        `Radar HTTP ${response.status}. No se confirmaron resultados.`,
      );
    const data = await response.json();
    if (
      !data ||
      data.success !== true ||
      !Array.isArray(data.candidates) ||
      data.candidates.length > 1000
    )
      throw new Error(
        "Respuesta de candidatos inválida. Se conserva la lista anterior.",
      );
    if (
      data.candidates.some(
        (c: any) =>
          !c ||
          typeof c.id !== "string" ||
          !c.id ||
          typeof (c.title ?? c.name) !== "string" ||
          !(c.title ?? c.name).trim() ||
          (c.sourceUrl &&
            (typeof c.sourceUrl !== "string" ||
              !/^https?:\/\//i.test(c.sourceUrl))),
      )
    )
      throw new Error(
        "Respuesta parcial o con fuentes inválidas. Se conserva la lista anterior.",
      );
    if (
      new Set(data.candidates.map((c: any) => c.id)).size !==
      data.candidates.length
    )
      throw new Error("La respuesta contiene candidatos duplicados.");
    return data;
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error(
        "La consulta se canceló o tardó demasiado. No se confirmó su resultado. Puedes reintentar.",
      );
    if (error instanceof SyntaxError)
      throw new Error(
        "Respuesta JSON inválida. Se conserva la lista anterior.",
      );
    if (error instanceof TypeError)
      throw new Error(
        "Error de conexión. No se confirmó el resultado; puedes reintentar.",
      );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const AdminEventsTab: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<"all" | "ai" | "manual">(
    "all",
  );
  const [isScanningRadar, setIsScanningRadar] = useState(false);
  const [radarStatus, setRadarStatus] = useState<AIRadarStatus | null>(null);
  const [eventToDelete, setEventToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // AI Event Search Modal State
  const [isAiSearchModalOpen, setIsAiSearchModalOpen] = useState(false);
  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [aiCandidates, setAiCandidates] = useState<AIRadarCandidate[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(
    new Set(),
  );
  const [aiSearchMessage, setAiSearchMessage] = useState<{
    text: string;
    type: "success" | "warning" | "error";
  } | null>(null);
  const [isPublishingCandidates, setIsPublishingCandidates] = useState(false);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Omit<EventItem, "id">>({
    title: "",
    category: "Bazares y Emprendedores",
    categorySlug: "bazares",
    date: "Sábado y Domingo",
    time: "5:00 PM - 10:00 PM",
    location: "Playa Norte, Ciudad del Carmen",
    cost: "Entrada Libre",
    description: "",
    organizer: "Emprendedores del Carmen",
    badge: "Ambiente Familiar",
    icon: "ShoppingBag",
    image: "",
    aiDetected: false,
    sourceUrl: "",
  });

  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const loadData = async () => {
    setEvents(getEventsData());
    try {
      const remote = await fetchEventsFromAPI();
      if (Array.isArray(remote) && remote.length > 0) {
        setEvents(remote);
      }
    } catch {}
  };

  const loadRadarStatus = async () => {
    try {
      const response = await fetch("/api/events/radar-status");
      const data = await response.json();
      if (
        !response.ok ||
        data.success !== true ||
        !Number.isInteger(data.totalEvents) ||
        data.totalEvents < 0
      )
        throw new Error();
      setRadarStatus(data);
    } catch {
      setRadarStatus(null);
    }
  };

  useEffect(() => {
    loadData();
    loadRadarStatus();
    const handleUpdate = () => {
      loadData();
      loadRadarStatus();
    };
    window.addEventListener("events-billboard-updated", handleUpdate);
    return () =>
      window.removeEventListener("events-billboard-updated", handleUpdate);
  }, []);

  const radarGeneration = useRef(0),
    radarBusy = useRef(false),
    radarController = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      radarGeneration.current++;
      radarController.current?.abort();
    },
    [],
  );
  const closeAiRadar = () => {
    radarGeneration.current++;
    radarController.current?.abort();
    radarBusy.current = false;
    setAiSearchLoading(false);
    setIsAiSearchModalOpen(false);
  };
  const handleRunRadar = () => {
    setMessage({ text: RADAR_BLOCK_REASON, type: "error" });
  };

  const handleOpenAiSearch = async () => {
    setIsAiSearchModalOpen(true);
    setAiSearchMessage(null);
    if (aiCandidates.length === 0) {
      handleExecuteAiSearch(false);
    }
  };

  const handleExecuteAiSearch = async (useAiMode: boolean = false) => {
    if (radarBusy.current) return;
    radarBusy.current = true;
    const version = ++radarGeneration.current;
    const controller = new AbortController();
    radarController.current = controller;
    setAiSearchLoading(true);
    setAiSearchMessage(null);
    try {
      const res = await readRadarResponse(
        "/api/events/radar-search",
        { query: aiSearchQuery, useAi: useAiMode },
        controller,
      );
      if (version !== radarGeneration.current) return;
      setAiCandidates(res.candidates);
      setSelectedCandidateIds(new Set());
      setAiSearchMessage({
        text: `${res.candidates.length} candidatos recibidos para revisión. Ninguno fue publicado; fuente, fecha y localidad requieren verificación.`,
        type: "warning",
      });
    } catch (error: any) {
      if (version === radarGeneration.current)
        setAiSearchMessage({
          text:
            error?.message ||
            "Consulta fallida; candidatos anteriores conservados.",
          type: "error",
        });
    } finally {
      if (version === radarGeneration.current) {
        radarBusy.current = false;
        setAiSearchLoading(false);
      }
    }
  };

  const handleToggleCandidate = (id: string) => {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePublishSelectedCandidates = () => {
    setAiSearchMessage({ text: RADAR_BLOCK_REASON, type: "error" });
  };

  const categories = Array.from(new Set(events.map((e) => e.category)));
  const aiEventsCount = events.filter((e) => e.aiDetected).length;
  const manualEventsCount = events.filter((e) => !e.aiDetected).length;

  const filteredEvents = events.filter((evt) => {
    const matchCat =
      selectedCategory === "all" || evt.category === selectedCategory;
    if (!matchCat) return false;

    if (filterSource === "ai" && !evt.aiDetected) return false;
    if (filterSource === "manual" && evt.aiDetected) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      evt.title.toLowerCase().includes(q) ||
      evt.location.toLowerCase().includes(q) ||
      evt.organizer.toLowerCase().includes(q) ||
      evt.category.toLowerCase().includes(q)
    );
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      title: "",
      category: "Bazares y Emprendedores",
      categorySlug: "bazares",
      date: "Fin de Semana",
      time: "6:00 PM - 10:00 PM",
      location: "Ciudad del Carmen, Campeche",
      cost: "Entrada Libre",
      description: "",
      organizer: "Comunidad Carmelita",
      badge: "Para toda la familia",
      icon: "Calendar",
      image: "",
      sourceUrl: "",
      aiDetected: false,
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (evt: EventItem) => {
    setEditingId(evt.id);
    setFormData({
      title: evt.title,
      category: evt.category,
      categorySlug: evt.categorySlug,
      date: evt.date,
      time: evt.time,
      location: evt.location,
      cost: evt.cost,
      description: evt.description,
      organizer: evt.organizer,
      badge: evt.badge,
      icon: evt.icon,
      image: evt.image || "",
      sourceUrl: evt.sourceUrl || "",
      aiDetected: Boolean(evt.aiDetected),
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: string, title: string) => {
    setEventToDelete({ id, title });
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    await deleteEventItem(eventToDelete.id);
    setMessage({
      text: `Evento "${eventToDelete.title}" eliminado.`,
      type: "success",
    });
    setEventToDelete(null);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleResetDefaults = () => {
    setShowResetConfirm(true);
  };

  const confirmResetDefaults = async () => {
    await resetEventsDataToDefault();
    setMessage({ text: "Cartelera de eventos restaurada.", type: "success" });
    setShowResetConfirm(false);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({
        text: "Por favor selecciona un archivo de imagen (JPG, PNG, WebP).",
        type: "error",
      });
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setMessage({ text: "La imagen no debe exceder los 6MB.", type: "error" });
      return;
    }

    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch("/api/upload-logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, filename: file.name }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            setFormData((prev) => ({ ...prev, image: data.url }));
            setIsUploadingImage(false);
            return;
          }
        }
      } catch (_) {}
      setFormData((prev) => ({ ...prev, image: base64 }));
      setIsUploadingImage(false);
    };
    reader.onerror = () => {
      setMessage({
        text: "Error leyendo la imagen seleccionada.",
        type: "error",
      });
      setIsUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.location.trim()) {
      setMessage({
        text: "El título y la ubicación son obligatorios.",
        type: "error",
      });
      return;
    }

    if (editingId) {
      await updateEventItem(editingId, formData);
      setMessage({
        text: `Evento "${formData.title}" actualizado con éxito en la nube.`,
        type: "success",
      });
    } else {
      await addEventItem(formData);
      setMessage({
        text: `Nuevo evento "${formData.title}" publicado en la cartelera.`,
        type: "success",
      });
    }

    setIsFormOpen(false);
    setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[80vh]">
      <p
        role="status"
        className="p-3 rounded-xl bg-amber-50 text-amber-900 text-xs"
      >
        {RADAR_BLOCK_REASON} La cartelera puede incluir caché local; el estado
        Radar recibido no certifica guardado en MariaDB.
      </p>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a192f] p-4 rounded-2xl border border-amber-500/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              <span>Administrador de Cartelera Carmelita (Eventos)</span>
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Gestiona bazares playeros, conciertos en el Malecón, rodadas
            ciclistas y actividades culturales de la isla.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleRunRadar}
            disabled={RADAR_WRITE_BLOCKED}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 border ${
              isScanningRadar
                ? "bg-indigo-600/60 text-white cursor-wait border-indigo-400/50"
                : "bg-indigo-950/90 hover:bg-indigo-900 text-indigo-200 border-indigo-500/50 hover:text-white"
            }`}
            title="Activar radar de detección automática ($0 Costo)"
          >
            {isScanningRadar ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Rastreando...</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5 text-sky-400" />
                <span>🛰️ Radar Automático</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenAiSearch}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-700 hover:from-purple-600 hover:to-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer border border-purple-400/40 active:scale-95"
            title="Búsqueda avanzada de eventos locales con Inteligencia Artificial"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>✨ Búsqueda con IA</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Restaurar eventos predeterminados"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restaurar</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 text-stone-950" />
            <span>+ Publicar Evento</span>
          </button>
        </div>
      </div>

      {/* PANEL RADAR DE REVISIÓN (OPCIÓN A: 100% AUTOMÁTICA) */}
      <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900 to-indigo-900/50 p-4 sm:p-5 rounded-2xl border border-indigo-500/40 shadow-xl space-y-3 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-500 text-white shadow-xs">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                Radar Autónomo de Eventos Carmelitas
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                100% Gratuito • Fotos en Alta Definición • MariaDB
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
              Radar Autónomo de Detección y Publicación de Eventos
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              El Radar inteligente detecta actividades, gastronomía, deportes y
              eventos culturales de Ciudad del Carmen, asigna fotografías en
              alta calidad y los{" "}
              <strong className="text-amber-300">
                publica de inmediato en la cartelera y en la base de datos
              </strong>
              . Tú tienes el control: si alguno no te gusta, dale clic en{" "}
              <strong className="text-sky-300">Modificar</strong> o{" "}
              <strong className="text-rose-300">Eliminar</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 shadow-amber-500/25 hover:shadow-amber-500/40"
              title="Publicar un nuevo evento en la cartelera"
            >
              <Plus className="w-4 h-4 text-stone-950" />
              <span>+ Nuevo Evento</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAiSearch}
              className="px-4 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/25 border border-purple-400/30"
              title="Búsqueda avanzada con Inteligencia Artificial (Google Gemini)"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>✨ Búsqueda avanzada con IA</span>
            </button>

            <button
              type="button"
              onClick={handleRunRadar}
              disabled={RADAR_WRITE_BLOCKED}
              className={`px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
                isScanningRadar
                  ? "bg-indigo-600/60 text-white cursor-wait"
                  : "bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 border border-indigo-500/30"
              }`}
              title="Activar radar de detección automática sin costo"
            >
              {isScanningRadar ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Rastreando Eventos...</span>
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4 text-sky-300" />
                  <span>🛰️ Activar Radar de Eventos ($0 Costo)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sub-status bar */}
        <div className="pt-2.5 border-t border-indigo-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-slate-300">
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                Detectados por Radar IA:{" "}
                <strong className="text-indigo-300 font-bold">
                  {aiEventsCount}
                </strong>
              </span>
            </span>
            <span className="text-slate-600">•</span>
            <span>
              Manuales:{" "}
              <strong className="text-white font-bold">
                {manualEventsCount}
              </strong>
            </span>
            <span className="text-slate-600">•</span>
            <span>
              Total en cartelera:{" "}
              <strong className="text-amber-400 font-bold">
                {events.length}
              </strong>
            </span>
          </div>

          <div className="text-[11px] text-indigo-300 font-mono">
            {radarStatus?.lastScan ? (
              <span>
                Último rastreo:{" "}
                {new Date(radarStatus.lastScan).toLocaleDateString("es-MX", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            ) : (
              <span>Radar listo para rastrear</span>
            )}
          </div>
        </div>
      </div>

      {/* Message alert */}
      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn ${
            message.type === "success"
              ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-200"
              : "bg-rose-950/80 border border-rose-500/40 text-rose-200"
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="p-1 hover:opacity-80"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, lugar, organizador o categoría..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleRunRadar}
            disabled={RADAR_WRITE_BLOCKED}
            className="px-3 py-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
            title="Activar radar de detección automática"
          >
            {isScanningRadar ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Rastreando...</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5 text-sky-400" />
                <span>Radar Automático (Sin IA)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenAiSearch}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-700 hover:from-purple-600 hover:to-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer border border-purple-400/40 active:scale-95"
            title="Búsqueda avanzada con Inteligencia Artificial"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>✨ Búsqueda con IA</span>
          </button>
        </div>

        {/* Source Pills (Todos / Radar IA / Manuales) */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700 shrink-0">
          <button
            type="button"
            onClick={() => setFilterSource("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              filterSource === "all"
                ? "bg-amber-500 text-stone-950 shadow-xs"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Todos ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterSource("ai")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              filterSource === "ai"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-indigo-300 hover:text-white"
            }`}
          >
            <Bot className="w-3 h-3" />
            <span>Radar IA ({aiEventsCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterSource("manual")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              filterSource === "manual"
                ? "bg-slate-700 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Manuales ({manualEventsCount})
          </button>
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
        >
          <option value="all">Todas las categorías ({events.length})</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredEvents.length === 0 ? (
          filterSource === "ai" ? (
            <div className="col-span-full py-12 px-4 text-center text-slate-400 text-xs bg-slate-900/50 rounded-2xl border border-indigo-500/30 space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto">
                <Bot className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">
                  Aún no hay eventos detectados por Radar IA publicados en la
                  cartelera
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Los {events.length} eventos actuales son registros manuales.
                  Presiona el botón de abajo para hacer una búsqueda manual con
                  IA en Google, revisar las ligas de referencia y seleccionar
                  cuáles publicar.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 text-stone-950" />
                <span>+ Agregar Evento Manual</span>
              </button>
            </div>
          ) : (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
              No se encontraron eventos activos con los criterios seleccionados.
            </div>
          )
        ) : (
          filteredEvents.map((evt) => (
            <div
              key={evt.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                evt.aiDetected
                  ? "border-indigo-500/50 bg-gradient-to-b from-indigo-950/40 to-slate-900/90 shadow-md hover:border-indigo-400"
                  : "border-slate-800 bg-slate-900/90 hover:border-amber-500/50 shadow-md"
              }`}
            >
              <div className="space-y-2">
                {/* Visual Image / Representative Photography */}
                {(() => {
                  const eventImg = getEventRepresentativeImage(evt);
                  const isFlyer = Boolean(
                    evt.image &&
                    evt.image.startsWith("http") &&
                    !evt.image.includes("unsplash"),
                  );
                  return (
                    <div className="relative h-36 w-full rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 mb-2 group/img shadow-inner">
                      <img
                        src={eventImg}
                        alt={evt.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const imgEl = e.currentTarget as HTMLImageElement;
                          imgEl.onerror = null;
                          imgEl.src = getFallbackThematicImage(evt);
                        }}
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                      <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/80 text-white text-[9px] font-bold backdrop-blur-xs flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                        {isFlyer ? "Flyer oficial" : "Foto representativa"}
                      </span>
                    </div>
                  );
                })()}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {evt.aiDetected ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-400/50 flex items-center gap-1">
                          <Bot className="w-3 h-3 text-indigo-300" />
                          Radar IA (Publicado Automático)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {evt.badge || evt.category}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                        {evt.cost}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-white mt-1 leading-snug">
                      {evt.title}
                    </h3>
                  </div>

                  {/* Acciones principales: Modificar y Eliminar */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(evt)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/40 text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95"
                      title="Modificar datos del evento"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Modificar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(evt.id, evt.title)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95"
                      title="Eliminar evento de la cartelera"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {evt.description}
                </p>

                <div className="space-y-1 text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-amber-200 font-medium">
                      {evt.date} • {evt.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="truncate">{evt.location}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 pt-0.5 flex items-center justify-between gap-2">
                    <span>
                      Organiza:{" "}
                      <strong className="text-slate-300 font-medium">
                        {evt.organizer}
                      </strong>
                    </span>
                    {evt.sourceUrl &&
                      (() => {
                        const siteName = resolveSourceSiteName(
                          evt.sourceUrl,
                          evt.organizer || evt.badge,
                        );
                        return (
                          <a
                            href={evt.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200 transition-colors"
                            title={`Abrir publicación exacta en ${siteName}: ${evt.sourceUrl}`}
                          >
                            <span>Ver en {siteName}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        );
                      })()}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Form for Add/Edit */}
      {isFormOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(25px)",
            WebkitBackdropFilter: "blur(25px)",
          }}
          onClick={() => setIsFormOpen(false)}
        >
          <div
            className="rounded-3xl max-w-lg w-full text-stone-900 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            style={{
              background: "rgba(255, 255, 255, 0.88)",
              backdropFilter: "blur(40px) saturate(190%)",
              WebkitBackdropFilter: "blur(40px) saturate(190%)",
              border: "1.5px solid rgba(255, 255, 255, 0.95)",
              boxShadow:
                "0 30px 70px -15px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.95)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
              style={{
                background: "rgba(255, 255, 255, 0.75)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderBottom: "1.5px solid rgba(255, 255, 255, 0.85)",
              }}
            >
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <span>
                  {editingId
                    ? "Editar Evento de la Cartelera"
                    : "Publicar Nuevo Evento"}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 pt-2 space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-stone-800 font-bold mb-1">
                  Título del Evento o Actividad *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="ej. Bazar Emprendedor & Artesanal Playero"
                  className="w-full px-3.5 py-2.5 rounded-2xl text-stone-900 text-xs font-semibold placeholder:text-stone-400 outline-none transition-all focus:ring-2 focus:ring-amber-500/50"
                  style={{
                    background: "rgba(255, 255, 255, 0.70)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    border: "1.5px solid rgba(255, 255, 255, 0.90)",
                    boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.04)",
                  }}
                />
              </div>

              {/* Imagen del Evento */}
              <div>
                <label className="block text-stone-800 font-bold mb-1">
                  Foto o Cartel Promocional (Opcional)
                </label>
                <div className="space-y-2">
                  {formData.image ? (
                    <div className="relative rounded-2xl overflow-hidden border border-white/80 bg-white/70 p-2 flex items-center gap-3 shadow-xs">
                      <img
                        src={formData.image}
                        alt="Vista previa"
                        className="w-16 h-14 object-cover rounded-xl border border-stone-200 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-stone-900">
                          Imagen adjunta
                        </p>
                        <p className="text-[10px] text-stone-500 truncate">
                          {formData.image}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, image: "" }))
                          }
                          className="text-[11px] text-rose-600 hover:text-rose-800 font-bold mt-0.5 cursor-pointer"
                        >
                          Quitar imagen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="flex-1 py-2.5 px-3 rounded-2xl border-2 border-dashed border-stone-300 hover:border-amber-500 bg-white/60 hover:bg-white/90 text-stone-700 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        {isUploadingImage ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                            <span>Subiendo imagen...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 text-amber-600" />
                            <span>Seleccionar imagen</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  <input
                    type="text"
                    value={formData.image || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, image: e.target.value })
                    }
                    placeholder="O URL directa (https://...)"
                    className="w-full px-3 py-2 rounded-xl text-stone-800 text-[11px] font-medium outline-none border border-stone-200 bg-white/70 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-stone-800 font-bold">
                      Categoría (Datacombo) *
                    </label>
                    <span className="text-[10px] text-amber-600 font-bold">
                      Ver opciones
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    list="event-category-options"
                    value={formData.category}
                    onChange={(e) => {
                      const val = e.target.value;
                      let slug = "cultura";
                      if (val.toLowerCase().includes("bazar")) slug = "bazares";
                      else if (
                        val.toLowerCase().includes("depor") ||
                        val.toLowerCase().includes("bici")
                      )
                        slug = "deportes";
                      else if (
                        val.toLowerCase().includes("gastro") ||
                        val.toLowerCase().includes("comida")
                      )
                        slug = "gastronomia";
                      else if (
                        val.toLowerCase().includes("feria") ||
                        val.toLowerCase().includes("expo")
                      )
                        slug = "ferias";
                      setFormData({
                        ...formData,
                        category: val,
                        categorySlug: slug,
                      });
                    }}
                    placeholder="Elige o escribe categoría..."
                    className="w-full px-3 py-2 bg-white/70 border border-stone-200 rounded-xl text-stone-900 outline-none focus:border-amber-500 font-semibold"
                  />
                  <datalist id="event-category-options">
                    <option value="Cultura & Música" />
                    <option value="Ferias, Exposiciones y Tradición" />
                    <option value="Deportes & Rodadas" />
                    <option value="Bazares y Emprendedores" />
                    <option value="Gastronomía & Sabores" />
                    <option value="Entretenimiento & Familia" />
                    <option value="Infantil & Comunitario" />
                  </datalist>
                  <select
                    value={formData.category || ""}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const val = e.target.value;
                      let slug = "cultura";
                      if (val.toLowerCase().includes("bazar")) slug = "bazares";
                      else if (
                        val.toLowerCase().includes("depor") ||
                        val.toLowerCase().includes("bici")
                      )
                        slug = "deportes";
                      else if (
                        val.toLowerCase().includes("gastro") ||
                        val.toLowerCase().includes("comida")
                      )
                        slug = "gastronomia";
                      else if (
                        val.toLowerCase().includes("feria") ||
                        val.toLowerCase().includes("expo")
                      )
                        slug = "ferias";
                      setFormData({
                        ...formData,
                        category: val,
                        categorySlug: slug,
                      });
                    }}
                    className="w-full mt-1 px-2.5 py-1 bg-white/80 border border-stone-200 rounded-lg text-stone-700 text-[11px] outline-none focus:border-amber-500 cursor-pointer font-medium"
                  >
                    <option value="">▼ O selecciona del listado...</option>
                    <option value="Cultura & Música">Cultura & Música</option>
                    <option value="Ferias, Exposiciones y Tradición">
                      Ferias, Exposiciones y Tradición
                    </option>
                    <option value="Deportes & Rodadas">
                      Deportes & Rodadas
                    </option>
                    <option value="Bazares y Emprendedores">
                      Bazares y Emprendedores
                    </option>
                    <option value="Gastronomía & Sabores">
                      Gastronomía & Sabores
                    </option>
                    <option value="Entretenimiento & Familia">
                      Entretenimiento & Familia
                    </option>
                    <option value="Infantil & Comunitario">
                      Infantil & Comunitario
                    </option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-stone-800 font-bold">
                      Insignia / Badge
                    </label>
                    <span className="text-[10px] text-amber-600 font-bold">
                      Ver distintivos
                    </span>
                  </div>
                  <input
                    type="text"
                    list="event-badge-options"
                    value={formData.badge}
                    onChange={(e) =>
                      setFormData({ ...formData, badge: e.target.value })
                    }
                    placeholder="Elige o escribe distintivo..."
                    className="w-full px-3 py-2 bg-white/70 border border-stone-200 rounded-xl text-stone-900 outline-none focus:border-amber-500 font-semibold"
                  />
                  <datalist id="event-badge-options">
                    <option value="GRATUITO" />
                    <option value="FAMILIAR" />
                    <option value="DESTACADO" />
                    <option value="IMPERDIBLE" />
                    <option value="TRADICIÓN" />
                    <option value="CULTURA" />
                    <option value="RADAR IA" />
                    <option value="PROMOCIONADO" />
                    <option value="NOVEDAD" />
                    <option value="ProEventos" />
                    <option value="Dashport" />
                  </datalist>
                  <select
                    value={formData.badge || ""}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      setFormData({ ...formData, badge: e.target.value });
                    }}
                    className="w-full mt-1 px-2.5 py-1 bg-white/80 border border-stone-200 rounded-lg text-stone-700 text-[11px] outline-none focus:border-amber-500 cursor-pointer font-medium"
                  >
                    <option value="">
                      ▼ O selecciona insignia sugerida...
                    </option>
                    <option value="GRATUITO">GRATUITO (Entrada libre)</option>
                    <option value="FAMILIAR">
                      FAMILIAR (Para toda la familia)
                    </option>
                    <option value="DESTACADO">
                      DESTACADO (Evento estelar)
                    </option>
                    <option value="IMPERDIBLE">IMPERDIBLE (Recomendado)</option>
                    <option value="TRADICIÓN">
                      TRADICIÓN (Fiestas patronales)
                    </option>
                    <option value="CULTURA">
                      CULTURA (Música, arte y danza)
                    </option>
                    <option value="RADAR IA">
                      RADAR IA (Detección automática)
                    </option>
                    <option value="PROMOCIONADO">PROMOCIONADO</option>
                    <option value="NOVEDAD">NOVEDAD</option>
                    <option value="ProEventos">ProEventos Campeche</option>
                    <option value="Dashport">Dashport Run</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-800 font-bold mb-1">
                    Fecha o Días *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    placeholder="ej. Sábado y Domingo"
                    className="w-full px-3 py-2 bg-white/70 border border-stone-200 rounded-xl text-stone-900 outline-none focus:border-amber-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-stone-800 font-bold mb-1">
                    Horario *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.time}
                    onChange={(e) =>
                      setFormData({ ...formData, time: e.target.value })
                    }
                    placeholder="ej. 5:00 PM - 10:30 PM"
                    className="w-full px-3 py-2 bg-white/70 border border-stone-200 rounded-xl text-stone-900 outline-none focus:border-amber-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-800 font-bold mb-1">
                  Ubicación / Punto de Encuentro *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="ej. Playa Norte (Junto al Barco Galeón), Ciudad del Carmen"
                  className="w-full px-3 py-2 bg-white/70 border border-stone-200 rounded-xl text-stone-900 outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-800 font-bold mb-1">
                    Costo / Entrada
                  </label>
                  <input
                    type="text"
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData({ ...formData, cost: e.target.value })
                    }
                    placeholder="ej. Entrada Libre"
                    className="w-full px-3 py-2 bg-white/70 border border-stone-200 rounded-xl text-stone-900 outline-none focus:border-amber-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-stone-800 font-bold mb-1">
                    Organizador
                  </label>
                  <input
                    type="text"
                    value={formData.organizer}
                    onChange={(e) =>
                      setFormData({ ...formData, organizer: e.target.value })
                    }
                    placeholder="ej. Colectivo Emprendedores"
                    className="w-full px-3 py-2 bg-white/70 border border-stone-200 rounded-xl text-stone-900 outline-none focus:border-amber-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-stone-800 font-bold mb-1">
                    Icono
                  </label>
                  <select
                    value={formData.icon}
                    onChange={(e) =>
                      setFormData({ ...formData, icon: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white/80 border border-stone-200 rounded-xl text-stone-900 outline-none focus:border-amber-500 cursor-pointer font-semibold"
                  >
                    {AVAILABLE_ICONS.map((i) => (
                      <option key={i.name} value={i.name}>
                        {i.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-800 font-bold mb-1">
                  Descripción del Evento
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="ej. Más de 40 marcas locales, artesanías carmelitas, repostería y música..."
                  className="w-full px-3 py-2 bg-white/70 border border-stone-200 rounded-xl text-stone-900 outline-none focus:border-amber-500 resize-none font-medium"
                />
              </div>

              <div>
                <label className="block text-stone-800 font-bold mb-1">
                  Enlace de Fuente Oficial / Referencia Web (opcional)
                </label>
                <input
                  type="url"
                  value={formData.sourceUrl || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, sourceUrl: e.target.value })
                  }
                  placeholder="https://carmen.gob.mx o https://facebook.com/..."
                  className="w-full px-3 py-2 bg-white/70 border border-stone-200 rounded-xl text-stone-900 outline-none focus:border-amber-500 text-xs font-semibold"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stone-200/70">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-2xl border border-stone-300/80 hover:bg-stone-200/60 active:scale-95 text-stone-700 font-bold text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  {editingId ? "Guardar Cambios" : "Publicar en Cartelera"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE BÚSQUEDA AVANZADA CON IA (GOOGLE GEMINI & RADAR) */}
      {isAiSearchModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          style={{
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(25px)",
            WebkitBackdropFilter: "blur(25px)",
          }}
          onClick={closeAiRadar}
        >
          <div
            className="rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
            style={{
              background: "rgba(15, 23, 42, 0.90)",
              backdropFilter: "blur(40px) saturate(190%)",
              WebkitBackdropFilter: "blur(40px) saturate(190%)",
              border: "1.5px solid rgba(168, 85, 247, 0.35)",
              boxShadow:
                "0 30px 70px -15px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-purple-500/20 bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                      Búsqueda Avanzada de Eventos con IA
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-900/80 text-purple-200 border border-purple-500/30">
                      Google Gemini
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Descubre y estructura eventos locales para la cartelera de
                    Ciudad del Carmen con un solo clic.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeAiRadar}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Search input & buttons */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={aiSearchQuery}
                      onChange={(e) => setAiSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleExecuteAiSearch(true);
                      }}
                      placeholder="ej. Conciertos en el Malecón, bazares playeros, rodadas, mariscos..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-purple-500/30 rounded-2xl text-white placeholder-slate-400 text-xs sm:text-sm outline-none focus:border-purple-400 transition-colors"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExecuteAiSearch(true)}
                    disabled={aiSearchLoading}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    {aiSearchLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Analizando con IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Buscar con IA (Gemini)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExecuteAiSearch(false)}
                    disabled={aiSearchLoading}
                    className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Búsqueda local sin usar API externa"
                  >
                    <Radio className="w-3.5 h-3.5 text-sky-400" />
                    <span>Radar Local ($0)</span>
                  </button>
                </div>

                {/* Quick suggestions chips */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400 font-semibold mr-1">
                    Sugerencias:
                  </span>
                  {[
                    "🎶 Conciertos & Malecón",
                    "🛍️ Bazares Playa Norte",
                    "🚴 Rodadas & Deportes",
                    "🍤 Mariscos & Gastronomía",
                    "🎭 Teatro & Cultura Carmelita",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        const cleanQuery = chip.replace(/^[^\w\s]+/, "").trim();
                        setAiSearchQuery(cleanQuery);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-500/20 transition-colors cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Message Notification */}
              <p
                role="status"
                className="p-3 rounded-xl bg-amber-50 text-amber-900 text-xs"
              >
                {RADAR_BLOCK_REASON}
              </p>
              {aiSearchMessage && (
                <div
                  role="status"
                  className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
                    aiSearchMessage.type === "warning"
                      ? "bg-amber-950/50 border-amber-500/40 text-amber-200"
                      : aiSearchMessage.type === "error"
                        ? "bg-rose-950/50 border-rose-500/40 text-rose-200"
                        : "bg-emerald-950/50 border-emerald-500/40 text-emerald-200"
                  }`}
                >
                  {aiSearchMessage.type === "warning" ? (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  ) : aiSearchMessage.type === "error" ? (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">
                    {aiSearchMessage.text}
                  </span>
                </div>
              )}

              {/* Candidates Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-bold">
                    Candidatos detectados ({aiCandidates.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allUnpub = aiCandidates
                          .filter((c) => !c.alreadyPublished)
                          .map((c) => c.id);
                        setSelectedCandidateIds(new Set(allUnpub));
                      }}
                      className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer underline text-[11px]"
                    >
                      Seleccionar no publicados
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedCandidateIds(new Set())}
                      className="text-slate-400 hover:text-slate-200 cursor-pointer text-[11px]"
                    >
                      Deseleccionar todos
                    </button>
                  </div>
                </div>

                {aiSearchLoading ? (
                  <div className="py-16 text-center space-y-3 bg-slate-900/60 rounded-2xl border border-purple-500/20">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                    <p className="text-sm font-semibold text-slate-200">
                      Rastreando y estructurando eventos carmelitas con
                      Inteligencia Artificial...
                    </p>
                    <p className="text-xs text-slate-400">
                      Asignando ubicaciones reales, fechas y fotografías en alta
                      definición.
                    </p>
                  </div>
                ) : aiCandidates.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
                    Escribe un término de búsqueda arriba o pulsa "Buscar con
                    IA" para descubrir actividades.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {aiCandidates.map((cand) => {
                      const isSelected = selectedCandidateIds.has(cand.id);
                      const isPublished = Boolean(cand.alreadyPublished);
                      return (
                        <div
                          key={cand.id}
                          onClick={() => {
                            if (!isPublished) handleToggleCandidate(cand.id);
                          }}
                          className={`p-3.5 rounded-2xl border transition-all flex gap-3 text-left ${
                            isPublished
                              ? "bg-slate-900/40 border-slate-800 opacity-60 cursor-not-allowed"
                              : isSelected
                                ? "bg-purple-950/40 border-purple-500/70 shadow-md shadow-purple-500/10 cursor-pointer"
                                : "bg-slate-900/70 border-slate-800 hover:border-slate-700 cursor-pointer"
                          }`}
                        >
                          {/* Checkbox */}
                          <div className="pt-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isPublished}
                              onChange={() => handleToggleCandidate(cand.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded text-purple-600 accent-purple-500 cursor-pointer"
                            />
                          </div>

                          {/* Image */}
                          <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-800 border border-slate-700 relative">
                            <img
                              src={cand.image}
                              alt={cand.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80";
                              }}
                            />
                            {cand.aiDetected && (
                              <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-purple-600 text-white font-black text-[8px]">
                                IA
                              </span>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                {cand.category}
                              </span>
                              {isPublished && (
                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                  ✓ Ya en Cartelera
                                </span>
                              )}
                            </div>

                            <h4 className="font-bold text-xs sm:text-sm text-white line-clamp-1">
                              {cand.title}
                            </h4>

                            <div className="text-[11px] text-slate-300 space-y-0.5">
                              <div className="flex items-center gap-1 truncate">
                                <Calendar className="w-3 h-3 text-purple-400 shrink-0" />
                                <span className="truncate">{cand.date}</span>
                                {cand.time && <span>• {cand.time}</span>}
                              </div>
                              <div className="flex items-center gap-1 truncate text-slate-400">
                                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="truncate">
                                  {cand.location}
                                </span>
                              </div>
                            </div>

                            {cand.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-2 pt-0.5">
                                {cand.description}
                              </p>
                            )}

                            {cand.sourceUrl &&
                              (() => {
                                const siteName = resolveSourceSiteName(
                                  cand.sourceUrl,
                                  cand.badge || cand.organizer,
                                );
                                return (
                                  <div className="pt-1.5 flex items-center justify-between gap-2 flex-wrap">
                                    <span className="text-[10px] font-semibold text-purple-200/90 truncate">
                                      Fuente: <strong>{siteName}</strong>
                                    </span>
                                    <a
                                      href={cand.sourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-[10px] shadow-xs transition-colors"
                                      title={`Validar evento directamente en ${siteName}: ${cand.sourceUrl}`}
                                    >
                                      <span>Ver en {siteName}</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  </div>
                                );
                              })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-purple-500/20 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-300">
                <span>Seleccionados para publicar: </span>
                <strong className="text-purple-300 font-bold">
                  {
                    Array.from(selectedCandidateIds).filter((id) => {
                      const c = aiCandidates.find((item) => item.id === id);
                      return c && !c.alreadyPublished;
                    }).length
                  }{" "}
                  eventos
                </strong>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={closeAiRadar}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  onClick={handlePublishSelectedCandidates}
                  disabled={RADAR_WRITE_BLOCKED}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-stone-950 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isPublishingCandidates ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                      <span>Publicando en Cartelera...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-stone-950" />
                      <span>Publicar Seleccionados en Cartelera</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Event */}
      {eventToDelete && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4"
          style={{
            background: "rgba(15, 23, 42, 0.4)",
            backdropFilter: "blur(25px)",
            WebkitBackdropFilter: "blur(25px)",
          }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp"
            style={{
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(35px) saturate(190%)",
              WebkitBackdropFilter: "blur(35px) saturate(190%)",
              border: "1.5px solid rgba(255, 255, 255, 0.95)",
              boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3)",
            }}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-base font-extrabold text-stone-900">
                ¿Eliminar evento?
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                ¿Seguro que deseas eliminar{" "}
                <strong className="text-stone-950 font-bold">
                  {eventToDelete.title}
                </strong>{" "}
                de la cartelera oficial?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="py-2.5 px-3 rounded-2xl bg-stone-200/80 hover:bg-stone-300 active:scale-95 text-stone-800 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteEvent}
                className="py-2.5 px-3 rounded-2xl bg-[#e11d48] hover:bg-[#be123c] active:scale-95 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all cursor-pointer"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Resetting Events Defaults */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4"
          style={{
            background: "rgba(15, 23, 42, 0.4)",
            backdropFilter: "blur(25px)",
            WebkitBackdropFilter: "blur(25px)",
          }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp"
            style={{
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(35px) saturate(190%)",
              WebkitBackdropFilter: "blur(35px) saturate(190%)",
              border: "1.5px solid rgba(255, 255, 255, 0.95)",
              boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3)",
            }}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-base font-extrabold text-stone-900">
                ¿Restaurar cartelera oficial?
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                ¿Deseas restaurar la lista oficial de eventos predeterminados de
                Ciudad del Carmen?
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
