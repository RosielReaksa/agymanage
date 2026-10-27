import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { verifyTypeBoundaries, writeTypeBoundaryBaseline } from './verify-type-boundaries.mjs';

async function writeFixture(rootDir, relativePath, content) {
  const filePath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
}

test('allows only the existing baseline while blocking later unsafe production code', async (context) => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'agm-type-boundaries-'));
  context.after(async () => rm(rootDir, { recursive: true, force: true }));
  await writeFixture(rootDir, 'src/legacy.ts', 'export const legacy: any = null;\n');

  const baselinePath = path.join(rootDir, '.agents', 'type-boundary-baseline.json');
  writeTypeBoundaryBaseline(rootDir, baselinePath);
  assert.deepEqual(verifyTypeBoundaries(rootDir, baselinePath).newViolations, []);

  await writeFixture(
    rootDir,
    'src/new-code.ts',
    'export const value = fetch("https://example.test");\nexport const unsafe: any = null;\n',
  );
  const report = verifyTypeBoundaries(rootDir, baselinePath);

  assert.deepEqual(report.newViolations, [
    {
      file: 'src/new-code.ts',
      line: 2,
      rule: 'no-explicit-any',
      source: 'any',
    },
    {
      file: 'src/new-code.ts',
      line: 1,
      rule: 'no-native-fetch',
      source: 'fetch("https://example.test")',
    },
  ]);
});

test('requires full metadata for a controlled third-party boundary exemption', async (context) => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'agm-type-boundaries-'));
  context.after(async () => rm(rootDir, { recursive: true, force: true }));
  const baselinePath = path.join(rootDir, '.agents', 'type-boundary-baseline.json');
  writeTypeBoundaryBaseline(rootDir, baselinePath);
  await writeFixture(
    rootDir,
    'src/adapter.ts',
    [
      '// type-boundary: allow no-native-fetch owner=proxy-gateway issue=#123 expires=2099-01-01 reason=SDK adapter requires its fetch implementation',
      'export const value = fetch("https://example.test");',
      '// type-boundary: allow no-ts-ignore owner=proxy-gateway issue=#123 expires=2099-01-01 reason=SDK type is incomplete',
      '// @ts-ignore third-party adapter type gap',
      'export const typeGap = value;',
      '',
    ].join('\n'),
  );

  assert.deepEqual(verifyTypeBoundaries(rootDir, baselinePath).newViolations, []);
});
