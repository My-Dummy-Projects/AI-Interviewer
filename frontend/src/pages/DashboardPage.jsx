import React, { useEffect, useState, useMemo } from "react";
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
  Check,
  Minus,
  Plus,
  Pencil,
  Play,
  Zap,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { VoxaLogo } from "@/components/VoxaLogo";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
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
function ScoreTrendChart({ scores }) {
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
}

/** SVG radar chart for skills (4 axes) */
function SkillRadar({ skills }) {
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
}

/** Circular progress ring (for weekly goal) */
function ProgressRing({ value, max, size = 128, stroke = 10, children }) {
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
}

/* ─────────────────────────── page ─────────────────────────── */

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState([]);
  const [interviewsLoading, setInterviewsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("All Levels");
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [signingOut, setSigningOut] = useState(false);

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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/signin", { replace: true });
      return;
    }
    if (user) {
      loadProfile();
      loadStats();
      loadInterviews();
    }
  }, [user, authLoading]);

  const loadProfile = async () => {
    try {
      const data = await api.getProfile();
      setProfile(data);
    } catch {
      /* non-critical */
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch {
      /* stats may not exist for new users */
    }
  };

  const loadInterviews = async () => {
    setInterviewsLoading(true);
    try {
      const data = await api.getInterviews();
      setInterviews(data.interviews || []);
    } catch {
      toast.error("Failed to load interview history");
    } finally {
      setInterviewsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signout();
      toast.success("Signed out");
      navigate("/");
    } catch {
      setSigningOut(false);
    }
  };

  const persistGoal = (n) => {
    const clamped = Math.max(1, Math.min(20, n));
    setWeeklyGoal(clamped);
    try {
      localStorage.setItem(GOAL_STORAGE_KEY, String(clamped));
    } catch {
      /* ignore */
    }
  };

  const hasData = stats && stats.totalInterviews > 0;

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

  if (authLoading || (!user && !authLoading)) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden">
      {/* ─── decorative background ─── */}
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="ambient-glow" />
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-40 right-0 w-[500px] h-[500px] bg-emerald-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

      {/* ─── header ─── */}
      <Navbar
        left={
          <>
            <Link to="/" data-testid="dashboard-nav-logo" className="shrink-0">
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
              className="hidden md:flex items-center gap-2.5 h-8 pl-2 pr-3 rounded-full border border-white/10 hover:bg-white/5 transition-colors group"
            >
              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center text-[9px] font-bold text-black shrink-0">
                {profile?.display_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <span className="text-xs text-zinc-400 group-hover:text-white transition-colors max-w-[100px] truncate">
                {profile?.display_name || "User"}
              </span>
            </Link>
            <Link
              to="/profile"
              className="md:hidden h-8 w-8 rounded-full border border-white/10 hover:bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
              title="Profile"
            >
              <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Link>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="h-8 w-8 rounded-full border border-white/10 hover:bg-red-500/10 hover:border-red-400/30 text-zinc-500 hover:text-red-300 flex items-center justify-center transition-all disabled:opacity-40"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </>
        }
      />

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 z-10">
        {/* ─── hero row: welcome (2/3) + weekly goal (1/3) ─── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-8 sm:mb-10">
          {/* Welcome hero card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 sm:p-8"
          >
            {/* animated mesh */}
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-32 -left-24 w-72 h-72 bg-emerald-400/[0.06] rounded-full blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-cyan-300/80">
                  {greeting}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-cyan-400/30 to-transparent max-w-[80px]" />
              </div>

              <h1
                className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-white leading-[1.05]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {profile?.display_name ? profile.display_name : "Ready to level up"}
                <span className="text-cyan-300">.</span>
              </h1>

              <p className="mt-3 text-sm sm:text-base text-zinc-400 max-w-lg leading-relaxed">
                {hasData
                  ? "Every interview sharpens your edge. Review your progress and jump into your next practice session."
                  : "Your first interview is a few clicks away. Complete one to unlock stats, scores, and personalized progress tracking."}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link to="/setup">
                  <Button
                    data-testid="dashboard-start-cta"
                    className="rounded-full bg-white hover:bg-zinc-200 text-black h-11 px-6 text-sm font-semibold shadow-lg shadow-white/5 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <Play className="mr-2 h-4 w-4 fill-black" strokeWidth={0} />
                    Start new interview
                  </Button>
                </Link>
                {hasData && (
                  <div className="flex items-center gap-4 text-[11px] text-zinc-500 font-mono ml-1">
                    <span className="flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5 text-orange-400" strokeWidth={2} />
                      <span className="text-white font-semibold">{Math.min(stats.totalInterviews, 5)}</span> streak
                    </span>
                    <span className="text-white/20">·</span>
                    <span className="flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 text-amber-300" strokeWidth={2} />
                      best <span className="text-white font-semibold">{stats.bestScore}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Weekly goal card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0a] p-5 sm:p-6"
          >
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl" />
            <div className="relative flex flex-col h-full">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-zinc-500">
                    Weekly Goal
                  </div>
                  <h3
                    className="mt-1 text-lg font-bold text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Practice streak
                  </h3>
                </div>
                <button
                  data-testid="dashboard-edit-goal-btn"
                  onClick={() => setEditingGoal((v) => !v)}
                  className="h-7 w-7 rounded-full border border-white/10 hover:border-white/25 hover:bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
                  title="Edit goal"
                >
                  <Pencil className="h-3 w-3" strokeWidth={2} />
                </button>
              </div>

              <div className="flex-1 flex items-center justify-center py-2">
                <ProgressRing value={weekAggregates.thisWeek} max={weeklyGoal}>
                  <div className="flex flex-col items-center leading-none">
                    <div className="text-2xl font-black text-white">
                      {weekAggregates.thisWeek}
                      <span className="text-zinc-600 text-sm font-bold">/{weeklyGoal}</span>
                    </div>
                    <div className="mt-1 text-[9px] font-mono tracking-widest uppercase text-zinc-500">
                      this week
                    </div>
                  </div>
                </ProgressRing>
              </div>

              <AnimatePresence>
                {editingGoal && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2 pt-3 border-t border-white/5 mt-2">
                      <button
                        onClick={() => persistGoal(weeklyGoal - 1)}
                        className="h-8 w-8 rounded-lg border border-white/10 hover:border-white/25 hover:bg-white/5 text-white flex items-center justify-center transition-all disabled:opacity-30"
                        disabled={weeklyGoal <= 1}
                        data-testid="dashboard-goal-decrement"
                      >
                        <Minus className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                      <div className="flex-1 text-center">
                        <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                          Target
                        </div>
                        <div className="text-lg font-bold text-white">
                          {weeklyGoal}
                          <span className="text-xs text-zinc-500 ml-1">/wk</span>
                        </div>
                      </div>
                      <button
                        onClick={() => persistGoal(weeklyGoal + 1)}
                        className="h-8 w-8 rounded-lg border border-white/10 hover:border-white/25 hover:bg-white/5 text-white flex items-center justify-center transition-all disabled:opacity-30"
                        disabled={weeklyGoal >= 20}
                        data-testid="dashboard-goal-increment"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </div>
                    <button
                      onClick={() => setEditingGoal(false)}
                      className="mt-2 w-full h-8 rounded-lg bg-white text-black text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-zinc-200 transition-all"
                      data-testid="dashboard-goal-save"
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Set goal
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {!editingGoal && (
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500">Last week</span>
                  <span className="text-zinc-300 font-mono">
                    {weekAggregates.lastWeek} completed
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </section>

        {/* ─── empty state ─── */}
        {/* {!hasData && !loading && <EmptyState />} */}

        {/* ─── stats grid ─── */}
        {hasData && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8 sm:mb-10"
          >
            {[
              {
                icon: Target,
                value: stats.totalInterviews,
                label: "Total Interviews",
                iconBg: "bg-cyan-400/10",
                iconColor: "text-cyan-300",
                delta: weekAggregates.thisWeek - weekAggregates.lastWeek,
                deltaLabel: "vs last week",
              },
              {
                icon: TrendingUp,
                value: stats.averageScore,
                label: "Average Score",
                iconBg: "bg-emerald-400/10",
                iconColor: "text-emerald-300",
                accent: "text-cyan-300",
              },
              {
                icon: Award,
                value: stats.bestScore,
                label: "Best Score",
                iconBg: "bg-amber-400/10",
                iconColor: "text-amber-300",
                accent: "text-emerald-400",
              },
              {
                icon: Timer,
                value: `${stats.totalPracticeMinutes}m`,
                label: "Practice Time",
                iconBg: "bg-purple-400/10",
                iconColor: "text-purple-300",
              },
            ].map(({ icon: Icon, value, label, iconBg, iconColor, accent, delta, deltaLabel }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.12 + i * 0.05 }}
                className="group relative rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4 sm:p-5 hover:border-white/20 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`h-8 w-8 rounded-lg ${iconBg} border border-white/5 flex items-center justify-center`}>
                      <Icon className={`h-4 w-4 ${iconColor}`} strokeWidth={1.5} />
                    </div>
                    {typeof delta === "number" && delta !== 0 && (
                      <span
                        className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-bold ${delta > 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                      >
                        {delta > 0 ? (
                          <TrendingUp className="h-3 w-3" strokeWidth={2} />
                        ) : (
                          <TrendingDown className="h-3 w-3" strokeWidth={2} />
                        )}
                        {delta > 0 ? "+" : ""}
                        {delta}
                      </span>
                    )}
                  </div>
                  <div className={`text-2xl sm:text-3xl font-black tracking-tight ${accent || "text-white"}`}>
                    {value}
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="text-[10px] font-mono tracking-widest uppercase text-zinc-600">
                      {label}
                    </div>
                    {deltaLabel && typeof delta === "number" && delta !== 0 && (
                      <div className="text-[9px] font-mono text-zinc-600">{deltaLabel}</div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.section>
        )}

        {/* ─── analytics ─── */}
        {hasData && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-8 sm:mb-10"
          >
            {/* score trend area chart */}
            <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2
                    className="text-sm font-semibold text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Score Trends
                  </h2>
                  <p className="text-[11px] text-zinc-600 mt-0.5">
                    Last {stats.recentScores?.length || 0} interviews · hover to inspect
                  </p>
                </div>
                {scoreDelta !== null && (
                  <div
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${scoreDelta > 0
                      ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/5"
                      : scoreDelta < 0
                        ? "text-red-400 border-red-400/30 bg-red-400/5"
                        : "text-zinc-400 border-white/10 bg-white/[0.03]"
                      }`}
                  >
                    {scoreDelta > 0 ? (
                      <TrendingUp className="h-3 w-3" strokeWidth={2} />
                    ) : scoreDelta < 0 ? (
                      <TrendingDown className="h-3 w-3" strokeWidth={2} />
                    ) : null}
                    {scoreDelta > 0 ? "+" : ""}
                    {scoreDelta} pts
                  </div>
                )}
              </div>
              <ScoreTrendChart scores={stats.recentScores || []} />
            </div>

            {/* skill radar */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-5 sm:p-6">
              <h2
                className="text-sm font-semibold text-white mb-2"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Skill Radar
              </h2>
              <p className="text-[11px] text-zinc-600 mb-2">Average across interviews</p>
              {stats.skillAverages && Object.keys(stats.skillAverages).length > 0 ? (
                <SkillRadar skills={stats.skillAverages} />
              ) : (
                <div className="flex flex-col items-center justify-center h-44 text-sm text-zinc-600 text-center">
                  <BrainCircuit className="h-8 w-8 text-zinc-700 mb-2" strokeWidth={1} />
                  Complete an interview to see skill scores
                </div>
              )}
            </div>
          </motion.section>
        )}

        {/* ─── progress cards ─── */}
        {hasData && (
          <section className="mb-8 sm:mb-10">
            <h2
              className="text-sm font-semibold text-white mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Progress
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="group rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4 sm:p-5 hover:border-white/15 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-400/10 flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-600">
                    Improvement
                  </span>
                </div>
                <div className="text-xl font-bold text-white">
                  {interviews.length >= 2
                    ? `${Math.max(
                      0,
                      interviews[0].overallScore - interviews[interviews.length - 1].overallScore
                    )} pts`
                    : "—"}
                </div>
                <div className="text-[11px] text-zinc-600 mt-0.5">
                  {interviews.length >= 2
                    ? "First to latest interview"
                    : "Need 2+ interviews"}
                </div>
              </div>
              <div className="group rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4 sm:p-5 hover:border-white/15 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-400/10 flex items-center justify-center">
                    <Trophy className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-600">
                    Best Performance
                  </span>
                </div>
                <div className="text-xl font-bold text-white truncate">
                  {bestInterview ? bestInterview.jobRole : "—"}
                </div>
                <div className="text-[11px] text-zinc-600 mt-0.5">
                  {bestInterview ? `Score: ${bestInterview.overallScore}` : "No interviews yet"}
                </div>
              </div>
              <div className="group rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4 sm:p-5 hover:border-white/15 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-cyan-400/10 flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5 text-cyan-400" strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-600">
                    Next Step
                  </span>
                </div>
                <div className="text-xl font-bold text-white">
                  {weekAggregates.thisWeek >= weeklyGoal
                    ? "Goal hit! 🎯"
                    : `${weeklyGoal - weekAggregates.thisWeek} more`}
                </div>
                <div className="text-[11px] text-zinc-600 mt-0.5">
                  {weekAggregates.thisWeek >= weeklyGoal
                    ? "Amazing consistency"
                    : "To reach this week's goal"}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─── interview history ─── */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h2
                className="text-sm font-semibold text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Interview History
              </h2>
              <p className="text-[11px] text-zinc-600 mt-0.5">
                {interviews.length > 0 ? `${interviews.length} completed` : "Review past interviews"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600"
                  strokeWidth={1.5}
                />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  placeholder="Search..."
                  className="h-9 w-full sm:w-44 lg:w-56 rounded-lg bg-white/[0.03] border-white/10 text-sm text-white placeholder:text-zinc-600 pl-9 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-colors ${showFilters || levelFilter !== "All Levels"
                  ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                  : "border-white/10 bg-white/[0.03] text-zinc-500 hover:text-zinc-300"
                  }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-2 mb-4 p-2.5 rounded-xl border border-white/[0.06] bg-[#0a0a0a]">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    setLevelFilter(l);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${levelFilter === l
                    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                    : "border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20"
                    }`}
                >
                  {l}
                </button>
              ))}
            </div>
          )}

          {interviewsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
            </div>
          ) : filteredInterviews.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {visibleInterviews.map((interview, idx) => (
                  <motion.div
                    key={interview.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.3) }}
                    className="group relative rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4 sm:p-5 hover:border-white/20 hover:bg-[#0d0d0d] transition-all duration-300 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <div className="flex items-start justify-between mb-3">
                        <div className="h-9 w-9 rounded-lg bg-cyan-400/10 border border-white/5 flex items-center justify-center">
                          <Briefcase className="h-4 w-4 text-cyan-300" strokeWidth={1.5} />
                        </div>
                        <div
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${scoreBg(
                            interview.overallScore
                          )} ${scoreColor(interview.overallScore)}`}
                        >
                          {interview.overallScore}
                        </div>
                      </div>
                      <h3 className="text-sm font-semibold text-white truncate">
                        {interview.jobRole}
                      </h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-zinc-500">
                        <span>{interview.experienceLevel}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" strokeWidth={1.5} />
                          {interview.durationMinutes}m
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" strokeWidth={1.5} />
                          {fmtDate(interview.completedAt)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-5">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                    className="flex items-center gap-1.5 px-5 h-9 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-sm text-zinc-400 hover:text-white transition-all"
                  >
                    Load more ({filteredInterviews.length - visibleCount} left)
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </>
          ) : interviews.length > 0 ? (
            <div className="flex flex-col items-center py-14 text-center px-6 rounded-xl border border-dashed border-white/[0.06]">
              <Search className="h-10 w-10 text-zinc-700 mb-3" strokeWidth={1} />
              <p className="text-sm text-zinc-500">No matches found</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setLevelFilter("All Levels");
                }}
                className="mt-2 text-xs text-cyan-300 hover:text-cyan-200 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          ) : hasData ? (
            <div className="flex flex-col items-center py-14 text-center px-6 rounded-xl border border-dashed border-white/[0.06]">
              <FileText className="h-10 w-10 text-zinc-700 mb-3" strokeWidth={1} />
              <p className="text-sm text-zinc-500">No history yet</p>
            </div>
          ) : null}
        </section>

        <div className="h-12" />
      </main>
    </div>
  );
}

/* ─────────────────────────── empty state ─────────────────────────── */

// function EmptyState() {
//   const STEPS = [
//     {
//       icon: Briefcase,
//       label: "Pick your role",
//       hint: "Choose a job role, seniority, and duration",
//     },
//     {
//       icon: BrainCircuit,
//       label: "Practice live",
//       hint: "Chat with a real-time AI interviewer",
//     },
//     {
//       icon: Trophy,
//       label: "Get feedback",
//       hint: "Structured report with scores & tips",
//     },
//   ];

//   return (
//     <motion.section
//       initial={{ opacity: 0, y: 12 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ duration: 0.5 }}
//       className="mb-10"
//     >
//       <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0a0a0a] via-[#080808] to-[#050505]">
//         {/* decorative mesh */}
//         <div className="absolute -top-24 -left-16 w-96 h-96 bg-cyan-400/[0.08] rounded-full blur-3xl" />
//         <div className="absolute -bottom-24 -right-16 w-96 h-96 bg-emerald-400/[0.05] rounded-full blur-3xl" />
//         <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

//         <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-8 p-6 sm:p-10">
//           {/* copy + CTA */}
//           <div className="lg:col-span-3 flex flex-col justify-center">
//             <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-cyan-400/20 bg-cyan-400/5 w-fit mb-4">
//               <Zap className="h-3 w-3 text-cyan-300" strokeWidth={2} />
//               <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-300">
//                 Get Started
//               </span>
//             </div>
//             <h2
//               className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tighter text-white leading-[1.1]"
//               style={{ fontFamily: "var(--font-heading)" }}
//             >
//               Your first interview<br />
//               is a click away<span className="text-cyan-300">.</span>
//             </h2>
//             <p className="mt-3 text-sm sm:text-base text-zinc-400 max-w-lg leading-relaxed">
//               Run a live, voice-based mock interview tailored to your role and get a structured
//               report you can act on in minutes.
//             </p>

//             <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
//               {STEPS.map((s, i) => (
//                 <div
//                   key={i}
//                   className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 hover:border-white/15 transition-all"
//                 >
//                   <div className="flex items-center gap-2 mb-1.5">
//                     <div className="h-6 w-6 rounded-md bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
//                       <s.icon className="h-3 w-3 text-cyan-300" strokeWidth={2} />
//                     </div>
//                     <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
//                       Step {i + 1}
//                     </span>
//                   </div>
//                   <div className="text-sm font-semibold text-white">{s.label}</div>
//                   <div className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{s.hint}</div>
//                 </div>
//               ))}
//             </div>

//             <div className="mt-6 flex items-center gap-3">
//               <Link to="/setup">
//                 <Button
//                   data-testid="dashboard-empty-cta"
//                   className="rounded-full bg-white hover:bg-zinc-200 text-black px-7 h-11 text-sm font-semibold shadow-lg shadow-white/5 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
//                 >
//                   <Play className="mr-2 h-4 w-4 fill-black" strokeWidth={0} />
//                   Start your first interview
//                 </Button>
//               </Link>
//               <span className="text-[11px] font-mono text-zinc-600">≈ 15 min</span>
//             </div>
//           </div>

//           {/* teaser preview */}
//           <div className="lg:col-span-2 relative">
//             <div className="relative rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/80 backdrop-blur p-4 sm:p-5 shadow-2xl">
//               <div className="flex items-center gap-2 mb-3">
//                 <div className="h-6 w-6 rounded-md bg-cyan-400/10 flex items-center justify-center">
//                   <BrainCircuit className="h-3.5 w-3.5 text-cyan-300" strokeWidth={1.5} />
//                 </div>
//                 <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
//                   Sample Report
//                 </div>
//               </div>
//               <div className="text-xs text-zinc-500 mb-2">Overall</div>
//               <div className="flex items-end justify-between mb-4">
//                 <div className="text-4xl font-black tracking-tighter text-white">82</div>
//                 <div className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/25">
//                   +7
//                 </div>
//               </div>
//               <div className="space-y-2.5">
//                 {[
//                   { l: "Technical", v: 85 },
//                   { l: "Communication", v: 78 },
//                   { l: "Problem Solving", v: 82 },
//                   { l: "Confidence", v: 80 },
//                 ].map((s) => (
//                   <div key={s.l}>
//                     <div className="flex justify-between text-[10px] mb-1">
//                       <span className="text-zinc-500">{s.l}</span>
//                       <span className="text-white font-mono font-semibold">{s.v}</span>
//                     </div>
//                     <div className="h-1 bg-white/5 rounded-full overflow-hidden">
//                       <motion.div
//                         className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
//                         initial={{ width: 0 }}
//                         animate={{ width: `${s.v}%` }}
//                         transition={{ duration: 1.2, ease: "easeOut" }}
//                       />
//                     </div>
//                   </div>
//                 ))}
//               </div>
//               <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-500">
//                 <span>Senior · Frontend</span>
//                 <span>30m</span>
//               </div>
//             </div>
//             {/* floating badge */}
//             <div className="absolute -top-3 -right-3 px-2.5 py-1 rounded-full bg-cyan-400 text-black text-[10px] font-mono font-bold flex items-center gap-1 shadow-lg">
//               <Sparkles className="h-3 w-3" strokeWidth={2.5} />
//               PREVIEW
//             </div>
//           </div>
//         </div>
//       </div>
//     </motion.section>
//   );
// }
