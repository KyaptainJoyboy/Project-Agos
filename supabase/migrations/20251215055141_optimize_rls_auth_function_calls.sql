/*
  # Optimize RLS Policies - Fix Auth Function Re-evaluation

  ## Overview
  This migration optimizes RLS policies by wrapping auth function calls with SELECT.
  This prevents the auth functions from being re-evaluated for each row, significantly
  improving query performance at scale.
  
  ## Problem
  When RLS policies use `auth.uid()` directly, PostgreSQL re-evaluates the function
  for every single row being checked. This creates unnecessary overhead.
  
  ## Solution
  Replace `auth.uid()` with `(select auth.uid())` to evaluate once per query.
  
  ## Policies Updated
  
  1. **flood_markers**
     - "Admins can manage flood markers"
  
  2. **admin_alerts**
     - "Admins can manage alerts"
  
  3. **evacuation_centers**
     - "Admins can delete centers"
     - "Personnel and admins can update centers"
     - "Admins can insert centers"
  
  4. **weather_conditions**
     - "Admins can manage weather"
  
  5. **evacuation_routes**
     - "Admins can manage routes"
     - "View evacuation routes"
  
  6. **route_packages**
     - "Admins can manage packages"
  
  7. **road_conditions**
     - "Personnel can verify and update conditions"
  
  8. **center_updates**
     - "Personnel can create updates"
  
  9. **evacuee_locations**
     - "View evacuee locations"
  
  10. **messages**
      - "Send messages"
  
  11. **users_profile**
      - "View user profiles"
  
  12. **vehicles**
      - "Update vehicles"
      - "Admins can insert and delete vehicles"
  
  ## Performance Impact
  Queries with RLS policies will execute significantly faster, especially on tables
  with many rows, as auth functions are evaluated once per query instead of once per row.
*/

-- Drop and recreate policies with optimized auth function calls

-- flood_markers policies
DROP POLICY IF EXISTS "Admins can manage flood markers" ON flood_markers;
CREATE POLICY "Admins can manage flood markers"
  ON flood_markers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

-- admin_alerts policies
DROP POLICY IF EXISTS "Admins can manage alerts" ON admin_alerts;
CREATE POLICY "Admins can manage alerts"
  ON admin_alerts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

-- evacuation_centers policies
DROP POLICY IF EXISTS "Admins can delete centers" ON evacuation_centers;
CREATE POLICY "Admins can delete centers"
  ON evacuation_centers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Personnel and admins can update centers" ON evacuation_centers;
CREATE POLICY "Personnel and admins can update centers"
  ON evacuation_centers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'personnel')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'personnel')
    )
  );

DROP POLICY IF EXISTS "Admins can insert centers" ON evacuation_centers;
CREATE POLICY "Admins can insert centers"
  ON evacuation_centers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

-- weather_conditions policies
DROP POLICY IF EXISTS "Admins can manage weather" ON weather_conditions;
CREATE POLICY "Admins can manage weather"
  ON weather_conditions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

-- evacuation_routes policies
DROP POLICY IF EXISTS "Admins can manage routes" ON evacuation_routes;
CREATE POLICY "Admins can manage routes"
  ON evacuation_routes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "View evacuation routes" ON evacuation_routes;
CREATE POLICY "View evacuation routes"
  ON evacuation_routes
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- route_packages policies
DROP POLICY IF EXISTS "Admins can manage packages" ON route_packages;
CREATE POLICY "Admins can manage packages"
  ON route_packages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

-- road_conditions policies
DROP POLICY IF EXISTS "Personnel can verify and update conditions" ON road_conditions;
CREATE POLICY "Personnel can verify and update conditions"
  ON road_conditions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'personnel')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'personnel')
    )
  );

-- center_updates policies
DROP POLICY IF EXISTS "Personnel can create updates" ON center_updates;
CREATE POLICY "Personnel can create updates"
  ON center_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'personnel')
    )
  );

-- evacuee_locations policies
DROP POLICY IF EXISTS "View evacuee locations" ON evacuee_locations;
CREATE POLICY "View evacuee locations"
  ON evacuee_locations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'personnel')
    )
  );

-- messages policies
DROP POLICY IF EXISTS "Send messages" ON messages;
CREATE POLICY "Send messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = (select auth.uid()));

-- users_profile policies
DROP POLICY IF EXISTS "View user profiles" ON users_profile;
CREATE POLICY "View user profiles"
  ON users_profile
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- vehicles policies
DROP POLICY IF EXISTS "Update vehicles" ON vehicles;
CREATE POLICY "Update vehicles"
  ON vehicles
  FOR UPDATE
  TO authenticated
  USING (
    operator_id = (select auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'personnel')
    )
  )
  WITH CHECK (
    operator_id = (select auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'personnel')
    )
  );

DROP POLICY IF EXISTS "Admins can insert and delete vehicles" ON vehicles;
CREATE POLICY "Admins can insert and delete vehicles"
  ON vehicles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );