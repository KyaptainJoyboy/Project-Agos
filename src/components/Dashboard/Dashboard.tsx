import { useEffect, useState } from 'react';
import { MapPin, Users, AlertTriangle, Bell, Cloud, Shield, Map, Navigation } from 'lucide-react';
import { useAuth } from '../../App';
import { supabase, AdminAlert, WeatherCondition } from '../../lib/supabase';
import { AgosLogo } from '../Logo/AgosLogo';

interface Stats {
  totalCenters: number;
  operationalCenters: number;
  totalCapacity: number;
  activeAlerts: number;
  activeFloodMarkers: number;
}

interface EvacuationCenter {
  id: string;
  name: string;
  address: string;
  capacity_max: number;
  capacity_current: number;
  status: string;
}

export function Dashboard() {
  const { profile, isAdmin } = useAuth();

  if (isAdmin) {
    return <AdminDashboard profile={profile} />;
  }

  return <UserDashboard profile={profile} />;
}

function UserDashboard({ profile }: { profile: any }) {
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [weather, setWeather] = useState<WeatherCondition | null>(null);
  const [nearestCenter, setNearestCenter] = useState<EvacuationCenter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    const alertsChannel = supabase
      .channel('user_alerts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_alerts' }, () => {
        loadAlerts();
      })
      .subscribe();

    const weatherChannel = supabase
      .channel('user_weather_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weather_conditions' }, () => {
        loadWeather();
      })
      .subscribe();

    const centersChannel = supabase
      .channel('user_centers_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'evacuation_centers' }, () => {
        loadCenters();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(weatherChannel);
      supabase.removeChannel(centersChannel);
    };
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadCenters(),
        loadAlerts(),
        loadWeather()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCenters = async () => {
    const { data, error } = await supabase
      .from('evacuation_centers')
      .select('*')
      .eq('status', 'operational')
      .order('name')
      .limit(3);

    if (error) return;
    setCenters(data || []);
    if (data && data.length > 0) {
      setNearestCenter(data[0]);
    }
  };

  const loadAlerts = async () => {
    const { data, error } = await supabase
      .from('admin_alerts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(3);

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
    const { data, error } = await supabase
      .from('weather_conditions')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (error) return;
    setWeather(data);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return { bg: 'bg-red-50', border: 'border-red-500', badge: 'bg-red-600', text: 'text-red-900' };
      case 'high': return { bg: 'bg-orange-50', border: 'border-orange-500', badge: 'bg-orange-600', text: 'text-orange-900' };
      case 'medium': return { bg: 'bg-amber-50', border: 'border-amber-500', badge: 'bg-amber-600', text: 'text-amber-900' };
      default: return { bg: 'bg-blue-50', border: 'border-blue-500', badge: 'bg-blue-600', text: 'text-blue-900' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 overflow-y-auto h-full bg-gradient-to-b from-blue-50 to-slate-50">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <AgosLogo className="w-12 h-12" />
          <div>
            <h1 className="text-3xl font-bold">AGOS</h1>
            <p className="text-blue-100 text-sm">Stay Safe, Stay Informed</p>
          </div>
        </div>

        {profile && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <p className="text-blue-100 text-sm mb-1">Welcome back,</p>
            <p className="font-bold text-xl">{profile.full_name}</p>
          </div>
        )}
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {weather && (
          <div className={`rounded-xl p-5 shadow-lg border-2 ${
            weather.flood_risk_level >= 4 ? 'bg-red-50 border-red-500' :
            weather.flood_risk_level >= 3 ? 'bg-orange-50 border-orange-500' :
            'bg-white border-blue-200'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-3 rounded-full ${
                weather.flood_risk_level >= 4 ? 'bg-red-100' :
                weather.flood_risk_level >= 3 ? 'bg-orange-100' : 'bg-blue-100'
              }`}>
                <Cloud className={`w-6 h-6 ${
                  weather.flood_risk_level >= 4 ? 'text-red-600' :
                  weather.flood_risk_level >= 3 ? 'text-orange-600' : 'text-blue-600'
                }`} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg text-slate-900 capitalize">
                  {weather.condition_type.replace('_', ' ')}
                </p>
                <p className="text-sm text-slate-600">Current Weather Condition</p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-lg text-center font-bold ${
              weather.flood_risk_level >= 4 ? 'bg-red-600 text-white' :
              weather.flood_risk_level >= 3 ? 'bg-orange-600 text-white' :
              'bg-blue-600 text-white'
            }`}>
              {weather.flood_risk_level >= 4 ? 'HIGH FLOOD RISK - STAY ALERT' :
               weather.flood_risk_level >= 3 ? 'MODERATE FLOOD RISK' :
               'LOW FLOOD RISK'}
            </div>
          </div>
        )}

        {alerts.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-red-600" />
              Emergency Alerts
            </h2>
            {alerts.map((alert) => {
              const colors = getSeverityColor(alert.severity);
              return (
                <div
                  key={alert.id}
                  className={`rounded-xl p-4 border-2 shadow-md ${colors.bg} ${colors.border}`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-6 h-6 flex-shrink-0 ${colors.text}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${colors.badge} text-white`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 mb-1">{alert.title}</p>
                      <p className="text-sm text-slate-700">{alert.message}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {nearestCenter && (
          <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
            <h2 className="font-bold text-lg text-slate-900 mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-600" />
              Nearest Evacuation Center
            </h2>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h3 className="font-bold text-green-900 mb-2">{nearestCenter.name}</h3>
              <p className="text-sm text-green-800 mb-3">{nearestCenter.address}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-700">
                  <strong>Capacity:</strong> {nearestCenter.capacity_current}/{nearestCenter.capacity_max}
                </span>
                <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-bold">
                  {nearestCenter.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
          <h2 className="font-bold text-lg text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow-md flex flex-col items-center gap-2">
              <MapPin className="w-8 h-8" />
              <span className="font-semibold text-sm">View Map</span>
            </button>
            <button className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-xl shadow-md flex flex-col items-center gap-2">
              <Navigation className="w-8 h-8" />
              <span className="font-semibold text-sm">Find Route</span>
            </button>
          </div>
        </div>

        {centers.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
            <h2 className="font-bold text-lg text-slate-900 mb-3">Available Centers</h2>
            <div className="space-y-2">
              {centers.map((center) => (
                <div key={center.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <h3 className="font-semibold text-slate-900 text-sm">{center.name}</h3>
                  <p className="text-xs text-slate-600 mt-1">{center.address}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDashboard({ profile }: { profile: any }) {
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [weather, setWeather] = useState<WeatherCondition | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalCenters: 0,
    operationalCenters: 0,
    totalCapacity: 0,
    activeAlerts: 0,
    activeFloodMarkers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    const alertsChannel = supabase
      .channel('admin_dash_alerts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_alerts' }, () => {
        loadAlerts();
        loadStats();
      })
      .subscribe();

    const weatherChannel = supabase
      .channel('admin_dash_weather_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weather_conditions' }, () => {
        loadWeather();
      })
      .subscribe();

    const centersChannel = supabase
      .channel('admin_dash_centers_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'evacuation_centers' }, () => {
        loadCenters();
        loadStats();
      })
      .subscribe();

    const floodsChannel = supabase
      .channel('admin_dash_floods_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flood_markers' }, () => {
        loadStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(weatherChannel);
      supabase.removeChannel(centersChannel);
      supabase.removeChannel(floodsChannel);
    };
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadCenters(),
        loadAlerts(),
        loadWeather(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCenters = async () => {
    const { data, error } = await supabase
      .from('evacuation_centers')
      .select('*')
      .order('capacity_current', { ascending: false })
      .limit(5);

    if (error) return;
    setCenters(data || []);
  };

  const loadAlerts = async () => {
    const { data, error } = await supabase
      .from('admin_alerts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5);

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
    const { data, error } = await supabase
      .from('weather_conditions')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (error) return;
    setWeather(data);
  };

  const loadStats = async () => {
    const [centersResult, alertsResult, floodsResult] = await Promise.all([
      supabase.from('evacuation_centers').select('*', { count: 'exact' }),
      supabase.from('admin_alerts').select('*', { count: 'exact' }).eq('is_active', true),
      supabase.from('flood_markers').select('*', { count: 'exact' }).eq('is_active', true)
    ]);

    const operationalCenters = centersResult.data?.filter(c => c.status === 'operational').length || 0;
    const totalCapacity = centersResult.data?.reduce((sum, c) => sum + c.capacity_current, 0) || 0;

    setStats({
      totalCenters: centersResult.count || 0,
      operationalCenters,
      totalCapacity,
      activeAlerts: alertsResult.count || 0,
      activeFloodMarkers: floodsResult.count || 0
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading control panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 overflow-y-auto h-full bg-slate-900">
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-black text-white p-6 pb-8 border-b-4 border-amber-500">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 rounded-xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">AGOS Control Center</h1>
              <p className="text-slate-300 text-sm">System Administration Dashboard</p>
            </div>
          </div>
        </div>

        {profile && (
          <div className="bg-amber-500/10 backdrop-blur-sm rounded-xl p-4 border-2 border-amber-500/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Shield className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wide">Administrator</p>
                <p className="font-bold text-xl text-white">{profile.full_name}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {weather && (
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Cloud className="w-5 h-5 text-amber-400" />
                Weather Status
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                weather.flood_risk_level >= 4 ? 'bg-red-500 text-white' :
                weather.flood_risk_level >= 3 ? 'bg-orange-500 text-white' :
                'bg-green-500 text-white'
              }`}>
                Risk Level: {weather.flood_risk_level}/5
              </span>
            </div>
            <p className="text-2xl font-bold text-white capitalize">{weather.condition_type.replace('_', ' ')}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 text-white">
            <MapPin className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{stats.operationalCenters}</p>
            <p className="text-sm opacity-90">Active Centers</p>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-4 text-white">
            <Users className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{stats.totalCapacity}</p>
            <p className="text-sm opacity-90">Total Evacuees</p>
          </div>

          <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl p-4 text-white">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{stats.activeFloodMarkers}</p>
            <p className="text-sm opacity-90">Flood Zones</p>
          </div>

          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-4 text-white">
            <Bell className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{stats.activeAlerts}</p>
            <p className="text-sm opacity-90">Active Alerts</p>
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <Bell className="w-5 h-5 text-red-400" />
              Active System Alerts
            </h3>
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      alert.severity === 'critical' ? 'bg-red-500 text-white' :
                      alert.severity === 'high' ? 'bg-orange-500 text-white' :
                      'bg-amber-500 text-white'
                    }`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="font-semibold text-white text-sm">{alert.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {centers.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              Evacuation Centers Overview
            </h3>
            <div className="space-y-2">
              {centers.slice(0, 3).map((center) => {
                const percent = Math.round((center.capacity_current / center.capacity_max) * 100);
                return (
                  <div key={center.id} className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-white text-sm">{center.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        center.status === 'operational' ? 'bg-green-500 text-white' :
                        center.status === 'full' ? 'bg-red-500 text-white' :
                        'bg-slate-600 text-white'
                      }`}>
                        {center.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-800 rounded-full h-2">
                        <div
                          className={`h-full rounded-full ${
                            percent >= 90 ? 'bg-red-500' :
                            percent >= 70 ? 'bg-orange-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        {center.capacity_current}/{center.capacity_max}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl p-5 text-white">
          <h3 className="font-bold mb-3">Quick Admin Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
              <Shield className="w-6 h-6 mx-auto mb-1" />
              <p className="text-xs font-medium">Manage System</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
              <Map className="w-6 h-6 mx-auto mb-1" />
              <p className="text-xs font-medium">View Map</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
