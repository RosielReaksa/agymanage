import { createFileRoute } from '@tanstack/react-router';
import { RequestAccessPage } from '@/modules/saas/components/public/RequestAccessPage';

export const Route = createFileRoute('/request-access')({
  component: RequestAccessPage,
});
