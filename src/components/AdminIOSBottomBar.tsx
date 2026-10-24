import React from 'react';
import { LayoutGrid, FolderKanban, Link2, Tv, LogOut } from 'lucide-react';

interface AdminIOSBottomBarProps {
  activeTab: string;
  onSelectTab: (tab: any) => void;
  pendingReportsCount?: number;
  businessesCount?: number;
  classifiedsCount?: number;
  onLogout?: () => void;
  onClose?: () => void;
}

export const AdminIOSBottomBar: React.FC<AdminIOSBottomBarProps> = ({
  activeTab,
  onSelectTab,
  onClose,
  onLogout
}) => {
  const dockItems = [
    {
      id: 'start',
      label: 'Inicio',
      icon: <LayoutGrid className="w-6 h-6 text-white drop-shadow" />,
      gradient: 'from-sky-400 via-blue-500 to-indigo-600'
    },
    {
      id: 'businesses',
      label: 'Catálogo',
      icon: <FolderKanban className="w-6 h-6 text-white drop-shadow" />,
      gradient: 'from-orange-400 via-red-500 to-rose-600'
    },
    {
      id: 'links',
      label: 'Ligas',
      icon: <Link2 className="w-6 h-6 text-white drop-shadow" />,
      gradient: 'from-emerald-400 via-teal-500 to-blue-600'
    },
    {
      id: 'publicidad',
      label: 'Publicidad',
      icon: <Tv className="w-6 h-6 text-white drop-shadow" />,
      gradient: 'from-indigo-400 via-purple-500 to-violet-700'
    }
  ];

  const handleClosePanel = () => {
    if (onClose) {
      onClose();
    } else if (onLogout) {
      onLogout();
    }
  };

  return (
    <div className="fixed bottom-3 inset-x-3 z-50 max-w-md mx-auto pointer-events-auto select-none">
      <div
        className="px-3 py-2 rounded-[28px] border border-white/45 shadow-[0_18px_45px_rgba(0,0,0,0.55)] flex items-center justify-around"
        style={{
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)'
        }}
      >
        {dockItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className="flex flex-col items-center gap-1 active:scale-90 transition-transform cursor-pointer"
            >
              <div
                className={`relative w-12 h-12 rounded-[16px] bg-gradient-to-b ${item.gradient} flex items-center justify-center shadow-lg border border-white/45 ${
                  isActive ? 'ring-2 ring-white scale-105' : ''
                }`}
              >
                <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-[16px] bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />
                {item.icon}
              </div>
              <span className="text-[10px] font-bold text-white drop-shadow">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Botón Salir para cerrar el Panel de Administración y volver al portal */}
        <button
          type="button"
          onClick={handleClosePanel}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform cursor-pointer"
        >
          <div className="relative w-12 h-12 rounded-[16px] bg-gradient-to-b from-red-500 via-rose-600 to-red-800 flex items-center justify-center shadow-lg border border-white/45">
            <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-[16px] bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />
            <LogOut className="w-6 h-6 text-white drop-shadow" />
          </div>
          <span className="text-[10px] font-bold text-rose-200 drop-shadow">
            Salir
          </span>
        </button>
      </div>
    </div>
  );
};
