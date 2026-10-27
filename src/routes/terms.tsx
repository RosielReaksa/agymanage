import { createFileRoute } from '@tanstack/react-router';
import { TermsPage } from '@/modules/saas/components/public/LegalPages';

export const Route = createFileRoute('/terms')({
  component: TermsPage,
});
