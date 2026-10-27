import { describe, expect, it } from 'vitest';
import {
  getExpectedInstallRoot,
  isRunningFromExpectedInstallDir,
} from '@/modules/app-shell/utils/installNotice';

describe('install notice policy', () => {
  it('resolves the expected Windows per-user install root', () => {
    expect(
      getExpectedInstallRoot({
        platform: 'win32',
        localAppData: 'C:\\Users\\Alice\\AppData\\Local',
        appName: 'Antigravity Manager',
      }),
    ).toBe('C:\\Users\\Alice\\AppData\\Local\\antigravity_manager');
  });

  it('treats packaged Windows apps outside the per-user install root as unmanaged', () => {
    expect(
      isRunningFromExpectedInstallDir({
        platform: 'win32',
        isPackaged: true,
        localAppData: 'C:\\Users\\Alice\\AppData\\Local',
        appName: 'Antigravity Manager',
        execPath:
          'C:\\Users\\Alice\\AppData\\Local\\antigravity_manager\\app-1.3.0\\antigravity-manager.exe',
      }),
    ).toBe(true);

    expect(
      isRunningFromExpectedInstallDir({
        platform: 'win32',
        isPackaged: true,
        localAppData: 'C:\\Users\\Alice\\AppData\\Local',
        appName: 'Antigravity Manager',
        execPath: 'C:\\Program Files\\Antigravity Manager\\antigravity-manager.exe',
      }),
    ).toBe(false);
  });
});
