import React, { useState, useMemo } from 'react';
import {
  useSaasAccessRequests,
  useApproveAccessRequest,
  useRejectAccessRequest,
} from '../hooks/useSaas';
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
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Building2,
  Mail,
  Zap,
  Copy,
  Check,
  KeyRound,
  ShieldAlert,
  Sparkles,
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react';
import type { SaasAccessRequest, CreatedSaasApiKey, SaaSUser } from '../types';

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

export const AccessRequestsView: React.FC = () => {
  const { data: requests = [], isLoading } = useSaasAccessRequests();
  const approveMutation = useApproveAccessRequest();
  const rejectMutation = useRejectAccessRequest();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Approval Key Modal State
  const [approvedKeyModalOpen, setApprovedKeyModalOpen] = useState(false);
  const [approvedDetails, setApprovedDetails] = useState<{
    request: SaasAccessRequest;
    user: SaaSUser;
    key: CreatedSaasApiKey;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Loading states per item ID
  const [processingId, setProcessingId] = useState<string | null>(null);

  const counts = useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter((r) => r.status === 'pending').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    let list = requests;
    if (activeTab !== 'all') {
      list = list.filter((r) => r.status === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          (r.organization && r.organization.toLowerCase().includes(q)) ||
          (r.useCase && r.useCase.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [requests, activeTab, searchQuery]);

  const handleApprove = async (request: SaasAccessRequest) => {
    setProcessingId(request.id);
    try {
      const result = await approveMutation.mutateAsync({ id: request.id });
      setApprovedDetails(result);
      setApprovedKeyModalOpen(true);
      toast({
        title: 'Access Request Approved',
        description: `Account created for ${request.email} with $25.00 starting credits.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to approve request';
      toast({
        title: 'Approval Failed',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: SaasAccessRequest) => {
    setProcessingId(request.id);
    try {
      await rejectMutation.mutateAsync({ id: request.id });
      toast({
        title: 'Request Declined',
        description: `Marked application from ${request.email} as rejected.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reject request';
      toast({
        title: 'Rejection Failed',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCopySecretKey = () => {
    if (!approvedDetails?.key) return;
    const secret = approvedDetails.key.apiKey || approvedDetails.key.key || '';
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Secret Key Copied',
      description: 'API key copied to clipboard for delivery to the partner.',
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-full space-y-8 pb-16">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E8E4DC] pb-8 dark:border-[#34312C]">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#F4ECE7] text-[#C85A32] border border-[#E8D6CC] dark:bg-[#2A201C] dark:text-[#E28567] dark:border-[#3D2C24]">
              Admin Review Queue
            </span>
            <span className="text-xs text-stone-400">•</span>
            <span className="text-xs font-mono text-stone-500 flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${counts.pending > 0 ? 'bg-[#C85A32] animate-pulse' : 'bg-[#4D7C5F]'}`}></span>
              {counts.pending} Pending Review
            </span>
          </div>
          <h1 className="font-serif text-3xl lg:text-4xl text-stone-900 tracking-tight dark:text-[#EFECE6]">
            Access Requests
          </h1>
          <p className="text-[#6E6A64] text-sm lg:text-base font-normal max-w-2xl leading-relaxed dark:text-[#9E988F]">
            Review inbound partner and enterprise access submissions. 1-click approvals automatically provision tenant accounts, assign $25.00 in starter credits, and generate live secret keys.
          </p>
        </div>

        {/* Aggregate Counters */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-white border border-[#E8E4DC] rounded-2xl px-4 py-2.5 shadow-soft-sm flex items-center gap-3 dark:bg-[#1E1D1A] dark:border-[#34312C]">
            <Clock className="h-4 w-4 text-[#C85A32] dark:text-[#E28567]" />
            <div>
              <div className="text-[10px] font-mono uppercase text-stone-400">Queue Depth</div>
              <div className="font-mono text-sm font-semibold text-stone-900 dark:text-[#EFECE6]">
                {counts.pending} pending
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F2EFE9] dark:bg-[#282622] rounded-xl border border-[#E8E4DC] dark:border-[#34312C]">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-white text-stone-900 shadow-soft-sm dark:bg-[#1E1D1A] dark:text-[#EFECE6]'
                : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            <span>Pending</span>
            {counts.pending > 0 && (
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-[#F4ECE7] text-[#C85A32] border border-[#E8D6CC] dark:bg-[#2A201C] dark:text-[#E28567] dark:border-[#3D2C24]">
                {counts.pending}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('approved')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'approved'
                ? 'bg-white text-stone-900 shadow-soft-sm dark:bg-[#1E1D1A] dark:text-[#EFECE6]'
                : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            <span>Approved</span>
            <span className="font-mono text-[10px] text-stone-400">
              ({counts.approved})
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'rejected'
                ? 'bg-white text-stone-900 shadow-soft-sm dark:bg-[#1E1D1A] dark:text-[#EFECE6]'
                : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            <span>Rejected</span>
            <span className="font-mono text-[10px] text-stone-400">
              ({counts.rejected})
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-white text-stone-900 shadow-soft-sm dark:bg-[#1E1D1A] dark:text-[#EFECE6]'
                : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            <span>All Requests</span>
            <span className="font-mono text-[10px] text-stone-400">
              ({counts.all})
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter requests..."
            className="pl-9 h-9 text-xs rounded-xl bg-white border-[#E8E4DC] dark:bg-[#1E1D1A] dark:border-[#34312C]"
          />
        </div>
      </div>

      {/* Requests Queue */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-[#F2EFE9]/60 dark:bg-[#282622]/60 animate-pulse border border-[#E8E4DC] dark:border-[#34312C]"
            />
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white border border-dashed border-[#E8E4DC] rounded-2xl p-12 text-center shadow-soft-sm dark:bg-[#1E1D1A] dark:border-[#34312C]">
          <div className="w-12 h-12 rounded-2xl bg-[#F4ECE7] text-[#C85A32] flex items-center justify-center mx-auto mb-4 dark:bg-[#2A201C] dark:text-[#E28567]">
            <Inbox className="h-6 w-6" />
          </div>
          <h3 className="font-serif text-lg text-stone-900 font-medium dark:text-[#EFECE6]">
            No applications in this view
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
            {activeTab === 'pending'
              ? 'All incoming access requests have been processed! Great job maintaining zero inbox.'
              : 'No applications found matching the selected filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isProcessing = processingId === req.id;
            const isPending = req.status === 'pending';
            const isApproved = req.status === 'approved';
            const isRejected = req.status === 'rejected';

            return (
              <div
                key={req.id}
                className="bg-white border border-[#E8E4DC] rounded-2xl p-6 shadow-soft-sm hover:border-[#D4CEBF] transition-all dark:bg-[#1E1D1A] dark:border-[#34312C] dark:hover:border-[#4A463F]"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  {/* Left Column: Applicant Meta & Bio */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-serif text-xl font-medium text-stone-900 dark:text-[#EFECE6]">
                        {req.name}
                      </h3>

                      {/* Status Badges */}
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          Pending Review
                        </span>
                      )}
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-[#EAF3ED] text-[#4D7C5F] border border-[#D4E2D7] dark:bg-[#1E2E23] dark:text-[#78A78A] dark:border-[#2C4434]">
                          <CheckCircle2 className="h-3 w-3" />
                          Approved & Credited
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700">
                          <XCircle className="h-3 w-3" />
                          Declined
                        </span>
                      )}

                      <span className="text-xs text-stone-400">•</span>
                      <span className="text-xs font-mono text-stone-500">
                        Submitted {formatDate(req.createdAt)}
                      </span>
                    </div>

                    {/* Contact & Organization tags */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-stone-600 dark:text-stone-400">
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-stone-400" />
                        {req.email}
                      </span>
                      {req.organization && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1.5 font-medium text-stone-800 dark:text-stone-200">
                            <Building2 className="h-3.5 w-3.5 text-[#C85A32] dark:text-[#E28567]" />
                            {req.organization}
                          </span>
                        </>
                      )}
                      {req.estimatedVolume && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1.5 bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#E8E4DC] dark:bg-[#161514] dark:border-[#34312C]">
                            <Zap className="h-3 w-3 text-amber-500" />
                            Est. Volume: {req.estimatedVolume}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Use Case Narrative */}
                    {req.useCase && (
                      <div className="bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl p-3.5 text-xs text-stone-700 leading-relaxed dark:bg-[#161514] dark:border-[#34312C] dark:text-stone-300">
                        <div className="text-[10px] font-mono uppercase text-stone-400 tracking-wider mb-1">
                          Intended Workload & Architectural Use Case
                        </div>
                        {req.useCase}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex sm:flex-col items-center justify-end gap-2 shrink-0 self-end sm:self-center">
                    {isPending ? (
                      <>
                        <Button
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => handleApprove(req)}
                          className="h-9 px-4 rounded-xl text-xs font-medium bg-[#C85A32] hover:bg-[#A44422] text-white shadow-soft-sm transition-all dark:bg-[#E28567] dark:hover:bg-[#C85A32] dark:text-[#161514]"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                          {isProcessing ? 'Provisioning...' : 'Approve & Credit $25'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isProcessing}
                          onClick={() => handleReject(req)}
                          className="h-9 px-3 rounded-xl text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-100 dark:hover:bg-[#282622] dark:hover:text-stone-200"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1 text-stone-400" />
                          Decline
                        </Button>
                      </>
                    ) : isApproved ? (
                      <div className="text-right">
                        <span className="text-[11px] font-mono text-[#4D7C5F] flex items-center gap-1.5">
                          <Check className="h-4 w-4" />
                          Provisioned Active
                        </span>
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="text-[11px] font-mono text-stone-400">
                          Application Archived
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Auto-Generated Key Modal After 1-Click Approval */}
      <Dialog open={approvedKeyModalOpen} onOpenChange={setApprovedKeyModalOpen}>
        <DialogContent className="max-w-lg bg-white border border-[#E8E4DC] p-6 shadow-soft-float rounded-2xl dark:bg-[#1E1D1A] dark:border-[#34312C]">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#EAF3ED] text-[#4D7C5F] border border-[#D4E2D7] dark:bg-[#1E2E23] dark:text-[#78A78A] dark:border-[#2C4434]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-serif text-2xl font-normal text-stone-900 dark:text-[#EFECE6]">
                  Partner Account Provisioned
                </DialogTitle>
                <DialogDescription className="text-xs text-[#6E6A64] dark:text-[#9E988F]">
                  Starting balance of $25.00 has been credited. Deliver the secret API key below to the partner.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {approvedDetails && (
            <div className="space-y-4 py-3">
              {/* Recipient Details */}
              <div className="grid grid-cols-2 gap-3 text-xs p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] dark:bg-[#161514] dark:border-[#34312C]">
                <div>
                  <span className="text-[10px] font-mono uppercase text-stone-400 block">
                    Account Email
                  </span>
                  <span className="font-medium text-stone-800 dark:text-stone-200 font-mono">
                    {approvedDetails.user.email}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-stone-400 block">
                    Starter Credits
                  </span>
                  <span className="font-medium text-[#4D7C5F] font-mono font-semibold">
                    ${approvedDetails.user.balanceUsd?.toFixed(2) ?? '25.00'} USD
                  </span>
                </div>
              </div>

              {/* Secret API Key Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono uppercase tracking-wider text-stone-600 dark:text-stone-300">
                    Generated API Secret Key
                  </span>
                  <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
                    One-time view
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl px-3.5 py-2.5 font-mono text-xs text-stone-900 select-all overflow-x-auto dark:bg-[#161514] dark:border-[#34312C] dark:text-[#EFECE6]">
                    {approvedDetails.key.apiKey || approvedDetails.key.key}
                  </div>
                  <Button
                    onClick={handleCopySecretKey}
                    className="h-10 px-4 rounded-xl text-xs font-medium bg-[#C85A32] hover:bg-[#A44422] text-white transition-all shadow-soft-sm dark:bg-[#E28567] dark:hover:bg-[#C85A32] dark:text-[#161514]"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1 text-white" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy Key
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Note on Security */}
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] text-xs text-stone-600 space-y-1 dark:bg-[#161514] dark:border-[#34312C] dark:text-stone-400">
                <p className="text-[11px] leading-relaxed">
                  This key allows bearer authentication against <code className="font-mono text-[10px] bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded">/v1/chat/completions</code>. It is scoped to the partner's account and balance.
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  onClick={() => setApprovedKeyModalOpen(false)}
                  className="rounded-xl h-10 text-xs w-full bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-200 dark:hover:bg-white dark:text-stone-900"
                >
                  Done & Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
