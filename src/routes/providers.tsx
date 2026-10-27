import { createFileRoute } from '@tanstack/react-router';
import { ProvidersView } from '@/modules/saas/components/ProvidersView';

export const Route = createFileRoute('/providers')({
  component: ProvidersPage,
});

function ProvidersPage() {
  return <ProvidersView />;
}
