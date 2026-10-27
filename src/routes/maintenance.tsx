import { createFileRoute } from '@tanstack/react-router';
import { MaintenanceView } from '@/modules/saas/components/MaintenanceView';

export const Route = createFileRoute('/maintenance')({
  component: MaintenancePage,
});

function MaintenancePage() {
  return <MaintenanceView />;
}
