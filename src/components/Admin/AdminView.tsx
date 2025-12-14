import { useState, useEffect, useRef } from 'react';
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
  Activity,
  Home,
  RefreshCw,
  Map
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../App';
import { supabase, FloodMarker, AdminAlert, WeatherCondition } from '../../lib/supabase';
import {
  Modal,
  Input,
  Textarea,
  Select,
  Checkbox,
  FormButtons,
  StatCard,
  QuickAction,
  StatusBadge
} from './AdminComponents';

type AdminTab = 'overview' | 'centers' | 'floods' | 'alerts' | 'weather';

interface EvacuationCenter {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  capacity_max: number;
  capacity_current: number;
  status: string;
  contact_person?: string;
  contact_number?: string;
}

const TUGUEGARAO_CENTER: [number, number] = [17.6132, 121.7270];

const TABS = [
  { id: 'overview' as const, label: 'Overview', icon: Activity },
  { id: 'centers' as const, label: 'Centers', icon: Home },
  { id: 'floods' as const, label: 'Floods', icon: MapPin },
  { id: 'alerts' as const, label: 'Alerts', icon: Bell },
  { id: 'weather' as const, label: 'Weather', icon: Cloud }
];

const SEVERITY_OPTIONS = [
  { value: '1', label: '1 - Minor' },
  { value: '2', label: '2 - Low' },
  { value: '3', label: '3 - Moderate' },
  { value: '4', label: '4 - High' },
  { value: '5', label: '5 - Critical' }
];

const STATUS_OPTIONS = [
  { value: 'operational', label: 'Operational' },
  { value: 'full', label: 'Full' },
  { value: 'closed', label: 'Closed' },
  { value: 'emergency', label: 'Emergency' }
];

const ALERT_TYPE_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'flood', label: 'Flood' },
  { value: 'weather', label: 'Weather' },
  { value: 'evacuation', label: 'Evacuation' },
  { value: 'emergency', label: 'Emergency' }
];

const ALERT_SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
];

const WEATHER_CONDITIONS = [
  { value: 'normal', label: 'Normal', risk: 1, desc: 'Clear skies' },
  { value: 'light_rain', label: 'Light Rain', risk: 2, desc: 'Minor rainfall' },
  { value: 'heavy_rain', label: 'Heavy Rain', risk: 3, desc: 'Significant rainfall' },
  { value: 'storm', label: 'Storm', risk: 4, desc: 'Severe weather' },
  { value: 'typhoon', label: 'Typhoon', risk: 5, desc: 'Extreme conditions' }
];

export function AdminView() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [floodMarkers, setFloodMarkers] = useState<FloodMarker[]>([]);
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [weather, setWeather] = useState<WeatherCondition | null>(null);
  const [stats, setStats] = useState({ users: 0, centers: 0, activeFloodMarkers: 0, activeAlerts: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showFloodForm, setShowFloodForm] = useState(false);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [showCenterForm, setShowCenterForm] = useState(false);
  const [editingFlood, setEditingFlood] = useState<FloodMarker | null>(null);
  const [editingCenter, setEditingCenter] = useState<EvacuationCenter | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();

      const centersChannel = supabase
        .channel('admin_centers_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'evacuation_centers' }, () => {
          loadCenters();
          loadStats();
        })
        .subscribe();

      const floodsChannel = supabase
        .channel('admin_floods_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'flood_markers' }, () => {
          loadFloodMarkers();
          loadStats();
        })
        .subscribe();

      const alertsChannel = supabase
        .channel('admin_alerts_changes_panel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_alerts' }, () => {
          loadAlerts();
          loadStats();
        })
        .subscribe();

      const weatherChannel = supabase
        .channel('admin_weather_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'weather_conditions' }, () => {
          loadWeather();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(centersChannel);
        supabase.removeChannel(floodsChannel);
        supabase.removeChannel(alertsChannel);
        supabase.removeChannel(weatherChannel);
      };
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if ((showFloodForm || showCenterForm) && mapContainerRef.current && !mapRef.current) {
      setTimeout(() => initMap(), 100);
    }

    return () => {
      if (!showFloodForm && !showCenterForm && mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [showFloodForm, showCenterForm]);

  const initMap = () => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialLat = editingFlood?.location.lat || editingCenter?.location.lat || TUGUEGARAO_CENTER[0];
    const initialLng = editingFlood?.location.lng || editingCenter?.location.lng || TUGUEGARAO_CENTER[1];

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '',
      maxZoom: 19,
    }).addTo(map);

    if (editingFlood || editingCenter) {
      const loc = editingFlood?.location || editingCenter?.location;
      if (loc) {
        markerRef.current = L.marker([loc.lat, loc.lng], { draggable: true }).addTo(map);
        markerRef.current.on('dragend', () => {
          const pos = markerRef.current?.getLatLng();
          if (pos) setSelectedLocation({ lat: pos.lat, lng: pos.lng });
        });
        setSelectedLocation({ lat: loc.lat, lng: loc.lng });
      }
    }

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      setSelectedLocation({ lat, lng });

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current.on('dragend', () => {
          const pos = markerRef.current?.getLatLng();
          if (pos) setSelectedLocation({ lat: pos.lat, lng: pos.lng });
        });
      }
    });

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadFloodMarkers(),
        loadCenters(),
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAdminData();
    setRefreshing(false);
  };

  const loadFloodMarkers = async () => {
    const { data, error } = await supabase
      .from('flood_markers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return;

    setFloodMarkers((data || []).map((marker: any) => ({
      ...marker,
      location: {
        lat: marker.location.coordinates[1],
        lng: marker.location.coordinates[0]
      }
    })));
  };

  const loadCenters = async () => {
    const { data, error } = await supabase
      .from('evacuation_centers')
      .select('*')
      .order('name');

    if (error) return;

    setCenters((data || []).map((center: any) => ({
      ...center,
      location: {
        lat: center.location.coordinates[1],
        lng: center.location.coordinates[0]
      }
    })));
  };

  const loadAlerts = async () => {
    const { data, error } = await supabase
      .from('admin_alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return;

    setAlerts((data || []).map((alert: any) => ({
      ...alert,
      location: alert.location ? {
        lat: alert.location.coordinates[1],
        lng: alert.location.coordinates[0]
      } : undefined
    })));
  };

  const loadWeather = async () => {
    const { data } = await supabase
      .from('weather_conditions')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    setWeather(data);
  };

  const loadStats = async () => {
    const [usersResult, centersResult, floodsResult, alertsResult] = await Promise.all([
      supabase.from('users_profile').select('id', { count: 'exact', head: true }),
      supabase.from('evacuation_centers').select('id', { count: 'exact', head: true }),
      supabase.from('flood_markers').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('admin_alerts').select('id', { count: 'exact', head: true }).eq('is_active', true)
    ]);

    setStats({
      users: usersResult.count || 0,
      centers: centersResult.count || 0,
      activeFloodMarkers: floodsResult.count || 0,
      activeAlerts: alertsResult.count || 0
    });
  };

  const handleSaveFloodMarker = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const lat = selectedLocation?.lat || parseFloat(formData.get('lat') as string);
    const lng = selectedLocation?.lng || parseFloat(formData.get('lng') as string);

    const markerData = {
      name: formData.get('name') as string,
      location: `POINT(${lng} ${lat})`,
      severity: parseInt(formData.get('severity') as string),
      radius_meters: parseFloat(formData.get('radius') as string),
      is_active: formData.get('is_active') === 'on',
      description: formData.get('description') as string,
      created_by: user?.id
    };

    if (editingFlood) {
      const { error } = await supabase.from('flood_markers').update(markerData).eq('id', editingFlood.id);
      if (error) { alert('Error: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('flood_markers').insert([markerData]);
      if (error) { alert('Error: ' + error.message); return; }
    }

    closeFloodForm();
    loadFloodMarkers();
    loadStats();
  };

  const handleSaveCenter = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const lat = selectedLocation?.lat || parseFloat(formData.get('lat') as string);
    const lng = selectedLocation?.lng || parseFloat(formData.get('lng') as string);

    const centerData = {
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      location: `POINT(${lng} ${lat})`,
      capacity_max: parseInt(formData.get('capacity_max') as string),
      capacity_current: parseInt(formData.get('capacity_current') as string) || 0,
      status: formData.get('status') as string,
      contact_person: formData.get('contact_person') as string || null,
      contact_number: formData.get('contact_number') as string || null
    };

    if (editingCenter) {
      const { error } = await supabase.from('evacuation_centers').update(centerData).eq('id', editingCenter.id);
      if (error) { alert('Error: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('evacuation_centers').insert([centerData]);
      if (error) { alert('Error: ' + error.message); return; }
    }

    closeCenterForm();
    loadCenters();
    loadStats();
  };

  const handleDeleteFloodMarker = async (id: string) => {
    if (!confirm('Delete this flood zone?')) return;
    await supabase.from('flood_markers').delete().eq('id', id);
    loadFloodMarkers();
    loadStats();
  };

  const handleDeleteCenter = async (id: string) => {
    if (!confirm('Delete this evacuation center?')) return;
    await supabase.from('evacuation_centers').delete().eq('id', id);
    loadCenters();
    loadStats();
  };

  const handleToggleFloodMarker = async (id: string, currentState: boolean) => {
    await supabase.from('flood_markers').update({ is_active: !currentState }).eq('id', id);
    loadFloodMarkers();
    loadStats();
  };

  const handleSaveAlert = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const alertData: any = {
      title: formData.get('title') as string,
      message: formData.get('message') as string,
      alert_type: formData.get('alert_type') as string,
      severity: formData.get('severity') as string,
      is_active: true,
      created_by: user?.id
    };

    const locationName = formData.get('location_name') as string;
    if (locationName) alertData.location_name = locationName;

    const { error } = await supabase.from('admin_alerts').insert([alertData]);
    if (error) { alert('Error: ' + error.message); return; }

    setShowAlertForm(false);
    loadAlerts();
    loadStats();
  };

  const handleDeleteAlert = async (id: string) => {
    if (!confirm('Delete this alert?')) return;
    await supabase.from('admin_alerts').delete().eq('id', id);
    loadAlerts();
    loadStats();
  };

  const handleToggleAlert = async (id: string, currentState: boolean) => {
    await supabase.from('admin_alerts').update({ is_active: !currentState }).eq('id', id);
    loadAlerts();
    loadStats();
  };

  const handleUpdateWeather = async (condition: string) => {
    if (weather) {
      await supabase.from('weather_conditions').update({ is_active: false }).eq('id', weather.id);
    }

    const floodRiskMap: Record<string, number> = {
      'normal': 1, 'light_rain': 2, 'heavy_rain': 3, 'storm': 4, 'typhoon': 5
    };

    await supabase.from('weather_conditions').insert([{
      condition_type: condition,
      flood_risk_level: floodRiskMap[condition] || 1,
      is_active: true,
      updated_by: user?.id
    }]);

    loadWeather();
  };

  const closeFloodForm = () => {
    setShowFloodForm(false);
    setEditingFlood(null);
    setSelectedLocation(null);
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    markerRef.current = null;
  };

  const closeCenterForm = () => {
    setShowCenterForm(false);
    setEditingCenter(null);
    setSelectedLocation(null);
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    markerRef.current = null;
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-600">Admin panel is only accessible to administrators.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-16 overflow-hidden bg-slate-50">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-full">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Admin Panel</h1>
              <p className="text-slate-400 text-xs">Manage AGOS System</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 bg-white/10 rounded-lg hover:bg-white/20 active:bg-white/30"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 p-2 overflow-x-auto bg-white border-b border-slate-200 flex-shrink-0">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg font-medium whitespace-nowrap text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 active:bg-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden xs:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Users} value={stats.users} label="Total Users" color="blue" />
              <StatCard icon={Home} value={stats.centers} label="Centers" color="green" />
              <StatCard icon={AlertTriangle} value={stats.activeFloodMarkers} label="Flood Zones" color="orange" />
              <StatCard icon={Bell} value={stats.activeAlerts} label="Alerts" color="red" />
            </div>

            {weather && (
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Cloud className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Current Weather</p>
                      <p className="font-semibold capitalize">{weather.condition_type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                    weather.flood_risk_level >= 4 ? 'bg-red-100 text-red-700' :
                    weather.flood_risk_level >= 3 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                  }`}>
                    Risk: {weather.flood_risk_level}/5
                  </span>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <QuickAction icon={MapPin} label="Add Flood Zone" color="orange" onClick={() => { setActiveTab('floods'); setShowFloodForm(true); }} />
                <QuickAction icon={Home} label="Add Center" color="green" onClick={() => { setActiveTab('centers'); setShowCenterForm(true); }} />
                <QuickAction icon={Bell} label="New Alert" color="red" onClick={() => { setActiveTab('alerts'); setShowAlertForm(true); }} />
                <QuickAction icon={Cloud} label="Set Weather" color="blue" onClick={() => setActiveTab('weather')} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'centers' && (
          <div className="space-y-3">
            <button
              onClick={() => setShowCenterForm(true)}
              className="w-full bg-green-600 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 active:bg-green-700"
            >
              <Plus className="w-5 h-5" />
              Add Evacuation Center
            </button>

            {centers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Home className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No evacuation centers yet</p>
              </div>
            ) : (
              centers.map(center => (
                <div key={center.id} className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 truncate">{center.name}</h3>
                      <p className="text-sm text-slate-500 truncate">{center.address}</p>
                    </div>
                    <StatusBadge status={center.status} />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                    <span>Capacity: {center.capacity_current}/{center.capacity_max}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingCenter(center); setShowCenterForm(true); }}
                      className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 active:bg-blue-700"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCenter(center.id)}
                      className="px-4 py-2.5 bg-red-600 text-white rounded-lg active:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'floods' && (
          <div className="space-y-3">
            <button
              onClick={() => setShowFloodForm(true)}
              className="w-full bg-orange-600 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 active:bg-orange-700"
            >
              <Plus className="w-5 h-5" />
              Add Flood Zone
            </button>

            {floodMarkers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <MapPin className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No flood zones marked</p>
              </div>
            ) : (
              floodMarkers.map(marker => (
                <div key={marker.id} className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 truncate">{marker.name}</h3>
                      <p className="text-sm text-slate-500 line-clamp-1">{marker.description}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      marker.is_active ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {marker.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                    <span>Severity: {marker.severity}/5</span>
                    <span>Radius: {marker.radius_meters}m</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleFloodMarker(marker.id, marker.is_active)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${
                        marker.is_active
                          ? 'bg-slate-100 text-slate-700 active:bg-slate-200'
                          : 'bg-green-600 text-white active:bg-green-700'
                      }`}
                    >
                      {marker.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => { setEditingFlood(marker); setShowFloodForm(true); }}
                      className="px-4 py-2.5 bg-blue-600 text-white rounded-lg active:bg-blue-700"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFloodMarker(marker.id)}
                      className="px-4 py-2.5 bg-red-600 text-white rounded-lg active:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-3">
            <button
              onClick={() => setShowAlertForm(true)}
              className="w-full bg-red-600 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 active:bg-red-700"
            >
              <Plus className="w-5 h-5" />
              Create Alert
            </button>

            {alerts.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No alerts created</p>
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className={`rounded-xl p-4 border-2 ${
                  alert.severity === 'critical' ? 'bg-red-50 border-red-300' :
                  alert.severity === 'high' ? 'bg-orange-50 border-orange-300' :
                  alert.severity === 'medium' ? 'bg-amber-50 border-amber-300' : 'bg-blue-50 border-blue-300'
                }`}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase text-white ${
                      alert.severity === 'critical' ? 'bg-red-600' :
                      alert.severity === 'high' ? 'bg-orange-600' :
                      alert.severity === 'medium' ? 'bg-amber-600' : 'bg-blue-600'
                    }`}>{alert.severity}</span>
                    <span className="text-xs text-slate-600 uppercase">{alert.alert_type}</span>
                    <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${
                      alert.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {alert.is_active ? 'Live' : 'Off'}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900">{alert.title}</h3>
                  <p className="text-sm text-slate-700 mt-1 line-clamp-2">{alert.message}</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleToggleAlert(alert.id, alert.is_active)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${
                        alert.is_active
                          ? 'bg-slate-200 text-slate-700 active:bg-slate-300'
                          : 'bg-green-600 text-white active:bg-green-700'
                      }`}
                    >
                      {alert.is_active ? 'Turn Off' : 'Turn On'}
                    </button>
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="px-4 py-2.5 bg-red-600 text-white rounded-lg active:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'weather' && (
          <div className="space-y-2">
            <p className="text-sm text-slate-500 mb-3">Select current weather condition:</p>
            {WEATHER_CONDITIONS.map(c => (
              <button
                key={c.value}
                onClick={() => handleUpdateWeather(c.value)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
                  weather?.condition_type === c.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white active:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{c.label}</div>
                    <div className="text-sm text-slate-600">{c.desc}</div>
                    <div className="text-xs text-slate-500 mt-1">Flood Risk: {c.risk}/5</div>
                  </div>
                  {weather?.condition_type === c.value && (
                    <span className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg">ACTIVE</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showFloodForm && (
        <Modal title={editingFlood ? 'Edit Flood Zone' : 'Add Flood Zone'} onClose={closeFloodForm}>
          <form onSubmit={handleSaveFloodMarker} className="space-y-4">
            <Input label="Zone Name" name="name" defaultValue={editingFlood?.name} required placeholder="e.g., Downtown Flood Zone" />
            <Textarea label="Description" name="description" defaultValue={editingFlood?.description} placeholder="Describe the flood zone..." />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Map className="w-4 h-4 inline mr-1.5" />
                Location (tap map to set)
              </label>
              <div ref={mapContainerRef} className="w-full h-48 rounded-lg border border-slate-300 overflow-hidden" />
              {selectedLocation && (
                <p className="text-xs text-slate-500 mt-1.5">
                  {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
                </p>
              )}
              <input type="hidden" name="lat" value={selectedLocation?.lat || editingFlood?.location.lat || TUGUEGARAO_CENTER[0]} />
              <input type="hidden" name="lng" value={selectedLocation?.lng || editingFlood?.location.lng || TUGUEGARAO_CENTER[1]} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Severity" name="severity" defaultValue={editingFlood?.severity || 3} options={SEVERITY_OPTIONS} />
              <Input label="Radius (m)" name="radius" type="number" defaultValue={editingFlood?.radius_meters || 100} required />
            </div>
            <Checkbox label="Active (visible on map & affects routing)" name="is_active" defaultChecked={editingFlood?.is_active ?? true} />
            <FormButtons onCancel={closeFloodForm} color="orange" />
          </form>
        </Modal>
      )}

      {showCenterForm && (
        <Modal title={editingCenter ? 'Edit Evacuation Center' : 'Add Evacuation Center'} onClose={closeCenterForm}>
          <form onSubmit={handleSaveCenter} className="space-y-4">
            <Input label="Center Name" name="name" defaultValue={editingCenter?.name} required placeholder="e.g., City Gymnasium" />
            <Input label="Address" name="address" defaultValue={editingCenter?.address} required placeholder="Full address" />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Map className="w-4 h-4 inline mr-1.5" />
                Location (tap map to set)
              </label>
              <div ref={mapContainerRef} className="w-full h-48 rounded-lg border border-slate-300 overflow-hidden" />
              {selectedLocation && (
                <p className="text-xs text-slate-500 mt-1.5">
                  {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
                </p>
              )}
              <input type="hidden" name="lat" value={selectedLocation?.lat || editingCenter?.location.lat || TUGUEGARAO_CENTER[0]} />
              <input type="hidden" name="lng" value={selectedLocation?.lng || editingCenter?.location.lng || TUGUEGARAO_CENTER[1]} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Max Capacity" name="capacity_max" type="number" defaultValue={editingCenter?.capacity_max || 100} required />
              <Input label="Current Occupancy" name="capacity_current" type="number" defaultValue={editingCenter?.capacity_current || 0} />
            </div>
            <Select label="Status" name="status" defaultValue={editingCenter?.status || 'operational'} options={STATUS_OPTIONS} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Contact Person" name="contact_person" defaultValue={editingCenter?.contact_person} placeholder="Name" />
              <Input label="Contact Number" name="contact_number" defaultValue={editingCenter?.contact_number} placeholder="Phone" />
            </div>
            <FormButtons onCancel={closeCenterForm} color="green" />
          </form>
        </Modal>
      )}

      {showAlertForm && (
        <Modal title="Create Alert" onClose={() => setShowAlertForm(false)}>
          <form onSubmit={handleSaveAlert} className="space-y-4">
            <Input label="Alert Title" name="title" required placeholder="e.g., Flash Flood Warning" />
            <Textarea label="Message" name="message" required placeholder="Enter detailed alert message..." rows={3} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Alert Type" name="alert_type" options={ALERT_TYPE_OPTIONS} />
              <Select label="Severity" name="severity" options={ALERT_SEVERITY_OPTIONS} />
            </div>
            <Input label="Location Name (optional)" name="location_name" placeholder="e.g., Downtown Area" />
            <FormButtons onCancel={() => setShowAlertForm(false)} color="red" label="Send Alert" />
          </form>
        </Modal>
      )}
    </div>
  );
}
