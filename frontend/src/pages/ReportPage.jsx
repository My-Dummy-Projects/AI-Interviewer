import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams, Navigate } from "react-router-dom";
import { RotateCcw, ArrowLeft, CheckCircle2, TrendingUp, TrendingDown, GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useInterview } from "@/context/InterviewContext";
import { Navbar } from "@/components/Navbar";
import { VoxaLogo } from "@/components/VoxaLogo";
import api from "@/lib/api";

const RECS = {
  "Strong Hire": { color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  "Hire": { color: "bg-cyan-400/20 text-cyan-300 border-cyan-400/40" },
  "Lean Hire": { color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  "No Hire": { color: "bg-red-500/20 text-red-300 border-red-500/40" },
};

function scoreTone(score) {
  if (score >= 80) return "text-emerald-300";
  if (score >= 60) return "text-white";
  if (score >= 40) return "text-amber-300";
  return "text-red-300";
}

function ScoreCell({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-5 h-full">
      <div className="label-overline">{label}</div>
      <div className="mt-3 flex items-baseline gap-2">
        <div
          className={`text-4xl font-black tracking-tighter ${scoreTone(value)}`}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {value}
        </div>
        <div className="font-mono text-xs text-zinc-500">/ 100</div>
      </div>
      <div className="mt-3 h-2 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-2 bg-white rounded-full transition-all"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export default function ReportPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { report: ctxReport, setup: ctxSetup, reset } = useInterview();
  const [loading, setLoading] = useState(false);
  const [interviewData, setInterviewData] = useState(null);

  const isHistorical = Boolean(id);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    api.getInterview(id).then((data) => {
      if (!cancelled) {
        setInterviewData(data);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [id]);

  const report = isHistorical ? interviewData?.report : ctxReport;
  const setup = isHistorical
    ? interviewData ? { jobRole: interviewData.jobRole, experienceLevel: interviewData.experienceLevel, durationMinutes: interviewData.durationMinutes } : null
    : ctxSetup;

  if (!isHistorical && !ctxReport) return <Navigate to="/" replace />;
  if (isHistorical && !loading && !interviewData) return <Navigate to="/dashboard" replace />;
  if (!report) return <Navigate to="/" replace />;

  const rec = RECS[report.finalRecommendation] || RECS["Lean Hire"];

  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <div className="ambient-glow" />

      {/* Top bar */}
      <Navbar
        left={
          <>
            <Link to="/">
              <VoxaLogo size={26} />
            </Link>
            <div className="hidden md:block h-5 w-px bg-white/10" />
            <div className="hidden md:block label-overline">{isHistorical ? "Past Report" : "03 / Feedback Report"}</div>
          </>
        }
        right={
          <Button
            variant="outline"
            onClick={() => {
              reset();
              navigate("/setup");
            }}
            className="rounded-full h-10 bg-transparent border-white/15 hover:bg-white/5 text-white"
            data-testid="report-restart-button"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            NEW INTERVIEW
          </Button>
        }
      />

      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      )}

      {!loading && (
      <main className="relative max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* Meta */}
        <section>
          <div className="label-overline">Session</div>
          <h1
            className="mt-2 text-3xl md:text-4xl font-black tracking-tighter text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {setup?.jobRole || "Interview"}
            <span className="text-zinc-500"> · {setup?.experienceLevel}</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-500 font-mono">
            Target duration: {setup?.durationMinutes || "-"} min
          </p>
        </section>

        {/* Overall + Recommendation */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent p-8">
            <div className="label-overline">Overall Score</div>
            <div className="mt-4 flex items-end gap-3">
              <div
                data-testid="report-overall-score"
                className={`text-7xl md:text-8xl font-black tracking-tighter leading-none ${scoreTone(
                  report.overallScore
                )}`}
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {report.overallScore}
              </div>
              <div className="font-mono text-sm text-zinc-500 mb-2">/ 100</div>
            </div>
            <div className="mt-6">
              <div className="label-overline mb-2">Final Recommendation</div>
              <div
                className={`inline-block px-4 py-2 font-mono text-xs uppercase tracking-widest border rounded-full ${rec.color}`}
              >
                {report.finalRecommendation}
              </div>
            </div>
            <p className="mt-6 text-sm text-zinc-300 leading-relaxed">
              {report.summary}
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-4 gap-4">
            <ScoreCell label="Technical" value={report.skills.technical} />
            <ScoreCell label="Communication" value={report.skills.communication} />
            <ScoreCell label="Problem-Solving" value={report.skills.problemSolving} />
            <ScoreCell label="Confidence" value={report.skills.confidence} />
          </div>
        </section>

        {/* Strengths / Improvements */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-emerald-300" />
              <div className="label-overline text-emerald-300">Strengths</div>
            </div>
            <ul className="space-y-3">
              {(report.strengths || []).map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-zinc-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300 mt-0.5 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
              {(report.strengths || []).length === 0 && (
                <li className="text-sm text-zinc-500">No strengths identified.</li>
              )}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="h-4 w-4 text-amber-300" />
              <div className="label-overline text-amber-300">Areas for Improvement</div>
            </div>
            <ul className="space-y-3">
              {(report.improvements || []).map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-zinc-200">
                  <span className="font-mono text-xs text-amber-300 mt-0.5">▸</span>
                  <span>{s}</span>
                </li>
              ))}
              {(report.improvements || []).length === 0 && (
                <li className="text-sm text-zinc-500">No improvements identified.</li>
              )}
            </ul>
          </div>
        </section>

        {/* Q by Q */}
        <section>
          <div className="label-overline mb-4">Question-by-Question Evaluation</div>
          <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden">
            <Accordion type="multiple" className="w-full">
              {(report.questionEvaluations || []).map((q, i) => (
                <AccordionItem
                  key={i}
                  value={`q-${i}`}
                  className="border-b border-white/5 last:border-b-0"
                >
                  <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/[0.02] text-left">
                    <div className="flex items-center gap-4 w-full">
                      <div className="font-mono text-xs text-zinc-500 w-8 shrink-0">
                        Q{String(i + 1).padStart(2, "0")}
                      </div>
                      <div className="flex-1 text-sm text-white font-medium pr-4">
                        {q.question}
                      </div>
                      <div className={`font-mono text-sm font-bold shrink-0 ${scoreTone(q.score)}`}>
                        {q.score}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5 bg-white/[0.02]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="label-overline mb-2">Your Answer</div>
                        <p className="text-sm text-zinc-300 leading-relaxed">
                          {q.answerSummary}
                        </p>
                      </div>
                      <div>
                        <div className="label-overline mb-2">Evaluator Notes</div>
                        <p className="text-sm text-zinc-300 leading-relaxed">
                          {q.feedback}
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
              {(report.questionEvaluations || []).length === 0 && (
                <div className="p-6 text-sm text-zinc-500">
                  No question-level evaluations generated.
                </div>
              )}
            </Accordion>
          </div>
        </section>

        {/* Learning suggestions */}
        <section className="rounded-2xl border border-cyan-400/30 bg-gradient-to-b from-cyan-400/[0.05] to-transparent p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="h-4 w-4 text-cyan-300" />
            <div className="label-overline text-cyan-300">Personalized Learning Plan</div>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(report.learningSuggestions || []).map((s, i) => (
              <li
                key={i}
                className="flex gap-3 text-sm text-zinc-200 border-l-2 border-cyan-400/40 pl-3"
              >
                <span className="font-mono text-xs text-zinc-500 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{s}</span>
              </li>
            ))}
            {(report.learningSuggestions || []).length === 0 && (
              <li className="text-sm text-zinc-500">No learning suggestions generated.</li>
            )}
          </ul>
        </section>

        <div className="flex items-center justify-between pt-4 pb-10">
          <Button
            variant="outline"
            onClick={() => {
              if (isHistorical) {
                navigate("/dashboard");
              } else {
                reset();
                navigate("/");
              }
            }}
            className="rounded-full h-11 bg-transparent border-white/15 hover:bg-white/5 text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {isHistorical ? "BACK TO DASHBOARD" : "BACK TO HOME"}
          </Button>
          <div className="text-xs font-mono uppercase tracking-widest text-zinc-600">
            End of report
          </div>
        </div>
      </main>
      )}
    </div>
  );
}
