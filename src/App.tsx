import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, UserProfile } from './lib/supabase';
import { getUserProfile } from './lib/auth';
import { LoginForm } from './components/Auth/LoginForm';
import { RegisterForm } from './components/Auth/RegisterForm';
import { Dashboard } from './components/Dashboard/Dashboard';
import { MapView } from './components/Map/MapView';
import { AdminView } from './components/Admin/AdminView';
import { SettingsView } from './components/Settings/SettingsView';
import { BottomNav, NavView } from './components/BottomNav';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (mounted) {
          if (session?.user) {
            setUser(session.user);
            getUserProfile(session.user.id).then(userProfile => {
              if (mounted) setProfile(userProfile);
            }).catch(console.error);
          }
          setLoading(false);
          setInitialized(true);
        }
      } catch (error) {
        console.error('Auth init error:', error);
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setUser(session?.user ?? null);

      if (session?.user) {
        getUserProfile(session.user.id).then(userProfile => {
          if (mounted) setProfile(userProfile);
        }).catch(console.error);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  const refreshProfile = async () => {
    if (user) {
      try {
        const userProfile = await getUserProfile(user.id);
        setProfile(userProfile);
      } catch (error) {
        console.error('Error refreshing profile:', error);
      }
    }
  };

  if (!initialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent mx-auto mb-3"></div>
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut: handleSignOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

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
  const { user, profile } = useAuth();
  const [activeView, setActiveView] = useState<NavView>('dashboard');
  const isAdmin = profile?.new_role === 'admin';

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <div className="flex-1 overflow-hidden">
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'map' && <MapView />}
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

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
