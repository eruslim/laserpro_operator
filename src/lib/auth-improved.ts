import { supabase } from './supabase';

export type UserRole = 'customer' | 'admin' | 'operator';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
}

// Longer cache to prevent frequent re-checks
let currentUserCache: { user: User | null; timestamp: number } | null = null;
const CACHE_DURATION = 30000; // 30 seconds (increased from 5)

// Store the latest session from auth state change
let latestSession: any = null;

// Track if we're currently fetching to prevent concurrent calls
let fetchInProgress = false;
let fetchPromise: Promise<User | null> | null = null;

/**
 * Sign in (works for both customers and admins)
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  // Store session immediately
  latestSession = data.session;

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
  fetchInProgress = false;
  fetchPromise = null;
}

/**
 * Get current user profile including role
 * IMPROVED: More reliable, less aggressive timeouts
 */
export async function getCurrentUser(): Promise<User | null> {
  // If already fetching, return the same promise
  if (fetchInProgress && fetchPromise) {
    return fetchPromise;
  }

  // Check cache first
  if (currentUserCache && Date.now() - currentUserCache.timestamp < CACHE_DURATION) {
    return currentUserCache.user;
  }

  // Mark as fetching
  fetchInProgress = true;

  fetchPromise = (async () => {
    try {
      // STRATEGY 1: Use session from onAuthStateChange (most reliable)
      let session = latestSession;

      // STRATEGY 2: If no session cached, get it directly (no timeout!)
      if (!session) {
        try {
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            console.warn('Session error:', sessionError);
            session = null;
          } else {
            session = sessionData.session;
            // Cache it for next time
            latestSession = session;
          }
        } catch (e) {
          console.error('Error getting session:', e);
          session = null;
        }
      }

      // If no session, user is not authenticated
      if (!session?.user) {
        currentUserCache = { user: null, timestamp: Date.now() };
        return null;
      }

      const authUser = session.user;

      // STRATEGY 3: Fetch from database (with generous timeout)
      try {
        const { data: userProfiles, error: dbError } = await supabase
          .from('users')
          .select('id, email, full_name, role')
          .eq('id', authUser.id)
          .limit(1)
          .maybeSingle(); // Use maybeSingle instead of single to avoid errors

        if (dbError) {
          console.warn('DB error fetching user profile:', dbError);
          // Fallback to auth metadata
          const fallbackUser = {
            id: authUser.id,
            email: authUser.email || '',
            full_name: authUser.user_metadata?.full_name,
            role: (authUser.user_metadata?.role as UserRole) || 'customer',
          };

          currentUserCache = { user: fallbackUser, timestamp: Date.now() };
          return fallbackUser;
        }

        if (!userProfiles) {
          // User not in database yet, use auth metadata
          const fallbackUser = {
            id: authUser.id,
            email: authUser.email || '',
            full_name: authUser.user_metadata?.full_name,
            role: (authUser.user_metadata?.role as UserRole) || 'customer',
          };

          currentUserCache = { user: fallbackUser, timestamp: Date.now() };
          return fallbackUser;
        }

        // Success - got user from database
        const user = userProfiles as User;
        currentUserCache = { user, timestamp: Date.now() };
        return user;

      } catch (dbError) {
        console.error('Database fetch error:', dbError);

        // Fallback to auth metadata
        const fallbackUser = {
          id: authUser.id,
          email: authUser.email || '',
          full_name: authUser.user_metadata?.full_name,
          role: (authUser.user_metadata?.role as UserRole) || 'customer',
        };

        currentUserCache = { user: fallbackUser, timestamp: Date.now() };
        return fallbackUser;
      }

    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      currentUserCache = { user: null, timestamp: Date.now() };
      return null;
    } finally {
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
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange(async (_event, session) => {
    // Store the latest session IMMEDIATELY
    latestSession = session;

    // Clear cache to force refresh
    currentUserCache = null;

    if (session?.user) {
      const user = await getCurrentUser();
      callback(user);
    } else {
      currentUserCache = null;
      callback(null);
    }
  });
}
