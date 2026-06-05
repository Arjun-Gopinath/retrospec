import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { writeTests, writeSummary } from './index';
import { GeneratedTest } from '../types';

const MOCK_TEST: GeneratedTest = {
  fileName: 'user-login.spec.ts',
  content: `import { test, expect } from '@playwright/test';\ntest('login', async ({ page }) => {});`,
  journey: {
    name: 'User login',
    actor: 'registered user',
    steps: ['Navigate to /login'],
    assertions: ['Dashboard shown'],
    edgeCases: [],
    relatedRoutes: ['/login'],
  },
};

let tmpDir: string;
let repoDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'retrospec-test-'));
  repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'retrospec-repo-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.rmSync(repoDir, { recursive: true, force: true });
});

describe('writeTests', () => {
  it('creates the output directory if it does not exist', () => {
    const output = path.join(tmpDir, 'nested', 'output');
    writeTests([MOCK_TEST], output, 'http://localhost:3000', repoDir);
    expect(fs.existsSync(output)).toBe(true);
  });

  it('writes a .spec.ts file for each generated test', () => {
    writeTests([MOCK_TEST], tmpDir, 'http://localhost:3000', repoDir);
    const specPath = path.join(tmpDir, 'user-login.spec.ts');
    expect(fs.existsSync(specPath)).toBe(true);
    expect(fs.readFileSync(specPath, 'utf-8')).toContain("import { test, expect }");
  });

  it('writes the auth fixture file', () => {
    writeTests([MOCK_TEST], tmpDir, 'http://localhost:3000', repoDir);
    const fixturePath = path.join(tmpDir, 'fixtures', 'auth.ts');
    expect(fs.existsSync(fixturePath)).toBe(true);
  });

  it('creates playwright.config.ts in the repo root when absent', () => {
    writeTests([MOCK_TEST], tmpDir, 'http://localhost:3000', repoDir);
    const configPath = path.join(repoDir, 'playwright.config.ts');
    expect(fs.existsSync(configPath)).toBe(true);
    expect(fs.readFileSync(configPath, 'utf-8')).toContain('defineConfig');
  });

  it('does not overwrite an existing playwright.config.ts', () => {
    const configPath = path.join(repoDir, 'playwright.config.ts');
    const original = '// existing config\n';
    fs.writeFileSync(configPath, original);
    writeTests([MOCK_TEST], tmpDir, 'http://localhost:3000', repoDir);
    expect(fs.readFileSync(configPath, 'utf-8')).toBe(original);
  });

  it('embeds the base URL in the generated playwright.config.ts', () => {
    writeTests([MOCK_TEST], tmpDir, 'http://localhost:4321', repoDir);
    const config = fs.readFileSync(path.join(repoDir, 'playwright.config.ts'), 'utf-8');
    expect(config).toContain('http://localhost:4321');
  });

  it('handles multiple test files', () => {
    const second: GeneratedTest = { ...MOCK_TEST, fileName: 'checkout.spec.ts' };
    writeTests([MOCK_TEST, second], tmpDir, 'http://localhost:3000', repoDir);
    expect(fs.existsSync(path.join(tmpDir, 'user-login.spec.ts'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'checkout.spec.ts'))).toBe(true);
  });
});

describe('writeSummary', () => {
  it('creates RETROSPEC.md in the output directory', () => {
    writeSummary([MOCK_TEST], tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'RETROSPEC.md'))).toBe(true);
  });

  it('lists each generated test file in the summary', () => {
    writeSummary([MOCK_TEST], tmpDir);
    const content = fs.readFileSync(path.join(tmpDir, 'RETROSPEC.md'), 'utf-8');
    expect(content).toContain('user-login.spec.ts');
    expect(content).toContain('User login');
  });
});
