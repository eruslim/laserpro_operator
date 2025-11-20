import { supabase } from './supabase';

export type UserRole = 'customer' | 'admin' | 'operator';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
}

// Cache to prevent multiple simultaneous calls
let currentUserCache: { user: User | null; timestamp: number } | null = null;
const CACHE_DURATION = 30000; // 30 seconds (increased from 5)

// Store the latest session from auth state change
let latestSession: any = null;

// Track the last user ID to detect user changes
let lastUserId: string | null = null;

// Prevent concurrent fetch calls
let fetchInProgress = false;
let fetchPromise: Promise<User | null> | null = null;

/**
 * Sign up a new customer user
 * Admins cannot be created through public signup
 */
export async function signUpCustomer(email: string, password: string, fullName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'customer', // Ensure customer role
      },
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Sign in (works for both customers and admins)
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  // Clear cache and session on sign out
  currentUserCache = null;
  latestSession = null;
}

/**
 * Get current user profile including role
 */
export async function getCurrentUser(): Promise<User | null> {
  console.log('[AUTH DEBUG] getCurrentUser called');

  // If already fetching, return the same promise to prevent concurrent calls
  if (fetchInProgress && fetchPromise) {
    console.log('[AUTH DEBUG] Fetch already in progress, returning existing promise');
    return fetchPromise;
  }

  // Check cache first (30s instead of 5s)
  if (currentUserCache && Date.now() - currentUserCache.timestamp < CACHE_DURATION) {
    const cacheAge = Math.floor((Date.now() - currentUserCache.timestamp) / 1000);
    console.log(`[AUTH DEBUG] Using cached user (age: ${cacheAge}s)`, currentUserCache.user);
    return currentUserCache.user;
  }

  console.log('[AUTH DEBUG] Cache miss or expired, fetching fresh data');

  // Mark as in progress
  fetchInProgress = true;

  // Create the fetch promise
  fetchPromise = (async () => {
    try {
      // Use the latest session from onAuthStateChange if available
      let session = latestSession;
      console.log('[AUTH DEBUG] latestSession from listener:', session ? 'exists' : 'null');

      // If no session from auth state change, get it directly (NO timeout wrapper)
      if (!session) {
        console.log('[AUTH DEBUG] No cached session, calling getSession()...');
        const { data: sessionData, error } = await supabase.auth.getSession();
        console.log('[AUTH DEBUG] getSession() result:', {
          hasSession: !!sessionData.session,
          error: error?.message
        });
        session = sessionData.session;
      }

      if (!session?.user) {
        // No user is authenticated
        console.log('[AUTH DEBUG] No session/user found, returning null');
        currentUserCache = { user: null, timestamp: Date.now() };
        return null;
      }

      console.log('[AUTH DEBUG] Session found for user:', session.user.email);
      const authUser = session.user;

      // Try to fetch from database with reasonable timeout, fallback to auth metadata
      console.log('[AUTH DEBUG] Fetching user profile from database...');
      const timeoutPromise = new Promise<User | null>((resolve) => {
        setTimeout(() => {
          console.log('[AUTH DEBUG] DB query timeout, using auth metadata fallback');
          // Fallback to basic user from auth metadata
          resolve({
            id: authUser.id,
            email: authUser.email || '',
            full_name: authUser.user_metadata?.full_name,
            role: authUser.user_metadata?.role || 'customer',
          });
        }, 8000); // 8 second timeout for DB query (increased from 5)
      });

      const fetchUserProfile = supabase
        .from('users')
        .select('id, email, full_name, role')
        .eq('id', authUser.id)
        .limit(1)
        .then(({ data: userProfiles, error }) => {
          if (error || !userProfiles || userProfiles.length === 0) {
            console.log('[AUTH DEBUG] DB query failed or no results, using auth metadata');
            // Return auth metadata as fallback
            return {
              id: authUser.id,
              email: authUser.email || '',
              full_name: authUser.user_metadata?.full_name,
              role: authUser.user_metadata?.role || 'customer',
            };
          }
          console.log('[AUTH DEBUG] DB query successful, got user:', userProfiles[0]);
          return userProfiles[0];
        });

      // Race between DB fetch and timeout
      const userProfile = await Promise.race([fetchUserProfile, timeoutPromise]);

      // Cache the result
      console.log('[AUTH DEBUG] Caching user profile for 30s');
      currentUserCache = {
        user: userProfile,
        timestamp: Date.now()
      };

      return userProfile;
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      return null;
    } finally {
      // Reset fetch state
      fetchInProgress = false;
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Check if current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'admin';
}

/**
 * Check if current user is a customer
 */
export async function isCustomer(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'customer';
}

/**
 * Get user's role
 */
export async function getUserRole(): Promise<UserRole | null> {
  const user = await getCurrentUser();
  return user?.role || null;
}

/**
 * Admin only: Create a new admin user
 * This function should only be called from an authenticated admin session
 * or from a backend with service role key
 */
export async function createAdminUser(
  email: string,
  password: string,
  fullName: string,
  permissions?: Record<string, boolean>
) {
  // First, verify the caller is an admin
  const isUserAdmin = await isAdmin();
  if (!isUserAdmin) {
    throw new Error('Only admins can create admin users');
  }

  // Create the auth user with admin role
  // Note: In production, this should be done via a backend endpoint
  // using the service role key, not from the client
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'admin',
      },
      emailRedirectTo: undefined, // Prevent email confirmation requirement for admins
    },
  });

  if (authError) throw authError;

  if (!authData.user) {
    throw new Error('Failed to create admin user');
  }

  // Update the user role to admin (since RLS might prevent this from signup)
  // @ts-ignore - Database types need to be regenerated
  const { error: updateError } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('id', authData.user.id);

  if (updateError) throw updateError;

  // Create admin metadata
  // @ts-ignore - Database types need to be regenerated
  const { error: adminError } = await supabase
    .from('admin_users')
    .insert({
      id: authData.user.id,
      permissions: permissions || {
        manage_orders: true,
        manage_materials: true,
        manage_users: false,
        view_analytics: true,
      },
    });

  if (adminError) throw adminError;

  return authData.user;
}

/**
 * Update user profile
 */
export async function updateUserProfile(updates: {
  full_name?: string;
  phone?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // @ts-ignore - Database types need to be regenerated
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id);

  if (error) throw error;
}

/**
 * Admin only: Get all users
 */
export async function getAllUsers() {
  const isUserAdmin = await isAdmin();
  if (!isUserAdmin) {
    throw new Error('Only admins can view all users');
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Admin only: Update user role
 */
export async function updateUserRole(userId: string, newRole: UserRole) {
  const isUserAdmin = await isAdmin();
  if (!isUserAdmin) {
    throw new Error('Only admins can update user roles');
  }

  // @ts-ignore - Database types need to be regenerated
  const { error } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) throw error;
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[AUTH DEBUG] Auth state changed:', event, session?.user?.email || 'no user');

    // Store the latest session IMMEDIATELY
    latestSession = session;

    const currentUserId = session?.user?.id || null;
    const userChanged = currentUserId !== lastUserId;

    console.log('[AUTH DEBUG] User changed?', userChanged, 'Current:', currentUserId, 'Last:', lastUserId);

    // Only clear cache and fetch user if user actually changed
    if (userChanged) {
      currentUserCache = null;
      lastUserId = currentUserId;
      console.log('[AUTH DEBUG] User changed, cache cleared, fetching user...');

      if (session?.user) {
        const user = await getCurrentUser();
        callback(user);
      } else {
        callback(null);
      }
    } else {
      console.log('[AUTH DEBUG] Same user (token refresh), skipping fetch, using cache');
      // Don't call getCurrentUser or callback - just update the session
      // The cache is still valid, no need to notify components
    }
  });
}
