import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { UserProfile, UserRole, SignupData, AuthContextType } from '../types/auth';
import { api } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to convert raw Supabase/auth errors into user-friendly messages
export function formatAuthError(error: any): string {
  if (!error) return 'An unexpected authentication error occurred.';
  const message = error.message || error.error_description || String(error);

  if (/invalid login credentials/i.test(message) || /invalid_grant/i.test(message)) {
    return 'Invalid email or password. Please check your credentials.';
  }
  if (/user already registered/i.test(message) || /already exists/i.test(message)) {
    return 'An account with this email address already exists.';
  }
  if (/email not confirmed/i.test(message) || /not verified/i.test(message)) {
    return 'Your email has not been verified yet. Please check your inbox.';
  }
  if (/rate limit/i.test(message) || /over_email_send_rate_limit/i.test(message) || error.status === 429) {
    return 'Too many requests. Please wait a minute before requesting another email.';
  }
  if (/password should be at least/i.test(message) || /weak_password/i.test(message)) {
    return 'Password must be at least 6 characters long.';
  }
  if (/network/i.test(message) || /fetch failed/i.test(message)) {
    return 'Network connection error. Please verify your internet connection.';
  }

  return message;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch or construct profile from Supabase PostgreSQL public.profiles
  const fetchProfile = useCallback(async (currentSession: Session | null): Promise<UserProfile | null> => {
    if (!currentSession?.user) return null;

    const currentUser = currentSession.user;
    const metadataRole = (currentUser.user_metadata?.role || 'student').toLowerCase() as UserRole;
    const metadataName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '';
    const isConfirmed = Boolean(currentUser.email_confirmed_at || currentUser.confirmed_at);

    if (!isSupabaseConfigured) {
      // Local development fallback profile if Supabase keys not set yet
      return {
        id: currentUser.id,
        full_name: metadataName || (metadataRole === 'teacher' ? 'Prof. Robert Chen' : 'Alex Rivera'),
        email: currentUser.email || '',
        role: metadataRole,
        email_verified: isConfirmed || true,
        avatar_url: currentUser.user_metadata?.avatar_url || null,
        created_at: currentUser.created_at,
        updated_at: new Date().toISOString(),
      };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('Could not fetch user profile from profiles table:', error.message);
      }

      if (data) {
        return {
          id: data.id,
          full_name: data.full_name || metadataName || 'EvallQ User',
          email: data.email || currentUser.email || '',
          role: (data.role?.toLowerCase() as UserRole) || metadataRole,
          email_verified: Boolean(data.email_verified || isConfirmed),
          avatar_url: data.avatar_url || null,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }

      // If profiles table trigger hasn't populated yet, attempt safe insert or fallback
      const fallbackProfile: UserProfile = {
        id: currentUser.id,
        full_name: metadataName || 'EvallQ User',
        email: currentUser.email || '',
        role: metadataRole,
        email_verified: isConfirmed,
        avatar_url: currentUser.user_metadata?.avatar_url || null,
        created_at: currentUser.created_at,
        updated_at: new Date().toISOString(),
      };

      try {
        await supabase.from('profiles').upsert({
          id: currentUser.id,
          full_name: fallbackProfile.full_name,
          email: fallbackProfile.email,
          role: fallbackProfile.role,
          email_verified: fallbackProfile.email_verified,
        });
      } catch (upsertErr) {
        // Non-blocking if table not yet migrated
      }

      return fallbackProfile;
    } catch (err) {
      console.warn('Profile fetch exception:', err);
      return {
        id: currentUser.id,
        full_name: metadataName || 'EvallQ User',
        email: currentUser.email || '',
        role: metadataRole,
        email_verified: isConfirmed,
        avatar_url: null,
      };
    }
  }, []);

  // Initialize session and setup auth listener
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Supabase getSession error:', error.message);
        }

        if (isMounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          api.setAuthToken(initialSession?.access_token ?? null);

          if (initialSession?.user) {
            const userProf = await fetchProfile(initialSession);
            if (isMounted) {
              setProfile(userProf);
            }
          } else {
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen to all Supabase Auth lifecycle events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);
      api.setAuthToken(newSession?.access_token ?? null);

      if (newSession?.user) {
        const userProf = await fetchProfile(newSession);
        if (isMounted) {
          setProfile(userProf);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Login handler
  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; isUnverified?: boolean }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return { success: false, error: formatAuthError(error) };
      }

      if (!data.user) {
        return { success: false, error: 'Sign in failed. No user returned.' };
      }

      const isVerified = Boolean(
        data.user.email_confirmed_at ||
        data.user.confirmed_at ||
        !isSupabaseConfigured // allow in local dev if no Supabase configured
      );

      const userProf = await fetchProfile(data.session);
      setProfile(userProf);
      setSession(data.session);
      setUser(data.user);
      api.setAuthToken(data.session?.access_token || null);

      return {
        success: true,
        isUnverified: !isVerified,
      };
    } catch (err: any) {
      return { success: false, error: formatAuthError(err) };
    }
  };

  // Signup handler
  const signup = async (
    data: SignupData
  ): Promise<{ success: boolean; error?: string; requiresVerification?: boolean }> => {
    try {
      const cleanEmail = data.email.trim().toLowerCase();
      const fullName = data.fullName.trim();

      if (!fullName) {
        return { success: false, error: 'Please enter your full name.' };
      }
      if (!cleanEmail) {
        return { success: false, error: 'Please enter a valid email address.' };
      }
      if (!data.password || data.password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long.' };
      }
      if (data.password !== data.confirmPassword) {
        return { success: false, error: 'Passwords do not match.' };
      }
      if (!data.role || !['student', 'teacher'].includes(data.role)) {
        return { success: false, error: 'Please select a valid role (Student or Teacher).' };
      }

      const redirectUrl = `${window.location.origin}/verify-email`;

      const { data: authData, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: data.password,
        options: {
          data: {
            full_name: fullName,
            role: data.role,
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        return { success: false, error: formatAuthError(error) };
      }

      const isConfirmed = Boolean(authData.user?.email_confirmed_at || authData.user?.confirmed_at);

      return {
        success: true,
        requiresVerification: !isConfirmed,
      };
    } catch (err: any) {
      return { success: false, error: formatAuthError(err) };
    }
  };

  // Logout handler
  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut error:', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      api.setAuthToken(null);
      localStorage.removeItem('evallq_auth_token');
      localStorage.removeItem('evallq_active_tab');
    }
  };

  // Forgot password
  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        return { success: false, error: 'Please provide your email address.' };
      }

      const redirectUrl = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        return { success: false, error: formatAuthError(error) };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: formatAuthError(err) };
    }
  };

  // Update password (during recovery flow)
  const updatePassword = async (password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!password || password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long.' };
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        return { success: false, error: formatAuthError(error) };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: formatAuthError(err) };
    }
  };

  // Resend verification email
  const resendVerification = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        return { success: false, error: 'Please provide a valid email address.' };
      }

      const redirectUrl = `${window.location.origin}/verify-email`;

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        return { success: false, error: formatAuthError(error) };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: formatAuthError(err) };
    }
  };

  // Profile update (name, avatar)
  const updateProfile = async (
    data: Partial<Pick<UserProfile, 'full_name' | 'avatar_url'>>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'No active authenticated session.' };
    }

    try {
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (data.full_name !== undefined) updates.full_name = data.full_name.trim();
      if (data.avatar_url !== undefined) updates.avatar_url = data.avatar_url;

      if (isSupabaseConfigured) {
        const { error: dbError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id);

        if (dbError) {
          return { success: false, error: dbError.message };
        }
      }

      // Also update auth user metadata
      await supabase.auth.updateUser({
        data: {
          full_name: updates.full_name,
          avatar_url: updates.avatar_url,
        },
      });

      // Update local profile state
      setProfile(prev => (prev ? { ...prev, ...updates } : null));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update profile.' };
    }
  };

  const refreshProfile = async () => {
    if (session) {
      const p = await fetchProfile(session);
      setProfile(p);
    }
  };

  // Compute email verification status
  const isEmailVerified: boolean = Boolean(
    user?.email_confirmed_at ||
    user?.confirmed_at ||
    profile?.email_verified ||
    !isSupabaseConfigured // Always considered verified in demo mode
  );

  const isAuthenticated = Boolean(user);
  const currentRole: UserRole | null = profile?.role || (user?.user_metadata?.role as UserRole) || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isAuthenticated,
        isEmailVerified,
        role: currentRole,
        isSupabaseConfigured,
        login,
        signup,
        logout,
        resetPassword,
        updatePassword,
        resendVerification,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
