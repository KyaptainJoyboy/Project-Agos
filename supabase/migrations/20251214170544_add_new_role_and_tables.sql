/*
  # Add new_role Column and Missing Tables

  1. Schema Changes
    - Add `new_role` column to `users_profile` table
    - Create `simple_user_role` enum type
    - Migrate existing roles to new system
    
  2. New Tables
    - `admin_alerts` - Admin-created alerts
    - `weather_conditions` - Weather simulation
    - `flood_markers` - Flood zone markers (if not exists)
    
  3. Security
    - Enable RLS on all new tables
    - Add basic policies for authenticated users
*/

-- Create new simplified role type if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'simple_user_role') THEN
    CREATE TYPE simple_user_role AS ENUM ('user', 'admin');
  END IF;
END $$;

-- Add new role column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users_profile' AND column_name = 'new_role'
  ) THEN
    ALTER TABLE users_profile ADD COLUMN new_role simple_user_role;
  END IF;
END $$;

-- Migrate existing roles to new system
UPDATE users_profile 
SET new_role = CASE 
  WHEN role::text = 'admin' THEN 'admin'::simple_user_role
  ELSE 'user'::simple_user_role
END
WHERE new_role IS NULL;

-- Set default and not null
DO $$
BEGIN
  ALTER TABLE users_profile ALTER COLUMN new_role SET DEFAULT 'user'::simple_user_role;
  ALTER TABLE users_profile ALTER COLUMN new_role SET NOT NULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Create flood_markers table if not exists
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

DROP POLICY IF EXISTS "Users can view active flood markers" ON flood_markers;
CREATE POLICY "Users can view active flood markers"
  ON flood_markers FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE INDEX IF NOT EXISTS idx_flood_markers_location ON flood_markers USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_flood_markers_active ON flood_markers(is_active);

-- Create admin_alerts table if not exists
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

DROP POLICY IF EXISTS "Users can view active alerts" ON admin_alerts;
CREATE POLICY "Users can view active alerts"
  ON admin_alerts FOR SELECT
  TO authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE INDEX IF NOT EXISTS idx_admin_alerts_active ON admin_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_expires ON admin_alerts(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_location ON admin_alerts USING GIST(location);

-- Create weather_conditions table if not exists
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

DROP POLICY IF EXISTS "Users can view weather conditions" ON weather_conditions;
CREATE POLICY "Users can view weather conditions"
  ON weather_conditions FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE INDEX IF NOT EXISTS idx_weather_conditions_active ON weather_conditions(is_active);

-- Insert default weather condition
INSERT INTO weather_conditions (condition_type, description, flood_risk_level, is_active)
VALUES ('normal', 'Normal weather conditions', 1, true)
ON CONFLICT DO NOTHING;

-- Add initial alert
INSERT INTO admin_alerts (title, message, alert_type, severity, location_name, location, is_active)
VALUES 
  ('System Online', 'AGOS disaster management system is now operational', 'general', 'low', 'Tuguegarao City', ST_GeographyFromText('POINT(121.7270 17.6132)'), true)
ON CONFLICT DO NOTHING;