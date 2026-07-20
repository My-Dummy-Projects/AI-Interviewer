import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { VoxaLogo } from "@/components/VoxaLogo";

export default function TermsOfServicePage() {
  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden flex flex-col">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="ambient-glow" />

      <Navbar
        left={
          <>
            <Link to="/"><VoxaLogo size={28} /></Link>
            <div className="hidden md:block h-5 w-px bg-white" />
            <div className="hidden md:block label-overline">Terms of Service</div>
          </>
        }
        right={
          <Link to="/signup">
            <Button variant="outline" className="rounded-full bg-transparent border-white/15 hover:bg-white/5 text-white h-9 px-4 text-sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
          </Link>
        }
      />

      <main className="relative flex-1 px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-8 md:p-12">
            <h1 className="text-3xl font-black tracking-tighter mb-8" style={{ fontFamily: "var(--font-heading)" }}>
              Terms of Service
            </h1>
            <p className="text-sm text-zinc-500 mb-8">Last updated: July 20, 2026</p>

            <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
              <section>
                <h2 className="text-lg font-semibold text-white mb-3">1. Acceptance of Terms</h2>
                <p>By creating an account and using Voxa, you agree to these Terms of Service. If you do not agree, do not use the service.</p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-3">2. Service Description</h2>
                <p>Voxa provides AI-powered interview preparation tools, including mock interviews, feedback analysis, and performance tracking. We reserve the right to modify or discontinue features at any time.</p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-3">3. User Responsibilities</h2>
                <p>You agree to provide accurate information, maintain the confidentiality of your account, and not misuse the platform for any unlawful purpose. You are responsible for all activity under your account.</p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-3">4. Payments & Subscriptions</h2>
                <p>Paid plans are billed monthly via Razorpay. Refunds are handled in accordance with our refund policy. We reserve the right to change pricing with notice.</p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-3">5. Intellectual Property</h2>
                <p>The Voxa platform, including its design, code, and content, is owned by Voxa. You may not copy, modify, or redistribute any part of the service without authorization.</p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-3">6. Limitation of Liability</h2>
                <p>Voxa is provided &quot;as is&quot; without warranties of any kind. We are not liable for any damages arising from your use of the platform.</p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-3">7. Termination</h2>
                <p>We reserve the right to suspend or terminate accounts that violate these terms or engage in abusive behavior.</p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-3">8. Changes to Terms</h2>
                <p>We may update these terms at any time. Continued use after changes constitutes acceptance of the new terms.</p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
