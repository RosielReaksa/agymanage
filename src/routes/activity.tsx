import { createFileRoute } from '@tanstack/react-router';
import { ActivityView } from '@/modules/saas/components/ActivityView';

export const Route = createFileRoute('/activity')({
  component: ActivityPage,
});

function ActivityPage() {
  return <ActivityView />;
}
