import { createFileRoute } from '@tanstack/react-router';
import { PlaygroundView } from '@/modules/saas/components/PlaygroundView';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { getLocalizedErrorMessage } from '@/shared/utils/errorMessages';
import { RefreshCw } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

function PlaygroundPage() {
  return (
    <div className="w-full h-full flex flex-col flex-1 overflow-hidden">
      <PlaygroundView />
    </div>
  );
}

function PlaygroundPageErrorBoundary({ error, reset }: { error: unknown; reset: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const hasShownToastRef = useRef(false);

  useEffect(() => {
    if (hasShownToastRef.current) {
      return;
    }

    toast({
      error,
      title: t('error.generic', 'An error occurred'),
      description: getLocalizedErrorMessage(error, t),
      variant: 'destructive',
    });
    hasShownToastRef.current = true;
  }, [error, t, toast]);

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="rounded-2xl border border-dashed border-[#E8E4DC] p-8 text-center bg-white shadow-soft-sm dark:bg-[#1E1D1A] dark:border-[#34312C]">
        <div className="text-lg font-serif font-semibold text-stone-900 dark:text-[#EFECE6]">
          {t('error.generic', 'Something went wrong')}
        </div>
        <div className="text-muted-foreground mt-2 text-sm">
          {getLocalizedErrorMessage(error, t)}
        </div>
        <Button
          className="mt-4 rounded-xl bg-[#C85A32] hover:bg-[#A44422] text-white"
          onClick={() => reset()}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('action.retry', 'Retry')}
        </Button>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/playground')({
  component: PlaygroundPage,
  errorComponent: PlaygroundPageErrorBoundary,
});
