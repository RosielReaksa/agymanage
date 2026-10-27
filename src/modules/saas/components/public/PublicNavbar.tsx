import React, { useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { Rocket, Menu, X, ArrowUpRight, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/ui/utils';

export const PublicNavbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: '/models', label: 'Models' },
    { to: '/docs', label: 'Docs' },
    { to: '/request-access', label: 'Request Access' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E8E4DC] bg-[#FAF8F5]/90 backdrop-blur-md dark:border-[#34312C] dark:bg-[#161514]/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Brand / Logo */}
        <Link to="/landing" className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F4ECE7] border border-[#E8D6CC] text-[#C85A32] dark:bg-[#2A201C] dark:border-[#3D2C24] dark:text-[#E28567] shadow-soft-sm">
            <Rocket className="h-4.5 w-4.5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg font-medium tracking-tight text-stone-900 dark:text-[#EFECE6]">
              Antigravity
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F4ECE7] text-[#C85A32] border border-[#E8D6CC] dark:bg-[#2A201C] dark:text-[#E28567] dark:border-[#3D2C24]">
              Gateway
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'font-medium text-[#C85A32] dark:text-[#E28567] bg-[#F4ECE7]/60 dark:bg-[#2A201C]/60'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 dark:text-stone-400 dark:hover:text-[#EFECE6] dark:hover:bg-stone-800/50'
                )}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Status Pill */}
          <div className="ml-2 flex items-center gap-2 px-3 py-1 rounded-full border border-[#E8E4DC] bg-white/70 dark:border-[#34312C] dark:bg-[#1E1D1A]/70 text-xs font-mono text-stone-600 dark:text-stone-400">
            <span className="h-2 w-2 rounded-full bg-[#4D7C5F] animate-pulse" />
            <span>Status: Operational</span>
          </div>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 rounded-xl border-[#E8E4DC] bg-white hover:bg-stone-100 text-stone-800 dark:border-[#34312C] dark:bg-[#1E1D1A] dark:text-[#EFECE6] dark:hover:bg-stone-800 transition-all font-medium text-xs shadow-soft-sm"
            >
              Sign In / Console
              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5 text-stone-400" />
            </Button>
          </Link>

          <Link to="/request-access">
            <Button
              size="sm"
              className="h-9 px-4 rounded-xl bg-[#C85A32] hover:bg-[#A44422] text-white dark:bg-[#E28567] dark:hover:bg-[#C85A32] dark:text-[#161514] font-medium text-xs shadow-soft-sm transition-all"
            >
              Request Access
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-[#E8E4DC] bg-white text-stone-700 dark:border-[#34312C] dark:bg-[#1E1D1A] dark:text-stone-300"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E8E4DC] bg-[#FAF8F5] px-6 py-4 dark:border-[#34312C] dark:bg-[#161514] space-y-3">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm text-stone-700 hover:bg-stone-200/60 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-stone-500">
              <span className="h-2 w-2 rounded-full bg-[#4D7C5F] animate-pulse" />
              <span>All Systems Operational</span>
            </div>
          </div>
          <div className="pt-2 border-t border-[#E8E4DC] dark:border-[#34312C] flex flex-col gap-2">
            <Link to="/" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant="outline"
                className="w-full justify-center rounded-xl border-[#E8E4DC] dark:border-[#34312C]"
              >
                Sign In / Console
              </Button>
            </Link>
            <Link to="/request-access" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full justify-center rounded-xl bg-[#C85A32] text-white hover:bg-[#A44422]">
                Request Access
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
