import { createFileRoute } from '@tanstack/react-router';
import { PublicDocsPage } from '@/modules/saas/components/public/PublicDocsPage';

export const Route = createFileRoute('/docs')({
  component: PublicDocsPage,
});
