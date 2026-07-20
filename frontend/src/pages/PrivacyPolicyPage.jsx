import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { VoxaLogo } from "@/components/VoxaLogo";

export default function PrivacyPolicyPage() {
  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden flex flex-col">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="ambient-glow" />

      <Navbar
        left={
          <>
            <Link to="/"><VoxaLogo size={28} /></Link>
            <div className="hidden md:block h-5 w-px bg-white" />
            <div className="hidden md:block label-overline">Privacy Policy</div>
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
              Privacy Policy
            </h1>
            <p className="text-sm text-zinc-500 mb-8">Last updated: July 20, 2026</p>

            <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
              <section>
                <h2 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h2>
                <p>We collect information you provide when creating an account, including your email address and authentication data via Clerk. We also collect interview responses, recordings, and feedback you submit through the platform.</p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-3">2. How We Use Your Information</h2>
                <p>Your information is used to provide and improve our AI interview preparation service, process payments via Razorpay, send service-related communications, and ensure platform security.</p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-3">3. Third-Party Services</h2>
                <p>We use Clerk for authentication, Supabase for data storage, Razorpay for payment processing, and Render for hosting. Each service has its own privacy policy governing data handling.</p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-3">4. Data Security</h2>
                <p>We implement industry-standard security measures including encryption in transit and at rest. However, no method of transmission over the internet is 100% secure.</p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-3">5. Data Retention</h2>
                <p>We retain your data for as long as your account is active. You may request deletion of your account and associated data by contacting us.</p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-3">6. Contact</h2>
                <p>For privacy-related inquiries, please reach out to our support team through the platform.</p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
