/*
  # Fix Security Issues - Part 2: Optimize RLS Policies

  1. Performance Improvements
    - Wrap auth.uid() and auth.jwt() calls in SELECT to avoid re-evaluation per row
    - This significantly improves query performance at scale
  
  2. Tables Affected
    - users_profile, messages, vehicles, vehicle_tracking
    - evacuee_locations, route_preferences, distress_calls
    - cached_map_layers, road_hazards, security_audit_log, rate_limit_tracking
*/

-- Fix users_profile policies
DROP POLICY IF EXISTS "Users can view own profile" ON users_profile;
CREATE POLICY "Users can view own profile"
  ON users_profile FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = id OR 
    (SELECT auth.jwt()->>'user_role')::text = 'admin'
  );

DROP POLICY IF EXISTS "Users can update own profile" ON users_profile;
CREATE POLICY "Users can update own profile"
  ON users_profile FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- Fix messages policies
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = sender_id OR 
    (SELECT auth.uid()) = recipient_id OR 
    message_type = 'broadcast'
  );

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = sender_id AND 
    message_type = 'direct'
  );

DROP POLICY IF EXISTS "Recipients can mark as read" ON messages;
CREATE POLICY "Recipients can mark as read"
  ON messages FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = recipient_id)
  WITH CHECK ((SELECT auth.uid()) = recipient_id);

-- Fix vehicles policies
DROP POLICY IF EXISTS "Vehicle operators can update their vehicle" ON vehicles;
CREATE POLICY "Vehicle operators can update their vehicle"
  ON vehicles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = operator_id)
  WITH CHECK ((SELECT auth.uid()) = operator_id);

-- Fix vehicle_tracking policy
DROP POLICY IF EXISTS "Vehicle operators can update tracking" ON vehicle_tracking;
CREATE POLICY "Vehicle operators can update tracking"
  ON vehicle_tracking FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vehicles 
      WHERE vehicles.id = vehicle_id 
      AND vehicles.operator_id = (SELECT auth.uid())
    )
  );

-- Fix evacuee_locations policy
DROP POLICY IF EXISTS "Users can manage their location" ON evacuee_locations;
CREATE POLICY "Users can manage their location"
  ON evacuee_locations FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Fix route_preferences policies
DROP POLICY IF EXISTS "Users can view own route preferences" ON route_preferences;
CREATE POLICY "Users can view own route preferences"
  ON route_preferences FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own route preferences" ON route_preferences;
CREATE POLICY "Users can insert own route preferences"
  ON route_preferences FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own route preferences" ON route_preferences;
CREATE POLICY "Users can update own route preferences"
  ON route_preferences FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Fix distress_calls policies
DROP POLICY IF EXISTS "Users can view own distress calls" ON distress_calls;
CREATE POLICY "Users can view own distress calls"
  ON distress_calls FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own distress calls" ON distress_calls;
CREATE POLICY "Users can create own distress calls"
  ON distress_calls FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update status of own distress calls" ON distress_calls;
CREATE POLICY "Users can update status of own distress calls"
  ON distress_calls FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Fix cached_map_layers policies
DROP POLICY IF EXISTS "Users can view own cached layers" ON cached_map_layers;
CREATE POLICY "Users can view own cached layers"
  ON cached_map_layers FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own cached layers" ON cached_map_layers;
CREATE POLICY "Users can insert own cached layers"
  ON cached_map_layers FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own cached layers" ON cached_map_layers;
CREATE POLICY "Users can delete own cached layers"
  ON cached_map_layers FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Fix road_hazards policies
DROP POLICY IF EXISTS "Authenticated users can report road hazards" ON road_hazards;
CREATE POLICY "Authenticated users can report road hazards"
  ON road_hazards FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = reported_by);

DROP POLICY IF EXISTS "Users can update own road hazard reports" ON road_hazards;
CREATE POLICY "Users can update own road hazard reports"
  ON road_hazards FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = reported_by)
  WITH CHECK ((SELECT auth.uid()) = reported_by);

-- Fix road_conditions policy
DROP POLICY IF EXISTS "Authenticated users can report conditions" ON road_conditions;
CREATE POLICY "Authenticated users can report conditions"
  ON road_conditions FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = reported_by);

-- Fix security_audit_log policy
DROP POLICY IF EXISTS "Users can view own audit logs" ON security_audit_log;
CREATE POLICY "Users can view own audit logs"
  ON security_audit_log FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Fix rate_limit_tracking policy
DROP POLICY IF EXISTS "Users can view own rate limits" ON rate_limit_tracking;
CREATE POLICY "Users can view own rate limits"
  ON rate_limit_tracking FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);