import React from "react";
import { AudioLines } from "lucide-react";

export function VoxaLogo({ size = 32, showWordmark = true, className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="relative flex items-center justify-center rounded-full border border-white/20 bg-black/40"
        style={{ width: size, height: size }}
      >
        <div
          className="absolute inset-1 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(0,255,234,0.5), rgba(0,255,234,0.0) 70%)",
          }}
        />
        <AudioLines
          className="relative text-white"
          strokeWidth={1.5}
          style={{ width: size * 0.55, height: size * 0.55 }}
        />
      </div>
      {showWordmark && (
        <span
          className="text-xl font-black tracking-tighter text-white"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Voxa
        </span>
      )}
    </div>
  );
}
