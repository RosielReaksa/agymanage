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
import { useAddCredits } from '../hooks/useSaas';
import { Coins, Check, Sparkles } from 'lucide-react';

interface AddCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance?: number;
}

const PRESET_AMOUNTS = [10, 25, 50, 100];

export const AddCreditsModal: React.FC<AddCreditsModalProps> = ({
  open,
  onOpenChange,
  currentBalance = 0,
}) => {
  const [amount, setAmount] = useState<number>(25);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const { toast } = useToast();
  const addCreditsMutation = useAddCredits();

  const selectedAmount = isCustom ? parseFloat(customAmount) || 0 : amount;

  const handleTopUp = async () => {
    if (selectedAmount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter an amount greater than $0',
        variant: 'destructive',
      });
      return;
    }

    try {
      await addCreditsMutation.mutateAsync({ amount: selectedAmount });
      toast({
        title: 'Credits added successfully',
        description: `$${selectedAmount.toFixed(2)} added to your gateway balance.`,
      });
      onOpenChange(false);
      setIsCustom(false);
      setCustomAmount('');
      setAmount(25);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add credits';
      toast({
        title: 'Transaction failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white border border-[#E8E4DC] p-6 shadow-soft-float rounded-2xl dark:bg-[#1E1D1A] dark:border-[#34312C]">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#F4ECE7] text-[#C85A32] dark:bg-[#2A201C] dark:text-[#E28567]">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-serif text-2xl font-normal text-stone-900 dark:text-[#EFECE6]">
                Add Balance Credits
              </DialogTitle>
              <DialogDescription className="text-xs text-[#6E6A64] dark:text-[#9E988F]">
                Current balance:{' '}
                <strong className="text-stone-900 dark:text-[#EFECE6] font-mono">
                  ${currentBalance.toFixed(2)}
                </strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="text-xs font-mono uppercase tracking-wider text-[#6E6A64] dark:text-[#9E988F]">
            Select Top-Up Tier
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {PRESET_AMOUNTS.map((val) => {
              const isSelected = !isCustom && amount === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setIsCustom(false);
                    setAmount(val);
                  }}
                  className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-[#C85A32] bg-[#F4ECE7]/60 text-[#C85A32] font-semibold dark:border-[#E28567] dark:bg-[#2A201C]'
                      : 'border-[#E8E4DC] bg-white text-stone-800 hover:bg-[#FAF8F5] dark:border-[#34312C] dark:bg-[#1E1D1A] dark:text-[#EFECE6] dark:hover:bg-[#282622]'
                  }`}
                >
                  <span className="font-mono text-base">${val}.00</span>
                  {isSelected && <Check className="h-4 w-4 text-[#C85A32] dark:text-[#E28567]" />}
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsCustom(true)}
              className="text-xs font-medium text-[#C85A32] hover:underline dark:text-[#E28567]"
            >
              Or enter custom amount
            </button>

            {isCustom && (
              <div className="mt-2 flex items-center gap-2">
                <span className="font-mono text-stone-500">$</span>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 150"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="font-mono text-sm bg-[#FAF8F5] border-[#E8E4DC] rounded-xl dark:bg-[#161514] dark:border-[#34312C]"
                  autoFocus
                />
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] text-xs text-[#6E6A64] space-y-1.5 dark:bg-[#161514] dark:border-[#34312C] dark:text-[#9E988F]">
            <div className="flex items-center gap-1.5 font-medium text-stone-800 dark:text-[#EFECE6]">
              <Sparkles className="h-3.5 w-3.5 text-[#C85A32] dark:text-[#E28567]" />
              Pay-as-you-go High-Throughput Routing
            </div>
            <p className="leading-relaxed">
              Credits never expire. Usage is billed strictly per prompt and completion tokens across pooled provider accounts.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border-[#E8E4DC] hover:bg-[#F2EFE9] text-stone-700 dark:border-[#34312C] dark:text-[#EFECE6]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleTopUp}
            disabled={addCreditsMutation.isPending || selectedAmount <= 0}
            className="rounded-xl bg-[#C85A32] hover:bg-[#A44422] text-white shadow-soft-sm font-medium dark:bg-[#E28567] dark:hover:bg-[#C85A32] dark:text-[#161514]"
          >
            {addCreditsMutation.isPending ? 'Processing...' : `Add $${selectedAmount.toFixed(2)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
