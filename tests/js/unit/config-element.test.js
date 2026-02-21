import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock config.js — must come before importing config-element.js
const mockConfig = {
  playgroundUrl: '',
};

vi.mock('../../../lib/config.js', () => ({
  _config: mockConfig,
  _defaults: { playgroundUrl: '' },
  _autoRunOverride: null,
  setAutoRunOverride: vi.fn(),
  cdnUrls: () => ({}),
}));

// Import config-element to register <panel-live-config>
await import('../../../lib/config-element.js');

describe('<panel-live-config>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.playgroundUrl = '';
  });

  afterEach(() => {
    // Remove any config elements from the DOM
    document.querySelectorAll('panel-live-config').forEach(el => el.remove());
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
