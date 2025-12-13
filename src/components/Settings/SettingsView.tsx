import { useState, useEffect } from 'react';
import { User, MapPin, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserProfile } from '../../lib/auth';

export function SettingsView() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [locationPermission, setLocationPermission] = useState(profile?.location_permission_granted || false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(profile?.notification_enabled || false);

  useEffect(() => {
    setLocationPermission(profile?.location_permission_granted || false);
    setNotificationsEnabled(profile?.notification_enabled || false);
  }, [profile]);

  const handleLocationToggle = async () => {
    if (!user) return;

    try {
      const newValue = !locationPermission;
      await updateUserProfile(user.id, { location_permission_granted: newValue });
      setLocationPermission(newValue);
      await refreshProfile();
    } catch (error) {
      console.error('Error updating location permission:', error);
      alert('Failed to update location setting');
    }
  };

  const handleNotificationsToggle = async () => {
    if (!user) return;

    try {
      const newValue = !notificationsEnabled;
      await updateUserProfile(user.id, { notification_enabled: newValue });
      setNotificationsEnabled(newValue);
      await refreshProfile();
    } catch (error) {
      console.error('Error updating notifications:', error);
      alert('Failed to update notification setting');
    }
  };

  return (
    <div className="pb-16 overflow-y-auto h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-4">
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
      </div>

      <div className="p-4 space-y-4">
        {profile && (
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-50 rounded-full">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">{profile.full_name}</h2>
                <p className="text-sm text-slate-600 capitalize">{profile.new_role}</p>
              </div>
            </div>
            <div className="text-sm text-slate-600">
              <p>Email: {user?.email}</p>
              {profile.phone_number && <p className="mt-1">Phone: {profile.phone_number}</p>}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-200">
          <div className="p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Preferences</h3>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-slate-600" />
                <div>
                  <p className="font-medium text-slate-900">Location Features</p>
                  <p className="text-sm text-slate-600">Enable map location features</p>
                </div>
              </div>
              <button
                onClick={handleLocationToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  locationPermission ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    locationPermission ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-slate-600" />
                <div>
                  <p className="font-medium text-slate-900">Notifications</p>
                  <p className="text-sm text-slate-600">Enable alert notifications</p>
                </div>
              </div>
              <button
                onClick={handleNotificationsToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationsEnabled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={signOut}
          className="w-full py-3 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>

        <div className="text-center text-sm text-slate-500 pt-4">
          <p>AGOS v1.0.0</p>
          <p className="mt-1">Tuguegarao City, Cagayan</p>
        </div>
      </div>
    </div>
  );
}
