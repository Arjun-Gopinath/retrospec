import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Journey, RepoAnalysis } from '../types';

vi.mock('./client', () => ({
  callClaude: vi.fn(),
}));

import { generateTest } from './generator';
import { callClaude } from './client';

const mockCallClaude = vi.mocked(callClaude);

const MOCK_JOURNEY: Journey = {
  name: 'User login',
  actor: 'registered user',
  steps: ['Navigate to /login', 'Fill email field', 'Fill password field', 'Click Sign in button'],
  assertions: ['Dashboard page is shown', 'User name is visible'],
  edgeCases: ['Invalid credentials shows error message'],
  relatedRoutes: ['/login', '/dashboard'],
};

const MOCK_ANALYSIS: RepoAnalysis = {
  framework: 'nextjs',
  hasAuth: true,
  hasApi: false,
  routes: [],
  components: [
    { route: '/login', filePath: '/app/login/page.tsx', forms: [], buttons: ['Sign in'], links: [], headings: ['Sign in'], hasAuthGuard: false, rawText: 'Buttons: Sign in' },
  ],
};

const MOCK_TEST_CONTENT = `import { test, expect } from '@playwright/test';

test.describe('User login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('happy path — successful login', async ({ page }) => {
    await page.getByLabel('Email address').fill('user@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('edge case — invalid credentials shows error', async ({ page }) => {
    await page.getByLabel('Email address').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });
});`;

describe('generateTest', () => {
  beforeEach(() => {
    mockCallClaude.mockResolvedValue(MOCK_TEST_CONTENT);
  });

  it('calls Claude with sonnet model', async () => {
    await generateTest(MOCK_JOURNEY, MOCK_ANALYSIS, 'http://localhost:3000');
    expect(mockCallClaude).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'sonnet'
    );
  });

  it('returns a GeneratedTest with the journey attached', async () => {
    const result = await generateTest(MOCK_JOURNEY, MOCK_ANALYSIS, 'http://localhost:3000');
    expect(result.journey).toBe(MOCK_JOURNEY);
  });

  it('derives a kebab-case filename from the journey name', async () => {
    const result = await generateTest(MOCK_JOURNEY, MOCK_ANALYSIS, 'http://localhost:3000');
    expect(result.fileName).toBe('user-login.spec.ts');
  });

  it('includes the journey steps in the prompt', async () => {
    await generateTest(MOCK_JOURNEY, MOCK_ANALYSIS, 'http://localhost:3000');
    const [, userMessage] = mockCallClaude.mock.calls[0];
    MOCK_JOURNEY.steps.forEach(step => expect(userMessage).toContain(step));
  });

  it('includes the base URL in the prompt', async () => {
    await generateTest(MOCK_JOURNEY, MOCK_ANALYSIS, 'http://localhost:4000');
    const [, userMessage] = mockCallClaude.mock.calls[0];
    expect(userMessage).toContain('http://localhost:4000');
  });

  it('includes component context for related routes', async () => {
    await generateTest(MOCK_JOURNEY, MOCK_ANALYSIS, 'http://localhost:3000');
    const [, userMessage] = mockCallClaude.mock.calls[0];
    expect(userMessage).toContain('Buttons: Sign in');
  });

  it('returns the raw LLM output as the file content', async () => {
    const result = await generateTest(MOCK_JOURNEY, MOCK_ANALYSIS, 'http://localhost:3000');
    expect(result.content).toBe(MOCK_TEST_CONTENT);
  });
});
