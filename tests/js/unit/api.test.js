import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../../../lib/config.js', () => {
  const config = {
    pyodideVersion: 'v0.28.2',
    panelVersion: '1.8.7',
    bokehVersion: '3.8.2',
    styleNonce: '',
  };
  return {
    _config: config,
    _defaults: { ...config },
    cdnUrls: () => ({
      pyodide: 'https://cdn.example.com/pyodide.js',
      bokehJs: ['https://cdn.example.com/bokeh.js'],
      panelJs: 'https://cdn.example.com/panel.js',
      bokehWhl: 'https://cdn.example.com/bokeh.whl',
      panelWhl: 'https://cdn.example.com/panel.whl',
    }),
  };
});

vi.mock('../../../lib/worker-bridge.js', () => ({
  getWorkerBridge: vi.fn(() => ({
    init: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../../lib/controller.js', () => ({
  PanelLiveController: vi.fn(function(el) { this._element = el; }),
}));

// Mock custom elements
const mockRun = vi.fn();
const mockGetCode = vi.fn(() => 'test code');
const mockSetCode = vi.fn();
customElements.define('panel-live', class extends HTMLElement {
  run() { mockRun(); }
  getCode() { return mockGetCode(); }
  setCode(code) { mockSetCode(code); }
  get status() { return 'idle'; }
});

const { _config } = await import('../../../lib/config.js');
await import('../../../lib/api.js');

describe('PanelLive.configure()', () => {
  afterEach(() => {
    // Reset config
    delete _config.customOption;
  });

  it('merges overrides into _config', () => {
    window.PanelLive.configure({ customOption: 'test' });
    expect(_config.customOption).toBe('test');
  });

  it('overrides existing values', () => {
    window.PanelLive.configure({ panelVersion: '2.0.0' });
    expect(_config.panelVersion).toBe('2.0.0');
    // Restore
    _config.panelVersion = '1.8.7';
  });

  it('sets styleNonce', () => {
    window.PanelLive.configure({ styleNonce: 'abc123' });
    expect(_config.styleNonce).toBe('abc123');
    _config.styleNonce = '';
  });
});

describe('PanelLive.mount()', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'mount-target';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('creates a panel-live element with mode attribute', async () => {
    const ctrl = await window.PanelLive.mount({ mode: 'editor', code: 'x = 1' }, container);
    const el = container.querySelector('panel-live');
    expect(el).not.toBeNull();
    expect(el.getAttribute('mode')).toBe('editor');
  });

  it('sets theme attribute', async () => {
    await window.PanelLive.mount({ theme: 'dark', code: 'x = 1' }, container);
    const el = container.querySelector('panel-live');
    expect(el.getAttribute('theme')).toBe('dark');
  });

  it('sets layout attribute', async () => {
    await window.PanelLive.mount({ layout: 'horizontal', code: 'x = 1' }, container);
    const el = container.querySelector('panel-live');
    expect(el.getAttribute('layout')).toBe('horizontal');
  });

  it('sets code as textContent', async () => {
    await window.PanelLive.mount({ code: 'print("hi")' }, container);
    const el = container.querySelector('panel-live');
    expect(el.textContent).toContain('print("hi")');
  });

  it('creates panel-requirements child', async () => {
    await window.PanelLive.mount({ code: 'x = 1', requirements: ['numpy', 'pandas'] }, container);
    const req = container.querySelector('panel-requirements');
    expect(req).not.toBeNull();
    expect(req.textContent).toBe('numpy\npandas');
  });

  it('creates panel-file children', async () => {
    await window.PanelLive.mount({
      files: { 'app.py': 'import pn', 'utils.py': 'def foo(): pass' },
    }, container);
    const files = container.querySelectorAll('panel-file');
    expect(files.length).toBe(2);
  });

  it('creates panel-example children', async () => {
    await window.PanelLive.mount({
      code: 'x = 1',
      examples: [
        { name: 'Ex1', code: 'a = 1' },
        { name: 'Ex2', src: 'https://example.com/ex2.py' },
      ],
    }, container);
    const examples = container.querySelectorAll('panel-example');
    expect(examples.length).toBe(2);
    expect(examples[0].getAttribute('name')).toBe('Ex1');
    expect(examples[1].getAttribute('src')).toBe('https://example.com/ex2.py');
  });

  it('resolves string selector as target', async () => {
    await window.PanelLive.mount({ code: 'x = 1' }, '#mount-target');
    const el = container.querySelector('panel-live');
    expect(el).not.toBeNull();
  });

  it('throws for invalid target', async () => {
    await expect(
      window.PanelLive.mount({ code: 'x = 1' }, '#nonexistent')
    ).rejects.toThrow('target not found');
  });
});
