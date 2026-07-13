import React from "react";

export function Navbar({ left, right, className = "" }) {
  return (
    <header className={`sticky top-0 z-30 border-b border-white/5 bg-[#050505]/70 backdrop-blur-xl ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-3 sm:gap-4">{left}</div>
          <div className="flex items-center gap-1 sm:gap-1.5">{right}</div>
        </div>
      </div>
    </header>
  );
}
