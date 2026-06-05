import * as fs from 'fs';
import * as path from 'path';
import { RepoAnalysis, Route } from '../types';
import { analyzeRoutes } from './routes';
import { analyzeComponent } from './components';

export function analyzeRepo(repoPath: string): RepoAnalysis {
  const pkgPath = path.join(repoPath, 'package.json');
  const framework = detectFramework(pkgPath);
  const routes = analyzeRoutes(repoPath);
  const components = routes.map(r => analyzeComponent(r));
  const hasAuth = components.some(c => c.hasAuthGuard) || hasAuthDependency(pkgPath);
  const hasApi = hasApiRoutes(repoPath);

  return { framework, routes, components, hasAuth, hasApi };
}

function detectFramework(pkgPath: string): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps['next']) return 'nextjs';
    if (deps['nuxt']) return 'nuxt';
    if (deps['@angular/core']) return 'angular';
    if (deps['react']) return 'react';
    if (deps['vue']) return 'vue';
    if (deps['svelte']) return 'svelte';
  } catch {}
  return 'unknown';
}

function hasAuthDependency(pkgPath: string): boolean {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return !!(
      deps['next-auth'] ||
      deps['@auth/nextjs'] ||
      deps['@clerk/nextjs'] ||
      deps['@supabase/auth-helpers-nextjs'] ||
      deps['lucia']
    );
  } catch {}
  return false;
}

function hasApiRoutes(repoPath: string): boolean {
  const apiDirs = [
    path.join(repoPath, 'app', 'api'),
    path.join(repoPath, 'pages', 'api'),
    path.join(repoPath, 'src', 'pages', 'api'),
  ];
  return apiDirs.some(d => fs.existsSync(d));
}
