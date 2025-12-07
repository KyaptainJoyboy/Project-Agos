/*
  # Advanced Hazard Monitoring and Emergency Response System

  ## Overview
  This migration extends AGOS with comprehensive hazard tracking, emergency services,
  and SPUP-focused student safety features while maintaining offline-first capabilities.

  ## 1. New Tables

  ### External Data Sources
  - `external_data_sources` - Tracks PAGASA, LGU, traffic APIs, and government feeds
    - `id` (uuid, primary key)
    - `source_name` (text) - e.g., "PAGASA", "Tuguegarao LGU", "MMDA Traffic"
    - `source_type` (text) - "weather", "hazard", "traffic", "advisory"
    - `api_endpoint` (text) - URL for data fetching
    - `last_sync` (timestamptz) - Last successful data fetch
    - `is_active` (boolean) - Enable/disable source
    - `sync_interval_minutes` (integer) - How often to fetch
    - `metadata` (jsonb) - Additional config
    - `created_at`, `updated_at` (timestamptz)

  ### Hazard Layers
  - `hazard_layers` - Flood zones, landslide areas, typhoon paths, etc.
    - `id` (uuid, primary key)
    - `layer_name` (text) - "Flood Zone", "Landslide Risk", etc.
    - `layer_type` (text) - "flood", "landslide", "typhoon", "fire"
    - `severity` (text) - "low", "medium", "high", "critical"
    - `geometry` (jsonb) - GeoJSON polygon/line for hazard area
    - `description` (text)
    - `valid_from` (timestamptz)
    - `valid_until` (timestamptz)
    - `source_id` (uuid) - References external_data_sources
    - `is_active` (boolean)
    - `metadata` (jsonb) - Additional properties
    - `created_at`, `updated_at` (timestamptz)

  ### Relief Map Features
  - `relief_map_features` - Evacuation centers, medical stations, relief distribution points
    - `id` (uuid, primary key)
    - `feature_name` (text)
    - `feature_type` (text) - "evacuation_center", "medical_station", "relief_goods", "water_station"
    - `latitude` (decimal)
    - `longitude` (decimal)
    - `address` (text)
    - `capacity` (integer)
    - `current_occupancy` (integer)
    - `contact_number` (text)
    - `facilities` (jsonb) - Available amenities
    - `is_operational` (boolean)
    - `verified_at` (timestamptz)
    - `metadata` (jsonb)
    - `created_at`, `updated_at` (timestamptz)

  ### Road Hazards (Real-time)
  - `road_hazards` - Live road conditions, flooding, debris, closures
    - `id` (uuid, primary key)
    - `road_name` (text)
    - `hazard_type` (text) - "flooding", "debris", "closure", "landslide", "accident"
    - `severity` (text) - "passable", "difficult", "impassable"
    - `geometry` (jsonb) - GeoJSON line/point for affected area
    - `description` (text)
    - `reported_by` (uuid) - References auth.users (crowdsourced)
    - `verified` (boolean)
    - `flood_depth_cm` (integer) - For flooding hazards
    - `valid_from` (timestamptz)
    - `valid_until` (timestamptz)
    - `is_active` (boolean)
    - `created_at`, `updated_at` (timestamptz)

  ### Emergency Contacts
  - `emergency_contacts` - Rescue teams, hospitals, police, fire, barangay responders
    - `id` (uuid, primary key)
    - `organization_name` (text)
    - `contact_type` (text) - "rescue", "police", "hospital", "fire", "barangay", "disaster_hotline", "university_security"
    - `contact_number` (text)
    - `alternate_numbers` (text[])
    - `email` (text)
    - `address` (text)
    - `latitude` (decimal)
    - `longitude` (decimal)
    - `operating_hours` (text)
    - `services_offered` (text[])
    - `priority_level` (integer) - Display order
    - `is_available_24_7` (boolean)
    - `metadata` (jsonb)
    - `created_at`, `updated_at` (timestamptz)

  ### SPUP Student Safety Zones
  - `spup_safety_zones` - Safe corridors, dormitories, student residential areas
    - `id` (uuid, primary key)
    - `zone_name` (text)
    - `zone_type` (text) - "safe_corridor", "dormitory", "student_residential", "public_transport_route", "flood_prone"
    - `geometry` (jsonb) - GeoJSON polygon/line
    - `description` (text)
    - `capacity` (integer) - For dormitories
    - `risk_level` (text) - "safe", "moderate", "high_risk"
    - `recommended_for_evacuation` (boolean)
    - `notes` (text)
    - `metadata` (jsonb)
    - `created_at`, `updated_at` (timestamptz)

  ### Route Preferences
  - `route_preferences` - User-specific routing preferences
    - `id` (uuid, primary key)
    - `user_id` (uuid) - References auth.users
    - `avoid_flood_zones` (boolean, default true)
    - `avoid_landslide_areas` (boolean, default true)
    - `prefer_verified_safe_routes` (boolean, default true)
    - `max_acceptable_flood_depth_cm` (integer, default 0)
    - `preferred_transport_mode` (text) - "walking", "jeepney", "tricycle", "private"
    - `created_at`, `updated_at` (timestamptz)

  ### Distress Calls
  - `distress_calls` - Emergency SOS requests with location sharing
    - `id` (uuid, primary key)
    - `user_id` (uuid) - References auth.users
    - `latitude` (decimal)
    - `longitude` (decimal)
    - `emergency_type` (text) - "medical", "trapped", "accident", "fire", "flood", "other"
    - `description` (text)
    - `status` (text) - "active", "responded", "resolved", "cancelled"
    - `responded_by` (text) - Responder organization
    - `response_time` (timestamptz)
    - `resolved_at` (timestamptz)
    - `created_at`, `updated_at` (timestamptz)

  ### Cached Map Layers (for offline)
  - `cached_map_layers` - Downloaded hazard/relief maps for offline use
    - `id` (uuid, primary key)
    - `user_id` (uuid) - References auth.users
    - `layer_type` (text) - "hazard", "relief", "road_status"
    - `layer_data` (jsonb) - Full layer data
    - `downloaded_at` (timestamptz)
    - `expires_at` (timestamptz)
    - `size_bytes` (integer)

  ## 2. Security (RLS Policies)
  - All tables have RLS enabled
  - Public read access for hazard data, emergency contacts, relief features
  - Authenticated users can report road hazards (crowdsourced)
  - Only users can create their own distress calls
  - Route preferences are private to each user

  ## 3. Indexes
  - Geographic queries (latitude/longitude)
  - Time-based queries (valid_from, valid_until)
  - Type-based filtering
  - User-specific data
*/

-- External Data Sources
CREATE TABLE IF NOT EXISTS external_data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_type text NOT NULL,
  api_endpoint text,
  last_sync timestamptz,
  is_active boolean DEFAULT true,
  sync_interval_minutes integer DEFAULT 60,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE external_data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "External data sources are publicly readable"
  ON external_data_sources FOR SELECT
  TO public
  USING (true);

-- Hazard Layers
CREATE TABLE IF NOT EXISTS hazard_layers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_name text NOT NULL,
  layer_type text NOT NULL,
  severity text DEFAULT 'medium',
  geometry jsonb NOT NULL,
  description text,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  source_id uuid REFERENCES external_data_sources(id),
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE hazard_layers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hazard layers are publicly readable"
  ON hazard_layers FOR SELECT
  TO public
  USING (is_active = true);

CREATE INDEX IF NOT EXISTS idx_hazard_layers_type ON hazard_layers(layer_type);
CREATE INDEX IF NOT EXISTS idx_hazard_layers_active ON hazard_layers(is_active, valid_from, valid_until);

-- Relief Map Features
CREATE TABLE IF NOT EXISTS relief_map_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name text NOT NULL,
  feature_type text NOT NULL,
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  address text,
  capacity integer DEFAULT 0,
  current_occupancy integer DEFAULT 0,
  contact_number text,
  facilities jsonb DEFAULT '[]'::jsonb,
  is_operational boolean DEFAULT true,
  verified_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE relief_map_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Relief features are publicly readable"
  ON relief_map_features FOR SELECT
  TO public
  USING (is_operational = true);

CREATE INDEX IF NOT EXISTS idx_relief_features_type ON relief_map_features(feature_type);
CREATE INDEX IF NOT EXISTS idx_relief_features_location ON relief_map_features(latitude, longitude);

-- Road Hazards
CREATE TABLE IF NOT EXISTS road_hazards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  road_name text NOT NULL,
  hazard_type text NOT NULL,
  severity text DEFAULT 'passable',
  geometry jsonb NOT NULL,
  description text,
  reported_by uuid REFERENCES auth.users(id),
  verified boolean DEFAULT false,
  flood_depth_cm integer,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE road_hazards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Road hazards are publicly readable"
  ON road_hazards FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Authenticated users can report road hazards"
  ON road_hazards FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by);

CREATE INDEX IF NOT EXISTS idx_road_hazards_active ON road_hazards(is_active, valid_from);
CREATE INDEX IF NOT EXISTS idx_road_hazards_type ON road_hazards(hazard_type, severity);

-- Emergency Contacts
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL,
  contact_type text NOT NULL,
  contact_number text NOT NULL,
  alternate_numbers text[] DEFAULT ARRAY[]::text[],
  email text,
  address text,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  operating_hours text DEFAULT '24/7',
  services_offered text[] DEFAULT ARRAY[]::text[],
  priority_level integer DEFAULT 10,
  is_available_24_7 boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Emergency contacts are publicly readable"
  ON emergency_contacts FOR SELECT
  TO public
  USING (true);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_type ON emergency_contacts(contact_type, priority_level);

-- SPUP Safety Zones
CREATE TABLE IF NOT EXISTS spup_safety_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_name text NOT NULL,
  zone_type text NOT NULL,
  geometry jsonb NOT NULL,
  description text,
  capacity integer,
  risk_level text DEFAULT 'safe',
  recommended_for_evacuation boolean DEFAULT false,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE spup_safety_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SPUP safety zones are publicly readable"
  ON spup_safety_zones FOR SELECT
  TO public
  USING (true);

CREATE INDEX IF NOT EXISTS idx_spup_zones_type ON spup_safety_zones(zone_type, risk_level);

-- Route Preferences
CREATE TABLE IF NOT EXISTS route_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avoid_flood_zones boolean DEFAULT true,
  avoid_landslide_areas boolean DEFAULT true,
  prefer_verified_safe_routes boolean DEFAULT true,
  max_acceptable_flood_depth_cm integer DEFAULT 0,
  preferred_transport_mode text DEFAULT 'walking',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE route_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own route preferences"
  ON route_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own route preferences"
  ON route_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own route preferences"
  ON route_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Distress Calls
CREATE TABLE IF NOT EXISTS distress_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  emergency_type text NOT NULL,
  description text,
  status text DEFAULT 'active',
  responded_by text,
  response_time timestamptz,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE distress_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own distress calls"
  ON distress_calls FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own distress calls"
  ON distress_calls FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_distress_calls_status ON distress_calls(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_distress_calls_location ON distress_calls(latitude, longitude);

-- Cached Map Layers
CREATE TABLE IF NOT EXISTS cached_map_layers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  layer_type text NOT NULL,
  layer_data jsonb NOT NULL,
  downloaded_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  size_bytes integer DEFAULT 0
);

ALTER TABLE cached_map_layers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cached layers"
  ON cached_map_layers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cached layers"
  ON cached_map_layers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cached layers"
  ON cached_map_layers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cached_layers_user ON cached_map_layers(user_id, layer_type);