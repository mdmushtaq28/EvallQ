import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { UserRole } from '../../types/auth';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface SignupPageProps {
  onNavigate: (route: string) => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onNavigate }) => {
  const { signup } = useAuth();
  const { theme } = useTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your confirmation password.');
      return;
    }

    setLoading(true);

    const result = await signup({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      confirmPassword,
      role,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Registration failed. Please check your information.');
      return;
    }

    if (result.requiresVerification) {
      setSuccessMessage(
        'Account created successfully! Please check your email and verify your account before logging in.'
      );
    } else {
      setSuccessMessage('Account created successfully! Redirecting...');
      setTimeout(() => onNavigate('/'), 1200);
    }
  };

  // Password strength evaluation
  const hasMinLength = password.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  return (
    <div className={`min-h-[85vh] flex items-center justify-center p-4 sm:p-6 transition-colors ${
      theme === 'dark' ? 'text-white' : 'text-slate-900'
    }`}>
      <div className={`w-full max-w-lg rounded-3xl border p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl transition-all ${
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
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-1 text-2xl font-bold tracking-tight">
            <span>Evall</span>
            <span className="text-[#8052FF]">Q</span>
          </div>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-500'}`}>
            Join EvallQ to experience private, on-device AI assessment
          </p>
        </div>

        {/* Success Modal / Notice */}
        {successMessage ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-emerald-400">Account Created Successfully</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {successMessage}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate(`/verify-email?email=${encodeURIComponent(email)}`)}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold tracking-tight shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Continue to Email Verification</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Notification */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 text-[11px] leading-relaxed">{error}</div>
              </div>
            )}

            {/* Role Fast Selector */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Select Account Role
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                    role === 'student'
                      ? 'bg-[#8052FF]/15 border-[#8052FF] text-white shadow-sm ring-1 ring-[#8052FF]/50'
                      : theme === 'dark'
                        ? 'bg-black/40 border-white/[0.08] text-[#9A9A9A] hover:border-white/[0.18]'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    role === 'student' ? 'bg-[#8052FF] text-white' : 'bg-white/5 text-[#9A9A9A]'
                  }`}>
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${role === 'student' ? 'text-[#8052FF]' : ''}`}>
                      Student
                    </p>
                    <p className="text-[10px] opacity-75 mt-0.5 leading-snug">
                      Solve assignments, view AI feedback, and track progress
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                    role === 'teacher'
                      ? 'bg-[#8052FF]/15 border-[#8052FF] text-white shadow-sm ring-1 ring-[#8052FF]/50'
                      : theme === 'dark'
                        ? 'bg-black/40 border-white/[0.08] text-[#9A9A9A] hover:border-white/[0.18]'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    role === 'teacher' ? 'bg-[#8052FF] text-white' : 'bg-white/5 text-[#9A9A9A]'
                  }`}>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${role === 'teacher' ? 'text-[#8052FF]' : ''}`}>
                      Teacher
                    </p>
                    <p className="text-[10px] opacity-75 mt-0.5 leading-snug">
                      Create assignments, define rubrics, and review submissions
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Full Name
              </label>
              <div className="relative">
                <User className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                  theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-400'
                }`} />
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Alex Rivera or Prof. Robert Chen"
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs transition-colors outline-none border ${
                    theme === 'dark'
                      ? 'bg-black/60 border-white/[0.08] focus:border-[#8052FF] text-white placeholder-[#777]'
                      : 'bg-slate-50 border-slate-200 focus:border-[#8052FF] text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            {/* Email Address */}
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

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Password
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

              <div>
                <label className={`block text-xs font-medium mb-1.5 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Confirm Password
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
                    placeholder="Re-enter password"
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs transition-colors outline-none border ${
                      theme === 'dark'
                        ? 'bg-black/60 border-white/[0.08] focus:border-[#8052FF] text-white placeholder-[#777]'
                        : 'bg-slate-50 border-slate-200 focus:border-[#8052FF] text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#8052FF] hover:bg-[#6E3EF0] text-white text-xs font-semibold tracking-tight shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-4"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Links */}
        <div className={`mt-6 pt-5 border-t text-center text-xs ${
          theme === 'dark' ? 'border-white/[0.06] text-[#9A9A9A]' : 'border-slate-200 text-slate-500'
        }`}>
          <span>Already have an account? </span>
          <button
            onClick={() => onNavigate('/login')}
            className="text-[#8052FF] font-semibold hover:underline ml-1"
          >
            Log In
          </button>
        </div>
      </div>
    </div>
  );
};
