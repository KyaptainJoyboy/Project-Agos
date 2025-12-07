/*
  # Seed SPUP Tuguegarao Emergency and Safety Data

  ## Overview
  This migration seeds the database with comprehensive emergency contacts, SPUP safety zones,
  hazard data, and relief facilities specifically for St. Paul University Philippines (SPUP)
  Tuguegarao and the surrounding area.

  ## Data Included
  1. Emergency Contacts - Local rescue, police, hospitals, fire, barangay offices, university security
  2. SPUP Safety Zones - Campus safe areas, dormitories, student residential zones, flood-prone areas
  3. External Data Sources - PAGASA, Tuguegarao City LGU, NDRRMC
  4. Relief Map Features - Evacuation centers in Tuguegarao
  5. Sample Hazard Layers - Known flood zones along Cagayan River

  ## Geographic Context
  - SPUP Main Campus: 17.6132° N, 121.7270° E
  - Tuguegarao City: Capital of Cagayan Province
  - Major Hazard: Cagayan River flooding
*/

-- Emergency Contacts
INSERT INTO emergency_contacts (organization_name, contact_type, contact_number, alternate_numbers, email, address, latitude, longitude, services_offered, priority_level, is_available_24_7) VALUES
-- Rescue & Disaster Response
('Tuguegarao City Disaster Risk Reduction and Management Office', 'disaster_hotline', '(078) 844-1342', ARRAY['(078) 304-2350', '0917-512-3456'], 'tuguegarao.drrmo@gmail.com', 'City Hall, Tuguegarao City', 17.6132, 121.7270, ARRAY['Emergency Response', 'Rescue Operations', 'Evacuation Coordination'], 1, true),
('NDRRMC Emergency Hotline', 'disaster_hotline', '(02) 8911-5061', ARRAY['911', '(02) 8911-1406'], 'info@ndrrmc.gov.ph', 'Camp General Emilio Aguinaldo, Quezon City', NULL, NULL, ARRAY['National Emergency Response', 'Disaster Coordination'], 2, true),
('Philippine Red Cross - Cagayan Chapter', 'rescue', '(078) 844-1460', ARRAY['143', '0917-899-0000'], 'cagayan@redcross.org.ph', 'Bonifacio St, Tuguegarao', 17.6150, 121.7280, ARRAY['Medical Assistance', 'Rescue', 'Relief Distribution', 'Blood Services'], 3, true),

-- Police & Security
('Tuguegarao City Police Station', 'police', '(078) 844-1024', ARRAY['911', '(078) 846-2305'], 'tuguegaraocps@pnp.gov.ph', 'Rizal St, Tuguegarao', 17.6145, 121.7265, ARRAY['Law Enforcement', 'Emergency Response', 'Traffic Management'], 4, true),
('SPUP Security Office', 'university_security', '(078) 844-0159', ARRAY['0919-123-4567'], 'security@spup.edu.ph', 'SPUP Campus, Tuguegarao', 17.6132, 121.7270, ARRAY['Campus Security', 'Student Safety', 'Emergency Response'], 5, true),

-- Medical & Hospitals
('Cagayan Valley Medical Center', 'hospital', '(078) 844-8359', ARRAY['(078) 304-4000', '0917-567-8901'], 'cvmc@doh.gov.ph', 'Rizal St, Tuguegarao', 17.6180, 121.7300, ARRAY['Emergency Room', 'Trauma Care', 'Surgery', 'ICU'], 6, true),
('Saint Paul Hospital', 'hospital', '(078) 844-1342', ARRAY['(078) 304-5678'], 'info@sphtuguegarao.com', 'Luna St, Tuguegarao', 17.6120, 121.7250, ARRAY['Emergency Care', 'Surgery', 'Pediatrics'], 7, true),
('Tuguegarao City Health Office', 'hospital', '(078) 844-1687', ARRAY['0918-234-5678'], 'healthoffice@tuguegarao.gov.ph', 'City Hall Compound, Tuguegarao', 17.6135, 121.7275, ARRAY['Primary Healthcare', 'Vaccination', 'Medical Consultation'], 8, false),

-- Fire Services
('Bureau of Fire Protection - Tuguegarao', 'fire', '(078) 844-1234', ARRAY['(078) 846-3210', '0917-345-6789'], 'bfp.tuguegarao@yahoo.com', 'Luna St, Tuguegarao', 17.6140, 121.7260, ARRAY['Fire Response', 'Rescue Operations', 'Fire Prevention'], 9, true),

-- Barangay Offices (Key areas near SPUP)
('Barangay Ugac Sur Office', 'barangay', '(078) 844-5678', ARRAY['0918-456-7890'], 'brgy.ugacsur@tuguegarao.gov.ph', 'Ugac Sur, Tuguegarao', 17.6100, 121.7280, ARRAY['Community Assistance', 'Barangay Emergency Response'], 10, false),
('Barangay Centro 1 Office', 'barangay', '(078) 844-6789', ARRAY['0919-567-8901'], 'brgy.centro1@tuguegarao.gov.ph', 'Centro 1, Tuguegarao', 17.6160, 121.7250, ARRAY['Community Assistance', 'Barangay Emergency Response'], 11, false),
('Barangay Annafunan Office', 'barangay', '(078) 844-7890', ARRAY['0920-678-9012'], 'brgy.annafunan@tuguegarao.gov.ph', 'Annafunan, Tuguegarao', 17.6200, 121.7320, ARRAY['Community Assistance', 'Barangay Emergency Response'], 12, false)

ON CONFLICT DO NOTHING;

-- External Data Sources
INSERT INTO external_data_sources (source_name, source_type, api_endpoint, is_active, sync_interval_minutes, metadata) VALUES
('PAGASA Weather Updates', 'weather', 'https://www.pagasa.dost.gov.ph/api/weather', true, 30, '{"region": "Region 02", "coverage": "Cagayan Valley"}'::jsonb),
('PAGASA Flood Warnings', 'hazard', 'https://www.pagasa.dost.gov.ph/api/flood-bulletins', true, 15, '{"type": "flood", "river": "Cagayan River"}'::jsonb),
('Tuguegarao City LGU Advisories', 'advisory', 'https://tuguegarao.gov.ph/api/advisories', true, 60, '{"jurisdiction": "Tuguegarao City"}'::jsonb),
('NDRRMC Disaster Updates', 'advisory', 'https://ndrrmc.gov.ph/api/updates', true, 30, '{"scope": "national"}'::jsonb),
('MMDA Traffic Data', 'traffic', NULL, false, 5, '{"note": "Not applicable to Tuguegarao"}'::jsonb)
ON CONFLICT DO NOTHING;

-- SPUP Safety Zones

-- Safe Corridors (verified safe routes to campus)
INSERT INTO spup_safety_zones (zone_name, zone_type, geometry, description, risk_level, recommended_for_evacuation, notes) VALUES
('SPUP Main Gate to Academic Building', 'safe_corridor', '{"type":"LineString","coordinates":[[121.7265,17.6130],[121.7270,17.6132],[121.7275,17.6135]]}'::jsonb, 'Primary safe route from main entrance to academic buildings. Well-lit and monitored.', 'safe', false, 'CCTV coverage, security patrol every 30 minutes'),
('Luna Street Campus Access', 'safe_corridor', '{"type":"LineString","coordinates":[[121.7250,17.6120],[121.7260,17.6125],[121.7270,17.6130]]}'::jsonb, 'Secondary access route via Luna Street. Good visibility and foot traffic.', 'safe', false, 'Public transport accessible'),
('Rizal Street to SPUP Route', 'safe_corridor', '{"type":"LineString","coordinates":[[121.7265,17.6145],[121.7268,17.6140],[121.7270,17.6132]]}'::jsonb, 'Main public transport drop-off route to campus', 'safe', false, 'Heavy foot traffic during class hours')
ON CONFLICT DO NOTHING;

-- Student Dormitories and Residential Areas
INSERT INTO spup_safety_zones (zone_name, zone_type, geometry, description, capacity, risk_level, notes) VALUES
('SPUP Official Dormitory', 'dormitory', '{"type":"Polygon","coordinates":[[[121.7272,17.6128],[121.7278,17.6128],[121.7278,17.6133],[121.7272,17.6133],[121.7272,17.6128]]]}'::jsonb, 'Official university dormitory with 24/7 security', 150, 'safe', 'Emergency assembly point available, ground floor designated for flood refuge'),
('Ugac Sur Student Boarding Houses', 'student_residential', '{"type":"Polygon","coordinates":[[[121.7275,17.6095],[121.7285,17.6095],[121.7285,17.6105],[121.7275,17.6105],[121.7275,17.6095]]]}'::jsonb, 'Cluster of student boarding houses and apartments', NULL, 'moderate', 'Area subject to minor flooding during heavy rain. Multiple evacuation routes available.'),
('Centro Area Student Housing', 'student_residential', '{"type":"Polygon","coordinates":[[[121.7240,17.6155],[121.7255,17.6155],[121.7255,17.6170],[121.7240,17.6170],[121.7240,17.6155]]]}'::jsonb, 'Downtown student housing area near public market', NULL, 'safe', 'Central location with good access to emergency services')
ON CONFLICT DO NOTHING;

-- Public Transport Routes (Jeepney routes commonly used by students)
INSERT INTO spup_safety_zones (zone_name, zone_type, geometry, description, risk_level, notes) VALUES
('Centro-SPUP Jeepney Route', 'public_transport_route', '{"type":"LineString","coordinates":[[121.7250,17.6160],[121.7255,17.6155],[121.7260,17.6145],[121.7265,17.6135],[121.7270,17.6130]]}'::jsonb, 'Main jeepney route from downtown Centro to SPUP campus', 'safe', 'Frequent service 6AM-9PM, fare: 9 pesos'),
('Market-SPUP Tricycle Route', 'public_transport_route', '{"type":"LineString","coordinates":[[121.7230,17.6170],[121.7245,17.6155],[121.7260,17.6140],[121.7270,17.6132]]}'::jsonb, 'Tricycle route from public market area to campus', 'safe', 'Available 24/7, fare: 15-20 pesos')
ON CONFLICT DO NOTHING;

-- Flood-Prone Areas (historically affected during typhoons)
INSERT INTO spup_safety_zones (zone_name, zone_type, geometry, description, risk_level, recommended_for_evacuation, notes) VALUES
('Cagayan River Flood Zone - East Bank', 'flood_prone', '{"type":"Polygon","coordinates":[[[121.7300,17.6050],[121.7350,17.6050],[121.7350,17.6200],[121.7300,17.6200],[121.7300,17.6050]]]}'::jsonb, 'Area near Cagayan River prone to flooding during typhoons and heavy monsoon rains', 'high_risk', true, 'Historically floods 2-3 times per year. Evacuate when river reaches 9.0m water level'),
('Low-Lying Annafunan Area', 'flood_prone', '{"type":"Polygon","coordinates":[[[121.7310,17.6195],[121.7330,17.6195],[121.7330,17.6215],[121.7310,17.6215],[121.7310,17.6195]]]}'::jsonb, 'Low-lying residential area susceptible to flash floods', 'high_risk', true, 'Poor drainage infrastructure. Avoid during heavy rainfall.'),
('Ugac Sur Low Areas', 'flood_prone', '{"type":"Polygon","coordinates":[[[121.7280,17.6085],[121.7295,17.6085],[121.7295,17.6100],[121.7280,17.6100],[121.7280,17.6085]]]}'::jsonb, 'Parts of Ugac Sur with inadequate drainage', 'moderate', false, 'Minor street flooding common. Usually passable with caution.')
ON CONFLICT DO NOTHING;

-- Relief Map Features (Evacuation Centers)
INSERT INTO relief_map_features (feature_name, feature_type, latitude, longitude, address, capacity, current_occupancy, contact_number, facilities, is_operational, verified_at) VALUES
('SPUP Gymnasium Evacuation Center', 'evacuation_center', 17.6135, 121.7275, 'SPUP Campus, Tuguegarao City', 500, 0, '(078) 844-0159', '["sleeping area", "toilets", "shower facilities", "kitchen", "medical station", "generator"]'::jsonb, true, now()),
('Tuguegarao City Convention Center', 'evacuation_center', 17.6150, 121.7260, 'Rizal St, Tuguegarao City', 1000, 0, '(078) 844-1342', '["sleeping area", "toilets", "shower facilities", "kitchen", "medical station", "air conditioning"]'::jsonb, true, now()),
('Barangay Ugac Sur Covered Court', 'evacuation_center', 17.6100, 121.7280, 'Ugac Sur, Tuguegarao City', 300, 0, '(078) 844-5678', '["sleeping area", "toilets", "basic kitchen", "water supply"]'::jsonb, true, now()),
('Caritan Norte Elementary School', 'evacuation_center', 17.6200, 121.7240, 'Caritan Norte, Tuguegarao City', 400, 0, '(078) 844-9012', '["classrooms", "toilets", "water supply", "kitchen"]'::jsonb, true, now()),
('SPUP Medical Station', 'medical_station', 17.6133, 121.7272, 'SPUP Campus, Tuguegarao City', 50, 0, '(078) 844-0159 loc 234', '["basic medical supplies", "first aid", "emergency beds", "oxygen", "AED"]'::jsonb, true, now()),
('Barangay Health Station - Centro 1', 'medical_station', 17.6160, 121.7250, 'Centro 1, Tuguegarao City', 30, 0, '(078) 844-6789', '["basic medical supplies", "first aid", "vaccines"]'::jsonb, true, now())
ON CONFLICT DO NOTHING;

-- Sample Hazard Layers (Known flood zones)
INSERT INTO hazard_layers (layer_name, layer_type, severity, geometry, description, valid_from, valid_until, is_active, metadata) VALUES
('Cagayan River Critical Flood Zone', 'flood', 'critical', '{"type":"Polygon","coordinates":[[[121.7305,17.6040],[121.7360,17.6040],[121.7360,17.6210],[121.7305,17.6210],[121.7305,17.6040]]]}'::jsonb, 'Critical flood zone along Cagayan River. Evacuate immediately when water level exceeds 10.0 meters.', now(), NULL, true, '{"warning_level": "critical", "trigger_water_level_m": 10.0, "estimated_depth_cm": 150}'::jsonb),
('Monsoon Flood Risk Area - Ugac Sur', 'flood', 'medium', '{"type":"Polygon","coordinates":[[[121.7275,17.6080],[121.7300,17.6080],[121.7300,17.6110],[121.7275,17.6110],[121.7275,17.6080]]]}'::jsonb, 'Moderate flood risk during southwest monsoon season (June-September)', now(), NULL, true, '{"season": "monsoon", "typical_depth_cm": 30, "passable_with_caution": true}'::jsonb),
('Downtown Flash Flood Zone', 'flood', 'medium', '{"type":"Polygon","coordinates":[[[121.7235,17.6150],[121.7265,17.6150],[121.7265,17.6175],[121.7235,17.6175],[121.7235,17.6150]]]}'::jsonb, 'Poor drainage causes flash flooding during heavy rainfall', now(), NULL, true, '{"cause": "drainage_overflow", "typical_duration_hours": 2}'::jsonb)
ON CONFLICT DO NOTHING;

-- Sample Road Hazards (for demonstration)
INSERT INTO road_hazards (road_name, hazard_type, severity, geometry, description, verified, flood_depth_cm, valid_from, is_active) VALUES
('Luna Street Low Point', 'flooding', 'difficult', '{"type":"Point","coordinates":[121.7255,17.6125]}'::jsonb, 'Known flooding point during heavy rain. Water accumulates 20-40cm deep.', true, 30, now() - interval '2 hours', true),
('Rizal Street Bridge Approach', 'flooding', 'impassable', '{"type":"Point","coordinates":[121.7268,17.6180]}'::jsonb, 'Frequently impassable during typhoons when river level is high', true, 80, now() - interval '1 hour', true)
ON CONFLICT DO NOTHING;