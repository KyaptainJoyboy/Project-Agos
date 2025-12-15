/*
  # Consolidate Multiple Permissive Policies

  ## Overview
  This migration consolidates multiple permissive policies for the same action
  into single policies with combined logic. Multiple permissive policies can
  cause confusion and are less efficient than a single well-structured policy.
  
  ## Problem
  Several tables have multiple permissive policies for the same role and action:
  - Multiple SELECT policies (users can view, admins can view)
  - Multiple UPDATE policies (operators can update, admins can update)
  
  ## Solution
  Combine policies using OR logic within a single policy for each action.
  
  ## Tables Updated
  
  1. **admin_alerts**
     - Consolidate: "Admins can manage alerts" + "Users can view active alerts"
  
  2. **evacuation_routes**
     - Consolidate: "Admins can manage routes" + "View evacuation routes"
  
  3. **evacuee_locations**
     - Consolidate: "Users can manage own location" + "View evacuee locations"
  
  4. **flood_markers**
     - Consolidate: "Admins can manage flood markers" + "Users can view active flood markers"
  
  5. **route_packages**
     - Consolidate: "Admins can manage packages" + "View route packages"
  
  6. **vehicles**
     - Consolidate SELECT: "Admins can insert and delete vehicles" + "View vehicles"
     - Consolidate UPDATE: "Admins can insert and delete vehicles" + "Update vehicles"
  
  7. **weather_conditions**
     - Consolidate: "Admins can manage weather" + "Users can view weather conditions"
*/

-- ============================================================================
-- admin_alerts: Consolidate SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage alerts" ON admin_alerts;
DROP POLICY IF EXISTS "Users can view active alerts" ON admin_alerts;

CREATE POLICY "View alerts"
  ON admin_alerts
  FOR SELECT
  TO authenticated
  USING (
    is_active = true OR
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins manage alerts"
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

-- ============================================================================
-- evacuation_routes: Consolidate SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage routes" ON evacuation_routes;
DROP POLICY IF EXISTS "View evacuation routes" ON evacuation_routes;

CREATE POLICY "View routes"
  ON evacuation_routes
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Admins manage routes"
  ON evacuation_routes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins update routes"
  ON evacuation_routes
  FOR UPDATE
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

CREATE POLICY "Admins delete routes"
  ON evacuation_routes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

-- ============================================================================
-- evacuee_locations: Consolidate SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "Users can manage own location" ON evacuee_locations;
DROP POLICY IF EXISTS "View evacuee locations" ON evacuee_locations;

CREATE POLICY "View evacuee locations"
  ON evacuee_locations
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'personnel')
    )
  );

CREATE POLICY "Manage own location"
  ON evacuee_locations
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================================
-- flood_markers: Consolidate SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage flood markers" ON flood_markers;
DROP POLICY IF EXISTS "Users can view active flood markers" ON flood_markers;

CREATE POLICY "View flood markers"
  ON flood_markers
  FOR SELECT
  TO authenticated
  USING (
    is_active = true OR
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins manage flood markers"
  ON flood_markers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins update flood markers"
  ON flood_markers
  FOR UPDATE
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

CREATE POLICY "Admins delete flood markers"
  ON flood_markers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

-- ============================================================================
-- route_packages: Consolidate SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage packages" ON route_packages;
DROP POLICY IF EXISTS "View route packages" ON route_packages;

CREATE POLICY "View packages"
  ON route_packages
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Admins manage packages"
  ON route_packages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins update packages"
  ON route_packages
  FOR UPDATE
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

CREATE POLICY "Admins delete packages"
  ON route_packages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

-- ============================================================================
-- vehicles: Consolidate SELECT and UPDATE policies
-- ============================================================================
DROP POLICY IF EXISTS "Admins can insert and delete vehicles" ON vehicles;
DROP POLICY IF EXISTS "View vehicles" ON vehicles;
DROP POLICY IF EXISTS "Update vehicles" ON vehicles;

CREATE POLICY "View vehicles"
  ON vehicles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

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

CREATE POLICY "Admins manage vehicles"
  ON vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins delete vehicles"
  ON vehicles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

-- ============================================================================
-- weather_conditions: Consolidate SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage weather" ON weather_conditions;
DROP POLICY IF EXISTS "Users can view weather conditions" ON weather_conditions;

CREATE POLICY "View weather"
  ON weather_conditions
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Admins manage weather"
  ON weather_conditions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins update weather"
  ON weather_conditions
  FOR UPDATE
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

CREATE POLICY "Admins delete weather"
  ON weather_conditions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );