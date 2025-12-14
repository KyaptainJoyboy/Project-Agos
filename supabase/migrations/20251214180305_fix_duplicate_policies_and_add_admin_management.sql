/*
  # Fix Duplicate RLS Policies and Add Admin Management

  ## Overview
  Removes duplicate RLS policies that conflict with consolidated ones and adds missing admin management policies.

  ## Changes Made
  
  ### Policy Cleanup
  1. **evacuee_locations**
     - Remove old "Personnel can view all locations" policy (duplicate of "View evacuee locations")
  
  2. **messages**
     - Remove old "Personnel can send broadcasts" policy (duplicate of "Send messages")
  
  3. **users_profile**
     - Remove old "Personnel and admins can view all profiles" policy (duplicate of "View user profiles")
     - Add INSERT policy for new user registration
  
  4. **vehicles**
     - Remove old "Admins can manage vehicles" policy (duplicate of consolidated policies)
  
  ### Admin Management Policies
  Added full CRUD capabilities for admins on:
  1. **flood_markers** - INSERT, UPDATE, DELETE for admins
  2. **admin_alerts** - INSERT, UPDATE, DELETE for admins
  3. **evacuation_centers** - DELETE for admins (already has INSERT and UPDATE)

  ## Security Notes
  - All policies maintain proper authorization checks
  - Users can only manage their own data unless they have admin/personnel roles
  - Admin operations are restricted to users with admin role
*/

-- Drop duplicate policies on evacuee_locations
DROP POLICY IF EXISTS "Personnel can view all locations" ON public.evacuee_locations;

-- Drop duplicate policies on messages
DROP POLICY IF EXISTS "Personnel can send broadcasts" ON public.messages;

-- Drop duplicate policies on users_profile
DROP POLICY IF EXISTS "Personnel and admins can view all profiles" ON public.users_profile;

-- Add INSERT policy for users_profile (for registration)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users_profile;
CREATE POLICY "Users can insert own profile"
  ON public.users_profile
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- Drop duplicate policy on vehicles
DROP POLICY IF EXISTS "Admins can manage vehicles" ON public.vehicles;

-- Add admin management policies for flood_markers
DROP POLICY IF EXISTS "Admins can manage flood markers" ON public.flood_markers;
CREATE POLICY "Admins can manage flood markers"
  ON public.flood_markers
  FOR ALL
  TO authenticated
  USING ((select auth.jwt()->>'new_role') = 'admin')
  WITH CHECK ((select auth.jwt()->>'new_role') = 'admin');

-- Add admin management policies for admin_alerts
DROP POLICY IF EXISTS "Admins can manage alerts" ON public.admin_alerts;
CREATE POLICY "Admins can manage alerts"
  ON public.admin_alerts
  FOR ALL
  TO authenticated
  USING ((select auth.jwt()->>'new_role') = 'admin')
  WITH CHECK ((select auth.jwt()->>'new_role') = 'admin');

-- Add DELETE policy for evacuation_centers
DROP POLICY IF EXISTS "Admins can delete centers" ON public.evacuation_centers;
CREATE POLICY "Admins can delete centers"
  ON public.evacuation_centers
  FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'new_role') = 'admin');

-- Add admin management policies for weather_conditions
DROP POLICY IF EXISTS "Admins can manage weather" ON public.weather_conditions;
CREATE POLICY "Admins can manage weather"
  ON public.weather_conditions
  FOR ALL
  TO authenticated
  USING ((select auth.jwt()->>'new_role') = 'admin')
  WITH CHECK ((select auth.jwt()->>'new_role') = 'admin');