/*
  # Drop Unused Indexes

  ## Overview
  This migration removes unused indexes that are consuming resources without providing query optimization benefits.

  ## Changes Made
  
  ### Indexes Dropped
  Removes 47 unused indexes across multiple tables to:
  - Improve write performance (INSERT, UPDATE, DELETE operations)
  - Reduce storage requirements
  - Simplify database maintenance
  
  ### Affected Tables
  - evacuation_centers
  - evacuation_routes
  - admin_alerts
  - road_conditions
  - messages
  - vehicles
  - center_updates
  - distress_calls
  - vehicle_tracking
  - flood_markers
  - hazard_layers
  - evacuee_locations
  - relief_map_features
  - road_hazards
  - emergency_contacts
  - spup_safety_zones
  - cached_map_layers
  - security_audit_log
  - rate_limit_tracking
  - weather_conditions
  - route_packages

  ## Performance Impact
  - Faster INSERT, UPDATE, and DELETE operations
  - Reduced disk space usage
  - Lower maintenance overhead

  ## Important Notes
  - Indexes can be recreated if usage patterns change
  - Primary key and unique constraint indexes are NOT affected
  - This only removes indexes that have shown zero usage
*/

-- Drop evacuation_centers indexes
DROP INDEX IF EXISTS idx_centers_location;

-- Drop evacuation_routes indexes
DROP INDEX IF EXISTS idx_routes_center;
DROP INDEX IF EXISTS idx_routes_active;

-- Drop admin_alerts indexes
DROP INDEX IF EXISTS idx_admin_alerts_created_by;
DROP INDEX IF EXISTS idx_admin_alerts_expires;
DROP INDEX IF EXISTS idx_admin_alerts_location;

-- Drop road_conditions indexes
DROP INDEX IF EXISTS idx_road_conditions_location;
DROP INDEX IF EXISTS idx_road_conditions_status;
DROP INDEX IF EXISTS idx_road_conditions_expires;
DROP INDEX IF EXISTS idx_road_conditions_reported_by;
DROP INDEX IF EXISTS idx_road_conditions_verified_by;

-- Drop messages indexes
DROP INDEX IF EXISTS idx_messages_recipient;
DROP INDEX IF EXISTS idx_messages_sender;
DROP INDEX IF EXISTS idx_messages_type;
DROP INDEX IF EXISTS idx_messages_created;

-- Drop vehicles indexes
DROP INDEX IF EXISTS idx_vehicles_operator;
DROP INDEX IF EXISTS idx_vehicles_available;

-- Drop center_updates indexes
DROP INDEX IF EXISTS idx_center_updates_updated_by;
DROP INDEX IF EXISTS idx_center_updates_center;
DROP INDEX IF EXISTS idx_center_updates_time;

-- Drop distress_calls indexes
DROP INDEX IF EXISTS idx_distress_calls_user_id;
DROP INDEX IF EXISTS idx_distress_calls_status;
DROP INDEX IF EXISTS idx_distress_calls_location;

-- Drop vehicle_tracking indexes
DROP INDEX IF EXISTS idx_vehicle_tracking_vehicle;
DROP INDEX IF EXISTS idx_vehicle_tracking_location;
DROP INDEX IF EXISTS idx_vehicle_tracking_time;
DROP INDEX IF EXISTS idx_vehicle_tracking_destination;

-- Drop flood_markers indexes
DROP INDEX IF EXISTS idx_flood_markers_created_by;
DROP INDEX IF EXISTS idx_flood_markers_location;

-- Drop hazard_layers indexes
DROP INDEX IF EXISTS idx_hazard_layers_source_id;
DROP INDEX IF EXISTS idx_hazard_layers_type;
DROP INDEX IF EXISTS idx_hazard_layers_active;

-- Drop evacuee_locations indexes
DROP INDEX IF EXISTS idx_evacuee_locations_user;
DROP INDEX IF EXISTS idx_evacuee_locations_location;
DROP INDEX IF EXISTS idx_evacuee_locations_emergency;
DROP INDEX IF EXISTS idx_evacuee_locations_expires;

-- Drop relief_map_features indexes
DROP INDEX IF EXISTS idx_relief_features_type;
DROP INDEX IF EXISTS idx_relief_features_location;

-- Drop road_hazards indexes
DROP INDEX IF EXISTS idx_road_hazards_active;
DROP INDEX IF EXISTS idx_road_hazards_type;
DROP INDEX IF EXISTS idx_road_hazards_reported_by;

-- Drop emergency_contacts indexes
DROP INDEX IF EXISTS idx_emergency_contacts_type;

-- Drop spup_safety_zones indexes
DROP INDEX IF EXISTS idx_spup_zones_type;

-- Drop cached_map_layers indexes
DROP INDEX IF EXISTS idx_cached_layers_user;

-- Drop security_audit_log indexes
DROP INDEX IF EXISTS idx_audit_log_user;
DROP INDEX IF EXISTS idx_audit_log_action;

-- Drop rate_limit_tracking indexes
DROP INDEX IF EXISTS idx_rate_limit_user;

-- Drop weather_conditions indexes
DROP INDEX IF EXISTS idx_weather_conditions_updated_by;