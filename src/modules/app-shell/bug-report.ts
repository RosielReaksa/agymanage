import type { BugReportEnvironment } from './bug-report-environment';
import { redactDiagnosticText } from '@/shared/observability/sentryPrivacy';

export const BUG_REPORT_URL =
  'https://github.com/RosielReaksa/agymanage/issues/new';

const bugReportTemplate = `
## Screenshots or Diagnostic Details

## Environment
- **App version**:
- **Operating system and version**:
- **CPU architecture**:

## Additional Context
`;

/** Keep report text out of the URL; users review, paste and submit it themselves. */
export function buildErrorBugReport(
  environment: BugReportEnvironment,
  details: string,
  summary = 'An operation failed. Error details:',
): string {
  const errorBlock = redactDiagnosticText(details)
    .split('\n')
    .map((line) => (line ? `    ${line}` : ''))
    .join('\n');
  const template = bugReportTemplate.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();
  const sections = template.replaceAll('\r\n', '\n').split(/\n(?=## )/);
  return sections
    .map((section) => {
      if (section.startsWith('## Screenshots or Diagnostic Details')) {
        return `${section.trim()}\n\n${errorBlock}\n`;
      }
      if (section.startsWith('## Environment')) {
        return section
          .replace('- **App version**:', `- **App version**: ${environment.appVersion}`)
          .replace(
            '- **Operating system and version**:',
            `- **Operating system and version**: ${environment.platform} — ${environment.osVersion}`,
          )
          .replace(
            /- \*\*CPU architecture\*\*:.*/,
            `- **CPU architecture**: ${environment.architecture}`,
          );
      }
      if (section.startsWith('## Additional Context')) {
        return `${section.trim()}\n\n${redactDiagnosticText(summary)}\n`;
      }
      return section;
    })
    .join('\n');
}
