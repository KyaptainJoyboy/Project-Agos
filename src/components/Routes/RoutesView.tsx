import { useEffect, useState } from 'react';
import { Navigation, MapPin, Clock, AlertCircle, Shield, GraduationCap } from 'lucide-react';
import { simulationManager, SPUPRoute } from '../../lib/simulationManager';

export function RoutesView() {
  const [routes, setRoutes] = useState<SPUPRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'safe' | 'student'>('all');

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
      const spupRoutes = simulationManager.generateSPUPRoutes();
      setRoutes(spupRoutes);
    } catch (error) {
      console.error('Error loading routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getSafetyColor = (safety: string) => {
    if (safety === 'safe') return 'bg-green-500';
    if (safety === 'moderate') return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getSafetyTextColor = (safety: string) => {
    if (safety === 'safe') return 'text-green-700';
    if (safety === 'moderate') return 'text-amber-700';
    return 'text-red-700';
  };

  const filteredRoutes = routes.filter(route => {
    if (selectedFilter === 'safe') return route.safety === 'safe';
    if (selectedFilter === 'student') return route.from.includes('SPUP') || route.from.includes('Boarding') || route.from.includes('Dormitories') || route.from.includes('Pensione');
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading routes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-16 overflow-y-auto bg-slate-50">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white/20 rounded-full">
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Evacuation Routes</h1>
            <p className="text-blue-100 text-sm">SPUP-focused safe routes</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
              selectedFilter === 'all'
                ? 'bg-white text-blue-600'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            All Routes
          </button>
          <button
            onClick={() => setSelectedFilter('safe')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-1 ${
              selectedFilter === 'safe'
                ? 'bg-white text-green-600'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Shield className="w-4 h-4" />
            Safe Only
          </button>
          <button
            onClick={() => setSelectedFilter('student')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-1 ${
              selectedFilter === 'student'
                ? 'bg-white text-purple-600'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Students
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            {filteredRoutes.length} route{filteredRoutes.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {filteredRoutes.map((route) => (
          <div key={route.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Navigation className="w-6 h-6 text-blue-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-sm">{route.name}</h3>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <div className={`w-2 h-2 rounded-full ${getSafetyColor(route.safety)}`}></div>
                    <span className={`text-xs font-bold uppercase ${getSafetyTextColor(route.safety)}`}>
                      {route.safety}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-slate-600 font-medium">{route.from}</p>
                      <p className="text-slate-500 text-xs">→ {route.to}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1 text-slate-600">
                      <Navigation className="w-4 h-4" />
                      <span className="font-medium">{formatDistance(route.distance)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">{route.duration} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className={`w-4 h-4 ${
                        route.floodRisk >= 4 ? 'text-red-600' :
                        route.floodRisk >= 2 ? 'text-amber-600' :
                        'text-green-600'
                      }`} />
                      <span className={`text-xs font-bold ${
                        route.floodRisk >= 4 ? 'text-red-600' :
                        route.floodRisk >= 2 ? 'text-amber-600' :
                        'text-green-600'
                      }`}>
                        Risk: {route.floodRisk}/5
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredRoutes.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Navigation className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No routes match your filter</p>
            <p className="text-sm">Try selecting a different filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
