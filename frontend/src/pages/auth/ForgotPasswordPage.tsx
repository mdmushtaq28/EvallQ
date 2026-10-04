import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Mail,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface ForgotPasswordPageProps {
  onNavigate: (route: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const { resetPassword } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await resetPassword(email.trim());
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Failed to send password reset request.');
      return;
    }

    // Always show uniform confirmation to prevent email enumeration
    setSubmitted(true);
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
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Forgot Password?</h2>
          <p className={`text-xs mt-1 leading-relaxed ${
            theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-500'
          }`}>
            Enter your registered email address and we'll send you a secure link to reset your password.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-2">
              <CheckCircle2 className="w-6 h-6 mx-auto" />
              <h3 className="text-sm font-semibold">Check Your Email</h3>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                If an account exists for this email, a password reset link has been sent. Please check your inbox and spam folders.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="w-full py-2.5 px-4 rounded-xl bg-[#8052FF] hover:bg-[#6E3EF0] text-white text-xs font-semibold tracking-tight shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Return to Sign In</span>
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
                      ? 'bg-black/60 border-white/[0.08] focus:border-[#8052FF] text-white'
                      : 'bg-slate-50 border-slate-200 focus:border-[#8052FF] text-slate-900'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#8052FF] hover:bg-[#6E3EF0] text-white text-xs font-semibold tracking-tight shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending reset link...</span>
                </>
              ) : (
                <>
                  <span>Send Password Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className={`pt-4 border-t text-center text-xs ${
              theme === 'dark' ? 'border-white/[0.06] text-[#9A9A9A]' : 'border-slate-200 text-slate-500'
            }`}>
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="text-[#8052FF] font-medium hover:underline inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
