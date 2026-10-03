import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, GraduationCap, ShieldCheck, Sparkles, ArrowRight, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login } = useApp();
  const [role, setRole] = useState<'TEACHER' | 'STUDENT'>('TEACHER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await login(email.trim(), password || (role === 'TEACHER' ? 'teacher123' : 'student123'), role);
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
      await login(demoEmail, demoRole === 'TEACHER' ? 'teacher123' : 'student123', demoRole);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Quick sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/[0.08] rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Subtle glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#8052FF]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#FFB829]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8052FF]/15 border border-[#8052FF]/30 flex items-center justify-center text-[#8052FF]">
              {role === 'TEACHER' ? <GraduationCap className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center tracking-tight">
                <span className="font-semibold text-lg text-white">Evall</span>
                <span className="font-semibold text-lg text-[#8052FF]">Q</span>
                <span className="ml-2 text-xs font-mono text-[#9A9A9A] uppercase tracking-wider">Authentication</span>
              </div>
              <p className="text-xs text-[#9A9A9A]">Evaluate less. Teach more.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#9A9A9A] hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-black rounded-xl border border-white/[0.08] mb-6">
          <button
            type="button"
            onClick={() => {
              setRole('TEACHER');
              setEmail('teacher@evallq.ai');
              setError(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              role === 'TEACHER'
                ? 'bg-[#8052FF] text-white shadow-sm'
                : 'text-[#9A9A9A] hover:text-white'
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
            className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              role === 'STUDENT'
                ? 'bg-[#8052FF] text-white shadow-sm'
                : 'text-[#9A9A9A] hover:text-white'
            }`}
          >
            Student Sign In
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-[#9A9A9A] mb-1.5 uppercase tracking-wider">
              {role === 'TEACHER' ? 'Instructor Email' : 'Student Email'}
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={role === 'TEACHER' ? 'teacher@evallq.ai' : 'student@evallq.ai'}
              required
              className="w-full px-3.5 py-2.5 bg-black border border-white/[0.12] rounded-xl text-white text-sm placeholder-[#555] focus:outline-none focus:border-[#8052FF] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[#9A9A9A] mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={role === 'TEACHER' ? 'teacher123' : 'student123'}
              className="w-full px-3.5 py-2.5 bg-black border border-white/[0.12] rounded-xl text-white text-sm placeholder-[#555] focus:outline-none focus:border-[#8052FF] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#8052FF] hover:bg-[#6D3DF5] text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="font-mono text-xs">Authenticating on-device...</span>
            ) : (
              <>
                <span>Sign In as {role === 'TEACHER' ? 'Teacher' : 'Student'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast-Switch Section */}
        <div className="mt-6 pt-5 border-t border-white/[0.08]">
          <div className="flex items-center gap-1.5 text-xs text-[#9A9A9A] font-mono uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#FFB829]" />
            <span>Instant Jury / Demo Accounts</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('teacher@evallq.ai', 'TEACHER')}
              className="p-2.5 bg-black hover:bg-white/[0.04] border border-white/[0.08] hover:border-[#8052FF]/40 rounded-xl text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white group-hover:text-[#8052FF] transition-colors">Prof. Robert Chen</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#8052FF]/20 text-[#8052FF]">TEACHER</span>
              </div>
              <p className="text-[11px] text-[#777] mt-0.5 truncate">teacher@evallq.ai</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('student@evallq.ai', 'STUDENT')}
              className="p-2.5 bg-black hover:bg-white/[0.04] border border-white/[0.08] hover:border-[#8052FF]/40 rounded-xl text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white group-hover:text-[#8052FF] transition-colors">Alex Rivera</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">STUDENT 1</span>
              </div>
              <p className="text-[11px] text-[#777] mt-0.5 truncate">student@evallq.ai</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('jordan@evallq.ai', 'STUDENT')}
              className="p-2.5 bg-black hover:bg-white/[0.04] border border-white/[0.08] hover:border-[#8052FF]/40 rounded-xl text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white group-hover:text-[#8052FF] transition-colors">Jordan Lee</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">STUDENT 2</span>
              </div>
              <p className="text-[11px] text-[#777] mt-0.5 truncate">jordan@evallq.ai</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('maya@evallq.ai', 'STUDENT')}
              className="p-2.5 bg-black hover:bg-white/[0.04] border border-white/[0.08] hover:border-[#8052FF]/40 rounded-xl text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white group-hover:text-[#8052FF] transition-colors">Maya Patel</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">STUDENT 3</span>
              </div>
              <p className="text-[11px] text-[#777] mt-0.5 truncate">maya@evallq.ai</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
