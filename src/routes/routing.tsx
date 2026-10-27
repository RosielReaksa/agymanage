import { createFileRoute } from '@tanstack/react-router';
import { RoutingView } from '@/modules/saas/components/RoutingView';

export const Route = createFileRoute('/routing')({
  component: RoutingPage,
});

function RoutingPage() {
  return <RoutingView />;
}
