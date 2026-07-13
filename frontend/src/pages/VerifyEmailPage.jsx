import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, AlertTriangle, Loader2, ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoxaLogo } from "@/components/VoxaLogo";
import api from "@/lib/api";
import { toast } from "sonner";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let token = searchParams.get("access_token");
    if (!token) {
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.replace(/^#/, "?"));
      token = hashParams.get("access_token");
    }
    if (!token) {
      setStatus("error");
      return;
    }
    verify(token);
  }, []);

  async function verify(token) {
    try {
      const res = await api.verifyEmail(token);
      setEmail(res.email || "");
      setStatus("success");
      toast.success("Email verified");
    } catch (err) {
      setStatus("error");
    }
  }

  const handleRedirect = () => {
    navigate("/signin" + (email ? `?email=${encodeURIComponent(email)}` : ""));
  };

  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden flex flex-col">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="ambient-glow" />

      <header className="relative border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" data-testid="verify-nav-logo">
            <VoxaLogo size={28} />
          </Link>
        </div>
      </header>

      <main className="relative flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-8 md:p-10">
            {status === "loading" && (
              <>
                <div className="h-16 w-16 mx-auto rounded-full bg-cyan-400/10 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-cyan-300 animate-spin" strokeWidth={1.5} />
                </div>
                <h1 className="mt-6 text-2xl font-black tracking-tighter text-white" style={{ fontFamily: "var(--font-heading)" }}>
                  Verifying your email
                </h1>
                <p className="mt-3 text-sm text-zinc-400">Please wait while we confirm your email address...</p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="h-16 w-16 mx-auto rounded-full bg-emerald-400/10 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-emerald-400" strokeWidth={1.5} />
                </div>
                <h1 className="mt-6 text-2xl font-black tracking-tighter text-white" style={{ fontFamily: "var(--font-heading)" }}>
                  Email verified!
                </h1>
                <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                  {email ? (
                    <>Your email <strong className="text-zinc-200">{email}</strong> has been verified successfully.</>
                  ) : (
                    <>Your email has been verified successfully.</>
                  )}
                </p>
                <p className="mt-2 text-sm text-zinc-500">You can now sign in to your account.</p>
                <Button
                  onClick={handleRedirect}
                  className="mt-6 h-12 rounded-full bg-white hover:bg-zinc-200 text-black px-6 text-sm font-semibold tracking-wide"
                >
                  Go to sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}

            {status === "error" && (
              <>
                <div className="h-16 w-16 mx-auto rounded-full bg-red-400/10 flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-red-400" strokeWidth={1.5} />
                </div>
                <h1 className="mt-6 text-2xl font-black tracking-tighter text-white" style={{ fontFamily: "var(--font-heading)" }}>
                  Verification failed
                </h1>
                <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                  This verification link is invalid or has expired. Try signing up again to receive a new link.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <Link to="/signin">
                    <Button className="w-full h-12 rounded-full bg-white hover:bg-zinc-200 text-black text-sm font-semibold">
                      Go to sign in
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/signup" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                    Create a new account
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
