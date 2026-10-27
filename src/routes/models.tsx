import { createFileRoute } from '@tanstack/react-router';
import { PublicModelsPage } from '@/modules/saas/components/public/PublicModelsPage';

export const Route = createFileRoute('/models')({
  component: PublicModelsPage,
});
