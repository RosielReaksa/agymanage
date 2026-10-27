import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const BASELINE_RELATIVE_PATH = '.agents/type-boundary-baseline.json';
const SOURCE_ROOT = 'src';
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const RULES = [
  'no-explicit-any',
  'no-double-assertion',
  'no-native-fetch',
  'no-unvalidated-boundary-cast',
  'no-ts-ignore',
];

function isSourceFile(relativePath) {
  const normalizedPath = relativePath.replaceAll('\\', '/');
  return (
    SOURCE_EXTENSIONS.has(path.extname(normalizedPath)) &&
    !normalizedPath.includes('/tests/') &&
    !normalizedPath.includes('/mocks/') &&
    !normalizedPath.includes('/__tests__/') &&
    !normalizedPath.includes('/__mocks__/') &&
    !normalizedPath.endsWith('.test.ts') &&
    !normalizedPath.endsWith('.test.tsx') &&
    !normalizedPath.endsWith('.spec.ts') &&
    !normalizedPath.endsWith('.spec.tsx') &&
    !normalizedPath.endsWith('.gen.ts') &&
    !normalizedPath.endsWith('.generated.ts')
  );
}

function collectFiles(rootDir, relativeDir = SOURCE_ROOT) {
  const directoryPath = path.join(rootDir, relativeDir);
  if (!existsSync(directoryPath)) {
    return [];
  }

  const files = [];
  for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(rootDir, relativePath));
      continue;
    }

    if (entry.isFile() && isSourceFile(relativePath)) {
      files.push(relativePath.replaceAll('\\', '/'));
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function normalizeSource(source) {
  return source.replaceAll(/\s+/gu, ' ').trim();
}

function createViolation(sourceFile, relativePath, rule, node) {
  return {
    file: relativePath,
    line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
    rule,
    source: normalizeSource(node.getText(sourceFile)),
  };
}

function unwrapParentheses(node) {
  let current = node;
  while (ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }

  return current;
}

function isJsonParseCall(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'JSON' &&
    node.expression.name.text === 'parse'
  );
}

function isAwaitedResponseJsonCall(node) {
  if (!ts.isAwaitExpression(node)) {
    return false;
  }

  const expression = unwrapParentheses(node.expression);
  return (
    ts.isCallExpression(expression) &&
    ts.isPropertyAccessExpression(expression.expression) &&
    expression.expression.name.text === 'json'
  );
}

function isBoundaryCast(node) {
  const expression = unwrapParentheses(node.expression);
  return isJsonParseCall(expression) || isAwaitedResponseJsonCall(expression);
}

function isDoubleAssertion(node) {
  const expression = unwrapParentheses(node.expression);
  return ts.isAsExpression(expression) && expression.type.kind === ts.SyntaxKind.UnknownKeyword;
}

function isNativeFetchCall(node) {
  if (!ts.isCallExpression(node)) {
    return false;
  }

  if (ts.isIdentifier(node.expression)) {
    return node.expression.text === 'fetch';
  }

  return (
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    (node.expression.expression.text === 'globalThis' ||
      node.expression.expression.text === 'window') &&
    node.expression.name.text === 'fetch'
  );
}

function findExemptionAtLine(sourceText, lineIndex, rule) {
  const lines = sourceText.split(/\r?\n/u);
  const minimumLineIndex = Math.max(0, lineIndex - 4);

  for (let index = lineIndex - 1; index >= minimumLineIndex; index -= 1) {
    const match = lines[index]?.match(
      /type-boundary:\s*allow\s+([a-z-]+)\s+owner=([^\s]+)\s+issue=([^\s]+)\s+expires=(\d{4}-\d{2}-\d{2})\s+reason=(.+)$/u,
    );
    if (!match || match[1] !== rule) {
      continue;
    }

    const [, , owner, issue, expires, reason] = match;
    const expiration = new Date(`${expires}T23:59:59.999Z`);
    if (
      !owner ||
      !issue ||
      !reason ||
      Number.isNaN(expiration.getTime()) ||
      expiration < new Date()
    ) {
      return null;
    }

    return { expires, issue, owner, reason };
  }

  return null;
}

function findExemption(sourceText, sourceFile, node, rule) {
  const lineIndex = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line;
  return findExemptionAtLine(sourceText, lineIndex, rule);
}

function collectCommentViolations(sourceText, relativePath) {
  return sourceText.split(/\r?\n/u).flatMap((line, index) =>
    /@ts-ignore\b/u.test(line) && !findExemptionAtLine(sourceText, index, 'no-ts-ignore')
      ? [
          {
            file: relativePath,
            line: index + 1,
            rule: 'no-ts-ignore',
            source: normalizeSource(line),
          },
        ]
      : [],
  );
}

/**
 * Finds unsafe type-boundary patterns in production TypeScript. Test, mock, and generated sources
 * are intentionally excluded; controlled third-party adapters require a nearby typed exemption.
 */
export function collectTypeBoundaryViolations(rootDir) {
  const violations = [];

  for (const relativePath of collectFiles(rootDir)) {
    const absolutePath = path.join(rootDir, relativePath);
    const sourceText = readFileSync(absolutePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      relativePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      relativePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    const visit = (node) => {
      let rule = null;
      if (node.kind === ts.SyntaxKind.AnyKeyword) {
        rule = 'no-explicit-any';
      } else if (ts.isAsExpression(node) && isDoubleAssertion(node)) {
        rule = 'no-double-assertion';
      } else if (isNativeFetchCall(node)) {
        rule = 'no-native-fetch';
      } else if (ts.isAsExpression(node) && isBoundaryCast(node)) {
        rule = 'no-unvalidated-boundary-cast';
      }

      if (rule && !findExemption(sourceText, sourceFile, node, rule)) {
        violations.push(createViolation(sourceFile, relativePath, rule, node));
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    violations.push(...collectCommentViolations(sourceText, relativePath));
  }

  return violations.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.rule.localeCompare(right.rule) ||
      left.line - right.line ||
      left.source.localeCompare(right.source),
  );
}

function fingerprint(violation) {
  const sourceHash = createHash('sha256').update(violation.source).digest('hex').slice(0, 16);
  return `${violation.rule}\u0000${violation.file}\u0000${sourceHash}`;
}

function compressViolations(violations) {
  const grouped = new Map();
  for (const violation of violations) {
    const key = fingerprint(violation);
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }

    grouped.set(key, {
      count: 1,
      file: violation.file,
      rule: violation.rule,
      source: violation.source,
    });
  }

  return [...grouped.values()].sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.rule.localeCompare(right.rule) ||
      left.source.localeCompare(right.source),
  );
}

export function createTypeBoundaryBaseline(rootDir) {
  return {
    formatVersion: 1,
    rules: RULES,
    violations: compressViolations(collectTypeBoundaryViolations(rootDir)),
  };
}

export function writeTypeBoundaryBaseline(rootDir, baselinePath) {
  const baseline = createTypeBoundaryBaseline(rootDir);
  mkdirSync(path.dirname(baselinePath), { recursive: true });
  writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
  return baseline;
}

export function verifyTypeBoundaries(rootDir, baselinePath) {
  if (!existsSync(baselinePath)) {
    throw new Error(`Type-boundary baseline is missing: ${path.relative(rootDir, baselinePath)}`);
  }

  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  if (baseline.formatVersion !== 1 || !Array.isArray(baseline.violations)) {
    throw new Error('Type-boundary baseline has an unsupported format');
  }

  const allowedCounts = new Map(
    baseline.violations.map((violation) => [
      fingerprint(violation),
      Number.isInteger(violation.count) ? violation.count : 1,
    ]),
  );
  const newViolations = [];

  for (const violation of collectTypeBoundaryViolations(rootDir)) {
    const key = fingerprint(violation);
    const allowedCount = allowedCounts.get(key) ?? 0;
    if (allowedCount > 0) {
      allowedCounts.set(key, allowedCount - 1);
      continue;
    }

    newViolations.push(violation);
  }

  return {
    baseline,
    newViolations,
  };
}

function isMainModule() {
  return process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
}

if (isMainModule()) {
  try {
    const arguments_ = new Set(process.argv.slice(2));
    const supportedArguments = new Set(['--write-baseline']);
    for (const argument of arguments_) {
      if (!supportedArguments.has(argument)) {
        throw new Error(`Unknown argument: ${argument}`);
      }
    }

    const rootDir = path.resolve(import.meta.dirname, '..');
    const baselinePath = path.join(rootDir, BASELINE_RELATIVE_PATH);
    if (arguments_.has('--write-baseline')) {
      const baseline = writeTypeBoundaryBaseline(rootDir, baselinePath);
      console.log(`Wrote type-boundary baseline with ${baseline.violations.length} fingerprints.`);
    } else {
      const report = verifyTypeBoundaries(rootDir, baselinePath);
      if (report.newViolations.length > 0) {
        console.error('New production type-boundary violations:');
        for (const violation of report.newViolations) {
          console.error(
            `${violation.file}:${violation.line} ${violation.rule} ${violation.source}`,
          );
        }
        process.exitCode = 1;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Type-boundary verification failed: ${message}`);
    process.exitCode = 1;
  }
}
