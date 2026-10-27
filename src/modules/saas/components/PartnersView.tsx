import React, { useState, useMemo } from 'react';
import { useSaasPartners, useCreatePartner } from '../hooks/useSaas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Building2,
  Plus,
  KeyRound,
  DollarSign,
  Calendar,
  Search,
  TrendingUp,
  ShieldCheck,
  Check,
  Users,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { SaasPartner } from '../types';

export const PartnersView: React.FC = () => {
  const { data: partners = [], isLoading, refetch } = useSaasPartners();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Partner Form State
  const [partnerName, setPartnerName] = useState('');
  const [spendCap, setSpendCap] = useState('500');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createPartnerMutation = useCreatePartner();
  const { toast } = useToast();

  const filteredPartners = useMemo(() => {
    if (!searchQuery.trim()) return partners;
    const query = searchQuery.toLowerCase().trim();
    return partners.filter((p) => p.name.toLowerCase().includes(query));
  }, [partners, searchQuery]);

  const totalCap = useMemo(
    () => partners.reduce((sum, p) => sum + (p.monthlySpendCap || 0), 0),
    [partners],
  );
  const totalSpend = useMemo(
    () => partners.reduce((sum, p) => sum + (p.currentMonthSpend || 0), 0),
    [partners],
  );
  const totalKeys = useMemo(
    () => partners.reduce((sum, p) => sum + (p.apiKeyCount || 0), 0),
    [partners],
  );

  const handleOpenAddModal = () => {
    setPartnerName('');
    setSpendCap('500');
    setIsAddModalOpen(true);
  };

  const handleCreatePartner = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!partnerName.trim()) {
      toast({
        title: 'Organization name required',
        description: 'Please specify the legal or display name of the partner organization.',
        variant: 'destructive',
      });
      return;
    }

    const capNum = parseFloat(spendCap);
    if (isNaN(capNum) || capNum <= 0) {
      toast({
        title: 'Invalid spend cap',
        description: 'Monthly spend cap must be a positive numerical amount.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createPartnerMutation.mutateAsync({
        name: partnerName.trim(),
        monthlySpendCap: capNum,
      });

      toast({
        title: 'Partner Organization Registered',
        description: `Successfully provisioned ${partnerName.trim()} with a $${capNum.toFixed(2)} monthly quota.`,
      });

      setIsAddModalOpen(false);
      setPartnerName('');
      setSpendCap('500');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register partner';
      toast({
        title: 'Registration Error',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Recently';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="w-full space-y-8 pb-16">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E8E4DC] pb-8 dark:border-[#34312C]">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#F4ECE7] text-[#C85A32] border border-[#E8D6CC] dark:bg-[#2A201C] dark:text-[#E28567] dark:border-[#3D2C24]">
              Multi-Tenant Governance
            </span>
            <span className="text-xs text-stone-400">•</span>
            <span className="text-xs font-mono text-stone-500 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#4D7C5F]"></span>
              Active Quota Pools
            </span>
          </div>
          <h1 className="font-serif text-3xl lg:text-4xl text-stone-900 tracking-tight dark:text-[#EFECE6]">
            Partner Organizations
          </h1>
          <p className="text-[#6E6A64] text-sm lg:text-base font-normal max-w-2xl leading-relaxed dark:text-[#9E988F]">
            Administer enterprise accounts, track month-to-date inference expenditure, and enforce hard monthly budget limits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleOpenAddModal}
            className="h-10 text-xs font-medium px-4 rounded-xl bg-[#C85A32] hover:bg-[#A44422] text-white transition-all shadow-soft-sm dark:bg-[#E28567] dark:hover:bg-[#C85A32] dark:text-[#161514]"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Partner
          </Button>
        </div>
      </div>

      {/* Aggregate Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E8E4DC] rounded-2xl p-5 shadow-soft-sm dark:bg-[#1E1D1A] dark:border-[#34312C]">
          <div className="flex items-center justify-between text-[#6E6A64] dark:text-[#9E988F] mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Total Partners</span>
            <Building2 className="h-4 w-4 text-[#C85A32] dark:text-[#E28567]" />
          </div>
          <div className="text-2xl font-serif font-semibold text-stone-900 dark:text-[#EFECE6]">
            {partners.length}
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {totalKeys} provisioned API credentials
          </p>
        </div>

        <div className="bg-white border border-[#E8E4DC] rounded-2xl p-5 shadow-soft-sm dark:bg-[#1E1D1A] dark:border-[#34312C]">
          <div className="flex items-center justify-between text-[#6E6A64] dark:text-[#9E988F] mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Month Spend vs Cap</span>
            <DollarSign className="h-4 w-4 text-[#4D7C5F]" />
          </div>
          <div className="text-2xl font-mono font-semibold text-stone-900 dark:text-[#EFECE6]">
            ${totalSpend.toFixed(2)}
            <span className="text-xs text-stone-400 font-normal ml-1.5">
              / ${totalCap.toFixed(2)}
            </span>
          </div>
          <div className="mt-2 w-full bg-[#F2EFE9] dark:bg-[#282622] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#C85A32] dark:bg-[#E28567] h-full rounded-full transition-all duration-500"
              style={{
                width: `${totalCap > 0 ? Math.min(100, (totalSpend / totalCap) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-white border border-[#E8E4DC] rounded-2xl p-5 shadow-soft-sm dark:bg-[#1E1D1A] dark:border-[#34312C]">
          <div className="flex items-center justify-between text-[#6E6A64] dark:text-[#9E988F] mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Aggregated Usage</span>
            <TrendingUp className="h-4 w-4 text-[#C85A32] dark:text-[#E28567]" />
          </div>
          <div className="text-2xl font-mono font-semibold text-stone-900 dark:text-[#EFECE6]">
            {totalCap > 0 ? ((totalSpend / totalCap) * 100).toFixed(1) : '0.0'}%
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Global budget utilization across pool
          </p>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search partner organization..."
            className="pl-9 h-10 rounded-xl bg-white border-[#E8E4DC] text-sm dark:bg-[#1E1D1A] dark:border-[#34312C]"
          />
        </div>
        <div className="text-xs font-mono text-stone-500 flex items-center gap-1.5 self-end sm:self-center">
          Showing {filteredPartners.length} of {partners.length} organizations
        </div>
      </div>

      {/* Partners List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-[#F2EFE9]/60 dark:bg-[#282622]/60 animate-pulse border border-[#E8E4DC] dark:border-[#34312C]"
            />
          ))}
        </div>
      ) : filteredPartners.length === 0 ? (
        <div className="bg-white border border-dashed border-[#E8E4DC] rounded-2xl p-12 text-center shadow-soft-sm dark:bg-[#1E1D1A] dark:border-[#34312C]">
          <div className="w-12 h-12 rounded-2xl bg-[#F4ECE7] text-[#C85A32] flex items-center justify-center mx-auto mb-4 dark:bg-[#2A201C] dark:text-[#E28567]">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="font-serif text-lg text-stone-900 font-medium dark:text-[#EFECE6]">
            {searchQuery ? 'No matching partners found' : 'No partner organizations registered yet'}
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-6">
            {searchQuery
              ? 'Try refining your query or clear the filter to see all partners.'
              : 'Create an enterprise partner organization to provision pooled API credentials with dedicated spend ceilings.'}
          </p>
          <Button
            onClick={handleOpenAddModal}
            className="rounded-xl bg-[#C85A32] hover:bg-[#A44422] text-white text-xs h-9 px-4 dark:bg-[#E28567] dark:hover:bg-[#C85A32] dark:text-[#161514]"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add First Partner
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPartners.map((partner) => {
            const spendCapVal = partner.monthlySpendCap || 100;
            const spendVal = partner.currentMonthSpend || 0;
            const percent = Math.min(100, Math.round((spendVal / spendCapVal) * 100));

            const isNearCap = percent >= 80 && percent < 100;
            const isAtCap = percent >= 100;

            let progressColor = 'bg-[#4D7C5F]'; // sage
            if (isNearCap) progressColor = 'bg-amber-500';
            if (isAtCap) progressColor = 'bg-rose-500';

            return (
              <div
                key={partner.id}
                className="bg-white border border-[#E8E4DC] rounded-2xl p-6 shadow-soft-sm hover:border-[#D4CEBF] transition-all dark:bg-[#1E1D1A] dark:border-[#34312C] dark:hover:border-[#4A463F]"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Partner Identity */}
                  <div className="flex items-start gap-4 min-w-[240px]">
                    <div className="p-3 rounded-xl bg-[#F4ECE7] text-[#C85A32] shrink-0 border border-[#E8D6CC] dark:bg-[#2A201C] dark:text-[#E28567] dark:border-[#3D2C24]">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-lg font-medium text-stone-900 dark:text-[#EFECE6]">
                          {partner.name}
                        </h3>
                        {isAtCap ? (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900">
                            Cap Reached
                          </span>
                        ) : isNearCap ? (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900">
                            Near Limit
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#EAF3ED] text-[#4D7C5F] border border-[#D4E2D7] dark:bg-[#1E2E23] dark:text-[#78A78A] dark:border-[#2C4434]">
                            Operational
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-stone-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-stone-400" />
                          Joined {formatDate(partner.createdAt)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <KeyRound className="h-3.5 w-3.5 text-stone-400" />
                          {partner.apiKeyCount || 0} {(partner.apiKeyCount || 0) === 1 ? 'key' : 'keys'} linked
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Spend Progress Bar & Cap Details */}
                  <div className="flex-1 max-w-lg space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-stone-500">
                        Monthly Spend:{' '}
                        <strong className="text-stone-900 dark:text-[#EFECE6] font-semibold">
                          ${spendVal.toFixed(2)}
                        </strong>
                      </span>
                      <span className="text-stone-500">
                        Cap:{' '}
                        <strong className="text-stone-900 dark:text-[#EFECE6] font-semibold">
                          ${spendCapVal.toFixed(2)}
                        </strong>{' '}
                        ({percent}%)
                      </span>
                    </div>

                    <div className="w-full bg-[#F2EFE9] dark:bg-[#282622] h-2 rounded-full overflow-hidden">
                      <div
                        className={`${progressColor} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-400">
                      <span>Reset on 1st of next month</span>
                      <span>
                        Remaining: ${(Math.max(0, spendCapVal - spendVal)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Partner Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E8E4DC] p-6 shadow-soft-float rounded-2xl dark:bg-[#1E1D1A] dark:border-[#34312C]">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#F4ECE7] text-[#C85A32] border border-[#E8D6CC] dark:bg-[#2A201C] dark:text-[#E28567] dark:border-[#3D2C24]">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-serif text-2xl font-normal text-stone-900 dark:text-[#EFECE6]">
                  Register Partner
                </DialogTitle>
                <DialogDescription className="text-xs text-[#6E6A64] dark:text-[#9E988F]">
                  Establish a corporate partner account with a designated monthly budget.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreatePartner} className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-stone-600 dark:text-stone-300">
                Partner / Organization Name
              </label>
              <Input
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder="e.g. Acme AI, Cursor Labs, HyperScale Inc"
                className="rounded-xl h-10 border-[#E8E4DC] dark:bg-[#161514] dark:border-[#34312C]"
                autoFocus
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-stone-600 dark:text-stone-300">
                Monthly Spend Cap (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-sm">
                  $
                </span>
                <Input
                  type="number"
                  step="10"
                  min="10"
                  value={spendCap}
                  onChange={(e) => setSpendCap(e.target.value)}
                  placeholder="500.00"
                  className="pl-8 rounded-xl h-10 font-mono border-[#E8E4DC] dark:bg-[#161514] dark:border-[#34312C]"
                  required
                />
              </div>

              {/* Quick Select Presets */}
              <div className="flex items-center gap-2 pt-1">
                {['100', '250', '500', '1000', '2500'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSpendCap(val)}
                    className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all ${
                      spendCap === val
                        ? 'bg-[#F4ECE7] text-[#C85A32] border-[#E8D6CC] font-semibold dark:bg-[#2A201C] dark:text-[#E28567] dark:border-[#3D2C24]'
                        : 'bg-white hover:bg-stone-50 text-stone-600 border-[#E8E4DC] dark:bg-[#1E1D1A] dark:hover:bg-[#282622] dark:text-stone-300 dark:border-[#34312C]'
                    }`}
                  >
                    ${val}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] text-xs text-stone-600 space-y-1 dark:bg-[#161514] dark:border-[#34312C] dark:text-stone-400">
              <div className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#4D7C5F]" />
                Enforcement Policy
              </div>
              <p className="text-[11px] leading-relaxed">
                When monthly spend hits the defined ceiling, incoming requests via partner keys will return HTTP 429 Quota Exceeded until the budget is elevated or auto-reset next month.
              </p>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl h-10 text-xs border-[#E8E4DC] dark:border-[#34312C]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !partnerName.trim()}
                className="rounded-xl h-10 text-xs font-medium bg-[#C85A32] hover:bg-[#A44422] text-white transition-all shadow-soft-sm dark:bg-[#E28567] dark:hover:bg-[#C85A32] dark:text-[#161514]"
              >
                {isSubmitting ? 'Registering...' : 'Provision Partner'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
