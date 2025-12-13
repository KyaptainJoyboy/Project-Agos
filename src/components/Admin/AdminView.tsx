import { useState, useEffect } from 'react';
import {
  Settings,
  AlertTriangle,
  MapPin,
  Cloud,
  Bell,
  Users,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Activity
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, FloodMarker, AdminAlert, WeatherCondition } from '../../lib/supabase';

type AdminTab = 'overview' | 'floods' | 'alerts' | 'weather';

export function AdminView() {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [floodMarkers, setFloodMarkers] = useState<FloodMarker[]>([]);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [weather, setWeather] = useState<WeatherCondition | null>(null);
  const [stats, setStats] = useState({ users: 0, centers: 0, activeFloodMarkers: 0, activeAlerts: 0 });
  const [loading, setLoading] = useState(true);

  const [showFloodForm, setShowFloodForm] = useState(false);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [editingFlood, setEditingFlood] = useState<FloodMarker | null>(null);

  const isAdmin = profile?.new_role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadFloodMarkers(),
        loadAlerts(),
        loadWeather(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFloodMarkers = async () => {
    const { data, error } = await supabase
      .from('flood_markers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading flood markers:', error);
      return;
    }

    setFloodMarkers((data || []).map((marker: any) => ({
      ...marker,
      location: {
        lat: marker.location.coordinates[1],
        lng: marker.location.coordinates[0]
      }
    })));
  };

  const loadAlerts = async () => {
    const { data, error } = await supabase
      .from('admin_alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading alerts:', error);
      return;
    }

    setAlerts((data || []).map((alert: any) => ({
      ...alert,
      location: alert.location ? {
        lat: alert.location.coordinates[1],
        lng: alert.location.coordinates[0]
      } : undefined
    })));
  };

  const loadWeather = async () => {
    const { data, error } = await supabase
      .from('weather_conditions')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error loading weather:', error);
      return;
    }

    setWeather(data);
  };

  const loadStats = async () => {
    const [usersResult, centersResult] = await Promise.all([
      supabase.from('users_profile').select('id', { count: 'exact', head: true }),
      supabase.from('evacuation_centers').select('id', { count: 'exact', head: true })
    ]);

    setStats({
      users: usersResult.count || 0,
      centers: centersResult.count || 0,
      activeFloodMarkers: floodMarkers.filter(f => f.is_active).length,
      activeAlerts: alerts.filter(a => a.is_active).length
    });
  };

  const handleSaveFloodMarker = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const markerData = {
      name: formData.get('name') as string,
      location: `POINT(${formData.get('lng')} ${formData.get('lat')})`,
      severity: parseInt(formData.get('severity') as string),
      radius_meters: parseFloat(formData.get('radius') as string),
      is_active: formData.get('is_active') === 'true',
      description: formData.get('description') as string,
      created_by: user?.id
    };

    if (editingFlood) {
      const { error } = await supabase
        .from('flood_markers')
        .update(markerData)
        .eq('id', editingFlood.id);

      if (error) {
        alert('Error updating flood marker: ' + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from('flood_markers')
        .insert([markerData]);

      if (error) {
        alert('Error creating flood marker: ' + error.message);
        return;
      }
    }

    setShowFloodForm(false);
    setEditingFlood(null);
    loadFloodMarkers();
  };

  const handleDeleteFloodMarker = async (id: string) => {
    if (!confirm('Delete this flood marker?')) return;

    const { error } = await supabase
      .from('flood_markers')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting flood marker: ' + error.message);
      return;
    }

    loadFloodMarkers();
  };

  const handleToggleFloodMarker = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from('flood_markers')
      .update({ is_active: !currentState })
      .eq('id', id);

    if (error) {
      alert('Error toggling flood marker: ' + error.message);
      return;
    }

    loadFloodMarkers();
  };

  const handleSaveAlert = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const hasLocation = formData.get('has_location') === 'true';

    const alertData: any = {
      title: formData.get('title') as string,
      message: formData.get('message') as string,
      alert_type: formData.get('alert_type') as string,
      severity: formData.get('severity') as string,
      is_active: formData.get('is_active') === 'true',
      created_by: user?.id
    };

    if (hasLocation) {
      alertData.location_name = formData.get('location_name') as string;
      alertData.location = `POINT(${formData.get('lng')} ${formData.get('lat')})`;
    }

    const { error } = await supabase
      .from('admin_alerts')
      .insert([alertData]);

    if (error) {
      alert('Error creating alert: ' + error.message);
      return;
    }

    setShowAlertForm(false);
    loadAlerts();
  };

  const handleDeleteAlert = async (id: string) => {
    if (!confirm('Delete this alert?')) return;

    const { error } = await supabase
      .from('admin_alerts')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting alert: ' + error.message);
      return;
    }

    loadAlerts();
  };

  const handleToggleAlert = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from('admin_alerts')
      .update({ is_active: !currentState })
      .eq('id', id);

    if (error) {
      alert('Error toggling alert: ' + error.message);
      return;
    }

    loadAlerts();
  };

  const handleUpdateWeather = async (condition: string) => {
    if (weather) {
      const { error } = await supabase
        .from('weather_conditions')
        .update({ is_active: false })
        .eq('id', weather.id);

      if (error) console.error('Error deactivating old weather:', error);
    }

    const floodRiskMap: { [key: string]: number } = {
      'normal': 1,
      'light_rain': 2,
      'heavy_rain': 3,
      'storm': 4,
      'typhoon': 5
    };

    const { error } = await supabase
      .from('weather_conditions')
      .insert([{
        condition_type: condition,
        flood_risk_level: floodRiskMap[condition] || 1,
        is_active: true,
        updated_by: user?.id
      }]);

    if (error) {
      alert('Error updating weather: ' + error.message);
      return;
    }

    loadWeather();
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-600">Admin control panel is only accessible to administrators.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-16 overflow-y-auto bg-slate-50">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white/10 rounded-full">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Control Panel</h1>
            <p className="text-slate-300 text-sm">Manage AGOS System</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 p-4 overflow-x-auto bg-white border-b border-slate-200">
        {[
          { id: 'overview' as AdminTab, label: 'Overview', icon: Activity },
          { id: 'floods' as AdminTab, label: 'Flood Markers', icon: MapPin },
          { id: 'alerts' as AdminTab, label: 'Alerts', icon: Bell },
          { id: 'weather' as AdminTab, label: 'Weather', icon: Cloud }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <Users className="w-8 h-8 text-blue-600 mb-2" />
                <div className="text-2xl font-bold text-slate-900">{stats.users}</div>
                <div className="text-sm text-slate-600">Total Users</div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <MapPin className="w-8 h-8 text-green-600 mb-2" />
                <div className="text-2xl font-bold text-slate-900">{stats.centers}</div>
                <div className="text-sm text-slate-600">Evacuation Centers</div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <AlertTriangle className="w-8 h-8 text-orange-600 mb-2" />
                <div className="text-2xl font-bold text-slate-900">{stats.activeFloodMarkers}</div>
                <div className="text-sm text-slate-600">Active Flood Markers</div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <Bell className="w-8 h-8 text-red-600 mb-2" />
                <div className="text-2xl font-bold text-slate-900">{stats.activeAlerts}</div>
                <div className="text-sm text-slate-600">Active Alerts</div>
              </div>
            </div>

            {weather && (
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-blue-600" />
                  Current Weather
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold capitalize">{weather.condition_type.replace('_', ' ')}</p>
                    <p className="text-sm text-slate-600">Flood Risk Level: {weather.flood_risk_level}/5</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'floods' && (
          <div className="space-y-4">
            <button
              onClick={() => {
                setEditingFlood(null);
                setShowFloodForm(true);
              }}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Add Flood Marker
            </button>

            {floodMarkers.map(marker => (
              <div key={marker.id} className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-slate-900">{marker.name}</h3>
                    <p className="text-sm text-slate-600 mt-1">{marker.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    marker.is_active ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {marker.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-slate-600">Severity:</span>
                    <span className="ml-2 font-semibold">{marker.severity}/5</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Radius:</span>
                    <span className="ml-2 font-semibold">{marker.radius_meters}m</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleFloodMarker(marker.id, marker.is_active)}
                    className={`flex-1 py-2 rounded-lg font-medium ${
                      marker.is_active
                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {marker.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingFlood(marker);
                      setShowFloodForm(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFloodMarker(marker.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {floodMarkers.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No flood markers created yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <button
              onClick={() => setShowAlertForm(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Create Alert
            </button>

            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`rounded-lg p-4 border-2 ${
                  alert.severity === 'critical'
                    ? 'bg-red-50 border-red-500'
                    : alert.severity === 'high'
                    ? 'bg-orange-50 border-orange-500'
                    : alert.severity === 'medium'
                    ? 'bg-amber-50 border-amber-500'
                    : 'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                        alert.severity === 'critical'
                          ? 'bg-red-600 text-white'
                          : alert.severity === 'high'
                          ? 'bg-orange-600 text-white'
                          : alert.severity === 'medium'
                          ? 'bg-amber-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}>
                        {alert.severity}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        alert.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {alert.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900">{alert.title}</h3>
                    <p className="text-sm text-slate-700 mt-1">{alert.message}</p>
                    {alert.location_name && (
                      <p className="text-xs text-slate-600 mt-1">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {alert.location_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleToggleAlert(alert.id, alert.is_active)}
                    className={`flex-1 py-2 rounded-lg font-medium ${
                      alert.is_active
                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {alert.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {alerts.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No alerts created yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'weather' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-4">Set Weather Condition</h3>
              <div className="space-y-2">
                {[
                  { value: 'normal', label: 'Normal', risk: 1, color: 'green' },
                  { value: 'light_rain', label: 'Light Rain', risk: 2, color: 'blue' },
                  { value: 'heavy_rain', label: 'Heavy Rain', risk: 3, color: 'amber' },
                  { value: 'storm', label: 'Storm', risk: 4, color: 'orange' },
                  { value: 'typhoon', label: 'Typhoon', risk: 5, color: 'red' }
                ].map(condition => (
                  <button
                    key={condition.value}
                    onClick={() => handleUpdateWeather(condition.value)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      weather?.condition_type === condition.value
                        ? `border-${condition.color}-500 bg-${condition.color}-50`
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{condition.label}</div>
                        <div className="text-sm text-slate-600">Flood Risk Level: {condition.risk}/5</div>
                      </div>
                      {weather?.condition_type === condition.value && (
                        <span className="px-2 py-1 bg-slate-900 text-white text-xs font-medium rounded-full">
                          ACTIVE
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showFloodForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-lg">
                {editingFlood ? 'Edit Flood Marker' : 'New Flood Marker'}
              </h3>
              <button
                onClick={() => {
                  setShowFloodForm(false);
                  setEditingFlood(null);
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFloodMarker} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingFlood?.name}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  name="description"
                  defaultValue={editingFlood?.description}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    name="lat"
                    step="0.000001"
                    defaultValue={editingFlood?.location.lat || 17.6132}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    name="lng"
                    step="0.000001"
                    defaultValue={editingFlood?.location.lng || 121.7270}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Severity (1-5)</label>
                  <input
                    type="number"
                    name="severity"
                    min="1"
                    max="5"
                    defaultValue={editingFlood?.severity || 3}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Radius (meters)</label>
                  <input
                    type="number"
                    name="radius"
                    step="10"
                    defaultValue={editingFlood?.radius_meters || 100}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    value="true"
                    defaultChecked={editingFlood?.is_active ?? true}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Active (affects routing)</span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowFloodForm(false);
                    setEditingFlood(null);
                  }}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAlertForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-lg">Create New Alert</h3>
              <button
                onClick={() => setShowAlertForm(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAlert} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="e.g., Flash Flood Warning"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  name="message"
                  required
                  rows={3}
                  placeholder="Detailed alert message..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    name="alert_type"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="flood">Flood</option>
                    <option value="weather">Weather</option>
                    <option value="evacuation">Evacuation</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
                  <select
                    name="severity"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    name="has_location"
                    value="true"
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Add Location</span>
                </label>
              </div>

              <div id="location-fields" className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location Name</label>
                  <input
                    type="text"
                    name="location_name"
                    placeholder="e.g., Downtown Area"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
                    <input
                      type="number"
                      name="lat"
                      step="0.000001"
                      defaultValue={17.6132}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
                    <input
                      type="number"
                      name="lng"
                      step="0.000001"
                      defaultValue={121.7270}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    value="true"
                    defaultChecked
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Active (visible to users)</span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Create Alert
                </button>
                <button
                  type="button"
                  onClick={() => setShowAlertForm(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
