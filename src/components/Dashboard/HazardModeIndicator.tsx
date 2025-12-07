import { useState, useEffect } from 'react';
import { AlertTriangle, Droplets, Users, GraduationCap, CheckCircle, CloudRain, Wind, ChevronRight, X } from 'lucide-react';
import { simulationManager, SimulationMode } from '../../lib/simulationManager';

interface ModeConfig {
  icon: any;
  label: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  description: string;
  fullDescription: string;
}

const MODE_CONFIG: Record<SimulationMode, ModeConfig> = {
  normal: {
    icon: CheckCircle,
    label: 'Normal Operations',
    color: 'from-green-500 to-emerald-600',
    textColor: 'text-green-50',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500',
    description: 'All systems operational',
    fullDescription: 'Regular city operations with minimal flood risk. All evacuation centers have low occupancy and high supplies.',
  },
  light_flood: {
    icon: Droplets,
    label: 'Light Flood Advisory',
    color: 'from-blue-500 to-cyan-600',
    textColor: 'text-blue-50',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500',
    description: 'Minor flooding in low areas',
    fullDescription: 'Minor flooding in low-lying areas with some roads affected. Evacuation centers are partially occupied.',
  },
  severe_flood: {
    icon: CloudRain,
    label: 'Severe Flood Warning',
    color: 'from-orange-500 to-red-600',
    textColor: 'text-orange-50',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500',
    description: 'Major flooding - Evacuate now',
    fullDescription: 'Major flooding across the city with multiple evacuations needed. Centers are filling up and supplies are moderate.',
  },
  citywide_evacuation: {
    icon: AlertTriangle,
    label: 'CITYWIDE EVACUATION',
    color: 'from-red-600 to-red-700',
    textColor: 'text-red-50',
    bgColor: 'bg-red-600/10',
    borderColor: 'border-red-600',
    description: 'CRITICAL EMERGENCY',
    fullDescription: 'Critical emergency requiring immediate citywide evacuation. Centers are near capacity and supplies are running low.',
  },
  student_safety: {
    icon: GraduationCap,
    label: 'Student Safety Alert',
    color: 'from-purple-500 to-indigo-600',
    textColor: 'text-purple-50',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500',
    description: 'SPUP student evacuation active',
    fullDescription: 'Focus on SPUP student evacuation and safety routes. Special attention to dorms, boarding houses, and campus areas.',
  },
};

export function HazardModeIndicator() {
  const [mode, setMode] = useState<SimulationMode>(simulationManager.getMode());
  const [pulse, setPulse] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const unsubscribe = simulationManager.subscribe(() => {
      const newMode = simulationManager.getMode();
      setMode(newMode);
      setPulse(true);
      setTimeout(() => setPulse(false), 1000);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleModeChange = (newMode: SimulationMode) => {
    simulationManager.setMode(newMode);
    setShowModal(false);
  };

  const config = MODE_CONFIG[mode];
  const Icon = config.icon;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`w-full relative overflow-hidden rounded-xl border-2 ${config.borderColor} ${config.bgColor} backdrop-blur-sm transition-all ${pulse ? 'scale-105' : 'scale-100'} hover:scale-[1.02] active:scale-[0.98]`}
      >
        <div className={`absolute inset-0 bg-gradient-to-r ${config.color} opacity-90`}></div>

        <div className="relative p-4 flex items-center gap-4">
          <div className={`p-3 rounded-full bg-white/20 backdrop-blur-sm ${pulse ? 'animate-pulse' : ''}`}>
            <Icon className={`w-7 h-7 ${config.textColor}`} />
          </div>

          <div className="flex-1 text-left">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-bold text-lg ${config.textColor} uppercase tracking-wide`}>
                {config.label}
              </h3>
              {mode !== 'normal' && (
                <span className="inline-block w-3 h-3 bg-white rounded-full animate-pulse"></span>
              )}
            </div>
            <p className={`text-sm ${config.textColor} font-medium`}>
              {config.description}
            </p>
          </div>

          <div className="flex flex-col items-center gap-1">
            {mode !== 'normal' && (
              <Wind className={`w-6 h-6 ${config.textColor} animate-bounce`} />
            )}
            <ChevronRight className={`w-5 h-5 ${config.textColor}`} />
          </div>
        </div>

        {mode !== 'normal' && (
          <div className="absolute top-0 left-0 w-full h-1 bg-white/30 overflow-hidden">
            <div className="h-full bg-white/60 animate-[pulse_2s_ease-in-out_infinite] w-full"></div>
          </div>
        )}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Select Hazard Mode</h2>
                <p className="text-sm text-slate-600">Choose a simulation scenario</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {(Object.keys(MODE_CONFIG) as SimulationMode[]).map((modeKey) => {
                const modeConfig = MODE_CONFIG[modeKey];
                const ModeIcon = modeConfig.icon;
                const isActive = mode === modeKey;

                return (
                  <button
                    key={modeKey}
                    onClick={() => handleModeChange(modeKey)}
                    className={`w-full text-left rounded-xl border-2 transition-all ${
                      isActive
                        ? 'border-slate-900 shadow-lg'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3 mb-2">
                        <div className={`p-3 ${modeConfig.bgColor} rounded-xl flex-shrink-0`}>
                          <ModeIcon className={`w-6 h-6 ${modeConfig.textColor.replace('-50', '-600')}`} />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-slate-900">{modeConfig.label}</h3>
                            {isActive && (
                              <span className="px-2 py-0.5 bg-slate-900 text-white text-xs font-medium rounded-full">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">
                            {modeConfig.fullDescription}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <AlertTriangle className="w-4 h-4" />
                <span>All data is AI-generated for demonstration purposes</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
