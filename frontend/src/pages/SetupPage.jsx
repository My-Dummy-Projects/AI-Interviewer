import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Mic, ShieldCheck, Sparkles } from "lucide-react";
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
  const { setSetup, reset } = useInterview();
  const [jobRole, setJobRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [duration, setDuration] = useState("");

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
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-zinc-950 flex items-center justify-center">
              <Mic className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <div className="label-overline">Emergent Labs</div>
              <div
                className="text-sm font-semibold tracking-tight text-zinc-950"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Voice Interview / v0.1
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>No auth · No history · Runs locally in browser</span>
          </div>
        </div>
      </header>

      {/* Hero + Setup */}
      <main className="max-w-7xl mx-auto px-6 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left column — setup form */}
          <section className="lg:col-span-7">
            <div className="label-overline mb-4">01 / Setup</div>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tighter leading-[0.95] text-zinc-950"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Practice interviews.
              <br />
              <span className="text-zinc-400">Get graded, honestly.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-600">
              A no-frills AI mock interview. Pick a role, an experience level, and how long
              you have. Our voice interviewer runs the conversation, asks follow-ups, and
              hands you a structured scorecard when time is up.
            </p>

            <div className="mt-10 border border-zinc-200 p-6 md:p-8 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Label
                    htmlFor="job-role"
                    className="label-overline mb-2 block"
                  >
                    Job Role
                  </Label>
                  <Input
                    id="job-role"
                    data-testid="setup-form-role-input"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    placeholder="e.g. Senior Backend Engineer, Product Manager, Data Scientist"
                    className="h-12 rounded-none border-zinc-300 focus-visible:border-zinc-950 focus-visible:ring-1 focus-visible:ring-zinc-950 text-base"
                  />
                </div>

                <div>
                  <Label className="label-overline mb-2 block">Experience Level</Label>
                  <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                    <SelectTrigger
                      data-testid="setup-form-experience-select"
                      className="h-12 rounded-none border-zinc-300 focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 text-base"
                    >
                      <SelectValue placeholder="Choose level" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none">
                      {EXPERIENCE_LEVELS.map((l) => (
                        <SelectItem key={l.value} value={l.value} className="rounded-none">
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
                      className="h-12 rounded-none border-zinc-300 focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 text-base"
                    >
                      <SelectValue placeholder="Choose duration" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none">
                      {DURATIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value} className="rounded-none">
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-500">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Powered by Vapi voice + LLM scoring</span>
                </div>
                <Button
                  data-testid="start-interview-button"
                  disabled={!canStart}
                  onClick={handleStart}
                  className="h-12 rounded-none bg-zinc-950 hover:bg-zinc-800 text-white px-6 text-sm font-semibold tracking-wide disabled:bg-zinc-300 disabled:text-zinc-500 transition-colors group"
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
                { n: "02", t: "Talk", d: "Speak naturally with the AI interviewer." },
                { n: "03", t: "Get graded", d: "Structured, question-by-question report." },
              ].map((s) => (
                <div key={s.n} className="border-t border-zinc-900 pt-4">
                  <div className="label-overline">{s.n}</div>
                  <div
                    className="mt-1 text-lg font-semibold text-zinc-950"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {s.t}
                  </div>
                  <div className="mt-1 text-sm text-zinc-600">{s.d}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Right column — hero image / poster */}
          <aside className="lg:col-span-5">
            <div className="relative h-full min-h-[420px] border border-zinc-900 overflow-hidden bg-zinc-100">
              <img
                src="https://images.pexels.com/photos/36733331/pexels-photo-36733331.jpeg"
                alt="Two professionals discussing work"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/10" />
              <div className="absolute inset-0 grid-bg opacity-40" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
                <div className="font-mono text-[10px] tracking-[0.3em] text-white/70 uppercase">
                  Session ID / draft
                </div>
                <div
                  className="mt-2 text-2xl md:text-3xl font-bold text-white tracking-tight"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Ready when you are.
                </div>
                <div className="mt-1 text-sm text-white/80 max-w-sm">
                  Grant mic access when prompted. You can end the interview any time.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
