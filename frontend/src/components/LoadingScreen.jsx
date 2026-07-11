import React from "react";
import { Loader2, AudioLines } from "lucide-react";

export function LoadingScreen({ message = "Loading...", submessage, fullScreen = true }) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* Animated orb */}
      <div className="relative flex items-center justify-center h-32 w-32">
        <div className="absolute h-full w-full rounded-full bg-cyan-400/10 animate-ping" style={{ animationDuration: "2s" }} />
        <div className="absolute h-full w-full rounded-full bg-cyan-400/5 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.6s" }} />
        <div className="relative flex items-center justify-center h-24 w-24 rounded-full border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.02]">
          <div
            className="h-16 w-16 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, rgba(0,255,234,0.55), rgba(0,255,234,0.05) 70%)",
            }}
          />
          <AudioLines className="absolute h-6 w-6 text-white opacity-60" strokeWidth={1.5} />
        </div>
      </div>

      {/* Message */}
      <div className="text-center">
        <div className="font-mono text-xs tracking-[0.3em] uppercase text-zinc-400">
          {message}
        </div>
        {submessage && (
          <div className="mt-2 text-sm text-zinc-500 max-w-xs">{submessage}</div>
        )}
      </div>
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]">
      <div className="ambient-glow" />
      {content}
    </div>
  );
}

export function LoadingOverlay({ show = false, message = "Loading...", submessage }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-[#0a0a0a] px-10 py-12 shadow-2xl">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-300" strokeWidth={1.5} />
        <div className="text-center">
          <div className="text-sm font-semibold text-white">{message}</div>
          {submessage && (
            <div className="mt-1 text-xs text-zinc-500">{submessage}</div>
          )}
        </div>
      </div>
    </div>
  );
}
