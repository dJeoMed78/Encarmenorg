import React from 'react';
import {
  Building2,
  Tag,
  LayoutGrid,
  MapPin,
  Bookmark,
  PlusCircle,
  ShieldAlert,
  ExternalLink,
  Image as ImageIcon
} from 'lucide-react';
import { useBrandConfig } from '../utils/brand';
import { BrandLogo } from './BrandLogo';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  favoritesCount: number;
  onOpenSyncModal: () => void;
  onOpenEmergencyGuide: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  favoritesCount,
  onOpenSyncModal,
  onOpenEmergencyGuide
}) => {
  const { brand } = useBrandConfig();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
      <div className="max-w-[1560px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[108px] sm:min-h-[114px] py-1.5 gap-2 sm:gap-4">
          {/* Logo Oficial 300x100 */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setActiveTab('directory')}
              className="flex items-center text-left group cursor-pointer focus:outline-hidden shrink-0"
              title="Empresas en Carmen - Directorio Empresarial"
            >
              <BrandLogo />
            </button>
          </div>

          {/* Desktop Navigation - Visible en todas las pantallas medianas y grandes */}
          <nav className="hidden md:flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200/60 text-xs font-medium shrink-0">
            <button
              onClick={() => setActiveTab('directory')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'directory'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Negocios</span>
            </button>

            <button
              onClick={() => setActiveTab('classifieds')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'classifieds'
                  ? 'bg-amber-500 text-stone-950 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Clasificados</span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Categorías</span>
            </button>

            <button
              onClick={() => setActiveTab('zones')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'zones'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Colonias</span>
            </button>

            <button
              onClick={() => setActiveTab('favorites')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'favorites'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Guardados</span>
              {favoritesCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                  {favoritesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('register')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-amber-500 text-white shadow-xs font-semibold'
                  : 'text-amber-700 bg-amber-50/80 hover:bg-amber-100 hover:text-amber-800 font-semibold'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Subir Mi Negocio</span>
            </button>
          </nav>

          {/* Right Action Icons - Solo en pantallas muy amplias para no competir por espacio */}
          <div className="hidden xl:flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onOpenEmergencyGuide && (
              <button
                type="button"
                onClick={onOpenEmergencyGuide}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Guía de Emergencias, Hospitales, Clínicas, Grúas y Auxilio 24/7 en Ciudad del Carmen"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0 animate-pulse" />
                <span className="hidden sm:inline">Urgencias 24/7</span>
                <span className="sm:hidden text-[11px]">24/7</span>
              </button>
            )}

            <a
              href="https://encarmen.org"
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir web oficial encarmen.org"
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            >
              <span>encarmen.org</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden items-center justify-between py-1.5 border-t border-stone-100 text-xs">
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 py-1.5 px-1 rounded-lg transition-colors min-h-[44px] ${
              activeTab === 'directory'
                ? 'text-amber-600 font-semibold bg-amber-50'
                : 'text-stone-600 active:bg-stone-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span className="text-[11px] sm:text-xs">Negocios</span>
          </button>

          <button
            onClick={() => setActiveTab('classifieds')}
            className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 py-1.5 px-1 rounded-lg transition-colors min-h-[44px] ${
              activeTab === 'classifieds'
                ? 'text-amber-600 font-semibold bg-amber-50'
                : 'text-stone-600 active:bg-stone-100'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span className="text-[11px] sm:text-xs">Avisos</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 py-1.5 px-1 rounded-lg transition-colors min-h-[44px] ${
              activeTab === 'categories'
                ? 'text-amber-600 font-semibold bg-amber-50'
                : 'text-stone-600 active:bg-stone-100'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="text-[11px] sm:text-xs">Categorías</span>
          </button>

          <button
            onClick={() => setActiveTab('zones')}
            className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 py-1.5 px-1 rounded-lg transition-colors min-h-[44px] ${
              activeTab === 'zones'
                ? 'text-amber-600 font-semibold bg-amber-50'
                : 'text-stone-600 active:bg-stone-100'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span className="text-[11px] sm:text-xs">Colonias</span>
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 py-1.5 px-1 rounded-lg transition-colors min-h-[44px] ${
              activeTab === 'favorites'
                ? 'text-amber-600 font-semibold bg-amber-50'
                : 'text-stone-600 active:bg-stone-100'
            }`}
          >
            <div className="relative flex items-center">
              <Bookmark className="w-4 h-4" />
              {favoritesCount > 0 && (
                <span className="absolute -top-1.5 -right-2 px-1 text-[9px] font-bold bg-amber-500 text-white rounded-full">
                  {favoritesCount}
                </span>
              )}
            </div>
            <span className="text-[11px] sm:text-xs">Guardados</span>
          </button>

          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 py-1.5 px-1 rounded-lg transition-colors min-h-[44px] ${
              activeTab === 'register'
                ? 'text-amber-600 font-semibold bg-amber-50'
                : 'text-amber-700 font-medium active:bg-amber-50'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-amber-600" />
            <span className="text-[11px] sm:text-xs">Subir</span>
          </button>
        </div>
      </div>
    </header>
  );
};
