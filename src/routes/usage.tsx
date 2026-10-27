import { createFileRoute } from '@tanstack/react-router';
import { UsageView } from '@/modules/saas/components/UsageView';

export const Route = createFileRoute('/usage')({
  component: UsagePage,
});

function UsagePage() {
  return <UsageView />;
}
