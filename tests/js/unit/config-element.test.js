import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock config.js — must come before importing config-element.js
const mockSetAutoRunOverride = vi.fn();
const mockConfig = {
  playgroundUrl: '',
};

vi.mock('../../../lib/config.js', () => ({
  _config: mockConfig,
  _defaults: { playgroundUrl: '' },
  _autoRunOverride: null,
  setAutoRunOverride: mockSetAutoRunOverride,
  cdnUrls: () => ({}),
}));

// Import config-element to register <panel-live-config>
await import('../../../lib/config-element.js');

describe('<panel-live-config>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.playgroundUrl = '';
    try { localStorage.removeItem('panel-live:auto-run'); } catch {}
  });

  afterEach(() => {
    // Remove any config elements from the DOM
    document.querySelectorAll('panel-live-config').forEach(el => el.remove());
    try { localStorage.removeItem('panel-live:auto-run'); } catch {}
  });

  it('does not set override when localStorage is false', () => {
    localStorage.setItem('panel-live:auto-run', 'false');

    const el = document.createElement('panel-live-config');
    document.body.appendChild(el);

    // 'false' in localStorage means user unchecked — no override, use per-element defaults
    expect(mockSetAutoRunOverride).not.toHaveBeenCalled();
  });

  it('reads auto-run true from localStorage', () => {
    localStorage.setItem('panel-live:auto-run', 'true');

    const el = document.createElement('panel-live-config');
    document.body.appendChild(el);

    expect(mockSetAutoRunOverride).toHaveBeenCalledWith(true);
  });

  it('does not call setAutoRunOverride when no localStorage value', () => {
    const el = document.createElement('panel-live-config');
    document.body.appendChild(el);

    expect(mockSetAutoRunOverride).not.toHaveBeenCalled();
  });

  it('writes playground-url to _config', () => {
    const el = document.createElement('panel-live-config');
    el.setAttribute('playground-url', '/my-playground');
    document.body.appendChild(el);

    expect(mockConfig.playgroundUrl).toBe('/my-playground');
  });

  it('does not write playgroundUrl when attribute absent', () => {
    const el = document.createElement('panel-live-config');
    document.body.appendChild(el);

    expect(mockConfig.playgroundUrl).toBe('');
  });

  it('renders no visible UI', () => {
    const el = document.createElement('panel-live-config');
    document.body.appendChild(el);

    expect(el.children.length).toBe(0);
    expect(el.textContent).toBe('');
  });
});
