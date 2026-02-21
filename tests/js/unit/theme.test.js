import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolveTheme, onThemeChange, _darkMQ } from '../../../lib/theme.js';

describe('resolveTheme', () => {
  afterEach(() => {
    // Clean up any dataset attributes we set
    delete document.documentElement.dataset.theme;
    delete document.body.dataset.theme;
    delete document.body.dataset.mdColorScheme;
  });

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

  describe('Sphinx themes', () => {
    it('detects pydata-sphinx-theme light via data-theme on <html>', () => {
      document.documentElement.dataset.theme = 'light';
      expect(resolveTheme('auto')).toBe('light');
    });

    it('detects pydata-sphinx-theme dark via data-theme on <html>', () => {
      document.documentElement.dataset.theme = 'dark';
      expect(resolveTheme('auto')).toBe('dark');
    });

    it('detects furo light via data-theme on <body>', () => {
      document.body.dataset.theme = 'light';
      expect(resolveTheme('auto')).toBe('light');
    });

    it('detects furo dark via data-theme on <body>', () => {
      document.body.dataset.theme = 'dark';
      expect(resolveTheme('auto')).toBe('dark');
    });

    it('resolves furo "auto" via OS preference', () => {
      document.body.dataset.theme = 'auto';
      const result = resolveTheme('auto');
      expect(result).toBe(_darkMQ.matches ? 'dark' : 'light');
    });

    it('detects MkDocs Material slate as dark', () => {
      document.body.dataset.mdColorScheme = 'slate';
      expect(resolveTheme('auto')).toBe('dark');
    });

    it('detects MkDocs Material default as light', () => {
      document.body.dataset.mdColorScheme = 'default';
      expect(resolveTheme('auto')).toBe('light');
    });

    it('pydata-sphinx-theme takes priority over furo body data-theme', () => {
      document.documentElement.dataset.theme = 'dark';
      document.body.dataset.theme = 'light';
      expect(resolveTheme('auto')).toBe('dark');
    });

    it('furo body data-theme takes priority over MkDocs Material', () => {
      document.body.dataset.theme = 'dark';
      document.body.dataset.mdColorScheme = 'default';
      expect(resolveTheme('auto')).toBe('dark');
    });

    it('explicit light/dark ignores all theme attributes', () => {
      document.documentElement.dataset.theme = 'dark';
      document.body.dataset.mdColorScheme = 'slate';
      expect(resolveTheme('light')).toBe('light');
      expect(resolveTheme('dark')).toBe('dark');
    });
  });
});

describe('onThemeChange', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
    delete document.body.dataset.theme;
    delete document.body.dataset.mdColorScheme;
  });

  it('fires callback when <html> data-theme changes', async () => {
    const cb = vi.fn();
    const unsub = onThemeChange(cb);
    try {
      document.documentElement.dataset.theme = 'dark';
      // MutationObserver is async — wait for microtask
      await new Promise(r => setTimeout(r, 0));
      expect(cb).toHaveBeenCalledWith('dark');
    } finally {
      unsub();
    }
  });

  it('fires callback when <body> data-theme changes', async () => {
    const cb = vi.fn();
    const unsub = onThemeChange(cb);
    try {
      document.body.dataset.theme = 'dark';
      await new Promise(r => setTimeout(r, 0));
      expect(cb).toHaveBeenCalledWith('dark');
    } finally {
      unsub();
    }
  });

  it('fires callback when data-md-color-scheme changes', async () => {
    const cb = vi.fn();
    const unsub = onThemeChange(cb);
    try {
      document.body.dataset.mdColorScheme = 'slate';
      await new Promise(r => setTimeout(r, 0));
      expect(cb).toHaveBeenCalledWith('dark');
    } finally {
      unsub();
    }
  });

  it('unsubscribe stops notifications', async () => {
    const cb = vi.fn();
    const unsub = onThemeChange(cb);
    unsub();
    document.documentElement.dataset.theme = 'dark';
    await new Promise(r => setTimeout(r, 0));
    // Reset to trigger another change
    delete document.documentElement.dataset.theme;
    await new Promise(r => setTimeout(r, 0));
    expect(cb).not.toHaveBeenCalled();
  });

  it('deduplicates: does not fire when resolved theme is unchanged', async () => {
    // Set initial state to light
    delete document.documentElement.dataset.theme;
    delete document.body.dataset.theme;
    delete document.body.dataset.mdColorScheme;

    const cb = vi.fn();
    const unsub = onThemeChange(cb);
    try {
      // Set to the same effective theme (light is likely the default in jsdom)
      document.body.dataset.mdColorScheme = 'default';
      await new Promise(r => setTimeout(r, 0));
      // The callback should not fire if resolved theme didn't change
      const lightCalls = cb.mock.calls.filter(c => c[0] === 'light').length;
      // It may or may not fire depending on initial state, but setting default again should not
      cb.mockClear();
      document.body.dataset.mdColorScheme = 'default';
      await new Promise(r => setTimeout(r, 0));
      expect(cb).not.toHaveBeenCalled();
    } finally {
      unsub();
    }
  });
});
