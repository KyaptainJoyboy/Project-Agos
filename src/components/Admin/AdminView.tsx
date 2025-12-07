import { useState, useEffect } from 'react';
import { Settings, Droplets, AlertTriangle, Users, GraduationCap, Activity, CheckCircle, TrendingUp } from 'lucide-react';
import { simulationManager, SimulationMode } from '../../lib/simulationManager';
import { useAuth } from '../../contexts/AuthContext';

interface SimulationModeConfig {
  id: SimulationMode;
  name: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
}

const SIMULATION_MODES: SimulationModeConfig[] = [
  {
    id: 'normal',
    name: 'Normal Mode',
    description: 'Regular city operations with minimal flood risk',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    id: 'light_flood',
    name: 'Light Flood',
    description: 'Minor flooding in low-lying areas, some roads affected',
    icon: Droplets,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'severe_flood',
    name: 'Severe Flood',
    description: 'Major flooding across city, multiple evacuations needed',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  {
    id: 'citywide_evacuation',
    name: 'Citywide Evacuation',
    description: 'Critical emergency, immediate evacuation required',
    icon: Users,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  {
    id: 'student_safety',
    name: 'Student Safety Mode',
    description: 'Focus on SPUP student evacuation and safety routes',
    icon: GraduationCap,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
];

export function AdminView() {
  const { profile } = useAuth();
  const [currentMode, setCurrentMode] = useState<SimulationMode>(simulationManager.getMode());
  const [stats, setStats] = useState(simulationManager.getStatistics());
  const [autoUpdate, setAutoUpdate] = useState(true);

  useEffect(() => {
    const unsubscribe = simulationManager.subscribe(() => {
      setStats(simulationManager.getStatistics());
    });

    if (autoUpdate) {
      simulationManager.startAutoUpdate(15000);
    } else {
      simulationManager.stopAutoUpdate();
    }

    return () => {
      unsubscribe();
      simulationManager.stopAutoUpdate();
    };
  }, [autoUpdate]);

  const handleModeChange = (mode: SimulationMode) => {
    setCurrentMode(mode);
    simulationManager.setMode(mode);
  };

  const handleToggleAutoUpdate = () => {
    setAutoUpdate(!autoUpdate);
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'personnel';

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-600">Admin control panel is only accessible to personnel and administrators.</p>
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
            <p className="text-slate-300 text-sm">AI Simulation Management</p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              <span className="text-sm font-medium">Auto-Update Simulation</span>
            </div>
            <button
              onClick={handleToggleAutoUpdate}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoUpdate ? 'bg-green-500' : 'bg-white/30'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoUpdate ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-slate-300">
            {autoUpdate ? 'Data updates every 15 seconds' : 'Manual mode - data is static'}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Live Statistics
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-600 mb-1">{stats.operationalCenters}</div>
              <div className="text-xs text-blue-700 font-medium">Active Centers</div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-600 mb-1">{stats.totalEvacuees}</div>
              <div className="text-xs text-green-700 font-medium">Total Evacuees</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-600 mb-1">{stats.availableVehicles}</div>
              <div className="text-xs text-purple-700 font-medium">Available Vehicles</div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
              <div className="text-3xl font-bold text-red-600 mb-1">{stats.activeAlerts}</div>
              <div className="text-xs text-red-700 font-medium">Active Alerts</div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-3">Simulation Modes</h2>
          <p className="text-sm text-slate-600 mb-4">
            Select a simulation mode to control flood conditions, hazard levels, and system behavior
          </p>

          <div className="space-y-3">
            {SIMULATION_MODES.map((mode) => {
              const Icon = mode.icon;
              const isActive = currentMode === mode.id;

              return (
                <button
                  key={mode.id}
                  onClick={() => handleModeChange(mode.id)}
                  className={`w-full text-left rounded-xl p-4 border-2 transition-all ${
                    isActive
                      ? 'border-slate-900 shadow-lg scale-[1.02]'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-3 ${mode.bgColor} rounded-xl ${mode.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900">{mode.name}</h3>
                        {isActive && (
                          <span className="px-2 py-0.5 bg-slate-900 text-white text-xs font-medium rounded-full">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{mode.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900 mb-1">Simulation Mode Active</p>
              <p className="text-amber-700">
                All data displayed in AGOS is AI-generated for demonstration purposes only.
                This system is designed for academic and presentation use.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
