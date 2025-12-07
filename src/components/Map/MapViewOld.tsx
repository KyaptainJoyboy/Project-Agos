import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, Navigation2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { simulationManager } from '../../lib/simulationManager';

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
  const [layers, setLayers] = useState<MapLayer[]>([
    { id: 'centers', name: 'Evacuation Centers', enabled: true, color: '#10b981' },
    { id: 'vehicles', name: 'Transport Vehicles', enabled: true, color: '#3b82f6' },
    { id: 'roads', name: 'Road Closures', enabled: true, color: '#ef4444' },
    { id: 'floods', name: 'Flood Zones', enabled: true, color: '#3b82f6' },
    { id: 'alerts', name: 'Hazard Alerts', enabled: true, color: '#f59e0b' },
  ]);

  const markersRef = useRef<{ [key: string]: L.LayerGroup }>({});

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: TUGUEGARAO_CENTER,
      zoom: 13,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    markersRef.current = {
      centers: L.layerGroup().addTo(map),
      vehicles: L.layerGroup().addTo(map),
      roads: L.layerGroup().addTo(map),
      floods: L.layerGroup().addTo(map),
      alerts: L.layerGroup().addTo(map),
    };

    loadMapData();

    const unsubscribe = simulationManager.subscribe(() => {
      loadMapData();
    });

    return () => {
      unsubscribe();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

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

  const loadMapData = () => {
    loadEvacuationCenters();
    loadVehicles();
    loadRoadClosures();
    loadFloodZones();
    loadHazardAlerts();
  };

  const loadEvacuationCenters = () => {
    const centers = simulationManager.generateEvacuationCenters();
    const centerGroup = markersRef.current.centers;
    centerGroup.clearLayers();

    centers.forEach(center => {
      const coords: [number, number] = [center.lat, center.lng];
      const capacityPercent = (center.capacity_current / center.capacity_max) * 100;
      const markerColor = capacityPercent >= 90 ? '#ef4444' : capacityPercent >= 70 ? '#f59e0b' : '#10b981';

      const icon = L.divIcon({
        html: `<div style="background-color: ${markerColor}; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
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
            <div style="display: flex; gap: 12px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
              <div style="text-align: center;"><div style="font-size: 11px; color: #64748b;">Food</div><div style="font-weight: bold; font-size: 13px;">${center.supplies.food}%</div></div>
              <div style="text-align: center;"><div style="font-size: 11px; color: #64748b;">Water</div><div style="font-weight: bold; font-size: 13px;">${center.supplies.water}%</div></div>
              <div style="text-align: center;"><div style="font-size: 11px; color: #64748b;">Medical</div><div style="font-weight: bold; font-size: 13px;">${center.supplies.medical}%</div></div>
            </div>
          </div>
        </div>
      `);
      marker.addTo(centerGroup);
    });
  };

  const loadVehicles = () => {
    const vehicles = simulationManager.generateVehicles();
    const vehicleGroup = markersRef.current.vehicles;
    vehicleGroup.clearLayers();

    vehicles.forEach(vehicle => {
      const coords: [number, number] = [vehicle.lat, vehicle.lng];
      const statusColor = vehicle.status === 'available' ? '#10b981' : vehicle.status === 'deployed' ? '#3b82f6' : '#f59e0b';

      const icon = L.divIcon({
        html: `<div style="background-color: ${statusColor}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
            <path d="M5 17h14v-5H5z M3 17h2v3h14v-3h2"></path>
            <circle cx="9" cy="20" r="1"></circle>
            <circle cx="15" cy="20" r="1"></circle>
          </svg>
        </div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(coords, { icon });
      marker.bindPopup(`
        <div style="min-width: 180px;">
          <h3 style="font-weight: bold; margin-bottom: 8px;">${vehicle.name}</h3>
          <p style="font-size: 13px;"><strong>Type:</strong> <span style="text-transform: uppercase;">${vehicle.type}</span></p>
          <p style="font-size: 13px; margin-top: 4px;"><strong>Speed:</strong> ${vehicle.speed > 0 ? `${Math.round(vehicle.speed)} km/h` : 'Stationary'}</p>
          <p style="font-size: 13px; margin-top: 4px;"><strong>Status:</strong> <span style="text-transform: capitalize; color: ${statusColor};">${vehicle.status}</span></p>
          <p style="font-size: 13px; margin-top: 4px;"><strong>Passengers:</strong> ${vehicle.passengers} / ${vehicle.capacity}</p>
        </div>
      `);
      marker.addTo(vehicleGroup);
    });
  };

  const loadRoadClosures = () => {
    const closures = simulationManager.generateRoadClosures();
    const roadGroup = markersRef.current.roads;
    roadGroup.clearLayers();

    closures.forEach(closure => {
      const coords = closure.coordinates.map(c => [c.lat, c.lng] as [number, number]);
      const severityColor = closure.severity >= 4 ? '#dc2626' : closure.severity >= 3 ? '#ef4444' : '#f59e0b';

      L.polyline(coords, {
        color: severityColor,
        weight: 6,
        opacity: 0.8,
        dashArray: '10, 10',
      }).bindPopup(`
        <div style="min-width: 180px;">
          <h3 style="font-weight: bold; margin-bottom: 8px;">${closure.roadName}</h3>
          <p style="font-size: 13px;"><strong>Reason:</strong> <span style="text-transform: capitalize; color: ${severityColor};">${closure.reason}</span></p>
          <p style="font-size: 13px; margin-top: 4px;"><strong>Severity:</strong> ${closure.severity}/5</p>
        </div>
      `).addTo(roadGroup);
    });
  };

  const loadFloodZones = () => {
    const floodZones = simulationManager.generateFloodZones();
    const floodGroup = markersRef.current.floods;
    floodGroup.clearLayers();

    floodZones.forEach(zone => {
      if (zone.status === 'safe') return;

      const coords: [number, number] = [zone.lat, zone.lng];
      const zoneColor = zone.status === 'critical' ? '#dc2626' : zone.status === 'danger' ? '#ef4444' : '#f59e0b';

      L.circle(coords, {
        color: zoneColor,
        fillColor: zoneColor,
        fillOpacity: 0.3,
        radius: zone.severity * 150,
        weight: 2,
      }).bindPopup(`
        <div style="min-width: 180px;">
          <h3 style="font-weight: bold; margin-bottom: 8px;">${zone.name}</h3>
          <p style="font-size: 13px;"><strong>Status:</strong> <span style="text-transform: uppercase; color: ${zoneColor};">${zone.status}</span></p>
          <p style="font-size: 13px; margin-top: 4px;"><strong>Water Level:</strong> ${zone.waterLevel}m</p>
          <p style="font-size: 13px; margin-top: 4px;"><strong>Severity:</strong> ${zone.severity}/5</p>
        </div>
      `).addTo(floodGroup);
    });
  };

  const loadHazardAlerts = () => {
    const alerts = simulationManager.generateHazardAlerts();
    const alertGroup = markersRef.current.alerts;
    alertGroup.clearLayers();

    alerts.forEach(alert => {
      if (alert.severity === 'low') return;

      const coords: [number, number] = [alert.lat, alert.lng];
      const alertColor = alert.severity === 'critical' ? '#dc2626' : alert.severity === 'high' ? '#ef4444' : '#f59e0b';

      const icon = L.divIcon({
        html: `<div style="background-color: ${alertColor}; width: 40px; height: 40px; border-radius: 4px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; animation: pulse 2s infinite;">
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
          <h3 style="font-weight: bold; margin-bottom: 8px; color: ${alertColor};">${alert.location}</h3>
          <p style="font-size: 13px; text-transform: uppercase; font-weight: bold; color: #64748b; margin-bottom: 4px;">${alert.type}</p>
          <p style="font-size: 13px; line-height: 1.5;">${alert.message}</p>
        </div>
      `);
      marker.addTo(alertGroup);
    });
  };

  const centerOnUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          mapRef.current?.setView(coords, 15);

          L.marker(coords, {
            icon: L.divIcon({
              html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
              className: '',
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            }),
          }).addTo(mapRef.current!);
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to get your location. Please enable location services.');
        }
      );
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

        {profile?.location_permission_granted && (
          <button
            onClick={centerOnUser}
            className="bg-blue-600 px-4 py-2 rounded-lg shadow-md text-white flex items-center gap-2 font-medium hover:bg-blue-700"
          >
            <Navigation2 className="w-4 h-4" />
            My Location
          </button>
        )}
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

      {!profile?.location_permission_granted && (
        <div className="absolute bottom-24 left-4 right-4 z-[1000] bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 mb-1">Location Permission Required</p>
              <p className="text-xs text-amber-700">Enable location to see your position and get evacuation routes.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
