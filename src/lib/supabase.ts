import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

function createSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please check your .env file.');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}

export const supabase = createSupabaseClient();

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  new_role: UserRole;
  full_name: string;
  phone_number?: string;
  location_permission_granted: boolean;
  notification_enabled: boolean;
  emergency_contact?: string;
  created_at: string;
  updated_at: string;
}

export interface FloodMarker {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  severity: number;
  radius_meters: number;
  is_active: boolean;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminAlert {
  id: string;
  title: string;
  message: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location_name?: string;
  location?: { lat: number; lng: number };
  is_active: boolean;
  created_by?: string;
  created_at: string;
  expires_at?: string;
  updated_at: string;
}

export interface WeatherCondition {
  id: string;
  condition_type: 'normal' | 'light_rain' | 'heavy_rain' | 'storm' | 'typhoon';
  description?: string;
  flood_risk_level: number;
  is_active: boolean;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      users_profile: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}
