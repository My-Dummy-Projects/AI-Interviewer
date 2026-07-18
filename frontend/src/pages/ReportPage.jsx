import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, Navigate } from "react-router-dom";
import { RotateCcw, ArrowLeft, CheckCircle2, TrendingUp, TrendingDown, GraduationCap, Loader2, MessageSquare } from "lucide-react";
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
import { SkeletonReport } from "@/components/LoadingScreen";
import { useInterviewQuery, useSubscriptionQuery } from "@/hooks/useApiQueries";
import { useCreateOrderMutation, useVerifyPaymentMutation } from "@/hooks/useApiMutations";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { toast } from "sonner";

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
  const location = useLocation();
  const { id } = useParams();
  const { report: ctxReport, setup: ctxSetup, reset } = useInterview();
  const [interviewData, setInterviewData] = useState(location.state?.interview || null);
  const [paying, setPaying] = useState(false);

  const isHistorical = Boolean(id);
  const { data: fetchedInterview, isLoading: interviewLoading } = useInterviewQuery(id, isHistorical && !interviewData);
  const { data: subscription } = useSubscriptionQuery(true);
  const createOrder = useCreateOrderMutation();
  const verifyPayment = useVerifyPaymentMutation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (fetchedInterview) {
      setInterviewData(fetchedInterview);
    }
  }, [fetchedInterview]);

  const loading = interviewLoading && !interviewData;

  const report = useMemo(() => (isHistorical ? interviewData?.report : ctxReport), [isHistorical, interviewData, ctxReport]);
  const setup = useMemo(() => (
    isHistorical
      ? interviewData
        ? {
          jobRole: interviewData.jobRole,
          experienceLevel: interviewData.experienceLevel,
          durationMinutes: interviewData.durationMinutes,
        }
        : null
      : ctxSetup
  ), [isHistorical, interviewData, ctxSetup]);

  if (!isHistorical && !ctxReport) return <Navigate to="/" replace />;
  if (isHistorical && loading) {
    return <SkeletonReport message="Loading report..." />;
  }
  if (isHistorical && !interviewData) {
    return (
      <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden">
        <div className="ambient-glow" />
        <Navbar left={<><Link to="/dashboard"><VoxaLogo size={26} /></Link></>} right={null} />
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <p className="text-lg font-semibold text-white">We couldn&apos;t load this report right now.</p>
          <p className="mt-2 text-sm text-zinc-500">Please try again from the dashboard or open it in a new tab.</p>
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="mt-6 rounded-full border-white/15 bg-transparent text-white hover:bg-white/5"
          >
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }
  if (!report) return <Navigate to="/" replace />;

  const rec = RECS[report.finalRecommendation] || RECS["Lean Hire"];
  const strengths = report.strengths || [];
  const improvements = report.improvements || [];
  const evaluations = report.questionEvaluations || [];
  const suggestions = report.learningSuggestions || [];

  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <div className="ambient-glow" />

      {/* Top bar */}
      <Navbar
        left={
          <>
            <Link to="/dashboard" data-testid="dashboard-nav-logo" className="shrink-0">
              <VoxaLogo size={22} />
            </Link>
            <div className="hidden md:block h-5 w-px bg-white" />
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

        {/* Transcript */}
        {isHistorical && interviewData?.transcript?.length > 0 && (
          <section>
            <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden">
              <Accordion type="single" collapsible>
                <AccordionItem value="transcript" className="border-b-0">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-zinc-400" />
                      <div className="label-overline">Interview Transcript</div>
                      <div className="font-mono text-xs text-zinc-600 ml-2">
                        {interviewData.transcript.length} lines
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4">
                    <div className="divide-y divide-white/5 max-h-96 overflow-y-auto rounded-xl border border-white/5">
                      {interviewData.transcript.map((turn, i) => (
                        <div key={i} className={`px-4 py-3 ${turn.role === "assistant" ? "bg-cyan-400/[0.03]" : ""}`}>
                          <div className="flex items-start gap-3">
                            <span className={`font-mono text-[11px] uppercase tracking-widest shrink-0 mt-0.5 ${turn.role === "assistant" ? "text-cyan-300" : "text-zinc-400"}`}>
                              {turn.role === "assistant" ? "Aria" : "You"}
                            </span>
                            <p className="text-sm text-zinc-200 leading-relaxed">{turn.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>
        )}

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
            <ScoreCell label="Technical" value={report.skills?.technical ?? 0} />
            <ScoreCell label="Communication" value={report.skills?.communication ?? 0} />
            <ScoreCell label="Problem-Solving" value={report.skills?.problemSolving ?? 0} />
            <ScoreCell label="Confidence" value={report.skills?.confidence ?? 0} />
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
              {strengths.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-zinc-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300 mt-0.5 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
              {strengths.length === 0 && (
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
              {improvements.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-zinc-200">
                  <span className="font-mono text-xs text-amber-300 mt-0.5">▸</span>
                  <span>{s}</span>
                </li>
              ))}
              {improvements.length === 0 && (
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
              {evaluations.map((q, i) => (
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
              {evaluations.length === 0 && (
                <div className="p-6 text-sm text-zinc-500">
                  No question-level evaluations generated.
                </div>
              )}
            </Accordion>
          </div>
        </section>

        {/* Learning suggestions — paid only */}
        {subscription && subscription.hasLearningPlan ? (
          <section className="rounded-2xl border border-cyan-400/30 bg-gradient-to-b from-cyan-400/[0.05] to-transparent p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="h-4 w-4 text-cyan-300" />
              <div className="label-overline text-cyan-300">Personalized Learning Plan</div>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestions.map((s, i) => (
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
              {suggestions.length === 0 && (
                <li className="text-sm text-zinc-500">No learning suggestions generated.</li>
              )}
            </ul>
          </section>
        ) : !subscription ? null : (
          <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="h-4 w-4 text-zinc-500" />
              <div className="label-overline text-zinc-500">Personalized Learning Plan</div>
            </div>
            <p className="text-sm text-zinc-500">
              Upgrade to a paid plan to unlock your personalized learning plan with actionable
              next steps, topic recommendations, and practice drills tailored to your performance.
            </p>
            <Button
              disabled={paying}
              onClick={async () => {
                if (paying) return;
                setPaying(true);
                try {
                  const { orderId, amount, currency, keyId, userEmail, userName } = await createOrder.mutateAsync("starter");
                  openRazorpayCheckout({
                    keyId, orderId, amount, currency,
                    name: "Voxa",
                    description: "Starter Plan - ₹299/month",
                    prefill: { name: userName, email: userEmail },
                    onSuccess: async (response) => {
                      try {
                        await verifyPayment.mutateAsync({
                          razorpay_order_id: response.razorpay_order_id,
                          razorpay_payment_id: response.razorpay_payment_id,
                          razorpay_signature: response.razorpay_signature,
                        });
                        toast.success("Subscribed! Learning plan unlocked.");
                        window.location.reload();
                      } catch { toast.error("Verification failed — payment may be captured. Contact support."); }
                    },
                    onError: (msg) => { if (msg !== "Payment cancelled") toast.error(msg); },
                  });
                } catch { toast.error("Failed to start payment."); }
                finally { setPaying(false); }
              }}
              className="mt-4 h-10 rounded-full bg-white hover:bg-zinc-200 text-black px-5 text-sm font-semibold"
            >
              View plans
            </Button>
          </section>
        )}

        <div className="flex items-center justify-between pt-4 pb-10">
          <Button
            variant="outline"
            onClick={() => {

              navigate("/dashboard");
            }
            }
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
    </div>
  );
}
