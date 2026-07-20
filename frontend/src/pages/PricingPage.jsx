import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Loader2, ArrowRight, CreditCard, Shield, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { VoxaLogo } from "@/components/VoxaLogo";
import { useAuth } from "@/context/AuthContext";
import { useProfileQuery, useSubscriptionQuery } from "@/hooks/useApiQueries";
import { useCreateOrderMutation, useVerifyPaymentMutation } from "@/hooks/useApiMutations";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { toast } from "sonner";

const PLAN_RANK = { free: 0, starter: 1, pro: 2 };

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "",
    desc: "Perfect for trying out Voxa.",
    features: [
      "2 interviews total (lifetime)",
      "Up to 15 minutes per interview",
      "Basic feedback only",
    ],
    note: "No analytics, no progress tracking.",
  },
  {
    id: "starter",
    name: "Starter",
    price: "₹299",
    period: "/ month",
    desc: "For candidates practicing regularly.",
    features: [
      "10 interviews per month",
      "Up to 15 minutes per interview",
      "Interview analytics and feedback",
      "Personalized Learning Plan included",
      "Resets every billing cycle",
    ],
    note: "Best for active job seekers & students.",
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹499",
    period: "/ month",
    desc: "For serious job seekers preparing consistently.",
    features: [
      "20 interviews per month",
      "Up to 30 minutes per interview",
      "Includes Personalized Learning Plan",
      "Priority access to new features",
      "Resets every billing cycle",
    ],
    note: "Best for power users & professionals.",
    highlight: true,
  },
];

const COMPARISON_ROWS = [
  { label: "Interviews per month", free: "2 (lifetime)", starter: "10", pro: "20", highlight: true },
  { label: "Max duration per interview", free: "15 min", starter: "15 min", pro: "30 min", highlight: true },
  { label: "Detailed analytics", free: "\u2014", starter: "\u2713", pro: "\u2713" },
  { label: "Personalized Learning Plan", free: "\u2014", starter: "\u2713", pro: "\u2713" },
  { label: "Progress tracking", free: "\u2014", starter: "\u2713", pro: "\u2713" },
  { label: "Monthly reset", free: "\u2014", starter: "\u2713", pro: "\u2713" },
  { label: "Priority access to features", free: "\u2014", starter: "\u2014", pro: "\u2713" },
];

function PricingCard({ tier, user, currentPlan, loadingId, onSubscribe }) {
  const isHighlight = tier.highlight;
  const isFree = tier.id === "free";
  const isLoading = loadingId === tier.id;

  const isCurrentPlan = currentPlan === tier.id;
  const userPlanRank = currentPlan ? PLAN_RANK[currentPlan] : -1;
  const tierRank = PLAN_RANK[tier.id];
  const isDowngradeOrSame = tierRank <= userPlanRank;

  const isDisabled = !user || isCurrentPlan || (isDowngradeOrSame && !isCurrentPlan);

  let buttonContent = null;

  if (!user) {
    if (isFree) {
      buttonContent = (
        <Link to="/signin" className="block">
          <Button className="w-full rounded-full h-11 font-semibold bg-white hover:bg-zinc-200 text-black">
            Get Started Free
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </Link>
      );
    } else {
      buttonContent = (
        <Button onClick={() => onSubscribe(tier)} className="w-full rounded-full h-11 font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10">
          Subscribe Now
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      );
    }
  } else if (isCurrentPlan) {
    buttonContent = (
      <Button disabled className="w-full rounded-full h-11 font-semibold bg-zinc-800 text-zinc-400 cursor-not-allowed border border-white/5">
        <Shield className="mr-1.5 h-4 w-4" />
        Current Plan
      </Button>
    );
  } else if (isFree) {
    buttonContent = (
      <Button disabled className="w-full rounded-full h-11 font-semibold bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5">
        Free Plan
      </Button>
    );
  } else if (isDowngradeOrSame) {
    buttonContent = (
      <Button disabled className="w-full rounded-full h-11 font-semibold bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5">
        {tier.name} Plan
      </Button>
    );
  } else {
    const isUpgrade = tierRank > userPlanRank;
    buttonContent = (
      <Button
        onClick={() => onSubscribe(tier)}
        disabled={isLoading}
        className="w-full rounded-full h-11 font-semibold bg-white hover:bg-zinc-200 text-black"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Please wait...
          </>
        ) : (
          <>
            {isUpgrade ? `Upgrade to ${tier.name}` : `Subscribe to ${tier.name}`}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </>
        )}
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: PLANS.indexOf(tier) * 0.1 }}
      className={`relative rounded-2xl border p-6 flex flex-col transition-all duration-300 ${
        isCurrentPlan
          ? "border-cyan-400/60 bg-gradient-to-b from-cyan-400/[0.08] to-transparent shadow-[0_0_30px_-5px_rgba(0,255,234,0.15)]"
          : isHighlight && !isCurrentPlan
          ? "border-cyan-400/40 bg-gradient-to-b from-cyan-400/[0.06] to-transparent"
          : "border-white/10 bg-[#0a0a0a]"
      } ${isDisabled && !isCurrentPlan ? "opacity-60" : ""}`}
    >
      {isCurrentPlan && (
        <div className="absolute -top-3 left-6 font-mono text-[10px] tracking-widest uppercase bg-cyan-400 text-black px-2 py-1 rounded">
          Current Plan
        </div>
      )}
      {isHighlight && !isCurrentPlan && (
        <div className="absolute -top-3 left-6 font-mono text-[10px] tracking-widest uppercase bg-cyan-300 text-black px-2 py-1 rounded">
          Recommended
        </div>
      )}
      <div className="flex items-center justify-between">
        <h3
          className="text-2xl font-bold text-white"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {tier.name}
        </h3>
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span
          className="text-4xl font-black tracking-tighter text-white"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {tier.price}
        </span>
        <span className="text-sm text-zinc-500">{tier.period}</span>
      </div>
      <p className="mt-2 text-sm text-zinc-400">{tier.desc}</p>
      <ul className="mt-5 space-y-2.5 flex-1">
        {tier.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
            <Check className="h-4 w-4 text-cyan-300 mt-0.5 shrink-0" strokeWidth={2} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {tier.note && (
        <p className="mt-4 text-xs text-zinc-500 leading-relaxed">{tier.note}</p>
      )}
      <div className="mt-6">{buttonContent}</div>
    </motion.div>
  );
}

export default function PricingPage() {
  const { user, signout } = useAuth();
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState(null);
  const createOrder = useCreateOrderMutation();
  const verifyPayment = useVerifyPaymentMutation();
  const { data: profile } = useProfileQuery(!!user);
  const { data: subscription } = useSubscriptionQuery(!!user);
  const currentPlan = subscription?.plan || null;
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signout();
      navigate("/");
    } catch {
      setSigningOut(false);
    }
  };

  const handleSubscribe = async (tier) => {
    if (!user) {
      navigate("/signin");
      return;
    }
    setLoadingId(tier.id);
    try {
      const { orderId, amount, currency, keyId, userEmail, userName } = await createOrder.mutateAsync(tier.id);
      openRazorpayCheckout({
        keyId, orderId, amount, currency,
        name: "Voxa",
        description: `${tier.name} Plan - ${tier.price}/month`,
        prefill: { name: userName, email: userEmail },
        onSuccess: async (response) => {
          try {
            await verifyPayment.mutateAsync({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success(`Subscribed to ${tier.name} plan!`);
            navigate("/dashboard");
          } catch {
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        onError: (msg) => {
          if (msg !== "Payment cancelled") toast.error(msg);
        },
      });
    } catch {
      toast.error("Failed to initiate payment. Please try again.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar
        left={
          <>
            <Link to="/dashboard" className="shrink-0">
              <VoxaLogo size={22} />
            </Link>
            <div className="hidden md:block h-5 w-px bg-white" />
            <div className="hidden md:block label-overline">Pricing</div>
          </>
        }
        right={
          user ? (
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
                onClick={handleSignOut}
                disabled={signingOut}
                aria-label="Sign out"
                className="h-10 w-10 rounded-full border border-white/10 hover:bg-red-500/10 hover:border-red-400/30 flex items-center justify-center transition-all disabled:opacity-40"
              >
                <LogOut className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </>
          ) : (
            <>
              <Link to="/signin">
                <Button variant="outline" className="rounded-full h-9 text-xs font-semibold">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="rounded-full h-9 text-xs font-semibold bg-white text-black hover:bg-zinc-200">
                  Get Started
                </Button>
              </Link>
            </>
          )
        }
      />

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 z-10">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-14"
        >
          <div className="text-center">
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-xs text-zinc-400 font-mono uppercase tracking-widest mb-6"
            >
              <CreditCard className="h-3 w-3" />
              Pricing
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-4xl md:text-5xl font-black tracking-tight text-white"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Simple, transparent pricing.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto"
            >
              Start for free. Upgrade when you need more interviews, deeper analytics, and personalized learning plans.
            </motion.p>
          </div>
        </motion.section>

        <section className="mb-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((tier) => (
              <PricingCard
                key={tier.id}
                tier={tier}
                user={user}
                currentPlan={currentPlan}
                loadingId={loadingId}
                onSubscribe={handleSubscribe}
              />
            ))}
          </div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 md:p-8 mb-14"
        >
          <h2 className="text-xl md:text-2xl font-bold text-white mb-8 text-center" style={{ fontFamily: "var(--font-heading)" }}>
            Compare plans side by side
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-zinc-400 font-medium w-1/3">Feature</th>
                  <th className="text-center py-3 px-4 text-white font-semibold">Free</th>
                  <th className="text-center py-3 px-4 text-white font-semibold">Starter</th>
                  <th className="text-center py-3 px-4 text-cyan-300 font-semibold">Pro</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0">
                    <td className={`py-3 px-4 ${row.highlight ? "text-white font-medium" : "text-zinc-300"}`}>
                      {row.label}
                    </td>
                    <td className="text-center py-3 px-4 text-zinc-500">{row.free}</td>
                    <td className="text-center py-3 px-4 text-zinc-300">{row.starter}</td>
                    <td className="text-center py-3 px-4 text-zinc-300">{row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        <section className="text-center">
          <p className="text-zinc-500 text-sm">
            All paid plans are billed monthly. Cancel anytime. Questions?{" "}
            <Link to="/feedback" className="text-cyan-300 hover:underline">
              Contact us
            </Link>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
