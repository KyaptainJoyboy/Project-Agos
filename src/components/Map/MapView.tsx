import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, MapPin, X, Navigation, AlertCircle, RefreshCw, Locate, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { calculateRoute, findNearestEvacuationCenter } from '../../lib/routingService';
import { useAuth } from '../../App';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TUGUEGARAO_CENTER: [number, number] = [17.6132, 121.7270];

interface MapLayer {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
}

export function MapView() {
  const { isAdmin } = useAuth();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [showLayerControl, setShowLayerControl] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [clickMode, setClickMode] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{distance: number, duration: number, destination: string} | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const clickModeRef = useRef(clickMode);

  const [layers, setLayers] = useState<MapLayer[]>([
    { id: 'centers', name: 'Evacuation Centers', enabled: true, color: '#10b981' },
    { id: 'floods', name: 'Flood Zones', enabled: true, color: '#ef4444' },
    { id: 'alerts', name: 'Active Alerts', enabled: true, color: '#f59e0b' },
  ]);

  const markersRef = useRef<{ [key: string]: L.LayerGroup }>({});

  useEffect(() => {
    clickModeRef.current = clickMode;
  }, [clickMode]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setUserLocation([lat, lng]);
    setClickMode(false);
    setRouteInfo(null);

    if (userMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(userMarkerRef.current);
    }
    if (routePolylineRef.current && mapRef.current) {
      mapRef.current.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    const icon = L.divIcon({
      html: `<div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div>`,
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    if (mapRef.current) {
      userMarkerRef.current = L.marker([lat, lng], { icon }).addTo(mapRef.current);
      userMarkerRef.current.bindPopup('<b>Your Location</b><br>Tap "Find Route" to navigate').openPopup();
    }
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: TUGUEGARAO_CENTER,
      zoom: 14,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (clickModeRef.current) {
        handleMapClick(e.latlng.lat, e.latlng.lng);
      }
    });

    mapRef.current = map;

    markersRef.current = {
      centers: L.layerGroup().addTo(map),
      floods: L.layerGroup().addTo(map),
      alerts: L.layerGroup().addTo(map),
    };

    loadMapData();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [handleMapClick]);

  useEffect(() => {
    Object.keys(markersRef.current).forEach(layerId => {
      const layer = layers.find(l => l.id === layerId);
      if (layer?.enabled && mapRef.current && !mapRef.current.hasLayer(markersRef.current[layerId])) {
        markersRef.current[layerId].addTo(mapRef.current);
      } else if (!layer?.enabled && mapRef.current && mapRef.current.hasLayer(markersRef.current[layerId])) {
        mapRef.current.removeLayer(markersRef.current[layerId]);
      }
    });
  }, [layers]);

  const loadMapData = useCallback(async () => {
    await Promise.all([
      loadEvacuationCenters(),
      loadFloodMarkers(),
      loadAlerts()
    ]);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadMapData();
    setIsRefreshing(false);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        handleMapClick(latitude, longitude);
        mapRef.current?.setView([latitude, longitude], 16);
        setGettingLocation(false);
      },
      () => {
        alert('Could not get location. Please set it manually.');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const calculateRouteToNearest = async () => {
    if (!userLocation || !mapRef.current) return;

    setIsRouting(true);

    try {
      const nearest = await findNearestEvacuationCenter(userLocation);

      if (!nearest) {
        alert('No evacuation centers available');
        setIsRouting(false);
        return;
      }

      const result = await calculateRoute(userLocation, nearest.location, true);

      if (!result.success) {
        alert('Could not calculate route');
        setIsRouting(false);
        return;
      }

      setRouteInfo({
        distance: result.distance,
        duration: Math.round(result.duration / 60),
        destination: nearest.name
      });

      if (routePolylineRef.current && mapRef.current) {
        mapRef.current.removeLayer(routePolylineRef.current);
      }

      routePolylineRef.current = L.polyline(result.coordinates, {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.8,
      }).addTo(mapRef.current);

      const bounds = L.latLngBounds(result.coordinates);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });

    } catch (error) {
      console.error('Routing error:', error);
      alert('Error calculating route');
    } finally {
      setIsRouting(false);
    }
  };

  const clearRoute = () => {
    if (userMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
    if (routePolylineRef.current && mapRef.current) {
      mapRef.current.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }
    setUserLocation(null);
    setRouteInfo(null);
    setClickMode(false);
  };

  const loadEvacuationCenters = async () => {
    const { data, error } = await supabase.from('evacuation_centers').select('*');
    if (error) return;

    const centerGroup = markersRef.current.centers;
    centerGroup.clearLayers();

    (data || []).forEach((center: any) => {
      const location = center.location as any;
      const coords: [number, number] = [location.coordinates[1], location.coordinates[0]];
      const capacityPercent = (center.capacity_current / center.capacity_max) * 100;
      const markerColor = capacityPercent >= 90 ? '#ef4444' : capacityPercent >= 70 ? '#f59e0b' : '#10b981';

      const icon = L.divIcon({
        html: `<div style="background: ${markerColor}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          </svg>
        </div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(coords, { icon });
      marker.bindPopup(`
        <div style="min-width: 200px;">
          <h3 style="font-weight: bold; margin-bottom: 6px; color: #1e293b; font-size: 14px;">${center.name}</h3>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">${center.address}</p>
          <div style="background: #f1f5f9; padding: 8px; border-radius: 6px;">
            <p style="font-size: 12px;"><strong>Capacity:</strong> ${center.capacity_current}/${center.capacity_max}</p>
            <p style="font-size: 12px; margin-top: 4px;"><strong>Status:</strong> <span style="color: ${markerColor};">${center.status}</span></p>
          </div>
        </div>
      `);
      marker.addTo(centerGroup);
    });
  };

  const loadFloodMarkers = async () => {
    const { data, error } = await supabase.from('flood_markers').select('*').eq('is_active', true);
    if (error) return;

    const floodGroup = markersRef.current.floods;
    floodGroup.clearLayers();

    (data || []).forEach((marker: any) => {
      const location = marker.location as any;
      const coords: [number, number] = [location.coordinates[1], location.coordinates[0]];
      const severityColor = marker.severity >= 4 ? '#dc2626' : marker.severity >= 3 ? '#ef4444' : '#f59e0b';

      L.circle(coords, {
        color: severityColor,
        fillColor: severityColor,
        fillOpacity: 0.3,
        radius: marker.radius_meters,
        weight: 2,
      }).bindPopup(`
        <div style="min-width: 160px;">
          <h3 style="font-weight: bold; margin-bottom: 4px; color: ${severityColor};">${marker.name}</h3>
          <p style="font-size: 12px; color: #64748b;">${marker.description || ''}</p>
          <p style="font-size: 12px; margin-top: 6px;"><strong>Severity:</strong> ${marker.severity}/5</p>
          <p style="font-size: 12px;"><strong>Radius:</strong> ${marker.radius_meters}m</p>
        </div>
      `).addTo(floodGroup);
    });
  };

  const loadAlerts = async () => {
    const { data, error } = await supabase.from('admin_alerts').select('*').eq('is_active', true);
    if (error) return;

    const alertGroup = markersRef.current.alerts;
    alertGroup.clearLayers();

    (data || []).forEach((alert: any) => {
      if (!alert.location) return;

      const location = alert.location as any;
      const coords: [number, number] = [location.coordinates[1], location.coordinates[0]];
      const alertColor = alert.severity === 'critical' ? '#dc2626' : alert.severity === 'high' ? '#ef4444' : '#f59e0b';

      const icon = L.divIcon({
        html: `<div style="background: ${alertColor}; width: 36px; height: 36px; border-radius: 6px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker(coords, { icon });
      marker.bindPopup(`
        <div style="min-width: 180px;">
          <div style="background: ${alertColor}; color: white; font-weight: bold; text-transform: uppercase; padding: 4px 8px; margin: -8px -12px 8px; font-size: 11px;">${alert.severity} ALERT</div>
          <h3 style="font-weight: bold; margin-bottom: 4px; color: ${alertColor}; font-size: 13px;">${alert.title}</h3>
          <p style="font-size: 12px; line-height: 1.4;">${alert.message}</p>
        </div>
      `);
      marker.addTo(alertGroup);
    });
  };

  const toggleLayer = (layerId: string) => {
    setLayers(prev => prev.map(layer =>
      layer.id === layerId ? { ...layer, enabled: !layer.enabled } : layer
    ));
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {isAdmin && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] bg-amber-500 text-white px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 text-xs font-bold">
          <Shield className="w-3 h-3" />
          ADMIN VIEW
        </div>
      )}

      <div className="absolute top-4 left-4 right-4 z-[1000] flex gap-2" style={{ marginTop: isAdmin ? '32px' : '0' }}>
        <button
          onClick={() => setShowLayerControl(!showLayerControl)}
          className={`px-3 py-2 rounded-lg shadow-md border flex items-center gap-2 font-medium text-sm ${
            isAdmin ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          Layers
        </button>

        <button
          onClick={() => setClickMode(!clickMode)}
          className={`px-3 py-2 rounded-lg shadow-md flex items-center gap-2 font-medium text-sm ${
            clickMode
              ? (isAdmin ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white')
              : (isAdmin ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-white text-slate-700 border border-slate-200')
          }`}
        >
          <MapPin className="w-4 h-4" />
          {clickMode ? 'Tap Map' : 'Set Location'}
        </button>

        <button
          onClick={getCurrentLocation}
          disabled={gettingLocation}
          className={`px-3 py-2 rounded-lg shadow-md border flex items-center gap-2 font-medium text-sm ${
            isAdmin ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <Locate className={`w-4 h-4 ${gettingLocation ? 'animate-pulse' : ''}`} />
        </button>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`p-2 rounded-lg shadow-md border ml-auto ${
            isAdmin ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {showLayerControl && (
        <div className={`absolute left-4 z-[1000] rounded-lg shadow-lg border p-3 min-w-[180px] ${
          isAdmin ? 'top-20 bg-slate-800 border-slate-700' : 'top-16 bg-white border-slate-200'
        }`} style={{ marginTop: isAdmin ? '32px' : '0' }}>
          <h3 className={`font-semibold mb-2 text-sm ${isAdmin ? 'text-white' : 'text-slate-900'}`}>Map Layers</h3>
          {layers.map(layer => (
            <label key={layer.id} className="flex items-center gap-2 py-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={layer.enabled}
                onChange={() => toggleLayer(layer.id)}
                className={`w-4 h-4 rounded ${isAdmin ? 'text-amber-600' : 'text-blue-600'}`}
              />
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: layer.color }} />
              <span className={`text-sm ${isAdmin ? 'text-slate-300' : 'text-slate-700'}`}>{layer.name}</span>
            </label>
          ))}
        </div>
      )}

      {userLocation && (
        <div className={`absolute bottom-24 left-4 right-4 z-[1000] rounded-xl shadow-lg border p-4 ${
          isAdmin ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-bold ${isAdmin ? 'text-white' : 'text-slate-900'}`}>Route Navigation</h3>
            <button onClick={clearRoute} className={isAdmin ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {!routeInfo && (
            <button
              onClick={calculateRouteToNearest}
              disabled={isRouting}
              className={`w-full py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 ${
                isAdmin ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white'
              }`}
            >
              {isRouting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Finding Route...
                </>
              ) : (
                <>
                  <Navigation className="w-5 h-5" />
                  Find Route to Nearest Center
                </>
              )}
            </button>
          )}

          {routeInfo && (
            <div className={`rounded-lg p-3 border ${
              isAdmin ? 'bg-amber-500/10 border-amber-500/30' : 'bg-blue-50 border-blue-200'
            }`}>
              <p className={`text-sm font-bold mb-1 ${isAdmin ? 'text-amber-300' : 'text-blue-900'}`}>{routeInfo.destination}</p>
              <div className={`flex gap-4 text-xs ${isAdmin ? 'text-amber-200' : 'text-blue-700'}`}>
                <span>Distance: {routeInfo.distance < 1000 ? `${routeInfo.distance}m` : `${(routeInfo.distance/1000).toFixed(1)}km`}</span>
                <span>ETA: {routeInfo.duration} min</span>
              </div>
              <p className={`text-xs mt-2 ${isAdmin ? 'text-amber-400' : 'text-blue-600'}`}>Route avoids active flood zones</p>
            </div>
          )}
        </div>
      )}

      {clickMode && (
        <div className={`absolute bottom-24 left-4 right-4 z-[1000] rounded-xl p-4 border-2 animate-pulse ${
          isAdmin ? 'bg-amber-500/10 border-amber-500' : 'bg-blue-50 border-blue-500'
        }`}>
          <div className="flex gap-3">
            <MapPin className={`w-5 h-5 flex-shrink-0 ${isAdmin ? 'text-amber-400' : 'text-blue-600'}`} />
            <div>
              <p className={`text-sm font-bold ${isAdmin ? 'text-amber-300' : 'text-blue-900'}`}>Tap anywhere on the map</p>
              <p className={`text-xs ${isAdmin ? 'text-amber-200' : 'text-blue-700'}`}>Set your location to get evacuation routes</p>
            </div>
          </div>
        </div>
      )}

      {!userLocation && !clickMode && (
        <div className={`absolute bottom-24 left-4 right-4 z-[1000] rounded-xl p-4 border ${
          isAdmin ? 'bg-slate-800 border-slate-700' : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex gap-3">
            <AlertCircle className={`w-5 h-5 flex-shrink-0 ${isAdmin ? 'text-slate-400' : 'text-amber-600'}`} />
            <div>
              <p className={`text-sm font-medium ${isAdmin ? 'text-white' : 'text-amber-900'}`}>Location Not Set</p>
              <p className={`text-xs ${isAdmin ? 'text-slate-400' : 'text-amber-700'}`}>Tap "Set Location" or use GPS to get evacuation routes.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
