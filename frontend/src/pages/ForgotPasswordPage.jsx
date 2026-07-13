import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VoxaLogo } from "@/components/VoxaLogo";
import api from "@/lib/api";
import { LoadingOverlay } from "@/components/LoadingScreen";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      await api.resetPassword(email.trim());
      setSent(true);
      toast.success("Reset link sent");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to send reset email";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden flex flex-col">
      <LoadingOverlay show={loading} message="Sending reset link..." />
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="ambient-glow" />

      <header className="relative border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" data-testid="forgot-password-nav-logo">
            <VoxaLogo size={28} />
          </Link>
          <Link to="/signin">
            <Button
              variant="outline"
              className="rounded-full bg-transparent border-white/15 hover:bg-white/5 text-white h-9 px-4 text-sm"
            >
              Back to sign in
            </Button>
          </Link>
        </div>
      </header>

      <main className="relative flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
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
              We&apos;ll send you a link to reset your password
            </p>
          </div>

          {sent ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-emerald-400" />
              <h2 className="mt-4 text-lg font-semibold text-white">Check your inbox</h2>
              <p className="mt-2 text-sm text-zinc-400">
                If an account exists for <strong className="text-zinc-200">{email}</strong>,
                you&apos;ll receive a password reset link shortly.
              </p>
              <Link to="/signin">
                <Button
                  variant="outline"
                  className="mt-6 rounded-full bg-transparent border-white/15 hover:bg-white/5 text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to sign in
                </Button>
              </Link>
            </div>
          ) : (
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
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          )}

          {!sent && (
            <p className="mt-6 text-center text-sm text-zinc-500">
              Remember your password?{" "}
              <Link to="/signin" className="text-zinc-300 hover:text-cyan-300 transition-colors">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
