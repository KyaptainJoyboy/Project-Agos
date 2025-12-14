/*
  # Enable Real-time for All Public Tables

  1. Real-time Configuration
    - Enable real-time for evacuation_centers table
    - Ensure all relevant tables are in the real-time publication
  
  2. Tables Enabled
    - evacuation_centers
    - flood_markers (already enabled)
    - admin_alerts (already enabled)
    - weather_conditions (already enabled)
*/

-- Enable real-time for evacuation_centers if not already enabled
DO $$
BEGIN
  -- Add evacuation_centers to realtime publication
  ALTER PUBLICATION supabase_realtime ADD TABLE evacuation_centers;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Ensure other tables are also enabled for real-time
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE flood_markers;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE admin_alerts;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE weather_conditions;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;