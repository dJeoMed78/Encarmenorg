import React, { useState, useRef, useEffect } from 'react';
import { Search, X, MapPin, MessageSquare, Truck, Phone, SlidersHorizontal, RotateCcw, PlusCircle, ArrowDown, AlertCircle, Mic, MicOff, Volume2, ChevronDown, ChevronUp, Share2 } from 'lucide-react';
import { APP_VERSION } from '../constants/version';

interface HeroSearchProps {
  query: string;
  setQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedColonia: string;
  setSelectedColonia: (col: string) => void;
  coloniasList: { name: string; count: number }[];
  hasWhatsapp: boolean;
  setHasWhatsapp: (v: boolean) => void;
  hasDelivery: boolean;
  setHasDelivery: (v: boolean) => void;
  hasAddress: boolean;
  setHasAddress: (v: boolean) => void;
  hasPhone: boolean;
  setHasPhone: (v: boolean) => void;
  totalResults: number;
  totalAll: number;
  onResetFilters: () => void;
  onGoToRegister?: () => void;
  onSearchSubmit?: () => void;
}

export const HeroSearch: React.FC<HeroSearchProps> = ({
  query,
  setQuery,
  selectedCategory,
  setSelectedCategory,
  selectedColonia,
  setSelectedColonia,
  coloniasList,
  hasWhatsapp,
  setHasWhatsapp,
  hasDelivery,
  setHasDelivery,
  hasAddress,
  setHasAddress,
  hasPhone,
  setHasPhone,
  totalResults,
  totalAll,
  onResetFilters,
  onGoToRegister,
  onSearchSubmit
}) => {
  const [noResultToast, setNoResultToast] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isSocialSectionCollapsed, setIsSocialSectionCollapsed] = useState(true);
  const [isComunidadesCollapsed, setIsComunidadesCollapsed] = useState(true);
  const recognitionRef = useRef<any>(null);

  const [bannerVersion, setBannerVersion] = useState(APP_VERSION);
  const [customBannerUrl, setCustomBannerUrl] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('portal_custom_banner') : null;
  });

  useEffect(() => {
    const handleUpdate = () => {
      setBannerVersion(`${APP_VERSION}_${Date.now()}`);
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('portal_custom_banner');
        if (saved) setCustomBannerUrl(saved);
      }
    };
    window.addEventListener('brand-media-updated', handleUpdate);
    return () => window.removeEventListener('brand-media-updated', handleUpdate);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNoResultToast('El reconocimiento de voz no está soportado en este navegador. Prueba usando Google Chrome o Safari en tu teléfono.');
      setTimeout(() => setNoResultToast(null), 5000);
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'es-MX';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceTranscript('');
        setNoResultToast(null);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(60);
        }
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const currentText = final || interim;
        setVoiceTranscript(currentText);
        setQuery(currentText);

        if (final) {
          setIsListening(false);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([40, 50, 40]);
          }
          setTimeout(() => {
            if (onSearchSubmit) {
              onSearchSubmit();
            } else {
              const target = document.getElementById('resultados-directorio');
              if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 350);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setNoResultToast('Permiso de micrófono bloqueado. Habilita el acceso al micrófono en los ajustes de tu navegador para dictar por voz.');
        } else if (event.error === 'no-speech') {
          // No speech detected, quietly reset
        } else {
          setNoResultToast(`Aviso de voz: ${event.error}`);
        }
        setTimeout(() => setNoResultToast(null), 6000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      setNoResultToast('No se pudo acceder al micrófono del dispositivo.');
      setTimeout(() => setNoResultToast(null), 5000);
    }
  };

  const stopVoiceSearch = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    setIsListening(false);
    if (query.trim()) {
      handleExecuteSearch();
    }
  };

  const toggleVoiceSearch = () => {
    if (isListening) {
      stopVoiceSearch();
    } else {
      startVoiceSearch();
    }
  };

  const handleExecuteSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (totalResults === 0) {
      setNoResultToast(
        query.trim()
          ? `No se encontraron negocios para "${query}". Intenta con otra palabra o borra filtros.`
          : 'No se encontraron negocios con los filtros actuales.'
      );
      setTimeout(() => setNoResultToast(null), 5000);
      return;
    }

    setNoResultToast(null);
    if (onSearchSubmit) {
      onSearchSubmit();
    } else {
      // Smooth scroll to business listings section
      const target = document.getElementById('resultados-directorio');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const isFiltered =
    Boolean(query) ||
    selectedCategory !== 'all' ||
    selectedColonia !== 'todas' ||
    hasWhatsapp ||
    hasDelivery ||
    hasAddress ||
    hasPhone;

  const popularSearches = [
    { label: 'Uniformes', q: 'uniformes' },
    { label: 'Mudanzas y Fletes', q: 'mudanzas' },
    { label: 'Comida y Antojitos', q: 'alimentos' },
    { label: 'Uñas y Belleza', q: 'uñas' },
    { label: 'Aires y Climas', q: 'clima' },
    { label: 'Mascotas', q: 'mascotas' },
    { label: 'Imprenta y Bordados', q: 'bordados' }
  ];

  return (
    <div className="text-white py-6 sm:py-8 px-3 sm:px-6 lg:px-8 border-b border-stone-800 relative overflow-hidden bg-[#07111e]" style={{ backgroundImage: "linear-gradient(to bottom, #07111e 0%, #0a1c33 45%, #07111e 100%)" }}>
      {/* Glow accents */}
      <div className="absolute left-1/4 top-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute right-1/4 top-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container with 3-column layout on 2xl / xl screens */}
      <div className="max-w-[1560px] mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SIDEBAR: Redes Sociales & Grupos de Facebook / TikTok */}
          <aside className="hidden xl:flex xl:col-span-3 flex-col gap-3 sticky top-20 pt-2">
            <div className="p-3.5 rounded-2xl bg-stone-800/60 border border-stone-700/60 backdrop-blur-md shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-stone-700/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white tracking-tight">Canales Oficiales</h3>
                    <p className="text-[10px] text-stone-400">Facebook & TikTok</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSocialSectionCollapsed(!isSocialSectionCollapsed)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-stone-600 hover:border-stone-400 bg-stone-700/60 hover:bg-stone-700 text-stone-200 text-xs transition-colors cursor-pointer font-medium shadow-xs"
                  title={isSocialSectionCollapsed ? 'Mostrar canales oficiales' : 'Ocultar canales oficiales'}
                >
                  <span>{isSocialSectionCollapsed ? 'Mostrar' : 'Ocultar'}</span>
                  {isSocialSectionCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
              </div>

              {!isSocialSectionCollapsed && (
                <div className="space-y-2 animate-fadeIn">
                  {/* 1. Facebook Page */}
                  <a
                    href="https://facebook.com/empresasencarmen"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-[#1877F2]/15 to-[#1877F2]/5 hover:from-[#1877F2] hover:to-[#0d65d9] border border-[#1877F2]/40 hover:border-[#1877F2] text-stone-200 hover:text-white transition-all shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#1877F2] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white leading-tight truncate">Empresas en Carmen</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold uppercase group-hover:bg-white/20 group-hover:text-white">Página</span>
                      </div>
                      <span className="text-[10px] text-stone-400 group-hover:text-blue-100 flex items-center gap-1 mt-0.5">
                        facebook.com/empresasencarmen
                      </span>
                    </div>
                  </a>

                  {/* 2. Facebook Ventas Group */}
                  <a
                    href="https://www.facebook.com/share/g/18WwRY3pKB/?mibextid=wwXIfr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-blue-600/15 to-blue-500/5 hover:from-blue-600 hover:to-indigo-600 border border-blue-500/40 hover:border-blue-400 text-stone-200 hover:text-white transition-all shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white leading-tight truncate">Grupo de Ventas</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold uppercase group-hover:bg-white/20 group-hover:text-white">Grupo FB</span>
                      </div>
                      <span className="text-[10px] text-stone-400 group-hover:text-blue-100 flex items-center gap-1 mt-0.5">
                        Empresas en Carmen (Ventas)
                      </span>
                    </div>
                  </a>

                  {/* 3. TikTok */}
                  <a
                    href="https://www.tiktok.com/@empresasencarmen"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-stone-800 to-black/80 hover:from-black hover:to-stone-900 border border-stone-600/60 hover:border-pink-500/60 text-stone-200 hover:text-white transition-all shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-black border border-stone-700 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform group-hover:border-pink-500">
                      <svg className="w-4 h-4 fill-current text-cyan-400" viewBox="0 0 24 24">
                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.98v8.63c-.02 1.56-.44 3.14-1.28 4.45-1.48 2.37-4.14 3.94-6.95 3.95-1.52.01-3.05-.38-4.39-1.11C2.33 22.95.89 20.84.45 18.28c-.45-2.56.24-5.27 1.88-7.23 1.64-1.97 4.1-3.11 6.67-3.09.43.01.86.06 1.28.14V12.2c-.37-.12-.76-.19-1.15-.2-.93-.03-1.87.24-2.61.81-.74.57-1.2 1.43-1.28 2.36-.08.93.23 1.88.85 2.57.62.69 1.52 1.07 2.45 1.04.93-.03 1.8-.46 2.35-1.2.47-.64.71-1.44.71-2.25V.02z"/>
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white leading-tight truncate">TikTok Oficial</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-semibold uppercase group-hover:bg-pink-600 group-hover:text-white">TikTok</span>
                      </div>
                      <span className="text-[10px] text-stone-400 group-hover:text-pink-300 flex items-center gap-1 mt-0.5">
                        @empresasencarmen
                      </span>
                    </div>
                  </a>
                </div>
              )}
            </div>
          </aside>

          {/* CENTER: Main Hero Search & Filters (Col 6 on XL) */}
          <div className="xl:col-span-6 space-y-4 sm:space-y-5">
            {/* Banner Panorámico Oficial - Ajustado al 100% de la pantalla para lectura completa */}
            <div className="relative group/banner">
              <div
                className="w-full max-w-full sm:max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-sky-500/30 bg-[#07111e] transition-all hover:border-sky-400/50 cursor-pointer group"
                onClick={() => onGoToRegister ? onGoToRegister() : undefined}
                title="¡Publicita tu negocio gratis en Empresas en Carmen!"
              >
                <img
                  src={customBannerUrl || `/images/banner-empresas-en-carmen.png?v=${bannerVersion}`}
                  alt="Directorio Empresarial - Empresas en Carmen - ¡Publicita tu negocio gratis!"
                  width={1586}
                  height={250}
                  className="w-full h-auto object-contain block group-hover:scale-[1.01] transition-transform duration-300"
                  loading="eager"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src.includes('banner-empresas-en-carmen.png')) {
                      target.src = `/images/BANNER-NUEVO-EMPRESAS-EN-CARMEN.png?v=${bannerVersion}`;
                    } else if (target.src.includes('BANNER-NUEVO-EMPRESAS-EN-CARMEN.png')) {
                      target.src = `/images/empresas.png?v=${bannerVersion}`;
                    } else if (target.src.includes('empresas.png')) {
                      target.src = `/images/banner-empresas-en-carmen.svg?v=${bannerVersion}`;
                    }
                  }}
                />
              </div>
            </div>

            {/* Title area */}
            <div className="text-center space-y-2 max-w-2xl mx-auto flex flex-col items-center">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Encuentra negocios y servicios en Carmen
              </h1>
            </div>

            {/* Search Bar Input Container with Buscar button */}
            <form onSubmit={handleExecuteSearch} className="bg-white rounded-2xl p-2 sm:p-2.5 shadow-xl shadow-black/20 border border-stone-200/20 text-stone-900 w-full">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Text Query - text-base (16px) on mobile prevents iOS safari auto-zoom */}
                <div className="relative flex-1 flex items-center">
                  <Search className="w-5 h-5 text-stone-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={query}
                    onChange={e => {
                      setQuery(e.target.value);
                      if (noResultToast) setNoResultToast(null);
                    }}
                    placeholder={isListening ? 'Escuchando tu voz...' : '¿Qué buscas? Ej. taller, comida, veterinaria...'}
                    className={`w-full pl-11 pr-24 py-3 text-base sm:text-base bg-transparent border-0 focus:ring-0 outline-none font-medium transition-colors ${
                      isListening ? 'text-amber-600 placeholder:text-amber-500 font-semibold' : 'text-stone-900 placeholder:text-stone-400'
                    }`}
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    {query && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuery('');
                          setNoResultToast(null);
                        }}
                        className="p-1.5 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer transition-colors"
                        title="Borrar búsqueda"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={toggleVoiceSearch}
                      className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer relative ${
                        isListening
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/40 ring-4 ring-rose-200 animate-pulse'
                          : 'text-stone-500 hover:text-amber-600 hover:bg-amber-50 active:bg-amber-100'
                      }`}
                      title={isListening ? 'Detener búsqueda por voz' : 'Buscar por voz (ideal para conductores)'}
                      aria-label="Buscar por voz"
                    >
                      <Mic className={`w-4 h-4 sm:w-5 sm:h-5 ${isListening ? 'animate-bounce text-white' : ''}`} />
                      {isListening && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Colonia Select */}
                <div className="flex items-center gap-1.5 sm:border-l sm:border-stone-200 sm:pl-3 px-2 sm:px-0 border-t sm:border-t-0 border-stone-100 pt-1.5 sm:pt-0">
                  <MapPin className="w-4 h-4 text-stone-400 shrink-0" />
                  <select
                    value={selectedColonia}
                    onChange={e => {
                      setSelectedColonia(e.target.value);
                      if (noResultToast) setNoResultToast(null);
                    }}
                    className="w-full sm:w-44 py-2 sm:py-2.5 text-sm sm:text-sm bg-transparent border-0 outline-none text-stone-700 font-medium cursor-pointer"
                  >
                    <option value="todas">Todas las colonias</option>
                    {coloniasList.map(c => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.count})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Search Button: Scrolls down to results or shows feedback message */}
                <button
                  type="submit"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-stone-950 font-extrabold text-sm tracking-tight transition-all shadow-md shadow-amber-500/25 cursor-pointer shrink-0 hover:scale-[1.02]"
                >
                  <Search className="w-4 h-4 text-stone-950 stroke-[2.5]" />
                  <span>BUSCAR</span>
                  {totalResults > 0 && (
                    <span className="hidden sm:inline-flex items-center gap-0.5 text-xs bg-stone-950/15 px-2 py-0.5 rounded-full font-bold">
                      {totalResults}
                    </span>
                  )}
                  <ArrowDown className="w-3.5 h-3.5 sm:hidden" />
                </button>
              </div>
            </form>

            {/* Listening Live Overlay Banner */}
            {isListening && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-900/95 border-2 border-rose-500/70 shadow-2xl backdrop-blur-md text-white animate-fadeIn">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-rose-500 text-white shrink-0 animate-pulse">
                      <Mic className="w-5 h-5 animate-bounce" />
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60"></span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping inline-block"></span>
                          Escuchando...
                        </span>
                        <span className="text-[11px] text-stone-300 hidden sm:inline">Di claro qué negocio buscas</span>
                      </div>
                      <p className="text-sm sm:text-base font-semibold text-amber-300 truncate mt-0.5">
                        {voiceTranscript ? `"${voiceTranscript}"` : 'Ejemplo: "Mecánico", "SoniGas", "Mariscos"...'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={stopVoiceSearch}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shrink-0 transition-colors shadow-sm cursor-pointer"
                  >
                    Detener
                  </button>
                </div>
              </div>
            )}

            {/* Feedback message banner if no results or notification */}
            {noResultToast && (
              <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn backdrop-blur-xs">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-bold text-white">{noResultToast}</p>
                  <p className="text-stone-300 text-xs">
                    Sugerencia: Revisa la ortografía, prueba palabras más cortas o quita filtros activos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNoResultToast(null)}
                  className="p-1 text-rose-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Business Owner Self-Registration CTA Ribbon */}
            {onGoToRegister && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs">
                <div className="flex items-center gap-2 text-stone-200 text-center sm:text-left">
                  <span className="text-amber-400 font-bold">¿Tienes un negocio en Ciudad del Carmen?</span>
                  <span className="hidden md:inline text-stone-300">Aparece en el directorio oficial y recibe más clientes por WhatsApp.</span>
                </div>
                <button
                  onClick={onGoToRegister}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold tracking-tight transition-colors shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Sube tu negocio gratis</span>
                </button>
              </div>
            )}

            {/* Quick Filter Toggles & Quick Searches */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
              {/* Action filters */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-stone-400 flex items-center gap-1 mr-1">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filtros:</span>
                </span>

                <button
                  onClick={() => setHasWhatsapp(!hasWhatsapp)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                    hasWhatsapp
                      ? 'bg-emerald-600/90 text-white border-emerald-500 font-medium'
                      : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border-stone-700'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp directo</span>
                </button>

                <button
                  onClick={() => setHasDelivery(!hasDelivery)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                    hasDelivery
                      ? 'bg-amber-600/90 text-white border-amber-500 font-medium'
                      : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border-stone-700'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>A domicilio</span>
                </button>

                <button
                  onClick={() => setHasAddress(!hasAddress)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                    hasAddress
                      ? 'bg-blue-600/90 text-white border-blue-500 font-medium'
                      : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border-stone-700'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Con dirección física</span>
                </button>

                <button
                  onClick={() => setHasPhone(!hasPhone)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                    hasPhone
                      ? 'bg-purple-600/90 text-white border-purple-500 font-medium'
                      : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border-stone-700'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Teléfono</span>
                </button>

                <button
                  type="button"
                  onClick={toggleVoiceSearch}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-600 text-white border-rose-500 font-bold animate-pulse shadow-sm shadow-rose-500/50'
                      : 'bg-stone-800/80 hover:bg-stone-800 text-amber-300 border-amber-500/40 hover:border-amber-400'
                  }`}
                  title="Activar dictado por voz (ideal si estás manejando)"
                >
                  <Mic className={`w-3.5 h-3.5 ${isListening ? 'animate-bounce text-white' : 'text-amber-400'}`} />
                  <span>{isListening ? 'Dictando...' : 'Buscar por voz'}</span>
                </button>

                {isFiltered && (
                  <button
                    onClick={onResetFilters}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-stone-400 hover:text-white transition-colors"
                    title="Restablecer filtros"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Limpiar</span>
                  </button>
                )}
              </div>

              {/* Result counter indicator */}
              <div className="text-stone-300 font-medium">
                Mostrando <span className="text-amber-400 font-bold">{totalResults}</span> de {totalAll} empresas
              </div>
            </div>

            {/* Popular Tags */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-stone-400 no-scrollbar">
              <span className="shrink-0 text-stone-400">Populares:</span>
              {popularSearches.map(item => (
                <button
                  key={item.label}
                  onClick={() => setQuery(item.q)}
                  className="shrink-0 px-2.5 py-1 rounded bg-stone-800/60 hover:bg-stone-700/80 hover:text-white transition-colors text-stone-300"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* EXPANDED SOCIAL CHANNELS (WhatsApp Communities & Social Media for Mobile) */}
            <div className="xl:hidden pt-3 border-t border-stone-800 space-y-2.5">
              {/* 1. Mobile WhatsApp Communities bar */}
              <div className="rounded-xl bg-stone-850/90 border border-stone-700/60 overflow-hidden">
                <div className="flex items-center justify-between p-2 sm:p-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-[#25D366] text-white flex items-center justify-center">
                      <MessageSquare className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-bold text-white">Comunidades WhatsApp</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsComunidadesCollapsed(!isComunidadesCollapsed)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-stone-600 bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    <span>{isComunidadesCollapsed ? 'Mostrar' : 'Ocultar'}</span>
                    {isComunidadesCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {!isComunidadesCollapsed && (
                  <div className="p-2.5 pt-0 grid grid-cols-1 gap-1.5 animate-fadeIn">
                    <a
                      href="https://chat.whatsapp.com/LYO8hYfeeNa1REtDj0Ztpx"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366] text-stone-200 hover:text-white border border-[#25D366]/40 transition-colors text-xs font-semibold"
                    >
                      <span>Empresas en Carmen</span>
                      <span className="text-[10px] bg-[#25D366] text-white px-1.5 py-0.5 rounded">Unirme</span>
                    </a>
                    <a
                      href="https://chat.whatsapp.com/JnYo6VTh54RHehkNAVykby"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366] text-stone-200 hover:text-white border border-[#25D366]/40 transition-colors text-xs font-semibold"
                    >
                      <span>Empresas en Carmen 2</span>
                      <span className="text-[10px] bg-[#25D366] text-white px-1.5 py-0.5 rounded">Unirme</span>
                    </a>
                    <a
                      href="https://chat.whatsapp.com/JAKoiEtTdXS9lEOm0tLTor"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-600 text-stone-200 hover:text-white border border-amber-500/40 transition-colors text-xs font-semibold"
                    >
                      <span>Comidas en Carmen</span>
                      <span className="text-[10px] bg-amber-500 text-stone-950 px-1.5 py-0.5 rounded font-bold">Unirme</span>
                    </a>
                  </div>
                )}
              </div>

              {/* 2. Mobile Canales Oficiales (Facebook & TikTok) */}
              <div className="rounded-xl bg-stone-850/90 border border-stone-700/60 overflow-hidden">
                <div className="flex items-center justify-between p-2 sm:p-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-[#1877F2] text-white flex items-center justify-center">
                      <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-white">Canales Oficiales (FB & TikTok)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSocialSectionCollapsed(!isSocialSectionCollapsed)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-stone-600 bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    <span>{isSocialSectionCollapsed ? 'Mostrar' : 'Ocultar'}</span>
                    {isSocialSectionCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {!isSocialSectionCollapsed && (
                  <div className="p-2.5 pt-0 grid grid-cols-1 gap-1.5 animate-fadeIn">
                    <a
                      href="https://facebook.com/empresasencarmen"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#1877F2]/15 hover:bg-[#1877F2] text-stone-200 hover:text-white border border-[#1877F2]/40 transition-colors text-xs font-semibold"
                    >
                      <span>Página Facebook</span>
                      <span className="text-[10px] bg-[#1877F2] text-white px-1.5 py-0.5 rounded">Seguir</span>
                    </a>
                    <a
                      href="https://www.facebook.com/share/g/18WwRY3pKB/?mibextid=wwXIfr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-blue-600/15 hover:bg-blue-600 text-stone-200 hover:text-white border border-blue-500/40 transition-colors text-xs font-semibold"
                    >
                      <span>Grupo Ventas FB</span>
                      <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded">Entrar</span>
                    </a>
                    <a
                      href="https://www.tiktok.com/@empresasencarmen"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-stone-900 hover:bg-black text-stone-200 hover:text-white border border-stone-600 transition-colors text-xs font-semibold"
                    >
                      <span>TikTok @empresasencarmen</span>
                      <span className="text-[10px] bg-pink-600 text-white px-1.5 py-0.5 rounded">Ver</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: WhatsApp Community Groups */}
          <aside className="hidden xl:flex xl:col-span-3 flex-col gap-3 sticky top-20 pt-2">
            <div className="p-3.5 rounded-2xl bg-stone-800/60 border border-stone-700/60 backdrop-blur-md shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-stone-700/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#25D366]/20 border border-[#25D366]/30 flex items-center justify-center text-[#25D366]">
                    <MessageSquare className="w-4 h-4 fill-current" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white tracking-tight">Comunidades WhatsApp</h3>
                    <p className="text-[10px] text-stone-400">Grupos de Difusión & Clientes</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsComunidadesCollapsed(!isComunidadesCollapsed)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-stone-600 hover:border-stone-400 bg-stone-700/60 hover:bg-stone-700 text-stone-200 text-xs transition-colors cursor-pointer font-medium shadow-xs"
                  title={isComunidadesCollapsed ? 'Mostrar comunidades WhatsApp' : 'Ocultar comunidades WhatsApp'}
                >
                  <span>{isComunidadesCollapsed ? 'Mostrar' : 'Ocultar'}</span>
                  {isComunidadesCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
              </div>

              {!isComunidadesCollapsed && (
                <div className="space-y-2 animate-fadeIn">
                  {/* 1. Empresas en Carmen */}
                  <a
                  href="https://chat.whatsapp.com/LYO8hYfeeNa1REtDj0Ztpx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-[#25D366]/15 to-[#25D366]/5 hover:from-[#25D366] hover:to-[#1da851] border border-[#25D366]/40 hover:border-[#25D366] text-stone-200 hover:text-white transition-all shadow-xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white leading-tight truncate">Empresas en Carmen</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold uppercase group-hover:bg-white/20 group-hover:text-white">Grupo 1</span>
                    </div>
                    <span className="text-[10px] text-stone-400 group-hover:text-emerald-100 flex items-center gap-1 mt-0.5">
                      Unirme a la comunidad
                    </span>
                  </div>
                </a>

                {/* 2. Empresas en Carmen 2 */}
                <a
                  href="https://chat.whatsapp.com/JnYo6VTh54RHehkNAVykby"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-[#25D366]/15 to-[#25D366]/5 hover:from-[#25D366] hover:to-[#1da851] border border-[#25D366]/40 hover:border-[#25D366] text-stone-200 hover:text-white transition-all shadow-xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white leading-tight truncate">Empresas en Carmen 2</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold uppercase group-hover:bg-white/20 group-hover:text-white">Grupo 2</span>
                    </div>
                    <span className="text-[10px] text-stone-400 group-hover:text-emerald-100 flex items-center gap-1 mt-0.5">
                      Unirme a la comunidad
                    </span>
                  </div>
                </a>

                {/* 3. Comidas en Carmen */}
                <a
                  href="https://chat.whatsapp.com/JAKoiEtTdXS9lEOm0tLTor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/5 hover:from-amber-600 hover:to-orange-600 border border-amber-500/40 hover:border-amber-400 text-stone-200 hover:text-white transition-all shadow-xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white leading-tight truncate">Comidas en Carmen</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold uppercase group-hover:bg-white/20 group-hover:text-white">Gastronomía</span>
                    </div>
                    <span className="text-[10px] text-stone-400 group-hover:text-amber-100 flex items-center gap-1 mt-0.5">
                      Restaurantes y antojitos
                    </span>
                  </div>
                </a>
              </div>
            )}
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
};
