import { supabase, UserProfile, UserRole } from './supabase';
import { saveAccount } from './storedAccounts';

export async function signUp(email: string, password: string, fullName: string, role: UserRole = 'user') {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('Failed to create user');

  const oldRole = role === 'admin' ? 'admin' : 'evacuee';

  const { error: profileError } = await supabase
    .from('users_profile')
    .insert({
      id: authData.user.id,
      role: oldRole,
      new_role: role,
      full_name: fullName,
      location_permission_granted: false,
      notification_enabled: true,
    });

  if (profileError) throw profileError;

  saveAccount(email, fullName);

  return authData;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  if (data.user) {
    const profile = await getUserProfile(data.user.id);
    if (profile) {
      saveAccount(email, profile.full_name);
    }
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users_profile')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  const { data, error } = await supabase
    .from('users_profile')
    .update(updates)
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function requestLocationPermission(userId: string) {
  return updateUserProfile(userId, { location_permission_granted: true });
}

export async function checkUserRole(userId: string, allowedRoles: UserRole[]): Promise<boolean> {
  const profile = await getUserProfile(userId);
  if (!profile) return false;
  return allowedRoles.includes(profile.new_role);
}
