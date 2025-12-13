import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, MapPin, X, Navigation, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, FloodMarker, AdminAlert } from '../../lib/supabase';
import { calculateRoute, findNearestEvacuationCenter } from '../../lib/routingService';

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
  const { profile } = useAuth();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [showLayerControl, setShowLayerControl] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [clickMode, setClickMode] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{distance: number, duration: number, destination: string} | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  const [layers, setLayers] = useState<MapLayer[]>([
    { id: 'centers', name: 'Evacuation Centers', enabled: true, color: '#10b981' },
    { id: 'floods', name: 'Flood Markers', enabled: true, color: '#ef4444' },
    { id: 'alerts', name: 'Active Alerts', enabled: true, color: '#f59e0b' },
  ]);

  const markersRef = useRef<{ [key: string]: L.LayerGroup }>({});

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: TUGUEGARAO_CENTER,
      zoom: 14,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    map.on('click', (e) => {
      if (clickMode) {
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
  }, [clickMode]);

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

  const loadMapData = async () => {
    try {
      await Promise.all([
        loadEvacuationCenters().catch(e => console.error('Error loading centers:', e)),
        loadFloodMarkers().catch(e => console.error('Error loading flood markers:', e)),
        loadAlerts().catch(e => console.error('Error loading alerts:', e))
      ]);
    } catch (error) {
      console.error('Error loading map data:', error);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setUserLocation([lat, lng]);
    setClickMode(false);

    if (userMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(userMarkerRef.current);
    }

    const icon = L.divIcon({
      html: `<div style="background-color: #3b82f6; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-center;">
        <div style="transform: rotate(45deg); color: white; font-size: 16px; font-weight: bold;">📍</div>
      </div>`,
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 24],
    });

    userMarkerRef.current = L.marker([lat, lng], { icon }).addTo(mapRef.current!);
    userMarkerRef.current.bindPopup('<b>Your Location</b><br>Click "Find Route" to navigate to the nearest evacuation center').openPopup();
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
        alert('Failed to calculate route. Please try again.');
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
      alert('Error calculating route. Please try again.');
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
    try {
      const { data, error } = await supabase
        .from('evacuation_centers')
        .select('*');

      if (error) {
        console.error('Error loading evacuation centers:', error);
        return;
      }

      const centerGroup = markersRef.current.centers;
      centerGroup.clearLayers();

      (data || []).forEach((center: any) => {
        const location = center.location as any;
        const coords: [number, number] = [location.coordinates[1], location.coordinates[0]];
        const capacityPercent = (center.capacity_current / center.capacity_max) * 100;
        const markerColor = capacityPercent >= 90 ? '#ef4444' : capacityPercent >= 70 ? '#f59e0b' : '#10b981';

        const icon = L.divIcon({
          html: `<div style="background-color: ${markerColor}; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            </svg>
          </div>`,
          className: '',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker(coords, { icon });
        marker.bindPopup(`
          <div style="min-width: 220px;">
            <h3 style="font-weight: bold; margin-bottom: 8px; color: #1e293b;">${center.name}</h3>
            <p style="font-size: 13px; color: #64748b; margin-bottom: 8px;">${center.address}</p>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 13px;"><strong>Capacity:</strong> ${center.capacity_current} / ${center.capacity_max}</p>
              <p style="font-size: 13px; margin-top: 4px;"><strong>Status:</strong> <span style="text-transform: capitalize; color: ${markerColor};">${center.status}</span></p>
            </div>
          </div>
        `);
        marker.addTo(centerGroup);
      });
    } catch (error) {
      console.error('Error loading evacuation centers:', error);
    }
  };

  const loadFloodMarkers = async () => {
    try {
      const { data, error } = await supabase
        .from('flood_markers')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Error loading flood markers:', error);
        return;
      }

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
          <div style="min-width: 180px;">
            <h3 style="font-weight: bold; margin-bottom: 8px;">${marker.name}</h3>
            <p style="font-size: 13px;">${marker.description || ''}</p>
            <p style="font-size: 13px; margin-top: 4px;"><strong>Severity:</strong> ${marker.severity}/5</p>
            <p style="font-size: 13px; margin-top: 4px;"><strong>Radius:</strong> ${marker.radius_meters}m</p>
          </div>
        `).addTo(floodGroup);
      });
    } catch (error) {
      console.error('Error loading flood markers:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_alerts')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Error loading alerts:', error);
        return;
      }

      const alertGroup = markersRef.current.alerts;
      alertGroup.clearLayers();

      (data || []).forEach((alert: any) => {
        if (!alert.location) return;

        const location = alert.location as any;
        const coords: [number, number] = [location.coordinates[1], location.coordinates[0]];
        const alertColor = alert.severity === 'critical' ? '#dc2626' : alert.severity === 'high' ? '#ef4444' : '#f59e0b';

        const icon = L.divIcon({
          html: `<div style="background-color: ${alertColor}; width: 40px; height: 40px; border-radius: 4px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.5); display: flex; align-items: center; justify-center; animation: pulse 2s infinite;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>`,
          className: '',
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const marker = L.marker(coords, { icon });
        marker.bindPopup(`
          <div style="min-width: 200px;">
            <div style="background-color: ${alertColor}; color: white; font-weight: bold; text-transform: uppercase; padding: 6px 12px; margin: -8px -12px 8px; font-size: 12px;">${alert.severity} ALERT</div>
            <h3 style="font-weight: bold; margin-bottom: 8px; color: ${alertColor};">${alert.title}</h3>
            <p style="font-size: 13px; text-transform: uppercase; font-weight: bold; color: #64748b; margin-bottom: 4px;">${alert.alert_type}</p>
            <p style="font-size: 13px; line-height: 1.5;">${alert.message}</p>
            ${alert.location_name ? `<p style="font-size: 12px; color: #64748b; margin-top: 8px;"><strong>Location:</strong> ${alert.location_name}</p>` : ''}
          </div>
        `);
        marker.addTo(alertGroup);
      });
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const toggleLayer = (layerId: string) => {
    setLayers(prev => prev.map(layer =>
      layer.id === layerId ? { ...layer, enabled: !layer.enabled } : layer
    ));
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      <div className="absolute top-4 left-4 right-4 z-[1000] flex gap-2">
        <button
          onClick={() => setShowLayerControl(!showLayerControl)}
          className="bg-white px-4 py-2 rounded-lg shadow-md border border-slate-200 flex items-center gap-2 font-medium text-slate-700 hover:bg-slate-50"
        >
          <Layers className="w-4 h-4" />
          Layers
        </button>

        <button
          onClick={() => setClickMode(!clickMode)}
          className={`px-4 py-2 rounded-lg shadow-md flex items-center gap-2 font-medium transition-all ${
            clickMode
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <MapPin className="w-4 h-4" />
          {clickMode ? 'Tap Map' : 'Set Location'}
        </button>
      </div>

      {showLayerControl && (
        <div className="absolute top-16 left-4 z-[1000] bg-white rounded-lg shadow-lg border border-slate-200 p-4 min-w-[200px]">
          <h3 className="font-semibold text-slate-900 mb-3">Map Layers</h3>
          {layers.map(layer => (
            <label key={layer.id} className="flex items-center gap-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={layer.enabled}
                onChange={() => toggleLayer(layer.id)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2 flex-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: layer.color }}
                />
                <span className="text-sm text-slate-700">{layer.name}</span>
              </div>
            </label>
          ))}
        </div>
      )}

      {userLocation && (
        <div className="absolute bottom-24 left-4 right-4 z-[1000] bg-white rounded-lg shadow-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900">Route Navigation</h3>
            <button
              onClick={clearRoute}
              className="text-slate-500 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!routeInfo && (
            <button
              onClick={calculateRouteToNearest}
              disabled={isRouting}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRouting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Calculating Route...
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-bold text-blue-900 mb-1">{routeInfo.destination}</p>
              <div className="flex gap-4 text-xs text-blue-700">
                <span>Distance: {routeInfo.distance < 1000 ? `${routeInfo.distance}m` : `${(routeInfo.distance/1000).toFixed(1)}km`}</span>
                <span>•</span>
                <span>ETA: {routeInfo.duration} min</span>
              </div>
              <p className="text-xs text-blue-600 mt-2">Route avoids active flood zones</p>
            </div>
          )}
        </div>
      )}

      {clickMode && (
        <div className="absolute bottom-24 left-4 right-4 z-[1000] bg-blue-50 border-2 border-blue-500 rounded-lg p-4 animate-pulse">
          <div className="flex gap-3">
            <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-900 mb-1">Tap anywhere on the map</p>
              <p className="text-xs text-blue-700">Set your location to get evacuation routes</p>
            </div>
          </div>
        </div>
      )}

      {!userLocation && !clickMode && (
        <div className="absolute bottom-24 left-4 right-4 z-[1000] bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 mb-1">Location Not Set</p>
              <p className="text-xs text-amber-700">Click "Set Location" to place a pin on your current position and get routes to evacuation centers.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
