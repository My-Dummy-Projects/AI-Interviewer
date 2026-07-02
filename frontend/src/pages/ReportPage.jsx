import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw, ArrowLeft, CheckCircle2, TrendingUp, TrendingDown, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useInterview } from "@/context/InterviewContext";

const RECS = {
  "Strong Hire": { color: "bg-green-600 text-white", border: "border-green-700" },
  "Hire": { color: "bg-green-500 text-white", border: "border-green-600" },
  "Lean Hire": { color: "bg-amber-500 text-white", border: "border-amber-600" },
  "No Hire": { color: "bg-red-600 text-white", border: "border-red-700" },
};

function scoreTone(score) {
  if (score >= 80) return "text-green-700";
  if (score >= 60) return "text-zinc-950";
  if (score >= 40) return "text-amber-700";
  return "text-red-700";
}

function ScoreCell({ label, value }) {
  return (
    <div className="border border-zinc-200 p-5 bg-white h-full">
      <div className="label-overline">{label}</div>
      <div className="mt-3 flex items-baseline gap-2">
        <div
          className={`text-4xl font-extrabold tracking-tighter ${scoreTone(value)}`}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {value}
        </div>
        <div className="font-mono text-xs text-zinc-500">/ 100</div>
      </div>
      <div className="mt-3 h-2 w-full bg-zinc-100">
        <div
          className="h-2 bg-zinc-950 transition-all"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export default function ReportPage() {
  const navigate = useNavigate();
  const { report, setup, reset } = useInterview();

  useEffect(() => {
    if (!report) navigate("/", { replace: true });
  }, [report, navigate]);

  if (!report) return null;

  const rec = RECS[report.finalRecommendation] || RECS["Lean Hire"];

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="label-overline">03 / Feedback Report</div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                reset();
                navigate("/");
              }}
              className="rounded-none h-10 border-zinc-300"
              data-testid="report-restart-button"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              NEW INTERVIEW
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* Meta */}
        <section>
          <div className="label-overline">Session</div>
          <h1
            className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tighter text-zinc-950"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {setup?.jobRole || "Interview"}
            <span className="text-zinc-400"> · {setup?.experienceLevel}</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-500 font-mono">
            Target duration: {setup?.durationMinutes || "-"} min
          </p>
        </section>

        {/* Overall + Recommendation */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 border border-zinc-900 p-8 bg-white">
            <div className="label-overline">Overall Score</div>
            <div className="mt-4 flex items-end gap-3">
              <div
                data-testid="report-overall-score"
                className={`text-7xl md:text-8xl font-extrabold tracking-tighter leading-none ${scoreTone(
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
                className={`inline-block px-4 py-2 font-mono text-xs uppercase tracking-widest border-2 ${rec.color} ${rec.border}`}
              >
                {report.finalRecommendation}
              </div>
            </div>
            <p className="mt-6 text-sm text-zinc-700 leading-relaxed">
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
          <div className="border border-zinc-200 bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-green-700" />
              <div className="label-overline text-green-800">Strengths</div>
            </div>
            <ul className="space-y-3">
              {(report.strengths || []).map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-zinc-800">
                  <CheckCircle2 className="h-4 w-4 text-green-700 mt-0.5 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
              {(report.strengths || []).length === 0 && (
                <li className="text-sm text-zinc-500">No strengths identified.</li>
              )}
            </ul>
          </div>
          <div className="border border-zinc-200 bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="h-4 w-4 text-amber-700" />
              <div className="label-overline text-amber-800">Areas for Improvement</div>
            </div>
            <ul className="space-y-3">
              {(report.improvements || []).map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-zinc-800">
                  <span className="font-mono text-xs text-amber-700 mt-0.5">▸</span>
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
          <div className="border border-zinc-200">
            <Accordion type="multiple" className="w-full">
              {(report.questionEvaluations || []).map((q, i) => (
                <AccordionItem
                  key={i}
                  value={`q-${i}`}
                  className="border-b border-zinc-200 last:border-b-0"
                >
                  <AccordionTrigger className="px-6 py-4 hover:bg-zinc-50 rounded-none text-left">
                    <div className="flex items-center gap-4 w-full">
                      <div className="font-mono text-xs text-zinc-500 w-8 shrink-0">
                        Q{String(i + 1).padStart(2, "0")}
                      </div>
                      <div className="flex-1 text-sm text-zinc-900 font-medium pr-4">
                        {q.question}
                      </div>
                      <div
                        className={`font-mono text-sm font-bold shrink-0 ${scoreTone(q.score)}`}
                      >
                        {q.score}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5 bg-zinc-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="label-overline mb-2">Your Answer</div>
                        <p className="text-sm text-zinc-700 leading-relaxed">
                          {q.answerSummary}
                        </p>
                      </div>
                      <div>
                        <div className="label-overline mb-2">Evaluator Notes</div>
                        <p className="text-sm text-zinc-700 leading-relaxed">
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
        <section className="border border-zinc-900 p-6 md:p-8 bg-zinc-50">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="h-4 w-4" />
            <div className="label-overline">Personalized Learning Plan</div>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(report.learningSuggestions || []).map((s, i) => (
              <li
                key={i}
                className="flex gap-3 text-sm text-zinc-800 border-l-2 border-zinc-900 pl-3"
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
              reset();
              navigate("/");
            }}
            className="rounded-none h-11 border-zinc-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            BACK
          </Button>
          <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">
            End of report
          </div>
        </div>
      </main>
    </div>
  );
}

// suppress unused import warning for Progress if not used
