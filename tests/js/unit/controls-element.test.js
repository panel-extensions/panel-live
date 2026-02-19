import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock config.js
const mockSetAutoRunOverride = vi.fn();

vi.mock('../../../lib/config.js', () => ({
  _config: { playgroundUrl: '' },
  _defaults: { playgroundUrl: '' },
  _autoRunOverride: null,
  setAutoRunOverride: mockSetAutoRunOverride,
  cdnUrls: () => ({}),
}));

// Mock theme.js
vi.mock('../../../lib/theme.js', () => ({
  resolveTheme: vi.fn(() => 'light'),
  _darkMQ: {
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
}));

// Set up PanelLive.runAll mock on window
const mockRunAll = vi.fn().mockResolvedValue({ total: 0, skipped: 0, errors: 0 });
window.PanelLive = { runAll: mockRunAll };

// Import controls-element to register <panel-live-controls>
await import('../../../lib/controls-element.js');

describe('<panel-live-controls>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    try { localStorage.removeItem('panel-live:auto-run'); } catch {}
  });

  afterEach(() => {
    document.querySelectorAll('panel-live-controls').forEach(el => el.remove());
    try { localStorage.removeItem('panel-live:auto-run'); } catch {}
  });

  it('renders Run All button and auto-run toggle', () => {
    const el = document.createElement('panel-live-controls');
    document.body.appendChild(el);

    const runAllBtn = el.querySelector('.pl-controls-run-all');
    expect(runAllBtn).not.toBeNull();
    expect(runAllBtn.textContent).toBe('Run All');

    const checkbox = el.querySelector('.pl-controls-checkbox');
    expect(checkbox).not.toBeNull();
    expect(checkbox.type).toBe('checkbox');

    const label = el.querySelector('.pl-controls-toggle-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toBe('Auto-run');
  });

  it('Run All button calls PanelLive.runAll()', async () => {
    const el = document.createElement('panel-live-controls');
    document.body.appendChild(el);

    const runAllBtn = el.querySelector('.pl-controls-run-all');
    runAllBtn.click();

    // Wait for async handler
    await vi.waitFor(() => {
      expect(mockRunAll).toHaveBeenCalledTimes(1);
    });
  });

  it('auto-run toggle reads from localStorage', () => {
    localStorage.setItem('panel-live:auto-run', 'true');

    const el = document.createElement('panel-live-controls');
    document.body.appendChild(el);

    const checkbox = el.querySelector('.pl-controls-checkbox');
    expect(checkbox.checked).toBe(true);
  });

  it('auto-run toggle defaults to unchecked', () => {
    const el = document.createElement('panel-live-controls');
    document.body.appendChild(el);

    const checkbox = el.querySelector('.pl-controls-checkbox');
    expect(checkbox.checked).toBe(false);
  });

  it('auto-run toggle writes to localStorage and calls setAutoRunOverride', async () => {
    const el = document.createElement('panel-live-controls');
    document.body.appendChild(el);

    const checkbox = el.querySelector('.pl-controls-checkbox');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    expect(localStorage.getItem('panel-live:auto-run')).toBe('true');
    expect(mockSetAutoRunOverride).toHaveBeenCalledWith(true);
  });

  it('toggling auto-run ON triggers runAll()', async () => {
    const el = document.createElement('panel-live-controls');
    document.body.appendChild(el);

    const checkbox = el.querySelector('.pl-controls-checkbox');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    await vi.waitFor(() => {
      expect(mockRunAll).toHaveBeenCalled();
    });
  });

  it('toggling auto-run OFF does not trigger runAll() and clears override', async () => {
    localStorage.setItem('panel-live:auto-run', 'true');

    const el = document.createElement('panel-live-controls');
    document.body.appendChild(el);

    const checkbox = el.querySelector('.pl-controls-checkbox');
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));

    // Give it a tick
    await new Promise(r => setTimeout(r, 10));
    expect(mockRunAll).not.toHaveBeenCalled();
    // Unchecking sets override to null (per-element defaults) and removes localStorage
    expect(mockSetAutoRunOverride).toHaveBeenCalledWith(null);
    expect(localStorage.getItem('panel-live:auto-run')).toBeNull();
  });

  it('has tooltips on both controls', () => {
    const el = document.createElement('panel-live-controls');
    document.body.appendChild(el);

    const runAllBtn = el.querySelector('.pl-controls-run-all');
    expect(runAllBtn.title).toContain('Run all');

    const toggle = el.querySelector('.pl-controls-toggle');
    expect(toggle.title).toContain('Automatically run');
  });

  it('sets data-resolved-theme attribute', () => {
    const el = document.createElement('panel-live-controls');
    document.body.appendChild(el);

    expect(el.getAttribute('data-resolved-theme')).toBe('light');
  });

  it('survives relocation without double-rendering', () => {
    const el = document.createElement('panel-live-controls');
    document.body.appendChild(el);

    // Should have one bar
    expect(el.querySelectorAll('.pl-controls-bar').length).toBe(1);

    // Relocate: remove + re-append (simulates insertBefore into header)
    const target = document.createElement('div');
    document.body.appendChild(target);
    target.appendChild(el);

    // Should still have exactly one bar (no duplicate)
    expect(el.querySelectorAll('.pl-controls-bar').length).toBe(1);

    // Button should still work after relocation
    const runAllBtn = el.querySelector('.pl-controls-run-all');
    runAllBtn.click();
    expect(mockRunAll).toHaveBeenCalledTimes(1);

    target.remove();
  });
});
