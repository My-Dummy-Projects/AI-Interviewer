import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, AlertTriangle, CheckCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { VoxaLogo } from "@/components/VoxaLogo";
import { useAuth } from "@/context/AuthContext";
import { useSignIn } from "@clerk/clerk-react";
import { LoadingOverlay } from "@/components/LoadingScreen";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const { user } = useAuth();
  const { signIn, setActive } = useSignIn();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const otpRefs = useRef([]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      if (result.status === "needs_first_factor") {
        setStep("otp");
        toast.success("Code sent to your email");
      }
    } catch (err) {
      const detail = err.errors?.[0]?.longMessage || "Failed to send reset code";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const otpCode = otp.join("");
  const canVerifyOtp = otpCode.length === 6;

  const handleVerifyOtp = async () => {
    if (!canVerifyOtp) return;
    setLoading(true);
    setError("");
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: otpCode,
      });
      if (result.status === "needs_new_password") {
        setStep("password");
        toast.success("Code verified. Set your new password.");
      }
    } catch (err) {
      const detail = err.errors?.[0]?.longMessage || "Invalid code";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      toast.success("New code sent");
    } catch {
      setError("Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  const passwordMinLen = 6;
  const isValidPassword = newPassword.length >= passwordMinLen && newPassword === confirmPassword;

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!isValidPassword) {
      if (newPassword !== confirmPassword) {
        setError("Passwords do not match");
      } else {
        setError(`Password must be at least ${passwordMinLen} characters`);
      }
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await signIn.resetPassword({ password: newPassword });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setSuccess(true);
        toast.success("Password updated successfully");
      }
    } catch (err) {
      const detail = err.errors?.[0]?.longMessage || "Failed to reset password";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden flex flex-col">
      <LoadingOverlay show={loading} message={step === "otp" ? "Verifying code..." : step === "password" ? "Resetting password..." : "Sending..."} />
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="ambient-glow" />

      <Navbar
        left={
          <>
            <Link to={user ? "/dashboard" : "/"} data-testid="forgot-password-nav-logo"><VoxaLogo size={28} /></Link>
            <div className="hidden md:block h-5 w-px bg-white/10" />
            <div className="hidden md:block label-overline">Reset Password</div>
          </>
        }
        right={
          step !== "email" ? (
            <Button
              variant="outline"
              onClick={() => { setStep("email"); setOtp(["", "", "", "", "", ""]); setError(""); }}
              className="rounded-full bg-transparent border-white/15 hover:bg-white/5 text-white h-9 px-4 text-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
          ) : (
            <Link to="/signin">
              <Button variant="outline" className="rounded-full bg-transparent border-white/15 hover:bg-white/5 text-white h-9 px-4 text-sm">
                Back to sign in
              </Button>
            </Link>
          )
        }
      />

      <main className="relative flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {success ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-emerald-400" />
              <h2 className="mt-4 text-lg font-semibold text-white">Password updated</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Your password has been changed successfully.
              </p>
              <Link to="/dashboard">
                <Button className="mt-6 rounded-full bg-white hover:bg-zinc-200 text-black h-12 px-6 text-sm font-semibold">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          ) : step === "password" ? (
            <>
              <div className="text-center mb-8">
                <div className="label-overline mb-3">Set new password</div>
                <h1
                  className="text-4xl font-black tracking-tighter leading-[0.95] text-white"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Choose a{" "}
                  <span className="bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
                    new password
                  </span>
                </h1>
                <p className="mt-4 text-sm text-zinc-400">
                  Must be at least {passwordMinLen} characters
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 md:p-8 space-y-5">
                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <Label htmlFor="new-password" className="label-overline mb-2 block">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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
                  <Label htmlFor="confirm-password" className="label-overline mb-2 block">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="confirm-password"
                      type="password"
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
                  disabled={!isValidPassword || loading}
                  className="w-full h-12 rounded-full bg-white hover:bg-zinc-200 text-black text-sm font-semibold tracking-wide disabled:bg-white/10 disabled:text-zinc-600 group"
                >
                  {loading ? "Resetting..." : "Reset password"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />}
                </Button>
              </form>
            </>
          ) : step === "otp" ? (
            <>
              <div className="text-center mb-8">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-xl bg-cyan-400/10 border border-cyan-400/20 mb-4">
                  <ShieldCheck className="h-6 w-6 text-cyan-300" />
                </div>
                <div className="label-overline mb-3">Check your inbox</div>
                <h1
                  className="text-3xl font-black tracking-tighter leading-[0.95] text-white"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Enter reset code
                </h1>
                <p className="mt-3 text-sm text-zinc-400 max-w-xs mx-auto">
                  We sent a 6-digit code to{" "}
                  <span className="text-zinc-200 font-medium">{email}</span>
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 md:p-8">
                {error && (
                  <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <Label className="label-overline mb-3 block text-center">Verification Code</Label>
                <div className="flex items-center justify-center gap-2">
                  {otp.map((digit, i) => (
                    <Input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="h-14 w-12 rounded-lg bg-white/[0.03] border-white/10 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40 text-center text-xl font-semibold text-white"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                <Button
                  onClick={handleVerifyOtp}
                  disabled={!canVerifyOtp || loading}
                  className="mt-6 w-full h-12 rounded-full bg-white hover:bg-zinc-200 text-black text-sm font-semibold tracking-wide disabled:bg-white/10 disabled:text-zinc-600 group"
                >
                  {loading ? "Verifying..." : "Verify code"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />}
                </Button>

                <p className="mt-4 text-center text-xs text-zinc-500">
                  Didn&apos;t receive it?{" "}
                  <button
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-cyan-300 hover:text-cyan-200 transition-colors underline underline-offset-2"
                  >
                    Resend code
                  </button>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="label-overline mb-3">Password reset</div>
                <h1
                  className="text-4xl font-black tracking-tighter leading-[0.95] text-white"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Reset your{" "}
                  <span className="bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
                    password
                  </span>
                </h1>
                <p className="mt-4 text-sm text-zinc-400">
                  We&apos;ll send a code to reset your password
                </p>
              </div>

              <form onSubmit={handleSendOtp} className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 md:p-8 space-y-5">
                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <Label htmlFor="email" className="label-overline mb-2 block">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="email"
                      type="email"
                      data-testid="forgot-password-email-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="h-12 rounded-lg bg-white/[0.03] border-white/10 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40 text-base text-white placeholder:text-zinc-600 pl-10"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  data-testid="forgot-password-submit-button"
                  disabled={!email.trim() || loading}
                  className="w-full h-12 rounded-full bg-white hover:bg-zinc-200 text-black text-sm font-semibold tracking-wide disabled:bg-white/10 disabled:text-zinc-600"
                >
                  {loading ? "Sending..." : "Send reset code"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-zinc-500">
                Remember your password?{" "}
                <Link to="/signin" className="text-zinc-300 hover:text-cyan-300 transition-colors">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
