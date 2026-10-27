import { createFileRoute } from '@tanstack/react-router';
import { LandingPage } from '@/modules/saas/components/public/LandingPage';

export const Route = createFileRoute('/landing')({
  component: LandingPage,
});
