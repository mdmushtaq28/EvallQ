import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

interface VerifyEmailPageProps {
  onNavigate: (route: string) => void;
  emailParam?: string;
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ onNavigate, emailParam }) => {
  const { user, isEmailVerified, resendVerification, refreshProfile } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState<string>(() => {
    if (emailParam) return emailParam;
    if (user?.email) return user.email;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('email') || '';
  });

  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [checking, setChecking] = useState(false);

  // Check if URL contains confirmation hash/params from Supabase email link
  const [verificationResult, setVerificationResult] = useState<'success' | 'expired' | 'invalid' | null>(null);

  useEffect(() => {
    // Check if the URL hash contains verification tokens or error
    const hash = window.location.hash;
    if (hash) {
      if (hash.includes('error=access_denied') || hash.includes('error_code=otp_expired')) {
        setVerificationResult('expired');
      } else if (hash.includes('error=')) {
        setVerificationResult('invalid');
      } else if (hash.includes('access_token=') || hash.includes('type=signup') || hash.includes('type=email')) {
        setVerificationResult('success');
        refreshProfile();
      }
    }
  }, [refreshProfile]);

  const handleResend = async () => {
    if (cooldown > 0 || !email.trim()) return;

    setResending(true);
    setResendStatus(null);

    const result = await resendVerification(email.trim());
    setResending(false);

    if (result.success) {
      setResendStatus({
        type: 'success',
        message: 'A fresh verification link has been sent to your email address.',
      });
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setResendStatus({
        type: 'error',
        message: result.error || 'Failed to resend verification email.',
      });
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.email_confirmed_at || data?.user?.confirmed_at) {
        setVerificationResult('success');
        await refreshProfile();
      } else {
        setResendStatus({
          type: 'error',
          message: 'Email is not yet verified. Please click the link inside the confirmation email.',
        });
      }
    } catch (err) {
      // Non-blocking
    } finally {
      setChecking(false);
    }
  };

  const isConfirmed = isEmailVerified || verificationResult === 'success';

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

        {/* Verification Success View */}
        {isConfirmed ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-emerald-400">Email Verified!</h2>
              <p className={`text-xs mt-1 leading-relaxed ${
                theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-500'
              }`}>
                Your email address has been verified successfully. Your EvallQ account is now active and ready for use.
              </p>
            </div>
            <div className="pt-4">
              <button
                type="button"
                onClick={() => onNavigate('/')}
                className="w-full py-2.5 px-4 rounded-xl bg-[#8052FF] hover:bg-[#6E3EF0] text-white text-xs font-semibold tracking-tight shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : verificationResult === 'expired' ? (
          /* Expired Link View */
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center shadow-sm">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-amber-400">Verification Link Expired</h2>
              <p className={`text-xs mt-1 leading-relaxed ${
                theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-500'
              }`}>
                This email verification link has expired for security reasons. Please request a new verification link below.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="w-full py-2.5 px-4 rounded-xl bg-[#8052FF] hover:bg-[#6E3EF0] text-white text-xs font-semibold tracking-tight transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {resending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : cooldown > 0 ? (
                  <span>Resend available in {cooldown}s</span>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Send New Verification Link</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="text-xs text-[#8052FF] hover:underline font-medium"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : (
          /* Standard Awaiting Verification View */
          <div className="space-y-5">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#8052FF]/15 border border-[#8052FF]/30 flex items-center justify-center text-[#8052FF] mb-3 shadow-sm">
                <Mail className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Verify Your Email</h2>
              <p className={`text-xs mt-1 leading-relaxed ${
                theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-500'
              }`}>
                We've sent a verification link to your email address:
              </p>
              {email && (
                <span className="mt-2 px-3 py-1 rounded-full bg-[#8052FF]/10 text-[#8052FF] font-mono text-xs border border-[#8052FF]/20">
                  {email}
                </span>
              )}
            </div>

            {/* Status Feedback */}
            {resendStatus && (
              <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                resendStatus.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}>
                {resendStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 text-[11px]">{resendStatus.message}</div>
              </div>
            )}

            {/* Email Input if not present */}
            {!email && (
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@school.edu"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs transition-colors outline-none border ${
                    theme === 'dark'
                      ? 'bg-black/60 border-white/[0.08] focus:border-[#8052FF] text-white'
                      : 'bg-slate-50 border-slate-200 focus:border-[#8052FF] text-slate-900'
                  }`}
                />
              </div>
            )}

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleCheckStatus}
                disabled={checking}
                className="w-full py-2.5 px-4 rounded-xl bg-[#8052FF] hover:bg-[#6E3EF0] text-white text-xs font-semibold tracking-tight shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {checking ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Checking Status...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>I've Verified My Email</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={resending || cooldown > 0 || !email.trim()}
                className={`w-full py-2.5 px-4 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                  theme === 'dark'
                    ? 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] text-slate-200'
                    : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800'
                }`}
              >
                {resending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : cooldown > 0 ? (
                  <span>Resend available in {cooldown}s</span>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Resend Verification Email</span>
                  </>
                )}
              </button>
            </div>

            <div className={`pt-4 border-t text-center text-xs ${
              theme === 'dark' ? 'border-white/[0.06] text-[#9A9A9A]' : 'border-slate-200 text-slate-500'
            }`}>
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="text-[#8052FF] font-medium hover:underline"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
