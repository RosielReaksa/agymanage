import { describe, expect, it } from 'vitest';
import type { PluginOption, UserConfig } from 'vite';

const REACT_SCAN_ENABLED_ENV = 'ANTIGRAVITY_ENABLE_REACT_SCAN';

async function loadRendererConfig() {
  // @ts-expect-error Vitest can load the root .mts config directly, while the app tsconfig emits declarations.
  return (await import('../../../vite.renderer.config.mts')).default;
}

async function resolveRendererConfig(mode: string) {
  const rendererConfig = await loadRendererConfig();

  if (typeof rendererConfig === 'function') {
    return rendererConfig({
      command: mode === 'production' ? 'build' : 'serve',
      mode,
    }) as UserConfig;
  }

  return rendererConfig as UserConfig;
}

function flattenPluginNames(plugins: PluginOption[] = []): string[] {
  return plugins.flatMap((plugin) => {
    if (!plugin) {
      return [];
    }

    if (Array.isArray(plugin)) {
      return flattenPluginNames(plugin);
    }

    if (typeof plugin === 'object' && 'name' in plugin && typeof plugin.name === 'string') {
      return [plugin.name];
    }

    return [];
  });
}

async function withEnvironment<T>(
  key: string,
  value: string,
  callback: () => Promise<T>,
): Promise<T> {
  const previous = process.env[key];
  process.env[key] = value;

  try {
    return await callback();
  } finally {
    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  }
}

describe('renderer Vite config', () => {
  it('keeps code inspector out of production builds', async () => {
    const config = await resolveRendererConfig('production');

    expect(flattenPluginNames(config.plugins)).not.toContain('@code-inspector/vite');
  }, 15000);

  it('keeps code inspector available during development', async () => {
    const config = await resolveRendererConfig('development');

    expect(flattenPluginNames(config.plugins)).toContain('@code-inspector/vite');
  }, 15000);

  it('injects React Scan only for an explicitly enabled development session', async () => {
    await withEnvironment(REACT_SCAN_ENABLED_ENV, '1', async () => {
      const config = await resolveRendererConfig('development');

      expect(flattenPluginNames(config.plugins)).toContain('antigravity-react-scan');
    });
  }, 15000);

  it('keeps React Scan out of production even when the development switch is set', async () => {
    await withEnvironment(REACT_SCAN_ENABLED_ENV, '1', async () => {
      const config = await resolveRendererConfig('production');

      expect(flattenPluginNames(config.plugins)).not.toContain('antigravity-react-scan');
    });
  }, 15000);

  it('defines NODE_ENV for renderer code without requiring Node integration', async () => {
    const config = await resolveRendererConfig('production');

    expect(config.define?.['process.env.NODE_ENV']).toBe(JSON.stringify('production'));
  }, 15000);
});
