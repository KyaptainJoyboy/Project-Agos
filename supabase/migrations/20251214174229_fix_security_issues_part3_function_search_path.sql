/*
  # Fix Security Issues - Part 3: Fix Function Search Paths

  1. Security Improvements
    - Set explicit search_path on functions to prevent injection attacks
    - Makes functions immutable to search_path changes
  
  2. Functions Affected
    - log_security_event
    - update_updated_at_column
    - check_user_authenticated
*/

-- Fix log_security_event function (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_security_event') THEN
    ALTER FUNCTION log_security_event SET search_path = public, pg_temp;
  END IF;
END $$;

-- Fix update_updated_at_column function (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    ALTER FUNCTION update_updated_at_column SET search_path = public, pg_temp;
  END IF;
END $$;

-- Fix check_user_authenticated function (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_user_authenticated') THEN
    ALTER FUNCTION check_user_authenticated SET search_path = public, pg_temp;
  END IF;
END $$;

-- Fix sync_user_role_to_metadata function
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_user_role_to_metadata') THEN
    ALTER FUNCTION sync_user_role_to_metadata SET search_path = public, auth, pg_temp;
  END IF;
END $$;