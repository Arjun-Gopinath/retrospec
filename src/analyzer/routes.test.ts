import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { analyzeRoutes } from './routes';

const FIXTURES = path.resolve(__dirname, '../../tests/fixtures');
const NEXTJS_APP = path.join(FIXTURES, 'nextjs-app');
const PAGES_APP = path.join(FIXTURES, 'pages-router-app');

describe('analyzeRoutes — Next.js App Router', () => {
  it('finds the root route', () => {
    const routes = analyzeRoutes(NEXTJS_APP);
    const paths = routes.map(r => r.path);
    expect(paths).toContain('/');
  });

  it('maps nested folders to URL paths', () => {
    const routes = analyzeRoutes(NEXTJS_APP);
    const paths = routes.map(r => r.path);
    expect(paths).toContain('/login');
    expect(paths).toContain('/dashboard');
  });

  it('detects dynamic route segments', () => {
    const routes = analyzeRoutes(NEXTJS_APP);
    const dynamic = routes.find(r => r.path.includes('[id]'));
    expect(dynamic).toBeDefined();
    expect(dynamic!.isDynamic).toBe(true);
  });

  it('strips route groups from the URL path', () => {
    const routes = analyzeRoutes(NEXTJS_APP);
    const paths = routes.map(r => r.path);
    // (auth)/register should become /register, not /(auth)/register
    expect(paths).toContain('/register');
    expect(paths.some(p => p.includes('(auth)'))).toBe(false);
  });

  it('captures the route group name as metadata', () => {
    const routes = analyzeRoutes(NEXTJS_APP);
    const register = routes.find(r => r.path === '/register');
    expect(register?.group).toBe('auth');
  });

  it('includes the filePath for each route', () => {
    const routes = analyzeRoutes(NEXTJS_APP);
    routes.forEach(r => {
      expect(r.filePath).toMatch(/page\.(tsx?|jsx?)$/);
    });
  });

  it('returns no duplicate paths', () => {
    const routes = analyzeRoutes(NEXTJS_APP);
    const paths = routes.map(r => r.path);
    expect(paths.length).toBe(new Set(paths).size);
  });
});

describe('analyzeRoutes — Next.js Pages Router', () => {
  it('finds root index as /', () => {
    const routes = analyzeRoutes(PAGES_APP);
    const paths = routes.map(r => r.path);
    expect(paths).toContain('/');
  });

  it('maps page files to routes', () => {
    const routes = analyzeRoutes(PAGES_APP);
    const paths = routes.map(r => r.path);
    expect(paths).toContain('/login');
  });

  it('excludes api routes', () => {
    const routes = analyzeRoutes(PAGES_APP);
    expect(routes.some(r => r.path.startsWith('/api'))).toBe(false);
  });
});

describe('analyzeRoutes — edge cases', () => {
  it('returns empty array when no app/ or pages/ directory exists', () => {
    const routes = analyzeRoutes('/tmp/nonexistent-repo-xyz');
    expect(routes).toEqual([]);
  });
});
