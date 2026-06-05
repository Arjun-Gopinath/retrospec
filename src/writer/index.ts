import * as fs from 'fs';
import * as path from 'path';
import { GeneratedTest } from '../types';

const AUTH_FIXTURE = `import { test as base } from '@playwright/test';

// Extend this fixture to add authenticated page state.
// See: https://playwright.dev/docs/auth#reuse-signed-in-state
export const test = base.extend({
  // authenticatedPage: async ({ browser }, use) => {
  //   const context = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
  //   const page = await context.newPage();
  //   await use(page);
  //   await context.close();
  // },
});

export { expect } from '@playwright/test';
`;

const PLAYWRIGHT_CONFIG = (baseUrl: string) => `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: '${baseUrl}',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
`;

export function writeTests(
  tests: GeneratedTest[],
  outputDir: string,
  baseUrl: string,
  repoPath: string
): void {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'fixtures'), { recursive: true });

  for (const test of tests) {
    const filePath = path.join(outputDir, test.fileName);
    fs.writeFileSync(filePath, test.content, 'utf-8');
  }

  fs.writeFileSync(path.join(outputDir, 'fixtures', 'auth.ts'), AUTH_FIXTURE, 'utf-8');

  const configPath = path.join(repoPath, 'playwright.config.ts');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, PLAYWRIGHT_CONFIG(baseUrl), 'utf-8');
  }
}

export function writeSummary(tests: GeneratedTest[], outputDir: string): void {
  const lines = [
    '# retrospec — Generated Tests\n',
    `Generated ${tests.length} test file(s):\n`,
    ...tests.map(t => `- \`${t.fileName}\` — ${t.journey.name} (${t.journey.actor})`),
    '',
    '## Next steps',
    '1. Start your dev server',
    '2. Run `npx playwright test`',
    '3. Review failing tests and update locators as needed',
  ];

  fs.writeFileSync(path.join(outputDir, 'RETROSPEC.md'), lines.join('\n'), 'utf-8');
}
