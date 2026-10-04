import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  User,
  Mail,
  ShieldCheck,
  GraduationCap,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Camera,
  Save,
  LogOut,
  RefreshCw,
  KeyRound,
  IdCard,
} from 'lucide-react';

interface ProfilePageProps {
  onNavigate: (route: string) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=128&auto=format&fit=crop&q=80',
];

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user, profile, role, isEmailVerified, updateProfile, logout } = useAuth();
  const { theme } = useTheme();

  const [fullName, setFullName] = useState<string>(profile?.full_name || user?.user_metadata?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState<string>(profile?.avatar_url || user?.user_metadata?.avatar_url || '');
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) {
      setSaveStatus({ type: 'error', message: 'Full name must be at least 2 characters.' });
      return;
    }

    setSaving(true);
    setSaveStatus(null);

    const result = await updateProfile({
      full_name: fullName.trim(),
      avatar_url: avatarUrl || null,
    });

    setSaving(false);

    if (result.success) {
      setSaveStatus({ type: 'success', message: 'Profile updated successfully.' });
      setTimeout(() => setSaveStatus(null), 3000);
    } else {
      setSaveStatus({ type: 'error', message: result.error || 'Failed to update profile.' });
    }
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'October 2026';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className={`p-6 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
        theme === 'dark'
          ? 'bg-[#0A0A0A] border-white/[0.08]'
          : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#8052FF]/20 border border-[#8052FF]/30 flex items-center justify-center text-[#8052FF] text-xl font-bold shadow-sm">
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-[#8052FF]" />
              )}
            </div>
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center transition-opacity cursor-pointer text-white">
              <Camera className="w-5 h-5" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-xl font-semibold tracking-tight ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                {fullName || 'EvallQ User'}
              </h1>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-medium ${
                role === 'teacher'
                  ? 'bg-[#8052FF]/15 text-[#8052FF] border border-[#8052FF]/30'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}>
                {role === 'teacher' ? 'Instructor' : 'Student'}
              </span>
            </div>
            <p className={`text-xs mt-0.5 font-mono ${
              theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-500'
            }`}>
              {user?.email || profile?.email || 'user@evallq.ai'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('/forgot-password')}
            className={`py-2 px-3.5 rounded-xl border text-xs font-medium transition-colors flex items-center gap-1.5 ${
              theme === 'dark'
                ? 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] text-slate-200'
                : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-[#8052FF]" />
            <span>Change Password</span>
          </button>
          <button
            onClick={logout}
            className={`py-2 px-3.5 rounded-xl border text-xs font-medium transition-colors flex items-center gap-1.5 ${
              theme === 'dark'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Profile Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Account Verification & Readonly Information */}
        <div className="md:col-span-1 space-y-6">
          <div className={`p-5 rounded-3xl border space-y-4 ${
            theme === 'dark' ? 'bg-[#0A0A0A] border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <h3 className={`text-xs font-semibold uppercase tracking-wider ${
              theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-500'
            }`}>
              Identity & Security
            </h3>

            {/* Email Verification Status */}
            <div className="space-y-1">
              <label className="text-[11px] text-[#9A9A9A]">Verification Status</label>
              <div className="flex items-center gap-2">
                {isEmailVerified ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified Account</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Unverified Email</span>
                  </span>
                )}
              </div>
            </div>

            {/* Role (Read-only) */}
            <div className="space-y-1">
              <label className="text-[11px] text-[#9A9A9A]">System Role</label>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#8052FF]/15 text-[#8052FF]">
                  {role === 'teacher' ? <ShieldCheck className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                </div>
                <span className="text-xs font-medium capitalize">
                  {role === 'teacher' ? 'Instructor (Teacher)' : 'Student'}
                </span>
              </div>
              <p className="text-[10px] text-[#777] italic">
                Role is enforced at the database level and cannot be self-modified.
              </p>
            </div>

            {/* User ID */}
            <div className="space-y-1">
              <label className="text-[11px] text-[#9A9A9A]">Account UUID</label>
              <div className="flex items-center gap-1.5 font-mono text-[10px] p-2 rounded-xl bg-black/40 border border-white/[0.06] text-[#777] truncate">
                <IdCard className="w-3.5 h-3.5 shrink-0 text-[#8052FF]" />
                <span className="truncate">{user?.id || 'Local-UUID-001'}</span>
              </div>
            </div>

            {/* Member Since */}
            <div className="space-y-1">
              <label className="text-[11px] text-[#9A9A9A]">Joined EvallQ</label>
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="w-4 h-4 text-[#8052FF]" />
                <span>{memberSince}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Profile Data */}
        <div className="md:col-span-2 space-y-6">
          <form
            onSubmit={handleSave}
            className={`p-6 rounded-3xl border space-y-5 ${
              theme === 'dark' ? 'bg-[#0A0A0A] border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <h3 className={`text-xs font-semibold uppercase tracking-wider ${
              theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-500'
            }`}>
              Edit Profile Information
            </h3>

            {saveStatus && (
              <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                saveStatus.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}>
                {saveStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 text-[11px]">{saveStatus.message}</div>
              </div>
            )}

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
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your Name"
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs transition-colors outline-none border ${
                    theme === 'dark'
                      ? 'bg-black/60 border-white/[0.08] focus:border-[#8052FF] text-white'
                      : 'bg-slate-50 border-slate-200 focus:border-[#8052FF] text-slate-900'
                  }`}
                />
              </div>
            </div>

            {/* Email Address (Read-only) */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Email Address (Managed by Supabase Auth)
              </label>
              <div className="relative">
                <Mail className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                  theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-400'
                }`} />
                <input
                  type="email"
                  disabled
                  value={user?.email || profile?.email || ''}
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs outline-none border opacity-60 cursor-not-allowed ${
                    theme === 'dark'
                      ? 'bg-black/40 border-white/[0.05] text-[#9A9A9A]'
                      : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}
                />
              </div>
            </div>

            {/* Avatar Selector */}
            <div>
              <label className={`block text-xs font-medium mb-2 ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Select Profile Avatar
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {PRESET_AVATARS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatarUrl(preset)}
                    className={`w-11 h-11 rounded-2xl overflow-hidden border-2 transition-all ${
                      avatarUrl === preset
                        ? 'border-[#8052FF] scale-105 shadow-md shadow-[#8052FF]/30'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              {/* Custom Avatar URL option */}
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="url"
                  placeholder="Or paste an image URL..."
                  value={customAvatarInput}
                  onChange={e => setCustomAvatarInput(e.target.value)}
                  className={`flex-1 px-3.5 py-2 rounded-xl text-xs outline-none border ${
                    theme === 'dark'
                      ? 'bg-black/40 border-white/[0.08] focus:border-[#8052FF] text-white'
                      : 'bg-slate-50 border-slate-200 focus:border-[#8052FF] text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customAvatarInput.trim()) {
                      setAvatarUrl(customAvatarInput.trim());
                      setCustomAvatarInput('');
                    }
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium ${
                    theme === 'dark'
                      ? 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]'
                      : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  Use URL
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="py-2.5 px-6 rounded-xl bg-[#8052FF] hover:bg-[#6E3EF0] text-white text-xs font-semibold tracking-tight shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
