/*
  # Add Missing Foreign Key Indexes for Performance

  ## Overview
  This migration adds indexes to all foreign key columns that are currently unindexed.
  Foreign key indexes are critical for:
  - JOIN performance
  - CASCADE operations
  - Referential integrity checks
  
  ## Tables & Indexes Added
  
  1. **admin_alerts**
     - Index on `created_by` (references users_profile)
  
  2. **cached_map_layers**
     - Index on `user_id` (references auth.users)
  
  3. **center_updates**
     - Index on `center_id` (references evacuation_centers)
     - Index on `updated_by` (references users_profile)
  
  4. **distress_calls**
     - Index on `user_id` (references users_profile)
  
  5. **evacuation_routes**
     - Index on `end_center_id` (references evacuation_centers)
  
  6. **evacuee_locations**
     - Index on `user_id` (references users_profile)
  
  7. **flood_markers**
     - Index on `created_by` (references users_profile)
  
  8. **hazard_layers**
     - Index on `source_id` (references hazard_sources)
  
  9. **messages**
     - Index on `sender_id` (references users_profile)
     - Index on `recipient_id` (references users_profile)
  
  10. **rate_limit_tracking**
      - Index on `user_id` (references auth.users)
  
  11. **road_conditions**
      - Index on `reported_by` (references users_profile)
      - Index on `verified_by` (references users_profile)
  
  12. **road_hazards**
      - Index on `reported_by` (references users_profile)
  
  13. **security_audit_log**
      - Index on `user_id` (references auth.users)
  
  14. **vehicle_tracking**
      - Index on `vehicle_id` (references vehicles)
      - Index on `destination_center_id` (references evacuation_centers)
  
  15. **vehicles**
      - Index on `operator_id` (references users_profile)
  
  16. **weather_conditions**
      - Index on `updated_by` (references users_profile)
  
  ## Performance Impact
  These indexes will significantly improve query performance for:
  - Foreign key lookups and JOINs
  - Cascading deletes/updates
  - Referential integrity checks
*/

-- admin_alerts
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created_by 
ON admin_alerts(created_by);

-- cached_map_layers
CREATE INDEX IF NOT EXISTS idx_cached_map_layers_user_id 
ON cached_map_layers(user_id);

-- center_updates
CREATE INDEX IF NOT EXISTS idx_center_updates_center_id 
ON center_updates(center_id);

CREATE INDEX IF NOT EXISTS idx_center_updates_updated_by 
ON center_updates(updated_by);

-- distress_calls
CREATE INDEX IF NOT EXISTS idx_distress_calls_user_id 
ON distress_calls(user_id);

-- evacuation_routes
CREATE INDEX IF NOT EXISTS idx_evacuation_routes_end_center_id 
ON evacuation_routes(end_center_id);

-- evacuee_locations
CREATE INDEX IF NOT EXISTS idx_evacuee_locations_user_id 
ON evacuee_locations(user_id);

-- flood_markers
CREATE INDEX IF NOT EXISTS idx_flood_markers_created_by 
ON flood_markers(created_by);

-- hazard_layers
CREATE INDEX IF NOT EXISTS idx_hazard_layers_source_id 
ON hazard_layers(source_id);

-- messages
CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
ON messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_recipient_id 
ON messages(recipient_id);

-- rate_limit_tracking
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_user_id 
ON rate_limit_tracking(user_id);

-- road_conditions
CREATE INDEX IF NOT EXISTS idx_road_conditions_reported_by 
ON road_conditions(reported_by);

CREATE INDEX IF NOT EXISTS idx_road_conditions_verified_by 
ON road_conditions(verified_by);

-- road_hazards
CREATE INDEX IF NOT EXISTS idx_road_hazards_reported_by 
ON road_hazards(reported_by);

-- security_audit_log
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id 
ON security_audit_log(user_id);

-- vehicle_tracking
CREATE INDEX IF NOT EXISTS idx_vehicle_tracking_vehicle_id 
ON vehicle_tracking(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_tracking_destination_center_id 
ON vehicle_tracking(destination_center_id);

-- vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_operator_id 
ON vehicles(operator_id);

-- weather_conditions
CREATE INDEX IF NOT EXISTS idx_weather_conditions_updated_by 
ON weather_conditions(updated_by);