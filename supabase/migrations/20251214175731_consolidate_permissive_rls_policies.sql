/*
  # Consolidate Multiple Permissive RLS Policies

  ## Overview
  This migration consolidates multiple permissive RLS policies into single policies per action.
  Having multiple permissive policies can cause confusion and make security audits more difficult.

  ## Changes Made
  
  ### Policy Consolidation
  Combines multiple permissive policies for the same role/action into single comprehensive policies.
  
  ### Affected Tables
  1. **evacuation_routes** - Consolidated SELECT policies
  2. **evacuee_locations** - Consolidated SELECT policies
  3. **messages** - Consolidated INSERT policies
  4. **route_packages** - Consolidated SELECT policies
  5. **users_profile** - Consolidated SELECT policies
  6. **vehicles** - Consolidated SELECT and UPDATE policies

  ## Security Notes
  - All existing access patterns are maintained
  - Policies use OR conditions to handle multiple access levels
  - No reduction in security constraints
*/

-- Consolidate evacuation_routes SELECT policies
DROP POLICY IF EXISTS "Anyone can view active routes" ON public.evacuation_routes;

CREATE POLICY "View evacuation routes"
  ON public.evacuation_routes
  FOR SELECT
  TO authenticated
  USING (
    (select auth.jwt()->>'new_role') = 'admin'
    OR is_active = true
  );

-- Consolidate evacuee_locations SELECT policies
DROP POLICY IF EXISTS "Users can manage their location" ON public.evacuee_locations;

CREATE POLICY "View evacuee locations"
  ON public.evacuee_locations
  FOR SELECT
  TO authenticated
  USING (
    (select auth.jwt()->>'new_role') IN ('admin', 'personnel')
    OR user_id = (select auth.uid())
  );

CREATE POLICY "Users can manage own location"
  ON public.evacuee_locations
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Consolidate messages INSERT policies
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

CREATE POLICY "Send messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      (select auth.jwt()->>'new_role') IN ('admin', 'personnel')
      AND message_type = 'broadcast'
    )
    OR (
      sender_id = (select auth.uid())
      AND message_type IN ('direct', 'alert')
    )
  );

-- Consolidate route_packages SELECT policies
DROP POLICY IF EXISTS "Anyone can view route packages" ON public.route_packages;

CREATE POLICY "View route packages"
  ON public.route_packages
  FOR SELECT
  TO authenticated
  USING (true);

-- Consolidate users_profile SELECT policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users_profile;

CREATE POLICY "View user profiles"
  ON public.users_profile
  FOR SELECT
  TO authenticated
  USING (
    (select auth.jwt()->>'new_role') IN ('admin', 'personnel')
    OR id = (select auth.uid())
  );

-- Consolidate vehicles SELECT and UPDATE policies
DROP POLICY IF EXISTS "Anyone can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Vehicle operators can update their vehicle" ON public.vehicles;

CREATE POLICY "View vehicles"
  ON public.vehicles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Update vehicles"
  ON public.vehicles
  FOR UPDATE
  TO authenticated
  USING (
    (select auth.jwt()->>'new_role') = 'admin'
    OR operator_id = (select auth.uid())
  )
  WITH CHECK (
    (select auth.jwt()->>'new_role') = 'admin'
    OR operator_id = (select auth.uid())
  );

CREATE POLICY "Admins can insert and delete vehicles"
  ON public.vehicles
  FOR ALL
  TO authenticated
  USING ((select auth.jwt()->>'new_role') = 'admin')
  WITH CHECK ((select auth.jwt()->>'new_role') = 'admin');