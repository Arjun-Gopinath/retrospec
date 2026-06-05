import * as fs from 'fs';
import * as path from 'path';
import { Route } from '../types';

export function analyzeRoutes(repoPath: string): Route[] {
  const routes: Route[] = [];

  // Next.js App Router
  const appDir = path.join(repoPath, 'app');
  if (fs.existsSync(appDir)) {
    walkAppRouter(appDir, appDir, routes);
    return routes;
  }

  // Next.js Pages Router fallback
  const pagesDir = path.join(repoPath, 'src', 'pages') || path.join(repoPath, 'pages');
  const srcPagesDir = path.join(repoPath, 'src', 'pages');
  const rootPagesDir = path.join(repoPath, 'pages');

  if (fs.existsSync(srcPagesDir)) {
    walkPagesRouter(srcPagesDir, srcPagesDir, routes);
  } else if (fs.existsSync(rootPagesDir)) {
    walkPagesRouter(rootPagesDir, rootPagesDir, routes);
  }

  return routes;
}

function walkAppRouter(dir: string, baseDir: string, routes: Route[]): void {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkAppRouter(fullPath, baseDir, routes);
    } else if (entry.name === 'page.tsx' || entry.name === 'page.ts' || entry.name === 'page.jsx' || entry.name === 'page.js') {
      const routePath = deriveAppRouterPath(path.dirname(fullPath), baseDir);
      const group = extractRouteGroup(path.dirname(fullPath), baseDir);
      routes.push({
        path: routePath,
        filePath: fullPath,
        isDynamic: isDynamicSegment(routePath),
        group,
      });
    }
  }
}

function walkPagesRouter(dir: string, baseDir: string, routes: Route[]): void {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory() && entry.name !== 'api') {
      walkPagesRouter(fullPath, baseDir, routes);
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.startsWith('_')) {
      const rel = path.relative(baseDir, fullPath);
      const routePath = '/' + rel
        .replace(/\\/g, '/')
        .replace(/\.(tsx?|jsx?)$/, '')
        .replace(/(\/index|^index)$/, '')
        .replace(/\[([^\]]+)\]/g, ':$1');

      routes.push({
        path: routePath || '/',
        filePath: fullPath,
        isDynamic: routePath.includes(':'),
      });
    }
  }
}

function deriveAppRouterPath(dir: string, baseDir: string): string {
  const rel = path.relative(baseDir, dir);
  if (!rel || rel === '.') return '/';

  const segments = rel.split(path.sep).map(seg => {
    // Strip route groups like (auth) or (dashboard)
    if (seg.startsWith('(') && seg.endsWith(')')) return null;
    // Keep dynamic segments as-is for display, convert to :param style
    if (seg.startsWith('[') && seg.endsWith(']')) return seg;
    return seg;
  }).filter(Boolean);

  return '/' + segments.join('/');
}

function extractRouteGroup(dir: string, baseDir: string): string | undefined {
  const rel = path.relative(baseDir, dir);
  const segments = rel.split(path.sep);
  const group = segments.find(s => s.startsWith('(') && s.endsWith(')'));
  return group ? group.slice(1, -1) : undefined;
}

function isDynamicSegment(routePath: string): boolean {
  return routePath.includes('[') || routePath.includes(':');
}
