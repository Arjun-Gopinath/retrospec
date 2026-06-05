import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { analyzeComponent } from './components';
import { Route } from '../types';

const FIXTURES = path.resolve(__dirname, '../../tests/fixtures/nextjs-app');

function routeFor(filePath: string, routePath: string): Route {
  return { path: routePath, filePath, isDynamic: false };
}

describe('analyzeComponent — buttons', () => {
  it('extracts button text from login page', () => {
    const result = analyzeComponent(routeFor(
      path.join(FIXTURES, 'app/login/page.tsx'), '/login'
    ));
    expect(result.buttons.some(b => /sign in/i.test(b))).toBe(true);
  });

  it('extracts multiple buttons from dashboard', () => {
    const result = analyzeComponent(routeFor(
      path.join(FIXTURES, 'app/dashboard/page.tsx'), '/dashboard'
    ));
    expect(result.buttons.length).toBeGreaterThanOrEqual(2);
  });
});

describe('analyzeComponent — forms', () => {
  it('extracts email and password fields from login page', () => {
    const result = analyzeComponent(routeFor(
      path.join(FIXTURES, 'app/login/page.tsx'), '/login'
    ));
    const types = result.forms.map(f => f.type);
    expect(types).toContain('email');
    expect(types).toContain('password');
  });

  it('marks required fields', () => {
    const result = analyzeComponent(routeFor(
      path.join(FIXTURES, 'app/login/page.tsx'), '/login'
    ));
    expect(result.forms.every(f => f.required === true)).toBe(true);
  });

  it('extracts placeholder text', () => {
    const result = analyzeComponent(routeFor(
      path.join(FIXTURES, 'app/login/page.tsx'), '/login'
    ));
    const placeholders = result.forms.map(f => f.placeholder).filter(Boolean);
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it('finds all three fields on register page', () => {
    const result = analyzeComponent(routeFor(
      path.join(FIXTURES, 'app/(auth)/register/page.tsx'), '/register'
    ));
    expect(result.forms.length).toBe(3);
  });
});

describe('analyzeComponent — headings', () => {
  it('extracts h1 from login page', () => {
    const result = analyzeComponent(routeFor(
      path.join(FIXTURES, 'app/login/page.tsx'), '/login'
    ));
    expect(result.headings.some(h => /sign in/i.test(h))).toBe(true);
  });
});

describe('analyzeComponent — auth guard detection', () => {
  it('detects getServerSession as an auth guard', () => {
    const result = analyzeComponent(routeFor(
      path.join(FIXTURES, 'app/dashboard/page.tsx'), '/dashboard'
    ));
    expect(result.hasAuthGuard).toBe(true);
  });

  it('does not flag non-auth pages', () => {
    const result = analyzeComponent(routeFor(
      path.join(FIXTURES, 'app/login/page.tsx'), '/login'
    ));
    expect(result.hasAuthGuard).toBe(false);
  });
});

describe('analyzeComponent — rawText', () => {
  it('produces a non-empty summary string', () => {
    const result = analyzeComponent(routeFor(
      path.join(FIXTURES, 'app/login/page.tsx'), '/login'
    ));
    expect(result.rawText.length).toBeGreaterThan(0);
  });
});

describe('analyzeComponent — edge cases', () => {
  it('returns empty summary for a non-existent file', () => {
    const result = analyzeComponent(routeFor('/tmp/does-not-exist.tsx', '/nowhere'));
    expect(result.forms).toEqual([]);
    expect(result.buttons).toEqual([]);
    expect(result.hasAuthGuard).toBe(false);
  });
});
