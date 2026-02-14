import { describe, it, expect } from 'vitest';
import { resolveTheme } from '../../../lib/theme.js';

describe('resolveTheme', () => {
  it('returns "light" for explicit light', () => {
    expect(resolveTheme('light')).toBe('light');
  });

  it('returns "dark" for explicit dark', () => {
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('returns a string for "auto"', () => {
    const result = resolveTheme('auto');
    expect(['light', 'dark']).toContain(result);
  });

  it('returns a string for undefined', () => {
    const result = resolveTheme(undefined);
    expect(['light', 'dark']).toContain(result);
  });

  it('returns a string for null', () => {
    const result = resolveTheme(null);
    expect(['light', 'dark']).toContain(result);
  });
});
