import React from 'react';
import { Link } from '@tanstack/react-router';
import { Rocket, ShieldCheck, Heart } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-[#E8E4DC] bg-[#FAF8F5] dark:border-[#34312C] dark:bg-[#161514] mt-auto">
      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F4ECE7] border border-[#E8D6CC] text-[#C85A32] dark:bg-[#2A201C] dark:border-[#3D2C24] dark:text-[#E28567]">
                <Rocket className="h-3.5 w-3.5" />
              </div>
              <span className="font-serif text-base font-semibold tracking-tight text-stone-900 dark:text-[#EFECE6]">
                Antigravity Gateway
              </span>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed dark:text-stone-400">
              High-throughput multi-account gateway providing fast, reliable, resilient access to Google and Anthropic intelligence models.
            </p>
            {/* System Status Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#E8D6CC] bg-white text-xs font-mono text-stone-700 dark:border-[#3D2C24] dark:bg-[#1E1D1A] dark:text-stone-300 shadow-soft-sm">
              <span className="h-2 w-2 rounded-full bg-[#4D7C5F] animate-pulse" />
              <span>All Systems Operational</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs uppercase tracking-wider text-stone-900 dark:text-[#EFECE6] font-semibold">
              Platform
            </h3>
            <ul className="space-y-2 text-xs text-stone-600 dark:text-stone-400">
              <li>
                <Link to="/models" className="hover:text-[#C85A32] dark:hover:text-[#E28567] transition-colors">
                  Model Catalog
                </Link>
              </li>
              <li>
                <Link to="/docs" className="hover:text-[#C85A32] dark:hover:text-[#E28567] transition-colors">
                  Documentation & Quickstart
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-[#C85A32] dark:hover:text-[#E28567] transition-colors">
                  Console Dashboard
                </Link>
              </li>
              <li>
                <Link to="/request-access" className="hover:text-[#C85A32] dark:hover:text-[#E28567] transition-colors">
                  Request API Access
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs uppercase tracking-wider text-stone-900 dark:text-[#EFECE6] font-semibold">
              Compliance & Legal
            </h3>
            <ul className="space-y-2 text-xs text-stone-600 dark:text-stone-400">
              <li>
                <Link to="/terms" className="hover:text-[#C85A32] dark:hover:text-[#E28567] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-[#C85A32] dark:hover:text-[#E28567] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li className="flex items-center gap-1.5 text-stone-500">
                <ShieldCheck className="h-3.5 w-3.5 text-[#4D7C5F]" />
                <span>Zero Data Retention</span>
              </li>
            </ul>
          </div>

          {/* Connect / Info */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs uppercase tracking-wider text-stone-900 dark:text-[#EFECE6] font-semibold">
              Access
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Available by invitation only. API keys are strictly server-side and issued upon project review.
            </p>
            <div className="pt-1">
              <Link
                to="/request-access"
                className="inline-flex text-xs font-medium text-[#C85A32] hover:underline dark:text-[#E28567]"
              >
                Apply for an Invitation &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Subfooter */}
        <div className="mt-12 pt-6 border-t border-[#E8E4DC] dark:border-[#34312C] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500 dark:text-stone-400">
          <p>© {currentYear} Antigravity Gateway. All rights reserved.</p>
          <p className="flex items-center gap-1 font-mono text-[11px]">
            Engineered for resilience and speed
          </p>
        </div>
      </div>
    </footer>
  );
};
