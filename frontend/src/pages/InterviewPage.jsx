import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Mic, MicOff, PhoneOff, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useInterview } from "@/context/InterviewContext";
import { getVapi, resetVapi } from "@/lib/vapiClient";
import { VoxaLogo } from "@/components/VoxaLogo";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function fmtTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function InterviewPage() {
  const navigate = useNavigate();
  const { setup, transcript, setTranscript, setReport } = useInterview();

  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [ended, setEnded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const vapiRef = useRef(null);
  const startedAtRef = useRef(null);
  const transcriptRef = useRef([]);
  const partialsRef = useRef({ user: "", assistant: "" });
  const endedGuardRef = useRef(false);
  const configRef = useRef(null);

  const durationSec = useMemo(
    () => (setup?.durationMinutes || 10) * 60,
    [setup]
  );
  const remaining = Math.max(0, durationSec - elapsed);

  useEffect(() => {
    if (!setup) navigate("/setup", { replace: true });
  }, [setup, navigate]);

  useEffect(() => {
    if (status === "connecting" || ended) return;
    const id = setInterval(() => {
      if (startedAtRef.current) {
        const s = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setElapsed(s);
        if (s >= durationSec && !endedGuardRef.current) {
          endedGuardRef.current = true;
          toast.info("Time is up. Wrapping up your interview...");
          handleEnd();
        }
      }
    }, 500);
    return () => clearInterval(id);
  }, [status, ended, durationSec, handleEnd]);

  useEffect(() => {
    if (!setup) return;
    let cancelled = false;

    async function boot() {
      try {
        const { data: cfg } = await axios.get(`${API}/config`);
        configRef.current = cfg;
        if (!cfg.ready) {
          setStatus("error");
          setError(
            "Vapi is not configured. Set VAPI_PUBLIC_KEY and VAPI_ASSISTANT_ID in backend/.env."
          );
          return;
        }
        if (cancelled) return;

        const vapi = getVapi(cfg.vapiPublicKey);
        vapiRef.current = vapi;

        const onCallStart = () => {
          startedAtRef.current = Date.now();
          setStatus("listening");
          toast.success("Interview started.");
        };
        const onCallEnd = () => {
          setStatus("ended");
          setEnded(true);
        };
        const onSpeechStart = () => {
          setStatus("speaking");
        };
        const onSpeechEnd = () => {
          setStatus("listening");
        };
        const onVolumeLevel = () => {};
        const onMessage = (msg) => {
          if (!msg || msg.type !== "transcript") return;
          const role = msg.role === "user" ? "user" : "assistant";
          const text = msg.transcript || "";
          if (!text) return;
          if (msg.transcriptType === "partial") {
            partialsRef.current[role] = text;
            setTranscript([...transcriptRef.current]);
            return;
          }
          partialsRef.current[role] = "";
          const turn = { role, text, timestamp: Date.now() };
          transcriptRef.current = [...transcriptRef.current, turn];
          setTranscript(transcriptRef.current);
        };
        const onError = (e) => {
          setStatus("error");
          const msg =
            typeof e === "string"
              ? e
              : e?.error?.message ||
                e?.errorMsg ||
                e?.message ||
                (typeof e?.error === "string" ? e.error : null) ||
                (() => {
                  try {
                    return JSON.stringify(e);
                  } catch {
                    return "Voice connection error.";
                  }
                })();
          setError(String(msg));
        };

        vapi.on("call-start", onCallStart);
        vapi.on("call-end", onCallEnd);
        vapi.on("speech-start", onSpeechStart);
        vapi.on("speech-end", onSpeechEnd);
        vapi.on("volume-level", onVolumeLevel);
        vapi.on("message", onMessage);
        vapi.on("error", onError);

        await vapi.start(cfg.vapiAssistantId, {
          variableValues: {
            role: setup.jobRole,
            experienceLevel: setup.experienceLevel,
            duration: String(setup.durationMinutes),
          },
          firstMessage: `Hi, I'm Aria — your Voxa interviewer for today. We'll spend about ${setup.durationMinutes} minutes on a mock interview for the ${setup.jobRole} role at the ${setup.experienceLevel} level. I'll ask a mix of technical and behavioral questions, and I'll dig in with follow-ups. Ready to begin?`,
        });
      } catch (e) {
        setStatus("error");
        setError(e?.message || "Failed to start the interview.");
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [setup, setTranscript]);

  useEffect(() => {
    return () => {
      resetVapi();
    };
  }, []);

  const toggleMute = () => {
    const v = vapiRef.current;
    if (!v) return;
    const next = !isMuted;
    v.setMuted(next);
    setIsMuted(next);
  };

  const handleEnd = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      try {
        vapiRef.current?.stop();
      } catch (_) {
        /* ignore */
      }
      setEnded(true);
      setStatus("ended");

      const payload = {
        jobRole: setup.jobRole,
        experienceLevel: setup.experienceLevel,
        durationMinutes: setup.durationMinutes,
        transcript: transcriptRef.current.map((t) => ({
          role: t.role,
          text: t.text,
          timestamp: t.timestamp,
        })),
      };

      if (payload.transcript.length === 0) {
        toast.error("No transcript captured. Try again with a longer session.");
        navigate("/setup", { replace: true });
        return;
      }

      const { data } = await axios.post(`${API}/interview/feedback`, payload, {
        timeout: 90_000,
      });
      setReport(data);
      navigate("/report");
    } catch (e) {
      toast.error("Could not generate feedback. Please try again.");
      setSubmitting(false);
    }
  }, [setup, submitting, navigate, setReport]);

  const statusText = {
    connecting: "Connecting...",
    listening: "Listening",
    speaking: "Aria is speaking",
    ended: "Interview ended",
    error: "Error",
  }[status];

  const showUserRing = status === "listening" && !isMuted;
  const showAssistantPulse = status === "speaking";

  const liveTurns = useMemo(() => {
    const arr = [...transcript];
    if (partialsRef.current.assistant) {
      arr.push({
        role: "assistant",
        text: partialsRef.current.assistant,
        partial: true,
        timestamp: Date.now(),
      });
    }
    if (partialsRef.current.user) {
      arr.push({
        role: "user",
        text: partialsRef.current.user,
        partial: true,
        timestamp: Date.now(),
      });
    }
    return arr;
  }, [transcript]);

  return (
    <div className="relative min-h-screen bg-[#050505] text-white flex flex-col overflow-x-hidden">
      <div className="ambient-glow" />

      {/* Top bar */}
      <header className="relative border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <VoxaLogo size={26} />
            <div className="hidden md:block h-5 w-px bg-white/10" />
            <div className="hidden md:block label-overline">02 / Live Interview</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-xs font-mono uppercase tracking-widest text-zinc-500">
              {setup?.jobRole} · {setup?.experienceLevel}
            </div>
            <div
              className="font-mono text-sm text-white rounded-full border border-white/15 bg-white/5 px-3 py-1"
              data-testid="live-interview-timer"
            >
              {fmtTime(elapsed)} / {fmtTime(durationSec)}
            </div>
          </div>
        </div>
      </header>

      {/* Main stage */}
      <main className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 py-10 flex flex-col items-center">
          {/* Status label */}
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                status === "speaking"
                  ? "bg-cyan-300 animate-pulse"
                  : status === "listening"
                  ? "bg-emerald-400 animate-pulse"
                  : status === "error"
                  ? "bg-red-500"
                  : "bg-zinc-500"
              }`}
            />
            <div className="label-overline">{statusText}</div>
          </div>

          {/* Orb */}
          <div className="relative mt-8 flex items-center justify-center h-56 w-56 md:h-72 md:w-72">
            {showAssistantPulse && (
              <>
                <div className="absolute h-full w-full rounded-full bg-cyan-400/10 orb-ring" />
                <div
                  className="absolute h-full w-full rounded-full bg-cyan-400/5 orb-ring"
                  style={{ animationDelay: "0.6s" }}
                />
              </>
            )}
            <div
              className={`relative h-full w-full rounded-full border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.02] flex items-center justify-center ${
                showAssistantPulse ? "orb-speaking" : ""
              }`}
            >
              {showUserRing && (
                <div className="absolute inset-3 rounded-full border-2 border-cyan-300/40" />
              )}
              <div
                className="absolute h-32 w-32 md:h-40 md:w-40 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, rgba(0,255,234,0.55), rgba(0,255,234,0.05) 70%)",
                }}
              />
              <div className="relative text-center">
                <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-zinc-400">
                  {status === "speaking" ? "AI" : status === "listening" ? "YOU" : "···"}
                </div>
                <div
                  className="text-3xl font-black tracking-tighter mt-1 text-white"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Aria
                </div>
              </div>
            </div>
          </div>

          {/* Remaining */}
          <div className="mt-6 text-xs font-mono uppercase tracking-widest text-zinc-500">
            Time remaining · {fmtTime(remaining)}
          </div>

          {/* Error */}
          {status === "error" && error && (
            <div className="mt-8 max-w-2xl rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-red-400" />
              <div className="text-sm">
                <div className="font-semibold">Voice connection failed</div>
                <div className="mt-1 text-red-200/90">{error}</div>
                <Button
                  variant="outline"
                  className="mt-3 rounded-full bg-transparent border-red-400/40 text-red-200 hover:bg-red-500/10"
                  onClick={() => navigate("/setup", { replace: true })}
                >
                  Back to setup
                </Button>
              </div>
            </div>
          )}

          {/* Live transcript */}
          <div className="mt-10 w-full max-w-3xl rounded-xl border border-white/10 bg-[#0a0a0a] overflow-hidden">
            <div className="border-b border-white/5 px-4 py-2 flex items-center justify-between">
              <div className="label-overline">Live Transcript</div>
              <div className="text-xs font-mono text-zinc-500">
                {liveTurns.length} {liveTurns.length === 1 ? "line" : "lines"}
              </div>
            </div>
            <div
              className="p-4 h-56 overflow-y-auto space-y-3 text-sm"
              data-testid="live-interview-transcript"
            >
              {liveTurns.length === 0 && status !== "error" && (
                <div className="flex items-center gap-2 text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Waiting for the conversation to begin...
                </div>
              )}
              {liveTurns.map((t, i) => (
                <div key={i} className="leading-relaxed">
                  <span
                    className={`font-mono text-[10px] tracking-widest uppercase mr-2 ${
                      t.role === "assistant" ? "text-cyan-300" : "text-zinc-400"
                    }`}
                  >
                    {t.role === "assistant" ? "ARIA" : "YOU"}
                  </span>
                  <span className={`${t.partial ? "text-zinc-500 italic" : "text-zinc-200"}`}>
                    {t.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom controls */}
      <footer className="relative border-t border-white/5 bg-[#050505]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-center gap-3">
          <Button
            data-testid="live-interview-mute-button"
            variant="outline"
            onClick={toggleMute}
            disabled={status === "connecting" || status === "ended" || status === "error"}
            className="rounded-full h-12 px-5 bg-transparent border-white/15 hover:bg-white/5 text-white"
          >
            {isMuted ? (
              <>
                <MicOff className="h-4 w-4 mr-2" />
                UNMUTE
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                MUTE
              </>
            )}
          </Button>
          <Button
            data-testid="live-interview-end-button"
            onClick={handleEnd}
            disabled={submitting || status === "connecting"}
            className="rounded-full h-12 px-6 bg-red-500/10 text-red-300 border-2 border-red-500/40 hover:bg-red-500/20 font-semibold tracking-wide disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                GENERATING REPORT...
              </>
            ) : (
              <>
                <PhoneOff className="h-4 w-4 mr-2" />
                END INTERVIEW
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
