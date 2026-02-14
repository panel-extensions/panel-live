import { describe, it, expect } from 'vitest';
import { uid, resolveSourceUrl } from '../../../lib/utils.js';

describe('uid', () => {
  it('returns a string starting with "pl-"', () => {
    expect(uid()).toMatch(/^pl-\d+$/);
  });

  it('returns unique values', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) ids.add(uid());
    expect(ids.size).toBe(100);
  });

  it('increments the counter', () => {
    const a = uid();
    const b = uid();
    const numA = parseInt(a.replace('pl-', ''), 10);
    const numB = parseInt(b.replace('pl-', ''), 10);
    expect(numB).toBe(numA + 1);
  });
});

describe('resolveSourceUrl', () => {
  it('converts GitHub blob URLs to raw.githubusercontent.com', () => {
    const url = 'https://github.com/panel-extensions/panel-live/blob/main/docs/assets/examples/bokeh-scatter.py';
    expect(resolveSourceUrl(url)).toBe(
      'https://raw.githubusercontent.com/panel-extensions/panel-live/main/docs/assets/examples/bokeh-scatter.py'
    );
  });

  it('handles branches with slashes', () => {
    const url = 'https://github.com/owner/repo/blob/feature/branch/src/app.py';
    expect(resolveSourceUrl(url)).toBe(
      'https://raw.githubusercontent.com/owner/repo/feature/branch/src/app.py'
    );
  });

  it('passes through non-GitHub URLs unchanged', () => {
    const url = 'https://example.com/code.py';
    expect(resolveSourceUrl(url)).toBe(url);
  });

  it('passes through raw.githubusercontent.com URLs unchanged', () => {
    const url = 'https://raw.githubusercontent.com/owner/repo/main/app.py';
    expect(resolveSourceUrl(url)).toBe(url);
  });
});
