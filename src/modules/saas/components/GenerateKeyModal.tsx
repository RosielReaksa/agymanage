import React, { useState } from 'react';
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
import { useCreateKey } from '../hooks/useSaas';
import { KeyRound, Copy, Check, AlertTriangle } from 'lucide-react';
import type { CreatedSaasApiKey } from '../types';

interface GenerateKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeyCreated?: (key: CreatedSaasApiKey) => void;
}

export const GenerateKeyModal: React.FC<GenerateKeyModalProps> = ({
  open,
  onOpenChange,
  onKeyCreated,
}) => {
  const [name, setName] = useState<string>('');
  const [createdKey, setCreatedKey] = useState<CreatedSaasApiKey | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const { toast } = useToast();
  const createKeyMutation = useCreateKey();

  const handleCreate = async () => {
    try {
      const keyName = name.trim() || 'API Key';
      const result = await createKeyMutation.mutateAsync({ name: keyName, label: keyName });
      setCreatedKey(result);
      if (onKeyCreated) {
        onKeyCreated(result);
      }
      toast({
        title: 'API Key Generated',
        description: `Key "${keyName}" was successfully provisioned.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate key';
      toast({
        title: 'Error generating key',
        description: msg,
        variant: 'destructive',
      });
    }
  };

  const handleCopy = () => {
    if (!createdKey) return;
    const rawSecret = createdKey.apiKey || createdKey.key || '';
    if (!rawSecret) return;
    navigator.clipboard.writeText(rawSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied to clipboard',
      description: 'API key has been copied.',
    });
  };

  const handleClose = () => {
    setCreatedKey(null);
    setName('');
    setCopied(false);
    onOpenChange(false);
  };

  const secretText = createdKey?.apiKey || createdKey?.key || '';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-white border border-[#E8E4DC] p-6 shadow-soft-float rounded-2xl dark:bg-[#1E1D1A] dark:border-[#34312C]">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#F4ECE7] text-[#C85A32] dark:bg-[#2A201C] dark:text-[#E28567]">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-serif text-2xl font-normal text-stone-900 dark:text-[#EFECE6]">
                {createdKey ? 'Secret Key Created' : 'Create New API Key'}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#6E6A64] dark:text-[#9E988F]">
                {createdKey
                  ? 'Store this secret key securely. You will not be able to view it again.'
                  : 'Provision a new secret key for agent pipelines, IDEs, or CLI tools.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!createdKey ? (
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-[#6E6A64] dark:text-[#9E988F]">
                Key Identifier / Label
              </label>
              <Input
                placeholder="e.g. Claude Code Agent, Cursor Pro, Local CLI"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="font-sans text-sm bg-[#FAF8F5] border-[#E8E4DC] rounded-xl dark:bg-[#161514] dark:border-[#34312C]"
                autoFocus
              />
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] text-xs text-[#6E6A64] space-y-1 dark:bg-[#161514] dark:border-[#34312C] dark:text-[#9E988F]">
              <div className="font-semibold text-stone-800 dark:text-[#EFECE6]">
                Security Specification
              </div>
              <p className="leading-relaxed">
                Keys inherit your account quota and balance. You can revoke or rotate keys at any time from this dashboard.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="rounded-xl border-[#E8E4DC] hover:bg-[#F2EFE9] text-stone-700 dark:border-[#34312C] dark:text-[#EFECE6]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createKeyMutation.isPending}
                className="rounded-xl bg-[#C85A32] hover:bg-[#A44422] text-white shadow-soft-sm font-medium dark:bg-[#E28567] dark:hover:bg-[#C85A32] dark:text-[#161514]"
              >
                {createKeyMutation.isPending ? 'Generating...' : 'Generate Secret Key'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-3">
            <div className="p-3.5 rounded-xl bg-[#FFF8EB] border border-[#F3E2BD] text-xs text-[#966418] flex items-start gap-2.5 dark:bg-[#2B2314] dark:border-[#4B3B20] dark:text-[#D9A554]">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong>Important:</strong> Copy this secret key now. For your security, it will only be revealed once.
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-[#6E6A64] dark:text-[#9E988F]">
                  {createdKey.name || createdKey.label}
                </span>
                <span className="text-xs text-stone-400">Just now</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 font-mono text-sm bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl px-4 py-2.5 text-stone-900 select-all break-all dark:bg-[#161514] dark:border-[#34312C] dark:text-[#EFECE6]">
                  {secretText}
                </div>
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="rounded-xl border-[#E8E4DC] hover:bg-[#F2EFE9] px-3.5 shrink-0 dark:border-[#34312C]"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-[#4D7C5F]" />
                  ) : (
                    <Copy className="h-4 w-4 text-stone-600 dark:text-[#EFECE6]" />
                  )}
                  <span className="ml-1.5 text-xs font-medium">{copied ? 'Copied' : 'Copy'}</span>
                </Button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                onClick={handleClose}
                className="w-full rounded-xl bg-[#C85A32] hover:bg-[#A44422] text-white shadow-soft-sm font-medium dark:bg-[#E28567] dark:hover:bg-[#C85A32] dark:text-[#161514]"
              >
                I have saved this key
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
