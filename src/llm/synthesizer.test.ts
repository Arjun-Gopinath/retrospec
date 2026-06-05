import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RepoAnalysis } from '../types';

// Mock the Claude client before importing synthesizer
vi.mock('./client', () => ({
  callClaude: vi.fn(),
}));

import { synthesizeJourneys, synthesizeFromPrompt } from './synthesizer';
import { callClaude } from './client';

const mockCallClaude = vi.mocked(callClaude);

const MOCK_ANALYSIS: RepoAnalysis = {
  framework: 'nextjs',
  hasAuth: true,
  hasApi: true,
  routes: [
    { path: '/', filePath: '/app/page.tsx', isDynamic: false },
    { path: '/login', filePath: '/app/login/page.tsx', isDynamic: false },
    { path: '/dashboard', filePath: '/app/dashboard/page.tsx', isDynamic: false },
  ],
  components: [
    { route: '/login', filePath: '/app/login/page.tsx', forms: [{ type: 'email' }, { type: 'password' }], buttons: ['Sign in'], links: [], headings: ['Sign in'], hasAuthGuard: false, rawText: 'Headings: Sign in\nButtons: Sign in\nForm fields: email, password' },
    { route: '/dashboard', filePath: '/app/dashboard/page.tsx', forms: [], buttons: ['Log out'], links: [], headings: ['Dashboard'], hasAuthGuard: true, rawText: 'Headings: Dashboard\nButtons: Log out\nAuth guard: yes' },
    { route: '/', filePath: '/app/page.tsx', forms: [], buttons: [], links: [], headings: ['Welcome'], hasAuthGuard: false, rawText: 'Headings: Welcome' },
  ],
};

const VALID_JOURNEYS_JSON = JSON.stringify([
  {
    name: 'User login',
    actor: 'registered user',
    steps: ['Navigate to /login', 'Fill email', 'Fill password', 'Click Sign in'],
    assertions: ['Dashboard is shown'],
    edgeCases: ['Wrong password shows error'],
    relatedRoutes: ['/login', '/dashboard'],
  },
]);

describe('synthesizeJourneys', () => {
  beforeEach(() => {
    mockCallClaude.mockClear();
    mockCallClaude.mockResolvedValue(VALID_JOURNEYS_JSON);
  });

  it('calls Claude with opus model for journey synthesis', async () => {
    await synthesizeJourneys(MOCK_ANALYSIS);
    expect(mockCallClaude).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'opus'
    );
  });

  it('returns parsed Journey array', async () => {
    const journeys = await synthesizeJourneys(MOCK_ANALYSIS);
    expect(Array.isArray(journeys)).toBe(true);
    expect(journeys[0].name).toBe('User login');
    expect(journeys[0].steps.length).toBeGreaterThan(0);
  });

  it('includes route paths in the prompt', async () => {
    await synthesizeJourneys(MOCK_ANALYSIS);
    const [, userMessage] = mockCallClaude.mock.calls[0];
    expect(userMessage).toContain('/login');
    expect(userMessage).toContain('/dashboard');
  });

  it('handles JSON wrapped in markdown code fences', async () => {
    mockCallClaude.mockResolvedValue('```json\n' + VALID_JOURNEYS_JSON + '\n```');
    const journeys = await synthesizeJourneys(MOCK_ANALYSIS);
    expect(journeys[0].name).toBe('User login');
  });

  it('handles a single object (not array) response', async () => {
    mockCallClaude.mockResolvedValue(JSON.stringify({
      name: 'Single journey',
      actor: 'user',
      steps: ['Visit /'],
      assertions: ['Home page shown'],
      edgeCases: [],
      relatedRoutes: ['/'],
    }));
    const journeys = await synthesizeJourneys(MOCK_ANALYSIS);
    expect(journeys).toHaveLength(1);
  });

  it('throws on malformed JSON', async () => {
    mockCallClaude.mockResolvedValue('not json at all');
    await expect(synthesizeJourneys(MOCK_ANALYSIS)).rejects.toThrow('Failed to parse journey JSON');
  });
});

describe('synthesizeFromPrompt', () => {
  beforeEach(() => {
    mockCallClaude.mockClear();
    mockCallClaude.mockResolvedValue(VALID_JOURNEYS_JSON);
  });

  it('calls Claude with sonnet model', async () => {
    await synthesizeFromPrompt('user logs in', MOCK_ANALYSIS);
    expect(mockCallClaude).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'sonnet'
    );
  });

  it('includes the prompt text in the user message', async () => {
    await synthesizeFromPrompt('admin deactivates a user', MOCK_ANALYSIS);
    const [, userMessage] = mockCallClaude.mock.calls[0];
    expect(userMessage).toContain('admin deactivates a user');
  });

  it('returns a Journey array', async () => {
    const journeys = await synthesizeFromPrompt('user logs in', MOCK_ANALYSIS);
    expect(journeys.length).toBeGreaterThan(0);
  });
});
