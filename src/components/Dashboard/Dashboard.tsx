import { useEffect, useState } from 'react';
import { MapPin, Users, AlertTriangle, Bell, Cloud } from 'lucide-react';
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
  const { profile } = useAuth();
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
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadCenters().catch(e => console.error('Error loading centers:', e)),
        loadAlerts().catch(e => console.error('Error loading alerts:', e)),
        loadWeather().catch(e => console.error('Error loading weather:', e)),
        loadStats().catch(e => console.error('Error loading stats:', e))
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
      .order('name');

    if (error) {
      console.error('Error loading centers:', error);
      return;
    }

    setCenters(data || []);
  };

  const loadAlerts = async () => {
    const { data, error } = await supabase
      .from('admin_alerts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

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

  const getCapacityColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getCapacityTextColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'text-red-700';
    if (percentage >= 70) return 'text-amber-700';
    return 'text-green-700';
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
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 overflow-y-auto h-full">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <AgosLogo className="w-10 h-10" />
          <div>
            <h1 className="text-2xl font-bold">AGOS</h1>
            <p className="text-blue-100 text-sm">Disaster Management System</p>
            <p className="text-blue-200 text-xs">Tuguegarao City, Cagayan</p>
          </div>
        </div>

        {profile && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <p className="text-sm text-blue-100">Welcome,</p>
            <p className="font-semibold text-lg">{profile.full_name}</p>
            <p className="text-sm text-blue-100 capitalize">{profile.new_role}</p>
          </div>
        )}
      </div>

      {weather && (
        <div className="mx-4 mt-4 bg-white rounded-lg p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Cloud className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 capitalize">
                  {weather.condition_type.replace('_', ' ')}
                </p>
                <p className="text-xs text-slate-600">Flood Risk: Level {weather.flood_risk_level}/5</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              weather.flood_risk_level >= 4 ? 'bg-red-100 text-red-700' :
              weather.flood_risk_level >= 3 ? 'bg-orange-100 text-orange-700' :
              weather.flood_risk_level >= 2 ? 'bg-amber-100 text-amber-700' :
              'bg-green-100 text-green-700'
            }`}>
              {weather.flood_risk_level >= 4 ? 'High Risk' :
               weather.flood_risk_level >= 3 ? 'Moderate Risk' :
               weather.flood_risk_level >= 2 ? 'Low Risk' : 'Minimal Risk'}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 p-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.operationalCenters}</p>
              <p className="text-xs text-slate-600">Active Centers</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalCapacity}</p>
              <p className="text-xs text-slate-600">Current Evacuees</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.activeFloodMarkers}</p>
              <p className="text-xs text-slate-600">Flood Zones</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <Bell className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.activeAlerts}</p>
              <p className="text-xs text-slate-600">Active Alerts</p>
            </div>
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-slate-900">Active Alerts</h2>
          </div>
          <div className="space-y-2">
            {alerts.map((alert) => {
              const colors = getSeverityColor(alert.severity);
              return (
                <div
                  key={alert.id}
                  className={`rounded-lg p-4 border-2 ${colors.bg} ${colors.border}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <AlertTriangle className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${colors.badge} text-white`}>
                          {alert.severity}
                        </span>
                        <span className="text-xs font-semibold text-slate-600 uppercase">{alert.alert_type}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 mb-1">{alert.title}</p>
                      <p className="text-sm text-slate-700">{alert.message}</p>
                      {alert.location_name && (
                        <p className="text-xs text-slate-600 mt-2">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {alert.location_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Evacuation Centers</h2>
          <span className="text-sm text-slate-600">{centers.length} centers</span>
        </div>

        <div className="space-y-3">
          {centers.map((center) => {
            const capacityPercent = Math.round((center.capacity_current / center.capacity_max) * 100);

            return (
              <div key={center.id} className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{center.name}</h3>
                    <p className="text-sm text-slate-600 mt-1">{center.address}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    center.status === 'operational' ? 'bg-green-100 text-green-700' :
                    center.status === 'full' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {center.status}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">Capacity</span>
                    <span className={`font-semibold ${getCapacityTextColor(center.capacity_current, center.capacity_max)}`}>
                      {center.capacity_current} / {center.capacity_max} ({capacityPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getCapacityColor(center.capacity_current, center.capacity_max)}`}
                      style={{ width: `${Math.min(capacityPercent, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {centers.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No evacuation centers available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
