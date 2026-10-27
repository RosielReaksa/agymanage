import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import { cn } from '@/shared/ui/utils';
import { StatusBar } from '@/components/layout/StatusBar';
import {
  LayoutDashboard,
  Settings,
  Network,
  Rocket,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Activity,
  Layers,
  Sparkles,
  Plus,
  Coins,
  Bot,
  Building2,
  Inbox,
  Terminal,
  Globe,
  ArrowUpRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ErrorBoundary } from 'react-error-boundary';
import { useToast } from '@/components/ui/use-toast';
import { getLocalizedErrorMessage } from '@/shared/utils/errorMessages';
import { useSaasUser, useSaasAccessRequests } from '@/modules/saas/hooks/useSaas';
import { AddCreditsModal } from '@/modules/saas/components/AddCreditsModal';

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const hasShownRouteErrorToastRef = useRef(false);

  const { data: user } = useSaasUser();
  const { data: accessRequests = [] } = useSaasAccessRequests();
  const pendingRequestsCount = accessRequests.filter((r) => r.status === 'pending').length;

  const [addCreditsOpen, setAddCreditsOpen] = useState(false);

  // Initialize state from localStorage if available, default to false (expanded)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Persist state changes
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const navItems = [
    {
      to: '/',
      icon: Sparkles,
      label: t('nav.overview', 'Gateway Overview'),
    },
    {
      to: '/playground',
      icon: Terminal,
      label: t('nav.playground', 'Playground'),
    },
    {
      to: '/partners',
      icon: Building2,
      label: t('nav.partners', 'Partners'),
    },
    {
      to: '/access-requests',
      icon: Inbox,
      label: t('nav.accessRequests', 'Access Requests'),
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
    },
    {
      to: '/pool',
      icon: Layers,
      label: t('nav.pool', 'Provider Pool'),
    },
    {
      to: '/proxy',
      icon: Network,
      label: t('nav.proxy', 'Proxy Routing'),
    },
    {
      to: '/traffic',
      icon: Activity,
      label: t('nav.traffic', 'Traffic Audit'),
    },
    {
      to: '/settings',
      icon: Settings,
      label: t('nav.settings', 'Settings'),
    },
  ];

  const currentBalance = user?.balance ?? 25.0;

  return (
    <div className="bg-background text-foreground flex h-screen flex-col overflow-hidden font-sans selection:bg-[#F4ECE7] selection:text-[#C85A32] dark:selection:bg-[#2A201C] dark:selection:text-[#E28567]">
      {/* Top Application Header Bar */}
      <header className="border-b border-border bg-background/85 backdrop-blur-md sticky top-0 z-40 shrink-0">
        <div className="px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#F4ECE7] text-[#C85A32] border border-[#E8D6CC] flex h-8 w-8 shrink-0 items-center justify-center rounded-xl dark:bg-[#2A201C] dark:text-[#E28567] dark:border-[#3D2C24]">
              <Rocket className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg tracking-tight font-medium text-stone-900 dark:text-[#EFECE6]">
                Antigravity
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-[#F4ECE7] text-[#C85A32] border border-[#E8D6CC] dark:bg-[#2A201C] dark:text-[#E28567] dark:border-[#3D2C24]">
                Gateway
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={'/landing' as any}
              className="h-8 text-xs font-medium px-3 rounded-xl border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-all shadow-soft-sm"
            >
              <Globe className="h-3.5 w-3.5 text-stone-400" />
              <span>Public Site</span>
              <ArrowUpRight className="h-3 w-3 text-stone-400" />
            </Link>

            <div className="font-mono text-xs px-3 py-1.5 rounded-full bg-card border border-border text-muted-foreground flex items-center gap-2 shadow-soft-sm">
              <span className="h-2 w-2 rounded-full bg-[#4D7C5F] animate-pulse"></span>
              <span>
                Balance:{' '}
                <strong className="text-foreground font-semibold">
                  ${currentBalance.toFixed(2)}
                </strong>
              </span>
            </div>

            <Button
              size="sm"
              onClick={() => setAddCreditsOpen(true)}
              className="h-8 text-xs font-medium px-3.5 rounded-xl bg-[#C85A32] hover:bg-[#A44422] text-white transition-all shadow-soft-sm dark:bg-[#E28567] dark:hover:bg-[#C85A32] dark:text-[#161514]"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Credits
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            'bg-sidebar text-sidebar-foreground border-sidebar-border flex shrink-0 flex-col border-r select-none transition-all duration-200',
            isCollapsed ? 'w-16' : 'w-56',
          )}
        >
          <nav aria-label={t('nav.navigation')} className="flex-1 space-y-1.5 px-2.5 pt-4">
            <TooltipProvider>
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.to} delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Link
                          to={item.to}
                          aria-current={isActive ? 'page' : undefined}
                          className={cn(
                            'focus-visible:ring-ring mx-auto flex h-10 w-10 cursor-default items-center justify-center rounded-xl outline-none focus-visible:ring-2 transition-all',
                            isActive
                              ? 'bg-sidebar-accent text-[#C85A32] dark:text-[#E28567] ring-sidebar-border ring-1 ring-inset font-semibold shadow-soft-sm'
                              : 'hover:bg-sidebar-accent/70 text-muted-foreground hover:text-foreground',
                          )}
                        >
                          <div className="relative">
                            <item.icon className="h-4 w-4" aria-hidden="true" />
                            {typeof item.badge === 'number' && item.badge > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#C85A32] text-[9px] font-mono text-white">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <span className="sr-only">{item.label}</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <div className="flex items-center gap-1.5">
                          <span>{item.label}</span>
                          {typeof item.badge === 'number' && item.badge > 0 && (
                            <span className="font-mono text-[10px] text-[#C85A32]">
                              ({item.badge})
                            </span>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'focus-visible:ring-ring flex h-10 cursor-default items-center justify-between rounded-xl px-3.5 text-sm outline-none focus-visible:ring-2 transition-all',
                      isActive
                        ? 'bg-sidebar-accent text-[#C85A32] dark:text-[#E28567] ring-sidebar-border font-semibold ring-1 ring-inset shadow-soft-sm'
                        : 'hover:bg-sidebar-accent/70 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-[#F4ECE7] text-[#C85A32] border border-[#E8D6CC] dark:bg-[#2A201C] dark:text-[#E28567] dark:border-[#3D2C24]">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </TooltipProvider>
          </nav>

          <div className="space-y-2 border-t border-sidebar-border p-2.5">
            <Button
              variant="ghost"
              className={cn(
                'text-muted-foreground h-9 w-full justify-start px-3 text-xs rounded-xl hover:bg-sidebar-accent',
                isCollapsed && 'justify-center px-0',
              )}
              aria-label={t(isCollapsed ? 'nav.expand-sidebar' : 'nav.collapse-sidebar')}
              aria-expanded={!isCollapsed}
              title={t(isCollapsed ? 'nav.expand-sidebar' : 'nav.collapse-sidebar')}
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              )}
              {!isCollapsed && t('nav.collapse-sidebar', 'Collapse')}
            </Button>
            <StatusBar isCollapsed={isCollapsed} />
          </div>
        </aside>

        {/* Content Area */}
        <main className="min-w-0 flex-1 overflow-auto bg-background">
          <ErrorBoundary
            resetKeys={[location.pathname]}
            onReset={() => {
              hasShownRouteErrorToastRef.current = false;
            }}
            onError={(error) => {
              if (hasShownRouteErrorToastRef.current) {
                return;
              }

              toast({
                error,
                title: t('error.generic'),
                description: getLocalizedErrorMessage(error, t),
                variant: 'destructive',
              });
              hasShownRouteErrorToastRef.current = true;
            }}
            fallbackRender={({ resetErrorBoundary }) => (
              <div className="mx-auto max-w-3xl p-6">
                <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card shadow-soft-sm">
                  <div className="text-lg font-serif font-semibold">{t('error.generic')}</div>
                  <div className="text-muted-foreground mt-2 text-sm">{t('action.retry')}</div>
                  <Button className="mt-4 rounded-xl bg-[#C85A32] hover:bg-[#A44422] text-white" onClick={resetErrorBoundary}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('action.retry')}
                  </Button>
                </div>
              </div>
            )}
          >
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <AddCreditsModal
        open={addCreditsOpen}
        onOpenChange={setAddCreditsOpen}
        currentBalance={currentBalance}
      />
    </div>
  );
};
