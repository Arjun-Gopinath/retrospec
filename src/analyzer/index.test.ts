import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { analyzeRepo } from './index';

const FIXTURES = path.resolve(__dirname, '../../tests/fixtures');

describe('analyzeRepo', () => {
  it('detects nextjs framework', () => {
    const result = analyzeRepo(path.join(FIXTURES, 'nextjs-app'));
    expect(result.framework).toBe('nextjs');
  });

  it('detects auth from next-auth dependency', () => {
    const result = analyzeRepo(path.join(FIXTURES, 'nextjs-app'));
    expect(result.hasAuth).toBe(true);
  });

  it('returns routes', () => {
    const result = analyzeRepo(path.join(FIXTURES, 'nextjs-app'));
    expect(result.routes.length).toBeGreaterThan(0);
  });

  it('returns component summaries for each route', () => {
    const result = analyzeRepo(path.join(FIXTURES, 'nextjs-app'));
    expect(result.components.length).toBe(result.routes.length);
  });

  it('returns unknown framework for empty repo', () => {
    const result = analyzeRepo('/tmp/nonexistent-repo-xyz');
    expect(result.framework).toBe('unknown');
    expect(result.routes).toEqual([]);
  });
});
