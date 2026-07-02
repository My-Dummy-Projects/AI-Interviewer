import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Mic, MicOff, PhoneOff, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useInterview } from "@/context/InterviewContext";
import { getVapi, resetVapi } from "@/lib/vapiClient";

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

  const [status, setStatus] = useState("connecting"); // connecting | listening | speaking | ended | error
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

  // Redirect to setup if missing
  useEffect(() => {
    if (!setup) navigate("/", { replace: true });
  }, [setup, navigate]);

  // Timer
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
  }, [status, ended, durationSec]);

  // Fetch config and start Vapi
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
        const onSpeechStart = () => setStatus("speaking");
        const onSpeechEnd = () => setStatus("listening");
        const onMessage = (msg) => {
          if (!msg || msg.type !== "transcript") return;
          const role = msg.role === "user" ? "user" : "assistant";
          const text = msg.transcript || "";
          if (!text) return;
          if (msg.transcriptType === "partial") {
            partialsRef.current[role] = text;
            // trigger re-render for live partials
            setTranscript([...transcriptRef.current]);
            return;
          }
          // final
          partialsRef.current[role] = "";
          const turn = { role, text, timestamp: Date.now() };
          transcriptRef.current = [...transcriptRef.current, turn];
          setTranscript(transcriptRef.current);
        };
        const onError = (e) => {
          console.error("Vapi error", e);
          setStatus("error");
          setError(
            typeof e === "string"
              ? e
              : e?.error?.message || e?.message || "Voice connection error."
          );
        };

        vapi.on("call-start", onCallStart);
        vapi.on("call-end", onCallEnd);
        vapi.on("speech-start", onSpeechStart);
        vapi.on("speech-end", onSpeechEnd);
        vapi.on("message", onMessage);
        vapi.on("error", onError);

        // System prompt overlay with candidate context
        const systemPrompt = `You are a professional, warm-but-rigorous mock interviewer.
Role being interviewed: ${setup.jobRole}
Candidate level: ${setup.experienceLevel}
Target interview duration: ${setup.durationMinutes} minutes.

Interview format:
1. Introduce yourself briefly (name yourself "Aria, your AI interviewer") and explain the format in 1-2 sentences.
2. Ask a mix of technical and behavioral questions calibrated to the role and level.
3. Ask ONE question at a time. Wait for the candidate to finish speaking before continuing.
4. When appropriate, ask a specific follow-up that probes deeper into their answer.
5. Keep your turns concise. Do not lecture. Do not answer the questions yourself.
6. After roughly ${setup.durationMinutes} minutes of conversation, thank the candidate and end the interview politely.

Tone: calm, professional, curious. Do not reveal that you are an AI unless asked.`;

        await vapi.start(cfg.vapiAssistantId, {
          variableValues: {
            role: setup.jobRole,
            experienceLevel: setup.experienceLevel,
            duration: String(setup.durationMinutes),
          },
          model: {
            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
            ],
          },
          firstMessage: `Hi, I'm Aria — your AI interviewer for today. We'll spend about ${setup.durationMinutes} minutes on a mock interview for the ${setup.jobRole} role at the ${setup.experienceLevel} level. I'll ask a mix of technical and behavioral questions, and I'll dig in with follow-ups. Ready to begin?`,
        });
      } catch (e) {
        console.error(e);
        setStatus("error");
        setError(e?.message || "Failed to start the interview.");
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [setup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetVapi();
    };
  }, []);

  const toggleMute = () => {
    const v = vapiRef.current;
    if (!v) return;
    try {
      const next = !isMuted;
      v.setMuted(next);
      setIsMuted(next);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEnd = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      try {
        vapiRef.current?.stop();
      } catch (_) {
        /* ignore stop errors */
      }
      setEnded(true);
      setStatus("ended");

      // Submit transcript for feedback
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
        navigate("/", { replace: true });
        return;
      }

      const { data } = await axios.post(`${API}/interview/feedback`, payload, {
        timeout: 90_000,
      });
      setReport(data);
      navigate("/report");
    } catch (e) {
      console.error(e);
      toast.error("Could not generate feedback. Please try again.");
      setSubmitting(false);
    }
  };

  const statusText = {
    connecting: "Connecting...",
    listening: "Listening",
    speaking: "Aria is speaking",
    ended: "Interview ended",
    error: "Error",
  }[status];

  const showUserRing = status === "listening" && !isMuted;
  const showAssistantPulse = status === "speaking";

  // Live transcript view (with any partials)
  const liveTurns = useMemo(() => {
    const arr = [...transcriptRef.current];
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <header className="border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="label-overline">
            02 / Live Interview
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-xs font-mono uppercase tracking-widest text-zinc-500">
              {setup?.jobRole} · {setup?.experienceLevel}
            </div>
            <div
              className="font-mono text-sm text-zinc-950 border border-zinc-900 px-3 py-1"
              data-testid="live-interview-timer"
            >
              {fmtTime(elapsed)} / {fmtTime(durationSec)}
            </div>
          </div>
        </div>
      </header>

      {/* Main stage */}
      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 py-10 flex flex-col items-center">
          {/* Status label */}
          <div className="label-overline">{statusText}</div>

          {/* Orb */}
          <div className="relative mt-8 flex items-center justify-center h-56 w-56 md:h-72 md:w-72">
            {showAssistantPulse && (
              <>
                <div className="absolute h-full w-full rounded-full bg-zinc-950/10 orb-ring" />
                <div
                  className="absolute h-full w-full rounded-full bg-zinc-950/5 orb-ring"
                  style={{ animationDelay: "0.6s" }}
                />
              </>
            )}
            <div
              className={`relative h-full w-full rounded-full bg-zinc-950 flex items-center justify-center ${
                showAssistantPulse ? "orb-speaking" : ""
              }`}
            >
              {showUserRing && (
                <div className="absolute inset-3 rounded-full border-2 border-white/30" />
              )}
              <div className="text-white text-center">
                <div className="font-mono text-[10px] tracking-[0.3em] uppercase opacity-70">
                  {status === "speaking" ? "AI" : status === "listening" ? "YOU" : "···"}
                </div>
                <div
                  className="text-3xl font-bold mt-1"
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
            <div className="mt-8 max-w-2xl border border-red-200 bg-red-50 text-red-700 p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="text-sm">
                <div className="font-semibold">Voice connection failed</div>
                <div className="mt-1">{error}</div>
                <Button
                  variant="outline"
                  className="mt-3 rounded-none border-red-300 hover:bg-red-100"
                  onClick={() => navigate("/", { replace: true })}
                >
                  Back to setup
                </Button>
              </div>
            </div>
          )}

          {/* Live transcript */}
          <div className="mt-10 w-full max-w-3xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 px-4 py-2 flex items-center justify-between">
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
                      t.role === "assistant" ? "text-blue-700" : "text-zinc-900"
                    }`}
                  >
                    {t.role === "assistant" ? "ARIA" : "YOU"}
                  </span>
                  <span className={`${t.partial ? "text-zinc-400 italic" : "text-zinc-800"}`}>
                    {t.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom controls */}
      <footer className="border-t border-zinc-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-center gap-3">
          <Button
            data-testid="live-interview-mute-button"
            variant="outline"
            onClick={toggleMute}
            disabled={status === "connecting" || status === "ended" || status === "error"}
            className="rounded-none h-12 border-zinc-300 hover:bg-zinc-50 text-zinc-950"
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
            className="rounded-none h-12 bg-white text-red-700 border-2 border-red-600 hover:bg-red-50 font-semibold tracking-wide"
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
