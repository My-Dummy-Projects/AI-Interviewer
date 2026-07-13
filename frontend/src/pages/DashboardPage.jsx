import React, { useEffect, useState, useCallback } from "react";
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
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoxaLogo } from "@/components/VoxaLogo";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { LoadingScreen } from "@/components/LoadingScreen";
import { toast } from "sonner";

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

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState([]);
  const [interviewsLoading, setInterviewsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/signin", { replace: true });
      return;
    }
    if (user) {
      loadProfile();
      loadInterviews();
    }
  }, [user, authLoading]);

  const loadProfile = async () => {
    try {
      const data = await api.getProfile();
      setProfile(data);
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
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
    try {
      await signout();
      toast.success("Signed out");
      navigate("/");
    } catch {
      // ignore
    }
  };

  const avgScore = interviews.length
    ? Math.round(interviews.reduce((s, i) => s + i.overallScore, 0) / interviews.length)
    : 0;
  const bestScore = interviews.length ? Math.max(...interviews.map((i) => i.overallScore)) : 0;

  if (authLoading || (!user && !authLoading)) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="ambient-glow" />

      <header className="relative border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" data-testid="dashboard-nav-logo">
              <VoxaLogo size={28} />
            </Link>
            <div className="hidden md:block h-5 w-px bg-white/10" />
            <div className="hidden md:block label-overline">Dashboard</div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/profile">
              <Button variant="outline" className="rounded-full bg-transparent border-white/15 hover:bg-white/5 text-white h-9 px-4 text-sm">
                <Settings className="h-3.5 w-3.5 mr-1.5" />
                Profile
              </Button>
            </Link>
            <Link to="/setup">
              <Button className="rounded-full bg-white hover:bg-zinc-200 text-black h-9 px-4 text-sm font-semibold">
                New Interview
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-6 py-8 md:py-10">
        {/* Welcome + stats row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white" style={{ fontFamily: "var(--font-heading)" }}>
              Welcome back, {profile?.display_name || "User"}
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Here&apos;s your interview activity overview.</p>
          </div>
        </div>

        {interviews.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-5">
              <div className="label-overline">Total Interviews</div>
              <div className="mt-2 text-3xl font-bold text-white">{interviews.length}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-5">
              <div className="label-overline">Average Score</div>
              <div className="mt-2 text-3xl font-bold text-cyan-300">
                {interviews.length > 0 ? avgScore : "—"}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-5">
              <div className="label-overline">Best Score</div>
              <div className="mt-2 text-3xl font-bold text-emerald-400">
                {interviews.length > 0 ? bestScore : "—"}
              </div>
            </div>
          </div>
        )}

        {/* Interview history */}
        <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
              Interview History
            </h2>
            {interviews.length > 0 && (
              <span className="text-xs text-zinc-500 font-mono">{interviews.length} {interviews.length === 1 ? "entry" : "entries"}</span>
            )}
          </div>

          {interviewsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : interviews.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <FileText className="h-12 w-12 text-zinc-600 mb-4" strokeWidth={1} />
              <h3 className="text-lg font-semibold text-zinc-300">No interviews yet</h3>
              <p className="text-sm text-zinc-500 mt-2 max-w-xs">
                Complete your first interview to see your history here.
              </p>
              <Link to="/setup">
                <Button className="mt-6 rounded-full bg-white hover:bg-zinc-200 text-black px-6 text-sm font-semibold">
                  Start your first interview
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {interviews.map((interview) => (
                <div
                  key={interview.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-cyan-400/10 flex items-center justify-center shrink-0">
                      <Briefcase className="h-5 w-5 text-cyan-300" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate">{interview.jobRole}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          {interview.experienceLevel}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {interview.durationMinutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {fmtDate(interview.completedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-zinc-500">Score</div>
                      <div
                        className={`text-lg font-bold ${
                          interview.overallScore >= 70
                            ? "text-emerald-400"
                            : interview.overallScore >= 40
                            ? "text-yellow-400"
                            : "text-red-400"
                        }`}
                      >
                        {interview.overallScore}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom sign out */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-red-300 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </main>
    </div>
  );
}
