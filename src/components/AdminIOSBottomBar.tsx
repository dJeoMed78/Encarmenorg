import React from 'react';
import { Building2, Link2, Megaphone, LayoutGrid, LogOut } from 'lucide-react';
import { AdminDesktopTabId } from './AdminMacOSDesktop';

interface AdminIOSBottomBarProps {
  activeTab: AdminDesktopTabId;
  onSelectTab: (tab: AdminDesktopTabId) => void;
  pendingReportsCount: number;
  businessesCount: number;
  classifiedsCount: number;
  onLogout?: () => void;
}

export const AdminIOSBottomBar: React.FC<AdminIOSBottomBarProps> = ({
  activeTab,
  onSelectTab,
  businessesCount,
  onLogout
}) => {
  const dockItems: {
    id: AdminDesktopTabId;
    label: string;
    icon: React.ReactNode;
    gradient: string;
    badge?: number;
  }[] = [
    {
      id: 'start',
      label: 'Inicio iOS',
      icon: <LayoutGrid className="w-6 h-6 text-white" />,
      gradient: 'from-sky-400 to-blue-600'
    },
    {
      id: 'businesses',
      label: 'Catálogo',
      icon: <Building2 className="w-6 h-6 text-white" />,
      gradient: 'from-amber-400 to-orange-600',
      badge: businessesCount > 0 ? businessesCount : undefined
    },
    {
      id: 'links',
      label: 'Ligas',
      icon: <Link2 className="w-6 h-6 text-white" />,
      gradient: 'from-cyan-400 to-blue-600'
    },
    {
      id: 'publicidad',
      label: 'Publicidad',
      icon: <Megaphone className="w-6 h-6 text-white" />,
      gradient: 'from-pink-500 to-rose-600'
    }
  ];

  return (
    <div className="fixed bottom-3 inset-x-3 z-50 pointer-events-auto select-none">
      <div className="px-4 py-2.5 rounded-[30px] bg-white/20 backdrop-blur-3xl border border-white/30 shadow-[0_15px_40px_rgba(0,0,0,0.65)] flex items-center justify-around">
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
                className={`relative w-12 h-12 rounded-[16px] bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-md border border-white/35 ${
                  isActive ? 'ring-2 ring-white' : ''
                }`}
              >
                {item.icon}
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-black text-[9px] border border-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-white drop-shadow">{item.label}</span>
            </button>
          );
        })}

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform cursor-pointer"
          >
            <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-rose-500 to-red-700 flex items-center justify-center shadow-md border border-white/35">
              <LogOut className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] font-bold text-rose-200 drop-shadow">Cerrar</span>
          </button>
        )}
      </div>
    </div>
  );
};
