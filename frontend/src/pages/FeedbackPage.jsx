import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Navbar } from "@/components/Navbar";
import { VoxaLogo } from "@/components/VoxaLogo";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { LoadingScreen } from "@/components/LoadingScreen";
import { toast } from "sonner";

const FEEDBACK_CATEGORIES = [
    { value: "bug", label: "Bug / issue" },
    { value: "ux", label: "UX / design" },
    { value: "feature", label: "Feature request" },
    { value: "performance", label: "Performance" },
    { value: "content", label: "Content / copy" },
    { value: "other", label: "Other" },
];

export default function FeedbackPage() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [feedback, setFeedback] = useState("");
    const [rating, setRating] = useState(5);
    const [category, setCategory] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/signin", { replace: true });
        }
    }, [authLoading, user, navigate]);

    const handleSubmit = async () => {
        if (!feedback.trim()) {
            toast.error("Please enter your feedback before submitting.");
            return;
        }

        setSubmitting(true);
        try {
            await api.submitToolFeedback({
                feedback: feedback.trim(),
                rating,
                category: category || "",
            });
            toast.success("Thanks for your feedback!");
            navigate("/dashboard");
        } catch (e) {
            toast.error("Unable to submit feedback. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading || (!user && !authLoading)) {
        return <LoadingScreen message="Loading feedback page..." />;
    }

    return (
        <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden">
            <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
            <div className="ambient-glow" />

            <Navbar
                left={
                    <>
                        <Link to={user ? "/dashboard" : "/"} data-testid="feedback-nav-logo">
                            <VoxaLogo size={28} />
                        </Link>
                        <div className="hidden md:block h-5 w-px bg-white/10" />
                        <div className="hidden md:block label-overline">Feedback</div>
                    </>
                }
                right={
                    <Link to="/dashboard">
                        <Button variant="outline" className="rounded-full bg-transparent border-white/15 hover:bg-white/5 text-white h-9 px-4 text-sm">
                            Back to dashboard
                        </Button>
                    </Link>
                }
            />

            <main className="relative max-w-4xl mx-auto px-6 py-10 md:py-14 z-10">
                <div className="rounded-3xl border border-white/[0.08] bg-[#0a0a0a] p-6 sm:p-8 lg:p-10">
                    <div className="flex items-start gap-4 mb-8">
                        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-cyan-400/10 text-cyan-300">
                            <MessageSquare className="h-6 w-6" strokeWidth={1.5} />
                        </div>
                        <div>
                            <p className="text-sm font-medium uppercase tracking-[0.25em] text-cyan-300/80">Product feedback</p>
                            <h1 className="mt-3 text-3xl font-black text-white" style={{ fontFamily: "var(--font-heading)" }}>
                                Help us make the tool better
                            </h1>
                            <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                                Tell us what you liked, what was confusing, and what features would make your interview practice more valuable.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <Label htmlFor="feedback" className="label-overline mb-2 block text-zinc-400">
                                Your feedback
                            </Label>
                            <textarea
                                id="feedback"
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                rows={8}
                                className="w-full rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/40 placeholder:text-zinc-600"
                                placeholder="Share your experience with the app..."
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label htmlFor="rating" className="label-overline mb-2 block text-zinc-400">
                                    Rating (optional)
                                </Label>
                                <Select value={String(rating)} onValueChange={(value) => setRating(Number(value))}>
                                    <SelectTrigger
                                        id="rating"
                                        className="h-12 w-full rounded-lg border-white/10 bg-white/[0.03] text-base text-white focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/40"
                                    >
                                        <SelectValue placeholder="Choose rating" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg border-white/10 bg-[#0f0f0f] text-white">
                                        {[5, 4, 3, 2, 1].map((value) => (
                                            <SelectItem key={value} value={String(value)} className="rounded focus:bg-white/5 focus:text-white">
                                                {value} star{value > 1 ? "s" : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="category" className="label-overline mb-2 block text-zinc-400">
                                    Feedback category (optional)
                                </Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger
                                        id="category"
                                        className="h-12 w-full rounded-lg border-white/10 bg-white/[0.03] text-base text-white focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/40"
                                    >
                                        <SelectValue placeholder="Choose category" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg border-white/10 bg-[#0f0f0f] text-white">
                                        {FEEDBACK_CATEGORIES.map((item) => (
                                            <SelectItem key={item.value} value={item.value} className="rounded focus:bg-white/5 focus:text-white">
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm text-zinc-500">
                                We store every feedback entry in the database so our team can review it. Thanks for helping improve the product.
                            </div>
                            <Button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="h-12 rounded-full bg-cyan-400 hover:bg-cyan-300 text-black px-6 text-sm font-semibold"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending feedback...
                                    </>
                                ) : (
                                    "Submit feedback"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
