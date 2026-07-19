import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  ArrowRight,
  Calendar,
  Briefcase,
  Clock,
  Loader2,
  FileText,
  Settings,
  TrendingUp,
  TrendingDown,
  Target,
  Timer,
  Award,
  BrainCircuit,
  Search,
  SlidersHorizontal,
  Sparkles,
  ChevronRight,
  Flame,
  Star,
  X,
  Check,
  Minus,
  Plus,
  Pencil,
  Play,
  Zap,
  Trophy,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { VoxaLogo } from "@/components/VoxaLogo";
import { useAuth } from "@/context/AuthContext";
import { useProfileQuery, useDashboardStatsQuery, useInterviewsQuery, useSubscriptionQuery } from "@/hooks/useApiQueries";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { LoadingScreen } from "@/components/LoadingScreen";
import { toast } from "sonner";

const PAGE_SIZE = 9;
const GOAL_STORAGE_KEY = "voxa_weekly_goal";
const DEFAULT_GOAL = 3;

/* ─────────────────────────── helpers ─────────────────────────── */

function fmtDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function greetingFor(hour) {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

function scoreColor(score) {
  if (score >= 75) return "text-emerald-400";
  if (score >= 45) return "text-yellow-400";
  return "text-red-400";
}

function scoreBg(score) {
  if (score >= 75) return "bg-emerald-400/10 border-emerald-400/25";
  if (score >= 45) return "bg-yellow-400/10 border-yellow-400/25";
  return "bg-red-400/10 border-red-400/25";
}

function pct(a, b) {
  if (!b || b === 0) return 0;
  return Math.min(Math.round((a / b) * 100), 100);
}

const AnimatedNumber = React.memo(function AnimatedNumber({ value, enabled = true }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!enabled || typeof value !== 'number') { setDisplay(value); return; }
    let raf;
    const start = performance.now();
    const dur = 1000;
    const fn = (now) => {
      const p = Math.min((now - start) / dur, 1);
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(fn);
    };
    raf = requestAnimationFrame(fn);
    return () => cancelAnimationFrame(raf);
  }, [value, enabled]);
  return <>{typeof value === 'number' ? display : value}</>;
});

/** Monday-based ISO week start (00:00 local) */
function startOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Mon=0 … Sun=6
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
}

const LEVELS = ["All Levels", "Intern", "Junior", "Mid-level", "Senior", "Staff/Principal"];

/* ─────────────────────────── charts ─────────────────────────── */

/** Smooth SVG area chart with gradient fill + hover tooltip */
const ScoreTrendChart = React.memo(function ScoreTrendChart({ scores }) {
  const [hover, setHover] = useState(null);
  const W = 560;
  const H = 180;
  const PAD_X = 12;
  const PAD_Y = 20;

  if (!scores?.length) {
    return (
      <div className="flex items-center justify-center h-44 text-sm text-zinc-600">
        No scores yet
      </div>
    );
  }

  const n = scores.length;
  const stepX = n > 1 ? (W - PAD_X * 2) / (n - 1) : 0;
  const points = scores.map((s, i) => {
    const x = PAD_X + i * stepX;
    const y = PAD_Y + (H - PAD_Y * 2) * (1 - s / 100);
    return { x, y, s };
  });

  const linePath = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");
  const areaPath = `${linePath} L ${points[n - 1].x} ${H - PAD_Y} L ${points[0].x} ${H - PAD_Y} Z`;

  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / n);
  const avgY = PAD_Y + (H - PAD_Y * 2) * (1 - avg / 100);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-44 sm:h-52 cursor-crosshair"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#22d3ee" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>

        {/* horizontal gridlines */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = PAD_Y + (H - PAD_Y * 2) * (1 - v / 100);
          return (
            <line
              key={v}
              x1={PAD_X}
              x2={W - PAD_X}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="2 4"
            />
          );
        })}

        {/* avg line */}
        <line
          x1={PAD_X}
          x2={W - PAD_X}
          y1={avgY}
          y2={avgY}
          stroke="rgba(255,255,255,0.18)"
          strokeDasharray="3 3"
        />
        <text
          x={W - PAD_X - 2}
          y={avgY - 4}
          textAnchor="end"
          className="fill-zinc-500"
          style={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
        >
          avg {avg}
        </text>

        {/* area + line */}
        <motion.path
          d={areaPath}
          fill="url(#areaGrad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />
        <motion.path
          d={linePath}
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />

        {/* points + hover targets */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hover === i ? 5 : 3}
              fill={p.s >= 75 ? "#34d399" : p.s >= 45 ? "#fbbf24" : "#f87171"}
              stroke="#050505"
              strokeWidth="1.5"
              style={{ transition: "r 150ms" }}
            />
            <rect
              x={p.x - Math.max(stepX / 2, 12)}
              y={0}
              width={Math.max(stepX, 24)}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}

        {/* hover indicator */}
        {hover !== null && (
          <line
            x1={points[hover].x}
            x2={points[hover].x}
            y1={PAD_Y}
            y2={H - PAD_Y}
            stroke="rgba(34,211,238,0.35)"
            strokeDasharray="2 2"
          />
        )}
      </svg>

      {/* tooltip */}
      {hover !== null && (
        <div
          className="absolute -top-1 pointer-events-none"
          style={{
            left: `${(points[hover].x / W) * 100}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="px-2.5 py-1 rounded-md bg-white text-black text-[10px] font-mono font-bold whitespace-nowrap shadow-lg">
            #{hover + 1} · {points[hover].s}
          </div>
        </div>
      )}
    </div>
  );
});

/** SVG radar chart for skills (4 axes) */
const SkillRadar = React.memo(function SkillRadar({ skills }) {
  const W = 300;
  const H = 240;
  const cx = W / 2;
  const cy = H / 2;
  const rMax = 80;
  const AXES = [
    { k: "technical", label: "Tech" },
    { k: "communication", label: "Comms" },
    { k: "problemSolving", label: "Problem" },
    { k: "confidence", label: "Conf." },
  ];

  const angleFor = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / AXES.length;

  const values = AXES.map((a) => ({
    ...a,
    value: Math.max(0, Math.min(100, skills?.[a.k] || 0)),
  }));

  const dataPoints = values.map((v, i) => {
    const a = angleFor(i);
    const r = (v.value / 100) * rMax;
    return {
      x: cx + r * Math.cos(a),
      y: cy + r * Math.sin(a),
      label: v.label,
      value: v.value,
      angle: a,
    };
  });

  const polyPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[300px]">
        <defs>
          <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.05" />
          </radialGradient>
        </defs>

        {/* concentric rings */}
        {[0.25, 0.5, 0.75, 1].map((f, idx) => (
          <polygon
            key={idx}
            points={AXES.map((_, i) => {
              const a = angleFor(i);
              return `${cx + rMax * f * Math.cos(a)},${cy + rMax * f * Math.sin(a)}`;
            }).join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
          />
        ))}

        {/* axes */}
        {AXES.map((_, i) => {
          const a = angleFor(i);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={cx + rMax * Math.cos(a)}
              y2={cy + rMax * Math.sin(a)}
              stroke="rgba(255,255,255,0.08)"
            />
          );
        })}

        {/* data polygon */}
        <motion.polygon
          points={polyPoints}
          fill="url(#radarFill)"
          stroke="#22d3ee"
          strokeWidth="1.5"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* data points */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#22d3ee" stroke="#050505" strokeWidth="1.5" />
        ))}

        {/* labels */}
        {dataPoints.map((p, i) => {
          const a = p.angle;
          const lx = cx + (rMax + 22) * Math.cos(a);
          const ly = cy + (rMax + 22) * Math.sin(a);
          // adjust text anchor based on angle
          let anchor = "middle";
          if (Math.cos(a) > 0.3) anchor = "start";
          else if (Math.cos(a) < -0.3) anchor = "end";
          return (
            <g key={`l-${i}`}>
              <text
                x={lx}
                y={ly - 4}
                textAnchor={anchor}
                dominantBaseline="middle"
                className="fill-zinc-500"
                style={{ fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}
              >
                {p.label.toUpperCase()}
              </text>
              <text
                x={lx}
                y={ly + 8}
                textAnchor={anchor}
                dominantBaseline="middle"
                className="fill-white font-bold"
                style={{ fontSize: 11 }}
              >
                {p.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
});

/** Circular progress ring (for weekly goal) */
const ProgressRing = React.memo(function ProgressRing({ value, max, size = 128, stroke = 10, children }) {
  const radius = (size - stroke) / 2;
  const c = 2 * Math.PI * radius;
  const progress = max === 0 ? 0 : Math.min(value / max, 1);
  const dashoffset = c * (1 - progress);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: dashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
});

/* ─────────────────────────── page ─────────────────────────── */

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signout } = useAuth();

  const { data: profile } = useProfileQuery(!!user);
  const { data: stats } = useDashboardStatsQuery(!!user);
  const { data: interviews = [], isLoading: interviewsLoading } = useInterviewsQuery(!!user);
  const { data: subscription } = useSubscriptionQuery(!!user);

  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("All Levels");
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [signingOut, setSigningOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Weekly goal (persisted in localStorage)
  const [weeklyGoal, setWeeklyGoal] = useState(DEFAULT_GOAL);
  const [editingGoal, setEditingGoal] = useState(false);

  useEffect(() => {
    try {
      const v = parseInt(localStorage.getItem(GOAL_STORAGE_KEY), 10);
      if (!Number.isNaN(v) && v > 0 && v <= 20) setWeeklyGoal(v);
    } catch {
      /* ignore */
    }
  }, []);



  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signout();
      toast.success("Signed out");
      navigate("/");
    } catch {
      setSigningOut(false);
    }
  }, [signout, navigate]);

  const confirmLogout = useCallback(async () => {
    setShowLogoutModal(false);
    handleSignOut();
  }, [handleSignOut]);

  const persistGoal = useCallback((n) => {
    const clamped = Math.max(1, Math.min(20, n));
    setWeeklyGoal(clamped);
    try {
      localStorage.setItem(GOAL_STORAGE_KEY, String(clamped));
    } catch {
      /* ignore */
    }
  }, []);

  const hasData = (stats?.totalInterviews ?? 0) > 0;

  const filteredInterviews = useMemo(() => {
    let result = interviews;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.jobRole?.toLowerCase().includes(q) ||
          i.experienceLevel?.toLowerCase().includes(q)
      );
    }
    if (levelFilter !== "All Levels") {
      result = result.filter((i) => i.experienceLevel === levelFilter);
    }
    return result;
  }, [interviews, searchQuery, levelFilter]);

  const visibleInterviews = filteredInterviews.slice(0, visibleCount);
  const hasMore = visibleCount < filteredInterviews.length;

  const bestInterview = useMemo(() => {
    if (!interviews.length) return null;
    return interviews.reduce((best, curr) =>
      curr.overallScore > best.overallScore ? curr : best
    );
  }, [interviews]);

  // week-based aggregations
  const weekAggregates = useMemo(() => {
    const start = startOfWeek();
    const startPrev = new Date(start);
    startPrev.setDate(startPrev.getDate() - 7);

    const inWeek = interviews.filter((i) => {
      const d = new Date(i.completedAt);
      return d >= start;
    }).length;
    const inLastWeek = interviews.filter((i) => {
      const d = new Date(i.completedAt);
      return d >= startPrev && d < start;
    }).length;

    return { thisWeek: inWeek, lastWeek: inLastWeek };
  }, [interviews]);

  // score delta (latest - previous)
  const scoreDelta = useMemo(() => {
    if (!stats?.recentScores || stats.recentScores.length < 2) return null;
    const arr = stats.recentScores;
    return arr[arr.length - 1] - arr[arr.length - 2];
  }, [stats]);

  const greeting = greetingFor(new Date().getHours());

  if (authLoading) {
    return <LoadingScreen message="Loading dashboard..." />;
  }
  if (!user) {
    return <Navigate to="/signin" replace />;
  }
  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="ambient-glow" />
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-40 right-0 w-[500px] h-[500px] bg-emerald-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <Navbar
        left={
          <>
            <Link to="/dashboard" data-testid="dashboard-nav-logo" className="shrink-0">
              <VoxaLogo size={22} />
            </Link>
            <div className="hidden md:block h-5 w-px bg-white" />
            <div className="hidden md:block label-overline">Dashboard</div>
          </>
        }
        right={
          <>
            <Link
              to="/profile"
              className="hidden md:flex items-center gap-2.5 h-10 pl-2.5 pr-4 rounded-full border border-white/10 hover:bg-white/5 transition-colors group"
            >
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center text-xs font-bold text-black shrink-0">
                {profile?.display_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <span className="text-sm text-zinc-400 group-hover:text-white transition-colors max-w-[140px] truncate font-medium">
                {profile?.display_name || "User"}
              </span>
            </Link>
            <Link
              to="/profile"
              className="md:hidden h-10 w-10 rounded-full border border-white/10 hover:bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
              title="Profile"
            >
              <Settings className="h-4 w-4" strokeWidth={1.5} />
            </Link>
            <button
              onClick={() => setShowLogoutModal(true)}
              disabled={signingOut}
              aria-label="Sign out"
              className="h-10 w-10 rounded-full border border-white/10 hover:bg-red-500/10 hover:border-red-400/30 flex items-center justify-center transition-all disabled:opacity-40"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </>
        }
      />

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 z-10">
        {/* ═══════════ HERO — full width ═══════════ */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 sm:mb-14"
        >
          <div className="flex flex-col lg:flex-row lg:items-stretch lg:justify-between gap-8">
            {/* Left: greeting + heading + subtitle */}
            <div className="max-w-2xl">
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="inline-flex items-center gap-1.5 text-sm font-semibold tracking-wider text-cyan-300/90"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {greeting}
              </motion.span>
              <h1
                className="mt-2 text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.9]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {profile?.display_name || "Ready to level up"}
                <span className="text-cyan-300">.</span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed max-w-lg">
                {hasData
                  ? "Every interview sharpens your edge. Jump into your next practice session."
                  : "Your first interview is a few clicks away. Complete one to unlock stats and tracking."}
              </p>
            </div>

            {/* Right: unified panel — streak + plan + stats */}
            <div className="flex flex-col shrink-0 lg:min-w-[280px] lg:max-w-[320px]">
              <motion.div
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] overflow-hidden"
              >
                {/* ── Practice streak ── */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <ProgressRing value={weekAggregates.thisWeek} max={weeklyGoal} size={36} stroke={3}>
                    <div className="text-[10px] font-black text-white leading-none">{weekAggregates.thisWeek}</div>
                  </ProgressRing>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>Practice streak</span>
                      <button
                        data-testid="dashboard-edit-goal-btn"
                        onClick={() => setEditingGoal((v) => !v)}
                        className="h-4 w-4 rounded hover:bg-white/5 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-all"
                        aria-label="Edit weekly goal"
                      >
                        <Pencil className="h-2 w-2" strokeWidth={2} />
                      </button>
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      <span className="text-white font-semibold">{weekAggregates.thisWeek}</span>/{weeklyGoal} this week
                      {weekAggregates.lastWeek > 0 && <span className="text-zinc-600"> &middot; {weekAggregates.lastWeek} last week</span>}
                    </div>
                    <AnimatePresence>
                      {editingGoal && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-1 overflow-hidden mt-1.5">
                          <button onClick={() => persistGoal(weeklyGoal - 1)} className="h-5 w-5 rounded border border-white/10 hover:bg-white/5 flex items-center justify-center text-white disabled:opacity-30" disabled={weeklyGoal <= 1} aria-label="Decrease" data-testid="dashboard-goal-decrement">
                            <Minus className="h-2 w-2" strokeWidth={2} />
                          </button>
                          <span className="text-xs font-semibold text-white min-w-[16px] text-center">{weeklyGoal}</span>
                          <button onClick={() => persistGoal(weeklyGoal + 1)} className="h-5 w-5 rounded border border-white/10 hover:bg-white/5 flex items-center justify-center text-white disabled:opacity-30" disabled={weeklyGoal >= 20} aria-label="Increase" data-testid="dashboard-goal-increment">
                            <Plus className="h-2 w-2" strokeWidth={2} />
                          </button>
                          <button onClick={() => setEditingGoal(false)} className="h-5 px-2 rounded bg-white text-black text-[9px] font-semibold flex items-center gap-1 hover:bg-zinc-200 transition-all" data-testid="dashboard-goal-save">
                            <Check className="h-2 w-2" strokeWidth={2.5} />Set
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="h-px bg-white/[0.06]" />

                {/* ── Subscription plan + upgrade ── */}
                {subscription && (
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-white/[0.03] flex items-center justify-center shrink-0">
                        <CreditCard className="h-3 w-3 text-zinc-400" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-white capitalize leading-tight" style={{ fontFamily: "var(--font-heading)" }}>{subscription.plan} plan</div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {subscription.interviewsRemaining > 0
                            ? `${subscription.interviewsRemaining} interview${subscription.interviewsRemaining > 1 ? "s" : ""} remaining`
                            : subscription.interviewsRemaining === 0
                              ? "No interviews left"
                              : `${subscription.interviewsUsed} used`}
                          {subscription.currentPeriodEnd
                            ? ` · resets ${new Date(subscription.currentPeriodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                            : subscription.isLifetime
                              ? " · lifetime"
                              : ""}
                        </div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    {subscription.interviewsAllowed > 0 && (
                      <div className="mt-2.5 h-2 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(pct(subscription.interviewsUsed, subscription.interviewsAllowed), 100)}%` }}
                          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                        />
                      </div>
                    )}

                    {/* Upgrade CTA — inside subscription card */}
                    {(subscription.plan === "free" || subscription.plan === "starter") && (
                      <div className="mt-3 pt-3 border-t border-white/[0.06]">
                        <Link to="/pricing">
                          <Button className="h-8 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-semibold px-5 transition-all w-full">
                            View Plans &rarr;
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Streak & best score stats row ── */}
                {hasData && (
                  <>
                    <div className="h-px bg-white/[0.06]" />
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Flame className="h-3.5 w-3.5 text-orange-400" strokeWidth={2} fill="currentColor" />
                        <span className="text-white font-semibold"><AnimatedNumber value={Math.min(stats?.totalInterviews ?? 0, 5)} enabled={hasData} /></span> day streak
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Star className="h-3.5 w-3.5 text-amber-300" strokeWidth={2} fill="currentColor" />
                        Best <span className="text-white font-bold">{stats.bestScore}</span>
                      </span>
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* ═══════════ CTA — start interview ═══════════ */}
        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="mb-10 sm:mb-14"
        >
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-5 sm:p-6">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/[0.03] to-transparent pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center shrink-0">
                  <Play className="h-5 w-5 text-cyan-300 ml-0.5" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>Start a new interview</h3>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    {hasData ? "Choose a role and begin your practice session." : "Your first interview is a click away."}
                  </p>
                </div>
              </div>
              {subscription && subscription.interviewsRemaining <= 0 ? (
                <Link to="/pricing">
                  <Button className="rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/25 h-12 px-7 text-sm font-semibold hover:bg-amber-400/20 shrink-0">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Upgrade to continue
                  </Button>
                </Link>
              ) : (
                <Link to="/setup">
                  <Button
                    data-testid="dashboard-start-cta"
                    className="group rounded-full bg-white hover:bg-zinc-200 text-black h-12 px-7 text-sm font-bold shadow-lg transition-all active:scale-[0.97] shrink-0"
                  >
                    <Play className="mr-2 h-4 w-4" strokeWidth={2.5} />
                    New interview
                    <motion.span
                      className="ml-1.5 inline-block"
                      initial={{ x: 0 }}
                      whileHover={{ x: 3 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      &rarr;
                    </motion.span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </motion.section>

        {/* ═══════════ STATS — horizontal bar ═══════════ */}
        {hasData && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.16 }}
            className="mb-10 sm:mb-14"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-white/[0.06] border border-white/[0.06] rounded-2xl overflow-hidden bg-[#0a0a0a]">
              {[
                { value: stats.totalInterviews, label: "Interviews", accent: "text-5xl", delta: weekAggregates.thisWeek - weekAggregates.lastWeek },
                { value: stats.averageScore, label: "Avg score", accent: "text-5xl text-cyan-300" },
                { value: stats.bestScore, label: "Best score", accent: "text-5xl text-emerald-400" },
                { value: `${stats.totalPracticeMinutes}m`, label: "Practice", accent: "text-5xl" },
                { value: interviews.length >= 2 ? `+${Math.max(0, interviews[0].overallScore - interviews[interviews.length - 1].overallScore)}` : "\u2014", label: "Improve", accent: "text-5xl" },
                { value: weekAggregates.thisWeek >= weeklyGoal ? "Done \u2713" : `${weeklyGoal - weekAggregates.thisWeek}`, label: "To go", accent: "text-4xl" },
              ].map(({ value, label, accent, delta }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.18 + i * 0.04 }}
                  className="p-5 sm:p-6 group cursor-default hover:bg-white/[0.015] transition-colors"
                >
                  <div className="flex items-baseline gap-2">
                    <span className={`font-black tracking-tighter leading-none ${accent || "text-white"}`}>
                      <AnimatedNumber value={value} enabled={hasData} />
                    </span>
                    {typeof delta === "number" && delta !== 0 && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
                        className={`text-xs font-semibold ${delta > 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {delta > 0 ? "+" : ""}{delta}
                      </motion.span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1.5 uppercase tracking-wider font-medium">{label}</div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ═══════════ ANALYTICS ═══════════ */}
        {hasData && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.14 }}
            className="mb-10 sm:mb-14"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="lg:col-span-2 p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold" style={{ fontFamily: "var(--font-heading)" }}>Score trends</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Last {stats.recentScores?.length || 0} interviews</p>
                  </div>
                  {scoreDelta !== null && (
                    <span className={`text-xs font-semibold flex items-center gap-1 ${scoreDelta > 0 ? "text-emerald-400" : scoreDelta < 0 ? "text-red-400" : "text-zinc-500"}`}>
                      {scoreDelta > 0 ? <TrendingUp className="h-3 w-3" strokeWidth={2} /> : scoreDelta < 0 ? <TrendingDown className="h-3 w-3" strokeWidth={2} /> : null}{scoreDelta > 0 ? "+" : ""}{scoreDelta}
                    </span>
                  )}
                </div>
                <ScoreTrendChart scores={stats.recentScores || []} />
              </div>
              <div className="border-t lg:border-t-0 lg:border-l border-white/[0.06] p-5 sm:p-6 flex flex-col">
                <div className="mb-1">
                  <h2 className="text-base font-semibold" style={{ fontFamily: "var(--font-heading)" }}>Skill radar</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Average scores</p>
                </div>
                {stats.skillAverages && Object.keys(stats.skillAverages).length > 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <SkillRadar skills={stats.skillAverages} />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-sm text-zinc-600 text-center">
                    <BrainCircuit className="h-8 w-8 text-zinc-700 mb-2" strokeWidth={1} />
                    <span>Complete an interview</span>
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        )}

        {/* ═══════════ EMPTY STATE ═══════════ */}
        {!hasData && !interviewsLoading && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-10 sm:mb-14"
          >
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a0a] px-6 sm:px-8 py-10 sm:py-12 text-center">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/[0.03] rounded-full blur-[80px] pointer-events-none" />
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center mx-auto">
                  <Zap className="h-6 w-6 text-cyan-300" strokeWidth={1.5} />
                </div>
                <h2 className="mt-4 text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>Ready for your first interview?</h2>
                <p className="mt-2 text-base text-zinc-500 max-w-md mx-auto leading-relaxed">Complete one to unlock stats, trends, skill analysis, and improvement tips.</p>
                <Link to="/setup">
                  <Button className="mt-6 h-12 rounded-full bg-white hover:bg-zinc-200 text-black px-8 text-sm font-bold shadow-lg transition-all active:scale-[0.97]">
                    <Play className="mr-2 h-4 w-4" strokeWidth={2.5} />
                    Start your first interview
                  </Button>
                </Link>
                <div className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-left">
                  {[
                    { icon: Briefcase, title: "Pick a role", desc: "Job role & level" },
                    { icon: Zap, title: "Practice", desc: "AI voice simulation" },
                    { icon: FileText, title: "Feedback", desc: "Scores & tips" },
                  ].map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-white/[0.03] flex items-center justify-center">
                        <Icon className="h-4 w-4 text-cyan-300" strokeWidth={1.5} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{title}</div>
                        <div className="text-xs text-zinc-600">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* ═══════════ INTERVIEW HISTORY ═══════════ */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-base font-semibold" style={{ fontFamily: "var(--font-heading)" }}>History</h2>
              <p className="text-xs text-zinc-500 mt-0.5">{interviews.length > 0 ? `${interviews.length} completed` : "Past interviews"}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" strokeWidth={1.5} />
                <Input
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(PAGE_SIZE); }}
                  placeholder="Search..."
                  aria-label="Search interviews"
                  className="h-9 w-full sm:w-44 rounded-lg bg-transparent border-white/10 text-sm text-white placeholder:text-zinc-600 pl-9"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                aria-label={showFilters ? "Hide filters" : "Show filters"}
                className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-colors ${showFilters || levelFilter !== "All Levels" ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300" : "border-white/10 bg-transparent text-zinc-500 hover:text-zinc-300"}`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => { setLevelFilter(l); setVisibleCount(PAGE_SIZE); }}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${levelFilter === l ? "bg-white/10 text-white" : "text-zinc-600 hover:text-zinc-400"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          )}

          {interviewsLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-zinc-600" /></div>
          ) : filteredInterviews.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {visibleInterviews.map((interview, idx) => (
                  <Link key={interview.id} to={{ pathname: `/report/${interview.id}`, state: { interview } }} className="block group">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25, delay: Math.min(idx * 0.02, 0.2) }}
                      className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4 sm:p-5 transition-all hover:border-white/20 hover:bg-white/[0.02]"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold font-mono ${scoreBg(interview.overallScore)} ${scoreColor(interview.overallScore)} shrink-0`}>
                          {interview.overallScore}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">{interview.jobRole}</div>
                          <div className="text-xs text-zinc-500 mt-1 flex flex-wrap gap-x-3">
                            <span>{interview.experienceLevel}</span>
                            <span>{interview.durationMinutes}m</span>
                            <span>{fmtDate(interview.completedAt)}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0 mt-1.5" strokeWidth={1.5} />
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center mt-5">
                  <button onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)} className="flex items-center gap-1.5 px-5 h-9 rounded-full border border-white/10 bg-transparent hover:bg-white/[0.03] text-sm text-zinc-500 hover:text-white transition-all">
                    Show {filteredInterviews.length - visibleCount} more &rarr;
                  </button>
                </div>
              )}
            </>
          ) : interviews.length > 0 ? (
            <div className="flex flex-col items-center py-14 text-center">
              <Search className="h-10 w-10 text-zinc-700 mb-3" strokeWidth={1} />
              <p className="text-sm text-zinc-500">No matches found</p>
              <button onClick={() => { setSearchQuery(""); setLevelFilter("All Levels"); }} className="mt-2 text-xs text-cyan-300 hover:text-cyan-200 transition-colors">Clear filters</button>
            </div>
          ) : null}
        </section>

        {/* ═══════════ FEEDBACK ═══════════ */}
        <section className="mt-8 mb-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">Help us improve &mdash; share your thoughts.</p>
            <Link to="/feedback">
              <span className="text-sm text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer">Send feedback &rarr;</span>
            </Link>
          </div>
        </section>

        <div className="h-12" />
      </main>

      <ConfirmModal
        open={showLogoutModal}
        title="Sign out"
        message="Are you sure you want to sign out? Your interview history will be waiting when you return."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  );
}


