import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { VoxaLogo } from "@/components/VoxaLogo";
import { LoadingOverlay } from "@/components/LoadingScreen";
import api from "@/lib/api";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [parsing, setParsing] = useState(true);
  const [parseError, setParseError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const passwordMinLen = 6;
  const isValid = password.length >= passwordMinLen && password === confirmPassword;

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) {
      setParseError("Invalid or missing reset token. Please request a new password reset link.");
      setParsing(false);
      return;
    }
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");
    const refresh = params.get("refresh_token");
    const type = params.get("type");
    if (!token || type !== "recovery") {
      setParseError("Invalid or expired reset link. Please request a new one.");
      setParsing(false);
      return;
    }
    setAccessToken(token);
    setRefreshToken(refresh || "");
    setParsing(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.updatePassword(accessToken, password);
      setSuccess(true);
      toast.success("Password updated");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to update password";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (parsing) {
    return (
      <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden flex flex-col items-center justify-center">
        <LoadingOverlay show={true} message="Verifying reset link..." />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden flex flex-col">
      <LoadingOverlay show={loading} message="Updating password..." />
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="ambient-glow" />

      <Navbar
        left={
          <>
            <Link to="/" data-testid="reset-password-nav-logo"><VoxaLogo size={28} /></Link>
            <div className="hidden md:block h-5 w-px bg-white/10" />
            <div className="hidden md:block label-overline">Reset Password</div>
          </>
        }
        right={
          <Link to="/signin">
            <Button variant="outline" className="rounded-full bg-transparent border-white/15 hover:bg-white/5 text-white h-9 px-4 text-sm">
              Back to sign in
            </Button>
          </Link>
        }
      />

      <main className="relative flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {parseError ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-red-400" />
              <h2 className="mt-4 text-lg font-semibold text-white">Invalid reset link</h2>
              <p className="mt-2 text-sm text-zinc-400">{parseError}</p>
              <Link to="/forgot-password">
                <Button
                  variant="outline"
                  className="mt-6 rounded-full bg-transparent border-white/15 hover:bg-white/5 text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Request new link
                </Button>
              </Link>
            </div>
          ) : success ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-emerald-400" />
              <h2 className="mt-4 text-lg font-semibold text-white">Password updated</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Your password has been changed successfully.
              </p>
              <Link to="/signin">
                <Button className="mt-6 rounded-full bg-white hover:bg-zinc-200 text-black h-12 px-6 text-sm font-semibold">
                  Sign in with new password
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="label-overline mb-3">Choose a new password</div>
                <h1
                  className="text-4xl font-black tracking-tighter leading-[0.95] text-white"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Set your{" "}
                  <span className="bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
                    new password
                  </span>
                </h1>
                <p className="mt-4 text-sm text-zinc-400">
                  Must be at least {passwordMinLen} characters
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 md:p-8 space-y-5"
              >
                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <Label htmlFor="password" className="label-overline mb-2 block">
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      data-testid="reset-password-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="h-12 rounded-lg bg-white/[0.03] border-white/10 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40 text-base text-white placeholder:text-zinc-600 pl-10 pr-10"
                      required
                      minLength={passwordMinLen}
                      autoFocus
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirm-password" className="label-overline mb-2 block">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="confirm-password"
                      type="password"
                      data-testid="reset-password-confirm-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="h-12 rounded-lg bg-white/[0.03] border-white/10 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40 text-base text-white placeholder:text-zinc-600 pl-10"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  data-testid="reset-password-submit-button"
                  disabled={!isValid || loading}
                  className="w-full h-12 rounded-full bg-white hover:bg-zinc-200 text-black text-sm font-semibold tracking-wide disabled:bg-white/10 disabled:text-zinc-600"
                >
                  {loading ? "Updating..." : "Update password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
