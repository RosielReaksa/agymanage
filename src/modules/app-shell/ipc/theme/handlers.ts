import { os } from '@orpc/server';
import { nativeTheme } from 'electron';
import { setThemeModeInputSchema } from './schemas';

let fallbackTheme: 'light' | 'dark' | 'system' = 'system';

export const getCurrentThemeMode = os.handler(() => {
  try {
    if (nativeTheme && 'themeSource' in nativeTheme) {
      return nativeTheme.themeSource;
    }
  } catch {
    // Non-electron runtime
  }
  return fallbackTheme;
});

export const toggleThemeMode = os.handler(() => {
  try {
    if (nativeTheme && 'shouldUseDarkColors' in nativeTheme) {
      nativeTheme.themeSource = nativeTheme.shouldUseDarkColors ? 'light' : 'dark';
      return nativeTheme.shouldUseDarkColors;
    }
  } catch {
    // Non-electron runtime
  }
  fallbackTheme = fallbackTheme === 'dark' ? 'light' : 'dark';
  return fallbackTheme === 'dark';
});

export const setThemeMode = os.input(setThemeModeInputSchema).handler(({ input: mode }) => {
  try {
    if (nativeTheme && 'themeSource' in nativeTheme) {
      nativeTheme.themeSource = mode;
      return nativeTheme.themeSource;
    }
  } catch {
    // Non-electron runtime
  }
  fallbackTheme = mode;
  return mode;
});
