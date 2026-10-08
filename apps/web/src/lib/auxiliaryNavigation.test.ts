import { describe, expect, it } from 'vitest';
import { navigateAuxiliaryView, resolveAuxiliaryView } from './auxiliaryNavigation';

describe('auxiliary navigation', () => {
  it('recognizes only explicit preparation and reference addresses', () => {
    expect(resolveAuxiliaryView('#preparation')).toBe('preparation');
    expect(resolveAuxiliaryView('#preparation-other')).toBe('editor');
    expect(resolveAuxiliaryView('#reference/tag/chorus')).toBe('reference');
    expect(resolveAuxiliaryView('')).toBe('editor');
  });
  it('preserves base path and search while notifying the app', () => {
    window.history.replaceState(null, '', '/suno/?test=1');
    let changes = 0;
    const onChange = () => { changes++; };
    window.addEventListener('popstate', onChange);
    navigateAuxiliaryView('preparation');
    expect(window.location.hash).toBe('#preparation');
    navigateAuxiliaryView('editor');
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/suno/?test=1');
    expect(changes).toBe(2);
    window.removeEventListener('popstate', onChange);
  });
});
