import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'student' | 'teacher';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  email_verified: boolean;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SignupData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  role: UserRole | null;
  isSupabaseConfigured: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; isUnverified?: boolean }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: Partial<Pick<UserProfile, 'full_name' | 'avatar_url'>>) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}
