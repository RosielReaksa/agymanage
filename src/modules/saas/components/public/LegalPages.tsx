import React from 'react';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900 dark:bg-[#161514] dark:text-[#EFECE6] font-sans selection:bg-[#F4ECE7] selection:text-[#C85A32] dark:selection:bg-[#2A201C] dark:selection:text-[#E28567]">
      <PublicNavbar />
      <main className="flex-1 py-16">
        <div className="mx-auto max-w-3xl px-6 space-y-8">
          <div className="space-y-2 border-b border-[#E8E4DC] pb-6 dark:border-[#34312C]">
            <h1 className="font-serif text-3xl font-medium tracking-tight text-stone-900 dark:text-[#EFECE6]">
              Terms of Service
            </h1>
            <p className="text-xs font-mono text-stone-500">Last updated: October 2026</p>
          </div>
          <div className="prose prose-stone dark:prose-invert text-xs leading-relaxed space-y-4 text-stone-600 dark:text-stone-400">
            <p>
              Welcome to Antigravity Gateway. By accessing our services, endpoints, or console dashboards, you agree to comply with and be bound by the following terms and conditions.
            </p>
            <h2 className="font-serif text-base font-semibold text-stone-900 dark:text-[#EFECE6]">1. Acceptable Use</h2>
            <p>
              You agree to use the gateway solely for lawful purposes. You may not attempt to reverse engineer upstream account leases, circumvent rate limits, or transmit malware or abusive content through the model endpoints.
            </p>
            <h2 className="font-serif text-base font-semibold text-stone-900 dark:text-[#EFECE6]">2. Server-Side Key Security</h2>
            <p>
              API keys issued for Antigravity Gateway are strictly intended for server-to-server communication. Exposing keys in client-side code, web applications, or public repositories may result in immediate key revocation.
            </p>
            <h2 className="font-serif text-base font-semibold text-stone-900 dark:text-[#EFECE6]">3. Service Availability & Failover</h2>
            <p>
              While Antigravity Gateway provides automated failover and multi-account routing, services are provided &quot;as is&quot; without warranties of uninterrupted uptime or error-free operation.
            </p>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
};

export const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900 dark:bg-[#161514] dark:text-[#EFECE6] font-sans selection:bg-[#F4ECE7] selection:text-[#C85A32] dark:selection:bg-[#2A201C] dark:selection:text-[#E28567]">
      <PublicNavbar />
      <main className="flex-1 py-16">
        <div className="mx-auto max-w-3xl px-6 space-y-8">
          <div className="space-y-2 border-b border-[#E8E4DC] pb-6 dark:border-[#34312C]">
            <h1 className="font-serif text-3xl font-medium tracking-tight text-stone-900 dark:text-[#EFECE6]">
              Privacy Policy
            </h1>
            <p className="text-xs font-mono text-stone-500">Last updated: October 2026</p>
          </div>
          <div className="prose prose-stone dark:prose-invert text-xs leading-relaxed space-y-4 text-stone-600 dark:text-stone-400">
            <p>
              Your privacy and security are paramount. This policy describes our zero-prompt-retention architecture.
            </p>
            <h2 className="font-serif text-base font-semibold text-stone-900 dark:text-[#EFECE6]">1. Zero Data Retention for Prompts</h2>
            <p>
              Antigravity Gateway acts as an ephemeral routing proxy. We do not store, inspect, log, or train on the contents of your prompt messages or model completions. Only metadata (token counts, timestamp, model ID, and latency) is stored for metering.
            </p>
            <h2 className="font-serif text-base font-semibold text-stone-900 dark:text-[#EFECE6]">2. Account Information</h2>
            <p>
              We collect information provided during access request (name, email, organization) strictly for authentication, issuing keys, and service-related announcements.
            </p>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
};
