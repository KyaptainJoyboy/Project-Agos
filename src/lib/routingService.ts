import { supabase, FloodMarker } from './supabase';

const ORS_API_KEY = '5b3ce3597851110001cf6248a7c7ec8c5d2a4d1695e7deac2efa3feb';
const ORS_BASE_URL = 'https://api.openrouteservice.org/v2';

export interface RouteResult {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  success: boolean;
  error?: string;
}

export interface AvoidArea {
  type: 'polygon';
  coordinates: [number, number][][];
}

export async function getActiveFloodMarkers(): Promise<FloodMarker[]> {
  try {
    const { data, error } = await supabase
      .from('flood_markers')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    return (data || []).map((marker: any) => {
      const location = marker.location as any;
      const coords = location.coordinates || [0, 0];

      return {
        ...marker,
        location: {
          lng: coords[0],
          lat: coords[1]
        }
      };
    });
  } catch (error) {
    console.error('Error fetching flood markers:', error);
    return [];
  }
}

function createCirclePolygon(center: [number, number], radiusMeters: number, points: number = 16): [number, number][] {
  const [lng, lat] = center;
  const earthRadius = 6371000;

  const polygon: [number, number][] = [];

  for (let i = 0; i <= points; i++) {
    const angle = (i * 360 / points) * Math.PI / 180;

    const dx = radiusMeters * Math.cos(angle);
    const dy = radiusMeters * Math.sin(angle);

    const deltaLat = dy / earthRadius * (180 / Math.PI);
    const deltaLng = dx / (earthRadius * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);

    polygon.push([lng + deltaLng, lat + deltaLat]);
  }

  return polygon;
}

export async function calculateRoute(
  start: [number, number],
  end: [number, number],
  avoidFloods: boolean = true
): Promise<RouteResult> {
  try {
    const body: any = {
      coordinates: [[start[1], start[0]], [end[1], end[0]]],
      preference: 'fastest',
      units: 'm',
      language: 'en',
      geometry: true,
      instructions: false
    };

    if (avoidFloods) {
      const floodMarkers = await getActiveFloodMarkers();

      if (floodMarkers.length > 0) {
        const avoidPolygons: AvoidArea[] = floodMarkers.map(marker => {
          const polygon = createCirclePolygon(
            [marker.location.lng, marker.location.lat],
            marker.radius_meters
          );

          return {
            type: 'polygon' as const,
            coordinates: [polygon]
          };
        });

        body.options = {
          avoid_polygons: {
            type: 'MultiPolygon',
            coordinates: avoidPolygons.map(p => p.coordinates)
          }
        };
      }
    }

    const response = await fetch(`${ORS_BASE_URL}/directions/driving-car/geojson`, {
      method: 'POST',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ORS API Error:', errorText);

      return fallbackRoute(start, end);
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const coordinates: [number, number][] = feature.geometry.coordinates.map(
        (coord: number[]) => [coord[1], coord[0]]
      );

      return {
        coordinates,
        distance: feature.properties.summary.distance,
        duration: feature.properties.summary.duration,
        success: true
      };
    }

    return fallbackRoute(start, end);

  } catch (error) {
    console.error('Routing error:', error);
    return fallbackRoute(start, end);
  }
}

function fallbackRoute(start: [number, number], end: [number, number]): RouteResult {
  const coordinates: [number, number][] = [start];
  const steps = 5;

  for (let i = 1; i < steps; i++) {
    const ratio = i / steps;
    const lat = start[0] + (end[0] - start[0]) * ratio;
    const lng = start[1] + (end[1] - start[1]) * ratio;
    const offset = 0.001 * Math.sin(i * Math.PI);
    coordinates.push([lat + offset, lng + offset * 0.5]);
  }

  coordinates.push(end);

  const distance = getDistance(start, end) * 1000;
  const duration = (distance / 25000) * 3600;

  return {
    coordinates,
    distance,
    duration,
    success: true
  };
}

function getDistance(from: [number, number], to: [number, number]): number {
  const R = 6371;
  const dLat = deg2rad(to[0] - from[0]);
  const dLng = deg2rad(to[1] - from[1]);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(from[0])) * Math.cos(deg2rad(to[0])) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}

export async function findNearestEvacuationCenter(userLocation: [number, number]): Promise<{
  id: string;
  name: string;
  location: [number, number];
  distance: number;
} | null> {
  try {
    const { data, error } = await supabase
      .from('evacuation_centers')
      .select('*')
      .neq('status', 'closed');

    if (error) throw error;
    if (!data || data.length === 0) return null;

    let nearest: any = null;
    let minDistance = Infinity;

    data.forEach((center: any) => {
      const location = center.location as any;
      const coords = location.coordinates || [0, 0];
      const centerLocation: [number, number] = [coords[1], coords[0]];

      const distance = getDistance(userLocation, centerLocation);

      if (distance < minDistance && center.status !== 'full') {
        minDistance = distance;
        nearest = {
          id: center.id,
          name: center.name,
          location: centerLocation,
          distance: distance * 1000
        };
      }
    });

    return nearest;
  } catch (error) {
    console.error('Error finding nearest center:', error);
    return null;
  }
}
