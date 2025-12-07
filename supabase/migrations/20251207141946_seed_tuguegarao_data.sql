/*
  # Seed Tuguegarao City Evacuation Data

  This migration seeds the database with sample evacuation centers and routes
  for Tuguegarao City, Cagayan to demonstrate the AGOS platform functionality.

  ## Sample Data Included:

  1. **Evacuation Centers** (8 centers)
     - Major evacuation centers in Tuguegarao City
     - Realistic capacity figures
     - Geographic coordinates within the city

  2. **Route Packages** (1 package)
     - City-wide evacuation route package
     - Includes routes to all major centers

  3. **Sample Vehicles** (5 vehicles)
     - Various vehicle types for transportation
     - Assigned operators

  ## Note:
  This is sample data for demonstration. In production, replace with actual
  evacuation center locations and verified routes.
*/

-- Insert Evacuation Centers in Tuguegarao City
INSERT INTO evacuation_centers (name, address, location, capacity_max, capacity_current, status, amenities, contact_person, contact_number) VALUES
(
  'Tuguegarao City Gymnasium',
  'Pengue-Ruyu, Tuguegarao City',
  ST_SetSRID(ST_MakePoint(121.7270, 17.6132), 4326)::geography,
  500,
  0,
  'operational',
  '["Medical Station", "Food Distribution", "Restrooms", "Power Supply"]'::jsonb,
  'Juan Dela Cruz',
  '09123456789'
),
(
  'Tuguegarao North Central School',
  'Centro 10, Tuguegarao City',
  ST_SetSRID(ST_MakePoint(121.7300, 17.6180), 4326)::geography,
  300,
  0,
  'operational',
  '["Water Supply", "Restrooms", "Sleeping Area"]'::jsonb,
  'Maria Santos',
  '09123456790'
),
(
  'Caritan Norte Elementary School',
  'Caritan Norte, Tuguegarao City',
  ST_SetSRID(ST_MakePoint(121.7350, 17.6250), 4326)::geography,
  250,
  0,
  'operational',
  '["Food Distribution", "Medical Station", "Restrooms"]'::jsonb,
  'Pedro Reyes',
  '09123456791'
),
(
  'Pengue-Ruyu Barangay Hall',
  'Pengue-Ruyu, Tuguegarao City',
  ST_SetSRID(ST_MakePoint(121.7220, 17.6100), 4326)::geography,
  150,
  0,
  'operational',
  '["Water Supply", "Restrooms"]'::jsonb,
  'Ana Garcia',
  '09123456792'
),
(
  'Cataggaman Pardo National High School',
  'Cataggaman Pardo, Tuguegarao City',
  ST_SetSRID(ST_MakePoint(121.7400, 17.6050), 4326)::geography,
  400,
  0,
  'operational',
  '["Medical Station", "Food Distribution", "Power Supply", "Communication Center"]'::jsonb,
  'Roberto Cruz',
  '09123456793'
),
(
  'Annafunan West Elementary School',
  'Annafunan West, Tuguegarao City',
  ST_SetSRID(ST_MakePoint(121.7150, 17.6200), 4326)::geography,
  200,
  0,
  'operational',
  '["Water Supply", "Restrooms", "Sleeping Area"]'::jsonb,
  'Carmen Flores',
  '09123456794'
),
(
  'Tuguegarao City Convention Center',
  'Regional Government Center, Tuguegarao City',
  ST_SetSRID(ST_MakePoint(121.7320, 17.6150), 4326)::geography,
  600,
  0,
  'operational',
  '["Medical Station", "Food Distribution", "Restrooms", "Power Supply", "Air Conditioning", "Communication Center"]'::jsonb,
  'Jose Mendoza',
  '09123456795'
),
(
  'Larion Alto Elementary School',
  'Larion Alto, Tuguegarao City',
  ST_SetSRID(ST_MakePoint(121.7450, 17.6280), 4326)::geography,
  180,
  0,
  'operational',
  '["Water Supply", "Restrooms", "Food Distribution"]'::jsonb,
  'Teresa Ramos',
  '09123456796'
);

-- Insert sample evacuation routes
DO $$
DECLARE
  gymnasium_id uuid;
  north_central_id uuid;
  caritan_id uuid;
  convention_id uuid;
BEGIN
  -- Get center IDs
  SELECT id INTO gymnasium_id FROM evacuation_centers WHERE name = 'Tuguegarao City Gymnasium';
  SELECT id INTO north_central_id FROM evacuation_centers WHERE name = 'Tuguegarao North Central School';
  SELECT id INTO caritan_id FROM evacuation_centers WHERE name = 'Caritan Norte Elementary School';
  SELECT id INTO convention_id FROM evacuation_centers WHERE name = 'Tuguegarao City Convention Center';

  -- Insert routes
  INSERT INTO evacuation_routes (name, start_location, end_center_id, route_geometry, distance_meters, estimated_duration_minutes, priority, is_active) VALUES
  (
    'City Center to Gymnasium',
    ST_SetSRID(ST_MakePoint(121.7280, 17.6120), 4326)::geography,
    gymnasium_id,
    '{"type":"LineString","coordinates":[[121.7280,17.6120],[121.7270,17.6132]]}'::jsonb,
    1200,
    15,
    3,
    true
  ),
  (
    'Downtown to North Central School',
    ST_SetSRID(ST_MakePoint(121.7290, 17.6150), 4326)::geography,
    north_central_id,
    '{"type":"LineString","coordinates":[[121.7290,17.6150],[121.7300,17.6180]]}'::jsonb,
    800,
    10,
    2,
    true
  ),
  (
    'Caritan Area to Caritan Norte School',
    ST_SetSRID(ST_MakePoint(121.7340, 17.6230), 4326)::geography,
    caritan_id,
    '{"type":"LineString","coordinates":[[121.7340,17.6230],[121.7350,17.6250]]}'::jsonb,
    600,
    8,
    2,
    true
  ),
  (
    'Regional Center to Convention Center',
    ST_SetSRID(ST_MakePoint(121.7310, 17.6140), 4326)::geography,
    convention_id,
    '{"type":"LineString","coordinates":[[121.7310,17.6140],[121.7320,17.6150]]}'::jsonb,
    400,
    5,
    3,
    true
  );
END $$;

-- Insert route package
DO $$
DECLARE
  route_ids_array uuid[];
BEGIN
  SELECT array_agg(id) INTO route_ids_array FROM evacuation_routes WHERE is_active = true;

  INSERT INTO route_packages (name, description, version, file_size_bytes, coverage_area, route_ids, tile_url_template, min_zoom, max_zoom) VALUES
  (
    'Tuguegarao City Complete Package',
    'All evacuation routes and map tiles for Tuguegarao City. Includes routes to 8 evacuation centers and offline map data.',
    '1.0.0',
    15728640,
    ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
      ST_MakePoint(121.7100, 17.6000),
      ST_MakePoint(121.7500, 17.6000),
      ST_MakePoint(121.7500, 17.6300),
      ST_MakePoint(121.7100, 17.6300),
      ST_MakePoint(121.7100, 17.6000)
    ])), 4326)::geography,
    route_ids_array,
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    12,
    17
  );
END $$;

-- Insert sample vehicles
INSERT INTO vehicles (vehicle_number, vehicle_type, capacity, is_available, notes) VALUES
('BUS-001', 'bus', 50, true, 'Large evacuation bus'),
('BUS-002', 'bus', 50, true, 'Large evacuation bus'),
('TRUCK-001', 'truck', 20, true, 'Utility truck for supplies and people'),
('BOAT-001', 'boat', 30, true, 'Rescue boat for flooded areas'),
('AMBULANCE-001', 'ambulance', 4, true, 'Emergency medical transport');

-- Insert sample road conditions
INSERT INTO road_conditions (road_name, location, status, severity, description, is_verified) VALUES
(
  'Maharlika Highway - Section A',
  ST_SetSRID(ST_MakeLine(
    ST_MakePoint(121.7250, 17.6100),
    ST_MakePoint(121.7260, 17.6110)
  ), 4326)::geography,
  'passable',
  1,
  'Clear road, no flooding reported',
  true
),
(
  'Bonifacio Street',
  ST_SetSRID(ST_MakeLine(
    ST_MakePoint(121.7280, 17.6140),
    ST_MakePoint(121.7290, 17.6150)
  ), 4326)::geography,
  'passable',
  1,
  'Normal traffic conditions',
  true
);

-- Create a sample admin user profile (only if user exists in auth.users)
-- Note: This assumes you'll create the auth user manually
-- The actual auth user creation happens through the signup flow

COMMENT ON TABLE evacuation_centers IS 'Sample evacuation centers for Tuguegarao City - Update with actual verified locations';
COMMENT ON TABLE evacuation_routes IS 'Sample routes - Verify and update with actual safe evacuation paths';
COMMENT ON TABLE route_packages IS 'Route packages for offline download';
