/*
  # Fix Security Issues - Part 1: Add Missing Foreign Key Indexes

  1. Performance Improvements
    - Add indexes on all foreign key columns that don't have covering indexes
    - This improves join performance and query optimization
  
  2. Tables Affected
    - admin_alerts, center_updates, distress_calls, flood_markers
    - hazard_layers, road_conditions, road_hazards
    - vehicle_tracking, weather_conditions
*/

-- Add index on admin_alerts.created_by
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created_by 
  ON admin_alerts(created_by);

-- Add index on center_updates.updated_by
CREATE INDEX IF NOT EXISTS idx_center_updates_updated_by 
  ON center_updates(updated_by);

-- Add index on distress_calls.user_id
CREATE INDEX IF NOT EXISTS idx_distress_calls_user_id 
  ON distress_calls(user_id);

-- Add index on flood_markers.created_by
CREATE INDEX IF NOT EXISTS idx_flood_markers_created_by 
  ON flood_markers(created_by);

-- Add index on hazard_layers.source_id
CREATE INDEX IF NOT EXISTS idx_hazard_layers_source_id 
  ON hazard_layers(source_id);

-- Add index on road_conditions.reported_by
CREATE INDEX IF NOT EXISTS idx_road_conditions_reported_by 
  ON road_conditions(reported_by);

-- Add index on road_conditions.verified_by
CREATE INDEX IF NOT EXISTS idx_road_conditions_verified_by 
  ON road_conditions(verified_by);

-- Add index on road_hazards.reported_by
CREATE INDEX IF NOT EXISTS idx_road_hazards_reported_by 
  ON road_hazards(reported_by);

-- Add index on vehicle_tracking.destination_center_id
CREATE INDEX IF NOT EXISTS idx_vehicle_tracking_destination 
  ON vehicle_tracking(destination_center_id);

-- Add index on weather_conditions.updated_by
CREATE INDEX IF NOT EXISTS idx_weather_conditions_updated_by 
  ON weather_conditions(updated_by);