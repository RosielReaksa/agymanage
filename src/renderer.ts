if (typeof window !== 'undefined' && !(window as unknown as { electron?: unknown }).electron) {
  (window as unknown as { electron: unknown }).electron = {
    getObservabilityConfig: async () => ({ errorReportingEnabled: false }),
    changeLanguage: () => {},
    onManualUpdateAvailable: () => () => {},
    onTrafficAuditEvent: () => () => {},
    checkForUpdates: async () => ({ updateAvailable: false }),
    downloadUpdate: async () => ({ success: false }),
    installUpdate: async () => ({ success: false }),
    dismissManualUpdate: async () => {},
    openExternalUrl: async (url: string) => {
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    saveTrafficAuditBody: async (_bodyId: string, _suggestedName: string) => {},
  };
}

async function initializeRendererSentry() {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  try {
    const config = await window.electron?.getObservabilityConfig();
    if (!config?.errorReportingEnabled) {
      return;
    }

    const Sentry = await import('@sentry/electron/renderer');
    setTimeout(() => {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
      });
    }, 2000);
  } catch (error) {
    console.warn('Sentry initialization failed:', error);
  }
}

initializeRendererSentry();

import '@/App';
