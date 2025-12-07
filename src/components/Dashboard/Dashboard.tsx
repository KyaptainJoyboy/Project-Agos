import { useEffect, useState } from 'react';
import { MapPin, Users, AlertTriangle, Truck, Droplets, Radio } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ConnectivityStatus } from '../ConnectivityStatus';
import { simulationManager, HazardAlert, SimulatedCenter } from '../../lib/simulationManager';
import { AlertsSidebar } from '../Alerts/AlertsSidebar';
import { AgosLogo } from '../Logo/AgosLogo';
import { HazardModeIndicator } from './HazardModeIndicator';

interface Stats {
  totalCenters: number;
  operationalCenters: number;
  totalEvacuees: number;
  availableVehicles: number;
  activeAlerts: number;
}

export function Dashboard() {
  const { profile } = useAuth();
  const [centers, setCenters] = useState<SimulatedCenter[]>([]);
  const [alerts, setAlerts] = useState<HazardAlert[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCenters: 0,
    operationalCenters: 0,
    totalEvacuees: 0,
    availableVehicles: 0,
    activeAlerts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    const unsubscribe = simulationManager.subscribe(() => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadData = () => {
    try {
      const simCenters = simulationManager.generateEvacuationCenters();
      const simAlerts = simulationManager.generateHazardAlerts();
      const simStats = simulationManager.getStatistics();

      setCenters(simCenters);
      setAlerts(simAlerts);
      setStats(simStats);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AgosLogo className="w-10 h-10" />
            <div>
              <h1 className="text-2xl font-bold">AGOS</h1>
              <p className="text-blue-100 text-sm">Tuguegarao City, Cagayan</p>
            </div>
          </div>
          <ConnectivityStatus />
        </div>

        {profile && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <p className="text-sm text-blue-100">Welcome,</p>
            <p className="font-semibold text-lg">{profile.full_name}</p>
            <p className="text-sm text-blue-100 capitalize">{profile.role}</p>
          </div>
        )}
      </div>

      <div className="p-4">
        <HazardModeIndicator />
      </div>

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
              <p className="text-2xl font-bold text-slate-900">{stats.totalEvacuees}</p>
              <p className="text-xs text-slate-600">Total Evacuees</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Truck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.availableVehicles}</p>
              <p className="text-xs text-slate-600">Available Vehicles</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
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
            <Radio className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-slate-900">Active Hazard Alerts</h2>
          </div>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg p-4 border-2 ${
                  alert.severity === 'critical'
                    ? 'bg-red-50 border-red-500'
                    : alert.severity === 'high'
                    ? 'bg-orange-50 border-orange-500'
                    : 'bg-amber-50 border-amber-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {alert.type === 'flood' ? (
                      <Droplets className={`w-6 h-6 ${
                        alert.severity === 'critical' ? 'text-red-600' : 'text-orange-600'
                      }`} />
                    ) : (
                      <AlertTriangle className={`w-6 h-6 ${
                        alert.severity === 'critical' ? 'text-red-600' : 'text-orange-600'
                      }`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                        alert.severity === 'critical'
                          ? 'bg-red-600 text-white'
                          : alert.severity === 'high'
                          ? 'bg-orange-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs font-semibold text-slate-600 uppercase">{alert.type}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 mb-1">{alert.location}</p>
                    <p className="text-sm text-slate-700">{alert.message}</p>
                  </div>
                </div>
              </div>
            ))}
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

                <div className="mt-3 space-y-2">
                  <div>
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

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                    <div className="text-center">
                      <div className="text-xs text-slate-600 mb-1">Food</div>
                      <div className={`text-sm font-bold ${center.supplies.food > 70 ? 'text-green-600' : center.supplies.food > 40 ? 'text-amber-600' : 'text-red-600'}`}>
                        {center.supplies.food}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-600 mb-1">Water</div>
                      <div className={`text-sm font-bold ${center.supplies.water > 70 ? 'text-green-600' : center.supplies.water > 40 ? 'text-amber-600' : 'text-red-600'}`}>
                        {center.supplies.water}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-600 mb-1">Medical</div>
                      <div className={`text-sm font-bold ${center.supplies.medical > 70 ? 'text-green-600' : center.supplies.medical > 40 ? 'text-amber-600' : 'text-red-600'}`}>
                        {center.supplies.medical}%
                      </div>
                    </div>
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

      <AlertsSidebar />
    </div>
  );
}
