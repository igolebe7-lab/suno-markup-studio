import { describe, expect, it } from 'vitest';
import { createToken, hashToken } from './auth';

describe('auth tokens', () => {
  it('creates opaque tokens and stable hashes', () => {
    const token = createToken();

    expect(token.length).toBeGreaterThan(30);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(token);
  });
});
