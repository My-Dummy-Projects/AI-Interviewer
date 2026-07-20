import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  LogOut,
  Save,
  ArrowLeft,
  Loader2,
  Mail,
  KeyRound,
  Bell,
  LayoutDashboard,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Shield,
  Calendar,
  Zap,
  Trash2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { VoxaLogo } from "@/components/VoxaLogo";
import { useAuth } from "@/context/AuthContext";
import { useUser } from "@clerk/clerk-react";
import { useProfileQuery, useSubscriptionQuery } from "@/hooks/useApiQueries";
import { useUpdateProfileMutation } from "@/hooks/useApiMutations";
import { LoadingScreen } from "@/components/LoadingScreen";
import { toast } from "sonner";

const PLAN_LABELS = { free: "Free", starter: "Starter", pro: "Pro" };

function fmtDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function pct(a, b) {
  if (!b || b === 0) return 0;
  return Math.min(Math.round((a / b) * 100), 100);
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signout } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfileQuery(!!user);
  const { data: subscription } = useSubscriptionQuery(!!user);

  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");

  const { user: clerkUser } = useUser();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const updateProfile = useUpdateProfileMutation();

  useEffect(() => {
    if (profile) {
      setEditName(profile.display_name || "");
      setEditBio(profile.bio || "");
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile.mutateAsync({ display_name: editName.trim(), bio: editBio.trim() });
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signout();
      toast.success("Signed out");
      navigate("/");
    } catch {
      // ignore
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    setPasswordSaving(true);
    try {
      await clerkUser.updatePassword({
        currentPassword,
        newPassword,
        signOutOfOtherSessions: true,
      });
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordOpen(false);
    } catch (err) {
      const detail = err.errors?.[0]?.longMessage || "Failed to update password";
      toast.error(detail);
    } finally {
      setPasswordSaving(false);
    }
  };

  if (authLoading) {
    return <LoadingScreen message="Loading profile..." />;
  }
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (profileLoading) {
    return <LoadingScreen message="Loading profile..." />;
  }

  const planName = subscription?.plan ? PLAN_LABELS[subscription.plan] || subscription.plan : "Free";
  const remaining = subscription?.interviewsRemaining ?? 0;
  const allowed = subscription?.interviewsAllowed ?? 2;
  const usagePct = pct(allowed - remaining, allowed);

  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="ambient-glow" />

      <Navbar
        left={
          <>
            <Link to={user ? "/dashboard" : "/"} data-testid="profile-nav-logo">
              <VoxaLogo size={22} />
            </Link>
            <div className="hidden md:block h-5 w-px bg-white" />
            <div className="hidden md:block label-overline">Settings</div>
          </>
        }
        right={
          <Link to="/dashboard">
            <Button variant="outline" className="rounded-full bg-transparent border-white/15 hover:bg-white/5 text-white h-9 px-4 text-sm">
              <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-sm text-zinc-400 group-hover:text-white transition-colors max-w-[140px] truncate font-medium">
                Dashboard
              </span>
            </Button>
          </Link>
        }
      />

      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/dashboard" className="text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white" style={{ fontFamily: "var(--font-heading)" }}>
              Settings
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Manage your profile, plan, and account preferences.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── Left sidebar ── */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 text-center">
              <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center text-2xl font-bold text-black shadow-lg">
                {profile?.display_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <h2 className="mt-4 text-lg font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
                {profile?.display_name || "User"}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">{profile?.email || ""}</p>

              <div className="mt-6 pt-6 border-t border-white/5 space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Shield className="h-4 w-4" strokeWidth={1.5} />
                    <span>Plan</span>
                  </div>
                  <span className="text-sm font-semibold text-white capitalize">{planName}</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Zap className="h-4 w-4" strokeWidth={1.5} />
                      <span>Interviews</span>
                    </div>
                    <span className="text-sm text-zinc-300">
                      <span className="text-white font-medium">{remaining}</span>
                      <span className="text-zinc-500"> / {allowed}</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${usagePct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Calendar className="h-4 w-4" strokeWidth={1.5} />
                    <span>Member since</span>
                  </div>
                  <span className="text-sm text-zinc-300">{fmtDate(profile?.created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Main content ── */}
          <div className="lg:col-span-8 space-y-6">
            {/* Personal Information */}
            <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 md:p-8">
              <h2 className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
                Personal information
              </h2>
              <div className="mt-6 space-y-5 max-w-lg">
                <div>
                  <Label htmlFor="display-name" className="label-overline mb-2 block">
                    Display name
                  </Label>
                  <Input
                    id="display-name"
                    data-testid="profile-display-name-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Your display name"
                    className="h-11 rounded-lg bg-white/[0.03] border-white/10 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40 text-sm text-white placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <Label htmlFor="email-display" className="label-overline mb-2 block">
                    Email
                  </Label>
                  <div className="flex items-center gap-3 h-11 px-3 rounded-lg bg-white/[0.02] border border-white/10">
                    <Mail className="h-4 w-4 text-zinc-500 shrink-0" strokeWidth={1.5} />
                    <span className="text-sm text-zinc-300 flex-1">{profile?.email || ""}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                      <CheckCircle className="h-3.5 w-3.5" strokeWidth={2} />
                      Verified
                    </span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="bio" className="label-overline mb-2 block">
                    Bio
                  </Label>
                  <textarea
                    id="bio"
                    data-testid="profile-bio-input"
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Tell us a bit about yourself"
                    rows={3}
                    className="flex w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 transition-colors focus-visible:outline-none focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40 h-auto min-h-[80px] resize-none"
                  />
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  data-testid="profile-save-button"
                  className="h-10 rounded-full bg-white hover:bg-zinc-200 text-black px-5 text-sm font-semibold disabled:bg-white/10 disabled:text-zinc-600"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save changes
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Account & Security */}
            <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 md:p-8">
              <h2 className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
                Account & security
              </h2>
              <div className="mt-6 space-y-3 max-w-lg">
                {/* Change Password */}
                <button
                  onClick={() => setPasswordOpen(!passwordOpen)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left"
                >
                  <KeyRound className="h-5 w-5 text-zinc-400 shrink-0" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Change password</p>
                    <p className="text-xs text-zinc-500">Update your account password</p>
                  </div>
                  {passwordOpen ? (
                    <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                  )}
                </button>

                {passwordOpen && (
                  <form onSubmit={handleChangePassword} className="space-y-4 pl-1">
                    <div>
                      <Label htmlFor="current-password" className="label-overline mb-2 block">Current password</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showPasswords ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          className="h-11 rounded-lg bg-white/[0.03] border-white/10 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40 text-sm text-white placeholder:text-zinc-600 pr-10"
                          required
                          autoFocus
                        />
                        <button
                          type="button"
                          aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
                          onClick={() => setShowPasswords(!showPasswords)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                        >
                          {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="new-password" className="label-overline mb-2 block">New password</Label>
                      <Input
                        id="new-password"
                        type={showPasswords ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className="h-11 rounded-lg bg-white/[0.03] border-white/10 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40 text-sm text-white placeholder:text-zinc-600"
                        required
                        minLength={8}
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirm-password" className="label-overline mb-2 block">Confirm new password</Label>
                      <Input
                        id="confirm-password"
                        type={showPasswords ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="h-11 rounded-lg bg-white/[0.03] border-white/10 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40 text-sm text-white placeholder:text-zinc-600"
                        required
                      />
                    </div>
                    <div className="flex gap-3 pt-1">
                      <Button
                        type="submit"
                        disabled={!currentPassword || !newPassword || !confirmPassword || passwordSaving}
                        className="h-10 rounded-full bg-white hover:bg-zinc-200 text-black px-5 text-sm font-semibold disabled:bg-white/10 disabled:text-zinc-600"
                      >
                        {passwordSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          "Update password"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setPasswordOpen(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}
                        className="h-10 rounded-full bg-transparent border-white/15 hover:bg-white/5 text-white px-5 text-sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}

                {/* Email Notifications */}
                <div className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                  <Bell className="h-5 w-5 text-zinc-400 shrink-0" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Email notifications</p>
                    <p className="text-xs text-zinc-500">Coming soon</p>
                  </div>
                </div>

                {/* Sign Out */}
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left"
                >
                  <LogOut className="h-5 w-5 text-zinc-400 shrink-0" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Sign out</p>
                    <p className="text-xs text-zinc-500">Sign out of your account</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.02] p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-lg bg-red-400/10 border border-red-400/20 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-red-400" strokeWidth={1.5} />
                </div>
                <h2 className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
                  Danger zone
                </h2>
              </div>
              <div className="max-w-lg">
                <div className="flex items-center gap-4 p-4 rounded-xl border border-red-400/10 bg-red-400/[0.03]">
                  <Trash2 className="h-5 w-5 text-red-400 shrink-0" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Delete account</p>
                    <p className="text-xs text-zinc-500">Permanently delete your account and all data</p>
                  </div>
                  <Button
                    disabled
                    variant="outline"
                    className="rounded-full h-9 px-4 text-xs font-medium bg-transparent border-red-400/30 text-red-400 cursor-not-allowed shrink-0"
                  >
                    Coming soon
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
