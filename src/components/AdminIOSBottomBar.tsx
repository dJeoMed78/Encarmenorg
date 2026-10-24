import React from 'react';
import { FolderKanban, Link2, Megaphone, LogOut } from 'lucide-react';
import { AdminDesktopTabId } from './AdminMacOSDesktop';

interface AdminIOSBottomBarProps {
  activeTab: AdminDesktopTabId;
  onSelectTab: (tab: AdminDesktopTabId) => void;
  pendingReportsCount?: number;
  businessesCount?: number;
  classifiedsCount?: number;
  onLogout?: () => void;
  onClose?: () => void;
}

export const AdminIOSBottomBar: React.FC<AdminIOSBottomBarProps> = ({
  activeTab,
  onSelectTab,
  businessesCount = 0,
  onLogout,
  onClose
}) => {
  const handleExit = () => {
    if (onLogout) {
      onLogout();
    } else if (onClose) {
      onClose();
    }
  };

  const dockApps = [
    {
      id: 'businesses' as AdminDesktopTabId,
      label: 'Catálogo',
      icon: <FolderKanban className="w-6 h-6 text-white drop-shadow" />,
      gradient: 'from-orange-400 via-red-500 to-rose-600',
      badge: businessesCount > 0 ? businessesCount : 205
    },
    {
      id: 'links' as AdminDesktopTabId,
      label: 'Ligas',
      icon: <Link2 className="w-6 h-6 text-white drop-shadow" />,
      gradient: 'from-cyan-400 via-sky-500 to-blue-600'
    },
    {
      id: 'publicidad' as AdminDesktopTabId,
      label: 'Publicidad',
      icon: <Megaphone className="w-6 h-6 text-white drop-shadow" />,
      gradient: 'from-pink-500 via-rose-500 to-red-600'
    }
  ];

  return (
    <div className="fixed bottom-3 inset-x-3 sm:inset-x-6 z-50 pointer-events-auto select-none">
      <div className="px-4 py-2.5 rounded-[32px] bg-white/45 backdrop-blur-3xl border border-white/70 shadow-[0_16px_40px_rgba(0,0,0,0.35)] flex items-center justify-around max-w-sm mx-auto">
        {dockApps.map((app) => {
          const isActive = activeTab === app.id;
          return (
            <button
              key={app.id}
              type="button"
              onClick={() => onSelectTab(app.id)}
              className="flex flex-col items-center gap-1 active:scale-90 transition-transform cursor-pointer"
            >
              <div
                className={`relative w-12 h-12 rounded-[16px] bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-md border border-white/40 ${
                  isActive ? 'ring-3 ring-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.7)] scale-105' : ''
                }`}
              >
                {app.icon}
                {app.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-black text-[9px] border border-white shadow-xs">
                    {app.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold text-stone-900 drop-shadow-xs">{app.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={handleExit}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform cursor-pointer"
        >
          <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-rose-500 via-red-600 to-red-700 flex items-center justify-center shadow-md border border-white/40">
            <LogOut className="w-6 h-6 text-white drop-shadow" />
          </div>
          <span className="text-[10px] font-semibold text-rose-900 drop-shadow-xs">Cerrar</span>
        </button>
      </div>
    </div>
  );
};
