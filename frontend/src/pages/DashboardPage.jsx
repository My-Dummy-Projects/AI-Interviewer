import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LogOut,
  ArrowRight,
  BarChart3,
  Calendar,
  Briefcase,
  Clock,
  Loader2,
  FileText,
  Settings,
  TrendingUp,
  Target,
  Timer,
  Award,
  BrainCircuit,
  Search,
  SlidersHorizontal,
  Sparkles,
  ChevronRight,
  Zap,
  Flame,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VoxaLogo } from "@/components/VoxaLogo";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { LoadingScreen } from "@/components/LoadingScreen";
import { toast } from "sonner";

const PAGE_SIZE = 9;

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

const LEVELS = ["All Levels", "Intern", "Junior", "Mid-level", "Senior", "Staff/Principal"];

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
      // non-critical
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch {
      // stats may not be available for new users
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

  if (authLoading || (!user && !authLoading)) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="ambient-glow" />

      {/* ── Header with sign-out ── */}
      <header className="relative border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-5">
            <Link to="/" data-testid="dashboard-nav-logo">
              <VoxaLogo size={26} />
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-zinc-500 hidden sm:block">
              Dashboard
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link to="/profile">
              <Button
                variant="outline"
                className="rounded-full bg-transparent border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm transition-all"
              >
                <Settings className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                <span className="hidden sm:inline">Profile</span>
              </Button>
            </Link>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="h-8 sm:h-9 w-8 sm:w-9 rounded-full border border-white/10 bg-transparent hover:bg-red-500/10 hover:border-red-400/30 text-zinc-500 hover:text-red-300 flex items-center justify-center transition-all disabled:opacity-40"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
            <Link to="/setup">
              <Button className="rounded-full bg-white hover:bg-zinc-200 text-black h-8 sm:h-9 px-3 sm:px-5 text-xs sm:text-sm font-semibold transition-all">
                <span>New Interview</span>
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* ── Welcome ── */}
        <section className="mb-10 sm:mb-14">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tighter text-white" style={{ fontFamily: "var(--font-heading)" }}>
                  {hasData ? "Great to see you" : "Welcome"}
                  {profile?.display_name ? `, ${profile.display_name}` : ""}
                </h1>
                {hasData && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-[10px] font-mono tracking-wider text-cyan-300">
                    <Flame className="h-3 w-3" strokeWidth={1.5} />
                    {Math.min(stats.totalInterviews, 5)} streak
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-500 max-w-lg leading-relaxed">
                {hasData
                  ? "Track your progress, review past interviews, and keep sharpening your skills."
                  : "Complete your first mock interview to unlock stats, scores, and progress tracking."}
              </p>
            </div>
            {hasData && (
              <div className="flex items-center gap-4 text-xs text-zinc-500 shrink-0">
                <span className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Best score: <span className="text-white font-semibold">{stats.bestScore}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {stats.totalPracticeMinutes}m total
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ── Empty state ── */}
        {!hasData && !loading && (
          <section className="mb-12">
            <div className="relative rounded-2xl border border-white/[0.06] bg-[#0a0a0a] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/[0.02] to-transparent pointer-events-none" />
              <div className="relative flex flex-col items-center py-20 sm:py-24 text-center px-6">
                <div className="h-16 w-16 rounded-xl bg-gradient-to-b from-cyan-400/15 to-transparent border border-white/10 flex items-center justify-center mb-5">
                  <FileText className="h-8 w-8 text-cyan-300" strokeWidth={1} />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>
                  No interviews yet
                </h2>
                <p className="text-sm text-zinc-500 mt-2 max-w-sm leading-relaxed">
                  Your dashboard will light up once you complete your first mock interview.
                </p>
                <Link to="/setup" className="mt-6">
                  <Button className="rounded-full bg-white hover:bg-zinc-200 text-black px-7 h-11 text-sm font-semibold shadow-lg shadow-white/5 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]">
                    Start your first interview
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── Stats grid ── */}
        {hasData && (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8 sm:mb-10">
            {[
              { icon: Target, value: stats.totalInterviews, label: "Total Interviews" },
              { icon: TrendingUp, value: stats.averageScore, label: "Average Score", accent: "text-cyan-300" },
              { icon: Award, value: stats.bestScore, label: "Best Score", accent: "text-emerald-400" },
              { icon: Timer, value: `${stats.totalPracticeMinutes}m`, label: "Practice Time" },
            ].map(({ icon: Icon, value, label, accent }) => (
              <div
                key={label}
                className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4 sm:p-5 hover:border-white/15 transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-cyan-300" strokeWidth={1.5} />
                  </div>
                </div>
                <div className={`text-xl sm:text-2xl font-bold tracking-tight ${accent || "text-white"}`}>
                  {value}
                </div>
                <div className="mt-0.5 text-[10px] font-mono tracking-widest uppercase text-zinc-600">
                  {label}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ── Analytics: Score trends + Skill breakdown ── */}
        {hasData && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">
            {/* Score trends */}
            <div className="lg:col-span-2 rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-5 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
                    Score Trends
                  </h2>
                  <p className="text-[11px] text-zinc-600 mt-0.5">Last {stats.recentScores.length} interviews</p>
                </div>
              </div>
              {stats.recentScores.length > 0 ? (
                <div className="flex items-end gap-1.5 h-36 sm:h-44">
                  {stats.recentScores.map((score, i) => {
                    const h = Math.max(pct(score, 100), 8);
                    const isBest = score === Math.max(...stats.recentScores);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                        <span className={`text-[9px] font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity ${scoreColor(score)}`}>
                          {score}
                        </span>
                        <div
                          className={`w-full rounded-t-sm transition-all duration-500 ${
                            isBest
                              ? "bg-gradient-to-t from-emerald-400 to-emerald-300"
                              : score >= 75
                              ? "bg-emerald-400/60"
                              : score >= 45
                              ? "bg-yellow-400/60"
                              : "bg-red-400/60"
                          }`}
                          style={{ height: `${h}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-36 text-sm text-zinc-600">
                  No scores yet
                </div>
              )}
            </div>

            {/* Skill breakdown */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-white mb-5" style={{ fontFamily: "var(--font-heading)" }}>
                Skill Breakdown
              </h2>
              {stats.skillAverages && Object.keys(stats.skillAverages).length > 0 ? (
                <div className="space-y-4">
                  {[
                    { k: "technical", l: "Technical" },
                    { k: "communication", l: "Communication" },
                    { k: "problemSolving", l: "Problem Solving" },
                    { k: "confidence", l: "Confidence" },
                  ].map(({ k, l }) => {
                    const s = stats.skillAverages[k] || 0;
                    return (
                      <div key={k}>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-zinc-500">{l}</span>
                          <span className="text-white font-semibold">{s}</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-700"
                            style={{ width: `${pct(s, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-36 text-sm text-zinc-600 text-center">
                  <BrainCircuit className="h-8 w-8 text-zinc-700 mb-2" strokeWidth={1} />
                  Complete an interview to see skill scores
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Progress cards ── */}
        {hasData && (
          <section className="mb-8 sm:mb-10">
            <h2 className="text-sm font-semibold text-white mb-4" style={{ fontFamily: "var(--font-heading)" }}>
              Progress
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-400/10 flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-600">Improvement</span>
                </div>
                <div className="text-xl font-bold text-white">
                  {interviews.length >= 2
                    ? `${Math.max(0, interviews[0].overallScore - interviews[interviews.length - 1].overallScore)}pts`
                    : "—"}
                </div>
                <div className="text-[11px] text-zinc-600 mt-0.5">
                  {interviews.length >= 2 ? "First to latest interview" : "Need 2+ interviews"}
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-400/10 flex items-center justify-center">
                    <Award className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-600">Best Performance</span>
                </div>
                <div className="text-xl font-bold text-white truncate">
                  {bestInterview ? bestInterview.jobRole : "—"}
                </div>
                <div className="text-[11px] text-zinc-600 mt-0.5">
                  {bestInterview ? `Score: ${bestInterview.overallScore}` : "No interviews yet"}
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-cyan-400/10 flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5 text-cyan-400" strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-600">Next Step</span>
                </div>
                <div className="text-xl font-bold text-white">
                  {hasData ? "Keep going" : "Start now"}
                </div>
                <div className="text-[11px] text-zinc-600 mt-0.5">
                  {hasData ? "Consistency builds confidence" : "Take your first interview"}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Interview History ── */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
                Interview History
              </h2>
              <p className="text-[11px] text-zinc-600 mt-0.5">
                {interviews.length > 0
                  ? `${interviews.length} completed`
                  : "Review past interviews"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" strokeWidth={1.5} />
                <Input
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(PAGE_SIZE); }}
                  placeholder="Search..."
                  className="h-9 w-full sm:w-44 lg:w-56 rounded-lg bg-white/[0.03] border-white/10 text-sm text-white placeholder:text-zinc-600 pl-9 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-colors ${
                  showFilters || levelFilter !== "All Levels"
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
                  onClick={() => { setLevelFilter(l); setVisibleCount(PAGE_SIZE); }}
                  className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                    levelFilter === l
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
                {visibleInterviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4 sm:p-5 hover:border-white/15 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-9 w-9 rounded-lg bg-cyan-400/10 border border-white/5 flex items-center justify-center">
                        <Briefcase className="h-4 w-4 text-cyan-300" strokeWidth={1.5} />
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${scoreBg(interview.overallScore)} ${scoreColor(interview.overallScore)}`}>
                        {interview.overallScore}
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold text-white truncate">{interview.jobRole}</h3>
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
                onClick={() => { setSearchQuery(""); setLevelFilter("All Levels"); }}
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

        {/* ── Spacer for bottom breathing room ── */}
        <div className="h-12" />
      </main>
    </div>
  );
}
