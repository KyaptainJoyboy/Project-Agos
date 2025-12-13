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
  Save,
  X,
  Activity,
  Home,
  RefreshCw,
  Map
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../App';
import { supabase, FloodMarker, AdminAlert, WeatherCondition } from '../../lib/supabase';

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

export function AdminView() {
  const { profile, user } = useAuth();
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

  const isAdmin = profile?.new_role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
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
      attribution: '© OSM',
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

    const floodRiskMap: { [key: string]: number } = {
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
    <div className="flex flex-col h-full pb-16 overflow-y-auto bg-slate-50">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-full">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Admin Panel</h1>
              <p className="text-slate-300 text-xs">Manage AGOS System</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex gap-2 p-3 overflow-x-auto bg-white border-b border-slate-200 sticky top-0 z-10">
        {[
          { id: 'overview' as AdminTab, label: 'Overview', icon: Activity },
          { id: 'centers' as AdminTab, label: 'Centers', icon: Home },
          { id: 'floods' as AdminTab, label: 'Floods', icon: MapPin },
          { id: 'alerts' as AdminTab, label: 'Alerts', icon: Bell },
          { id: 'weather' as AdminTab, label: 'Weather', icon: Cloud }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium whitespace-nowrap text-sm ${
                activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 flex-1">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Users} value={stats.users} label="Users" color="blue" />
              <StatCard icon={Home} value={stats.centers} label="Centers" color="green" />
              <StatCard icon={AlertTriangle} value={stats.activeFloodMarkers} label="Flood Zones" color="orange" />
              <StatCard icon={Bell} value={stats.activeAlerts} label="Alerts" color="red" />
            </div>

            {weather && (
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold capitalize">{weather.condition_type.replace('_', ' ')}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
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
                <QuickAction icon={MapPin} label="Add Flood" color="orange" onClick={() => { setActiveTab('floods'); setShowFloodForm(true); }} />
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
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Center
            </button>

            {centers.map(center => (
              <div key={center.id} className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-slate-900">{center.name}</h3>
                    <p className="text-sm text-slate-600">{center.address}</p>
                  </div>
                  <StatusBadge status={center.status} />
                </div>
                <div className="text-sm text-slate-600 mb-3">
                  Capacity: {center.capacity_current}/{center.capacity_max}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingCenter(center); setShowCenterForm(true); }} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Edit</button>
                  <button onClick={() => handleDeleteCenter(center.id)} className="px-3 py-2 bg-red-600 text-white rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'floods' && (
          <div className="space-y-3">
            <button
              onClick={() => setShowFloodForm(true)}
              className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Flood Zone
            </button>

            {floodMarkers.map(marker => (
              <div key={marker.id} className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-slate-900">{marker.name}</h3>
                    <p className="text-sm text-slate-600">{marker.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${marker.is_active ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                    {marker.is_active ? 'Active' : 'Off'}
                  </span>
                </div>
                <div className="flex gap-2 text-sm text-slate-600 mb-3">
                  <span>Severity: {marker.severity}/5</span>
                  <span>Radius: {marker.radius_meters}m</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleToggleFloodMarker(marker.id, marker.is_active)} className={`flex-1 py-2 rounded-lg text-sm font-medium ${marker.is_active ? 'bg-slate-200 text-slate-700' : 'bg-green-600 text-white'}`}>
                    {marker.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => { setEditingFlood(marker); setShowFloodForm(true); }} className="px-3 py-2 bg-blue-600 text-white rounded-lg"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDeleteFloodMarker(marker.id)} className="px-3 py-2 bg-red-600 text-white rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-3">
            <button
              onClick={() => setShowAlertForm(true)}
              className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Alert
            </button>

            {alerts.map(alert => (
              <div key={alert.id} className={`rounded-xl p-4 border-2 ${
                alert.severity === 'critical' ? 'bg-red-50 border-red-400' :
                alert.severity === 'high' ? 'bg-orange-50 border-orange-400' :
                alert.severity === 'medium' ? 'bg-amber-50 border-amber-400' : 'bg-blue-50 border-blue-400'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase text-white ${
                    alert.severity === 'critical' ? 'bg-red-600' :
                    alert.severity === 'high' ? 'bg-orange-600' :
                    alert.severity === 'medium' ? 'bg-amber-600' : 'bg-blue-600'
                  }`}>{alert.severity}</span>
                  <span className="text-xs text-slate-600 uppercase">{alert.alert_type}</span>
                  <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${alert.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {alert.is_active ? 'Live' : 'Off'}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900">{alert.title}</h3>
                <p className="text-sm text-slate-700 mt-1">{alert.message}</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleToggleAlert(alert.id, alert.is_active)} className={`flex-1 py-2 rounded-lg text-sm font-medium ${alert.is_active ? 'bg-slate-200 text-slate-700' : 'bg-green-600 text-white'}`}>
                    {alert.is_active ? 'Turn Off' : 'Turn On'}
                  </button>
                  <button onClick={() => handleDeleteAlert(alert.id)} className="px-3 py-2 bg-red-600 text-white rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'weather' && (
          <div className="space-y-2">
            {[
              { value: 'normal', label: 'Normal', risk: 1, desc: 'Clear skies' },
              { value: 'light_rain', label: 'Light Rain', risk: 2, desc: 'Minor rainfall' },
              { value: 'heavy_rain', label: 'Heavy Rain', risk: 3, desc: 'Significant rainfall' },
              { value: 'storm', label: 'Storm', risk: 4, desc: 'Severe weather' },
              { value: 'typhoon', label: 'Typhoon', risk: 5, desc: 'Extreme conditions' }
            ].map(c => (
              <button
                key={c.value}
                onClick={() => handleUpdateWeather(c.value)}
                className={`w-full text-left p-4 rounded-xl border-2 ${
                  weather?.condition_type === c.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{c.label}</div>
                    <div className="text-sm text-slate-600">{c.desc} - Risk: {c.risk}/5</div>
                  </div>
                  {weather?.condition_type === c.value && (
                    <span className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded">ACTIVE</span>
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
            <Textarea label="Description" name="description" defaultValue={editingFlood?.description} placeholder="Details..." />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Map className="w-4 h-4 inline mr-1" />Location (click map)
              </label>
              <div ref={mapContainerRef} className="w-full h-48 rounded-lg border border-slate-300" />
              {selectedLocation && <p className="text-xs text-slate-600 mt-1">{selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}</p>}
              <input type="hidden" name="lat" value={selectedLocation?.lat || editingFlood?.location.lat || TUGUEGARAO_CENTER[0]} />
              <input type="hidden" name="lng" value={selectedLocation?.lng || editingFlood?.location.lng || TUGUEGARAO_CENTER[1]} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Severity" name="severity" defaultValue={editingFlood?.severity || 3} options={[{v:'1',l:'1-Minor'},{v:'2',l:'2-Low'},{v:'3',l:'3-Moderate'},{v:'4',l:'4-High'},{v:'5',l:'5-Critical'}]} />
              <Input label="Radius (m)" name="radius" type="number" defaultValue={editingFlood?.radius_meters || 100} required />
            </div>
            <Checkbox label="Active (visible & affects routing)" name="is_active" defaultChecked={editingFlood?.is_active ?? true} />
            <FormButtons onCancel={closeFloodForm} />
          </form>
        </Modal>
      )}

      {showCenterForm && (
        <Modal title={editingCenter ? 'Edit Center' : 'Add Center'} onClose={closeCenterForm}>
          <form onSubmit={handleSaveCenter} className="space-y-4">
            <Input label="Center Name" name="name" defaultValue={editingCenter?.name} required placeholder="e.g., City Gymnasium" />
            <Input label="Address" name="address" defaultValue={editingCenter?.address} required placeholder="Full address" />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Map className="w-4 h-4 inline mr-1" />Location (click map)
              </label>
              <div ref={mapContainerRef} className="w-full h-48 rounded-lg border border-slate-300" />
              {selectedLocation && <p className="text-xs text-slate-600 mt-1">{selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}</p>}
              <input type="hidden" name="lat" value={selectedLocation?.lat || editingCenter?.location.lat || TUGUEGARAO_CENTER[0]} />
              <input type="hidden" name="lng" value={selectedLocation?.lng || editingCenter?.location.lng || TUGUEGARAO_CENTER[1]} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Max Capacity" name="capacity_max" type="number" defaultValue={editingCenter?.capacity_max || 100} required />
              <Input label="Current" name="capacity_current" type="number" defaultValue={editingCenter?.capacity_current || 0} />
            </div>
            <Select label="Status" name="status" defaultValue={editingCenter?.status || 'operational'} options={[{v:'operational',l:'Operational'},{v:'full',l:'Full'},{v:'closed',l:'Closed'},{v:'emergency',l:'Emergency'}]} />
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
            <Textarea label="Message" name="message" required placeholder="Detailed message..." rows={3} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Type" name="alert_type" options={[{v:'general',l:'General'},{v:'flood',l:'Flood'},{v:'weather',l:'Weather'},{v:'evacuation',l:'Evacuation'},{v:'emergency',l:'Emergency'}]} />
              <Select label="Severity" name="severity" options={[{v:'low',l:'Low'},{v:'medium',l:'Medium'},{v:'high',l:'High'},{v:'critical',l:'Critical'}]} />
            </div>
            <Input label="Location Name (optional)" name="location_name" placeholder="e.g., Downtown" />
            <FormButtons onCancel={() => setShowAlertForm(false)} color="red" label="Send Alert" />
          </form>
        </Modal>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, value, label, color }: { icon: any; value: number; label: string; color: string }) {
  const colors: Record<string, string> = { blue: 'text-blue-600', green: 'text-green-600', orange: 'text-orange-600', red: 'text-red-600' };
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200">
      <Icon className={`w-7 h-7 ${colors[color]} mb-1`} />
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-600">{label}</div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, color, onClick }: { icon: any; label: string; color: string; onClick: () => void }) {
  const colors: Record<string, string> = { blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700', orange: 'bg-orange-50 text-orange-700', red: 'bg-red-50 text-red-700' };
  return (
    <button onClick={onClick} className={`flex items-center gap-2 p-3 rounded-lg font-medium text-sm ${colors[color]}`}>
      <Icon className="w-4 h-4" />{label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { operational: 'bg-green-100 text-green-700', full: 'bg-red-100 text-red-700', closed: 'bg-slate-100 text-slate-600', emergency: 'bg-amber-100 text-amber-700' };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.closed}`}>{status}</span>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Input({ label, name, type = 'text', defaultValue, required, placeholder }: { label: string; name: string; type?: string; defaultValue?: any; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input type={type} name={name} defaultValue={defaultValue} required={required} placeholder={placeholder} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}

function Textarea({ label, name, defaultValue, placeholder, rows = 2 }: { label: string; name: string; defaultValue?: string; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <textarea name={name} defaultValue={defaultValue} placeholder={placeholder} rows={rows} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}

function Select({ label, name, defaultValue, options }: { label: string; name: string; defaultValue?: any; options: { v: string; l: string }[] }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <select name={name} defaultValue={defaultValue} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function Checkbox({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="w-4 h-4 text-blue-600 rounded" />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

function FormButtons({ onCancel, color = 'blue', label = 'Save' }: { onCancel: () => void; color?: string; label?: string }) {
  const colors: Record<string, string> = { blue: 'bg-blue-600 hover:bg-blue-700', green: 'bg-green-600 hover:bg-green-700', red: 'bg-red-600 hover:bg-red-700' };
  return (
    <div className="flex gap-2 pt-2">
      <button type="submit" className={`flex-1 text-white py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 ${colors[color]}`}>
        <Save className="w-4 h-4" />{label}
      </button>
      <button type="button" onClick={onCancel} className="px-4 py-2.5 bg-slate-200 text-slate-700 rounded-lg font-semibold">Cancel</button>
    </div>
  );
}
