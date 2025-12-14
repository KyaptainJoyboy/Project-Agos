/*
  # Fix RLS Auth Function Performance Issues

  ## Overview
  This migration fixes performance issues in Row Level Security (RLS) policies by optimizing how auth functions are called.

  ## Changes Made
  
  ### RLS Policy Optimization
  Wraps all `auth.uid()` and `auth.jwt()` calls with `(select ...)` to prevent re-evaluation for each row.
  This significantly improves query performance at scale.
  
  ### Affected Tables and Policies
  1. **evacuation_routes**
     - "Admins can manage routes" - Optimized auth.jwt() calls
  
  2. **users_profile**
     - "Personnel and admins can view all profiles" - Optimized auth.jwt() calls
  
  3. **evacuation_centers**
     - "Personnel and admins can update centers" - Optimized auth.jwt() calls
     - "Admins can insert centers" - Optimized auth.jwt() calls
  
  4. **route_packages**
     - "Admins can manage packages" - Optimized auth.jwt() calls
  
  5. **road_conditions**
     - "Personnel can verify and update conditions" - Optimized auth.jwt() calls
  
  6. **messages**
     - "Personnel can send broadcasts" - Optimized auth.jwt() calls
  
  7. **vehicles**
     - "Admins can manage vehicles" - Optimized auth.jwt() calls
  
  8. **evacuee_locations**
     - "Personnel can view all locations" - Optimized auth.jwt() calls
  
  9. **center_updates**
     - "Personnel can create updates" - Optimized auth.jwt() calls

  ## Security Notes
  - All policies maintain the same security constraints
  - Only the evaluation strategy is optimized for performance
*/

-- Fix evacuation_routes policies
DROP POLICY IF EXISTS "Admins can manage routes" ON public.evacuation_routes;
CREATE POLICY "Admins can manage routes"
  ON public.evacuation_routes
  FOR ALL
  TO authenticated
  USING ((select auth.jwt()->>'new_role') = 'admin')
  WITH CHECK ((select auth.jwt()->>'new_role') = 'admin');

-- Fix users_profile policies
DROP POLICY IF EXISTS "Personnel and admins can view all profiles" ON public.users_profile;
CREATE POLICY "Personnel and admins can view all profiles"
  ON public.users_profile
  FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'new_role') IN ('admin', 'personnel'));

-- Fix evacuation_centers policies
DROP POLICY IF EXISTS "Personnel and admins can update centers" ON public.evacuation_centers;
CREATE POLICY "Personnel and admins can update centers"
  ON public.evacuation_centers
  FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'new_role') IN ('admin', 'personnel'))
  WITH CHECK ((select auth.jwt()->>'new_role') IN ('admin', 'personnel'));

DROP POLICY IF EXISTS "Admins can insert centers" ON public.evacuation_centers;
CREATE POLICY "Admins can insert centers"
  ON public.evacuation_centers
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'new_role') = 'admin');

-- Fix route_packages policies
DROP POLICY IF EXISTS "Admins can manage packages" ON public.route_packages;
CREATE POLICY "Admins can manage packages"
  ON public.route_packages
  FOR ALL
  TO authenticated
  USING ((select auth.jwt()->>'new_role') = 'admin')
  WITH CHECK ((select auth.jwt()->>'new_role') = 'admin');

-- Fix road_conditions policies
DROP POLICY IF EXISTS "Personnel can verify and update conditions" ON public.road_conditions;
CREATE POLICY "Personnel can verify and update conditions"
  ON public.road_conditions
  FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'new_role') IN ('admin', 'personnel'))
  WITH CHECK ((select auth.jwt()->>'new_role') IN ('admin', 'personnel'));

-- Fix messages policies
DROP POLICY IF EXISTS "Personnel can send broadcasts" ON public.messages;
CREATE POLICY "Personnel can send broadcasts"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.jwt()->>'new_role') IN ('admin', 'personnel')
    AND message_type = 'broadcast'
  );

-- Fix vehicles policies
DROP POLICY IF EXISTS "Admins can manage vehicles" ON public.vehicles;
CREATE POLICY "Admins can manage vehicles"
  ON public.vehicles
  FOR ALL
  TO authenticated
  USING ((select auth.jwt()->>'new_role') = 'admin')
  WITH CHECK ((select auth.jwt()->>'new_role') = 'admin');

-- Fix evacuee_locations policies
DROP POLICY IF EXISTS "Personnel can view all locations" ON public.evacuee_locations;
CREATE POLICY "Personnel can view all locations"
  ON public.evacuee_locations
  FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'new_role') IN ('admin', 'personnel'));

-- Fix center_updates policies
DROP POLICY IF EXISTS "Personnel can create updates" ON public.center_updates;
CREATE POLICY "Personnel can create updates"
  ON public.center_updates
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'new_role') IN ('admin', 'personnel'));