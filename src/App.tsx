import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/Auth/LoginForm';
import { RegisterForm } from './components/Auth/RegisterForm';
import { Dashboard } from './components/Dashboard/Dashboard';
import { MapView } from './components/Map/MapView';
import { RoutesView } from './components/Routes/RoutesView';
import { EmergencyView } from './components/Emergency/EmergencyView';
import { AdminView } from './components/Admin/AdminView';
import { SettingsView } from './components/Settings/SettingsView';
import { BottomNav, NavView } from './components/BottomNav';
import { offlineDB } from './lib/db';
import { syncManager } from './lib/syncManager';

function AuthScreen() {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      {showRegister ? (
        <RegisterForm
          onSuccess={() => setShowRegister(false)}
          onSwitchToLogin={() => setShowRegister(false)}
        />
      ) : (
        <LoginForm
          onSuccess={() => {}}
          onSwitchToRegister={() => setShowRegister(true)}
        />
      )}
    </div>
  );
}

function MainApp() {
  const { user, loading, profile } = useAuth();
  const [activeView, setActiveView] = useState<NavView>('dashboard');
  const isAdmin = profile?.role === 'admin' || profile?.role === 'personnel';

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await offlineDB.init();
      console.log('IndexedDB initialized');

      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);

        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'SW_UPDATED') {
            if (confirm('New version available! Reload to update?')) {
              window.location.reload();
            }
          }
        });
      }

      syncManager.startAutoSync(30000);
    } catch (error) {
      console.error('App initialization error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading AGOS...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <div className="flex-1 overflow-hidden">
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'map' && <MapView />}
        {activeView === 'routes' && <RoutesView />}
        {activeView === 'emergency' && <EmergencyView />}
        {activeView === 'admin' && <AdminView />}
        {activeView === 'settings' && <SettingsView />}
      </div>
      <BottomNav
        activeView={activeView}
        onViewChange={setActiveView}
        isAdmin={isAdmin}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
