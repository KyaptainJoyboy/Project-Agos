/*
  # AGOS - Advanced Geohazard Observation and Monitoring System
  ## Database Schema for Disaster Evacuation Management

  This migration creates the complete database structure for the AGOS platform,
  designed for Tuguegarao City, Cagayan flood evacuation management.

  ## 1. New Tables

  ### users_profile
  - Extended user profile with role-based access control
  - Roles: evacuee, personnel, vehicle_operator, admin
  - Tracks user location permissions and notification preferences
  - Links to auth.users

  ### evacuation_centers
  - Physical evacuation center locations in Tuguegarao City
  - Capacity tracking (current/maximum)
  - Real-time status (operational, full, closed)
  - Amenities and contact information
  - Geographic coordinates for mapping

  ### evacuation_routes
  - Pre-defined evacuation routes from various points to centers
  - Offline-downloadable route geometry (GeoJSON)
  - Priority levels and distance/duration estimates
  - Version tracking for updates

  ### route_packages
  - Downloadable packages containing routes and map tiles
  - Version management for offline updates
  - File size and coverage area information

  ### road_conditions
  - Real-time road status (passable, flooded, blocked, unknown)
  - User-reported and official updates
  - Severity ratings and timestamps
  - Geographic segments with coordinates

  ### messages
  - Two-way communication between evacuees and personnel
  - Support for broadcast and direct messages
  - Offline queue support with sync status
  - Priority levels for urgent communications

  ### vehicles
  - Transportation assets (buses, trucks, boats)
  - Capacity and vehicle type information
  - Current assignment and availability status

  ### vehicle_tracking
  - Real-time vehicle location updates
  - Route assignments and ETAs
  - Speed and heading for trajectory calculation

  ### evacuee_locations
  - Opt-in location sharing by evacuees
  - Privacy-focused with expiration timestamps
  - Emergency status flags
  - Battery level tracking for rescue prioritization

  ### center_updates
  - Time-series capacity and status updates
  - Resource availability tracking
  - Automated and manual update sources

  ## 2. Security

  - Row Level Security (RLS) enabled on all tables
  - Role-based access policies for each user type
  - Evacuees can only see their own data and public information
  - Personnel and admins have expanded access based on role
  - Vehicle operators can update their vehicle tracking data
  - Public read access for evacuation centers and routes

  ## 3. Indexes

  - Geospatial indexes for location-based queries
  - Timestamp indexes for real-time updates
  - Foreign key indexes for join performance

  ## 4. Real-time Subscriptions

  - All tables configured for Supabase Realtime
  - Enables live updates for center capacity, vehicle tracking, messages
*/

-- Enable PostGIS extension for geospatial data
CREATE EXTENSION IF NOT EXISTS postgis;

-- User roles enum
CREATE TYPE user_role AS ENUM ('evacuee', 'personnel', 'vehicle_operator', 'admin');

-- Road condition status enum
CREATE TYPE road_status AS ENUM ('passable', 'flooded', 'blocked', 'unknown');

-- Message types enum
CREATE TYPE message_type AS ENUM ('broadcast', 'direct', 'alert');

-- Center status enum
CREATE TYPE center_status AS ENUM ('operational', 'full', 'closed', 'emergency');

-- Vehicle types enum
CREATE TYPE vehicle_type AS ENUM ('bus', 'truck', 'boat', 'ambulance', 'other');

-- ============================================================================
-- USERS PROFILE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users_profile (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'evacuee',
  full_name text NOT NULL,
  phone_number text,
  location_permission_granted boolean DEFAULT false,
  notification_enabled boolean DEFAULT true,
  emergency_contact text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users_profile FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users_profile FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Personnel and admins can view all profiles"
  ON users_profile FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND role IN ('personnel', 'admin')
    )
  );

-- ============================================================================
-- EVACUATION CENTERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS evacuation_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  location geography(POINT, 4326) NOT NULL,
  capacity_max integer NOT NULL DEFAULT 0,
  capacity_current integer NOT NULL DEFAULT 0,
  status center_status NOT NULL DEFAULT 'operational',
  amenities jsonb DEFAULT '[]'::jsonb,
  contact_person text,
  contact_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE evacuation_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view evacuation centers"
  ON evacuation_centers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Personnel and admins can update centers"
  ON evacuation_centers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND role IN ('personnel', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND role IN ('personnel', 'admin')
    )
  );

CREATE POLICY "Admins can insert centers"
  ON evacuation_centers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE INDEX idx_centers_location ON evacuation_centers USING GIST(location);
CREATE INDEX idx_centers_status ON evacuation_centers(status);

-- ============================================================================
-- EVACUATION ROUTES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS evacuation_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_location geography(POINT, 4326) NOT NULL,
  end_center_id uuid REFERENCES evacuation_centers(id) ON DELETE CASCADE,
  route_geometry jsonb NOT NULL,
  distance_meters numeric NOT NULL,
  estimated_duration_minutes integer NOT NULL,
  priority integer DEFAULT 1,
  version integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE evacuation_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active routes"
  ON evacuation_routes FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage routes"
  ON evacuation_routes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE INDEX idx_routes_center ON evacuation_routes(end_center_id);
CREATE INDEX idx_routes_active ON evacuation_routes(is_active);

-- ============================================================================
-- ROUTE PACKAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS route_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  version text NOT NULL,
  file_size_bytes bigint NOT NULL,
  coverage_area geography(POLYGON, 4326) NOT NULL,
  route_ids uuid[] NOT NULL,
  tile_url_template text,
  min_zoom integer DEFAULT 10,
  max_zoom integer DEFAULT 16,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE route_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view route packages"
  ON route_packages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage packages"
  ON route_packages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- ROAD CONDITIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS road_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  road_name text NOT NULL,
  location geography(LINESTRING, 4326) NOT NULL,
  status road_status NOT NULL DEFAULT 'unknown',
  severity integer DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
  reported_by uuid REFERENCES auth.users(id),
  verified_by uuid REFERENCES auth.users(id),
  description text,
  photo_url text,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE road_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view road conditions"
  ON road_conditions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can report conditions"
  ON road_conditions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Personnel can verify and update conditions"
  ON road_conditions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND role IN ('personnel', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND role IN ('personnel', 'admin')
    )
  );

CREATE INDEX idx_road_conditions_location ON road_conditions USING GIST(location);
CREATE INDEX idx_road_conditions_status ON road_conditions(status);
CREATE INDEX idx_road_conditions_expires ON road_conditions(expires_at);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  message_type message_type NOT NULL DEFAULT 'direct',
  subject text,
  content text NOT NULL,
  priority integer DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  is_read boolean DEFAULT false,
  sync_status text DEFAULT 'synced',
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid() 
    OR recipient_id = auth.uid() 
    OR message_type = 'broadcast'
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Recipients can mark as read"
  ON messages FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "Personnel can send broadcasts"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    message_type = 'broadcast' AND
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND role IN ('personnel', 'admin')
    )
  );

CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_type ON messages(message_type);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- ============================================================================
-- VEHICLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_number text NOT NULL UNIQUE,
  vehicle_type vehicle_type NOT NULL DEFAULT 'bus',
  capacity integer NOT NULL DEFAULT 0,
  operator_id uuid REFERENCES auth.users(id),
  is_available boolean DEFAULT true,
  current_assignment text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Vehicle operators can update their vehicle"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (operator_id = auth.uid())
  WITH CHECK (operator_id = auth.uid());

CREATE POLICY "Admins can manage vehicles"
  ON vehicles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE INDEX idx_vehicles_operator ON vehicles(operator_id);
CREATE INDEX idx_vehicles_available ON vehicles(is_available);

-- ============================================================================
-- VEHICLE TRACKING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS vehicle_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  location geography(POINT, 4326) NOT NULL,
  heading numeric,
  speed_kmh numeric,
  destination_center_id uuid REFERENCES evacuation_centers(id),
  eta_minutes integer,
  passengers_current integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vehicle_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vehicle tracking"
  ON vehicle_tracking FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Vehicle operators can update tracking"
  ON vehicle_tracking FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vehicles v
      WHERE v.id = vehicle_id
      AND v.operator_id = auth.uid()
    )
  );

CREATE INDEX idx_vehicle_tracking_vehicle ON vehicle_tracking(vehicle_id);
CREATE INDEX idx_vehicle_tracking_location ON vehicle_tracking USING GIST(location);
CREATE INDEX idx_vehicle_tracking_time ON vehicle_tracking(created_at DESC);

-- ============================================================================
-- EVACUEE LOCATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS evacuee_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location geography(POINT, 4326) NOT NULL,
  accuracy_meters numeric,
  battery_level integer CHECK (battery_level BETWEEN 0 AND 100),
  is_emergency boolean DEFAULT false,
  status_message text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '1 hour')
);

ALTER TABLE evacuee_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their location"
  ON evacuee_locations FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Personnel can view all locations"
  ON evacuee_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND role IN ('personnel', 'admin')
    )
  );

CREATE INDEX idx_evacuee_locations_user ON evacuee_locations(user_id);
CREATE INDEX idx_evacuee_locations_location ON evacuee_locations USING GIST(location);
CREATE INDEX idx_evacuee_locations_emergency ON evacuee_locations(is_emergency);
CREATE INDEX idx_evacuee_locations_expires ON evacuee_locations(expires_at);

-- ============================================================================
-- CENTER UPDATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS center_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid REFERENCES evacuation_centers(id) ON DELETE CASCADE NOT NULL,
  capacity_current integer NOT NULL,
  status center_status NOT NULL,
  resources_available jsonb DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE center_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view center updates"
  ON center_updates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Personnel can create updates"
  ON center_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND role IN ('personnel', 'admin')
    )
  );

CREATE INDEX idx_center_updates_center ON center_updates(center_id);
CREATE INDEX idx_center_updates_time ON center_updates(created_at DESC);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_profile_updated_at
  BEFORE UPDATE ON users_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evacuation_centers_updated_at
  BEFORE UPDATE ON evacuation_centers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evacuation_routes_updated_at
  BEFORE UPDATE ON evacuation_routes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_road_conditions_updated_at
  BEFORE UPDATE ON road_conditions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE evacuation_centers;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE evacuee_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE road_conditions;
ALTER PUBLICATION supabase_realtime ADD TABLE center_updates;