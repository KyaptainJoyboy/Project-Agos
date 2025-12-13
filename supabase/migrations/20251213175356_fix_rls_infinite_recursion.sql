/*
  # Fix RLS Infinite Recursion Issue

  ## Problem
  RLS policies were checking users_profile table to verify admin status, which caused
  infinite recursion when trying to read users_profile (policy checks profile while reading profile).

  ## Solution
  1. Store user role in auth.users.raw_app_meta_data for policy checks
  2. Update all policies to check auth.jwt() instead of querying users_profile
  3. Add function to sync role to metadata when profile is created/updated

  ## Changes
  - Drop all policies that query users_profile from within policies
  - Create new policies using auth.jwt()->>'user_role' 
  - Add trigger to keep metadata in sync with users_profile.new_role
*/

-- ============================================================================
-- STEP 1: Create function to sync role to auth metadata
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_user_role_to_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user's app_metadata with their role
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('user_role', NEW.new_role::text)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 2: Add trigger to sync role changes
-- ============================================================================

DROP TRIGGER IF EXISTS sync_user_role_metadata ON users_profile;

CREATE TRIGGER sync_user_role_metadata
  AFTER INSERT OR UPDATE OF new_role ON users_profile
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role_to_metadata();

-- ============================================================================
-- STEP 3: Sync existing roles to metadata
-- ============================================================================

UPDATE auth.users u
SET raw_app_meta_data = 
  COALESCE(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object('user_role', p.new_role::text)
FROM users_profile p
WHERE u.id = p.id;

-- ============================================================================
-- STEP 4: Drop all problematic policies
-- ============================================================================

-- Drop users_profile policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON users_profile;
DROP POLICY IF EXISTS "Users can view own profile" ON users_profile;

-- Drop flood_markers policies
DROP POLICY IF EXISTS "Admins can manage flood markers" ON flood_markers;

-- Drop admin_alerts policies  
DROP POLICY IF EXISTS "Admins can manage alerts" ON admin_alerts;

-- Drop weather_conditions policies
DROP POLICY IF EXISTS "Admins can manage weather conditions" ON weather_conditions;

-- Drop evacuation_centers policies
DROP POLICY IF EXISTS "Admins can manage evacuation centers" ON evacuation_centers;

-- Drop evacuation_routes policies
DROP POLICY IF EXISTS "Admins can manage evacuation routes" ON evacuation_routes;

-- Drop road_conditions policies
DROP POLICY IF EXISTS "Admins can verify and update road conditions" ON road_conditions;

-- Drop messages policies
DROP POLICY IF EXISTS "Admins can send broadcasts" ON messages;

-- Drop center_updates policies
DROP POLICY IF EXISTS "Admins can create center updates" ON center_updates;

-- Drop evacuee_locations policies
DROP POLICY IF EXISTS "Admins can view all user locations" ON evacuee_locations;

-- ============================================================================
-- STEP 5: Create new safe policies using auth.jwt()
-- ============================================================================

-- Users Profile policies
CREATE POLICY "Users can view own profile"
  ON users_profile FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR 
    (auth.jwt()->>'user_role')::text = 'admin'
  );

-- Flood Markers policies
CREATE POLICY "Admins can manage flood markers"
  ON flood_markers FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'user_role')::text = 'admin')
  WITH CHECK ((auth.jwt()->>'user_role')::text = 'admin');

-- Admin Alerts policies
CREATE POLICY "Admins can manage alerts"
  ON admin_alerts FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'user_role')::text = 'admin')
  WITH CHECK ((auth.jwt()->>'user_role')::text = 'admin');

-- Weather Conditions policies
CREATE POLICY "Admins can manage weather conditions"
  ON weather_conditions FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'user_role')::text = 'admin')
  WITH CHECK ((auth.jwt()->>'user_role')::text = 'admin');

-- Evacuation Centers policies
CREATE POLICY "Admins can manage evacuation centers"
  ON evacuation_centers FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'user_role')::text = 'admin')
  WITH CHECK ((auth.jwt()->>'user_role')::text = 'admin');

-- Evacuation Routes policies
CREATE POLICY "Admins can manage evacuation routes"
  ON evacuation_routes FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'user_role')::text = 'admin')
  WITH CHECK ((auth.jwt()->>'user_role')::text = 'admin');

-- Road Conditions policies
CREATE POLICY "Admins can verify and update road conditions"
  ON road_conditions FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'user_role')::text = 'admin')
  WITH CHECK ((auth.jwt()->>'user_role')::text = 'admin');

-- Messages policies
CREATE POLICY "Admins can send broadcasts"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    message_type = 'broadcast' AND
    (auth.jwt()->>'user_role')::text = 'admin'
  );

-- Center Updates policies
CREATE POLICY "Admins can create center updates"
  ON center_updates FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'user_role')::text = 'admin');

-- Evacuee Locations policies
CREATE POLICY "Admins can view all user locations"
  ON evacuee_locations FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (auth.jwt()->>'user_role')::text = 'admin'
  );
