import React, { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Mic, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInterview } from "@/context/InterviewContext";
import { useAuth } from "@/context/AuthContext";
import { VoxaLogo } from "@/components/VoxaLogo";

const EXPERIENCE_LEVELS = [
  { value: "Intern", label: "Intern" },
  { value: "Junior", label: "Junior (0-2 yrs)" },
  { value: "Mid-level", label: "Mid-level (2-5 yrs)" },
  { value: "Senior", label: "Senior (5-8 yrs)" },
  { value: "Staff/Principal", label: "Staff / Principal (8+ yrs)" },
];

const DURATIONS = [
  { value: "5", label: "5 minutes — Quick Screen" },
  { value: "10", label: "10 minutes — Standard" },
  { value: "15", label: "15 minutes — Extended" },
  { value: "20", label: "20 minutes — Deep Dive" },
  { value: "30", label: "30 minutes — Full Loop" },
];

export default function SetupPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { setSetup, reset } = useInterview();
  const [jobRole, setJobRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [duration, setDuration] = useState("");

  if (!loading && !user) return <Navigate to="/signin" replace />;

  const canStart = jobRole.trim().length > 1 && experienceLevel && duration;

  const handleStart = () => {
    if (!canStart) return;
    reset();
    setSetup({
      jobRole: jobRole.trim(),
      experienceLevel,
      durationMinutes: Number(duration),
    });
    navigate("/interview");
  };

  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="ambient-glow" />

      {/* Top bar */}
      <header className="relative border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" data-testid="setup-nav-logo">
            <VoxaLogo size={28} />
          </Link>
          <div className="hidden md:flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Secure · Voice never leaves the call</span>
          </div>
          <Link to="/" className="md:hidden">
            <Button variant="outline" className="h-9 px-3 rounded-full bg-transparent border-white/15 hover:bg-white/5 text-white">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero + Setup */}
      <main className="relative max-w-7xl mx-auto px-6 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">
          {/* Left column — setup form */}
          <section className="lg:col-span-7">
            <div className="label-overline mb-4">01 / Setup</div>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-[0.95] text-white"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Configure your{" "}
              <span className="bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
                mock interview.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-400">
              Tell Aria who you&apos;re interviewing as and how long you have. She&apos;ll
              calibrate her difficulty, her follow-ups, and her pacing.
            </p>

            <div className="mt-10 rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Label htmlFor="job-role" className="label-overline mb-2 block">
                    Job Role
                  </Label>
                  <Input
                    id="job-role"
                    data-testid="setup-form-role-input"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    placeholder="e.g. Senior Backend Engineer, Product Manager, Data Scientist"
                    className="h-12 rounded-lg bg-white/[0.03] border-white/10 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40 text-base text-white placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <Label className="label-overline mb-2 block">Experience Level</Label>
                  <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                    <SelectTrigger
                      data-testid="setup-form-experience-select"
                      className="h-12 rounded-lg bg-white/[0.03] border-white/10 focus:ring-1 focus:ring-cyan-400/40 focus:border-cyan-400/50 text-base text-white"
                    >
                      <SelectValue placeholder="Choose level" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg bg-[#0f0f0f] border-white/10 text-white">
                      {EXPERIENCE_LEVELS.map((l) => (
                        <SelectItem key={l.value} value={l.value} className="rounded focus:bg-white/5 focus:text-white">
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="label-overline mb-2 block">Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger
                      data-testid="setup-form-duration-select"
                      className="h-12 rounded-lg bg-white/[0.03] border-white/10 focus:ring-1 focus:ring-cyan-400/40 focus:border-cyan-400/50 text-base text-white"
                    >
                      <SelectValue placeholder="Choose duration" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg bg-[#0f0f0f] border-white/10 text-white">
                      {DURATIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value} className="rounded focus:bg-white/5 focus:text-white">
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-500">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                  <span>Powered by Vapi voice + LLM scoring</span>
                </div>
                <Button
                  data-testid="start-interview-button"
                  disabled={!canStart}
                  onClick={handleStart}
                  className="h-12 rounded-full bg-white hover:bg-zinc-200 text-black px-6 text-sm font-semibold tracking-wide disabled:bg-white/10 disabled:text-zinc-600 group"
                >
                  START INTERVIEW
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>

            {/* footnote steps */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { n: "01", t: "Configure", d: "Role, level, and time budget." },
                { n: "02", t: "Talk", d: "Speak naturally with Aria." },
                { n: "03", t: "Get graded", d: "Structured, per-question report." },
              ].map((s) => (
                <div key={s.n} className="border-t border-white/10 pt-4">
                  <div className="label-overline">{s.n}</div>
                  <div
                    className="mt-1 text-lg font-semibold text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {s.t}
                  </div>
                  <div className="mt-1 text-sm text-zinc-400">{s.d}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Right column — brand poster */}
          <aside className="lg:col-span-5">
            <div className="relative h-full min-h-[420px] rounded-2xl border border-white/10 overflow-hidden bg-[#0a0a0a]">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, rgba(0,255,234,0.18), transparent 55%), radial-gradient(circle at 80% 70%, rgba(0,255,234,0.08), transparent 55%)",
                }}
              />
              <div className="absolute inset-0 grid-bg-fine opacity-30" />

              <div className="relative h-full flex flex-col justify-between p-8">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-[10px] tracking-[0.3em] text-zinc-500 uppercase">
                    Session / draft
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-mono uppercase tracking-widest">
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-pulse" />
                    ready
                  </div>
                </div>

                {/* Big orb visualization */}
                <div className="relative flex items-center justify-center py-6">
                  <div className="absolute h-56 w-56 rounded-full bg-cyan-400/10 orb-ring" />
                  <div
                    className="absolute h-56 w-56 rounded-full bg-cyan-400/5 orb-ring"
                    style={{ animationDelay: "0.8s" }}
                  />
                  <div className="relative flex items-center justify-center h-36 w-36 rounded-full border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.02]">
                    <div
                      className="h-24 w-24 rounded-full"
                      style={{
                        background:
                          "radial-gradient(circle at 30% 30%, rgba(0,255,234,0.7), rgba(0,255,234,0.05) 70%)",
                      }}
                    />
                    <Mic className="absolute h-8 w-8 text-white" strokeWidth={1.5} />
                  </div>
                </div>

                <div>
                  <div className="font-mono text-[10px] tracking-[0.3em] text-zinc-500 uppercase">
                    Aria is ready
                  </div>
                  <div
                    className="mt-2 text-2xl md:text-3xl font-bold text-white tracking-tight"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Grant mic access when prompted.
                  </div>
                  <div className="mt-1 text-sm text-zinc-400 max-w-sm">
                    You can end the interview at any time. Your voice never leaves the call.
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
