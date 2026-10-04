import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  AlertCircle,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

interface LoginPageProps {
  onNavigate: (route: string) => void;
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onSuccess }) => {
  const { login, resendVerification, isSupabaseConfigured } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Unverified email notification state
  const [isUnverified, setIsUnverified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError(null);
    setIsUnverified(false);
    setResendSuccess(null);

    const result = await login(email.trim(), password);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Authentication failed. Please verify credentials.');
      return;
    }

    if (result.isUnverified) {
      setIsUnverified(true);
      return;
    }

    if (onSuccess) {
      onSuccess();
    } else {
      onNavigate('/');
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email.trim()) return;
    setResendLoading(true);
    setError(null);
    setResendSuccess(null);

    const res = await resendVerification(email.trim());
    setResendLoading(false);

    if (res.success) {
      setResendSuccess('Verification email sent! Check your inbox.');
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setError(res.error || 'Could not resend verification email.');
    }
  };

  return (
    <div className={`min-h-[85vh] flex items-center justify-center p-4 sm:p-6 transition-colors ${
      theme === 'dark' ? 'text-white' : 'text-slate-900'
    }`}>
      <div className={`w-full max-w-md rounded-3xl border p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl transition-all ${
        theme === 'dark'
          ? 'bg-[#0A0A0A] border-white/[0.08] shadow-black/80'
          : 'bg-white border-slate-200 shadow-slate-200'
      }`}>
        {/* Glow ambient background highlights */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#8052FF]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#FFB829]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#8052FF]/15 border border-[#8052FF]/30 flex items-center justify-center text-[#8052FF] mb-3 shadow-sm">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-1 text-2xl font-bold tracking-tight">
            <span>Evall</span>
            <span className="text-[#8052FF]">Q</span>
          </div>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-500'}`}>
            Sign in to access your courses, rubrics, and assessments
          </p>
        </div>

        {/* Configuration Notice if Supabase keys not set */}
        {!isSupabaseConfigured && (
          <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Local Development Mode</p>
              <p className="text-[11px] opacity-90 mt-0.5">
                Supabase credentials not configured in <code className="px-1 py-0.5 bg-black/20 rounded">.env</code>. Test accounts work seamlessly.
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 text-[11px] leading-relaxed">{error}</div>
          </div>
        )}

        {/* Unverified Email Warning Banner */}
        {isUnverified && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Please verify your email</p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Your account requires email verification before accessing protected course materials.
                </p>
              </div>
            </div>
            {resendSuccess && (
              <p className="text-[11px] text-emerald-400 font-medium">{resendSuccess}</p>
            )}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading || resendCooldown > 0}
              className="w-full py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {resendLoading ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : resendCooldown > 0 ? (
                <span>Resend available in {resendCooldown}s</span>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5" />
                  <span>Resend Verification Email</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Email Address
            </label>
            <div className="relative">
              <Mail className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-400'
              }`} />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@school.edu"
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs transition-colors outline-none border ${
                  theme === 'dark'
                    ? 'bg-black/60 border-white/[0.08] focus:border-[#8052FF] text-white placeholder-[#777]'
                    : 'bg-slate-50 border-slate-200 focus:border-[#8052FF] text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`text-xs font-medium ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Password
              </label>
              <button
                type="button"
                onClick={() => onNavigate('/forgot-password')}
                className="text-[11px] text-[#8052FF] hover:underline font-medium"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-400'
              }`} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs transition-colors outline-none border ${
                  theme === 'dark'
                    ? 'bg-black/60 border-white/[0.08] focus:border-[#8052FF] text-white placeholder-[#777]'
                    : 'bg-slate-50 border-slate-200 focus:border-[#8052FF] text-slate-900 placeholder-slate-400'
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
            className="w-full py-2.5 px-4 rounded-xl bg-[#8052FF] hover:bg-[#6E3EF0] text-white text-xs font-medium tracking-tight shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className={`mt-6 pt-5 border-t text-center text-xs ${
          theme === 'dark' ? 'border-white/[0.06] text-[#9A9A9A]' : 'border-slate-200 text-slate-500'
        }`}>
          <span>Don't have an account? </span>
          <button
            onClick={() => onNavigate('/signup')}
            className="text-[#8052FF] font-semibold hover:underline ml-1"
          >
            Create an Account
          </button>
        </div>
      </div>
    </div>
  );
};
