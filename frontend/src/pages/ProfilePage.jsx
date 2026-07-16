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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { VoxaLogo } from "@/components/VoxaLogo";
import { useAuth } from "@/context/AuthContext";
import { useUser } from "@clerk/clerk-react";
import api from "@/lib/api";
import { LoadingScreen } from "@/components/LoadingScreen";
import { toast } from "sonner";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signout, refreshProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/signin", { replace: true });
      return;
    }
    if (user) {
      loadProfile();
    }
  }, [user, authLoading, navigate]);

  const loadProfile = async () => {
    try {
      const data = await api.getProfile();
      setProfile(data);
      setEditName(data.display_name || "");
      setEditBio(data.bio || "");
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.updateProfile({ display_name: editName.trim(), bio: editBio.trim() });
      await refreshProfile();
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
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
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

  if (authLoading || (!user && !authLoading)) {
    return <LoadingScreen message="Loading profile..." />;
  }

  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="ambient-glow" />

      <Navbar
        left={
          <>
            <Link to={user ? '/dashboard' : '/'} data-testid="profile-nav-logo">
              <VoxaLogo size={28} />
            </Link>
            <div className="hidden md:block h-5 w-px bg-white/10" />
            <div className="hidden md:block label-overline">Profile Settings</div>
          </>
        }
        right={
          <Link to="/dashboard">
            <Button variant="outline" className="rounded-full bg-transparent border-white/15 hover:bg-white/5 text-white h-9 px-4 text-sm">
              <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
              Dashboard
            </Button>
          </Link>
        }
      />

      <main className="relative max-w-4xl mx-auto px-6 py-8 md:py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/dashboard" className="text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white" style={{ fontFamily: "var(--font-heading)" }}>
              Profile Settings
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Manage your personal information and preferences.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Avatar card */}
          <div>
            <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 text-center">
              <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/10 flex items-center justify-center">
                <User className="h-9 w-9 text-zinc-300" strokeWidth={1.5} />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
                {profile?.display_name || "User"}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">{profile?.email || ""}</p>
            </div>
          </div>

          {/* Profile form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 md:p-8">
              <h2 className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
                Personal Information
              </h2>
              <div className="mt-6 space-y-5 max-w-lg">
                <div>
                  <Label htmlFor="display-name" className="label-overline mb-2 block">
                    Display Name
                  </Label>
                  <Input
                    id="display-name"
                    data-testid="profile-display-name-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Your display name"
                    className="h-12 rounded-lg bg-white/[0.03] border-white/10 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40 text-base text-white placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <Label htmlFor="email-display" className="label-overline mb-2 block">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="email-display"
                      value={profile?.email || ""}
                      disabled
                      className="h-12 rounded-lg bg-white/[0.03] border-white/10 text-base text-zinc-400 cursor-not-allowed pl-10"
                    />
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
                    className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-auto min-h-[80px] bg-white/[0.03] border-white/10 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40 text-white placeholder:text-zinc-600"
                  />
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  data-testid="profile-save-button"
                  className="h-11 rounded-full bg-white hover:bg-zinc-200 text-black px-6 text-sm font-semibold tracking-wide disabled:bg-white/10 disabled:text-zinc-600"
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

            {/* Account settings */}
            <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 md:p-8">
              <h2 className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
                Account
              </h2>
              <div className="mt-6 space-y-4 max-w-lg">
                <div className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                  <Bell className="h-5 w-5 text-zinc-400 shrink-0" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Email Notifications</p>
                    <p className="text-xs text-zinc-500">Coming soon</p>
                  </div>
                </div>
                <button
                  onClick={() => setPasswordOpen(!passwordOpen)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left"
                >
                  <KeyRound className="h-5 w-5 text-zinc-400 shrink-0" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Password</p>
                    <p className="text-xs text-zinc-500">Change or update your password</p>
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
                      <Label htmlFor="current-password" className="label-overline mb-2 block">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showPasswords ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          className="h-12 rounded-lg bg-white/[0.03] border-white/10 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40 text-base text-white placeholder:text-zinc-600 pr-10"
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
                      <Label htmlFor="new-password" className="label-overline mb-2 block">New Password</Label>
                      <Input
                        id="new-password"
                        type={showPasswords ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="h-12 rounded-lg bg-white/[0.03] border-white/10 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40 text-base text-white placeholder:text-zinc-600"
                        required
                        minLength={6}
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirm-password" className="label-overline mb-2 block">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type={showPasswords ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="h-12 rounded-lg bg-white/[0.03] border-white/10 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40 text-base text-white placeholder:text-zinc-600"
                        required
                      />
                    </div>
                    <div className="flex gap-3 pt-1">
                      <Button
                        type="submit"
                        disabled={!currentPassword || !newPassword || !confirmPassword || passwordSaving}
                        className="h-10 rounded-full bg-white hover:bg-zinc-200 text-black px-5 text-sm font-semibold tracking-wide disabled:bg-white/10 disabled:text-zinc-600"
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
              </div>
            </div>

            {/* Sign out */}
            <div className="flex justify-end">
              <button
                onClick={handleSignOut}
                aria-label="Sign out"
                className="flex items-center gap-2 text-sm text-zinc-500 hover:text-red-300 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
