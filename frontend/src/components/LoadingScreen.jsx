import React, { useEffect } from "react";
import { Loader2, AudioLines, MessageSquare } from "lucide-react";

export function LoadingScreen({ message = "Loading...", submessage, fullScreen = true }) {
  useEffect(() => {
    if (!fullScreen) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [fullScreen]);

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
          <AudioLines className="absolute h-6 w-6 text-white/60" strokeWidth={1.5} />
        </div>
      </div>

      {/* Message */}
      <div className="text-center">
        <div className="font-mono text-xs tracking-[0.3em] uppercase text-white/60">
          {message}
        </div>
        {submessage && (
          <div className="mt-2 text-sm text-white/40 max-w-xs">{submessage}</div>
        )}
      </div>
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]">
      <div className="ambient-glow" />
      {content}
    </div>
  );
}

function SkeletonBlock({ className = "", width = "w-full", height = "h-4" }) {
  return (
    <div
      className={`rounded-lg bg-white/5 animate-pulse ${width} ${height} ${className}`}
    />
  );
}

export function SkeletonReport({ message = "Generating your report..." }) {
  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <div className="ambient-glow" />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* Header */}
        <div className="space-y-3">
          <SkeletonBlock width="w-20" height="h-3" />
          <SkeletonBlock width="w-72" height="h-9" className="mt-2" />
          <SkeletonBlock width="w-36" height="h-3" />
        </div>

        {/* Overall + Skills */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-[#0a0a0a] p-8 space-y-4">
            <SkeletonBlock width="w-24" height="h-3" />
            <SkeletonBlock width="w-32" height="h-16" />
            <SkeletonBlock width="w-28" height="h-6" />
            <SkeletonBlock width="w-full" height="h-4" />
            <SkeletonBlock width="w-3/4" height="h-4" />
          </div>
          <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-[#0a0a0a] p-5 space-y-3">
                <SkeletonBlock width="w-16" height="h-3" />
                <SkeletonBlock width="w-12" height="h-10" />
                <SkeletonBlock width="w-full" height="h-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Strengths / Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 space-y-4">
              <SkeletonBlock width="w-28" height="h-4" />
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex gap-3">
                  <SkeletonBlock width="w-4" height="h-4" className="shrink-0 rounded-full" />
                  <SkeletonBlock width={j === 1 ? "w-3/4" : "w-1/2"} height="h-4" />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Q-by-Q */}
        <div className="space-y-3">
          <SkeletonBlock width="w-48" height="h-4" />
          <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden divide-y divide-white/5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4">
                <SkeletonBlock width="w-8" height="h-3" />
                <SkeletonBlock width="w-1/2" height="h-4" />
                <SkeletonBlock width="w-8" height="h-4" className="ml-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Learning suggestions */}
        <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-b from-cyan-400/[0.05] to-transparent p-6 md:p-8 space-y-4">
          <SkeletonBlock width="w-44" height="h-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <SkeletonBlock width="w-5" height="h-4" />
                <SkeletonBlock width={i <= 2 ? "w-3/4" : "w-1/2"} height="h-4" />
              </div>
            ))}
          </div>
        </div>

        {/* Processing indicator */}
        <div className="flex items-center justify-center gap-3 pt-4 pb-10">
          <Loader2 className="h-4 w-4 animate-spin text-cyan-300" strokeWidth={1.5} />
          <span className="text-xs font-mono uppercase tracking-widest text-white/40">
            {message}
          </span>
        </div>
      </div>
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
