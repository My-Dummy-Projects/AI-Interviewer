import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowRight,
  Mic,
  BrainCircuit,
  MessageSquareText,
  BarChart3,
  Sparkles,
  Timer,
  ShieldCheck,
  Github,
  Chrome,
  Figma,
  Slack,
  Trello,
  Codepen,
  Settings,
  FileText,
  Check,
  X,
  Star,
  Zap,
  Users,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { VoxaLogo } from "@/components/VoxaLogo";

/* -------- Small subcomponents -------- */

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const Nav = React.memo(function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-[background,border] duration-300 ${
        scrolled ? "glass" : "bg-transparent border-transparent"
      }`}
      data-testid="landing-nav"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" data-testid="landing-nav-logo">
          <VoxaLogo size={28} />
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-zinc-400 hover:text-white transition-colors duration-200"
              data-testid={`nav-link-${l.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              {l.label}
            </a>
          ))}
          {user ? (
            <Link to="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors duration-200">
              Dashboard
            </Link>
          ) : (
            <Link to="/signin" className="text-sm text-zinc-400 hover:text-white transition-colors duration-200">
              Sign in
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link to="/setup">
              <Button
                data-testid="nav-cta-start"
                className="rounded-full bg-white hover:bg-zinc-200 text-black h-9 px-4 text-sm font-semibold"
              >
                New Interview
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          ) : (
            <Link to="/signin">
              <Button
                data-testid="nav-cta-start"
                className="rounded-full bg-white hover:bg-zinc-200 text-black h-9 px-4 text-sm font-semibold"
              >
                Get started
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
});

/* Fake live-interview preview widget shown in hero */
const VoicePreview = React.memo(function VoicePreview() {
  const bars = 32;
  const lines = [
    { role: "assistant", text: "Hi, I'm Aria. Let's start with a warm-up — walk me through your latest project." },
    { role: "user", text: "Sure. I led the design of a payments platform handling 4M transactions per day." },
    { role: "assistant", text: "Interesting. What was the trickiest failure mode you designed around?" },
    { role: "user", text: "Duplicate settlement — we used an idempotency ledger keyed by request id." },
    { role: "assistant", text: "How did you verify the ledger never dropped events under load?" },
  ];
  const [visible, setVisible] = useState(1);
  useEffect(() => {
    const id = setInterval(() => {
      setVisible((v) => (v >= lines.length ? 1 : v + 1));
    }, 2400);
    return () => clearInterval(id);
  }, [lines.length]);

  return (
    <div
      className="relative w-full max-w-md mx-auto lg:mx-0"
      data-testid="hero-voice-preview"
    >
      {/* Ambient halo */}
      <div className="absolute -inset-8 rounded-[2rem] pointer-events-none">
        <div
          className="absolute inset-0 rounded-[2rem] opacity-70"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(0,255,234,0.15), transparent 60%)",
          }}
        />
      </div>

      <div className="relative rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden shadow-2xl">
        {/* Top bar mimicking a call session */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#ef4444]" />
            <span className="font-mono text-[10px] tracking-widest uppercase text-zinc-500">
              LIVE / 03:12
            </span>
          </div>
          <div className="font-mono text-[10px] tracking-widest uppercase text-zinc-500">
            Senior · Backend Engineer
          </div>
        </div>

        {/* Orb */}
        <div className="relative flex items-center justify-center py-8">
          <div className="absolute h-40 w-40 rounded-full bg-cyan-400/10 orb-ring" />
          <div
            className="absolute h-40 w-40 rounded-full bg-cyan-400/5 orb-ring"
            style={{ animationDelay: "0.8s" }}
          />
          <div className="relative flex items-center justify-center h-24 w-24 rounded-full border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.02] orb-speaking">
            <div
              className="h-16 w-16 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, rgba(0,255,234,0.7), rgba(0,255,234,0.05) 70%)",
              }}
            />
          </div>
        </div>

        {/* Waveform */}
        <div className="flex items-center justify-center gap-[3px] h-10 px-6">
          {Array.from({ length: bars }).map((_, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-cyan-300/70 wave-bar"
              style={{
                height: `${8 + ((i * 7) % 26)}px`,
                animationDelay: `${(i % 8) * 0.08}s`,
              }}
            />
          ))}
        </div>

        {/* Transcript */}
        <div className="px-5 py-4 space-y-2 h-40 overflow-hidden border-t border-white/5">
          {lines.slice(0, visible).map((l, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-sm"
            >
              <span
                className={`font-mono text-[9px] tracking-widest uppercase mr-2 ${
                  l.role === "assistant" ? "text-cyan-300" : "text-zinc-400"
                }`}
              >
                {l.role === "assistant" ? "ARIA" : "YOU"}
              </span>
              <span className="text-zinc-200">{l.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
});

const LOGO_ROW = [
  { name: "Google", Icon: Chrome },
  { name: "Figma", Icon: Figma },
  { name: "Slack", Icon: Slack },
  { name: "GitHub", Icon: Github },
  { name: "Trello", Icon: Trello },
  { name: "Codepen", Icon: Codepen },
];

const LogoStrip = React.memo(function LogoStrip() {
  const doubled = [...LOGO_ROW, ...LOGO_ROW, ...LOGO_ROW];
  return (
    <div className="relative overflow-hidden py-6">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#050505] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#050505] to-transparent z-10" />
      <div className="marquee flex items-center gap-14 whitespace-nowrap">
        {doubled.map(({ name, Icon }, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Icon className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-sm font-medium tracking-wide">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

/* Bento feature card */
const FeatureCard = React.memo(function FeatureCard({ span = "", icon: Icon, title, desc, accent = false, children, testid }) {
  return (
    <div
      data-testid={testid}
      className={`relative group rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 overflow-hidden hover:border-white/20 transition-[border-color] duration-300 ${span}`}
    >
      {accent && (
        <div
          className="absolute -top-16 -right-16 h-56 w-56 rounded-full pointer-events-none opacity-60"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(0,255,234,0.18), transparent 60%)",
          }}
        />
      )}
      <div className="relative">
        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-white/5 border border-white/10">
          <Icon className="h-4 w-4 text-cyan-300" strokeWidth={1.75} />
        </div>
        <h3
          className="mt-4 text-lg font-semibold text-white"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {title}
        </h3>
        <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{desc}</p>
        {children}
      </div>
    </div>
  );
});

const ScoreMini = React.memo(function ScoreMini({ label, value }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-500">
        <span>{label}</span>
        <span className="text-zinc-300">{value}</span>
      </div>
      <div className="mt-1 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
});

const StepCard = React.memo(function StepCard({ n, icon: Icon, title, desc }) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-[#0a0a0a] p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-white/5 border border-white/10">
          <Icon className="h-5 w-5 text-cyan-300" strokeWidth={1.75} />
        </div>
        <div className="font-mono text-xs tracking-widest text-zinc-600">
          / {String(n).padStart(2, "0")}
        </div>
      </div>
      <h3
        className="mt-6 text-xl font-semibold text-white"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {title}
      </h3>
      <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{desc}</p>
    </div>
  );
});

const TESTIMONIALS = [
  {
    quote:
      "Voxa's follow-ups caught the exact holes in my system design story. I ran the same prompt three times and by the third my answers were 40% tighter.",
    name: "Priya S.",
    role: "SWE II → Staff Engineer",
    initials: "PS",
  },
  {
    quote:
      "The scoring report reads like a hiring manager. Actionable, specific, and it hurt in a good way. I recommended it to my whole cohort.",
    name: "Marco D.",
    role: "PM candidate, Stripe",
    initials: "MD",
  },
  {
    quote:
      "Better than a $200 coach for the STAR frameworks alone. The 'confidence' score is spookily accurate.",
    name: "Aisha K.",
    role: "Data Scientist, Series-B",
    initials: "AK",
  },
];

const TestimonialCard = React.memo(function TestimonialCard({ quote, name, role, initials }) {
  return (
    <figure className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 h-full flex flex-col">
      <div className="flex items-center gap-1 text-cyan-300">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
        ))}
      </div>
      <blockquote className="mt-4 text-sm text-zinc-200 leading-relaxed flex-1">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption className="mt-5 flex items-center gap-3 pt-4 border-t border-white/5">
        <div className="h-9 w-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center font-mono text-xs text-white">
          {initials}
        </div>
        <div>
          <div className="text-sm font-medium text-white">{name}</div>
          <div className="text-xs text-zinc-500">{role}</div>
        </div>
      </figcaption>
    </figure>
  );
});

const PRICING = [
  {
    name: "Free",
    price: "₹0",
    period: "/ month",
    desc: "Perfect for trying out Voxa.",
    features: [
      "2 mock interviews (5-10 min each)",
      "Instant AI feedback & evaluation",
      "Overall score & skill breakdown",
      "Technical & HR interviews",
    ],
    note: "No history, analytics, or progress tracking.",
    cta: { label: "Get Started Free", to: "/signin", primary: true, testid: "pricing-free-cta" },
    upgradeMsg: "Try Voxa with 2 interviews and experience AI-powered mock interviews.",
  },
  {
    name: "Pro",
    price: "₹499",
    period: "/ month",
    desc: "For serious job seekers preparing consistently.",
    features: [
      "10 interviews/month · Up to 30 min each",
      "Everything in Free, plus:",
      "History, analytics & progress tracking",
      "Score trends, streaks & goal setting",
    ],
    note: "Best for active job seekers, students & professionals.",
    cta: { label: "Subscribe Now", to: "#subscribe", primary: true, testid: "pricing-pro-cta", disabled: true },
    highlight: true,
    upgradeMsg: "Practice consistently and improve with detailed insights & saved history.",
  },
];

const PricingCard = React.memo(function PricingCard({ tier }) {
  const isHighlight = tier.highlight;
  return (
    <div
      className={`relative rounded-2xl border p-6 h-full flex flex-col ${
        isHighlight
          ? "border-cyan-400/40 bg-gradient-to-b from-cyan-400/[0.06] to-transparent"
          : "border-white/10 bg-[#0a0a0a]"
      }`}
    >
      {isHighlight && (
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
        {tier.tag && (
          <span className="font-mono text-[10px] tracking-widest uppercase text-zinc-500">
            {tier.tag}
          </span>
        )}
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
      <div className="mt-6">
        {tier.cta.disabled ? (
          <Button
            data-testid={tier.cta.testid}
            onClick={() => toast.info("Subscriptions coming soon! We'll keep you posted.")}
            variant="outline"
            className="w-full rounded-full h-11 bg-transparent border-white/15 text-white hover:bg-white/5"
          >
            {tier.cta.label}
          </Button>
        ) : (
          <Link to={tier.cta.to}>
            <Button
              data-testid={tier.cta.testid}
              className={`w-full rounded-full h-11 font-semibold ${
                tier.cta.primary
                  ? "bg-white hover:bg-zinc-200 text-black"
                  : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
              }`}
            >
              {tier.cta.label}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
      {tier.upgradeMsg && (
        <p className="mt-3 text-xs text-zinc-500 text-center leading-relaxed">
          {tier.upgradeMsg}
        </p>
      )}
    </div>
  );
});

const FAQS = [
  {
    q: "Is Voxa really free?",
    a: "Yes, the Free plan gives you 2 mock interviews at no cost with interview durations of 5 or 10 minutes, instant AI feedback, and full question-by-question evaluation. The Pro plan adds advanced features, longer sessions, and detailed progress tracking for serious preparation.",
  },
  {
    q: "How does the voice interview work?",
    a: "We use Vapi's realtime voice infrastructure to run a natural back-and-forth conversation. Aria (our AI interviewer) speaks, listens, and generates contextual follow-ups from your answers. When time is up, the transcript is sent to an LLM for structured scoring.",
  },
  {
    q: "What roles and levels can Voxa interview me for?",
    a: "Any role, any level — Aria adapts her questions to what you tell her at setup. We've seen users prep for backend engineering, product management, data science, sales, design leadership, and more. The more specific you are (e.g. 'Senior Backend Engineer at a payments company'), the sharper the questions.",
  },
  {
    q: "Are my interview transcripts stored?",
    a: "Yes, if you're signed in. Every interview transcript, scorecard, and feedback report is saved to your account so you can revisit them anytime from your dashboard. No data is stored for anonymous sessions.",
  },
  {
    q: "How accurate is the scoring?",
    a: "Voxa uses a strong instruction-tuned LLM (currently the OpenAI OSS 20B model via OpenRouter) with a hiring-manager-grade rubric. The scores are best used directionally: as a mirror, not a verdict. Users consistently report the qualitative feedback (strengths, gaps, follow-up-you-should-have-given) is more valuable than the raw numbers.",
  },
  {
    q: "Can I use it without a microphone?",
    a: "Not yet — Voxa is voice-first by design. A text-only interview mode is on the roadmap but the whole point is to practice the speech pressure that actual interviews create.",
  },
  {
    q: "Which browsers work best?",
    a: "Chrome, Edge, and Arc give the best mic quality. Safari works but occasionally needs a permission re-prompt. Firefox is supported but not primary.",
  },
];

const FAQ = React.memo(function FAQ() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden" data-testid="faq-section">
      <Accordion type="multiple" className="w-full">
        {FAQS.map((item, i) => (
          <AccordionItem
            key={i}
            value={`faq-${i}`}
            className="border-b border-white/5 last:border-b-0"
          >
            <AccordionTrigger
              data-testid={`faq-item-${i}`}
              className="px-6 py-5 text-left hover:no-underline hover:bg-white/[0.02] text-white text-base font-medium"
            >
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-5 text-sm text-zinc-400 leading-relaxed">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
});

/* -------- Main Page -------- */
export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <Nav />

      {/* HERO */}
      <section className="relative pt-28 pb-20 md:pt-36 md:pb-28">
        <div className="ambient-glow" />
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            <div className="lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 font-mono tracking-wider uppercase"
                data-testid="hero-badge"
              >
                <Sparkles className="h-3 w-3 text-cyan-300" />
                <span>AI voice mock interviews · Free during beta</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.05 }}
                className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.95] text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Speak to your{" "}
                <span className="relative inline-block">
                  <span className="relative z-10 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
                    future.
                  </span>
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mt-6 max-w-xl text-lg text-zinc-400 leading-relaxed"
              >
                Voxa is your always-available AI interview coach. Realistic voice
                interviews, contextual follow-ups, and a hiring-manager-grade
                scorecard — in under ten minutes.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                <Link to={user ? "/setup" : "/signin"}>
                  <Button
                    data-testid="hero-cta-primary"
                    className="rounded-full h-12 px-6 bg-white hover:bg-zinc-200 text-black text-sm font-semibold group"
                  >
                    {user ? "Start mock interview" : "Sign in to start"}
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
                <a href="#preview">
                  <Button
                    data-testid="hero-cta-secondary"
                    variant="outline"
                    className="rounded-full h-12 px-6 bg-transparent border-white/15 hover:bg-white/5 text-white text-sm font-medium"
                  >
                    See a sample report
                  </Button>
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="mt-10 flex items-center gap-6 text-xs text-zinc-500 font-mono tracking-wider uppercase"
              >
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Secure & private
                </div>
                <div className="flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5" /> ~10 min sessions
                </div>
                <div className="flex items-center gap-1.5">
                  <Mic className="h-3.5 w-3.5" /> Browser only
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="lg:col-span-5"
            >
              <VoicePreview />
            </motion.div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF STRIP */}
      <section className="relative border-y border-white/5 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center label-overline py-4">
            Practicing for interviews at
          </div>
          <LogoStrip />
        </div>
      </section>

      {/* FEATURES BENTO */}
      <section id="features" className="relative py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl">
            <div className="label-overline">Features</div>
            <h2
              className="mt-3 text-4xl md:text-5xl font-black tracking-tighter text-white"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              An interviewer that actually{" "}
              <span className="text-zinc-500">listens.</span>
            </h2>
            <p className="mt-4 text-lg text-zinc-400 leading-relaxed">
              Not a chatbot pretending to interview you. A voice-first system
              that turns silence into follow-ups and follow-ups into growth.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-6 gap-4">
            <FeatureCard
              testid="feature-voice"
              span="md:col-span-4"
              icon={Mic}
              accent
              title="Voice-first, not text-with-audio"
              desc="Powered by Vapi realtime voice. Aria speaks, listens, and takes turns like a human would — you finish your thought before she moves on."
            >
              <div className="mt-6 flex items-center justify-center gap-[3px] h-12">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-[3px] rounded-full bg-cyan-300/60 wave-bar"
                    style={{
                      height: `${8 + ((i * 5) % 32)}px`,
                      animationDelay: `${(i % 10) * 0.06}s`,
                    }}
                  />
                ))}
              </div>
            </FeatureCard>

            <FeatureCard
              testid="feature-followups"
              span="md:col-span-2"
              icon={BrainCircuit}
              title="Contextual follow-ups"
              desc="If your answer has a hole, Aria digs. If it's tight, she moves on. No two runs are the same."
            />

            <FeatureCard
              testid="feature-scoring"
              span="md:col-span-2"
              icon={BarChart3}
              title="Hiring-manager rubric"
              desc="Technical, communication, problem-solving, confidence — plus a final Hire / No Hire recommendation."
            >
              <div className="mt-5 space-y-2">
                <ScoreMini label="Technical" value={88} />
                <ScoreMini label="Communication" value={74} />
                <ScoreMini label="Problem-solving" value={82} />
              </div>
            </FeatureCard>

            <FeatureCard
              testid="feature-questions"
              span="md:col-span-2"
              icon={MessageSquareText}
              title="Question-by-question breakdown"
              desc="Every substantive question you were asked, your answer, and what an experienced interviewer would score it."
            />

            <FeatureCard
              testid="feature-any-role"
              span="md:col-span-2"
              icon={Users}
              title="Any role, any level"
              desc="Backend engineer to product manager to data scientist. Aria calibrates her difficulty to what you configure."
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative py-24 md:py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div className="max-w-xl">
              <div className="label-overline">How it works</div>
              <h2
                className="mt-3 text-4xl md:text-5xl font-black tracking-tighter text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Three steps.{" "}
                <span className="text-zinc-500">One coffee.</span>
              </h2>
            </div>
            <Link to={user ? "/setup" : "/signin"} className="hidden md:block">
              <Button
                data-testid="how-cta"
                className="rounded-full bg-white hover:bg-zinc-200 text-black h-11 px-5 font-semibold"
              >
                {user ? "Try it now" : "Sign in to start"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StepCard
              n={1}
              icon={Settings}
              title="Configure"
              desc="Job role, experience level, target duration. Thirty seconds and you're done."
            />
            <StepCard
              n={2}
              icon={Mic}
              title="Speak"
              desc="Aria runs a natural voice interview. Follow-ups, pauses, curveballs — like a real 1:1."
            />
            <StepCard
              n={3}
              icon={FileText}
              title="Get scored"
              desc="Structured report the second you hang up. Strengths, gaps, and a learning plan."
            />
          </div>
        </div>
      </section>

      {/* SAMPLE REPORT PREVIEW */}
      <section id="preview" className="relative py-24 md:py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5">
              <div className="label-overline">The scorecard</div>
              <h2
                className="mt-3 text-4xl md:text-5xl font-black tracking-tighter text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                A report that reads like a{" "}
                <span className="text-zinc-500">hiring debrief.</span>
              </h2>
              <p className="mt-4 text-lg text-zinc-400 leading-relaxed">
                Not a vibe check. A per-skill breakdown, per-question evaluation,
                and a plain-English learning plan. Read it, sting a little, then
                book the next round.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  { icon: Zap, t: "Instant delivery", d: "Scored the moment your call ends." },
                  { icon: BarChart3, t: "Four calibrated skills", d: "Technical, communication, problem-solving, confidence." },
                  { icon: Rocket, t: "A learning plan", d: "Specific topics and drills — not generic advice." },
                ].map(({ icon: Icon, t, d }, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/5 border border-white/10 shrink-0">
                      <Icon className="h-4 w-4 text-cyan-300" strokeWidth={1.75} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{t}</div>
                      <div className="text-sm text-zinc-400">{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock report card */}
            <div className="lg:col-span-7">
              <div className="relative rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden">
                <div className="absolute inset-0 grid-bg-fine opacity-40 pointer-events-none" />
                <div className="relative p-6 md:p-8">
                  <div className="flex items-center justify-between">
                    <div className="label-overline">Sample Report</div>
                    <div className="font-mono text-[10px] tracking-widest uppercase text-zinc-500">
                      Senior Backend · 10 min
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-12 gap-6 items-end">
                    <div className="col-span-12 md:col-span-5">
                      <div className="label-overline mb-1">Overall</div>
                      <div className="flex items-end gap-2">
                        <div
                          className="text-7xl md:text-8xl font-black tracking-tighter text-white"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          88
                        </div>
                        <div className="font-mono text-sm text-zinc-500 mb-2">/ 100</div>
                      </div>
                      <div className="mt-3 inline-block px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/30 font-mono text-[10px] tracking-widest uppercase text-cyan-300">
                        Hire
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-7 grid grid-cols-2 gap-4">
                      {[
                        { l: "Technical", v: 90 },
                        { l: "Communication", v: 85 },
                        { l: "Problem-solving", v: 90 },
                        { l: "Confidence", v: 80 },
                      ].map(({ l, v }) => (
                        <div key={l} className="rounded-xl border border-white/10 p-4 bg-white/[0.02]">
                          <div className="label-overline">{l}</div>
                          <div
                            className="mt-2 text-3xl font-black tracking-tighter text-white"
                            style={{ fontFamily: "var(--font-heading)" }}
                          >
                            {v}
                          </div>
                          <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-white" style={{ width: `${v}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                      <div className="label-overline text-green-400">Strengths</div>
                      <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                        <li className="flex gap-2"><Check className="h-4 w-4 text-cyan-300 mt-0.5 shrink-0" /> Deep knowledge of distributed stream processing.</li>
                        <li className="flex gap-2"><Check className="h-4 w-4 text-cyan-300 mt-0.5 shrink-0" /> Data-driven conflict resolution.</li>
                      </ul>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                      <div className="label-overline text-amber-400">To improve</div>
                      <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                        <li className="flex gap-2"><span className="font-mono text-amber-400 mt-0.5">▸</span> Quantify impact of optimizations.</li>
                        <li className="flex gap-2"><span className="font-mono text-amber-400 mt-0.5">▸</span> Add fault-tolerance detail.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="relative py-24 md:py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl">
            <div className="label-overline">Social proof</div>
            <h2
              className="mt-3 text-4xl md:text-5xl font-black tracking-tighter text-white"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Interviews prepped for.{" "}
              <span className="text-zinc-500">Offers landed.</span>
            </h2>
          </div>
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t) => (
              <TestimonialCard key={t.name} {...t} />
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative py-24 md:py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl">
            <div className="label-overline">Pricing</div>
            <h2
              className="mt-3 text-4xl md:text-5xl font-black tracking-tighter text-white"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Simple, transparent pricing.{" "}
              <span className="text-zinc-500">Start free.</span>
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              Choose the plan that fits your preparation journey. Upgrade anytime.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {PRICING.map((tier) => (
              <PricingCard key={tier.name} tier={tier} />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative py-24 md:py-32 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="label-overline">FAQ</div>
          <h2
            className="mt-3 text-4xl md:text-5xl font-black tracking-tighter text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Straight answers.{" "}
            <span className="text-zinc-500">No filler.</span>
          </h2>
          <div className="mt-10">
            <FAQ />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative py-24 md:py-32 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="relative rounded-3xl border border-white/10 bg-[#0a0a0a] p-10 md:p-14 overflow-hidden">
            <div
              className="absolute -top-32 -right-24 h-80 w-80 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at 40% 40%, rgba(0,255,234,0.15), transparent 60%)",
              }}
            />
            <div className="relative">
              <h2
                className="text-4xl md:text-5xl font-black tracking-tighter text-white leading-[1.05]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Your next interview is closer than you think.
              </h2>
              <p className="mt-4 text-lg text-zinc-400 max-w-2xl">
                Ten minutes with Voxa now beats an hour of scrolling job boards.
                Sign up free. No credit card. Just talk.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to={user ? "/setup" : "/signin"}>
                  <Button
                    data-testid="final-cta-primary"
                    className="rounded-full h-12 px-6 bg-white hover:bg-zinc-200 text-black text-sm font-semibold group"
                  >
                    {user ? "Start free interview" : "Sign in to start"}
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
                <a href="#pricing">
                  <Button
                    variant="outline"
                    className="rounded-full h-12 px-6 bg-transparent border-white/15 hover:bg-white/5 text-white text-sm font-medium"
                  >
                    See pricing
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <div className="col-span-2">
              <VoxaLogo size={28} />
              <p className="mt-4 text-sm text-zinc-500 max-w-sm leading-relaxed">
                The voice of your next career move. AI-first mock interviews with
                honest, actionable feedback.
              </p>
            </div>
            <div>
              <div className="label-overline">Product</div>
              <ul className="mt-4 space-y-2 text-sm">
                <li><a href="#features" className="text-zinc-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-zinc-400 hover:text-white transition-colors">Pricing</a></li>
                <li><Link to={user ? "/setup" : "/signin"} className="text-zinc-400 hover:text-white transition-colors">Start interview</Link></li>
              </ul>
            </div>
            <div>
              <div className="label-overline">Company</div>
              <ul className="mt-4 space-y-2 text-sm">
                <li><a href="#faq" className="text-zinc-400 hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="text-zinc-400 hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="text-zinc-400 hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="font-mono text-xs uppercase tracking-widest text-zinc-600">
              © {new Date().getFullYear()} Voxa · Made for candidates.
            </div>
            <div className="font-mono text-xs uppercase tracking-widest text-zinc-600">
              Speak to your future.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
