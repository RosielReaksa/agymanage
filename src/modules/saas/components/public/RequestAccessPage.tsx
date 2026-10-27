import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Send,
  Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { useSubmitAccessRequest } from '../../hooks/useSaas';

const VOLUME_OPTIONS = [
  'Under 1M tokens/month (Testing & Prototyping)',
  '1M to 10M tokens/month (Small Production)',
  '10M to 50M tokens/month (Growth & Scaling)',
  'Over 50M tokens/month (Enterprise Volume)',
];

export const RequestAccessPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [useCase, setUseCase] = useState('');
  const [estimatedVolume, setEstimatedVolume] = useState(VOLUME_OPTIONS[0]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  const submitMutation = useSubmitAccessRequest();

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Please provide your name.';
    }

    if (!email.trim()) {
      newErrors.email = 'Please provide your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!useCase.trim()) {
      newErrors.useCase = 'Please briefly outline your intended use case.';
    }

    if (!acceptedTerms) {
      newErrors.terms = 'You must accept the terms of service to apply.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      await submitMutation.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        organization: organization.trim() || undefined,
        useCase: useCase.trim() || undefined,
        estimatedVolume,
      });

      setIsSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit request. Please try again.';
      setErrors((prev) => ({ ...prev, form: message }));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900 dark:bg-[#161514] dark:text-[#EFECE6] font-sans selection:bg-[#F4ECE7] selection:text-[#C85A32] dark:selection:bg-[#2A201C] dark:selection:text-[#E28567]">
      <PublicNavbar />

      <main className="flex-1 py-12 md:py-20">
        <div className="mx-auto max-w-2xl px-6">
          {isSuccess ? (
            /* Success Confirmation Card */
            <div className="rounded-3xl border border-[#E8E4DC] bg-white p-8 md:p-12 shadow-soft-card dark:border-[#34312C] dark:bg-[#1E1D1A] space-y-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF3ED] text-[#4D7C5F]">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <div className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-wider text-[#4D7C5F] font-semibold">
                  Application Received
                </span>
                <h1 className="font-serif text-3xl font-medium tracking-tight text-stone-900 dark:text-[#EFECE6]">
                  Thank you for applying
                </h1>
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed max-w-md mx-auto">
                  We have queued your request for <strong className="text-stone-900 dark:text-[#EFECE6]">{email}</strong>. Our engineering team reviews each application and will send initial tenant lease keys and console access directly to your inbox.
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/docs" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto rounded-xl border-[#E8E4DC] text-xs h-10 px-5 dark:border-[#34312C]"
                  >
                    Read Documentation
                  </Button>
                </Link>

                <Link to="/models" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto rounded-xl border-[#E8E4DC] text-xs h-10 px-5 dark:border-[#34312C]"
                  >
                    Explore Models
                  </Button>
                </Link>

                <Link to="/landing" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto rounded-xl bg-[#C85A32] text-white hover:bg-[#A44422] text-xs h-10 px-5">
                    Return to Overview
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* Application Form */
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#E8D6CC] bg-[#FDF8F6] text-xs font-mono text-[#C85A32] dark:border-[#3D2C24] dark:bg-[#2A201C] dark:text-[#E28567]">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Private Invitation Queue</span>
                </div>
                <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-stone-900 dark:text-[#EFECE6]">
                  Request API Access
                </h1>
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  Antigravity Gateway is currently available through invitation. Fill out this brief form to establish your workspace and receive provisioned leases.
                </p>
              </div>

              {errors.form && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errors.form}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="rounded-3xl border border-[#E8E4DC] bg-white p-6 sm:p-8 shadow-soft-card dark:border-[#34312C] dark:bg-[#1E1D1A] space-y-6">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="font-mono text-xs text-stone-700 dark:text-stone-300 font-medium">
                    Your Full Name <span className="text-[#C85A32]">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Alex Mercer"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    className="h-10 rounded-xl text-xs border-[#E8E4DC] bg-[#FAF8F5]/50 dark:border-[#34312C] dark:bg-[#161514]/50"
                  />
                  {errors.name && <p className="text-[11px] text-red-600 dark:text-red-400">{errors.name}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="font-mono text-xs text-stone-700 dark:text-stone-300 font-medium">
                    Work Email <span className="text-[#C85A32]">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="alex@acmecorp.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    className="h-10 rounded-xl text-xs border-[#E8E4DC] bg-[#FAF8F5]/50 dark:border-[#34312C] dark:bg-[#161514]/50"
                  />
                  {errors.email && <p className="text-[11px] text-red-600 dark:text-red-400">{errors.email}</p>}
                </div>

                {/* Organization */}
                <div className="space-y-1.5">
                  <label className="font-mono text-xs text-stone-700 dark:text-stone-300 font-medium">
                    Organization / Company
                  </label>
                  <Input
                    placeholder="Acme Inc. / Project Name"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="h-10 rounded-xl text-xs border-[#E8E4DC] bg-[#FAF8F5]/50 dark:border-[#34312C] dark:bg-[#161514]/50"
                  />
                </div>

                {/* Estimated Monthly Volume */}
                <div className="space-y-1.5">
                  <label className="font-mono text-xs text-stone-700 dark:text-stone-300 font-medium">
                    Estimated Monthly Token Volume
                  </label>
                  <select
                    value={estimatedVolume}
                    onChange={(e) => setEstimatedVolume(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl text-xs border border-[#E8E4DC] bg-[#FAF8F5]/50 text-stone-800 dark:border-[#34312C] dark:bg-[#161514]/50 dark:text-stone-200 outline-none focus:ring-1 focus:ring-[#C85A32]"
                  >
                    {VOLUME_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-white dark:bg-[#1E1D1A]">
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Use Case */}
                <div className="space-y-1.5">
                  <label className="font-mono text-xs text-stone-700 dark:text-stone-300 font-medium">
                    Planned Use Case & Requirements <span className="text-[#C85A32]">*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe what you are building, key models required (e.g. Claude 3.5 Sonnet, Gemini 2.5 Pro), and any specific latency/throughput targets..."
                    value={useCase}
                    onChange={(e) => {
                      setUseCase(e.target.value);
                      if (errors.useCase) setErrors((prev) => ({ ...prev, useCase: '' }));
                    }}
                    className="w-full p-3 rounded-xl text-xs border border-[#E8E4DC] bg-[#FAF8F5]/50 text-stone-800 dark:border-[#34312C] dark:bg-[#161514]/50 dark:text-stone-200 outline-none focus:ring-1 focus:ring-[#C85A32] leading-relaxed"
                  />
                  {errors.useCase && <p className="text-[11px] text-red-600 dark:text-red-400">{errors.useCase}</p>}
                </div>

                {/* Terms Checkbox */}
                <div className="space-y-1.5 pt-2 border-t border-[#E8E4DC]/60 dark:border-[#34312C]/60">
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => {
                        setAcceptedTerms(Boolean(checked));
                        if (errors.terms) setErrors((prev) => ({ ...prev, terms: '' }));
                      }}
                      className="mt-0.5"
                    />
                    <label htmlFor="terms" className="text-xs text-stone-600 dark:text-stone-400 leading-normal cursor-pointer select-none">
                      I agree to the{' '}
                      <Link to="/terms" className="text-[#C85A32] hover:underline dark:text-[#E28567]">
                        Terms of Service
                      </Link>{' '}
                      and acknowledge the{' '}
                      <Link to="/privacy" className="text-[#C85A32] hover:underline dark:text-[#E28567]">
                        Privacy Policy
                      </Link>
                      . I understand that API keys are for server-side use only.
                    </label>
                  </div>
                  {errors.terms && <p className="text-[11px] text-red-600 dark:text-red-400">{errors.terms}</p>}
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="w-full h-11 rounded-xl bg-[#C85A32] hover:bg-[#A44422] text-white dark:bg-[#E28567] dark:hover:bg-[#C85A32] dark:text-[#161514] font-medium text-xs shadow-soft-card transition-all"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting Application...
                      </>
                    ) : (
                      <>
                        Submit Access Application
                        <Send className="ml-2 h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
