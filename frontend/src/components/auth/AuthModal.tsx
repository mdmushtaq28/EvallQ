import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import {
  X,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (route: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const { login: supabaseLogin, isSupabaseConfigured, user, profile } = useAuth();
  const { login: legacyLogin, currentUser } = useApp();
  const { theme } = useTheme();

  const [role, setRole] = useState<'TEACHER' | 'STUDENT'>('TEACHER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const navigateTo = (route: string) => {
    onClose();
    if (onNavigate) {
      onNavigate(route);
    } else {
      window.history.pushState({}, '', route);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const pwd = password || (role === 'TEACHER' ? 'teacher123' : 'student123');

      // Try Supabase auth first
      if (isSupabaseConfigured) {
        const res = await supabaseLogin(email.trim(), pwd);
        if (!res.success) {
          setError(res.error || 'Authentication failed. Please verify credentials.');
          setLoading(false);
          return;
        }
        if (res.isUnverified) {
          navigateTo(`/verify-email?email=${encodeURIComponent(email.trim())}`);
          return;
        }
      } else {
        // Fallback local auth
        await legacyLogin(email.trim(), pwd, role);
      }

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoRole: 'TEACHER' | 'STUDENT') => {
    setLoading(true);
    setError(null);
    try {
      const pwd = demoRole === 'TEACHER' ? 'teacher123' : 'student123';
      if (isSupabaseConfigured) {
        const res = await supabaseLogin(demoEmail, pwd);
        if (!res.success) {
          // Fallback to legacy local login for seed users
          await legacyLogin(demoEmail, pwd, demoRole);
        }
      } else {
        await legacyLogin(demoEmail, pwd, demoRole);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Quick sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const activeEmail = profile?.email || user?.email || currentUser?.email;
  const activeName = profile?.full_name || currentUser?.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className={`relative w-full max-w-lg rounded-3xl border shadow-2xl p-6 sm:p-8 overflow-hidden transition-all ${
        theme === 'dark'
          ? 'bg-[#0A0A0A] border-white/[0.08] text-white shadow-black/80'
          : 'bg-white border-slate-200 text-slate-900 shadow-slate-200'
      }`}>
        {/* Glow ambient background highlights */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#8052FF]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#FFB829]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#8052FF]/15 border border-[#8052FF]/30 flex items-center justify-center text-[#8052FF]">
              {role === 'TEACHER' ? <GraduationCap className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center tracking-tight">
                <span className="font-semibold text-lg">Evall</span>
                <span className="font-semibold text-lg text-[#8052FF]">Q</span>
                <span className={`ml-2 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  theme === 'dark' ? 'bg-white/[0.06] text-[#9A9A9A]' : 'bg-slate-100 text-slate-500'
                }`}>
                  Supabase Auth
                </span>
              </div>
              <p className={`text-xs ${theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-500'}`}>
                {activeEmail ? `Signed in as ${activeName || activeEmail}` : 'Evaluate less. Teach more.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              theme === 'dark' ? 'text-[#9A9A9A] hover:text-white hover:bg-white/[0.05]' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active user action pills if already logged in */}
        {activeEmail && (
          <div className={`mb-5 p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
            theme === 'dark' ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-2 truncate">
              <div className="w-7 h-7 rounded-full bg-[#8052FF]/20 text-[#8052FF] flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <p className="font-medium truncate">{activeName || 'Current User'}</p>
                <p className="text-[10px] text-[#777] font-mono truncate">{activeEmail}</p>
              </div>
            </div>
            <button
              onClick={() => navigateTo('/profile')}
              className="py-1 px-3 rounded-lg bg-[#8052FF] text-white text-xs font-medium hover:bg-[#6E3EF0] transition-colors shrink-0"
            >
              My Profile
            </button>
          </div>
        )}

        {/* Role Switcher */}
        <div className={`grid grid-cols-2 gap-2 p-1 rounded-2xl border mb-5 ${
          theme === 'dark' ? 'bg-black border-white/[0.08]' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => {
              setRole('TEACHER');
              setEmail('teacher@evallq.ai');
              setError(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${
              role === 'TEACHER'
                ? 'bg-[#8052FF] text-white shadow-sm font-semibold'
                : theme === 'dark'
                  ? 'text-[#9A9A9A] hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Teacher Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('STUDENT');
              setEmail('student@evallq.ai');
              setError(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${
              role === 'STUDENT'
                ? 'bg-[#8052FF] text-white shadow-sm font-semibold'
                : theme === 'dark'
                  ? 'text-[#9A9A9A] hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Student Sign In
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="text-[11px] leading-relaxed">{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-mono mb-1.5 uppercase tracking-wider ${
              theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-500'
            }`}>
              {role === 'TEACHER' ? 'Instructor Email' : 'Student Email'}
            </label>
            <div className="relative">
              <Mail className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                theme === 'dark' ? 'text-[#777]' : 'text-slate-400'
              }`} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={role === 'TEACHER' ? 'teacher@evallq.ai' : 'student@evallq.ai'}
                required
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs transition-colors outline-none border ${
                  theme === 'dark'
                    ? 'bg-black border-white/[0.12] text-white focus:border-[#8052FF]'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#8052FF]'
                }`}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`text-xs font-mono uppercase tracking-wider ${
                theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-500'
              }`}>
                Password
              </label>
              <button
                type="button"
                onClick={() => navigateTo('/forgot-password')}
                className="text-[11px] text-[#8052FF] hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                theme === 'dark' ? 'text-[#777]' : 'text-slate-400'
              }`} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={role === 'TEACHER' ? 'teacher123' : 'student123'}
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs transition-colors outline-none border ${
                  theme === 'dark'
                    ? 'bg-black border-white/[0.12] text-white focus:border-[#8052FF]'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#8052FF]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${
                  theme === 'dark' ? 'text-[#9A9A9A] hover:text-white' : 'text-slate-400 hover:text-slate-800'
                }`}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#8052FF] hover:bg-[#6E3EF0] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md"
          >
            {loading ? (
              <span className="font-mono text-xs">Authenticating...</span>
            ) : (
              <>
                <span>Sign In as {role === 'TEACHER' ? 'Teacher' : 'Student'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Links to Full Pages */}
        <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${
          theme === 'dark' ? 'border-white/[0.08] text-[#9A9A9A]' : 'border-slate-200 text-slate-500'
        }`}>
          <button
            type="button"
            onClick={() => navigateTo('/signup')}
            className="text-[#8052FF] font-medium hover:underline"
          >
            Don't have an account? Sign Up
          </button>
          <button
            type="button"
            onClick={() => navigateTo('/login')}
            className="hover:underline"
          >
            Full Login Page
          </button>
        </div>

        {/* Demo Fast-Switch Section */}
        <div className="mt-5 pt-4 border-t border-white/[0.08]">
          <div className="flex items-center gap-1.5 text-xs text-[#9A9A9A] font-mono uppercase tracking-wider mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-[#FFB829]" />
            <span>Fast-Switch Test Accounts</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('teacher@evallq.ai', 'TEACHER')}
              className={`p-2 rounded-xl text-left border transition-all ${
                theme === 'dark'
                  ? 'bg-black hover:bg-white/[0.04] border-white/[0.08] hover:border-[#8052FF]/40'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-[#8052FF]/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium truncate">Prof. Chen</span>
                <span className="text-[9px] font-mono px-1 rounded bg-[#8052FF]/20 text-[#8052FF]">TEACHER</span>
              </div>
              <p className="text-[10px] text-[#777] truncate">teacher@evallq.ai</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('student@evallq.ai', 'STUDENT')}
              className={`p-2 rounded-xl text-left border transition-all ${
                theme === 'dark'
                  ? 'bg-black hover:bg-white/[0.04] border-white/[0.08] hover:border-[#8052FF]/40'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-[#8052FF]/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium truncate">Alex Rivera</span>
                <span className="text-[9px] font-mono px-1 rounded bg-emerald-500/20 text-emerald-400">STUDENT</span>
              </div>
              <p className="text-[10px] text-[#777] truncate">student@evallq.ai</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
