import { os } from '@orpc/server';
import { app } from 'electron';
import { release, version } from 'node:os';
import { BugReportEnvironmentSchema } from '../../bug-report-environment';

function getAppVersionSafe(): string {
  try {
    if (app && typeof app.getVersion === 'function') {
      return app.getVersion();
    }
  } catch {
    // Non-electron runtime
  }
  return '0.27.0';
}

export const currentPlatfom = os.handler(() => {
  return process.platform;
});

export const appVersion = os.handler(() => {
  return getAppVersionSafe();
});

export const bugReportEnvironment = os.output(BugReportEnvironmentSchema).handler(() => ({
  appVersion: getAppVersionSafe(),
  platform: process.platform,
  osVersion: `${version()} (${release()})`,
  architecture: process.arch,
  electronVersion: process.versions.electron ?? 'Web',
  nodeVersion: process.versions.node,
}));
