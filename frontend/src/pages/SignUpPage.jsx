import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Mail, Lock, Eye, EyeOff, AlertTriangle } from "lucide-react";
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
  const { signup, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const passwordMinLen = 6;
  const isValid = email.trim().length > 0 && password.length >= passwordMinLen && password === confirmPassword;

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
      const data = await signup(email.trim(), password);
      if (data.session?.access_token) {
        toast.success("Account created");
        navigate("/dashboard");
      }
    } catch (err) {
      if (!err.response) {
        setError("Unable to connect to server. Please check your connection.");
      } else {
        setError(err.response.data?.detail || "Could not create account");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden flex flex-col">
      <LoadingOverlay show={loading} message="Creating your account..." />
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="ambient-glow" />

      <Navbar
        left={
          <>
            <Link to="/" data-testid="signup-nav-logo"><VoxaLogo size={28} /></Link>
            <div className="hidden md:block h-5 w-px bg-white/10" />
            <div className="hidden md:block label-overline">Sign Up</div>
          </>
        }
        right={
          <Link to="/signin">
            <Button variant="outline" className="rounded-full bg-transparent border-white/15 hover:bg-white/5 text-white h-9 px-4 text-sm">
              Sign in
            </Button>
          </Link>
        }
      />

      <main className="relative flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
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
              <Label htmlFor="email" className="label-overline mb-2 block">
                Email
              </Label>
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
              <Label htmlFor="password" className="label-overline mb-2 block">
                Password
              </Label>
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
              <Label htmlFor="confirm-password" className="label-overline mb-2 block">
                Confirm Password
              </Label>
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
        </div>
      </main>
    </div>
  );
}
