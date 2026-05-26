import { describe, expect, it } from 'vitest';
import { shouldHydrateAuth } from './authProbe';

describe('auth hydration probe', () => {
  it('does not probe auth by default in local dev', () => {
    expect(shouldHydrateAuth({ dev: true })).toBe(false);
  });

  it('probes auth in production unless explicitly disabled', () => {
    expect(shouldHydrateAuth({ dev: false })).toBe(true);
    expect(shouldHydrateAuth({ dev: false, flag: 'false' })).toBe(false);
  });

  it('can be enabled explicitly for local full-stack dev', () => {
    expect(shouldHydrateAuth({ dev: true, flag: 'true' })).toBe(true);
  });
});
