const TUGUEGARAO_BOUNDS = {
  minLat: 17.58,
  maxLat: 17.65,
  minLng: 121.70,
  maxLng: 121.76,
};

const SPUP_LOCATION = { lat: 17.614356, lng: 121.727447 };

const FLOOD_PRONE_AREAS = [
  { name: 'Pengue-Ruyu', lat: 17.6205, lng: 121.7285, severity: 4 },
  { name: 'Annafunan', lat: 17.6155, lng: 121.7395, severity: 3 },
  { name: 'Caritan Norte', lat: 17.6310, lng: 121.7215, severity: 5 },
  { name: 'Ugac Sur', lat: 17.6080, lng: 121.7450, severity: 4 },
  { name: 'Centro (near Cagayan River)', lat: 17.6130, lng: 121.7280, severity: 5 },
  { name: 'Buntun Bridge Area', lat: 17.6450, lng: 121.7350, severity: 3 },
  { name: 'Cataggaman Pardo', lat: 17.5950, lng: 121.7380, severity: 4 },
  { name: 'Carig Sur', lat: 17.6088, lng: 121.7212, severity: 3 },
  { name: 'Balzain Highway', lat: 17.6250, lng: 121.7180, severity: 4 },
];

const EVACUATION_CENTERS = [
  { name: 'SPUP Gymnasium', address: 'Peñablanca St, Tuguegarao City', lat: 17.614356, lng: 121.727447 },
  { name: 'Tuguegarao City Convention Center', address: 'Regional Government Center', lat: 17.6088, lng: 121.7212 },
  { name: 'Caritan Norte Covered Court', address: 'Caritan Norte', lat: 17.6310, lng: 121.7215 },
  { name: 'Pengue-Ruyu Barangay Hall', address: 'Pengue-Ruyu', lat: 17.6205, lng: 121.7285 },
  { name: 'Cataggaman Pardo Elementary School', address: 'Cataggaman Pardo', lat: 17.5950, lng: 121.7380 },
  { name: 'Ugac Sur Multi-Purpose Hall', address: 'Ugac Sur', lat: 17.6065, lng: 121.7418 },
  { name: 'Buntun Covered Court', address: 'Buntun', lat: 17.6428, lng: 121.7332 },
];

const SPUP_DORMS_AND_BOARDING = [
  { name: 'SPUP Main Campus', lat: 17.614356, lng: 121.727447 },
  { name: 'Boarding Houses - Peñablanca St', lat: 17.6148, lng: 121.7268 },
  { name: 'Student Dormitories - Bonifacio St', lat: 17.6138, lng: 121.7285 },
  { name: 'Pensione Houses - Luna St', lat: 17.6152, lng: 121.7262 },
  { name: 'Student Housing - Rizal St', lat: 17.6130, lng: 121.7290 },
];

const TRANSPORT_TERMINALS = [
  { name: 'Tuguegarao City Bus Terminal', lat: 17.6181, lng: 121.7338 },
  { name: 'Jeepney Terminal - Pengue', lat: 17.6195, lng: 121.7295 },
  { name: 'Tricycle Terminal - Centro', lat: 17.6125, lng: 121.7302 },
];

export type SimulationMode = 'normal' | 'light_flood' | 'severe_flood' | 'citywide_evacuation' | 'student_safety';

export interface FloodZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  severity: number;
  status: 'safe' | 'warning' | 'danger' | 'critical';
  waterLevel: number;
}

export interface HazardAlert {
  id: string;
  type: 'flood' | 'landslide' | 'storm' | 'road_closure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  lat: number;
  lng: number;
  message: string;
  timestamp: number;
}

export interface SimulatedCenter {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  capacity_max: number;
  capacity_current: number;
  status: 'operational' | 'full' | 'closed' | 'emergency';
  supplies: {
    food: number;
    water: number;
    medical: number;
  };
}

export interface SimulatedVehicle {
  id: string;
  name: string;
  type: 'bus' | 'truck' | 'boat' | 'ambulance';
  lat: number;
  lng: number;
  speed: number;
  status: 'available' | 'deployed' | 'returning';
  capacity: number;
  passengers: number;
}

export interface RoadClosure {
  id: string;
  roadName: string;
  reason: 'flooded' | 'blocked' | 'damaged';
  severity: number;
  coordinates: Array<{ lat: number; lng: number }>;
}

export interface SPUPRoute {
  id: string;
  name: string;
  from: string;
  fromLat: number;
  fromLng: number;
  to: string;
  toLat: number;
  toLng: number;
  distance: number;
  duration: number;
  safety: 'safe' | 'moderate' | 'danger';
  floodRisk: number;
}

class SimulationManager {
  private mode: SimulationMode = 'normal';
  private updateInterval: number | null = null;
  private subscribers: Array<() => void> = [];

  setMode(mode: SimulationMode) {
    this.mode = mode;
    this.notifySubscribers();
  }

  getMode(): SimulationMode {
    return this.mode;
  }

  subscribe(callback: () => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback());
  }

  startAutoUpdate(intervalMs: number = 10000) {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.updateInterval = window.setInterval(() => {
      this.notifySubscribers();
    }, intervalMs);
  }

  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private getRandomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private getFloodMultiplier(): number {
    switch (this.mode) {
      case 'normal': return 0;
      case 'light_flood': return 0.3;
      case 'severe_flood': return 0.7;
      case 'citywide_evacuation': return 0.9;
      case 'student_safety': return 0.5;
      default: return 0;
    }
  }

  generateFloodZones(): FloodZone[] {
    const multiplier = this.getFloodMultiplier();

    return FLOOD_PRONE_AREAS.map(area => {
      const baseSeverity = area.severity * multiplier;
      const waterLevel = baseSeverity * this.getRandomInRange(0.8, 1.2);

      let status: FloodZone['status'] = 'safe';
      if (waterLevel > 3) status = 'critical';
      else if (waterLevel > 2) status = 'danger';
      else if (waterLevel > 1) status = 'warning';

      return {
        id: `zone-${area.name.toLowerCase().replace(/\s/g, '-')}`,
        name: area.name,
        lat: area.lat,
        lng: area.lng,
        severity: Math.min(5, Math.round(baseSeverity)),
        status,
        waterLevel: parseFloat(waterLevel.toFixed(2)),
      };
    });
  }

  generateHazardAlerts(): HazardAlert[] {
    const alerts: HazardAlert[] = [];
    const zones = this.generateFloodZones();

    zones.forEach(zone => {
      if (zone.status === 'critical' || zone.status === 'danger') {
        alerts.push({
          id: `alert-${zone.id}`,
          type: 'flood',
          severity: zone.status === 'critical' ? 'critical' : 'high',
          location: zone.name,
          lat: zone.lat,
          lng: zone.lng,
          message: `${zone.status === 'critical' ? 'CRITICAL' : 'HIGH'} flood warning in ${zone.name}. Water level: ${zone.waterLevel}m`,
          timestamp: Date.now(),
        });
      }
    });

    if (this.mode === 'citywide_evacuation') {
      alerts.push({
        id: 'alert-citywide',
        type: 'storm',
        severity: 'critical',
        location: 'Tuguegarao City',
        lat: 17.6132,
        lng: 121.7270,
        message: 'CITYWIDE EVACUATION ORDER. Proceed to nearest evacuation center immediately.',
        timestamp: Date.now(),
      });
    }

    return alerts;
  }

  generateEvacuationCenters(): SimulatedCenter[] {
    const occupancyMultiplier = this.mode === 'normal' ? 0.05 :
                                this.mode === 'citywide_evacuation' ? 0.85 :
                                this.mode === 'severe_flood' ? 0.6 :
                                this.mode === 'light_flood' ? 0.3 : 0.15;

    return EVACUATION_CENTERS.map((center, index) => {
      const capacities = [500, 800, 300, 200, 400, 350];
      const capacity = capacities[index] || 300;
      const current = Math.round(capacity * occupancyMultiplier * this.getRandomInRange(0.8, 1.2));

      return {
        id: `center-${index}`,
        name: center.name,
        address: center.address,
        lat: center.lat,
        lng: center.lng,
        capacity_max: capacity,
        capacity_current: Math.min(current, capacity),
        status: current >= capacity ? 'full' : current > capacity * 0.9 ? 'emergency' : 'operational',
        supplies: {
          food: Math.round(this.getRandomInRange(this.mode === 'normal' ? 85 : 60, 95)),
          water: Math.round(this.getRandomInRange(this.mode === 'normal' ? 80 : 50, 90)),
          medical: Math.round(this.getRandomInRange(this.mode === 'normal' ? 85 : 70, 100)),
        },
      };
    });
  }

  generateVehicles(): SimulatedVehicle[] {
    const vehicleCount = this.mode === 'citywide_evacuation' ? 15 :
                        this.mode === 'severe_flood' ? 10 : 5;

    const vehicles: SimulatedVehicle[] = [];
    const types: Array<'bus' | 'truck' | 'boat' | 'ambulance'> = ['bus', 'truck', 'boat', 'ambulance'];

    for (let i = 0; i < vehicleCount; i++) {
      const type = types[i % types.length];
      const isDeployed = Math.random() > 0.4;

      vehicles.push({
        id: `vehicle-${i}`,
        name: `${type.toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
        type,
        lat: this.getRandomInRange(TUGUEGARAO_BOUNDS.minLat, TUGUEGARAO_BOUNDS.maxLat),
        lng: this.getRandomInRange(TUGUEGARAO_BOUNDS.minLng, TUGUEGARAO_BOUNDS.maxLng),
        speed: isDeployed ? this.getRandomInRange(15, 45) : 0,
        status: isDeployed ? (Math.random() > 0.5 ? 'deployed' : 'returning') : 'available',
        capacity: type === 'bus' ? 50 : type === 'truck' ? 30 : type === 'boat' ? 20 : 4,
        passengers: isDeployed ? Math.round(this.getRandomInRange(5, type === 'bus' ? 40 : 20)) : 0,
      });
    }

    return vehicles;
  }

  generateRoadClosures(): RoadClosure[] {
    const multiplier = this.getFloodMultiplier();
    const closures: RoadClosure[] = [];

    if (multiplier > 0.2) {
      const floodedRoads = [
        { name: 'Cagayan River Road', coords: [{lat: 17.614, lng: 121.731}, {lat: 17.619, lng: 121.735}] },
        { name: 'Maharlika Highway (Flooded Section)', coords: [{lat: 17.621, lng: 121.729}, {lat: 17.625, lng: 121.732}] },
        { name: 'Pengue-Ruyu Access Road', coords: [{lat: 17.620, lng: 121.727}, {lat: 17.622, lng: 121.730}] },
      ];

      floodedRoads.forEach((road, index) => {
        if (Math.random() < multiplier) {
          closures.push({
            id: `closure-${index}`,
            roadName: road.name,
            reason: 'flooded',
            severity: Math.min(5, Math.round(multiplier * 5 * this.getRandomInRange(0.8, 1.2))),
            coordinates: road.coords,
          });
        }
      });
    }

    return closures;
  }

  generateSPUPRoutes(): SPUPRoute[] {
    const routes: SPUPRoute[] = [];
    const floodMultiplier = this.getFloodMultiplier();

    SPUP_DORMS_AND_BOARDING.forEach((location, index) => {
      const nearestCenter = EVACUATION_CENTERS[0];
      const distance = this.calculateDistance(location.lat, location.lng, nearestCenter.lat, nearestCenter.lng);
      const floodRisk = Math.min(5, Math.round(floodMultiplier * 5));

      let safety: 'safe' | 'moderate' | 'danger' = 'safe';
      if (floodRisk >= 4) safety = 'danger';
      else if (floodRisk >= 2) safety = 'moderate';

      routes.push({
        id: `spup-route-${index}`,
        name: `${location.name} → ${nearestCenter.name}`,
        from: location.name,
        fromLat: location.lat,
        fromLng: location.lng,
        to: nearestCenter.name,
        toLat: nearestCenter.lat,
        toLng: nearestCenter.lng,
        distance: Math.round(distance * 1000),
        duration: Math.round((distance / 30) * 60),
        safety,
        floodRisk,
      });
    });

    TRANSPORT_TERMINALS.forEach((terminal, index) => {
      const nearestCenter = EVACUATION_CENTERS[1];
      const distance = this.calculateDistance(terminal.lat, terminal.lng, nearestCenter.lat, nearestCenter.lng);
      const floodRisk = Math.min(5, Math.round(floodMultiplier * 4));

      let safety: 'safe' | 'moderate' | 'danger' = 'safe';
      if (floodRisk >= 4) safety = 'danger';
      else if (floodRisk >= 2) safety = 'moderate';

      routes.push({
        id: `terminal-route-${index}`,
        name: `${terminal.name} → ${nearestCenter.name}`,
        from: terminal.name,
        fromLat: terminal.lat,
        fromLng: terminal.lng,
        to: nearestCenter.name,
        toLat: nearestCenter.lat,
        toLng: nearestCenter.lng,
        distance: Math.round(distance * 1000),
        duration: Math.round((distance / 25) * 60),
        safety,
        floodRisk,
      });
    });

    return routes;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  getStatistics() {
    const centers = this.generateEvacuationCenters();
    const vehicles = this.generateVehicles();
    const alerts = this.generateHazardAlerts();

    return {
      totalCenters: centers.length,
      operationalCenters: centers.filter(c => c.status === 'operational').length,
      totalEvacuees: centers.reduce((sum, c) => sum + c.capacity_current, 0),
      availableVehicles: vehicles.filter(v => v.status === 'available').length,
      activeAlerts: alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length,
    };
  }
}

export const simulationManager = new SimulationManager();
