import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Mail, Lock, Eye, EyeOff, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { VoxaLogo } from "@/components/VoxaLogo";
import { useAuth } from "@/context/AuthContext";
import { LoadingOverlay } from "@/components/LoadingScreen";
import { toast } from "sonner";

export default function SignUpPage() {
  const navigate = useNavigate();
  const { signup, verifySignupOtp, user } = useAuth();
  const [step, setStep] = useState("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const passwordMinLen = 6;
  const isValid = email.trim().length > 0 && password.length >= passwordMinLen && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setError("");
    setLoading(true);
    setError("");
    try {
      const result = await signup(email.trim(), password);
      if (result.status === "complete") {
        toast.success("Account created");
        navigate("/dashboard");
      } else if (result.status === "missing_requirements") {
        setStep("otp");
        toast.success("Verification code sent to your email");
      }
    } catch (err) {
      const detail =
        err.errors?.[0]?.longMessage ||
        err.response?.data?.detail ||
        "";
      setError(detail || "Could not create account");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length > 1) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = digits[i] || "";
      }
      setOtp(newOtp);
      const next = Math.min(digits.length, 5);
      otpRefs.current[next]?.focus();
      return;
    }
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData("text");
    const digits = pasted.replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = digits[i] || "";
    }
    setOtp(newOtp);
    const next = Math.min(digits.length, 5);
    otpRefs.current[next]?.focus();
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
      const result = await verifySignupOtp(otpCode);
      if (result.status === "complete") {
        toast.success("Account verified!");
        navigate("/dashboard", { replace: true });
        return;
      }

      if (result.status === "missing_requirements") {
        setError("Verification is still pending. Please try again.");
      }
    } catch (err) {
      const detail =
        err.errors?.[0]?.longMessage ||
        err.response?.data?.detail ||
        "Invalid verification code";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      await signup(email.trim(), password);
      toast.success("New code sent");
    } catch {
      setError("Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden flex flex-col">
      <LoadingOverlay show={loading} message={step === "otp" ? "Verifying code..." : "Creating your account..."} />
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="ambient-glow" />

      <Navbar
        left={
          <>
            <Link to={user ? "/dashboard" : "/"} data-testid="signup-nav-logo"><VoxaLogo size={28} /></Link>
            <div className="hidden md:block h-5 w-px bg-white/10" />
            <div className="hidden md:block label-overline">{step === "otp" ? "Verify Email" : "Sign Up"}</div>
          </>
        }
        right={
          step === "otp" ? (
            <Button
              variant="outline"
              onClick={() => { setStep("form"); setOtp(["", "", "", "", "", ""]); setError(""); }}
              className="rounded-full bg-transparent border-white/15 hover:bg-white/5 text-white h-9 px-4 text-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
          ) : (
            <Link to="/signin">
              <Button variant="outline" className="rounded-full bg-transparent border-white/15 hover:bg-white/5 text-white h-9 px-4 text-sm">
                Sign in
              </Button>
            </Link>
          )
        }
      />

      <main className="relative flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {step === "otp" ? (
            <>
              <div className="text-center mb-8">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-xl bg-cyan-400/10 border border-cyan-400/20 mb-4">
                  <ShieldCheck className="h-6 w-6 text-cyan-300" />
                </div>
                <div className="label-overline mb-3">Verify Email</div>
                <h1
                  className="text-3xl font-black tracking-tighter leading-[0.95] text-white"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Check your inbox
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

                <Label className="label-overline mb-3 block text-center">
                  Verification Code
                </Label>
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
                      onPaste={handleOtpPaste}
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
                <div className="label-overline mb-3">Get started</div>
                <h1
                  className="text-4xl font-black tracking-tighter leading-[0.95] text-white"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Create your{" "}
                  <span className="bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
                    account
                  </span>
                </h1>
                <p className="mt-4 text-sm text-zinc-400">
                  Start tracking your interview progress
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
                  <Label htmlFor="email" className="label-overline mb-2 block">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="email"
                      type="email"
                      data-testid="signup-email-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="h-12 rounded-lg bg-white/[0.03] border-white/10 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40 text-base text-white placeholder:text-zinc-600 pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password" className="label-overline mb-2 block">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      data-testid="signup-password-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="h-12 rounded-lg bg-white/[0.03] border-white/10 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40 text-base text-white placeholder:text-zinc-600 pl-10 pr-10"
                      required
                      minLength={passwordMinLen}
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
                  <Label htmlFor="confirm-password" className="label-overline mb-2 block">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="confirm-password"
                      type="password"
                      data-testid="signup-confirm-password-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="h-12 rounded-lg bg-white/[0.03] border-white/10 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40 text-base text-white placeholder:text-zinc-600 pl-10"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  data-testid="signup-submit-button"
                  disabled={!isValid || loading}
                  className="w-full h-12 rounded-full bg-white hover:bg-zinc-200 text-black text-sm font-semibold tracking-wide disabled:bg-white/10 disabled:text-zinc-600 group"
                >
                  {loading ? "Creating account..." : "Create account"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-zinc-500">
                Already have an account?{" "}
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
