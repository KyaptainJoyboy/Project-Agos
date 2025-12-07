import { Map, Navigation, Settings, Home, Phone, Shield } from 'lucide-react';

export type NavView = 'dashboard' | 'map' | 'routes' | 'emergency' | 'admin' | 'settings';

interface BottomNavProps {
  activeView: NavView;
  onViewChange: (view: NavView) => void;
  isAdmin?: boolean;
}

export function BottomNav({ activeView, onViewChange, isAdmin = false }: BottomNavProps) {
  const navItems = [
    { id: 'dashboard' as NavView, icon: Home, label: 'Home' },
    { id: 'map' as NavView, icon: Map, label: 'Map' },
    { id: 'routes' as NavView, icon: Navigation, label: 'Routes' },
    { id: 'emergency' as NavView, icon: Phone, label: 'SOS' },
    ...(isAdmin ? [{ id: 'admin' as NavView, icon: Shield, label: 'Admin' }] : []),
    { id: 'settings' as NavView, icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 safe-area-bottom z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative ${
                isActive ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-xs mt-1 font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-b-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
