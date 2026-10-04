import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import {
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

interface ResetPasswordPageProps {
  onNavigate: (route: string) => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onNavigate }) => {
  const { updatePassword } = useAuth();
  const { theme } = useTheme();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check if session or recovery token is present
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean>(true);

  useEffect(() => {
    // Check if recovery event occurred or access token in hash
    const checkRecovery = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const hash = window.location.hash;
      const isRecovery = Boolean(session || hash.includes('type=recovery') || hash.includes('access_token='));
      setHasRecoverySession(isRecovery);
    };
    checkRecovery();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your new password.');
      return;
    }

    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Failed to update password. Your reset link may have expired.');
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      onNavigate('/login');
    }, 2000);
  };

  const hasMinLength = password.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

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
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#15846E]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#8052FF]/15 border border-[#8052FF]/30 flex items-center justify-center text-[#8052FF] mb-3 shadow-sm">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Set New Password</h2>
          <p className={`text-xs mt-1 leading-relaxed ${
            theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-500'
          }`}>
            Create a new password for your EvallQ account
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-400">Password Updated!</h3>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-500'}`}>
                Your password has been reset successfully. Redirecting to sign in...
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="w-full py-2.5 px-4 rounded-xl bg-[#8052FF] hover:bg-[#6E3EF0] text-white text-xs font-semibold tracking-tight shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Continue to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : !hasRecoverySession ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center shadow-sm">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-400">Invalid or Expired Link</h3>
              <p className={`text-xs mt-1 leading-relaxed ${theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-500'}`}>
                This password reset link is invalid or has expired. Please request a new link.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate('/forgot-password')}
                className="w-full py-2.5 px-4 rounded-xl bg-[#8052FF] hover:bg-[#6E3EF0] text-white text-xs font-semibold tracking-tight shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Request New Reset Link</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 text-[11px] leading-relaxed">{error}</div>
              </div>
            )}

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                New Password
              </label>
              <div className="relative">
                <Lock className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                  theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-400'
                }`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 chars"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs transition-colors outline-none border ${
                    theme === 'dark'
                      ? 'bg-black/60 border-white/[0.08] focus:border-[#8052FF] text-white'
                      : 'bg-slate-50 border-slate-200 focus:border-[#8052FF] text-slate-900'
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

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                  theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-400'
                }`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs transition-colors outline-none border ${
                    theme === 'dark'
                      ? 'bg-black/60 border-white/[0.08] focus:border-[#8052FF] text-white'
                      : 'bg-slate-50 border-slate-200 focus:border-[#8052FF] text-slate-900'
                  }`}
                />
              </div>
            </div>

            {/* Password Validation Indicators */}
            {password.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                <span className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-400' : 'text-[#777]'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? 'bg-emerald-400' : 'bg-white/20'}`} />
                  6+ chars
                </span>
                <span className={`flex items-center gap-1 ${hasLetter ? 'text-emerald-400' : 'text-[#777]'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${hasLetter ? 'bg-emerald-400' : 'bg-white/20'}`} />
                  Letter
                </span>
                <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-400' : 'text-[#777]'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${hasNumber ? 'bg-emerald-400' : 'bg-white/20'}`} />
                  Number
                </span>
                {confirmPassword.length > 0 && (
                  <span className={`flex items-center gap-1 ${passwordsMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${passwordsMatch ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    {passwordsMatch ? 'Matches' : 'Mismatch'}
                  </span>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#8052FF] hover:bg-[#6E3EF0] text-white text-xs font-semibold tracking-tight shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Save New Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
