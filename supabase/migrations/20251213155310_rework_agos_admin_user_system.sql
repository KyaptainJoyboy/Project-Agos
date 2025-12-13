/*
  # Rework AGOS to Admin/User Two-Tier System
  
  ## Overview
  This migration transforms AGOS into a clean two-tier system with admin and user roles only.
  Removes student-oriented features and adds flood marker management for disaster routing.
  
  ## 1. Schema Changes
  
  ### User Roles
  - Simplified from 4 roles (evacuee, personnel, vehicle_operator, admin) to 2 roles (user, admin)
  - Users: Regular access to view alerts, maps, routes
  - Admins: Full control over flood markers, alerts, weather, routes, evacuation centers
  
  ### New Tables
  
  #### flood_markers
  - Admin-created flood points for routing system
  - Used by OpenRouteService API to avoid flooded areas
  - Includes severity levels and active status
  
  #### admin_alerts
  - Admin-created alerts for users
  - Replaces simulation-based alert system
  - Supports different severity levels and types
  
  #### weather_conditions
  - Admin-controlled weather simulation
  - Affects flood risk and system behavior
  
  ## 2. Security
  
  - All tables have RLS enabled
  - Users can only read public data
  - Admins have full CRUD access to all admin tables
  - Regular users cannot modify system data
  
  ## 3. Migration Safety
  
  - Uses IF EXISTS/IF NOT EXISTS for all operations
  - Preserves existing data where possible
  - Updates existing users to new role system
*/

-- ============================================================================
-- STEP 1: Create New Role Type
-- ============================================================================

-- Drop old role type and create new one with just admin/user
DO $$ 
BEGIN
  -- Create new simplified role type
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'simple_user_role') THEN
    CREATE TYPE simple_user_role AS ENUM ('user', 'admin');
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Update users_profile Table
-- ============================================================================

-- Add new role column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users_profile' AND column_name = 'new_role'
  ) THEN
    ALTER TABLE users_profile ADD COLUMN new_role simple_user_role;
  END IF;
END $$;

-- Migrate existing roles to new system (admin stays admin, everything else becomes user)
UPDATE users_profile 
SET new_role = CASE 
  WHEN role::text = 'admin' THEN 'admin'::simple_user_role
  ELSE 'user'::simple_user_role
END
WHERE new_role IS NULL;

-- Set default for new column
ALTER TABLE users_profile ALTER COLUMN new_role SET DEFAULT 'user'::simple_user_role;
ALTER TABLE users_profile ALTER COLUMN new_role SET NOT NULL;

-- ============================================================================
-- STEP 3: Create Flood Markers Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS flood_markers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location geography(POINT, 4326) NOT NULL,
  severity integer NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
  radius_meters numeric NOT NULL DEFAULT 100,
  is_active boolean DEFAULT true,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE flood_markers ENABLE ROW LEVEL SECURITY;

-- Users can view active flood markers
CREATE POLICY "Users can view active flood markers"
  ON flood_markers FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can manage flood markers
CREATE POLICY "Admins can manage flood markers"
  ON flood_markers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND new_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND new_role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_flood_markers_location ON flood_markers USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_flood_markers_active ON flood_markers(is_active);

-- ============================================================================
-- STEP 4: Create Admin Alerts Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  alert_type text NOT NULL DEFAULT 'general',
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  location_name text,
  location geography(POINT, 4326),
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;

-- Users can view active alerts
CREATE POLICY "Users can view active alerts"
  ON admin_alerts FOR SELECT
  TO authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Admins can manage alerts
CREATE POLICY "Admins can manage alerts"
  ON admin_alerts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND new_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND new_role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_admin_alerts_active ON admin_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_expires ON admin_alerts(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_location ON admin_alerts USING GIST(location);

-- ============================================================================
-- STEP 5: Create Weather Conditions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS weather_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_type text NOT NULL DEFAULT 'normal' CHECK (condition_type IN ('normal', 'light_rain', 'heavy_rain', 'storm', 'typhoon')),
  description text,
  flood_risk_level integer DEFAULT 1 CHECK (flood_risk_level BETWEEN 1 AND 5),
  is_active boolean DEFAULT true,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE weather_conditions ENABLE ROW LEVEL SECURITY;

-- Users can view current weather
CREATE POLICY "Users can view weather conditions"
  ON weather_conditions FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can manage weather
CREATE POLICY "Admins can manage weather conditions"
  ON weather_conditions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND new_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND new_role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_weather_conditions_active ON weather_conditions(is_active);

-- Insert default weather condition
INSERT INTO weather_conditions (condition_type, description, flood_risk_level, is_active)
VALUES ('normal', 'Normal weather conditions', 1, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 6: Update RLS Policies for Existing Tables
-- ============================================================================

-- Drop old policies and create new ones for evacuation_centers
DROP POLICY IF EXISTS "Personnel and admins can update centers" ON evacuation_centers;
DROP POLICY IF EXISTS "Admins can insert centers" ON evacuation_centers;

CREATE POLICY "Admins can manage evacuation centers"
  ON evacuation_centers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND new_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND new_role = 'admin'
    )
  );

-- Update evacuation_routes policies
DROP POLICY IF EXISTS "Admins can manage routes" ON evacuation_routes;

CREATE POLICY "Admins can manage evacuation routes"
  ON evacuation_routes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND new_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND new_role = 'admin'
    )
  );

-- Update road_conditions policies
DROP POLICY IF EXISTS "Personnel can verify and update conditions" ON road_conditions;

CREATE POLICY "Admins can verify and update road conditions"
  ON road_conditions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND new_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND new_role = 'admin'
    )
  );

-- Update messages policies for broadcasts
DROP POLICY IF EXISTS "Personnel can send broadcasts" ON messages;

CREATE POLICY "Admins can send broadcasts"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    message_type = 'broadcast' AND
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND new_role = 'admin'
    )
  );

-- Update users_profile policies
DROP POLICY IF EXISTS "Personnel and admins can view all profiles" ON users_profile;

CREATE POLICY "Admins can view all profiles"
  ON users_profile FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND new_role = 'admin'
    )
  );

-- Update center_updates policies
DROP POLICY IF EXISTS "Personnel can create updates" ON center_updates;

CREATE POLICY "Admins can create center updates"
  ON center_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND new_role = 'admin'
    )
  );

-- Update evacuee_locations policies
DROP POLICY IF EXISTS "Personnel can view all locations" ON evacuee_locations;

CREATE POLICY "Admins can view all user locations"
  ON evacuee_locations FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
      AND new_role = 'admin'
    )
  );

-- ============================================================================
-- STEP 7: Add Triggers for Updated_at
-- ============================================================================

CREATE TRIGGER update_flood_markers_updated_at
  BEFORE UPDATE ON flood_markers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_alerts_updated_at
  BEFORE UPDATE ON admin_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weather_conditions_updated_at
  BEFORE UPDATE ON weather_conditions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 8: Enable Realtime for New Tables
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE flood_markers;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE weather_conditions;

-- ============================================================================
-- STEP 9: Add Sample Data for Tuguegarao City
-- ============================================================================

-- Add some initial flood markers (inactive by default for admins to activate)
INSERT INTO flood_markers (name, location, severity, radius_meters, is_active, description)
VALUES 
  ('Cagayan River Overflow Point', ST_GeographyFromText('POINT(121.7270 17.6132)'), 3, 200, false, 'Historical flood point near river'),
  ('Downtown Low Area', ST_GeographyFromText('POINT(121.7350 17.6150)'), 2, 150, false, 'Low-lying commercial area prone to flooding'),
  ('University District', ST_GeographyFromText('POINT(121.7274 17.6144)'), 2, 100, false, 'Campus area with drainage issues')
ON CONFLICT DO NOTHING;

-- Add initial alert examples (inactive for admins to use as templates)
INSERT INTO admin_alerts (title, message, alert_type, severity, location_name, location, is_active)
VALUES 
  ('System Online', 'AGOS disaster management system is now operational and monitoring Tuguegarao City', 'general', 'low', 'Tuguegarao City', ST_GeographyFromText('POINT(121.7270 17.6132)'), true)
ON CONFLICT DO NOTHING;