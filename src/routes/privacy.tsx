import { createFileRoute } from '@tanstack/react-router';
import { PrivacyPage } from '@/modules/saas/components/public/LegalPages';

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
});
