import Clarity from '@microsoft/clarity';

import type { AppConfig } from '@/modules/config/types';
import { createClarityBuildConfig, type ClarityBuildConfig } from './clarityConfig';

let initialized = false;

function getClarityBuildConfig(): ClarityBuildConfig {
  if (typeof CLARITY_BUILD_CONFIG === 'undefined') {
    return createClarityBuildConfig({});
  }

  return CLARITY_BUILD_CONFIG;
}

export function isClarityAvailable(): boolean {
  const config = getClarityBuildConfig();
  return config.enabled && Boolean(config.projectId);
}

function setConsent(granted: boolean): void {
  Clarity.consentV2({
    ad_Storage: 'denied',
    analytics_Storage: granted ? 'granted' : 'denied',
  });
}

export function syncClarity(
  appConfig: Pick<AppConfig, 'clarity_enabled' | 'language' | 'theme'>,
): void {
  const buildConfig = getClarityBuildConfig();
  const shouldRun =
    buildConfig.enabled && Boolean(buildConfig.projectId) && appConfig.clarity_enabled;

  if (!shouldRun) {
    if (initialized) {
      setConsent(false);
    }
    return;
  }

  if (!initialized) {
    // The app can render account names, emails, paths, and quota details, so mask
    // the whole renderer by default before loading Clarity.
    document.body.setAttribute('data-clarity-mask', 'true');
    Clarity.init(buildConfig.projectId);
    initialized = true;
  }

  setConsent(true);
  Clarity.setTag('runtime', 'electron-renderer');
  Clarity.setTag('environment', buildConfig.environment);
  Clarity.setTag('language', appConfig.language);
  Clarity.setTag('theme', appConfig.theme);
}

export function trackClarityEvent(eventName: string): void {
  if (!initialized) {
    return;
  }

  Clarity.event(eventName);
}
