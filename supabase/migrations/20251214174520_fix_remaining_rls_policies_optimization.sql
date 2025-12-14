/*
  # Fix Remaining RLS Policy Optimizations

  1. Performance Improvements
    - Wrap remaining auth.jwt() and auth.uid() calls with SELECT
    - Fixes policies for personnel and admin role checks
  
  2. Tables and Policies Affected
    - users_profile: "Personnel and admins can view all profiles"
    - evacuation_centers: "Personnel and admins can update centers", "Admins can insert centers"
    - evacuation_routes: "Admins can manage routes"
    - route_packages: "Admins can manage packages"
    - road_conditions: "Personnel can verify and update conditions"
    - messages: "Personnel can send broadcasts"
    - vehicles: "Admins can manage vehicles"
    - evacuee_locations: "Personnel can view all locations"
    - center_updates: "Personnel can create updates"
*/

-- Fix users_profile policy for personnel and admins
DROP POLICY IF EXISTS "Personnel and admins can view all profiles" ON users_profile;
CREATE POLICY "Personnel and admins can view all profiles"
  ON users_profile FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'user_role')::text IN ('personnel', 'admin')
  );

-- Fix users_profile "Users can view own profile" policy (ensure it's fully optimized)
DROP POLICY IF EXISTS "Users can view own profile" ON users_profile;
CREATE POLICY "Users can view own profile"
  ON users_profile FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

-- Fix evacuation_centers policies
DROP POLICY IF EXISTS "Personnel and admins can update centers" ON evacuation_centers;
CREATE POLICY "Personnel and admins can update centers"
  ON evacuation_centers FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'user_role')::text IN ('personnel', 'admin')
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'user_role')::text IN ('personnel', 'admin')
  );

DROP POLICY IF EXISTS "Admins can insert centers" ON evacuation_centers;
CREATE POLICY "Admins can insert centers"
  ON evacuation_centers FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.jwt()->>'user_role')::text = 'admin'
  );

-- Fix evacuation_routes policy
DROP POLICY IF EXISTS "Admins can manage routes" ON evacuation_routes;
CREATE POLICY "Admins can manage routes"
  ON evacuation_routes FOR ALL
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'user_role')::text = 'admin'
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'user_role')::text = 'admin'
  );

-- Fix route_packages policy
DROP POLICY IF EXISTS "Admins can manage packages" ON route_packages;
CREATE POLICY "Admins can manage packages"
  ON route_packages FOR ALL
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'user_role')::text = 'admin'
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'user_role')::text = 'admin'
  );

-- Fix road_conditions policy for personnel
DROP POLICY IF EXISTS "Personnel can verify and update conditions" ON road_conditions;
CREATE POLICY "Personnel can verify and update conditions"
  ON road_conditions FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'user_role')::text IN ('personnel', 'admin')
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'user_role')::text IN ('personnel', 'admin')
  );

-- Fix messages policy for personnel broadcasts
DROP POLICY IF EXISTS "Personnel can send broadcasts" ON messages;
CREATE POLICY "Personnel can send broadcasts"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.jwt()->>'user_role')::text IN ('personnel', 'admin') AND 
    message_type = 'broadcast'
  );

-- Fix vehicles policy for admins
DROP POLICY IF EXISTS "Admins can manage vehicles" ON vehicles;
CREATE POLICY "Admins can manage vehicles"
  ON vehicles FOR ALL
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'user_role')::text = 'admin'
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'user_role')::text = 'admin'
  );

-- Fix evacuee_locations policy for personnel
DROP POLICY IF EXISTS "Personnel can view all locations" ON evacuee_locations;
CREATE POLICY "Personnel can view all locations"
  ON evacuee_locations FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'user_role')::text IN ('personnel', 'admin')
  );

-- Fix center_updates policy for personnel
DROP POLICY IF EXISTS "Personnel can create updates" ON center_updates;
CREATE POLICY "Personnel can create updates"
  ON center_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.jwt()->>'user_role')::text IN ('personnel', 'admin')
  );