import { Map, Settings, Home, Shield, User } from 'lucide-react';

export type NavView = 'dashboard' | 'map' | 'admin' | 'settings';

interface BottomNavProps {
  activeView: NavView;
  onViewChange: (view: NavView) => void;
  isAdmin?: boolean;
}

export function BottomNav({ activeView, onViewChange, isAdmin = false }: BottomNavProps) {
  const navItems = [
    { id: 'dashboard' as NavView, icon: Home, label: 'Home' },
    { id: 'map' as NavView, icon: Map, label: 'Map' },
    ...(isAdmin ? [{ id: 'admin' as NavView, icon: Shield, label: 'Admin' }] : []),
    { id: 'settings' as NavView, icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          const isAdminTab = item.id === 'admin';

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative ${
                isActive
                  ? isAdminTab ? 'text-amber-600' : 'text-blue-600'
                  : isAdminTab ? 'text-amber-500' : 'text-slate-500'
              }`}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
                {isAdminTab && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full"></span>
                )}
              </div>
              <span className={`text-xs mt-1 font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full ${isAdminTab ? 'bg-amber-600' : 'bg-blue-600'}`} />
              )}
            </button>
          );
        })}
      </div>

      {isAdmin && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
          <Shield className="w-3 h-3" />
          ADMIN MODE
        </div>
      )}
    </nav>
  );
}
